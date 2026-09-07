# Bugs the process should have caught — a framework enhancement dossier

**Compiled:** 07-Sep-2026 · **Scope:** RosiFit, 28-Aug-2026 → 07-Sep-2026 (11 days)
**Status:** working document, committed 07-Sep-2026 on the repo owner's instruction to commit
all outstanding work. Not pushed. Input to `/framework-update` (Track F) — being committed
makes it findable, not accepted; nothing here has been through Track F's diff-approval gate.

> The prompt for this document was one bug: *"edit course should have prefilled values"*.
> That bug is RC-025, and it is the **third** round on the same reported symptom — RC-012
> (04-Sep) → RC-021 (06-Sep) → RC-025 (07-Sep). The question is not why that form was blank.
> It is why a process with eleven gate steps, six ratcheted audits, four commit guards and a
> nine-register documentation layer let the same sentence be reported by the owner three times
> in four days.
>
> This document answers that with evidence, not impressions.

---

## Sources

Everything below is drawn from artefacts already in this repo. No new judgement was invented;
where a claim is mine rather than the register's, it is marked **(inference)**.

| Source | What it gave |
|---|---|
| `docs/registers/ROOT_CAUSE_REGISTER.md` | 26 entries, RC-001…RC-026, with symptom / root cause / fix / process check |
| `requests/` | 51 binding request files — the owner's own words, and the correction-round counter |
| `docs/registers/TECH_DEBT.md` | 39 TD rows — the defects we chose to leave, and why |
| `docs/registers/CANDIDATES.md` | 5 promotion candidates, 4 of them parked at n=1 |
| `docs/registers/KNOWN_LIMITATIONS.md` | KL-001…KL-004 — platform limits, correctly separated from bugs |
| `scripts/gate-runner.mjs` | The eleven gate steps, G1…G11 |
| `checklists/DEFINITION_OF_DONE.md` | The rules that already absorbed some of these lessons |

---

## 1. The scoreboard

**26 root-cause entries in 11 days.**

| Cut | Count |
|---|---|
| S1 — data loss, security, or unusable | **6** |
| S2 — major flow broken, no workaround | **15** |
| S3 — degraded, or a workaround exists | **5** |
| S4 | 0 |
| Framework's own defects (RC-001…RC-006, 28-Aug) | 6 |
| RosiFit application defects (RC-007…RC-026, 02→07-Sep) | 20 |

**The process check is the damning number.** Seventeen entries carry the *"would a correctly
functioning process have caught this?"* field. **Fifteen of the seventeen say yes.**

| Answer | Entries |
|---|---|
| **Yes** — the process should have caught it | RC-026, RC-025, RC-024, RC-023, RC-020 (*partly*), RC-019, RC-018, RC-015, RC-008, RC-007, RC-006, RC-005 (*yes and no*), RC-004, RC-003, RC-002 — **15** |
| No — the process worked | RC-022, RC-001 — **2** |
| Field absent (predates the field) | RC-021, RC-017, RC-016, RC-014, RC-013, RC-012, RC-011, RC-010, RC-009 — **9** |

**Of the 51 request files:** 9 are BUG REQUESTs, 37 are CHANGE REQUESTs, 4 are NEW FEATUREs,
1 is an ENHANCEMENT. Five requests are at **correction round 2** — a re-report of something
already declared fixed: `bulk-import-field-validation`, `calendar-style-all-date-fields`,
`edit-member-opens-add-form`, `import-writes-on-upload-email-required`, `edit-course-opens-empty`.

---

## 2. The bugs

### 2a. Application defects — RC-026 → RC-007

| ID | Date | Sev | Reported as | Root cause (distinct from the symptom) | Correction | Should the process have caught it? |
|---|---|---|---|---|---|---|
| **RC-026** | 07-Sep | S2 | "for enter pin screen only two number boxes appearing in a row in mobile view", and PIN boxes overlapping the keys | A key was sized as a **percentage of the row** (`31.5%`) while the row also carried a flex `gap: 10`. A flex line breaks on widths **plus** gaps, so three keys needed ~364px; every phone 320–393px got two. The overlap was the same cause two steps on — a 6-row pad instead of 4 pushed content past its region. | Gutter became **padding inside each cell**, in one shared module both keypads import. Padding takes no part in the line-break sum, so `33.3333%` always fits. | **Yes.** Nothing in the pipeline renders a screen at a phone width. The fault was invisible at desktop width, which is where it was previewed. |
| **RC-025** | 07-Sep | S2 | *"on clicking edit course icon the form is opening with empty values"* | RC-021 taught the seeding effect to **wait** (`!recordPending`) but `recordPending` reads `courses.state` and `followUp.state`, and **neither was in the dependency array**. The effect ran once, bailed, and was never scheduled again. The `seeded` latch then held the form blank permanently. | `recordPending` added to the dependency array. The gate, the latch and everything RC-021 added are unchanged — this restores the re-run RC-021 assumed it already had. | **Yes.** RC-021's rung checked that the form *answers* loading/failed/missing. Nothing checked whether the form ever **leaves** those states. |
| **RC-024** | 07-Sep | S2 | *"When user selected a name already, it is not searching properly"* | Rows were `results.map(o => <Row key={o.label}>)`. Two live members are both called "Kavitha Ramesh", so **two React children carried one key**; React reconciled rows against the wrong options. Not a search bug at all — the filter was correct, the render was not. | `pickerKey(option, index)` — the member id when there is one, `label#index` otherwise. Applied at both call sites, and the row now shows her email so two same-named members are distinguishable to the person too. | **Yes.** An earlier change had already declared the label non-unique and moved `onSelect` onto `value` — and left the render path keyed on the label. **Nothing asks "you just declared this field non-unique — what else is keyed on it?"** |
| **RC-023** | 07-Sep | S2 | Saving a course after editing the email wording threw `violates check constraint "course_communication_subject_check"` at the user | The DB requires a subject of 3–200 chars (migration 0021). **The form that collects it encoded none of that.** The first thing in the system to enforce the rule was the INSERT — after Save had been offered and pressed. Second layer: `courseSaveError()` interpolated Postgres' own message into the dialog, so the person read an engine string (CP-003 violation in 7 translators). | Bounds restated where the form can read them (`SUBJECT_MIN/MAX`…), `valid` consumes them, the reason is stated beside the field **and** at the footer. The constraint stays as last defence; `personReadable()` now intercepts engine wording at every translator's fall-through. | **Yes.** `supabase/tests/15_course_communication.sql` asserted the exact input that broke the form, and **passed, for as long as the form existed**. The DB suite proved the constraint refuses it; nothing asked whether anything upstream knew. |
| **RC-022** | 06-Sep | S2 | *"on clicking signout its going to some other screen instead it shoud go to enter number screen"* | Two screens answer to the pathname `/` — sign-in and the Overview tab. expo-router breaks the tie in favour of the caller's **current group**, so `router.replace('/')` from inside `(tabs)` means Overview. The session did end; only the destination was wrong. | The sign-in screen is no longer named by pathname anywhere. `useGoToSignIn()` **resets** the root navigator — no tie to break, and it empties the stack, which is what ending a session should mean. Spec scans every screen under `app/` and fails on a `replace`/`push` to `'/'`. | **No.** The tie-break lives in a vendored fork inside `node_modules`. Scoped, reviewed, and the call used was the one every sibling used. |
| **RC-021** | 06-Sep | **S1** | *"on click of edit button it is opening add member form instead of edit member"* | The form decided **which form it was** from the result of its own lookup: `existing ? 'Edit' : 'Welcome a new member'`. One `null` stood for three facts — no id passed, record not arrived yet, id not on the register — and all three rendered the **Add** form, over a Save that would create a **second record** for someone already registered. | Add-vs-Edit decided by the **route**; `loading` / `failed` / `missing` are three named answers with no footer under any of them. Swept 7 sites, 5 files. | *(field absent)* — but the sweep it triggered is what later exposed RC-025. |
| **RC-020** | 06-Sep | S2 | *"in edit form also no color for selected days"* | Two causes, neither of them colour. **Add:** the day row had **two writers that only agree while the value changes** — a picker's `onSelect` cleared it, an effect keyed on `course\|branch` refilled it. Re-pick the course already showing: clear runs, key unchanged, re-seed does not. **Edit:** `Member` carried no `weekdays` at all, so opening Edit and pressing Save **closed her `member_schedules` override** — a destructive write from a no-op. | One writer: the seed effect owns the row and pickers no longer touch it. `Member.weekdays` is `number[] \| null`, null meaning *she follows the offering* — not the same fact as an empty list. A failed read now fails loudly. | **Yes, partly.** Both halves shipped with a comment describing behaviour nobody had exercised. *"A design note that records a limitation is not the same as one that records its consequence."* |
| **RC-019** | 06-Sep | S2 | *"i completed registration … it did not move further … when i login with same number again it brough me back to registration page"* | `continueDestination` decided from **one input** — does the number have an account — and mapped `false → register`. That encodes an unchecked assumption: that an unregistered number **may** register. It may not; registration is a one-time bootstrap latch and answers 409 to every later call. The missing input surfaced as a **cycle**, not an error. | **Not fixed.** The client-side fix was built and reverted the same day — the owner rejected it. The entry is kept so the next attempt does not repeat it. The fix belongs on the **server**. | **YES, and worth naming.** This destination was **approved at a Track C gate** on 05-Sep. The gate presented a true fact and the wrong conclusion from it. **No gate asks "can the destination this routes to actually succeed?"** |
| **RC-018** | 05-Sep | S3 | *"the background is black but it should not"* — the **second** report on the same surface | `DARK.scrim` was `rgba(6,2,7,0.7)`, chosen while a dialog route still painted an **opaque** panel behind it. With nothing visible underneath, 0.7 hid nothing. RC-016 removed the panel **and did not revisit the number.** The composition was fixed and the value tuned for the broken composition was left in place. | Scrim to 0.5; `src/theme/scrim.test.ts` bounds both themes in **both directions** (≤0.55 or the screen behind stops being a place; ≥0.2 or it stops being a backdrop). | **YES — and this is the more important half.** Round 1 verified itself with screenshots taken by the agent that wrote the change, against a criterion the same agent chose. **No rung existed that could disagree with the author.** |
| **RC-017** | 05-Sep | **S1** | *"it says message sent but I don't receive any message"* | Two faults, the second hid the first. (1) Secret **names** did not match — the account had `AWS_SES_REGION`/`SES_FROM`, the function read `AWS_REGION`/`SES_FROM_ADDRESS`. (2) The dev fallback provider **returns the success shape** — `{ok:true, providerMessageId:'dev-…'}` — so the app recorded `sent`. `SETUP.md` had literally predicted this consequence in writing. It shipped anyway, because nothing enforced it. | `resolveEmailProvider()` returns the provider **and what is missing**; a 503 naming the absent secrets is raised **before** the batch row is written. Amended twice more the same day: from-address shape check, then `unquoteSecret()` after a value arrived with its quote characters stored inside it. | *(field absent)* — the entry says it plainly: *"It was written down, and it still shipped, because nothing enforced it."* |
| **RC-016** | 05-Sep | S3 | The dialog's backdrop showed no trace of the screen behind it | `<Stack screenOptions={{contentStyle:{backgroundColor: theme.bg}}}>` applied to **every** screen including the `transparentModal` dialog routes, so each dialog painted an opaque panel over the screen `transparentModal` had kept mounted. **Neither site was wrong on its own** — the defect existed only in their **composition**, written down nowhere and visible in neither file. | The three properties that make a route a dialog became one named object, `DIALOG_SCREEN`. | *(field absent)*. The 04-Sep change that introduced `transparentModal` recorded "the screen underneath stays mounted and visible" in three places — true of *mounted*, false of *visible*, from the moment it was written. |
| **RC-015** | 05-Sep | S3 | *"On entering mobile number its not validating … for any random mobile number its leading us to pin screen"* | Not a missing check. `toPin` never called the server **on purpose**, to avoid shipping a staff-enumeration oracle. **That decision lived in a code comment and nowhere else** — no ADR, no register row — so from outside the file it was indistinguishable from an oversight. | `auth-lookup` added; and the divergence became **ADR 008** with the trade-off, who accepted it, and what was rejected. The accepted risk is **TD-017**. | **Yes.** The build that made this choice wrote a thorough comment and no record, and **nothing asked it for one.** |
| **RC-014** | 05-Sep | S2 | A bulk-import row with `01/09/2026` came back `inserted` instead of `failed` | The migration guarded the cast the usual way — `::date` inside `exception when others`. **`'01/09/2026'::date` does not raise.** Postgres parses it under `DateStyle` and returns a perfectly real date, just not the one meant. The exception block only ever caught outright gibberish; the dangerous input is the one that **is** a date, in the wrong order. `joined_on` drives `effective_from`, so a silent slip rewrites her whole attendance history. | `0029` checks the **shape** before the cast. | *(field absent)*. The committed spec **already asserted the correct outcome** and **had never been executed**, because no machine here has PostgreSQL 16 (ADR 005). *"The spec was right and unread; that is the cost of the unrun harness, in one line."* |
| **RC-013** | 04-Sep | S2 | Metro could not resolve `async` from `archiver` | `exceljs` ships **two builds**; `main` is the Node build pulling `archiver`/`unzipper`/`tmp`. Metro resolved that one, so a web bundle pulled in Node's zip and fs stack. **`typecheck` passed** (types resolve from `index.d.ts` either way) and **`export` passed** (Metro found *something* for every specifier). **Nothing in the pipeline asks which file a dependency resolved to.** | Import `exceljs/dist/exceljs.min.js` **by path** so the bundler has no choice to take back; `metro.config.js` demoted to second line of defence. | *(field absent)*. **Amended:** the first fix did not reach the reporter — Metro reads its config **once, at startup**, and the dev server was 8 hours old. *"A fix that depends on somebody restarting a long-running process is not a fix."* |
| **RC-012** | 04-Sep | **S1** | *"Edit member is not working, it's opening the add member form instead"* | Both member screens resolved against `MEMBERS`, the **fixture array**, not the live list. In the edit form `existing` was always `undefined`, so Edit rendered Add. The detail screen was worse and unreported: `findIndex` → `-1`, `Math.max` clamped to `0`, and it rendered **the first fixture member** under the tapped person's heading. A defensive clamp turned "not found" into "here is someone else", confidently. | Both read `useMembers`. The detail screen answers loading and missing separately and never substitutes a neighbour. | *(field absent)*. **RC-010 had recorded this exact class 24 hours earlier** and explicitly noted `app/member/[id].tsx` as *"the same class of defect, out of scope"*. It was left. This is it arriving. |
| **RC-011** | 03-Sep | S2 | Audit log said **System** for every email sent, file uploaded, PIN issued | `audit_log()` reads `auth.uid()`, which is null on the **service-role** client every Edge Function uses. So the actor was NULL and `actor_kind` fell through to `'anon'` — the label an *unauthenticated* request carries, in an append-only table that by design cannot be corrected. **The identity was never missing**: four functions carried the actor into the data and dropped it on the way to the log. | `audit_log_as(p_actor, …)`, granted to `service_role` only, and it **raises** on a null actor rather than writing an unattributed row. Pre-session functions are exempt **by name, with their reason written beside them**. | *(field absent)*. Note the gate here has **its own test** that asserts on its **output**, not its exit code — *"a gate guarding a silent defect is silent when it breaks."* |
| **RC-010** | 03-Sep | S2 | Reports figures never moved when the data did | Every figure on the screen was a **literal**. Hardcoded bars, a headline count, a total of `61%`, a period string reading "1–24 Aug" forever. The screen was not computing a wrong answer; **it was not computing.** | Reads the same member rows the dashboard reads; aggregation moved to `src/data/report.ts`. | *(field absent)*. **Amended 07-Sep — and this amendment is the most valuable paragraph in the register.** "A real period control replaced the caption" was **not true when written and stayed untrue for four days**: `setPeriod` had **no call site**. Typecheck was clean (the state *was* used), specs were green (the arithmetic *was* right), and **no test asserted that anything on screen could reach `setPeriod`.** *"Dead state reads exactly like live state from every angle except the running app."* |
| **RC-009** | 03-Sep | **S1** | A genuine Google Meet export was refused, and the message **blamed the file** | `parseMeetCsv` read `lines[0]` as the header. A Meet export writes the meeting code and times **first**, so the header search never looked at the header line. S1 because it blocked the product's one irreplaceable input **while asserting the file was at fault** — sending the operator to check Meet rather than RosiFit. | `findHeader` locates the header wherever Meet put it; the preamble is now captured and shown. | *(field absent)*. **Why it was not caught:** the parser lived beside `document` and `FileReader`, so it was outside the DOM-free program and **could not be unit-tested at all.** |
| **RC-008** | 02-Sep | S2 | *"Add course is not working, it says course is saved but course is not getting stored"* | `save()` was `flash(...)` then `router.back()`. **There was no write of any kind.** The screen was built as a layout with a plausible confirmation, and the confirmation is what made that invisible. | Real writes, awaited; a refusal rendered instead of swallowed; an RLS-refused UPDATE returns **no rows rather than an error**, so that case is checked explicitly — or the same false "saved" returns by another route. | **Yes.** *"Five gates, three ratcheted audits and a contrast checker all passed over a form that persisted nothing. Every one examines the code's shape; none executes a user journey and asserts on the database afterwards."* **Recurrence: five more forms had the same shape and were left, deliberately, as TD-012.** |
| **RC-007** | 02-Sep | **S1** | Live audit: `authenticated` held all five write privileges on **28 of 30 tables**, while two registers stated as a guarantee that it held none | Supabase ships **default privileges** granting ALL on every new `public` object directly to `anon`/`authenticated`. Every table was fully open the instant it was created, and the narrow `grant select` lines added nothing. **135 assertions passed** because `000_local_shim.sql` did not reproduce those defaults — **the harness was stricter than production.** | `0015` revokes and re-grants exactly what each migration asked for, and removes the default-privilege entry so the next table starts closed. **The shim now sets those defaults, so the defect is reproducible before it is fixed.** | **Yes.** The rule required parity "proven by reconstruction" — and the harness reconstructed what the migrations wrote, never what the **platform granted underneath them**. *"A test environment that is safer than production cannot prove a claim about production."* |

### 2b. The framework's own defects — RC-006 → RC-001 (28-Aug)

Kept because they are the same lesson one level up: **the enforcement layer needs its own
enforcement layer.**

| ID | Sev | Root cause | Correction | Lesson |
|---|---|---|---|---|
| **RC-006** | S2 | `writeBaseline`'s header ends with `''` for the trailing newline; `.filter(Boolean)` stripped it, gluing the first entry onto a comment line. **Every 0-entry baseline masked it**; the first 1-entry baseline exposed it. | `.filter(x => x !== null)` | **No gate ever exercised a non-empty round-trip.** All the framework's own baselines were clean, so the writer's output was never read back with content. |
| **RC-005** | **S1** | `lineage --init` recorded already-modified files as `pristine`; `upgrade` then read *pristine + seed differs* as "the framework changed this" and auto-applied over the app's own edit. **Two different histories collapsed into one label.** | `adopted-modified`, sticky, always routed to review | *"A test suite covers the paths it was written from."* The suite existed and passed — it only ever exercised scaffolder-born apps, never adopted ones. |
| **RC-004** | S3 | The gate runner classified any non-zero exit as FAIL. A tool that launches and then fails to **fetch itself** exits non-zero like any other failure — so *"this machine cannot check your code"* was indistinguishable from *"your code is wrong"*. | An `UNAVAILABLE` signature list → **BLOCKED**, exit 3 | A three-valued contract needs a rule in **both** directions: a missing tool is never FAIL *and* never PASS. |
| **RC-003** | S2 | The rule-coverage audit's rung pattern matched `.ts\|.mjs\|.sh` and **not `.tsx`**. Ten rules citing components that did not exist were reported as benign "prose-only" instead of dead. **The audit under-reported the exact defect class it exists to find.** | Pattern extended; 8 rows reclassified DEAD-RUNG and repaired | **A detector's own coverage is a coverage question, and nothing was asking it.** |
| **RC-002** | S2 | Guard G5 accepted **any** `.md` as documentation — and `TEST_SUMMARY.md` is written by the gate runner, which G2 already requires. So **every compliant commit satisfied the documentation guard for free.** The guard was reachable, executing, and could never fire. | G5 excludes gate artifacts | **A guard whose condition is satisfiable by another guard's output can never fire.** Only *executing* it revealed this; a source scan showed a correct-looking guard. |
| **RC-001** | S3 | A reachability test's assertion could not tell **which guard** produced the blocking exit. | The scratch repo now satisfies every downstream precondition | *"Assert on the result, not the precondition."* **The only entry whose process check is a clean "No" — the test found it on first run.** |

---

## 3. The repeat offenders

This is the section to read if you read only one.

### Chain A — the edit form, four rounds, six days

| | Date | Entry | What was actually fixed | What was left |
|---|---|---|---|---|
| 1 | 02-Sep | **RC-008** | Add Course wrote nothing; gave it a real write | Five sibling forms with the same shape — **TD-012**, deliberately left |
| 2 | 04-Sep | **RC-012** | Edit member read the **fixture array**; pointed it at `useMembers` | The **three-way `null`** conflation — invisible because the fixture answered instantly |
| 3 | 06-Sep | **RC-021** | Add-vs-Edit now decided by the **route**; loading/failed/missing answered | Whether the effect **ever re-runs** once its new wait is satisfied |
| 4 | 07-Sep | **RC-025** | `recordPending` added to the dependency array | — |

Four rounds. Each fix was **correct** and each was **narrower than the class**. The register
says it exactly: RC-025's rung-that-wasn't is that RC-021's spec *"checks that the form answers
loading, failed and missing — all three of which this defect answers correctly. Nothing was
watching whether the form ever leaves the state those answers describe."*

**(inference)** The recurring shape is not carelessness. It is that **a fix is verified against
the reported symptom, and the class is one level wider than the symptom every time.** The
process asks for a sibling sweep — and the sweep is scoped to the *mechanism just fixed*, not to
the *outcome the user reported*. RC-021's sweep searched for `.find()` lookups. RC-025 was a
dependency array. Same outcome, different mechanism, missed.

### Chain B — the dialog backdrop, two rounds, one day

RC-016 fixed the opaque panel; **RC-018 was the constant tuned around it, left behind.** Round 1
of RC-018 then verified itself with screenshots the same agent took against a criterion the same
agent chose — *"visible"* and *"legible"* are different claims and nothing forced the distinction.

### Chain C — the class recorded and then left

RC-010 (03-Sep) named `app/member/[id].tsx` as *"the same class of defect, out of scope"*.
RC-012 (04-Sep) is that file, reported by the owner, at **S1**.

**(inference)** *"Out of scope, recorded in the register"* is currently a **terminal state**.
Nothing schedules it, nothing re-raises it, and the register is only read when the next bug in
that area is already being fixed. TD-012, TD-028 and TD-034 are sitting in exactly this position
today.

---

## 4. The root-cause classes

Twenty-six incidents, nine classes. The class is what the framework should learn; the incident is not.

| # | Class | Instances | The one-line rule |
|---|---|---|---|
| **C1** | **A value that means three things.** One `null`/`-1`/empty stands for *not asked*, *not arrived* and *not there*. | RC-021, RC-012, RC-020, RC-005 | A state variable carries **one** fact. If a lookup has three outcomes, the type has three cases. |
| **C2** | **The gate is satisfied by something other than the thing.** Green because it looked at the wrong artefact. | RC-023 (DB spec green, form unguarded), RC-013 (typecheck + export green, wrong build), RC-010 (state used, control absent), RC-008 (5 gates over a form that wrote nothing), RC-002, RC-003, RC-006, RC-007 | **A passing check proves only what it looked at.** Every gate must be able to name the artefact it read. |
| **C3** | **The success shape is returned by a failure path.** | RC-017 (dev provider returns `ok:true`), RC-008 (`flash('saved')` with no write), RC-012 (`?? MEMBERS[0]`) | A degraded fallback, a defensive clamp and an unconditional toast are all the same defect: **they answer in the shape of success.** |
| **C4** | **A rule that exists in exactly one place, invisible from where it must be obeyed.** | RC-023 (CHECK constraint vs form), RC-015 (design divergence in a comment), RC-016 (composition written nowhere), RC-020 (comment records the limitation, not the consequence) | A rule enforced only where the data lands is a rule the user meets as the **store's** error message. |
| **C5** | **Composition.** Two sites, each correct alone, wrong together. | RC-016 (global `screenOptions` × per-screen `presentation`), RC-018 (fixed composition × constant tuned for the broken one), RC-026 (percentage width × flex gap) | When a change repairs a composition, ask: **what was tuned around this?** |
| **C6** | **The environment is not the environment.** | RC-007 (harness lacked the platform's default grants), RC-014 (spec correct, never executed — no PG16), RC-013 (Metro reads its config once; the 8-hour-old dev server), RC-005 (suite only covered scaffolder-born apps) | A harness is evidence about production **only to the extent it reproduces production's defaults.** One that is *stricter* produces false greens, which are worse than reds. |
| **C7** | **A decision computed from a subset of its inputs.** | RC-019 (`false → register`), RC-022 (`'/'` resolved by group position), RC-025 (readiness gate reading two states through one name) | The tell is a mapping that **reads as total** over a domain with a second axis nobody wrote down. |
| **C8** | **Identity assumed, not established.** | RC-024 (label as React key), RC-011 (actor dropped at the service-role boundary), RC-014 (`::date` assumed to raise) | When a change declares a field **non-unique**, sweep every use of that field as an identity. |
| **C9** | **The author is the only witness.** | RC-018 round 1 (self-chosen criterion, self-taken screenshots), RC-010 (fix paragraph written from the plan; the plan's last item silently did not land) | A close-out must cite evidence produced by **something that can disagree with the author.** |

---

## 5. Why the process did not catch them — gate by gate

`scripts/gate-runner.mjs` defines **eleven** steps. Here is what each was doing while the twenty
application defects shipped.

| Step | State in this app | Consequence |
|---|---|---|
| G1 Theme artifacts in sync | **Cannot run** — no `design/tokens.json` (TD-001) | reports FAIL |
| G2 Framework contrast | **Cannot run** (TD-002) — substituted by `scripts/check-contrast.ts`, which is stronger | red step that is actually covered → **trains readers to discount red** |
| G3 Theme assets per theme | **Cannot run** (TD-003) | reports FAIL |
| G4 No hard-coded colours | Runs — **`src/` only** (TD-008) | `app/` unscanned; all 30 screens live there |
| G5 Types | Runs, green | green over RC-013 and RC-010 |
| G6 Lint | **BLOCKED** — no ESLint in this project (TD-004) | — |
| G7 Unit + pure specs | Runs since 02-Sep (TD-005) | green over RC-008, RC-010, RC-023 |
| G8 **Functional / integration** | **Has never run.** No `test:functional` script exists. FAILs with an **empty log** (TD-006) | **This is the single largest gap.** RC-008 says it outright: *"the one step that could have caught this is the one that has never run."* |
| G9 Automation addressability | Runs — `src/` only | — |
| G10 Backward compatibility | **Prints "this gate is INERT" and exits 0** → the runner reads 0 as PASS (TD-007) | a gate reporting PASS while inert |
| G11 Wide tables configurable | Runs — `src/` only | — |

**Three of eleven steps cannot run. One has never run. One reports PASS while inert. Three see
only `src/`, and every screen is in `app/`.** The eleven-step gate is, in practice, four steps
over half the codebase.

Beyond the gate, three capabilities are absent entirely:

1. **Nothing renders a screen.** Not at any viewport. RC-026 (invisible above 393px), RC-018
   (legibility), RC-010 (a control with no call site) and TD-027 (React #418 on **every** route)
   are all the same missing rung. The `.harness/` route checks exist and **are Linux-only, so
   they do not run on the development machine at all.**
2. **Nothing walks a user journey and then asserts on the database.** RC-008, RC-017 and RC-011
   all end with a screen saying one thing and a row saying another.
3. **Nothing checks that a fix reached the running app.** RC-013's amendment and RC-010's
   amendment are both "the repository looked fixed and the app in front of the owner was not".

---

## 6. The quiet cost: 37 change requests

The bug list above is the visible failure. The **37 CHANGE REQUESTs** are the expensive one, and
they are not in any root-cause register because none of them is a bug.

Read their names together:

> `mandatory-field-asterisk` · `autofocus-first-input-field` · `pickers-open-under-their-field` ·
> `compact-date-picker-everywhere` · `calendar-style-all-date-fields` · `member-detail-as-popup` ·
> `dialog-opens-at-top` · `courses-actions-in-header` · `register-form-single-page` ·
> `add-member-single-branch-default` · `add-member-status-toggle-default-active` ·
> `token-chips-arrows` · `overview-two-per-row-donuts` …

**(inference)** These are not thirteen decisions. They are **one decision — "what does a form
look like in this app" — taken thirteen times, one owner report at a time.** Two of them
(`calendar-style-all-date-fields`, `compact-date-picker-everywhere`) are the *same* control
requested twice in two days, and `calendar-style-all-date-fields` is at correction round 2.

The framework does have the right destination for this: **canonical patterns**. CP-017
(the required mark, *"one component draws it"*) and CP-018 (the caret on arrival, *"one field
per surface: two is a race"*) are both excellent — and both were **written after the owner
reported their absence**, not before the forms were built. The pattern register is functioning
as a **post-mortem log**, not as a specification.

---

## 7. Proposed framework enhancements

Ordered by evidence weight — the number of shipped defects each would have caught. Each is
stated domain-free, as `/promote` requires, and each names where it would be enforced.

### Tier 1 — build these

**F-01 · A gate step that has never once passed must BLOCK the release, not FAIL quietly.**
G8 has reported FAIL with an empty log since before RC-008, i.e. for the entire life of the
application. A permanently-red step is indistinguishable from a step nobody has written, and
G2's *correctly* red status (TD-002) trains everyone to read red as noise. Every TD row that
neutralises a gate should carry an **expiry date**, and a step that has never produced a green
run in the project's history should be `BLOCKED`, which RC-004 already established as the
honest third value.
`rung:` `scripts/gate-runner.mjs` — a `neverPassed` classifier reading the run history.
*Would have surfaced:* the conditions behind RC-008, RC-010, RC-017.

**F-02 · One functional rung that walks a journey and asserts on the store.**
This is the missing G8, scoped to the smallest useful thing: for each write form — open it on an
existing record, change one field, save, **read the row back**. It is the only check that can
refute *"it says saved"*.
`rung:` a real `test:functional` script.
*Would have caught:* RC-008 (no write at all), RC-012/RC-021/RC-025 (blank Edit form — the whole
of Chain A), RC-020 (Save with no change closed her override), RC-023 (the constraint the form
never stated).

**F-03 · A render rung that runs on the machine the developer is using.**
Export the app and assert against the **built DOM** at 320/360/393/412px, in both themes. Not
pixels — attributes, counts and geometry. The `.harness/` checks are the right idea and are
Linux-only, which means on this machine they are prose.
`rung:` a Playwright/DOM check over `dist/`, wired into `npm run check`.
*Would have caught:* RC-026 (three keys per row), RC-010 (a control with no call site), TD-027
(#418 on every route); and it is the rung RC-018 explicitly says does not exist.

**F-04 · The close-out cannot be its own witness.**
RC-018's round 1 and RC-010's four-day-untrue sentence are the same failure: a claim about the
running app, verified by the author, against a criterion the author chose. Every claim in a fix
paragraph that describes **rendered behaviour** must cite either a rung path or a named
non-author observation. A fix paragraph is written from the **plan** — so the last item of the
plan silently not landing is invisible by construction.
`rung:` a Definition-of-Done item, plus `check-rule-coverage.mjs` extended to fix-paragraph claims.

### Tier 2 — already learned here, worth promoting on the next sighting

These four are **parked at n=1** in `CANDIDATES.md` and should be promoted the moment a second
app sights them. Listing them here so the second sighting is recognised.

| Cand. | Rule | From |
|---|---|---|
| **CAND-002** | A form opened on an existing record decides create-vs-edit **from the route**, never from its own lookup, and answers loading / failed / missing before it renders. | RC-021 |
| **CAND-003** | A form writing a column with a store-level constraint must **state that constraint itself, before Save**. | RC-023 |
| **CAND-004** | An effect that defers work until a condition is met must be able to run **again** when that condition changes — every input the condition reads belongs in the dependency list, **including one reached through a derived value.** | RC-025 |
| **CAND-005** | A build-time contrast sweep must measure the pair the **screen** renders, not the pair the tokens name. | TD-036 |

Two more classes from this dossier deserve candidate rows and do not have them **(inference)**:

- **New: "the success shape".** *A code path that cannot do the work must not return the value
  that means it did.* — RC-017, RC-008, RC-012. This is arguably the strongest domain-free rule
  in the whole register and it is currently prose in three separate entries.
- **New: "declared non-unique".** *When a change records that a field is not an identity, sweep
  every use of that field as one — keys, lookups, dedupe, sort.* — RC-024, and RC-024's own
  process check asks for exactly this.

### Tier 3 — process rules, no rung feasible

**F-05 · Scope the sweep to the reported outcome, not to the mechanism just fixed.**
Chain A is four correct fixes, each swept along the mechanism it had just repaired. Track C's
sweep step should read: *sweep every site that can produce the **symptom the user reported**,
by whatever mechanism.*

**F-06 · "Out of scope, recorded in TECH_DEBT" must not be a terminal state.**
RC-010 named the file; RC-012 is that file at S1, one day later. A TD row created by a
sibling sweep during an S1 or S2 fix should inherit that severity's schedule, not the backlog's.

**F-07 · Ask the reachability question about outcomes.**
RC-019 was **approved at a gate**. The gate presented a true fact and drew the wrong conclusion.
The missing question is *"can the destination this routes to actually succeed?"* — about
outcomes, not routes. RC-022's entry independently asks for the same thing.

**F-08 · Conventions are specified once, before the forms, not reported one at a time.**
The 37 change requests. A "form and dialog conventions" pass at design time — required marks,
caret placement, picker anchoring, date control, dialog presentation, default values — is one
decision instead of thirteen owner reports. CP-017 and CP-018 are the right artefacts, arriving
in the wrong order.

**F-09 · A design note records the consequence, not only the limitation.**
RC-020's own words. *"Her saved override is not on the Member record"* was written down and
correct; what Save then does with a blank row was not, and that was the destructive half.

---

## 8. What is working — keep these

An honest dossier says what fired.

- **The correction-round counter fired.** `edit-course-opens-empty` was marked *"CORRECTION
  ROUND: 2 — corrected at intake … The requester did not know of that round; the register did."*
  The intake step caught a re-report the reporter could not have known was one. That is the
  system working.
- **The register's "what the previous attempt missed" field.** RC-025 and RC-021 both carry it,
  and it is where Chain A becomes visible at all.
- **Gates that test themselves.** `check-audit-attribution.test.sh` asserts on the audit's
  **output**, not its exit code, precisely because *"a gate guarding a silent defect is silent
  when it breaks."* That is the lesson of RC-002 and RC-003, correctly applied.
- **The refusal to promote at n=1.** Four candidates parked rather than minted into framework
  rules. RC-025's process check declines a framework change for its own lesson and says why.
- **KNOWN_LIMITATIONS requiring a reference.** Four platform limits, each with a citation,
  correctly kept out of the bug register.

---

## 9. One-paragraph summary for the framework owner

Twenty-six root causes in eleven days, fifteen of the seventeen self-assessed as *the process
should have caught this*. The proximate causes are nine recurring classes, but they sit on one
structural fact: **the pipeline reads code and never runs the product.** Three of eleven gate
steps cannot run, one has never run, one reports PASS while inert, and three see only half the
tree. Every S1 in the list — a form that wrote nothing, an email that was never sent, an Edit
form that opened as Add, an audit log that named nobody, table grants that were wide open — is
invisible to a check that reads source and visible to a check that executes a journey and then
looks at the row. The three Tier-1 rungs (functional journey, render-at-viewport, gate honesty)
are the whole of the recommendation; **F-04, the rule that a close-out cannot be its own
witness, is what stops the next twenty-six from being written the same way.**

---

*Working document. Uncommitted and unpushed by instruction. Contents derived from the registers
listed in §Sources; paragraphs marked **(inference)** are analysis, not register text.*
