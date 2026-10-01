import { Sequelize } from "sequelize";
import dotenv = require("dotenv");
import mysql from "mysql2/promise";

dotenv.config();

const requiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const port = Number(process.env.MYSQL_PORT ?? 3306);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("MYSQL_PORT must be an integer between 1 and 65535");
}

const dbConfig = {
  host: process.env.MYSQL_HOST ?? "localhost",
  port,
  database: requiredEnv("MYSQL_DATABASE"),
  user: requiredEnv("MYSQL_USER"),
  password: requiredEnv("MYSQL_PASSWORD"),
};

const sequelize = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: "mysql",
  logging: false,
});

export const ensureDatabaseExists = async (): Promise<boolean> => {
  try {
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: "mysql",
    });

    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    await connection.end();
    return true;
  } catch (error) {
    console.warn(
      "Database unavailable; continuing without persistence.",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
};

export default sequelize;