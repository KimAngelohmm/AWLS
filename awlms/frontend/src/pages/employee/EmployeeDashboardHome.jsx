import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api.js';

export default function EmployeeDashboardHome() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/portal/notifications/unread-count')
      .then((d) => setUnreadCount(d.count ?? 0))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="emp-page">
      <header className="emp-page-head">
        <div className="emp-header-content">
          <h1 className="emp-page-title">Welcome back 👋</h1>
          <p className="emp-header-subtitle">Your recruitment workspace</p>
        </div>
      </header>

      <section className="emp-stat-grid">
        <Link to="/employee/notifications" className="emp-stat emp-stat--notif">
          <div className="emp-stat-icon">📬</div>
          <span className="emp-stat-value">{loading ? '…' : unreadCount}</span>
          <span className="emp-stat-label">Unread Notifications</span>
          <span className="emp-stat-action">Open Inbox →</span>
        </Link>
        <Link to="/employee/directory" className="emp-stat emp-stat--dir">
          <div className="emp-stat-icon">👥</div>
          <span className="emp-stat-value">—</span>
          <span className="emp-stat-label">Personnel Directory</span>
          <span className="emp-stat-action">View Directory →</span>
        </Link>
        <Link to="/employee/ai-chat" className="emp-stat emp-stat--assist">
          <div className="emp-stat-icon">🤖</div>
          <span className="emp-stat-value">AI</span>
          <span className="emp-stat-label">AI Assistant</span>
          <span className="emp-stat-action">Start Chat →</span>
        </Link>
      </section>

      <section className="emp-panel">
        <div className="emp-panel-head">
          <div>
            <h2 className="emp-panel-title">💼 Your Application</h2>
            <p className="emp-panel-desc">Browse open positions and track your application status</p>
          </div>
        </div>
        <div className="emp-empty-state">
          <div className="emp-empty-icon">📋</div>
          <p className="emp-empty-text">Check open job positions</p>
          <p className="emp-empty-hint">View available roles and apply through the careers page</p>
          <a href="/careers" className="btn btn-secondary" style={{ marginTop: '1rem', display: 'inline-block' }}>
            View Positions
          </a>
        </div>
      </section>
    </div>
  );
}
