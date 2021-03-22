import { query } from "./index";
import type UserRepository from "base/user_repository";
import type { User, UserOptions } from "base/user_repository";

const defaultOptions: UserOptions = {
    commentCount: false,
    storyCount: false,
    commentKarma: false,
    storyKarma: false,
};

// Extra query parameters to add.
interface QueryExtras {
    select: string;
    joins: string;
    group: string;
    params: any[];
}

/**
 * Get extra query parts from the options.
 *
 * @param options - Extra features requested by the caller
 * @param params - Existing parameters
 */
const getQueryExtras = (options: UserOptions, params: any[]): QueryExtras => {
    // This is required because we need to fetch the comments themselves before
    // we can fetch the karma for them. Rather than implicitly enabling it,
    // let the caller know.
    if (options.commentKarma && !options.commentCount)
        throw new Error("commentCount must be enabled for commentKarma");
    if (options.storyKarma && !options.storyCount)
        throw new Error("storyCount must be enabled for storyKarma");

    // Our selects match our groups for these extras, so no need to write twice.
    // Make sure to split them if this fact changes!
    const select = `\
        ${options.commentCount ? ", CC.comment_count" : ""}
        ${options.commentKarma ? ", CC.comment_karma" : ""}
        ${options.storyCount ? ", SC.story_count" : ""}
        ${options.storyKarma ? ", SC.story_karma" : ""}`;

    // In the future it might be good to store these values directly in the user
    // table and then update them on user activity, but that could cause the values
    // to drift out of reality due to bugs, so for now let's fetch from scratch.
    return {
        select,
        // Yo dawg I herd you like joins, so I put joins in your joins so you
        // can join while you join. (It's either this or 3 separate queries,
        // pick your poison.)
        joins: `\
            ${options.commentCount
                ? `INNER JOIN (
                    SELECT U.id AS user_id,
                        COUNT(DISTINCT C.id)::integer AS comment_count
                        ${options.commentKarma ? ", COUNT(CV.*)::integer AS comment_karma" : ""}
                    FROM users U
                        LEFT OUTER JOIN comments C ON C.user_id = U.id
                        ${options.commentKarma
                    ? "LEFT OUTER JOIN comment_votes CV ON CV.comment_id = C.id"
                    : ""}
                    GROUP BY U.id
                ) CC ON CC.user_id = U.id`
                : ""}
            ${options.storyCount
                ? `INNER JOIN (
                    SELECT U.id AS user_id,
                        COUNT(DISTINCT S.id)::integer AS story_count
                        ${options.storyKarma ? ", COUNT(SV.*)::integer AS story_karma" : ""}
                    FROM users U
                        LEFT OUTER JOIN stories S ON S.submitter_id = U.id
                        ${options.storyKarma
                    ? "LEFT OUTER JOIN story_votes SV ON SV.story_id = S.id"
                    : ""}
                    GROUP BY U.id
                ) SC ON SC.user_id = U.id`
                : ""}`,
        group: select,
        params
    };
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
    ): Promise<User> => {
        const result = await query<User>(
            `INSERT INTO users (
                username, password, email, about, about_html, avatar_image,
                is_admin
            ) VALUES (
                $1, $2, $3, '', '', $4, false
            ) RETURNING *`,
            [username, password, email, avatarImage]
        );
        return result.rows[0];
    }

    /**
     * Returns a user by username if it exists in the database, or null if it doesn't.
     *
     * @param username - The username for this user.
     * @param _options - What to fetch.
     */
    const getUserByUsername = async (
        username: string,
        _options: UserOptions
    ): Promise<User | null> => {
        const options = Object.assign({}, defaultOptions, _options);
        const extras = getQueryExtras(options, [username]);

        const result = await query<User>(
            `SELECT U.*
                ${extras.select}
            FROM users U
                ${extras.joins}
            WHERE U.username = $1
            GROUP BY U.id
                ${extras.group}`, extras.params);

        if (result.rowCount !== 1)
            return null;
        return result.rows[0];
    }

    /**
     * Returns a user by ID if it exists in the database, or null if it doesn't.
     *
     * @param id - The ID for this user.
     * @param _options - What to fetch.
     */
    const getUserByID = async (
        id: number,
        _options: UserOptions
    ): Promise<User | null> => {
        const options = Object.assign({}, defaultOptions, _options);
        const extras = getQueryExtras(options, [id]);

        const result = await query<User>(
            `SELECT U.*
                ${extras.select}
            FROM users U
                ${extras.joins}
            WHERE U.id = $1
            GROUP BY U.id
                ${extras.group}`, extras.params);

        if (result.rowCount !== 1)
            return null;
        return result.rows[0];
    }

    return {
        createUser,
        getUserByUsername,
        getUserByID
    };
}
