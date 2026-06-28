import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const ROLES = [
  { value: 'hr', label: 'HR Personnel' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' },
];

const REMEMBER_KEY = 'awlms_remember';

function loadSavedCredentials() {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  const saved = loadSavedCredentials();

  const [email, setEmail] = useState(saved?.email ?? '');
  const [password, setPassword] = useState(saved?.password ?? '');
  const [rememberMe, setRememberMe] = useState(Boolean(saved));
  const [showPassword, setShowPassword] = useState(false);
  const [activeRole, setActiveRole] = useState('hr');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password, rememberMe, activeRole);
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email, password }));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.body?.error || err.message || 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="signin-root">
      {/* ── LEFT PANEL ── */}
      <div className="signin-left">
        {/* Decorative ellipses */}
        <div className="signin-ellipse signin-ellipse-1" />
        <div className="signin-ellipse signin-ellipse-2" />

        {/* Hero content */}
        <div className="signin-hero">
          <div className="signin-hero-badge">
            <span>AI RECRUITMENT PLATFORM</span>
          </div>
          
          <h1 className="signin-hero-title">
            Find the right talent<br />
            with <span className="signin-hero-accent">AI-powered</span><br />
            interviews
          </h1>
          
          <p className="signin-hero-desc">
            End-to-end recruitment — from job posting to AI interview, resume screening, and hiring decision.
          </p>
        </div>

        {/* Features */}
        <ul className="signin-features" aria-label="Platform features">
          <li className="signin-feature">
            <div className="signin-feature-icon" />
            <span className="signin-feature-label">AI Interviewing</span>
            <span className="signin-feature-desc">— role-specific conversations</span>
          </li>
          <li className="signin-feature">
            <div className="signin-feature-icon" />
            <span className="signin-feature-label">Resume Screening</span>
            <span className="signin-feature-desc">— AI-scored applicants</span>
          </li>
          <li className="signin-feature">
            <div className="signin-feature-icon" />
            <span className="signin-feature-label">Applicant Tracking</span>
            <span className="signin-feature-desc">— full recruitment pipeline</span>
          </li>
        </ul>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="signin-right">
        <div className="signin-form-container">
          <h2 className="signin-form-title">Sign in to AWLMS</h2>
          <p className="signin-form-subtitle">
            Access is provided by your organization.<br />
            Use the credentials issued to you by HR.
          </p>

          {/* Role selector tabs */}
          <div className="signin-role-selector">
            {ROLES.map((role) => (
              <button
                key={role.value}
                type="button"
                className={`signin-role-button${activeRole === role.value ? ' signin-role-button--active' : ''}`}
                onClick={() => setActiveRole(role.value)}
              >
                {role.label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form className="signin-form" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="signin-alert" role="alert">
                {error}
              </div>
            )}

            {/* Email field */}
            <div className="signin-field">
              <label className="signin-field-label" htmlFor="signin-email">
                Email Address
              </label>
              <input
                id="signin-email"
                type="email"
                className="signin-field-input"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password field */}
            <div className="signin-field">
              <label className="signin-field-label" htmlFor="signin-password">
                Password
              </label>
              <div className="signin-password-wrapper">
                <input
                  id="signin-password"
                  type={showPassword ? 'text' : 'password'}
                  className="signin-field-input"
                  placeholder="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="signin-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot Password row */}
            <div className="signin-footer-row">
              <label className="signin-checkbox">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me?</span>
              </label>
              <Link to="/forgot-password" className="signin-forgot-link">
                Forgot Password?
              </Link>
            </div>

            {/* Sign in button */}
            <button
              type="submit"
              className="signin-button"
              disabled={submitting}
            >
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>

            {/* Applicant Portal Link */}
            <div className="signin-footer">
              <Link to="/applicant-portal" className="signin-applicant-link">
                Job listings
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
