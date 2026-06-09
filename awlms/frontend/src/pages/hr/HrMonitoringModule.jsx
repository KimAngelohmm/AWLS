import MonitoringDashboard from '../monitoring/MonitoringDashboard.jsx';

export default function HrMonitoringModule() {
  return (
    <MonitoringDashboard
      apiPrefix="/api/hr/monitoring"
      title="Employee Performance Monitoring"
      subtitle="Real-time digital activity and productivity indicators, role-based thresholds, trend dashboards, and HR alert queue."
      backTo="/hr"
      backLabel="Overview"
    />
  );
}
