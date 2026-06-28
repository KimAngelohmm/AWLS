import { useCallback, useEffect, useRef, useState } from 'react';
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

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role: 'employee',
  department_id: '',
};

function CreateAccountModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
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
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      };
      if (form.department_id.trim()) {
        payload.department_id = form.department_id.trim();
      }
      const res = await apiFetch('/api/hr/employees/create-account', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setSuccess(res.user);
      onCreated(res.user);
    } catch (err) {
      setError(err.body?.error || err.message || 'Could not create account');
    } finally {
      setSaving(false);
    }
  }

  function handleDone() {
    setForm(EMPTY_FORM);
    setSuccess(null);
    setError('');
    onClose();
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mgr-create-acct-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-box">
        <div className="modal-head">
          <h2 className="modal-title" id="mgr-create-acct-title">Create Employee Account</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {success ? (
          <div className="modal-body">
            <div className="create-acct-success">
              <div className="create-acct-success-icon" aria-hidden="true">✓</div>
              <h3>Account created</h3>
              <p className="muted">Share these credentials with the new hire.</p>
              <div className="create-acct-creds">
                <div className="create-acct-cred-row">
                  <span className="create-acct-cred-label">Name</span>
                  <span className="create-acct-cred-value">{success.full_name}</span>
                </div>
                <div className="create-acct-cred-row">
                  <span className="create-acct-cred-label">Email</span>
                  <span className="create-acct-cred-value">{success.email}</span>
                </div>
                <div className="create-acct-cred-row">
                  <span className="create-acct-cred-label">Role</span>
                  <span className="create-acct-cred-value" style={{ textTransform: 'capitalize' }}>{success.role}</span>
                </div>
              </div>
              <p className="create-acct-note muted">
                The employee can log in immediately. Remind them to keep their password secure.
              </p>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn-primary" onClick={handleDone}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-body">
              {error && (
                <div className="auth-alert" role="alert">{error}</div>
              )}

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label" htmlFor="mgr-ca-first-name">First name</label>
                  <input
                    ref={firstRef}
                    id="mgr-ca-first-name"
                    name="first_name"
                    type="text"
                    className="form-input"
                    value={form.first_name}
                    onChange={handleChange}
                    placeholder="e.g. Maria"
                    required
                    autoComplete="given-name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="mgr-ca-last-name">Last name</label>
                  <input
                    id="mgr-ca-last-name"
                    name="last_name"
                    type="text"
                    className="form-input"
                    value={form.last_name}
                    onChange={handleChange}
                    placeholder="e.g. Santos"
                    required
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="mgr-ca-email">Email address</label>
                <input
                  id="mgr-ca-email"
                  name="email"
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="employee@company.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="mgr-ca-password">
                  Password
                  <span className="form-label-hint"> — share this with the employee</span>
                </label>
                <div className="form-input-wrap">
                  <input
                    id="mgr-ca-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input form-input--with-btn"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Min. 6 characters"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="form-input-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label" htmlFor="mgr-ca-role">Role</label>
                  <select
                    id="mgr-ca-role"
                    name="role"
                    className="form-input"
                    value={form.role}
                    onChange={handleChange}
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="mgr-ca-dept">
                    Department ID
                    <span className="form-label-hint"> (optional)</span>
                  </label>
                  <input
                    id="mgr-ca-dept"
                    name="department_id"
                    type="text"
                    className="form-input"
                    value={form.department_id}
                    onChange={handleChange}
                    placeholder="Leave blank if unknown"
                  />
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Creating…' : 'Create Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ManagerEmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Managers use the shared employees list endpoint
      const res = await apiFetch('/api/hr/employees/list');
      setEmployees(res.employees ?? res ?? []);
    } catch (err) {
      setError(err.body?.error || err.message || 'Could not load employees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleCreated() {
    load();
  }

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      e.full_name?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.department_name?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || e.employment_status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalActive = employees.filter((e) => e.employment_status === 'active').length;

  return (
    <div className="hr-page">
      {showModal && (
        <CreateAccountModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}

      <header className="hr-page-head">
        <div>
          <h1 className="hr-page-title">Employees</h1>
          <p className="muted">Directory of staff — create accounts for newly hired employees.</p>
        </div>
        <div className="hr-page-actions">
          <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowModal(true)}
          >
            + Create Account
          </button>
        </div>
      </header>

      {error && <div className="auth-alert" role="alert">{error}</div>}

      <div className="hr-stat-grid">
        <div className="hr-stat">
          <p className="hr-stat-label">Total Users</p>
          <p className="hr-stat-value">{employees.length}</p>
          <p className="hr-stat-sub hr-stat-sub--green">{totalActive} active</p>
        </div>
        <div className="hr-stat">
          <p className="hr-stat-label">Employees</p>
          <p className="hr-stat-value">{employees.filter((e) => e.role === 'employee').length}</p>
          <p className="hr-stat-sub hr-stat-sub--muted">Regular staff</p>
        </div>
        <div className="hr-stat">
          <p className="hr-stat-label">Managers</p>
          <p className="hr-stat-value">{employees.filter((e) => e.role === 'manager').length}</p>
          <p className="hr-stat-sub hr-stat-sub--muted">Department heads</p>
        </div>
      </div>

      <section className="hr-panel">
        <div className="emp-filters">
          <div className="hr-search emp-search-bar" role="search">
            <svg className="hr-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="hr-search-input"
              type="search"
              placeholder="Search by name, email, department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search employees"
            />
          </div>
          <select
            className="emp-filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </section>

      <section className="hr-panel">
        <div className="hr-panel-head">
          <h2 className="hr-panel-title">
            {filtered.length} {filtered.length === 1 ? 'user' : 'users'} found
          </h2>
        </div>

        {loading && employees.length === 0 ? (
          <div className="hdb-loading">
            <div className="hdb-loading-spinner" aria-hidden="true" />
            <p>Loading employees…</p>
          </div>
        ) : (
          <div className="hr-table-wrap">
            <table className="hr-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="hr-table-empty">
                      {search || filterStatus !== 'all'
                        ? 'No employees match your filters.'
                        : 'No employees found.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((emp) => (
                    <tr key={emp.id}>
                      <td>
                        <div className="emp-name-cell">
                          <div className="emp-avatar" aria-hidden="true">
                            {emp.full_name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ?? '??'}
                          </div>
                          <div>
                            <p className="hr-cell-title">{emp.full_name ?? '—'}</p>
                            {emp.job_title && <p className="muted hr-cell-sub">{emp.job_title}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="muted">{emp.email}</td>
                      <td><RoleBadge role={emp.role} /></td>
                      <td className="muted">{emp.department_name || '—'}</td>
                      <td><StatusBadge status={emp.employment_status} /></td>
                      <td className="muted">{formatDate(emp.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
