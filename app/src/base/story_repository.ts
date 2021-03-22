/** @file The interface for a story repository. */

// The base story object.
export interface Story {
    id: number;
    submitter_id: number;
    is_authored: number;
    short_url: string;
    title: string;
    url: string | null;
    text: string | null;
    text_html: string | null;
    submitted_at: Date;

    // Optional fields, made available through options.
    submitter_username?: string
    score?: number
    comment_count?: number
    user_voted?: boolean
};

// The options that are available to fetch a single story.
export interface StoryOptions {
    // Fetch the username of the user who submitted the story.
    submitterUsername?: boolean;
    // Fetch the total score for the story.
    score?: boolean;
    // Fetch the comment count for the story.
    commentCount?: boolean;

    // Fetch whether the current user voted on the story. If not undefined,
    // needs to be a user ID.
    checkVoter?: number;
};

// The options that are available to fetch a story list.
export interface StoryListOptions extends StoryOptions {
    rankOrder?: boolean;

    limit?: number;
    offset?: number;
};

/**
 * All the fields that are required for a story on the repository side.
 */
export interface StoryCreate {
    // The ID of the submitter.
    submitter_id: number;
    // Whether the story was authored by the story author.
    is_authored: boolean;
    // The short URL for this story.
    short_url: string;
    // The story's title.
    title: string;
    // The URL of the story, can be null.
    url: string | null;
    // The text of the story (unprocessed), can be null.
    text: string | null;
    // The text of the story (processed into HTML), can be null.
    text_html: string | null;
    // The tags for this story as an array of IDs.
    tags: number[];
};

interface StoryRepository {
    /**
     * Returns a list of stories with the specified options.
     *
     * @param options The options.
     */
    getStories(options: StoryListOptions): Promise<Story[]>;
    /**
     * Fetch a story by its short URL. Returns the story if it exists, null otherwise.
     *
     * @param url - The short url.
     * @param options - What to fetch.
     */
    getStoryByShortURL(url: string, options: StoryOptions): Promise<Story | null>;
    /**
     * Returns a story by ID.
     *
     * @param id - The story ID.
     * @param options - What to fetch.
     */
    getStoryByID(id: number, options: StoryOptions): Promise<Story | null>;
    /**
     * Either casts or retracts a vote on the story for the user.
     *
     * @param short_url - The short URL for the story.
     * @param user - The user casting the vote
     * @return true if story exists in db
     */
    voteOnStory(short_url: string, user_id: number): Promise<boolean>;
    /**
     * Creates a story with the given parameters and returns the new story.
     *
     * @param story - The story parameters.
     */
    createStory(story: StoryCreate): Promise<Story>;
    /**
     * Return stories associated to the given tag ID.
     *
     * @param tagID - The ID of the tag the given story must have.
     * @param options - What/how to fetch.
     */
    getStoriesByTagID(tagID: number, options: StoryListOptions): Promise<Story[]>;
    /**
     * Delete a story by its ID.
     *
     * @param id - The story ID.
     */
    deleteStory(id: number): Promise<void>;
};

export default StoryRepository;
