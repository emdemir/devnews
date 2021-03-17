// We're only importing the type here, so no monkey-patching from passport will
// occur.
import type { Authenticator } from "passport";

import local = require("passport-local");
import passportJwt = require("passport-jwt");
import crypto = require("crypto");
import jwt = require("jsonwebtoken");

import type UserRepository from "../base/user_repository";
import type { User } from "../base/user_repository";
import type AuthManager from "../base/auth_manager";

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

    const jwtOptions: passportJwt.StrategyOptions = {
        jwtFromRequest: passportJwt.ExtractJwt.fromAuthHeaderAsBearerToken(),
        // TODO: use Docker secrets, same as web/index
        secretOrKey: "changeme",
        issuer: "accounts.devnews.org",
        // TODO: environment variables? .env file???
        audience: "devnews.org"
    };

    const jwtStrategy = new passportJwt.Strategy(jwtOptions, async (jwt, done) => {
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
            done(null, user || undefined);
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
     * Generate a JWT authentication token.
     * This function only generates a JWT and does not validate whether the
     * user was successfully authenticated.
     *
     * @param username - The username for the user
     */
    const generateJWT = (username: string): string => {
        const token = jwt.sign({ sub: username }, jwtOptions.secretOrKey!, {
            issuer: jwtOptions.issuer!,
            audience: jwtOptions.audience!,
            expiresIn: "7d"
        });

        return token;
    }

    return {
        initialize,
        authenticate,
        generateJWT
    };
};
