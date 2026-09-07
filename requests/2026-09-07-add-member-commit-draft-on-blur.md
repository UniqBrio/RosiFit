# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: the two **AddRow** inputs in *Welcome a new member* (the Add member
  dialog) — *Google Meet display names* (`member-alias-input` / `member-alias-add`) and
  *Email addresses* (`member-email-input` / `member-email-add`), both rendered from the local
  `AddRow` in `app/member/edit.tsx:750`. The same file renders the Edit member dialog.

- CURRENT BEHAVIOUR (read in the file, 2026-09-07): each row is a `TextInput` holding a
  *draft* (`aliasDraft`, `emailDraft`) beside a **+ Add** button. The typed value becomes a
  real entry only when `addAlias` / `addEmail` runs, and those run on exactly two gestures:
  pressing **+ Add**, or `onSubmitEditing` (Enter). Tabbing or tapping away to the next field
  leaves the text sitting in the draft box, where it is not in `aliases` / `emails`, is not
  counted by `valid` (`emails.length > 0` is a save requirement), and is silently discarded by
  Save. A person who types her address and moves on has, as far as the form is concerned,
  entered no address at all.

- DESIRED BEHAVIOUR: requester's exact words — *"in add member form user have to enter email
  id and click on add to add email and same goes with display name as soon as they enter value
  and navigate to next field save the value"*.

  Read as: **leaving the field commits the draft**. When the input loses focus with a non-empty
  value, that value is added exactly as **+ Add** would have added it — same trim, same
  lowercase, same duplicate check, same format check, same primary-address rule — and the box
  clears. Both rows, alias and email.

- WHY: `unknown` as stated. Evident from the ask: the extra tap is not discoverable, and the
  cost of missing it is a member saved with no address, or an address the requester believes
  she typed.

- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. The **+ Add** button stays and
  still works; Enter still adds; the draft boxes, their placeholders and their labels are
  unchanged. Every rule inside `addAlias` / `addEmail` binds on this path too — the trim, the
  case-insensitive duplicate refusal, the address-shape check, "the first address becomes
  primary", the clear-the-draft-after. An empty or whitespace-only box on blur adds nothing
  and says nothing. The existing entry rows, their Remove buttons, the primary radio and the
  promote-on-remove rule are untouched, as are `valid`, the hint line and both save paths.
  `src/components/addMemberEmail.test.ts` is append-only (standing rule) — its existing
  expectations must still pass. Both themes.

- CORRECTION ROUND: 1 on this surface.

## OPEN QUESTIONS — the requester did not settle these; taken at the gate
- **Q1. What happens on blur when the draft is INVALID** (a malformed address, or a display
  name already on her record)? **Taken: exactly what + Add does today** — the value is refused,
  it stays in the box, and the same warn flash appears. Committing a malformed address on the
  way past would be worse than the tap it replaces, and silently dropping it is the very loss
  this request is about.
- **Q2. Does blur double-add when the person leaves the field BY pressing + Add?** **Taken: no
  — one entry.** Blur commits and clears the draft, so the button's own handler then sees an
  empty draft and returns; the same holds for Enter, which does not blur. This is a stated
  outcome, not an incidental one: the plan must show it holds.
- **Q3. Does it fire when the dialog is dismissed** (Cancel, close, Escape)? **Taken: it may,
  and it is harmless** — the commit lands in form state that Cancel discards without saving.
  Nothing is written to the database by blur.
- **Q4. Does this apply on the Edit form too, which is the same component?** **Taken: yes** —
  it is one `AddRow` used twice on one screen, and a rule that held on Add but not on Edit
  would be a second behaviour to remember.

## DESIGN SURFACE
- VISUAL?: yes
- SCREENS & STATES TOUCHED: the *Google Meet display names* and *Email addresses* sections of
  *Welcome a new member* and *Edit member* — the moment focus leaves the draft box, where an
  entry row now appears and the box empties. The **refused** state of each row (warn flash,
  text retained) is reached by a new gesture and must be checked on it. The dialog's loading,
  error and missing-record states are unaffected. Both themes.
- STRINGS ADDED OR ALTERED: none — the existing refusal wording is reused verbatim (*"That
  does not look like an address"*, *"That display name is already on her record"*). Every
  fixed string on the screen is frozen.
- PERMISSIONS: no — who may add or edit a member is unchanged.
- RUN MODE: auto (nothing said about approvals)

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
