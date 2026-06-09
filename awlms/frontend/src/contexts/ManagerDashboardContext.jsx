import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api.js';

const ManagerDashboardContext = createContext(null);

export function ManagerDashboardProvider({ children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const json = await apiFetch('/api/manager/monitoring/home-dashboard');
      setData(json);
    } catch (err) {
      // Fallback: if home-dashboard isn't available (e.g. server not restarted),
      // try the standard monitoring dashboard and adapt the shape
      if (err.status === 404) {
        try {
          const fallback = await apiFetch('/api/manager/monitoring/dashboard');
          setData({
            performanceAlerts: fallback.openAlerts ?? [],
            lifecycleEvents: [],
            lifecycleRecommendations: [],
            counts: {
              trackedEmployees: fallback.counts?.trackedEmployees ?? 0,
              openPerformanceAlerts: fallback.counts?.openPerformanceAlerts ?? 0,
              pendingRecommendations: 0,
              addedThisMonth: 0,
              removedThisMonth: 0,
            },
            message: fallback.message,
          });
          return;
        } catch {
          // fall through to original error
        }
      }
      setData(null);
      setError(err.body?.error || err.message || 'Could not load manager dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(
    () => ({ data, loading, error, reload }),
    [data, loading, error, reload]
  );

  return (
    <ManagerDashboardContext.Provider value={value}>
      {children}
    </ManagerDashboardContext.Provider>
  );
}

export function useManagerDashboard() {
  const ctx = useContext(ManagerDashboardContext);
  if (!ctx) {
    throw new Error('useManagerDashboard must be used within ManagerDashboardProvider');
  }
  return ctx;
}
