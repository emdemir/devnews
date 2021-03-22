import { Sequelize, Op } from "sequelize";
import { Comment, comment_votes, read_comments, User } from "./tables";

import type CommentRepository from "base/comment_repository";
import type {
    Comment as RepoComment,
    CommentOptions,
    CommentCreate
} from "base/comment_repository";
import type { Includeable } from "sequelize";
import sequelize from "./";

const defaultOptions: CommentOptions = {
    username: false,
    score: false
};

interface QueryExtras {
    joins: Includeable[];
    group: string[];
};

const collectExtras = (options: CommentOptions): QueryExtras => {
    const joins: Includeable[] = [];
    const group: string[] = [];

    if (options.username) {
        joins.push({
            model: User as any,
            as: "user",
            required: true,
            attributes: ["username"]
        });
        group.push("user.id");
    }

    if (options.score) {
        joins.push({
            model: User as any,
            as: "votes",
            attributes: [
                [
                    Sequelize.fn("COUNT", Sequelize.col("votes.id")),
                    "score"
                ]
            ]
        });
        group.push("votes.id");
        group.push("votes->comment_votes.comment_id");
        group.push("votes->comment_votes.user_id");
    }

    if (options.checkRead !== undefined) {
        joins.push({
            model: User as any,
            as: "viewers",
            required: false,
            where: {
                id: options.checkRead
            },
            attributes: ["id"]
        });
        group.push("viewers.id");
        group.push("viewers->read_comments.comment_id");
        group.push("viewers->read_comments.user_id");
    }

    return { joins, group };
}

/**
 * Returns the comment IDs this user has voted on.
 */
const fetchUserVotes = async (
    user_id: number,
    comments: number[]
): Promise<number[]> => {
    const voted_comments: number[] = [];

    const result = await comment_votes.findAll({
        where: {
            user_id,
            comment_id: { [Op.in]: comments }
        },
        attributes: ["comment_id"]
    });

    result.forEach(res => {
        voted_comments.push(+res.getDataValue("comment_id"));
    });

    return voted_comments;
}

/**
 * Fix the Sequelize object to match the Comment interface.
 *
 * @param c - The Sequelize comment
 * @param options - Fetch options
 * @param votedComments - The array of comments the user voted on
 */
const unwrapComment = (
    c: Comment,
    options: CommentOptions,
    votedComments: number[]
): RepoComment => {
    const comment = c.get({ plain: true });
    const cc = comment as any;

    if (options.username)
        comment.username = cc.user.username;
    if (options.score)
        comment.score = cc.votes.length;
    if (options.checkRead !== undefined)
        comment.user_read = !!cc.viewers.length;
    if (options.checkVoter !== undefined)
        comment.user_voted = votedComments.includes(comment.id);

    // Clean up object from nested values
    if (options.username)
        delete cc.user;
    if (options.score)
        delete cc.votes;
    if (options.checkRead !== undefined)
        delete cc.viewers;

    return comment;
}

export default function({ }): CommentRepository {
    /**
     * Return all comments for the given story ID.
     *
     * @param storyID - The ID of the story
     * @param _options - Additional things to fetch.
     */
    const getCommentsByStory = async (
        storyID: number,
        _options: CommentOptions
    ): Promise<RepoComment[]> => {
        const options = Object.assign({}, defaultOptions, _options);

        const { joins, group } = collectExtras(options);

        const comments = await Comment.findAll({
            include: joins,
            where: {
                story_id: storyID
            },
            group: ["Comment.id"].concat(group)
        });

        // Because we already used the "votes" alias once, we can't use it again
        // and I couldn't find any way to get an SQL alias of a sequelize alias.
        // So this is a separate query because Sequelize is inadequate.
        const votedComments = options.checkVoter !== undefined
            ? await fetchUserVotes(options.checkVoter, comments.map(m => m.id))
            : [];

        return comments.map(model => unwrapComment(model, options, votedComments));
    };

    /**
     * Return a comment by its short URL.
     *
     * @param short_url - The short URL of the comment
     * @param _options - What to fetch
     */
    const getCommentByShortURL = async (
        short_url: string,
        _options: CommentOptions
    ): Promise<RepoComment | null> => {
        const options = Object.assign({}, defaultOptions, _options);

        const { joins, group } = collectExtras(options);

        const comment = await Comment.findOne({
            include: joins,
            where: { short_url },
            group: ["Comment.id"].concat(group)
        });
        if (comment === null)
            return null;

        const votedComments = options.checkVoter !== undefined
            ? await fetchUserVotes(options.checkVoter, [comment.id])
            : [];

        return unwrapComment(comment, options, votedComments);
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
        const result = await sequelize.transaction(async (t) => {
            // Get the story
            const comment = await Comment.findOne({
                where: {
                    short_url
                },
                transaction: t
            });
            if (comment === null)
                return false;

            // Check whether the user voted
            if (!await comment.hasVote(user_id, { transaction: t })) {
                // User didn't vote, cast
                await comment.addVote(user_id, { transaction: t });
            } else {
                // User voted. Retract
                await comment.removeVote(user_id, { transaction: t });
            }

            return true;
        })

        return result;
    };

    /**
     * Create a new comment with the specified parameters.
     *
     * @param comment - The comment parameters
     */
    const createComment = async (comment: CommentCreate): Promise<RepoComment> => {
        const result = await sequelize.transaction(async (t) => {
            const newComment = await Comment.create(comment, { transaction: t });
            // Vote on the comment
            await newComment.addVote(comment.user_id, { transaction: t });
            // Mark the comment as "viewed"
            await newComment.addViewer(comment.user_id, { transaction: t });

            return newComment;
        });

        return result;
    };

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
        await read_comments.bulkCreate(commentIDs.map(c => ({
            user_id: userID,
            comment_id: c
        })), {
            // ignoreDuplicates, because the user may have already read some
            // of the comments and that isn't an error.
            ignoreDuplicates: true
        });
    }

    /**
     * Delete a comment by its ID.
     *
     * @param id - The comment ID.
     */
    const deleteComment = async (id: number): Promise<void> => {
        const comment = await Comment.findByPk(id);
        if (comment !== null)
            await comment.destroy();
    }

    return {
        createComment,
        getCommentByShortURL,
        voteOnComment,
        getCommentsByStory,
        markCommentsAsRead,
        deleteComment
    }
}
