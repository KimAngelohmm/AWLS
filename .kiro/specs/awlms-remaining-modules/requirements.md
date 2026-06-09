# Requirements Document

## Introduction

This document specifies the remaining incomplete modules of the AI-Powered Workforce Lifecycle Management System (AWLMS) — a capstone thesis project for Dr. Yanga's Colleges, Inc. The system already has a working login, HR dashboard, AI interview pipeline, recruitment module, AI chat, employee resignation chat, and manager lifecycle recommendation form. What remains are the gaps identified by codebase audit:

1. **Performance Telemetry Ingest Pipeline** — The `PerformanceTelemetry` component exists and fires POST requests to `/api/employee/performance/ingest`, but that backend endpoint does not exist. The component is also not mounted in the employee portal.
2. **Employee Performance Page — KPI Visualization** — The page exists but renders raw JSON. It needs readable KPI cards and a performance history chart.
3. **Manager Home — Notification Feed** — The backend `/api/manager/notifications` route is fully implemented, but the Manager Home page does not display the notification feed or unread count.
4. **HR Monitoring — AI Brief Trigger** — The backend `/api/hr/monitoring/ai/brief` endpoint exists, but the Monitoring Dashboard UI has no button to request and display the AI-generated monitoring brief.
5. **HR Lifecycle — Recommendation Rationale View** — The lifecycle module table shows pending recommendations but has no way to read the full rationale text submitted by the manager.
6. **HR Lifecycle — Closed-Loop Repost Confirmation** — After processing a decision or completing a resignation, the system creates a new job position (closed-loop), but the UI does not confirm or link to the newly created posting.

All modules must use the existing design system: dark mode only, Navy/Teal palette, Inter font, 12px card border-radius, 0.5px rgba(255,255,255,0.08) borders.

---

## Glossary

- **AWLMS**: AI-Powered Workforce Lifecycle Management System — the full platform.
- **Performance_Telemetry**: The `PerformanceTelemetry` React component that periodically POSTs simulated productivity metrics from the employee portal.
- **Ingest_Endpoint**: The backend route `POST /api/employee/performance/ingest` that receives telemetry payloads, writes a `PerformanceRecord`, and evaluates thresholds.
- **PerformanceRecord**: A database row in the `PerformanceRecord` table storing timestamped productivity metrics for one employee.
- **PerformanceStaffAlert**: A database row raised when a `PerformanceRecord` breaches the role's `performance_thresholds` defined on `JobPosition`.
- **KPI_Card**: A visual summary tile showing a single metric value (e.g., focus score, activity index) with a label and optional trend indicator.
- **Performance_Chart**: A bar or line chart rendering the employee's historical `focus_score` and `activity_index` values over time.
- **Monitoring_Dashboard**: The shared `MonitoringDashboard` React component used by both HR (`/hr/monitoring`) and Manager (`/manager/monitoring`).
- **AI_Brief**: A Groq-generated natural-language summary of the current monitoring snapshot, produced by the `generateMonitoringBrief` service.
- **Manager_Home**: The React page at `/manager` rendered by `ManagerHome.jsx`.
- **UserNotification**: A database row in the `UserNotification` table representing an inbox item for an HR or Manager user.
- **Notification_Feed**: A UI section on Manager Home listing recent `UserNotification` rows with unread count and mark-as-read action.
- **LifecycleRecommendation**: A database row submitted by a Manager recommending promotion or termination for a team member.
- **Rationale_Panel**: A UI element (expandable row or modal) that displays the full `rationale` text of a `LifecycleRecommendation`.
- **Closed_Loop**: The automatic creation of a new open `JobPosition` cloned from the vacated role when an employee is terminated or resigns.
- **Repost_Confirmation**: A UI element shown after a Closed_Loop event that displays the ID or title of the newly created `JobPosition` and links to the Recruitment module.
- **HR_Personnel**: A user with `role = 'hr'` — has full access to all HR modules.
- **Manager**: A user with `role = 'manager'` — scoped to their department.
- **Employee**: A user with `role = 'employee'` — accesses personal dashboard only.

---

## Requirements

### Requirement 1: Performance Telemetry Ingest Endpoint

**User Story:** As an Employee, I want my productivity metrics to be automatically submitted to AWLMS while I am using the portal, so that HR and my Manager can monitor my performance without manual data entry.

#### Acceptance Criteria

1. WHEN the Employee portal loads and the user is authenticated, THE Performance_Telemetry SHALL be mounted inside the `EmployeeLayout` so that it runs for all employee portal pages.
2. WHEN the Performance_Telemetry fires a POST request to `/api/employee/performance/ingest`, THE Ingest_Endpoint SHALL accept a JSON body containing `session_id` (string), and `metrics` (object with at minimum `focus_score`, `activity_index`, `productive_minutes`).
3. WHEN a valid ingest payload is received, THE Ingest_Endpoint SHALL write one `PerformanceRecord` row with `source = 'realtime'`, linking it to the authenticated employee's `Employee` record.
4. IF the authenticated user has no linked `Employee` record, THEN THE Ingest_Endpoint SHALL return HTTP 200 with `{ "ok": false, "reason": "no_employee_profile" }` without writing any record.
5. WHEN a `PerformanceRecord` is written and the employee's `JobPosition` has non-empty `performance_thresholds`, THE Ingest_Endpoint SHALL evaluate the submitted metrics against those thresholds using the existing `performanceMetrics` service.
6. WHEN threshold evaluation determines a breach, THE Ingest_Endpoint SHALL create one `PerformanceStaffAlert` row with `audience = 'both'` and `severity` derived from the breach magnitude.
7. WHEN threshold evaluation determines no breach, THE Ingest_Endpoint SHALL NOT create a `PerformanceStaffAlert`.
8. THE Ingest_Endpoint SHALL return HTTP 201 with `{ "ok": true, "recordId": "<uuid>", "alertCreated": <boolean> }` on success.
9. IF the ingest payload is missing required fields, THEN THE Ingest_Endpoint SHALL return HTTP 400 with a descriptive error message.

---

### Requirement 2: Employee Performance Page — KPI Visualization

**User Story:** As an Employee, I want to see my performance metrics displayed as readable KPI cards and a chart rather than raw JSON, so that I can understand my productivity standing at a glance.

#### Acceptance Criteria

1. WHEN the Employee navigates to `/employee/performance`, THE Employee_Performance_Page SHALL display KPI_Cards for the most recent `PerformanceRecord`, showing at minimum: `focus_score`, `activity_index`, and `productive_minutes`.
2. WHEN no `PerformanceRecord` exists for the employee, THE Employee_Performance_Page SHALL display a message stating that no performance data has been recorded yet.
3. WHEN at least two `PerformanceRecord` rows exist, THE Employee_Performance_Page SHALL render a Performance_Chart plotting `focus_score` over time using the last 30 records, with the x-axis showing the recorded date and the y-axis showing the score value.
4. WHEN the employee has at least one `PerformanceRecord` and their role has defined `performance_thresholds` on `JobPosition`, THE Employee_Performance_Page SHALL display the threshold values alongside the KPI_Cards so the employee can compare their metrics to expectations. WHEN no `PerformanceRecord` exists, THE Employee_Performance_Page SHALL NOT display threshold values.
5. THE Employee_Performance_Page SHALL NOT expose raw JSON metric objects directly in the visible UI; all metric values SHALL be rendered as formatted numbers or labeled fields.
6. WHEN the Employee clicks "Refresh summary", THE Employee_Performance_Page SHALL reload both the KPI_Cards and the Performance_Chart with the latest data.

---

### Requirement 3: Manager Home — Notification Feed

**User Story:** As a Manager, I want to see my notification inbox on the Manager Home page, so that I am immediately aware of recommendation status changes and team performance alerts without navigating to a separate page.

#### Acceptance Criteria

1. WHEN the Manager navigates to `/manager`, THE Manager_Home SHALL fetch notifications from `GET /api/manager/notifications` and display the Notification_Feed.
2. WHEN the Notification_Feed loads, THE Manager_Home SHALL display the unread notification count as a badge near the "Notifications" heading.
3. WHEN the Notification_Feed contains unread notifications, THE Manager_Home SHALL visually distinguish unread items from read items (e.g., highlighted border or bold title).
4. WHEN the Manager clicks "Mark as read" on a notification, THE Manager_Home SHALL call `PATCH /api/manager/notifications/:id/read` and update the item's visual state without a full page reload.
5. WHEN there are zero total notifications (read or unread), THE Manager_Home SHALL display a message stating the inbox is empty. WHEN all notifications are read, THE Manager_Home SHALL show only unread notifications and hide read ones; if none remain visible, THE Manager_Home SHALL display the empty inbox message.
6. THE Notification_Feed SHALL display at most 10 unread notifications on the Manager Home page, with each item showing: title, body (truncated to 120 characters), category, and relative timestamp.
7. WHILE the Manager_Home is mounted, THE Manager_Home SHALL refresh the Notification_Feed automatically every 60 seconds to surface new alerts.

---

### Requirement 4: HR Monitoring — AI Brief Trigger

**User Story:** As an HR Personnel, I want to request an AI-generated monitoring brief from within the Monitoring Dashboard, so that I can get a natural-language summary of the current workforce performance state without manually interpreting the data tables.

#### Acceptance Criteria

1. WHEN the HR Personnel views the Monitoring_Dashboard at `/hr/monitoring`, THE Monitoring_Dashboard SHALL display a "Generate AI Brief" button in the page header actions area.
2. WHEN the HR Personnel clicks "Generate AI Brief", THE Monitoring_Dashboard SHALL call `POST /api/hr/monitoring/ai/brief` and display a loading indicator while the request is in progress.
3. WHEN the AI_Brief response is received, THE Monitoring_Dashboard SHALL display the brief text in a dedicated panel below the trend charts, styled using the AI chat bubble design (teal fill at 9% opacity).
4. IF the AI_Brief request fails, THEN THE Monitoring_Dashboard SHALL display an error message and re-enable the "Generate AI Brief" button.
5. WHEN the Manager views the Monitoring_Dashboard at `/manager/monitoring`, THE Monitoring_Dashboard SHALL also display a "Generate AI Brief" button that calls `POST /api/manager/monitoring/ai/brief`, using the appropriate API for the user's role.
6. WHILE an AI_Brief request is in progress, THE Monitoring_Dashboard SHALL disable the "Generate AI Brief" button to prevent duplicate requests.
7. THE Monitoring_Dashboard SHALL display the timestamp of when the AI_Brief was generated alongside the brief text.

---

### Requirement 5: HR Lifecycle — Recommendation Rationale View

**User Story:** As an HR Personnel, I want to read the full rationale text submitted by a Manager for each lifecycle recommendation, so that I can make an informed approve or reject decision.

#### Acceptance Criteria

1. WHEN the HR Personnel views the "Manager recommendations" table in the HR Lifecycle Module, THE HR_Lifecycle_Module SHALL display a "View rationale" action for each recommendation row that has a non-empty `rationale` field.
2. WHEN the HR Personnel clicks "View rationale", THE HR_Lifecycle_Module SHALL display the full `rationale` text in a Rationale_Panel (inline expandable row or modal overlay) without navigating away from the page.
3. WHEN a recommendation has no rationale text, THE HR_Lifecycle_Module SHALL show "No rationale provided" in place of the "View rationale" button.
4. THE Rationale_Panel SHALL display: the employee name, recommendation type (promotion or termination), target role (if promotion), submission date, and the full rationale text.
5. WHEN the HR Personnel closes the Rationale_Panel, THE HR_Lifecycle_Module SHALL return focus to the recommendations table without losing the current scroll position.

---

### Requirement 6: HR Lifecycle — Closed-Loop Repost Confirmation

**User Story:** As an HR Personnel, I want to see a confirmation that a new job posting was automatically created after processing a termination or completing a resignation, so that I know the closed-loop pipeline executed and can navigate directly to the new posting.

#### Acceptance Criteria

1. WHEN the backend response for any lifecycle action contains `autoGeneratedJobPositionId`, THE HR_Lifecycle_Module SHALL display a Repost_Confirmation banner showing the message "Vacancy auto-posted to Recruitment" and the title of the new `JobPosition`, regardless of which action triggered the response.
2. WHEN the backend response for completing a resignation contains `autoGeneratedJobPositionId`, THE HR_Lifecycle_Module SHALL display a Repost_Confirmation banner with the same format as criterion 1.
3. WHEN the Repost_Confirmation is displayed, THE HR_Lifecycle_Module SHALL include a "View posting" link that navigates to `/hr/recruitment`.
4. IF the backend response does not include `autoGeneratedJobPositionId` (e.g., no source job position was found), THEN THE HR_Lifecycle_Module SHALL NOT display the Repost_Confirmation banner.
5. THE Repost_Confirmation banner SHALL be dismissible by the HR Personnel and SHALL automatically disappear after 10 seconds if not dismissed.
6. WHEN a Repost_Confirmation is shown, THE HR_Lifecycle_Module SHALL also refresh the recommendations and decisions tables to reflect the updated state.
