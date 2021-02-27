import Router = require("koa-router");
import passport = require("koa-passport");

import type StoryManager from "../../base/story_manager";
import type { StoryCreate } from "../../base/story_manager";
import type CommentManager from "../../base/comment_manager";
import type TagManager from "../../base/tag_manager";
import ValidationError from "../../base/validation";

import { commentProject } from "./comment";

interface Dependencies {
    storyManager: StoryManager;
    commentManager: CommentManager;
    tagManager: TagManager;
}

export default function({ storyManager, commentManager, tagManager }: Dependencies) {
    const router = new Router();

    // --- Actions ---

    router.post(
        "/:short_url/vote",
        passport.authenticate("jwt", { session: false }),
        async ctx => {
            if (!ctx.state.user) {
                return ctx.throw(403);
            }

            const storyFound = await storyManager.voteOnStory(
                ctx.params.short_url, ctx.state.user);
            if (!storyFound) {
                ctx.status = 404;
                return;
            }

            ctx.headers["location"] = `/s/${ctx.params.short_url}/`;
            ctx.status = 201; // Created
        }
    );

    // --- Detail View ---

    router.get("/:short_url/",
        passport.authenticate("jwt", { session: false, failWithError: false }),
        async ctx => {
            const user = ctx.state.user;

            const story = await storyManager.getStoryByShortURL(ctx.params.short_url, {
                submitterUsername: true,
                score: true,
                commentCount: true,

                checkVoter: user ? user.id : undefined
            });

            if (story === null) {
                ctx.status = 404;
                return;
            } else {
                const comments = await commentManager.getCommentTreeByStory(story.id, {
                    username: true,
                    score: true,
                    checkRead: user ? user.id : undefined,
                    checkVoter: user ? user.id : undefined
                });
                const tags = await tagManager.getStoryTags(story.id);

                ctx.body = {
                    story: {
                        short_url: story.short_url,
                        title: story.title,
                        url: story.url,
                        text: story.text,
                        text_html: story.text_html,
                        submitted_at: story.submitted_at,
                        submitter_username: story.submitter_username,
                        score: story.score,
                        comment_count: story.comment_count,
                        user_voted: story.user_voted
                    },
                    tags: tags.map(tag => tag.name),
                    comments: comments.map(commentProject)
                }
            }
        });

    // --- Create View ---

    router.post("/",
        passport.authenticate("jwt", { session: false }),
        async ctx => {
            const user = ctx.state.user;
            if (!user) {
                return ctx.throw(403);
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
                text: text || null,
                title: title,
                url: url || null
            };

            try {
                const story = await storyManager.createStory(data, user);
                ctx.status = 201;
                ctx.body = story;
            } catch (err) {
                if (err instanceof ValidationError) {
                    ctx.status = 400;
                    ctx.body = {
                        "errors": err.errors
                    };
                } else {
                    throw err;
                }
            }
        });

    return router;
}
