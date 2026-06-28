/**
 * Creates the AWLMS database schema only when it is missing.
 * This intentionally avoids reapplying schema.sql when tables already exist,
 * because schema.sql drops and recreates core tables.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const dbName = process.env.DB_NAME || 'awlms';

async function main() {
  const baseConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    multipleStatements: true,
  };

  const serverConn = await mysql.createConnection(baseConfig);
  try {
    const [databases] = await serverConn.query('SHOW DATABASES LIKE ?', [dbName]);
    if (databases.length) {
      const dbConn = await mysql.createConnection({ ...baseConfig, database: dbName });
      try {
        const [tables] = await dbConn.query("SHOW TABLES LIKE 'JobPosition'");
        if (tables.length) {
          console.log(`Database '${dbName}' is ready.`);
          return;
        }
      } finally {
        await dbConn.end();
      }
    }

    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await serverConn.query(schemaSql);
    console.log(`Database '${dbName}' schema created.`);
  } finally {
    await serverConn.end();
  }
}

main().catch((err) => {
  console.error('Database setup failed:', err.message);
  process.exit(1);
});
