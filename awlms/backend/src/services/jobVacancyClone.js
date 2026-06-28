const crypto = require('crypto');

/**
 * Creates a new open JobPosition cloned from an existing one.
 */
async function cloneJobPositionFromSource(pool, { sourceJobPositionId, createdByUserId }) {
  const newId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO JobPosition (
       id, title, competency_requirements, interview_criteria,
       status, department_id, employment_type, location, number_of_openings,
       created_by_user_id, description
     )
     SELECT ?, title, competency_requirements, interview_criteria,
            'open', department_id, employment_type, location, number_of_openings, ?,
            CONCAT(COALESCE(description, ''), '\n\n— Reposted automatically to keep this role active.')
     FROM JobPosition WHERE id = ?`,
    [newId, createdByUserId, sourceJobPositionId]
  );
  return newId;
}

module.exports = { cloneJobPositionFromSource };
