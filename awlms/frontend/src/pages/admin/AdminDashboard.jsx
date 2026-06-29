import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [lockedAccounts, setLockedAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [dashboardData, usersData, statusData] = await Promise.all([
          apiFetch('/api/admin/dashboard'),
          apiFetch('/api/admin/all-users'),
          apiFetch('/api/admin/system-status').catch(() => null),
        ]);
        setStats(dashboardData);
        setSystemStatus(statusData);
        
        const users = usersData.users || [];
        setRecentUsers(users.slice(0, 5));
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
        <div>
          <h1>Administrator Dashboard</h1>
          <p className="muted">Welcome back, {user?.full_name || 'Administrator'}</p>
        </div>
        <Link to="/admin/users" className="btn btn-primary">Manage Users</Link>
      </div>

      {/* System Status Bar */}
      <div className="admin-status-bar">
        <div className="status-item">
          <span className={`status-dot ${systemStatus?.backend === 'ok' ? 'status-ok' : 'status-error'}`}></span>
          <span>Backend</span>
        </div>
        <div className="status-item">
          <span className={`status-dot ${systemStatus?.database === 'ok' ? 'status-ok' : 'status-error'}`}></span>
          <span>Database</span>
        </div>
        <div className="status-item">
          <span className="status-dot status-ok"></span>
          <span>Email Service</span>
        </div>
        <div className="status-item">
          <span className="status-dot status-ok"></span>
          <span>AI Service</span>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <h3>Total Users</h3>
          <p className="admin-stat-value">{stats?.totalUsers || 0}</p>
          <Link to="/admin/users" className="admin-stat-link">Manage →</Link>
        </div>
        <div className="admin-stat-card">
          <h3>Administrators</h3>
          <p className="admin-stat-value">{stats?.adminCount || 0}</p>
        </div>
        <div className="admin-stat-card">
          <h3>HR Personnel</h3>
          <p className="admin-stat-value">{stats?.hrCount || 0}</p>
          <Link to="/admin/hr-accounts" className="admin-stat-link">View →</Link>
        </div>
        <div className="admin-stat-card">
          <h3>Managers</h3>
          <p className="admin-stat-value">{stats?.managerCount || 0}</p>
        </div>
        <div className="admin-stat-card">
          <h3>Employees</h3>
          <p className="admin-stat-value">{stats?.employeeCount || 0}</p>
          <Link to="/admin/employees" className="admin-stat-link">View →</Link>
        </div>
        <div className="admin-stat-card">
          <h3>Active Applicants</h3>
          <p className="admin-stat-value">{stats?.applicantCount || 0}</p>
          <Link to="/admin/recruitment" className="admin-stat-link">View →</Link>
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
          <Link to="/admin/recruitment" className="admin-action-card">
            <span className="action-icon">📋</span>
            <span className="action-label">Recruitment</span>
          </Link>
          <Link to="/admin/audit-logs" className="admin-action-card">
            <span className="action-icon">📜</span>
            <span className="action-label">Audit Logs</span>
          </Link>
          <Link to="/admin/admin-settings" className="admin-action-card">
            <span className="action-icon">⚙️</span>
            <span className="action-label">Settings</span>
          </Link>
          <Link to="/admin/monitoring" className="admin-action-card">
            <span className="action-icon">📊</span>
            <span className="action-label">Monitoring</span>
          </Link>
          <Link to="/admin/announcements" className="admin-action-card">
            <span className="action-icon">📢</span>
            <span className="action-label">Announcements</span>
          </Link>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="admin-grid-2">
        {/* Locked Accounts Warning */}
        <div className="admin-section">
          <h2>⚠️ Locked Accounts</h2>
          {lockedAccounts.length > 0 ? (
            <>
              <p className="muted">{lockedAccounts.length} account(s) temporarily locked</p>
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Locked Until</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lockedAccounts.slice(0, 3).map(u => (
                      <tr key={u.id}>
                        <td>{u.email}</td>
                        <td>{u.role}</td>
                        <td>{new Date(u.locked_until).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="muted">No locked accounts</p>
          )}
        </div>

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
                </tr>
              </thead>
              <tbody>
                {recentUsers.map(u => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.full_name}</td>
                    <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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