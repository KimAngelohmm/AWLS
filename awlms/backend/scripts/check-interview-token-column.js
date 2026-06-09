/**
 * Checks if interview_token column exists; creates if missing
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME || 'awlms',
    });

    // Check if column exists
    const [cols] = await conn.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Applicant' AND COLUMN_NAME = 'interview_token' LIMIT 1
    `);
    
    if (cols.length > 0) {
      console.log('✓ interview_token column already exists');
      return;
    }

    console.log('⚠ interview_token column NOT found. Creating now...');
    
    await conn.query(`
      ALTER TABLE \`Applicant\`
        ADD COLUMN IF NOT EXISTS \`interview_token\`  VARCHAR(96)  NULL
          COMMENT 'Unique token sent to applicant — authenticates the public interview session'
          AFTER \`interview_transcript\`,
        ADD COLUMN IF NOT EXISTS \`interview_status\` ENUM('pending_start','in_progress','completed','failed')
          NOT NULL DEFAULT 'pending_start'
          COMMENT 'Tracks where the applicant is in the AI interview flow'
          AFTER \`interview_token\`,
        ADD COLUMN IF NOT EXISTS \`interview_messages\` JSON NULL
          COMMENT 'Full chat message array (role, content, ts) for the interview session'
          AFTER \`interview_status\`,
        ADD COLUMN IF NOT EXISTS \`ai_recommendation\` ENUM('hire','no_hire') NULL
          COMMENT 'AI hiring recommendation generated at interview completion'
          AFTER \`assessment_summary\`
    `);
    
    await conn.query(`
      ALTER TABLE \`Applicant\`
        ADD UNIQUE INDEX IF NOT EXISTS \`uk_applicant_interview_token\`  (\`interview_token\`),
        ADD INDEX        IF NOT EXISTS \`idx_applicant_interview_status\` (\`interview_status\`)
    `);
    
    console.log('✓ Created interview_token column and indexes');
    
  } catch (err) {
    console.error('Error checking/creating interview_token:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
