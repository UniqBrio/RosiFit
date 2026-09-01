# SUPABASE REVIEW — Phase 3 of website_flow.md (code-first, MCP verify)
<!-- Mandatory whenever the request touches lib/supabase.ts, app/api/**,
     supabase/migrations/**, supabase/functions/**, supabase_setup.sql,
     or any form/page that writes or reads Supabase data
     (demo, audit, feedback, newsletter, otp, checkout/payments, join,
     delete-account, daily-counts, demo-bookings-count). -->

## OPERATING RULES
1. CODE-FIRST: every schema change is a NEW timestamped file in
   supabase/migrations/. Never edit an applied migration; never run ad-hoc
   SQL against prod. Edge Function changes live in supabase/functions/.
2. MCP = READ-ONLY VERIFICATION in this pipeline: allowed tools are
   list_tables, list_migrations, list_extensions, get_advisors, get_logs,
   get_project_url, get_publishable_keys, generate_typescript_types,
   search_docs. apply_migration / execute_sql / deploy_edge_function are
   NOT used against prod from this flow — release happens via Phase 6 with
   branch-first application.
3. ENVIRONMENT AWARENESS (skill: supabase-environment-awareness): state
   explicitly which project/branch every command targets before running it.
   Testing writes go to a branch or test project only.

## REVIEW CHECKLIST
### A. Schema & migration (skills: supabase-safety-reviewer,
migration-planning-expert, schema-impact-analyzer, database-normalization-expert)
- [ ] Migration is additive/backward-compatible with currently deployed code
      (old code must survive with new schema during rollout).
- [ ] Defaults + NOT NULL handled for existing rows; no table rewrite locks
      on large tables.
- [ ] Down-path or forward-fix documented for rollback (Phase 6).
- [ ] MCP list_tables/list_migrations compared to repo migrations — drift
      between repo and live schema is a STOP-and-report finding.

### B. Security / RLS (skills: rls-risk-auditor, security-review-expert,
multi-tenant-data-isolation-expert)
- [ ] RLS enabled on every table the website touches; anon role can do
      EXACTLY what the page needs and nothing more (e.g. INSERT-only on
      demo_bookings/newsletter, no SELECT of other visitors' rows).
- [ ] Service-role key used ONLY in server code (app/api routes, Edge
      Functions); grep client bundle to confirm it never ships.
- [ ] Rate-limit / abuse thinking for public endpoints (otp, check-email,
      newsletter): duplicate + flood behavior defined.
- [ ] PII minimalism: collect only fields the request justifies; deletion
      path (delete-account) still covers any new PII.
- [ ] MCP get_advisors (security lens): zero NEW advisories vs baseline.

### C. API contract (skills: api-design-expert, typescript-supabase-patterns,
error-handling-expert)
- [ ] Request/response types explicit; generate_typescript_types re-run if
      schema changed, types committed.
- [ ] Every route returns: 200/201 success, 400 validation, 409 duplicate
      (where meaningful), 500 with safe generic message — never raw Supabase
      error text to the visitor.
- [ ] Timeouts + failure UX: the page shows a helpful state when Supabase is
      unreachable (ties to Q10 / error-state-specialist).

### D. Performance (skills: supabase-performance-expert)
- [ ] Indexes for every new filter/order column used by the site.
- [ ] Counts (daily-counts, demo-bookings-count) cheap — no full scans on
      hot paths; consider cached/aggregated values.
- [ ] MCP get_advisors (performance lens): zero NEW advisories.

## OUTPUT
SUPABASE VERDICT block: table of A–D with pass/fail + evidence
(advisor output pasted, grep results, type-gen diff). Any fail loops back
to Phase 2 planning. Owner signs GATE 3.
