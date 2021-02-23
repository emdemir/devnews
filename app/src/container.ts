/** @file Parent container for both the API and web presentation layers.
 *
 * API and Web presentation layers use different containers for the routes,
 * however they use the same managers and repositories. We can use the parent
 * container capability that Awilix has to not duplicate this.
 */
import awilix = require("awilix");

import userRepositoryFactory from "./datasource/users";
import storyRepositoryFactory from "./datasource/stories";
import commentRepositoryFactory from "./datasource/comments";
import tagRepositoryFactory from "./datasource/tags";
import messageRepositoryFactory from "./datasource/messages";

import ormUserRepositoryFactory from "./orm/users";
import ormStoryRepositoryFactory from "./orm/stories";
import ormCommentRepositoryFactory from "./orm/comments";
import ormTagRepositoryFactory from "./orm/tags";
import ormMessageRepositoryFactory from "./orm/messages";

import authManagerFactory from "./engine/auth";
import userManagerFactory from "./engine/users";
import storyManagerFactory from "./engine/stories";
import commentManagerFactory from "./engine/comments";
import tagManagerFactory from "./engine/tags";
import messageManagerFactory from "./engine/messages";

const container = awilix.createContainer();

// Register the repositories
if (!process.env.USE_ORM) {
    container.register("userRepository", awilix.asFunction(userRepositoryFactory));
    container.register("storyRepository", awilix.asFunction(storyRepositoryFactory));
    container.register("commentRepository", awilix.asFunction(commentRepositoryFactory));
    container.register("tagRepository", awilix.asFunction(tagRepositoryFactory));
    container.register("messageRepository", awilix.asFunction(messageRepositoryFactory));
} else {
    container.register("userRepository", awilix.asFunction(ormUserRepositoryFactory));
    container.register("storyRepository", awilix.asFunction(ormStoryRepositoryFactory));
    container.register("commentRepository", awilix.asFunction(ormCommentRepositoryFactory));
    container.register("tagRepository", awilix.asFunction(ormTagRepositoryFactory));
    container.register("messageRepository", awilix.asFunction(ormMessageRepositoryFactory));
}

// Register the managers
container.register("authManager", awilix.asFunction(authManagerFactory));
container.register("userManager", awilix.asFunction(userManagerFactory));
container.register("storyManager", awilix.asFunction(storyManagerFactory));
container.register("commentManager", awilix.asFunction(commentManagerFactory));
container.register("tagManager", awilix.asFunction(tagManagerFactory));
container.register("messageManager", awilix.asFunction(messageManagerFactory));

export default container;
