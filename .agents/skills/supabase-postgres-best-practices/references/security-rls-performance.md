---
title: Optimize RLS Policies for Performance
impact: HIGH
impactDescription: 5-10x faster RLS queries with proper patterns
tags: rls, performance, security, optimization
---

## Optimize RLS Policies for Performance

Poorly written RLS policies can cause severe performance issues. Use subqueries and indexes strategically.

**Incorrect (function called for every row):**

```sql
create policy orders_policy on orders
  using (auth.uid() = user_id);  -- auth.uid() called per row!

-- With 1M rows, auth.uid() is called 1M times
```

**Correct (wrap functions in SELECT):**

```sql
create policy orders_policy on orders
  using ((select auth.uid()) = user_id);  -- Called once, cached

-- 100x+ faster on large tables
```

Use security definer functions for complex checks:

```sql
-- Create helper function (runs as definer, bypasses RLS)
create or replace function is_team_member(team_id bigint)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where team_id = $1 and user_id = (select auth.uid())
  );
$$;

-- Use in policy (indexed lookup, not per-row check)
create policy team_orders_policy on orders
  using ((select is_team_member(team_id)));
```

Always add indexes on columns used in RLS policies:

```sql
create index orders_user_id_idx on orders (user_id);
```

Reference: [RLS Performance](https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations)

## Project Rule: Always Wrap auth Functions at Creation Time

**Every RLS policy written in this codebase, including policies in brand-new table migrations, must wrap all `auth.*` calls (`auth.uid()`, `auth.role()`, `auth.jwt()`, etc.) in a `SELECT` subquery from the very first time they are written.** Never write `auth.uid() = user_id`; always write `(select auth.uid()) = user_id`. This applies to `USING` clauses, `WITH CHECK` clauses, and any helper function used inside a policy. Skipping this causes Postgres to evaluate the function once per row instead of once per statement, which the Supabase Performance Advisor flags as a critical issue and forces a separate follow-up migration to remediate exactly the situation to avoid.
