"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDatabaseExists = exports.sequelize = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const sequelize_1 = require("sequelize");
const promise_1 = __importDefault(require("mysql2/promise"));
dotenv_1.default.config();
const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || "propflow",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
};
exports.sequelize = new sequelize_1.Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: "mysql",
    logging: false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
});
const ensureDatabaseExists = async () => {
    try {
        const connection = await promise_1.default.createConnection({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
            database: "mysql",
        });
        await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
        await connection.end();
        return true;
    }
    catch (error) {
        console.warn("Database unavailable; continuing without persistence.", error instanceof Error ? error.message : error);
        return false;
    }
};
exports.ensureDatabaseExists = ensureDatabaseExists;
exports.default = exports.sequelize;
