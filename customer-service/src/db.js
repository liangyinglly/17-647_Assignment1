const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "customers_db",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
  queueLimit: 0
});

async function initSchema() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      userId VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(64) NOT NULL,
      address VARCHAR(255) NOT NULL,
      address2 VARCHAR(255),
      city VARCHAR(128) NOT NULL,
      state CHAR(2) NOT NULL,
      zipcode VARCHAR(20) NOT NULL
    )
  `);

  // Optional grader mode: start from a clean customers table on service boot.
  if ((process.env.DB_TRUNCATE_ON_START || "false").toLowerCase() === "true") {
    await pool.execute("DELETE FROM customers");
    await pool.execute("ALTER TABLE customers AUTO_INCREMENT = 1");
  }
}

module.exports = {
  pool,
  initSchema
};
