import { Op } from "sequelize";
import { Message, User } from "./tables";

import type MessageRepository from "base/message_repository";
import type {
    Message as RepoMessage, MessageOptions, MessageCreate, MessageListOptions
} from "base/message_repository";
import type { Includeable } from "sequelize";

const defaultOptions: MessageOptions = {
    author: false,
    recipient: false
};

const collectJoins = (options: MessageOptions): Includeable[] => {
    const joins: Includeable[] = [];

    if (options.author) {
        joins.push({
            model: User as any,
            as: "sender",
            attributes: ["username"]
        });
    }

    if (options.recipient) {
        joins.push({
            model: User as any,
            as: "recipient",
            attributes: ["username"]
        });
    }

    return joins;
}

/**
 * Convert a message to fit the Message interface.
 *
 * @param m - The sequelize message object
 * @param options - Message fetch options
 */
const unwrapMessage = (m: Message, options: MessageOptions): RepoMessage => {
    const message = m.get({ plain: true });
    const mm = m as any;

    if (options.author)
        message.author = mm.sender.username;
    if (options.recipient)
        message.recipient = mm.recipient.username;

    // Clean up object from nested values
    if (options.author)
        delete mm.sender;
    if (options.recipient)
        delete mm.recipient;

    return message;
}


export default function({ }): MessageRepository {
    /**
     * Creates a new message with the given parameters.
     *
     * @param message - The parameters
     */
    const createMessage = async (params: MessageCreate): Promise<RepoMessage> => {
        const message = await Message.create(params);
        return message;
    };

    /**
     * Get all the messages for this user.
     *
     * @param user - The user to fetch messages for.
     * @param _options - Additional things to fetch.
     */
    const getMessageThreadsForUser = async (
        user_id: number,
        _options: MessageListOptions
    ): Promise<RepoMessage[]> => {
        const options = Object.assign({}, defaultOptions, _options);

        const joins = collectJoins(options);

        // TODO: sort by latest reply. There is no way at all in Sequelize to
        // join on a subquery, even while using Sequelize.literal. I can't
        // use a literal attribute because PostgreSQL does not allow you to
        // use aliases at the same scope, and we would need to wrap the whole
        // query in a subquery which Sequelize ALSO doesn't support without
        // mangling the query. So this whole thing would have to be a raw SQL
        // query which defeats the whole purpose of using an ORM in the first place.
        //
        // I dislike ORMs.
        //
        // Attribute for future reference:
        // [
        //     Sequelize.literal(`(
        //         SELECT MAX(R.sent_at)
        //         FROM messages R
        //         WHERE R.in_reply_to = id
        //     )`),
        //     "last_reply"
        // ]
        const messages = await Message.findAll({
            include: joins,
            limit: options.limit || undefined,
            offset: options.offset || undefined,
            where: {
                [Op.or]: {
                    sender_id: user_id,
                    receiver_id: user_id
                },
                in_reply_to: null
            },
            order: [["sent_at", "DESC"]],
        });

        return messages.map(model => unwrapMessage(model, options));
    };

    /**
     * Get a single message by its ID.
     *
     * @param message_id - The ID of the message.
     * @param options - Additional things to fetch.
     */
    const getMessageByID = async (
        message_id: number,
        _options: MessageOptions
    ): Promise<RepoMessage | null> => {
        const options = Object.assign({}, defaultOptions, _options);

        const joins = collectJoins(options);
        const message = await Message.findOne({
            include: joins,
            where: {
                id: message_id
            }
        });
        if (message === null)
            return null;

        return unwrapMessage(message, options);
    };

    /**
     * Gets the replies of this thread.
     *
     * @param message_id - The ID of the thread.
     * @param options - Additional things to fetch.
     */
    const getRepliesByID = async (
        message_id: number,
        _options: MessageOptions
    ): Promise<RepoMessage[]> => {
        const options = Object.assign({}, defaultOptions, _options);

        const joins = collectJoins(options);
        const messages = await Message.findAll({
            include: joins,
            where: {
                in_reply_to: message_id
            },
            order: [["sent_at", "ASC"]]
        });

        return messages.map(model => unwrapMessage(model, options));
    };

    return {
        createMessage,
        getMessageByID,
        getMessageThreadsForUser,
        getRepliesByID
    }
}
