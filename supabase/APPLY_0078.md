# Applying 0078 — `reinstate_member_email`

> **Status: NOT APPLIED to production.** Prepared and rehearsed on 22-Sep-2026; the
> apply itself could not be performed from the session that wrote it. Everything
> below is what that session verified, plus the exact commands for whoever has
> access.

## Why it was not applied here

Three independent blocks, each verified rather than assumed:

| Check | Result |
|---|---|
| `env \| grep -icE "supabase\|service_role\|pgpassword\|database_url"` | `0` |
| `~/.supabase` auth, `~/.netrc`, `.env` | none — only `.env.example` |
| `npx supabase projects list` | `LegacyPlatformAuthRequiredError — Access token not provided` |
| `npx supabase migration list --linked` | `LegacyProjectNotLinkedError — Cannot find project ref` |
| `curl https://lhpzhkzbnquwjljmbylo.supabase.co/rest/v1/` | `HTTP 000` |
| agent proxy relay log | `connect_rejected  lhpzhkzbnquwjljmbylo.supabase.co:443` |

The last line is the decisive one: the execution environment's **network policy
rejects the production host outright**, so this is not a credentials problem that
a token would solve from that container.

## DO NOT use `supabase db push`

`SETUP.md` lines 75–80 are binding here and the reason is measured, not theoretical:

> **The local ledger mapping is broken and `supabase db push` is DANGEROUS here.**
> `supabase migration list --linked` shows 46 local files and 37 remote timestamp
> versions with **no overlap at all** — every local reads as unapplied. A `db push`
> would try to replay the schema from `0001`.

Apply through `supabase db query --linked -f <file>` or the dashboard SQL editor,
and add the ledger row by hand — the same route `0045` and `0036`/`0038` took.

## The apply

```bash
# 1. Link (project ref from SETUP.md:354)
supabase link --project-ref lhpzhkzbnquwjljmbylo

# 2. READ FIRST — confirm the function does not already exist.
#    If it does, read its body rather than re-running this blindly.
supabase db query --linked \
  "select proname, pg_get_functiondef(p.oid)
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public' and p.proname='reinstate_member_email';"

# 3. Apply. One CREATE FUNCTION, one COMMENT, three grant/revoke.
supabase db query --linked -f supabase/migrations/0078_reinstate_member_email.sql

# 4. Ledger row BY HAND, timestamp version (not the literal 0078 — two local
#    files sharing a number has bitten this project before; see SETUP.md).
supabase db query --linked \
  "insert into supabase_migrations.schema_migrations (version, name)
   values ('20260922000000', 'reinstate_member_email');"
```

## Why this is safe to apply

- **Additive only.** 6 statements: 1 `create function`, 1 `comment`, 3 grant/revoke.
  No `alter`, `drop`, `insert`, `delete`, `truncate`. No column, constraint or index.
- **Not data-dependent.** Nothing is read from or written to any row at apply time.
  The one `update public.member_emails` is inside the function body and runs only
  when an operator presses Reinstate. It therefore **cannot fail on live data**, which
  is the specific hazard CLAUDE.md warns about for a migration that builds an index or
  adds a constraint over existing rows.
- **`update_member` is NOT restated.** It appears in this file only inside comment
  text. That is deliberate: T-120 measured its production body at 9,625 bytes against
  11,213 in the harness replay, and `53_harness_body_matches_production.sql` is red on
  it. Restating a divergent body would push this tree over production — RC-047's
  mechanism, T-125's warning.
- **Reversible in one statement:** `drop function public.reinstate_member_email(uuid);`
  Nothing else to undo — no data is migrated and no other object is touched.

## Verify after applying (read-only first)

```sql
-- 1. It exists, exactly once.
select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname='public' and p.proname='reinstate_member_email';          -- expect 1

-- 2. Grants match the security model (RC-042 and RC-052 are this grant, twice).
select has_function_privilege('anon','public.reinstate_member_email(uuid)','execute'),
       has_function_privilege('authenticated','public.reinstate_member_email(uuid)','execute');
                                                                           -- expect f, t

-- 3. The body is the one in this repo.
select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname='public' and p.proname='reinstate_member_email';

-- 4. What the academy actually holds — this is also the read that settles
--    whether the reported member's address was bounced or unsubscribed.
select status, count(*) from public.member_emails
 where deleted_at is null group by status order by 2 desc;
```

**Do not test the refusals on a real member's row.** The behaviour is already proven
against a real Postgres by `supabase/tests/57_reinstate_member_email.sql` (16/16 on a
full from-scratch replay). If a live check is wanted, create a throwaway member through
the app, suppress its address by hand, exercise it, then delete the member.

## Still open, and it is a READ not a write

`update_member`'s production body has never been read. Piece 3 of RC-106's root cause —
that its `exists` branch sets `is_primary` and never `status` — is derived from
`0027_update_member.sql` in this repository, and T-400 says plainly that "the function
does X, because the source says so" is unfounded for the fifteen divergent bodies.

```sql
select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname='public' and p.proname='update_member';
```

It changes **no line of code** — 0078 is additive precisely so that nothing depends on
the answer. It changes whether RC-106's third paragraph reads as *confirmed* or as
*the best reading of a body nobody has looked at*.
