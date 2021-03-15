import Router = require("koa-router");
import passport = require("koa-passport");
import debugFactory = require("debug");

import type StoryManager from "../../base/story_manager";
import type TagManager from "../../base/tag_manager";

import { storyProject } from "./story";

const debug = debugFactory("devnews:api:tag");

interface Dependencies {
    storyManager: StoryManager;
    tagManager: TagManager;
};

export default function({ storyManager, tagManager }: Dependencies) {
    const router = new Router();

    router.get("/:tag/",
        passport.authenticate("jwt", { session: false, failWithError: false }),
        async ctx => {
            const user = ctx.state.user;
            const page = ctx.request.body.page || 1;

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
            const storyIDs = stories.map(story => story.id);
            debug("getting the tags for each story");
            const storyTags = await tagManager.getTagsForStories(storyIDs);

            ctx.body = {
                "stories": stories.map(story => {
                    return {
                        ...storyProject(story),
                        tags: storyTags[story.id].map(tag => tag.name)
                    };
                })
            };
        });

    return router;
}
