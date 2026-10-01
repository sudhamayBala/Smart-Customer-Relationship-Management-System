"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class SecurityEvent extends sequelize_1.Model {
}
SecurityEvent.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    actorId: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    action: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
    },
    resourceType: {
        type: sequelize_1.DataTypes.STRING(60),
        allowNull: false,
    },
    resourceId: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true,
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
}, {
    sequelize: database_1.default,
    tableName: "security_events",
    timestamps: false,
    indexes: [{ fields: ["createdAt"] }],
});
exports.default = SecurityEvent;
