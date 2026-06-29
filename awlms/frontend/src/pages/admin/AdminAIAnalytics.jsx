import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api.js';

export default function AdminAIAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const data = await apiFetch('/api/admin/ai-analytics');
        setAnalytics(data);
      } catch (err) {
        setError(err.body?.error || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (loading) return <div className="admin-page"><p>Loading analytics...</p></div>;
  if (error) return <div className="admin-page"><div className="auth-alert">{error}</div></div>;

  const stats = analytics || {
    interviewStats: {},
    resumeStats: {},
    departmentStats: [],
    monthlyStats: [],
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>AI Analytics</h1>
        <button className="btn btn-secondary" onClick={() => window.location.reload()}>
          🔄 Refresh
        </button>
      </div>

      {/* Overview Stats */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <h3>Interview Success Rate</h3>
          <p className="admin-stat-value">{stats.interviewStats?.successRate || 0}%</p>
        </div>
        <div className="admin-stat-card">
          <h3>Total Interviews</h3>
          <p className="admin-stat-value">{stats.interviewStats?.total || 0}</p>
        </div>
        <div className="admin-stat-card">
          <h3>Completed</h3>
          <p className="admin-stat-value">{stats.interviewStats?.completed || 0}</p>
        </div>
        <div className="admin-stat-card">
          <h3>In Progress</h3>
          <p className="admin-stat-value">{stats.interviewStats?.inProgress || 0}</p>
        </div>
      </div>

      {/* AI Interview Performance */}
      <div className="admin-section">
        <h2>AI Interview Performance</h2>
        <div className="analytics-grid">
          <div className="analytics-stat">
            <span className="analytics-label">Average Duration</span>
            <span className="analytics-value">{stats.interviewStats?.avgDuration || '0 min'}</span>
          </div>
          <div className="analytics-stat">
            <span className="analytics-label">Average AI Score</span>
            <span className="analytics-value">{stats.interviewStats?.avgScore || 0}/100</span>
          </div>
          <div className="analytics-stat">
            <span className="analytics-label">Passing Score</span>
            <span className="analytics-value">{stats.interviewStats?.passingScore || 70}/100</span>
          </div>
          <div className="analytics-stat">
            <span className="analytics-label">Completion Rate</span>
            <span className="analytics-value">{stats.interviewStats?.completionRate || 0}%</span>
          </div>
        </div>
      </div>

      {/* Resume Screening */}
      <div className="admin-section">
        <h2>Resume Screening</h2>
        <div className="analytics-grid">
          <div className="analytics-stat">
            <span className="analytics-label">Screened Resumes</span>
            <span className="analytics-value">{stats.resumeStats?.total || 0}</span>
          </div>
          <div className="analytics-stat">
            <span className="analytics-label">Average Score</span>
            <span className="analytics-value">{stats.resumeStats?.avgScore || 0}/100</span>
          </div>
          <div className="analytics-stat">
            <span className="analytics-label">High Priority</span>
            <span className="analytics-value">{stats.resumeStats?.highPriority || 0}</span>
          </div>
          <div className="analytics-stat">
            <span className="analytics-label">Auto-Rejected</span>
            <span className="analytics-value">{stats.resumeStats?.autoRejected || 0}</span>
          </div>
        </div>
      </div>

      {/* Department Performance */}
      <div className="admin-section">
        <h2>Department Performance</h2>
        {stats.departmentStats?.length > 0 ? (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Total Applicants</th>
                  <th>Hired</th>
                  <th>Hiring Rate</th>
                  <th>Avg Score</th>
                </tr>
              </thead>
              <tbody>
                {stats.departmentStats.map((dept, idx) => (
                  <tr key={idx}>
                    <td>{dept.name}</td>
                    <td>{dept.applicants}</td>
                    <td>{dept.hired}</td>
                    <td>{dept.hiringRate}%</td>
                    <td>{dept.avgScore}/100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No department data available</p>
        )}
      </div>

      {/* Monthly Trends */}
      <div className="admin-section">
        <h2>Monthly Trends</h2>
        {stats.monthlyStats?.length > 0 ? (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Applicants</th>
                  <th>Interviews</th>
                  <th>Hired</th>
                  <th>Hiring Rate</th>
                </tr>
              </thead>
              <tbody>
                {stats.monthlyStats.map((month, idx) => (
                  <tr key={idx}>
                    <td>{month.month}</td>
                    <td>{month.applicants}</td>
                    <td>{month.interviews}</td>
                    <td>{month.hired}</td>
                    <td>{month.hiringRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No monthly data available</p>
        )}
      </div>

      {/* Failed Questions */}
      {stats.failedQuestions?.length > 0 && (
        <div className="admin-section">
          <h2>Most Challenging Questions</h2>
          <div className="failed-questions">
            {stats.failedQuestions.map((q, idx) => (
              <div key={idx} className="failed-question-item">
                <span className="question-rank">#{idx + 1}</span>
                <span className="question-text">{q.question}</span>
                <span className="question-fail-rate">{q.failRate}% fail rate</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
