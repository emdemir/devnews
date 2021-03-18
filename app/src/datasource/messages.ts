import { query } from "./";

import type MessageRepository from "../base/message_repository";
import type {
    Message, MessageCreate, MessageOptions, MessageListOptions
} from "../base/message_repository";

const defaultOptions: MessageOptions = {
    author: false,
    recipient: false
};

export default function({ }): MessageRepository {
    /**
     * Creates a new message with the given parameters.
     *
     * @param message - The parameters
     */
    const createMessage = async (params: MessageCreate): Promise<Message> => {
        const result = await query<Message>(`\
            INSERT INTO messages
                (sender_id, receiver_id, in_reply_to, message, message_html)
            VALUES
                ($1, $2, $3, $4, $5)
            RETURNING *`, [
            params.sender_id,
            params.receiver_id,
            params.in_reply_to,
            params.message,
            params.message_html
        ]);

        return result.rows[0];
    }

    /**
     * Get all the messages for this user.
     *
     * @param user - The user to fetch messages for.
     * @param _options - Optional fetches.
     */
    const getMessageThreadsForUser = async (
        user_id: number,
        _options: MessageListOptions
    ): Promise<Message[]> => {
        const options = Object.assign({}, defaultOptions, _options);

        const result = await query<Message>(`\
            SELECT M.*
                ${options.author ? ", SU.username AS author" : ""}
                ${options.recipient ? ", RU.username AS recipient" : ""}
            FROM messages M
                LEFT OUTER JOIN (
                    SELECT in_reply_to, MAX(sent_at) AS last_reply
                    FROM messages
                    WHERE in_reply_to IS NOT NULL
                    GROUP BY in_reply_to
                ) R ON R.in_reply_to = M.id
                ${options.author ? "INNER JOIN users SU ON SU.id = M.sender_id" : ""}
                ${options.recipient ? "INNER JOIN users RU ON RU.id = M.receiver_id" : ""}
            WHERE
                (M.sender_id = $1 OR M.receiver_id = $1)
                AND M.in_reply_to IS NULL
            ORDER BY COALESCE(R.last_reply, M.sent_at) DESC
            ${options.limit ? `LIMIT ${options.limit}` : ""}
            ${options.offset ? `OFFSET ${options.offset}` : ""}`, [user_id]);

        return result.rows;
    }

    /**
     * Get a single message by its ID.
     *
     * @param message_id - The ID of the message.
     * @param options - Additional things to fetch.
     */
    const getMessageByID = async (
        message_id: number,
        _options: MessageOptions
    ): Promise<Message | null> => {
        const options = Object.assign({}, defaultOptions, _options);

        const result = await query<Message>(`\
            SELECT M.*
                ${options.author ? ", SU.username AS author" : ""}
                ${options.recipient ? ", RU.username AS recipient" : ""}
            FROM messages M
                ${options.author ? "INNER JOIN users SU ON SU.id = M.sender_id" : ""}
                ${options.recipient ? "INNER JOIN users RU ON RU.id = M.receiver_id" : ""}
            WHERE M.id = $1`, [message_id]);

        if (result.rowCount === 0)
            return null;
        return result.rows[0];
    }
    /**
     * Gets the replies of this thread.
     *
     * @param message_id - The ID of the thread.
     * @param options - Additional things to fetch.
     */
    const getRepliesByID = async (
        message_id: number,
        _options: MessageOptions
    ): Promise<Message[]> => {
        const options = Object.assign({}, defaultOptions, _options);

        // TODO: order by latest reply
        const result = await query<Message>(`\
            SELECT M.*
                ${options.author ? ", SU.username AS author" : ""}
                ${options.recipient ? ", RU.username AS recipient" : ""}
            FROM messages M
                ${options.author ? "INNER JOIN users SU ON SU.id = M.sender_id" : ""}
                ${options.recipient ? "INNER JOIN users RU ON RU.id = M.receiver_id" : ""}
            WHERE
                M.in_reply_to = $1
            ORDER BY M.sent_at ASC`, [message_id]);

        return result.rows;
    }

    return {
        createMessage,
        getMessageThreadsForUser,
        getMessageByID,
        getRepliesByID
    }
}
