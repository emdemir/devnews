import Router = require("koa-router");

import type StoryManager from "../../base/story_manager";
import type TagManager from "../../base/tag_manager";

interface Dependencies {
    storyManager: StoryManager;
    tagManager: TagManager;
};

export default function({ storyManager, tagManager }: Dependencies) {
    const router = new Router();

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

        ctx.body = {
            "stories": stories.map(story => {
                return {
                    ...story,
                    tags: storyTags[story.id].map(tag => tag.name)
                };
            })
        };
    });

    return router;
}
