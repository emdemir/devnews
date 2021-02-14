import Koa = require("koa");
import Router = require("koa-router");
import bodyParser = require("koa-bodyparser");
import helmet = require("koa-helmet");
import session = require("koa-generic-session");
import passport = require("koa-passport");
import logger = require("koa-logger");
// koa-redis types break koa-generic-session.
// @ts-ignore
import RedisStore = require("koa-redis");

import nunjucks, { NunjucksContext } from "./render";

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
export type AppContext = Koa.DefaultContext & NunjucksContext & PassportContext;

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
router.use("", indexRoutes.routes(), indexRoutes.allowedMethods());
router.use("/auth", authRoutes.routes(), authRoutes.allowedMethods());
router.use("/s", storyRoutes.routes(), storyRoutes.allowedMethods());
router.use("/u", userRoutes.routes(), userRoutes.allowedMethods());

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
// TODO: use Docker secrets.
app.keys = ["CHANGEME"]

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
import type AuthManager from "../base/auth_manager";
const authManager: AuthManager = container.resolve("authManager");
authManager.initialize(passport as unknown as Authenticator);

// Add middleware
app
    // Request logging
    .use(logger())
    // Request protection
    .use(helmet({ hsts: false }))
    // Request body parsing
    .use(bodyParser())
    // Sessions with redis
    .use(session(sessionConfig))
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
        now: function now() { return new Date(); }
    }))
    .use(router.routes())
    .use(router.allowedMethods());


export default app;
