import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api.js';

export default function HrMessagesPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadMessages() {
      try {
        setLoading(true);
        setError('');
        const data = await apiFetch('/api/hr/messages');
        setMessages(data.messages || []);
      } catch (err) {
        setError(err.message || 'Failed to load messages');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadMessages();
  }, []);

  return (
    <div className="hr-messages-page">
      <div className="hr-page-header">
        <h1>Messages & Notifications</h1>
        <p className="hr-page-subtitle">HR inbox and notification history</p>
      </div>

      {error && (
        <div className="hr-alert hr-alert-error">
          {error}
        </div>
      )}

      {loading && (
        <div className="hr-loading">
          <div className="hr-spinner" />
          <p>Loading messages...</p>
        </div>
      )}

      {!loading && messages.length === 0 && (
        <div className="hr-empty-state">
          <p>No messages yet</p>
          <p className="hr-empty-state-hint">Notifications will appear here when HR actions occur</p>
        </div>
      )}

      {!loading && messages.length > 0 && (
        <div className="hr-messages-list">
          {messages.map((msg) => (
            <div key={msg.id} className="hr-message-item">
              <div className="hr-message-header">
                <h3 className="hr-message-title">{msg.title}</h3>
                <span className="hr-message-time">{formatTime(msg.created_at)}</span>
              </div>
              <p className="hr-message-body">{msg.body}</p>
              {msg.metadata?.applicant_name && (
                <div className="hr-message-meta">
                  <span className="hr-message-meta-item">
                    <strong>Applicant:</strong> {msg.metadata.applicant_name}
                  </span>
                </div>
              )}
              {msg.metadata?.job_title && (
                <span className="hr-message-meta-item">
                  <strong>Position:</strong> {msg.metadata.job_title}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        .hr-messages-page {
          padding: 2rem;
        }

        .hr-page-header {
          margin-bottom: 2rem;
        }

        .hr-page-header h1 {
          font-size: 2rem;
          font-weight: 600;
          color: #fff;
          margin: 0 0 0.5rem 0;
        }

        .hr-page-subtitle {
          color: #aaa;
          margin: 0;
          font-size: 0.95rem;
        }

        .hr-alert {
          padding: 1rem 1.5rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          border-left: 4px solid;
        }

        .hr-alert-error {
          background-color: rgba(239, 68, 68, 0.1);
          color: #ff6b6b;
          border-left-color: #ff6b6b;
        }

        .hr-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          color: #aaa;
        }

        .hr-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #333;
          border-top-color: #0fa888;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .hr-empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #aaa;
        }

        .hr-empty-state p {
          margin: 0.5rem 0;
        }

        .hr-empty-state-hint {
          font-size: 0.9rem;
          color: #666;
        }

        .hr-messages-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .hr-message-item {
          background: linear-gradient(135deg, #1a2332 0%, #0f1621 100%);
          border: 1px solid #2a3f5f;
          border-radius: 8px;
          padding: 1.5rem;
          transition: all 0.2s ease;
        }

        .hr-message-item:hover {
          border-color: #0fa888;
          box-shadow: 0 0 0 1px rgba(15, 168, 136, 0.2);
        }

        .hr-message-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .hr-message-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #fff;
          margin: 0;
          flex: 1;
        }

        .hr-message-time {
          font-size: 0.85rem;
          color: #888;
          white-space: nowrap;
          margin-left: 1rem;
        }

        .hr-message-body {
          color: #ccc;
          margin: 0 0 1rem 0;
          line-height: 1.5;
        }

        .hr-message-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid #2a3f5f;
        }

        .hr-message-meta-item {
          font-size: 0.9rem;
          color: #aaa;
        }

        .hr-message-meta-item strong {
          color: #fff;
          margin-right: 0.5rem;
        }
      `}</style>
    </div>
  );
}

function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
