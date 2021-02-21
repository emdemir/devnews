import type { QueryResult } from "pg";
import { getClient, query } from "./index";

import StoryRepository from "../base/story_repository";
import { Story, StoryOptions, StoryListOptions, StoryCreate } from "../base/story_repository";

const defaultOptions: StoryOptions = {
    submitterUsername: false,
    score: false,
    commentCount: false
};

const defaultListOptions: StoryListOptions = {
    ...defaultOptions,
    rankOrder: false,
    limit: 20,
    offset: 0
};

export default function({ }): StoryRepository {

    /**
     * Returns a list of stories with the specified options.
     *
     * @param _options The options.
     */
    const getStories = async (_options: StoryListOptions): Promise<Story[]> => {
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
    const getStoryByShortURL = async (
        url: string,
        _options: StoryOptions
    ): Promise<Story | null> => {
        const options = Object.assign({}, defaultOptions, _options);

        const params: any[] = [url];
        if (options.checkVoter !== undefined)
            params.push(options.checkVoter);

        const result = await query<Story>(`\
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
     * Returns a story by ID.
     *
     * @param id - The story ID.
     * @param options - What to fetch.
     */
    const getStoryByID = async (
        id: number,
        _options: StoryOptions
    ): Promise<Story | null> => {
        const options = Object.assign({}, defaultOptions, _options);

        const params: any[] = [id];
        if (options.checkVoter !== undefined)
            params.push(options.checkVoter);

        const result = await query<Story>(`\
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
            WHERE S.id = $1
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
     * @param user_id - The user casting the vote
     * @return true if story exists in db
     */
    const voteOnStory = async (short_url: string, user_id: number): Promise<boolean> => {
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
                [storyResult.rows[0].id, user_id]);

            if (existingResult.rows[0].count === 0) {
                // Cast a vote
                await client.query(`\
                INSERT INTO story_votes (story_id, user_id) VALUES ($1, $2)`,
                    [storyResult.rows[0].id, user_id]);
            } else {
                // Retract the vote
                await client.query(`\
                DELETE FROM story_votes WHERE story_id = $1 AND user_id = $2`,
                    [storyResult.rows[0].id, user_id]);
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
     * Creates a story with the given parameters and returns the new story.
     *
     * @param _story - The story parameters.
     */
    const createStory = async (_story: StoryCreate): Promise<Story> => {
        const client = await getClient();

        try {
            await client.query("BEGIN");

            // Create the story.
            const storyResult = await client.query<Story>(`\
            INSERT INTO stories
                (submitter_id, is_authored, short_url, title, url, text, text_html)
            VALUES
                ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`, [
                _story.submitter_id,
                _story.is_authored,
                _story.short_url,
                _story.title,
                _story.url,
                _story.text,
                _story.text_html
            ]);

            if (storyResult.rowCount !== 1)
                throw new Error("Couldn't fetch story after insert?!");

            const story = storyResult.rows[0];

            // Create relationship between story and its tags.
            // We are using multiple-insert syntax here for PostgreSQL so we
            // need to generate sequential parameter numbers.
            let i = 1;
            const values = [];
            for (let _ of _story.tags) {
                values.push(`($${i}, $${i + 1})`);
                i += 2;
            }
            const tagParams = _story.tags.reduce((acc, tag_id) => {
                acc.push(story.id);
                acc.push(tag_id);
                return acc;
            }, [] as number[])

            // Insert the tag relationships.
            await client.query(`\
                INSERT INTO story_tags (story_id, tag_id)
                VALUES ${values.join(", ")}`,
                tagParams);

            // Cast initial vote on this story by submitter.
            await client.query(`\
                INSERT INTO story_votes (story_id, user_id)
                VALUES ($1, $2)`, [story.id, _story.submitter_id]);

            await client.query("COMMIT");
            return story;
        } catch (e) {
            await client.query("ROLLBACK");
            throw e;
        } finally {
            client.release();
        }
    };

    return {
        getStories,
        createStory,
        getStoryByShortURL,
        getStoryByID,
        voteOnStory
    };
}
