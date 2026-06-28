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
      const [recruitRes, statsRes] = await Promise.allSettled([
        apiFetch('/api/hr/recruitment/job-positions'),
        apiFetch('/api/hr/recruitment/stats'),
      ]);

      const jobs = recruitRes.status === 'fulfilled' ? (recruitRes.value.jobPositions ?? []) : [];
      const stats = statsRes.status === 'fulfilled' ? statsRes.value : {};

      setData({ jobs, stats });
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
  const filledJobs = jobs.filter((j) => ['filled', 'hired'].includes(j.status)).length;

  const stats = data?.stats ?? {};
  const totalApplicants = stats.totalApplicants ?? 0;
  const aiInterviewsCompleted = stats.aiInterviewsCompleted ?? 0;
  const hiringDecisions = stats.hiringDecisions ?? 0;
  const offersExtended = stats.offersExtended ?? 0;

  return (
    <div className="hr-page">
      <header className="hr-page-head">
        <div>
          <h1 className="hr-page-title">AI Reports</h1>
          <p className="muted">
            Aggregated AI-generated insights across recruitment and hiring activity.
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
            value={filledJobs}
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

      {/* ── Recruitment insights ── */}
      <section className="hr-panel">
        <h2 className="hr-panel-title">Recruitment Insights</h2>
        <div className="air-cards">
          <ReportCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
            title="Total Applicants"
            value={totalApplicants}
            sub="Across all positions"
            accent
          />
          <ReportCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
            title="AI Interviews"
            value={aiInterviewsCompleted}
            sub="Completed interviews"
          />
          <ReportCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
            title="Hiring Decisions"
            value={hiringDecisions}
            sub="Approved or rejected"
            accent
          />
          <ReportCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>}
            title="Offers Extended"
            value={offersExtended}
            sub="Approved hires"
          />
        </div>
      </section>

      <section className="hr-panel">
        <h2 className="hr-panel-title">Job Postings</h2>
        <div className="air-cards">
          <ReportCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>}
            title="Open Positions"
            value={openJobs}
            sub="Accepting applications"
            accent
          />
          <ReportCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
            title="Filled Roles"
            value={filledJobs}
            sub="Recently hired"
          />
          <ReportCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
            title="Closed Positions"
            value={closedJobs}
            sub="No longer active"
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

    </div>
  );
}
