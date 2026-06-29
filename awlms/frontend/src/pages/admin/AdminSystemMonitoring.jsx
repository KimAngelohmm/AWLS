import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api.js';

export default function AdminSystemMonitoring() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const data = await apiFetch('/api/admin/system-status');
      setStatus(data);
      setError('');
    } catch (err) {
      setError(err.body?.error || 'Failed to load system status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const getStatusColor = (serviceStatus) => {
    if (serviceStatus === 'ok') return '#22c55e';
    if (serviceStatus === 'warning') return '#f59e0b';
    return '#ef4444';
  };

  const getStatusLabel = (serviceStatus) => {
    if (serviceStatus === 'ok') return 'Operational';
    if (serviceStatus === 'warning') return 'Degraded';
    return 'Down';
  };

  if (loading) return <div className="admin-page"><p>Loading system status...</p></div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>System Monitoring</h1>
        <button 
          className="btn btn-secondary" 
          onClick={() => loadStatus(true)}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {error && <div className="auth-alert">{error}</div>}

      {/* Service Status Overview */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card" style={{ borderLeft: `4px solid ${getStatusColor(status?.backend)}` }}>
          <h3>Backend Service</h3>
          <p className="admin-stat-value" style={{ color: getStatusColor(status?.backend) }}>
            {getStatusLabel(status?.backend)}
          </p>
          <p className="muted small">Response: {status?.backendResponseTime || 'N/A'}</p>
        </div>

        <div className="admin-stat-card" style={{ borderLeft: `4px solid ${getStatusColor(status?.database)}` }}>
          <h3>Database</h3>
          <p className="admin-stat-value" style={{ color: getStatusColor(status?.database) }}>
            {getStatusLabel(status?.database)}
          </p>
          <p className="muted small">Connections: {status?.dbConnections || 0}</p>
        </div>

        <div className="admin-stat-card" style={{ borderLeft: `4px solid ${getStatusColor(status?.email)}` }}>
          <h3>Email Service</h3>
          <p className="admin-stat-value" style={{ color: getStatusColor(status?.email) }}>
            {getStatusLabel(status?.email)}
          </p>
          <p className="muted small">Queue: {status?.emailQueue || 0}</p>
        </div>

        <div className="admin-stat-card" style={{ borderLeft: `4px solid ${getStatusColor(status?.ai)}` }}>
          <h3>AI Service</h3>
          <p className="admin-stat-value" style={{ color: getStatusColor(status?.ai) }}>
            {getStatusLabel(status?.ai)}
          </p>
          <p className="muted small">Active: {status?.activeAiChats || 0}</p>
        </div>
      </div>

      {/* System Resources */}
      <div className="admin-section">
        <h2>System Resources</h2>
        <div className="admin-resources-grid">
          <div className="resource-item">
            <div className="resource-header">
              <span>Memory Usage</span>
              <span>{status?.memoryUsage || '0%'}</span>
            </div>
            <div className="resource-bar">
              <div 
                className="resource-bar-fill" 
                style={{ 
                  width: (status?.memoryUsagePercent || 0) + '%',
                  backgroundColor: (status?.memoryUsagePercent || 0) > 80 ? '#ef4444' : '#22c55e'
                }}
              ></div>
            </div>
          </div>

          <div className="resource-item">
            <div className="resource-header">
              <span>CPU Usage</span>
              <span>{status?.cpuUsage || '0%'}</span>
            </div>
            <div className="resource-bar">
              <div 
                className="resource-bar-fill" 
                style={{ 
                  width: (status?.cpuUsagePercent || 0) + '%',
                  backgroundColor: (status?.cpuUsagePercent || 0) > 80 ? '#ef4444' : '#22c55e'
                }}
              ></div>
            </div>
          </div>

          <div className="resource-item">
            <div className="resource-header">
              <span>Disk Usage</span>
              <span>{status?.diskUsage || '0%'}</span>
            </div>
            <div className="resource-bar">
              <div 
                className="resource-bar-fill" 
                style={{ 
                  width: (status?.diskUsagePercent || 0) + '%',
                  backgroundColor: (status?.diskUsagePercent || 0) > 80 ? '#ef4444' : '#22c55e'
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Users & Sessions */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <h3>Active Users</h3>
          <p className="admin-stat-value">{status?.activeUsers || 0}</p>
        </div>
        <div className="admin-stat-card">
          <h3>Active Sessions</h3>
          <p className="admin-stat-value">{status?.activeSessions || 0}</p>
        </div>
        <div className="admin-stat-card">
          <h3>Running Interviews</h3>
          <p className="admin-stat-value">{status?.runningInterviews || 0}</p>
        </div>
        <div className="admin-stat-card">
          <h3>API Requests Today</h3>
          <p className="admin-stat-value">{status?.apiRequestsToday || 0}</p>
        </div>
      </div>

      {/* Recent Errors */}
      {status?.recentErrors?.length > 0 && (
        <div className="admin-section admin-error-section">
          <h2>⚠️ Recent Errors</h2>
          <div className="error-list">
            {status.recentErrors.map((err, idx) => (
              <div key={idx} className="error-item">
                <span className="error-time">{new Date(err.timestamp).toLocaleString()}</span>
                <span className="error-message">{err.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uptime */}
      <div className="admin-section">
        <h2>Uptime Information</h2>
        <div className="admin-info-grid">
          <div><strong>Server Start Time:</strong> {status?.serverStartTime ? new Date(status.serverStartTime).toLocaleString() : 'N/A'}</div>
          <div><strong>Uptime:</strong> {status?.uptime || 'N/A'}</div>
          <div><strong>Last Database Check:</strong> {status?.lastDbCheck ? new Date(status.lastDbCheck).toLocaleString() : 'N/A'}</div>
          <div><strong>Environment:</strong> {import.meta.env?.MODE || 'production'}</div>
        </div>
      </div>
    </div>
  );
}
