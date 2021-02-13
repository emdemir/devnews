import type { QueryResult } from "pg";
import { getClient, query } from "./index";
import type { User } from "./users";

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

const defaultOptions: StoryOptions = {
    submitterUsername: false,
    score: false,
    commentCount: false
};

const defaultListOptions: StoryListOptions = {
    submitterUsername: false,
    score: false,
    commentCount: false,
    rankOrder: false,

    limit: 20,
    offset: 0
};

/**
 * Returns a list of stories with the specified options.
 *
 * @param _options The options.
 */
export const getStories = async (_options: StoryListOptions): Promise<Story[]> => {
    const options = Object.assign({}, defaultListOptions, _options);

    const params: any[] = [];
    if (options.checkVoter !== undefined)
        params.push(options.checkVoter);

    const result: QueryResult<Story> = await query(`\
        SELECT S.*
            ${options.submitterUsername ? ", U.username AS submitter_username" : ""}
            ${options.score ? ", SS.score::integer" : ""}
            ${options.commentCount ? ", SS.comment_count::integer" : ""}
            ${options.checkVoter !== undefined ? ", COUNT(V.*)::integer::boolean AS user_voted" : ""}
        FROM stories S
            ${options.submitterUsername ? "INNER JOIN users U ON U.id = S.submitter_id" : ""}
            ${options.score || options.commentCount ? "INNER JOIN story_stats SS ON SS.id = S.id" : ""}
            ${options.rankOrder ? "INNER JOIN story_rank R ON R.id = S.id" : ""}
            ${options.checkVoter !== undefined
            ? "LEFT OUTER JOIN story_votes V ON V.story_id = S.id AND V.user_id = $1"
            : ""}
        GROUP BY S.id
            ${options.submitterUsername ? ", U.username" : ""}
            ${options.score ? ", SS.score" : ""}
            ${options.commentCount ? ", SS.comment_count" : ""}
            ${options.rankOrder ? ", R.story_rank" : ""}
        ${options.rankOrder ? "ORDER BY R.story_rank ASC" : ""}
        LIMIT ${options.limit} OFFSET ${options.offset}`, params);

    return result.rows;
}

/**
 * Fetch a story by its short URL. Returns the story if it exists, null otherwise.
 *
 * @param url - The short url.
 */
export const getStoryByShortURL = async (
    url: string,
    _options: StoryOptions
): Promise<Story | null> => {
    const options = Object.assign({}, defaultOptions, _options);

    const params: any[] = [url];
    if (options.checkVoter !== undefined)
        params.push(options.checkVoter);

    const result: QueryResult<Story> = await query(`\
        SELECT S.*
            ${options.submitterUsername ? ", U.username AS submitter_username" : ""}
            ${options.score ? ", SS.score::integer" : ""}
            ${options.commentCount ? ", SS.comment_count::integer" : ""}
            ${options.checkVoter !== undefined ? ", COUNT(V.*)::integer::boolean AS user_voted" : ""}
        FROM stories S
            ${options.submitterUsername ? "INNER JOIN users U ON U.id = S.submitter_id" : ""}
            ${options.score || options.commentCount ? "INNER JOIN story_stats SS ON SS.id = S.id" : ""}
            ${options.checkVoter !== undefined
            ? "LEFT OUTER JOIN story_votes V ON V.story_id = S.id AND V.user_id = $2"
            : ""}
        WHERE S.short_url = $1
        GROUP BY S.id
            ${options.submitterUsername ? ", U.username" : ""}
            ${options.score ? ", SS.score" : ""}
            ${options.commentCount ? ", SS.comment_count" : ""}`, params);

    if (result.rowCount === 0)
        return null;
    return result.rows[0];
}

/**
 * Either casts or retracts a vote on the story for the user.
 *
 * @param short_url - The short URL for the story.
 * @param user - The user casting the vote
 * @return true if story exists in db
 */
export const voteOnStory = async (short_url: string, user: User): Promise<boolean> => {
    const client = await getClient();

    try {
        await client.query("BEGIN");

        // Fetch the story ID
        const storyResult = await client.query<{ id: number }>(`\
            SELECT id FROM stories WHERE short_url = $1`, [short_url]);
        if (storyResult.rowCount === 0)
            return false;

        // Check whether this user has a vote already or not
        const existingResult = await client.query(`\
            SELECT COUNT(*)::integer FROM story_votes
            WHERE story_id = $1 AND user_id = $2`,
            [storyResult.rows[0].id, user.id]);

        if (existingResult.rows[0].count === 0) {
            // Cast a vote
            await client.query(`\
                INSERT INTO story_votes (story_id, user_id) VALUES ($1, $2)`,
                [storyResult.rows[0].id, user.id]);
        } else {
            // Retract the vote
            await client.query(`\
                DELETE FROM story_votes WHERE story_id = $1 AND user_id = $2`,
                [storyResult.rows[0].id, user.id]);
        }

        await client.query("COMMIT");
        return true;
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
}

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

export const createStory = async (story: StoryCreate) => {
    const client = await getClient();

    try {
        // Create the story.
        //const storyResult =
        await client.query("COMMIT");
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
};
