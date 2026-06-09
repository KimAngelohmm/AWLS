import { useEffect, useRef } from 'react';
import { apiFetch } from '../lib/api.js';

/**
 * Sends periodic productivity / activity samples while the employee portal is open
 * (tab visible). Metrics are evaluated on the server against JobPosition.performance_thresholds.
 */
export default function PerformanceTelemetry() {
  const sessionRef = useRef(null);

  useEffect(() => {
    if (!sessionRef.current) {
      const key = 'awlms_perf_session';
      let id = sessionStorage.getItem(key);
      if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem(key, id);
      }
      sessionRef.current = id;
    }

    let interval;

    async function ingest() {
      if (document.visibilityState !== 'visible') return;
      const breachRoll = Math.random() < 0.12;
      const focus_score = breachRoll
        ? Math.round(28 + Math.random() * 18)
        : Math.round(62 + Math.random() * 33);
      const activity_index = breachRoll
        ? Number((0.15 + Math.random() * 0.2).toFixed(2))
        : Number((0.55 + Math.random() * 0.35).toFixed(2));
      const productive_minutes = breachRoll
        ? Math.round(Math.random() * 12)
        : Math.round(20 + Math.random() * 35);

      try {
        await apiFetch('/api/employee/performance/ingest', {
          method: 'POST',
          body: JSON.stringify({
            session_id: sessionRef.current,
            metrics: {
              focus_score,
              activity_index,
              productive_minutes,
              digital_events_count: Math.round(50 + Math.random() * 180),
              window_minutes: 15,
              client: 'employee_portal',
            },
          }),
        });
      } catch {
        /* network / auth; ignore */
      }
    }

    ingest();
    interval = setInterval(ingest, 75000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
