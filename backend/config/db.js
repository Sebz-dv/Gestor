// db.js
require("dotenv").config();
const mysql = require("mysql2/promise");

const connectDB = async () => {
  const dbName = process.env.DB_NAME || "task";

  try {
    // Config sin 'database' para poder crearla si no existe
    const baseConfig = {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASS || "",
      timezone: process.env.DB_TIMEZONE || "Z",
    };

    // 1) Asegura la DB
    const conn = await mysql.createConnection(baseConfig);
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.end();

    // 2) Pool apuntando a la DB
    const pool = await mysql.createPool({
      ...baseConfig,
      database: dbName,
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_CONN_LIMIT) || 10,
      queueLimit: 0,
      dateStrings: true,
    });

    // Smoke test
    await pool.query("SELECT 1");
    console.log(`MySQL connected (db: ${dbName})`);
    return pool;
  } catch (err) {
    console.error("Error connecting to MySQL", err);
    process.exit(1);
  }
};

module.exports = connectDB;
