/**
 * Apply migration 009 — AI Interview Module
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'awlms',
    multipleStatements: true,
  });

  try {
    console.log('Applying migration 009 — AI Interview Module...');
    
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
          AFTER \`assessment_summary\`;
    `);
    
    await conn.query(`
      ALTER TABLE \`Applicant\`
        ADD UNIQUE INDEX IF NOT EXISTS \`uk_applicant_interview_token\`  (\`interview_token\`),
        ADD INDEX        IF NOT EXISTS \`idx_applicant_interview_status\` (\`interview_status\`);
    `);
    
    console.log('✓ Migration 009 applied successfully!');
    
    // Verify the column exists
    const [cols] = await conn.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Applicant' AND COLUMN_NAME = 'interview_token'
    `);
    
    if (cols.length > 0) {
      console.log('✓ Verified: interview_token column exists');
    } else {
      console.error('✗ ERROR: interview_token column not found after migration!');
    }
    
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();
