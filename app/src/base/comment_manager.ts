/** @file The interface for a comment manager. */

import type { Comment as RepositoryComment, CommentOptions } from "./comment_repository";
import type { User } from "./user_repository";

export interface Comment extends RepositoryComment {
    children: Comment[];
};

// The fields that are required when creating a new comment.
export interface CommentCreate {
    // The ID of the story.
    story_id: number;
    // If this is a reply, the parent comment ID. Otherwise null.
    parent_id: number | null;
    // The user who made the comment.
    user_id: number;
    // The contents of the comment as Markdown (user input).
    comment: string;
};

interface CommentManager {
    /**
     * Get all comments for this story, and return them as a tree. The root
     * comments are returned with children comments nested.
     *
     * @param storyID - The ID of the story
     * @param options - Options for fetching comments
     */
    getCommentTreeByStory(storyID: number, options: CommentOptions): Promise<Comment[]>;
    /**
     * Return a comment by its short URL.
     *
     * @param short_url - The short URL of the comment
     * @param options - What to fetch
     */
    getCommentByShortURL(short_url: string, options: CommentOptions): Promise<Comment | null>;
    /**
     * Give a vote on a comment by user, or retracts the vote if it already exists.
     *
     * @param short_url - The short URL for the comment.
     * @param user - The user voting on the comment.
     * @return false if the comment was missing, true otherwise.
     */
    voteOnComment(short_url: string, user: User): Promise<boolean>;
    /**
     * Create a new comment in a story.
     *
     * @param comment - The parameters to create the comment.
     * @return The actual comment
     */
    createComment(comment: CommentCreate): Promise<Comment>;
    /**
     * Mark the given comments as read by the user.
     *
     * @param user - The user who read the comments.
     * @param comments - An array of comments to mark as read.
     * @param sameUser - Whether the user the comments were pulled for and the
     * passed user is the same. If true, then the comment's user_read value
     * will be used to optimize the "mark read" action.
     */
    markCommentsAsRead(user: User, comments: Comment[], sameUser?: boolean): Promise<void>;
};

export default CommentManager;
