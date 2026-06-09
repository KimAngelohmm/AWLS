import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api.js';
import { useEmployeeWorkspace } from '../../contexts/EmployeeWorkspaceContext.jsx';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export default function EmployeeNotificationsPage() {
  const { data: dash, reload } = useEmployeeWorkspace();
  const [notifications, setNotifications] = useState([]);
  const [loadError, setLoadError] = useState('');

  async function loadList() {
    setLoadError('');
    try {
      const json = await apiFetch('/api/employee/notifications');
      setNotifications(json.notifications || []);
    } catch (err) {
      setLoadError(err.body?.error || err.message || 'Could not load notifications');
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  async function markRead(id) {
    try {
      await apiFetch(`/api/employee/notifications/${id}/read`, { method: 'POST', body: '{}' });
      await loadList();
      reload();
    } catch (err) {
      setLoadError(err.body?.error || err.message || 'Could not mark as read');
    }
  }

  if (!dash?.employee) {
    return (
      <div className="emp-panel">
        <h1 className="emp-page-title">HR notifications</h1>
        <p className="muted">{dash?.message || 'No employee profile linked.'}</p>
      </div>
    );
  }

  return (
    <div className="emp-page">
      <header className="emp-page-head">
        <div>
          <h1 className="emp-page-title">HR notifications</h1>
          <p className="muted">Formal notices issued by Human Resources. Mark each as read after review.</p>
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
