import ChatMessage from "../src/models/ChatMessage";
import {
  createChatMessage
} from "../src/services/chatService";

jest.mock("../src/models/ChatMessage", () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

describe("Chat Idempotency", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return the existing message for the same client message id", async () => {
    const existingMessage = {
      id: "message-1",
      tenantId: "tenant-1",
      propertyId: "property-1",
      senderId: "user-1",
      clientMsgId: "client-message-1",
      message: "Hello"
    };

    (ChatMessage.findOne as jest.Mock).mockResolvedValue(
      existingMessage
    );

    const result = await createChatMessage({
      tenantId: "tenant-1",
      propertyId: "property-1",
      senderId: "user-1",
      clientMsgId: "client-message-1",
      message: "Hello"
    });

    expect(ChatMessage.create).not.toHaveBeenCalled();
    expect(result).toEqual(existingMessage);
  });

  it("should create a new message when the client message id is new", async () => {
    const createdMessage = {
      id: "message-1",
      tenantId: "tenant-1",
      propertyId: "property-1",
      senderId: "user-1",
      clientMsgId: "client-message-1",
      message: "Hello"
    };

    (ChatMessage.findOne as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createdMessage);

    (ChatMessage.create as jest.Mock).mockResolvedValue(
      createdMessage
    );

    const result = await createChatMessage({
      tenantId: "tenant-1",
      propertyId: "property-1",
      senderId: "user-1",
      clientMsgId: "client-message-1",
      message: "Hello"
    });

    expect(ChatMessage.create).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      propertyId: "property-1",
      senderId: "user-1",
      clientMsgId: "client-message-1",
      message: "Hello"
    });

    expect(result).toEqual(createdMessage);
  });

  it("should return the existing message when a concurrent insert hits a unique constraint", async () => {
    const existingMessage = {
      id: "message-1",
      tenantId: "tenant-1",
      propertyId: "property-1",
      senderId: "user-1",
      clientMsgId: "client-message-1",
      message: "Hello"
    };

    (ChatMessage.findOne as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingMessage);

    (ChatMessage.create as jest.Mock).mockRejectedValue({
      name: "SequelizeUniqueConstraintError"
    });

    const result = await createChatMessage({
      tenantId: "tenant-1",
      propertyId: "property-1",
      senderId: "user-1",
      clientMsgId: "client-message-1",
      message: "Hello"
    });

    expect(result).toEqual(existingMessage);
  });
});