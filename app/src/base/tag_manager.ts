/** @file The interface for a tag manager. */

import type { Tag } from "./tag_repository";

// Returned from getTagsForStories, maps a story ID to its corresponding tags.
export interface StoryTagMapping {
    [storyID: number]: Tag[];
};

interface TagManager {
    /**
     * Returns all the tags available on the site.
     */
    getAllTags(): Promise<Tag[]>;
    /**
     * Given a story ID, get all its tags.
     *
     * @param storyID - The ID of the story
     */
    getStoryTags(storyID: number): Promise<Tag[]>;
    /**
     * Return a mapping from the given story IDs to their tags.
     *
     * @param storyIDs - The IDs of the stories to get tags for.
     */
    getTagsForStories(storyIDs: number[]): Promise<StoryTagMapping>;
    /**
     * Return a tag by its name, or null if it doesn't exist.
     *
     * @param name - The name of the tag
     */
    getTagByName(name: string): Promise<Tag | null>;
};

export { Tag };
export default TagManager;
