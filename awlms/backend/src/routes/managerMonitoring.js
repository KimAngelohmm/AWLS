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

async function fetchManagerMonitoringSnapshot(pool, userId) {
  const [urows] = await pool.query(`SELECT department_id FROM users WHERE id = ? LIMIT 1`, [userId]);
  const departmentId = urows[0]?.department_id;
  if (!departmentId) {
    return {
      trendDaily: [],
      employeeSnapshots: [],
      openAlerts: [],
      counts: { trackedEmployees: 0, openPerformanceAlerts: 0, recordsLast24h: 0 },
      message: 'Your account has no department assignment; team monitoring is unavailable.',
      department_id: null,
    };
  }

  const nameSql = employeeNameExpr('e');

  const [trendDaily] = await pool.query(
    `SELECT DATE(pr.recorded_at) AS day,
            AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(pr.metrics, '$.focus_score')) AS DECIMAL(10,2))) AS avg_focus,
            AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(pr.metrics, '$.activity_index')) AS DECIMAL(10,4))) AS avg_activity,
            COUNT(*) AS sample_count
     FROM PerformanceRecord pr
     INNER JOIN Employee e ON e.id = pr.employee_id AND e.department_id = ? AND e.employment_status = 'active'
     WHERE pr.recorded_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
     GROUP BY DATE(pr.recorded_at)
     ORDER BY day ASC`,
    [departmentId]
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
       INNER JOIN Employee e2 ON e2.id = pr.employee_id AND e2.department_id = ?
     ) x
     INNER JOIN Employee e ON e.id = x.employee_id
     LEFT JOIN users u ON u.id = e.user_id
     LEFT JOIN JobPosition jp ON jp.id = e.job_position_id
     LEFT JOIN departments d ON d.id = e.department_id
     WHERE x.rn = 1 AND e.employment_status = 'active'
     ORDER BY employee_name ASC
     LIMIT 80`,
    [departmentId]
  );

  const [openAlerts] = await pool.query(
    `SELECT psa.id, psa.severity, psa.title, psa.body, psa.created_at,
            psa.employee_id, psa.performance_record_id,
            ${nameSql} AS employee_name,
            e.employee_number,
            jp.title AS job_title
     FROM PerformanceStaffAlert psa
     INNER JOIN Employee e ON e.id = psa.employee_id AND e.department_id = ?
     LEFT JOIN users u ON u.id = e.user_id
     LEFT JOIN JobPosition jp ON jp.id = e.job_position_id
     WHERE psa.acknowledged_at IS NULL
       AND psa.audience IN ('manager', 'both')
     ORDER BY psa.created_at DESC
     LIMIT 50`,
    [departmentId]
  );

  const [[{ totalRecords }]] = await pool.query(
    `SELECT COUNT(*) AS totalRecords FROM PerformanceRecord pr
     INNER JOIN Employee e ON e.id = pr.employee_id AND e.department_id = ? AND e.employment_status = 'active'
     WHERE pr.recorded_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
    [departmentId]
  );

  return {
    trendDaily,
    employeeSnapshots,
    openAlerts,
    counts: {
      trackedEmployees: employeeSnapshots.length,
      openPerformanceAlerts: openAlerts.length,
      recordsLast24h: Number(totalRecords) || 0,
    },
    department_id: departmentId,
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
    const snapshot = await fetchManagerMonitoringSnapshot(pool, req.user.id);
    const { department_id: _d, ...rest } = snapshot;
    if (snapshot.message) {
      return res.json(rest);
    }
    return res.json(rest);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load team monitoring dashboard' });
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
    const snapshot = await fetchManagerMonitoringSnapshot(pool, req.user.id);
    if (!snapshot.department_id) {
      return res.status(400).json({
        error: snapshot.message || 'Team monitoring is unavailable for your account.',
      });
    }
    const brief = await generateMonitoringBrief({
      scope: `department:${snapshot.department_id}`,
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
    const [urows] = await pool.query(`SELECT department_id FROM users WHERE id = ? LIMIT 1`, [req.user.id]);
    const departmentId = urows[0]?.department_id;
    if (!departmentId) {
      return res.status(403).json({ error: 'No department scope' });
    }

    const [check] = await pool.query(
      `SELECT id FROM Employee WHERE id = ? AND department_id = ? LIMIT 1`,
      [req.params.employeeId, departmentId]
    );
    if (!check.length) {
      return res.status(404).json({ error: 'Employee not in your department' });
    }

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
    const [urows] = await pool.query(`SELECT department_id FROM users WHERE id = ? LIMIT 1`, [req.user.id]);
    const departmentId = urows[0]?.department_id;
    if (!departmentId) {
      return res.status(403).json({ error: 'No department scope' });
    }

    const [result] = await pool.query(
      `UPDATE PerformanceStaffAlert psa
       INNER JOIN Employee e ON e.id = psa.employee_id AND e.department_id = ?
       SET psa.acknowledged_at = COALESCE(psa.acknowledged_at, CURRENT_TIMESTAMP(3)),
           psa.acknowledged_by_user_id = ?
       WHERE psa.id = ?
         AND psa.acknowledged_at IS NULL
         AND psa.audience IN ('manager', 'both')`,
      [departmentId, req.user.id, req.params.id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Alert not found, not in your department, or already acknowledged' });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not acknowledge alert' });
  }
});

// ── Manager home dashboard ────────────────────────────────────────────────────
// Returns team-scoped data for the manager homescreen (no recruitment data).
router.get('/home-dashboard', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const [urows] = await pool.query(`SELECT department_id FROM users WHERE id = ? LIMIT 1`, [req.user.id]);
    const departmentId = urows[0]?.department_id;

    if (!departmentId) {
      return res.json({
        performanceAlerts: [],
        lifecycleEvents: [],
        lifecycleRecommendations: [],
        counts: {
          trackedEmployees: 0,
          openPerformanceAlerts: 0,
          pendingRecommendations: 0,
          addedThisMonth: 0,
          removedThisMonth: 0,
        },
        message: 'Your account has no department assignment; team data is unavailable.',
      });
    }

    const nameSql = employeeNameExpr('e');

    // Performance alerts for this department (manager-visible)
    const [performanceAlerts] = await pool.query(
      `SELECT psa.id, psa.severity, psa.title, psa.body, psa.created_at,
              psa.employee_id, psa.performance_record_id,
              ${nameSql} AS employee_name,
              e.employee_number,
              jp.title AS job_title
       FROM PerformanceStaffAlert psa
       INNER JOIN Employee e ON e.id = psa.employee_id AND e.department_id = ?
       LEFT JOIN users u ON u.id = e.user_id
       LEFT JOIN JobPosition jp ON jp.id = e.job_position_id
       WHERE psa.acknowledged_at IS NULL
         AND psa.audience IN ('manager', 'both')
       ORDER BY psa.created_at DESC
       LIMIT 40`,
      [departmentId]
    );

    // Lifecycle events for employees in this department
    const [lifecycleEvents] = await pool.query(
      `SELECT le.id, le.event_type, le.resignation_submitted_at, le.last_working_date,
              le.exit_acknowledged_at, le.created_at,
              ${nameSql} AS employee_name
       FROM LifecycleEvent le
       INNER JOIN Employee e ON e.id = le.employee_id AND e.department_id = ?
       LEFT JOIN users u ON u.id = e.user_id
       WHERE le.exit_acknowledged_at IS NULL
         AND (
           le.resignation_submitted_at IS NOT NULL
           OR le.event_type IN ('termination', 'promotion')
         )
       ORDER BY le.created_at DESC
       LIMIT 20`,
      [departmentId]
    );

    // Lifecycle recommendations submitted by this manager
    const [lifecycleRecommendations] = await pool.query(
      `SELECT lr.id, lr.recommendation_type, lr.status, lr.created_at,
              ${nameSql} AS employee_name,
              jp_to.title AS target_job_title
       FROM LifecycleRecommendation lr
       INNER JOIN Employee e ON e.id = lr.employee_id AND e.department_id = ?
       LEFT JOIN users u ON u.id = e.user_id
       LEFT JOIN JobPosition jp_to ON jp_to.id = lr.to_job_position_id
       WHERE lr.manager_user_id = ?
       ORDER BY lr.created_at DESC
       LIMIT 20`,
      [departmentId, req.user.id]
    );

    // Headcount stats scoped to department
    const [[{ trackedEmployees }]] = await pool.query(
      `SELECT COUNT(*) AS trackedEmployees FROM Employee
       WHERE department_id = ? AND employment_status = 'active'`,
      [departmentId]
    );

    const [[{ addedThisMonth }]] = await pool.query(
      `SELECT COUNT(*) AS addedThisMonth FROM Employee
       WHERE department_id = ? AND employment_status = 'active'
         AND YEAR(created_at) = YEAR(CURRENT_DATE())
         AND MONTH(created_at) = MONTH(CURRENT_DATE())`,
      [departmentId]
    );

    const [[{ removedThisMonth }]] = await pool.query(
      `SELECT COUNT(*) AS removedThisMonth FROM Employee
       WHERE department_id = ?
         AND employment_status IN ('terminated', 'resigned')
         AND YEAR(updated_at) = YEAR(CURRENT_DATE())
         AND MONTH(updated_at) = MONTH(CURRENT_DATE())`,
      [departmentId]
    );

    const pendingRecommendations = lifecycleRecommendations.filter(
      (r) => r.status === 'pending'
    ).length;

    return res.json({
      performanceAlerts,
      lifecycleEvents,
      lifecycleRecommendations,
      counts: {
        trackedEmployees: Number(trackedEmployees),
        openPerformanceAlerts: performanceAlerts.length,
        pendingRecommendations,
        addedThisMonth: Number(addedThisMonth),
        removedThisMonth: Number(removedThisMonth),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load manager home dashboard' });
  }
});

module.exports = router;
