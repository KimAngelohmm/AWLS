import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { apiFetch } from '../../lib/api.js';

const REMEMBER_KEY = 'awlms_remember';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function calcAge(birthdate) {
  if (!birthdate) return null;
  const today = new Date();
  const dob = new Date(birthdate);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function getInitials(name = '') {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function EmployeeSettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  // ── Extended profile ──
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(true);

  // ── Profile fields ──
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  // ── Password fields ──
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  // ── Remember me ──
  const savedCreds = (() => {
    try { return JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null'); } catch { return null; }
  })();
  const [rememberEnabled, setRememberEnabled] = useState(Boolean(savedCreds));

  useEffect(() => {
    apiFetch('/api/auth/profile-details')
      .then((data) => {
        setDetails(data);
        setFullName(data.user?.full_name ?? user?.full_name ?? '');
        setPhone(data.user?.phone ?? '');
        setBirthdate(data.user?.birthdate ?? '');
      })
      .catch(() => {})
      .finally(() => setDetailsLoading(false));
  }, []);

  function handleClearRemember() {
    localStorage.removeItem(REMEMBER_KEY);
    setRememberEnabled(false);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileMsg('');
    setProfileError('');
    setProfileSaving(true);
    try {
      await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ full_name: fullName.trim(), phone: phone.trim(), birthdate: birthdate || null }),
      });
      await refreshUser();
      setProfileMsg('Profile updated successfully.');
    } catch (err) {
      setProfileError(err.body?.error || err.message || 'Could not update profile');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwMsg('');
    setPwError('');
    if (newPassword !== confirmPassword) { setPwError('New passwords do not match.'); return; }
    if (newPassword.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    setPwSaving(true);
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setPwMsg('Password changed successfully.');
    } catch (err) {
      setPwError(err.body?.error || err.message || 'Could not change password');
    } finally {
      setPwSaving(false);
    }
  }

  function handleSignOut() {
    logout();
    navigate('/login', { replace: true });
  }

  const emp = details?.employee ?? null;
  const age = calcAge(birthdate);

  return (
    <div className="hr-page">
      <header className="hr-page-head">
        <div>
          <h1 className="hr-page-title">Settings</h1>
          <p className="muted">Manage your account, security, and preferences.</p>
        </div>
        <div className="hr-page-actions">
          <Link to="/employee" className="btn-secondary hr-link-btn">Overview</Link>
        </div>
      </header>

      {/* ── Profile card ── */}
      <section className="hr-panel">
        <h2 className="hr-panel-title">Profile</h2>

        <div className="sett-profile-row">
          <div className="sett-avatar" aria-hidden="true">{getInitials(user?.full_name ?? '')}</div>
          <div>
            <p className="sett-profile-name">{user?.full_name ?? '—'}</p>
            <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>{user?.email}</p>
            <span className="hdb-badge hdb-badge--teal" style={{ marginTop: '0.4rem', display: 'inline-block' }}>
              Employee
            </span>
          </div>
        </div>

        <form className="sett-form" onSubmit={handleSaveProfile}>
          {profileMsg && <div className="sett-success" role="status">{profileMsg}</div>}
          {profileError && <div className="auth-alert" role="alert">{profileError}</div>}

          <div className="sett-fields-grid">
            <label className="field">
              <span className="field-label">Display name</span>
              <input className="field-input" type="text" value={fullName}
                onChange={(e) => setFullName(e.target.value)} required />
            </label>
            <label className="field">
              <span className="field-label">Email address</span>
              <input className="field-input" type="email" value={user?.email ?? ''} disabled
                aria-describedby="email-note" />
              <span id="email-note" className="muted" style={{ fontSize: '0.78rem' }}>
                Contact your administrator to change your email.
              </span>
            </label>
            <label className="field">
              <span className="field-label">Phone number</span>
              <input className="field-input" type="tel" value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 000 0000" />
            </label>
            <label className="field">
              <span className="field-label">
                Date of birth{age !== null ? <span className="sett-age-badge"> — {age} yrs</span> : ''}
              </span>
              <input className="field-input" type="date" value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)} />
            </label>
          </div>

          <div>
            <button type="submit" className="btn-primary" disabled={profileSaving}>
              {profileSaving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </section>

      {/* ── Employment info (read-only) ── */}
      {!detailsLoading && emp && (
        <section className="hr-panel">
          <h2 className="hr-panel-title">Employment Information</h2>
          <div className="sett-info-grid">
            <div className="sett-info-item">
              <p className="sett-info-label">Employee number</p>
              <p className="sett-info-value">{emp.employee_number ?? '—'}</p>
            </div>
            <div className="sett-info-item">
              <p className="sett-info-label">Job title</p>
              <p className="sett-info-value">{emp.job_title ?? '—'}</p>
            </div>
            <div className="sett-info-item">
              <p className="sett-info-label">Department</p>
              <p className="sett-info-value">{emp.department_name ?? '—'}</p>
            </div>
            <div className="sett-info-item">
              <p className="sett-info-label">Start date</p>
              <p className="sett-info-value">{formatDate(emp.hire_date)}</p>
            </div>
            {emp.lifecycle_event_type && (
              <div className="sett-info-item">
                <p className="sett-info-label">
                  {emp.lifecycle_event_type === 'promotion' ? 'Last promotion' :
                   emp.lifecycle_event_type === 'termination' ? 'Termination date' :
                   emp.lifecycle_event_type === 'resignation' ? 'Resignation date' :
                   'Lifecycle event'}
                </p>
                <p className="sett-info-value">{formatDate(emp.lifecycle_event_date)}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Change password ── */}
      <section className="hr-panel">
        <h2 className="hr-panel-title">Change Password</h2>
        <form className="sett-form" onSubmit={handleChangePassword}>
          {pwMsg && <div className="sett-success" role="status">{pwMsg}</div>}
          {pwError && <div className="auth-alert" role="alert">{pwError}</div>}
          <label className="field">
            <span className="field-label">Current password</span>
            <input className="field-input" type="password" autoComplete="current-password"
              value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </label>
          <label className="field">
            <span className="field-label">New password</span>
            <input className="field-input" type="password" autoComplete="new-password"
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
          </label>
          <label className="field">
            <span className="field-label">Confirm new password</span>
            <input className="field-input" type="password" autoComplete="new-password"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </label>
          <div>
            <button type="submit" className="btn-primary" disabled={pwSaving}>
              {pwSaving ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </section>

      {/* ── Login preferences ── */}
      <section className="hr-panel">
        <h2 className="hr-panel-title">Login Preferences</h2>
        <div className="sett-pref-row">
          <div>
            <p className="sett-pref-label">Remember me</p>
            <p className="muted" style={{ fontSize: '0.82rem', margin: '0.2rem 0 0' }}>
              {rememberEnabled
                ? `Credentials saved for: ${savedCreds?.email ?? 'unknown'}`
                : 'No saved credentials. Check "Remember me?" on the login page to save them.'}
            </p>
          </div>
          {rememberEnabled && (
            <button type="button" className="btn-secondary" onClick={handleClearRemember} style={{ flexShrink: 0 }}>
              Clear saved credentials
            </button>
          )}
        </div>
      </section>

      {/* ── Session ── */}
      <section className="hr-panel sett-danger-panel">
        <h2 className="hr-panel-title" style={{ color: '#ef4444' }}>Session</h2>
        <p className="muted" style={{ fontSize: '0.875rem', margin: '0 0 1rem' }}>
          Sign out of your current session on this device.
        </p>
        <button type="button" className="sett-signout-btn" onClick={handleSignOut}>Sign out</button>
      </section>
    </div>
  );
}
