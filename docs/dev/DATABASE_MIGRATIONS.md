# Database Migrations

All database schema changes must be saved as SQL migration files in `supabase/migrations/`.

## Naming Convention

**Filename format:** `YYYYMMDD_NN_description.sql`

- `YYYYMMDD`: Date the migration was created.
- `NN`: Two-digit sequence number indicating the order of migrations created that day, starting at `01`.
- `description`: Short, descriptive name in snake_case.

Examples:
- `20261104_01_initial_schema.sql`
- `20261104_02_profile_timezone.sql`
- `20261104_03_lock_habit_goals.sql`

Migration files must be applied in filename order. Never reuse a sequence number or modify an already-applied migration; create a new migration for subsequent changes.

## Workflow

- Database changes are currently applied manually through the Supabase SQL Editor.
- Every schema change applied to Supabase must also be saved in the repository.
- Adding a migration file to GitHub does not automatically execute it in Supabase.
- Existing migrations should not be rerun against the shared database.
- If the project adopts the Supabase CLI later, migration filenames will need to follow its timestamp-based naming convention.