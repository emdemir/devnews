/** @file The interface for a story manager. */

import type {
    StoryListOptions, StoryOptions as RepoStoryOptions, Story
} from "./story_repository";
import type { User } from "./user_repository";
import type { Tag } from "./tag_repository";
import type Pagination from "./pagination";

/**
 * All the fields that are required for a story on the manager side.
 */
export interface StoryCreate {
    // Whether the story was authored by the story author.
    is_authored: boolean;
    // The story's title.
    title: string;
    // The URL of the story, can be null.
    url: string | null;
    // The text of the story (unprocessed), can be null.
    text: string | null;
    // The tags for this story as an array of tag names.
    tags: string[];
};

/**
 * Extra options when fetching a story.
 */
export interface StoryOptions extends RepoStoryOptions {
    // If passed, checks whether the given user can edit the story, and raises
    // ForbiddenError if he can't.
    checkEditableBy?: User;
}

interface StoryManager {
    /**
     * Returns paginated stories.
     *
     * @param page - The page to return from the current ordering.
     * @param options - What to fetch.
     */
    getStories(page: number, options: StoryListOptions): Promise<Pagination<Story>>;
    /**
     * Returns a story by its short URL.
     *
     * @param url - The short URL.
     * @param options - What/how to fetch.
     */
    getStoryByShortURL(url: string, options: StoryOptions): Promise<Story | null>;
    /**
     * Returns a story by ID.
     *
     * @param id - The story ID.
     * @param options - What/how to fetch.
     */
    getStoryByID(id: number, options: StoryOptions): Promise<Story | null>;
    /**
     * Gives a vote on a story by user, or retracts the vote if it already exists.
     *
     * @param short_url - The short URL for the story.
     * @param user - The user voting on the story.
     * @return false if the story was missing, true otherwise.
     */
    voteOnStory(short_url: string, user: User): Promise<boolean>;
    /**
     * Create a new story with the given parameters for the user.
     *
     * @param story - The story parameters.
     * @param user - The user creating the story.
     */
    createStory(story: StoryCreate, user: User): Promise<Story>;
    /**
     * Return all stories with a given tag.
     *
     * @param tag - The tag the stories must include.
     * @param page - The page the user is viewing.
     * @param options - What/how to fetch.
     */
    getStoriesWithTag(tag: Tag, page: number, options: StoryListOptions): Promise<Pagination<Story>>;
    /**
     * Update an existing story with new parameters. Only admins or the submitter
     * can update a story.
     *
     * @param user - The user who wants to update the story
     * @param short_url - The short URL of the story
     * @param params - The new story attributes
     */
    updateStory(user: User, shortURL: string, params: StoryCreate): Promise<void>;
    /**
     * Delete the story using the given user's credentials. If the user isn't
     * the story submitter or an admin, it is rejected.
     *
     * @param user - The user who wants to delete the story
     * @param shortURL - The short URL of the story to be deleted
     */
    deleteStory(user: User, shortURL: string): Promise<void>;
};

export { Story };
export default StoryManager;
