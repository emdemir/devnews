/** @file The interface for a comment manager. */

import type { Comment as RepositoryComment, CommentOptions } from "./comment_repository";

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
     * Gets all comments for this story, and returns as a tree. The root comments
     * are returned with children comments nested.
     *
     * @param storyID - The ID of the story
     * @param options - Options for fetching comments
     */
    getCommentTreeByStory(storyID: number, options: CommentOptions): Promise<Comment[]>;

    /**
     * Creates a new comment in a story.
     *
     * @param comment - The parameters to create the comment.
     * @return The actual comment
     */
    createComment(comment: CommentCreate): Promise<Comment>;
};

export default CommentManager;
