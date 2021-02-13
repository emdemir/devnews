import type { QueryResult } from "pg";
import { query } from "./index";

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

/**
 * Creates a user.
 *
 * @param username - The unique username of the user.
 * @param password - The hashed password of the user.
 * @param email - The e-mail address of the user.
 * @param avatarImage - The URL for the user's avatar image.
 */
export const createUser = async (
    username: string,
    password: string,
    email: string,
    avatarImage: string
): Promise<User> => {
    const result = await query<User>(
        `INSERT INTO users (
            username, password, email, about, about_html, avatar_image
        ) VALUES (
            $1, $2, $3, '', '', $4
        ) RETURNING *`,
        [username, password, email, avatarImage]
    );
    return result.rows[0];
}

/**
 * Returns a user by username if it exists in the database, or null if it doesn't.
 *
 * @param username - The username for this user.
 */
export const getUserByUsername = async (username: string): Promise<User | null> => {
    const result = await query<User>(
        "SELECT * FROM users WHERE username = $1", [username]
    );

    if (result.rowCount !== 1)
        return null;
    return result.rows[0];
}

/**
 * Returns a user by ID if it exists in the database, or null if it doesn't.
 *
 * @param id - The ID for this user.
 */
export const getUserByID = async (id: number): Promise<User | null> => {
    const result = await query<User>("SELECT * FROM users WHERE id = $1", [id]);

    if (result.rowCount !== 1)
        return null;
    return result.rows[0];
}
