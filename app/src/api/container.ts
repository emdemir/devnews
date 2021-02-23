import awilix = require("awilix");
import parentContainer from "../container";

import indexRoutesFactory from "./routes/index";
import storyRoutesFactory from "./routes/story";
import commentRoutesFactory from "./routes/comment";

const container = awilix.createContainer({}, parentContainer);

// Register routes
container.register("indexRoutes", awilix.asFunction(indexRoutesFactory));
container.register("storyRoutes", awilix.asFunction(storyRoutesFactory));
container.register("commentRoutes", awilix.asFunction(commentRoutesFactory));

export default container;
