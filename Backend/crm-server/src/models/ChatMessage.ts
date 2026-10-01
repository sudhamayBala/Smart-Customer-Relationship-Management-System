import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import sequelize from "../config/database";

class ChatMessage extends Model<
  InferAttributes<ChatMessage>,
  InferCreationAttributes<ChatMessage>
> {
  declare id: CreationOptional<string>;
  declare tenantId: string;
  declare propertyId: string;
  declare senderId: string;
  declare clientMsgId: string;
  declare message: string;
  declare createdAt: CreationOptional<Date>;
}

ChatMessage.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "tenant_id",
    },
    propertyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "property_id",
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "sender_id",
    },
    clientMsgId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "client_msg_id",
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
  },
  {
    sequelize,
    tableName: "chat_messages",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["property_id", "client_msg_id"],
      },
      {
        fields: ["tenant_id", "property_id"],
      },
      {
        fields: ["sender_id"],
      },
    ],
  }
);

export default ChatMessage;