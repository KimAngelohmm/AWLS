import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api.js';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/audit-logs');
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.body?.error || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, []);

  const filteredLogs = logs.filter(log => {
    const matchSearch = !filter ||
      log.action?.toLowerCase().includes(filter.toLowerCase()) ||
      log.email?.toLowerCase().includes(filter.toLowerCase()) ||
      log.details?.toLowerCase().includes(filter.toLowerCase());
    
    const matchAction = !actionFilter || log.action === actionFilter;
    
    const logDate = new Date(log.created_at);
    const matchFrom = !dateFrom || logDate >= new Date(dateFrom);
    const matchTo = !dateTo || logDate <= new Date(dateTo + 'T23:59:59');
    
    return matchSearch && matchAction && matchFrom && matchTo;
  });

  const getActionColor = (action) => {
    const colors = {
      login: '#0fa888',
      logout: '#6b7280',
      'failed_login': '#ef4444',
      'password_reset': '#f59e0b',
      'user_created': '#3b82f6',
      'user_updated': '#8b5cf6',
      'user_deleted': '#ef4444',
      'role_changed': '#f59e0b',
    };
    return colors[action] || '#6b7280';
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleString();
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Audit Logs</h1>
        <button className="btn btn-secondary" onClick={loadLogs} disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      <div className="admin-filters">
        <input
          type="text"
          placeholder="Search logs..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="admin-search"
        />
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="">All Actions</option>
          <option value="login">Login</option>
          <option value="failed_login">Failed Login</option>
          <option value="password_reset">Password Reset</option>
          <option value="user_created">User Created</option>
          <option value="user_updated">User Updated</option>
          <option value="user_deleted">User Deleted</option>
          <option value="role_changed">Role Changed</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="From"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="To"
        />
      </div>

      {loading ? (
        <p>Loading audit logs...</p>
      ) : error ? (
        <div className="auth-alert">{error}</div>
      ) : (
        <>
          <p className="admin-log-count">{filteredLogs.length} log entries</p>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center muted">No audit logs found</td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <tr key={log.id || idx}>
                      <td>{formatTimestamp(log.created_at)}</td>
                      <td>
                        <span 
                          className="audit-action-badge"
                          style={{ backgroundColor: `${getActionColor(log.action)}20`, color: getActionColor(log.action) }}
                        >
                          {log.action || 'unknown'}
                        </span>
                      </td>
                      <td>
                        <div>{log.email}</div>
                        <div className="muted small">{log.role}</div>
                      </td>
                      <td className="small">{log.details || '-'}</td>
                      <td className="small muted">{log.ip_address || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
