/** @file The interface for a story manager. */

import type { StoryListOptions, StoryOptions, Story } from "./story_repository";
import type { User } from "./user_repository";

interface StoryManager {
    /**
     * Returns paginated stories.
     *
     * @param page - The page to return from the current ordering.
     * @param options - What to fetch.
     */
    getStories(page: number, options: StoryListOptions): Promise<Story[]>;
    /**
     * Returns a story by its short URL.
     *
     * @param options - What to fetch.
     */
    getStoryByShortURL(url: string, options: StoryOptions): Promise<Story | null>;
    /**
     * Gives a vote on a story by user, or retracts the vote if it already exists.
     *
     * @param short_url - The short URL for the story.
     * @param user - The user voting on the story.
     * @return false if the story was missing, true otherwise.
     */
    voteOnStory(short_url: string, user: User): Promise<boolean>;
};

export default StoryManager;
