import * as http from "http";
import app from "../app";
import { env } from "../config/env";
import { sequelize } from "../models";
import redis from "../config/redis";
import setupSocket from "../sockets/socket";
import startJobs from "./scheduledJobs";

const startServer = async () => {
  try {
    await sequelize.authenticate();
    await redis.ping();

    const httpServer = http.createServer(app);

    const io = setupSocket(httpServer);

    startJobs(io);

    httpServer.listen(env.port, () => {
      console.log(
        `CRM API running on port ${env.port}`
      );
    });
  } catch (error) {
    console.error(
      "CRM API startup failed:",
      error
    );

    process.exit(1);
  }
};

startServer();