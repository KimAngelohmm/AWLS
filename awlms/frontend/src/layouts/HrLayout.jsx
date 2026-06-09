import { NavLink, Outlet, useMatch, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { HrDashboardProvider, useHrDashboard } from '../contexts/HrDashboardContext.jsx';
import AiChatBubble from '../components/AiChatBubble.jsx';

const nav = [
  { section: 'OVERVIEW', items: [{ to: '/hr', label: 'Dashboard', end: true }] },
  {
    section: 'MODULES',
    items: [
      { to: '/hr/recruitment', label: 'Recruitment' },
      { to: '/hr/monitoring', label: 'Monitoring' },
    ],
  },
  {
    section: 'REPORTS',
    items: [
      { to: '/hr/ai-reports', label: 'AI Reports' },
      { to: '/hr/employees', label: 'Employees' },
    ],
  },
  {
    section: null,
    items: [{ to: '/hr/history', label: 'History' }],
  },
];

function getInitials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getTodayLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function HrHomeAiChat() {
  const isHome = useMatch({ path: '/hr', end: true });
  const isAiChat = useMatch({ path: '/hr/ai-chat', end: true });
  const { data } = useHrDashboard();
  if (!isHome || isAiChat) return null;

  const alerts = data?.performanceAlerts ?? [];
  const decisions = data?.hrDecisionsPending ?? [];
  return <AiChatBubble notificationCount={alerts.length + decisions.length} />;
}

export default function HrLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function handleSettings() {
    navigate('/hr/settings');
  }

  const initials = getInitials(user?.full_name);

  return (
    <HrDashboardProvider>
      <div className="hr-shell">
        {/* ── Sidebar ── */}
        <aside className="hr-sidebar" aria-label="HR navigation">
          {/* Brand */}
          <div className="hr-sidebar-brand">
            <div style={{ width: 32, height: 32, background: '#C4956D', borderRadius: 6, flexShrink: 0 }} />
            <span className="hr-sidebar-logo">SUNNIES</span>
          </div>

          {/* Nav */}
          <nav className="hr-sidebar-nav" aria-label="HR modules">
            {nav.map((group, gi) => (
              <div key={gi}>
                {group.section && (
                  <p className="hr-sidebar-section">{group.section}</p>
                )}
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `hr-nav-link${isActive ? ' hr-nav-link--active' : ''}`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          {/* User profile */}
          <div className="hr-sidebar-foot">
            <div className="hr-sidebar-user">
              <div className="hr-sidebar-avatar" aria-hidden="true">
                {initials}
              </div>
              <div className="hr-sidebar-user-info">
                <p className="hr-sidebar-user-name">{user?.full_name ?? 'HR User'}</p>
                <p className="hr-sidebar-user-role">Administrator</p>
              </div>
              <button
                type="button"
                className="hr-sidebar-settings"
                onClick={handleSettings}
                aria-label="Settings"
                title="Settings"
              >
                {/* Settings / logout icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="hr-main">
          {/* Topbar */}
          <header className="hr-topbar">
            <div className="hr-topbar-left">
              <p className="hr-topbar-title">HR Dashboard</p>
              <p className="hr-topbar-date">{getTodayLabel()}</p>
            </div>
            <div className="hr-topbar-right">
              <div className="hr-search" role="search">
                <svg className="hr-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  className="hr-search-input"
                  type="search"
                  placeholder="Search employees, roles…"
                  aria-label="Search employees and roles"
                />
              </div>
              <button type="button" className="btn-secondary" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          </header>

          {/* Page content */}
          <div className="hr-content">
            <Outlet />
          </div>
        </div>
        <HrHomeAiChat />
      </div>
    </HrDashboardProvider>
  );
}
