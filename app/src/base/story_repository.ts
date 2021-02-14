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
    user_voted: boolean
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
 * All the fields that are required for a story.
 */
export interface StoryCreate {
    // The ID of the submitter.
    submitter_id: number;
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
     */
    getStoryByShortURL(url: string, _options: StoryOptions): Promise<Story | null>;
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
};

export default StoryRepository;
