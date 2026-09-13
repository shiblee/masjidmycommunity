import { Sequelize } from "sequelize";

export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "mysql",
    logging: false,
    // Sequelize v6 defaults to max:5 when this is left unset -- adequate at
    // today's traffic, a real ceiling under real concurrent load (see the
    // Community Wall Performance & Scalability audit). A modest bump, not
    // an aggressive one: MySQL runs on this same small box, so far more
    // connections would trade a request-queueing bottleneck for a
    // CPU-contention one instead of actually fixing anything.
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("MySQL connected");
    await sequelize.sync({ alter: true });
  } catch (error) {
    console.error(`MySQL connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
