import awilix = require("awilix");
import parentContainer from "../container";

import indexRoutesFactory from "./routes/index";
import authRoutesFactory from "./routes/auth";
import userRoutesFactory from "./routes/user";
import storyRoutesFactory from "./routes/story";
import messageRoutesFactory from "./routes/message";
import commentRoutesFactory from "./routes/comment";

const container = awilix.createContainer({}, parentContainer);

// Register routes
container.register("indexRoutes", awilix.asFunction(indexRoutesFactory));
container.register("authRoutes", awilix.asFunction(authRoutesFactory));
container.register("userRoutes", awilix.asFunction(userRoutesFactory));
container.register("storyRoutes", awilix.asFunction(storyRoutesFactory));
container.register("messageRoutes", awilix.asFunction(messageRoutesFactory));
container.register("commentRoutes", awilix.asFunction(commentRoutesFactory));

export default container;
