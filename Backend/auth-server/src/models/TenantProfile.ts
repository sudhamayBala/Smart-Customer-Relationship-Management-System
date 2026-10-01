import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import sequelize from "../config/database";

class TenantProfile extends Model<
  InferAttributes<TenantProfile>,
  InferCreationAttributes<TenantProfile>
> {
  declare tenantId: number;
  declare crmTenantId: string | null;
  declare slug: string;
  declare status: "ACTIVE" | "SUSPENDED";
  declare isPlatform: boolean;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

TenantProfile.init(
  {
    tenantId: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      field: "tenantId",
      references: { model: "tenants", key: "id" },
      onDelete: "CASCADE",
    },
    crmTenantId: {
      type: DataTypes.UUID,
      allowNull: true,
      unique: true,
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "SUSPENDED"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    isPlatform: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "tenant_profiles",
    timestamps: true,
  }
);

export default TenantProfile;