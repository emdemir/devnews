import { Op } from "sequelize";
import type UserRepository from "../base/user_repository";
import type { User as RepoUser, UserOptions } from "../base/user_repository";

import { comment_votes, story_votes, User } from "./tables";

const defaultOptions: UserOptions = {
    commentCount: false,
    commentKarma: false,
    storyCount: false,
    storyKarma: false,
};

/**
 * Fetch any extra attributes the caller requested and return a repository User.
 *
 * @param user - The user object to be returned
 * @param options - What to fetch
 */
const withExtras = async (user: User, options: UserOptions): Promise<RepoUser> => {
    // This is required because we need to fetch the comments themselves before
    // we can fetch the karma for them. Rather than implicitly enabling it,
    // let the caller know.
    if (options.commentKarma && !options.commentCount)
        throw new Error("commentCount must be enabled for commentKarma");
    if (options.storyKarma && !options.storyCount)
        throw new Error("storyCount must be enabled for storyKarma");

    const u = user.get({ plain: true });

    if (options.commentCount) {
        if (options.commentKarma) {
            // Fetch IDs to count votes
            const commentIDs = await user.getComments({ attributes: ["id"] });
            u.comment_count = commentIDs.length;

            // Tally the users' votes
            u.comment_karma = await comment_votes.count({
                where: {
                    comment_id: {
                        [Op.in]: commentIDs.map(c => c.id)
                    }
                }
            });
        } else {
            // Simple COUNT()
            u.comment_count = await user.countComments();
        }
    }

    if (options.storyCount) {
        if (options.storyKarma) {
            // Fetch IDs to count votes
            const storyIDs = await user.getStories({ attributes: ["id"] });
            u.story_count = storyIDs.length;

            // Tally the users' votes
            u.story_karma = await story_votes.count({
                where: {
                    story_id: {
                        [Op.in]: storyIDs.map(c => c.id)
                    }
                }
            });
        } else {
            // Simple COUNT()
            u.story_count = await user.countStories();
        }
    }

    return u;
}

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

        return user.get({ plain: true });
    }

    /**
     * Returns a user by username if it exists in the database, or null if it doesn't.
     *
     * @param username - The username for this user.
     * @param options - What to fetch.
     */
    const getUserByUsername = async (
        username: string,
        _options: UserOptions
    ): Promise<RepoUser | null> => {
        const options = Object.assign({}, defaultOptions, _options);

        const user = await User.findOne({ where: { username } });
        if (user === null)
            return null;
        return await withExtras(user, options);
    }

    /**
     * Returns a user by ID if it exists in the database, or null if it doesn't.
     *
     * @param id - The ID for this user.
     * @param options - What to fetch.
     */
    const getUserByID = async (
        id: number,
        _options: UserOptions
    ): Promise<RepoUser | null> => {
        const options = Object.assign({}, defaultOptions, _options);

        const user = await User.findByPk(id);
        if (user === null)
            return null;
        return await withExtras(user, options);
    }

    return {
        createUser,
        getUserByID,
        getUserByUsername
    }
}
