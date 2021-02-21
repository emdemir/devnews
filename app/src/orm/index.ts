import { Sequelize } from "sequelize";

const sequelize = new Sequelize({
    dialect: "postgres",
    host: process.env.PGHOST,
    username: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
})

// This check will run when the application boots (during the import of the
// container), so it's fine to place this at top level. It will also early exit.
try {
    sequelize.authenticate();
} catch (up) {
    console.error("Unable to connect to the database!");
    throw up; // ha
}

export default sequelize;
