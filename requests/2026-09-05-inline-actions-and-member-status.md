# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: five asks over two screens, named by the requester with four screenshots —
  the course detail (`app/course/[id].tsx`, screenshots 1 and 2's reference app) and the
  Attendance tab's course list (`app/(tabs)/courses.tsx`, screenshots 3 and 4's reference app).
- CURRENT BEHAVIOUR:
  1. Course detail's week strip puts `‹` and `›` on a row of their OWN, the week label centred
     between them, with the seven day cards on a separate row below.
  2. The roster card's Edit sits on its own footer row under a divider, three lines below the
     Active/Inactive pill it belongs beside.
  3. Active/Inactive is DERIVED (`member.expected === 0`) and cannot be set by anyone. The
     `members.status` column has existed since 0006 and nothing writes it; `follow_up_candidates()`
     (0009 line 97) already filters `m.status = 'active'`, so the app and the database currently
     DISAGREE about who is eligible for follow-up.
  4. The course card's Edit and Delete sit on their own footer row at the foot of the card.
  5. The course detail's Members section offers "Add Member" and "Bulk Import" side by side, and
     both scroll away with the page.
- DESIRED BEHAVIOUR: requester's exact words —
  "place the arrows just behind the date card as shown in the atatched image of uniqbrio app and
  bring edit icon in same line as inactive status is appearing and also enable the feature of
  marking member as active and inactive. also same applies to edit and delete icon in courses
  screen refer 4th image should be in same line as in uniqbrio app. Remove bulk import from
  members screen only keep add member at top and it should be freezed even when user scroll the
  button should not diappear."
  Scoped at the first gate, requester's words: "remove only from attendnace tab where members are
  displayed. Not from where courses are shown" — so ask 5 lands on the course detail's Members
  section ONLY; the Attendance tab's own Add Member / Bulk Import pair is untouched.
- WHY: `unknown` for asks 1, 2, 4 and 5 — stated as a layout preference against a reference app.
  Ask 3 is a capability that does not exist.
- MUST NOT CHANGE: everything not named above. In particular the Attendance tab's Add Member /
  Bulk Import pair (scoped out by the requester), `/member/import` itself, the roster chevron on a
  course card, every copy string not listed below, and the follow-up RULE — an inactive member is
  excluded because the database already excludes her, not because the rule changed.
- CORRECTION ROUND: 1

## DESIGN SURFACE
- VISUAL?: yes — four of the five asks are layout.
- SCREENS & STATES TOUCHED: `/course/[id]` (default, loading, error, empty roster, no-email
  section) and `/(tabs)/courses` (default, empty, filtered-empty). Both themes.
- STRINGS ADDED OR ALTERED: the status toggle's confirmation (title + body + buttons) and its
  accessibility labels are NEW. Nothing existing is reworded.
- PERMISSIONS: marking a member active/inactive is any signed-in active staff member, the same
  gate as editing her (`is_active_app_user() and is_subscription_writable()`), enforced inside the
  RPC. Bulk Import stays super-admin-only where it survives.

## STANDING INSTRUCTIONS (do not edit)
- Track B is SURGICAL: every changed line must trace to this request.
- Close out with `checklists/DEFINITION_OF_DONE.md`, then the test gate.
