import validUrl = require("valid-url");

import { buildGravatarURL } from "./utils";
import ValidationError from "../base/validation";
import { hashPassword } from "./auth";

import type UserRepository from "../base/user_repository";
import type { User } from "../base/user_repository";
import type UserManager from "../base/user_manager";

// Regexp for e-mail validation.
const EMAIL_REGEX = /\S+@\S+\.\S+/;

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
        if (!validUrl.isWebUri(homepage)) {
            errors.push("Invalid homepage URL.");
        }
    }
};

interface Dependencies {
    userRepository: UserRepository;
};

export default function({ userRepository: dataSource }: Dependencies): UserManager {
    const createUser = async (
        username: string,
        password: string,
        email: string
    ): Promise<User> => {
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

    /**
     * Returns a user by username if it exists, or null if it doesn't.
     *
     * @param username - The username for this user.
     */
    const getUserByUsername = (username: string) =>
        dataSource.getUserByUsername(username);
    /**
     * Returns a user by ID if it exists, or null if it doesn't.
     *
     * @param id - The ID for this user.
     */
    const getUserByID = (id: number) =>
        dataSource.getUserByID(id);

    return {
        createUser,
        getUserByID,
        getUserByUsername
    }
}
