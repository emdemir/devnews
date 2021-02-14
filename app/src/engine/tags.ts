import type TagRepository from "../base/tag_repository";
import type TagManager from "../base/tag_manager";
import type { StoryTagMapping } from "../base/tag_manager";

interface Dependencies {
    tagRepository: TagRepository;
};

export default function({ tagRepository: dataSource }: Dependencies): TagManager {
    const getAllTags = () => dataSource.getAllTags();


    /**
     * Given a story ID, get all its tags.
     *
     * @param storyID - The ID of the story
     */
    const getStoryTags = (storyID: number) => dataSource.getStoryTags(storyID);

    /**
     * Return a mapping from the given story IDs to their tags.
     *
     * @param storyIDs - The IDs of the stories to get tags for.
     */
    const getTagsForStories = async (storyIDs: number[]): Promise<StoryTagMapping> => {
        const tags = await dataSource.getTagsByStories(storyIDs);

        const mapping: StoryTagMapping = {};
        tags.forEach(tag => {
            if (!(tag.story_id in mapping)) {
                mapping[tag.story_id] = []
            }
            mapping[tag.story_id].push(tag);
        });

        return mapping;
    }

    return {
        getAllTags,
        getStoryTags,
        getTagsForStories
    }
}
