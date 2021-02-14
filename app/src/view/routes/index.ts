import Router = require("koa-router");

import type { AppContext } from "../";
import type StoryManager from "../../base/story_manager";

interface Dependencies {
    storyManager: StoryManager
};

export default function({ storyManager }: Dependencies) {
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

        await ctx.render("pages/home.html", { stories, user });
    });

    return router;
}
