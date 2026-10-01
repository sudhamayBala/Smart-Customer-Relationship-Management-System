import {
	CreationOptional,
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	Model,
} from "sequelize";
import sequelize from "../config/database";

class SiteVisit extends Model<
	InferAttributes<SiteVisit>,
	InferCreationAttributes<SiteVisit>
> {
	declare id: CreationOptional<string>;
	declare tenantId: string;
	declare propertyId: string;
	declare agentId: string;
	declare clientName: string;
	declare clientPhone: string | null;
	declare scheduledAt: Date;
	declare status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
	declare notes: string | null;
	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;
}

SiteVisit.init(
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
		agentId: {
			type: DataTypes.UUID,
			allowNull: false,
			field: "agent_id",
		},
		clientName: {
			type: DataTypes.STRING(150),
			allowNull: false,
			field: "client_name",
		},
		clientPhone: {
			type: DataTypes.STRING(30),
			allowNull: true,
			field: "client_phone",
		},
		scheduledAt: {
			type: DataTypes.DATE,
			allowNull: false,
			field: "scheduled_at",
		},
		status: {
			type: DataTypes.ENUM("SCHEDULED", "COMPLETED", "CANCELLED"),
			allowNull: false,
			defaultValue: "SCHEDULED",
		},
		notes: {
			type: DataTypes.TEXT,
			allowNull: true,
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
		tableName: "site_visits",
		timestamps: true,
		underscored: true,
		indexes: [
			{
				fields: ["tenant_id", "property_id"],
			},
			{
				fields: ["tenant_id", "agent_id"],
			},
			{
				fields: ["scheduled_at"],
			},
		],
	}
);

export default SiteVisit;
