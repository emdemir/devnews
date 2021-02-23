import Router = require("koa-router");

import type CommentManager from "../../base/comment_manager";
import type { Comment } from "../../base/comment_manager";
import type StoryManager from "../../base/story_manager";
import ValidationError from "../../base/validation";

interface Dependencies {
    commentManager: CommentManager;
    storyManager: StoryManager;
}

/**
 * Apply projection to the comment to hide fields we do not wish to display
 * to the user.
 *
 * @param c - The comment
 */
export const commentProject = (c: Comment): Object => {
    const {
        short_url, commented_at, comment, comment_html, username, score,
        children
    } = c;

    return {
        short_url, commented_at, comment, comment_html, username, score,
        children: children.map(commentProject)
    };
};

export default function({ commentManager, storyManager }: Dependencies) {
    const router = new Router();

    // --- Actions ---

    router.post("/:short_url/vote", async ctx => {
        const user = ctx.state.user;
        if (!user) {
            return ctx.throw(404);
        }

        const commentExists = await commentManager.voteOnComment(
            ctx.params.short_url, user);
        if (!commentExists) {
            ctx.throw(404);
        } else {
            ctx.status = 201;
        }
    });

    // --- Detail View ---

    router.get("/:short_url/", async ctx => {
        const user = ctx.params.user;

        const comment = await commentManager.getCommentByShortURL(
            ctx.params.short_url, {
            checkRead: user ? user.id : undefined,
            checkVoter: user ? user.id : undefined,
            score: true,
            username: true
        });
        if (comment === null) {
            return ctx.throw(404);
        }

        ctx.body = commentProject(comment);
    });

    // --- Create View ---

    router.post("/", async ctx => {
        const user = ctx.params.user;
        if (!user) {
            return ctx.throw(403);
        }

        const formData = ctx.request.body;
        const { story: short_url, parent, comment: content } = formData;

        const story = await storyManager.getStoryByShortURL(short_url, {});
        if (story === null) {
            ctx.status = 404;
            return;
        }

        let parent_id: number | null = null;
        if (parent) {
            const parentComment = await commentManager.getCommentByShortURL(parent, {});
            if (parentComment === null) {
                ctx.status = 404;
                ctx.body = { "error": "The parent comment wasn't found (perhaps it's been deleted.)" };
                return;
            }

            parent_id = parentComment.id;
        }

        try {
            const comment = await commentManager.createComment({
                comment: content,
                parent_id,
                story_id: story.id,
                user_id: user.id
            });

            ctx.status = 201;
            ctx.body = commentProject(comment);
        } catch (err) {
            if (err instanceof ValidationError) {
                ctx.status = 400;
                ctx.body = { "error": err.errors };
            } else {
                throw err;
            }
        }
    });

    return router;
}
