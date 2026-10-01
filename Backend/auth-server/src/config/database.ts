import dotenv from "dotenv";
import { Sequelize } from "sequelize";
import mysql from "mysql2/promise";

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME || "propflow",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
};

export const sequelize = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, {
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
