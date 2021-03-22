import Router = require("koa-router");
import passport = require("koa-passport");

import type UserManager from "base/user_manager";
import type { User } from "base/user_repository";

interface Dependencies {
    userManager: UserManager;
}

/**
 * Apply projection to the user to hide fields we do not wish to display
 * in the API.
 *
 * @param u - The user
 */
export const userProject = (u: User): Object => {
    const {
        username, registered_at, about, about_html, homepage, avatar_image,
        comment_count, comment_karma, story_count, story_karma
    } = u;

    return {
        username, registered_at, about, about_html, homepage, avatar_image,
        comment_count, story_count,
        karma: (comment_karma || 0) + (story_karma || 0)
    };
};

export default function({ userManager }: Dependencies) {
    const router = new Router();

    // --- Detail View ---

    router.get("/:username/", async ctx => {
        const { username } = ctx.params;

        const subject = await userManager.getUserByUsername(username, {
            commentCount: true,
            commentKarma: true,
            storyCount: true,
            storyKarma: true,
        });
        if (subject === null) {
            return ctx.throw(404);
        }

        ctx.body = userProject(subject);
    });

    return router;
}
