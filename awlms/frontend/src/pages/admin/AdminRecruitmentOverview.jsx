import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api.js';

export default function AdminRecruitmentOverview() {
  const [data, setData] = useState({
    positions: [],
    applicants: [],
    interviews: [],
    stats: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [positions, applicants, stats] = await Promise.all([
        apiFetch('/api/admin/positions'),
        apiFetch('/api/admin/applicants'),
        apiFetch('/api/admin/dashboard'),
      ]);
      setData({
        positions: positions.positions || [],
        applicants: applicants.applicants || [],
        stats,
      });
    } catch (err) {
      setError(err.body?.error || 'Failed to load recruitment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredApplicants = data.applicants.filter(a => {
    const matchSearch = !filter ||
      a.full_name?.toLowerCase().includes(filter.toLowerCase()) ||
      a.email?.toLowerCase().includes(filter.toLowerCase());
    const matchStatus = !statusFilter || a.hiring_decision === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (decision) => {
    const styles = {
      pending: 'badge-pending',
      approved: 'badge-approved',
      rejected: 'badge-rejected',
      interviewing: 'badge-interviewing',
      withdrawn: 'badge-withdrawn',
    };
    return <span className={`badge ${styles[decision] || 'badge-default'}`}>{decision || 'pending'}</span>;
  };

  if (loading) {
    return <div className="admin-page"><p>Loading recruitment overview...</p></div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Recruitment Overview</h1>
        <Link to="/admin/recruitment/new" className="btn btn-primary">
          + New Position
        </Link>
      </div>

      {error && <div className="auth-alert">{error}</div>}

      {/* Statistics Cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <h3>Total Applicants</h3>
          <p className="admin-stat-value">{data.stats.applicantCount || 0}</p>
        </div>
        <div className="admin-stat-card">
          <h3>Open Positions</h3>
          <p className="admin-stat-value">{data.positions.length}</p>
        </div>
        <div className="admin-stat-card">
          <h3>Pending Review</h3>
          <p className="admin-stat-value">
            {filteredApplicants.filter(a => !a.hiring_decision || a.hiring_decision === 'pending').length}
          </p>
        </div>
        <div className="admin-stat-card">
          <h3>Approved</h3>
          <p className="admin-stat-value">
            {filteredApplicants.filter(a => a.hiring_decision === 'approved').length}
          </p>
        </div>
      </div>

      {/* Job Positions Section */}
      <section className="admin-section">
        <h2>Job Positions</h2>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Department</th>
                <th>Applicants</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.positions.length === 0 ? (
                <tr><td colSpan="5" className="text-center muted">No positions found</td></tr>
              ) : (
                data.positions.map(pos => (
                  <tr key={pos.id}>
                    <td>{pos.title}</td>
                    <td>{pos.department_name || '-'}</td>
                    <td>{pos.applicant_count || 0}</td>
                    <td>
                      <span className={`badge ${pos.status === 'open' ? 'badge-approved' : 'badge-default'}`}>
                        {pos.status}
                      </span>
                    </td>
                    <td>
                      <Link to={`/admin/recruitment/${pos.id}`} className="btn-link">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Applicants Section */}
      <section className="admin-section">
        <h2>All Applicants</h2>
        <div className="admin-filters">
          <input
            type="text"
            placeholder="Search applicants..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="admin-search"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="interviewing">Interviewing</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Position</th>
                <th>Status</th>
                <th>Applied</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplicants.length === 0 ? (
                <tr><td colSpan="6" className="text-center muted">No applicants found</td></tr>
              ) : (
                filteredApplicants.map(app => (
                  <tr key={app.id}>
                    <td>{app.full_name}</td>
                    <td>{app.email}</td>
                    <td>{app.job_title || '-'}</td>
                    <td>{getStatusBadge(app.hiring_decision)}</td>
                    <td>{app.created_at ? new Date(app.created_at).toLocaleDateString() : '-'}</td>
                    <td>
                      <Link to={`/admin/applicants/${app.id}`} className="btn-link">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
