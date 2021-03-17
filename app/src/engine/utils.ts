import md5 = require("md5");
import crypto = require("crypto");
import { JSDOM } from "jsdom";
import createDOMPurify = require("dompurify");
import marked = require("marked");

// --- Gravatar ---

/**
 * Creates the Gravatar hash for this user.
 * http://en.gravatar.com/site/implement/hash/
 */
const createGravatarHash = (email: string): string => {
    return md5(email.trim().toLowerCase());
}

/**
 * Queries Gravatar for this user's profile image based on their e-mail.
 *
 * @param email - The e-mail address of the user
 */
export const buildGravatarURL = (email: string): string => {
    return `https://www.gravatar.com/avatar/${createGravatarHash(email)}?d=identicon`;
}

// --- Random short URLs ---

/**
 * Generates a random ID using cryptographically random bytes.
 *
 * @param length - Length in bytes
 */
export const generateShortID = (length: number): string => {
    let output = "";

    while (output.length < length) {
        const byte = crypto.randomBytes(1).toString();

        // Check if the byte we got is alphanumeric.
        if ((byte >= '0' && byte <= '9') || (byte >= 'A' && byte <= 'Z') ||
            (byte >= 'a' && byte <= 'z')) {
            output += byte;
        }
    }

    return output;
}

// --- Markdown related functionality ---

// The DOMPurify instance for generating markdown.
const window = new JSDOM("").window;
const domPurify = createDOMPurify(window as unknown as Window);

/**
 * Renders the given content using markdown. It is also sanitized using DOMPurify.
 *
 * @param content - The content to markdown.
 */
export const markdown = (content: string) => {
    return marked(
        domPurify.sanitize(
            content.replace(/</g, "&lt;"),
            {
                ALLOWED_TAGS: []
            }
        )
    );
}
