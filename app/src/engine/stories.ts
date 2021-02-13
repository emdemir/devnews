import * as dataSource from "../datasource/stories";
import type { User } from "./users";
export type { Story, StoryOptions, StoryListOptions } from "../datasource/stories";

const STORIES_PER_PAGE = 20;

/**
 * Returns paginated stories.
 *
 * @param page - The page to return from the current ordering.
 * @param options - What to fetch.
 */
export const getStories = (
    page: number,
    options: dataSource.StoryListOptions
): Promise<dataSource.Story[]> => {
    if (page < 1) page = 1;
    options.limit = STORIES_PER_PAGE;
    options.offset = (page - 1) * STORIES_PER_PAGE;

    return dataSource.getStories(options);
}

/**
 * Returns a story by its short URL.
 *
 * @param options - What to fetch.
 */
export const getStoryByShortURL = (
    url: string,
    options: dataSource.StoryOptions
): Promise<dataSource.Story | null> =>
    dataSource.getStoryByShortURL(url, options);

/**
 * Gives a vote on a story by user, or retracts the vote if it already exists.
 *
 * @param short_url - The short URL for the story.
 * @param user - The user voting on the story.
 * @return false if the story was missing, true otherwise.
 */
export const voteOnStory = async (short_url: string, user: User) =>
    dataSource.voteOnStory(short_url, user);
