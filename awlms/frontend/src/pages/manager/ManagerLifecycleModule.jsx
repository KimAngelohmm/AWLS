import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api.js';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export default function ManagerLifecycleModule() {
  const [team, setTeam] = useState([]);
  const [positions, setPositions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [employeeId, setEmployeeId] = useState('');
  const [recommendationType, setRecommendationType] = useState('promotion');
  const [toJobPositionId, setToJobPositionId] = useState('');
  const [rationale, setRationale] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [teamJson, posJson, recJson] = await Promise.all([
        apiFetch('/api/manager/lifecycle/team'),
        apiFetch('/api/manager/lifecycle/open-positions'),
        apiFetch('/api/manager/lifecycle/recommendations'),
      ]);
      setTeam(teamJson.employees ?? []);
      setPositions(posJson.positions ?? []);
      setRecommendations(recJson.recommendations ?? []);
      if (teamJson.message) {
        setMessage(teamJson.message);
      } else {
        setMessage('');
      }
    } catch (err) {
      setError(err.body?.error || err.message || 'Could not load lifecycle data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiFetch('/api/manager/lifecycle/recommendations', {
        method: 'POST',
        body: JSON.stringify({
          employeeId,
          recommendationType,
          rationale: rationale || undefined,
          toJobPositionId: recommendationType === 'promotion' ? toJobPositionId : undefined,
        }),
      });
      setRationale('');
      setToJobPositionId('');
      await load();
    } catch (err) {
      setError(err.body?.error || err.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dash mgr-dash">
      <header className="mgr-page-head">
        <div>
          <h1 className="dash-title">HR recommendations</h1>
          <p className="muted">
            Submit promotion or termination recommendations for your department. HR reviews them in Lifecycle Management.
          </p>
        </div>
        <Link to="/manager" className="btn-secondary hr-link-btn">
          Overview
        </Link>
      </header>

      {error ? <div className="auth-alert">{error}</div> : null}
      {message ? (
        <div className="emp-banner" role="status">
          {message}
        </div>
      ) : null}

      {loading ? <p className="muted">Loading…</p> : null}

      <section className="dash-section">
        <h2 className="dash-section-title">New recommendation</h2>

        {!loading && team.length === 0 && (
          <div className="emp-banner" role="status" style={{ marginBottom: '1rem' }}>
            No active team members found for your department. Ensure your account has a department
            assignment and that employees are assigned to the same department.
          </div>
        )}

        <form className="mgr-lifecycle-form" onSubmit={handleSubmit}>
          <label className="mgr-field">
            <span>Employee</span>
            <select
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">Select team member</option>
              {team.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} — {emp.job_title || 'Role'}
                </option>
              ))}
            </select>
          </label>

          <label className="mgr-field">
            <span>Recommendation</span>
            <select
              value={recommendationType}
              onChange={(e) => setRecommendationType(e.target.value)}
            >
              <option value="promotion">Promotion</option>
              <option value="termination">Termination</option>
            </select>
          </label>

          {recommendationType === 'promotion' ? (
            <label className="mgr-field">
              <span>Open role (target)</span>
              <select
                required={recommendationType === 'promotion'}
                value={toJobPositionId}
                onChange={(e) => setToJobPositionId(e.target.value)}
              >
                <option value="">Select open job posting</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                    {p.department_name ? ` — ${p.department_name}` : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="mgr-field mgr-field--grow">
            <span>Rationale (optional)</span>
            <textarea
              rows={4}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Context for HR — performance, business need, timeline…"
            />
          </label>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit to HR'}
          </button>
        </form>
      </section>

      <section className="dash-section">
        <h2 className="dash-section-title">Your submissions</h2>
        <div className="hr-table-wrap">
          <table className="hr-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Target</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="hr-table-empty">
                    No recommendations yet.
                  </td>
                </tr>
              ) : (
                recommendations.map((r) => (
                  <tr key={r.id}>
                    <td>{r.employee_name}</td>
                    <td>
                      <span className="hr-pill">{r.recommendation_type}</span>
                    </td>
                    <td className="muted">{r.target_job_title || '—'}</td>
                    <td>{r.status}</td>
                    <td className="muted">{formatDate(r.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
