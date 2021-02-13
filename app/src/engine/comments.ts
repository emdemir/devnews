import marked = require("marked");
import createDOMPurify = require("dompurify");

import * as dataSource from "../datasource/comments";
export type { CommentOptions } from "../datasource/comments";
import { generateShortID } from "./utils";
import { JSDOM } from "jsdom";

export interface Comment extends dataSource.Comment {
    children: Comment[];
};

/**
 * Gets all comments for this story, and returns as a tree. The root comments
 * are returned with children comments nested.
 *
 * @param storyID - The ID of the story
 * @param options - Options for fetching comments
 */
export const getCommentTreeByStory = async (
    storyID: number,
    options: dataSource.CommentOptions
): Promise<Comment[]> => {
    const rawComments = await dataSource.getCommentsByStory(storyID, options);

    // Build mapping from ID to comments
    const mapping: { [id: number]: Comment } = {};
    const comments: Comment[] = [];
    rawComments.forEach(c => {
        // Create a copy with children array to typecast.
        const comment: Comment = Object.assign({}, c, { children: [] });
        mapping[comment.id] = comment;
        comments.push(comment);
    })

    // Go through all comments, and attach children to parents. If comment
    // has no parent, add to roots
    const roots: Comment[] = [];
    comments.forEach(c => {
        if (c.parent_id) {
            if (!(c.parent_id in mapping)) {
                console.warn("Comment with nonexistent parent on story! ID:", c.id);
                return;
            }

            mapping[c.parent_id].children.push(c);
        } else {
            roots.push(c);
        }
    })

    // TODO: sorting the comment tree by score
    return roots;
}

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

// Please work with me here.
const window = new JSDOM("").window;
const domPurify = createDOMPurify(window as unknown as Window);

/**
 * Creates a new comment in a story.
 *
 * @param comment - The parameters to create the comment.
 * @return The actual comment
 */
export const createComment = async (
    comment: CommentCreate
): Promise<Comment> => {
    // Process Markdown
    const commentHTML = marked(domPurify.sanitize(comment.comment, {
        ALLOWED_TAGS: []
    }));

    // Generate short URL for comment
    const shortID = generateShortID(6);

    const final: dataSource.CommentCreate = Object.assign({}, comment, {
        comment_html: commentHTML,
        short_url: shortID
    })
    const result = await dataSource.createComment(final);

    return Object.assign(result, { children: [] });
}
