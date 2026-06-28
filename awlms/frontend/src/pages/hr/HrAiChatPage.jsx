import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../lib/api.js';

const PRESETS = {
  hr: {
    welcomeText:
      "Hi! I'm your AWLMS Assistant. Ask me anything about recruitment, candidate screening, or HR workflow support.",
    subtitle: 'Powered by AI · HR Work Helper',
    placeholder: 'Message AWLMS Assistant…',
    suggestions: [
      'Draft an offer letter for a new hire',
      'Summarize pending candidate decisions',
      'What positions are currently open?',
      'Help me prepare interview questions for a role',
    ],
  },
  manager: {
    welcomeText:
      "Hi! I'm your AWLMS Assistant. Ask me about your team, hiring priorities, candidate feedback, or manager workflow support.",
    subtitle: 'Powered by AI · Team Work Helper',
    placeholder: 'Message AWLMS Assistant…',
    suggestions: [
      'Summarize candidate feedback for my team',
      'How do I prepare for a screening interview?',
      'Draft feedback for a candidate',
      'What should I prioritize this week?',
      'Help me understand the hiring pipeline',
    ],
  },
  employee: {
    welcomeText:
      "Hi! I'm your AWLMS Assistant. Ask me about HR notifications, the application process, policies, or how to use the employee workspace.",
    subtitle: 'Powered by AI · Employee Helper',
    placeholder: 'Message AWLMS Assistant…',
    suggestions: [
      'What do my HR notifications mean?',
      'How do I update my profile?',
      'Who can I contact for HR support?',
      'Help me understand company policies',
    ],
  },
};

/** Full-page AI chat (HR, Manager, Employee). */
export default function AiChatPage({ variant = 'hr' }) {
  const { welcomeText, subtitle, placeholder, suggestions } = PRESETS[variant] ?? PRESETS.hr;
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId]           = useState(null);
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [loadingConvs, setLoadingConvs]   = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [error, setError]                 = useState('');
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // ── Load conversation list on mount ──────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const data = await apiFetch('/api/ai/chat/conversations');
      setConversations(data.conversations || []);
    } catch {
      // non-fatal — show empty list
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // ── Load messages when active conversation changes ────────────────────────
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    setLoadingMsgs(true);
    setMessages([]);
    apiFetch(`/api/ai/chat/conversations/${activeId}/messages`)
      .then((data) => setMessages(data.messages || []))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMsgs(false));
  }, [activeId]);

  // ── Scroll to bottom on new messages ─────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Focus input when conversation changes ─────────────────────────────────
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [activeId]);

  // ── Start a new conversation (creates it in DB immediately) ───────────────
  async function startNewConversation() {
    try {
      const data = await apiFetch('/api/ai/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ title: 'New conversation' }),
      });
      const conv = data.conversation;
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
      setMessages([]);
      setInput('');
      setError('');
    } catch {
      setError('Could not create conversation');
    }
  }

  // ── Delete a conversation (removes from DB + state) ───────────────────────
  async function deleteConversation(id, e) {
    e.stopPropagation();
    try {
      await apiFetch(`/api/ai/chat/conversations/${id}`, { method: 'DELETE' });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        const remaining = conversations.filter((c) => c.id !== id);
        setActiveId(remaining[0]?.id ?? null);
      }
    } catch {
      setError('Could not delete conversation');
    }
  }

  // ── Send a message ────────────────────────────────────────────────────────
  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setLoading(true);
    setError('');

    // Optimistically append user message
    const userMsg = { role: 'user', content: text, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);

    // Build payload from current messages + new user turn
    const history = [...messages, userMsg]
      .filter((m) => m.role === 'user' || m.role === 'assistant' || m.role === 'ai')
      .map((m) => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content }));

    try {
      const data = await apiFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: history, conversation_id: activeId }),
      });

      const aiMsg = { role: 'ai', content: data.reply, created_at: new Date().toISOString() };
      setMessages((prev) => [...prev, aiMsg]);

      // If a new conversation was auto-created by the backend, adopt its id
      if (data.conversation_id && data.conversation_id !== activeId) {
        setActiveId(data.conversation_id);
        // Refresh list so the new conversation appears with its auto-title
        await fetchConversations();
      } else {
        // Bump updated_at in local list so it sorts to top
        setConversations((prev) =>
          prev
            .map((c) => c.id === activeId ? { ...c, updated_at: new Date().toISOString() } : c)
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        );
      }
    } catch (err) {
      setError(err.body?.error || err.message || 'Something went wrong');
      // Remove the optimistic user message on failure
      setMessages((prev) => prev.filter((m) => m !== userMsg));
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  // ── Date grouping helper ──────────────────────────────────────────────────
  function formatDate(ts) {
    const d = new Date(ts);
    const diffDays = Math.floor((Date.now() - d) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const grouped = conversations.reduce((acc, conv) => {
    const label = formatDate(conv.updated_at || conv.created_at);
    if (!acc[label]) acc[label] = [];
    acc[label].push(conv);
    return acc;
  }, {});

  const activeConv = conversations.find((c) => c.id === activeId) ?? null;

  return (
    <div className="ai-page">
      {/* ── Conversation sidebar ── */}
      <aside className={`ai-page-sidebar${sidebarOpen ? '' : ' ai-page-sidebar--collapsed'}`} aria-label="Conversations">
        <div className="ai-page-sidebar-header">
          <button type="button" className="ai-page-new-btn" onClick={startNewConversation} aria-label="New conversation">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New chat
          </button>
          <button
            type="button"
            className="ai-page-collapse-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {sidebarOpen ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
            </svg>
          </button>
        </div>

        {sidebarOpen && (
          <div className="ai-page-conv-list">
            {loadingConvs && <p className="ai-page-conv-empty">Loading…</p>}
            {!loadingConvs && conversations.length === 0 && (
              <p className="ai-page-conv-empty">No conversations yet.<br />Start a new chat above.</p>
            )}
            {Object.entries(grouped).map(([label, convs]) => (
              <div key={label}>
                <p className="ai-page-conv-group-label">{label}</p>
                {convs.map((conv) => (
                  <button
                    key={conv.id}
                    type="button"
                    className={`ai-page-conv-item${conv.id === activeId ? ' ai-page-conv-item--active' : ''}`}
                    onClick={() => { setActiveId(conv.id); setError(''); }}
                    aria-current={conv.id === activeId ? 'page' : undefined}
                  >
                    <span className="ai-page-conv-title">{conv.title}</span>
                    <button
                      type="button"
                      className="ai-page-conv-delete"
                      onClick={(e) => deleteConversation(conv.id, e)}
                      aria-label={`Delete conversation: ${conv.title}`}
                      title="Delete"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ── Chat area ── */}
      <div className="ai-page-chat">
        <div className="ai-page-chat-header">
          <div className="ai-page-chat-header-left">
            <div className="ai-page-chat-avatar" aria-hidden="true">✦</div>
            <div>
              <p className="ai-page-chat-title">AWLMS Assistant</p>
              <p className="ai-page-chat-subtitle">{subtitle}</p>
            </div>
          </div>
          {activeConv && (
            <button
              type="button"
              className="ai-page-clear-btn"
              onClick={() => deleteConversation(activeConv.id, { stopPropagation: () => {} })}
              title="Delete this conversation"
              aria-label="Delete conversation"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              Delete
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="ai-page-messages" aria-live="polite" aria-label="Chat messages">
          {/* Welcome state — no active conversation or empty conversation */}
          {!activeId && !loadingConvs && (
            <div className="ai-page-welcome">
              <div className="ai-page-welcome-icon" aria-hidden="true">✦</div>
              <h2 className="ai-page-welcome-title">How can I help you today?</h2>
              <p className="ai-page-welcome-sub">{welcomeText}</p>
              <div className="ai-page-suggestions">
                {suggestions.map((s) => (
                  <button key={s} type="button" className="ai-page-suggestion-chip"
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loadingMsgs && (
            <p className="muted" style={{ padding: '2rem', textAlign: 'center' }}>Loading messages…</p>
          )}

          {!loadingMsgs && activeId && messages.length === 0 && (
            <div className="ai-page-welcome">
              <div className="ai-page-welcome-icon" aria-hidden="true">✦</div>
              <h2 className="ai-page-welcome-title">New conversation</h2>
              <p className="ai-page-welcome-sub">{welcomeText}</p>
              <div className="ai-page-suggestions">
                {suggestions.map((s) => (
                  <button key={s} type="button" className="ai-page-suggestion-chip"
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((m, i) => (
            <div key={m.id || i} className={`ai-page-msg ai-page-msg--${m.role === 'ai' ? 'assistant' : m.role}`}>
              {(m.role === 'assistant' || m.role === 'ai') && (
                <div className="ai-page-msg-avatar" aria-hidden="true">✦</div>
              )}
              <div className="ai-page-msg-bubble">
                {m.content.split('\n').map((line, j, arr) => (
                  <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
                ))}
              </div>
              {m.role === 'user' && (
                <div className="ai-page-msg-avatar ai-page-msg-avatar--user" aria-hidden="true">You</div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="ai-page-msg ai-page-msg--assistant">
              <div className="ai-page-msg-avatar" aria-hidden="true">✦</div>
              <div className="ai-page-msg-bubble ai-page-typing" aria-label="Assistant is typing">
                <span /><span /><span />
              </div>
            </div>
          )}

          {error && <div className="ai-page-error" role="alert">{error}</div>}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="ai-page-input-area">
          <div className="ai-page-input-row">
            <textarea
              ref={inputRef}
              className="ai-page-input"
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
              className="ai-page-send-btn"
              onClick={send}
              disabled={!input.trim() || loading}
              aria-label="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className="ai-page-input-hint">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
