import validUrl = require("valid-url");

import type { User } from "base/user_repository";
import type StoryRepository from "base/story_repository";
import type {
    Story, StoryListOptions, StoryCreate as RepositoryStoryCreate,
    StoryUpdate
} from "base/story_repository";
import type StoryManager from "base/story_manager";
import type { StoryOptions, StoryCreate } from "base/story_manager";
import type TagRepository from "base/tag_repository";
import type { Tag } from "base/tag_repository";
import type Pagination from "base/pagination";
import { ForbiddenError, NotFoundError, ValidationError } from "base/exceptions";

import { generateShortID, markdown } from "./utils";

// Maximum amount of stories on a given page.
const STORIES_PER_PAGE = 20;
// Maximum length of the text field.
const TEXT_MAX = 10_000;

interface Dependencies {
    storyRepository: StoryRepository;
    tagRepository: TagRepository;
};

const validators = {
    title: (errors: string[], title: string) => {
        if (title.length > 100)
            errors.push("Title cannot be longer than 100 characters.");
    },
    url: (errors: string[], url: string) => {
        if (url.length > 200)
            errors.push("The URL cannot be longer than 200 characters.");
        if (!validUrl.isWebUri(url))
            errors.push("That doesn't look like a valid URL.");
    },
    text: (errors: string[], text: string) => {
        if (text.length > TEXT_MAX)
            errors.push(`\
You have exceeded the maximum story text limit. Please shorten it to at most \
${TEXT_MAX} characters.`);
    },
    url_or_text: (errors: string[], url: string | null, text: string | null) => {
        if (url && text)
            errors.push(`\
You cannot have both URL and text on a story. Please remove one. You may add \
your text as a comment instead.`);
        else if (!url && !text)
            errors.push("The story must contain at least one of URL or text.");
    },
    tags: (errors: string[], tags: string[]) => {
        if (tags.length < 1)
            errors.push("You must select at least one tag.");
        else if (tags.length > 3)
            errors.push("You cannot select more than three tags.");
    }
}

export default function({
    storyRepository: dataSource,
    tagRepository
}: Dependencies): StoryManager {
    /**
     * Returns paginated stories.
     *
     * @param page - The page to return from the current ordering.
     * @param options - What to fetch.
     */
    const getStories = async (
        page: number,
        options: StoryListOptions
    ): Promise<Pagination<Story>> => {
        if (page < 1) page = 1;
        options.limit = STORIES_PER_PAGE;
        options.offset = (page - 1) * STORIES_PER_PAGE;

        const stories = await dataSource.getStories(options);

        return {
            page,
            items: stories,
            has_prev_page: page > 1,
            // Can't reliably know this without an additional roundtrip, but if
            // we have less than STORIES_PER_PAGE stories than we can say it's
            // true. Of course this fails once in every STORIES_PER_PAGE times.
            has_next_page: stories.length == STORIES_PER_PAGE
        }
    }

    /**
     * Returns a story by its short URL.
     *
     * @param url - The short URL for the story.
     * @param options - What/how to fetch.
     */
    const getStoryByShortURL = async (
        url: string,
        options: StoryOptions
    ): Promise<Story | null> => {
        const story = await dataSource.getStoryByShortURL(url, options);
        if (story === null)
            return null;

        // If passed, check whether the user can edit this story
        if (options.checkEditableBy !== undefined) {
            const user = options.checkEditableBy;
            if (!user.is_admin && story.submitter_id !== user.id)
                throw new ForbiddenError();
        }

        return story;
    }

    /**
     * Returns a story by ID.
     *
     * @param id - The story ID.
     * @param options - What/how to fetch.
     */
    const getStoryByID = async (
        id: number,
        options: StoryOptions
    ): Promise<Story | null> => {
        const story = await dataSource.getStoryByID(id, options);
        if (story === null)
            return null;

        // If passed, check whether the user can edit this story
        if (options.checkEditableBy !== undefined) {
            const user = options.checkEditableBy;
            if (!user.is_admin && story.submitter_id !== user.id)
                throw new ForbiddenError();
        }

        return story;
    }

    /**
     * Gives a vote on a story by user, or retracts the vote if it already exists.
     *
     * @param short_url - The short URL for the story.
     * @param user - The user voting on the story.
     * @return false if the story was missing, true otherwise.
     */
    const voteOnStory = (short_url: string, user: User) =>
        dataSource.voteOnStory(short_url, user.id);

    /**
     * Create a new story with the given parameters for the user.
     *
     * @param story - The story parameters.
     * @param user - The user creating the story.
     */
    const createStory = async (story: StoryCreate, user: User): Promise<Story> => {
        // Validate the story data.
        const errors: string[] = [];

        validators.title(errors, story.title);
        if (story.url)
            validators.url(errors, story.url);
        if (story.text)
            validators.text(errors, story.text);
        validators.tags(errors, story.tags);
        validators.url_or_text(errors, story.url, story.text);

        if (errors.length)
            throw new ValidationError(errors);

        // Generate short URL for story
        const shortID = generateShortID(6);

        // Render the story text, if it exists.
        const textHTML = story.text !== null ? markdown(story.text) : null;

        // Get all tags, and match up tags with their IDs.
        const allTags = await tagRepository.getAllTags();
        const tagIDs: number[] = [];

        for (const tag of story.tags) {
            const tagObject = allTags.find(t => t.name === tag);
            if (!tagObject) {
                throw new ValidationError([`Non-existent tag "${tag}".`])
            }
            tagIDs.push(tagObject.id);
        }

        const repoStory: RepositoryStoryCreate = {
            url: story.url,
            title: story.title,
            text: story.text,
            text_html: textHTML,
            tags: tagIDs,
            is_authored: story.is_authored,
            submitter_id: user.id,
            short_url: shortID,
        }

        return await dataSource.createStory(repoStory);
    }

    /**
     * Return all stories with a given tag.
     *
     * @param tag - The tag the stories must include.
     * @param page - The page the user is viewing.
     * @param options - What/how to fetch.
     */
    const getStoriesWithTag = async (
        tag: Tag,
        page: number,
        options: StoryListOptions
    ): Promise<Pagination<Story>> => {
        if (page < 1) page = 1;
        options.limit = STORIES_PER_PAGE;
        options.offset = (page - 1) * STORIES_PER_PAGE;

        const stories = await dataSource.getStoriesByTagID(tag.id, options);

        return {
            page,
            items: stories,
            has_prev_page: page > 1,
            has_next_page: stories.length == STORIES_PER_PAGE
        };
    }

    /**
     * Update an existing story with new parameters. Only admins or the submitter
     * can update a story.
     *
     * @param user - The user who wants to update the story
     * @param shortURL - The short URL of the story
     * @param params - The new story attributes
     */
    const updateStory = async (
        user: User,
        shortURL: string,
        params: StoryCreate
    ): Promise<void> => {
        // First, get the story and check if we have permission.
        const story = await getStoryByShortURL(shortURL, {});
        if (story === null)
            throw new NotFoundError();

        if (!user.is_admin && story.submitter_id !== user.id)
            throw new ForbiddenError();

        // Validate the story data.
        const errors: string[] = [];

        validators.title(errors, params.title);
        if (params.url)
            validators.url(errors, params.url);
        if (params.text)
            validators.text(errors, params.text);
        validators.tags(errors, params.tags);
        validators.url_or_text(errors, params.url, params.text);

        if (errors.length)
            throw new ValidationError(errors);

        // Render the story text, if it exists.
        const textHTML = params.text !== null ? markdown(params.text) : null;

        // Get all tags, and match up tags with their IDs.
        const allTags = await tagRepository.getAllTags();
        const tagIDs: number[] = [];

        for (const tag of params.tags) {
            const tagObject = allTags.find(t => t.name === tag);
            if (!tagObject) {
                throw new ValidationError([`Non-existent tag "${tag}".`])
            }
            tagIDs.push(tagObject.id);
        }

        const repoStory: StoryUpdate = {
            url: params.url,
            title: params.title,
            text: params.text,
            text_html: textHTML,
            tags: tagIDs,
            is_authored: params.is_authored,
        };

        // Update the story.
        await dataSource.updateStory(story.id, repoStory);
    }

    /**
     * Delete the story using the given user's credentials. If the user isn't
     * the story submitter or an admin, it is rejected.
     *
     * @param user - The user who wants to delete the story
     * @param shortURL - The short URL of the story to be deleted
     */
    const deleteStory = async (user: User, shortURL: string): Promise<void> => {
        const story = await getStoryByShortURL(shortURL, {});
        if (story === null)
            throw new NotFoundError();

        // Check permissions
        if (!user.is_admin && story.submitter_id !== user.id) {
            throw new ForbiddenError();
        }

        // All good, can delete. Related items will cascade.
        dataSource.deleteStory(story.id);
    }

    return {
        getStories,
        getStoryByShortURL,
        getStoryByID,
        voteOnStory,
        createStory,
        getStoriesWithTag,
        updateStory,
        deleteStory
    }
}
