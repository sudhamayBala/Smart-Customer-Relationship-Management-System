import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import sequelize from "../config/database";

class SecurityEvent extends Model<
  InferAttributes<SecurityEvent>,
  InferCreationAttributes<SecurityEvent>
> {
  declare id: CreationOptional<number>;
  declare actorId: number;
  declare action: string;
  declare resourceType: string;
  declare resourceId: string | null;
  declare createdAt: CreationOptional<Date>;
}

SecurityEvent.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    actorId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    resourceType: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    resourceId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "security_events",
    timestamps: false,
    indexes: [{ fields: ["createdAt"] }],
  }
);

export default SecurityEvent;