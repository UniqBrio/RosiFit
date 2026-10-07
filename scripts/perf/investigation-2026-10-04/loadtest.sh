#!/usr/bin/env bash
# Local harness load test (local Postgres only; production untouched). Usage: loadtest.sh <members>
set -uo pipefail
N=$1; cd /home/user/RosiFit
export PGHOST=/tmp PGPORT=5433 PGUSER=postgres
PG="psql -X -q -v ON_ERROR_STOP=1 -d rosifit"
echo "=== N=$N  $(date -u +%T) reset+migrate"; bash db/harness/reset.sh > /dev/null 2>&1 || { echo reset failed; exit 1; }
echo "=== seed $(date -u +%T)"; $PG -v members=$N -f db/harness/seed_scale.sql > /dev/null 2>&1 || { echo seed failed; exit 1; }
$PG -c "select (select count(*) from members) members, (select count(*) from attendance_records) attendance, (select count(*) from sessions) sessions, (select count(*) from member_aliases) aliases;"
echo "=== timings $(date -u +%T)"
$PG <<SQL
\timing on
\echo --- member_period_metrics_page, one seeded week (2026-08-24..2026-08-30), page 1 (cold then warm)
select count(*) from public.member_period_metrics_page('2026-08-24','2026-08-30',null,1000);
select count(*) from public.member_period_metrics_page('2026-08-24','2026-08-30',null,1000);
\echo --- same, page 2 (after member 1000) and a one-day bucket
select count(*) from public.member_period_metrics_page('2026-08-24','2026-08-30',(select id from members order by id offset 999 limit 1),1000);
select count(*) from public.member_period_metrics_page('2026-08-26','2026-08-26',null,1000);
\echo --- expected_members_for_session (latest completed session) x2
select count(*) from public.expected_members_for_session((select id from sessions where status='completed' order by session_date desc limit 1));
select count(*) from public.expected_members_for_session((select id from sessions where status='completed' order by session_date desc limit 1));
\echo --- current_streak_for one member
select public.current_streak_for((select id from members order by id limit 1));
\echo --- recompute_member_stats() UNSCOPED (what update_member and commit_csv_import call), rolled back
begin; select public.recompute_member_stats(); rollback;
begin; select public.recompute_member_stats(); rollback;
\echo --- recompute_member_stats scoped to 1 member
begin; select public.recompute_member_stats(array[(select id from members order by id limit 1)]); rollback;
SQL
for R in 100 500 1000; do
echo "--- commit_csv_import with R=$R rows (session 2026-09-02, rolled back) $(date -u +%T)"
$PG <<SQL
\timing on
begin;
insert into public.csv_imports (file_name, file_sha256, offering_id, session_date, row_count, status, summary, uploaded_by)
select 'scale.csv', 'beef$R', '0e5d0000-0000-0000-0000-0000000000f1'::uuid, '2026-09-02', $R, 'previewed',
  jsonb_build_object('rows', (select jsonb_agg(jsonb_build_object('row', rn, 'kind', 'noEmail', 'raw_name', alias_display, 'minutes', 45, 'candidates', jsonb_build_array(jsonb_build_object('member_id', member_id))) order by rn)
     from (select row_number() over (order by m.id) rn, al.member_id, al.alias_display from public.member_aliases al join public.members m on m.id=al.member_id where m.id <> '0e5d0000-0000-0000-0000-0000000000aa' order by m.id limit $R) x)),
  '0e5d0000-0000-0000-0000-00000000000a'::uuid returning id as import_id \gset
select public.commit_csv_import(:'import_id'::uuid, '0e5d0000-0000-0000-0000-00000000000a'::uuid, '[]'::jsonb) as result;
select count(*) from attendance_records a join sessions s on s.id=a.session_id where s.session_date='2026-09-02';
rollback;
SQL
done
echo "=== done $(date -u +%T)"
