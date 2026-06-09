import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const data = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMessage(data.message || 'Request received.');
      setEmail('');
    } catch (err) {
      setError(err.body?.error || err.message || 'Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--narrow">
        <header className="auth-header">
          <h1 className="auth-title">Forgot password</h1>
          <p className="auth-subtitle">Request help recovering access</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          {message ? (
            <div className="auth-success" role="status">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="auth-alert" role="alert">
              {error}
            </div>
          ) : null}

          <label className="field">
            <span className="field-label">Work email</span>
            <input
              className="field-input"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        </form>

        <p className="auth-back">
          <Link className="auth-link" to="/login">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
