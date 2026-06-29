import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api.js';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone' },
  { value: 'admin', label: 'Administrators' },
  { value: 'hr', label: 'HR Personnel' },
  { value: 'manager', label: 'Managers' },
  { value: 'employee', label: 'Employees' },
  { value: 'applicant', label: 'Applicants' },
];

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState('');

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/announcements');
      setAnnouncements(data.announcements || []);
    } catch (err) {
      setError(err.body?.error || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAnnouncements(); }, []);

  const handleSend = async (formData) => {
    setSending(true);
    try {
      await apiFetch('/api/admin/announcements', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setShowModal(false);
      loadAnnouncements();
    } catch (err) {
      alert(err.body?.error || 'Failed to send announcement');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await apiFetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
      loadAnnouncements();
    } catch (err) {
      alert(err.body?.error || 'Failed to delete announcement');
    }
  };

  const filteredAnnouncements = announcements.filter(a => {
    if (!filter) return true;
    return a.audience === filter;
  });

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Announcements</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Announcement
        </button>
      </div>

      <div className="admin-filters">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All Audiences</option>
          {AUDIENCE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Loading announcements...</p>
      ) : error ? (
        <div className="auth-alert">{error}</div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="admin-section">
          <p className="muted text-center">No announcements yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="announcements-list">
          {filteredAnnouncements.map(ann => (
            <div key={ann.id} className="announcement-card">
              <div className="announcement-header">
                <div>
                  <span className="announcement-badge">{ann.audience}</span>
                  <span className="announcement-date">{formatDate(ann.created_at)}</span>
                </div>
                <button 
                  className="btn-icon btn-danger" 
                  onClick={() => handleDelete(ann.id)}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
              <h3 className="announcement-title">{ann.title}</h3>
              <p className="announcement-content">{ann.content}</p>
              <div className="announcement-footer">
                <span className="muted">Sent by: {ann.sent_by || 'System'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AnnouncementModal
          onSave={handleSend}
          onClose={() => setShowModal(false)}
          loading={sending}
        />
      )}
    </div>
  );
}

function AnnouncementModal({ onSave, onClose, loading }) {
  const [form, setForm] = useState({
    title: '',
    content: '',
    audience: 'all',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>New Announcement</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
              placeholder="Enter announcement title"
            />
          </div>
          <div className="form-group">
            <label>Content</label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              required
              rows={5}
              placeholder="Enter announcement content"
            />
          </div>
          <div className="form-group">
            <label>Send To</label>
            <select
              value={form.audience}
              onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
            >
              {AUDIENCE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
