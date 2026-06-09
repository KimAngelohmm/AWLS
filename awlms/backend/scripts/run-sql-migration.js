/**
 * Applies a SQL migration file using mysql2.
 * Usage: node scripts/run-sql-migration.js <filename>
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/run-sql-migration.js <migration.sql>');
  process.exit(1);
}

async function main() {
  const sqlPath = path.isAbsolute(file)
    ? file
    : path.join(__dirname, '../../database', file);
  let sql = fs.readFileSync(sqlPath, 'utf8');
  sql = sql.replace(/^\s*USE\s+\w+\s*;\s*/im, '');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'awlms',
    multipleStatements: true,
  });

  try {
    await conn.query(sql);
    console.log(`Applied: ${path.basename(sqlPath)}`);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();
