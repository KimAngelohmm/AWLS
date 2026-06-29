import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api.js';

const ROLES = ['admin', 'hr', 'manager', 'employee'];

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/all-users');
      setUsers(data.users || []);
    } catch (err) {
      setError(err.body?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (formData) => {
    setActionLoading('create');
    try {
      await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setShowCreateModal(false);
      loadUsers();
    } catch (err) {
      alert(err.body?.error || 'Failed to create user');
    } finally {
      setActionLoading('');
    }
  };

  const handleUpdate = async (id, formData) => {
    setActionLoading(id);
    try {
      await apiFetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(formData),
      });
      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      alert(err.body?.error || 'Failed to update user');
    } finally {
      setActionLoading('');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    setActionLoading(id);
    try {
      await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      loadUsers();
    } catch (err) {
      alert(err.body?.error || 'Failed to delete user');
    } finally {
      setActionLoading('');
    }
  };

  const handleToggleActive = async (user) => {
    setActionLoading(user.id);
    try {
      await apiFetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      loadUsers();
    } catch (err) {
      alert(err.body?.error || 'Failed to update user');
    } finally {
      setActionLoading('');
    }
  };

  const handleUnlock = async (user) => {
    setActionLoading(user.id);
    try {
      await apiFetch(`/api/admin/users/${user.id}/unlock`, { method: 'POST' });
      loadUsers();
    } catch (err) {
      alert(err.body?.error || 'Failed to unlock account');
    } finally {
      setActionLoading('');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = !filter || 
      u.email.toLowerCase().includes(filter.toLowerCase()) ||
      u.full_name.toLowerCase().includes(filter.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const getRoleBadge = (role) => {
    const colors = {
      admin: 'badge-admin',
      hr: 'badge-hr',
      manager: 'badge-manager',
      employee: 'badge-employee',
    };
    return <span className={`badge ${colors[role] || 'badge-default'}`}>{role}</span>;
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>User Management</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Create User
        </button>
      </div>

      <div className="admin-filters">
        <input
          type="text"
          placeholder="Search by email or name..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="admin-search"
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {loading ? (
        <p>Loading users...</p>
      ) : error ? (
        <div className="auth-alert">{error}</div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.full_name}</td>
                  <td>{getRoleBadge(user.role)}</td>
                  <td>
                    {user.is_active ? (
                      <span className="status-active">Active</span>
                    ) : (
                      <span className="status-inactive">Inactive</span>
                    )}
                  </td>
                  <td>{user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}</td>
                  <td>
                    <div className="admin-actions">
                      <button
                        className="btn-icon"
                        title="Edit"
                        onClick={() => { setSelectedUser(user); setShowEditModal(true); }}
                        disabled={actionLoading === user.id}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon"
                        title={user.is_active ? 'Deactivate' : 'Activate'}
                        onClick={() => handleToggleActive(user)}
                        disabled={actionLoading === user.id}
                      >
                        {user.is_active ? '🔴' : '🟢'}
                      </button>
                      {user.locked_until && new Date(user.locked_until) > new Date() && (
                        <button
                          className="btn-icon"
                          title="Unlock"
                          onClick={() => handleUnlock(user)}
                          disabled={actionLoading === user.id}
                        >
                          🔓
                        </button>
                      )}
                      <button
                        className="btn-icon btn-danger"
                        title="Delete"
                        onClick={() => handleDelete(user.id)}
                        disabled={actionLoading === user.id || user.role === 'admin'}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <UserModal
          title="Create User"
          onSave={handleCreate}
          onClose={() => setShowCreateModal(false)}
          loading={actionLoading === 'create'}
        />
      )}

      {showEditModal && selectedUser && (
        <UserModal
          title="Edit User"
          user={selectedUser}
          onSave={(data) => handleUpdate(selectedUser.id, data)}
          onClose={() => { setShowEditModal(false); setSelectedUser(null); }}
          loading={actionLoading === selectedUser.id}
        />
      )}
    </div>
  );
}

function UserModal({ title, user, onSave, onClose, loading }) {
  const [form, setForm] = useState({
    email: user?.email || '',
    password: '',
    full_name: user?.full_name || '',
    role: user?.role || 'employee',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>{title}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
              disabled={!!user}
            />
          </div>
          {!user && (
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required={!user}
                minLength={8}
              />
            </div>
          )}
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              required
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
