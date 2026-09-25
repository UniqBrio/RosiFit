# 0078 — `reinstate_member_email` · APPLIED TO PRODUCTION

> **Status: APPLIED, 22-Sep-2026 19:57 UTC.** Project `lhpzhkzbnquwjljmbylo` ("Rosifit"),
> ap-southeast-1, Postgres 17.6.1.166, `ACTIVE_HEALTHY`. Applied through the Supabase MCP
> connector's `apply_migration`, which recorded the ledger row itself.

Ledger row: **`20260922195737` / `reinstate_member_email`** — a timestamp version, not the
literal `0078`, which is what SETUP.md requires (two local files sharing a number has bitten
this project before). `supabase db push` was NOT used and must not be: SETUP.md:75 records that
the local ledger has no overlap with the remote one, so a push would try to replay from `0001`.

## Verified on production AFTER applying

| Check | Result |
|---|---|
| function exists | **1** |
| `has_function_privilege('anon', …, 'execute')` | **false** |
| `has_function_privilege('authenticated', …, 'execute')` | **true** |
| `prosecdef` (SECURITY DEFINER) | **true** |
| deployed body refuses `'unsubscribed'` | **true** |
| deployed body refuses `'complained'` | **true** |
| deployed body clears only `<> 'bounced'` | **true** |
| deployed body writes the audit row | **true** |
| `update_member` still present, bytes | **1 / 9958 — UNCHANGED by this apply** |

The `anon` line is the one that has gone wrong twice before (RC-042, RC-052). It is false.

### Live gate test, run without touching a member's record

`reinstate_member_email` was called on production twice through a `pg_temp` probe: once with a
uuid matching no row at all, and once with a REAL unsubscribed row id. Both returned:

    REFUSED: only a signed-in, active user can reinstate an address [42501]

The MCP connection is not a signed-in app user, so the auth gate fires first and the status
checks are never reached — which is why the real row was safe to name. Confirmed afterwards:
that row is still `unsubscribed`, and the live counts are unchanged at 6 bounced / 6
unsubscribed. `audit_logs` holds **0** `member_email.reinstated` rows, as it should — nothing
has been reinstated yet.

The status refusals themselves are proven by execution against a real Postgres in
`supabase/tests/57_reinstate_member_email.sql` (16/16 on a from-scratch replay of every
migration), against a body identical to the one deployed.

## What production actually holds

    unknown       1223
    valid            9
    unsubscribed     6
    bounced          6
    complained       0

**Twelve live members** were showing "No usable email" over an address that exists. Six of them
(the bounced) become fixable from the Edit form the moment the app deploys. The other six
unsubscribed, and are correctly not fixable — the app will now say so instead of pretending
there is no address.

## Rollback

    drop function public.reinstate_member_email(uuid);
    delete from supabase_migrations.schema_migrations where version = '20260922195737';

Nothing else to undo: no data was migrated and no other object was touched.

## The outstanding read — DONE, and it confirms the diagnosis

`update_member`'s production body was read. Its email loop is exactly what RC-106 described:

```sql
if exists (select 1 from public.member_emails
            where member_id = p_member_id and deleted_at is null
              and lower(email::text) = v_email) then
  update public.member_emails set is_primary = v_first, updated_at = now()
   where member_id = p_member_id and deleted_at is null
     and lower(email::text) = v_email;        -- status is NOT in this SET
else
  insert into public.member_emails (member_id, email, is_primary, status, source, created_by)
  values (p_member_id, v_email, v_first, 'unknown', 'member_form', v_actor);
end if;
```

Re-entering an address that is already live sets `is_primary` and `updated_at` and nothing else.
**Piece 3 of RC-106 is confirmed against production rather than derived from source**, and the
T-400 caveat on it is discharged.

The body remains divergent from the repo — **9,958 bytes live against 11,213 in the harness
replay** (T-120 measured 9,625 on 18-Sep, so it has also moved since that reading). That
divergence is untouched by this migration and is still T-120/T-400's to resolve.
