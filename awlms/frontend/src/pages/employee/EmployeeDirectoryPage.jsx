import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api.js';

const ROLE_MAP = {
  hr:      { label: 'HR Personnel', cls: 'hdb-badge--teal' },
  manager: { label: 'Manager',      cls: 'hdb-badge--blue' },
};

function RoleBadge({ role }) {
  const { label, cls } = ROLE_MAP[role] ?? { label: role, cls: 'hdb-badge--gray' };
  return <span className={`hdb-badge ${cls}`}>{label}</span>;
}

export default function EmployeeDirectoryPage() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('all');

  useEffect(() => {
    apiFetch('/api/employee/directory')
      .then((res) => setUsers(res.users ?? []))
      .catch((err) => setError(err.body?.error || err.message || 'Could not load directory'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.department_name?.toLowerCase().includes(q);
    const matchRole = filter === 'all' || u.role === filter;
    return matchSearch && matchRole;
  });

  const hrCount      = users.filter((u) => u.role === 'hr').length;
  const managerCount = users.filter((u) => u.role === 'manager').length;

  return (
    <div className="hr-page">
      <header className="hr-page-head">
        <div>
          <h1 className="hr-page-title">Personnel Directory</h1>
          <p className="muted">HR Personnel and Manager accounts in the system.</p>
        </div>
      </header>

      {error && <div className="auth-alert">{error}</div>}

      {/* Stats */}
      <div className="hr-stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="hr-stat">
          <p className="hr-stat-label">Total Personnel</p>
          <p className="hr-stat-value">{users.length}</p>
        </div>
        <div className="hr-stat">
          <p className="hr-stat-label">HR Personnel</p>
          <p className="hr-stat-value">{hrCount}</p>
        </div>
        <div className="hr-stat">
          <p className="hr-stat-label">Managers</p>
          <p className="hr-stat-value">{managerCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="hr-table-toolbar" style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div className="hr-search" role="search">
          <svg className="hr-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="hr-search-input"
            type="search"
            placeholder="Search by name, email, or department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search personnel"
          />
        </div>
        <select
          className="hr-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter by role"
        >
          <option value="all">All roles</option>
          <option value="hr">HR Personnel</option>
          <option value="manager">Manager</option>
        </select>
      </div>

      {/* Table */}
      {loading && users.length === 0 ? (
        <div className="hdb-loading">
          <div className="hdb-loading-spinner" aria-hidden="true" />
          <p>Loading directory…</p>
        </div>
      ) : (
        <div className="hr-table-wrap">
          <table className="hr-table" aria-label="Personnel directory">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="hr-table-empty">
                    {search || filter !== 'all'
                      ? 'No personnel match your filters.'
                      : 'No HR or Manager accounts found in the system.'}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id}>
                    <td className="hr-table-name">{u.full_name || `${u.first_name} ${u.last_name}`}</td>
                    <td>{u.email}</td>
                    <td><RoleBadge role={u.role} /></td>
                    <td>{u.department_name ?? <span className="muted">—</span>}</td>
                    <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
