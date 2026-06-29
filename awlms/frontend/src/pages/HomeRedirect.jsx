import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

// Role-based dashboard routing
const ROLE_DASHBOARD_MAP = {
  admin: '/admin',
  hr: '/hr',
  manager: '/manager',
  employee: '/employee',
};

export default function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-center">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (user) {
    // Redirect to role-specific dashboard
    const dashboard = ROLE_DASHBOARD_MAP[user.role] || '/dashboard';
    return <Navigate to={dashboard} replace />;
  }

  return <Navigate to="/login" replace />;
}
