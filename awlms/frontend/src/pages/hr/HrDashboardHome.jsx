import { Link } from 'react-router-dom';
import { useHrDashboard } from '../../contexts/HrDashboardContext.jsx';

function timeAgo(value) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function HrDashboardHome() {
  const { data, loading, error, reload } = useHrDashboard();

  if (loading && !data) {
    return (
      <div className="hdb-loading">
        <div className="hdb-loading-spinner" aria-hidden="true" />
        <p>Loading dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hdb-error">
        <div className="auth-alert" role="alert">{error}</div>
        <button type="button" className="btn btn-secondary" onClick={() => reload()}>
          Retry
        </button>
      </div>
    );
  }

  const jobs = data?.activeJobPostings ?? [];
  const pending = data?.pendingAssessments ?? [];
  const counts = data?.counts ?? {};

  const totalEmployees = counts.totalEmployees ?? 0;
  const addedThisMonth = counts.addedThisMonth ?? 0;
  const removedThisMonth = counts.removedThisMonth ?? 0;
  const netThisMonth = addedThisMonth - removedThisMonth;
  const activeInterviewsCount = counts.pendingAssessments ?? pending.length;
  const openPositionsCount = counts.activeJobPostings ?? jobs.length;

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="hdb-root">
      {/* Stat cards */}
      <div className="hdb-stats">
        <div className="hdb-stat">
          <p className="hdb-stat-label">TOTAL EMPLOYEES</p>
          <p className="hdb-stat-value">{totalEmployees}</p>
          <p className={`hdb-stat-sub ${netThisMonth >= 0 ? 'hdb-stat-sub--green' : 'hdb-stat-sub--red'}`}>
            {netThisMonth >= 0 ? `+${netThisMonth}` : netThisMonth} this month
          </p>
        </div>

        <div className="hdb-stat">
          <p className="hdb-stat-label">ACTIVE INTERVIEWS</p>
          <p className="hdb-stat-value">{activeInterviewsCount}</p>
          <p className="hdb-stat-sub hdb-stat-sub--green">AI-conducted</p>
        </div>

        <div className="hdb-stat">
          <p className="hdb-stat-label">PENDING ACTIONS</p>
          <p className="hdb-stat-value">{activeInterviewsCount > 0 ? Math.min(activeInterviewsCount, 5) : 0}</p>
          <p className={`hdb-stat-sub ${activeInterviewsCount > 0 ? 'hdb-stat-sub--red' : 'hdb-stat-sub--muted'}`}>
            {activeInterviewsCount > 0 ? `${Math.min(activeInterviewsCount, 3)} require action` : 'All clear'}
          </p>
        </div>

        <div className="hdb-stat">
          <p className="hdb-stat-label">OPEN POSITIONS</p>
          <p className="hdb-stat-value">{openPositionsCount}</p>
          <p className="hdb-stat-sub hdb-stat-sub--muted">
            {openPositionsCount > 0 ? `${Math.min(openPositionsCount, 4)} auto-reopened` : 'No positions'}
          </p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="hdb-grid">
      {/* Active Interviews section */}
        <section className="hdb-panel hdb-panel--interview">
          <div className="hdb-panel-head">
            <div className="hdb-panel-title-row">
              <h2 className="hdb-panel-title">AI Interview in Progress</h2>
            </div>
            <Link to="/hr/recruitment" className="hdb-view-all">View all →</Link>
          </div>
          {pending.length > 0 ? (
            <div>
              <p className="muted">Latest assessment in progress…</p>
              <Link to="/hr/recruitment" className="btn btn-primary">
                View AI Assessment ✦
              </Link>
            </div>
          ) : (
            <p className="muted" style={{ padding: '1rem 0' }}>No active AI interviews</p>
          )}
        </section>

        {/* Job Postings section */}
        <section className="hdb-panel hdb-panel--jobs">
          <div className="hdb-panel-head">
            <h2 className="hdb-panel-title">Job Postings</h2>
            <Link to="/hr/recruitment" className="hdb-add-link">+ Add</Link>
          </div>
          {jobs.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {jobs.slice(0, 5).map((job) => (
                <li key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.9rem' }}>{job.title}</span>
                  <span style={{ fontSize: '0.7rem', background: 'rgba(15,168,136,0.15)', color: '#0fa888', padding: '0.2rem 0.5rem', borderRadius: '3px', textTransform: 'uppercase', fontWeight: '600' }}>ACTIVE</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted" style={{ padding: '1rem 0' }}>No open positions</p>
          )}
        </section>

        {/* Performance Monitoring section */}
        <section className="hdb-panel hdb-panel--alerts">
          <div className="hdb-panel-head">
            <h2 className="hdb-panel-title">Performance Alerts</h2>
            <Link to="/hr/monitoring" className="hdb-view-all">See all →</Link>
          </div>
          <p className="muted" style={{ padding: '1rem 0' }}>
            Real-time performance monitoring dashboard
          </p>
          <Link to="/hr/monitoring" className="btn btn-secondary">
            View Monitoring ✦
          </Link>
        </section>

        {/* Recruitment Pipeline section */}
        <section className="hdb-panel hdb-panel--lifecycle">
          <div className="hdb-panel-head">
            <h2 className="hdb-panel-title">Recruitment Pipeline</h2>
            <Link to="/hr/recruitment" className="hdb-view-all">Manage →</Link>
          </div>
          <div>
            <p className="muted">
              {pending.length} interview{pending.length !== 1 ? 's' : ''} in progress across {jobs.length} position{jobs.length !== 1 ? 's' : ''}
            </p>
            <Link to="/hr/recruitment" className="btn btn-secondary">
              Go to Recruitment
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
