import { Server, Socket } from "socket.io";
import Property from "../models/Property";
import {
  createChatMessage,
  getChatMessages,
} from "../services/chatService";

const registerChatSocket = (
  io: Server,
  socket: Socket
) => {
  const roomFor = (propertyId: string, tenantId: string) =>
    `tenant:${tenantId}:property:${propertyId}`;

  const canAccessProperty = async (propertyId: string, user: Socket["data"]["user"]) => {
    if (!user) return false;
    const where: Record<string, string> = {
      id: propertyId,
      tenantId: user.tenantId,
    };
    if (user.role === "AGENT") where.assigneeId = user.id;
    return Boolean(await Property.findOne({ where }));
  };

  const broadcastPresence = async (room: string) => {
    const viewers = await io.in(room).fetchSockets();
    io.to(room).emit("chat:presence", { viewers: viewers.length });
  };

  socket.on(
    "chat:join",
    async (propertyId: string) => {
      const user = socket.data.user;

      if (!user || typeof propertyId !== "string" || !(await canAccessProperty(propertyId, user))) {
        socket.emit("chat:error", { message: "Property not found or access denied" });
        return;
      }

      const room = roomFor(propertyId, user.tenantId);

      socket.join(room);

      const messages = await getChatMessages(
        user.tenantId,
        propertyId
      );

      socket.emit("chat:history", messages);
  await broadcastPresence(room);
    }
  );

  socket.on(
    "chat:leave",
    async (propertyId: string) => {
      const user = socket.data.user;

      if (!user) {
        return;
      }

      const room = roomFor(propertyId, user.tenantId);

      socket.leave(room);
      await broadcastPresence(room);
    }
  );

  socket.on("chat:typing", async (payload: { propertyId: string; isTyping: boolean }) => {
    const user = socket.data.user;
    if (!user || !payload?.propertyId) return;
    const room = roomFor(payload.propertyId, user.tenantId);
    if (!socket.rooms.has(room)) return;

    socket.to(room).emit("chat:typing", {
      userId: user.id,
      userName: user.name || user.email || "A teammate",
      isTyping: Boolean(payload.isTyping),
    });
  });

  socket.on(
    "chat:message",
    async (payload: {
      propertyId: string;
      clientMsgId: string;
      message: string;
    }) => {
      const user = socket.data.user;

      if (!user) {
        return;
      }

      if (
        !payload?.propertyId ||
        !payload?.clientMsgId ||
        !payload?.message
      ) {
        socket.emit("chat:error", {
          message: "Invalid chat message",
          clientMsgId: payload?.clientMsgId,
        });

        return;
      }

      if (!socket.rooms.has(roomFor(payload.propertyId, user.tenantId)) ||
          !(await canAccessProperty(payload.propertyId, user))) {
        socket.emit("chat:error", {
          message: "Property not found or access denied",
          clientMsgId: payload.clientMsgId,
        });
        return;
      }

      try {
        const chatMessage = await createChatMessage({
          tenantId: user.tenantId,
          propertyId: payload.propertyId,
          senderId: user.id,
          clientMsgId: payload.clientMsgId,
          message: payload.message.trim(),
        });

        const room = roomFor(payload.propertyId, user.tenantId);
        io.to(room).emit("chat:message", {
          ...chatMessage.toJSON(),
          senderName: user.name || user.email || "Team member",
        });
      } catch {
        socket.emit("chat:error", {
          message: "Message could not be sent",
          clientMsgId: payload.clientMsgId,
        });
      }
    }
  );

  socket.on("disconnect", async () => {
    const user = socket.data.user;
    if (!user) return;
    for (const room of socket.rooms) {
      if (room.startsWith(`tenant:${user.tenantId}:property:`)) {
        await broadcastPresence(room);
      }
    }
  });
};

export default registerChatSocket;