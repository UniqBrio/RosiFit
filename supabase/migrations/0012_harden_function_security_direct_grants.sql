-- 0012 · 0011 follow-up: Supabase grants EXECUTE directly to anon/authenticated
--
-- 0011 revoked from PUBLIC, which is correct for privileges a function picked
-- up from its CREATE-time default (implicit PUBLIC grant). But this project,
-- like every Supabase project, carries a default-privileges rule that grants
-- EXECUTE on new `public` functions DIRECTLY to `anon` and `authenticated` --
-- not via the PUBLIC pseudo-role -- so `revoke ... from public` left those
-- direct grants untouched. get_advisors confirmed it: apply_holiday and its
-- siblings were still anon-callable after 0011. This migration revokes the
-- direct grants explicitly, which is the only thing that actually removes
-- them.
--
-- Same split as 0011: mutating engine internals go to service_role only;
-- read-only engine functions keep authenticated (staff-facing screens call
-- them directly) but lose anon.

revoke execute on function public.apply_holiday(uuid)                    from anon, authenticated;
revoke execute on function public.remove_holiday(uuid)                   from anon, authenticated;
revoke execute on function public.generate_sessions(uuid, date, date)    from anon, authenticated;
revoke execute on function public.recompute_member_stats(uuid[])         from anon, authenticated;
revoke execute on function public.refresh_session_counts(uuid)           from anon, authenticated;
revoke execute on function public.audit_row_change()                    from anon, authenticated;

revoke execute on function public.member_period_metrics(date, date, uuid, uuid, uuid, uuid) from anon;
revoke execute on function public.current_streak_for(uuid)                                  from anon;
revoke execute on function public.effective_follow_up_config(uuid)                          from anon;
revoke execute on function public.expected_members_for_session(uuid)                        from anon;
revoke execute on function public.follow_up_candidates(date, date, uuid, uuid)              from anon;
revoke execute on function public.preview_holiday(date, date, uuid)                         from anon;
revoke execute on function public.audit_log(text, text, text, jsonb, jsonb)                 from anon;
