/** @file The interface for a message manager. */
import type { Message, MessageOptions } from "./message_repository";
import type { User } from "./user_repository";
import type Pagination from "./pagination";

interface MessageManager {
    /**
     * Send a new message to the user.
     *
     * @param source - The author of the message.
     * @param target - The intended message recipient.
     * @param content - The contents of this message.
     * @param parent - Optional parent, if this message was in reply to another.
     */
    sendMessage(source: User, target: User, content: string, parent?: Message): Promise<Message>;
    /**
     * Get all the messages for this user on a given page. The messages are
     * ordered by message thread creation date.
     *
     * @param user - The user to fetch messages for.
     * @param page - The page number.
     * @param options - Optional parameters to fetch.
     */
    getMessageThreadsForUser(user: User, page: number, options: MessageOptions): Promise<Pagination<Message>>;
    /**
     * Get the current message thread.
     *
     * @param user - The user who requested the thread
     * @param message_id - The ID of the first message in the thread
     * @param options - Additional stuff to fetch
     */
    getMessageThread(user: User, messageID: number, options: MessageOptions): Promise<Message[] | null>;
    /**
     * Get a single message by ID.
     *
     * @param user - The user who requested the message
     * @param messageID - The ID of the message
     * @param options - Additional stuff to fetch
     */
    getMessageByID(user: User, messageID: number, options: MessageOptions): Promise<Message | null>;
};

export { Message };
export default MessageManager;
