# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: **One member's record** — `app/member/[id].tsx`, opened by tapping a
  member on a course roster (`app/course/[id].tsx`, `course-member-<id>`), and — the same
  route — from the member list (`(tabs)/members`) and the weekly follow-up list
  (`(tabs)/weekly`). Shown in the requester's two screenshots: the roster the tap happens on,
  and the full page it opens.

- CURRENT BEHAVIOUR (read in the file, 2026-09-06): the tap PUSHES A PAGE. The record wears
  the academy shell (header + Home · Reports · More pill), a full-width plum gradient header
  with a back button, three large tiles (Expected / Attended / Missed), two more (Attendance
  this week / Current missed streak), a heading *Her sessions this week* over one bordered
  card per session, an email panel, and a *Reach out* button with an icon-only Edit beside it.
  On a wide window every tile stretches across a third or a half of the screen and the whole
  thing is a long scroll; the roster it was opened from is gone while it is read.

- DESIRED BEHAVIOUR: requester's exact words — *"On click of a member a page appears with
  lengthy details of member enhance the ui such that it should appear as pop up on top of
  screen with minimal but yet full info of sessions and others but minimal and simpler ui
  think as senior design engineer and implement"*.

  Read as: the record opens as a **pop-up over the screen it was opened from** (this
  requester's own meaning of "on top of screen", settled at the gate of
  `requests/2026-09-05-dialog-opens-at-top.md`: the same dialog card the forms use, with the
  screen behind it visible and blurred), carrying **the same facts in less room** — her
  sessions this week and "others" (her figures, her email, the two actions) — in a **simpler
  layout**. Nothing is to be dropped; it is to be denser and quieter.

- WHY: `unknown` as stated. Evident from the ask and the screenshot: "lengthy" — a page-sized
  layout for what is a glance at one person, and losing the roster underneath.

- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. In particular: WHICH facts are
  shown (expected, attended, missed, attendance %, current missed streak — streak and missed
  still separately labelled; every session of the week, holidays and cancellations still
  listed with why they do not count (C-92); email on file or *No usable email*, last
  contacted); the two actions (**Reach out** → `/send`, Edit → `member/edit`); the route
  `/member/<id>` and the three places that open it; the live member lookup (guardrail 1 —
  never another person's figures under her name); the loading, error and not-on-register
  answers; both themes; guardrail 3 (every status keeps its word and its icon).

- CORRECTION ROUND: 1 on this surface.

## DESIGN SURFACE
<!-- Filled whenever anything the user sees changes. "not visual" is a claim the diff will be checked against. -->
- VISUAL?: yes — the whole ask is the layout.
- SCREENS & STATES TOUCHED: `member/[id]` in every state — ready (with sessions / with no
  sessions this week), loading, error, not-on-register. Offline and permission-denied: as
  today (the error answer; the route is open to every signed-in role). The three screens
  that open it are touched only in that what opens is now over them, not instead of them.
- STRINGS ADDED OR ALTERED: the requester gave no words. Every string on the record stays
  byte for byte (*Her sessions this week*, *Email on file*, *No usable email*, *Reach out*,
  the session rows, the error message). The only string the change may ADD is the visible
  word for the Edit control, which today is an icon with a spoken label only.
- PERMISSIONS: no — same roles reach the same record.
- RUN MODE: auto (not stated).

## OPEN QUESTIONS — the requester did not settle these; taken at the gate
- **Q1. Does the pop-up apply to all three ways in, or only the course roster?** The route is
  one screen; the requester named the roster because that is where the screenshot was taken.
  **Taken: the route becomes a dialog**, so all three open it the same way — one record, one
  presentation, as every form already is (ADR 009).
- **Q2. What does "minimal" drop?** **Taken: nothing** — MUST NOT CHANGE binds the facts. What
  goes is the chrome: the shell, the gradient header, the per-tile cards, the per-session
  cards, the icon-only edit.

## STANDING INSTRUCTIONS (do not edit)
- Track B is SURGICAL: read the actual current files first (B1), run the impact analysis with
  the sibling call-site sweep (B2) BEFORE proposing, produce the plan with regression risks
  (B4) — confirm mode waits for approval; auto mode (default) logs it and applies —
  touching only what DESIRED BEHAVIOUR requires. Every changed line must trace to this request.
- MUST NOT CHANGE seeds the plan's "deliberately NOT changing" list; the plan may add to it,
  never subtract.
- If VISUAL?=yes, the plan carries the correction design pass (B4), scoped to the touched
  area: states, both themes in semantic tokens, the string table, the permission answer.
- CORRECTION ROUND ≥ 2: before proposing anything, read the previous attempt and state what it
  missed and why (B1). If the miss was the process's fault, flag `/framework-update` too.
- Close out with `checklists/DEFINITION_OF_DONE.md`, then the test gate. Nothing merges
  without a PASS.
