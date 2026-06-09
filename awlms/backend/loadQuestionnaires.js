const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function loadQuestionnaires() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'awlms'
  });

  try {
    const sql = fs.readFileSync(path.join(__dirname, 'questionnaires.sql'), 'utf8');
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    
    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 50) + '...');
      await pool.query(statement);
    }
    
    console.log('✅ Questionnaires table created and populated successfully!');
    
    // Verify
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM InterviewQuestionnaire');
    console.log(`📋 Total questions loaded: ${rows[0].count}`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

loadQuestionnaires();
