import Router = require("koa-router");

import type { AppContext } from "../";
import type UserManager from "base/user_manager";

interface Dependencies {
    userManager: UserManager;
};

export default function({ userManager }: Dependencies) {
    const router = new Router<any, AppContext>();

    router.get("/:username", async ctx => {
        const { user } = ctx.state;
        const { username } = ctx.params;

        // Get the subject user
        const subject = await userManager.getUserByUsername(username, {
            commentCount: true,
            storyCount: true,
            commentKarma: true,
            storyKarma: true,
        });

        if (subject === null) {
            // Show 404 to the user
            ctx.status = 404;
            return await ctx.render("pages/404.html", {
                reason: "nouser", user
            });
        }

        return ctx.render("pages/user.html", {
            subject, user
        })
    });

    return router;
}
