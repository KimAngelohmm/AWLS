import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { publicApiFetch } from '../../lib/publicApi.js';

export default function InterviewPage() {
  const { token } = useParams();

  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('in_progress');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState('');
  const [aiRec, setAiRec] = useState('');
  const [loading, setLoading] = useState(true);
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantAbout, setApplicantAbout] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const bottomRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [videoActive, setVideoActive] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [emotion, setEmotion] = useState('neutral');
  const [expressionData, setExpressionData] = useState(null);
  const faceDetectionInterval = useRef(null);
  const faceApiRef = useRef(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Interview session not found. Please use the link from your invitation email.');
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const data = await publicApiFetch(`/api/recruitment/interview/${token}`);
        if (cancelled) return;
        setMessages(data.messages || []);
        setStatus(data.interviewStatus || 'in_progress');
        setApplicantName(data.applicantName || '');
        setApplicantEmail(data.applicantEmail || '');
        setApplicantPhone(data.applicantPhone || '');
        setApplicantAbout(data.applicantAbout || '');
        setJobTitle(data.jobTitle || '');
        if (data.hasPhoto) {
          setPhotoUrl(`/api/recruitment/interview/${token}/photo`);
        }
        if (data.interviewStatus === 'completed') {
          setSummary(data.assessmentSummary || '');
          setAiRec(data.aiRecommendation || '');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.body?.error || e.message || 'Could not load interview session.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startCamera = async () => {
    try {
      setVideoError('');
      console.log('Requesting camera access...');
      const constraints = {
        video: true,
        audio: true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera stream obtained:', stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('Stream assigned to video element');
        setVideoActive(true);
        
        // Initialize face-api after a short delay to let video load
        setTimeout(() => {
          initializeFaceDetection();
        }, 500);
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setVideoError('Permission denied');
      } else if (err.name === 'NotFoundError') {
        setVideoError('No camera found');
      } else {
        setVideoError('Camera unavailable');
      }
    }
  };

  const initializeFaceDetection = async () => {
    try {
      const faceapi = faceApiRef.current || await import('@vladmandic/face-api');
      faceApiRef.current = faceapi;

      // Load models for face detection
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/';
      await faceapi.nets.tinyFaceDetector.load(MODEL_URL);
      await faceapi.nets.faceExpressionNet.load(MODEL_URL);
      console.log('Face detection models loaded');
      
      // Start periodic face detection
      if (faceDetectionInterval.current) clearInterval(faceDetectionInterval.current);
      faceDetectionInterval.current = setInterval(detectFace, 300);
    } catch (err) {
      console.error('Failed to load face detection models:', err);
    }
  };

  const detectFace = async () => {
    try {
      const faceapi = faceApiRef.current;
      if (!faceapi || !videoRef.current || !videoRef.current.srcObject) return;
      
      const detections = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (detections) {
        const expressions = detections.expressions;
        // Find the dominant emotion
        let dominantEmotion = 'neutral';
        let maxScore = 0;
        
        for (const [emotion, score] of Object.entries(expressions)) {
          if (score > maxScore) {
            maxScore = score;
            dominantEmotion = emotion;
          }
        }
        
        const confidence = Math.round(maxScore * 100);
        setEmotion(dominantEmotion);
        setExpressionData({
          emotion: dominantEmotion,
          confidence: confidence,
          expressions: expressions,
          timestamp: new Date().toISOString()
        });

        // Save expression data to backend
        try {
          await publicApiFetch(`/api/recruitment/interview/${token}/expression`, {
            method: 'POST',
            body: JSON.stringify({
              emotion: dominantEmotion,
              confidence: confidence,
              expressions: expressions
            })
          });
        } catch (err) {
          console.warn('Could not save expression data:', err);
        }
      }
    } catch (err) {
      console.error('Face detection error:', err);
    }
  };

  useEffect(() => {
    return () => {
      if (faceDetectionInterval.current) clearInterval(faceDetectionInterval.current);
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || status === 'completed' || !token) return;
    setSending(true);
    setError('');
    setInput('');
    try {
      const data = await publicApiFetch(`/api/recruitment/interview/${token}/message`, {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });
      setMessages(data.messages || []);
      setStatus(data.interviewStatus || 'in_progress');
      if (data.interviewStatus === 'completed') {
        setSummary(data.assessmentSummary || '');
        setAiRec(data.aiRecommendation || '');
      }
    } catch (err) {
      setError(err.body?.error || err.message || 'Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (!token) {
    return (
      <div className="iv-page">
        <div className="iv-card">
          <div className="iv-brand">
            <span className="iv-brand-logo">AWLMS</span>
            <span className="iv-brand-tag">AI Interview</span>
          </div>
          <div className="iv-error-state">
            <p className="iv-error-msg">Interview session not found.</p>
            <p className="iv-muted">
              Please use the one-time link from your invitation email.
            </p>
            <Link to="/login" className="iv-hr-link">HR sign in →</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="iv-page">
      <div className="iv-card">
        <div className="iv-header">
          <div className="iv-brand">
            <span className="iv-brand-logo">AWLMS</span>
            <span className="iv-brand-tag">AI Interview</span>
          </div>
          <div className="iv-header-info">
            <h1 className="iv-title">AI-Powered Interview</h1>
            <p className="iv-subtitle">
              {applicantName ? `Interview with ${applicantName}` : 'Answer one question at a time.'}
            </p>
            {jobTitle && (
              <p className="muted" style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Position: <strong>{jobTitle}</strong>
              </p>
            )}
            {photoUrl && (
              <div style={{
                marginTop: '1rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
              }}>
                <img src={photoUrl} alt={applicantName} style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '8px',
                  border: '1px solid #444',
                  objectFit: 'cover',
                }} />
                <div style={{ fontSize: '0.85rem' }}>
                  {applicantEmail && <div>📧 {applicantEmail}</div>}
                  {applicantPhone && <div>📱 {applicantPhone}</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        {status === 'completed' && (
          <div className="iv-complete-banner" role="status">
            <span className="iv-complete-icon">✓</span>
            <div>
              <strong>Interview complete.</strong> Your assessment has been submitted to HR for review.
              {aiRec && (
                <span className={`iv-rec-badge iv-rec-badge--${aiRec === 'no_hire' ? 'red' : 'teal'}`}>
                  AI recommendation: {aiRec === 'no_hire' ? 'Under review' : 'Positive'}
                </span>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="iv-alert" role="alert">{error}</div>
        )}

        {summary && (
          <div className="iv-summary-panel">
            <p className="iv-summary-label">Assessment Summary (submitted to HR)</p>
            <p className="iv-summary-text">{summary}</p>
          </div>
        )}

        <div className="iv-chat-wrap">
          {loading ? (
            <div className="iv-loading">
              <span className="iv-spinner" />
              <span>Loading interview session…</span>
            </div>
          ) : (
            <div className="iv-chat-scroll">
              {messages.length === 0 && (
                <p className="iv-chat-empty">Starting your interview…</p>
              )}
              {messages.map((m, i) => (
                <div
                  key={m.id || `${m.ts || ''}-${i}`}
                  className={`iv-bubble iv-bubble--${m.role === 'user' ? 'user' : 'ai'}`}
                >
                  <span className="iv-bubble-label">
                    {m.role === 'user' ? 'You' : 'AI Interviewer'}
                  </span>
                  <p className="iv-bubble-text">{m.content}</p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <form className="iv-form" onSubmit={handleSend}>
          <textarea
            className="iv-input"
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder={
              status === 'completed'
                ? 'Interview finished.'
                : loading
                ? 'Loading…'
                : 'Type your answer… (Enter to send, Shift+Enter for new line)'
            }
            disabled={sending || status === 'completed' || loading}
          />
          <button
            type="submit"
            className="iv-send-btn"
            disabled={sending || status === 'completed' || loading || !input.trim()}
          >
            {sending ? (
              <><span className="iv-spinner iv-spinner--sm" /> Sending…</>
            ) : (
              'Send'
            )}
          </button>
        </form>

        <p className="iv-foot">
          <Link to="/login" className="iv-hr-link">HR Personnel sign in →</Link>
        </p>

        {/* Video Camera Widget */}
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            width: '200px',
            height: '200px',
            backgroundColor: '#1a1a2e',
            border: '2px solid #22D3EE',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Video element always in DOM so ref connects */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              backgroundColor: '#000',
              display: videoActive ? 'block' : 'none',
              position: 'absolute',
            }}
          />

          {/* Overlay UI when video not active */}
          {!videoActive && (
            videoError ? (
              <div
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#1f2937',
                  color: '#ef4444',
                  fontSize: '0.7rem',
                  textAlign: 'center',
                  padding: '0.75rem',
                  gap: '0.75rem',
                }}
              >
                <div style={{ fontSize: '1.5rem' }}>⚠️</div>
                <div>{videoError}</div>
                <button
                  type="button"
                  onClick={startCamera}
                  style={{
                    backgroundColor: '#22D3EE',
                    color: '#111827',
                    border: 'none',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#252d42',
                  color: '#ffffff',
                  fontSize: '1rem',
                  textAlign: 'center',
                  padding: '1rem',
                  gap: '1rem',
                }}
              >
                <div style={{ fontSize: '2rem' }}>📷</div>
                <button
                  type="button"
                  onClick={startCamera}
                  style={{
                    backgroundColor: '#22D3EE',
                    color: '#111827',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Enable Camera
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
