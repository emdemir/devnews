import Router = require("koa-router");

import type { AppContext } from "../";

export default function({ }) {
    const router = new Router<any, AppContext>();

    router.get("/", async ctx => {
        ctx.body = "TEST";
    });

    return router;
}
