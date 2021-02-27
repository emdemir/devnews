import Router = require("koa-router");
import passport = require("koa-passport");

import type UserManager from "../../base/user_manager";
import type AuthManager from "../../base/auth_manager";

interface Dependencies {
    userManager: UserManager;
    authManager: AuthManager;
}

export default function({ userManager, authManager }: Dependencies) {
    const router = new Router();

    router.post("/token", async ctx => {
        const { username, password } = ctx.request.body;
        if (!username || !password) {
            ctx.status = 400;
            ctx.body = { "error": "Missing username or password field." };
            return;
        }

        const user = await authManager.authenticate(username, password);
        if (user === null) {
            return ctx.throw(403);
        }

        const token = authManager.generateJWT(user.username);
        ctx.status = 201;
        ctx.body = { token };
    });

    router.post("/renew", passport.authenticate("jwt", { session: false }), async ctx => {
        const token = authManager.generateJWT(ctx.state.user.username);
        ctx.status = 201;
        ctx.body = { token };
    });

    return router;
}
