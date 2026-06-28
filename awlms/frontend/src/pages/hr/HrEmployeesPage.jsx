import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api.js';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function StatusBadge({ status }) {
  const map = {
    active:    { label: 'Active',    cls: 'hdb-badge--teal' },
    inactive:  { label: 'Inactive',  cls: 'hdb-badge--gray' },
  };
  const s = map[status?.toLowerCase()] ?? { label: status ?? 'Unknown', cls: 'hdb-badge--gray' };
  return <span className={`hdb-badge ${s.cls}`}>{s.label}</span>;
}

function RoleBadge({ role }) {
  const map = {
    hr:       { label: 'HR',       cls: 'hdb-badge--teal' },
    manager:  { label: 'Manager',  cls: 'hdb-badge--blue' },
    employee: { label: 'Employee', cls: 'hdb-badge--gray' },
  };
  const r = map[role?.toLowerCase()] ?? { label: role ?? '—', cls: 'hdb-badge--gray' };
  return <span className={`hdb-badge ${r.cls}`}>{r.label}</span>;
}

const EMPTY_FORM = { first_name: '', last_name: '', email: '', password: '', role: 'employee', department_id: '' };

function CreateAccountModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const firstRef = useRef(null);

  useEffect(() => { firstRef.current?.focus(); }, []);
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        first_name: form.first_name.trim(), last_name: form.last_name.trim(),
        email: form.email.trim(), password: form.password, role: form.role,
      };
      if (form.department_id.trim()) payload.department_id = form.department_id.trim();
      const res = await apiFetch('/api/hr/employees/create-account', {
        method: 'POST', body: JSON.stringify(payload),
      });
      setSuccess(res.user);
      onCreated(res.user);
    } catch (err) {
      setError(err.body?.error || err.message || 'Could not create account');
    } finally {
      setSaving(false);
    }
  }

  function handleDone() { setForm(EMPTY_FORM); setSuccess(null); setError(''); onClose(); }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="create-acct-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-head">
          <h2 className="modal-title" id="create-acct-title">Create Employee Account</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {success ? (
          <div className="modal-body">
            <div className="create-acct-success">
              <div className="create-acct-success-icon" aria-hidden="true">✓</div>
              <h3>Account created</h3>
              <p className="muted">Share these credentials with the new hire.</p>
              <div className="create-acct-creds">
                <div className="create-acct-cred-row"><span className="create-acct-cred-label">Name</span><span className="create-acct-cred-value">{success.full_name}</span></div>
                <div className="create-acct-cred-row"><span className="create-acct-cred-label">Email</span><span className="create-acct-cred-value">{success.email}</span></div>
                <div className="create-acct-cred-row"><span className="create-acct-cred-label">Role</span><span className="create-acct-cred-value" style={{ textTransform: 'capitalize' }}>{success.role}</span></div>
              </div>
              <p className="create-acct-note muted">The employee can log in immediately. Remind them to keep their password secure.</p>
            </div>
            <div className="modal-foot"><button type="button" className="btn-primary" onClick={handleDone}>Done</button></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-body">
              {error && <div className="auth-alert" role="alert">{error}</div>}
              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label" htmlFor="ca-first-name">First name</label>
                  <input ref={firstRef} id="ca-first-name" name="first_name" type="text" className="form-input"
                    value={form.first_name} onChange={handleChange} placeholder="e.g. Maria" required autoComplete="given-name" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ca-last-name">Last name</label>
                  <input id="ca-last-name" name="last_name" type="text" className="form-input"
                    value={form.last_name} onChange={handleChange} placeholder="e.g. Santos" required autoComplete="family-name" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ca-email">Email address</label>
                <input id="ca-email" name="email" type="email" className="form-input"
                  value={form.email} onChange={handleChange} placeholder="employee@company.com" required autoComplete="email" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ca-password">Password <span className="form-label-hint">— share this with the employee</span></label>
                <div className="form-input-wrap">
                  <input id="ca-password" name="password" type={showPassword ? 'text' : 'password'}
                    className="form-input form-input--with-btn" value={form.password} onChange={handleChange}
                    placeholder="Min. 6 characters" required autoComplete="new-password" />
                  <button type="button" className="form-input-toggle" onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
                </div>
              </div>
              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label" htmlFor="ca-role">Role</label>
                  <select id="ca-role" name="role" className="form-input" value={form.role} onChange={handleChange}>
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="hr">HR Personnel</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ca-dept">Department ID <span className="form-label-hint">(optional)</span></label>
                  <input id="ca-dept" name="department_id" type="text" className="form-input"
                    value={form.department_id} onChange={handleChange} placeholder="Leave blank if unknown" />
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Account'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ApproveModal({ account, profiles, onClose, onApproved }) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleApprove(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = { userId: account.id };
      if (selectedEmployeeId) body.employeeId = selectedEmployeeId;
      await apiFetch('/api/hr/employees/approve', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      onApproved();
      onClose();
    } catch (err) {
      setError(err.body?.error || err.message || 'Could not approve account');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="approve-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-head">
          <h2 className="modal-title" id="approve-title">Approve Account</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleApprove}>
          <div className="modal-body">
            <div className="approve-acct-info">
              <p className="approve-acct-label">Account to approve</p>
              <p className="approve-acct-name">{account.full_name}</p>
              <p className="muted" style={{ fontSize: '0.85rem', margin: '0.1rem 0 0' }}>{account.email}</p>
            </div>
            {error && <div className="auth-alert" role="alert">{error}</div>}
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label" htmlFor="approve-emp-select">Link to employee profile</label>
              {profiles.length === 0 ? (
                <p className="muted" style={{ fontSize: '0.85rem' }}>
                  No unlinked employee profiles available. A new employee record will be created automatically on approval.
                </p>
              ) : (
                <select id="approve-emp-select" className="form-input" value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}>
                  <option value="">— Create new employee record automatically —</option>
                  {profiles.map((p) => (
                    <option key={p.employee_id} value={p.employee_id}>
                      {p.display_name}{p.job_title ? ` — ${p.job_title}` : ''}{p.department_name ? ` (${p.department_name})` : ''}{p.employee_number ? ` · ${p.employee_number}` : ''}
                    </option>
                  ))}
                </select>
              )}
              <p className="muted" style={{ fontSize: '0.78rem', marginTop: '0.4rem' }}>
                This links the login account to an employee record and marks the account as approved.
              </p>
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Approving…' : 'Approve & Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteAccountModal({ account, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleDelete(e) {
    e.preventDefault();
    setError('');
    setDeleting(true);
    try {
      await apiFetch(`/api/hr/employees/${account.id}`, {
        method: 'DELETE',
      });
      onDeleted();
      onClose();
    } catch (err) {
      setError(err.body?.error || err.message || 'Could not deactivate account');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box modal-box--danger">
        <div className="modal-head">
          <h2 className="modal-title" id="delete-title">Deactivate Account</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleDelete}>
          <div className="modal-body">
            <p className="muted" style={{ marginBottom: '1rem' }}>
              Are you sure you want to deactivate this account?
            </p>
            <div className="delete-acct-info">
              <p className="delete-acct-label">Account</p>
              <p className="delete-acct-name">{account.full_name}</p>
              <p className="muted" style={{ fontSize: '0.85rem', margin: '0.1rem 0 0' }}>{account.email}</p>
            </div>
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: '1rem' }}>
              This will prevent the user from logging in. The account can be reactivated later by HR.
            </p>
            {error && <div className="auth-alert" role="alert">{error}</div>}
          </div>
          <div className="modal-foot">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={deleting}>Cancel</button>
            <button type="submit" className="btn-danger" disabled={deleting}>
              {deleting ? 'Deactivating…' : 'Deactivate Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ManageAccountModal({ account, onClose, onUpdated }) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [role, setRole] = useState(account.role || 'employee');
  const [isActive, setIsActive] = useState(account.is_active === 1);
  const [employmentStatus, setEmploymentStatus] = useState(account.employment_status || 'active');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetResult, setResetResult] = useState('');

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleUpdate(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setUpdating(true);
    try {
      // Build updates object - compare against original account values
      // Explicitly check for 1 (active) vs anything else (inactive, null, 0, undefined)
      const originalIsActive = account.is_active === 1;
      const originalStatus = account.employment_status || 'active';
      const originalRole = account.role || 'employee';

      const updates = {};
      
      if (role !== originalRole) updates.role = role;
      if (isActive !== originalIsActive) updates.is_active = isActive;
      if (employmentStatus !== originalStatus) updates.employment_status = employmentStatus;

      console.log('[ManageAccountModal] Account ID:', account.id);
      console.log('[ManageAccountModal] Account original state:', {
        originalRole,
        originalIsActive,
        originalStatus,
        accountData: account,
      });
      console.log('[ManageAccountModal] Current state:', {
        role,
        isActive,
        employmentStatus,
      });
      console.log('[ManageAccountModal] Changes:', updates);

      if (Object.keys(updates).length === 0) {
        setError('No changes to save');
        setUpdating(false);
        return;
      }

      console.log('[ManageAccountModal] Sending PATCH to /api/hr/employees/' + account.id);
      console.log('[ManageAccountModal] Request body:', JSON.stringify(updates));
      
      const response = await apiFetch(`/api/hr/employees/${account.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      
      console.log('[ManageAccountModal] Response:', response);
      setSuccess('Account updated successfully');
      setTimeout(() => {
        onUpdated();
        onClose();
      }, 1000);
    } catch (err) {
      console.error('[ManageAccountModal] Full error:', err);
      console.error('[ManageAccountModal] Error body:', err.body);
      console.error('[ManageAccountModal] Error message:', err.message);
      console.error('[ManageAccountModal] Error status:', err.status);
      setError(err.body?.error || err.body?.details || err.message || 'Could not update account');
    } finally {
      setUpdating(false);
    }
  }

  async function handleResetPassword() {
    setResetResult('');
    try {
      const res = await apiFetch(`/api/hr/employees/${account.id}/reset-password`, {
        method: 'POST',
      });
      setResetResult(res.message);
    } catch (err) {
      setResetResult('Error: ' + (err.body?.error || err.message || 'Could not reset password'));
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="manage-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-head">
          <h2 className="modal-title" id="manage-title">Manage Account</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <div className="manage-acct-info">
            <p className="manage-acct-label">Account</p>
            <p className="manage-acct-name">{account.full_name}</p>
            <p className="muted" style={{ fontSize: '0.85rem', margin: '0.1rem 0 0' }}>{account.email}</p>
          </div>

          {error && <div className="auth-alert" role="alert">{error}</div>}
          {success && <div className="auth-success" role="status">{success}</div>}

          <form onSubmit={handleUpdate} style={{ marginTop: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="manage-role">Role</label>
              <select id="manage-role" className="form-input" value={role} onChange={(e) => setRole(e.target.value)}
                style={{
                  backgroundColor: '#f5f5f5',
                  color: '#111827',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.95rem',
                }}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="hr">HR Personnel</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="manage-status">Employment Status</label>
              <select id="manage-status" className="form-input" value={employmentStatus} onChange={(e) => setEmploymentStatus(e.target.value)}
                style={{
                  backgroundColor: '#f5f5f5',
                  color: '#111827',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.95rem',
                }}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>


            <div className="modal-foot">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={updating} style={{
                backgroundColor: '#e5e7eb',
                color: '#111827',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontWeight: '500',
              }}>Cancel</button>
              <button type="submit" disabled={updating} style={{
                backgroundColor: '#22D3EE',
                color: '#111827',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                cursor: updating ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: updating ? 0.7 : 1,
              }}>
                {updating ? 'Updating…' : 'Update Account'}
              </button>
            </div>
          </form>

          <hr style={{ margin: '1.5rem 0', borderColor: 'rgba(255,255,255,0.1)' }} />

          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem' }}>Additional Actions</h3>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowResetPassword(!showResetPassword)}
              style={{ width: '100%' }}
            >
              {showResetPassword ? 'Hide' : 'Reset Password'}
            </button>
            {showResetPassword && (
              <div style={{ marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-sm"
                  onClick={handleResetPassword}
                  style={{ marginBottom: '0.5rem' }}
                >
                  Send Reset Link
                </button>
                {resetResult && (
                  <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    {resetResult}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HrEmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const [pending, setPending] = useState({ unlinkedAccounts: [], unlinkedProfiles: [] });
  const [pendingLoading, setPendingLoading] = useState(true);
  const [approveTarget, setApproveTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [manageTarget, setManageTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await apiFetch('/api/hr/employees');
      setEmployees(res.employees ?? res ?? []);
    } catch (err) {
      setError(err.body?.error || err.message || 'Could not load employees');
    } finally { setLoading(false); }
  }, []);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await apiFetch('/api/hr/employees/pending');
      setPending(res);
    } catch { /* non-fatal */ } finally { setPendingLoading(false); }
  }, []);

  useEffect(() => { load(); loadPending(); }, [load, loadPending]);

  function handleCreated() { load(); loadPending(); }
  function handleApproved() { load(); loadPending(); }
  function handleDeleted() { load(); loadPending(); }
  function handleUpdated() { load(); loadPending(); }

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.full_name?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) || e.department_name?.toLowerCase().includes(q);
    const matchRole = filterRole === 'all' || e.role === filterRole;
    const matchStatus = filterStatus === 'all' || e.employment_status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  const totalActive = employees.filter((e) => e.employment_status === 'active').length;
  const totalHR = employees.filter((e) => e.role === 'hr').length;
  const totalManagers = employees.filter((e) => e.role === 'manager').length;
  const totalEmployees = employees.filter((e) => e.role === 'employee').length;
  const pendingCount = pending.unlinkedAccounts.length + pending.unlinkedProfiles.length;

  return (
    <div className="hr-page">
      {showModal && <CreateAccountModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}
      {approveTarget && (
        <ApproveModal account={approveTarget} profiles={pending.unlinkedProfiles}
          onClose={() => setApproveTarget(null)} onApproved={handleApproved} />
      )}
      {deleteTarget && (
        <DeleteAccountModal account={deleteTarget}
          onClose={() => setDeleteTarget(null)} onDeleted={handleDeleted} />
      )}
      {manageTarget && (
        <ManageAccountModal account={manageTarget}
          onClose={() => setManageTarget(null)} onUpdated={handleUpdated} />
      )}

      <header className="hr-page-head">
        <div>
          <h1 className="hr-page-title">Employees</h1>
          <p className="muted">Full directory of all system users — HR personnel, managers, and employees.</p>
        </div>
        <div className="hr-page-actions">
          <Link to="/hr" className="btn-secondary hr-link-btn">Overview</Link>
          <button type="button" className="btn-secondary" onClick={() => { load(); loadPending(); }} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <button type="button" className="btn-primary" onClick={() => setShowModal(true)}>+ Create Account</button>
        </div>
      </header>

      {error && <div className="auth-alert" role="alert">{error}</div>}

      <div className="hr-stat-grid">
        <div className="hr-stat"><p className="hr-stat-label">Total Users</p><p className="hr-stat-value">{employees.length}</p><p className="hr-stat-sub hr-stat-sub--green">{totalActive} active</p></div>
        <div className="hr-stat"><p className="hr-stat-label">HR Personnel</p><p className="hr-stat-value">{totalHR}</p><p className="hr-stat-sub hr-stat-sub--muted">Administrators</p></div>
        <div className="hr-stat"><p className="hr-stat-label">Managers</p><p className="hr-stat-value">{totalManagers}</p><p className="hr-stat-sub hr-stat-sub--muted">Department heads</p></div>
        <div className="hr-stat"><p className="hr-stat-label">Employees</p><p className="hr-stat-value">{totalEmployees}</p><p className="hr-stat-sub hr-stat-sub--muted">Regular staff</p></div>
      </div>

      {/* ── Tabs ── */}
      <div className="emp-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={activeTab === 'all'}
          className={`emp-tab${activeTab === 'all' ? ' emp-tab--active' : ''}`}
          onClick={() => setActiveTab('all')}>All Users</button>
        <button type="button" role="tab" aria-selected={activeTab === 'pending'}
          className={`emp-tab${activeTab === 'pending' ? ' emp-tab--active' : ''}`}
          onClick={() => setActiveTab('pending')}>
          Pending Approval
          {pendingCount > 0 && <span className="emp-tab-badge">{pendingCount}</span>}
        </button>
      </div>

      {activeTab === 'all' && (
        <>
          <section className="hr-panel">
            <div className="emp-filters">
              <div className="hr-search emp-search-bar" role="search">
                <svg className="hr-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input className="hr-search-input" type="search" placeholder="Search by name, email, department…"
                  value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search employees" />
              </div>
              <select className="emp-filter-select" value={filterRole} onChange={(e) => setFilterRole(e.target.value)} aria-label="Filter by role">
                <option value="all">All roles</option><option value="hr">HR</option><option value="manager">Manager</option><option value="employee">Employee</option>
              </select>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button 
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '0.25rem',
                    border: 'none',
                    backgroundColor: filterStatus === 'all' ? '#22D3EE' : '#3d4557',
                    color: filterStatus === 'all' ? '#111827' : '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                  }}
                >
                  All statuses
                </button>
                <button 
                  type="button"
                  onClick={() => setFilterStatus('active')}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '0.25rem',
                    border: 'none',
                    backgroundColor: filterStatus === 'active' ? '#22D3EE' : '#3d4557',
                    color: filterStatus === 'active' ? '#111827' : '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                  }}
                >
                  Active
                </button>
                <button 
                  type="button"
                  onClick={() => setFilterStatus('inactive')}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '0.25rem',
                    border: 'none',
                    backgroundColor: filterStatus === 'inactive' ? '#22D3EE' : '#3d4557',
                    color: filterStatus === 'inactive' ? '#111827' : '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                  }}
                >
                  Inactive
                </button>
              </div>
            </div>
          </section>
          <section className="hr-panel">
            <div className="hr-panel-head"><h2 className="hr-panel-title">{filtered.length} {filtered.length === 1 ? 'user' : 'users'} found</h2></div>
            {loading && employees.length === 0 ? (
              <div className="hdb-loading"><div className="hdb-loading-spinner" aria-hidden="true" /><p>Loading employees…</p></div>
            ) : (
              <div className="hr-table-wrap">
                <table className="hr-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Joined</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7} className="hr-table-empty">{search || filterRole !== 'all' || filterStatus !== 'all' ? 'No employees match your filters.' : 'No employees found.'}</td></tr>
                    ) : filtered.map((emp) => (
                      <tr key={emp.id}>
                        <td><div className="emp-name-cell"><div className="emp-avatar" aria-hidden="true">{emp.full_name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ?? '??'}</div><div><p className="hr-cell-title">{emp.full_name ?? '—'}</p>{emp.job_title && <p className="muted hr-cell-sub">{emp.job_title}</p>}</div></div></td>
                        <td className="muted">{emp.email}</td>
                        <td><RoleBadge role={emp.role} /></td>
                        <td className="muted">{emp.department_name || '—'}</td>
                        <td><StatusBadge status={emp.employment_status} /></td>
                        <td className="muted">{formatDate(emp.created_at)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn-sm btn-secondary"
                              onClick={() => setManageTarget(emp)}
                              title="Manage account settings"
                              style={{
                                backgroundColor: '#3d4557',
                                color: '#ffffff',
                                border: 'none',
                                padding: '0.4rem 0.8rem',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                fontWeight: '500',
                                fontSize: '0.875rem',
                              }}
                            >
                              Manage
                            </button>
                            <button
                              type="button"
                              className="btn-sm btn-danger-text"
                              onClick={() => setDeleteTarget(emp)}
                              title="Deactivate account"
                              style={{
                                backgroundColor: '#EF4444',
                                color: '#ffffff',
                                border: 'none',
                                padding: '0.4rem 0.8rem',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                fontWeight: '500',
                                fontSize: '0.875rem',
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === 'pending' && (
        <>
          <section className="hr-panel">
            <div className="hr-panel-head">
              <h2 className="hr-panel-title">Accounts awaiting approval</h2>
              <p className="muted" style={{ fontSize: '0.82rem', margin: '0.25rem 0 0' }}>
                These employee accounts have been created but are not yet linked to an employee profile. Approve them to grant full workspace access.
              </p>
            </div>
            {pendingLoading ? (
              <div className="hdb-loading"><div className="hdb-loading-spinner" aria-hidden="true" /><p>Loading…</p></div>
            ) : pending.unlinkedAccounts.length === 0 ? (
              <p className="muted" style={{ padding: '1.5rem 0' }}>No accounts pending approval.</p>
            ) : (
              <div className="hr-table-wrap">
                <table className="hr-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Created</th><th>Action</th></tr></thead>
                  <tbody>
                    {pending.unlinkedAccounts.map((acct) => (
                      <tr key={acct.id}>
                        <td><div className="emp-name-cell"><div className="emp-avatar emp-avatar--pending" aria-hidden="true">{acct.full_name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ?? '??'}</div><div><p className="hr-cell-title">{acct.full_name}</p><span className="hdb-badge hdb-badge--yellow" style={{ fontSize: '0.65rem' }}>Not linked</span></div></div></td>
                        <td className="muted">{acct.email}</td>
                        <td className="muted">{acct.department_name || '—'}</td>
                        <td className="muted">{formatDate(acct.created_at)}</td>
                        <td><button type="button" className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }} onClick={() => setApproveTarget(acct)}>Approve</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="hr-panel">
            <div className="hr-panel-head">
              <h2 className="hr-panel-title">Employee profiles without an account</h2>
              <p className="muted" style={{ fontSize: '0.82rem', margin: '0.25rem 0 0' }}>
                These employees were hired but have no login account yet. Create an account above, then approve it.
              </p>
            </div>
            {pendingLoading ? (
              <div className="hdb-loading"><div className="hdb-loading-spinner" aria-hidden="true" /><p>Loading…</p></div>
            ) : pending.unlinkedProfiles.length === 0 ? (
              <p className="muted" style={{ padding: '1.5rem 0' }}>All employee profiles have linked accounts.</p>
            ) : (
              <div className="hr-table-wrap">
                <table className="hr-table">
                  <thead><tr><th>Name</th><th>Job title</th><th>Department</th><th>Hire date</th><th>Employee #</th></tr></thead>
                  <tbody>
                    {pending.unlinkedProfiles.map((p) => (
                      <tr key={p.employee_id}>
                        <td><div className="emp-name-cell"><div className="emp-avatar emp-avatar--pending" aria-hidden="true">{p.display_name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ?? '??'}</div><div><p className="hr-cell-title">{p.display_name}</p><span className="hdb-badge hdb-badge--yellow" style={{ fontSize: '0.65rem' }}>No account</span></div></div></td>
                        <td className="muted">{p.job_title || '—'}</td>
                        <td className="muted">{p.department_name || '—'}</td>
                        <td className="muted">{formatDate(p.hire_date)}</td>
                        <td className="muted">{p.employee_number || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
