import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [lockedAccounts, setLockedAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [dashboardData, usersData] = await Promise.all([
          apiFetch('/api/admin/dashboard'),
          apiFetch('/api/admin/all-users'),
        ]);
        setStats(dashboardData);
        
        const users = usersData.users || [];
        // Recent users (sorted by creation)
        setRecentUsers(users.slice(0, 5));
        // Locked accounts
        setLockedAccounts(users.filter(u => u.locked_until && new Date(u.locked_until) > new Date()));
      } catch (err) {
        setError(err.body?.error || err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div className="admin-page"><p>Loading dashboard...</p></div>;
  if (error) return <div className="admin-page"><div className="auth-alert">{error}</div></div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Administrator Dashboard</h1>
        <Link to="/admin/users" className="btn btn-primary">Manage Users</Link>
      </div>

      {/* Welcome Section */}
      <div className="admin-welcome">
        <h2>Welcome, {user?.full_name || 'Administrator'}</h2>
        <p>You have full access to all system features.</p>
      </div>

      {/* Statistics Grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <h3>Total Users</h3>
          <p className="admin-stat-value">{stats?.totalUsers || 0}</p>
          <Link to="/admin/users" className="admin-stat-link">View all →</Link>
        </div>
        <div className="admin-stat-card">
          <h3>Administrators</h3>
          <p className="admin-stat-value">{stats?.adminCount || 0}</p>
        </div>
        <div className="admin-stat-card">
          <h3>HR Personnel</h3>
          <p className="admin-stat-value">{stats?.hrCount || 0}</p>
          <Link to="/admin/hr-accounts" className="admin-stat-link">Manage HR →</Link>
        </div>
        <div className="admin-stat-card">
          <h3>Managers</h3>
          <p className="admin-stat-value">{stats?.managerCount || 0}</p>
        </div>
        <div className="admin-stat-card">
          <h3>Employees</h3>
          <p className="admin-stat-value">{stats?.employeeCount || 0}</p>
          <Link to="/admin/employees" className="admin-stat-link">View employees →</Link>
        </div>
        <div className="admin-stat-card">
          <h3>Active Applicants</h3>
          <p className="admin-stat-value">{stats?.applicantCount || 0}</p>
          <Link to="/admin/recruitment" className="admin-stat-link">View recruitment →</Link>
        </div>
        <div className="admin-stat-card">
          <h3>Open Positions</h3>
          <p className="admin-stat-value">{stats?.positionCount || 0}</p>
        </div>
        <div className="admin-stat-card">
          <h3>Departments</h3>
          <p className="admin-stat-value">{stats?.departmentCount || 0}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="admin-section">
        <h2>Quick Actions</h2>
        <div className="admin-quick-actions">
          <Link to="/admin/users" className="admin-action-card">
            <span className="action-icon">👤</span>
            <span className="action-label">Create User</span>
          </Link>
          <Link to="/admin/audit-logs" className="admin-action-card">
            <span className="action-icon">🔒</span>
            <span className="action-label">View Audit Logs</span>
          </Link>
          <Link to="/admin/settings" className="admin-action-card">
            <span className="action-icon">⚙️</span>
            <span className="action-label">System Settings</span>
          </Link>
          <Link to="/admin/recruitment" className="admin-action-card">
            <span className="action-icon">📋</span>
            <span className="action-label">Recruitment</span>
          </Link>
        </div>
      </div>

      {/* Locked Accounts Warning */}
      {lockedAccounts.length > 0 && (
        <div className="admin-section admin-warning">
          <h2>⚠️ Locked Accounts ({lockedAccounts.length})</h2>
          <p className="muted">The following accounts are temporarily locked due to failed login attempts:</p>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Locked Until</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {lockedAccounts.slice(0, 5).map(u => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{new Date(u.locked_until).toLocaleString()}</td>
                    <td>
                      <Link to={`/admin/users`} className="btn-link">Unlock</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Users */}
      <div className="admin-section">
        <h2>Recent Users</h2>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map(u => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.full_name}</td>
                  <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                  <td>
                    {u.is_active ? (
                      <span className="status-active">Active</span>
                    ) : (
                      <span className="status-inactive">Inactive</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Information */}
      <div className="admin-section">
        <h2>System Information</h2>
        <div className="admin-info-grid">
          <div><strong>Version:</strong> 1.0.0</div>
          <div><strong>Database:</strong> MySQL</div>
          <div><strong>AI Provider:</strong> OpenAI</div>
          <div><strong>Environment:</strong> {import.meta.env?.MODE || 'production'}</div>
        </div>
      </div>
    </div>
  );
}