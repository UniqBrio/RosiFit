# Connecting RosiFit to Supabase

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

Set these as Edge Function secrets once the functions exist:

```bash
supabase secrets set PIN_PEPPER='<32+ random bytes, base64>'
supabase secrets set AWS_ACCESS_KEY_ID='...' AWS_SECRET_ACCESS_KEY='...' \
                     AWS_REGION='ap-south-1' EMAIL_PROVIDER='ses'
```

`SUPABASE_SERVICE_ROLE_KEY` is injected into Edge Functions automatically —
you do not set it, and it must not appear in `.env`, in Vercel, or anywhere a
client can read.

## Which account?

The Supabase connector in a Claude session authenticates to **one** account at
a time. If RosiFit lives in a different account from your other projects,
switch the connector to that account (claude.ai → Settings → Connectors →
Supabase) when you want Claude to operate on it, or run the steps above
yourself — the SQL needs no connector.
