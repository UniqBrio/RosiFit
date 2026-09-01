-- Test helpers. Loaded into the test database only.
create schema if not exists t;

create or replace function t.ok(p_cond boolean, p_label text) returns void
language plpgsql as $$
begin
  if p_cond then raise notice '  PASS  %', p_label;
  else raise exception 'FAIL  %', p_label; end if;
end $$;

create or replace function t.eq(p_got anyelement, p_want anyelement, p_label text) returns void
language plpgsql as $$
begin
  if p_got is not distinct from p_want then raise notice '  PASS  % (= %)', p_label, p_want;
  else raise exception 'FAIL  %  got % want %', p_label, coalesce(p_got::text,'NULL'), coalesce(p_want::text,'NULL'); end if;
end $$;

-- Asserts that a statement is rejected, and (optionally) rejected for the right
-- reason. A test that only checks "it errored" passes when the error is a typo.
create or replace function t.rejects(p_sql text, p_label text, p_match text default null)
returns void language plpgsql as $$
declare v_msg text;
begin
  begin
    execute p_sql;
  exception when others then
    v_msg := SQLERRM;
    if p_match is not null and position(lower(p_match) in lower(v_msg)) = 0 then
      raise exception 'FAIL  % -- rejected, but for the wrong reason: %', p_label, v_msg;
    end if;
    raise notice '  PASS  % (rejected: %)', p_label, left(v_msg, 60);
    return;
  end;
  raise exception 'FAIL  % -- statement was ACCEPTED and should not have been', p_label;
end $$;

-- The tests switch into authenticated/service_role, so the helpers must be
-- reachable from those roles. Harness-only schema; never shipped.
grant usage on schema t to public;
grant execute on all functions in schema t to public;
