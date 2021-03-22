import validUrl = require("valid-url");

import { buildGravatarURL, markdown } from "./utils";
import { hashPassword, isPasswordValid } from "./auth";

import type UserRepository from "base/user_repository";
import type {
    User, UserOptions, UserUpdate as RepoUserUpdate
} from "base/user_repository";
import type UserManager from "base/user_manager";
import type { UserUpdate } from "base/user_manager";
import { ForbiddenError, NotFoundError, ValidationError } from "base/exceptions";

// Regexp for e-mail validation.
const EMAIL_REGEX = /\S+@\S+\.\S+/;
// Maximum length for the about box.
const ABOUT_MAX_CHARS = 4096;

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
        if (homepage && !validUrl.isWebUri(homepage)) {
            errors.push("Invalid homepage URL.");
        }
    },
    about: (errors: string[], about: string) => {
        if (about.length > ABOUT_MAX_CHARS) {
            errors.push(`\
You have exceeded the maximum about text limit. Please shorten it to at most \
${ABOUT_MAX_CHARS} characters.`);
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
     * @param options - What to fetch.
     */
    const getUserByUsername = (username: string, options: UserOptions) =>
        dataSource.getUserByUsername(username, options);
    /**
     * Returns a user by ID if it exists, or null if it doesn't.
     *
     * @param id - The ID for this user.
     * @param options - What to fetch.
     */
    const getUserByID = (id: number, options: UserOptions) =>
        dataSource.getUserByID(id, options);

    /**
     * Update a user's details.
     *
     * @param user - The user who is performing the update.
     * @param username - The username of the user whose details are being updated.
     * @param params - The details.
     */
    const updateUser = async (
        user: User,
        username: string,
        params: UserUpdate
    ): Promise<void> => {
        // Find the user
        const subject = await getUserByUsername(username, {});
        if (subject === null)
            throw new NotFoundError();

        // Check permissions.
        if (!user.is_admin && subject.id !== user.id) {
            throw new ForbiddenError();
        }

        // Validate the passed parameters
        const errors: string[] = [];

        validators.email(errors, params.email);
        validators.homepage(errors, params.homepage);
        validators.about(errors, params.about);

        if (errors.length)
            throw new ValidationError(errors);

        // All good, update the user details.

        // Fetch new Gravatar for the user based on their email
        const avatarImage = buildGravatarURL(params.email);

        // Format the about text with Markdown
        const aboutHTML = markdown(params.about);

        await dataSource.updateUser(username, {
            avatar_image: avatarImage,
            email: params.email,
            homepage: params.homepage,
            about: params.about,
            about_html: aboutHTML
        });
    }

    /**
     * Change a user's password.
     *
     * @param user - The user who is performing the password change.
     * @param username - The username of the user whose password is being changed.
     * @param currentPassword - The current password of the user.
     * @param newPassword - The new password of the user.
     */
    const changePassword = async (
        user: User,
        username: string,
        currentPassword: string,
        newPassword: string
    ): Promise<void> => {
        // Get the subject
        const subject = await getUserByUsername(username, {});
        if (subject === null)
            throw new NotFoundError();

        // Check permissions
        if (!user.is_admin && subject.id !== user.id)
            throw new ForbiddenError();

        const errors: string[] = [];

        // Perform validation
        if (!await isPasswordValid(subject.password, currentPassword)) {
            errors.push("The current password isn't correct.");
        }
        validators.password(errors, newPassword);

        if (errors.length)
            throw new ValidationError(errors);

        // All good, update the password
        await dataSource.updatePassword(username, await hashPassword(newPassword));
    }

    /**
     * Delete a user.
     *
     * @param user - The user who wishes to delete this user.
     * @param username - The username of the user to be deleted.
     */
    const deleteUser = async (user: User, username: string): Promise<void> => {
        // Check whether the user is an admin
        if (!user.is_admin)
            throw new ForbiddenError();

        // All good, delete the user. Related objects will cascade.
        await dataSource.deleteUser(username);
    }

    return {
        createUser,
        getUserByID,
        getUserByUsername,
        updateUser,
        changePassword,
        deleteUser
    }
}
