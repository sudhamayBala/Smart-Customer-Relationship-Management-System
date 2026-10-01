import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import sequelize from "../config/database";

class PropertyActivity extends Model<
  InferAttributes<PropertyActivity>,
  InferCreationAttributes<PropertyActivity>
> {
  declare id: CreationOptional<string>;
  declare tenantId: string;
  declare propertyId: string;
  declare userId: string | null;
  declare action: string;
  declare details: string | null;
  declare createdAt: CreationOptional<Date>;
}

PropertyActivity.init(
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
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "user_id",
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
  },
  {
    sequelize,
    tableName: "property_activities",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        fields: ["tenant_id", "property_id"],
      },
      {
        fields: ["user_id"],
      },
    ],
  }
);

export default PropertyActivity;