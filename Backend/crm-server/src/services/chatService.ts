import ChatMessage from "../models/ChatMessage";
import { Op } from "sequelize";
import User from "../models/User";

interface CreateChatMessageData {
  tenantId: string;
  propertyId: string;
  senderId: string;
  clientMsgId: string;
  message: string;
}

const createChatMessage = async (
  data: CreateChatMessageData
) => {
  const existingMessage = await ChatMessage.findOne({
    where: {
      propertyId: data.propertyId,
      clientMsgId: data.clientMsgId,
    },
  });

  if (existingMessage) {
    return existingMessage;
  }

  try {
    return await ChatMessage.create(data);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "SequelizeUniqueConstraintError"
    ) {
      const duplicateMessage = await ChatMessage.findOne({
        where: {
          propertyId: data.propertyId,
          clientMsgId: data.clientMsgId,
        },
      });

      if (duplicateMessage) {
        return duplicateMessage;
      }
    }

    throw error;
  }
};

const getChatMessages = async (
  tenantId: string,
  propertyId: string
) => {
  const messages = await ChatMessage.findAll({
    where: {
      tenantId,
      propertyId,
    },
    order: [["createdAt", "ASC"]],
  });
  const senderIds = [...new Set(messages.map((message) => message.senderId))];
  const users = senderIds.length
    ? await User.findAll({
        where: { tenantId, id: { [Op.in]: senderIds } },
        attributes: ["id", "name"],
      })
    : [];
  const namesById = new Map(users.map((user) => [user.id, user.name]));

  return messages.map((message) => ({
    ...message.toJSON(),
    senderName: namesById.get(message.senderId) || "Team member",
  }));
};

const getChatMessageByClientId = async (
  tenantId: string,
  propertyId: string,
  clientMsgId: string
) => {
  return ChatMessage.findOne({
    where: {
      tenantId,
      propertyId,
      clientMsgId,
    },
  });
};

export {
  createChatMessage,
  getChatMessages,
  getChatMessageByClientId,
};