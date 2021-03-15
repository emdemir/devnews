import { query } from "./";
import type TagRepository from "../base/tag_repository";
import type { Tag, TagWithStoryID } from "../base/tag_repository";

export default function({ }): TagRepository {
    const getAllTags = async (): Promise<Tag[]> => {
        const result = await query<Tag>(`SELECT * FROM tags`, []);
        return result.rows;
    }

    /**
     * Given a story ID, get all its tags.
     *
     * @param storyID - The ID of the story
     */
    const getStoryTags = async (storyID: number): Promise<Tag[]> => {
        const result = await query<Tag>(`\
            SELECT T.*
            FROM tags T
            INNER JOIN story_tags ST ON ST.tag_id = T.id
            WHERE ST.story_id = $1`, [storyID]);
        return result.rows;
    }

    /**
     * Return all the tags for the given IDs along with the story ID that each
     * tag belongs to.
     *
     * @param storyIDs - The IDs of the stories to fetch tags for.
     */
    const getTagsByStories = async (storyIDs: number[]): Promise<TagWithStoryID[]> => {
        // node-postgres is outstandingly stupid.
        const params = storyIDs.map((_, i) => `$${i + 1}`).join(", ");
        const result = await query<TagWithStoryID>(`\
            SELECT ST.story_id, T.*
            FROM story_tags ST
            INNER JOIN tags T ON T.id = ST.tag_id
            WHERE ST.story_id IN (${params})`, storyIDs);
        return result.rows;
    }

    /**
     * Return a tag by its name, or null if it doesn't exist.
     *
     * @param name - The name of the tag
     */
    const getTagByName = async (name: string): Promise<Tag | null> => {
        const result = await query<Tag>(`\
            SELECT T.*
            FROM tags T
            WHERE T.name = $1`, [name]);
        if (result.rowCount === 0)
            return null;
        return result.rows[0];
    }

    return {
        getAllTags,
        getStoryTags,
        getTagsByStories,
        getTagByName
    };
}
