import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api.js';

export default function AdminHrAccounts() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', full_name: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/admin/hr-accounts');
      setUsers(data.users || []);
    } catch (err) {
      setError(err.body?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/admin/hr-accounts', {
        method: 'POST',
        body: JSON.stringify({ ...form, role: 'hr' }),
      });
      setForm({ email: '', password: '', full_name: '' });
      setShowCreate(false);
      loadUsers();
    } catch (err) {
      alert(err.body?.error || err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(userId, currentActive) {
    try {
      await apiFetch(`/api/admin/hr-accounts/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !currentActive }),
      });
      loadUsers();
    } catch (err) {
      alert(err.body?.error || err.message);
    }
  }

  async function handleDelete(userId) {
    if (!confirm('Are you sure you want to delete this HR account?')) return;
    try {
      await apiFetch(`/api/admin/hr-accounts/${userId}`, { method: 'DELETE' });
      loadUsers();
    } catch (err) {
      alert(err.body?.error || err.message);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>HR Accounts Management</h1>
        <button type="button" className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ Create HR Account'}
        </button>
      </div>

      {showCreate && (
        <div className="admin-card">
          <h2>Create New HR Account</h2>
          <form onSubmit={handleCreate}>
            <div className="field">
              <label className="field-label">Full Name</label>
              <input
                className="field-input"
                value={form.full_name}
                onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label className="field-label">Email</label>
              <input
                type="email"
                className="field-input"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label className="field-label">Password</label>
              <input
                type="password"
                className="field-input"
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                required
                minLength={8}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        </div>
      )}

      {error && <div className="auth-alert">{error}</div>}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Active</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.full_name}</td>
                  <td>{user.email}</td>
                  <td>{user.is_active ? '✅' : '❌'}</td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleToggleActive(user.id, user.is_active)}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => handleDelete(user.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}