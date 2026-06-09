import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api.js';
import { useEmployeeWorkspace } from '../../contexts/EmployeeWorkspaceContext.jsx';

function formatTime(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function EmployeeResignationChatPage() {
  const { data: dash, reload } = useEmployeeWorkspace();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastWorkingDate, setLastWorkingDate] = useState('');
  const [banner, setBanner] = useState('');
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  async function loadMessages() {
    setError('');
    try {
      const json = await apiFetch('/api/employee/resignation/messages');
      setMessages(json.messages || []);
    } catch (err) {
      setError(err.body?.error || err.message || 'Could not load chat');
    }
  }

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    try {
      const json = await apiFetch('/api/employee/resignation/messages', {
        method: 'POST',
        body: JSON.stringify({ content: text }),
      });
      setInput('');
      setMessages((prev) => [...prev, ...(json.messages || [])]);
      reload();
    } catch (err) {
      setError(err.body?.error || err.message || 'Send failed');
    } finally {
      setSending(false);
    }
  }

  async function handleSubmitToHr(e) {
    e.preventDefault();
    setBanner('');
    setError('');
    if (!lastWorkingDate) {
      setError('Choose your last working day.');
      return;
    }
    setSubmitting(true);
    try {
      const json = await apiFetch('/api/employee/resignation/submit', {
        method: 'POST',
        body: JSON.stringify({ lastWorkingDate }),
      });
      if (json.assistantMessage) {
        setMessages((prev) => [...prev, json.assistantMessage]);
      }
      setBanner('Your resignation request was sent to HR.');
      setLastWorkingDate('');
      reload();
    } catch (err) {
      setError(err.body?.error || err.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!dash?.employee) {
    return (
      <div className="emp-panel">
        <h1 className="emp-page-title">Resignation assistant</h1>
        <p className="muted">{dash?.message || 'No employee profile linked.'}</p>
      </div>
    );
  }

  const pending = dash.pendingResignation;

  return (
    <div className="emp-page">
      <header className="emp-page-head">
        <div>
          <h1 className="emp-page-title">Resignation assistant (AI)</h1>
          <p className="muted">
            Chat with the assistant about your resignation, then submit your last working day to HR when you are
            ready.
          </p>
        </div>
        <Link to="/employee" className="btn-secondary emp-link-btn">
          Overview
        </Link>
      </header>

      {pending ? (
        <div className="emp-banner" role="status">
          You already have a resignation request pending HR processing. Further submissions are disabled until HR
          completes this case.
        </div>
      ) : null}

      {banner ? (
        <div className="emp-success" role="status">
          {banner}
        </div>
      ) : null}

      {error ? (
        <div className="auth-alert" role="alert">
          {error}
        </div>
      ) : null}

      <div className="emp-chat-layout">
        <section className="emp-panel emp-chat-panel" aria-label="AI chat">
          <div className="emp-chat-scroll">
            {messages.map((m) => (
              <div key={m.id} className={`emp-chat-bubble emp-chat-bubble--${m.speaker}`}>
                <div className="emp-chat-meta">
                  {m.speaker === 'user' ? 'You' : 'Assistant'} · {formatTime(m.created_at)}
                </div>
                <p className="emp-chat-text">{m.content}</p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form className="emp-chat-form" onSubmit={handleSend}>
            <label className="emp-sr-only" htmlFor="emp-chat-input">
              Message to assistant
            </label>
            <textarea
              id="emp-chat-input"
              className="emp-chat-input"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message…"
              disabled={sending || Boolean(pending)}
            />
            <button type="submit" className="btn-primary" disabled={sending || Boolean(pending)}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </form>
        </section>

        <section className="emp-panel emp-submit-panel">
          <h2 className="emp-submit-title">Submit to HR</h2>
          <p className="muted">
            When you have decided on your last day, enter it below. This creates a formal lifecycle record for HR
            to acknowledge (per AWLMS design).
          </p>
          <form className="emp-submit-form" onSubmit={handleSubmitToHr}>
            <label className="field">
              <span className="field-label">Last working day</span>
              <input
                className="field-input"
                type="date"
                value={lastWorkingDate}
                onChange={(e) => setLastWorkingDate(e.target.value)}
                disabled={Boolean(pending) || submitting}
                required
              />
            </label>
            <button type="submit" className="btn-primary" disabled={Boolean(pending) || submitting}>
              {submitting ? 'Submitting…' : 'Submit resignation to HR'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
