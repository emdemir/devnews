import Router = require("koa-router");

import type { AppContext } from "../";
import type StoryManager from "../../base/story_manager";
import type { StoryCreate } from "../../base/story_manager";
import type CommentManager from "../../base/comment_manager";
import type TagManager from "../../base/tag_manager";
import ValidationError from "../../base/validation";

interface Dependencies {
    storyManager: StoryManager;
    commentManager: CommentManager;
    tagManager: TagManager;
}

export default function({ storyManager, commentManager, tagManager }: Dependencies) {
    const router = new Router<any, AppContext>();

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
            if (!ctx.state.user) {
                return ctx.redirect("/auth/login/");
            }

            const story = await storyManager.getStoryByShortURL(
                ctx.params.short_url, {});
            if (story === null) {
                return await ctx.render("pages/404.html", {
                    reason: "nostory", user: ctx.state.user
                });
            }

            await commentManager.createComment({
                story_id: story.id,
                user_id: ctx.state.user.id,
                // TODO replies
                parent_id: null,
                comment: ctx.request.body.comment
            });

            // Redirect the user to their referrer, or the story if there isn't one
            if (ctx.headers["referer"]) {
                ctx.redirect(ctx.headers["referer"])
            } else {
                ctx.redirect(`/s/${ctx.params.short_url}/`)
            }
        }
    );

    // --- Detail View ---

    router.get("/:short_url/:slug?", async ctx => {
        const user = ctx.state.user;

        const story = await storyManager.getStoryByShortURL(ctx.params.short_url, {
            submitterUsername: true,
            score: true,
            commentCount: true,

            checkVoter: user ? user.id : undefined
        });

        if (story === null) {
            await ctx.render("pages/404.html", { reason: "nostory", user });
        } else {
            const comments = await commentManager.getCommentTreeByStory(story.id, {
                username: true,
                score: true,
                checkRead: user ? user.id : undefined,
                checkVoter: user ? user.id : undefined
            });
            const tags = await tagManager.getStoryTags(story.id);
            await ctx.render("pages/story.html", { story, comments, tags, user });
        }
    });

    // --- Create View ---

    router.get("/", async ctx => {
        const user = ctx.state.user;
        if (!user) {
            return ctx.redirect("/auth/login");
        }

        const tags = await tagManager.getAllTags();
        await ctx.render("pages/create_story.html", { tags, user });
    });
    router.post("/", async ctx => {
        const user = ctx.state.user;
        if (!user) {
            return ctx.redirect("/auth/login");
        }

        const formData = ctx.request.body;
        const { title, url, text, is_authored } = formData;
        const tags = ((
            "tags" in formData
                ? (Array.isArray(formData.tags)
                    ? formData.tags
                    : [formData.tags])
                : []
        ) as string[]).map(tag => parseInt(tag));

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
                    user
                });
            } else {
                console.error(err);
                await ctx.render("pages/create_story.html", {
                    error: new Error("An unknown error occurred."),
                    tags: allTags,
                    formData,
                    user
                });
            }
        }
    });

    return router;
}
