import Router = require("koa-router");
import type { AppContext } from "../";

const router = new Router<any, AppContext>();

router.get("/", async ctx => {
    ctx.body = "TEST";
});

export default router;
