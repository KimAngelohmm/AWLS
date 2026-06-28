# Database (MySQL 8.0+ / XAMPP)

## Fresh install

Run `schema.sql` once against a clean MySQL instance:

```bash
mysql -u root -p < database/schema.sql
```

This creates the `awlms` database and the core recruitment schema in the correct dependency order, plus sample data.

> **Warning:** `schema.sql` drops and recreates all tables. Never run it against a database you need to preserve without a backup first.

---

## Tables created by schema.sql

| # | Table | Purpose |
|---|-------|---------|
| 1 | `departments` | Organisational units |
| 2 | `users` | HR, Manager, Employee login accounts |
| 3 | `JobPosition` | Open roles; holds AI interview rubric (`competency_requirements`, `interview_criteria`) |
| 4 | `Applicant` | One row per application; stores full AI interview chat (`interview_messages`), plain-text transcript, AI assessment and recommendation, and HR hiring decision |
| 5 | `Employee` | Hired employees created after HR approves an Applicant; linked to a `users` login account |

---

The schema supports recruitment workflows:

- HR creates job positions with competency requirements and AI interview criteria.
- Applicants submit public applications and complete AI-led interviews.
- HR reviews AI assessment summaries and hiring recommendations.
- Approved applicants can be converted into employees.

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
