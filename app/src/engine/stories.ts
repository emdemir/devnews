import type { User } from "../base/user_repository";
import type StoryRepository from "../base/story_repository";
import type { Story, StoryOptions, StoryListOptions } from "../base/story_repository";
import type StoryManager from "../base/story_manager";

const STORIES_PER_PAGE = 20;

interface Dependencies {
    storyRepository: StoryRepository;
};

export default function({ storyRepository: dataSource }: Dependencies): StoryManager {
    /**
     * Returns paginated stories.
     *
     * @param page - The page to return from the current ordering.
     * @param options - What to fetch.
     */
    const getStories = (
        page: number,
        options: StoryListOptions
    ): Promise<Story[]> => {
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
    const getStoryByShortURL = (
        url: string,
        options: StoryOptions
    ): Promise<Story | null> =>
        dataSource.getStoryByShortURL(url, options);

    /**
     * Gives a vote on a story by user, or retracts the vote if it already exists.
     *
     * @param short_url - The short URL for the story.
     * @param user - The user voting on the story.
     * @return false if the story was missing, true otherwise.
     */
    const voteOnStory = async (short_url: string, user: User) =>
        dataSource.voteOnStory(short_url, user.id);

    return {
        getStories,
        getStoryByShortURL,
        voteOnStory
    }
}
