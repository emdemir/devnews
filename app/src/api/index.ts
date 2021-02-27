import Koa = require("koa");
import Router = require("koa-router");
import bodyParser = require("koa-bodyparser");
import helmet = require("koa-helmet");
import passport = require("koa-passport");
import logger = require("koa-logger");

// The dependency manager.
import container from "./container";
// Authentication
import type { Authenticator } from "passport";

/// --- Initialization code ---

const isDev = process.env.NODE_ENV !== "production";

// Instantiate the app
const app = new Koa();
// Instantiate the router
export const router = new Router();

// Register routes
const indexRoutes: Router = container.resolve("indexRoutes");
const storyRoutes: Router = container.resolve("storyRoutes");
const commentRoutes: Router = container.resolve("commentRoutes");
const authRoutes: Router = container.resolve("authRoutes");
const messageRoutes: Router = container.resolve("messageRoutes");
router.use("", indexRoutes.routes(), indexRoutes.allowedMethods());
router.use("/s", storyRoutes.routes(), storyRoutes.allowedMethods());
router.use("/c", commentRoutes.routes(), commentRoutes.allowedMethods());
router.use("/m", messageRoutes.routes(), messageRoutes.allowedMethods());
router.use("/auth", authRoutes.routes(), authRoutes.allowedMethods());

// Authentication setup
//
// Authenticator _is_ compatible with KoaPassport, however Typescript worries
// about the `this' return type magically becoming something else for some reason,
// so we have to do the `as unknown' shenanigans here.
//
// Typescript needs to improve.
import type AuthManager from "../base/auth_manager";
const authManager: AuthManager = container.resolve("authManager");
authManager.initialize(passport as unknown as Authenticator, "jwt");

// Add middleware
app
    // Request logging
    .use(logger())
    // Request protection
    .use(helmet({ hsts: false, contentSecurityPolicy: isDev ? false : undefined }))
    // Request body parsing
    .use(bodyParser())
    // Authentication TODO
    .use(passport.initialize())
    // Handle 403, 404, 500
    .use(async function errorHandler(ctx, next) {
        try {
            await next();

            const status = ctx.status || 404;
            if (status == 404) {
                ctx.body = { "error": "The specified path was not found." };
            } else if (status === 403) {
                ctx.body = { "error": "You are not authorized to access the specified path." };
            }
        } catch (err) {
            console.error(err);
            ctx.body = { "error": "An internal server error occured." };
        }
    })
    .use(router.routes())
    .use(router.allowedMethods());

export default app;
