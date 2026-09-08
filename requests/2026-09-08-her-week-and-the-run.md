# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

> **Why CHANGE and not BUG, and where it IS a bug.** Two things arrived as one complaint.
> The *number* is correct everywhere and always was, so its wording is a CHANGE. The member
> pop-up's **Her sessions this week** list is not — it was a fixture, and that half is a
> genuine defect fixed inside the same surgical pass because the two are unreadable apart:
> the run cannot be checked against a list that belongs to somebody else.

## FIELDS
- FEATURE / SCREEN: the course roster card — [app/course/[id].tsx](../app/course/%5Bid%5D.tsx) —
  and the member pop-up — [app/member/[id].tsx](../app/member/%5Bid%5D.tsx). The requester
  attached screenshots of both (Aishwarya Nair, Gentle Yoga, week 7–13 Sep 2026).
- CURRENT BEHAVIOUR:
  - The roster card's second line reads `Missed 7–13 Sep 2026: 1 · consecutive 6`.
  - The pop-up's figure strip reads `EXPECTED 1 · ATTENDED 0 · MISSED 1 · MISSED STREAK 6`.
  - **Her sessions this week** lists `sessionsFor(m)` — `MEMBER_WEEK` in `src/data/mock.ts`,
    six hard-coded rows (Mon 18 Aug–Sat 23 Aug, *Prenatal Flow · Google Meet*, an Onam holiday,
    a coach who was unwell) returned for **every** member, **every** course and **every** week.
- DESIRED BEHAVIOUR: requester's exact words —
  "in member card there is sentence as consecutive 6 what does that mean 1.6 consecutive when
  the frequency is 5 days for course and we have removed follow up for 4 consecutive session .
  that is confusing and also in reach out form the missed streak is 6 how i am unable to
  understand", then "go ahead and implement what is good in perspective of end user he should
  not be puzzling".
  Read as three things:
  1. name the run for what it is and date it, so a reader can verify it;
  2. stop it sitting inside a strip that promises the week;
  3. make the session list under it **hers**, so the two can be reconciled at all.
- WHY: three readings collide on one card. `consecutive 6` on a five-day-a-week course looks
  arithmetically impossible (it is not — the run counts SESSIONS and carries across weeks:
  Mon 31 Aug–Fri 4 Sep, then Mon 7 Sep). Beside `Missed this week: 1` it reads as a second,
  contradictory count of the same thing. And the word *consecutive* names a follow-up trigger
  the course form withdrew (0030), printed directly under the banner stating the trigger that
  does decide — while the list below it showed another member's August sessions, so nothing
  on the card could be checked against anything else on it.
- MUST NOT CHANGE:
  - **The number itself.** `member_stats.current_streak` and `current_streak_for()` are correct
    and are not touched. No migration; no schema change; nothing is recomputed.
  - The follow-up rule and who it selects — `src/data/followup.ts`, `follow_up_candidates()`,
    the trigger panel and its `member-trigger` testID. This is wording, and it decides nothing.
  - Every fact on the pop-up: expected, attended, missed, attendance %, the run, the email
    panel, *Last contacted*, the rule label and its `member-rule-label` testID, the footer
    **Edit** / **Reach out** pair and where Reach out goes, the two tabs and *Her details*,
    the `member-close` testID, and the loading/missing branches.
  - Holidays and cancellations stay LISTED and keep saying why they do not count (C-92);
    "no sessions" stays its own row.
  - The offline fixture path — `MEMBER_WEEK` still backs the demo, through the same
    `sessionsFor`.
- CORRECTION ROUND: 1

## DESIGN SURFACE
- VISUAL?: yes.
- SCREENS & STATES TOUCHED: `/course/[id]` (the roster card's miss line only) and
  `/member/[id]` (the *This week* tab). States: a run of 0, of 1, of many; a member who has
  never attended (no `last_present_date`); a week with a holiday, a cancellation, a completed
  session she was not expected at, a day awaiting a file, a day still to come; a member
  enrolled at nothing; her week failing to load. Both themes.
- STRINGS ADDED OR ALTERED: the miss line, the figure label (*Missed streak* → *Missed in a
  row*), the run's sentence, the two section labels (*This week · <week>* and
  *Her sessions · <week>*), and the session detail lines. The word *consecutive* is gone from
  both screens and is asserted gone (`src/data/streak.test.ts`).
- PERMISSIONS: no. `fetchMemberWeek` reads `sessions` and `attendance_records`, both of which
  `authenticated` already holds SELECT on; nothing is writable from either surface.
- USAGE: the roster card is the most-read line on the course screen and the pop-up is opened
  to decide whether to reach out — so a number nobody can check is read many times a day.
- RUN MODE: `auto`.
- SCALE: `scoped`.

## UNKNOWN — not covered by the description
- **Whether the run should be hidden entirely on a weekly-only course.** It is kept: it is the
  one fact on the card that survives a week boundary, and a member six sessions gone is worth
  seeing whatever fires the follow-up. Naming and dating it was taken as the smaller, truer
  fix. Trim at the gate if the requester disagrees.
- **Whether the run should be narrowed to ONE course.** `current_streak_for(p_member_id)` takes
  no course filter, so a member enrolled at two courses would have one run spanning both, shown
  on each course's card. LATENT, not live: 0006 allows one active enrolment and production has
  no member on more than one course (checked 8 Sep 2026). Left alone — narrowing it is a
  migration, and this request is wording.
- **Which week the pop-up lists.** Not stated; it lists `currentWeek()`, the week its own
  figures are already counted over. The strip on the course screen steps weeks; the pop-up
  does not, and this change does not add that.
