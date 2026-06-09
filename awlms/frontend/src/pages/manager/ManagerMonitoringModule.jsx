import MonitoringDashboard from '../monitoring/MonitoringDashboard.jsx';

export default function ManagerMonitoringModule() {
  return (
    <MonitoringDashboard
      apiPrefix="/api/manager/monitoring"
      title="Team performance monitoring"
      subtitle="Metrics and alerts for employees in your department only (same department as your manager account)."
      backTo="/manager"
      backLabel="Overview"
    />
  );
}
