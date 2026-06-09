import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function ApplicantPortalPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/public/available-jobs', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (err) {
      console.error('Fetch jobs error:', err);
      setError(err.message || 'Failed to retrieve job listings');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="applicant-portal-root">
      <div className="applicant-portal-container">
        {/* Header */}
        <div className="applicant-portal-header">
          <Link to="/login" className="applicant-portal-back">← Back to Login</Link>
          <h1 className="applicant-portal-title">Open Positions</h1>
          <p className="applicant-portal-subtitle">
            Browse available job opportunities and submit your application
          </p>
        </div>

        {/* Job Listings */}
        {loading ? (
          <div className="applicant-portal-loading">
            <p>Loading job listings...</p>
          </div>
        ) : error ? (
          <div className="applicant-portal-alert alert-error" role="alert">
            {error}
          </div>
        ) : jobs.length === 0 ? (
          <div className="applicant-portal-empty">
            <p className="applicant-portal-empty-text">
              No open positions available at this time
            </p>
            <Link to="/login" className="applicant-portal-button">
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            <p className="applicant-portal-results-intro">
              Found <strong>{jobs.length}</strong> open position{jobs.length !== 1 ? 's' : ''}
            </p>

            <div className="applicant-portal-list">
              {jobs.map((job) => (
                <div key={job.id} className="applicant-job-card">
                  <div className="applicant-job-card-header">
                    <h3 className="applicant-job-title">{job.title}</h3>
                    <span className="applicant-job-department">{job.department || 'N/A'}</span>
                  </div>

                  <div className="applicant-job-card-body">
                    {job.description && (
                      <div className="applicant-job-description">
                        <p className="applicant-job-description-text">
                          {job.description.substring(0, 200)}
                          {job.description.length > 200 ? '…' : ''}
                        </p>
                      </div>
                    )}

                    <div className="applicant-job-meta">
                      <div className="applicant-job-info">
                        <span className="applicant-job-label-small">Type</span>
                        <p className="applicant-job-value">{job.employment_type || 'Not specified'}</p>
                      </div>
                      <div className="applicant-job-info">
                        <span className="applicant-job-label-small">Location</span>
                        <p className="applicant-job-value">{job.location || 'Not specified'}</p>
                      </div>
                      <div className="applicant-job-info">
                        <span className="applicant-job-label-small">Openings</span>
                        <p className="applicant-job-value">{job.number_of_openings}</p>
                      </div>
                      {job.created_at && (
                        <div className="applicant-job-info">
                          <span className="applicant-job-label-small">Posted</span>
                          <p className="applicant-job-value">
                            {new Date(job.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="applicant-job-card-footer">
                    <Link 
                      to={`/apply/${job.id}`} 
                      className="applicant-portal-button"
                    >
                      Apply Now
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="applicant-portal-footer-actions">
              <Link to="/login" className="applicant-portal-button applicant-portal-button-secondary">
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
