import { Op } from "sequelize";
import { Tag, Story, story_tags } from "./tables";

import type TagRepository from "../base/tag_repository";
import type { Tag as RepoTag, TagWithStoryID } from "../base/tag_repository";
import type StoryRepository from "../base/story_repository";

interface Dependencies {
    storyRepository: StoryRepository;
};

export default function({ storyRepository }: Dependencies): TagRepository {
    /**
     * Returns all available tags on the site.
     */
    const getAllTags = async (): Promise<RepoTag[]> => {
        const tags = await Tag.findAll();
        return tags.map(model => model.get({ plain: true }));
    };
    /**
     * Given a story ID, get all its tags.
     *
     * @param storyID - The ID of the story
     */
    const getStoryTags = async (storyID: number): Promise<RepoTag[]> => {
        const story = await storyRepository.getStoryByID(storyID, {});
        if (story === null)
            return [];

        const realStory = story as Story;
        return (await realStory.getTags()).map(model => model.get({ plain: true }));
    };
    /**
     * Return all the tags for the given IDs along with the story ID that each
     * tag belongs to.
     *
     * @param storyIDs - The IDs of the stories to fetch tags for.
     */
    const getTagsByStories = async (storyIDs: number[]): Promise<TagWithStoryID[]> => {
        const tags = await story_tags.findAll({
            include: [
                {
                    model: Tag as any,
                    as: "tag"
                }
            ],
            where: {
                story_id: {
                    [Op.in]: storyIDs
                }
            }
        });

        return tags.map((model: any) => {
            return {
                id: model.tag.id,
                name: model.tag.name,
                description: model.tag.description,
                story_id: model.story_id
            };
        });
    };

    return {
        getAllTags,
        getStoryTags,
        getTagsByStories
    }
}
