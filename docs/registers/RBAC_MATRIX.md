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
| Write organisation | ✅ on | ➖ | 🔒 no | Branches and courses are the shape of the business; a coach changing them changes every figure. | 02-Sep-2026 |
| Bulk import members (`bulk_import_members`, 0028) | ✅ on | ➖ | 🔒 no | Owner-only, as the reference (UniqBrio Bulk Student Import v1) has it: adding one member is open to staff, but a file of forty is the shape of the register. Enforced in the RPC (`is_super_admin()`), not only by hiding the buttons — the deep route `/member/import` shows staff an honest no-access state, and the RPC refuses them if they reach it anyway. `member_import_runs` is readable by the admin only, like the audit log, and has no insert policy at all. | 04-Sep-2026 |
| Read members, emails, aliases, enrolments | ✅ on | ✅ on | 🔒 no | The member list is the daily working surface for both roles. | 02-Sep-2026 |
| Write members, emails, aliases, enrolments | ✅ on | ✅ on | 🔒 no | `is_active_app_user()` — front desk correcting a name or an address is the ordinary case, and routing it through the admin would mean it never happens. | 02-Sep-2026 |
| Delete a member alias (`member_aliases_delete`) | ✅ on | ✅ on | 🔒 no | The only `for delete` policy in the schema. An alias is a correction, and a wrong correction must be removable. | 02-Sep-2026 |
| Read sessions and expectations | ✅ on | ✅ on | 🔒 no | The calendar both roles work from. | 02-Sep-2026 |
| Update session status (`sessions_status_update`) | ✅ on | ✅ on | 🔒 no | Marking a session held or cancelled is a coach's job. Status only — a session cannot be created or deleted from the client. | 02-Sep-2026 |
| Read attendance | ✅ on | ✅ on | 🔒 no | Every figure on every screen derives from it. | 02-Sep-2026 |
| Write attendance | ➖ | ➖ | 🔒 no | **Nobody, through the client.** `authenticated` holds no write grant on the engine tables; attendance arrives only via the `csv-import` Edge Function running as `service_role`. A stolen anon key cannot forge attendance. | 02-Sep-2026 |
| Read / create a CSV import (`csv_imports_*`) | ✅ on | ✅ on | 🔒 no | Uploading the register is front-desk work. The **commit** is server-side (`0014`). | 02-Sep-2026 |
| Read follow-up rules (`fuc_read`, `cfuc_read`) | ✅ on | ✅ on | 🔒 no | Staff must see which rule flagged a member. | 02-Sep-2026 |
| Change follow-up rules (`fuc_write`, `cfuc_*`) | ✅ on | ➖ | 🔒 no | The rule decides who gets contacted; it is an academy policy, not a per-coach setting. | 02-Sep-2026 |
| Read email templates (`tmpl_read`) | ✅ on | ✅ on | 🔒 no | The send flow shows what will go out. | 02-Sep-2026 |
| Change email templates | ✅ on | ➖ | 🔒 no | Template text is the academy's voice to its members. | 02-Sep-2026 |
| Send follow-ups | ✅ on | ◻ | 🔒 no | Runs as `service_role` in `send-followups`, so RLS does not gate it — `requireCaller()` does. **◻ Which `kind` that function requires was not verified against deployed code in this pass.** | 02-Sep-2026 |
| Issue / reset a staff PIN (`pin-issue`, `pin-reset`) | ✅ on | ➖ | 🔒 no | `requireSuperAdmin()` — "Only the academy admin can do this." | 02-Sep-2026 |
| Read own preferences (`0010`) | ✅ on | ✅ on | 🔒 no | Theme and accent are personal. | 02-Sep-2026 |
| Read recovery answers / rate limits | ➖ | ➖ | 🔒 no | **No policy exists on these tables at all**, so RLS denies everyone. Only `service_role` reaches them. Guardrail 4: PINs and recovery answers are never stored readable. | 02-Sep-2026 |

Legend: ✅ default enabled · ⬜ default disabled · ➖ not applicable / no such action · 🔒 always on, not configurable

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
