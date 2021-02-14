import type CommentRepository from "../base/comment_repository";
import type {
    CommentOptions, CommentCreate as RepositoryCommentCreate
} from "../base/comment_repository";
import type CommentManager from "../base/comment_manager";
import type { Comment, CommentCreate } from "../base/comment_manager";

import { generateShortID, markdown } from "./utils";

interface Dependencies {
    commentRepository: CommentRepository;
};

export default function({ commentRepository: dataSource }: Dependencies): CommentManager {
    /**
     * Gets all comments for this story, and returns as a tree. The root comments
     * are returned with children comments nested.
     *
     * @param storyID - The ID of the story
     * @param options - Options for fetching comments
     */
    const getCommentTreeByStory = async (
        storyID: number,
        options: CommentOptions
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

    /**
     * Creates a new comment in a story.
     *
     * @param comment - The parameters to create the comment.
     * @return The actual comment
     */
    const createComment = async (
        comment: CommentCreate
    ): Promise<Comment> => {
        // Process Markdown
        const commentHTML = markdown(comment.comment);

        // Generate short URL for comment
        const shortID = generateShortID(6);

        const final: RepositoryCommentCreate = Object.assign({}, comment, {
            comment_html: commentHTML,
            short_url: shortID
        })
        const result = await dataSource.createComment(final);

        return Object.assign(result, { children: [] });
    }

    return {
        createComment,
        getCommentTreeByStory
    };
};
