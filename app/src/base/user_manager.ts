/** @file The interface for a user manager. */

import type { User } from "./user_repository";

interface UserManager {
    /**
     * Creates a new user with the given parameters. Fetches the avatar from
     * Gravatar.
     *
     * @param username - The username of the user.
     * @param password - The password of the user (will be hashed).
     * @param email - The e-mail address of the user.
     */
    createUser(username: string, password: string, email: string): Promise<User>;
    /**
     * Returns a user by username if it exists, or null if it doesn't.
     *
     * @param username - The username for this user.
     */
    getUserByUsername(username: string): Promise<User | null>;
    /**
     * Returns a user by ID if it exists, or null if it doesn't.
     *
     * @param id - The ID for this user.
     */
    getUserByID(id: number): Promise<User | null>;
};

export default UserManager;
