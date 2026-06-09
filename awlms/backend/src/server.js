require('dotenv').config();

const express = require('express');
const cors = require('cors');

const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const portalRouter = require('./routes/portal');
const hrRouter = require('./routes/hr');
const hrEmployeeAccountsRouter = require('./routes/hrEmployeeAccounts');
const employeeRouter = require('./routes/employee');
const recruitmentPublicRouter = require('./routes/recruitmentPublic');
const hrRecruitmentRouter = require('./routes/hrRecruitment');
const hrMonitoringRouter = require('./routes/hrMonitoring');
const managerMonitoringRouter = require('./routes/managerMonitoring');
const managerNotificationsRouter = require('./routes/managerNotifications');
const aiChatRouter = require('./routes/aiChat');
const publicApiRouter = require('./routes/publicApi');
const { authenticateToken } = require('./middleware/auth');
const { requireRole } = require('./middleware/requireRole');

// Auto-check and create interview_token column on startup
const autoCheckDatabase = async () => {
  try {
    const mysql = require('mysql2/promise');
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME || 'awlms',
    });
    
    const [cols] = await conn.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Applicant' AND COLUMN_NAME = 'interview_token' LIMIT 1
    `);
    
    if (cols.length === 0) {
      console.log('[startup] Creating interview_token columns...');
      await conn.query(`
        ALTER TABLE \`Applicant\`
          ADD COLUMN IF NOT EXISTS \`interview_token\`  VARCHAR(96)  NULL AFTER \`interview_transcript\`,
          ADD COLUMN IF NOT EXISTS \`interview_status\` ENUM('pending_start','in_progress','completed','failed') NOT NULL DEFAULT 'pending_start' AFTER \`interview_token\`,
          ADD COLUMN IF NOT EXISTS \`interview_messages\` JSON NULL AFTER \`interview_status\`,
          ADD COLUMN IF NOT EXISTS \`ai_recommendation\` ENUM('hire','no_hire') NULL AFTER \`assessment_summary\`
      `);
      await conn.query(`
        ALTER TABLE \`Applicant\`
          ADD UNIQUE INDEX IF NOT EXISTS \`uk_applicant_interview_token\`  (\`interview_token\`),
          ADD INDEX        IF NOT EXISTS \`idx_applicant_interview_status\` (\`interview_status\`)
      `);
      console.log('[startup] ✓ Interview columns created');
    }
    
    await conn.end();
  } catch (err) {
    console.error('[startup] Warning: Could not check/create interview_token column:', err.message);
  }
};

// Run database check before starting the server
autoCheckDatabase().then(() => {


const app = express();
const port = Number(process.env.PORT) || 5000;
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  })
);
app.use(express.json());

app.get('/api', (req, res) => {
  res.json({
    name: 'AWLMS API',
    version: '1.0.0',
  });
});

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/portal', portalRouter);
app.use('/api/public', publicApiRouter);

/** Mount specific HR routers before `/api/hr` so they are not shadowed by the generic HR router. */
app.use('/api/hr/recruitment', authenticateToken, requireRole('hr'), hrRecruitmentRouter);
app.use('/api/hr/monitoring', authenticateToken, requireRole('hr'), hrMonitoringRouter);
// Employee account creation and directory — accessible to both HR personnel and Managers
app.use('/api/hr/employees', authenticateToken, requireRole('hr', 'manager'), hrEmployeeAccountsRouter);
app.use('/api/hr', hrRouter);

/** Manager: mount `/monitoring` before `/api/manager` notifications base. */
app.use('/api/manager/monitoring', authenticateToken, requireRole('manager'), managerMonitoringRouter);
app.use('/api/manager', managerNotificationsRouter);

app.use('/api/employee', employeeRouter);
app.use('/api/recruitment', recruitmentPublicRouter);
app.use('/api/ai/chat', aiChatRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`AWLMS backend listening on http://localhost:${port}`);
});

}).catch((err) => {
  console.error('[startup] Fatal error during database check:', err);
  process.exit(1);
});
