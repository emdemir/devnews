import Router = require("koa-router");

import type { AppContext } from "../";
import type UserManager from "base/user_manager";
import type StoryManager from "base/story_manager";
import type TagManager from "base/tag_manager";
import { ValidationError } from "base/exceptions";

interface Dependencies {
    userManager: UserManager;
    storyManager: StoryManager;
    tagManager: TagManager;
};

export default function({ userManager, storyManager, tagManager }: Dependencies) {
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
