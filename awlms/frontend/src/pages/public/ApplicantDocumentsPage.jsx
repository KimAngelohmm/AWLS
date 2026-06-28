import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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

export default function ApplicantDocumentsPage() {
  const [searchParams] = useSearchParams();
  const applicantId = searchParams.get('applicantId');
  const token = searchParams.get('token');

  const [documents, setDocuments] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [uploading, setUploading] = useState(false);

  const authorized = Boolean(applicantId && token);

  const documentsByType = useMemo(
    () => Object.fromEntries(documents.map((doc) => [doc.document_type, doc])),
    [documents]
  );

  const documentStatus = useMemo(() => {
    return DOCUMENT_FIELDS.map((field) => {
      const doc = documentsByType[field.name];
      return {
        ...field,
        status: doc ? doc.verification_status || 'uploaded' : 'pending',
      };
    });
  }, [documentsByType]);

  const totalUploadedCount = documents.length;

  useEffect(() => {
    async function loadDocuments() {
      if (!authorized) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setSubmitError('');
      try {
        const res = await fetch(
          `/api/recruitment/applicants/${encodeURIComponent(applicantId)}/documents?token=${encodeURIComponent(token)}`
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || res.statusText);
        }
        const data = await res.json();
        setDocuments(data.documents || []);
      } catch (err) {
        setSubmitError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDocuments();
  }, [applicantId, token, authorized]);

  function handleFileChange(type, file) {
    const error = file ? validateFile(file) : '';
    setSelectedFiles((prev) => ({ ...prev, [type]: file }));
    setErrors((prev) => ({ ...prev, [type]: error }));
  }

  async function handleUpload(type) {
    const file = selectedFiles[type];
    if (!file) {
      setErrors((prev) => ({ ...prev, [type]: 'Please select a file.' }));
      return;
    }
    const error = validateFile(file);
    if (error) {
      setErrors((prev) => ({ ...prev, [type]: error }));
      return;
    }
    setUploading(true);
    setSubmitError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', type);
      formData.append('access_token', token);

      const res = await fetch('/api/recruitment/upload-document', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || res.statusText);
      }
      setMessage('Document uploaded successfully.');
      setSelectedFiles((prev) => ({ ...prev, [type]: null }));
      await refreshDocuments();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function refreshDocuments() {
    if (!authorized) return;
    try {
      const res = await fetch(
        `/api/recruitment/applicants/${encodeURIComponent(applicantId)}/documents?token=${encodeURIComponent(token)}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || res.statusText);
      }
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      setSubmitError(err.message);
    }
  }

  async function handleDelete(documentId) {
    setUploading(true);
    setSubmitError('');
    try {
      const res = await fetch(
        `/api/recruitment/documents/${encodeURIComponent(documentId)}?token=${encodeURIComponent(token)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || res.statusText);
      }
      setMessage('Document deleted successfully.');
      await refreshDocuments();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="applicant-documents-page">
      <div className="applicant-documents-card">
        <h1>Applicant Document Center</h1>
        {!authorized ? (
          <div className="auth-alert" role="alert">
            A secure applicant link is required to view or manage documents.
          </div>
        ) : null}

        {submitError ? (
          <div className="auth-alert" role="alert">
            {submitError}
          </div>
        ) : null}
        {message ? <div className="auth-note">{message}</div> : null}

        {authorized ? (
          <>
            <div className="document-checklist">
              <h2>Required Documents Checklist</h2>
              <p className="muted">
                {totalUploadedCount >= 3
                  ? `You have uploaded ${totalUploadedCount} documents. Minimum upload requirement met.`
                  : `You have uploaded ${totalUploadedCount} documents. At least 3 documents are required to keep your application active.`}
              </p>
              <ul>
                {documentStatus.map((field) => (
                  <li
                    key={field.name}
                    className={
                      field.status === 'verified'
                        ? 'document-status--verified'
                        : field.status === 'uploaded'
                        ? 'document-status--complete'
                        : 'document-status--pending'
                    }
                  >
                    <strong>{field.label}</strong> — {field.status === 'pending' ? 'Pending' : field.status === 'verified' ? 'Verified' : 'Uploaded'}
                  </li>
                ))}
              </ul>
            </div>

            <div className="document-upload-grid">
              {DOCUMENT_FIELDS.map((field) => {
                const existingDoc = documentsByType[field.name];
                return (
                  <div key={field.name} className="document-upload-card">
                    <h3>{field.label}</h3>
                    <p className="muted">{field.required ? 'Required' : 'Optional'}</p>
                    <input
                      type="file"
                      accept={ALLOWED_EXTENSIONS.join(',')}
                      onChange={(e) => handleFileChange(field.name, e.target.files?.[0] || null)}
                    />
                    {errors[field.name] ? <p className="document-upload-error">{errors[field.name]}</p> : null}
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={uploading}
                      onClick={() => handleUpload(field.name)}
                    >
                      Upload {existingDoc ? 'Again' : 'File'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="document-list">
              <h2>Uploaded Documents</h2>
              {loading ? (
                <p>Loading documents…</p>
              ) : documents.length === 0 ? (
                <p>No documents have been uploaded yet.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Filename</th>
                      <th>Status</th>
                      <th>Uploaded</th>
                      <th>Last updated</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id}>
                        <td>{doc.document_type_label}</td>
                        <td>{doc.original_filename}</td>
                        <td>{doc.verification_status ? doc.verification_status.replace('_', ' ') : 'Uploaded'}</td>
                        <td>{new Date(doc.uploaded_at).toLocaleString()}</td>
                        <td>{new Date(doc.last_updated_at || doc.uploaded_at).toLocaleString()}</td>
                        <td>
                          <a
                            href={`/api/recruitment/documents/${encodeURIComponent(doc.id)}/download?token=${encodeURIComponent(token)}`}
                            className="btn-link"
                          >
                            Download
                          </a>
                          {' · '}
                          <button type="button" className="btn-link" disabled={uploading} onClick={() => handleDelete(doc.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : null}

        <p className="apply-foot">
          <Link to="/careers">← Back to careers</Link>
        </p>
      </div>
    </div>
  );
}
