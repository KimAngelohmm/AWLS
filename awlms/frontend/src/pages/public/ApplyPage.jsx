import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { publicApiFetch } from '../../lib/publicApi.js';
import JobListingMeta from '../../components/JobListingMeta.jsx';
import DocumentUploadField from '../../components/DocumentUploadField.jsx';
import { DOCUMENT_FIELDS } from '../../lib/documentTypes.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];

function validateFile(file) {
  if (!file) return 'File is required.';
  if (file.size > MAX_FILE_SIZE) return 'File size must be 10 MB or less.';
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) return 'Accepted formats: PDF, DOC, DOCX, PNG, JPG, JPEG.';
  return null;
}

export default function ApplyPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', about_yourself: '' });
  const [documents, setDocuments] = useState(
    DOCUMENT_FIELDS.reduce((acc, field) => {
      acc[field.name] = { file: null, error: '' };
      return acc;
    }, {})
  );
  const [uploadStatus, setUploadStatus] = useState({});
  const [applicantId, setApplicantId] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [submitDocumentsLater, setSubmitDocumentsLater] = useState(false);

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

  function updateDocument(name, next) {
    setDocuments((prev) => ({
      ...prev,
      [name]: {
        ...prev[name],
        ...next,
      },
    }));
  }

  function getMissingRequiredDocuments() {
    return DOCUMENT_FIELDS.filter((field) => field.required && !documents[field.name].file);
  }

  function getUploadedDocumentCount() {
    return Object.values(documents).filter((docState) => docState.file).length;
  }

  async function uploadApplicantDocuments(applicantId, accessToken) {
    for (const field of DOCUMENT_FIELDS) {
      const fileState = documents[field.name];
      if (!fileState.file) continue;

      setUploadStatus((prev) => ({ ...prev, [field.name]: 'uploading' }));

      const formData = new FormData();
      formData.append('file', fileState.file);
      formData.append('document_type', field.name);
      if (accessToken) {
        formData.append('access_token', accessToken);
      } else {
        formData.append('applicant_id', applicantId);
      }

      const response = await fetch('/api/recruitment/upload-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setUploadStatus((prev) => ({ ...prev, [field.name]: 'failed' }));
        throw new Error(body.error || response.statusText || `Upload failed for ${field.label}`);
      }

      setUploadStatus((prev) => ({ ...prev, [field.name]: 'uploaded' }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // Only validate file errors if not submitting documents later
    if (!submitDocumentsLater) {
      for (const field of DOCUMENT_FIELDS) {
        const fileState = documents[field.name];
        if (!fileState.file) continue;
        const fileError = validateFile(fileState.file);
        if (fileError) {
          updateDocument(field.name, { error: fileError });
          setError('Please fix file upload errors before submitting.');
          setSubmitting(false);
          return;
        }
      }
    }

    try {
      const response = await publicApiFetch('/api/recruitment/apply', {
        method: 'POST',
        body: JSON.stringify({
          job_position_id: jobId,
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          about_yourself: form.about_yourself.trim() || null,
          application_details: null,
          submit_documents_later: submitDocumentsLater,
        }),
      });

      const applicantId = response.applicantId;
      const accessToken = response.documentAccessToken;
      if (!applicantId) {
        throw new Error('Application ID missing from server response.');
      }

      // Only upload documents if not submitting later
      if (!submitDocumentsLater) {
        await uploadApplicantDocuments(applicantId, accessToken);
      }
      
      setSubmitted(true);
      setApplicantId(applicantId);
      setAccessToken(accessToken);
    } catch (err) {
      setError(err.body?.error || err.message || 'Apply failed');
    } finally {
      setSubmitting(false);
    }
  }

  function handleRemoveFile(name) {
    updateDocument(name, { file: null, error: '' });
    setUploadStatus((prev) => ({ ...prev, [name]: 'removed' }));
  }

  return (
    <div className="apply-page">
      <div className="apply-card apply-card--wide">
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
            {applicantId && accessToken ? (
              <div className="apply-note">
                {submitDocumentsLater ? (
                  <>
                    <p><strong>Important:</strong> Please upload your required documents (Resume, Government ID, Photo) to complete your application.</p>
                    <p>
                      Upload your documents using this secure link:
                    </p>
                    <p>
                      <Link
                        to={`/applicant-documents?applicantId=${encodeURIComponent(applicantId)}&token=${encodeURIComponent(accessToken)}`}
                      >
                        Upload Missing Documents →
                      </Link>
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      Manage your submitted documents anytime using this secure link:
                    </p>
                    <p>
                      <Link
                        to={`/applicant-documents?applicantId=${encodeURIComponent(applicantId)}&token=${encodeURIComponent(accessToken)}`}
                      >
                        View and manage documents
                      </Link>
                    </p>
                  </>
                )}
              </div>
            ) : null}
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

              <div className="supporting-documents-section">
                <h3>Supporting Documents</h3>
                
                <label className="field checkbox-field">
                  <input
                    type="checkbox"
                    checked={submitDocumentsLater}
                    onChange={(e) => {
                      setSubmitDocumentsLater(e.target.checked);
                      // Clear file errors when toggling
                      if (e.target.checked) {
                        setDocuments((prev) => {
                          const cleared = {};
                          Object.keys(prev).forEach((key) => {
                            cleared[key] = { ...prev[key], error: '' };
                          });
                          return cleared;
                        });
                      }
                    }}
                  />
                  <span className="field-label-inline">
                    <strong>I will submit my documents later</strong>
                    <span className="muted"> — You can upload required documents (Resume, Government ID, Photo) after submitting your application.</span>
                  </span>
                </label>

                <p className="apply-note">
                  {submitDocumentsLater
                    ? 'Documents can be uploaded later. You will receive a link to upload them.'
                    : 'Required documents must be uploaded before submission. Optional documents are encouraged but not required.'}
                </p>
                {DOCUMENT_FIELDS.map((field) => (
                  <DocumentUploadField
                    key={field.name}
                    label={field.label}
                    name={field.name}
                    required={field.required && !submitDocumentsLater}
                    file={documents[field.name].file}
                    status={uploadStatus[field.name]}
                    error={documents[field.name].error}
                    onFileChange={(nextFile) => {
                      const fileError = nextFile ? validateFile(nextFile) : (field.required && !submitDocumentsLater) ? 'File is required.' : '';
                      updateDocument(field.name, { file: nextFile, error: fileError });
                      setUploadStatus((prev) => ({ ...prev, [field.name]: nextFile ? 'ready' : 'removed' }));
                    }}
                    onRemove={() => handleRemoveFile(field.name)}
                  />
                ))}
              </div>

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
