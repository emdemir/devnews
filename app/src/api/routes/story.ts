import Router = require("koa-router");
import passport = require("koa-passport");

import type StoryManager from "base/story_manager";
import type { Story, StoryCreate } from "base/story_manager";
import type CommentManager from "base/comment_manager";
import type TagManager from "base/tag_manager";
import { ForbiddenError, NotFoundError, ValidationError } from "base/exceptions";

import { commentProject } from "./comment";

/**
 * Apply projection to the story to hide fields we do not wish to display
 * to the user.
 *
 * @param s - The story
 */
export const storyProject = (s: Story): Object => {
    const {
        short_url, title, url, text, text_html, submitted_at, submitter_username,
        score, comment_count, user_voted
    } = s;

    return {
        short_url, title, url, text, text_html, submitted_at, submitter_username,
        score, comment_count, user_voted
    };
}

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

                // If there is a user currently logged in, mark the comment tree as
                // read.
                if (user) {
                    await commentManager.markCommentsAsRead(user, comments, true);
                }

                const tags = await tagManager.getStoryTags(story.id);

                ctx.body = {
                    ...storyProject(story),
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

    // --- Edit View ---

    router.put("/:short_url",
        passport.authenticate("jwt", { session: false }),
        async ctx => {
            const { user } = ctx.state;
            const { short_url } = ctx.params;

            const formData = ctx.request.body;
            const { title, url, text, is_authored } = formData;
            const tags: string[] = (
                "tags" in formData
                    ? (Array.isArray(formData.tags)
                        ? formData.tags
                        : [formData.tags])
                    : []
            );

            if (!title) {
                ctx.throw(400);
            }

            await storyManager.updateStory(user, short_url, {
                tags,
                is_authored: !!is_authored,
                text: text || null,
                title: title,
                url: url || null
            });
            ctx.status = 204;
        }
    );

    // --- Delete View ---

    router.delete("/:short_url",
        passport.authenticate("jwt", { session: false }),
        async ctx => {
            const { user } = ctx.state;
            const { short_url } = ctx.params;

            await storyManager.deleteStory(user, short_url);
            ctx.status = 204;
        }
    );

    return router;
}
