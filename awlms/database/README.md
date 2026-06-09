# Database (MySQL 8.0+ / XAMPP)

## Fresh install

Run `schema.sql` once against a clean MySQL instance:

```bash
mysql -u root -p < database/schema.sql
```

This creates the `awlms` database and all 15 tables in the correct dependency order, plus sample data.

> **Warning:** `schema.sql` drops and recreates all tables. Never run it against a database you need to preserve without a backup first.

---

## Tables created by schema.sql

| # | Table | Purpose |
|---|-------|---------|
| 1 | `departments` | Organisational units |
| 2 | `users` | HR, Manager, Employee login accounts |
| 3 | `JobPosition` | Open roles; holds AI interview rubric (`competency_requirements`, `interview_criteria`) and performance thresholds |
| 4 | `Applicant` | One row per application; stores full AI interview chat (`interview_messages`), plain-text transcript, AI assessment and recommendation, and HR hiring decision |
| 5 | `Employee` | Active workforce; created after HR approves an Applicant; linked to a `users` login account |
| 6 | `PerformanceRecord` | Timestamped productivity metrics evaluated against `JobPosition.performance_thresholds` |
| 7 | `PerformanceStaffAlert` | Threshold-breach alerts surfaced to HR and managers |
| 8 | `LifecycleRecommendation` | Manager-submitted promotion/termination recommendations pending HR review |
| 9 | `HRDecision` | Authorised HR decisions (promotion / termination); processing sends an `HRNotification` and creates a `LifecycleEvent` |
| 10 | `LifecycleEvent` | Immutable exit/status-change record; resignation flow stores `resignation_submitted_at` and `last_working_date` (14-day notice); HR acknowledgement triggers closed-loop job repost |
| 11 | `HRNotification` | Formal AI-generated letters delivered to the employee portal inbox |
| 12 | `ResignationChatMessage` | AI resignation intake chat transcript per employee |
| 13 | `UserNotification` | System notifications for HR and Manager users |
| 14 | `ai_chat_logs` | Dashboard AI assistant chat history per HR/Manager user |
| 15 | `LifecycleAuditLog` | Append-only audit trail for all lifecycle actions |

---

## Full lifecycle flow

```
JobPosition (open)
  └─ Applicant applies (public portal)
       └─ AI Interview (chat via interview_messages)
            └─ AI writes assessment_summary + ai_recommendation
                 └─ HR reviews → hiring_decision = approved
                      └─ Employee created (linked to users account)
                           ├─ PerformanceRecord logged continuously
                           │    └─ PerformanceStaffAlert on breach
                           │
                           ├─ Manager submits LifecycleRecommendation
                           │    └─ HR approves → HRDecision
                           │         └─ HRNotification sent (AI letter)
                           │              └─ LifecycleEvent recorded
                           │                   └─ (termination) JobPosition auto-cloned → back to top
                           │                   └─ (promotion) Employee.job_position_id updated
                           │
                           └─ Employee resigns via ResignationChatMessage (AI chat)
                                └─ LifecycleEvent.resignation_submitted_at set
                                     └─ last_working_date = +14 days (default)
                                          └─ HR acknowledges → exit_acknowledged_at set
                                               └─ Employee.employment_status = resigned
                                                    └─ JobPosition auto-cloned → back to top
```

---

## Seeding accounts

After applying `schema.sql`, run the seed scripts to create real login accounts:

```bash
# Admin / HR accounts for the project group
node backend/scripts/seed-admin-accounts.js

# Demo accounts (hr@sunniesstudios.com, manager@sunniesstudios.com, employee@sunniesstudios.com — password: Demo123!)
node backend/scripts/seed-demo-users.js

# Link existing employee-role users to Employee records (safe to re-run)
node backend/scripts/seed-employee-profiles.js
```

---

## Migration files (legacy — superseded by schema.sql)

The numbered migration files (`migration_002` … `migration_010`) were used to incrementally upgrade older databases. They are kept for reference but **schema.sql now includes everything**. Only use them if you are upgrading a live database that cannot be recreated from scratch.

---

## Environment

Set these in `backend/.env`:

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=awlms
```
