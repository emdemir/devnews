import { query } from "./index";

export interface Comment {
    id: number;
    story_id: number;
    user_id: number;
    parent_id: number;
    short_url: string;
    commented_at: Date;
    comment: string;
    comment_html: string;

    // Aggregated fields
    score?: number;
    user_voted?: boolean;
    read?: boolean;
};

// Optional fetches during the query.
export interface CommentOptions {
    // Fetch the username for this comment.
    username?: boolean;
    // Fetch the score of this comment.
    score?: boolean;
    // If not undefined, fetch whether the user with the given ID read the comment.
    checkRead?: number;
    // If not undefined, fetch whether the user with the given ID voted on the comment.
    checkVoter?: number;
};

const defaultOptions: CommentOptions = {
    username: false,
    score: false
};

/**
 * Return all comm*/
export const getCommentsByStory = async (
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
        WHERE C.story_id = $1
        GROUP BY C.id
            ${options.username ? ", U.username" : ""}
            ${options.score ? ", S.score" : ""}`, params);

    // TODO: comment rank for client-side sorting. As far as I can tell I can't
    // sort the comments as a tree by ranks and I don't want to
    // get into recursive CTEs.
    return result.rows;
};

// The parameters required to create a comment.
export interface CommentCreate {
    // The ID of the story.
    story_id: number;
    // If this is a reply, the parent comment ID. Otherwise null.
    parent_id: number | null;
    // The user who made the comment.
    user_id: number;
    // The short URL for this comment.
    short_url: string;
    // The contents of the comment as Markdown (user input).
    comment: string;
    // The contents of the comment as HTML (sanitized).
    comment_html: string;
};

/**
 * Create a new comment with the specified parameters.
 *
 * @param comment - The comment parameters
 */
export const createComment = async (
    comment: CommentCreate
): Promise<Comment> => {
    // Let BLL handle failure.
    const result = await query<Comment>(
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

    return result.rows[0];
}
