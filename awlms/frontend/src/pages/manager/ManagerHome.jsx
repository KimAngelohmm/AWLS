import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api.js';

export default function ManagerHome() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/hr/dashboard')
      .then(setStats)
      .catch((err) => setError(err.body?.error || err.message || 'Could not load data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading && !stats) {
    return (
      <div className="hdb-loading">
        <div className="hdb-loading-spinner" aria-hidden="true" />
        <p>Loading overview…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hdb-error">
        <div className="login-alert" role="alert">{error}</div>
        <button
          type="button"
          className="btn-secondary"
          style={{ marginTop: '0.75rem' }}
          onClick={() => { setLoading(true); setError(''); apiFetch('/api/hr/dashboard').then(setStats).catch((e) => setError(e.message)).finally(() => setLoading(false)); }}
        >
          Retry
        </button>
      </div>
    );
  }

  const jobs = stats?.activeJobPostings ?? [];
  const counts = stats?.counts ?? {};

  return (
    <div className="hdb-root">
      <section className="hdb-stats" aria-label="Summary statistics">
        <div className="hdb-stat">
          <p className="hdb-stat-label">OPEN POSITIONS</p>
          <p className="hdb-stat-value">{counts.activeJobPostings ?? jobs.length}</p>
          <p className="hdb-stat-sub hdb-stat-sub--muted">Active postings</p>
        </div>
        <div className="hdb-stat">
          <p className="hdb-stat-label">PENDING REVIEWS</p>
          <p className="hdb-stat-value">{counts.pendingAssessments ?? 0}</p>
          <p className="hdb-stat-sub hdb-stat-sub--green">Awaiting HR decision</p>
        </div>
        <div className="hdb-stat">
          <p className="hdb-stat-label">TOTAL APPLICANTS</p>
          <p className="hdb-stat-value">{counts.totalApplicants ?? 0}</p>
          <p className="hdb-stat-sub hdb-stat-sub--muted">All time</p>
        </div>
      </section>

      <div className="hdb-grid">
        <section className="hdb-panel">
          <div className="hdb-panel-head">
            <h2 className="hdb-panel-title">Open Positions</h2>
            <Link to="/hr/recruitment" className="hdb-view-all">View all →</Link>
          </div>
          {jobs.length === 0 ? (
            <p className="muted" style={{ padding: '1rem 0' }}>No open positions.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {jobs.slice(0, 5).map((j) => (
                <li key={j.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.9rem' }}>{j.title}</span>
                  <span style={{ fontSize: '0.7rem', background: 'rgba(15,168,136,0.15)', color: '#0fa888', padding: '0.2rem 0.5rem', borderRadius: '3px', textTransform: 'uppercase', fontWeight: '600' }}>ACTIVE</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="hdb-panel">
          <div className="hdb-panel-head">
            <h2 className="hdb-panel-title">Recruitment Pipeline</h2>
            <Link to="/hr/recruitment" className="hdb-view-all">Manage →</Link>
          </div>
          <div>
            <p className="muted">
              {counts.pendingAssessments ?? 0} assessment{(counts.pendingAssessments ?? 0) !== 1 ? 's' : ''} pending across {jobs.length} position{jobs.length !== 1 ? 's' : ''}
            </p>
            <Link to="/hr/recruitment" className="btn btn-secondary" style={{ marginTop: '0.75rem', display: 'inline-block' }}>
              Go to Recruitment
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
