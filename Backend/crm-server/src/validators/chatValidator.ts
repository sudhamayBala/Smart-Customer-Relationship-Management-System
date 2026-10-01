import { z } from "zod";

const createChatMessageSchema = z.object({
  propertyId: z.string().min(1),
  clientMsgId: z.string().min(1).max(255),
  message: z.string().min(1).max(5000),
});

export {
  createChatMessageSchema,
};