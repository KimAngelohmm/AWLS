import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api.js';

const EmployeeWorkspaceContext = createContext(null);

export function EmployeeWorkspaceProvider({ children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const json = await apiFetch('/api/employee/dashboard');
      setData(json);
    } catch (err) {
      setData(null);
      setError(err.body?.error || err.message || 'Could not load your workspace');
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

  return (
    <EmployeeWorkspaceContext.Provider value={value}>{children}</EmployeeWorkspaceContext.Provider>
  );
}

export function useEmployeeWorkspace() {
  const ctx = useContext(EmployeeWorkspaceContext);
  if (!ctx) {
    throw new Error('useEmployeeWorkspace must be used within EmployeeWorkspaceProvider');
  }
  return ctx;
}
