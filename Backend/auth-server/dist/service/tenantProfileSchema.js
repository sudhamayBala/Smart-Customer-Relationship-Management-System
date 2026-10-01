"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureTenantProfileSchema = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const ensureTenantProfileSchema = async () => {
    const queryInterface = database_1.default.getQueryInterface();
    const columns = await queryInterface.describeTable("tenant_profiles");
    if (!columns.crmTenantId) {
        await queryInterface.addColumn("tenant_profiles", "crmTenantId", {
            type: sequelize_1.DataTypes.UUID,
            allowNull: true,
            unique: true,
        });
    }
    if (!columns.isPlatform) {
        await queryInterface.addColumn("tenant_profiles", "isPlatform", {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        });
    }
    const userColumns = await queryInterface.describeTable("users");
    if (!userColumns.status) {
        await queryInterface.addColumn("users", "status", {
            type: sequelize_1.DataTypes.ENUM("ACTIVE", "DEACTIVATED"),
            allowNull: false,
            defaultValue: "ACTIVE",
        });
    }
    if (!userColumns.lastLoginAt) {
        await queryInterface.addColumn("users", "lastLoginAt", {
            type: sequelize_1.DataTypes.DATE,
            allowNull: true,
        });
    }
};
exports.ensureTenantProfileSchema = ensureTenantProfileSchema;
