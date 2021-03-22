/** @file The interface for a user repository. */

// A single user.
export interface User {
    id: number;
    username: string;
    password: string;
    email: string;
    homepage: string | null;
    about: string;
    about_html: string;
    avatar_image: string;
    is_admin: boolean;
    registered_at: Date;
    updated_at: Date;

    // Extra fields
    comment_count?: number;
    story_count?: number;
    comment_karma?: number;
    story_karma?: number;
};

// The parameters needed to create a user.
export interface UserCreate {
    username: string;
    password: string;
    email: string;
    avatar_image: string;
    registered_at: Date;
    about: string;
    about_html: string;
    is_admin: boolean;
};

// Parameters that are required to update a user.
export interface UserUpdate {
    email: string;
    avatar_image: string;
    about: string;
    about_html: string;
    homepage: string;
};

// Additional things to fetch when getting a user.
export interface UserOptions {
    // Fetch the user's comment count.
    commentCount?: boolean;
    // Fetch the user's published story count.
    storyCount?: boolean;
    // Fetch the user's total score on their comments.
    commentKarma?: boolean;
    // Fetch the user's total score on their stories.
    storyKarma?: boolean;
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
     * @param options - What to fetch.
     */
    getUserByUsername(username: string, options: UserOptions): Promise<User | null>;
    /**
     * Returns a user by ID if it exists in the database, or null if it doesn't.
     *
     * @param id - The ID for this user.
     * @param options - What to fetch.
     */
    getUserByID(id: number, options: UserOptions): Promise<User | null>;
    /**
     * Update a user's details.
     *
     * @param username - The username of the user.
     * @param params - The update parameters.
     */
    updateUser(username: string, params: UserUpdate): Promise<void>;
    /**
     * Delete a user.
     *
     * @param username - The username of the user.
     */
    deleteUser(username: string): Promise<void>;
};

export default UserRepository;
