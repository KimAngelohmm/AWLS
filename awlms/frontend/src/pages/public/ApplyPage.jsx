import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { publicApiFetch } from '../../lib/publicApi.js';
import JobListingMeta from '../../components/JobListingMeta.jsx';

export default function ApplyPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', about_yourself: '' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError('');
      try {
        const data = await publicApiFetch(`/api/recruitment/jobs/${jobId}`);
        if (!cancelled) setJob(data.job);
      } catch (e) {
        if (!cancelled) setError(e.body?.error || e.message);
      }
    }
    if (jobId) load();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await publicApiFetch('/api/recruitment/apply', {
        method: 'POST',
        body: JSON.stringify({
          job_position_id: jobId,
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          about_yourself: form.about_yourself.trim() || null,
        }),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.body?.error || err.message || 'Apply failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="apply-page">
      <div className="apply-card">
        <p className="apply-kicker">AWLMS · Public application</p>
        <h1>Apply for role</h1>
        {error ? (
          <div className="auth-alert" role="alert">
            {error}
          </div>
        ) : null}
        {!job && !error ? <p className="muted">Loading job…</p> : null}
        {job && submitted ? (
          <div className="apply-success" role="status">
            <h2 className="apply-job-title">Application submitted</h2>
            <p>
              Thank you for applying for <strong>{job.title}</strong>
              {job.department_name ? <> in <strong>{job.department_name}</strong></> : null}.
            </p>
            <p className="muted">
              We have received your application. You will be notified by email if you are selected for an AI interview.
            </p>
            <p className="apply-foot">
              <Link to="/careers">← View other positions</Link>
              {' · '}
              <Link to="/login">HR sign in</Link>
            </p>
          </div>
        ) : null}
        {job && !submitted ? (
          <>
            <h2 className="apply-job-title">{job.title}</h2>
            <JobListingMeta job={job} className="careers-card-meta apply-job-meta" />
            {job.description ? <p className="apply-desc">{job.description}</p> : null}
            <form className="apply-form" onSubmit={handleSubmit}>
              <label className="field">
                <span className="field-label">Full name</span>
                <input
                  className="field-input"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">Email address</span>
                <input
                  className="field-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">Phone (optional)</span>
                <input
                  className="field-input"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field-label">About yourself</span>
                <textarea
                  className="field-input"
                  rows={4}
                  placeholder="Briefly describe your background, skills, and why you are interested in this role."
                  value={form.about_yourself}
                  onChange={(e) => setForm((f) => ({ ...f, about_yourself: e.target.value }))}
                />
              </label>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Application'}
              </button>
            </form>
          </>
        ) : null}
        {!submitted ? (
          <p className="apply-foot muted">
            <Link to="/careers">← Open positions</Link>
            {' · '}
            <Link to="/login">HR sign in</Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
