import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api.js';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export default function EmployeeNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  async function loadList() {
    setLoadError('');
    setLoading(true);
    try {
      const json = await apiFetch('/api/portal/notifications');
      setNotifications(json.notifications || []);
    } catch (err) {
      setLoadError(err.body?.error || err.message || 'Could not load notifications');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  async function markRead(id) {
    try {
      await apiFetch(`/api/portal/notifications/${id}/read`, { method: 'POST', body: '{}' });
      await loadList();
    } catch (err) {
      setLoadError(err.body?.error || err.message || 'Could not mark as read');
    }
  }

  if (loading) {
    return <p className="muted">Loading notifications…</p>;
  }

  return (
    <div className="emp-page">
      <header className="emp-page-head">
        <div>
          <h1 className="emp-page-title">Notifications</h1>
          <p className="muted">Notices from HR. Mark each as read after review.</p>
        </div>
        <Link to="/employee" className="btn-secondary emp-link-btn">
          Overview
        </Link>
      </header>

      {loadError ? (
        <div className="auth-alert" role="alert">
          {loadError}
        </div>
      ) : null}

      <ul className="emp-notif-cards">
        {notifications.length === 0 ? (
          <li className="muted">No notifications yet.</li>
        ) : (
          notifications.map((n) => (
            <li key={n.id} className="emp-notif-card">
              <div className="emp-notif-card-head">
                <h2>{n.title}</h2>
                {!n.read_at ? <span className="emp-badge">Unread</span> : <span className="emp-badge emp-badge--read">Read</span>}
              </div>
              <p className="emp-notif-card-meta muted">{formatDate(n.created_at)} · {n.category}</p>
              <div className="emp-notif-card-body">{n.body}</div>
              {!n.read_at ? (
                <button type="button" className="btn-secondary emp-notif-read" onClick={() => markRead(n.id)}>
                  Mark as read
                </button>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
