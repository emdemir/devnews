import awilix = require("awilix");
import parentContainer from "../container";

import indexRoutesFactory from "./routes/index";
import storyRoutesFactory from "./routes/story";
import commentRoutesFactory from "./routes/comment";
import authRoutesFactory from "./routes/auth";
import messageRoutesFactory from "./routes/message";
import tagRoutesFactory from "./routes/tag";
import userRoutesFactory from "./routes/user";

const container = awilix.createContainer({}, parentContainer);

// Register routes
container.register("indexRoutes", awilix.asFunction(indexRoutesFactory));
container.register("storyRoutes", awilix.asFunction(storyRoutesFactory));
container.register("commentRoutes", awilix.asFunction(commentRoutesFactory));
container.register("authRoutes", awilix.asFunction(authRoutesFactory));
container.register("messageRoutes", awilix.asFunction(messageRoutesFactory));
container.register("tagRoutes", awilix.asFunction(tagRoutesFactory));
container.register("userRoutes", awilix.asFunction(userRoutesFactory));

export default container;
