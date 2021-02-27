import Router = require("koa-router");
import ValidationError from "../../base/validation";

import type { AppContext } from "../";
import type MessageManager from "../../base/message_manager";
import type UserManager from "../../base/user_manager";
import ForbiddenError from "../../base/permissions";

interface Dependencies {
    messageManager: MessageManager;
    userManager: UserManager;
};

export default function({ messageManager, userManager }: Dependencies) {
    const router = new Router<any, AppContext>();

    // --- List View ---

    router.get("/", async ctx => {
        const user = ctx.state.user;
        if (!user) {
            return ctx.redirect("/auth/login/");
        }

        const messages = await messageManager.getMessageThreadsForUser(user, {
            author: true
        });
        return await ctx.render("pages/message_list.html", { messages, user });
    });
    router.post("/", async ctx => {
        const user = ctx.state.user;
        if (!user) {
            return ctx.redirect("/auth/login/");
        }

        // Extract form data
        const formData = ctx.request.body;
        const { recipient, message } = formData;

        // Try to find the target
        const target = await userManager.getUserByUsername(recipient);
        if (target === null) {
            return await ctx.render("pages/message_list.html", {
                error: new Error(
                    "Could not find that recipient. Make sure it's " +
                    "spelled correctly."),
                formData,
                user,
            })
        }

        try {
            // Create the message
            const msg = await messageManager.sendMessage(user, target, message);
            return ctx.redirect(`/m/${msg.id}`);
        } catch (err) {
            // Handle error
            if (!(err instanceof ValidationError)) {
                console.error(err);
                err = new Error("An unexpected error occured.");
            }

            return await ctx.render("pages/message_list.html", {
                error: err,
                formData,
                user
            });
        }
    });

    // --- Detail View ---

    router.get("/:message_id", async ctx => {
        const user = ctx.state.user;
        if (!user) {
            return ctx.redirect("/auth/login/");
        }

        const { message_id } = ctx.params;

        try {
            const messages = await messageManager.getMessageThread(message_id, user, {
                author: true,
                recipient: true
            });

            if (messages === null) {
                // No such thread
                ctx.status = 404;
                return await ctx.render("pages/404.html", {
                    reason: "nomessage", user
                })
            }

            await ctx.render("pages/message_thread.html", { messages, user })
        } catch (err) {
            if (err instanceof ForbiddenError) {
                ctx.throw(403);
            } else {
                throw err;
            }
        }
    });

    router.post("/:message_id", async ctx => {
        const user = ctx.state.user;
        if (!user) {
            return ctx.redirect("/auth/login/");
        }

        const { message_id } = ctx.params;
        // Extract form data
        const formData = ctx.request.body;
        const { message } = formData;

        try {
            // Try to find the thread
            const thread = await messageManager.getMessageByID(+message_id, user, {});

            if (thread === null || thread.in_reply_to !== null) {
                ctx.status = 404;
                return await ctx.render("pages/404.html", {
                    reason: "nomessage", user
                });
            }

            // If we sent the message, then we send to recipient, otherwise
            // we return to sender.
            const target = thread.sender_id === user.id
                ? await userManager.getUserByID(thread.receiver_id)
                : await userManager.getUserByID(thread.sender_id);

            // Target can't be null, we got this ID from the data store.
            await messageManager.sendMessage(user, target!, message, thread);

            return ctx.redirect(`/m/${thread.id}`);
        } catch (err) {
            if (err instanceof ForbiddenError) {
                ctx.throw(403);
            } else if (err instanceof ValidationError) {
                await ctx.render("pages/message_thread.html", {
                    error: err,
                    formData,
                    user
                })
            } else {
                throw err;
            }
        }
    });

    return router;
}
