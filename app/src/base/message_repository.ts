/** @file The interface for a message repository. */

export interface Message {
    // The message's ID in the database.
    id: number;
    // The message sender's ID.
    sender_id: number;
    // The recipient ID.
    receiver_id: number;
    // The message ID this message is in reply to.
    in_reply_to: number | null;
    // The date this message was sent at.
    sent_at: Date;
    // The message contents (unprocessed).
    message: string;
    // The message contents (processed HTML).
    message_html: string;

    // Optional fields

    // Author of the message (username)
    author?: string;
    // Recipient of the message (username)
    recipient?: string;
    // The number of this message in the thread
    thread_id?: number;
};

// All the parameters required to create a message.
export interface MessageCreate {
    // The ID of the sender.
    sender_id: number;
    // The ID of the receiver.
    receiver_id: number;
    // The ID of the message this message is in reply to (only one-level depth,
    // so all reply messages are rooted in the first message to a thread).
    in_reply_to: number | null;
    // The contents of the message (unprocessed).
    message: string;
    // The contents of the message (processed HTML).
    message_html: string;
};

// Options to fetch additional info for messages.
export interface MessageOptions {
    // Fetch the username of the message sender.
    author?: boolean;
    // Fetch the username of the recipient.
    recipient?: boolean;
};

interface MessageRepository {
    /**
     * Creates a new message with the given parameters.
     *
     * @param message - The parameters
     */
    createMessage(params: MessageCreate): Promise<Message>;
    /**
     * Get all the messages for this user.
     *
     * @param user - The user to fetch messages for.
     * @param options - Additional things to fetch.
     */
    getMessageThreadsForUser(user_id: number, options: MessageOptions): Promise<Message[]>;
    /**
     * Get a single message by its ID.
     *
     * @param message_id - The ID of the message.
     * @param options - Additional things to fetch.
     */
    getMessageByID(message_id: number, options: MessageOptions): Promise<Message | null>;
    /**
     * Gets the replies of this thread.
     *
     * @param message_id - The ID of the thread.
     * @param options - Additional things to fetch.
     */
    getRepliesByID(message_id: number, options: MessageOptions): Promise<Message[]>;
};

export default MessageRepository;
