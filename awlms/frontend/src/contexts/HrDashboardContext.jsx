import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api.js';

const HrDashboardContext = createContext(null);

export function HrDashboardProvider({ children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const json = await apiFetch('/api/hr/dashboard');
      setData(json);
    } catch (err) {
      setData(null);
      setError(err.body?.error || err.message || 'Could not load HR data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(
    () => ({
      data,
      loading,
      error,
      reload,
    }),
    [data, loading, error, reload]
  );

  return <HrDashboardContext.Provider value={value}>{children}</HrDashboardContext.Provider>;
}

export function useHrDashboard() {
  const ctx = useContext(HrDashboardContext);
  if (!ctx) {
    throw new Error('useHrDashboard must be used within HrDashboardProvider');
  }
  return ctx;
}
