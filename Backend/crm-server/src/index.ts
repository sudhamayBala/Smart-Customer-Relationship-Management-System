import http from "http";
import app from "./app";
import { env } from "./config/env";
import sequelize, { ensureDatabaseExists } from "./config/database";
import ensurePropertySchema from "./config/propertySchema";
import redis from "./config/redis";
import setupSocket from "./sockets/socket";
import startJobs from "./jobs/scheduledJobs";

const startServer = async () => {
  try {
    const databaseReady = await ensureDatabaseExists();

    if (databaseReady) {
      await sequelize.authenticate();
      console.log("MySQL database connected successfully");
      await sequelize.sync();
      await ensurePropertySchema();
      console.log("Database tables synchronized");
    } else {
      console.warn("MySQL database is unavailable; server will continue in demo mode.");
    }

    await redis.ping();

    const httpServer = http.createServer(app);

    const io = setupSocket(httpServer);

    startJobs(io);

    httpServer.listen(env.port, () => {
      console.log(`CRM API running on port ${env.port}`);
    });
  } catch (error) {
    console.error("CRM API startup failed:", error);
    process.exit(1);
  }
};

startServer();