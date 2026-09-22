# Product Lexicon

> **One approved word per concept.** This is the file the copy freeze rule enforces against —
> without it, "shipped strings are frozen" has nothing to be frozen to.
>
> Append-only. A superseded term is marked, never deleted: old screenshots, old support answers
> and old test expectations still contain it.

---

## Why terminology is the expensive half

Wording can be improved later at moderate cost. **Terminology cannot.** It changes what users
say on support calls, what they search the help centre for, what appears in every screenshot
ever taken, and what every test expectation asserts.

Two words for one concept is a support problem long before it is a style problem: the user says
"charge", the interface says "fee", the help article says "invoice line", and everybody is
slightly wrong.

**A database column name is not a user-facing word.** `acct_status_cd` is a schema decision;
what the user reads is a product decision, and they are allowed to differ.

---

## Approved terms

| Concept | **Approved term** | Not this | Status | Occurrences | Decided |
|---|---|---|---|---|---|
| When the data on screen was last fetched | `Updated just now` · `Updated at <h:mm AM/PM>` | Last refreshed, Last synced, As of, Fetched | PROVISIONAL | 2 (`src/data/freshness.ts`, drawn on Attendance) | 2026-09-22 |
| A fetch is open over data already on screen | `Updating…` | Refreshing, Syncing, Loading | PROVISIONAL | 1 (`src/data/freshness.ts`) | 2026-09-22 |
| A refresh failed, but the last good data is still shown | `Last updated <h:mm AM/PM> · Couldn’t refresh` | Offline, Out of date, Stale, could not refresh | PROVISIONAL | 2 (`src/data/freshness.ts`; drawn on Attendance and in the app-wide banner) | 2026-09-22 |
| A wait that has gone on long enough to say so | `Still processing` · `Still writing the register` | Please wait, Hang tight, Almost there | PROVISIONAL | 2 (`src/data/uploadProgress.ts`) | 2026-09-22 |

_The stale wording was `Updated at <time> · could not refresh` when these rows were first
written; it is `Last updated <time> · Couldn’t refresh` as shipped, set by the requester when the
indicator was extended from Attendance to the whole app. The row records the term that ships._

_The first four entries. They were added by the data-freshness change of 22-Sep-2026, which is the
first time the product has had to name these states at all — a screen that refreshes itself in the
background has to say how fresh it is, and an import that shows its progress has to say what it is
doing without promising when it will stop. `PROVISIONAL` because none of it has shipped yet._

- **Approved term** — exactly as it appears in the interface, including capitalisation.
- **Not this** — the synonyms that have actually appeared, or that people reach for. This column
  is what makes the row enforceable in review.
- **Status** — `FROZEN` (shipped; never reworded outside a declared copy pass) · `PROVISIONAL`
  (new, not yet shipped) · `SUPERSEDED BY <term>`.
- **Occurrences** — how many shipped strings use it. Evidence the term is real rather than
  aspirational, and a measure of what a change would cost.

---

## Adding a term

1. **Check for an existing term first.** A new synonym for an approved concept is a defect, not
   a preference. This check is the entire point of the register.
2. Add the row with `PROVISIONAL`, and record the decision — *why* this word and not the
   obvious alternative.
3. It becomes `FROZEN` when it ships.

## Changing a term

Only in a declared copy-migration pass, with approval, **before** any code changes.

The old row is marked `SUPERSEDED BY <term>` and stays. Then: update every shipped string, and
**update every test expectation and text selector that quotes it** — a green suite after a copy
migration usually means the suite is asserting the old words.

## Candidates

Off-voice or inconsistent copy noticed during unrelated work goes here — **logged, never fixed
in that change.** This list is what makes the freeze rule tolerable: you have somewhere to put
the observation instead of acting on it.

| Term seen | Where | Suggested | Noticed |
|---|---|---|---|
