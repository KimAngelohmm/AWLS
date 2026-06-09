import { Link } from 'react-router-dom';
import { useManagerDashboard } from '../../contexts/ManagerDashboardContext.jsx';

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

function StatusDot({ status }) {
  const color =
    status === 'active'    ? '#0fa888' :
    status === 'on-leave'  ? '#f59e0b' :
    status === 'resigning' ? '#ef4444' : '#6b7280';
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        marginRight: 5,
      }}
      aria-hidden="true"
    />
  );
}

function RecommendationBadge({ type, status }) {
  if (!type) return null;
  const t = type.toLowerCase();
  const isPending = status === 'pending';
  if (t.includes('promot')) {
    return (
      <span className={`hdb-badge ${isPending ? 'hdb-badge--teal' : 'hdb-badge--gray'}`}>
        {isPending ? 'Pending' : 'Reviewed'}
      </span>
    );
  }
  if (t.includes('terminat')) {
    return (
      <span className={`hdb-badge ${isPending ? 'hdb-badge--red' : 'hdb-badge--gray'}`}>
        {isPending ? 'Pending' : 'Reviewed'}
      </span>
    );
  }
  return <span className="hdb-badge hdb-badge--gray">{type}</span>;
}

export default function ManagerHome() {
  const { data, loading, error, reload } = useManagerDashboard();

  if (loading && !data) {
    return (
      <div className="hdb-loading">
        <div className="hdb-loading-spinner" aria-hidden="true" />
        <p>Loading manager overview…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hdb-error">
        <div className="login-alert" role="alert">
          {error === 'Not Found'
            ? 'Dashboard data could not be loaded. The server may need a moment — try again.'
            : error}
        </div>
        <button
          type="button"
          className="btn-secondary"
          style={{ marginTop: '0.75rem' }}
          onClick={() => reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  const alerts = data?.performanceAlerts ?? [];
  const life = data?.lifecycleEvents ?? [];
  const recommendations = data?.lifecycleRecommendations ?? [];
  const counts = data?.counts ?? {};

  const trackedEmployees = counts.trackedEmployees ?? 0;
  const addedThisMonth = counts.addedThisMonth ?? 0;
  const removedThisMonth = counts.removedThisMonth ?? 0;
  const netThisMonth = addedThisMonth - removedThisMonth;
  const openAlertsCount = counts.openPerformanceAlerts ?? alerts.length;
  const pendingRecsCount = counts.pendingRecommendations ?? 0;

  // Employee status cards derived from lifecycle events
  const employeeCards = life.slice(0, 6).map((e) => ({
    id: e.id,
    name: e.employee_name,
    role: e.event_type,
    status: e.event_type === 'resignation' ? 'resigning' : 'active',
  }));

  return (
    <div className="hdb-root">
      {/* ── Stat cards ── */}
      <section className="hdb-stats" aria-label="Summary statistics">
        <div className="hdb-stat">
          <p className="hdb-stat-label">TEAM SIZE</p>
          <p className="hdb-stat-value">{trackedEmployees || '—'}</p>
          <p className={`hdb-stat-sub ${netThisMonth >= 0 ? 'hdb-stat-sub--green' : 'hdb-stat-sub--red'}`}>
            {netThisMonth >= 0 ? `+${netThisMonth}` : `${netThisMonth}`} this month
            {removedThisMonth > 0 && ` (−${removedThisMonth} removed)`}
          </p>
        </div>
        <div className="hdb-stat">
          <p className="hdb-stat-label">OPEN ALERTS</p>
          <p className="hdb-stat-value">{openAlertsCount}</p>
          <p className="hdb-stat-sub hdb-stat-sub--green">Performance flags</p>
        </div>
        <div className="hdb-stat">
          <p className="hdb-stat-label">PENDING DECISIONS</p>
          <p className="hdb-stat-value">{pendingRecsCount}</p>
          <p className={`hdb-stat-sub ${pendingRecsCount > 0 ? 'hdb-stat-sub--red' : 'hdb-stat-sub--muted'}`}>
            {pendingRecsCount > 0 ? `${Math.min(pendingRecsCount, 2)} awaiting HR review` : 'All clear'}
          </p>
        </div>
        <div className="hdb-stat">
          <p className="hdb-stat-label">LIFECYCLE EVENTS</p>
          <p className="hdb-stat-value">{life.length}</p>
          <p className="hdb-stat-sub hdb-stat-sub--muted">
            {life.length > 0 ? 'Require attention' : 'No active events'}
          </p>
        </div>
      </section>

      {/* ── Bento grid ── */}
      <div className="hdb-grid">

        {/* AI Performance Alerts */}
        <section className="hdb-panel hdb-panel--alerts" aria-label="AI Performance Alerts">
          <div className="hdb-panel-head">
            <div className="hdb-panel-title-row">
              <span className="hdb-panel-checkbox" aria-hidden="true" />
              <h2 className="hdb-panel-title">AI Performance Alerts</h2>
            </div>
            <Link to="/manager/monitoring" className="hdb-view-all">See all →</Link>
          </div>

          <ul className="hdb-alert-list" aria-label="Performance alerts">
            {alerts.length === 0 ? (
              <li className="hdb-alert-empty muted">No active performance alerts.</li>
            ) : (
              alerts.slice(0, 4).map((a) => {
                const label = a.title || a.body?.slice(0, 80) ||
                  (a.severity ? `Severity: ${a.severity}` : 'Performance alert');
                return (
                  <li key={a.id} className="hdb-alert-item">
                    <div className="hdb-alert-icon" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                    </div>
                    <div className="hdb-alert-body">
                      <p className="hdb-alert-title">{label}</p>
                      <p className="hdb-alert-sub muted">
                        {a.employee_name}
                        {a.job_title ? ` — ${a.job_title}` : ''}
                      </p>
                    </div>
                    <span className="hdb-alert-time muted">{timeAgo(a.created_at)}</span>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        {/* Employee Status */}
        <section className="hdb-panel hdb-panel--employees" aria-label="Employee Status">
          <div className="hdb-panel-head">
            <div className="hdb-panel-title-row">
              <span className="hdb-panel-checkbox" aria-hidden="true" />
              <h2 className="hdb-panel-title">Employee Status</h2>
            </div>
            <Link to="/manager/employees" className="hdb-view-all">View all →</Link>
          </div>

          {employeeCards.length === 0 ? (
            <p className="muted hdb-alert-empty">No recent employee activity.</p>
          ) : (
            <div className="hdb-emp-grid">
              {employeeCards.map((emp) => (
                <div key={emp.id} className="hdb-emp-card">
                  <div className="hdb-emp-avatar" aria-hidden="true">
                    {emp.name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ?? '??'}
                  </div>
                  <p className="hdb-emp-name">{emp.name}</p>
                  <p className="hdb-emp-role muted">{emp.role}</p>
                  <p className="hdb-emp-status">
                    <StatusDot status={emp.status} />
                    <span style={{ textTransform: 'capitalize' }}>{emp.status}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Lifecycle Decisions */}
        <section className="hdb-panel hdb-panel--lifecycle" aria-label="Lifecycle Decisions">
          <div className="hdb-panel-head">
            <div className="hdb-panel-title-row">
              <span className="hdb-panel-checkbox" aria-hidden="true" />
              <h2 className="hdb-panel-title">Lifecycle Decisions</h2>
            </div>
            <Link to="/manager/lifecycle" className="hdb-view-all">View all →</Link>
          </div>

          <ul className="hdb-lifecycle-list" aria-label="Lifecycle decisions">
            {recommendations.length === 0 && life.length === 0 ? (
              <li className="hdb-alert-empty muted">No pending lifecycle decisions.</li>
            ) : (
              [...recommendations.slice(0, 2), ...life.slice(0, 1)].map((item) => {
                const name = item.employee_name;
                const type = item.recommendation_type || item.event_type;
                const sub = item.recommendation_type
                  ? `${item.recommendation_type}${item.target_job_title ? ` → ${item.target_job_title}` : ''} — ${item.status ?? ''}`
                  : `Resignation — ${item.last_working_date ? `${item.last_working_date} exit` : 'pending'}`;
                return (
                  <li key={item.id} className="hdb-lifecycle-row">
                    <div className="hdb-lifecycle-avatar" aria-hidden="true">
                      {name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ?? '??'}
                    </div>
                    <div className="hdb-lifecycle-info">
                      <p className="hdb-lifecycle-name">{name}</p>
                      <p className="hdb-lifecycle-sub muted">{sub}</p>
                    </div>
                    <RecommendationBadge type={type} status={item.status} />
                  </li>
                );
              })
            )}
          </ul>

          {/* AI suggestion */}
          {alerts.length > 0 && (
            <div className="hdb-ai-suggest">
              <span className="hdb-ai-suggest-icon" aria-hidden="true">✦</span>
              <p className="muted">
                <strong style={{ color: '#fff' }}>AI suggests:</strong>{' '}
                Review {alerts[0]?.employee_name}'s performance — {openAlertsCount} alert{openAlertsCount !== 1 ? 's' : ''} flagged in your team.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
