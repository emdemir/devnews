import * as dataSource from "../datasource/users";
export type { User } from "../datasource/users";

import { buildGravatarURL } from "./utils";
import ValidationError from "./validation";
import { hashPassword } from "./auth";

// Regexp for e-mail validation.
const EMAIL_REGEX = /\S+@\S+\.\S+/;
// Regexp for homepage URL validation.
const HOMEPAGE_REGEX = /[-\w\d]+\.[\w\d]+(?:\/[\w\d-\.])*\/?/;

// The validators for the user model.
const validators = {
    username: (errors: string[], username: string) => {
        if (username.length > 32) {
            errors.push("Username cannot be longer than 32 characters.");
        }
    },
    password: (errors: string[], password: string) => {
        if (password.length < 8) {
            errors.push("Password must be at least 8 characters.");
        }
    },
    email: (errors: string[], email: string) => {
        if (!EMAIL_REGEX.test(email)) {
            errors.push("That doesn't look like a valid e-mail address.");
        }
    },
    homepage: (errors: string[], homepage: string) => {
        if (!HOMEPAGE_REGEX.test(homepage)) {
            errors.push("Invalid homepage URL");
        }
    }
};

export const createUser = async (
    username: string,
    password: string,
    email: string
): Promise<dataSource.User> => {
    const avatarImage = buildGravatarURL(email);

    const errors: string[] = [];
    validators.username(errors, username);
    validators.password(errors, password);
    validators.email(errors, email);

    if (errors.length) {
        throw new ValidationError(errors);
    }

    try {
        const hashedPassword = await hashPassword(password);
        const user = await dataSource.createUser(
            username, hashedPassword, email, avatarImage);
        return user;
    } catch (err) {
        if (!(err instanceof Error))
            throw err;

        if (err.message.includes("username")) {
            // Username already exists.
            throw new ValidationError(["This username is taken."]);
        } else {
            // Another error we're not aware of.
            console.error(err);
            throw new Error("An unknown error occurred. Please try again later.");
        }
    }
}
