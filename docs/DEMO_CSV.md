# Uploading an attendance register, and how a different name is recognised

Sample file: [`demo-attendance.csv`](./demo-attendance.csv). It is built against
`supabase/seed_demo.sql`, and every row lands on a different outcome on purpose.

## The file

The parser (`src/data/csv.ts`) wants the Google Meet export shape and nothing else:

| Column | Required | Notes |
|---|---|---|
| `Full Name` | **yes** | the only column matching uses |
| `First Seen` | no | shown on the review screen |
| `Time in Call` | no | `52 min`, `1 hr 3 min`, `0:52:14` and `45` all parse |

There is no email, member id, course or branch column, and the parser refuses a
file with no `Full Name` rather than guessing (C-74).

**Time in call decides nothing.** There was a 15-minute floor and it was removed:
a member who reconnected, joined from a phone, or was marked by Meet at 32 seconds
was dropped before matching and then recorded *absent from a class she attended*.
Being named in the file is the evidence; the duration is stored beside it and read
by nobody. A row is dropped for exactly two reasons now — the name cell is blank, or
it repeats a name already in the file, which Meet writes once per JOIN — and the
review screen gives the count **and the names**.

## Uploading

Sessions tab → **Upload register** → pick the batch and the session date → choose the
file → **Preview**. Nothing is written yet: preview only stages the file in
`csv_imports` and classifies each row. You then decide the rows that need a decision
and press commit, which runs `commit_csv_import()` — one transaction, so either every
row lands or none does.

## How a different name is recognised

Three tiers, tried in order, on a normalised name (lowercased, accents stripped,
punctuation collapsed to single spaces — so `Priya  R.` and `priya r` are the same string):

1. **Confirmed display name** — `member_aliases`. Checked first, and it wins outright.
2. **Canonical name** — `members.name_normalized`.
3. **Fuzzy** — Sørensen–Dice over character bigrams, threshold **0.90**.
   A fuzzy hit is *never* auto-accepted (C-79).

The outcome depends on how many candidates come back, and from which tier:

| Outcome | When | What you do |
|---|---|---|
| **A — Matched** | exactly one candidate, alias or canonical tier | nothing; it just imports |
| **B — Matched, no email** | as A, but she has no primary email | nothing; she is imported and *named* in the weekly review as unsendable, never dropped |
| **C — Possible** | exactly one candidate, fuzzy tier | confirm or reject — the screen labels it "Fuzzy match — nothing is assumed" |
| **D — Ambiguous** | two or more candidates | pick which member, using the course, branch and known display names shown |
| **E — Unmatched** | no candidate | link her to an existing member, or create a new one |

**C, D and E block the commit until decided.** `commit_csv_import()` refuses with
`row N (kind) needs a decision before this import can be committed` — there is no
partial import.

**Confirming a name teaches the system.** When you resolve an unmatched or possible
row to a member, the spelling from the file is stored as a new alias (C-77), so the
same spelling matches on tier 1 next time — no fuzzy step, no second question.

One consequence worth knowing: `member_aliases` is UNIQUE on
`(alias_type, alias_normalized)` across the whole academy, so one display name can
never point at two members. The alias tier is therefore structurally unambiguous, and
outcome D can only come from two members sharing a canonical name, or a fuzzy tie.

## What the sample file does

Upload it against the **Zumba Basics · Anna Nagar** batch on a past session date:

| Row | Outcome | Why |
|---|---|---|
| `Lakshmi N` | **A** | a confirmed alias for Lakshmi Narayanan — tier 1 |
| `Meena Sundaram` | **B** | exact canonical match; she has no email on file |
| `Anjali Krishna` | **C** | 0.903 similarity to "Anjali Krishnan" — just over the 0.90 line |
| `Kavitha Ramesh` | **D** | two members share that canonical name, in different batches |
| `Sangeetha Iyer` | **E** | nobody by that name or alias |
| `Divya B` | **A** | a confirmed alias for Divya Balakrishnan. Her 9 minutes in the call change nothing — she was there |

**Shanthi Devi is not in the file at all**, and that is the last piece: everyone
expected at the session who does not appear is written as `absent`. Attendance is
never inferred from silence in one direction only.
