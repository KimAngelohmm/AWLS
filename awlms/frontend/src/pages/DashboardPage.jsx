import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import GenericRoleDashboard from './GenericRoleDashboard.jsx';

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-center">
        <p className="muted">Loading session…</p>
      </div>
    );
  }

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  if (user?.role === 'hr') {
    return <Navigate to="/hr" replace />;
  }

  if (user?.role === 'employee') {
    return <Navigate to="/employee" replace />;
  }

  if (user?.role === 'manager') {
    return <Navigate to="/manager" replace />;
  }

  return <GenericRoleDashboard />;
}
