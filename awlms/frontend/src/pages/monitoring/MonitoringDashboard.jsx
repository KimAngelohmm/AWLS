import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api.js';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function parseMetrics(raw) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}

function TrendBars({ trendDaily, labelKey }) {
  if (!trendDaily?.length) {
    return <p className="muted">No trend samples in the last 14 days.</p>;
  }
  const values = trendDaily.map((r) => Number(r[labelKey]) || 0);
  const max = Math.max(...values, 1);
  return (
    <div className="mon-trend" role="img" aria-label={`Trend for ${labelKey}`}>
      {trendDaily.map((row) => {
        const v = Number(row[labelKey]) || 0;
        const h = Math.round((v / max) * 100);
        return (
          <div key={row.day} className="mon-trend-col">
            <div className="mon-trend-bar-wrap">
              <div className="mon-trend-bar" style={{ height: `${h}%` }} title={`${row.day}: ${v}`} />
            </div>
            <span className="mon-trend-label">{String(row.day).slice(5)}</span>
            <span className="mon-trend-meta">{row.sample_count}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function MonitoringDashboard({ apiPrefix, title, subtitle, backTo, backLabel }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [ackBusy, setAckBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const json = await apiFetch(`${apiPrefix}/dashboard`);
      setData(json);
    } catch (e) {
      setData(null);
      setError(e.body?.error || e.message || 'Could not load monitoring data');
    } finally {
      setLoading(false);
    }
  }, [apiPrefix]);

  useEffect(() => {
    load();
  }, [load]);

  async function loadDetail(employeeId) {
    setSelectedId(employeeId);
    setDetailLoading(true);
    setDetail(null);
    try {
      const json = await apiFetch(`${apiPrefix}/employees/${employeeId}/performance?limit=80`);
      setDetail(json);
    } catch (e) {
      setDetail({ error: e.body?.error || e.message });
    } finally {
      setDetailLoading(false);
    }
  }

  async function acknowledge(alertId) {
    setAckBusy(alertId);
    setError('');
    try {
      await apiFetch(`${apiPrefix}/performance-alerts/${alertId}/acknowledge`, { method: 'PATCH', body: '{}' });
      await load();
    } catch (e) {
      setError(e.body?.error || e.message || 'Acknowledge failed');
    } finally {
      setAckBusy(null);
    }
  }

  if (loading && !data) {
    return <p className="muted">Loading monitoring dashboard…</p>;
  }

  const trend = data?.trendDaily ?? [];
  const snapshots = data?.employeeSnapshots ?? [];
  const alerts = data?.openAlerts ?? [];
  const counts = data?.counts ?? {};

  return (
    <div className="hr-page">
      <header className="hr-page-head">
        <div>
          <h1 className="hr-page-title">{title}</h1>
          <p className="muted">{subtitle}</p>
          {data?.message ? <p className="auth-alert">{data.message}</p> : null}
        </div>
        <div className="hr-page-actions">
          {backTo ? (
            <Link to={backTo} className="btn-secondary hr-link-btn">
              {backLabel || 'Back'}
            </Link>
          ) : null}
          <button type="button" className="btn-secondary" onClick={() => load()} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      {error ? (
        <div className="auth-alert" role="alert">
          {error}
        </div>
      ) : null}

      <section className="hr-stat-grid" aria-label="Monitoring summary">
        <div className="hr-stat">
          <span className="hr-stat-value">{counts.trackedEmployees ?? snapshots.length}</span>
          <span className="hr-stat-label">Employees with recent samples</span>
        </div>
        <div className="hr-stat">
          <span className="hr-stat-value">{counts.openPerformanceAlerts ?? alerts.length}</span>
          <span className="hr-stat-label">Open threshold alerts</span>
        </div>
        <div className="hr-stat">
          <span className="hr-stat-value">{counts.recordsLast24h ?? 0}</span>
          <span className="hr-stat-label">Records (24h)</span>
        </div>
      </section>

      <section className="hr-panel">
        <h2 className="hr-panel-title">Organization trend — average focus score</h2>
        <TrendBars trendDaily={trend} labelKey="avg_focus" />
      </section>

      <section className="hr-panel">
        <h2 className="hr-panel-title">Organization trend — average activity index</h2>
        <TrendBars trendDaily={trend} labelKey="avg_activity" />
      </section>

      <section className="hr-panel">
        <div className="hr-panel-head">
          <h2>Open performance alerts</h2>
          <p className="hr-panel-sub muted">Raised when live metrics fall below role thresholds on JobPosition.</p>
        </div>
        <div className="hr-table-wrap">
          <table className="hr-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Severity</th>
                <th>Details</th>
                <th>Raised</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="hr-table-empty">
                    No open alerts.
                  </td>
                </tr>
              ) : (
                alerts.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="hr-cell-title">{a.employee_name}</div>
                      <div className="muted hr-cell-sub">{a.employee_number}</div>
                    </td>
                    <td>{a.job_title || '—'}</td>
                    <td>
                      <span className="hr-pill">{a.severity}</span>
                    </td>
                    <td className="hr-preview">
                      <strong>{a.title}</strong>
                      <div className="muted">{a.body}</div>
                    </td>
                    <td className="muted">{formatDate(a.created_at)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={ackBusy === a.id}
                        onClick={() => acknowledge(a.id)}
                      >
                        {ackBusy === a.id ? '…' : 'Acknowledge'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="hr-panel">
        <div className="hr-panel-head">
          <h2>Latest metrics by employee</h2>
          <p className="hr-panel-sub muted">Click a row to load historical PerformanceRecord series.</p>
        </div>
        <div className="hr-table-wrap">
          <table className="hr-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department / role</th>
                <th>Recorded</th>
                <th>Focus</th>
                <th>Activity</th>
                <th>Alert</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.length === 0 ? (
                <tr>
                  <td colSpan={6} className="hr-table-empty">
                    No performance samples yet. Employees send real-time metrics while signed in to AWLMS.
                  </td>
                </tr>
              ) : (
                snapshots.map((s) => {
                  const m = parseMetrics(s.metrics);
                  return (
                    <tr
                      key={s.employee_id}
                      className={selectedId === s.employee_id ? 'mon-row-active' : ''}
                      onClick={() => loadDetail(s.employee_id)}
                      onKeyDown={(e) => e.key === 'Enter' && loadDetail(s.employee_id)}
                      role="button"
                      tabIndex={0}
                    >
                      <td>
                        <div className="hr-cell-title">{s.employee_name}</div>
                        <div className="muted hr-cell-sub">{s.employee_number}</div>
                      </td>
                      <td className="muted">
                        {s.department_name || '—'} · {s.job_title || '—'}
                      </td>
                      <td className="muted">{formatDate(s.recorded_at)}</td>
                      <td>{m.focus_score != null ? m.focus_score : '—'}</td>
                      <td>{m.activity_index != null ? Number(m.activity_index).toFixed(2) : '—'}</td>
                      <td>{m.alert ? <span className="hr-pill">yes</span> : '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedId ? (
        <section className="hr-panel">
          <h2 className="hr-panel-title">Historical record — {detail?.employee?.employee_name || selectedId}</h2>
          {detailLoading ? <p className="muted">Loading history…</p> : null}
          {detail?.error ? <div className="auth-alert">{detail.error}</div> : null}
          {detail?.employee ? (
            <p className="muted">
              Role thresholds (JSON):{' '}
              <code className="rec-link">{JSON.stringify(detail.employee.performance_thresholds || {})}</code>
            </p>
          ) : null}
          {detail?.records ? (
            <div className="hr-table-wrap">
              <table className="hr-table">
                <thead>
                  <tr>
                    <th>Recorded</th>
                    <th>Source</th>
                    <th>Metrics</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.records.map((r) => (
                    <tr key={r.id}>
                      <td className="muted">{formatDate(r.recorded_at)}</td>
                      <td>{r.source}</td>
                      <td>
                        <pre className="hr-json">{JSON.stringify(parseMetrics(r.metrics), null, 2)}</pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
