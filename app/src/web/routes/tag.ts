import Router = require("koa-router");
import debugFactory = require("debug");

import type { AppContext } from "../";
import type StoryManager from "base/story_manager";
import type TagManager from "base/tag_manager";

const debug = debugFactory("devnews:web:tag");

interface Dependencies {
    storyManager: StoryManager;
    tagManager: TagManager;
};

export default function({ storyManager, tagManager }: Dependencies) {
    const router = new Router<any, AppContext>();

    router.get("/:tag/", async ctx => {
        const user = ctx.state.user;
        const page = +ctx.query.page || 1;

        debug("getting stories for tag", ctx.params.tag, "page", page);

        // Get the tag.
        const tag = await tagManager.getTagByName(ctx.params.tag);
        if (tag === null) {
            debug("couldn't find the tag");
            ctx.status = 404;
            return await ctx.render("pages/404.html", {
                reason: "notag", user: ctx.state.user
            });
        }

        debug("getting stories with the tag");
        const stories = await storyManager.getStoriesWithTag(tag, page, {
            submitterUsername: true,
            score: true,
            commentCount: true,
            rankOrder: true,

            checkVoter: user ? user.id : undefined
        });
        const storyIDs = stories.items.map(story => story.id);
        debug("getting the tags for each story");
        const storyTags = await tagManager.getTagsForStories(storyIDs);

        await ctx.render("pages/tag.html", {
            tag, page: stories, storyTags, user,
            csrf: ctx.csrf
        });
    });

    return router;
}
