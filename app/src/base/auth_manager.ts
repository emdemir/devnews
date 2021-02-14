/** @file The interface for an authentication manager. */

import type { Authenticator } from "passport";

interface AuthManager {
    /**
     * Initialize the authentication layer.
     *
     * @param passport - The passport authenticator instance.
     */
    initialize(passport: Authenticator): void;
};

export default AuthManager;
