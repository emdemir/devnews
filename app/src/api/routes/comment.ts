import Router = require("koa-router");
import passport = require("koa-passport");

import type CommentManager from "base/comment_manager";
import type { Comment } from "base/comment_manager";
import type StoryManager from "base/story_manager";
import { ValidationError } from "base/exceptions";

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
        user_voted, user_read, story_url, children
    } = c;

    return {
        short_url, commented_at, comment, comment_html, username, score,
        user_voted, user_read, story_url,
        children: children.map(commentProject)
    };
};

export default function({ commentManager, storyManager }: Dependencies) {
    const router = new Router();

    // --- Actions ---

    router.post(
        "/:short_url/vote",
        passport.authenticate("jwt", { session: false, }),
        async ctx => {
            const user = ctx.state.user;
            if (!user) {
                return ctx.throw(403);
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

    router.get("/:short_url/",
        passport.authenticate("jwt", { session: false, failWithError: false }),
        async ctx => {
            const user = ctx.state.user;

            const comment = await commentManager.getCommentByShortURL(
                ctx.params.short_url, {
                checkRead: user ? user.id : undefined,
                checkVoter: user ? user.id : undefined,
                score: true,
                username: true,
                storyShortURL: true
            });
            if (comment === null) {
                return ctx.throw(404);
            }

            ctx.body = commentProject(comment);
        });

    // --- Create View ---

    router.post("/",
        passport.authenticate("jwt", { session: false }),
        async ctx => {
            const user = ctx.state.user;
            if (!user) {
                return ctx.throw(403);
            }

            const formData = ctx.request.body;
            const { story: short_url, parent, comment: content } = formData;

            if (!short_url) {
                ctx.status = 400;
                ctx.body = { "error": "Missing \"story\" parameter." };
                return;
            }

            const story = await storyManager.getStoryByShortURL(short_url, {});
            if (story === null) {
                ctx.status = 404;
                return;
            }

            const parentComment = parent
                ? await commentManager.getCommentByShortURL(parent, {})
                : null;
            if (parent && parentComment === null) {
                ctx.status = 404;
                ctx.body = {
                    "error": "The parent comment wasn't found (perhaps it's " +
                        "been deleted.)"
                };
                return;
            }

            try {
                const comment = await commentManager.createComment({
                    comment: content,
                    parent: parentComment,
                    story_id: story.id,
                    user_id: user.id
                });
                // Set some parameters that the other end expects.
                comment.score = 1;
                comment.username = user.username;
                comment.user_voted = true;
                comment.user_read = true;

                ctx.status = 201;
                ctx.body = commentProject(comment);
            } catch (err) {
                if (err instanceof ValidationError) {
                    ctx.status = 400;
                    ctx.body = { "errors": err.errors };
                } else {
                    throw err;
                }
            }
        });

    // --- Delete View ---

    router.delete("/:short_url",
        passport.authenticate("jwt", { session: false }),
        async ctx => {
            const { user } = ctx.state;
            const { short_url } = ctx.params;

            await commentManager.deleteComment(user, short_url);
            ctx.status = 204;
        }
    );

    return router;
}
