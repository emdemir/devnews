/** @file Define all the tables that are in the application.
 *
 * This file is used instead of doing them inline in each repository file,
 * because it solves potential recursive import problems when setting up
 * associations. Since we already use Awilix, there shouldn't be a problem
 * with the other layers importing these directly.
 */

// Sequelize imports
import { DataTypes, Model } from "sequelize";
import type {
    Association,
    HasManyGetAssociationsMixin,
    HasManyAddAssociationMixin,
    HasManyHasAssociationMixin,
    HasManyCountAssociationsMixin,
    HasManyCreateAssociationMixin,
    HasManyRemoveAssociationMixin,
    BelongsToGetAssociationMixin,
    BelongsToManyAddAssociationMixin,
    BelongsToManyCountAssociationsMixin,
    BelongsToManyGetAssociationsMixin,
    BelongsToManyHasAssociationMixin,
    BelongsToManyRemoveAssociationMixin
} from "sequelize";

import sequelize from "./";

// Interface imports
import type { User as RepoUser, UserCreate } from "../base/user_repository";
import type { Story as RepoStory, StoryCreate } from "../base/story_repository";
import type { Comment as RepoComment, CommentCreate } from "../base/comment_repository";
import type { Tag as RepoTag } from "../base/tag_repository";
import type { Message as RepoMessage, MessageCreate } from "../base/message_repository";

// --- Type definitions ---

export class User extends Model<RepoUser, UserCreate> implements RepoUser {
    public id!: number;
    public username!: string;
    public password!: string;
    public email!: string;
    public homepage!: string | null;
    public about!: string;
    public about_html!: string;
    public avatar_image!: string;
    public registered_at!: Date;
    public updated_at!: Date;

    // Association definitions
    public getStories!: HasManyGetAssociationsMixin<Story>;
    public hasStory!: HasManyHasAssociationMixin<Story, number>;
    public countStories!: HasManyCountAssociationsMixin;
    public createStory!: HasManyCreateAssociationMixin<Story>;

    public getComments!: HasManyGetAssociationsMixin<Comment>;
    public hasComment!: HasManyHasAssociationMixin<Comment, number>;
    public countComments!: HasManyCountAssociationsMixin;
    public createComment!: HasManyCreateAssociationMixin<Comment>;

    public getFollowed!: HasManyGetAssociationsMixin<Story>;
    public addFollowed!: HasManyAddAssociationMixin<Story, number>;
    public removeFollowed!: HasManyRemoveAssociationMixin<Story, number>;
    public hasFollowed!: HasManyHasAssociationMixin<Story, number>;
    public countFollowed!: HasManyCountAssociationsMixin;

    public getVotedStories!: HasManyGetAssociationsMixin<Story>;
    public addVotedStory!: HasManyAddAssociationMixin<Story, number>;
    public removeVotedStory!: HasManyRemoveAssociationMixin<Story, number>;
    public hasVotedStory!: HasManyHasAssociationMixin<Story, number>;
    public countVotedStories!: HasManyCountAssociationsMixin;

    public getVotedComments!: HasManyGetAssociationsMixin<Comment>;
    public addVotedComment!: HasManyAddAssociationMixin<Comment, number>;
    public removeVotedComment!: HasManyRemoveAssociationMixin<Comment, number>;
    public hasVotedComment!: HasManyHasAssociationMixin<Comment, number>;
    public countVotedComments!: HasManyCountAssociationsMixin;

    public getReadComments!: HasManyGetAssociationsMixin<Comment>;
    public addReadComment!: HasManyAddAssociationMixin<Comment, number>;
    public removeReadComment!: HasManyRemoveAssociationMixin<Comment, number>;
    public hasReadComment!: HasManyHasAssociationMixin<Comment, number>;
    public countReadComments!: HasManyCountAssociationsMixin;

    public static associations: {
        stories: Association<User, Story>;
        comments: Association<User, Comment>;
        followed: Association<User, Story>;
        voted_stories: Association<User, Story>;
        voted_comments: Association<User, Comment>;
        read_comments: Association<User, Comment>;
    }
};

export class Story extends Model<RepoStory, StoryCreate> implements RepoStory {
    public id!: number;
    public submitter_id!: number;
    public is_authored!: number;
    public short_url!: string;
    public title!: string;
    public url!: string | null;
    public text!: string | null;
    public text_html!: string | null;
    public submitted_at!: Date;
    public submitter_username?: string;
    public score?: number;
    public comment_count?: number;
    public user_voted?: boolean;

    // Association definitions
    public getUser!: BelongsToGetAssociationMixin<User>;

    public getFollowers!: BelongsToManyGetAssociationsMixin<User>;
    public addFollower!: BelongsToManyAddAssociationMixin<User, number>;
    public removeFollower!: BelongsToManyRemoveAssociationMixin<User, number>;
    public hasFollower!: BelongsToManyHasAssociationMixin<User, number>;
    public countFollowers!: BelongsToManyCountAssociationsMixin;

    public getVotes!: BelongsToManyGetAssociationsMixin<User>;
    public addVote!: BelongsToManyAddAssociationMixin<User, number>;
    public removeVote!: BelongsToManyRemoveAssociationMixin<User, number>;
    public hasVote!: BelongsToManyHasAssociationMixin<User, number>;
    public countVotes!: BelongsToManyCountAssociationsMixin;

    public getTags!: BelongsToManyGetAssociationsMixin<Tag>;
    public addTag!: BelongsToManyAddAssociationMixin<Tag, number>;
    public removeTag!: BelongsToManyRemoveAssociationMixin<Tag, number>;
    public hasTag!: BelongsToManyHasAssociationMixin<Tag, number>;
    public countTags!: BelongsToManyCountAssociationsMixin;

    public static associations: {
        user: Association<Story, User>;
        followers: Association<Story, User>;
        votes: Association<Story, User>;
        tags: Association<Story, Tag>;
    }
};

export class Comment extends Model<RepoComment, CommentCreate> implements RepoComment {
    public id!: number;
    public story_id!: number;
    public user_id!: number;
    public parent_id!: number;
    public short_url!: string;
    public commented_at!: Date;
    public comment!: string;
    public comment_html!: string;
    public score?: number;
    public user_voted?: boolean;
    public read?: boolean;
    public username?: string;

    // Association definitions
    public getUser!: BelongsToGetAssociationMixin<User>;
    public getStory!: BelongsToGetAssociationMixin<Story>;
    public getParent!: BelongsToGetAssociationMixin<Comment>;

    public getChildren!: HasManyGetAssociationsMixin<Comment>;
    public addChild!: HasManyAddAssociationMixin<Comment, number>;
    public hasChild!: HasManyHasAssociationMixin<Comment, number>;
    public countChildren!: HasManyCountAssociationsMixin;

    public getVotes!: BelongsToManyGetAssociationsMixin<User>;
    public addVote!: BelongsToManyAddAssociationMixin<User, number>;
    public removeVote!: BelongsToManyRemoveAssociationMixin<User, number>;
    public hasVote!: BelongsToManyHasAssociationMixin<User, number>;
    public countVotes!: BelongsToManyCountAssociationsMixin;

    public getViewers!: BelongsToManyGetAssociationsMixin<User>;
    public addViewer!: BelongsToManyAddAssociationMixin<User, number>;
    public removeViewer!: BelongsToManyRemoveAssociationMixin<User, number>;
    public hasViewer!: BelongsToManyHasAssociationMixin<User, number>;
    public countViewers!: BelongsToManyCountAssociationsMixin;

    public static associations: {
        user: Association<Comment, User>;
        story: Association<Comment, Story>;
        parent: Association<Comment, Comment>;
        children: Association<Comment, Comment>;
        votes: Association<Comment, User>;
        viewers: Association<Comment, User>;
    }
}

export class Tag extends Model<RepoTag> implements RepoTag {
    public id!: number;
    public name!: string;
    public description!: string;

    // Association definitions
    public getStories!: HasManyGetAssociationsMixin<Story>;
    public addStory!: HasManyAddAssociationMixin<Story, number>;
    public hasStory!: HasManyHasAssociationMixin<Story, number>;
    public countStories!: HasManyCountAssociationsMixin;

    public static associations: {
        stories: Association<Tag, Story>;
    };
};

export class Message extends Model<RepoMessage, MessageCreate> implements RepoMessage {
    public id!: number;
    public sender_id!: number;
    public receiver_id!: number;
    public in_reply_to!: number | null;
    public sent_at!: Date;
    public message!: string;
    public message_html!: string;
    public author?: string;
    public recipient?: string;
    public thread_id?: number;

    // Association definitions
    public getSender!: BelongsToGetAssociationMixin<User>;
    public getRecipient!: BelongsToGetAssociationMixin<User>;
    public getParent!: BelongsToGetAssociationMixin<Message>;

    public getChildren!: HasManyGetAssociationsMixin<Message>;
    public addChild!: HasManyAddAssociationMixin<Message, number>;
    public hasChild!: HasManyHasAssociationMixin<Message, number>;
    public countChildren!: HasManyCountAssociationsMixin;

    public static associations: {
        sender: Association<Message, User>;
        recipient: Association<Message, User>;
        parent: Association<Message, Message>;
        children: Association<Message, Message>;
    }
}

// --- Primary Tables ---

// Note that we turn creation timestamps off for all tables. Creation timestamps
// are handled automatically by the database via DEFAULT.
// If the table doesn't have an update timestamp we simply don't have any
// timestamps on it.

// The users table.
User.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING(32),
        unique: true,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING(32),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(80),
        unique: true,
        allowNull: false
    },
    homepage: {
        type: DataTypes.STRING(80),
        allowNull: true
    },
    about: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    about_html: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    avatar_image: {
        type: DataTypes.STRING(160),
        allowNull: false
    },
    registered_at: {
        type: DataTypes.DATE,
        allowNull: false
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    sequelize,
    tableName: "users",
    createdAt: false,
    updatedAt: "updated_at"
});

// The main stories table.
// Need to make tags optional, because we commit the tags manually into the
// database with a transaction (it's a related table).
Story.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    submitter_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    is_authored: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    short_url: {
        type: DataTypes.STRING(8),
        unique: true,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    url: {
        type: DataTypes.STRING(200),
        allowNull: true
    },
    text: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    text_html: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    submitted_at: {
        type: DataTypes.DATE
    }
}, {
    sequelize,
    tableName: "stories",
    timestamps: false
});

// The main comments table.
Comment.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    story_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    parent_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    short_url: {
        type: DataTypes.STRING(8),
        unique: true,
        allowNull: false
    },
    commented_at: {
        type: DataTypes.DATE,
        allowNull: true // Sequelize will try to fill it in otherwise.
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    comment_html: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, {
    sequelize,
    tableName: "comments",
    timestamps: false
});

// Tags on a story.
Tag.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(32),
        allowNull: false,
        unique: true
    },
    description: {
        type: DataTypes.STRING(128),
        allowNull: false
    }
}, {
    sequelize,
    tableName: "tags",
    timestamps: false
});

// A private message between two users of the site.
Message.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    sender_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    receiver_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    in_reply_to: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    sent_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    message_html: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, {
    sequelize,
    tableName: "messages",
    timestamps: false
});

// --- Secondary (M2M) tables ---

// Secondary table holding each user's vote on stories.
export const story_votes = sequelize.define("story_votes", {
    story_id: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
}, { timestamps: false });

// The tags on a story.
export const story_tags = sequelize.define("story_tags", {
    story_id: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    tag_id: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
}, { timestamps: false });

// Users who are following a story.
export const story_follows = sequelize.define("story_follows", {
    story_id: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true
    }
}, { timestamps: false });

// Secondary table for counting votes by users on comments.
export const comment_votes = sequelize.define("comment_votes", {
    comment_id: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true
    }
}, { timestamps: false });

// Secondary table for counting which comments have been read by this user.
export const read_comments = sequelize.define("read_comments", {
    comment_id: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true
    }
}, { timestamps: false });

// --- Views ---

// Statistics about the story (view).
export const story_stats = sequelize.define("story_stats", {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    score: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    comment_count: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, { timestamps: false });

// Ranking of each story (view).
export const story_rank = sequelize.define("story_rank", {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    story_rank: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    timestamps: false,
    // Sequelize PLEASE stop trying to pluralize my names.
    freezeTableName: true
});

// Score of each comment (view).
export const comment_score = sequelize.define("comment_score", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    score: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    timestamps: false,
    freezeTableName: true
});

// --- Associations ---

// Stories belong to users.
Story.belongsTo(User, {
    as: "user",
    foreignKey: "submitter_id"
});
User.hasMany(Story, {
    as: "stories",
    foreignKey: "submitter_id"
});

// Stories belong to users m2m (votes).
Story.belongsToMany(User, {
    as: "votes",
    through: story_votes,
    foreignKey: "story_id",
    otherKey: "user_id"
});
User.belongsToMany(Story, {
    as: "voted_stories",
    through: story_votes,
    foreignKey: "user_id",
    otherKey: "story_id"
});

// Stories belong to users m2m (follows).
Story.belongsToMany(User, {
    as: "followers",
    through: story_follows,
    foreignKey: "story_id",
    otherKey: "user_id"
});
User.belongsToMany(Story, {
    as: "followed",
    through: story_follows,
    foreignKey: "user_id",
    otherKey: "story_id"
});

// Stories belong to tags m2m.
Story.belongsToMany(Tag, {
    through: story_tags,
    foreignKey: "story_id",
    otherKey: "tag_id"
});
Tag.belongsToMany(Story, {
    through: story_tags,
    foreignKey: "tag_id",
    otherKey: "story_id"
});

// Story tags belong to tags.
story_tags.belongsTo(Tag, {
    as: "tag",
    foreignKey: "tag_id",
});
Tag.hasMany(story_tags, {
    as: "story_tags",
    foreignKey: "tag_id",
});

// Story stats belong to stories.
story_stats.belongsTo(Story, {
    as: "story",
    foreignKey: "id"
});
Story.hasOne(story_stats, {
    as: "stats",
    foreignKey: "id"
});

// Story rank belongs to stories.
story_rank.belongsTo(Story, {
    as: "story",
    foreignKey: "id"
});
Story.hasOne(story_rank, {
    as: "rank",
    foreignKey: "id",
});

// Comments belong to users.
Comment.belongsTo(User, {
    as: "user",
    foreignKey: "user_id"
});
User.hasMany(Comment, {
    as: "comments",
    foreignKey: "user_id"
});

// Comments belong to users m2m (votes).
Comment.belongsToMany(User, {
    as: "votes",
    through: comment_votes,
    foreignKey: "comment_id",
    otherKey: "user_id"
});
User.belongsToMany(Comment, {
    as: "voted_comments",
    through: comment_votes,
    foreignKey: "user_id",
    otherKey: "comment_id"
});

// Comments belong to users m2m (read comments).
Comment.belongsToMany(User, {
    as: "viewers",
    through: read_comments,
    foreignKey: "comment_id",
    otherKey: "user_id"
});
User.belongsToMany(Comment, {
    through: read_comments,
    foreignKey: "user_id",
    otherKey: "comment_id"
});

// Comments belong to stories.
Comment.belongsTo(Story, {
    as: "story",
    foreignKey: "story_id"
});
Story.hasMany(Comment, {
    as: "comments",
    foreignKey: "story_id"
});

// Comments belong to themselves (parent).
Comment.belongsTo(Comment, {
    as: "parent",
    foreignKey: "parent_id"
});
Comment.hasMany(Comment, {
    as: "children",
    foreignKey: "parent_id"
});

// Messages belong to users (sender).
Message.belongsTo(User, {
    as: "sender",
    foreignKey: "sender_id"
});
User.hasMany(Message, {
    as: "sent_messages",
    foreignKey: "sender_id"
})

// Messages belong to users (recipient).
Message.belongsTo(User, {
    as: "recipient",
    foreignKey: "receiver_id"
});
User.hasMany(Message, {
    as: "received_messages",
    foreignKey: "receiver_id"
})

// Messages belong to themselves (threads).
Message.belongsTo(Message, {
    as: "parent",
    foreignKey: "in_reply_to"
});
Message.hasMany(Message, {
    as: "children",
    foreignKey: "in_reply_to"
})
