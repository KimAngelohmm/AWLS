import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api.js';
import { DOCUMENT_TYPE_LABELS } from '../../lib/documentTypes.js';

function formatDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
}

function statusBadge(status) {
  const classes = {
    uploaded: 'hr-pill hr-pill--pending',
    verified: 'hr-pill hr-pill--open',
    rejected: 'hr-pill hr-pill--closed',
  };
  return <span className={classes[status] || 'hr-pill'}>{status}</span>;
}

export default function HrDocumentVerificationPage() {
  const [documents, setDocuments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';

  const loadDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/api/hr/recruitment/applicants/documents${query}`);
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err.body?.error || err.message || 'Could not load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [query]);

  const onVerify = async (document) => {
    const comments = window.prompt('Optional verification notes:', '');
    if (comments === null) return;
    setSaving(true);
    try {
      await apiFetch(`/api/hr/recruitment/applicants/${document.applicant_id}/documents/${document.document_id}/verify`, {
        method: 'POST',
        body: JSON.stringify({ comments }),
      });
      await loadDocuments();
    } catch (err) {
      window.alert(err.body?.error || err.message || 'Could not verify document');
    } finally {
      setSaving(false);
    }
  };

  const onReject = async (document) => {
    const comments = window.prompt('Enter rejection notes (required):', '');
    if (comments === null) return;
    if (!comments.trim()) {
      window.alert('Rejection notes are required.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/hr/recruitment/applicants/${document.applicant_id}/documents/${document.document_id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ comments }),
      });
      await loadDocuments();
    } catch (err) {
      window.alert(err.body?.error || err.message || 'Could not reject document');
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(() => {
    return documents.reduce(
      (agg, doc) => {
        agg.total += 1;
        if (doc.verification_status === 'uploaded') agg.uploaded += 1;
        if (doc.verification_status === 'verified') agg.verified += 1;
        if (doc.verification_status === 'rejected') agg.rejected += 1;
        return agg;
      },
      { total: 0, uploaded: 0, verified: 0, rejected: 0 }
    );
  }, [documents]);

  return (
    <div className="hr-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="hr-panel-title">Document Verification</h1>
          <p className="muted" style={{ maxWidth: 640, marginTop: '0.5rem' }}>
            Review applicant files, verify valid documents, and reject unsupported submissions with notes.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="muted">Total documents</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{totals.total}</div>
        </div>
      </div>

      <div className="hr-panel" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <label className="field" style={{ margin: 0 }}>
            <span className="field-label">Status filter</span>
            <select
              className="field-input"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="uploaded">Needs review</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <button type="button" className="btn-secondary" onClick={loadDocuments} disabled={loading || saving}>
            Refresh
          </button>
          <div className="muted">Uploads: {totals.uploaded} · Verified: {totals.verified} · Rejected: {totals.rejected}</div>
        </div>
      </div>

      {error && <div className="auth-alert" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="hr-table-wrap">
        <table className="hr-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Role</th>
              <th>Document</th>
              <th>Status</th>
              <th>Uploaded</th>
              <th>Comments</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="hr-table-empty">Loading documents…</td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={7} className="hr-table-empty">No documents match the selected filters.</td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.document_id}>
                  <td>
                    <div className="hr-cell-title">{doc.applicant_name}</div>
                    <div className="muted hr-cell-sub">{doc.applicant_email}</div>
                  </td>
                  <td>{doc.job_title || '—'}</td>
                  <td>
                    <div>{DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}</div>
                    <div className="muted" style={{ fontSize: '0.85rem' }}>{doc.original_filename}</div>
                  </td>
                  <td>{statusBadge(doc.verification_status)}</td>
                  <td>{formatDate(doc.upload_timestamp)}</td>
                  <td>{doc.verification_comments || '—'}</td>
                  <td className="rec-actions" style={{ gap: '0.5rem' }}>
                    <a
                      className="btn-secondary"
                      href={`/api/hr/recruitment/documents/${encodeURIComponent(doc.document_id)}/download`}
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={saving || doc.verification_status === 'verified'}
                      onClick={() => onVerify(doc)}
                    >
                      Verify
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={saving}
                      onClick={() => onReject(doc)}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
