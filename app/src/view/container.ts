import awilix = require("awilix");

import userRepositoryFactory from "../datasource/users";
import storyRepositoryFactory from "../datasource/stories";
import commentRepositoryFactory from "../datasource/comments";
import tagRepositoryFactory from "../datasource/tags";

import authManagerFactory from "../engine/auth";
import userManagerFactory from "../engine/users";
import storyManagerFactory from "../engine/stories";
import commentManagerFactory from "../engine/comments";
import tagManagerFactory from "../engine/tags";

import indexRoutesFactory from "./routes/index";
import authRoutesFactory from "./routes/auth";
import userRoutesFactory from "./routes/user";
import storyRoutesFactory from "./routes/story";


const container = awilix.createContainer();

// Register the repositories
if (!process.env.USE_ORM) {
    container.register("userRepository", awilix.asFunction(userRepositoryFactory));
    container.register("storyRepository", awilix.asFunction(storyRepositoryFactory));
    container.register("commentRepository", awilix.asFunction(commentRepositoryFactory));
    container.register("tagRepository", awilix.asFunction(tagRepositoryFactory));
} else {
    throw new Error("The ORM repository layer has not been implemented yet.");
}

// Register the managers
container.register("authManager", awilix.asFunction(authManagerFactory));
container.register("userManager", awilix.asFunction(userManagerFactory));
container.register("storyManager", awilix.asFunction(storyManagerFactory));
container.register("commentManager", awilix.asFunction(commentManagerFactory));
container.register("tagManager", awilix.asFunction(tagManagerFactory));

// Register routes
container.register("indexRoutes", awilix.asFunction(indexRoutesFactory));
container.register("authRoutes", awilix.asFunction(authRoutesFactory));
container.register("userRoutes", awilix.asFunction(userRoutesFactory));
container.register("storyRoutes", awilix.asFunction(storyRoutesFactory));

export default container;
