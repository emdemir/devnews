import Router = require("koa-router");

import type { AppContext } from "../";
import type UserManager from "base/user_manager";

interface Dependencies {
    userManager: UserManager;
};

export default function({ userManager }: Dependencies) {
    const router = new Router<any, AppContext>();

    // --- Detail View ---

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
            subject, user, csrf: ctx.csrf
        })
    });

    // --- Edit View ---

    // --- Delete View ---

    router.post("/:username/delete", async ctx => {
        const { user } = ctx.state;
        if (!user) {
            return ctx.redirect("/auth/login");
        }

        const { username } = ctx.params;
        const { confirm } = ctx.query;

        const subject = await userManager.getUserByUsername(username, {});
        if (subject === null)
            return ctx.throw(404);

        if (!confirm) {
            return await ctx.render("pages/confirm.html", {
                title: "Delete User: " + subject.username,
                message: "Are you sure you want to delete this user?",
                user, csrf: ctx.csrf
            })
        } else {
            await userManager.deleteUser(user, username);
            // TODO: flash success message
            return ctx.redirect("/");
        }
    });

    return router;
}
