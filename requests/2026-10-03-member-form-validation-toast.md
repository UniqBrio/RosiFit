# Member form: validation said as a toast — 03-Oct-2026

**Asked (verbatim):** "When there is any validation issue in add member form its showing up in botton
instead show it as toast fix and push to main at earliest"

**Class:** CHANGE (scoped), `app/member/edit.tsx` only. No schema, no data-layer change.

**Before:** two messages sat at the foot of the member dialog —
1. the line under a DISABLED Save naming what was missing (name/email, course, branch, a refused
   date or address), and
2. the database's refusal after a save (e.g. a display name that belongs to another member), in a
   banner below the whole form, out of view.

**After:**
- Save stays pressable while the form is incomplete; pressing it flashes the same reason as a
  warning toast. The footer line now appears only for a valid form (what will be saved).
- A refused save is flashed as a warning toast; the banner is removed. The refusal state and its
  display-name clearing rules (memberRefusalClears.test.ts) are unchanged.
- The reason chain gained the refused joining date (`activeFromError`), which already held Save
  but had no words, so the toast never reads "<course> · <branch>" for a form that will not save.

**Copy:** no new user-visible strings; the existing reasons are reused.
**Spec:** `src/components/memberValidationToast.test.ts` (new).
