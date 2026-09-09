# Permission Matrix

> **A feature with no row here ships owner-only by accident — and accident is not a default.**
>
> Defaults are business decisions with a stated reason, never developer assumptions.
> Rows are append/supersede-only; never deleted.

> **Backfilled at framework adoption, 02-Sep-2026,** from the RLS policies in
> `supabase/migrations/0003`–`0014` and `STAFF_ACCESS` in `src/data/mock.ts`. Read from the
> migration text, not from memory. Marks: ✅ verified against the migration text · ◻ stated but
> not yet verified against the running project.

---

## The five questions — answered in the plan, before build

1. Does this introduce a **new capability**? Should it appear in the permissions UI? If not, why
   (one line)?
2. Does an **existing permission change meaning**? Update its row in the same change.
3. **Which roles** get access, and the **business reason** for each?
4. **Default enabled or default disabled**, explicitly, **per role**?
5. **Owner-configurable**, or deliberately hidden from the permissions UI? If hidden, document why.

A change with no permission answer is not plannable, let alone shippable.

---

## The roles RosiFit actually has

There are **two**, not four. `app_users.kind` is `check (kind in ('super_admin','staff'))`
(`0003_users_auth.sql`), and a partial unique index `one_super_admin` allows **exactly one**
undeleted `super_admin` in the project.

| Role | In the product | In the database |
|---|---|---|
| **Academy admin** | the single owner of the academy | `kind = 'super_admin'` |
| **Staff** | coaches and front desk | `kind = 'staff'` |

`ROLE_LABELS` in `src/data/mock.ts` — *Academy admin · Coach · Front desk* — are **display labels
on a staff row, not roles.** Coach and Front desk carry identical database rights. Worth stating
plainly, because the UI implies three tiers and the database has two.

The framework template's *Owner / Admin / Member / Viewer* do not exist here. Rows below use
RosiFit's real roles; ➖ marks a role that cannot reach the capability at all.

Every check runs through three SQL predicates (`0003`, `0002`):
`is_active_app_user()` · `is_super_admin()` · `is_subscription_writable()`.
**Every write is additionally gated on `is_subscription_writable()`** — an expired subscription
makes the whole product read-only rather than partially broken.

---

## Matrix

| Capability (policy) | Academy admin | Staff | Configurable? | Reason | Decided |
|---|---|---|---|---|---|
| Read academy settings (`app_settings_read`) | ✅ on | ✅ on | 🔒 no | Every screen needs the academy's own name and week start. | 02-Sep-2026 |
| Change academy settings (`app_settings_write`) | ✅ on | ➖ | 🔒 no | Owner-only **by absence** — the policy names `is_super_admin()`, so staff have no such action at all, not a hidden button. | 02-Sep-2026 |
| Read subscription (`app_subscription_read`) | ✅ on | ✅ on | 🔒 no | Staff must be able to see *why* the product went read-only. | 02-Sep-2026 |
| Read own account (`app_users_read`) | ✅ all rows | ✅ own row only | 🔒 no | `is_super_admin() or auth_user_id = auth.uid()`. Staff cannot enumerate colleagues. | 02-Sep-2026 |
| Update own account (`app_users_self_update`) | ✅ on | ✅ own row only | 🔒 no | A row-level policy that allows a row allows **every column on it**, so `guard_app_users()` blocks self-elevation of `kind` and `is_active`. Without that trigger, "edit your profile" is "make yourself the admin". | 02-Sep-2026 |
| Read security questions (`security_questions_read`) | ✅ on | ➖ | 🔒 no | Recovery is the admin's own account-recovery path. | 02-Sep-2026 |
| Read mobile-number changes (`mobile_changes_read`) | ✅ all | ✅ own only | 🔒 no | An audit trail of identity changes; staff see their own. | 02-Sep-2026 |
| Read the audit log (`audit_logs_read`) | ✅ on | ➖ | 🔒 no | `is_super_admin()`. The log records staff actions, so staff readability would defeat it. | 02-Sep-2026 |
| Read organisation — branches, courses, offerings, schedules | ✅ on | ✅ on | 🔒 no | The structure every screen is drawn from. | 02-Sep-2026 |
| Write BRANCHES and holidays | ✅ on | ➖ | 🔒 no | A branch is the shape of the business, and it is the one half of "write organisation" the 07-Sep-2026 grant did not move — the owner named courses, members, imports and attendance, and nothing else. | 02-Sep-2026 |
| **Write COURSES — `save_course` (0038), `delete_course` (0038), `set_offering_schedule` (0038), and the `courses` / `course_offerings` insert-update policies** | ✅ on | ✅ on | 🔒 no | **AMENDED 07-Sep-2026** from a row that read *"Write organisation · Academy admin ✅ on · Staff ➖ · Branches and courses are the shape of the business; a coach changing them changes every figure"* (02-Sep-2026). Asked why staff were restricted, the repo owner answered *"Allow crud we are just hiding view of few fields such as overview and staff access and audit log"* (`requests/2026-09-07-staff-write-access.md`), and chose explicitly to move the whole course path rather than the dialog alone. The boundary is now the ACCOUNT and its record — app_users, audit_logs, PIN reset, settings, follow-up rules, templates — not the register. Three things did not move with it: `is_subscription_writable()` still gates every one of these (a billing gate, not a role gate); `offering_schedules` still has no direct write policy, so `set_offering_schedule` remains the only path in; and the chrome still withholds Overview, Staff & access and the Audit log from staff (`src/data/access.ts`, 06-Sep-2026). This also closed a live defect: Add Course and Edit Course were OFFERED to staff by `app/(tabs)/courses.tsx` and refused by `save_course`, so a staff member could fill the form and be refused on save (RC-008's shape, one role over). Asserted in `supabase/tests/16_save_course.sql` and `14_delete_course.sql`. **CORRECTED 08-Sep-2026 — this row described the repo, not the running academy.** `0038_staff_write_access` was never applied to the live project: its ledger has no such row (the `0038_repoint_stale_course_senders` entry is a different file that collided on the number) and `save_course`, `delete_course` and `set_offering_schedule` all still called `is_super_admin()` there. The date this became true in production is `0050_staff_are_not_restricted`, not 0038. | 07-Sep-2026 · delivered 08-Sep-2026 |
| Bulk import members (`bulk_import_members`, 0038) | ✅ on | ✅ on | 🔒 no | **AMENDED 07-Sep-2026** from *"Owner-only, as the reference (UniqBrio Bulk Student Import v1) has it: adding one member is open to staff, but a file of forty is the shape of the register. Enforced in the RPC (`is_super_admin()`), not only by hiding the buttons — the deep route `/member/import` shows staff an honest no-access state, and the RPC refuses them if they reach it anyway."* (04-Sep-2026, staff ➖). The owner overruled it: staff run the register, so staff fill it (`requests/2026-09-07-staff-write-access.md`). The reasoning that survives is that every row still goes through `create_member` (0016), which has been open to staff since it was written — so the file grants nothing a hundred single adds did not already grant, it only makes them one act. The no-access state on `/member/import` is gone with the refusal it explained. **`member_import_runs` is unchanged** and still readable by the academy admin only, like the audit log, with no insert policy at all — a staff member imports and does not read back the history of who imported what. Asserted in `supabase/tests/22_bulk_import_members.sql`. **CORRECTED 08-Sep-2026.** The owner was shown *"Only the academy admin can bulk import members. Nothing has been saved."* on a staff account four days after this row said staff could. The row was not wrong about the decision and the client never asked the role — 0038 simply never reached the live project, where `bulk_import_members` still raised 0029's refusal. `0050_staff_are_not_restricted` is what delivered it, and `supabase/tests/39_staff_are_not_restricted.sql` asserts a staff account actually importing. | 07-Sep-2026 · delivered 08-Sep-2026 |
| Read members, emails, aliases, enrolments | ✅ on | ✅ on | 🔒 no | The member list is the daily working surface for both roles. | 02-Sep-2026 |
| Write members, emails, aliases, enrolments | ✅ on | ✅ on | 🔒 no | `is_active_app_user()` — front desk correcting a name or an address is the ordinary case, and routing it through the admin would mean it never happens. | 02-Sep-2026 |
| Delete a member alias (`member_aliases_delete`) | ✅ on | ✅ on | 🔒 no | The only `for delete` policy in the schema. An alias is a correction, and a wrong correction must be removable. | 02-Sep-2026 |
| **Delete a member (`delete_member`, 0038)** | ✅ on | ✅ on | 🔒 no | **NEW capability, 07-Sep-2026.** It was not a restricted one before — it did not exist for anybody: no `delete_member` in migrations 0001–0037, and the roster's bin icon answered `flash('Removing X needs a confirmation')`. Built on the owner's *"Allow crud"* (`requests/2026-09-07-staff-write-access.md`), at the same permission as every other member write (`is_active_app_user()`, 0006), because writing members was never the owner's alone and deleting one follows it. **HARD SINCE 0051, 08-Sep-2026.** The repo owner asked for it in the same terms as the course deletion that morning — *"on deleting a student delete that record entirely from database"* (`requests/2026-09-08-hard-delete-member.md`) — and `0051_hard_delete_member.sql` removes her record outright: her sent mail, attendance records, expected-slots, enrolments, addresses, aliases, schedules and stats. **The permission boundary is untouched** — `is_active_app_user()` AND `is_subscription_writable()`, exactly 0044's — and the new `purge_member` that does the row removal carries NO caller guard and is granted to `service_role` alone, reachable only through `delete_member` as its definer (`supabase/tests/40_hard_delete_member.sql` asserts a signed-in account is refused it). The sessions she attended survive, with their figures changed by one person; `0052` applies the same rule once to the 7 members soft-deleted under the old one. *Was, until 0051:* **It is a SOFT delete and could not be anything else:** `attendance_records.member_id` references `members(id)` with no ON DELETE, so a hard delete is refused by the foreign key — her attendance is the academy's record of what happened, not her property. It flags her row and her addresses, frees her email for whoever holds it next, hard-deletes her lookup ALIASES so a later upload of the same name cannot resolve to a deleted member, and ENDS her active enrolment — which is the half that actually stops her being expected, since `expected_members_for_session` (0007) reads enrolments and never looks at `members.deleted_at`. Idempotent. Not to be confused with `set_member_status('inactive')` (0031), which keeps her ON the register. Asserted in `supabase/tests/30_delete_member.sql`. | 07-Sep-2026 |
| Read sessions and expectations | ✅ on | ✅ on | 🔒 no | The calendar both roles work from. | 02-Sep-2026 |
| Update session status (`sessions_status_update`) | ✅ on | ✅ on | 🔒 no | Marking a session held or cancelled is a coach's job. Status only — a session cannot be created or deleted from the client. | 02-Sep-2026 |
| Read attendance | ✅ on | ✅ on | 🔒 no | Every figure on every screen derives from it. | 02-Sep-2026 |
| Write attendance **through the tables** | ➖ | ➖ | 🔒 no | **Nobody, through the client, and this is unchanged by 0035.** `authenticated` holds no write grant on the engine tables; attendance arrives only via server-side code running as `service_role`. A stolen anon key cannot forge attendance. **AMENDED 07-Sep-2026** from a row that read as "attendance cannot be written from the client at all": it can, since 0035, but only through the function in the row below — the GRANT is what this row is about and it has not moved. | 02-Sep-2026 |
| **Mark one member's attendance (`set_attendance`, 0035)** | ✅ on | ✅ on | 🔒 no | The register is front-desk work — the same reasoning that already gives both roles `sessions_status_update` ("marking a session held or cancelled is a coach's job"). **AMENDED 07-Sep-2026 — the app no longer calls it (ADR-030).** The three chips on a course roster card WERE the control; the requester asked for them to be a status rather than a control, so `set_attendance` now has no caller anywhere in the client (TD-040). The row stays because the OBJECT stays: nothing about the grants below has moved, and this is what they permit if a caller ever returns. `security definer`, revoked from `public` and `anon`, and it re-checks `is_active_app_user()` and `is_subscription_writable()` itself, so a disabled account and an expired subscription both close it — the CP-005 posture, applied to an RPC. It cannot forge what the client claims: `expected` is derived server-side from `expected_members_for_session()`, the offering comes from her enrolment, and it can only ever set `present`/`absent`/`extra` on ONE member on ONE date. It cannot delete a record. Asserted in `supabase/tests/27_set_attendance.sql`. **Not live yet:** 0035 is not applied to production (TD-033). | 07-Sep-2026 |
| Read / create a CSV import (`csv_imports_*`) | ✅ on | ✅ on | 🔒 no | Uploading the register is front-desk work. The **commit** is server-side (`0014`). **AMENDED 07-Sep-2026 — a re-upload REPLACES a day's register (0037), and that is the same permission, deliberately.** Whoever may upload may override: the same person doing the same job, correcting the file she uploaded an hour ago, and gating the correction behind the owner would leave her with a register she knows is wrong and no way to fix it. What protects it is not a role but a question — the upload names the file already there and waits for **Confirm override** — and a record: `csv_import.overrode_register` in the audit log with what it moved. A mark somebody made by hand on the roster (`set_attendance`, 0035) is never reverted by an import, whoever runs it. Not settled by the requester (Q8 of `requests/2026-09-07-upload-override-confirm.md`); if overriding should be owner-only, that is a role gate in `csv-import`, not a hidden button. | 07-Sep-2026 |
| Read follow-up rules (`fuc_read`, `cfuc_read`) | ✅ on | ✅ on | 🔒 no | Staff must see which rule flagged a member. | 02-Sep-2026 |
| Change follow-up rules (`fuc_write`, `cfuc_*`) | ✅ on | ➖ | 🔒 no | The rule decides who gets contacted; it is an academy policy, not a per-coach setting. | 02-Sep-2026 |
| Read email templates (`tmpl_read`) | ✅ on | ✅ on | 🔒 no | The send flow shows what will go out. | 02-Sep-2026 |
| Change email templates | ✅ on | ➖ | 🔒 no | Template text is the academy's voice to its members. | 02-Sep-2026 |
| Send follow-ups | ✅ on | ◻ | 🔒 no | Runs as `service_role` in `send-followups`, so RLS does not gate it — `requireCaller()` does. **◻ Which `kind` that function requires was not verified against deployed code in this pass.** | 02-Sep-2026 |
| Issue / reset a staff PIN (`pin-issue`, `pin-reset`) | ✅ on | ➖ | 🔒 no | `requireSuperAdmin()` — "Only the academy admin can do this." | 02-Sep-2026 |
| Ask whether a number is registered (`auth-lookup`) | 🌐 **anyone, signed in or not** | 🌐 **anyone, signed in or not** | 🔒 no | **The one deliberately unauthenticated capability that reveals something about accounts.** Continue on the sign-in screen must choose between the PIN screen and registration before anybody has proved anything, so the endpoint is public (`verify_jwt=false`) and answers one boolean for any number asked. It is therefore a staff-enumeration oracle, accepted knowingly — ADR 016 (`docs/decisions/008`), cost recorded as TD-017. It returns **no name, no `kind`, no `is_active`, no `pin_set_at`, no `bootstrap_completed`**, and nothing that narrows a PIN guess; `auth-login`'s five-attempt lockout is untouched. Runs as `service_role`, so RLS does not gate it and there is no caller to check — which is exactly why the answer is one bit. | 05-Sep-2026 |
| Read own preferences (`0010`) | ✅ on | ✅ on | 🔒 no | Theme and accent are personal. | 02-Sep-2026 |
| Read recovery answers / rate limits | ➖ | ➖ | 🔒 no | **No policy exists on these tables at all**, so RLS denies everyone. Only `service_role` reaches them. Guardrail 4: PINs and recovery answers are never stored readable. | 02-Sep-2026 |

| Report a bounce or complaint (`ses-feedback`) | 🌐 **AWS SNS only** | 🌐 **AWS SNS only** | 🔒 no | **Unauthenticated by necessity, not by choice.** SNS cannot send a Supabase auth header, so the function is `verify_jwt=false` and does its own door check: a shared secret in `?s=` compared in constant time, AND `TopicArn` equal to `SES_SNS_TOPIC_ARN`. Both, because the ARN is printed in every AWS console and a secret can leak into a log — either alone is one stolen value away from a forged suppression, which silently stops a member hearing from the academy. It runs as `service_role` and writes only `member_emails.status`, `email_messages.status` and `email_events`. Missing either secret refuses everything rather than accepting everything. No human is in this path: a bounce that waits to be read is a bounce that gets sent to again. | 09-Sep-2026 |
| Unsubscribe from follow-ups (`unsubscribe`) | 🌐 **the member holding the link** | 🌐 **the member holding the link** | 🔒 no | **The first capability in RosiFit exercised by somebody with no account at all.** Members are not `app_users`; nobody in that table can sign in, so there is no session to check and never will be. The link carries `?e=<member_email_id>&t=<HMAC-SHA256 under UNSUBSCRIBE_SECRET>`, verified in constant time — **a bare id is never enough**, or a stranger could walk UUIDs and opt 687 members out at random. It sets exactly one column on exactly one row (`status = 'unsubscribed'`) and reveals nothing: an invalid token and an id that does not exist get the same page, so this cannot be used to test whether a UUID is somebody's (the enumeration mistake TD-017 already records once). Audited as `actor_kind = 'anon'` via `audit_log_anon` (0065) — the member's own decision, not the academy's automation. | 09-Sep-2026 |

Legend: ✅ default enabled · ⬜ default disabled · ➖ not applicable / no such action · 🌐 unauthenticated · 🔒 always on, not configurable

**Nothing in RosiFit is owner-configurable.** There is no permissions UI, and that is a design
decision rather than an omission: with two roles and one admin, a toggle layer would be more
surface than the rule it configures. Every 🔒 above means *fixed in a migration*, and changing one
is a schema change with a test.

---

## Staff access states — `STAFF_ACCESS`, `src/data/mock.ts`

A *sign-in state*, not a role. Both roles above can be in any of these.

| State | Word shown | Action offered | Means |
|---|---|---|---|
| `notEnabled` | Not enabled | Generate PIN | staff row exists; no credential issued |
| `awaiting` | Awaiting PIN | Regenerate | PIN issued, never used |
| `disabled` | Disabled | Re-enable | `is_active = false` — every policy fails closed |
| `active` | Active | Reset PIN | signed in normally |

`disabled` is the one that matters: `is_active_app_user()` is false, so **every** read and write
policy denies. Revoking access is one boolean, not a sweep through the matrix.

---

## Release validation

- [ ] The permission exists in the permissions UI (or its absence is documented).
      → **N/A, documented above:** there is no permissions UI by design.
- [ ] Defaults in the running system match this matrix.
      → ◻ **not yet verified against project `lhpzhkzbnquwjljmbylo`.** Read from migration text
      only. `bootstrap_completed` is still `false`, so no account exists to test with.
- [ ] **Toggling it actually gates the surface** — the deep route and the API path, not just the
      button. → N/A: nothing is toggleable. The equivalent check is that `is_active = false`
      closes every path, exercised by `supabase/tests/01_auth.sql`.
- [ ] The role hierarchy is still coherent: no role can do something a role above it cannot.
      → ✅ by construction: the `super_admin` predicates are a strict superset of the `staff` ones.
- [ ] Impersonation and support-access paths short-circuit owner-only reads correctly.
      → N/A: RosiFit has no impersonation or support-access path.

---

## Backfill

Complete for every table carrying a policy as of migration `0014`. The two ◻ marks above are the
open items: verify them against the running project once `PIN_PEPPER` is set and an admin account
exists, then flip or correct them.
