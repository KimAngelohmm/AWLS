# Implementation Plan: AWLMS Remaining Modules

## Overview

Implements the six remaining gaps in the AWLMS codebase: the performance telemetry ingest endpoint, employee KPI visualization, manager notification feed, HR monitoring AI brief trigger, HR lifecycle rationale view, and HR lifecycle closed-loop repost confirmation. All changes are additive — no existing routes, components, or database tables are removed.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1", "5", "6", "7", "8", "9"],
      "description": "Independent tasks: backend ingest endpoint, manager home, monitoring AI brief, lifecycle rationale, lifecycle repost banner, CSS classes"
    },
    {
      "wave": 2,
      "tasks": ["2", "4"],
      "description": "Mount PerformanceTelemetry (depends on Task 1); extend performance-records API (needed by Task 3)"
    },
    {
      "wave": 3,
      "tasks": ["3"],
      "description": "Employee performance KPI page (depends on Tasks 2 and 4)"
    }
  ]
}
```

## Tasks

- [ ] 1. Add `POST /api/employee/performance/ingest` backend endpoint
  - [ ] 1.1 In `backend/src/routes/employee.js`, add a new route handler after the existing `/resignation/submit` route
  - [ ] 1.2 Validate request body: `metrics` must be an object with `focus_score`, `activity_index`, and `productive_minutes` present; return HTTP 400 with a message naming the missing field if any are absent
  - [ ] 1.3 Call the existing `getEmployeeForUser(pool, req.user.id)` helper; if it returns null, return HTTP 200 `{ ok: false, reason: 'no_employee_profile' }` without writing any record
  - [ ] 1.4 Fetch `performance_thresholds` from the employee's `JobPosition` row: `SELECT jp.performance_thresholds FROM JobPosition jp WHERE jp.id = ?` using `employee.job_position_id`
  - [ ] 1.5 Insert a `PerformanceRecord` row: `id = crypto.randomUUID()`, `employee_id = employee.id`, `source = 'realtime'`, `session_id` from body (max 128 chars), `metrics = CAST(? AS JSON)` with the full metrics object
  - [ ] 1.6 Call `evaluatePerformance({ thresholds: performance_thresholds, submitted: metrics })` from `../services/performanceMetrics`
  - [ ] 1.7 If `result.alert === true`, insert a `PerformanceStaffAlert` row: `severity = result.severity`, `title = 'Performance threshold breach'`, `body = result.breaches.map(b => b.message).join('; ')`, `audience = 'both'`, `performance_record_id = recordId`
  - [ ] 1.8 Return HTTP 201 `{ ok: true, recordId, alertCreated: boolean }`
  - [ ] 1.9 Wrap DB operations in try/catch; return HTTP 500 `{ error: 'Could not ingest performance data' }` on unexpected errors

- [ ] 2. Mount `PerformanceTelemetry` in `EmployeeLayout` (depends on Task 1)
  - [ ] 2.1 In `frontend/src/layouts/EmployeeLayout.jsx`, add `import PerformanceTelemetry from '../components/PerformanceTelemetry.jsx';`
  - [ ] 2.2 Render `<PerformanceTelemetry />` as a direct child of `<EmployeeWorkspaceProvider>`, placed immediately before the `<div className="hr-main">` wrapper so it is mounted for all employee portal pages
  - [ ] 2.3 Verify the component returns `null` and has no visual impact on the layout

- [ ] 3. Rewrite `EmployeePerformancePage` with KPI cards and performance chart (depends on Tasks 2 and 4)
  - [ ] 3.1 In `frontend/src/pages/employee/EmployeePerformancePage.jsx`, add an inline `KpiCard` component that accepts `label`, `value`, `unit`, `threshold`, and `thresholdLabel` props; render the value as a formatted number (0 decimal places for scores/minutes, 2 for index); apply `perf-kpi-value--breach` class when `value < threshold`
  - [ ] 3.2 Add an inline `PerfChart` component that accepts a `records` array; reverse-sort records oldest-first, take up to 30; render a CSS flex bar chart using `perf-chart`, `perf-chart-col`, `perf-chart-bar-wrap`, `perf-chart-bar`, `perf-chart-label` classes; bar height is proportional to `focus_score` relative to the max value in the set
  - [ ] 3.3 Replace the existing `useEffect` data fetch: call `GET /api/employee/performance-records?limit=30`; store `records` and `performanceThresholds` from the response
  - [ ] 3.4 When `records.length === 0`, render a single `emp-panel` with the message "No performance data has been recorded yet. Metrics are submitted automatically while you use the portal." — do not render KPI cards, chart, or threshold row
  - [ ] 3.5 When `records.length >= 1`, render three `KpiCard` components in a flex row using the most recent record's `focus_score`, `activity_index`, and `productive_minutes`; pass the corresponding threshold values from `performanceThresholds` (`focus_score_min`, `activity_index_min`, `productive_minutes_min`) when available
  - [ ] 3.6 When `records.length >= 2`, render the `PerfChart` below the KPI cards
  - [ ] 3.7 Wire the existing "Refresh summary" button to re-fetch `/api/employee/performance-records?limit=30` and update state
  - [ ] 3.8 Remove the raw `<pre className="emp-json">` JSON rendering entirely — no raw JSON objects should appear in the visible UI

- [ ] 4. Extend `GET /api/employee/performance-records` to return `performanceThresholds` (depends on Task 1)
  - [ ] 4.1 In `backend/src/routes/employee.js`, update the `/performance-records` route handler: after fetching the employee record, also select `jp.performance_thresholds` by joining `JobPosition` on `employee.job_position_id`
  - [ ] 4.2 Parse the `performance_thresholds` JSON field (it may be a string from MySQL); include it in the response as `performanceThresholds` (object or `null` if empty/missing)
  - [ ] 4.3 Ensure the existing `records` and `employee` fields in the response are unchanged

- [ ] 5. Rewrite `ManagerHome` with notification feed
  - [ ] 5.1 In `frontend/src/pages/manager/ManagerHome.jsx`, replace the existing minimal implementation with a full page; keep the existing portal module cards section but add a notification feed section below it
  - [ ] 5.2 Add state: `notifications` (array), `unreadCount` (number), `loading` (bool), `error` (string), `markingId` (string|null)
  - [ ] 5.3 Add a `loadNotifications` async function that calls `GET /api/manager/notifications?limit=10`; filters the response to unread items only (`!n.read_at`), takes the first 10, sets `notifications` and `unreadCount`; on fetch error, sets `error` state
  - [ ] 5.4 In `useEffect` on mount: call `loadNotifications()`; set up `setInterval(loadNotifications, 60_000)`; clear the interval on unmount
  - [ ] 5.5 Add a `markRead(id)` function: optimistically remove the item from `notifications` and decrement `unreadCount`; call `PATCH /api/manager/notifications/:id/read` with `body: '{}'`; on error, call `loadNotifications()` to restore the correct state
  - [ ] 5.6 Render a section heading "Notifications" with an unread badge (`<span className="mgr-notif-badge">`) showing `unreadCount`; hide the badge when `unreadCount === 0`
  - [ ] 5.7 Render each notification as a `mgr-notif-item` div; apply `mgr-notif-item--unread` class for all items in the list; show title, body truncated to 120 characters, category label (map `mgr_team_performance` → "Team Alert", `mgr_recommendation_status` → "Recommendation"), relative timestamp using a `timeAgo` helper, and a "Mark read" button that calls `markRead(n.id)` and is disabled while `markingId === n.id`
  - [ ] 5.8 When `notifications.length === 0`, render an empty-state message: "Your notification inbox is empty."
  - [ ] 5.9 Add quick-link buttons to `/manager/monitoring` and `/manager/lifecycle` in the page header actions area

- [ ] 6. Add AI Brief button and panel to `MonitoringDashboard`
  - [ ] 6.1 In `frontend/src/pages/monitoring/MonitoringDashboard.jsx`, add state: `brief` (object `{ summary, generatedAt }` or null), `briefLoading` (bool), `briefError` (string)
  - [ ] 6.2 Add a `generateBrief` async function: set `briefLoading = true`, clear `brief` and `briefError`; call `POST ${apiPrefix}/ai/brief` with `body: '{}'`; on success, set `brief = { summary: json.summary || json.brief || JSON.stringify(json), generatedAt: new Date() }`; on error, set `briefError`; always set `briefLoading = false`
  - [ ] 6.3 Add a "✦ Generate AI Brief" button to the existing `hr-page-actions` div in the header; use `className="btn-primary"`; disable when `briefLoading || loading`; show "Generating…" label while loading
  - [ ] 6.4 Render the brief panel after the two trend chart sections and before the open alerts table; only render when `brief !== null || briefError !== ''`; use `className="hr-panel mon-brief-panel"`
  - [ ] 6.5 Inside the brief panel, render a header row with title "AI Monitoring Brief" and a timestamp showing `brief.generatedAt.toLocaleTimeString()` in a `mon-brief-ts` span; render `briefError` in an `auth-alert` div when present; render `brief.summary` in a `mon-brief-body` div when present
  - [ ] 6.6 Each new click replaces the previous brief — `setBrief(null)` at the start of `generateBrief` ensures the old content is cleared before the new one arrives

- [ ] 7. Add Rationale Panel to `HrLifecycleModule`
  - [ ] 7.1 In `frontend/src/pages/hr/HrLifecycleModule.jsx`, add state: `rationaleRec` (recommendation object or null)
  - [ ] 7.2 Add an inline `RationalePanel` component above the `HrLifecycleModule` default export; it accepts `rec` and `onClose` props; render a modal overlay using existing `rec-modal-overlay` and `rec-modal` CSS classes; include a close button (`rec-modal-close`) that calls `onClose`; display employee name, recommendation type pill, target job title (if promotion), formatted submission date, and the full `rationale` text in a `rec-modal-summary` div with `whiteSpace: 'pre-wrap'`
  - [ ] 7.3 In the `pendingRecs` table, add a "Rationale" column header after the "Submitted" column
  - [ ] 7.4 In each `pendingRecs` row, add a table cell: if `rec.rationale?.trim()` is truthy, render a "View rationale" button (`btn-secondary hr-btn-tight`) that calls `setRationaleRec(rec)`; otherwise render a muted "No rationale provided" text span
  - [ ] 7.5 At the bottom of the component's JSX (before the closing `</div>`), render `{rationaleRec && <RationalePanel rec={rationaleRec} onClose={() => setRationaleRec(null)} />}`

- [ ] 8. Add Repost Confirmation banner to `HrLifecycleModule`
  - [ ] 8.1 In `frontend/src/pages/hr/HrLifecycleModule.jsx`, add state: `repostBanner` (object `{ jobPositionId, title }` or null)
  - [ ] 8.2 Add a `fetchJobTitle(jobPositionId)` async helper: call `GET /api/hr/recruitment/job-positions`; find the matching job by id; return `match.title` or `'New vacancy'` as fallback; catch errors and return `'New vacancy'`
  - [ ] 8.3 In `processDecision`: after the `apiFetch` call succeeds, if `result.autoGeneratedJobPositionId` is truthy, call `fetchJobTitle`, then `setRepostBanner({ jobPositionId: result.autoGeneratedJobPositionId, title })`; set a `setTimeout(() => setRepostBanner(null), 10_000)` for auto-dismiss; then call `await load()`
  - [ ] 8.4 In `completeResignation`: apply the same pattern as 8.3 — check `result.autoGeneratedJobPositionId`, fetch title, set banner, set timeout, reload
  - [ ] 8.5 Render the banner JSX immediately after the error alert div and before the first `<section>`: a `lifecycle-repost-banner` div containing a teal `✦` icon, a body div with "Vacancy auto-posted to Recruitment" and the job title, a `<Link to="/hr/recruitment">` "View posting" button, and a dismiss button that calls `setRepostBanner(null)`; only render when `repostBanner !== null`

- [ ] 9. Add new CSS utility classes to `index.css`
  - [ ] 9.1 Add KPI card styles: `.perf-kpi-card` (surface background `#1F2937`, 12px border-radius, padding 1rem, flex column, border `0.5px solid rgba(255,255,255,0.08)`), `.perf-kpi-label` (color `#9CA3AF`, font-size 0.72rem, text-transform uppercase, letter-spacing 0.05em), `.perf-kpi-value` (color `#fff`, font-size 2rem, font-weight 700, margin 0.25rem 0), `.perf-kpi-value--breach` (color `#ef4444`), `.perf-kpi-unit` (color `#6B7280`, font-size 1rem, font-weight 400), `.perf-kpi-threshold` (font-size 0.75rem)
  - [ ] 9.2 Add performance chart styles: `.perf-chart` (display flex, align-items flex-end, gap 4px, overflow-x auto, padding-bottom 0.5rem), `.perf-chart-col` (display flex, flex-direction column, align-items center, min-width 28px), `.perf-chart-bar-wrap` (flex 1, display flex, align-items flex-end, height 80px, width 100%), `.perf-chart-bar` (width 100%, background `#0FA888`, border-radius 3px 3px 0 0, min-height 2px), `.perf-chart-label` (font-size 0.65rem, color `#6B7280`, margin-top 4px, white-space nowrap)
  - [ ] 9.3 Add AI brief panel styles: `.mon-brief-panel` (border-left 2px solid `#0FA888`), `.mon-brief-body` (background `rgba(15,168,136,0.09)`, border-radius 8px, padding 1rem 1.25rem, color `#fff`, line-height 1.6, white-space pre-wrap), `.mon-brief-head` (display flex, align-items center, justify-content space-between, margin-bottom 0.75rem), `.mon-brief-ts` (font-size 0.78rem)
  - [ ] 9.4 Add repost banner styles: `.lifecycle-repost-banner` (display flex, align-items center, gap 0.75rem, background `rgba(15,168,136,0.12)`, border `0.5px solid #0FA888`, border-radius 12px, padding 0.75rem 1rem, margin-bottom 1rem, color `#fff`), `.lifecycle-repost-icon` (color `#0FA888`, font-size 1.1rem), `.lifecycle-repost-body` (flex 1), `.lifecycle-repost-dismiss` (background none, border none, color `#6B7280`, cursor pointer, font-size 0.9rem, padding 0.25rem; hover color `#fff`)
  - [ ] 9.5 Add manager notification feed styles: `.mgr-notif-feed` (display flex, flex-direction column, gap 0.5rem), `.mgr-notif-item` (background `#1F2937`, border-radius 8px, padding 0.75rem 1rem, border `0.5px solid rgba(255,255,255,0.08)`), `.mgr-notif-item--unread` (border-left 2px solid `#0FA888`), `.mgr-notif-title` (color `#fff`, font-weight 600, font-size 0.9rem), `.mgr-notif-body` (color `#9CA3AF`, font-size 0.82rem, margin 0.25rem 0), `.mgr-notif-meta` (display flex, align-items center, gap 0.5rem, font-size 0.75rem, color `#6B7280`), `.mgr-notif-badge` (background `#0FA888`, color `#fff`, border-radius 999px, padding 0.1rem 0.45rem, font-size 0.72rem, font-weight 700, margin-left 0.4rem)

## Notes

- All changes are additive. No existing routes, components, or database tables are modified beyond the targeted additions described in each task.
- Tasks 1, 5, 6, 7, 8, and 9 are fully independent and can be executed in parallel (Wave 1).
- Tasks 2 and 4 depend on Task 1 completing first (Wave 2).
- Task 3 depends on both Tasks 2 and 4 (Wave 3).
- The `PerformanceTelemetry` component (`frontend/src/components/PerformanceTelemetry.jsx`) already exists and requires no modification — Task 2 only mounts it.
- The `MonitoringDashboard` component already accepts `apiPrefix` as a prop, so the AI brief button works for both HR (`/api/hr/monitoring`) and Manager (`/api/manager/monitoring`) without any routing changes.
- No new npm packages are required. The CSS bar chart pattern reuses the same approach already used in `MonitoringDashboard.jsx`.
