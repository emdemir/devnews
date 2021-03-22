import Koa = require("koa");
import Router = require("koa-router");
import bodyParser = require("koa-bodyparser");
import helmet = require("koa-helmet");
import session = require("koa-generic-session");
import passport = require("koa-passport");
import logger = require("koa-logger");
import CSRF = require("koa-csrf");
import moment = require("moment");
// koa-redis types break koa-generic-session.
// @ts-ignore
import RedisStore = require("koa-redis");

// Templating
import nunjucks, { NunjucksContext, NunjucksState } from "./render";
// Authentication
import type { Authenticator } from "passport";

// The dependency manager.
import container from "./container";

// The app context that is available to routers.
// Koa modules export their context type, however this can't be picked up by
// koa-router.
//
// Additionally, koa-passport is deciding to not export its context, so we have
// to replicate it here.
export type PassportContext = {
    login(user: any, options?: any): Promise<void>;
    logout(): void;

    isAuthenticated(): boolean;
    isUnauthenticated(): boolean;
}
// Context for CSRF tokens.
export interface CsrfContext {
    csrf: string;
}
export type AppContext = Koa.DefaultContext
    & NunjucksContext
    & PassportContext
    & CsrfContext;

/// --- Initialization code ---

const isDev = process.env.NODE_ENV !== "production";

// Instantiate the app
const app = new Koa();
export const router = new Router<any, AppContext>();

// Register routes
const indexRoutes: Router<any, AppContext> = container.resolve("indexRoutes");
const authRoutes: Router<any, AppContext> = container.resolve("authRoutes");
const storyRoutes: Router<any, AppContext> = container.resolve("storyRoutes");
const userRoutes: Router<any, AppContext> = container.resolve("userRoutes");
const messageRoutes: Router<any, AppContext> = container.resolve("messageRoutes");
const commentRoutes: Router<any, AppContext> = container.resolve("commentRoutes");
const tagRoutes: Router<any, AppContext> = container.resolve("tagRoutes");
router.use("", indexRoutes.routes(), indexRoutes.allowedMethods());
router.use("/auth", authRoutes.routes(), authRoutes.allowedMethods());
router.use("/s", storyRoutes.routes(), storyRoutes.allowedMethods());
router.use("/u", userRoutes.routes(), userRoutes.allowedMethods());
router.use("/m", messageRoutes.routes(), messageRoutes.allowedMethods());
router.use("/c", commentRoutes.routes(), commentRoutes.allowedMethods());
router.use("/t", tagRoutes.routes(), tagRoutes.allowedMethods());

// Sessions
const sessionConfig: session.SessionOptions = {
    // Store sessions in redis
    // The @types definitions are out-of-sync so they cause problems.
    store: new RedisStore({
        host: "redis",
        port: 6379,
        db: 0
    }) as session.SessionStore,

    cookie: {
        httpOnly: true,
        secure: !isDev,
        signed: true,
    }
};

// Get secret key
if (!process.env.SECRET_KEY)
    throw new Error("SECRET_KEY must be defined in the environment.");
app.keys = [process.env.SECRET_KEY];

// Nunjucks setup
// Get rid of /dist because Typescript doesn't copy templates.
const tmplPath = __dirname.replace("/dist", "") + "/templates/";

// Authentication setup
//
// Authenticator _is_ compatible with KoaPassport, however Typescript worries
// about the `this' return type magically becoming something else for some reason,
// so we have to do the `as unknown' shenanigans here.
//
// Typescript needs to improve.
import type AuthManager from "base/auth_manager";
const authManager: AuthManager = container.resolve("authManager");
authManager.initialize(passport as unknown as Authenticator, "local");

// The actual type of ctx is too long to type (longer than this comment!).
const renderError = async (ctx: any) => {
    const renderContext = {
        reason: ctx.state.reason || null,
        user: ctx.state.user
    };

    switch (ctx.status) {
        case 403:
            return await ctx.render("pages/403.html", renderContext);
        case 404:
            return await ctx.render("pages/404.html", renderContext);
        default:
            return await ctx.render("pages/500.html", renderContext);
    }
}

// Add middleware
app
    // Request logging
    .use(logger())
    // Request protection
    .use(helmet({ hsts: false, contentSecurityPolicy: isDev ? false : undefined }))
    // Sessions with redis
    .use(session(sessionConfig))
    // Request body parsing
    .use(bodyParser())
    // Authentication
    .use(passport.initialize())
    .use(passport.session())
    // Templating
    .use(nunjucks(tmplPath, {
        autoescape: true,
        lstripBlocks: true,
        watch: isDev
    }, {
        // Globals
        // TODO: move this to a separate "context_processors.ts"
        now: function now() { return new Date(); },
        getDomain: function getDomain(url: string) { return (new URL(url)).hostname },
        moment
    }))
    // Handle 403, 404, 500
    .use(async function errorHandler(ctx, next) {
        try {
            await next();
            // Don't do anything if the view rendered something
            if (ctx.state.rendered) return;

            // The re-assignment is done to flip an internal switch in Koa so that
            // it doesn't rewrite the status code to 200 after "render" fills
            // ctx.body because "nobody else set status".
            ctx.status = ctx.status || 404;
        } catch (err) {
            ctx.status = err.status || 500;
            // Add error message as reason so the error pages can have an idea
            // of what happened.
            ctx.state.reason = err.toString();
            if (ctx.status === 500)
                console.error(err);
        }
        await renderError(ctx);
    })
    // CSRF protection
    .use(new CSRF({
        invalidTokenStatusCode: 403,
        excludedMethods: ["GET", "HEAD", "OPTIONS"],
        disableQuery: false
    }))
    // Routing
    .use(router.routes())
    .use(router.allowedMethods());


export default app;
