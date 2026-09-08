# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

> **Why CHANGE and not FEATURE.** Sign out ships and works: both call sites already end the
> session and reset the Stack to sign-in (RC-022). Nothing new is built — a control that acts
> on the first tap is asked to ask first. The dialog it asks with, `ConfirmDialog`, already
> ships in [src/components/Sheet.tsx](../src/components/Sheet.tsx) and is what `delete_member`
> and `delete_course` already ask through.

## FIELDS
- FEATURE / SCREEN: the Sign out control — **both** places the app offers one:
  - the "Sign out" row in the App group on More, [app/(tabs)/more.tsx](../app/%28tabs%29/more.tsx)
  - the "Sign Out" button at the foot of the profile screen, [app/profile.tsx](../app/profile.tsx)

  The requester named one control ("sign out"), not one screen. Both rows call the same
  `leave()` — `await signOut()` then `toSignIn()` — so confirming on one and not the other
  would make the same words mean two different things depending on where they were tapped.
- CURRENT BEHAVIOUR: one tap ends the session immediately. `signOut()` revokes the local
  GoTrue session and `useGoToSignIn()` resets the root Stack to sign-in. There is no
  confirmation and no way back — the next screen is the PIN entry.
- DESIRED BEHAVIOUR: requester's exact words — "Ask for confirmation when user click on
  signout". Read as: the tap opens a confirmation asking whether to sign out; the session ends
  only when the confirm is pressed, and cancelling leaves the caller exactly where it was,
  still signed in.
- WHY: not stated. Implied by what the act costs: signing back in needs the mobile number and
  the PIN, and on More the row sits directly under Appearance and Help & support — two
  harmless taps above an irreversible one.
- MUST NOT CHANGE: `signOut()` in [src/data/session.ts](../src/data/session.ts) and its
  `scope: 'local'` revocation; the automatic sign-outs inside `session.ts` when a session
  resolves to no account or a closed one — those are not clicks and get no dialog; the
  post-confirm route reset through `useGoToSignIn()` (RC-022); the "You are signed out" empty
  state on both screens; the profile screen's Change My PIN button and its four rows; the More
  screen's row list, ordering, counts, admin-only filtering and danger colouring; the Staff &
  access "sign out everywhere" checkbox, which is a different act on a different account; every
  string not listed below.
- CORRECTION ROUND: 1.

## DESIGN SURFACE
- VISUAL?: yes — a modal dialog appears in front of both screens where none did.
- SCREENS & STATES TOUCHED: `/(tabs)/more` and `/profile`, in the signed-in state only. The
  loading and signed-out states of both screens are untouched — there is no Sign out control in
  either to confirm. New state: dialog open. Both themes, through `ConfirmDialog`'s existing
  semantic tokens (`theme.surface`, `theme.scrim`, `theme.lineStrong`, `theme.accent`).
- STRINGS ADDED OR ALTERED: the requester supplied no wording, so the dialog's three strings
  are new and are the only strings this change authors — a title, a body saying what signing
  back in will need, and the confirm label. `ConfirmDialog`'s cancel defaults to the canvas'
  "Not yet". Every existing string on both screens is frozen.
- PERMISSIONS: no. Nobody gains or loses a capability; a tap gains a second step.
- USAGE: occasional and deliberate — the end of a shift, or handing a shared device to another
  staff member. Rare enough that a second step costs nothing, and mis-tapped often enough on
  More (third row in a list of harmless settings) that the step is worth having.
- RUN MODE: `auto` (not stated — the default applies).
- SCALE: `scoped` — two call sites, one existing component, no data layer and no migration, so
  it reaches for `micro`; but the dialog authors three strings the request does not state
  verbatim, which B0 disqualifies. Promoted at B0 rather than claimed and caught by G8.

## OPEN — settled by what already ships
- **Which dialog?** `ConfirmDialog` from `src/components/Sheet.tsx`, the app's existing
  confirmation for an act that cannot be undone from the app. Not a new component, and not
  `window.confirm` — this is a PWA and the platform dialog is unthemed and unstyled.
- **Both screens, or only the one the requester was looking at?** Both — see FEATURE / SCREEN.

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
