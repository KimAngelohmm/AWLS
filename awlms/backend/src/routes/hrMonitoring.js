const express = require('express');
const { getPool } = require('../config/db');
const { generateMonitoringBrief } = require('../services/monitoringAi');

const router = express.Router();

function employeeNameExpr(alias = 'e') {
  return `COALESCE(
    u.full_name,
    JSON_UNQUOTE(JSON_EXTRACT(${alias}.profile, '$.display_name')),
    CONCAT('Employee ', SUBSTRING(${alias}.id, 1, 8))
  )`;
}

async function fetchHrMonitoringSnapshot(pool) {
  const nameSql = employeeNameExpr('e');

  const [trendDaily] = await pool.query(
    `SELECT DATE(pr.recorded_at) AS day,
            AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(pr.metrics, '$.focus_score')) AS DECIMAL(10,2))) AS avg_focus,
            AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(pr.metrics, '$.activity_index')) AS DECIMAL(10,4))) AS avg_activity,
            COUNT(*) AS sample_count
     FROM PerformanceRecord pr
     INNER JOIN Employee e ON e.id = pr.employee_id AND e.employment_status = 'active'
     WHERE pr.recorded_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
     GROUP BY DATE(pr.recorded_at)
     ORDER BY day ASC`
  );

  const [employeeSnapshots] = await pool.query(
    `SELECT x.employee_id, x.recorded_at, x.metrics, x.source,
            ${nameSql} AS employee_name,
            e.employee_number,
            jp.title AS job_title,
            d.name AS department_name
     FROM (
       SELECT pr.*,
              ROW_NUMBER() OVER (PARTITION BY pr.employee_id ORDER BY pr.recorded_at DESC) AS rn
       FROM PerformanceRecord pr
     ) x
     INNER JOIN Employee e ON e.id = x.employee_id
     LEFT JOIN users u ON u.id = e.user_id
     LEFT JOIN JobPosition jp ON jp.id = e.job_position_id
     LEFT JOIN departments d ON d.id = e.department_id
     WHERE x.rn = 1 AND e.employment_status = 'active'
     ORDER BY employee_name ASC
     LIMIT 80`
  );

  const [openAlerts] = await pool.query(
    `SELECT psa.id, psa.severity, psa.title, psa.body, psa.created_at,
            psa.employee_id, psa.performance_record_id,
            ${nameSql} AS employee_name,
            e.employee_number,
            jp.title AS job_title
     FROM PerformanceStaffAlert psa
     INNER JOIN Employee e ON e.id = psa.employee_id
     LEFT JOIN users u ON u.id = e.user_id
     LEFT JOIN JobPosition jp ON jp.id = e.job_position_id
     WHERE psa.acknowledged_at IS NULL
       AND psa.audience IN ('hr', 'both')
     ORDER BY psa.created_at DESC
     LIMIT 50`
  );

  const [[{ totalRecords }]] = await pool.query(
    `SELECT COUNT(*) AS totalRecords FROM PerformanceRecord pr
     INNER JOIN Employee e ON e.id = pr.employee_id AND e.employment_status = 'active'
     WHERE pr.recorded_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
  );

  const counts = {
    trackedEmployees: employeeSnapshots.length,
    openPerformanceAlerts: openAlerts.length,
    recordsLast24h: Number(totalRecords) || 0,
  };

  return {
    trendDaily,
    employeeSnapshots,
    openAlerts,
    counts,
  };
}

router.get('/dashboard', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const snapshot = await fetchHrMonitoringSnapshot(pool);
    return res.json(snapshot);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load monitoring dashboard' });
  }
});

router.post('/ai/brief', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const snapshot = await fetchHrMonitoringSnapshot(pool);
    const brief = await generateMonitoringBrief({
      scope: 'organization_hr',
      trendDaily: snapshot.trendDaily,
      employeeSnapshots: snapshot.employeeSnapshots,
      openAlerts: snapshot.openAlerts,
      counts: snapshot.counts,
    });
    return res.json(brief);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not generate AI monitoring brief' });
  }
});

router.get('/employees/:employeeId/performance', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }
  const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 60, 1), 200);

  const nameSql = employeeNameExpr('e');

  try {
    const [empRows] = await pool.query(
      `SELECT e.id, e.employee_number, e.employment_status,
              ${nameSql} AS employee_name,
              jp.title AS job_title,
              d.name AS department_name,
              jp.performance_thresholds
       FROM Employee e
       LEFT JOIN users u ON u.id = e.user_id
       LEFT JOIN JobPosition jp ON jp.id = e.job_position_id
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.id = ?
       LIMIT 1`,
      [req.params.employeeId]
    );
    if (!empRows.length) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const [records] = await pool.query(
      `SELECT id, recorded_at, metrics, source, session_id, notes
       FROM PerformanceRecord
       WHERE employee_id = ?
       ORDER BY recorded_at DESC
       LIMIT ?`,
      [req.params.employeeId, limit]
    );

    return res.json({ employee: empRows[0], records });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load employee performance history' });
  }
});

router.patch('/performance-alerts/:id/acknowledge', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const [result] = await pool.query(
      `UPDATE PerformanceStaffAlert
       SET acknowledged_at = COALESCE(acknowledged_at, CURRENT_TIMESTAMP(3)),
           acknowledged_by_user_id = ?
       WHERE id = ?
         AND acknowledged_at IS NULL
         AND audience IN ('hr', 'both')`,
      [req.user.id, req.params.id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Alert not found or already acknowledged' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not acknowledge alert' });
  }
});

module.exports = router;
