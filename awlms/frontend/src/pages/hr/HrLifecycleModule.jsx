import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api.js';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export default function HrLifecycleModule() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authRefByRec, setAuthRefByRec] = useState({});
  const [busyKey, setBusyKey] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const json = await apiFetch('/api/hr/lifecycle/overview');
      setOverview(json);
    } catch (err) {
      setOverview(null);
      setError(err.body?.error || err.message || 'Could not load lifecycle data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function setBusy(id) {
    setBusyKey(id);
  }

  async function approveRecommendation(id) {
    setBusy(`approve-${id}`);
    setError('');
    try {
      await apiFetch(`/api/hr/lifecycle/recommendations/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          authorizationReference: authRefByRec[id] || undefined,
        }),
      });
      await load();
    } catch (err) {
      setError(err.body?.error || err.message || 'Approve failed');
    } finally {
      setBusy(null);
    }
  }

  async function rejectRecommendation(id) {
    setBusy(`reject-${id}`);
    setError('');
    const note = window.prompt('Optional note for audit trail (internal):') ?? '';
    try {
      await apiFetch(`/api/hr/lifecycle/recommendations/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ note: note || undefined }),
      });
      await load();
    } catch (err) {
      setError(err.body?.error || err.message || 'Reject failed');
    } finally {
      setBusy(null);
    }
  }

  async function processDecision(id) {
    setBusy(`decision-${id}`);
    setError('');
    try {
      await apiFetch(`/api/hr/lifecycle/decisions/${id}/process`, { method: 'POST', body: '{}' });
      await load();
    } catch (err) {
      setError(err.body?.error || err.message || 'Process failed');
    } finally {
      setBusy(null);
    }
  }

  async function completeResignation(id) {
    setBusy(`resign-${id}`);
    setError('');
    try {
      await apiFetch(`/api/hr/lifecycle/lifecycle-events/${id}/complete-resignation`, {
        method: 'POST',
        body: '{}',
      });
      await load();
    } catch (err) {
      setError(err.body?.error || err.message || 'Could not complete resignation');
    } finally {
      setBusy(null);
    }
  }

  const recommendations = overview?.recommendations ?? [];
  const pendingRecs = recommendations.filter((r) => r.status === 'pending');
  const life = overview?.lifecycleEvents ?? [];
  const decisions = overview?.hrDecisionsPending ?? [];
  const auditLog = overview?.auditLog ?? [];

  return (
    <div className="hr-page">
      <header className="hr-page-head">
        <div>
          <h1 className="hr-page-title">Lifecycle Management</h1>
          <p className="muted">
            Manager recommendations, resignation intake, HR decisions, formal AI-generated notices, vacancy reposts
            into Recruitment & Screening, and append-only audit history.
          </p>
        </div>
        <div className="hr-page-actions">
          <Link to="/hr" className="btn-secondary hr-link-btn">
            Overview
          </Link>
          <Link to="/hr/recruitment" className="btn-secondary hr-link-btn">
            Recruitment
          </Link>
          <button type="button" className="btn-secondary" onClick={() => load()} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      {error ? (
        <div className="auth-alert" role="alert">
          {error}
        </div>
      ) : null}

      {loading && !overview ? (
        <p className="muted">Loading lifecycle workspace…</p>
      ) : null}

      <section className="hr-panel">
        <h2 className="hr-panel-title">Manager recommendations</h2>
        <p className="muted hr-panel-lead">
          Approve to create an authorized HR decision record; then process the decision to notify the employee and apply
          employment updates.
        </p>
        <div className="hr-table-wrap">
          <table className="hr-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Target role</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingRecs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="hr-table-empty">
                    No pending recommendations.
                  </td>
                </tr>
              ) : (
                pendingRecs.map((r) => (
                  <tr key={r.id}>
                    <td>{r.employee_name}</td>
                    <td>
                      <span className="hr-pill">{r.recommendation_type}</span>
                    </td>
                    <td className="muted">{r.target_job_title || '—'}</td>
                    <td>{r.status}</td>
                    <td className="muted">{formatDate(r.created_at)}</td>
                    <td>
                      <div className="hr-actions-stack">
                        <input
                          type="text"
                          className="hr-input-inline"
                          placeholder="Authorization ref. (optional)"
                          value={authRefByRec[r.id] || ''}
                          onChange={(e) =>
                            setAuthRefByRec((prev) => ({ ...prev, [r.id]: e.target.value }))
                          }
                          aria-label={`Authorization reference for ${r.employee_name}`}
                        />
                        <button
                          type="button"
                          className="btn-primary hr-btn-tight"
                          disabled={busyKey === `approve-${r.id}`}
                          onClick={() => approveRecommendation(r.id)}
                        >
                          {busyKey === `approve-${r.id}` ? 'Approving…' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary hr-btn-tight"
                          disabled={busyKey === `reject-${r.id}`}
                          onClick={() => rejectRecommendation(r.id)}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="hr-panel">
        <h2 className="hr-panel-title">Pending resignations</h2>
        <p className="muted hr-panel-lead">
          Completing a resignation marks the employee as resigned, sends a formal closure notification (AI-assisted),
          and reposts their vacated role as an open job for Recruitment & Screening.
        </p>
        <div className="hr-table-wrap">
          <table className="hr-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Submitted</th>
                <th>Last working day</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {life.length === 0 ? (
                <tr>
                  <td colSpan={4} className="hr-table-empty">
                    No pending resignation cases.
                  </td>
                </tr>
              ) : (
                life.map((e) => (
                  <tr key={e.id}>
                    <td>{e.employee_name}</td>
                    <td className="muted">{formatDate(e.resignation_submitted_at)}</td>
                    <td className="muted">{e.last_working_date || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-primary hr-btn-tight"
                        disabled={busyKey === `resign-${e.id}`}
                        onClick={() => completeResignation(e.id)}
                      >
                        {busyKey === `resign-${e.id}` ? 'Working…' : 'Complete & repost role'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="hr-panel">
        <h2 className="hr-panel-title">HR decisions — send formal notice</h2>
        <p className="muted hr-panel-lead">
          Processing generates the formal HR notification (AI when configured), updates employment status or role, and
          closes the lifecycle record for this decision.
        </p>
        <div className="hr-table-wrap">
          <table className="hr-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Decision</th>
                <th>Authorized</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {decisions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="hr-table-empty">
                    No decisions awaiting notification.
                  </td>
                </tr>
              ) : (
                decisions.map((d) => (
                  <tr key={d.id}>
                    <td>{d.employee_name}</td>
                    <td>{d.decision_type}</td>
                    <td className="muted">{formatDate(d.authorized_at)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-primary hr-btn-tight"
                        disabled={busyKey === `decision-${d.id}`}
                        onClick={() => processDecision(d.id)}
                      >
                        {busyKey === `decision-${d.id}` ? 'Processing…' : 'Process & notify'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="hr-panel">
        <h2 className="hr-panel-title">Recent audit entries</h2>
        <div className="hr-table-wrap">
          <table className="hr-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Entity</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.length === 0 ? (
                <tr>
                  <td colSpan={4} className="hr-table-empty">
                    No audit rows yet.
                  </td>
                </tr>
              ) : (
                auditLog.map((a) => (
                  <tr key={a.id}>
                    <td className="muted">{formatDate(a.created_at)}</td>
                    <td>{a.action}</td>
                    <td>
                      {a.entity_type}
                    </td>
                    <td className="muted hr-table-mono">{a.entity_id?.slice(0, 8)}…</td>
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
