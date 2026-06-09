# Design Document — AWLMS Remaining Modules

## Overview

This document covers the technical design for the six remaining gaps in the AWLMS codebase. All changes are additive — no existing routes, components, or database tables are removed. The design follows the patterns already established in the codebase (Express route files, React functional components, `apiFetch`, CSS class naming).

---

## Architecture

### Affected files summary

| Area | File | Change |
|---|---|---|
| Backend | `src/routes/employee.js` | Add `POST /performance/ingest` handler |
| Frontend | `src/layouts/EmployeeLayout.jsx` | Mount `<PerformanceTelemetry />` |
| Frontend | `src/pages/employee/EmployeePerformancePage.jsx` | Replace raw JSON table with KPI cards + chart |
| Frontend | `src/pages/manager/ManagerHome.jsx` | Add Notification Feed section |
| Frontend | `src/pages/monitoring/MonitoringDashboard.jsx` | Add "Generate AI Brief" button + brief panel |
| Frontend | `src/pages/hr/HrLifecycleModule.jsx` | Add Rationale Panel + Repost Confirmation banner |

No new routes, no new database tables, no new npm packages beyond what is already installed.

---

## Component Design

### 1 — Performance Telemetry Ingest Endpoint

**File:** `backend/src/routes/employee.js`

Add a new route handler inside the existing `employee.js` router (which already applies `authenticateToken` + `requireRole('employee')` to all routes).

```
POST /api/employee/performance/ingest
Auth: Bearer token (employee role)
Body: { session_id: string, metrics: { focus_score, activity_index, productive_minutes, ...rest } }
```

**Handler logic:**

```
1. Validate body: metrics must be an object; focus_score, activity_index, productive_minutes must be present.
   → 400 if missing.

2. Look up Employee row for req.user.id using the existing getEmployeeForUser() helper.
   → If null: return 200 { ok: false, reason: 'no_employee_profile' }

3. Fetch the employee's JobPosition.performance_thresholds.

4. Write PerformanceRecord:
   INSERT INTO PerformanceRecord (id, employee_id, recorded_at, metrics, source, session_id)
   VALUES (uuid, employee.id, NOW(3), JSON(metrics), 'realtime', session_id)

5. Call evaluatePerformance({ thresholds, submitted: metrics }) from performanceMetrics service.

6. If result.alert === true:
   INSERT INTO PerformanceStaffAlert (id, employee_id, performance_record_id, severity, title, body, audience)
   VALUES (uuid, employee.id, recordId, result.severity,
           'Performance threshold breach', breaches[0].message, 'both')

7. Return 201 { ok: true, recordId, alertCreated: boolean }
```

**Severity mapping** (already in `performanceMetrics.js`):
- `breach_count >= 3` OR `focus_score < 70% of threshold` → `'high'`
- Otherwise → `'medium'`

The alert `title` is built from the first breach message. The `body` is the full JSON-serialized breaches array as a readable string.

---

### 2 — Mount PerformanceTelemetry in EmployeeLayout

**File:** `frontend/src/layouts/EmployeeLayout.jsx`

Import `PerformanceTelemetry` and render it as a sibling of `<Outlet />` inside the `hr-content` div. The component returns `null` so it has no visual footprint.

```jsx
import PerformanceTelemetry from '../components/PerformanceTelemetry.jsx';

// Inside the JSX, inside <EmployeeWorkspaceProvider>:
<PerformanceTelemetry />
<div className="hr-content">
  <Outlet />
</div>
```

---

### 3 — Employee Performance Page — KPI Visualization

**File:** `frontend/src/pages/employee/EmployeePerformancePage.jsx`

Replace the raw `<pre>` JSON table with structured KPI cards and a bar chart. No new library is needed — the chart is rendered as a CSS flex bar chart identical to the `TrendBars` component already in `MonitoringDashboard.jsx`.

**Data sources (already available):**
- `GET /api/employee/performance-records?limit=30` — returns `{ records, employee }`
- `GET /api/employee/dashboard` — returns `employee` with `job_position_id`; the dashboard context already loads this

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  Header: "My Performance"  [Refresh summary]        │
├──────────┬──────────────┬──────────────────────────┤
│ KPI Card │  KPI Card    │  KPI Card                │
│ Focus    │  Activity    │  Productive Mins          │
│  Score   │   Index      │                          │
├──────────┴──────────────┴──────────────────────────┤
│  Threshold comparison row (if thresholds exist)     │
├─────────────────────────────────────────────────────┤
│  Performance Chart — focus_score over last 30 recs  │
└─────────────────────────────────────────────────────┘
```

**KPI Card component (inline):**

```jsx
function KpiCard({ label, value, unit, threshold, thresholdLabel }) {
  const numeric = value != null ? Number(value) : null;
  const thNum = threshold != null ? Number(threshold) : null;
  const ok = thNum == null || numeric == null || numeric >= thNum;
  return (
    <div className="perf-kpi-card">
      <p className="perf-kpi-label">{label}</p>
      <p className={`perf-kpi-value ${ok ? '' : 'perf-kpi-value--breach'}`}>
        {numeric != null ? numeric.toFixed(unit === 'index' ? 2 : 0) : '—'}
        {unit && unit !== 'index' ? <span className="perf-kpi-unit"> {unit}</span> : null}
      </p>
      {thNum != null && (
        <p className="perf-kpi-threshold muted">
          Min: {thresholdLabel ?? thNum}
        </p>
      )}
    </div>
  );
}
```

**Chart component (inline, reuses MonitoringDashboard pattern):**

```jsx
function PerfChart({ records }) {
  // records sorted oldest-first for display
  const sorted = [...records].reverse().slice(0, 30);
  const values = sorted.map(r => Number(parseMetrics(r.metrics).focus_score) || 0);
  const max = Math.max(...values, 1);
  return (
    <div className="perf-chart" role="img" aria-label="Focus score over time">
      {sorted.map((r, i) => {
        const v = values[i];
        const h = Math.round((v / max) * 100);
        return (
          <div key={r.id} className="perf-chart-col">
            <div className="perf-chart-bar-wrap">
              <div className="perf-chart-bar" style={{ height: `${h}%` }} title={`${r.recorded_at}: ${v}`} />
            </div>
            <span className="perf-chart-label">
              {new Date(r.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

**State:**
- `records` — array from `/api/employee/performance-records?limit=30`
- `loading`, `loadError`
- Thresholds are parsed from `dash.employee` context (already loaded by `EmployeeWorkspaceContext`)

**Empty state:** When `records.length === 0`, show a single panel with the message "No performance data has been recorded yet. Metrics are submitted automatically while you use the portal."

**Threshold display:** Parse `performance_thresholds` from the employee's job position. The `EmployeeWorkspaceContext` already fetches `/api/employee/dashboard` which includes the employee record. Add a `GET /api/employee/performance-records` call that also returns the job position thresholds — or fetch them from the existing dashboard context. Since the dashboard context already has `employee.job_position_id`, the simplest approach is to add `performance_thresholds` to the `/api/employee/performance-records` response by joining `JobPosition` in the existing query.

---

### 4 — Manager Home — Notification Feed

**File:** `frontend/src/pages/manager/ManagerHome.jsx`

Replace the minimal placeholder page with a full notification feed. The backend `GET /api/manager/notifications` and `PATCH /api/manager/notifications/:id/read` already exist.

**State:**
```js
const [notifications, setNotifications] = useState([]);
const [unreadCount, setUnreadCount] = useState(0);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [markingId, setMarkingId] = useState(null);
```

**Data fetch:**
```js
async function loadNotifications() {
  const json = await apiFetch('/api/manager/notifications?limit=10');
  // Filter to unread only for display (max 10)
  const unread = (json.userNotifications || []).filter(n => !n.read_at).slice(0, 10);
  setNotifications(unread);
  setUnreadCount(json.unreadUserNotificationCount || 0);
}
```

**Auto-refresh:** `setInterval(loadNotifications, 60_000)` inside `useEffect`, cleared on unmount.

**Mark as read:**
```js
async function markRead(id) {
  setMarkingId(id);
  try {
    await apiFetch(`/api/manager/notifications/${id}/read`, { method: 'PATCH', body: '{}' });
    // Optimistic: remove from list
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  } catch {
    // Rollback: reload
    await loadNotifications();
  } finally {
    setMarkingId(null);
  }
}
```

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  Manager Workspace                                  │
├─────────────────────────────────────────────────────┤
│  Quick links: Team Monitoring | Lifecycle           │
├─────────────────────────────────────────────────────┤
│  Notifications  [badge: N unread]                   │
│  ┌──────────────────────────────────────────────┐   │
│  │ [unread border] Title          category  ago │   │
│  │ Body truncated to 120 chars…   [Mark read]   │   │
│  └──────────────────────────────────────────────┘   │
│  (empty state if no unread)                         │
└─────────────────────────────────────────────────────┘
```

**Unread visual distinction:** Unread items render with `border-left: 2px solid #0FA888`.

**Category label mapping:**
- `mgr_team_performance` → "Team Alert"
- `mgr_recommendation_status` → "Recommendation"
- default → category string

**Relative timestamp helper** (same pattern as `HrDashboardHome.jsx`):
```js
function timeAgo(value) { ... } // already exists in HrDashboardHome — copy inline
```

---

### 5 — HR Monitoring — AI Brief Trigger

**File:** `frontend/src/pages/monitoring/MonitoringDashboard.jsx`

The `MonitoringDashboard` component already accepts `apiPrefix` as a prop. The HR page passes `apiPrefix="/api/hr/monitoring"` and the Manager page passes `apiPrefix="/api/manager/monitoring"`. Both backends have a `POST /ai/brief` endpoint.

**New state:**
```js
const [brief, setBrief] = useState(null);       // { summary, generatedAt }
const [briefLoading, setBriefLoading] = useState(false);
const [briefError, setBriefError] = useState('');
```

**Handler:**
```js
async function generateBrief() {
  setBriefLoading(true);
  setBriefError('');
  setBrief(null);
  try {
    const json = await apiFetch(`${apiPrefix}/ai/brief`, { method: 'POST', body: '{}' });
    setBrief({ summary: json.summary || json.brief || JSON.stringify(json), generatedAt: new Date() });
  } catch (e) {
    setBriefError(e.body?.error || e.message || 'Could not generate brief');
  } finally {
    setBriefLoading(false);
  }
}
```

**Button placement:** Add to the existing `hr-page-actions` div in the header, alongside the existing "Refresh" button:
```jsx
<button
  type="button"
  className="btn-primary"
  onClick={generateBrief}
  disabled={briefLoading || loading}
>
  {briefLoading ? 'Generating…' : '✦ Generate AI Brief'}
</button>
```

**Brief panel** (rendered after the trend chart sections, before the alerts table):
```jsx
{(brief || briefError) && (
  <section className="hr-panel mon-brief-panel">
    <div className="mon-brief-head">
      <h2 className="hr-panel-title">AI Monitoring Brief</h2>
      {brief?.generatedAt && (
        <span className="muted mon-brief-ts">
          Generated {brief.generatedAt.toLocaleTimeString()}
        </span>
      )}
    </div>
    {briefError && <div className="auth-alert">{briefError}</div>}
    {brief && (
      <div className="mon-brief-body">
        {brief.summary}
      </div>
    )}
  </section>
)}
```

**Styling** (added to `index.css`):
```css
.mon-brief-panel { border-left: 2px solid #0FA888; }
.mon-brief-body {
  background: rgba(15, 168, 136, 0.09);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  color: #fff;
  line-height: 1.6;
  white-space: pre-wrap;
}
.mon-brief-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
.mon-brief-ts { font-size: 0.78rem; }
```

**Behavior:** Each click replaces the previous brief (not appended). If a new brief is requested while one is displayed, the old one is cleared and replaced.

---

### 6 — HR Lifecycle — Recommendation Rationale View

**File:** `frontend/src/pages/hr/HrLifecycleModule.jsx`

**New state:**
```js
const [rationaleRec, setRationaleRec] = useState(null); // the full recommendation object
```

**Rationale Panel** (modal overlay, same pattern as `TranscriptModal` in `HrRecruitmentModule.jsx`):

```jsx
function RationalePanel({ rec, onClose }) {
  return (
    <div className="rec-modal-overlay" onClick={onClose}>
      <div className="rec-modal" onClick={e => e.stopPropagation()}>
        <div className="rec-modal-head">
          <div>
            <h2 className="rec-modal-title">Recommendation Rationale</h2>
            <p className="rec-modal-sub">
              {rec.employee_name} ·{' '}
              <span className="hr-pill">{rec.recommendation_type}</span>
              {rec.target_job_title ? ` → ${rec.target_job_title}` : ''}
            </p>
          </div>
          <button type="button" className="rec-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="rec-modal-section">
          <p className="rec-modal-section-label">Submitted</p>
          <p className="muted">{formatDate(rec.created_at)}</p>
        </div>
        <div className="rec-modal-section">
          <p className="rec-modal-section-label">Rationale</p>
          <div className="rec-modal-summary" style={{ whiteSpace: 'pre-wrap' }}>
            {rec.rationale || 'No rationale provided.'}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Table change** — add a "Rationale" column to the recommendations table:

```jsx
// In the pendingRecs.map():
<td>
  {rec.rationale?.trim() ? (
    <button
      type="button"
      className="btn-secondary hr-btn-tight"
      onClick={() => setRationaleRec(rec)}
    >
      View rationale
    </button>
  ) : (
    <span className="muted" style={{ fontSize: '0.8rem' }}>No rationale provided</span>
  )}
</td>
```

**Close behavior:** `setRationaleRec(null)` — the modal unmounts, focus returns to the document body. Scroll position is preserved because the modal is an overlay (no page navigation).

**Render at bottom of component:**
```jsx
{rationaleRec && <RationalePanel rec={rationaleRec} onClose={() => setRationaleRec(null)} />}
```

---

### 7 — HR Lifecycle — Closed-Loop Repost Confirmation

**File:** `frontend/src/pages/hr/HrLifecycleModule.jsx`

The backend already returns `autoGeneratedJobPositionId` in the response bodies of:
- `POST /api/hr/lifecycle/decisions/:id/process`
- `POST /api/hr/lifecycle/lifecycle-events/:id/complete-resignation`

**New state:**
```js
const [repostBanner, setRepostBanner] = useState(null); // { jobPositionId, jobTitle } | null
```

**Fetch job title** after receiving `autoGeneratedJobPositionId`:
```js
async function fetchJobTitle(jobPositionId) {
  try {
    const json = await apiFetch(`/api/hr/recruitment/job-positions`);
    const match = (json.jobPositions || []).find(j => j.id === jobPositionId);
    return match?.title || 'New vacancy';
  } catch {
    return 'New vacancy';
  }
}
```

**Updated `processDecision` and `completeResignation`:**
```js
const result = await apiFetch(...);
if (result.autoGeneratedJobPositionId) {
  const title = await fetchJobTitle(result.autoGeneratedJobPositionId);
  setRepostBanner({ jobPositionId: result.autoGeneratedJobPositionId, title });
  // Auto-dismiss after 10 seconds
  setTimeout(() => setRepostBanner(null), 10_000);
}
await load(); // refresh tables
```

**Banner component (inline):**
```jsx
{repostBanner && (
  <div className="lifecycle-repost-banner" role="status">
    <span className="lifecycle-repost-icon">✦</span>
    <div className="lifecycle-repost-body">
      <strong>Vacancy auto-posted to Recruitment</strong>
      <span className="muted"> — {repostBanner.title}</span>
    </div>
    <Link to="/hr/recruitment" className="btn-primary hr-btn-tight">
      View posting
    </Link>
    <button
      type="button"
      className="lifecycle-repost-dismiss"
      onClick={() => setRepostBanner(null)}
      aria-label="Dismiss"
    >
      ✕
    </button>
  </div>
)}
```

**Banner placement:** Rendered immediately below the `<header>` and error alert, above the first `<section>`.

**Styling** (added to `index.css`):
```css
.lifecycle-repost-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(15, 168, 136, 0.12);
  border: 0.5px solid #0FA888;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  color: #fff;
}
.lifecycle-repost-icon { color: #0FA888; font-size: 1.1rem; }
.lifecycle-repost-body { flex: 1; }
.lifecycle-repost-dismiss {
  background: none;
  border: none;
  color: #6B7280;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.25rem;
}
.lifecycle-repost-dismiss:hover { color: #fff; }
```

---

## Data Models

No new database tables or schema changes are required. All data is stored in existing tables:

| Table | Used by |
|---|---|
| `PerformanceRecord` | Ingest endpoint writes; Performance page reads |
| `PerformanceStaffAlert` | Ingest endpoint writes on breach |
| `UserNotification` | Manager Home reads |
| `JobPosition` | Repost confirmation reads title |

---

## API Endpoints

### New endpoint

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/employee/performance/ingest` | employee JWT | Write PerformanceRecord + optional PerformanceStaffAlert |

### Existing endpoints consumed by new UI

| Method | Path | Consumer |
|---|---|---|
| `GET` | `/api/employee/performance-records` | Employee Performance Page |
| `GET` | `/api/manager/notifications` | Manager Home |
| `PATCH` | `/api/manager/notifications/:id/read` | Manager Home |
| `POST` | `/api/hr/monitoring/ai/brief` | MonitoringDashboard (HR) |
| `POST` | `/api/manager/monitoring/ai/brief` | MonitoringDashboard (Manager) |
| `GET` | `/api/hr/recruitment/job-positions` | Repost confirmation (title lookup) |

### Modified endpoint

`GET /api/employee/performance-records` — add `performance_thresholds` to the response by joining `JobPosition` in the existing query. Response shape becomes:
```json
{
  "records": [...],
  "employee": { "id": "...", "job_position_id": "..." },
  "performanceThresholds": { "focus_score_min": 50, ... }
}
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Ingest: no employee profile | 200 `{ ok: false, reason: 'no_employee_profile' }` |
| Ingest: missing fields | 400 with field name in message |
| Ingest: DB error | 500 |
| Performance page: fetch fails | Error banner, records stay empty |
| Manager notifications: fetch fails | Error banner, empty feed shown |
| Manager mark-as-read fails | Optimistic update rolled back, item reappears |
| AI Brief: request fails | Error message shown, button re-enabled |
| Repost title lookup fails | Banner shows "New vacancy" as fallback title |

---

## Styling Notes

All new CSS classes follow the existing naming conventions in `index.css`:

- `perf-kpi-card`, `perf-kpi-label`, `perf-kpi-value`, `perf-kpi-value--breach`, `perf-kpi-unit`, `perf-kpi-threshold` — KPI cards
- `perf-chart`, `perf-chart-col`, `perf-chart-bar-wrap`, `perf-chart-bar`, `perf-chart-label` — performance chart
- `mon-brief-panel`, `mon-brief-head`, `mon-brief-body`, `mon-brief-ts` — AI brief panel
- `lifecycle-repost-banner`, `lifecycle-repost-icon`, `lifecycle-repost-body`, `lifecycle-repost-dismiss` — repost banner
- `mgr-notif-feed`, `mgr-notif-item`, `mgr-notif-item--unread`, `mgr-notif-title`, `mgr-notif-body`, `mgr-notif-meta` — manager notification feed

All colors use the design system tokens: `#0FA888` (teal primary), `#1F2937` (surface), `rgba(255,255,255,0.08)` (border), `#9CA3AF` (secondary text), `#6B7280` (muted text).
