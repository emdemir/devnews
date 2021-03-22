import { markdown } from "./utils";

import type { User } from "../base/user_repository";
import type MessageRepository from "../base/message_repository";
import type {
    MessageCreate, MessageOptions, MessageListOptions
} from "../base/message_repository";
import type MessageManager from "../base/message_manager";
import type { Message } from "../base/message_manager";
import type Pagination from "../base/pagination";
import { ValidationError, ForbiddenError } from "../base/exceptions";

// Maximum amount of message threads shown in a single page.
const MESSAGES_PER_PAGE = 20;
// Maximum length of a single message.
const MAXIMUM_MESSAGE_LENGTH = 2000;

const validators = {
    message: (errors: string[], message: string) => {
        if (!message)
            errors.push("Message cannot be empty.");
        else if (message.length > MAXIMUM_MESSAGE_LENGTH)
            errors.push(`\
Message length is too long, please shorten to ${MAXIMUM_MESSAGE_LENGTH} characters
or less.`);
    },
    source_and_target: (errors: string[], source: User, target: User) => {
        if (source.id === target.id) {
            errors.push("You cannot send a message to yourself.");
        }
    }
}

interface Dependencies {
    messageRepository: MessageRepository;
};

export default function({ messageRepository: dataSource }: Dependencies): MessageManager {
    /**
     * Send a new message to the user.
     *
     * @param source - The author of the message.
     * @param target - The intended message recipient.
     * @param content - The contents of this message.
     * @param parent - Optional parent, if this message was in reply to another.
     */
    const sendMessage = async (
        source: User,
        target: User,
        content: string,
        parent?: Message
    ): Promise<Message> => {
        const errors: string[] = [];
        validators.message(errors, content);
        validators.source_and_target(errors, source, target);

        if (errors.length)
            throw new ValidationError(errors);

        const messageHTML = markdown(content);

        // TODO: user block checks.

        // If this is a reply, then check if this user is actually a participant.
        // Otherwise anyone would be able to barge into other threads' replies.
        if (parent !== undefined) {
            if (!(
                parent.sender_id === source.id && parent.receiver_id === target.id ||
                parent.receiver_id === source.id && parent.sender_id === target.id)) {
                throw new ForbiddenError();
            }
        }

        const create: MessageCreate = {
            sender_id: source.id,
            receiver_id: target.id,
            in_reply_to: parent
                ? parent.in_reply_to
                    ? parent.in_reply_to
                    : parent.id
                : null,
            message: content,
            message_html: messageHTML
        };

        return await dataSource.createMessage(create);
    }
    /**
     * Get all the messages for this user on a given page. The messages are
     * ordered by message thread creation date.
     *
     * @param user - The user to fetch messages for.
     * @param page - The page number.
     * @param options - Optional parameters to fetch.
     */
    const getMessageThreadsForUser = async (
        user: User,
        page: number,
        options: MessageOptions
    ): Promise<Pagination<Message>> => {
        if (page < 1) page = 1;
        const listOptions: MessageListOptions = {
            ...options,
            limit: MESSAGES_PER_PAGE,
            offset: (page - 1) * MESSAGES_PER_PAGE
        };

        const messages = await dataSource.getMessageThreadsForUser(
            user.id, listOptions);

        return {
            page,
            items: messages,
            has_prev_page: page > 1,
            has_next_page: messages.length === MESSAGES_PER_PAGE
        };
    }

    /**
     * Get the current message thread.
     *
     * @param message_id - The ID of the first message in the thread
     * @param user - The user who requested the thread
     * @param options - Additional stuff to fetch
     */
    const getMessageThread = async (
        message_id: number,
        user: User,
        options: MessageOptions
    ): Promise<Message[] | null> => {
        // This is broken down into three parts:
        // - Get the first message to check the parties against the user.
        // - Permission check, if it fails we throw.
        // - Get the replies to the message (because the permission check passed).

        const first_message = await dataSource.getMessageByID(message_id, options);
        // We also don't want to display messages that are replies as a page.
        if (first_message === null || first_message.in_reply_to !== null) {
            return null;
        }

        if (!(first_message.sender_id === user.id || first_message.receiver_id === user.id)) {
            throw new ForbiddenError();
        }

        // The failure mode of Message[] is [] so this is safe.
        const replies = await dataSource.getRepliesByID(message_id, options);

        return [first_message].concat(replies).map((m, i) => {
            m.thread_id = i + 1;
            return m;
        });
    }

    /**
     * Get a single message by ID.
     *
     * @param message_id - The ID of the first message in the thread
     * @param user - The user who requested the thread
     * @param options - Additional stuff to fetch
     */
    const getMessageByID = async (
        message_id: number,
        user: User,
        options: MessageOptions
    ): Promise<Message | null> => {
        // Similar to above.
        const message = await dataSource.getMessageByID(message_id, options);
        if (message === null) {
            return null;
        }

        if (!(message.sender_id === user.id || message.receiver_id === user.id)) {
            throw new ForbiddenError();
        }

        return message;
    }

    return {
        getMessageThreadsForUser,
        sendMessage,
        getMessageThread,
        getMessageByID
    }
}
