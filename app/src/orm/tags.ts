import { Op } from "sequelize";
import { Tag, story_tags } from "./tables";

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
        const tags = await story_tags.findAll({
            include: {
                model: Tag as any,
                as: "tag"
            },
            where: {
                story_id: storyID
            }
        });

        return tags.map(({ tag: { id, name, description } }: any) => ({
            id, name, description
        }));
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

    /**
     * Return a tag by its name, or null if it doesn't exist.
     *
     * @param name - The name of the tag
     */
    const getTagByName = async (name: string): Promise<Tag | null> => {
        const tag = await Tag.findOne({ where: { name } })
        return tag;
    }

    return {
        getAllTags,
        getStoryTags,
        getTagsByStories,
        getTagByName
    }
}
