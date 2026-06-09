import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { publicApiFetch } from '../../lib/publicApi.js';
import JobListingMeta from '../../components/JobListingMeta.jsx';

export default function CareersPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadJobs() {
    setLoading(true);
    setError('');
    try {
      const data = await publicApiFetch('/api/recruitment/jobs');
      setJobs(data.jobs || []);
    } catch (e) {
      setError(e.body?.error || e.message || 'Could not load job listings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  return (
    <div className="careers-page">
      <section className="careers-hero">
        <h1 className="careers-hero-title">Join Our Team at Sunnies Studios</h1>
        <p className="careers-hero-sub">
          Discover exciting career opportunities in retail eyewear. Apply online and complete our AI-powered interview process. We look forward to meeting you!
        </p>
      </section>

      <main className="careers-main">
        {loading && (
          <div className="careers-loading">
            <span className="careers-spinner" aria-hidden="true" />
            <span>Loading positions…</span>
          </div>
        )}

        {error && (
          <div className="careers-alert" role="alert">
            {error}
            <button type="button" className="btn-secondary" style={{ marginTop: '0.75rem' }} onClick={loadJobs}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div className="careers-empty">
            <p>No open positions at the moment. Check back soon.</p>
            <Link to="/login" className="careers-back-link">← Back to sign in</Link>
          </div>
        )}

        {!loading && jobs.length > 0 && (
          <ul className="careers-list" aria-label="Open job positions">
            {jobs.map((job) => (
              <li key={job.id} className="careers-card">
                <div className="careers-card-info">
                  <h2 className="careers-card-title">{job.title}</h2>
                  <JobListingMeta job={job} />
                  {job.description && (
                    <p className="careers-card-desc">{job.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="careers-card-btn"
                  onClick={() => navigate(`/apply/${job.id}`)}
                  aria-label={`Apply now for ${job.title}`}
                >
                  Apply Now
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="careers-footer">
        <Link to="/login" className="careers-back-link">← Back to sign in</Link>
      </footer>
    </div>
  );
}
