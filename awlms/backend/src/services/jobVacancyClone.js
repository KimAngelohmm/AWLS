const crypto = require('crypto');

/**
 * Creates a new open JobPosition cloned from an existing one (closed-loop recruitment).
 */
async function cloneJobPositionFromSource(pool, { sourceJobPositionId, createdByUserId }) {
  const newId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO JobPosition (
       id, title, competency_requirements, interview_criteria, performance_thresholds,
       status, department_id, employment_type, location, number_of_openings,
       created_by_user_id, description
     )
     SELECT ?, title, competency_requirements, interview_criteria, performance_thresholds,
            'open', department_id, employment_type, location, number_of_openings, ?,
            CONCAT(COALESCE(description, ''), '\\n\\n— Reposted automatically by AWLMS Lifecycle Management when this role became vacant.')
     FROM JobPosition WHERE id = ?`,
    [newId, createdByUserId, sourceJobPositionId]
  );
  return newId;
}

module.exports = { cloneJobPositionFromSource };
