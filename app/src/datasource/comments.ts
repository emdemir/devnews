import { query, getClient } from "./index";
import type CommentRepository from "base/comment_repository";
import type { Comment, CommentOptions, CommentCreate } from "base/comment_repository";

const defaultOptions: CommentOptions = {
    username: false,
    score: false
};

export default function({ }): CommentRepository {
    /**
     * Return all comments for the given story ID.
     *
     * @param storyID - The ID of the story
     * @param options - Additional things to fetch.
     */
    const getCommentsByStory = async (
        storyID: number,
        _options: CommentOptions
    ): Promise<Comment[]> => {
        const options = Object.assign({}, defaultOptions, _options);

        const params: any[] = [storyID];

        // This is a dumb but working way of getting the positional parameters'
        // positions always right. PostgreSQL sadly does not support named
        // parameters in queries. I also didn't want to introduce _yet another_
        // library. Fortunately, Array.prototype.push returns the length of the new
        // array which can be used for the parameter number.
        const result = await query<Comment>(`\
            SELECT C.*
                ${options.score ? ", S.score::integer" : ""}
                ${options.username ? ", U.username" : ""}
                ${options.checkRead !== undefined ? ", COUNT(R.*)::integer::boolean as user_read" : ""}
                ${options.checkVoter !== undefined ? ", COUNT(V.*)::integer::boolean as user_voted" : ""}
            FROM comments C
                ${options.username ? "INNER JOIN users U on U.id = C.user_id" : ""}
                ${options.score ? "INNER JOIN comment_score S ON S.id = C.id" : ""}
                ${options.checkRead !== undefined
                ? `LEFT OUTER JOIN read_comments R ON R.comment_id = C.id AND R.user_id = $${params.push(options.checkRead)}`
                : ""}
                ${options.checkVoter !== undefined
                ? `LEFT OUTER JOIN comment_votes V ON V.comment_id = C.id AND V.user_id = $${params.push(options.checkVoter)}`
                : ""}
            WHERE C.story_id = $1
            GROUP BY C.id
                ${options.username ? ", U.username" : ""}
                ${options.score ? ", S.score" : ""}`, params);

        // TODO: comment rank for client-side sorting. As far as I can tell I can't
        // sort the comments as a tree by ranks and I don't want to
        // get into recursive CTEs.
        return result.rows;
    };

    /**
     * Return a comment by its short URL.
     *
     * @param short_url - The short URL of the comment
     * @param options - What to fetch
     */
    const getCommentByShortURL = async (
        short_url: string,
        _options: CommentOptions
    ): Promise<Comment | null> => {
        const options = Object.assign({}, defaultOptions, _options);

        const params: any[] = [short_url];

        const result = await query<Comment>(`\
            SELECT C.*
                ${options.score ? ", S.score" : ""}
                ${options.username ? ", U.username" : ""}
                ${options.checkRead !== undefined ? ", COUNT(R.*)::integer::boolean as user_read" : ""}
                ${options.checkVoter !== undefined ? ", COUNT(V.*)::integer::boolean as user_voted" : ""}
            FROM comments C
                ${options.username ? "INNER JOIN users U on U.id = C.user_id" : ""}
                ${options.score ? "INNER JOIN comment_score S ON S.id = C.id" : ""}
                ${options.checkRead !== undefined
                ? `LEFT OUTER JOIN read_comments R ON R.comment_id = C.id AND R.user_id = $${params.push(options.checkRead)}`
                : ""}
                ${options.checkVoter !== undefined
                ? `LEFT OUTER JOIN comment_votes V ON V.comment_id = C.id AND V.user_id = $${params.push(options.checkVoter)}`
                : ""}
            WHERE C.short_url = $1
            GROUP BY C.id
                ${options.username ? ", U.username" : ""}
                ${options.score ? ", S.score" : ""}`, params);

        if (result.rowCount === 0)
            return null;
        return result.rows[0];
    };

    /**
     * Either casts or retracts a vote on the comment for the user.
     *
     * @param short_url - The short URL for the comment.
     * @param user - The user casting the vote
     * @return true if comment exists in db
     */
    const voteOnComment = async (
        short_url: string,
        user_id: number
    ): Promise<boolean> => {
        const client = await getClient();

        try {
            await client.query("BEGIN");

            // Get the comment ID
            const idResult = await client.query<{ id: number }>(
                "SELECT C.id FROM comments C WHERE C.short_url = $1",
                [short_url]
            );
            if (idResult.rowCount === 0)
                return false;
            const comment_id = idResult.rows[0].id;

            // Check if the user casted a vote
            const checkResult = await client.query(
                `SELECT COUNT(*)::integer AS count FROM comment_votes
                 WHERE user_id = $1 AND comment_id = $2`,
                [user_id, comment_id]
            );
            if (!checkResult.rows[0].count) {
                // User didn't vote, cast
                await client.query(`\
                    INSERT INTO comment_votes
                        (user_id, comment_id)
                    VALUES ($1, $2)`, [user_id, comment_id]);
            } else {
                // User already voted, retract
                await client.query(`\
                    DELETE FROM comment_votes
                    WHERE user_id = $1 AND comment_id = $2`,
                    [user_id, comment_id]
                );
            }

            await client.query("COMMIT");
            return true;
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Create a new comment with the specified parameters.
     *
     * @param comment - The comment parameters
     */
    const createComment = async (
        comment: CommentCreate
    ): Promise<Comment> => {
        const client = await getClient();

        try {
            await client.query("BEGIN");

            // Create the comment.
            const result = await client.query<Comment>(
                `INSERT INTO comments
                (story_id, parent_id, user_id, short_url, comment, comment_html)
            VALUES
                ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
                [
                    comment.story_id,
                    comment.parent_id,
                    comment.user_id,
                    comment.short_url,
                    comment.comment,
                    comment.comment_html
                ]
            );
            const newComment = result.rows[0];

            // Vote on the comment as the current user.
            await client.query(
                `INSERT INTO comment_votes (comment_id, user_id) VALUES ($1, $2)`,
                [newComment.id, comment.user_id]);

            // Mark the comment as read by the current user.
            await client.query(
                `INSERT INTO read_comments (comment_id, user_id) VALUES ($1, $2)`,
                [newComment.id, comment.user_id]);

            // Finish query.
            await client.query("COMMIT");
            return newComment;
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Mark the comments with the given IDs as read for the given user ID.
     *
     * @param userID - The ID of the user.
     * @param commentIDs - An array of IDs of comments.
     */
    const markCommentsAsRead = async (
        userID: number,
        commentIDs: number[]
    ): Promise<void> => {
        // We can insert them as two parameters, but they have to be "unzipped"
        // in this fashion.
        const params: [number[], number[]] = [[], []];
        commentIDs.forEach(c => {
            params[0].push(userID);
            params[1].push(c);
        });

        // ON CONFLICT DO NOTHING, because the user may have already read some
        // of the comments and that isn't an error.
        await query(
            `INSERT INTO read_comments (user_id, comment_id)
                SELECT user_id, comment_id FROM
                unnest($1::integer[], $2::integer[]) AS new_read (user_id, comment_id)
             ON CONFLICT DO NOTHING`, params);
    }

    return {
        createComment,
        voteOnComment,
        getCommentByShortURL,
        getCommentsByStory,
        markCommentsAsRead
    }
};
