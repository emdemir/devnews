// We're only importing the type here, so no monkey-patching from passport will
// occur.
import type { Authenticator } from "passport";

import local = require("passport-local");
import crypto = require("crypto");

import * as dataSource from "../datasource/users";

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

const strategy = new local.Strategy(async (username, password, done) => {
    try {
        const user = await dataSource.getUserByUsername(username);
        if (user === null) {
            return done(null, false, { message: ERR_MESSAGE });
        }

        const valid = await isPasswordValid(user!.password, password);
        if (!valid) {
            return done(null, false, { message: ERR_MESSAGE });
        }

        return done(null, user);
    } catch (e) {
        done(e);
    }
});

/// --- Serialization ---

type SerializeCallback = (user: Express.User, done: (err: any, id?: number) => void) => void;
type DeserializeCallback = (id: number, done: (err: any, user?: Express.User) => void) => void;

const serialize: SerializeCallback = (user, done) => {
    done(null, (user as dataSource.User).id);
};

const deserialize: DeserializeCallback = async (id, done) => {
    try {
        const user = await dataSource.getUserByID(id);
        done(null, user || undefined);
    } catch (e) {
        done(e);
    }
};

// --- Initialization ---

/**
 * Initialize the authentication layer.
 */
const initialize = (passport: Authenticator) => {
    // Register the authentication strategy with Passport.
    passport.use("local", strategy);
    // Register the callbacks with passport.
    passport.serializeUser(serialize);
    passport.deserializeUser(deserialize);
}

export default initialize;
