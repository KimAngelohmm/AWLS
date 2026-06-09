import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api.js';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function ReportCard({ icon, title, value, sub, accent }) {
  return (
    <div className="air-card">
      <div className="air-card-icon" style={{ background: accent ? 'rgba(15,168,136,0.15)' : 'rgba(255,255,255,0.06)' }}>
        {icon}
      </div>
      <div className="air-card-body">
        <p className="air-card-value">{value ?? '—'}</p>
        <p className="air-card-title">{title}</p>
        {sub && <p className="air-card-sub">{sub}</p>}
      </div>
    </div>
  );
}

export default function HrAiReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Pull from existing endpoints and aggregate into a report view
      const [recruitRes, lifecycleRes, monitorRes] = await Promise.allSettled([
        apiFetch('/api/hr/recruitment/job-positions'),
        apiFetch('/api/hr/lifecycle/overview'),
        apiFetch('/api/hr/monitoring/dashboard'),
      ]);

      const jobs = recruitRes.status === 'fulfilled' ? (recruitRes.value.jobPositions ?? []) : [];
      const lifecycle = lifecycleRes.status === 'fulfilled' ? lifecycleRes.value : {};
      const monitoring = monitorRes.status === 'fulfilled' ? monitorRes.value : {};

      setData({ jobs, lifecycle, monitoring });
    } catch (err) {
      setError(err.body?.error || err.message || 'Could not load report data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const jobs = data?.jobs ?? [];
  const openJobs = jobs.filter((j) => j.status === 'open').length;
  const closedJobs = jobs.filter((j) => j.status === 'closed').length;
  const hiredJobs = jobs.filter((j) => j.status === 'hired').length;

  const auditLog = data?.lifecycle?.auditLog ?? [];
  const decisions = data?.lifecycle?.hrDecisionsPending ?? [];
  const resignations = data?.lifecycle?.lifecycleEvents ?? [];
  const recommendations = data?.lifecycle?.recommendations ?? [];

  const approvedRecs = recommendations.filter((r) => r.status === 'approved').length;
  const rejectedRecs = recommendations.filter((r) => r.status === 'rejected').length;
  const pendingRecs = recommendations.filter((r) => r.status === 'pending').length;

  const alerts = data?.monitoring?.openAlerts ?? [];
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical').length;

  return (
    <div className="hr-page">
      <header className="hr-page-head">
        <div>
          <h1 className="hr-page-title">AI Reports</h1>
          <p className="muted">
            Aggregated AI-generated insights across recruitment, monitoring, and lifecycle modules.
          </p>
        </div>
        <div className="hr-page-actions">
          <Link to="/hr" className="btn-secondary hr-link-btn">Overview</Link>
          <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </header>

      {error && <div className="auth-alert" role="alert">{error}</div>}

      {/* ── Summary cards ── */}
      <section className="hr-panel">
        <h2 className="hr-panel-title">Recruitment Summary</h2>
        <div className="air-cards">
          <ReportCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>}
            title="Total Positions"
            value={jobs.length}
            sub="All job postings"
            accent
          />
          <ReportCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
            title="Open Positions"
            value={openJobs}
            sub="Accepting applications"
          />
          <ReportCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
            title="Hired"
            value={hiredJobs}
            sub="Positions filled"
            accent
          />
          <ReportCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
            title="Closed"
            value={closedJobs}
            sub="No longer active"
          />
        </div>
      </section>

      {/* ── Lifecycle summary ── */}
      <section className="hr-panel">
        <h2 className="hr-panel-title">Lifecycle Summary</h2>
        <div className="air-cards">
          <ReportCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
            title="Pending Recommendations"
            value={pendingRecs}
            sub="Awaiting HR review"
            accent
          />
          <ReportCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
            title="Approved"
            value={approvedRecs}
            sub="Recommendations approved"
          />
          <ReportCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
            title="Rejected"
            value={rejectedRecs}
            sub="Recommendations rejected"
          />
          <ReportCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>}
            title="Pending Resignations"
            value={resignations.length}
            sub="Awaiting processing"
          />
        </div>
      </section>

      {/* ── Monitoring summary ── */}
      <section className="hr-panel">
        <h2 className="hr-panel-title">Monitoring Summary</h2>
        <div className="air-cards">
          <ReportCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
            title="Active Alerts"
            value={alerts.length}
            sub="Performance flags"
            accent
          />
          <ReportCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
            title="Critical Alerts"
            value={criticalAlerts}
            sub="Require immediate action"
          />
          <ReportCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
            title="Pending Decisions"
            value={decisions.length}
            sub="HR decisions queued"
          />
          <ReportCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
            title="Audit Entries"
            value={auditLog.length}
            sub="Logged lifecycle actions"
          />
        </div>
      </section>

      {/* ── Job postings table ── */}
      <section className="hr-panel">
        <h2 className="hr-panel-title">Job Postings Breakdown</h2>
        <div className="hr-table-wrap">
          <table className="hr-table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Department</th>
                <th>Status</th>
                <th>Applicants</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr><td colSpan={5} className="hr-table-empty">No job postings found.</td></tr>
              ) : (
                jobs.map((j) => (
                  <tr key={j.id}>
                    <td className="hr-cell-title">{j.title}</td>
                    <td className="muted">{j.department_name || '—'}</td>
                    <td><span className="hr-pill">{j.status}</span></td>
                    <td className="muted">{j.applicant_count ?? '—'}</td>
                    <td className="muted">{formatDate(j.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Recent audit log ── */}
      <section className="hr-panel">
        <h2 className="hr-panel-title">Recent Audit Log</h2>
        <p className="muted hr-panel-sub">AI-generated actions and HR decisions recorded in the system.</p>
        <div className="hr-table-wrap">
          <table className="hr-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.length === 0 ? (
                <tr><td colSpan={4} className="hr-table-empty">No audit entries yet.</td></tr>
              ) : (
                auditLog.slice(0, 20).map((a) => (
                  <tr key={a.id}>
                    <td className="muted">{formatDate(a.created_at)}</td>
                    <td>{a.action}</td>
                    <td>{a.entity_type}</td>
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
