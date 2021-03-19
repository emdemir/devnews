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
     * Generate a JWT authentication/refresh token.
     * This function only generates a JWT and does not validate whether the
     * user was successfully authenticated.
     *
     * @param username - The username for the user
     * @param refresh - If set to true, the type will be set to refresh,
     * and this token may only be used to obtain a new authorization & refresh
     * token.
     */
    generateAccessToken(username: string, refresh?: boolean): string;
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
    generateIdentityToken(user: User): string;
    /**
     * Validate the given token's signature and that it matches the given type.
     * Returns the token's subject, or null if the token wasn't valid.
     *
     * @param token - The token
     * @param tokenType - The type of the token
     */
    validateToken(token: string, tokenType: string): string | null;
    /**
     * Get the token expiry type for the given token type in seconds.
     *
     * @param type - The token's type
     */
    getTokenExpiry(type: "identity" | "access" | "refresh"): number;
}

export default AuthManager;
