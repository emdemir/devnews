import Router = require("koa-router");

import type { AppContext } from "../";
import type StoryManager from "../../base/story_manager";
import type TagManager from "../../base/tag_manager";

interface Dependencies {
    storyManager: StoryManager;
    tagManager: TagManager;
};

export default function({ storyManager, tagManager }: Dependencies) {
    const router = new Router<any, AppContext>();

    router.get("/", async ctx => {
        const user = ctx.state.user;
        const page = ctx.query.page || 1;

        const stories = await storyManager.getStories(page, {
            submitterUsername: true,
            score: true,
            commentCount: true,
            rankOrder: true,

            checkVoter: user ? user.id : undefined
        });
        const storyIDs = stories.map(story => story.id);
        const storyTags = await tagManager.getTagsForStories(storyIDs);

        await ctx.render("pages/home.html", { stories, storyTags, user, csrf: ctx.csrf });
    });

    return router;
}
