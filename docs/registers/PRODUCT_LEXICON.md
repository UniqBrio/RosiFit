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
| The course-screen section for addresses that exist and cannot be used | `Email issues` | Email problems, Bad emails, Unreachable, Undeliverable | PROVISIONAL | 1 (`app/course/[id].tsx`) | 2026-09-24 |
| An address the mail system rejected — **group heading and filter row** | `Bounced` | Bounce, Failed, Undeliverable, Hard bounce | PROVISIONAL | 2 (`src/data/emailIssues.ts` heading, `src/data/rosterFilter.ts` filter) | 2026-09-24 |
| The same state, as the **word on a member card** | `Address bounced` | Bounced email, Email failed, Bounced | PROVISIONAL | 1 (`src/data/emailStatus.ts` `emailStateWord`) | 2026-09-24 |
| A member who opted out of email — **group heading and filter row** | `Unsubscribed` | Opted out, Unsubbed, Opt-out | PROVISIONAL | 2 (`src/data/emailIssues.ts` heading, `src/data/rosterFilter.ts` filter) | 2026-09-24 |
| The same state, as the **word on a member card** | `Member unsubscribed` | Opted out, Unsubscribed member, Unsubscribed | PROVISIONAL | 1 (`src/data/emailStatus.ts` `emailStateWord`) | 2026-09-24 |
| An address whose owner reported email as spam — **group heading** | `Spam Reported` | Complained, Marked spam, Junk | PROVISIONAL | 1 (`src/data/emailIssues.ts` heading) | 2026-09-24 |
| The same state, as the **word on a member card** | `Marked as spam` | Complained, Spam complaint, Spam Reported | PROVISIONAL | 1 (`src/data/emailStatus.ts` `emailStateWord`) | 2026-09-24 |

_The stale wording was `Updated at <time> · could not refresh` when these rows were first
written; it is `Last updated <time> · Couldn’t refresh` as shipped, set by the requester when the
indicator was extended from Attendance to the whole app. The row records the term that ships._

_**The email-suppression rows record a PAIR per concept, deliberately, and that is the thing to
read them for.** Each of the three states has a SHORT form and a LONG form, and they are not
synonyms that slipped in: the short form is the group heading and the dropdown row, where the
column it sits in already says the subject is email; the long form is the word on a member card,
where nothing else on the row does, and it also says WHO acted — an address bounces, a member
unsubscribes. Both come from one place (`emailStateWord` mints the long form; `ISSUE_GROUP_LABEL`
the short), and the filter labels are letter-for-letter the headings they narrow to. Recorded
here rather than left implicit in a code comment, so the next change does not pick one arm at
random. Added 24-Sep-2026 by the change that moved the issues out of the roster above them._

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
| `Spam Reported` | `src/data/emailIssues.ts:55` | `Spam reported` — Title Case among sentence-case siblings (`No email`, `Email issues`, `Yet to mark`, `All members`). Copy-locked in three places, so it is a copy pass, not a tidy-up | 2026-09-24 |
| `Email address is unsubscribed` | `src/data/emailIssues.ts` `ISSUE_READING.unsubscribed.title` | Makes the ADDRESS the subject of a state `emailStateWord` assigns to the member (`Member unsubscribed`). Shipped 23-Sep and copy-locked | 2026-09-24 |
| `No email on file · not in follow-up` vs `jane@example.com · Address bounced` | `app/course/[id].tsx` member card | Casing after the `·` separator is inconsistent across the two arms. Both are existing vocabulary; pick one in a copy pass | 2026-09-24 |
| `She is separated because the follow-up rule cannot reach her` | `app/course/[id].tsx`, the No email section comment | A comment beside member-facing copy, which the standing rule covers. **Fixed in the 24-Sep change** rather than logged, because it is a binding rule and not a preference — kept here as the record | 2026-09-24 |
| `…so she is expected at the days that offering runs.` | `app/course/[id].tsx:1619`, an EmptyState body — **a visible string, not a comment** | The gender-neutral rule is binding and this is shipped copy breaking it. Suggested: `…so the member is expected at the days that offering runs.` Logged rather than fixed: it is outside the 24-Sep request, and a one-line copy change to a shipped string belongs in a declared copy pass | 2026-09-24 |
| ~30 gendered comments across `app/course/[id].tsx` | lines 406, 452–471, 657, 855, 1204, 1373, 2183, 2217–2243, 2303–2308, 2415, 2514–2562, 2628, 2677–2678 | The standing rule covers the comments around member-facing copy, and this file is the densest concentration in the repo. A file-wide pass, sized and scheduled — not something to do a few lines at a time inside unrelated changes | 2026-09-24 |
