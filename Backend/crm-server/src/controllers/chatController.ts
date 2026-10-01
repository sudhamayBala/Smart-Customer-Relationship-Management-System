import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  createChatMessage,
  getChatMessages,
  getChatMessageByClientId,
} from "../services/chatService";

const create = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const message = await createChatMessage({
    tenantId: req.user!.tenantId,
    propertyId: req.params.propertyId,
    senderId: req.user!.id,
    clientMsgId: req.body.clientMsgId,
    message: req.body.message,
  });

  res.status(201).json({
    success: true,
    data: message,
  });
};

const list = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const messages = await getChatMessages(
    req.user!.tenantId,
    req.params.propertyId
  );

  res.status(200).json({
    success: true,
    data: messages,
  });
};

const getByClientId = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const message = await getChatMessageByClientId(
    req.user!.tenantId,
    req.params.propertyId,
    req.params.clientMsgId
  );

  if (!message) {
    res.status(404).json({
      success: false,
      message: "Chat message not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: message,
  });
};

export {
  create,
  list,
  getByClientId,
};