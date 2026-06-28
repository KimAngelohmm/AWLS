import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api.js';

const DEFAULT_WELCOME =
  "Hi! I'm your AWLMS Assistant. I can help with HR tasks, draft communications, answer recruitment questions, or walk you through the system. What do you need?";

const DEFAULT_SUGGESTIONS = [
  'Draft an offer letter',
  'Summarize pending decisions',
  'What positions are open?',
  'Help me understand the application process',
];

export default function AiChatBubble({
  notificationCount = 0,
  subtitle = 'AI · HR Work Helper',
  placeholder = 'Ask anything about HR, employees, or the system…',
  welcomeMessage = DEFAULT_WELCOME,
  suggestions = DEFAULT_SUGGESTIONS,
}) {
  const welcome = { role: 'assistant', content: welcomeMessage };
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([welcome]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom whenever messages change or panel opens
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    setError('');

    // Build payload — only user/assistant turns (no system)
    const payload = next
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const data = await apiFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: payload }),
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setError(err.body?.error || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function clearChat() {
    setMessages([welcome]);
    setError('');
  }

  return (
    <>
      {/* ── Chat panel ── */}
      {open && (
        <div className="ai-chat-panel" role="dialog" aria-label="AI Assistant" aria-modal="true">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-header-left">
              <div className="ai-chat-avatar" aria-hidden="true">
                <div className="hdb-ai-face">
                  <div className="hdb-ai-eye hdb-ai-eye--left" />
                  <div className="hdb-ai-eye hdb-ai-eye--right" />
                  <div className="hdb-ai-mouth" />
                </div>
              </div>
              <div>
                <p className="ai-chat-title">AWLMS Assistant</p>
                <p className="ai-chat-subtitle">{subtitle}</p>
              </div>
            </div>
            <div className="ai-chat-header-actions">
              <button
                type="button"
                className="ai-chat-icon-btn"
                onClick={clearChat}
                title="Clear chat"
                aria-label="Clear chat history"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
                </svg>
              </button>
              <button
                type="button"
                className="ai-chat-icon-btn"
                onClick={() => setOpen(false)}
                title="Close"
                aria-label="Close AI assistant"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="ai-chat-messages" aria-live="polite" aria-label="Chat messages">
            {messages.map((m, i) => (
              <div key={i} className={`ai-chat-msg ai-chat-msg--${m.role}`}>
                {m.role === 'assistant' && (
                  <div className="ai-chat-msg-avatar" aria-hidden="true">✦</div>
                )}
                <div className="ai-chat-msg-bubble">
                  {m.content.split('\n').map((line, j) => (
                    <span key={j}>{line}{j < m.content.split('\n').length - 1 && <br />}</span>
                  ))}
                </div>
              </div>
            ))}

            {loading && (
              <div className="ai-chat-msg ai-chat-msg--assistant">
                <div className="ai-chat-msg-avatar" aria-hidden="true">✦</div>
                <div className="ai-chat-msg-bubble ai-chat-typing" aria-label="Assistant is typing">
                  <span /><span /><span />
                </div>
              </div>
            )}

            {error && (
              <div className="ai-chat-error" role="alert">{error}</div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Suggested prompts — only shown when just the welcome message is visible */}
          {messages.length === 1 && suggestions.length > 0 && (
            <div className="ai-chat-suggestions">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="ai-chat-suggestion-chip"
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="ai-chat-input-row">
            <textarea
              ref={inputRef}
              className="ai-chat-input"
              placeholder={placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              aria-label="Message input"
              disabled={loading}
            />
            <button
              type="button"
              className="ai-chat-send"
              onClick={send}
              disabled={!input.trim() || loading}
              aria-label="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Floating bubble ── */}
      <div
        className="hdb-ai-bubble"
        role="button"
        tabIndex={0}
        aria-label={open ? 'Close AI Assistant' : 'Open AI Assistant'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v); } }}
        title="AI Assistant"
      >
        <div className="hdb-ai-face" aria-hidden="true">
          <div className="hdb-ai-eye hdb-ai-eye--left" />
          <div className="hdb-ai-eye hdb-ai-eye--right" />
          <div className="hdb-ai-mouth" />
        </div>
        {notificationCount > 0 && !open && (
          <span className="hdb-ai-badge" aria-label={`${notificationCount} notifications`}>
            {Math.min(notificationCount, 9)}
          </span>
        )}
      </div>
    </>
  );
}
