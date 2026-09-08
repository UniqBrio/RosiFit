# CHANGE REQUEST — an existing feature, modified
<!-- Consumed by Track B: /enhance requests/<this-file> -->
<!-- Stated fields are BINDING; "unknown" is honest and the track MUST ask it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

> **Why CHANGE and not NEW.** The confirmation already exists on both member cards
> (0038, hard since 0051) and already states what is destroyed. What was asked for is its
> WORDING and its EMPHASIS, not the question itself.

## FIELDS

- **ONE-LINE GOAL:** the member deletion asks a plain yes/no question that names the records
  as well as the member, and the filled button is **No**.
- **THE ASK, in the requester's words:** *"when user click on delete on member card confirm
  that you are deleting a member and its record entire do you want to delete yes or no button
  highligh no with dark background"*.
- **WHERE:** both cards, because both run the same write and
  `src/data/memberRemoval.ts` exists precisely so they cannot drift —
  `app/(tabs)/members.tsx` and the roster card in `app/course/[id].tsx`.
- **MUST-HAVE:**
  - the title states the member AND her records: `Delete <name> and her records?`
  - the buttons say **Yes** and **No**
  - **No** is the filled, highlighted one, on a dark fill
- **THE BODY, CORRECTION ROUND 1** — the requester saw the first build on screen and cut it:
  *"this is very much info keep it simple you are deleting member and its records do you want
  to delete it permanently thats it"*. The counted paragraph (0051) is withdrawn from the
  dialog: `deletionWarning` now returns two sentences — **"You are deleting this member and
  all her records. Do you want to delete it permanently?"** — the same words in every state.
  It keeps its `PreviewState` parameter so a later ask to put a number back changes that one
  function and nothing else, and `member_deletion_preview` is still counted behind it.
- **MUST NOT CHANGE:** everything not named above. Named explicitly because each was at risk:
  - WHERE the sentence lives. Still `src/data/memberRemoval.ts`, still reached as
    `deletionWarning(previewState)` from both screens, so the two cards cannot drift apart —
    which is the whole reason that module was extracted.
  - the other **eleven** `ConfirmDialog` callers — sign-out, send, holiday, branch, staff,
    course, the display-name prompt. `emphasis` defaults to `'confirm'`, so every one of them
    draws exactly what it drew before.
  - the write, the preview, the four outcomes and their tones.
  - the backdrop stays inert (ADR-034): a press beside the dialog is still a miss, and **No**
    is still the drawn way out.
- **DESIGN SURFACE:** two token values (`safeFill` / `onSafeFill`), one per theme, measured in
  `scripts/check-contrast.ts` like everything else (guardrail 2). "Dark" is theme-dependent and
  had to be: the light theme's near-black over a white card is the requested contrast, and the
  same value over the dark theme's card would be an invisible button, so the dark theme uses the
  app background — a fill darker than the card — and BOTH carry a `lineStrong` border, because
  that fill measures 1.06:1 against the card and the edge must be drawn rather than implied.
  The **Yes** becomes an outline in the danger ink: still available, no longer competing.

## RESOLVED AT INTAKE

- **Is "No" a cancel or a new control?** The existing cancel, relabelled. Adding a third answer
  to a two-answer question is how a dialog grows an unlabelled escape.
- **Does "Yes" delete immediately?** Yes — unchanged. This request moved the emphasis, it did
  not add a second confirmation.

## STILL `unknown`

- Whether the same inversion should reach the OTHER destructive confirmations — the course
  delete, the branch delete, the holiday removal. Not assumed: the request named the member
  card, and `emphasis` is the opt-in that makes each of those a one-word decision later.

## STANDING INSTRUCTIONS (do not edit)
- Stated fields are BINDING and cannot be overridden by an assumption downstream.
- Every backend change is an additive migration with tests; test files are append-only.
- Before applying any migration to PROD: show the requester the raw SQL and wait for an
  explicit go-ahead. Production is never touched automatically.
