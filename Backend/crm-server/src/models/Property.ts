import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import sequelize from "../config/database";

class Property extends Model<
  InferAttributes<Property>,
  InferCreationAttributes<Property>
> {
  declare id: CreationOptional<string>;
  declare tenantId: string;
  declare title: string;
  declare type: CreationOptional<string>;
  declare listingType: "SALE" | "RENT";
  declare locality: string | null;
  declare city: string | null;
  declare address: string | null;
  declare bhk: number | null;
  declare area: number | null;
  declare floor: number | null;
  declare totalFloors: number | null;
  declare furnishing: string | null;
  declare facing: string | null;
  declare price: number;
  declare listedPrice: CreationOptional<number | null>;
  declare status: CreationOptional<string>;
  declare amenities: string[] | null;
  declare buildingName: string;
  declare unitNo: string;
  declare ownerName: string | null;
  declare ownerPhone: string | null;
  declare assigneeId: string | null;
  declare version: CreationOptional<number>;
  declare deletedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Property.init(
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
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: "Apartment",
    },
    listingType: {
      type: DataTypes.ENUM("SALE", "RENT"),
      allowNull: false,
      field: "listing_type",
    },
    locality: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    bhk: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    area: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    floor: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    totalFloors: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    furnishing: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    facing: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    listedPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      field: "listed_price",
    },
    status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "Listed",
    },
    amenities: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    buildingName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "building_name",
    },
    unitNo: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "unit_no",
    },
    ownerName: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "owner_name",
    },
    ownerPhone: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: "owner_phone",
    },
    assigneeId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "assignee_id",
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
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
    tableName: "properties",
    timestamps: true,
    paranoid: true,
    deletedAt: "deletedAt",
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["tenant_id", "building_name", "unit_no"],
      },
      {
        fields: ["tenant_id"],
      },
      {
        fields: ["assignee_id"],
      },
    ],
  }
);

export default Property;