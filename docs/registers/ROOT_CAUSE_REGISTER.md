# Root Cause Register

> Every defect that reached a user, or that cost more than an hour to diagnose.
>
> **Append-only. Newest first. Never renumber. Never backfill.**
>
> Read before every bug fix, cited in every implementation plan, and consulted at every test run.
> Its value is entirely in having been kept from the start.

---

## Template

```markdown
## RC-000 — <one-line title>
**Date:** DD-MMM-YYYY  ·  **Severity:** S1 | S2 | S3 | S4  ·  **Modules:** <list>

**Symptom** — what was observed, in the words of whoever reported it.

**Root cause** — the reason it existed. Distinct from the symptom, and distinct from the file
where the error surfaced. One or two sentences.

**Fix** — what changed, and why that addresses the cause rather than the symptom.

**Files** — the paths touched.

**How to verify** — a specific instruction a future test run can execute to prove this has not
returned. This is the field that makes the register useful rather than historical.

**Recurrence risk** — where else this class can occur. If it is a pattern, say how many other
sites were found and how you searched. An unevidenced sweep did not happen.

**Prevention** — the rule, checklist item or gate that now catches it, **named as a path**.
Or, honestly: "no rung — prose only", and why a rung is not currently feasible.

**Process check** — would a correctly functioning process have caught this?
No → one line, done. Yes → the framework-update workflow ran, and here is what changed.
```

---

## Severity

| | |
|---|---|
| **S1** | Data loss, security exposure, or the application is unusable. Fix now. |
| **S2** | A major flow is broken with no workaround. Fix this release. |
| **S3** | A flow is degraded, or there is a workaround. Schedule it. |
| **S4** | Cosmetic or rare. Backlog. |

---

## Entries

> The four entries below were found **by this framework's own gates, while it was being built**.
> They are kept as worked examples of the format — and as evidence that the gates fire.
> RC-005 and RC-006 were found by the **fixtures**, during the evolution release (v1.1.0),
> before either defect ever reached an app.

---

## RC-017 — the app said SENT for an email it never sent
**Date:** 05-Sep-2026 · **Severity:** S1 · **Modules:** `supabase/functions/send-followups/`

> **NUMBERED RC-017, NOT RC-015.** It was written as RC-015 by one session while another was
> writing a different RC-015 and an RC-016 in parallel; both landed in the same worktree. The
> register says never renumber, and the register is right — but two entries cannot share an id,
> and the one that arrived second is the one that moves. Nothing else in this entry changed.
> `rung: scripts/audits/check-rule-coverage.mjs`, which is what caught the collision.

**Symptom** — reported by the owner: *"I just clicked on send communication, it says message sent
but I don't receive any message."* The Result screen showed **1 sent · 0 failed · 0 excluded** and a
green SENT beside her name. `email_messages` agreed: `status='sent'`,
`provider_message_id='dev-869384b3…'`. Nothing had been sent.

**Root cause** — two faults, and the second is the one that made the first invisible.

1. **The secret names did not match.** The account had `AWS_SES_REGION` and `SES_FROM`; the
   function read `AWS_REGION` and `SES_FROM_ADDRESS`. `EMAIL_PROVIDER` was absent entirely, and it
   was the first thing checked — so `getEmailProvider()` returned the dev provider before it ever
   looked at the AWS values.
2. **The dev provider reports success.** It writes the message to the function log and returns
   `{ ok: true, providerMessageId: 'dev-…' }`. `send-followups` cannot tell that from a delivery,
   so it recorded `sent`, bumped `last_emailed_at`, and told the screen 1 sent.

The fallback was deliberate — *"Never throws: a missing secret degrades to logging, not 500s"* —
and `SETUP.md` even predicted the consequence: *"every message is recorded status='sent' with
provider='dev' while nothing leaves the building. A send that looks successful and sent nothing is
worse than one that fails."* It was written down, and it still shipped, because nothing enforced it.

**Fix** — `resolveEmailProvider()` returns the provider **and what is missing**, and
`send-followups` refuses with a 503 naming the absent secrets **before the batch row is written**,
so a refused send leaves nothing to explain. `EMAIL_PROVIDER` is no longer the switch: four complete
AWS values are. A separate flag was one more thing to forget, and forgetting it looked like success.
Both spellings of the region and the from-address are accepted, and `SES_CONFIG_SET` is passed to
SES when present. Setting `EMAIL_PROVIDER=dev` explicitly still logs instead of sending — that is a
real answer, and now the only way to reach the dev provider on a deployment.

**AMENDED 05-Sep-2026, after the next send.** With the refusal in place the send reached SES and
failed honestly — `provider='ses'`, `SES 400: {"message":"Missing final '@domain'"}` — which is
progress and still not good enough. That message names neither the field nor the value, and the
RECIPIENT was demonstrably fine (25 characters, trimmed, in `to_email`), so the only way to know it
meant the SENDER was to reason it out. `resolveEmailProvider()` now checks the from-address SHAPE
before any SES call and quotes the value back: *"SES_FROM_ADDRESS is \"x\", which is not an email
address. Use name@example.com, or \"Academy <name@example.com>\" with the angle brackets."*
Showing the value leaks nothing — a from-address is on every email the academy sends — and it is
the only thing that makes the error actionable. The check excludes `=` and `,` from the address on
purpose: both are legal in a local part, neither is ever used, and their absence catches the two
mistakes people actually make in a secrets field — pasting the whole `SES_FROM=someone@example.com`
line, and putting two addresses in one value. My first version of that regex accepted the pasted
line; it was caught by running the pattern against real inputs rather than reading it.

**AMENDED AGAIN 05-Sep-2026, the third link in the same chain.** The shape check from the last
amendment fired on the next send, and it was right: `SES_FROM_ADDRESS` held
`"UniqBrio <uniqbotzinfo@gmail.com>"` -- **with the quote characters stored as part of the value**.
`supabase secrets set FROM="X <a@b>"` in PowerShell keeps the quotes, and so does pasting a quoted
value into the dashboard field. The value reads correctly to a person and is wrong to every
consumer. `unquoteSecret()` now strips one or more matching wrapping pairs from **every** secret
this function reads, not just the from-address, because a quoted `AWS_SECRET_ACCESS_KEY` fails far
worse: the signature simply does not match and SES answers 403 with nothing pointing at the quotes.
Stripping is safe here because none of these secrets may legitimately begin AND end with a quote --
and `"UniqBrio" <a@b.com>`, where the quotes correctly wrap only the display name, ends `>` and is
left untouched.

**A latent defect in the guard itself, found while fixing the above.** `FROM_SHAPE` was built with a
plain template literal, and a plain literal eats an unrecognised escape: `\s` became the letter
`s`, so `<\s*...\s*>` compiled to `<s*...s*>` and matched a run of *s* where it meant whitespace.
It still accepted the ordinary `Academy <me@example.com>` -- zero s's, zero spaces -- which is
exactly why nothing caught it; `Academy < me@example.com >` was refused for no stated reason. Both
halves are now `String.raw`. This one never reached a user and gets no entry of its own; it is
recorded here because it shows the shape of the mistake: the half of the pattern that was correct
(`ADDR`) was already `String.raw`, so the file looked consistent at a glance.

**Recurrence risk** — the class is "a degraded fallback that returns the success shape". It is
worth grepping for on any provider abstraction added later: a stub that satisfies the interface
will satisfy the caller too.

**Prevention** — `src/data/fromAddress.test.ts` (14 assertions), which imports
`supabase/functions/_shared/from-address.ts` — **the module the Edge Function imports**, not a copy
of the rule kept in step by hand. A copied regex would have passed here while production failed,
which is the failure this whole entry is about. It runs in `npm run check` via `test:unit`, and it
covers the quoted value from the live failure end to end.

**The gap that remains, narrowed but not closed.** `resolveEmailProvider()` itself still has no
spec — reaching it means mocking `Deno.env` inside an Edge Function — so the *name mismatch* half
of this entry is still guarded by prose alone. What is now tested is the part that was extractable:
unquoting and the from-address shape, the two rules that decide whether a secrets field is usable.
Pulling the env lookup behind an injectable reader would close the rest and was not done here.

**Left standing:** the one `provider='dev'` row from 05-Sep. It is the evidence, and deleting the
record of a message the academy believes it sent would be the same lie one layer down.

---

---

## RC-016 — a global screenOption silently cancelled a per-screen presentation, and both sites still read as correct
**Date:** 05-Sep-2026 · **Severity:** S3 · **Modules:** `app/_layout.tsx`, `src/components/FormDialog.tsx`

**Symptom** — "The dialog should open top of screen from where that button is clicked or form is
opened. same goes for all forms." Clarified by the requester: the dialog itself was right; what
was wrong was behind it — "the background from where dialog is opened should be shows as blurred
screen as dialog is opens". A screenshot of "Welcome a new member" showed the card floating on a
flat near-black field with no trace of the screen it was opened from.

**Root cause** — `Nav`'s `<Stack screenOptions={{ contentStyle: { backgroundColor: theme.bg } }}>`
applied to every screen in the app, the `transparentModal` dialog routes included — at the time
seven, the six forms and `upload`. So each dialog route painted an opaque `#08040A` panel over the screen
`transparentModal` had gone to the trouble of keeping mounted. **Neither site was wrong on its own.** The screenOption is the right
default for the screens that are pages; the per-screen `presentation` is the right option
for the ones that are dialogs; the defect existed only in their composition, which is written down
nowhere and visible in neither file. The 04-Sep correction that introduced `transparentModal`
tested the half it changed — the form was no longer a whole page — and recorded "the screen
underneath stays mounted and visible" in three places, a claim that was true of `mounted` and
false of `visible` from the moment it was written.

**Fix** — The three properties that make a route a dialog are now ONE named object,
`DIALOG_SCREEN` in `app/_layout.tsx`, carrying `presentation`, `animation`, `headerShown` and the
`contentStyle: transparent` that was missing; the dialog routes spread it rather than each repeating
— and each being able to drop — a property. The ground moved to a `View` wrapping the whole
`Stack`, so a dialog route opened cold still lands on `theme.bg` instead of the navigator's white.
`FormDialog`'s scrim gained `backdrop-filter: blur(14px)` on web, which is what keeps the
now-visible screen a backdrop rather than competing content. This addresses the cause because the
composition is no longer something six call sites have to get right independently: there is one
place where "what makes a route a dialog" is written, and it is the place a future option is added.

**Files** — `app/_layout.tsx`, `src/components/FormDialog.tsx`,
`docs/registers/FEATURE_TRUTH.md`, `requests/2026-09-05-dialog-opens-at-top.md`.

**How to verify** — Open any of the dialog routes from a screen (not by URL): member/edit,
course/edit, offering/edit, staff/add, holiday, change-mobile, upload, match. The screen behind must be
recognisable through the scrim and blurred, in BOTH themes. The mechanical check that it has not
regressed: every route that renders a `FormDialog` must take `DIALOG_SCREEN` —
`grep -c "options={DIALOG_SCREEN}" app/_layout.tsx` equals the number of routes that render a
`FormDialog` — 8 since decision 009 added `match` — and no `Stack.Screen` line carries
`presentation: 'transparentModal'` inline: `grep -c "options={{ presentation: 'transparentModal'" app/_layout.tsx`
is **0**. Compare the two greps rather than trusting the number written here; it moves every time a
screen becomes a dialog, and a stale count reads as a failure.

**Recurrence risk** — `match` was the live second instance when this entry was written: declared
`transparentModal`, described in its own comment as "a dialog over the screen that opened it", and
drawing an opaque `ShellScreen` that had never shown anything underneath. It was deliberately left
alone by THIS change — the request scoped to forms, and `match` was not one — and was converted
hours later, in the same working tree and on the same day, by decision 009. **That overlap belongs
in this entry:** two changes reached `app/_layout.tsx` concurrently, and the second one adopting
`DIALOG_SCREEN` rather than copying three properties is the only reason `match` did not ship the
third-half bug a second time. Which is the argument for the named object, made by accident. The
general class is "a global default and a per-screen option that only conflict
when composed". Every other `screenOptions` property is a candidate: `headerStyle`,
`headerTintColor` and `contentStyle` all apply to routes that draw their own chrome. The same
shape exists wherever this app sets a default centrally and overrides it locally — the theme
provider and `AppShell` are the two other places. Nothing automated catches it: a gate would have
to render the route and look at what is behind the dialog, which is why the verify step above is
a human one.

---

## RC-015 — Continue accepted any ten digits, because a deliberate divergence from the canvas lived only in a code comment
**Date:** 05-Sep-2026 · **Severity:** S3 · **Modules:** `app/index.tsx`, `src/data/signin.ts`, `supabase/functions/auth-login`, `app/register.tsx`

**Symptom** — "On entering mobile number its not validating mobile number on continue for any
random mobile number its leading us to pin screen." Reported against the live project, where
`bootstrap_completed` is `true`.

**Root cause** — Not a missing check. `toPin` never called the server *on purpose*: the canvas'
`doContinue()` validates the number against the account list, and the app replaced that with
"Continue always advances, the server decides on the PIN submission" to avoid shipping a public
phone-lookup endpoint — a staff-enumeration oracle. **That decision was recorded in a comment in
`src/data/signin.ts` and nowhere else** — no ADR, no register row — so from outside the file it
was indistinguishable from an oversight. The behaviour also degrades exactly as reported once
`bootstrap_completed` flips: pre-bootstrap an unknown number does reach registration, via
`auth-login`'s 409 and `needsRegistration`; post-bootstrap `auth-login` deliberately answers the
same generic sentence for an unknown number and a wrong PIN, so nothing ever reaches registration
and every number stops at the PIN screen. The reporter was seeing the post-bootstrap half of a
documented design, with the document invisible.

**Fix** — Two halves, and the second is the one that matters.

*The behaviour:* `supabase/functions/auth-lookup` answers one boolean, `registered`, for a phone
number. Continue calls it and routes — registered to the PIN step (the PIN is still required),
unregistered to registration, and a lookup that did not answer stays put with the reason.
`continueDestination` is the pure decision, `isRegisteredNumber` is the one place that decides
live-vs-fixtures (CP-001).

*The cause:* the divergence is now **ADR 016** (`docs/decisions/008`) with the trade-off, who
accepted it and what was rejected; the accepted enumeration risk is **TD-017**. The next person
to read `auth-lookup` finds out in the file header why an endpoint that leaks staff numbers is
there on purpose.

**Files** — `supabase/functions/auth-lookup/index.ts` (new), `src/data/api.ts`,
`src/data/repository.ts`, `src/data/signin.ts`, `src/data/signin.test.ts`, `app/index.tsx`,
`app/register.tsx`, `docs/decisions/008-continue-validates-the-number.md`,
`docs/registers/DECISION_LOG.md`, `docs/registers/TECH_DEBT.md`.

**How to verify** — With the live project: enter a number that has no `app_users` row and press
Continue — the registration screen opens, and its Back returns to sign-in. Enter the super
admin's or a staff member's number — the PIN screen opens and still demands a PIN. Kill the
network and press Continue — the number screen stays put and says the number could not be
checked; it must NOT advance and must NOT go to registration. In JS:
`npx tsx --test src/data/signin.test.ts` — 22 cases, three of which are `continueDestination`
and one of which pins the `null` case.

**Recurrence risk** — The defect class is *a deliberate divergence from the design source of
truth recorded only in code*. Swept for the behavioural sibling — a screen advancing a person
past an identity step without validating — by grepping `isCompletePhone|phoneDigits` across
`app/` and `src/` and reading all four screens that handle a phone number.
**One site found, `app/index.tsx`, and it is the one fixed.** `forgot-pin.tsx` receives the
number from the PIN step and verifies it server-side (`recoveryQuestions`/`recoveryVerify`),
`register.tsx` is validated by `auth-bootstrap`, and `change-mobile.tsx` reads the signed-in
identity. The *documentation* class was not swept and is the larger risk: any other place where
the app knowingly departs from `design/RosiFit App.dc.html` with only a comment to say so.

**Prevention** — No rung, and a rung is not currently feasible: no check can tell a deliberate
divergence from the canvas apart from an unimplemented one. Prose rule, in
`checklists/DEFINITION_OF_DONE.md`: **a departure from the design source of truth gets an ADR,
not a comment.** A comment is invisible to the person holding the canvas next to the app, which
is exactly who reports it as a bug.

**Process check** — **Yes.** The build that made this choice wrote a thorough comment and no
record, and nothing asked it for one. See the framework-update note in the close-out.

---

## RC-014 — a mistyped joining date was imported as a real one, because the cast did not raise
**Date:** 05-Sep-2026 · **Severity:** S2 · **Modules:** `supabase/migrations/0028_bulk_import_members.sql`

**Symptom** — a bulk-import probe row carrying `01/09/2026` came back **`inserted`** where the
spec says `failed`, and landed on the register with a joining date nobody had written.

**Root cause** — `0028` guarded the date the way a cast is usually guarded:

```sql
begin
  v_joined := nullif(btrim(coalesce(v_row->>'joined_on', '')), '')::date;
exception when others then   -- "not a date"
```

That assumes `'01/09/2026'::date` raises. **It does not.** Postgres parses it under the
session's `DateStyle` and returns a perfectly real date — just not the one the academy meant.
The exception block only ever caught outright gibberish; the dangerous input is the one that
*is* a date, in the wrong order. A member's `joined_on` becomes
`member_enrollments.effective_from`, which decides every session she was ever expected at, so a
silent slip there rewrites her whole attendance history.

The client already refused it (`src/data/memberImport.ts` matches `^\d{4}-\d{2}-\d{2}$`).
The server did not, and the server is the boundary that writes.

**Fix** — `0029` checks the SHAPE before the cast: `YYYY-MM-DD` or a named refusal. The cast
stays, guarded, for a well-shaped date that is not a real day (`2026-02-31`). A future date is
still `create_member`'s own refusal, inside the per-row sub-transaction.

**How it was found** — the ADR 007 rolled-back rehearsal against production, run immediately
after `0028` was applied. Nothing persisted. **The committed spec already asserted the correct
outcome** — `22_bulk_import_members.sql`, *"three failed -- and each is named below"* — and had
never been executed, because no machine here has PostgreSQL 16 (ADR 005). The spec was right
and unread; that is the cost of the unrun harness, in one line.

**Guard** — seven assertions appended to `22_bulk_import_members.sql` pinning the slashed date,
the impossible day, the future date and the good one. Still unrun for the same reason, so the
live guard today is the shape check itself plus the rehearsal transcript in `TEST_SUMMARY.md`.

**Recurrence risk** — moderate, and general. Any `text::date`, `::int` or `::uuid` behind
`exception when others` in this schema makes the same assumption: that bad input raises. For
dates it usually does not.

**Prevention** — prose. The real rung is the harness running in CI, which would have failed
this on the commit that introduced it.

---

## RC-013 — a dependency's Node build bundled into the app, and the build stayed green
**Date:** 04-Sep-2026 · **Severity:** S2 · **Modules:** `src/data/memberXlsx.ts`, `metro.config.js`

**Symptom** — reported from the running dev server, with a screenshot:

```
While trying to resolve module `async` from node_modules/archiver/lib/core.js,
the package node_modules/async/package.json was successfully found. However, this
package itself specifies a `main` module field that could not be resolved
(node_modules/async/dist/async.js). Indeed, none of these files exist:
```

**Root cause** — two things behind one message, and only the second is a defect.

The literal claim was false: `async/dist/async.js` does exist. The dev server was running while
`npm install exceljs` was mid-flight, so Metro read a half-written `node_modules`. That is a
race, and a restart clears it.

What it exposed is the real one. **exceljs ships two builds.** `main` is the Node build and
depends on `archiver`, `unzipper`, `tmp` and `readable-stream` — Node's filesystem and stream
stack. `browser` is the self-contained `dist/exceljs.min.js`. Metro was resolving the first, so
a React Native / web bundle was pulling in Node's zip and fs layers. On web it survived by
accident; on a native build it could never have worked.

**Why the gates did not catch it** — and this is the part worth keeping. `npm run typecheck`
passes: the *types* resolve from `index.d.ts` regardless of which build runs.
`npm run export` **passed too**, emitting `/member/import` at 33 KB, because Metro's web
resolution happened to find something for every specifier. Nothing in the pipeline asks *which
file* a dependency resolved to. So a wrong-half dependency reaches a user as a runtime error in
their browser, with a green build behind it.

**Fix** — `metro.config.js`, new, doing one thing: resolve `exceljs` to its browser build.
Scoped to that package deliberately — setting `resolverMainFields` to prefer `browser` globally
would change resolution for *every* dependency in the tree, `@supabase/supabase-js` included, to
fix one. And `memberXlsx.ts` makes exceljs a **type-only** import plus a lazy loader, so the
~950 KB browser build is fetched only when a workbook is actually built or read.

**AMENDED 05-Sep-2026 — the first fix did not reach the person reporting it.** The same error
came back, and the log dated the dev server at ~8 hours old: `metro.config.js` had not existed
when it started, and **Metro reads that file once, at startup**. So the repository looked fixed,
`npm run export` passed, and the app in front of the owner was unchanged. A fix that depends on
somebody restarting a long-running process is not a fix.

The shape was wrong, not just the rollout. `import('exceljs')` leaves the CHOICE OF BUILD to the
bundler, and a config file then has to take that choice back. `memberXlsx.ts` now imports
**`exceljs/dist/exceljs.min.js` by path**, so there is no choice to take back — verified first
that this build makes zero `require()` calls and loads under plain node, which is why it is safe
on web, on native, and in the Node renderer that prerenders these routes (that renderer,
`router-server/node/render.js`, was the half actually failing). `metro.config.js` stays, demoted
to a second line of defence against a future plain `import 'exceljs'`.

**Guard** — measurement of the emitted bundle, recorded in `TEST_SUMMARY.md`: across **all** of
`dist/`, server-rendered HTML included, `archiver` 0 files, `unzipper` 0, `async/dist` 0,
`lib/core.js` 0; `exceljs` its own chunk. The specs also build their fixtures through the same
loader the app uses, so they exercise the build that ships. That is evidence plus one real
coupling — still not a rung; nothing re-checks the bundle on the next change.

**Recurrence risk** — moderate, and it applies to *any* dual-build dependency this app adds.
The trap is that both halves typecheck and both may bundle; only one runs.

**Prevention** — prose only, honestly. A real rung would assert that no Node-only module name
appears in `dist/_expo/static/js/web/` after an export, which is cheap and would have caught
this the moment exceljs landed. Named here so the next reader can weigh whether to build it,
rather than discovering the class a third time.

---

## RC-012 — two member screens read the fixture, so one showed the wrong person
**Date:** 04-Sep-2026 · **Severity:** S1 · **Modules:** `app/member/edit.tsx`, `app/member/[id].tsx`

**Symptom** — reported as *"Edit member is not working, it's opening the add member form instead."*
Tapping Edit on a real member opened a blank form titled **"Welcome a new member"**.

**Root cause** — both screens resolved the member against `MEMBERS`, the **fixture array**, rather
than against the live list:

```ts
const existing = MEMBERS.find(m => m.id === id);              // member/edit
const index = Math.max(0, MEMBERS.findIndex(x => x.id === id));
const m = MEMBERS[index] ?? MEMBERS[0];                        // member/[id]
```

On live data no real id is in the fixture. In the edit form `existing` was always `undefined`, so
Edit rendered Add — and its Save would have **created a second record for somebody already on the
register**.

The detail screen was worse and nobody had reported it. `findIndex` returns `-1`, `Math.max`
clamps that to `0`, and the screen rendered **the first fixture member** — a different person's
name, course, attendance and missed streak — under the heading of whoever was tapped. A defensive
clamp turned "not found" into "here is someone else", confidently.

**Fix** — both read `useMembers`, the same source the list and the follow-up derivation use
(guardrail 1). The edit form seeds its fields from an effect once her record arrives, guarded by a
`seeded` flag so a refetch cannot overwrite a keystroke. The detail screen answers **loading** and
**missing** as separate states and never substitutes a neighbour.

**Guard** — the `?? MEMBERS[0]` fallback is gone and cannot come back without reintroducing the
fixture import, which no longer exists in either file.

**Recurrence risk** — high. `MEMBERS` is exported for the fixtures mode and imports cleanly
anywhere; nothing fails when a screen reaches for it. RC-010 recorded this exact class on the
Reports screen and explicitly noted `app/member/[id].tsx` as *"the same class of defect, out of
scope"*. It was left, and this is it arriving.

**Prevention** — prose only, and honestly so: `rung: scripts/audits/check-dead-weight.mjs` does
not cover this, and a lint rule banning the fixture import would also ban the fixtures mode that
needs it. The register entry is the guard. Named here so the next reader can weigh whether a
dedicated audit is worth it.

---

## RC-011 — every action taken through an Edge Function was logged as "System"
**Date:** 03-Sep-2026 · **Severity:** S2 · **Modules:** `supabase/migrations/0004_audit_logs.sql`, `supabase/functions/*`

**Symptom** — the audit log's *Modified by* column said **System** for every communication sent,
every attendance file uploaded, every match decision taken on an ambiguous row, and every staff
PIN issued or reset. Only writes the app made directly — a branch added, a member edited, a
course saved — carried a name.

**Root cause** — `audit_log()` derives its actor from `current_app_user_id()`, which reads
`auth.uid()`. Every Edge Function calls it on the **service-role** client, where `auth.uid()` is
null. So the actor column was written NULL and `actor_kind` fell through to `'anon'` — the label
an *unauthenticated* request carries. In an append-only table that by design cannot be corrected,
a batch of emails sent by the super admin was indistinguishable from a batch sent by nobody.

The identity was never missing. `send-followups` had `caller.id`, `csv-import` had `actorId`,
`commit_csv_import` had `p_actor` as a parameter and already wrote it into
`member_emails.added_by`, `member_aliases.confirmed_by` and `attendance_records`. Four functions
carried the actor into the data and dropped it on the way to the log.

Reproduced on the harness in one statement: `set local role service_role; select
public.audit_log('communication.batch_sent','email_batch','b1');` → null actor, kind `anon`.

**Fix** — `0023_audit_actor.sql` adds `audit_log_as(p_actor, ...)`, granted to `service_role`
**only**, and re-issues `commit_csv_import` so its five decision entries carry `p_actor`. Eleven
call sites across five functions now name the caller they had already authenticated. 16
assertions in `supabase/tests/17_audit_actor.sql`.

**Guard** — `audit_log_as` **raises** on a null actor rather than falling back to an unattributed
entry: a caller that reaches it having lost the identity fails loudly instead of writing "System"
into a table nobody can correct. It is not granted to `authenticated`, because a client that could
name its own actor could blame somebody else. Both are asserted, as is the fact that `audit_log()`
itself is **unchanged** — the old behaviour is pinned so a later edit cannot alter it silently.

**Deliberately not attributed** — the six calls in `auth-login`, `auth-bootstrap` and
`recovery-check` run *before* a session exists. Nobody has proved who they are, and naming the
account an attempt was aimed at would record her as having done something she may know nothing
about. Those keep `audit_log()`, with a comment at each saying why.

**Not fixed here** — the migration and the function changes are in the repository and applied to
the local harness. **Neither reaches the live project until someone deploys them**, so the live
audit log still says System.

**Recurrence risk** — high, and quiet. Nothing FAILS when the actor is dropped: the write
succeeds, the screen renders, and only a column is empty. Every future Edge Function starts from
a copy of an existing one, so the defect propagates by imitation.

**Prevention** — `rung: scripts/audits/check-audit-attribution.mjs`, wired into `npm run
audit:all`. A clean gate, not a ratchet: the backlog is zero and there is no honest reason for a
new unattributed call, which is exactly what a baseline would admit. The three pre-session
functions are exempt **by name, with their reason written beside them** in the check itself, so
adding a fourth is a deliberate edit somebody has to justify.

The gate has its own cases — `scripts/audits/check-audit-attribution.test.sh`, which EXECUTES it
against scratch trees and asserts its **output**, not only its exit code. A gate guarding a silent
defect is silent when it breaks: one stray character in its regex and it passes everything
forever, reporting "0 unattributed" about a tree it never read.

---

## RC-010 — Reports showed figures it had never counted
**Date:** 03-Sep-2026 · **Severity:** S2 · **Modules:** `app/(tabs)/reports.tsx`, `src/data/report.ts`

**Symptom** — the Reports screen showed per-course and per-branch attendance percentages, a
headline count and a period, and none of them moved when the academy's data did.

**Root cause** — every figure on the screen was a literal. `COURSE_BARS` and `BRANCH_BARS` were
hardcoded arrays ("Prenatal Flow 74%, 40 scheduled · 30 attended"), the headline said
"Attendance across 4 courses" whatever the academy ran, the total said `61%`, the period string
said "1–24 Aug" forever, and the Members scope read the `MEMBERS` fixture rather than the live
query. The screen was not computing a wrong answer; it was not computing.

Found while implementing a request to add an **export** to this screen. The export was the
reason it mattered: a CSV is an artefact somebody keeps and acts on months later, so exporting
these numbers would have turned a screen defect into a filed document.

**Fix** — the screen reads the same member rows the dashboard donut reads (guardrail 1, one
member source), aggregation moved to `src/data/report.ts`, a real period control replaced the
caption, and the week table was pointed at `useWeekRows`. 14 assertions in
`src/data/report.test.ts`, fail-first evidence in `TEST_SUMMARY.md`.

**Guard** — `reportRows` sums expected and attended per group rather than averaging its members'
percentages, and returns `null` — never `0` — where nothing was expected. Both are asserted.

**Not fixed here** — `app/member/[id].tsx` reads the `MEMBERS` fixture the same way. Noted, out
of scope, and the same class of defect.

---

## RC-009 — a genuine Google Meet export was refused, and the message blamed the file
**Date:** 03-Sep-2026 · **Severity:** S1 · **Modules:** `src/data/meetCsv.ts` (was `src/data/csv.ts`), `app/upload.tsx`

**Symptom** — uploading a real Google Meet attendance export produced *"That file has no “Full
Name” column. RosiFit reads the Google Meet export: Full Name, First Seen, Time in Call."* The
file was correct and had that column.

**Root cause** — `parseMeetCsv` read `lines[0]` as the header row. A Meet attendance export does
not begin with the table: it writes the meeting code and the created and ended times first, and
the `Full Name` header comes after them. So the header search never looked at the header line.

S1 because attendance is the product's one irreplaceable input and this blocked it completely
for the file the product tells people to use — while asserting the file was at fault, which
sends the operator to check Meet rather than RosiFit.

**Fix** — `findHeader` locates the header wherever Meet put it; a file that does start with the
header still parses (index 0, no preamble). Reading past the preamble means reading it, so the
meeting code and times are now captured as `MeetMeta` and shown on the upload screen's "Mapped
to this session" panel — the last point in the flow where a wrong file can be noticed, since
everything after it matches names without looking at which meeting the rows came from.

**Guard** — 23 assertions in `src/data/meetCsv.test.ts`, including a preamble row never being
imported as a member ("Meeting code" as a person's name), and the local-day rule that stops an
11:30pm session being filed under the next day. Observed failing against the pre-fix parser: 6
of 23, recorded in `TEST_SUMMARY.md`.

**Why it was not caught** — the parsing lived in `src/data/csv.ts` alongside `document` and
`FileReader`, so it was outside `scripts/tsconfig.json`'s DOM-free program and could not be
unit-tested at all. The pure parsing is now `src/data/meetCsv.ts`; `csv.ts` keeps only the
browser halves. The same split as `csvFormat.ts`, and for the same reason.

---

## RC-008 — Add Course reported a save it had never attempted
**Date:** 02-Sep-2026 · **Severity:** S2 · **Modules:** `app/course/edit.tsx`, `src/data/repository.ts`

**Symptom** — Reported by the repo owner: *"Add course is not working, it says course is saved but
course is not getting stored in supabase."*

**Root cause** — `save()` in `app/course/edit.tsx` was `flash(...)` followed by `router.back()`.
There was no write of any kind — no Supabase call, no Edge Function, not even a mutation of the
fixture list. The screen was built as a layout with a plausible confirmation and the persistence
was never added; the confirmation is what made that invisible. A form that says "saved"
unconditionally is indistinguishable from a working one until somebody goes looking for the
record, which is why this survived a build, a typecheck, three audits and a visual review.

Two things hid it further. `.env` did not exist, so `isConfigured` was false and the app was on
fixtures — a real write would have been a no-op anyway. And the edit screen read `COURSE_LIST`
from `src/data/mock.ts` directly rather than the repository, so it could not have opened a
database-backed course to edit either.

**Fix** — `repository.createCourse` / `updateCourse` do the write and the screen awaits them.
Direct PostgREST, not an Edge Function: 0005 already grants `authenticated` INSERT/UPDATE on
`public.courses` behind `is_super_admin() and is_subscription_writable()`, and `audit_courses`
fires either way — an Edge Function would only add a second place for that rule to drift. A
refusal is rendered on the screen instead of being swallowed. An RLS-refused UPDATE returns **no
rows rather than an error**, so that case is checked explicitly, or the same false "saved" would
have come back by another route. `onCoursesChanged` notifies every mounted `useCourses`, because
a saved course missing from the list it was saved to reads exactly like a save that did nothing.

**Files** — `app/course/edit.tsx`, `src/data/repository.ts`, `src/data/hooks.ts`, `.env`

**How to verify** — Sign in as the super admin, add a course, and read it back:
`GET {SUPABASE_URL}/rest/v1/courses?select=name&name=eq.<name>` with the session's JWT. Then sign
in as a non-super-admin staff member and add one: the screen must show the refusal and the row
must not exist. Both are the point — a screen that cannot report a refusal is the defect.

**Recurrence risk** — High, and it is a class rather than an incident. Every other "saves" in this
app is the same shape and was written the same way: `app/holiday.tsx` (apply), `app/member/edit.tsx`
(save), `app/course/rules.tsx`, `app/staff/add.tsx`, `app/templates.tsx`. **Each of these still
flashes a confirmation for a write that does not happen.** They are unfixed, deliberately — they
were outside the reported defect — and they are recorded here and in `TECH_DEBT.md` so the next
person does not have to rediscover each one from a user report.

**Prevention** — A confirmation may only be emitted by the resolution of a write. Where there is no
write yet, the screen says so in the words the user needs ("saved on this device only — the academy
database is not configured"), which is what `dataSource` is read for in `app/course/edit.tsx`.

**Process check** — **Yes.** Five gates, three ratcheted audits and a contrast checker all passed
over a form that persisted nothing. Every one of them examines the code's shape; none executes a
user journey and asserts on the database afterwards. The gate has a G8 "Functional / integration"
step and it has been FAILing on a missing `test:functional` script since before this change — the
one step that could have caught this is the one that has never run.

---

## RC-007 — Every narrow table grant in 0002-0010 was a no-op, and the harness could not see it
**Date:** 02-Sep-2026  ·  **Severity:** S1  ·  **Modules:** supabase/migrations, db/harness

**Symptom** — a live-project audit found `authenticated` holding
`DELETE, INSERT, SELECT, TRUNCATE, UPDATE` on 28 of 30 tables, and `anon` holding all of the same
on `user_preferences` — while RBAC_MATRIX and FEATURE_TRUTH both stated, as a guarantee, that
"`authenticated` holds no write grant on the engine tables". 135 assertions were passing.

**Root cause** — Supabase ships DEFAULT PRIVILEGES granting ALL on every new `public` object
**directly to `anon` and `authenticated`**, not through the PUBLIC pseudo-role. Every table was
therefore fully open the instant it was created, and the narrow `grant select` / `grant insert,
update` statements that followed added nothing to a grant that already included everything. Only
the `revoke all ... from anon` lines did any work — which is exactly why `anon` was clean
everywhere except `user_preferences`, the one migration with no revoke. The same root cause was
found and fixed for FUNCTIONS in 0012; nobody went back for the tables.

The reason it survived 135 green assertions is the second half: `000_local_shim.sql` did not
reproduce those default privileges, so **the harness was stricter than production**. Every grant
assertion was vacuously true there. A test environment that is safer than production cannot
prove a claim about production.

**Fix** — `0015_repair_table_grants.sql` revokes everything from `anon` and `authenticated` and
re-grants exactly what each creating migration asked for, restores the column-level
`update (status, cancellation_reason)` on `sessions`, forces RLS on `user_preferences`, and
removes the `postgres`-owned default-privilege entry so the next table starts closed. The shim
now sets those default privileges, so the defect is reproducible before it is fixed.

**Files** — `supabase/migrations/0015_repair_table_grants.sql`, `db/harness/000_local_shim.sql`,
`supabase/tests/09_grants.sql`.

**How to verify** — `npm run test:db`. `09_grants.sql` compares `authenticated`'s privileges
against the intended set table by table and names any that differ; it asserts `sessions` carries
UPDATE on exactly `status, cancellation_reason`; and it creates a throwaway table to prove a NEW
one starts with no `anon`/`authenticated` grant. Revert 0015 and those assertions fail.

**Recurrence risk** — the class is "a grant the platform made that a migration did not know to
take away". Searched with `information_schema.role_table_grants` and `pg_default_acl` across all
30 tables and both client roles; the remaining sites are the SECURITY DEFINER functions, already
closed by 0011/0012, and the `supabase_admin`-owned default ACL, which governs only objects
created by that role and not by our migrations. The default-privilege revoke in 0015 closes the
class for tables rather than the instances.

**What was actually reachable** — RLS refused nearly all of it, because a write with no permissive
policy is denied whatever the grant says. Two things were real. `sessions` had a table-wide UPDATE
where 0007 intended two columns, and `sessions_status_update` is a row predicate, so any signed-in
active staff member could rewrite `present_count`, `expected_count`, `session_date` or
`deleted_at` — attendance figures, from the client, which RBAC_MATRIX forbids outright. And a
staff `SELECT` on `super_admin_recovery` was ACCEPTED (RLS returned zero rows) where
`01_auth.sql` asserted it was REFUSED; no hash could ever be read, so nothing leaked, but that
assertion was green for a reason that did not hold in production. Nothing was exploited: the
project has zero `app_users` rows, so no session has ever existed. It would have become live with
the first sign-in.

**Prevention** — `supabase/tests/09_grants.sql`, executed by `db/harness/test.sh` and by the
`db-harness` job in `.github/workflows/ci.yml`. The rung only exists because the shim was made
faithful first; the assertion and the fidelity are one control, not two.

**Process check** — **Yes**, a correctly functioning process would have caught this. ENVIRONMENTS
rule 4 requires schema parity to be "proven by reconstruction", and the harness did reconstruct —
but only what the migrations wrote, never what the platform granted underneath them. The rule now
reads on a shim that reproduces the platform's own defaults. The wider lesson is recorded rather
than assumed: a harness is only evidence about production to the extent it reproduces
production's defaults, and one that is *stricter* produces false greens, which are worse than
reds.

---

## RC-006 — writeBaseline glued the first entry onto the header
**Date:** 28-Aug-2026 · **Severity:** S2 · **Modules:** ratchet engine (all baselined gates)

**Symptom** — `fixtures/with-debt` failed conformance: an audit re-run immediately after
`--write-baseline` reported the just-baselined violation as NEW.

**Root cause** — `writeBaseline`'s header array ends with `''` to produce the final newline, but
`.filter(Boolean)` treats `''` as false and stripped it — gluing the first entry onto the last
comment line, where `readBaseline` discarded it as a comment. Every 0-entry (clean) baseline
masked the bug; the first 1-entry baseline exposed it.

**Fix** — `.filter((x) => x !== null)`. All framework baselines regenerated with the fixed writer.

**Files** — `scripts/lib/ratchet.mjs`

**How to verify** — write a 1-entry baseline with any audit's `--write-baseline`, re-run the
audit: exit 0, "none new". `fixtures/with-debt` pins this permanently.

**Recurrence risk** — every consumer of `writeBaseline` shared the defect; one fix covers all.
Sweep evidence: `grep -rn "filter(Boolean)" scripts/` → 0 remaining matches.

**Prevention** — rung: `scripts/conformance.mjs` (with-debt checks) + `scripts/audits/check-backward-compat.mjs`.

**Process check** — **Yes.** No gate ever exercised a NON-EMPTY baseline round-trip; all the
framework's own baselines were clean, so the writer's output was never read back with content.
The fixture suite now does exactly that on every change — that is the process fix, shipped in
the same release.

---

## RC-005 — the first upgrade after adoption clobbered pre-existing app edits
**Date:** 28-Aug-2026 · **Severity:** S1 · **Modules:** lineage, upgrade

**Symptom** — `fixtures/diverged` failed conformance: its deliberate seed-file modification did
not survive an upgrade — the divergence marker was overwritten.

**Root cause** — `lineage --init` recorded already-modified files as `pristine` ("today's hash is
your baseline"). `upgrade` then read *pristine + seed differs* as "the framework changed this"
and auto-applied — but the difference was the APP's edit, made before lineage existed. Two
different histories collapsed into one status.

**Fix** — `--init` compares each file against the current seed and records differing files as
`adopted-modified`; `statusOf` treats that status as sticky `modified`, so such files always
route to review, never to auto-apply.

**Files** — `scripts/lib/lineage.mjs`, `scripts/lineage.mjs`

**How to verify** — adopt an app whose seed file carries an edit, upgrade with a changed seed:
the edit must survive and an incoming copy must appear. `fixtures/diverged` pins this; the
injected-defect run in TEST_SUMMARY.md shows the audit going red without the fix.

**Recurrence risk** — any status collapse where two histories share one label. The scaffolder
writes seed-identical files, so it cannot exhibit this; stated, not assumed.

**Prevention** — rung: `scripts/conformance.mjs` (diverged checks) + `scripts/upgrade.test.sh`.

**Process check** — **Yes and no.** The upgrade test suite existed and passed — but only
exercised scaffolder-born apps, never adopted ones. The fixture existed precisely to cover the
adoption path, and it fired on first run. The process worked as designed; the lesson (a test
suite covers the paths it was written from) is already FP'd under "a passing check proves only
what it looked at".

---

## RC-004 — The gate runner reported a missing tool as FAIL
**Date:** 28-Aug-2026 · **Severity:** S3 · **Modules:** gate runner

**Symptom** — On a machine where the type-checker could not be installed, the gate reported
`VERDICT: FAIL` with an npm registry error pasted into the report, as though the code were broken.

**Root cause** — `run()` classified any non-zero exit as FAIL, and only a literal `ENOENT`
launch failure as BLOCKED. A tool that launches successfully and then fails to *fetch itself*
exits non-zero like any other failure, so "this machine cannot check your code" was
indistinguishable from "your code is wrong".

**Fix** — An `UNAVAILABLE` signature list (registry errors, missing modules, unresolvable
executables, missing scripts) classifies those outputs as **BLOCKED** with the tool named.

**Files** — `scripts/gate-runner.mjs`

**How to verify** — Run the gate with a dependency uninstalled. The step must read
`BLOCKED - tooling unavailable`, the verdict must be `BLOCKED`, and the exit code must be 3.

**Recurrence risk** — Any step shelling out to an installed tool. All nine steps share `run()`,
so the fix is at the shared boundary and covers every one.

**Prevention** — The three-valued contract now has a written rule in both directions: a missing
tool is never FAIL *and* never PASS. `rung: scripts/gate-runner.mjs` (the `unavailable()`
classifier); prose in [docs/16](../16-TESTING-AND-VALIDATION.md) §2.

**Process check** — **Yes.** The framework's own principle — "fail open on tooling, block only
on evidence" — was documented for the ratchets and not applied to the runner. Corrected in
[docs/17](../17-ENFORCEMENT-RATCHETS.md) §4, which now states the rule applies to every gate.

---

## RC-003 — The rule-coverage audit was blind to `.tsx` references
**Date:** 28-Aug-2026 · **Severity:** S2 · **Modules:** rule-coverage audit

**Symptom** — Ten canonical-pattern rows were reported as `PROSE-ONLY` — declared, accepted debt
— when in fact each named a component file that **did not exist**. The audit under-reported the
exact defect class it exists to find.

**Root cause** — The rung pattern matched `.spec.ts|.test.ts|.mjs|.py|.sh|.ts` only. A rule
pointing at `src/components/Dialog.tsx` therefore matched nothing, and "no rung found" was
reported as the benign outcome rather than the unverified claim it was.

**Fix** — Extended the pattern to `.tsx|.jsx|.json|.css`. Eight rows immediately reclassified as
`DEAD-RUNG`; all eight were then repaired by creating the referenced files.

**Files** — `scripts/audits/check-rule-coverage.mjs`, `docs/registers/CANONICAL_PATTERNS.md`,
eight new files under `starter/src/`.

**How to verify** — `node scripts/audits/check-rule-coverage.mjs --report` reports
`dead/dupe: 0` and `prose only: 0`. Add a row citing a non-existent `.tsx` file; it must appear
as `DEAD-RUNG`.

**Recurrence risk** — Any file type a future rule might cite. The pattern is now one list in one
place.

**Prevention** — `rung: scripts/audits/check-rule-coverage.mjs`, ratcheted.

**Process check** — **Yes.** A detector's own coverage is a coverage question, and nothing was
asking it. This is the general form of *"a passing check proves only what it looked at"*
([docs/09](../09-CODE-QUALITY.md) D-3) applied to the detector itself.

---

## RC-002 — The documentation guard was live but vacuous
**Date:** 28-Aug-2026 · **Severity:** S2 · **Modules:** commit guards

**Symptom** — The guard reachability test expected guard G5 to block a commit that touched
application code with no documentation. It passed the commit instead.

**Root cause** — G5 accepted **any** `.md` file as documentation, and `TEST_SUMMARY.md` is a
`.md` file written by the gate runner. Since G2 already requires a gate run, every compliant
commit staged `TEST_SUMMARY.md` — and satisfied the documentation guard for free. The guard was
reachable, executing, and could never fire.

**Fix** — G5 now excludes `TEST_SUMMARY.md`. It is a gate **artifact**, not a description of
behaviour.

**Files** — `scripts/hooks/pre-commit-guard.sh`

**How to verify** — `bash scripts/hooks/guard-reachability.test.sh` — the case
*"the LAST guard still fires"* must return exit 2, and *"a real doc satisfies it"* exit 0.

**Recurrence risk** — Any guard whose condition can be satisfied by an artifact another guard
already requires. Guards are ordered, so a later guard must never accept an earlier guard's output.

**Prevention** — `rung: scripts/hooks/guard-reachability.test.sh`, which executes each guard
against a scratch repository.

**Process check** — **Yes.** A guard that cannot fire is worse than an absent one: it reports
coverage. Only executing it revealed this — a source scan would have shown a correct-looking
guard. Recorded in [docs/17](../17-ENFORCEMENT-RATCHETS.md) §5.

---

## RC-001 — A reachability test asserted on the wrong guard
**Date:** 28-Aug-2026 · **Severity:** S3 · **Modules:** guard tests

**Symptom** — The case *"G1's escape token releases it"* failed: the commit was still blocked.

**Root cause** — The scratch repository satisfied G1's escape token but not G2's precondition, so
the blocking exit came from **G2**. The test's assertion could not distinguish which guard
produced the exit code, so a green result would have proven nothing about G1.

**Fix** — The scratch repository now satisfies every downstream guard's precondition, so a pass
can only come from the token under test.

**Files** — `scripts/hooks/guard-reachability.test.sh`

**How to verify** — Remove the `CASES-NA:` token from that case; it must fail. Restore it; it
must pass.

**Recurrence risk** — Every test of one item in an ordered chain. The pattern: isolate the item
under test by satisfying everything else.

**Prevention** — Prose: *"assert on the RESULT, not the precondition"*
([docs/09](../09-CODE-QUALITY.md) D-8), plus a comment at the case itself.

**Process check** — **No.** The test found the defect on its first run, which is the outcome the
test was written for. The process worked.
