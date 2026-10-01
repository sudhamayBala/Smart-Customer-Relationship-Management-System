import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { env } from "../config/env";
import redis, { isMemoryRedis } from "../config/redis";
import socketAuth from "./socketAuth";
import registerChatSocket from "./chatSocket";

const setupSocket = (
  httpServer: ConstructorParameters<typeof Server>[0]
) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  if (!isMemoryRedis) {
    const pubClient = new Redis({
      host: env.redisHost,
      port: env.redisPort,
    });

    const subClient = pubClient.duplicate();

    io.adapter(
      createAdapter(
        pubClient,
        subClient
      )
    );
  }

  io.use(socketAuth);

  io.on("connection", (socket) => {
    const user = socket.data.user;
    if (user) {
      socket.join(`tenant:${user.tenantId}:user:${user.id}`);
    }
    registerChatSocket(io, socket);
  });

  return io;
};

export default setupSocket;