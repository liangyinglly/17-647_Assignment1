const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "books_db",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
  queueLimit: 0
});

async function initSchema() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS books (
      ISBN VARCHAR(32) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      Author VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      genre VARCHAR(128) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      quantity INT NOT NULL,
      summary TEXT
    )
  `);

  // Optional grader mode: start from a clean books table on service boot.
  if ((process.env.DB_TRUNCATE_ON_START || "false").toLowerCase() === "true") {
    await pool.execute("DELETE FROM books");
  }
}

module.exports = {
  pool,
  initSchema
};
