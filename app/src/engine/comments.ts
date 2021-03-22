import type CommentRepository from "../base/comment_repository";
import type {
    CommentOptions, CommentCreate as RepositoryCommentCreate
} from "../base/comment_repository";
import type CommentManager from "../base/comment_manager";
import type { Comment, CommentCreate } from "../base/comment_manager";
import type { User } from "../base/user_repository";

import { generateShortID, markdown } from "./utils";
import { ValidationError } from "../base/exceptions";

const MAXIMUM_COMMENT_LENGTH = 2000;

const validators = {
    comment: (errors: string[], comment: string) => {
        if (!comment)
            errors.push("Comment cannot be empty.");
        else if (comment.length > MAXIMUM_COMMENT_LENGTH)
            errors.push(`\
Comment length is too long, please shorten to ${MAXIMUM_COMMENT_LENGTH} characters
or less.`);
    },
    parent: (errors: string[], story_id: number, parent: Comment | null) => {
        if (parent !== null && story_id !== parent.story_id) {
            errors.push("That comment does not exist on the story.");
        }
    }
};

interface Dependencies {
    commentRepository: CommentRepository;
};

/**
 * Visit all comments in a comment tree. This is a depth-first visit.
 *
 * @param comments - The list of comments.
 * @param visitor - The visitor function.
 */
const visitComments = (comments: Comment[], visitor: { (c: Comment): void }) => {
    comments.forEach(c => {
        visitComments(c.children, visitor);
        visitor(c);
    })
}

/**
 * Return a rank value for the given comment.
 *
 * @param comment - The comment
 * @return Rank value
 */
const commentRank = (comment: Comment): number => {
    // A comment's rank is calculated as the log10 of the current score for
    // this comment, plus the age of this comment. Since the rank is sorted
    // descending, it is given a negative score (so newer comment have a
    // higher rank).
    //
    // This is essentially the same algorithm as the story ranking algorithm
    // in the database. The reason we added it here instead of the database
    // is because of the expectation that, while there will be (tens of) thousands
    // of stories posted over the course of the website, each story will receive
    // 100-200 comments at most, and so this is cheaper than doing an extra
    // database join for the comment rank.

    if (comment.score === undefined)
        throw new Error("Comment ranking requires the comment's score to be fetched.");

    // Rounded to 7 decimal places.
    return -Math.floor(
        (
            Math.log10(Math.max(comment.score + 1, 1))
            + (+comment.commented_at / (1000 * 60 * 60 * 24))
        ) * 10_000_000
    ) / 10_000_000;
}

/**
 * Sorts a list of comments by the "comment rank" algorithm (in-place).
 *
 * @param comments - The list of comments
 */
const sortByRank = (comments: Comment[]): void => {
    // Sneak in a "rank" value to avoid re-calculating it.
    comments.forEach(c => {
        (c as any).rank = commentRank(c);
        console.log(`Comment ${c.short_url} rank: ${(c as any).rank}`);
    });

    comments.sort((a, b) => (a as any).rank - (b as any).rank);

    // Remove our sneaked in "rank" value.
    comments.forEach(c => delete (c as any).rank);
}

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

        // Sort the comment tree
        visitComments(roots, (c) => sortByRank(c.children));
        // The root as well
        sortByRank(roots);

        return roots;
    }

    const getCommentByShortURL = async (
        short_url: string,
        options: CommentOptions
    ): Promise<Comment | null> => {
        const comment = await dataSource.getCommentByShortURL(short_url, options);
        if (comment === null)
            return null;

        return {
            ...comment,
            children: []
        };
    }

    const voteOnComment = (short_url: string, user: User) =>
        dataSource.voteOnComment(short_url, user.id);

    /**
     * Creates a new comment in a story.
     *
     * @param comment - The parameters to create the comment.
     * @return The actual comment
     */
    const createComment = async (
        comment: CommentCreate
    ): Promise<Comment> => {
        const errors: string[] = [];

        validators.comment(errors, comment.comment);
        validators.parent(errors, comment.story_id, comment.parent);

        if (errors.length) {
            throw new ValidationError(errors);
        }

        // Process Markdown
        const commentHTML = markdown(comment.comment);

        // Generate short URL for comment
        const shortURL = generateShortID(6);

        const final: RepositoryCommentCreate = {
            comment: comment.comment,
            comment_html: commentHTML,
            parent_id: comment.parent ? comment.parent.id : null,
            short_url: shortURL,
            story_id: comment.story_id,
            user_id: comment.user_id
        }
        const result = await dataSource.createComment(final);

        return Object.assign(result, { children: [] });
    }

    /**
     * Mark the given comments as read by the user.
     *
     * @param user - The user who read the comments.
     * @param comments - An array of comments to mark as read.
     * @param sameUser - Whether the user the comments were pulled for and the
     * passed user is the same. If true, then the comment's user_read value
     * will be used to optimize the "mark read" action.
     */
    const markCommentsAsRead = async (
        user: User,
        comments: Comment[],
        sameUser: boolean = false
    ): Promise<void> => {
        const commentIDs: number[] = [];
        // Fetch all IDs from the comment tree.
        visitComments(comments, c => {
            // If the user isn't the same one as the user whom the comments were
            // pulled for, or if it _was_ and the user hasn't read it, add it
            // to the list of comments to mark as read.
            //
            // === false won't match user_read = undefined, so this is still safe
            // if checkRead wasn't specified while pulling comments (just gives
            // us some extra work)
            if (!sameUser || c.user_read === false) {
                commentIDs.push(c.id);
            }
        });

        // Avoid a database roundtrip if we don't need to update any comments.
        if (commentIDs.length > 0)
            await dataSource.markCommentsAsRead(user.id, commentIDs);
    }

    return {
        createComment,
        voteOnComment,
        getCommentByShortURL,
        getCommentTreeByStory,
        markCommentsAsRead
    };
};
