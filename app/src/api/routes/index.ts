import Router = require("koa-router");
import passport = require("koa-passport");

import type StoryManager from "base/story_manager";
import type TagManager from "base/tag_manager";

import { storyProject } from "./story";

interface Dependencies {
    storyManager: StoryManager;
    tagManager: TagManager;
};

export default function({ storyManager, tagManager }: Dependencies) {
    const router = new Router();

    router.get("/",
        passport.authenticate("jwt", { session: false, failWithError: false }),
        async ctx => {
            const user = ctx.state.user;
            const page = ctx.query.page || 1;

            const stories = await storyManager.getStories(page, {
                submitterUsername: true,
                score: true,
                commentCount: true,
                rankOrder: true,

                checkVoter: user ? user.id : undefined
            });
            const storyIDs = stories.items.map(story => story.id);
            const storyTags = await tagManager.getTagsForStories(storyIDs);

            ctx.body = {
                "stories": stories.items.map(story => {
                    return {
                        ...storyProject(story),
                        tags: storyTags[story.id].map(tag => tag.name)
                    };
                }),
                "page": stories.page,
                "has_prev_page": stories.has_prev_page,
                "has_next_page": stories.has_next_page,
            };
        });

    return router;
}
