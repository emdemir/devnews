import type UserRepository from "../base/user_repository";
import type { User as RepoUser } from "../base/user_repository";

import { User } from "./tables";

export default function({ }): UserRepository {
    /**
     * Creates a user.
     *
     * @param username - The unique username of the user.
     * @param password - The hashed password of the user.
     * @param email - The e-mail address of the user.
     * @param avatarImage - The URL for the user's avatar image.
     */
    const createUser = async (
        username: string,
        password: string,
        email: string,
        avatarImage: string
    ): Promise<RepoUser> => {
        const user = await User.create({
            username,
            password,
            email,
            avatar_image: avatarImage
        });

        return user;
    }

    /**
     * Returns a user by username if it exists in the database, or null if it doesn't.
     *
     * @param username - The username for this user.
     */
    const getUserByUsername = async (username: string): Promise<RepoUser | null> => {
        const user = await User.findOne({ where: { username } });
        if (user === null)
            return null;
        return user;
    }

    /**
     * Returns a user by ID if it exists in the database, or null if it doesn't.
     *
     * @param id - The ID for this user.
     */
    const getUserByID = async (id: number): Promise<RepoUser | null> => {
        const user = await User.findByPk(id);
        if (user === null)
            return null;
        return user;
    }

    return {
        createUser,
        getUserByID,
        getUserByUsername
    }
}
