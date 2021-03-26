import Router = require("koa-router");
import passport = require("koa-passport");
import Koa = require("koa");

import type StoryManager from "base/story_manager";
import type CommentManager from "base/comment_manager";
import type TagManager from "base/tag_manager";

import { storyProject } from "./story";
import { commentProject } from "./comment";

interface Dependencies {
    storyManager: StoryManager;
    commentManager: CommentManager;
    tagManager: TagManager;
};

export default function({ storyManager, commentManager, tagManager }: Dependencies) {
    const router = new Router();

    const getStories = async (
        ctx: any,
        rank: boolean
    ) => {
        const user = ctx.state.user;
        const page = ctx.query.page || 1;

        const stories = await storyManager.getStories(page, {
            submitterUsername: true,
            score: true,
            commentCount: true,
            rankOrder: rank,

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
    }

    router.get("/",
        passport.authenticate("jwt", { session: false, failWithError: false }),
        async ctx => {
            await getStories(ctx, true);
        });

    router.get("/recent",
        passport.authenticate("jwt", { session: false, failWithError: false }),
        async ctx => {
            await getStories(ctx, false);
        });

    router.get("/comments", async ctx => {
        const user = ctx.state.user;
        const page = +ctx.query.page || 1;

        const comments = await commentManager.getLatestComments(page, {
            score: true,
            username: true,
            storyShortURL: true,

            checkVoter: user ? user.id : undefined
            // checkRead is not done because that's specific to story details
            // pages.
        });

        ctx.body = {
            "comments": comments.items.map(commentProject),
            "page": comments.page,
            "has_prev_page": comments.has_prev_page,
            "has_next_page": comments.has_next_page,
        };
    });

    return router;
}
