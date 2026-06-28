import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api.js';
import { useHrDashboard } from '../../contexts/HrDashboardContext.jsx';
import {
  EMPLOYMENT_TYPE_OPTIONS,
  LOCATION_OPTIONS,
  employmentTypeLabel,
  locationLabel,
  openingsLabel,
} from '../../lib/jobLabels.js';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

const defaultCompetencies = JSON.stringify(
  { communication: 'Clear written and verbal communication', teamwork: 'Collaborates effectively' },
  null,
  2
);
const defaultCriteria = JSON.stringify(
  { scoring: '1-5 per competency', pass_threshold: 'Average ≥ 3.5' },
  null,
  2
);

function parseMessages(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw);
      return Array.isArray(j) ? j : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Modal to send AI interview link to applicant */
function SendInterviewLinkModal({ applicant, interviewLink, onClose, onSend }) {
  const [email, setEmail] = useState(applicant?.email || '');
  const [hrEmail, setHrEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [regenerateLink, setRegenerateLink] = useState(false);
  const [sending, setSending] = useState(false);
  const displayedInterviewLink = regenerateLink
    ? 'A fresh interview link will be generated when you send this email.'
    : (interviewLink && !interviewLink.endsWith('/undefined')
        ? interviewLink
        : 'An interview link will be generated when you send this email.');

  const handleSend = async () => {
    if (!email.trim()) {
      alert('Please enter applicant email');
      return;
    }
    if (!hrEmail.trim()) {
      alert('Please enter your email');
      return;
    }
    setSending(true);
    try {
      await onSend(email, subject, hrEmail, regenerateLink);
      alert(regenerateLink ? 'A new interview link was generated and sent successfully!' : 'Interview link sent successfully!');
      onClose();
    } catch (err) {
      alert('Error: ' + (err.message || 'Failed to send link'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rec-modal-overlay" onClick={onClose}>
      <div className="rec-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rec-modal-head">
          <div>
            <h2 className="rec-modal-title">Send AI Interview Link</h2>
            <p className="rec-modal-sub">{applicant?.full_name}</p>
          </div>
          <button type="button" className="rec-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="rec-modal-section">
          <label className="field">
            <span className="field-label">Applicant Email</span>
            <input
              className="field-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="applicant@example.com"
            />
          </label>
        </div>

        <div className="rec-modal-section">
          <label className="field">
            <span className="field-label">Your Email</span>
            <input
              className="field-input"
              type="email"
              value={hrEmail}
              onChange={(e) => setHrEmail(e.target.value)}
              placeholder="your.email@company.com"
            />
          </label>
        </div>

        <div className="rec-modal-section">
          <p className="field-label" style={{ marginBottom: '0.5rem' }}>Interview Link</p>
          <div className="rec-link-display">
            <code>{displayedInterviewLink}</code>
          </div>
          <div className="field" style={{ marginTop: '0.75rem' }}>
            <span className="field-label">Link Options</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={regenerateLink}
                onChange={(e) => setRegenerateLink(e.target.checked)}
              />
              <span>Generate a new interview link before sending this email</span>
            </label>
          </div>
        </div>

        <div className="rec-modal-section">
          <label className="field">
            <span className="field-label">Subject / Notes</span>
            <textarea
              className="field-input"
              rows={4}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Add any notes or context for the applicant..."
            />
          </label>
        </div>

        <div className="rec-modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={sending}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSend} disabled={sending}>
            {sending ? 'Sending…' : 'Send Interview Link'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Modal to view full interview transcript and assessment for an applicant */
function TranscriptModal({ applicantId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await apiFetch(`/api/hr/recruitment/applicants/${applicantId}/transcript`);
        if (!cancelled) setData(res.applicant);
      } catch (e) {
        if (!cancelled) setError(e.body?.error || e.message || 'Could not load transcript');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [applicantId]);

  const messages = data ? parseMessages(data.interview_messages) : [];

  return (
    <div className="rec-modal-overlay" onClick={onClose}>
      <div className="rec-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rec-modal-head">
          <div>
            <h2 className="rec-modal-title">Interview Transcript</h2>
            {data && (
              <p className="rec-modal-sub">
                {data.full_name} · {data.job_title} ·{' '}
                <span className="hr-pill">{data.interview_status}</span>
              </p>
            )}
          </div>
          <button type="button" className="rec-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {loading && <p className="muted" style={{ padding: '1rem 0' }}>Loading…</p>}
        {error && <div className="auth-alert">{error}</div>}

        {data && !loading && (
          <>
            {/* Assessment summary */}
            {data.about_yourself && (
              <div className="rec-modal-section">
                <p className="rec-modal-section-label">About the applicant</p>
                <div className="rec-modal-summary">{data.about_yourself}</div>
              </div>
            )}

            {data.assessment_summary && (
              <div className="rec-modal-section">
                <p className="rec-modal-section-label">AI Assessment Summary</p>
                <div className="rec-modal-summary">{data.assessment_summary}</div>
                {data.ai_recommendation && (
                  <p className="rec-modal-rec">
                    AI Recommendation:{' '}
                    <span className={`hr-pill ${data.ai_recommendation === 'hire' ? 'hr-pill--open' : ''}`}>
                      {data.ai_recommendation === 'hire' ? 'Hire' : 'No Hire'}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Chat transcript */}
            <div className="rec-modal-section">
              <p className="rec-modal-section-label">
                Conversation ({messages.length} message{messages.length !== 1 ? 's' : ''})
              </p>
              <div className="rec-chat-scroll">
                {messages.length === 0 && (
                  <p className="muted" style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>No messages recorded.</p>
                )}
                {messages.map((m, i) => (
                  <div
                    key={m.id || `${m.ts || ''}-${i}`}
                    className={`rec-chat-bubble rec-chat-bubble--${m.role === 'user' ? 'user' : 'ai'}`}
                  >
                    <span className="rec-chat-label">
                      {m.role === 'user' ? data.full_name : 'AI Interviewer'}
                    </span>
                    <p className="rec-chat-text">{m.content}</p>
                    {m.ts && (
                      <span className="rec-chat-ts">{new Date(m.ts).toLocaleTimeString()}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function statusLabel(decision) {
  const labels = {
    pending_review: 'Pending review',
    pending_documents: 'Pending documents',
    interview_invited: 'Interview invited',
    under_review: 'Under review',
    approved: 'Approved',
    rejected: 'Rejected',
    pending: 'Pending',
    withdrawn: 'Withdrawn',
  };
  return labels[decision] || decision;
}

export default function HrRecruitmentModule() {
  const { data: dash, loading: dashLoading, error: dashError, reload: reloadDash } = useHrDashboard();
  const [jobs, setJobs] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [applicantsByJob, setApplicantsByJob] = useState({});
  const [loadingApplicants, setLoadingApplicants] = useState({});
  const [loadError, setLoadError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewTranscriptId, setViewTranscriptId] = useState(null);
  const [sendLinkApplicant, setSendLinkApplicant] = useState(null);
  const [retakeApplicant, setRetakeApplicant] = useState(null);

  const [departments, setDepartments] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '',
    department_id: '',
    employment_type: 'full_time',
    location: 'on_site',
    number_of_openings: 1,
    description: '',
    status: 'open',
    competency_requirements: defaultCompetencies,
    interview_criteria: defaultCriteria,
  });

  const loadRecruitment = useCallback(async () => {
    setLoadError('');
    try {
      const [j, a] = await Promise.all([
        apiFetch('/api/hr/recruitment/job-positions'),
        apiFetch('/api/hr/recruitment/assessments-pending'),
      ]);
      setJobs(j.jobPositions || []);
      setAssessments(a.assessments || []);
    } catch (err) {
      setLoadError(err.body?.error || err.message || 'Could not load recruitment data');
    }
  }, []);

  useEffect(() => {
    loadRecruitment();
  }, [loadRecruitment]);

  useEffect(() => {
    let cancelled = false;
    async function loadDepartments() {
      try {
        const res = await apiFetch('/api/hr/recruitment/departments');
        if (!cancelled) setDepartments(res.departments || []);
      } catch {
        if (!cancelled) setDepartments([]);
      }
    }
    loadDepartments();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (retakeApplicant) {
      // Auto-open the send link modal when retake applicant is set
      // The modal will be shown in the render
    }
  }, [retakeApplicant]);

  async function createJob(e) {
    e.preventDefault();
    let competency;
    let criteria;
    try {
      competency = JSON.parse(form.competency_requirements);
      criteria = JSON.parse(form.interview_criteria);
    } catch {
      setLoadError('Competencies and interview criteria must be valid JSON.');
      return;
    }
    setSaving(true);
    setLoadError('');
    try {
      await apiFetch('/api/hr/recruitment/job-positions', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title.trim(),
          department_id: form.department_id || null,
          employment_type: form.employment_type || null,
          location: form.location || null,
          number_of_openings: Number(form.number_of_openings) || 1,
          description: form.description.trim() || null,
          status: form.status,
          competency_requirements: competency,
          interview_criteria: criteria,
        }),
      });
      setShowCreate(false);
      setForm({
        title: '',
        department_id: '',
        employment_type: 'full_time',
        location: 'on_site',
        number_of_openings: 1,
        description: '',
        status: 'open',
        competency_requirements: defaultCompetencies,
        interview_criteria: defaultCriteria,
      });
      await loadRecruitment();
      await reloadDash();
    } catch (err) {
      setLoadError(err.body?.error || err.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  async function setJobStatus(id, status) {
    setSaving(true);
    setLoadError('');
    try {
      await apiFetch(`/api/hr/recruitment/job-positions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadRecruitment();
      await reloadDash();
    } catch (err) {
      setLoadError(err.body?.error || err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function deleteJob(id, title) {
    const applicantCount = applicantsByJob[id]?.length ?? 0;
    const applicantNote =
      applicantCount > 0
        ? `\n• ${applicantCount} applicant record(s) for this posting will be removed.`
        : '';
    const ok = window.confirm(
      `Delete job listing "${title}"?\n\n• Employees on this role will move to your other job listing if you have one.${applicantNote}\n• If this is the only listing, create another job first, then delete.\n\nThis cannot be undone.`
    );
    if (!ok) return;

    setSaving(true);
    setLoadError('');
    setSuccessMsg('');
    try {
      const res = await apiFetch(`/api/hr/recruitment/job-positions/${id}`, { method: 'DELETE' });
      setApplicantsByJob((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setLoadingApplicants((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      let msg = `Deleted "${title}".`;
      if (res.reassignedEmployees > 0 && res.reassignedToJobTitle) {
        msg += ` ${res.reassignedEmployees} employee(s) moved to "${res.reassignedToJobTitle}".`;
      }
      setSuccessMsg(msg);
      await loadRecruitment();
      await reloadDash();
    } catch (err) {
      setSuccessMsg('');
      setLoadError(err.body?.error || err.message || 'Delete failed');
      window.alert(err.body?.error || err.message || 'Could not delete this job listing.');
    } finally {
      setSaving(false);
    }
  }

  async function loadApplicants(jobId) {
    setLoadingApplicants((prev) => ({ ...prev, [jobId]: true }));
    setLoadError('');
    try {
      const res = await apiFetch(`/api/hr/recruitment/job-positions/${jobId}/applicants`);
      setApplicantsByJob((prev) => ({ ...prev, [jobId]: res.applicants || [] }));
    } catch (err) {
      setLoadError(err.body?.error || err.message || 'Could not load applicants');
    } finally {
      setLoadingApplicants((prev) => ({ ...prev, [jobId]: false }));
    }
  }

  async function inviteToInterview(applicantId, jobId) {
    setSaving(true);
    setLoadError('');
    try {
      await apiFetch(`/api/hr/recruitment/applicants/${applicantId}/invite-interview`, {
        method: 'POST',
      });
      await loadApplicants(jobId);
      await loadRecruitment();
    } catch (err) {
      setLoadError(err.body?.error || err.message || 'Invite failed');
    } finally {
      setSaving(false);
    }
  }

  async function sendInterviewLink(applicantId, email, subject, jobId, hrEmail, regenerateToken = false) {
    setSaving(true);
    setLoadError('');
    try {
      await apiFetch(`/api/hr/recruitment/applicants/${applicantId}/send-interview-link`, {
        method: 'POST',
        body: JSON.stringify({ email, subject, hrEmail, regenerateToken }),
      });
      setSuccessMsg(regenerateToken ? `New interview link sent to ${email}` : `Interview link sent to ${email}`);
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadApplicants(jobId);
      return { success: true };
    } catch (err) {
      const errorMsg = err.body?.error || err.message || 'Failed to send link';
      setLoadError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setSaving(false);
    }
  }

  async function reviewApplicant(id, hiring_decision) {
    setSaving(true);
    setLoadError('');
    try {
      await apiFetch(`/api/hr/recruitment/applicants/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ hiring_decision }),
      });
      await loadRecruitment();
      await reloadDash();
    } catch (err) {
      setLoadError(err.body?.error || err.message || 'Review failed');
    } finally {
      setSaving(false);
    }
  }

  async function allowRetake(id) {
    setSaving(true);
    setLoadError('');
    try {
      const res = await apiFetch(`/api/hr/recruitment/applicants/${id}/allow-retake`, {
        method: 'POST',
      });
      
      // Get the applicant details
      const applicantRes = await apiFetch(`/api/hr/recruitment/applicants/${id}/transcript`);
      const applicant = applicantRes.applicant;
      
      // Set applicant with new token for sending new link
      setRetakeApplicant({
        id: applicant.id,
        full_name: applicant.full_name,
        email: applicant.email,
        interview_token: res.newInterviewToken,
        jobId: applicant.job_position_id
      });
      
      setSuccessMsg('Applicant has been given another interview opportunity. Send them the new link below.');
    } catch (err) {
      setLoadError(err.body?.error || err.message || 'Could not allow retake');
    } finally {
      setSaving(false);
    }
  }

  const jobsDash = dash?.activeJobPostings ?? [];
  const pendingDash = dash?.pendingAssessments ?? [];

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="hr-page">
      <header className="hr-page-head">
        <div>
          <h1 className="hr-page-title">Recruitment & Screening (AI)</h1>
          <p className="muted">
            Define open roles with competencies and interview rubrics. Applicants receive an LLM-powered structured
            interview (one question at a time). Completed assessments appear below and on the HR overview for final
            review.
          </p>
        </div>
        <div className="hr-page-actions">
          <Link to="/hr" className="btn-secondary hr-link-btn">
            Overview
          </Link>
          <button type="button" className="btn-secondary" onClick={() => loadRecruitment()} disabled={dashLoading}>
            Refresh
          </button>
        </div>
      </header>

      {dashError ? (
        <div className="auth-alert" role="alert">
          {dashError}
        </div>
      ) : null}
      {loadError ? (
        <div className="auth-alert" role="alert">
          {loadError}
        </div>
      ) : null}
      {successMsg ? (
        <div className="auth-success" role="status">
          {successMsg}
        </div>
      ) : null}

      <section className="hr-panel">
        <div className="hr-panel-head">
          <h2 className="hr-panel-title">Actions</h2>
          <button type="button" className="btn-primary" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? 'Close form' : 'New job position'}
          </button>
        </div>
        {showCreate ? (
          <form className="rec-form" onSubmit={createJob}>
            <label className="field">
              <span className="field-label">Title</span>
              <input
                className="field-input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Department</span>
              <select
                className="field-input"
                value={form.department_id}
                onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))}
              >
                <option value="">— Select department —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Employment type</span>
              <select
                className="field-input"
                value={form.employment_type}
                onChange={(e) => setForm((f) => ({ ...f, employment_type: e.target.value }))}
                required
              >
                {EMPLOYMENT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Location</span>
              <select
                className="field-input"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                required
              >
                {LOCATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Number of openings</span>
              <input
                className="field-input"
                type="number"
                min={1}
                step={1}
                value={form.number_of_openings}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    number_of_openings: Math.max(1, Number.parseInt(e.target.value, 10) || 1),
                  }))
                }
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Description</span>
              <textarea
                className="field-input"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <label className="field">
              <span className="field-label">Initial status</span>
              <select
                className="field-input"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="draft">draft</option>
                <option value="open">open (accepts applications)</option>
                <option value="closed">closed</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Competency requirements (JSON)</span>
              <textarea
                className="field-input rec-mono"
                rows={6}
                value={form.competency_requirements}
                onChange={(e) => setForm((f) => ({ ...f, competency_requirements: e.target.value }))}
              />
            </label>
            <label className="field">
              <span className="field-label">Interview criteria / rubric (JSON)</span>
              <textarea
                className="field-input rec-mono"
                rows={6}
                value={form.interview_criteria}
                onChange={(e) => setForm((f) => ({ ...f, interview_criteria: e.target.value }))}
              />
            </label>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Create position'}
            </button>
          </form>
        ) : null}
      </section>

      <section className="hr-panel">
        <h2 className="hr-panel-title">All job positions</h2>
        <div className="hr-table-wrap">
          <table className="hr-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Department</th>
                <th>Type / Location</th>
                <th>Openings</th>
                <th>Public apply link</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="hr-table-empty">
                    No positions yet. Create one above.
                  </td>
                </tr>
              ) : (
                jobs.flatMap((j) => {
                  const applicants = applicantsByJob[j.id];
                  const loadingApps = loadingApplicants[j.id];
                  const rows = [
                    <tr key={j.id}>
                      <td>{j.title}</td>
                      <td>
                        <span className="hr-pill">{j.status}</span>
                      </td>
                      <td className="muted">{j.department_name || '—'}</td>
                      <td className="muted">
                        {[employmentTypeLabel(j.employment_type), locationLabel(j.location)]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </td>
                      <td>{openingsLabel(j.number_of_openings) || '—'}</td>
                      <td>
                        {j.status === 'open' ? (
                          <>
                            <code className="rec-link">{`${origin}/careers`}</code>
                            <br />
                            <code className="rec-link">{`${origin}/apply/${j.id}`}</code>
                          </>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className="rec-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={loadingApps}
                          onClick={() => loadApplicants(j.id)}
                        >
                          {loadingApps ? 'Loading…' : applicants ? 'Refresh applicants' : 'View applicants'}
                        </button>
                        {j.status !== 'open' ? (
                          <button type="button" className="btn-secondary" disabled={saving} onClick={() => setJobStatus(j.id, 'open')}>
                            Open
                          </button>
                        ) : (
                          <button type="button" className="btn-secondary" disabled={saving} onClick={() => setJobStatus(j.id, 'closed')}>
                            Close
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-secondary rec-btn-delete"
                          disabled={saving}
                          onClick={() => deleteJob(j.id, j.title)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>,
                  ];
                  if (applicants) {
                    rows.push(
                      <tr key={`${j.id}-applicants`}>
                        <td colSpan={7} style={{ padding: 0, border: 'none' }}>
                          <div className="rec-applicants-panel" style={{ padding: '1rem 1.25rem' }}>
                            <p className="hr-panel-sub" style={{ marginBottom: '0.75rem' }}>
                              Applicants for <strong>{j.title}</strong> ({applicants.length})
                            </p>
                            {applicants.length === 0 ? (
                              <p className="muted hr-table-empty">No applications yet.</p>
                            ) : (
                              <div className="hr-table-wrap">
                                <table className="hr-table">
                                  <thead>
                                    <tr>
                                      <th>Name / Email</th>
                                      <th>Status</th>
                                      <th>Interview</th>
                                      <th>Documents</th>
                                      <th>About</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {applicants.map((a) => (
                                      <tr key={a.id}>
                                        <td>
                                          <div className="hr-cell-title">{a.full_name}</div>
                                          <div className="muted hr-cell-sub">{a.email}</div>
                                          {a.missing_required_documents > 0 && (
                                            <span className="hr-badge hr-badge--warning" title="Missing required documents">
                                              ⚠ Pending Documents
                                            </span>
                                          )}
                                        </td>
                                        <td>
                                          <span className={`hr-pill ${a.hiring_decision === 'pending_documents' ? 'hr-pill--warning' : ''}`}>
                                            {statusLabel(a.hiring_decision)}
                                          </span>
                                        </td>
                                        <td className="muted">{a.interview_status || '—'}</td>
                                        <td>
                                          <div>{a.document_count} uploaded</div>
                                          <div className="muted">{a.missing_required_documents ? `${a.missing_required_documents} required missing` : 'Required docs met'}</div>
                                        </td>
                                        <td className="hr-preview">
                                          {a.about_yourself
                                            ? a.about_yourself.length > 120
                                              ? `${a.about_yourself.slice(0, 120)}…`
                                              : a.about_yourself
                                            : '—'}
                                        </td>
                                        <td className="rec-actions">
                                          {a.hiring_decision === 'pending_review' ? (
                                            <button
                                              type="button"
                                              className="btn-primary"
                                              disabled={saving}
                                              onClick={() => setSendLinkApplicant({ ...a, jobId: j.id })}
                                            >
                                              Send a link for an online AI Interview
                                            </button>
                                          ) : null}
                                          {a.interview_status === 'completed' && a.hiring_decision === 'pending_review' ? (
                                            <>
                                              <button
                                                type="button"
                                                className="btn-primary"
                                                disabled={saving}
                                                onClick={() => reviewApplicant(a.id, 'approved')}
                                              >
                                                Accept
                                              </button>
                                              <button
                                                type="button"
                                                className="btn-secondary"
                                                disabled={saving}
                                                onClick={() => reviewApplicant(a.id, 'rejected')}
                                              >
                                                Reject
                                              </button>
                                              <button
                                                type="button"
                                                className="btn-tertiary"
                                                disabled={saving}
                                                onClick={() => setSendLinkApplicant({ ...a, jobId: j.id })}
                                              >
                                                Another Interview
                                              </button>
                                            </>
                                          ) : null}
                                          {a.interview_status === 'completed' ? (
                                            <button
                                              type="button"
                                              className="btn-secondary"
                                              onClick={() => setViewTranscriptId(a.id)}
                                            >
                                              Transcript
                                            </button>
                                          ) : null}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return rows;
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="hr-panel">
        <h2 className="hr-panel-title">Assessment summaries pending HR review</h2>
        <p className="hr-panel-sub muted">
          Includes AI-completed interviews (<code>interview_status = completed</code>) and legacy rows with a summary.
          Confirm or override the AI recommendation.
        </p>
        <div className="hr-table-wrap">
          <table className="hr-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Role</th>
                <th>AI rec.</th>
                <th>Summary</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assessments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="hr-table-empty">
                    No assessments in review.
                  </td>
                </tr>
              ) : (
                assessments.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="hr-cell-title">{a.full_name}</div>
                      <div className="muted hr-cell-sub">{a.email}</div>
                    </td>
                    <td>{a.job_title}</td>
                    <td>
                      {a.ai_recommendation ? (
                        <span className="hr-pill">{a.ai_recommendation === 'no_hire' ? 'Reject' : 'Accept'}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="hr-preview">{a.assessment_summary}</td>
                    <td className="rec-actions">
                      <button type="button" className="btn-secondary" onClick={() => setViewTranscriptId(a.id)}>
                        Transcript
                      </button>
                      <button type="button" className="btn-secondary rec-btn-retake" disabled={saving} onClick={() => allowRetake(a.id)}>
                        Give Another Interview
                      </button>
                      <button type="button" className="btn-primary" disabled={saving} onClick={() => reviewApplicant(a.id, 'approved')}>
                        Approve hire
                      </button>
                      <button type="button" className="btn-secondary" disabled={saving} onClick={() => reviewApplicant(a.id, 'rejected')}>
                        Reject
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
        <h2 className="hr-panel-title">Overview snapshot (dashboard feed)</h2>
        <p className="muted">Open postings: {jobsDash.length}. Pending assessments in feed: {pendingDash.length}.</p>
      </section>

      {viewTranscriptId && (
        <TranscriptModal
          applicantId={viewTranscriptId}
          onClose={() => setViewTranscriptId(null)}
        />
      )}

      {sendLinkApplicant && (
        <SendInterviewLinkModal
          applicant={sendLinkApplicant}
          interviewLink={`${origin}/interview/${sendLinkApplicant.interview_token}`}
          onClose={() => setSendLinkApplicant(null)}
          onSend={(email, subject, hrEmail, regenerateToken) => sendInterviewLink(sendLinkApplicant.id, email, subject, sendLinkApplicant.jobId, hrEmail, regenerateToken)}
        />
      )}

      {retakeApplicant && (
        <SendInterviewLinkModal
          applicant={retakeApplicant}
          interviewLink={`${origin}/interview/${retakeApplicant.interview_token}`}
          onClose={() => {
            setRetakeApplicant(null);
            setSuccessMsg('');
            loadRecruitment();
            reloadDash();
          }}
          onSend={(email, subject, hrEmail, regenerateToken) => sendInterviewLink(retakeApplicant.id, email, subject, retakeApplicant.jobId, hrEmail, regenerateToken)}
        />
      )}
    </div>
  );
}
