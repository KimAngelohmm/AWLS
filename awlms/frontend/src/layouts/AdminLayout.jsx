import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const ADMIN_NAV = [
  { path: '/admin', label: 'Dashboard', icon: '📊' },
  { path: '/admin/recruitment', label: 'Recruitment', icon: '📋' },
  { path: '/admin/employees', label: 'Employees', icon: '👥' },
  { path: '/admin/hr-accounts', label: 'HR Accounts', icon: '🏢' },
  { path: '/admin/departments', label: 'Departments', icon: '🏗️' },
  { path: '/admin/positions', label: 'Job Positions', icon: '💼' },
  { path: '/admin/reports', label: 'Reports', icon: '📈' },
  { path: '/admin/audit-logs', label: 'Audit Logs', icon: '🔒' },
  { path: '/admin/settings', label: 'Settings', icon: '⚙️' },
  { path: '/admin/ai-chat', label: 'AI Chat', icon: '🤖' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>AWLMS Admin</h2>
          <span className="admin-badge">Administrator</span>
        </div>
        <nav className="admin-nav">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`admin-nav-item ${location.pathname === item.path ? 'admin-nav-item--active' : ''}`}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <span className="admin-user-name">{user?.full_name || 'Admin'}</span>
            <span className="admin-user-email">{user?.email}</span>
          </div>
          <button type="button" className="admin-logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}