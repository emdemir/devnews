import Router = require("koa-router");
import Koa = require("koa");

import type { AppContext } from "../";
import type StoryManager from "../../base/story_manager";
import type { StoryCreate } from "../../base/story_manager";
import type CommentManager from "../../base/comment_manager";
import type TagManager from "../../base/tag_manager";
import type { User } from "../../base/user_repository";
import ValidationError from "../../base/validation";

interface Dependencies {
    storyManager: StoryManager;
    commentManager: CommentManager;
    tagManager: TagManager;
}

export default function({ storyManager, commentManager, tagManager }: Dependencies) {
    const router = new Router<any, AppContext>();

    // --- Common Pages ---
    const renderStory = async (ctx: any, user: User | null, extras: any = {}) => {
        const story = await storyManager.getStoryByShortURL(ctx.params.short_url, {
            submitterUsername: true,
            score: true,
            commentCount: true,

            checkVoter: user ? user.id : undefined
        });

        if (story === null) {
            ctx.status = 404;
            await ctx.render("pages/404.html", { reason: "nostory", user });
        } else {
            const comments = await commentManager.getCommentTreeByStory(story.id, {
                username: true,
                score: true,
                checkRead: user ? user.id : undefined,
                checkVoter: user ? user.id : undefined
            });

            // If there is a user currently logged in, mark the comment tree as
            // read.
            if (user) {
                await commentManager.markCommentsAsRead(user, comments, true);
            }

            const tags = await tagManager.getStoryTags(story.id);
            await ctx.render("pages/story.html", {
                ...extras,
                story, comments, tags, user,
                csrf: ctx.csrf
            });
        }
    }

    // --- Actions ---

    router.post(
        "/:short_url/vote",
        async ctx => {
            if (!ctx.state.user) {
                return ctx.redirect("/auth/login/");
            }

            const storyFound = await storyManager.voteOnStory(
                ctx.params.short_url, ctx.state.user);
            if (!storyFound) {
                ctx.status = 404;
                return await ctx.render("pages/404.html", {
                    reason: "nostory", user: ctx.state.user
                });
            }

            // Redirect the user to their referrer, or the story if there isn't one
            if (ctx.headers["referer"]) {
                ctx.redirect(ctx.headers["referer"])
            } else {
                ctx.redirect(`/s/${ctx.params.short_url}/`)
            }
        }
    );

    router.post(
        "/:short_url/comment",
        async ctx => {
            const { user } = ctx.state;
            if (!user) {
                return ctx.redirect("/auth/login/");
            }

            const story = await storyManager.getStoryByShortURL(
                ctx.params.short_url, {});
            if (story === null) {
                ctx.status = 404;
                return await ctx.render("pages/404.html", {
                    reason: "nostory", user: ctx.state.user
                });
            }

            const formData = ctx.request.body;
            const { parent, comment } = formData;

            const parentComment = parent
                ? await commentManager.getCommentByShortURL(parent, {})
                : null;
            if (parent && parentComment === null) {
                ctx.status = 404;
                return await ctx.render("pages/404.html", {
                    reason: "nocomment", user: ctx.state.user
                });
            }

            try {
                await commentManager.createComment({
                    story_id: story.id,
                    user_id: user.id,
                    parent: parentComment,
                    comment
                });

                // Redirect the user to their referrer, or the story if there isn't one
                if (ctx.headers["referer"]) {
                    ctx.redirect(ctx.headers["referer"])
                } else {
                    ctx.redirect(`/s/${ctx.params.short_url}/`)
                }
            } catch (err) {
                if (!(err instanceof ValidationError)) {
                    console.error(err);
                    err = new Error("An unknown error occured.")
                }

                await renderStory(ctx, user, { error: err });
            }
        }
    );

    // --- Detail View ---

    router.get("/:short_url/:slug?", async ctx => {
        const user = ctx.state.user;

        await renderStory(ctx, user);
    });

    // --- Create View ---

    router.get("/", async ctx => {
        const user = ctx.state.user;
        if (!user) {
            return ctx.redirect("/auth/login");
        }

        const tags = await tagManager.getAllTags();
        await ctx.render("pages/create_story.html", {
            tags, user, csrf: ctx.csrf
        });
    });
    router.post("/", async ctx => {
        const user = ctx.state.user;
        if (!user) {
            return ctx.redirect("/auth/login");
        }

        const formData = ctx.request.body;
        const { title, url, text, is_authored } = formData;
        const tags: string[] = (
            "tags" in formData
                ? (Array.isArray(formData.tags)
                    ? formData.tags
                    : [formData.tags])
                : []
        );

        const data: StoryCreate = {
            is_authored: !!is_authored,
            tags,
            text: text,
            title: title || null,
            url: url || null
        };

        try {
            const story = await storyManager.createStory(data, user);
            return ctx.redirect(`/s/${story.short_url}/`);
        } catch (err) {
            const allTags = await tagManager.getAllTags();

            if (err instanceof ValidationError) {
                await ctx.render("pages/create_story.html", {
                    error: err,
                    tags: allTags,
                    formData,
                    user,
                    csrf: ctx.csrf
                });
            } else {
                console.error(err);
                await ctx.render("pages/create_story.html", {
                    error: new Error("An unknown error occurred."),
                    tags: allTags,
                    formData,
                    user,
                    csrf: ctx.csrf
                });
            }
        }
    });

    return router;
}
