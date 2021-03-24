import Router = require("koa-router");

import type { AppContext } from "../";
import type StoryManager from "base/story_manager";
import type TagManager from "base/tag_manager";
import type CommentManager from "base/comment_manager";

interface Dependencies {
    storyManager: StoryManager;
    commentManager: CommentManager;
    tagManager: TagManager;
};

export default function({ storyManager, commentManager, tagManager }: Dependencies) {
    const router = new Router<any, AppContext>();

    router.get("/", async ctx => {
        const user = ctx.state.user;
        const page = +ctx.query.page || 1;

        const stories = await storyManager.getStories(page, {
            submitterUsername: true,
            score: true,
            commentCount: true,
            rankOrder: true,

            checkVoter: user ? user.id : undefined
        });
        const storyIDs = stories.items.map(story => story.id);
        const storyTags = await tagManager.getTagsForStories(storyIDs);

        await ctx.render("pages/home.html", {
            page: stories, storyTags, user,
            csrf: ctx.csrf
        });
    });

    router.get("/recent", async ctx => {
        const user = ctx.state.user;
        const page = +ctx.query.page || 1;

        const stories = await storyManager.getStories(page, {
            submitterUsername: true,
            score: true,
            commentCount: true,
            rankOrder: false,

            checkVoter: user ? user.id : undefined
        });
        const storyIDs = stories.items.map(story => story.id);
        const storyTags = await tagManager.getTagsForStories(storyIDs);

        await ctx.render("pages/home.html", {
            title: "Recent Stories",
            page: stories, storyTags, user,
            csrf: ctx.csrf
        });
    });

    router.get("/comments", async ctx => {
        const user = ctx.state.user;
        const page = +ctx.query.page || 1;

        const comments = await commentManager.getLatestComments(page, {
            score: true,
            username: true,

            checkVoter: user ? user.id : undefined
            // checkRead is not done because that's specific to story details
            // pages.
        });

        await ctx.render("pages/newest_comments.html", {
            page: comments, user, csrf: ctx.csrf
        });
    });

    // --- User Settings ---
    // This belongs to user.ts, however that is prefixed with /u/ which doesn't
    // look as nice. So we'll just put it here for now.

    router.get("/settings", async ctx => {
        const { user } = ctx.state;
        if (!user) {
            return ctx.redirect("/auth/login");
        }

        return await ctx.render("pages/user_settings.html", {
            subject: user, formData: user, user, csrf: ctx.csrf
        })
    });

    return router;
}
