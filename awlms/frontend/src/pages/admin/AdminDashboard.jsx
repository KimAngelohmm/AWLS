import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api.js';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await apiFetch('/api/admin/dashboard');
        setStats(data);
      } catch (err) {
        setError(err.body?.error || err.message);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) return <div className="admin-page"><p>Loading dashboard...</p></div>;
  if (error) return <div className="admin-page"><div className="auth-alert">{error}</div></div>;

  return (
    <div className="admin-page">
      <h1>Administrator Dashboard</h1>
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <h3>Total Users</h3>
          <p className="admin-stat-value">{stats?.totalUsers || 0}</p>
        </div>
        <div className="admin-stat-card">
          <h3>HR Accounts</h3>
          <p className="admin-stat-value">{stats?.hrCount || 0}</p>
        </div>
        <div className="admin-stat-card">
          <h3>Employees</h3>
          <p className="admin-stat-value">{stats?.employeeCount || 0}</p>
        </div>
        <div className="admin-stat-card">
          <h3>Job Positions</h3>
          <p className="admin-stat-value">{stats?.positionCount || 0}</p>
        </div>
        <div className="admin-stat-card">
          <h3>Active Applicants</h3>
          <p className="admin-stat-value">{stats?.applicantCount || 0}</p>
        </div>
        <div className="admin-stat-card">
          <h3>Departments</h3>
          <p className="admin-stat-value">{stats?.departmentCount || 0}</p>
        </div>
      </div>
      <div className="admin-section">
        <h2>System Information</h2>
        <p><strong>Version:</strong> 1.0.0</p>
        <p><strong>Database:</strong> MySQL</p>
        <p><strong>AI Provider:</strong> OpenAI</p>
      </div>
    </div>
  );
}