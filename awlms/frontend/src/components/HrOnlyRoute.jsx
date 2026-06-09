import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function HrOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-center">
        <p className="muted">Loading session…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'hr') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
