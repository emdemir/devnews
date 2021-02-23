import Router = require("koa-router");
import passport = require("koa-passport");
import ValidationError from "../../base/validation";

import type { AppContext } from "../";
import type UserManager from "../../base/user_manager";

interface Dependencies {
    userManager: UserManager;
};

export default function({ userManager }: Dependencies) {
    const router = new Router<any, AppContext>();

    router.get("/login/", async ctx => {
        if (ctx.isAuthenticated()) {
            ctx.redirect("/");
        } else {
            await ctx.render("pages/login.html");
        }
    });
    router.post(
        "/login/",
        passport.authenticate("local", {
            successReturnToOrRedirect: "/",
            failureRedirect: "/auth/login/",
            failureFlash: true
        })
    );

    router.get("/register/", async ctx => {
        if (ctx.isAuthenticated()) {
            ctx.redirect("/");
        } else {
            await ctx.render("pages/register.html");
        }
    });
    router.post(
        "/register/",
        async ctx => {
            try {
                const { username, password, verify, email } = ctx.request.body;
                if (password !== verify) {
                    throw new ValidationError(["The passwords don't match."]);
                }

                const user = await userManager.createUser(username, password, email);
                await ctx.login(user);
                ctx.redirect("/");
            } catch (err) {
                if (err instanceof ValidationError) {
                    await ctx.render("pages/register.html", {
                        error: err,
                        formData: ctx.request.body
                    });
                } else {
                    console.error(err);
                    await ctx.render("pages/register.html", {
                        error: new Error("An unknown error occurred."),
                        formData: ctx.request.body
                    });
                }
            }
        }
    );

    router.get("/rules/", async ctx => {
        await ctx.render("pages/rules.html");
    });

    router.get("/logout/", ctx => {
        ctx.logout();
        ctx.redirect("/");
    });

    return router;
}
