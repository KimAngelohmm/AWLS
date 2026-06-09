import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api.js';
import { useEmployeeWorkspace } from '../../contexts/EmployeeWorkspaceContext.jsx';

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

export default function EmployeePerformancePage() {
  const { data: dash, reload } = useEmployeeWorkspace();
  const [records, setRecords] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadError('');
      try {
        const json = await apiFetch('/api/employee/performance-records?limit=100');
        if (!cancelled) setRecords(json.records || []);
      } catch (err) {
        if (!cancelled) setLoadError(err.body?.error || err.message || 'Could not load records');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!dash?.employee) {
    return (
      <div className="emp-panel">
        <h1 className="emp-page-title">My performance</h1>
        <p className="muted">{dash?.message || 'No employee profile linked.'}</p>
      </div>
    );
  }

  return (
    <div className="emp-page">
      <header className="emp-page-head">
        <div>
          <h1 className="emp-page-title">My performance</h1>
          <p className="muted">Personal productivity metrics recorded in AWLMS for your role.</p>
        </div>
        <div className="emp-page-actions">
          <Link to="/employee" className="btn-secondary emp-link-btn">
            Overview
          </Link>
          <button type="button" className="btn-secondary" onClick={() => reload()}>
            Refresh summary
          </button>
        </div>
      </header>

      {loadError ? (
        <div className="auth-alert" role="alert">
          {loadError}
        </div>
      ) : null}

      <section className="emp-panel">
        <div className="emp-table-wrap">
          <table className="emp-table">
            <thead>
              <tr>
                <th>Recorded</th>
                <th>Source</th>
                <th>Metrics</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={4} className="emp-table-empty">
                    No performance records on file.
                  </td>
                </tr>
              ) : (
                records.map((row) => (
                  <tr key={row.id}>
                    <td className="muted">{formatDate(row.recorded_at)}</td>
                    <td>{row.source}</td>
                    <td>
                      <pre className="emp-json">{JSON.stringify(parseMetrics(row.metrics), null, 2)}</pre>
                    </td>
                    <td className="muted">{row.notes || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
