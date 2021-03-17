import Router = require("koa-router");
import passport = require("koa-passport");
import ValidationError from "../../base/validation";

import type MessageManager from "../../base/message_manager";
import type { Message } from "../../base/message_manager";
import type UserManager from "../../base/user_manager";
import ForbiddenError from "../../base/permissions";

interface Dependencies {
    messageManager: MessageManager;
    userManager: UserManager;
};

/**
 * Apply projection on a Message object to make it suitable for exposing in an
 * API.
 *
 * @param m - The message object
 */
export const messageProject = (m: Message): Object => {
    const { id, message, message_html, author, recipient, sent_at } = m;
    return { id, message, message_html, author, recipient, sent_at };
}

export default function({ messageManager, userManager }: Dependencies) {
    const router = new Router();

    // --- List View ---

    router.get("/",
        passport.authenticate("jwt", { session: false }),
        async ctx => {
            const user = ctx.state.user;

            const messages = await messageManager.getMessageThreadsForUser(user, {
                author: true,
                recipient: true
            });
            ctx.body = {
                "messages": messages.map(messageProject),
            };
        });
    router.post("/",
        passport.authenticate("jwt", { session: false }),
        async ctx => {
            const user = ctx.state.user;

            // Extract form data
            const formData = ctx.request.body;
            const { recipient, message } = formData;

            if (!recipient) {
                ctx.status = 400;
                ctx.body = { "error": "Parameter \"recipient\" is missing." };
                return;
            }

            // Try to find the target
            const target = await userManager.getUserByUsername(recipient);
            if (target === null) {
                ctx.status = 404;
                ctx.body = {
                    "error": "Could not find that recipient. Make sure it's " +
                        "spelled correctly."
                };
                return;
            }

            try {
                // Create the message
                const msg = await messageManager.sendMessage(user, target, message);
                ctx.status = 201;
                ctx.body = messageProject(msg);
                // Set some expected parameters on the body
                ctx.body.author = user.username;
                ctx.body.recipient = recipient;
            } catch (err) {
                if (err instanceof ValidationError) {
                    ctx.status = 400;
                    ctx.body = { "errors": err.errors };
                } else {
                    throw err;
                }
            }
        });

    // --- Detail View ---

    router.get("/:message_id",
        passport.authenticate("jwt", { session: false }),
        async ctx => {
            const user = ctx.state.user;

            const { message_id } = ctx.params;

            try {
                const messages = await messageManager.getMessageThread(message_id, user, {
                    author: true,
                    recipient: true
                });

                if (messages === null) {
                    // No such thread
                    ctx.status = 404;
                    ctx.body = { "error": "No such message thread." };
                    return;
                }

                ctx.body = {
                    "messages": messages.map(messageProject)
                };
            } catch (err) {
                if (err instanceof ForbiddenError) {
                    ctx.throw(403);
                } else {
                    throw err;
                }
            }
        });

    router.post("/:message_id",
        passport.authenticate("jwt", { session: false }),
        async ctx => {
            const user = ctx.state.user;

            const { message_id } = ctx.params;
            // Extract form data
            const formData = ctx.request.body;
            const { message } = formData;

            try {
                // Try to find the thread
                const thread = await messageManager.getMessageByID(+message_id, user, {});

                if (thread === null || thread.in_reply_to !== null) {
                    ctx.status = 404;
                    ctx.body = { "error": "No such message thread." };
                    return;
                }

                // If the author of the thread is the other party, select the
                // sender, otherwise we created the thread so select the initial
                // recipient.
                const target = thread.sender_id === user.id
                    ? await userManager.getUserByID(thread.receiver_id)
                    : await userManager.getUserByID(thread.sender_id);

                // Target can't be null, we got this ID from the data store.
                const msg = await messageManager.sendMessage(user, target!, message, thread);

                ctx.status = 201;
                ctx.body = messageProject(msg);
                // Set some expected parameters on the body
                ctx.body.author = user.username;
                ctx.body.recipient = target!.username;
            } catch (err) {
                if (err instanceof ForbiddenError) {
                    ctx.throw(403);
                } else if (err instanceof ValidationError) {
                    ctx.status = 400;
                    ctx.body = { "errors": err.errors };
                } else {
                    throw err;
                }
            }
        });

    return router;
}
