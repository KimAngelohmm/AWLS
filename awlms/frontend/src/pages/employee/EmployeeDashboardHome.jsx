import { Link } from 'react-router-dom';
import { useEmployeeWorkspace } from '../../contexts/EmployeeWorkspaceContext.jsx';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function parseMetrics(raw) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}

export default function EmployeeDashboardHome() {
  const { data, loading, error, reload } = useEmployeeWorkspace();

  if (loading && !data) {
    return <p className="muted">Loading your dashboard…</p>;
  }

  if (error) {
    return (
      <div>
        <div className="auth-alert" role="alert">
          {error}
        </div>
        <button type="button" className="btn-secondary emp-retry" onClick={() => reload()}>
          Retry
        </button>
      </div>
    );
  }

  if (!data?.employee) {
    return (
      <div className="emp-panel">
        <h1 className="emp-page-title">Employee dashboard</h1>
        <p className="muted">{data?.message || 'No employee profile is linked to this account yet.'}</p>
      </div>
    );
  }

  const perf = data.performanceRecords || [];
  const notes = data.notifications || [];
  const unread = data.unreadNotificationCount ?? 0;
  const chat = data.resignationMessages || [];
  const pending = data.pendingResignation;

  return (
    <div className="emp-page">
      <header className="emp-page-head">
        <div className="emp-header-content">
          <h1 className="emp-page-title">Welcome back 👋</h1>
          <p className="emp-header-subtitle">
            <span className="emp-header-role">{data.employee.job_title || 'Your role'}</span>
            {data.employee.department_name && <span className="emp-header-sep">•</span>}
            {data.employee.department_name && <span className="emp-header-dept">{data.employee.department_name}</span>}
          </p>
        </div>
        <button type="button" className="btn-refresh" onClick={() => reload()}>
          ↻ Refresh
        </button>
      </header>

      {pending ? (
        <div className="emp-banner emp-banner--warning" role="status">
          <span className="emp-banner-icon">⚠️</span>
          <div>
            <strong>Resignation in progress</strong>
            <p>Submitted {formatDate(pending.resignation_submitted_at)} · Last working day {pending.last_working_date || 'TBD'}</p>
          </div>
        </div>
      ) : null}

      <section className="emp-stat-grid">
        <Link to="/employee/performance" className="emp-stat emp-stat--perf">
          <div className="emp-stat-icon">📊</div>
          <span className="emp-stat-value">{perf.length}</span>
          <span className="emp-stat-label">Performance Entries</span>
          <span className="emp-stat-action">View History →</span>
        </Link>
        <Link to="/employee/notifications" className="emp-stat emp-stat--notif">
          <div className="emp-stat-icon">📬</div>
          <span className="emp-stat-value">{unread}</span>
          <span className="emp-stat-label">Unread Notices</span>
          <span className="emp-stat-action">Open Inbox →</span>
        </Link>
        <Link to="/employee/resignation" className="emp-stat emp-stat--assist">
          <div className="emp-stat-icon">🤖</div>
          <span className="emp-stat-value">{chat.length}</span>
          <span className="emp-stat-label">AI Chat Messages</span>
          <span className="emp-stat-action">Open Assistant →</span>
        </Link>
      </section>

      <section className="emp-panel emp-panel--performance">
        <div className="emp-panel-head">
          <div>
            <h2 className="emp-panel-title">📈 Performance Records</h2>
            <p className="emp-panel-desc">Your recent performance evaluations</p>
          </div>
          <Link to="/employee/performance" className="emp-inline-link">
            See all →
          </Link>
        </div>
        {perf.length === 0 ? (
          <div className="emp-empty-state">
            <div className="emp-empty-icon">📋</div>
            <p className="emp-empty-text">No performance records yet</p>
            <p className="emp-empty-hint">Your performance evaluations will appear here</p>
          </div>
        ) : (
          <div className="emp-records-list">
            {perf.slice(0, 4).map((row) => {
              const m = parseMetrics(row.metrics);
              const summary = m.label || m.message || JSON.stringify(m);
              return (
                <div key={row.id} className="emp-record-item">
                  <div className="emp-record-meta">
                    <span className="emp-record-date">{formatDate(row.recorded_at)}</span>
                    <span className="emp-record-source">{row.source}</span>
                  </div>
                  <p className="emp-record-text">{summary}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="emp-panel emp-panel--notifications">
        <div className="emp-panel-head">
          <div>
            <h2 className="emp-panel-title">📧 HR Notifications</h2>
            <p className="emp-panel-desc">Stay updated with official HR communications</p>
          </div>
          <Link to="/employee/notifications" className="emp-inline-link">
            See all →
          </Link>
        </div>
        {notes.length === 0 ? (
          <div className="emp-empty-state">
            <div className="emp-empty-icon">📨</div>
            <p className="emp-empty-text">No notifications yet</p>
            <p className="emp-empty-hint">You're all caught up!</p>
          </div>
        ) : (
          <div className="emp-notif-list">
            {notes.slice(0, 3).map((n) => (
              <div key={n.id} className="emp-notif-card">
                <div className="emp-notif-header">
                  <h3 className="emp-notif-title">{n.title}</h3>
                  {!n.read_at && <span className="emp-notif-badge">New</span>}
                </div>
                <p className="emp-notif-body">{(n.body || '').slice(0, 120)}{(n.body || '').length > 120 ? '…' : ''}</p>
                <p className="emp-notif-time">{formatDate(n.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="emp-panel emp-panel--ai">
        <div className="emp-panel-head">
          <div>
            <h2 className="emp-panel-title">🤖 AI Resignation Assistant</h2>
            <p className="emp-panel-desc">Discuss resignation privately with our AI</p>
          </div>
          <Link to="/employee/resignation" className="emp-inline-link">
            Open Chat →
          </Link>
        </div>
        {chat.length === 0 ? (
          <div className="emp-empty-state">
            <div className="emp-empty-icon">💬</div>
            <p className="emp-empty-text">No messages yet</p>
            <p className="emp-empty-hint">Start a conversation with the AI assistant</p>
          </div>
        ) : (
          <div className="emp-ai-preview">
            <p className="emp-ai-intro">Latest messages:</p>
            {chat.slice(-2).map((m) => (
              <div key={m.id} className={`emp-ai-msg emp-ai-msg--${m.speaker}`}>
                <span className="emp-ai-who">{m.speaker === 'user' ? 'You' : 'Assistant'}</span>
                <p className="emp-ai-text">{m.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
