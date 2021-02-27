/** @file The interface for an authentication manager. */

import type { Authenticator } from "passport";
import type { User } from "./user_repository";

interface AuthManager {
    /**
     * Initialize the authentication layer.
     *
     * @param passport - The passport authenticator instance.
     */
    initialize(passport: Authenticator, strategy: "local" | "jwt"): void;
    /**
     * Authenticate a user by his username and password.
     *
     * @param username - The given username
     * @param password - The given password
     */
    authenticate(username: string, password: string): Promise<User | null>;
    /**
     * Generate a JWT authentication token.
     * This function only generates a JWT and does not validate whether the
     * user was successfully authenticated.
     *
     * @param username - The username for the user
     */
    generateJWT(username: string): string;
};

export default AuthManager;
