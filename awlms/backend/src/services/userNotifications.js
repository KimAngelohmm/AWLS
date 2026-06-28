const crypto = require('crypto');

/**
 * Role-scoped inbox rows for HR and Manager users (employees use HRNotification).
 */
async function insertUserNotification(pool, {
  userId,
  category,
  title,
  body,
  entityType = null,
  entityId = null,
  metadata = null,
}) {
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO UserNotification (id, user_id, category, title, body, entity_type, entity_id, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))`,
    [
      id,
      userId,
      category,
      title.slice(0, 255),
      body,
      entityType,
      entityId,
      JSON.stringify(metadata ?? {}),
    ]
  );
  return id;
}

async function getUserIdsByRole(pool, role) {
  const [rows] = await pool.query(`SELECT id FROM users WHERE role = ?`, [role]);
  return rows.map((r) => r.id);
}

async function getManagerUserIdsForDepartment(pool, departmentId) {
  if (!departmentId) return [];
  const [rows] = await pool.query(
    `SELECT id FROM users WHERE role = 'manager' AND department_id = ?`,
    [departmentId]
  );
  return rows.map((r) => r.id);
}

async function notifyAllHr(pool, { category, title, body, entityType, entityId, metadata }) {
  const ids = await getUserIdsByRole(pool, 'hr');
  for (const userId of ids) {
    await insertUserNotification(pool, { userId, category, title, body, entityType, entityId, metadata });
  }
}

async function notifyManagersInDepartment(pool, departmentId, payload) {
  const ids = await getManagerUserIdsForDepartment(pool, departmentId);
  for (const userId of ids) {
    await insertUserNotification(pool, { userId, ...payload });
  }
}

module.exports = {
  insertUserNotification,
  notifyAllHr,
  notifyManagersInDepartment,
  getUserIdsByRole,
};
