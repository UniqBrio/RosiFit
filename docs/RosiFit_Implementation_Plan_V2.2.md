# RosiFit — Implementation Plan V2.2 / Design Specification D1.1

| | |
|---|---|
| **Supersedes** | Implementation Plan v2.1 · Design Specification D1.0 |
| **Version** | **V2.2 / D1.1 — 31 August 2026** |
| **Basis** | v2.1 + D1.0 + the confirmed product requirements of 31 Aug 2026 (items 1–45) |
| **Status** | Planning. **No production development.** |

**How to read this.** Requirements are integrated into the sections they belong to, not appended. Each revised section states what it now says and what it supersedes. §14 is the change register, §19 the traceability matrix, §20 the acceptance tests, §21 open questions, §22 the cross-section consistency audit.

Markers: **[C]** confirmed · **[D]** implementation decision · **[Q]** open question.

---

## 1. The seven contradictions this revision resolves

These are places where the new requirements and v2.1 could not both be true. Each is resolved explicitly rather than left for a developer to discover.

| # | Tension | Resolution |
|---|---|---|
| **CR-02** | v2.1 §8.1: *"the mobile number is not editable — the correct operation is disable-and-recreate."* New §35 requires a **Change Mobile Number** flow. | **Mobile becomes changeable**, with verification and audit. This is only safe because v2.1's R-7 fix already re-keyed the PIN derivation from `phone_e164` to the immutable `app_user_id` — so changing a number no longer invalidates the PIN. The earlier fix is what makes this requirement cheap. §10. |
| **CR-03** | v2.1 §24.1 step 2 allowed a **per-send subject and body override**. New §6/§37 forbid free-form composition. | **The per-send editor is removed.** Content comes only from a stored template plus approved values. §8. Removes an editable field from the existing prototype. |
| **CR-04** | v2.1 §16.1 matching led with **email-exact (tier 1)** and had an email fallback. The real CSV has **no email column**. | **Tiers 1 and 2 are dead for attendance imports.** Matching is name-and-alias only. This raises ambiguity sharply and is why alias management moves into the member form. §6. |
| **CR-05** | v2.1 §21.2 had **one global rule with a single basis** (`missed_sessions` XOR `consecutive_missed`). New §3–§5 require **per-course rules with two conditions combined by OR/AND**. | Global config becomes the **default**; course config overrides it; both conditions can be active at once. §7. |
| **CR-06** | v2.1 AD-1 puts `start_time`/`end_time` on the **offering**. New §1 puts Start/End Time on the **Course** form. | Course times are **defaults for new offerings**. The offering's own times, where set, win. A course time never changes an existing offering. §5.2. |
| **CR-07** | v2.1 §11.1 derives `sessions_per_week` from the schedule's weekdays (`GENERATED`). New §1/§2 make **Frequency** a Course field. | Course frequency is a **stated intent**, never a source of expected attendance. Where it disagrees with an offering's weekdays, the UI **warns and shows both**; it never reconciles silently. §5.3. |
| **CR-08** | v2.1 §27.3 has `members.phone_e164`. New §7/§36 remove member phone. | **Removed from the member entity.** Staff mobile is unaffected — it is the sign-in identifier and stays required. These are two different things and must not be conflated. §6.1. |

---

## 2. New confirmed requirements

Continuing v2.1's numbering. Every item below is **[C]**.

| # | Requirement | Source |
|---|---|---|
| C-56 | Course form contains **Course Name, Start Time, End Time, Frequency** only | §1 |
| C-57 | **Course Fee and Course Short Code are removed.** No commercial fields on the course form | §1 |
| C-58 | Course dropdowns use one reusable component with consistent search, clearing, keyboard and mobile behaviour, following the established UniqBrio pattern | §1, §29 |
| C-59 | Frequency is configurable (3–6 sessions/week and others) but is **never the source of truth** for expected attendance | §2 |
| C-60 | Follow-up rules are configurable **per course** | §3 |
| C-61 | Each course rule supports a **weekly missed-session condition** (enable + threshold) | §3 |
| C-62 | Each course rule supports a **consecutive missed-session condition** (enable + threshold) | §3 |
| C-63 | The two conditions combine by **OR** or **AND** | §3 |
| C-64 | Resolution is global default → course-specific → effective | §4 |
| C-65 | **No student-level follow-up rules** | §4 |
| C-66 | The **effective configuration is snapshotted** on every communication decision, for audit | §4 |
| C-67 | The rule UI explains its effect in **plain language** | §5 |
| C-68 | The product provides **message templates only**. No free-form Compose & Send | §6, §37 |
| C-69 | Communication flow: candidates → select → review attendance → **select template** → review generated message → confirm → send | §6 |
| C-70 | **Member phone number is removed** and is never an identity or matching key | §7, §36 |
| C-71 | Aliases are managed **inside the Add/Edit Member form**, with `[+ Add Alias]` | §8 |
| C-72 | Aliases are called **"Google Meet Display Names"** in the interface | §9 |
| C-73 | Members may hold **multiple emails with one primary**, each independently validated, with `[+ Add Email]` | §10 |
| C-74 | **The Google Meet CSV contains: Full Name, First Seen, Time in Call.** Nothing else may be assumed | §10, §45 |
| C-75 | Email always comes from the matched member record, never the CSV | §10 |
| C-76 | Matched member with no email: import attendance, do not duplicate, offer **[Add Email to Existing Member]** or **[Continue Without Email]**; include in reporting, exclude from sends | §11 |
| C-77 | Unmatched name: show **"Member not found"** with **[Add as New Member]**; never invent email, course or branch; course/branch come from the session context | §12 |
| C-78 | Possible match: show **"Possible existing member found"** with **[Use Existing Member] [Add as New Member] [Keep Unmatched]** | §13 |
| C-79 | CSV review distinguishes five outcomes: **A** matched · **B** matched but no email · **C** possible existing · **D** ambiguous · **E** unmatched | §14 |
| C-80 | Every decision affecting member identity, alias or email is audited | §14, §31 |
| C-81 | **Light and dark mode**, user-switchable, preference persisted, not system-only | §15 |
| C-82 | Users may choose the app's primary colour from a **controlled approved set**; contrast is maintained automatically; preference is **per user** and never global | §16 |
| C-83 | **Help & Support** displays **9994871158**. No other channels invented | §17 |
| C-84 | Dashboard has a **date/date-range filter**; every metric states its period | §18 |
| C-85 | Dashboard has a **Course filter** | §19 |
| C-86 | Dashboard has a **Branch filter**, academy-wide or specific, with the scope clearly labelled | §20, §21 |
| C-87 | Dashboard uses **pie/donut infographics** for attendance distribution, sharing the reports' metrics, respecting all filters | §22 |
| C-88 | Dashboard and reports support **week-wise** attendance; grouping is explained when a range spans weeks | §23 |
| C-89 | **Member-wise report** with name, course, branch, expected, attended, missed, %, streak, date/week filtering | §24 |
| C-90 | **Add Holiday** is a quick action on the Dashboard | §25 |
| C-91 | Holiday form takes name/reason, **start date, end date**, and scope (all branches / specific branch), showing affected session count before saving | §26 |
| C-92 | A holiday never counts as expected or missed, never increases a streak, never triggers follow-up, and **never alters a recurring schedule** | §27 |
| C-93 | **Session cancellation stays separate from holiday.** Both are non-countable; both are audited | §28 |
| C-94 | Audit records **WHO · WHAT · WHEN · PREVIOUS VALUE · CURRENT VALUE** across the full entity list | §30 |
| C-95 | CSV match decisions are audited with the previous and new alias configuration | §31 |
| C-96 | Configuration changes are audited field-by-field and are **immutable to application users** | §32 |
| C-97 | Security questions remain **Super Admin recovery only**; never on staff or member forms; answers never exposed | §33 |
| C-98 | Forgot-PIN: Super Admin uses security questions; staff use Admin-assisted reset. **No staff security-question system** | §34 |
| C-99 | **Change Mobile Number** is an authenticated, verified, audited flow; `app_user_id` remains the identity | §35 |

---

## 3. Revised — Course, Branch, Offering and Schedule

*Supersedes v2.1 §10–§12.*

### 3.1 The model, stated once

```
Course  ── defines what is taught, and default timing/frequency
   │
   └─ at a Branch ──► OFFERING  ── the thing that actually runs
                         │        (course + branch + optional batch,
                         │         with its own start/end time)
                         │
                         ├─ OFFERING SCHEDULE ── the weekdays it runs
                         │      (effective-dated; THE source of truth)
                         │
                         ├─ SESSIONS ── one row per date it runs
                         │
                         └─ MEMBER ENROLMENT
                                │
                                └─ MEMBER SCHEDULE OVERRIDE
                                       (a subset of the offering's days)
```

**Expected attendance is derived only from: offering schedule → member enrolment → member override → session.** Nothing on the Course form participates in that calculation.

### 3.2 Course form **[C-56, C-57]**

Fields, and nothing else:

| Field | Type | Purpose |
|---|---|---|
| Course Name | text, required | |
| Start Time | time, optional | **Default** start for offerings created from this course |
| End Time | time, optional | **Default** end |
| Frequency | int 1–7, optional | **Stated intent**, e.g. 6 sessions/week |

**Removed: Course Fee, Course Short Code.**

> **CR-06 resolution.** Course Start/End Time are **defaults that populate a new offering's time fields**. They are copied at creation and never read again. Changing a course's times **does not** change any existing offering, because two branches legitimately run the same course at different hours. The form says so: *"Used as the default time when you add this course at a branch. Existing offerings keep their own times."*

> **CR-07 resolution.** Frequency is **never** read by the attendance engine. It exists to state intent and to catch mistakes. When an offering's schedule has a different number of weekdays than its course's frequency, the offering screen shows both and warns:
> *"This course is set up for 6 sessions a week. This offering runs 4 days (Mon Tue Thu Sat). Attendance is counted from the 4 days."*
> The warning is **informational and never blocks**, because a branch running fewer days than the course intends is legitimate. **[D]**

### 3.3 Course dropdown **[C-58]**

One `CourseSelect` component, used on every screen that picks a course: member form, offering form, dashboard filter, reports filter, CSV session picker. Type-ahead search over name; clearable; full keyboard operation (arrows, Enter, Escape); native picker on mobile; a visible label always, never a placeholder as the only label. **No screen defines its own course dropdown.**

---

## 4. Revised — Follow-up configuration

*Supersedes v2.1 §21 in full.*

### 4.1 Resolution order **[C-64]**

```
Global default configuration
        ↓  (a course may override)
Course-specific configuration
        ↓
EFFECTIVE configuration for that course
        ↓  (snapshotted onto every batch and every evaluation)
Communication decision
```

**No member-level rules exist [C-65].** A member is always evaluated against her course's effective configuration.

### 4.2 Configuration shape **[C-61, C-62, C-63]**

| Field | Values | Global default |
|---|---|---|
| `weekly_enabled` | bool | `true` |
| `weekly_threshold` | int > 0 | `3` |
| `consecutive_enabled` | bool | `false` |
| `consecutive_threshold` | int > 0 | `4` |
| `combination` | `OR` · `AND` | `OR` |
| `min_expected` | int ≥ 1 | `1` |
| `period_type`, `period_length`, `week_start_day`, `recipient_rule`, `resend_policy`, `present_min_minutes` | as v2.1 §21.2 | unchanged |

**At least one condition must be enabled.** A configuration with both disabled is rejected at save with *"Turn on at least one condition, or switch follow-up off entirely."* **[D]**

**`AND` with only one condition enabled behaves as that condition alone** — stated in the UI so it is not read as a bug. **[D]**

### 4.3 Evaluation

```
weekly_hit      = weekly_enabled      AND missed_in_period >= weekly_threshold
                                      AND expected_in_period >= min_expected
consecutive_hit = consecutive_enabled AND current_streak     >= consecutive_threshold

eligible = (combination = 'OR')  ? (weekly_hit OR consecutive_hit)
                                 : (weekly_hit AND consecutive_hit)
```

The **reason string names the condition(s) that fired**, not the rule generally — an operator must be able to see *why this member, today*:
- `Missed 3 of 6 sessions this week`
- `4 consecutive missed sessions`
- `Missed 3 of 6 this week and 4 consecutive` (AND)

### 4.4 Worked examples **[C-38 acceptance]**

| Course | Weekly | Consecutive | Combine | Member | Result |
|---|---|---|---|---|---|
| Fitness | on, ≥3 | on, ≥4 | **OR** | missed 3 of 6, streak 2 | **Eligible** — weekly fired |
| Fitness | on, ≥3 | on, ≥4 | **OR** | missed 2 of 6, streak 4 | **Eligible** — consecutive fired |
| Fitness | on, ≥3 | on, ≥4 | **OR** | missed 2 of 6, streak 2 | Not eligible |
| Yoga | on, ≥2 | on, ≥3 | **AND** | missed 2 of 4, streak 2 | Not eligible — streak short |
| Yoga | on, ≥2 | on, ≥3 | **AND** | missed 3 of 4, streak 3 | **Eligible** — both fired |
| Prenatal Yoga | *(no course config)* | | | missed 3 of 4 | **Eligible** under the **global** default |

### 4.5 Snapshotting **[C-66]**

Every `email_batch` stores the **effective** configuration it used, per course, in `config_snapshot`. A report six months later can state which rule applied. v2.1 already snapshotted a single global config; it now stores a map of course → effective config.

### 4.6 The rule UI **[C-67]**

Reachable from Course → Follow-up Rules, and from Settings for the global default.

```
Follow-up rules — Fitness

  ○ Use the academy default   (weekly missed ≥ 3, OR, consecutive off)
  ● Set rules for this course

    ☑ Weekly missed sessions          Threshold  [ 3 ]
    ☑ Consecutive missed sessions     Threshold  [ 4 ]

    When should a member be listed?
      ● Either condition   (OR)
      ○ Both conditions    (AND)

  ┌──────────────────────────────────────────────────────────────┐
  │ Members in Fitness will be listed for follow-up when they    │
  │ miss 3 or more sessions in the week OR miss 4 consecutive    │
  │ sessions.                                                     │
  │                                                               │
  │ With these settings, 5 members in Fitness would be listed     │
  │ for the current week.            [ Preview the list ▸ ]       │
  └──────────────────────────────────────────────────────────────┘

                                        [ Cancel ]  [ Save rules ]
```

The plain-language sentence is **generated from the values**, never hardcoded, so it cannot drift. The live count is computed before saving.

---

## 5. Revised — Member model

*Supersedes v2.1 §9.*

### 5.1 Fields **[C-70]**

`full_name` · `name_normalized` (generated) · `status` · `status_changed_at` · `joined_on` · `notes` · audit columns. (`member_code` is nullable, historical and unread — retired in `0026`, ADR 006.)

**`phone_e164` is removed.** A member's phone was never used for matching and is not required by the attendance system.

> **Do not confuse this with staff.** `app_users.phone_e164` remains **required** — it is the staff sign-in identifier. §10 governs changing it.

### 5.2 Google Meet Display Names **[C-71, C-72]**

Aliases are now edited **inline in the Add/Edit Member form**, not only discovered through CSV review.

```
Google Meet display names
These are the names that may appear in the Google Meet attendance file.

  Shazia                         confirmed by Priya · 22 Aug     [ Remove ]
  Shazia F                       confirmed by Rosi  · 08 Aug     [ Remove ]
  Shazia Farheen                 canonical name

  [ + Add display name ]

Adding a name here means the attendance file will match it to this member
automatically.
```

Rules carried forward from v2.1 §16.3, all still binding: an alias is unique across the whole academy, so a name can never point at two members; every alias records who confirmed it; **aliases never create a separate member record**.

### 5.3 Emails **[C-73]**

```
Email addresses

  ●  shazia@example.com          Primary   ✓ Valid       [ Remove ]
  ○  shazia.f@work.example.com             ✓ Valid       [ Make primary ] [ Remove ]

  [ + Add email ]

Follow-up emails go to the primary address only.
```

Each address validated independently. Exactly one primary when any exist. A bounced primary shows the warning and the fix (v2.1 §9.2), unchanged.

### 5.4 Member form, final field list

Name · Branch → Course → Offering · Joined on · Google Meet display names · Email addresses (one primary) · Optional individual schedule · Notes.

**No phone. No fee. No commercial fields.**

---

## 6. Revised — CSV format, matching and review

*Supersedes v2.1 §15–§17. This is the largest change in V2.2.*

### 6.1 The authoritative CSV format **[C-74]**

| Column | Meaning | Used for |
|---|---|---|
| **Full Name** | Google Meet display name | **The only identity signal** |
| **First Seen** | when they joined | Session-date derivation **[Q-D1]**, ordering |
| **Time in Call** | duration | The present-threshold rule |

**There is no email column. There is no course or branch column. There is no member ID.**

`app_settings.csv_mapping` is therefore seeded as:
```json
{ "name_column": "Full Name", "email_column": null,
  "duration_column": "Time in Call", "first_seen_column": "First Seen",
  "required_columns": ["Full Name"] }
```

Three consequences, each significant:

**(a) Matching is name-only.** v2.1's tier 1 (email exact) and tier 2 (email alias) can never fire on an attendance import. They remain in the code for the **member import** file (§6.6), which may carry email, but the attendance ladder is now:

| Tier | Key | Outcome |
|---|---|---|
| 1 | Confirmed **display-name alias**, exact after normalisation | `matched` (A) |
| 2 | **Canonical name**, exact after normalisation, exactly one member | `matched` (A) |
| 2b | Canonical name, exact, **more than one member** | `ambiguous` (D) |
| 3 | Fuzzy ≥ 0.90, exactly one candidate | **`possible` (C)** — never auto-accepted |
| 3b | Fuzzy ≥ 0.90, several candidates | `ambiguous` (D) |
| 4 | nothing | `unmatched` (E) |

**This makes aliases load-bearing rather than a convenience** — which is why C-71 moves them into the member form. Expect a high review burden on the first few imports and near-zero thereafter, as aliases accumulate.

**(b) `Time in Call` makes the present-threshold rule live.** v2.1's `present_min_minutes` (OQ-1) was inert without a duration column. It now functions. Default stays **0** — any appearance counts — until RosiFit says otherwise.

**(c) Session date cannot come from a column** unless `First Seen` carries a date as well as a time. **[Q-D1]** Until confirmed, the date comes from the filename pattern or the operator's explicit choice in wizard step 1, which v2.1 already requires.

### 6.2 The five review outcomes **[C-79]**

| | State | Screen behaviour | Blocks import? |
|---|---|---|---|
| **A** | Matched | Listed; overridable | No |
| **B** | **Matched, no email** | *"Member identified, but no email is configured."* → **[Add Email to Existing Member]** · **[Continue Without Email]** | **No — attendance imports either way** |
| **C** | **Possible existing member** | *"Possible existing member found."* → **[Use Existing Member]** · **[Add as New Member]** · **[Keep Unmatched]** | **Yes** |
| **D** | Ambiguous | Candidates listed with context; explicit selection required | **Yes** |
| **E** | Unmatched | *"Member not found."* → **[Add as New Member]** · link to existing · skip | **Yes** |

### 6.3 Outcome B in detail **[C-76]**

```
Row 88 — matched
"Meena Raj"                                        52 min

  ✓ Matched to Meena Raj · RF-000204 · Prenatal Yoga · Salem

  ⚠ Member identified, but no email is configured.
     Her attendance will still be recorded. She will not be included
     in follow-up emails until an address is added.

     [ Add email to existing member ]     [ Continue without email ]
```

**Never creates a duplicate.** Attendance imports regardless. She appears in every attendance report and is counted in every metric; she is excluded from sends with a visible reason.

### 6.4 Outcome C in detail **[C-78]**

The new state, and the one that prevents duplicate members.

```
Row 47 — possible existing member
"Shazia"                                           58 min

  Possible existing member found:

    Shazia Farheen  ·  RF-000118
    Prenatal Fitness · Coimbatore · joined 4 Jan 2026
    Last attended Thu 28 Aug
    Known display names: "Shazia F", "Shazia Farheen"

  [ Use existing member ]   [ Add as new member ]   [ Keep unmatched ]

  ☑ Remember "Shazia" as a display name for this member
```

**Use existing** links the row and, if ticked, stores the alias. **Add as new member** must first pass the duplicate guard in §6.5. **Keep unmatched** records the row as not-a-member without creating anything.

### 6.5 Creating a member from the import **[C-77]**

Pre-filled from the row, fully editable, and **nothing is invented**:

| Field | Source |
|---|---|
| Name | The CSV's Full Name |
| Course / Branch / Offering | **The session being imported** — never guessed from the file |
| Joined on | The session date, editable |
| Email | **Blank.** The CSV has none, and none is fabricated |
| Display name alias | The CSV name, added automatically |

Before saving, the normalised name is re-checked. If it resembles an existing member, the operator must tick **"Yes, this is a different person"** to continue. **[C-80]** The creation, the alias and the duplicate acknowledgement are all audited.

### 6.6 Member import file — a separate thing

The go-live register import (v2.1 §9.3) is **not** the attendance CSV and may carry email, course and branch. Its mapping is separate. Nothing in §6.1 applies to it. Stated because conflating the two is the likeliest misreading.

---

## 7. Revised — Communication

*Supersedes v2.1 §24 steps 1–2 and §37.*

### 7.1 Templates only **[C-68, C-69]**

```
Follow-up candidates
      ↓ select members
Review attendance and reason
      ↓
SELECT A MESSAGE TEMPLATE          ← no free-form composition
      ↓
Review the generated message (real values, per recipient)
      ↓
Confirm  →  Send  →  Result
```

**Removed:** the per-send editable subject and body, and the "save my edits as a new template" affordance. **This is a live change to the existing prototype**, which still exposes an editable subject field.

**Template management** lives at Settings → Message Templates: view · add · edit · activate/deactivate · preview. Editing a template is a deliberate, audited act — not something done in passing while sending.

### 7.2 Supported values

`member_name` · `first_name` · `course_name` · `branch_name` · `period_from` · `period_to` · `expected_sessions` · `attended_sessions` · `missed_sessions` · `attendance_pct` · `consecutive_missed` · `last_attendance_date` · `academy_name`

Unchanged from v2.1 §24.2: values render **server-side from the engine**, are stored per message, and an unknown token is a save-time error. `{{ }}` is visible **only** in the template editor.

### 7.3 What did not change

Idempotency, suppression, the exclusion display, retry-only-failed, per-recipient results and the zero-expected block all carry forward from v2.1 §24.4 unaltered.

---

## 8. Revised — Holidays and cancellation

*Supersedes v2.1 §14.*

### 8.1 Holiday **[C-91, C-92]**

Now a **date range with a scope**, not a single date.

| Field | |
|---|---|
| Name / reason | required |
| Start date | required |
| End date | required, ≥ start |
| Scope | **All branches** · **A specific branch** |

**Impact shown before saving [C-91]:**

```
Diwali · 20–22 October 2026 · All branches

  12 scheduled sessions will be marked as Holiday.
     Prenatal Fitness · Coimbatore   6 sessions
     Prenatal Yoga · Salem           4 sessions
     Postnatal Recovery · Erode      2 sessions

  ✓  No completed session is affected.
  ✓  No member's schedule is changed. This applies to these dates only.

                                       [ Cancel ]  [ Apply holiday ]
```

**Behaviour [C-92]** — a holiday session: is not expected · is not missed · does not extend a streak · does not trigger follow-up · **does not alter any recurring schedule**. Removing the holiday returns those sessions to `scheduled`. A **completed** session is never converted by a holiday.

**Quick action [C-90]:** `+ Add Holiday` sits on the Dashboard. A festival is decided at short notice and the person deciding should not have to go three levels into Settings.

### 8.2 Cancellation stays separate **[C-93]**

| | Holiday | Cancellation |
|---|---|---|
| Scope | A date range, all or one branch | **One session** |
| Reason | Festival, closure | Weather, trainer unavailable, low turnout, other |
| Counts? | Never | Never |
| Audited | `holiday.added/removed` | `session.cancelled/uncancelled` |

Both are non-countable; they are recorded separately because they answer different questions when someone asks why a week looks thin.

---

## 9. Revised — Dashboard

*Supersedes v2.1 §22 and D1.0 §8.*

### 9.1 Filters **[C-84, C-85, C-86]**

```
Branch [ All branches ▾ ]   Course [ All courses ▾ ]   [ 01 Sep – 07 Sep ▾ ]
                                                        [ + Add Holiday ]

Academy-wide attendance · 1–7 September 2026
```

**Every filter applies to every metric and every chart.** The scope line above the metrics states what is being shown — *"Academy-wide attendance"* or *"Coimbatore branch attendance"* **[C-86]** — so an organisation-wide number can never be misread as branch-specific.

The period appears on the page **and on each tile** whose value depends on it **[C-84]**. Metrics from different periods are never shown together without labelling.

### 9.2 Content

| Block | Notes |
|---|---|
| Needs attention | Awaiting upload · follow-up candidates · members with no email · staff awaiting PIN |
| **Add Holiday** | Quick action **[C-90]** |
| Attendance distribution | **Donut: Present / Absent / Not expected [C-87]** |
| Week-wise attendance | Expected · attended · missed · % per week **[C-88]** |
| Follow-up summary | Candidate count, by course |
| Recent uploads | Latest imports and their outcomes |
| Member-wise drill-down | Into the member report **[C-89]** |

### 9.3 Charts **[C-87]**

**Charts read the same functions as the reports.** `member_period_metrics` and its course/branch aggregates are the only source; no chart computes its own numbers. This is what makes the donut and the report reconcile by construction.

Donut segments: **Present · Absent · Not expected**. "Not expected" is shown because leaving it out makes a member with a 4-day override look like a 6-day member with poor attendance.

A chart that does not change a decision is not built.

### 9.4 Week grouping **[C-88]**

Weeks are Mon–Sun in IST (`week_start_day`). When a selected range does not align to week boundaries, the view states how it grouped: *"3 weeks — partial weeks at each end are shown separately."* **[D]**

---

## 10. Revised — Identity, mobile number, PIN

*Supersedes v2.1 §6.3, §8.1.*

### 10.1 Change Mobile Number **[C-99]** — CR-02

v2.1 refused this and required disable-and-recreate. It is now supported.

**Why it is now safe:** v2.1's R-7 fix re-keyed the PIN derivation from `phone_e164` to the immutable `app_user_id`. The PIN survives a number change untouched. Had the derivation still keyed on the phone, this requirement would have invalidated every affected PIN.

Flow: authenticate with current PIN → enter new number → verify **[Q-D2: verification method]** → apply. Recorded: previous number, new number, who initiated, who approved, timestamp.

`app_user_id` remains the identity everywhere. The mobile is a **credential input**, not an identifier.

### 10.2 Security questions and forgot-PIN **[C-97, C-98]**

Unchanged from v2.1 and restated because the requirement asks for it: security questions exist for **Super Admin recovery only**; they never appear on staff or member forms; answers are never displayed after being set, only replaced. Super Admin recovers via questions; **staff request a reset from an Admin**. There is no staff security-question system.

---

## 11. New — Theme and appearance

*New section. D1.0 §6.3 declared light-only; superseded.*

### 11.1 Light and dark **[C-81]**

Both modes on every screen, user-switchable, **preference persisted per user**, never system-only. The switcher is reachable from Settings → Appearance and from the More sheet on mobile.

Both themes must hold for: body and secondary text, input borders, table rows and headers, status indicators, modals, **charts**, form validation states, navigation, focus rings.

### 11.2 User-selected primary colour **[C-82]**

A **controlled set** of approved primary colours, not a free colour picker.

**[D] How contrast is guaranteed.** Each approved colour ships as a **pre-measured pair** — an on-light variant and an on-dark variant — each verified at **≥4.5:1 for text** and **≥3:1 for interactive borders and focus rings** against the surfaces they sit on, in both themes. The set is validated at build time by the same measurement used for the base palette; a candidate that fails on any surface in either theme does not enter the set. **The user picks from measured options, so no runtime calculation can go wrong.**

Seed set (each requiring measurement before it ships): the RosiFit magenta as default, plus a small number of alternates.

**Preference is per user [C-82].** One staff member's choice never changes another's. The brand plum for app chrome is **not** user-configurable — only the accent.

### 11.3 Help & Support **[C-83]**

Displays **9994871158**, reachable from the More sheet and Settings, tappable to dial on mobile. **No other channel is invented** — no email address, no chat, no hours, unless RosiFit supplies them.

---

## 12. Database changes

Additive migrations `016`–`021`. No applied migration is edited.

### 016 · `courses` reshape
```sql
ALTER TABLE courses
  DROP COLUMN fee,                    -- C-57 (if present)
  DROP COLUMN code,                   -- C-57 short code
  ADD COLUMN default_start_time time,
  ADD COLUMN default_end_time   time,
  ADD COLUMN default_frequency  smallint CHECK (default_frequency BETWEEN 1 AND 7);
COMMENT ON COLUMN courses.default_frequency IS
  'Stated intent only. Expected attendance is derived from offering_schedules.weekdays. Never read by the engine.';
```

### 017 · `members` reshape
```sql
ALTER TABLE members DROP COLUMN phone_e164;   -- C-70
-- app_users.phone_e164 is untouched: it is the staff sign-in identifier.
```

### 018 · Course-level follow-up **[C-60…C-64]**
```sql
CREATE TABLE course_follow_up_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id),
  weekly_enabled       boolean NOT NULL DEFAULT true,
  weekly_threshold     int     NOT NULL DEFAULT 3 CHECK (weekly_threshold > 0),
  consecutive_enabled  boolean NOT NULL DEFAULT false,
  consecutive_threshold int    NOT NULL DEFAULT 4 CHECK (consecutive_threshold > 0),
  combination          text    NOT NULL DEFAULT 'OR' CHECK (combination IN ('OR','AND')),
  min_expected         int     NOT NULL DEFAULT 1 CHECK (min_expected >= 1),
  is_active            boolean NOT NULL DEFAULT true,
  updated_by uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz,
  CHECK (weekly_enabled OR consecutive_enabled)     -- at least one condition
);
CREATE UNIQUE INDEX one_active_config_per_course
  ON course_follow_up_config (course_id) WHERE is_active;
```
`follow_up_config` (global) gains the same six condition columns and the same `CHECK`, becoming the default row.

New: `effective_follow_up_config(p_course uuid)` returns the course row if one is active, else the global row. `follow_up_candidates()` is rewritten to evaluate both conditions and combine them per §4.3.

### 019 · Holiday date range **[C-91]**
```sql
ALTER TABLE holidays
  RENAME COLUMN holiday_date TO start_date;
ALTER TABLE holidays
  ADD COLUMN end_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD CONSTRAINT holiday_range_valid CHECK (end_date >= start_date);
-- branch_id NULL already means "all branches"
```
The apply/remove triggers now walk the range rather than one date.

### 020 · Appearance **[C-81, C-82]**
```sql
CREATE TABLE user_preferences (
  app_user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  theme_mode   text NOT NULL DEFAULT 'system' CHECK (theme_mode IN ('light','dark','system')),
  accent_key   text NOT NULL DEFAULT 'rosifit',   -- key into the approved, pre-measured set
  updated_at   timestamptz DEFAULT now()
);
```
Per user, never global. RLS: a user reads and writes **only their own row**.

### 021 · Mobile-number history **[C-99]**
```sql
CREATE TABLE mobile_number_changes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  app_user_id uuid NOT NULL REFERENCES app_users(id),
  previous_phone_e164 text NOT NULL,
  new_phone_e164      text NOT NULL,
  initiated_by uuid NOT NULL REFERENCES app_users(id),
  approved_by  uuid REFERENCES app_users(id),
  verification_method text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
```

### Unchanged and still binding
`member_aliases` (already supports multiple per member, unique academy-wide) · `member_emails` (already multi with one primary) · `attendance_records` and its `status <> 'absent' OR expected` CHECK · `session_expectations` · `audit_logs` append-only.

**`csv_profiles` / `app_settings.csv_mapping` reseeded** to §6.1's three columns with `email_column: null`.

---

## 13. Audit — consolidated

*Supersedes v2.1 §34.*

### 13.1 The record **[C-94]**

Every audited event carries **WHO · WHAT · WHEN · PREVIOUS VALUE · CURRENT VALUE**, with previous/current as a `changes` array of `{field, old, new}`. Events with no prior value record `old: null` explicitly rather than omitting the field.

### 13.2 Coverage **[C-94, C-95, C-96]**

Members · member emails (add, remove, primary change, status) · **display-name aliases (add, remove, confirmed-by)** · courses · **course follow-up rules** · branches · offerings · offering schedules · member schedule overrides · **holidays (add, change, remove, with range and scope)** · **session cancellations** · attendance corrections · global follow-up configuration · **message templates** · staff (create, update, disable, enable, remove) · PIN generation and reset · **mobile number changes** · CSV uploads · **CSV import decisions** · communication actions · settings · subscription.

### 13.3 CSV decisions **[C-95]**

Each review decision is audited individually, with the alias configuration before and after:

```
WHO       Priya Menon
WHEN      31 Aug 2026, 10:32
WHAT      CSV match decision · import #482, row 47
ENTITY    Member · Shazia Farheen (RF-000118)
DECISION  Matched to existing member
PREVIOUS  Display names: "Shazia F", "Shazia Farheen"
CURRENT   Display names: "Shazia F", "Shazia Farheen", "Shazia"
```

Audited decisions: matched to existing · added as new member · **possible-match resolved (which way)** · email added · alias added or removed · match rejected · duplicate acknowledged ("yes, different person") · continued without email.

### 13.4 Never logged

PINs (plain, temporary, derived **or hashed**) · security answers · passwords · AWS credentials · Supabase service-role keys · any secret. Enforced by the shared `audit_log()` redaction pass, not by convention.

### 13.5 Immutability **[C-96]**

`UPDATE` and `DELETE` revoked from every role **including `service_role`**, plus a raising trigger. Unchanged from v2.1 §27.6 and restated because the requirement calls it out.

---

## 14. Change register — what moved where

| New req | Integrated into | Supersedes |
|---|---|---|
| 1, 2 Course form, frequency | §3 | v2.1 §10 |
| 3, 4, 5 Course follow-up rules | §4 | **v2.1 §21 in full** |
| 6, 37 Templates only | §7 | **v2.1 §24.1 step 2** |
| 7, 36 No member phone | §5.1 | v2.1 §9.1, §27.3 |
| 8, 9 Aliases in the member form | §5.2 | v2.1 §9.4 (extends) |
| 10 Multiple emails | §5.3 | v2.1 §9.2 (restates) |
| 10, 45 Real CSV columns | §6.1 | **v2.1 §15.3, §16.1** |
| 11, 12, 13, 14 CSV outcomes A–E | §6.2–6.5 | v2.1 §16–§17 |
| 15, 16 Theme and accent | §11 | **D1.0 §6.3 (light-only)** |
| 17 Help & Support | §11.3 | new |
| 18–24, 39 Dashboard | §9 | v2.1 §22, D1.0 §8 |
| 25, 26, 27, 28 Holiday and cancellation | §8 | v2.1 §14 |
| 29 Course dropdown | §3.3 | new |
| 30, 31, 32 Audit | §13 | v2.1 §34 (extends) |
| 33, 34 Security questions, forgot PIN | §10.2 | v2.1 (restates) |
| 35 Change mobile | §10.1 | **v2.1 §8.1** |
| 40, 41 Design updates | §15 | D1.0 |
| 43, 44 Traceability, tests | §19, §20 | |

---

## 15. Design specification changes (D1.1)

### 15.1 Design tracks

| | Track | Status |
|---|---|---|
| D1 | CSV upload & matching | **Revised** — five outcomes, no email column, possible-match state |
| D2 | Weekly attendance & communication | **Revised** — template selection replaces composition |
| D3 | Schedule change preview | Unchanged |
| **D4** | **Holiday & session calendar** | **New** — range, scope, impact preview, quick action |
| **D5** | **Course management** | **New** — 4-field form, follow-up rules, dropdown component |
| **D6** | **Member management** | **New** — aliases and emails inline, no phone |
| **D7** | **Follow-up configuration** | **New** — two conditions, OR/AND, plain-language preview |
| **D8** | **Message templates** | **New** — management only, no compose |
| **D9** | **Dashboard filters & infographics** | **New** — branch/course/date, donut, week-wise |
| **D10** | **Audit log** | **New** — who/what/when/previous/current |
| **D11** | **Appearance / theme** | **New** — light/dark, approved accents |
| **D12** | **PIN & mobile management** | **New** — change PIN, change mobile, recovery |

**D1, D2 and D3 remain the highest-risk screens.** D1 changes most: the review screen now carries five outcomes instead of four, and the possible-match state is the one that prevents duplicate members.

### 15.2 State coverage **[41]**

Every major screen designs: **loading · populated · empty (no data) · empty (not configured) · error**, plus where relevant **permission/access · validation · confirmation · success · partial failure**.

Partial failure applies specifically to: email send (some sent, some failed), CSV import (rows skipped as invalid), bulk member import (some rows blocked).

### 15.3 Screen inventory delta

Added to D1.0's 53: **Course follow-up rules** · **Holiday create with range and scope** · **Appearance / theme settings** · **Change mobile number** · **Help & Support** · **Dashboard filter bar with scope label** · **Attendance donut** · **Week-wise view** · **CSV outcome B (no email)** · **CSV outcome C (possible member)**.

Removed: **Compose message (free-form)** — deleted, not redesigned **[C-68]**.

Net: **62 screens.**

---

## 16. Validation rules added

| Field | Rule | Message |
|---|---|---|
| Course name | 2–80 chars, unique | "A course with this name already exists." |
| Course end time | > start time | "End time must be after the start time." |
| Course frequency | 1–7 | "Enter between 1 and 7 sessions per week." |
| Follow-up thresholds | > 0 | "Enter a number greater than 0." |
| Follow-up conditions | ≥1 enabled | "Turn on at least one condition, or switch follow-up off." |
| Holiday end date | ≥ start | "The end date must be on or after the start date." |
| Holiday scope | required | "Choose all branches or a specific branch." |
| Member email | valid, unique academy-wide | "Already used by John Kumar (RF-000118)." |
| Member alias | unique academy-wide | "\"Shazia\" is already a display name for Shazia Khan." |
| Member primary | exactly one when any exist | — |
| New mobile | E.164, not already in use | "This mobile number is already registered." |
| Accent colour | member of the approved set | — (UI offers no invalid option) |

---

## 17. Edge Function changes

| Function | Change |
|---|---|
| `send-email-batch` | **Accepts `template_id` only.** Per-send `subject`/`body` overrides **removed** **[C-68]**. Resolves the effective config per course and snapshots it **[C-66]** |
| `csv-stage` | Emits five outcomes; no email tier; `possible` state added |
| `csv-resolve-row` | New decisions: `use_existing`, `keep_unmatched`, `continue_without_email`; each audited with prior/next alias set **[C-95]** |
| `members-upsert` | Phone removed; aliases and emails accepted inline **[C-71, C-73]** |
| `courses-upsert` | **New** — 4 fields; rejects fee and short code |
| `course-followup-upsert` | **New** — validates ≥1 condition, thresholds > 0; audited field-by-field |
| `holidays-upsert` | **New** — range + scope; returns affected-session count for the preview before apply |
| `auth-change-mobile` | **New** — current PIN, verification, writes `mobile_number_changes`, audits **[C-99]** |
| `preferences-upsert` | **New** — own row only; accent must be in the approved set |

`email-events-webhook`, `auth-login`, `auth-set-pin`, `auth-recover-pin`, `staff-admin`, `bootstrap-super-admin`, `admin-renew-subscription` unchanged. **Public (`verify_jwt=false`) remains exactly five** — no new function is public.

---

## 18. Security review of the new surface

| Change | Risk | Control |
|---|---|---|
| Course-level rules | Staff widens a rule to mail everyone | Rule editing is **Super Admin only**; thresholds `CHECK > 0`; live preview count before save; field-level audit |
| Per-user accent | A colour breaks contrast | Users pick from a **pre-measured** set; no free colour input reaches the server |
| Change mobile | Account takeover by changing a number | Requires current PIN + verification; both numbers, initiator, approver and time recorded; identity stays `app_user_id` |
| Member phone removed | — | Reduces PII held. No control needed |
| Aliases in member form | A wrong alias silently misroutes attendance | Academy-wide uniqueness constraint; every add/remove audited with who confirmed |
| Templates only | — | **Reduces** risk: staff can no longer send arbitrary text to members |
| Dashboard filters | A branch-scoped user infers other branches | No RBAC exists in V1 — all staff already see all branches. Not a new exposure. Noted so it is not mistaken for one |

---

## 19. Requirement traceability

Every new requirement maps to UI, backend, database, security, audit and test.

| Req | UI | Backend | Database | Security | Audit | Test |
|---|---|---|---|---|---|---|
| C-56 Course fields | D5 Course form | `courses-upsert` | 016 | SA-only write | `course.*` | T1 |
| C-57 No fee/code | D5 | validation | 016 drops | — | — | T2 |
| C-58 Dropdown | `CourseSelect` | — | — | — | — | T-UI |
| C-59 Frequency | D5 + offering warning | — (never read) | 016 | — | `course.*` | T1 |
| C-60–63 Course rules | D7 | `course-followup-upsert` | 018 | SA-only | field-level | T3–T7 |
| C-64 Inheritance | D7 "use default" | `effective_follow_up_config()` | 018 | — | — | T8 |
| C-66 Snapshot | Batch detail | `send-email-batch` | `email_batches.config_snapshot` | — | batch audit | T3–T8 |
| C-67 Plain language | D7 | generated string | — | — | — | T3 |
| C-68 Templates only | D8; compose deleted | `send-email-batch` | — | narrows input | `template.*` | T30, T31 |
| C-70 No member phone | D6 | `members-upsert` | 017 | less PII | `member.*` | T-form |
| C-71/72 Aliases | D6 inline | `members-upsert` | `member_aliases` | UQ academy-wide | `member.alias_*` | T15, T33 |
| C-73 Emails | D6 | `members-upsert` | `member_emails` | UQ | `member_email.*` | T14, T32 |
| C-74 CSV format | D1 | `csv-stage` | `csv_mapping` | — | `attendance.previewed` | T9 |
| C-76 No email (B) | D1 outcome B | `csv-resolve-row` | — | — | decision audit | T11 |
| C-77 New member (E) | D1 outcome E | `csv-resolve-row` | `members` | duplicate guard | `member.created_from_import` | T13 |
| C-78 Possible (C) | D1 outcome C | `csv-stage` | — | explicit selection | decision audit | T12 |
| C-79 Five outcomes | D1 | `csv-stage` | `csv_import_rows.match_status` | import blocked | — | T10–T13 |
| C-81 Light/dark | D11 | `preferences-upsert` | 020 | own row only | — | T26, T27 |
| C-82 Accent | D11 | `preferences-upsert` | 020 | approved set | — | T28, T29 |
| C-83 Help | More sheet, Settings | — | — | — | — | T-UI |
| C-84–86 Filters | D9 | metric fns | — | — | — | T21–T23 |
| C-87 Charts | D9 donut | same metric fns | — | — | — | T25 |
| C-88 Week-wise | D9 | `week_bounds` | — | — | — | T24 |
| C-89 Member report | Reports | `member_period_metrics` | — | — | — | T-report |
| C-90–92 Holiday | D4 + quick action | `holidays-upsert` | 019 | SA-only | `holiday.*` | T16–T19, T36 |
| C-93 Cancellation | D4 | column-guarded update | — | — | `session.cancelled` | T20 |
| C-94–96 Audit | D10 | `audit_log()` | `audit_logs` | immutable | — | T32–T37 |
| C-97/98 Questions, PIN | D12 | `auth-recover-pin` | `super_admin_recovery` | never displayed | `auth.*` | T38–T40 |
| C-99 Mobile change | D12 | `auth-change-mobile` | 021 | PIN + verification | `auth.mobile_changed` | T41, T42 |

---

## 20. Acceptance tests

The 42 required scenarios, each with the assertion that makes it meaningful.

| # | Scenario | Passes when |
|---|---|---|
| T1 | Create course | Name, start, end, frequency saved |
| T2 | No commercial fields | Fee and short code absent from form **and** API |
| T3 | Course-specific config | Course rule saved and used in place of global |
| T4 | Weekly threshold | Member at threshold listed; one below not |
| T5 | Consecutive threshold | Streak at threshold listed; one below not |
| T6 | **OR** | Either condition alone lists the member |
| T7 | **AND** | Only both together list the member |
| T8 | Fallback | Course with no config evaluated on the global rule |
| T9 | CSV format | File with only Full Name / First Seen / Time in Call parses; **no email inferred** |
| T10 | Alias match | "Shazia" matches Shazia Farheen via a confirmed display name |
| T11 | Matched, no email | Attendance imported; no duplicate; excluded from send with reason |
| T12 | Possible member | Three actions offered; none auto-applied; import blocked until chosen |
| T13 | Add as new | Course/branch from session; **email blank**; duplicate guard fires on a similar name |
| T14 | Multiple emails | Several stored; exactly one primary; send uses primary |
| T15 | Alias add/remove | Both audited; academy-wide uniqueness enforced |
| T16 | Holiday over several sessions | All in range marked; count matches the preview |
| T17 | Branch holiday | Only that branch affected |
| T18 | All-branch holiday | Every branch affected |
| T19 | Holiday excluded | Not expected, not missed, streak unchanged, no follow-up |
| T20 | Cancellation excluded | Same, via the separate path |
| T21 | Branch filter | Every metric **and chart** reflects the branch; scope label changes |
| T22 | Course filter | Same |
| T23 | Date filter | Same; period shown on the page and on period-dependent tiles |
| T24 | Week-wise | E/A/M/% per week; grouping explained on a partial range |
| T25 | Charts | Donut totals equal the report totals for identical filters |
| T26 | Light mode | Every screen; contrast measured |
| T27 | Dark mode | Every screen; contrast measured |
| T28 | Accent choice | Applies to the chooser only; another user unaffected |
| T29 | Contrast after choice | Every approved accent passes 4.5:1 text and 3:1 UI in **both** themes |
| T30 | Template selection | Send uses the chosen template |
| T31 | **No free-form compose** | No screen and **no API field** accepts arbitrary subject or body |
| T32 | Audit email change | Who/when/previous/current recorded |
| T33 | Audit alias change | Same |
| T34 | Audit schedule change | Old and new weekdays recorded |
| T35 | Audit follow-up config | Every changed field, old → new |
| T36 | Audit holiday | Range and scope recorded |
| T37 | Audit CSV decision | Decision plus prior/next alias configuration |
| T38 | SA security questions | Set at registration; never displayed after |
| T39 | SA forgot PIN | Recovery via questions; unknown number gives the same shape |
| T40 | Staff forgot PIN | Admin-assisted only; **no staff security questions anywhere** |
| T41 | Change mobile | Requires current PIN + verification; old PIN still works after |
| T42 | Audit mobile change | Previous, new, initiator, approver, timestamp |

Carried forward unchanged: every v2.1 engine test (`missed ≤ expected`, streak examples, historical safety, awaiting-upload, frozen expectation) and every security-matrix test.

---

## 21. Open questions

| # | Question | Interim | Owner |
|---|---|---|---|
| **Q-D1** | Does **First Seen** carry a date, or only a time? Determines whether the session date can be derived from the file. | Date comes from the filename or the operator's choice at step 1. | RosiFit |
| **Q-D2** | How is a **mobile number change verified**? v2.1 deliberately has no SMS provider. | Super-Admin approval, recorded as `approved_by`, with no SMS. If SMS is wanted, it is an added integration and cost. | RosiFit |
| **Q-D3** | Which **accent colours** are approved, and how many? | RosiFit magenta as default plus a small set; each measured before shipping. | RosiFit |
| **Q-D4** | Should **`present_min_minutes`** now be non-zero, given Time in Call is available? | Stays **0** — any appearance counts. | RosiFit |
| **Q-D5** | Is the course/offering **frequency mismatch** a warning or a block? | Warning, never a block. | RosiFit |
| **Q-D6** | May staff edit **course-level follow-up rules**, or Super Admin only? | **Super Admin only**, consistent with organisation configuration. | RosiFit |
| **Q-D7** | Does removing member phone require **migrating existing data**? | No production data exists yet. If it does at cutover, export before dropping. | Provider |
| **Q-D8** | Should **Help & Support** carry hours or a name? | Number only, exactly as given. | RosiFit |

Carried forward from v2.1: Q-01 (a full sample file — §6.1 resolves the columns but not the encoding, delimiter or a real row set), Q-03 (member register), OQ-4…OQ-13.

---

## 22. Cross-section consistency audit

Every check the revision brief names, plus the ones the changes created.

### 22.1 Statements corrected

| Stale claim | Where it was | Now |
|---|---|---|
| "global follow-up rule only" | v2.1 §21, §22; D1.0 §25.1 | §4 — global is the **default**; course rules override |
| "single basis (`missed_sessions` XOR `consecutive_missed`)" | v2.1 §21.2 | §4.2 — both conditions can be active, combined OR/AND |
| "CSV contains email" — matching tier 1 | v2.1 §16.1 | §6.1 — **no email column**; tiers 1–2 dead for attendance |
| "email_column: 'Email'" in the mapping seed | v2.1 §15.3 | §6.1 — `null` |
| "Member phone number" | v2.1 §9.1, §27.3 | §5.1 — removed. **Staff mobile untouched** |
| "per-send subject/body override" | v2.1 §24.1 step 2 | §7.1 — removed |
| "save my edits as a new template" | v2.1 §24.1 | §7.1 — removed |
| "the mobile number is not editable" | v2.1 §8.1 | §10.1 — changeable, verified, audited |
| "Light only in V1" | D1.0 §6.3 | §11.1 — light **and** dark, plus per-user accent |
| "holiday_date" single date | v2.1 §14, §27.2 | §8.1 — start and end date |
| four CSV review outcomes | v2.1 §13.5 | §6.2 — **five** (possible-match added) |
| "9 screens" / "19 screens" | earlier design prompt drafts | §15.3 — **62** |

### 22.2 Consistency checks passed

| Check | Result |
|---|---|
| Course frequency never feeds expected attendance | ✔ §3.2, comment on the column, T1 |
| Offering schedule remains the only expectation source | ✔ §3.1, unchanged from v2.1 §18.3 |
| Member override still a subset of offering days | ✔ unchanged |
| Course times never override an existing offering | ✔ §3.2 |
| Holiday and cancellation both non-countable, separately recorded | ✔ §8.2, T19, T20 |
| Holiday never alters a recurring schedule | ✔ §8.1, C-92 |
| Charts and reports share one metric source | ✔ §9.3, T25 |
| Dashboard filters apply to metrics **and** charts | ✔ §9.1, T21–T23 |
| Audit uses WHO/WHEN/PREVIOUS/CURRENT throughout | ✔ §13.1 |
| No free-form compose in UI **or** API | ✔ §7.1, §17, T31 |
| Aliases unique academy-wide | ✔ §5.2 |
| Email always from the member record | ✔ §6.1, C-75 |
| Security questions Super-Admin-only | ✔ §10.2, T40 |
| `app_user_id` is identity; mobile is a credential | ✔ §10.1 |
| Public Edge Functions still exactly five | ✔ §17 |
| Every new write path audited | ✔ §13.2, §19 |
| Contrast maintained for every accent, both themes | ✔ §11.2, T29 |

### 22.3 Contradictions found while auditing, and resolved

1. **`AND` with one condition disabled** would have been unreachable-but-savable. Resolved: `CHECK (weekly_enabled OR consecutive_enabled)`, and the UI states that AND with one condition behaves as that condition.
2. **Course frequency vs offering weekdays** had no defined behaviour on disagreement. Resolved: warn, show both, never reconcile (§3.2, Q-D5).
3. **Holiday range vs the existing unique index** `(holiday_date, branch_id)` cannot express overlapping ranges. Resolved: the index is replaced by an application-level overlap check in `holidays-upsert`, since two holidays legitimately overlapping (a regional festival inside a national one) must not be blocked outright. **[D]**
4. **`possible` (C) vs `ambiguous` (D)** could collapse into one state. Kept separate: C has **one** candidate and offers "add as new"; D has **several** and does not. Merging them would lose the duplicate-prevention prompt that C exists for.
5. **Removing member phone** conflicted with the prototype's staff form, which also has a phone field. Confirmed distinct: staff mobile is the sign-in identifier and is required; only the **member** field is removed (§5.1).
6. **Per-user accent vs the brand.** A fully user-themed app would let a staff member change the plum chrome. Resolved: **accent only**; brand chrome is fixed (§11.2).

---

## 23. What this changes in the existing prototype

The published prototype now diverges from the plan in four places. Listed so nobody demos it as current.

| Prototype today | V2.2 requires |
|---|---|
| Send flow has an editable **Subject** field | Template selection only — remove the field |
| Weekly review uses a **single global rule** | Per-course effective rule, with the reason naming the condition |
| CSV review has **four** outcomes | Five — add "possible existing member" |
| Dashboard has **no filters** | Branch, course, date range, scope label, donut, week-wise, Add Holiday |

Not yet built at all: course form, course follow-up rules, holiday range flow, appearance settings, change-mobile, Help & Support.

---

## 24. Definition of done — additions to v2.1 §45

- [ ] A course exists with only name, start, end and frequency; no fee or short-code field exists in the UI or the API
- [ ] Two courses carry different follow-up rules, one OR and one AND, and members in each are evaluated against the correct effective configuration
- [ ] A course with no rule of its own falls back to the global default, demonstrably
- [ ] A real Google Meet file with only Full Name / First Seen / Time in Call imports end to end
- [ ] A member is matched by a display-name alias that was added from the member form, not from an import
- [ ] A matched member with no email has attendance recorded and is excluded from a send with a visible reason
- [ ] A "possible existing member" prompt prevented a duplicate, and the decision is in the audit log
- [ ] A holiday spanning three days across all branches marked exactly the previewed number of sessions, changed no schedule, and altered no streak
- [ ] The dashboard donut and the member report agree for the same branch, course and date range
- [ ] Every approved accent colour passes 4.5:1 text and 3:1 UI contrast in both light and dark, measured
- [ ] A staff member's accent choice is invisible to every other user
- [ ] No screen and no API field accepts free-form email content
- [ ] Help & Support shows 9994871158
- [ ] A mobile number change is recorded with previous, new, initiator, approver and timestamp — and the user's PIN still works afterwards
- [ ] Every audit entry shows WHO, WHEN, PREVIOUS and CURRENT; none contains a PIN, answer or secret

---

## 25. Pending — Claude Design canvas import

The canvas at `claude.ai/design/p/bad08bc9-3991-4929-b5d3-ddddbfe0e4b8` (`RosiFit App.dc.html`, `support.js`, `assets/rosifit-logo.png`) **could not be read from this session**. `DesignSync` requires design-system authorization and `/design-login` cannot run in a non-interactive remote session; fetching the canvas URL directly returns HTTP 403. No `.dc.html` file exists anywhere in the workspace.

**Unblocked by:** the user triggering **Send to Claude Code Web** on that project, which seeds the files into the workspace.

**On arrival, before implementing anything, diff the canvas against this document:**

| Check | Why it matters |
|---|---|
| Does the canvas preserve **Course → Branch → Offering → offering_schedules** as the expectation source? | A canvas that puts times or frequency on the course, or drops the offering layer, contradicts §3.1 and would silently change how expected attendance is computed |
| Does the send flow expose any **free-form subject or body**? | §7.1 / C-68 forbids it. The current prototype still has one (§23) |
| How many **CSV review outcomes** does it show? | Must be five, not four — the *possible existing member* state (§6.2, C-78) is what prevents duplicate members |
| Does any screen show a **member phone**, **course fee** or **course short code**? | Removed by C-70 and C-57 |
| Does the CSV screen assume an **email column**? | The authoritative file has none (§6.1, C-74) |
| Does it show behaviour the product does not have? | Anything not traceable to a **[C]** item in §2 is scope the canvas invented, and is not implemented |
| Do the theme tokens follow the 3-state pattern? | Bare `:root`, `prefers-color-scheme` guarded by `:not([data-theme="light"])`, and `[data-theme="dark"]` — §11.1 |

Divergences are reported and resolved **before** any implementation, not merged silently. Where the canvas and this document disagree on a confirmed requirement, this document wins; where they disagree on a visual or interaction decision the document does not fix, the canvas wins.

---

## 26. Canvas intake — diff of `RosiFit App.dc.html` against V2.2

Files received: `RosiFit App.dc.html` (285 KB, 3 144 lines), `support.js` (69 KB), plus the design zip (logo, 24 screenshots, prior prompt revisions). The canvas is a single reactive template (`sc-if` / `sc-for`) with a 480 × 1040 phone preview, dark-default with `html[data-rf-theme="light"]` override. Brand tokens match: `--rf-accent:#D6157F`, `--rf-deep:#5C0F63`.

### 26.1 Conformance — verified present

| V2.2 requirement | Canvas | Evidence |
|---|---|---|
| C-79 five CSV outcomes | ✔ | `OUTCOME` map labels `A · MATCHED`, `B · NO EMAIL`, `C · POSSIBLE MEMBER`, `D · AMBIGUOUS`, `E · NOT FOUND`; `blocks:true` on C/D/E |
| C-76 outcome B actions | ✔ | *"Add email to existing"* · *"Continue without email — attendance still imports · excluded from sends, with the reason shown"* |
| C-77 outcome E invents nothing | ✔ | *"Course and branch come from Fri 22 Aug · Prenatal Flow"*; *"No email, course or branch is invented"* |
| C-78 outcome C three actions | ✔ | Use existing · Add as new · Keep unmatched, with *"Nothing is applied until you choose"* |
| **C-68 no free-form compose** | ✔ | **Zero `<textarea>` in the file.** Stages are `pick → review → result`; subject renders read-only with *"The wording is fixed."*; editing routes to Settings |
| CR-06 course times are defaults | ✔ | *"Used as the default when you add this course at a branch. Existing offerings keep their own times."* |
| CR-07 frequency never counted | ✔ | *"Frequency states your intent. Attendance is never counted from it — it comes from the weekdays on each offering."* |
| C-70 no member phone | ✔ | No member phone field; `fPhone` (staff) retained as the sign-in ID |
| C-56/57 course form | ✔ | Name · start · end · frequency. No fee field, no short code |
| C-61–63 per-course rules | ✔ | Weekly + consecutive with thresholds; *"Either condition (OR)"* / *"Both conditions (AND)"* |
| C-83 Help & Support | ✔ | `9994871158`, tappable, in More and Settings |
| C-84–87 dashboard | ✔ | Branch + course + range filters, Academy-wise / Branch-wise tabs, donut |
| C-91 holiday range | ✔ | Start and end date with scope |

**The canvas is ahead of the published prototype**, which still carries all four §23 divergences. It should become the reference, not the prototype.

### 26.2 Findings — resolve before implementing

**F-1 · Blocking · contradicts C-99.** The Profile screen renders the mobile number as immutable:
```js
{ label:'Mobile number', value:'+91 80563 29742',
  note:'Your sign-in ID — it cannot be changed', lockIcon:'lock' }
```
That is v2.1 §8.1, which **C-99 reversed** (see CR-02). The canvas is also self-contradictory: its only *"Change mobile number"* button sits on the **sign-in / PIN screen** — a pre-authentication affordance — whereas C-99 requires an **authenticated** flow gated on the current PIN. *Fix: remove the lock and the "cannot be changed" note from Profile; add the authenticated change-mobile flow (§10.1); keep or drop the sign-in button as a separate recovery decision.*

**F-2 · High · measured WCAG failure in light mode.** `--rf-accent-200` (the derived tint) is used as a **text colour in 38 places** and is **never redefined for light mode** — `html[data-rf-theme="light"]` redefines only the `--rf-t-*` neutrals. Measured against the light surface `#FFFFFF`:

| | Accent as text (white on it) | Accent as border on light surface | **Tint as text on light surface** |
|---|---|---|---|
| Worst across the hue wheel | 4.53 ✔ | 4.53 ✔ | **1.43 ✘** |
| Best across the hue wheel | 9.90 ✔ | 9.90 ✔ | **2.18 ✘** |
| Required | 4.5 | 3.0 | 4.5 |

**It fails at every hue, and equally for the six preset accents** — the RosiFit pink tint `#F5A8CE` on white is ≈1.6:1. The guard in `customPalette()` darkens only until *white text on the accent* clears 4.5:1, which it does correctly; the derived `tint`, `deep` and `avatar` shades pass through unmeasured. *Fix: derive a separate light-mode tint by darkening rather than lightening, and put it inside the same guard loop — the measurement must cover every surface the token lands on, in both themes.*

**F-3 · Medium · C-82 letter vs spirit.** The Appearance screen offers six named accents **plus a free 0–359 hue slider** labelled *"Any colour you like"*. C-82 says *"a controlled set of approved theme colours… do not allow arbitrary colours that could break accessibility"*, and §11.2 chose a pre-measured set precisely so no runtime calculation could go wrong. The measured guard does make the *accent* safe at every hue, so this is a product policy call rather than an accessibility failure — but it is only defensible once F-2 is fixed, since today the slider ships a failing tint. **[Q-D3 now needs a second answer: approved set only, or set + guarded custom?]**

**F-4 · Gap · C-94 / D10 unbuilt.** The audit log is a stub — `press: () => this.flash('Audit log is next up')` — and the canvas's own closing note lists it among what is not yet designed. Audit is called out as a high-priority requirement; the screen needs designing.

**F-5 · Gap · C-74 not surfaced.** The strings *"Full Name"*, *"First Seen"* and *"Time in Call"* appear **nowhere** in the file. The upload screen should name the authoritative columns, so an operator handed a different export can tell immediately that it will not parse.

**F-6 · Minor · off-model content.** One template is *"Fee reminder"* (`Subject: Fee due for {course}`), present to demonstrate deactivation. C-57 removed every commercial field from the product; a fee template implies a capability RosiFit does not have. Rename to something the product actually does — a paused-enrolment or schedule-change note.

### 26.3 Resolution rule applied

Where the canvas and this document disagree on a confirmed requirement, this document wins (F-1). Where the disagreement is a visual or interaction decision this document does not fix, the canvas wins — its five-outcome review, template-only send flow and offering-first course copy are **better than the prototype's** and are adopted here.

---

*End of V2.2 / D1.1. Planning only — no production development.*
