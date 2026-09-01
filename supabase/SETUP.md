# Connecting RosiFit to Supabase

> ## Current state — project `lhpzhkzbnquwjljmbylo` ("Rosifit")
>
> Already done, verified against the live project:
>
> - **Schema applied**: migrations `0001`–`0014`. 30 tables in `public`, every
>   one with RLS, `app_settings` singleton seeded, `bootstrap_completed` still
>   `false` (the super admin has not registered yet — that is step 5 below).
> - **Edge Functions deployed**: `auth-login`, `auth-bootstrap`,
>   `recovery-check` (public, `verify_jwt=false` — nobody has a session when
>   they call them), plus `pin-issue`, `pin-reset`, `csv-import`,
>   `send-followups` (JWT required).
> - **Advisors**: run and acted on. See migrations `0011`–`0013`.
>
> **Two things still need a human, because neither can be done from a Claude
> session** (there is no Supabase CLI or access token there, and no MCP tool
> for secrets or for Vercel):
>
> 1. **`PIN_PEPPER` is not set.** Until it is, every auth function returns
>    500 — `auth-login`, `auth-bootstrap`, `recovery-check`, `pin-issue` and
>    `pin-reset` all derive from it and refuse to run without it. Nothing else
>    is blocked: the CSV import and the send do not touch it. See §4.
> 2. **Vercel environment variables**: set the same two `EXPO_PUBLIC_` values
>    from `.env` on the `rosi-fit` project. See §5.
>
> Until (1) is done the app runs, signs nobody in, and says so.

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
