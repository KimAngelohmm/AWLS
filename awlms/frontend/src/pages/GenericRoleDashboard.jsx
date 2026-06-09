import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';
import { roleLabel } from '../lib/roles.js';

export default function GenericRoleDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [portal, setPortal] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadError('');
      try {
        const data = await apiFetch(`/api/portal/${user.role}`);
        if (!cancelled) setPortal(data);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.body?.error || err.message || 'Could not load your workspace');
        }
      }
    }
    if (user?.role) load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="dash">
      <header className="dash-header">
        <div>
          <p className="dash-kicker">Signed in as</p>
          <h1 className="dash-title">{user.full_name}</h1>
          <p className="muted">
            {roleLabel(user.role)} · {user.email}
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={handleLogout}>
          Sign out
        </button>
      </header>

      {loadError ? (
        <div className="auth-alert" role="alert">
          {loadError}
        </div>
      ) : null}

      {!portal && !loadError ? (
        <p className="muted">Loading your workspace…</p>
      ) : null}

      {portal ? (
        <section className="dash-section">
          <h2 className="dash-section-title">{portal.title}</h2>
          <p className="muted">
            Only modules assigned to your role are shown. Other roles cannot access this data through the API.
          </p>
          <ul className="dash-grid">
            {portal.modules.map((m) => (
              <li key={m.id} className="dash-card">
                <h3>{m.name}</h3>
                <p className="muted">{m.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
