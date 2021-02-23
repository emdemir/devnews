import awilix = require("awilix");
import parentContainer from "../container";

import indexRoutesFactory from "./routes/index";

const container = awilix.createContainer({}, parentContainer);

// Register routes
container.register("indexRoutes", awilix.asFunction(indexRoutesFactory));

export default container;
