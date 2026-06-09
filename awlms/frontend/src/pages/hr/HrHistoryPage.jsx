import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api.js';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
}

const ACTION_COLORS = {
  approved:   '#0fa888',
  rejected:   '#ef4444',
  processed:  '#3b82f6',
  completed:  '#0fa888',
  created:    '#f59e0b',
  updated:    '#a78bfa',
  deleted:    '#ef4444',
};

function ActionBadge({ action }) {
  if (!action) return null;
  const key = Object.keys(ACTION_COLORS).find((k) => action.toLowerCase().includes(k));
  const color = key ? ACTION_COLORS[key] : '#6b7280';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.15rem 0.55rem',
        borderRadius: 999,
        fontSize: '0.72rem',
        fontWeight: 700,
        background: `${color}22`,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {action}
    </span>
  );
}

const ENTITY_ICONS = {
  recommendation: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  decision: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  lifecycle_event: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  ),
  job_position: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  ),
  applicant: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
};

function EntityIcon({ type }) {
  const key = Object.keys(ENTITY_ICONS).find((k) => type?.toLowerCase().includes(k));
  const icon = key ? ENTITY_ICONS[key] : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
    </svg>
  );
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 26, height: 26, borderRadius: 6,
        background: 'rgba(255,255,255,0.06)',
        color: 'rgba(255,255,255,0.5)',
        flexShrink: 0,
      }}
    >
      {icon}
    </span>
  );
}

export default function HrHistoryPage() {
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState('all');
  const [stats, setStats] = useState({
    totalApplicants: 0,
    aiInterviewsCompleted: 0,
    hiringDecisions: 0,
    offersExtended: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/hr/lifecycle/overview');
      setAuditLog(res.auditLog ?? []);

      // Load recruitment statistics
      try {
        const statsRes = await apiFetch('/api/hr/recruitment/stats');
        setStats({
          totalApplicants: statsRes.totalApplicants ?? 0,
          aiInterviewsCompleted: statsRes.aiInterviewsCompleted ?? 0,
          hiringDecisions: statsRes.hiringDecisions ?? 0,
          offersExtended: statsRes.offersExtended ?? 0,
        });
      } catch (err) {
        console.error('Could not load recruitment stats:', err);
      }
    } catch (err) {
      setError(err.body?.error || err.message || 'Could not load history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Derive unique entity types for filter
  const entityTypes = ['all', ...new Set(auditLog.map((a) => a.entity_type).filter(Boolean))];

  const filtered = auditLog.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      a.action?.toLowerCase().includes(q) ||
      a.entity_type?.toLowerCase().includes(q) ||
      a.entity_id?.toLowerCase().includes(q);
    const matchEntity = filterEntity === 'all' || a.entity_type === filterEntity;
    return matchSearch && matchEntity;
  });

  return (
    <div className="hr-page">
      <header className="hr-page-head">
        <div>
          <h1 className="hr-page-title">History</h1>
          <p className="muted">
            Append-only audit trail of all HR actions, AI decisions, and lifecycle events.
          </p>
        </div>
        <div className="hr-page-actions">
          <Link to="/hr" className="btn-secondary hr-link-btn">Overview</Link>
          <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </header>

      {error && <div className="auth-alert" role="alert">{error}</div>}

      {/* ── Stats ── */}
      <div className="hr-stat-grid">
        <div className="hr-stat">
          <p className="hr-stat-label">Total Applicants</p>
          <p className="hr-stat-value">{stats.totalApplicants}</p>
          <p className="hr-stat-sub hr-stat-sub--muted">All positions</p>
        </div>
        <div className="hr-stat">
          <p className="hr-stat-label">AI Interviews</p>
          <p className="hr-stat-value">{stats.aiInterviewsCompleted}</p>
          <p className="hr-stat-sub hr-stat-sub--muted">Completed</p>
        </div>
        <div className="hr-stat">
          <p className="hr-stat-label">Hiring Decisions</p>
          <p className="hr-stat-value">{stats.hiringDecisions}</p>
          <p className="hr-stat-sub hr-stat-sub--muted">Made</p>
        </div>
        <div className="hr-stat">
          <p className="hr-stat-label">Offers Extended</p>
          <p className="hr-stat-value">{stats.offersExtended}</p>
          <p className="hr-stat-sub hr-stat-sub--muted">Sent</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <section className="hr-panel">
        <div className="emp-filters">
          <div className="hr-search emp-search-bar" role="search">
            <svg className="hr-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="hr-search-input"
              type="search"
              placeholder="Search by action, entity type, or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search audit log"
            />
          </div>
          <select
            className="emp-filter-select"
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            aria-label="Filter by entity type"
          >
            {entityTypes.map((t) => (
              <option key={t} value={t}>{t === 'all' ? 'All entity types' : t}</option>
            ))}
          </select>
        </div>
      </section>

      {/* ── Timeline ── */}
      <section className="hr-panel">
        <h2 className="hr-panel-title">Audit Timeline</h2>

        {loading && auditLog.length === 0 ? (
          <div className="hdb-loading">
            <div className="hdb-loading-spinner" aria-hidden="true" />
            <p>Loading history…</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="hr-table-empty muted">
            {search || filterEntity !== 'all' ? 'No entries match your filters.' : 'No audit entries yet.'}
          </p>
        ) : (
          <div className="hist-timeline">
            {filtered.map((entry, idx) => (
              <div key={entry.id} className="hist-entry">
                <div className="hist-line-col">
                  <EntityIcon type={entry.entity_type} />
                  {idx < filtered.length - 1 && <div className="hist-connector" aria-hidden="true" />}
                </div>
                <div className="hist-body">
                  <div className="hist-row">
                    <ActionBadge action={entry.action} />
                    <span className="hist-entity-type muted">{entry.entity_type}</span>
                    <span className="hist-time muted">{formatDate(entry.created_at)}</span>
                  </div>
                  <p className="hist-id muted">
                    ID: <code style={{ fontSize: '0.78rem', color: '#0fa888' }}>{entry.entity_id}</code>
                  </p>
                  {entry.notes && (
                    <p className="hist-notes muted">{entry.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
