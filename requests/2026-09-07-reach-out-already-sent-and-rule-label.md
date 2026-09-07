# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## THE REQUESTER'S WORDS, VERBATIM
> On click of Reach out, there should be a pop-up if the email has sent already. If email is
> sent using "reach out" button, ignore when sending multiple emails at once.
>
> Add a lebel, if the email is sent only if rule is met-"Rule is met, Email sent", "Rule is not
> met, No email to send"

Sent with a screenshot of the **member detail pop-up** for "anita" (hhhhh · Main · joined Sept
2026) — 0 expected, 0 attended, 0 missed, 0 streak; "No sessions · —"; "Email on file ·
ani@g.com · verified 4 Aug · Last contacted never"; footer buttons **Edit** and **Reach out**.
That screenshot is what names the surface below.

## FIELDS
- FEATURE / SCREEN: The **member detail pop-up** (`app/member/[id].tsx`) → its pinned
  **"Reach out"** button (`member-reach-out`, line 90). Downstream of it: the send draft
  (`app/send/index.tsx`) and its multi-recipient send, which is also reached from the weekly
  screen's "Reach out to N members" (`app/(tabs)/weekly.tsx:129`).
- CURRENT BEHAVIOUR:
  - "Reach out" on a member pop-up pushes `/send` **with no member and no course id**, so it
    does not send to the member whose record was open and does not check anything about her
    first. **CORRECTED AT B1, having run it:** with no course id `useCourseMessage(null)`
    resolves to `null`, and `send/index.tsx` treats `!message.data` as its error branch — so
    the button does not open the all-course draft at all, it renders **"The draft could not be
    loaded. Nothing has been sent."** Verified in a browser against a fixtures build. The
    weekly screen's "Reach out to N members" passes no course either and lands on the same
    card; that half is NOT fixed here — see FOUND WHILE BUILDING below.
  - "Already sent this period" IS already known and already shown **inside the send draft** —
    `src/data/sent.ts` merges the server's history with this session's sends, an already-sent
    row is marked, and `defaultSelection` leaves her box **unticked** so a second email is a
    deliberate tick. The confirmation names how many ticked members would be re-sent to.
    None of that is surfaced on the member pop-up, and nothing pops up before the draft opens.
  - The member pop-up says nothing about whether the follow-up rule is met. The only email
    line it carries is "Email on file / No usable email" plus "Last contacted <date|never>".
- DESIRED BEHAVIOUR — three obligations, as stated:
  1. **A pop-up on "Reach out" when the email has already been sent.** Pressing Reach out must
     first check whether this member's email has already gone out and, if it has, show a
     pop-up rather than going straight on. *What the pop-up says, and whether it blocks the
     send or warns and lets it continue: `unknown`.*
  2. **A member emailed via the "Reach out" button is ignored by a multi-member send.** Once
     she has been written to through Reach out, the "sending multiple emails at once" path
     must skip her. *Whether "ignore" means excluded from the list, left unticked as today, or
     hard-blocked: `unknown`.*
  3. **A label saying whether the rule was met**, carrying these two strings exactly:
     - `Rule is met, Email sent`
     - `Rule is not met, No email to send`
- WHY: `unknown` — not stated. (The screenshot's member has "Last contacted never" and no
  sessions, so nothing in it evidences a duplicate that was actually sent; do not treat
  "avoiding a duplicate email" as a given — Track B asks.)
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. Named explicitly because they
  are the nearest things and are load-bearing:
  - Guardrail 1 — the follow-up list stays **derived** from the member list and the saved rule.
    No second list, and the new label must READ the same derivation (`isEligible` /
    `src/data/followup.ts`), never re-implement or store its own answer.
  - Guardrail 5 — no free-form send path. Reach out must keep going through the stored
    template; this request adds a check before a send, not a new way to send.
  - The send draft's existing marking, `defaultSelection`'s unticked-by-default behaviour, its
    "N of M selected", Select all, the confirmation's subset/resend/excluded sentences, and
    C-76 (a member with no address is excluded **and named**, never dropped).
  - The weekly screen's "Reach out to N members" button and its count.
  - The member pop-up's five figures, her sessions list, the email panel's existing two lines,
    and the Edit button.
- CORRECTION ROUND: 1. (Adjacent prior work, not a previous attempt at this ask:
  `requests/2026-09-06-send-dialog-pick-recipients.md` is what put already-sent marking and the
  unticked default into the send draft.)

## DECIDED AT TRACK B's FIRST GATE (07-Sep-2026)
The FIELDS above were restated to the requester before anything was applied. Two questions
were put; the rest of the OPEN list below was answered from them or from the code.

1. **Reach out is HER send.** Asked, because scoping it removes the member pop-up's shortcut
   to the all-course draft and a capability removal is a hard stop in any run mode.
   **Requester chose: scope it to her.** `/send?member=<id>` lists her alone; Weekly and the
   course screen still reach the wider drafts.
2. **The third label string.** Put to the requester with a recommendation; answered *"You
   decide as senior dev … who thinks for end user"*, so the recommendation was taken and is
   owned here: four states, three strings, none of them false. See the table in
   `src/data/reachOut.ts` and the reasoning against RC-017.

Everything else in OPEN was settled without asking, and each answer is in the code's own
comments: the period is the current week (what `sent.ts` already tracks); the pop-up warns
rather than blocks (blocking would remove the deliberate second send the draft has always
allowed); "ignore" keeps the existing unticked-by-default mechanism rather than inventing a
second one; the label sits under the email panel, which is where the "can she be emailed"
answer already lives; the rule is resolved per her course exactly as `flagged()` resolves it.

## FOUND WHILE BUILDING — NOT FIXED HERE
**`/send` with no course id renders the error card, so the weekly screen's "Reach out to N
members" button is dead.** `useCourseMessage(null)` resolves `null` and `!message.data` is the
error branch. Confirmed in a browser: the dialog reads *"The draft could not be loaded.
Nothing has been sent."*

This change resolves it **only** for the single-member path, by resolving the wording from her
own course — which guardrail 5 requires anyway. The weekly button is named in MUST NOT CHANGE
and is left exactly as it is: it needs its own decision (which course's wording does an
all-courses send use?), and that is a `/request` of its own, not a line in this one.

Also seen, unrelated to this change and not touched: `/member/[id]` throws React #418 on
hydration — and so does `/course/[id]`, which this change never touches, so it belongs to
dynamic-route prerender rather than to this diff.

## OPEN — every field the description does not cover (Track B's B3 must ask, not fill)
1. **"the email has sent already" — sent WHEN?** This week's follow-up period (what `sent.ts`
   tracks), or ever (what "Last contacted" shows)? `unknown`.
2. **Does the pop-up block or warn?** Two buttons and a way through, or a dead end? `unknown`.
   Its wording: `unknown`.
3. **What does Reach out do when nothing has been sent yet?** Unchanged (opens the whole
   draft), or does this request also mean it should send to *this member*? `unknown` — the
   phrase "If email is sent using 'reach out' button" reads as if Reach out itself sends, which
   is not what it does today.
4. **"ignore when sending multiple emails at once"** — excluded from the recipient list,
   unticked (today's behaviour), or blocked from being ticked? `unknown`.
5. **Where the label goes** — the member pop-up is the surface in the screenshot; exact
   placement (in the email panel, beside Reach out, or elsewhere) `unknown`. Whether the same
   label is wanted on the send draft rows or the weekly list: `unknown`.
6. **What "Email sent" asserts** — that an email HAS been sent, or that one WILL be when Reach
   out is pressed? The two read the same and mean different things on a member who is flagged
   but not yet contacted. `unknown`.
7. **Rule met but no email on file** — which of the two strings shows, if either? `unknown`.
8. **Which rule** the label evaluates for a member on more than one course, and over which
   period: `unknown`.

## DESIGN SURFACE
- VISUAL?: yes
- SCREENS & STATES TOUCHED: the member detail pop-up (loaded state; its loading and error cards
  are unaffected — both render before a member exists), the new pop-up itself, and the send
  draft's recipient rows / confirmation if obligation 2 changes them. Empty state matters: a
  member the rule has not flagged is exactly the screenshot's case.
- STRINGS ADDED OR ALTERED: the two label strings **exactly as written** — `Rule is met, Email
  sent` and `Rule is not met, No email to send` (the requester's own words and punctuation;
  Track B must confirm before altering capitalisation or the comma). The pop-up's title, body
  and button words: `unknown` — to be proposed and confirmed. Everything else on the member
  pop-up and the send draft is frozen (the freeze rule).
- PERMISSIONS: no — nothing in the description changes who can see or do anything.
- USAGE: `unknown` — how often Reach out is pressed from a member's record, and by whom
  (owner vs staff), was not stated.
- RUN MODE: auto
- SCALE: left blank — Track B decides at B0.

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
