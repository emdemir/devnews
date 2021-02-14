import Router = require("koa-router");

import type { AppContext } from "../";
import type StoryManager from "../../base/story_manager";
import type CommentManager from "../../base/comment_manager";

interface Dependencies {
    storyManager: StoryManager;
    commentManager: CommentManager;
}

export default function({ storyManager, commentManager }: Dependencies) {
    const router = new Router<any, AppContext>();

    // --- Actions ---

    router.post(
        "/:short_url/vote",
        async ctx => {
            if (!ctx.state.user) {
                return ctx.redirect("/auth/login/");
            }

            const storyFound = await storyManager.voteOnStory(
                ctx.params.short_url, ctx.state.user);
            if (!storyFound) {
                return await ctx.render("pages/404.html", {
                    reason: "nostory", user: ctx.state.user
                });
            }

            // Redirect the user to their referrer, or the story if there isn't one
            if (ctx.headers["referer"]) {
                ctx.redirect(ctx.headers["referer"])
            } else {
                ctx.redirect(`/s/${ctx.params.short_url}/`)
            }
        }
    );

    router.post(
        "/:short_url/comment",
        async ctx => {
            if (!ctx.state.user) {
                return ctx.redirect("/auth/login/");
            }

            const story = await storyManager.getStoryByShortURL(
                ctx.params.short_url, {});
            if (story === null) {
                return await ctx.render("pages/404.html", {
                    reason: "nostory", user: ctx.state.user
                });
            }

            await commentManager.createComment({
                story_id: story.id,
                user_id: ctx.state.user.id,
                // TODO replies
                parent_id: null,
                comment: ctx.request.body.comment
            });

            // Redirect the user to their referrer, or the story if there isn't one
            if (ctx.headers["referer"]) {
                ctx.redirect(ctx.headers["referer"])
            } else {
                ctx.redirect(`/s/${ctx.params.short_url}/`)
            }
        }
    );

    // --- View ---

    router.get("/:short_url/:slug?", async ctx => {
        const user = ctx.state.user;

        const story = await storyManager.getStoryByShortURL(ctx.params.short_url, {
            submitterUsername: true,
            score: true,
            commentCount: true,

            checkVoter: user ? user.id : undefined
        });

        if (story === null) {
            await ctx.render("pages/404.html", { reason: "nostory", user });
        } else {
            const comments = await commentManager.getCommentTreeByStory(story.id, {
                username: true,
                score: true,
                checkRead: user ? user.id : undefined,
                checkVoter: user ? user.id : undefined
            });
            await ctx.render("pages/story.html", { story, comments, user });
        }
    });

    return router;
}
