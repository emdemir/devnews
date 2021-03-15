/** @file Parent container for both the API and web presentation layers.
 *
 * API and Web presentation layers use different containers for the routes,
 * however they use the same managers and repositories. We can use the parent
 * container capability that Awilix has to not duplicate this.
 */
import awilix = require("awilix");
import debugFactory = require("debug");

import authManagerFactory from "./engine/auth";
import userManagerFactory from "./engine/users";
import storyManagerFactory from "./engine/stories";
import commentManagerFactory from "./engine/comments";
import tagManagerFactory from "./engine/tags";
import messageManagerFactory from "./engine/messages";

const debug = debugFactory("devnews:container");

debug("loading container");
const container = awilix.createContainer();

// Register the repositories
if (!process.env.USE_ORM) {
    debug("using pg-based repositories");
    container.register("userRepository", awilix.asFunction(require("./datasource/users").default));
    container.register("storyRepository", awilix.asFunction(require("./datasource/stories").default));
    container.register("commentRepository", awilix.asFunction(require("./datasource/comments").default));
    container.register("tagRepository", awilix.asFunction(require("./datasource/tags").default));
    container.register("messageRepository", awilix.asFunction(require("./datasource/messages").default));
} else {
    debug("using Sequelize-based repositories");
    container.register("userRepository", awilix.asFunction(require("./orm/users").default));
    container.register("storyRepository", awilix.asFunction(require("./orm/stories").default));
    container.register("commentRepository", awilix.asFunction(require("./orm/comments").default));
    container.register("tagRepository", awilix.asFunction(require("./orm/tags").default));
    container.register("messageRepository", awilix.asFunction(require("./orm/messages").default));
}

// Register the managers
container.register("authManager", awilix.asFunction(authManagerFactory));
container.register("userManager", awilix.asFunction(userManagerFactory));
container.register("storyManager", awilix.asFunction(storyManagerFactory));
container.register("commentManager", awilix.asFunction(commentManagerFactory));
container.register("tagManager", awilix.asFunction(tagManagerFactory));
container.register("messageManager", awilix.asFunction(messageManagerFactory));

export default container;
