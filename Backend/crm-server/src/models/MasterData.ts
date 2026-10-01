import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import sequelize from "../config/database";

class MasterData extends Model<
  InferAttributes<MasterData>,
  InferCreationAttributes<MasterData>
> {
  declare id: CreationOptional<string>;
  declare tenantId: string;
  declare type: string;
  declare value: string;
  declare label: string;
  declare sortOrder: number;
  declare isActive: boolean;
  declare isTerminal: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

MasterData.init(
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
    type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    value: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "sort_order",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    isTerminal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_terminal",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
    },
  },
  {
    sequelize,
    tableName: "master_data",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["tenant_id", "type"],
      },
      {
        unique: true,
        fields: ["tenant_id", "type", "value"],
      },
    ],
  }
);

export default MasterData;