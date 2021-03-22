import Router = require("koa-router");

import type { AppContext } from "../";
import type MessageManager from "base/message_manager";
import type UserManager from "base/user_manager";
import type { User } from "base/user_repository";
import { ForbiddenError, ValidationError } from "base/exceptions";

interface Dependencies {
    messageManager: MessageManager;
    userManager: UserManager;
};

export default function({ messageManager, userManager }: Dependencies) {
    const router = new Router<any, AppContext>();

    // --- Common Views ---

    const renderMessageList = async (ctx: any, user: User, extras: any = {}) => {
        const page = +ctx.query.page || 1;
        if (!user) {
            return ctx.redirect("/auth/login/");
        }

        const messages = await messageManager.getMessageThreadsForUser(
            user, page, { author: true });
        return await ctx.render("pages/message_list.html", {
            ...extras,
            page: messages, user, csrf: ctx.csrf
        });
    }

    const renderMessageThread = async (ctx: any, user: User, extras: any = {}) => {
        if (!user) {
            return ctx.redirect("/auth/login/");
        }

        const { message_id } = ctx.params;

        try {
            const messages = await messageManager.getMessageThread(user, message_id, {
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

            await ctx.render("pages/message_thread.html", {
                ...extras,
                messages, csrf: ctx.csrf, user
            });
        } catch (err) {
            if (err instanceof ForbiddenError) {
                ctx.throw(403);
            } else {
                throw err;
            }
        }
    }

    // --- List View ---

    router.get("/", async ctx => {
        const user = ctx.state.user;
        return await renderMessageList(ctx, user);
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
        const target = await userManager.getUserByUsername(recipient, {});
        if (target === null) {
            return await renderMessageList(ctx, user, {
                error: new Error(
                    "Could not find that recipient. Make sure it's " +
                    "spelled correctly."),
                formData,
            });
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

            return await renderMessageList(ctx, user, {
                error: err,
                formData,
            });
        }
    });

    // --- Detail View ---

    router.get("/:message_id", async ctx => {
        const user = ctx.state.user;

        return await renderMessageThread(ctx, user);
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
            const thread = await messageManager.getMessageByID(user, +message_id, {});

            if (thread === null || thread.in_reply_to !== null) {
                ctx.status = 404;
                return await ctx.render("pages/404.html", {
                    reason: "nomessage", user
                });
            }

            // If we sent the message, then we send to recipient, otherwise
            // we return to sender.
            const target = thread.sender_id === user.id
                ? await userManager.getUserByID(thread.receiver_id, {})
                : await userManager.getUserByID(thread.sender_id, {});

            // Target can't be null, we got this ID from the data store.
            await messageManager.sendMessage(user, target!, message, thread);

            return ctx.redirect(`/m/${thread.id}`);
        } catch (err) {
            if (err instanceof ForbiddenError) {
                ctx.throw(403);
            } else if (err instanceof ValidationError) {
                await renderMessageThread(ctx, user, {
                    error: err,
                    formData,
                })
            } else {
                throw err;
            }
        }
    });

    // --- Delete View ---

    router.post("/:message_id/delete", async ctx => {
        const { user } = ctx.state;
        if (!user) {
            return ctx.redirect("/auth/login");
        }

        const { message_id } = ctx.params;
        const { confirm } = ctx.query;

        const message = await messageManager.getMessageByID(user, message_id, {
            author: true,
            recipient: true
        });
        if (message === null)
            return ctx.throw(404);

        if (!confirm) {
            return await ctx.render("pages/confirm.html", {
                title: "Delete Message",
                message: "Are you sure you want to delete this message?",
                preview: await ctx.render("partials/message.html", {
                    message, preview: true
                }),
                user, csrf: ctx.csrf
            });
        } else {
            await messageManager.deleteMessage(user, message_id);
            // TODO: flash success message
            if (message.in_reply_to === null) {
                return ctx.redirect("/m/");
            } else {
                return ctx.redirect(`/m/${message.in_reply_to}`);
            }
        }
    });

    return router;
}
