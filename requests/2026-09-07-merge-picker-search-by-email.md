# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: Course detail (`app/course/[id].tsx`) → a member card's "Add display name to
  existing member" → the `Who is “<name>”?` picker (`SearchPicker`, `src/components/Sheet.tsx`).
- CURRENT BEHAVIOUR: The picker searches the member NAME only (`usePickerQuery` filters on
  `o.label`), its placeholder says "Search by name", and each row shows `course · branch` as its
  only secondary text. Two members with the same name and no active enrolment render as two
  identical rows reading `Kavitha Ramesh — · —`.
- DESIRED BEHAVIOUR: "enable seach by name and email ID" — the picker matches a typed query
  against the member's name AND her email addresses; and (second round of input, with a
  screenshot) "Show email id next to name", so a row carries enough to tell two same-named
  members apart. The same message reported "When user selected a name already, it is not
  searching properly" — see THE THIRD THING below, which is a defect, not a preference.
- WHY: The requester met two indistinguishable "Kavitha Ramesh" rows in this picker and could
  not tell which was which. The picker commits a MERGE — attendance moves and a member is
  retired — so picking the wrong same-named row is not a recoverable mistake.
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. Named explicitly because they are
  the nearest things: the course roster's own "Search by name or email" box; the two-step
  stage-then-confirm flow, its confirm note and its wording; which members the picker offers
  (still every member but this one); the other pickers built on `SearchPicker` /
  `AnchoredPicker` / `usePickerQuery` must keep behaving exactly as they do.
- CORRECTION ROUND: 1

## THE THIRD THING — "it is not searching properly" (a DEFECT, found in the screenshot)
The requester's second screenshot shows the picker with a query typed, listing **four**
"Kavitha Ramesh" rows — a query that matches neither of them — with a fifth row highlighted
"Rohini · Selected" while the confirm sentence underneath reads "…becomes a display name for
**Divya Balakrishnan**". Three different people in one sheet, over an irreversible merge.

ROOT CAUSE: `src/components/Sheet.tsx` drew its rows as
`results.map(o => <PickerChoice key={o.label} …>)`. Two members called "Kavitha Ramesh" are
two React children carrying ONE key, and React's own warning for that says what follows —
children "duplicated and/or omitted". The staged VALUE was a member id and was right the whole
time; the row painted over it was reconciled from somebody else's. The file's own note at
`Sheet.tsx:96-101` had already recorded that labels stopped being unique and moved `onSelect`
onto `value` for exactly this reason — the KEY was left behind on the label.

Both call sites are keyed this way (`SearchPicker` and `AnchoredPicker`), so the sweep is both.
This is in scope: it is the same rows the requester cannot tell apart, and no amount of email
on a row helps if the row is drawn from another member's props.

## THE SECOND HALF OF THE ASK — "why 2 Kavitha Ramesh"
Answered at intake from the live register, so Track B does not re-derive it. **Not a display
bug: they are two different people-shaped rows in the database.**

- `RF-000105` (`79e79f0d…`) — Kavitha Ramesh, active, email `kavitha+rf-000105@example.com`,
  one enrolment, **status `ended`**, Zumba Basics · Anna Nagar.
- `RF-000106` (`b498f05e…`) — Kavitha Ramesh, active, email `kavitha+rf-000106@example.com`,
  one enrolment, **status `ended`**, Yoga Flow · Velachery.
- Both `created_at 2026-09-02 08:29:22Z`, neither soft-deleted. 10 of the 21 live members have
  no active enrolment.

Why they show HERE and not on the course's member list: `fetchMembers`
(`src/data/repository.ts:126`) reads enrolments with `.eq('status','active')`, so an ENDED
enrolment leaves `course`/`branch` as `'—'` (`repository.ts:191-192`). The course roster keeps
only `m.course === course?.name` (`app/course/[id].tsx:132`), which `'—'` never satisfies — so
they are filtered off every roster. The picker's options are the UNFILTERED member list
(`allMembers` at `app/course/[id].tsx:919`), which is deliberate: a display name may point at
any member on the register. So the same two rows are correctly absent there and correctly
present here; only their `— · —` meta made them unreadable.

Whether those two Kavitha rows should be merged, or whether ended enrolments should read as
something other than `—`, is a register question for the requester and is EXPLICITLY OUT of
this change. No data is edited by this request.

## DESIGN SURFACE
- VISUAL?: yes
- SCREENS & STATES TOUCHED: the `Who is “<name>”?` sheet on course detail only — its search
  field, its option rows, and its no-match empty state. Loading, error, offline and
  permission-denied are unaffected (the sheet opens over already-loaded data).
- STRINGS ADDED OR ALTERED: the picker placeholder "Search by name" → the requester's own words
  for the same thing, matching the roster box already on this screen: "Search by name or email".
  Plus ONE string the copy gate required and proposed: "No email on file" on a row for a member
  who has none — verbatim the phrase this same screen already prints (`app/course/[id].tsx:803`)
  and the roster row prints (`src/components/MemberRow.tsx:51`), under C-76 ("a member with no
  address is counted and named, never silently dropped"). Not a new coinage; a reuse.
  Everything else on the sheet is frozen — title, confirm note, `Add as display name`, Cancel,
  and the `emptyNote` the course screen passes in.
  **The confirm note was altered during the build and REVERTED at the copy gate.** It had been
  made to read "…for Kavitha Ramesh (kavitha+rf-000106@example.com)…". The gate's verdict, which
  stands: the sentence was frozen by this very file, it was never the thing that was wrong (the
  row was), the address is already printed one line above it, and it desynchronised the confirm
  from the success toast three lines below, which still names her without an address. Recorded
  rather than quietly dropped — if the address IS wanted in that sentence, it is a one-line
  amendment to DESIRED BEHAVIOUR and a separate change.
- PERMISSIONS: no — same screen, same role, same reads.
- USAGE: occasional and consequential — used when an imported attendance name has no address
  and turns out to be somebody already on the register; unknown how often beyond that.
- RUN MODE: auto
- SCALE: micro at B0, **promoted to scoped at B5** and stated: the canonical pure-logic-plus-test
  pattern (`chipScroll.ts` + `chipScroll.test.ts`) puts the match and the key in a third source
  file, `src/components/pickerSearch.ts`. Promotion is immediate and stated per B0.

## STANDING INSTRUCTIONS (do not edit)
- Track B is SURGICAL: read the actual current files first (B1), run the impact analysis with
  the sibling call-site sweep (B2) BEFORE proposing, produce the plan with regression risks
  (B4) — confirm mode waits for approval; auto mode (default) logs it and applies — touching
  only what DESIRED BEHAVIOUR requires. Every changed line must trace to this request.
- MUST NOT CHANGE seeds the plan's "deliberately NOT changing" list; the plan may add to it,
  never subtract.
- If VISUAL?=yes, the plan carries the correction design pass (B4), scoped to the touched
  area: states, both themes in semantic tokens, the string table, the permission answer.
- CORRECTION ROUND ≥ 2: before proposing anything, read the previous attempt and state what it
  missed and why (B1). If the miss was the process's fault, flag `/framework-update` too.
- Close out with `checklists/DEFINITION_OF_DONE.md`, then the test gate. Nothing merges
  without a PASS.


## FOUND WHILE DIAGNOSING — NOT PART OF THIS CHANGE
The requester's screenshot also carries a red toast: **"Could not find the function
public.merge_member_into(p_stray, p_target) in the schema cache"**. Confirmed by querying
`pg_proc` on the live project — not inferred from the migration ledger, which is unreliable
here (several migrations are absent from `supabase_migrations` yet their objects exist, so the
ledger under-reports what was applied). Checked object by object, production is missing exactly
two of them:

| Migration | Object | In production | The UI that calls it |
|---|---|---|---|
| `0032_merge_member.sql` | `merge_member_into(uuid, uuid)` | **absent** | the "Add as display name" confirm this very picker commits |
| `0031_member_status.sql` | `set_member_status(uuid, text)` | **absent** | "Mark inactive" / "Mark active" on the same member card |

Everything else checked (`create_member`, the holiday functions, the offering-schedule RPC,
the `pin_reset_requests` table) IS present despite gaps in the ledger.

So the button this picker confirms is dead in production today, and no frontend change reaches
it — and its neighbour on the same card is dead the same way.

Applying a migration to production needs the raw SQL shown and an explicit go-ahead first
(CLAUDE.md, binding), so nothing was applied. Reported to the requester as its own decision.
