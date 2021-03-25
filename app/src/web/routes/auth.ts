import Router = require("koa-router");
import passport = require("koa-passport");
import { ValidationError } from "base/exceptions";

import type { AppContext } from "../";
import type UserManager from "base/user_manager";

interface Dependencies {
    userManager: UserManager;
};

export default function({ userManager }: Dependencies) {
    const router = new Router<any, AppContext>();

    router.get("/login", async ctx => {
        if (ctx.isAuthenticated()) {
            ctx.redirect("/");
        } else {
            const { messages } = ctx.session;
            const hasErrors = messages && messages.length;

            // Clear the messages
            if (hasErrors)
                ctx.session.messages = undefined;

            ctx.status = hasErrors ? 400 : 200;
            await ctx.render("pages/login.html", {
                error: hasErrors
                    ? new ValidationError(messages)
                    : null,
                csrf: ctx.csrf
            });
        }
    });
    router.post(
        "/login",
        // The business logic layer is doing all the authentication logic. We
        // simply make passport call it.
        passport.authenticate("local", {
            successReturnToOrRedirect: "/",
            failureRedirect: "/auth/login/",
            failureMessage: true
        }));

    router.get("/register", async ctx => {
        if (ctx.isAuthenticated()) {
            ctx.redirect("/");
        } else {
            await ctx.render("pages/register.html", { csrf: ctx.csrf });
        }
    });
    router.post(
        "/register",
        async ctx => {
            try {
                const { username, password, verify, email } = ctx.request.body;
                // The business logic layer does not need to concern itself with
                // two passwords matching. This is purely done for user
                // convenience.
                if (password !== verify) {
                    throw new ValidationError(["The passwords don't match."]);
                }

                const user = await userManager.createUser(username, password, email);
                // This just puts the user in the session.
                await ctx.login(user);
                ctx.redirect("/");
            } catch (err) {
                if (err instanceof ValidationError) {
                    await ctx.render("pages/register.html", {
                        error: err,
                        formData: ctx.request.body,
                        csrf: ctx.csrf
                    });
                } else {
                    console.error(err);
                    await ctx.render("pages/register.html", {
                        error: new Error("An unknown error occurred."),
                        formData: ctx.request.body,
                        csrf: ctx.csrf
                    });
                }
            }
        }
    );

    router.get("/google", passport.authenticate("google", {
        callbackURL: "/auth/google/callback"
    }));
    router.get("/google/callback", passport.authenticate("google", {
        failureRedirect: "/auth/login",
        callbackURL: "/auth/google/callback"
    }), async ctx => {
        const { user } = ctx.state;

        if (user.firstAuth) {
            // Pass first auth to session
            ctx.session.firstAuth = true;
            ctx.redirect("/auth/username");
        } else {
            ctx.redirect("/");
        }
    });

    // A route for first time third-party authenticated users to select their
    // username on the site.
    router.get("/username", async ctx => {
        const { user } = ctx.state;
        if (!user || !ctx.session.firstAuth) {
            return ctx.throw(403);
        }

        return await ctx.render("pages/select_username.html", {
            user, csrf: ctx.csrf
        })
    });
    router.post("/username", async ctx => {
        const { user } = ctx.state;
        if (!user || !ctx.session.firstAuth) {
            return ctx.throw(403);
        }

        const { username } = ctx.request.body;

        try {
            await userManager.setUsername(user, username);
            // First auth chance is now "used up".
            ctx.session.firstAuth = null;
            ctx.redirect("/");
        } catch (err) {
            if (!(err instanceof ValidationError))
                throw err;

            return await ctx.render("pages/select_username.html", {
                error: err, user, csrf: ctx.csrf
            });
        }
    });

    router.get("/rules", async ctx => {
        await ctx.render("pages/rules.html");
    });

    router.get("/logout", ctx => {
        ctx.logout();
        ctx.redirect("/");
    });

    return router;
}
