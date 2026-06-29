import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api.js';

export default function AdminSystemSettings() {
  const [settings, setSettings] = useState({
    companyName: 'AWLMS',
    maxLoginAttempts: 5,
    lockoutMinutes: 15,
    sessionTimeout: 480,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumber: true,
    passwordRequireSpecial: true,
    maintenanceMode: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/settings');
      if (data.settings) {
        setSettings(prev => ({ ...prev, ...data.settings }));
      }
    } catch (err) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings }),
      });
      setSuccess('Settings saved successfully');
    } catch (err) {
      setError(err.body?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setError('');
    setSuccess('');
    try {
      await apiFetch('/api/admin/settings/test-email', { method: 'POST' });
      setSuccess('Test email sent successfully');
    } catch (err) {
      setError(err.body?.error || 'Failed to send test email');
    }
  };

  if (loading) {
    return <div className="admin-page"><p>Loading settings...</p></div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>System Settings</h1>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {error && <div className="auth-alert">{error}</div>}
      {success && <div className="auth-alert success">{success}</div>}

      <div className="admin-settings-grid">
        {/* Company Settings */}
        <section className="admin-settings-section">
          <h2>Company Information</h2>
          <div className="form-group">
            <label>Company Name</label>
            <input
              type="text"
              value={settings.companyName}
              onChange={e => setSettings(s => ({ ...s, companyName: e.target.value }))}
            />
          </div>
        </section>

        {/* Security Settings */}
        <section className="admin-settings-section">
          <h2>Security Settings</h2>
          <div className="form-group">
            <label>Maximum Login Attempts</label>
            <input
              type="number"
              min="1"
              max="20"
              value={settings.maxLoginAttempts}
              onChange={e => setSettings(s => ({ ...s, maxLoginAttempts: parseInt(e.target.value) }))}
            />
          </div>
          <div className="form-group">
            <label>Account Lock Duration (minutes)</label>
            <input
              type="number"
              min="1"
              max="120"
              value={settings.lockoutMinutes}
              onChange={e => setSettings(s => ({ ...s, lockoutMinutes: parseInt(e.target.value) }))}
            />
          </div>
          <div className="form-group">
            <label>Session Timeout (minutes)</label>
            <input
              type="number"
              min="5"
              max="1440"
              value={Math.floor(settings.sessionTimeout / 60)}
              onChange={e => setSettings(s => ({ ...s, sessionTimeout: parseInt(e.target.value) * 60 }))}
            />
          </div>
        </section>

        {/* Password Policy */}
        <section className="admin-settings-section">
          <h2>Password Policy</h2>
          <div className="form-group">
            <label>Minimum Password Length</label>
            <input
              type="number"
              min="6"
              max="32"
              value={settings.passwordMinLength}
              onChange={e => setSettings(s => ({ ...s, passwordMinLength: parseInt(e.target.value) }))}
            />
          </div>
          <div className="form-group checkbox">
            <input
              type="checkbox"
              id="requireUppercase"
              checked={settings.passwordRequireUppercase}
              onChange={e => setSettings(s => ({ ...s, passwordRequireUppercase: e.target.checked }))}
            />
            <label htmlFor="requireUppercase">Require uppercase letter</label>
          </div>
          <div className="form-group checkbox">
            <input
              type="checkbox"
              id="requireNumber"
              checked={settings.passwordRequireNumber}
              onChange={e => setSettings(s => ({ ...s, passwordRequireNumber: e.target.checked }))}
            />
            <label htmlFor="requireNumber">Require number</label>
          </div>
          <div className="form-group checkbox">
            <input
              type="checkbox"
              id="requireSpecial"
              checked={settings.passwordRequireSpecial}
              onChange={e => setSettings(s => ({ ...s, passwordRequireSpecial: e.target.checked }))}
            />
            <label htmlFor="requireSpecial">Require special character</label>
          </div>
        </section>

        {/* System Status */}
        <section className="admin-settings-section">
          <h2>System Status</h2>
          <div className="form-group checkbox">
            <input
              type="checkbox"
              id="maintenanceMode"
              checked={settings.maintenanceMode}
              onChange={e => setSettings(s => ({ ...s, maintenanceMode: e.target.checked }))}
            />
            <label htmlFor="maintenanceMode">
              <strong>Maintenance Mode</strong>
              <span className="muted"> - Disables access for non-admin users</span>
            </label>
          </div>
        </section>

        {/* Email Settings */}
        <section className="admin-settings-section">
          <h2>Email Configuration</h2>
          <p className="muted">Configure SMTP settings in environment variables.</p>
          <button className="btn btn-secondary" onClick={handleTestEmail}>
            Send Test Email
          </button>
        </section>
      </div>
    </div>
  );
}
