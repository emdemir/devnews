/** @file The interface for a comment repository. */

// A single comment.
export interface Comment {
    id: number;
    story_id: number;
    user_id: number;
    parent_id: number;
    short_url: string;
    commented_at: Date;
    comment: string;
    comment_html: string;

    // Aggregated/optional fields
    score?: number;
    user_voted?: boolean;
    user_read?: boolean;
    username?: string;
    story_url?: string;
};

// Optional fetches during the query.
export interface CommentOptions {
    // Fetch the username for this comment.
    username?: boolean;
    // Fetch the score of this comment.
    score?: boolean;
    // Fetch the short URL of the story as well.
    storyShortURL?: boolean;
    // If not undefined, fetch whether the user with the given ID read the comment.
    checkRead?: number;
    // If not undefined, fetch whether the user with the given ID voted on the comment.
    checkVoter?: number;
};

// Optional fetches for a list of comments.
export interface CommentListOptions extends CommentOptions {
    limit?: number;
    offset?: number;
}

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

interface CommentRepository {
    /**
     * Get the latest comments across the site.
     *
     * @param options - What/how to fetch.
     */
    getLatestComments(options: CommentListOptions): Promise<Comment[]>;
    /**
     * Return all comments for the given story ID.
     *
     * @param storyID - The ID of the story
     * @param options - Additional things to fetch.
     */
    getCommentsByStory(storyID: number, options: CommentOptions): Promise<Comment[]>;
    /**
     * Return a comment by its short URL.
     *
     * @param short_url - The short URL of the comment
     * @param options - What to fetch
     */
    getCommentByShortURL(short_url: string, options: CommentOptions): Promise<Comment | null>;
    /**
     * Either casts or retracts a vote on the comment for the user.
     *
     * @param short_url - The short URL for the comment.
     * @param user - The user casting the vote
     * @return true if comment exists in db
     */
    voteOnComment(short_url: string, user_id: number): Promise<boolean>;
    /**
     * Create a new comment with the specified parameters.
     *
     * @param comment - The comment parameters
     */
    createComment(comment: CommentCreate): Promise<Comment>;
    /**
     * Mark the comments with the given IDs as read for the given user ID.
     *
     * @param userID - The ID of the user.
     * @param commentIDs - An array of IDs of comments.
     */
    markCommentsAsRead(userID: number, commentIDs: number[]): Promise<void>;
    /**
     * Delete a comment by its ID.
     *
     * @param id - The comment ID.
     */
    deleteComment(id: number): Promise<void>;
};

export default CommentRepository;
