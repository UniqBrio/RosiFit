# Known Limitations

> Things the **platform** prevents, distinguished from things that are broken.
>
> Consulted at **design time** (do not design a flow on an unavailable capability) and at **test
> time** (a matching case is skipped with its ID, never failed).

---

## Two rules that keep this register trustworthy

**1. An entry requires a reference proving the platform blocks it.**
No reference, no entry. Without this rule the register fills with bugs misfiled as limitations,
and then the real entries stop being believed — which is worse than having no register.

**2. Nothing is hard-deleted.**
A resolved limitation moves to the resolved section, dated, with what resolved it. Old
screenshots, old support answers and old test cases still refer to it.

---

## Active

| ID | Platform | Capability | Why it cannot work | Reference | What we tell the user | Fallback | Affected modules |
|---|---|---|---|---|---|---|---|
| KL-001 | React Native (iOS / Android) | Blurring what is BEHIND an element — the frosted-glass backdrop under a form dialog | React Native has no backdrop-filter equivalent in core. `ViewStyle` accepts `filter` (which filters the element ITSELF) but has no property that filters the element's backdrop, so a scrim cannot frost the screen under it. react-native-web does support it, because there it is plain CSS. | `node_modules/react-native/types/...` — `ViewStyle` declares no `backdropFilter`; `node_modules/react-native-web/dist/modules/prefixStyles/static.js` DOES carry `backdropFilter` in its prefix table, which is the asymmetry. MDN: `backdrop-filter` is a CSS property. | Nothing — no native build ships today. RosiFit is a PWA and every user is on the web platform, where the blur renders. | The scrim alone, exactly as it rendered before 05-Sep-2026. The dialog is legible and the screen behind is still visible through it; it is simply not frosted. `Platform.OS === 'web'` gates it in `FormDialog`, so nothing is broken, only plainer. | `src/components/FormDialog.tsx` |
| KL-002 | react-native-web 0.21 (the web platform, i.e. every user) | `accessibilityState` reaching the accessibility tree — a `Pressable` that is checked, selected or expanded saying so | React Native's `accessibilityState` prop is dropped: a `Pressable` with `accessibilityRole="radio"` and `accessibilityState={{ checked }}` renders `role="radio"` with **no** `aria-checked`, and `{{ selected }}` renders no attribute at all. Verified twice on the BUILT page, months apart and on different controls — the branch checkbox rows (`Dropdown.tsx`), and the Status radios on the member edit form. | The built DOM itself: `.evidence/member-status-edit-form.txt` records the attribute dump for the radios; `src/components/Dropdown.tsx` carries the same finding for `role="checkbox"`; the controls still missing the workaround are TD-026. | Nothing — the state IS exposed, by the workaround below. A screen reader announces it correctly. | Write the ARIA attribute directly: `aria-checked={on}` on the `Pressable`. React Native's types accept `aria-*` props (RN 0.71+), so this typechecks and is passed straight through to the element. **This is the canonical pattern in this app; `accessibilityState` is not to be used for a state a reader must hear.** | `src/components/Dropdown.tsx`, `app/member/edit.tsx` |
| KL-003 | react-native-web 0.21 (the web platform, i.e. every user) | **Space** operating a focused `Pressable` | `Pressable` binds Enter and not Space, so Space falls through to the page and scrolls it. Space is the key that picks a radio and toggles a checkbox in the ARIA authoring practices, and CP-22 requires it of tab-style controls and toggles — so on this platform every `Pressable` acting as one is, by default, keyboard-incomplete. Verified on the built page: the keydown was observed arriving at the element with no press following. | `.evidence/member-status-edit-form.txt` — the keydown/press trace, and the same negative result on two pre-existing controls (the day chips and the primary-address radios on the same form). | Nothing for the controls that carry the workaround. **The pre-existing controls that do not carry it are keyboard-incomplete today** — the day chips and primary-address radios on `app/member/edit.tsx`, and every other `Pressable` toggle in the app. That is a real gap, not a solved one; it is logged as TD-026 rather than hidden here. | An `onKeyDown` handler that presses on `' '` and calls `preventDefault()`, spread in via a typed helper (`spaceSelects`, `app/member/edit.tsx`) because RN's own `PressableProps` carries no keyboard event. Picking is idempotent, so a browser that also synthesises the press lands on the same value. | `app/member/edit.tsx` (Status radios); every other `Pressable` toggle is still uncovered |

_A row here requires a **reference** proving the limit is the platform's and not ours._

## Resolved / expired

| ID | Resolved | Date | Notes |
|---|---|---|---|

---

## Maintenance triggers

1. **Discovered during build** → add the entry immediately, with its reference and the
   customer-facing answer. A limitation found and not recorded will be rediscovered, expensively.
2. **A workaround fully resolves it** → move to Resolved, dated, with what resolved it.
   A *partial* workaround edits the row and keeps it Active.
3. **A change removes or alters an affected module** → update the affected-modules column.
   An entry with zero remaining modules is retired to Resolved ("feature removed", dated).
4. **A matching test unexpectedly PASSES** → flag the entry "VERIFY — possibly expired".
   **Never retire it mid-run**; the periodic review owns retirement, with fresh research.
5. **Periodic review** — before each release, or monthly: re-verify every active entry. Platforms
   ship. A limitation from two years ago is often no longer true, and a stale entry silently
   removes a capability from your product.

---

## External dependency directory

The status pages checked **first** for any "it was working yesterday" failure, before any code
theory is entertained. An active incident matching the failure signature is not an application
bug.

| Dependency | Status page |
|---|---|
| _Database / backend host_ | |
| _Hosting platform_ | |
| _Identity provider_ | |
| _Messaging provider_ | |
| _Source control / CI_ | |
