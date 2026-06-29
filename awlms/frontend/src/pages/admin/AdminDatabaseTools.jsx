import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api.js';

export default function AdminDatabaseTools() {
  const [migrations, setMigrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const loadMigrations = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/database/migrations');
      setMigrations(data.migrations || []);
    } catch (err) {
      setError(err.body?.error || 'Failed to load migrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMigrations(); }, []);

  const handleBackup = async () => {
    if (!confirm('This will create a database backup. Continue?')) return;
    setActionLoading('backup');
    try {
      const data = await apiFetch('/api/admin/database/backup', { method: 'POST' });
      alert(`Backup created successfully: ${data.filename}`);
    } catch (err) {
      alert(err.body?.error || 'Failed to create backup');
    } finally {
      setActionLoading('');
    }
  };

  const handleExport = async () => {
    if (!confirm('This will export the database. Continue?')) return;
    setActionLoading('export');
    try {
      const data = await apiFetch('/api/admin/database/export', { method: 'POST' });
      alert(`Export created: ${data.filename}`);
    } catch (err) {
      alert(err.body?.error || 'Failed to export database');
    } finally {
      setActionLoading('');
    }
  };

  const handleRestore = async () => {
    const backupFile = prompt('Enter the backup filename to restore:');
    if (!backupFile) return;
    if (!confirm(`WARNING: This will restore from "${backupFile}". All current data will be replaced! Are you sure?`)) return;
    if (!confirm('This action cannot be undone. Type "RESTORE" to confirm:')) return;
    
    setActionLoading('restore');
    try {
      await apiFetch('/api/admin/database/restore', {
        method: 'POST',
        body: JSON.stringify({ filename: backupFile }),
      });
      alert('Database restored successfully');
    } catch (err) {
      alert(err.body?.error || 'Failed to restore database');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Database Tools</h1>
      </div>

      {error && <div className="auth-alert">{error}</div>}

      {/* Actions */}
      <div className="admin-section">
        <h2>Database Operations</h2>
        <div className="db-actions">
          <button 
            className="db-action-btn" 
            onClick={handleBackup}
            disabled={actionLoading === 'backup'}
          >
            <span className="db-action-icon">💾</span>
            <span className="db-action-label">Create Backup</span>
            <span className="db-action-desc">Download a full database backup</span>
          </button>
          
          <button 
            className="db-action-btn" 
            onClick={handleExport}
            disabled={actionLoading === 'export'}
          >
            <span className="db-action-icon">📤</span>
            <span className="db-action-label">Export Data</span>
            <span className="db-action-desc">Export all tables to SQL file</span>
          </button>
          
          <button 
            className="db-action-btn danger" 
            onClick={handleRestore}
            disabled={actionLoading === 'restore'}
          >
            <span className="db-action-icon">📥</span>
            <span className="db-action-label">Restore Backup</span>
            <span className="db-action-desc">Restore from a previous backup</span>
          </button>
        </div>
      </div>

      {/* Migration History */}
      <div className="admin-section">
        <h2>Migration History</h2>
        {loading ? (
          <p>Loading migrations...</p>
        ) : migrations.length === 0 ? (
          <p className="muted">No migrations found</p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Migration</th>
                  <th>Applied At</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {migrations.map((m, idx) => (
                  <tr key={idx}>
                    <td>{m.name}</td>
                    <td>{m.applied_at ? new Date(m.applied_at).toLocaleString() : '-'}</td>
                    <td>
                      <span className={`badge ${m.status === 'applied' ? 'badge-approved' : 'badge-pending'}`}>
                        {m.status || 'applied'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Database Info */}
      <div className="admin-section">
        <h2>Database Information</h2>
        <div className="admin-info-grid">
          <div><strong>Database Name:</strong> awlms</div>
          <div><strong>Engine:</strong> MySQL</div>
          <div><strong>Character Set:</strong> utf8mb4</div>
          <div><strong>Collation:</strong> utf8mb4_unicode_ci</div>
        </div>
        <p className="muted small" style={{ marginTop: '1rem' }}>
          ⚠️ Always create a backup before performing restore operations. 
          Database modifications can affect system stability.
        </p>
      </div>
    </div>
  );
}
