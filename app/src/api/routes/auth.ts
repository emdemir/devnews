import Router = require("koa-router");
import passport = require("koa-passport");

import type UserManager from "base/user_manager";
import type { User } from "base/user_repository";
import type AuthManager from "base/auth_manager";

interface Dependencies {
    userManager: UserManager;
    authManager: AuthManager;
}

export default function({ userManager, authManager }: Dependencies) {
    const router = new Router();

    router.post("/login", async ctx => {
        // The client will use this endpoint to get a new access token. Using
        // this access token, the client can then obtain an identity token.

        const { response_type, redirect_uri, scope } = ctx.request.query;

        // For now, we only allow the "openid" scope.
        if (scope !== "openid") {
            ctx.status = 400;
            ctx.body = { "error": "Invalid scope. Valid scopes are: \"openid\"." };
            return;
        }

        // Validate the response type.
        switch (response_type) {
            case "code":
                break;
            default:
                ctx.status = 400;
                ctx.body = { "error": "Invalid response type. Valid types are: \"code\"." };
                return;
        }

        // Check the username and password.
        const { username, password } = ctx.request.body;
        if (!username || !password) {
            ctx.status = 400;
            ctx.body = { "error": "Both username and password must be supplied." };
            return;
        }

        // Try to authenticate the user.
        const user = await authManager.authenticate(username, password);
        if (user === null) {
            ctx.status = 403;
            ctx.body = { "error": "Invalid username/password." };
            return;
        }

        // From this point on, the user is valid, so either redirect with the
        // access token (if redirect_uri is defined) or pass it back.
        const accessToken = authManager.generateAccessToken(user.username, false);
        const refreshToken = authManager.generateAccessToken(user.username, true);
        if (redirect_uri) {
            if (redirect_uri.includes("?")) {
                ctx.status = 400;
                ctx.body = { "error": "The redirect_uri may not contain query parameters." };
                return;
            }

            return ctx.redirect(`${redirect_uri}?code=${accessToken}&refresh=${refreshToken}`);
        } else {
            ctx.status = 200;
            ctx.body = {
                "access_token": accessToken,
                "refresh_token": refreshToken,
                "expires_in": authManager.getTokenExpiry("access"),
            };
        }
    });

    router.post("/refresh", async ctx => {
        // The endpoint where the user can refresh their access tokens.

        const authHeader = ctx.headers.authorization as string | undefined;
        if (!authHeader) {
            ctx.status = 400;
            ctx.body = { "error": "Authorization header must be set." };
            return;
        }

        const [bearer, token] = authHeader.split(" ");
        if (bearer !== "Bearer") {
            ctx.status = 400;
            ctx.body = { "error": "Authorization type must be \"Bearer\"." };
            return;
        }

        const sub = authManager.validateToken(token, "refresh");
        if (sub === null) {
            ctx.status = 403;
            ctx.body = { "error": "Invalid refresh token." };
            return;
        }

        const newAccessToken = authManager.generateAccessToken(sub);
        const newRefreshToken = authManager.generateAccessToken(sub, true);
        ctx.status = 200;
        ctx.body = {
            "access_token": newAccessToken,
            "refresh_token": newRefreshToken,
            "expires_in": authManager.getTokenExpiry("access"),
        };
    });

    router.post("/token", async ctx => {
        // The user can obtain a new identity token by providing an access token
        // here, obtained through either the login or refresh endpoints.

        const { grant_type, code: token } = ctx.request.body;

        // Validate the grant type
        if (grant_type !== "authorization_code") {
            ctx.status = 400;
            ctx.body = { "error": "Invalid grant type, must be \"authorization_code\"." };
            return;
        }

        if (!token) {
            ctx.status = 400;
            ctx.body = { "error": "You must supply an access token." };
            return;
        }

        // Try to authenticate via access token.
        const username = authManager.validateToken(token, "access");
        if (username === null) {
            ctx.status = 403;
            ctx.body = { "error": "Invalid access token." };
            return;
        }

        const user = await userManager.getUserByUsername(username, {});
        if (user === null) {
            ctx.status = 403;
            ctx.body = { "error": "This token does not correspond to a valid user." };
            return;
        }

        // Generate our tokens, and return them.
        const identityToken = authManager.generateIdentityToken(user);
        const accessToken = authManager.generateAccessToken(user.username);
        const refreshToken = authManager.generateAccessToken(user.username, true);

        ctx.status = 200;
        ctx.body = {
            "id_token": identityToken,
            "access_token": accessToken,
            "refresh_token": refreshToken,
            "token_type": "Bearer",
            "expires_in": authManager.getTokenExpiry("identity")
        };
    });

    return router;
}
