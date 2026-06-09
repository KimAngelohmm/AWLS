import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function EmployeeOnlyRoute() {
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

  if (user.role !== 'employee') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
