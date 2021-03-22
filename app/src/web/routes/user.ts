import Router = require("koa-router");

import type { AppContext } from "../";
import type UserManager from "base/user_manager";
import { ValidationError } from "base/exceptions";

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

    // --- Change Password View ---
    // This uses the profile settings page which it shares with edit profile,
    // so form data must be the user itself.
    router.post("/:username/password", async ctx => {
        const { user } = ctx.state;
        if (!user) {
            return ctx.redirect("/auth/login");
        }

        const { username } = ctx.params;
        const formData = ctx.request.body;
        const { current, password, verify } = formData;

        try {
            // Check if the passwords match here. This is because the Business
            // Logic Layer doesn't need to know that the web presentation layer
            // offers a password verify box (the API won't).
            if (password !== verify) {
                throw new ValidationError(["The passwords don't match."]);
            }

            // Update the user's password.
            await userManager.changePassword(user, username, current, password);

            // TODO: success flash
            if (user.username === username) {
                return ctx.redirect("/settings");
            } else {
                return ctx.redirect(`/u/${username}/edit`);
            }
        } catch (err) {
            if (!(err instanceof ValidationError))
                throw err;

            // Get the user data
            const subject = await userManager.getUserByUsername(username, {});
            // Show the errors
            return await ctx.render("pages/user_settings.html", {
                error: err, user, subject, formData: subject, csrf: ctx.csrf
            });
        }
    });

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
