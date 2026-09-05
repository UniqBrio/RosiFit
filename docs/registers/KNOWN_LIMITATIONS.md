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
