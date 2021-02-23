import Koa = require("koa");
import Router = require("koa-router");
import bodyParser = require("koa-bodyparser");
import helmet = require("koa-helmet");
// TODO: Passport JWT
// import passport = require("koa-passport");
import logger = require("koa-logger");

// The dependency manager.
import container from "./container";

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
router.use("", indexRoutes.routes(), indexRoutes.allowedMethods());
router.use("/s", storyRoutes.routes(), storyRoutes.allowedMethods());
router.use("/c", commentRoutes.routes(), commentRoutes.allowedMethods());

// Add middleware
app
    // Request logging
    .use(logger())
    // Request protection
    .use(helmet({ hsts: false, contentSecurityPolicy: isDev ? false : undefined }))
    // Request body parsing
    .use(bodyParser())
    // Authentication TODO
    // .use(passport.initialize())
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
