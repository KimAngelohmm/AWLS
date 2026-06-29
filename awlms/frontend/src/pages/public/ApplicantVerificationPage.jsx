import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { publicApiFetch } from '../../lib/publicApi.js';

const RESEND_COOLDOWN_SECONDS = 60;

export default function ApplicantVerificationPage() {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  
  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMsg, setResendMsg] = useState('');

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!email || !code) {
      setError('Please enter both email and verification code');
      setLoading(false);
      return;
    }
    
    if (!/^\d{6}$/.test(code)) {
      setError('Verification code must be 6 digits');
      setLoading(false);
      return;
    }

    try {
      const data = await publicApiFetch('/api/applicant-auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });
      setSuccess(true);
    } catch (err) {
      const errData = err.body || {};
      if (errData.error?.includes('expired')) {
        setError('Code has expired. Please request a new one.');
      } else if (errData.error?.includes('Invalid')) {
        setError('Invalid verification code. Please check and try again.');
      } else {
        setError(errData.error || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    
    setError('');
    setResendMsg('');
    setLoading(true);

    try {
      await publicApiFetch('/api/applicant-auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setResendMsg('Verification code has been sent to your email.');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setCode('');
    } catch (err) {
      setError(err.body?.error || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="verification-page">
        <div className="verification-card">
          <div className="verification-icon verification-icon--success">✓</div>
          <h1>Email Verified!</h1>
          <p>Your email has been successfully verified.</p>
          <p>You can now log in to your AWLMS account.</p>
          <Link to="/login" className="verification-btn verification-btn--primary">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="verification-page">
      <div className="verification-card">
        <h1>Verify Your Email</h1>
        <p className="verification-subtitle">
          Enter the 6-digit code sent to your email address.
        </p>

        {error && (
          <div className="verification-alert verification-alert--error">
            {error}
          </div>
        )}

        {resendMsg && (
          <div className="verification-alert verification-alert--success">
            {resendMsg}
          </div>
        )}

        <form onSubmit={handleVerify} className="verification-form">
          <div className="verification-field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="verification-field">
            <label htmlFor="code">Verification Code</label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit code"
              maxLength={6}
              required
            />
            <span className="verification-hint">Enter the 6-digit code from your email</span>
          </div>

          <button
            type="submit"
            className="verification-btn verification-btn--primary"
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Verify Account'}
          </button>
        </form>

        <div className="verification-resend">
          <p>Didn't receive the code?</p>
          <button
            type="button"
            className="verification-btn verification-btn--secondary"
            onClick={handleResend}
            disabled={loading || resendCooldown > 0}
          >
            {resendCooldown > 0 
              ? `Resend Code (${resendCooldown}s)` 
              : 'Resend Verification Code'}
          </button>
        </div>

        <div className="verification-footer">
          <Link to="/login">← Back to Login</Link>
        </div>
      </div>
    </div>
  );
}