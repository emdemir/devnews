/** @file The interface for a user manager. */

import type { User, UserOptions } from "./user_repository";

// Parameters that are required to update a user.
export interface UserUpdate {
    email: string;
    homepage: string;
    about: string;
};

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
     * @param options - What to fetch.
     */
    getUserByUsername(username: string, options: UserOptions): Promise<User | null>;
    /**
     * Returns a user by ID if it exists, or null if it doesn't.
     *
     * @param id - The ID for this user.
     * @param options - What to fetch.
     */
    getUserByID(id: number, options: UserOptions): Promise<User | null>;
    /**
     * Update a user's details.
     *
     * @param user - The user who is performing the update.
     * @param username - The username of the user whose details are being updated.
     * @param params - The details.
     */
    updateUser(user: User, username: string, params: UserUpdate): Promise<void>;
    /**
     * Change a user's password.
     *
     * @param user - The user who is performing the password change.
     * @param username - The username of the user whose password is being changed.
     * @param currentPassword - The current password of the user.
     * @param newPassword - The new password of the user.
     */
    changePassword(user: User, username: string, currentPassword: string,
        newPassword: string): Promise<void>;
    /**
     * Delete a user.
     *
     * @param user - The user who wishes to delete this user.
     * @param username - The username of the user to be deleted.
     */
    deleteUser(user: User, username: string): Promise<void>;
};

export { UserOptions };
export default UserManager;
