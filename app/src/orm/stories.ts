import { Sequelize, Includeable, Op, Model } from "sequelize";
import sequelize from "./";

import type StoryRepository from "../base/story_repository";
import type {
    Story as RepoStory, StoryCreate, StoryOptions, StoryListOptions
} from "../base/story_repository";

import {
    User, Story, story_rank, story_stats, Tag
} from "./tables";

// --- Helpers and Defaults ----

const defaultOptions: StoryOptions = {
    submitterUsername: false,
    score: false,
    commentCount: false
};

/**
 * Look at the options given by the caller, and generate Sequelize
 * query options out of it.
 */
const collectJoins = (options: StoryOptions): Includeable[] => {
    const joins: Includeable[] = [];

    // ORMs just make things complicated... I only want a bunch of columns
    // from my views. Stop giving me these abstractions.

    // Add the extra fields
    if (options.submitterUsername) {
        joins.push({
            model: User as any,
            as: "user",
            required: true,
            attributes: ["username"]
        });
    }

    if (options.score || options.commentCount) {
        joins.push({
            model: story_stats,
            as: "stats",
            required: true,
            attributes: ["score", "comment_count"]
        });
    }

    if (options.checkVoter !== undefined) {
        joins.push({
            model: User as any,
            as: "votes",
            required: false,
            where: {
                id: options.checkVoter
            },
            attributes: ["id"]
        });
    }

    return joins;
}

/**
 * Flatten the story object to fit the Story interface.
 *
 * @param s - Sequelize object
 * @param options - The options
 */
const unwrapStory = (s: Story, options: StoryOptions): RepoStory => {
    const story = s.get({ plain: true });
    const ss = story as any;

    if (options.submitterUsername) {
        story.submitter_username = ss.user.username;
    }

    if (options.score) {
        story.score = +ss.stats.score;
    }

    if (options.commentCount) {
        story.comment_count = +ss.stats.comment_count;
    }

    if (options.checkVoter !== undefined) {
        story.user_voted = !!ss.votes.length;
    }

    // Clean up object
    if (options.submitterUsername)
        delete ss.user;
    if (options.score || options.commentCount)
        delete ss.stats;
    if (options.checkVoter !== undefined)
        delete ss.votes;

    return story;
}

// --- Repository Implementation ---

export default function({ }): StoryRepository {
    /**
     * Returns a list of stories with the specified options.
     *
     * @param options The options.
     */
    const getStories = async (_options: StoryListOptions): Promise<RepoStory[]> => {
        const options = Object.assign({}, defaultOptions, _options);

        const joins = collectJoins(options);

        if (options.rankOrder) {
            joins.push({
                model: story_rank,
                as: "rank",
                required: true
            });
        }

        const data = await Story.findAll({
            include: joins,
            limit: options.limit || undefined,
            offset: options.offset || undefined,
            order: options.rankOrder
                ? [[Sequelize.col("rank.story_rank"), "ASC"]]
                : undefined,
            subQuery: false
        });

        const result = data.map(model => {
            const story = unwrapStory(model, options);

            // If we ordered by story rank, we don't want to display the rank.
            if (options.rankOrder)
                delete (story as any).rank;

            return story;
        });
        return result;
    };

    /**
     * Fetch a story by its short URL. Returns the story if it exists, null otherwise.
     *
     * @param url - The short url.
     */
    const getStoryByShortURL = async (
        url: string,
        _options: StoryOptions
    ): Promise<RepoStory | null> => {
        const options = Object.assign({}, defaultOptions, _options);

        const joins = collectJoins(options);

        const story = await Story.findOne({
            include: joins,
            where: {
                short_url: url
            },

            subQuery: false,
        });
        if (story === null)
            return null;
        return unwrapStory(story, options);
    };

    /**
     * Returns a story by ID.
     *
     * @param id - The story ID.
     * @param options - What to fetch.
     */
    const getStoryByID = async (
        id: number,
        _options: StoryOptions
    ): Promise<RepoStory | null> => {
        const options = Object.assign({}, defaultOptions, _options);

        const joins = collectJoins(options);

        const story = await Story.findOne({
            include: joins,
            where: { id },

            subQuery: false,
        });
        if (story === null)
            return null;
        return unwrapStory(story, options);
    };

    /**
     * Either casts or retracts a vote on the story for the user.
     *
     * @param short_url - The short URL for the story.
     * @param user - The user casting the vote
     * @return true if story exists in db
     */
    const voteOnStory = async (
        short_url: string,
        user_id: number
    ): Promise<boolean> => {
        const result = await sequelize.transaction(async (t) => {
            // Get the story
            const story = await Story.findOne({
                where: {
                    short_url
                },
                transaction: t
            });
            if (story === null)
                return false;

            // Check whether the user voted
            if (!await story.hasVote(user_id, { transaction: t })) {
                // User didn't vote, cast
                await story.addVote(user_id, { transaction: t });
            } else {
                // User voted. Retract
                await story.removeVote(user_id, { transaction: t });
            }

            return true;
        })

        return result;
    };

    /**
     * Creates a story with the given parameters and returns the new story.
     *
     * @param story - The story parameters.
     */
    const createStory = async (story: StoryCreate): Promise<RepoStory> => {
        const result = await sequelize.transaction(async (t) => {
            // Create the story
            const newStory = await Story.create(story, { transaction: t });
            // Cast a vote by this user
            await newStory.addVote(story.submitter_id, { transaction: t });
            // Create all the tags
            for (let tag_id of story.tags) {
                await newStory.addTag(tag_id, { transaction: t });
            }

            return newStory;
        });

        return result.get();
    };

    /**
     * Return stories associated to the given tag ID.
     *
     * @param tagID - The ID of the tag the given story must have.
     * @param options - What/how to fetch.
     */
    const getStoriesByTagID = async (
        tagID: number,
        _options: StoryListOptions
    ): Promise<RepoStory[]> => {
        const options = Object.assign({}, defaultOptions, _options);
        const joins = collectJoins(options);

        joins.push({
            model: Tag as any,
            where: { id: tagID },
            required: true
        });

        if (options.rankOrder) {
            joins.push({
                model: story_rank,
                as: "rank",
                required: true
            });
        }

        const data = await Story.findAll({
            include: joins,
            limit: options.limit || undefined,
            offset: options.offset || undefined,
            order: options.rankOrder
                ? [[Sequelize.col("rank.story_rank"), "ASC"]]
                : undefined,
            subQuery: false
        });

        const result = data.map(model => {
            const story = unwrapStory(model, options);

            // If we ordered by story rank, we don't want to display the rank.
            if (options.rankOrder)
                delete (story as any).rank;

            return story;
        });
        return result;
    };

    return {
        createStory,
        getStories,
        getStoryByShortURL,
        getStoryByID,
        voteOnStory,
        getStoriesByTagID
    }
}
