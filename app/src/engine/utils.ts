import md5 = require("md5");
import crypto = require("crypto");

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
    return `https://www.gravatar.com/avatar/${createGravatarHash(email)}`;
}

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
