import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const ADMIN_NAV = [
  // Overview
  { section: 'OVERVIEW', items: [
    { path: '/admin', label: 'Dashboard', icon: '📊', exact: true },
  ]},
  // HR Modules
  { section: 'HR MODULES', items: [
    { path: '/admin/recruitment', label: 'Recruitment', icon: '📋' },
    { path: '/admin/employees', label: 'Employees', icon: '👥' },
    { path: '/admin/hr-accounts', label: 'HR Personnel', icon: '🏢' },
    { path: '/admin/documents', label: 'Documents', icon: '📄' },
    { path: '/admin/messages', label: 'Messages', icon: '💬' },
    { path: '/admin/ai-reports', label: 'AI Reports', icon: '📊' },
  ]},
  // Analytics & Monitoring
  { section: 'ANALYTICS', items: [
    { path: '/admin/ai-analytics', label: 'AI Analytics', icon: '🤖' },
    { path: '/admin/monitoring', label: 'System Monitoring', icon: '📈' },
  ]},
  // Admin Tools
  { section: 'ADMINISTRATION', items: [
    { path: '/admin/users', label: 'User Management', icon: '👤' },
    { path: '/admin/audit-logs', label: 'Audit Logs', icon: '🔒' },
    { path: '/admin/announcements', label: 'Announcements', icon: '📢' },
    { path: '/admin/database', label: 'Database Tools', icon: '🗄️' },
    { path: '/admin/admin-settings', label: 'System Settings', icon: '⚙️' },
  ]},
  // AI Chat
  { section: null, items: [
    { path: '/admin/ai-chat', label: 'AI Chat', icon: '💬' },
  ]},
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>AWLMS Admin</h2>
          <span className="admin-badge">Administrator</span>
        </div>
        <nav className="admin-nav">
          {ADMIN_NAV.map((group, gi) => (
            <div key={gi}>
              {group.section && (
                <p className="admin-nav-section">{group.section}</p>
              )}
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`admin-nav-item ${isActive(item) ? 'admin-nav-item--active' : ''}`}
                >
                  <span className="admin-nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
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