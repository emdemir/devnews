import Router = require("koa-router");

import type { AppContext } from "../";
import type CommentManager from "base/comment_manager";
import type StoryManager from "base/story_manager";

interface Dependencies {
    commentManager: CommentManager;
    storyManager: StoryManager;
}

export default function({ commentManager, storyManager }: Dependencies) {
    const router = new Router<any, AppContext>();

    // --- Actions ---

    router.post("/:short_url/vote", async ctx => {
        const user = ctx.state.user;
        if (!user) {
            return ctx.redirect("/auth/login/");
        }

        const commentExists = await commentManager.voteOnComment(
            ctx.params.short_url, user);
        if (!commentExists) {
            ctx.throw(404);
        } else {
            return ctx.redirect(`/c/${ctx.params.short_url}`);
        }
    });

    router.post("/:short_url/delete", async ctx => {
        const user = ctx.state.user;
        if (!user) {
            return ctx.redirect("/auth/login/");
        }

        const { short_url } = ctx.params;
        const { confirm } = ctx.query;

        // Need to redirect to the story the comment belongs to, so fetch
        // the comment before deletion.
        const comment = await commentManager.getCommentByShortURL(short_url, {
            score: true,
            username: true
        });
        if (comment === null) {
            return ctx.throw(404);
        }

        if (!confirm) {
            return await ctx.render("pages/confirm.html", {
                title: "Delete Comment",
                message: "Are you sure you want to delete this comment?",
                preview: await ctx.render("partials/comment.html", {
                    comment, preview: true
                }),
                user, csrf: ctx.csrf
            });
        } else {
            await commentManager.deleteComment(user, short_url);

            // Need to fetch story for its short URL
            const story = await storyManager.getStoryByID(comment.story_id, {});
            ctx.redirect(`/s/${story!.short_url}`);
        }
    });

    // --- Detail View ---

    // This view just redirects the user to the correct place in the
    // parent story.
    router.get("/:short_url", async ctx => {
        const comment = await commentManager.getCommentByShortURL(ctx.params.short_url, {});
        if (comment === null) {
            return ctx.throw(404);
        }

        const story = await storyManager.getStoryByID(comment.story_id, {});

        return ctx.redirect(`/s/${story!.short_url}/#c_${comment.short_url}`);
    });

    return router;
}
