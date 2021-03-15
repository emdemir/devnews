/** @file The interface for a tag repository. */

export interface Tag {
    // The tag ID.
    id: number;
    // The name of the tag.
    name: string;
    // A short description of the tag.
    description: string;
};

export interface TagWithStoryID extends Tag {
    story_id: number;
};

interface TagRepository {
    /**
     * Returns all available tags on the site.
     */
    getAllTags(): Promise<Tag[]>;
    /**
     * Given a story ID, get all its tags.
     *
     * @param storyID - The ID of the story
     */
    getStoryTags(storyID: number): Promise<Tag[]>;
    /**
     * Return all the tags for the given IDs along with the story ID that each
     * tag belongs to.
     *
     * @param storyIDs - The IDs of the stories to fetch tags for.
     */
    getTagsByStories(storyIDs: number[]): Promise<TagWithStoryID[]>;
    /**
     * Return a tag by its name, or null if it doesn't exist.
     *
     * @param name - The name of the tag
     */
    getTagByName(name: string): Promise<Tag | null>;
};

export default TagRepository;
