# Supabase Migrations

This directory contains SQL migration files for the Slovi production database.

## Directory Structure

```
supabase/
├── README.md
└── migrations/
    └── 20260306_practice_rpc.sql   # Practice module RPC functions
```

---

## Deploying to Production

There are two ways to run a migration: via the Supabase Dashboard SQL editor (no tooling required) or via the Supabase CLI (recommended for repeatable deployments).

---

### Option A — Supabase Dashboard (quickest for one-off migrations)

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and open the project.
2. Navigate to **Database → SQL Editor**.
3. Click **New query**.
4. Copy the contents of the migration file and paste them into the editor.
5. Click **Run** (or `Cmd+Enter`).
6. Verify the output shows no errors. Each `CREATE OR REPLACE FUNCTION` statement should return `Success`.

---

### Option B — Supabase CLI

#### Prerequisites

Install the CLI if you haven't already:

```bash
brew install supabase/tap/supabase
```

Log in:

```bash
supabase login
```

#### Steps

**1. Link the project to your remote database**

Find your project reference ID in the Supabase Dashboard URL:
`https://supabase.com/dashboard/project/<project-ref>`

```bash
supabase link --project-ref <project-ref>
```

You will be prompted for the database password (find it under **Project Settings → Database → Database password**).

**2. Check migration status**

```bash
supabase db remote commit
```

This shows which migrations have already been applied to the remote database.

**3. Push the migration**

```bash
supabase db push
```

This runs all migration files in `supabase/migrations/` that have not yet been applied, in filename order (chronological by timestamp prefix).

**4. Verify**

In the Dashboard, go to **Database → Functions** and confirm the new functions appear. You can also run a quick smoke test in the SQL editor:

```sql
-- Should return the function signatures
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'record_practice_answer',
    'build_practice_session',
    'build_vocabulary_session',
    'get_practice_progress',
    'get_known_words',
    'build_dusty_session',
    'get_practice_box_count'
  );
```

---

## Before Running `20260306_practice_rpc.sql`

This migration requires `user_word_progress` to have a `word_form_id` column. If you have not already applied this schema change, run it first (either via the Dashboard or as a separate migration):

```sql
ALTER TABLE user_word_progress
  ADD COLUMN word_form_id bigint REFERENCES word_forms (id) ON DELETE CASCADE;

ALTER TABLE user_word_progress DROP CONSTRAINT user_word_progress_pkey;
ALTER TABLE user_word_progress ADD PRIMARY KEY (profile_id, word_form_id, mode);

CREATE INDEX idx_uwp_profile_mode       ON user_word_progress (profile_id, mode);
CREATE INDEX idx_pa_profile_created     ON practice_attempts (profile_id, created_at DESC);
CREATE INDEX idx_pa_profile_mode_created ON practice_attempts (profile_id, mode, created_at DESC);
CREATE INDEX idx_practice_box_profile   ON practice_box (profile_id, created_at ASC);
```

Run this before pushing the RPC migration, otherwise the RPC functions will be created but will fail at runtime.

---

## Naming Convention

Migration files follow the pattern `YYYYMMDD_description.sql`. Always use a date prefix so the CLI applies them in the correct order.

## Rolling Back

Supabase does not support automatic rollback. To undo a migration, write a new migration that reverses the changes (e.g. `DROP FUNCTION`, `ALTER TABLE ... DROP COLUMN`) and push it.

---

## Known SQL Gotchas

**`UNION ALL` with `ORDER BY` / `LIMIT` per branch**

PostgreSQL does not allow `ORDER BY` or `LIMIT` on individual members of a `UNION ALL` directly. Wrap each branch in a subquery:

```sql
-- Wrong
SELECT id FROM a ORDER BY priority DESC LIMIT 4
UNION ALL
SELECT id FROM b ORDER BY priority DESC LIMIT 4

-- Correct
SELECT id FROM (SELECT id FROM a ORDER BY priority DESC LIMIT 4) s1
UNION ALL
SELECT id FROM (SELECT id FROM b ORDER BY priority DESC LIMIT 4) s2
```

**`auth.uid()` type is `uuid`, not `text`**

`auth.uid()` returns a `uuid`. Supabase stores `profile_id` columns as `uuid` in PostgreSQL even though they appear as `string` in the TypeScript schema. Do not cast to `::text` — compare directly:

```sql
-- Wrong
WHERE profile_id = auth.uid()::text

-- Correct
WHERE profile_id = auth.uid()
```
