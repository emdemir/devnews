// We're only importing the type here, so no monkey-patching from passport will
// occur.
import type { Authenticator } from "passport";

import local = require("passport-local");
import passportJwt = require("passport-jwt");
import crypto = require("crypto");
import jwt = require("jsonwebtoken");

import type UserRepository from "base/user_repository";
import type { User } from "base/user_repository";
import type AuthManager from "base/auth_manager";
import { generateShortID } from "./utils";

// The amount of hash iterations we currently do.
const HASH_ITERATIONS = 10_000;

/**
 * Creates a new password with PBKDF2 hashing. The iteration count and salt are
 * stored with the password.
 *
 * @param password - The password to hash.
 * @param salt - If passed, will be used instead of a random hash (for password checks only!)
 * @return The hashed password
 */
export const hashPassword = (password: string, salt?: string): Promise<string> =>
    new Promise<string>((resolve, reject) => {
        if (!salt)
            // Use the 3/4 expansion of base64 to create a 16 byte salt.
            salt = crypto.randomBytes(12).toString("base64");

        // The same 3/4 expansion to create a 48->64 byte key.
        crypto.pbkdf2(password, salt, HASH_ITERATIONS, 48, "sha256", (err, key) => {
            if (err) {
                reject(err);
            } else {
                const finalKey = `${HASH_ITERATIONS}$${salt}$${key.toString("base64")}`;
                resolve(finalKey);
            }
        });
    });

/**
 * Checks the user's password against the current password in the database.
 *
 * @param hashedPassword - The hashed password to check against.
 * @param password - The password to check.
 * @return true if the password is valid.
 */
export const isPasswordValid = async (
    hashedPassword: string,
    password: string
): Promise<boolean> => {
    const [, salt,] = hashedPassword.split("$");
    const newHash = await hashPassword(password, salt);

    return newHash === hashedPassword;
}

// Giving the client an error message that's too specific potentially opens us
// up to enumeration attacks, where an attacker can learn who is registered on
// the site by repeatedly trying random userames. Let's just give them the same
// error message regardless of whether the user exists on the site or not.
const ERR_MESSAGE = "Invalid user/password";

interface Dependencies {
    userRepository: UserRepository;
};

export default function({ userRepository: dataSource }: Dependencies): AuthManager {
    /**
     * Authenticate a user by his username and password.
     *
     * @param username - The given username
     * @param password - The given password
     */
    const authenticate = async (username: string, password: string): Promise<User | null> => {
        const user = await dataSource.getUserByUsername(username, {});
        if (user === null) {
            return null;
        }

        const valid = await isPasswordValid(user!.password, password);
        if (!valid) {
            return null;
        }

        return user;
    }

    const localStrategy = new local.Strategy(async (username, password, done) => {
        try {
            const user = await authenticate(username, password);
            if (user === null)
                return done(null, false, { message: ERR_MESSAGE });

            return done(null, user);
        } catch (err) {
            done(err);
        }
    });

    const secretKey = process.env.SECRET_KEY;
    if (!secretKey)
        throw new Error("SECRET_KEY must be defined in the environment.");

    const jwtOptions: passportJwt.StrategyOptions = {
        jwtFromRequest: passportJwt.ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: secretKey,
        issuer: "https://devnews.org",
        audience: "devnews.org",
    };

    const jwtStrategy = new passportJwt.Strategy(jwtOptions, async (jwt, done) => {
        // If this is not an identity token, we fail the request.
        // Access tokens are only allowed to fetch the identity, and refresh
        // tokens are only allowed to re-fetch the access token.
        if (jwt.type !== "identity")
            return done(null, false);

        const subject = jwt.sub;
        try {
            const user = await dataSource.getUserByUsername(subject, {});
            if (user === null)
                return done(null, false);

            done(null, user);
        } catch (err) {
            done(err, false);
        }
    });

    /// --- Serialization ---

    type SerializeCallback = (user: Express.User, done: (err: any, id?: number) => void) => void;
    type DeserializeCallback = (id: number, done: (err: any, user?: Express.User) => void) => void;

    const serialize: SerializeCallback = (user, done) => {
        done(null, (user as User).id);
    };

    const deserialize: DeserializeCallback = async (id, done) => {
        try {
            const user = await dataSource.getUserByID(id, {});
            done(null, user || false);
        } catch (e) {
            done(e);
        }
    };

    // --- Initialization ---

    /**
    * Initialize the authentication layer.
    */
    const initialize = (passport: Authenticator, strategy: "local" | "jwt") => {
        // Register the authentication strategy with Passport.
        if (strategy === "local")
            passport.use("local", localStrategy);
        else
            passport.use("jwt", jwtStrategy);
        // Register the callbacks with passport.
        passport.serializeUser(serialize);
        passport.deserializeUser(deserialize);
    }

    /**
     * Generate a JWT access/refresh token.
     * This function only generates a JWT and does not validate whether the
     * user was successfully authenticated.
     *
     * @param username - The username for the user
     * @param refresh - If set to true, the type will be set to refresh,
     * and this token may only be used to obtain a new access & refresh
     * token.
     */
    const generateAccessToken = (
        username: string,
        refresh: boolean = false
    ): string => {
        const type = refresh ? "refresh" : "access";
        const token = jwt.sign({
            type,
            sub: username,
            scope: "openid",
            nonce: generateShortID(8)
        }, secretKey, {
            issuer: jwtOptions.issuer!,
            audience: jwtOptions.audience!,
            expiresIn: getTokenExpiry(type)
        });

        return token;
    }

    /**
     * Generate a JWT identity token. This token contains information about the
     * current user which can be used in third party applications. As the
     * information is sensitive, make sure the user is properly authenticated
     * before doing this.
     *
     * @param user - The user to generate a token for
     * @param client - The client who requested this token. Must be one of the
     * registered clients.
     */
    const generateIdentityToken = (user: User): string => {
        // Currently, this is all the information we have about the user.
        const identityData = {
            "sub": user.username,
            "email": user.email,
            "avatar": user.avatar_image,
            "type": "identity",
            "nonce": generateShortID(8)
        };

        return jwt.sign(identityData, secretKey, {
            issuer: jwtOptions.issuer!,
            audience: jwtOptions.audience!,
            expiresIn: getTokenExpiry("identity")
        });
    }

    /**
     * Validate the given token's signature and that it matches the given type.
     * Returns the token's subject, or null if the token wasn't valid.
     *
     * @param token - The token
     * @param tokenType - The type of the token
     */
    const validateToken = (token: string, tokenType: string): string | null => {
        try {
            const tokenObj = jwt.verify(token, secretKey, {
                issuer: jwtOptions.issuer!
            });

            // Our tokens are always objects.
            if (typeof tokenObj === "string") return null;

            const tok = tokenObj as any;
            // Validate token type
            if (tok.type !== tokenType) return null;

            return tok.sub;
        } catch (e) {
            // Malformed JWT.
            return null;
        }
    }

    /**
     * Get the token expiry type for the given token type in seconds.
     *
     * @param type - The token's type
     */
    const getTokenExpiry = (type: "identity" | "access" | "refresh"): number => {
        switch (type) {
            case "identity":
                return 60 * 60 * 24 * 7;
            case "access":
                return 60 * 60;
            case "refresh":
                return 60 * 60 * 24 * 30;
        }
    }

    return {
        initialize,
        authenticate,
        generateAccessToken,
        generateIdentityToken,
        validateToken,
        getTokenExpiry
    };
};
