/** @file The interface for a user repository. */

// A single user.
export interface User {
    id: number;
    username: string;
    password: string;
    email: string;
    about: string;
    about_html: string;
    avatar_image: string;
    registered_at: Date;
    updated_at: Date;
};

interface UserRepository {
    /**
     * Creates a user.
     *
     * @param username - The unique username of the user.
     * @param password - The hashed password of the user.
     * @param email - The e-mail address of the user.
     * @param avatarImage - The URL for the user's avatar image.
     */
    createUser(username: string, password: string, email: string, avatarImage: string): Promise<User>;
    /**
     * Returns a user by username if it exists in the database, or null if it doesn't.
     *
     * @param username - The username for this user.
     */
    getUserByUsername(username: string): Promise<User | null>;
    /**
     * Returns a user by ID if it exists in the database, or null if it doesn't.
     *
     * @param id - The ID for this user.
     */
    getUserByID(id: number): Promise<User | null>;
};

export default UserRepository;
