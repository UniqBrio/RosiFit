# Connecting RosiFit to Supabase

> ## Current state — project `lhpzhkzbnquwjljmbylo` ("Rosifit")
>
> **Verified against the live project on 04-Sep-2026** by querying it, not by
> reading this file. The previous version of this block was stale in three
> ways and is corrected below — see the note at the end.
>
> - **Schema applied**: migrations `0001`–`0024`, **`0026`** and **`0027`** (both applied
>   04-Sep-2026). **`0025` is not** — see below. The ledger
>   (`supabase_migrations.schema_migrations`) carries 23 rows: `0001`–`0015`,
>   `0019`–`0024`, `0026` and `0027`. **`0016`, `0017` and `0018` are applied but have no
>   ledger row** — they were run through the SQL editor rather than as
>   migrations. Their objects are all present and were verified individually
>   (`create_member`, `holidays_apply_effects` + its three triggers + the
>   `holidays_delete` policy + the DELETE grant, `set_offering_schedule`), so
>   the schema is complete; only the ledger is short. Do not re-run them.
> - **Edge Functions deployed**: all seven, 04-Sep-2026.
>   `auth-login`, `auth-bootstrap`, `recovery-check` at **v5**, public
>   (`verify_jwt=false` — nobody has a session when they call them);
>   `pin-issue` and `pin-reset` at **v5**, `csv-import` at **v6** and
>   `send-followups` at **v5**, all JWT-required. The last two were
>   redeployed for `0026` — see below.
> - **`bootstrap_completed` is `true`.** The academy admin has registered.
>   There are 3 `app_users` (1 super admin), 3 `auth.users` and 2 recovery
>   answers on file.
> - **`PIN_PEPPER` is set.** It cannot be read back — Supabase has no
>   read-back path for a secret — but registration and PIN issue both
>   completed, and neither is possible without it. That is the evidence.
> - **`0025` IS WRITTEN AND NOT APPLIED.** It is the one migration in the tree
>   that production does not have. It closes the EXECUTE grant `CREATE
>   FUNCTION` hands to `PUBLIC` on eight trigger functions, which the security
>   advisor reports as callable by `anon` over `/rest/v1/rpc/`. Held for an
>   explicit go-ahead, per the rule in `CLAUDE.md`. Measured exposure, so the
>   decision is taken on facts rather than on the advisor's wording: calling
>   one directly today answers `trigger functions can only be called as
>   triggers`, not with a leak — after `0025` it answers `permission denied`,
>   which is the correct answer to the wrong question. Worth closing; not an
>   emergency.
> - **`0026` IS APPLIED** (04-Sep-2026), and it is the one migration in this
>   project that reached production **without a harness rehearsal** — no
>   machine to hand had PostgreSQL 16, and it was applied on an explicit
>   go-ahead after the SQL was reviewed and the two data questions below were
>   measured against production rather than assumed. Recorded that way so
>   nobody later reads it as a rehearsed migration. It retires the member code: `members.member_code`
>   becomes nullable, `members_code_live` is dropped, `create_member` and
>   `commit_csv_import` are re-issued without the `'RF-' || nextval(...)`
>   minting, and every grant on `member_code_seq` is revoked. Nothing in it
>   rewrites a row — dropping `NOT NULL` and dropping an index are
>   catalogue-only — so it is safe over the data production already holds.
>   **Measured before applying, on the live project:** 9 members, all 9
>   carrying a code, all 9 still carrying it afterwards; 1 stored template,
>   **0 using `{{member_code}}`** (so removing the variable from the sender
>   cannot make anything mail literal token text); 0 emails ever sent.
>   **Verified after applying:** the column is nullable, `members_code_live`
>   is gone, no app role holds USAGE on `member_code_seq`, and neither
>   `create_member` nor `commit_csv_import` calls `nextval` or names the
>   sequence. Advisors re-run: no new finding.
>   **Still owed:** `bash db/harness/test.sh`, on CI or a machine with
>   PostgreSQL 16. `supabase/tests/20_no_member_code.sql` has never run, so
>   the spec that pins this behaviour is unexecuted even though the behaviour
>   itself is verified in production.
> - **The two Edge Functions for `0026` ARE deployed** (04-Sep-2026), and the
>   live source was read back to confirm it rather than trusting the deploy
>   output. `csv-import` **v6** selects `id, full_name, name_normalized` with
>   no `member_code`, reads `member_id, email` from `member_emails`, and
>   returns `primary_email` on every candidate. `send-followups` **v5**
>   selects `id, full_name` and its variable map has no `member_code` key.
>   `verify_jwt=true` survived both deploys, and the other five functions were
>   untouched.
> - **`0027` IS APPLIED** (04-Sep-2026). It adds `update_member`, closing the
>   debt `0016` recorded when it shipped the CREATE path only — Edit Member
>   could not save at all until now.
>   **REHEARSED, and not on the harness.** No machine to hand has PostgreSQL
>   16 (ADR 005), and this is ~250 lines of plpgsql moving enrolment history
>   under a GiST exclusion — too much to apply on a reading. So it was
>   rehearsed against PRODUCTION inside a `DO` block that raises at the end,
>   which rolls back every row it touched. 20 assertions, 19 passing; the
>   twentieth expected 4 audit rows from 4 calls when one of the four was a
>   deliberate refusal that correctly wrote none. Verified afterwards that
>   nothing persisted: 0 probe rows, and enrolments, schedules, aliases,
>   emails, attendance and audit all back at their prior counts.
>   See ADR 007 for why this counts as a rehearsal and where it is weaker
>   than the harness.
> - **Advisors**: run and acted on. See `0011`–`0013`, `0015`, and the open
>   items below.
>
> **What still needs a human:**
>
> 1. **AWS SES secrets** — `EMAIL_PROVIDER=ses`, `AWS_REGION`,
>    `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SES_FROM_ADDRESS`. Only
>    `send-followups` needs them. **`EMAIL_PROVIDER=ses` is the switch and is
>    easy to miss**: without it, or with any one of the four AWS values
>    missing, `getEmailProvider()` falls back to the dev provider, and every
>    message is recorded `status='sent'` with `provider='dev'` while nothing
>    leaves the building. A send that looks successful and sent nothing is
>    worse than one that fails.
> 2. **Vercel environment variables** — the two `EXPO_PUBLIC_` values on the
>    `rosi-fit` project. These appear to be set already (the deployed app
>    reaches Supabase and has written real rows), but that is inference from
>    behaviour, not a reading of the Vercel config. See §5.
>
> **Why the previous block was wrong**, recorded so the next reader trusts the
> project over the file: it claimed `0001`–`0014` when `0015` was also applied;
> it claimed `bootstrap_completed` was `false` when the admin had registered;
> and it said `PIN_PEPPER` was unset when it had been set. `apply_0016_0018.sql`
> disagreed with it too, claiming `0001`–`0015`. Two hand-written claims, both
> stale, disagreeing with each other — which is the argument for querying
> `list_migrations` and probing for objects before believing any of it.

RosiFit needs its **own** Supabase project. Do not put it in a project that
already holds another product: the schema assumes it owns `public`, and
`app_settings` and `one_super_admin` are singletons that will collide.

## 1. Create the project

Supabase dashboard → New project.

| Setting | Value |
|---|---|
| Name | `rosifit` |
| Region | `ap-south-1` (Mumbai) — closest to the academies, and the same region as the SES sender |
| Postgres | 15 or later |

Save the database password somewhere safe. You need it for step 2 and it is
shown only once.

## 2. Apply the schema

Either route works; the migrations are plain SQL and run in filename order.

**Supabase CLI (preferred — records migration history):**
```bash
npm i -g supabase
supabase link --project-ref <your-project-ref>
supabase db push
```

**Or psql directly:**
```bash
export DATABASE_URL='postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres'
for f in supabase/migrations/*.sql; do
  echo "$f"; psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f" || break
done
```

**Or the dashboard SQL editor:** paste each file from `supabase/migrations/`
in numeric order, `0001` through `0009`. Order matters — later files depend on
helpers and tables the earlier ones create.

### Verify it worked
```sql
select count(*) from information_schema.tables
 where table_schema = 'public';                    -- expect 24

select tablename from pg_tables
 where schemaname = 'public' and not rowsecurity;  -- expect ZERO rows
```
The second query is the one that matters: a table without RLS is readable by
anyone holding the anon key.

## 3. Point the app at it

Dashboard → Project Settings → API. Copy the **Project URL** and the
**anon / publishable** key.

```bash
cp .env.example .env
# fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
npm run web
```

Take the **anon** key, not `service_role`. The service-role key bypasses RLS
completely; in a mobile bundle it is equivalent to publishing the database.

## 4. Secrets that never touch this repo

```bash
supabase link --project-ref lhpzhkzbnquwjljmbylo

# REQUIRED before anyone can sign in or register.
supabase secrets set PIN_PEPPER="$(openssl rand -base64 32)"

# Optional: real email. Without these, send-followups uses the dev provider,
# which writes each message to the function log and reports it as sent.
supabase secrets set EMAIL_PROVIDER='ses' AWS_REGION='ap-south-1' \
                     AWS_ACCESS_KEY_ID='...' AWS_SECRET_ACCESS_KEY='...' \
                     SES_FROM_ADDRESS='no-reply@your-verified-domain'
```

`SUPABASE_SERVICE_ROLE_KEY` is injected into Edge Functions automatically —
you do not set it, and it must not appear in `.env`, in Vercel, or anywhere a
client can read.

**`PIN_PEPPER` is set once and never rotated casually.** Every PIN is a value
derived from it, so changing it invalidates every existing PIN at once, and
every staff member would need a new one issued from Staff & access. Generate
it, set it, and keep the copy wherever the academy keeps its other secrets.

## 5. Vercel

The web app needs the same two public values the local `.env` has, and
nothing else:

```
EXPO_PUBLIC_SUPABASE_URL=https://lhpzhkzbnquwjljmbylo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<the anon key from Project Settings → API>
```

Set them on the `rosi-fit` project (Settings → Environment Variables) for
Production and Preview, then redeploy. No secret from §4 belongs here — a
Vercel build variable prefixed `EXPO_PUBLIC_` is compiled into the bundle
every visitor downloads.

> **If a value changes, export with a cleared cache.** Metro caches the
> transformed module that inlined the old value, so `npm run export` alone
> can silently keep shipping the previous URL. Use
> `npx expo export --platform web --clear`.

## 6. First run

1. Open the app. With no super admin registered it offers **Super admin
   registration**.
2. Register: name, mobile, two security questions, then the PIN. That one
   call creates the account, stores the hashed answers and flips
   `bootstrap_completed` — which can never be flipped back, so the public
   registration endpoint closes behind her.
3. Add a branch, a course, and the course at that branch (the offering). The
   offering's weekdays are what attendance is counted from — nothing on the
   course is.
4. Add staff from **Staff & access**. Saving the record grants nothing; the
   PIN is a separate, named step, and it is shown exactly once.

## Which account?

The Supabase connector in a Claude session authenticates to **one** account at
a time. If RosiFit lives in a different account from your other projects,
switch the connector to that account (claude.ai → Settings → Connectors →
Supabase) when you want Claude to operate on it, or run the steps above
yourself — the SQL needs no connector.
