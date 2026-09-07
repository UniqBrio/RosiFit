# Promotion Candidates

> The parking lot between "an app learned something" and "the framework changed".
>
> **Nothing is promoted on first sighting (n=1).** Promoting the first time you see something is
> how a framework becomes a museum of one app's accidents. A candidate parks here; on the
> **second sighting from a different app**, it is promoted through `/framework-update`.
>
> Append-only, newest first. A rejected candidate stays, with its reason — the reason it lost is
> the most valuable line when someone proposes it again.

---

## How an entry gets here

Via [workflows/promote.md](../../workflows/promote.md), after passing the first two filters:

1. **Path test** — the lesson touches framework-origin behaviour, not only app feature code.
2. **Domain-word test** — the rule can be stated **without naming any business concept**.
   (Checked against the source app's `PRODUCT_LEXICON.md`: if a lexicon word appears in the
   rule, it is app-specific by definition.)

The third filter is this register itself: the sighting count.

## Statuses

`PARKED (n=1)` → `PROMOTED → <RC/rule id>` or `REJECTED — <reason>`

---

## Candidates

| ID | Candidate rule (domain-free wording) | Source app · date | Sightings | Status |
|---|---|---|---|---|
| CAND-001 | "A table with more than three columns must let the user choose which columns show and in what order, and must remember the choice. A column the table is unreadable without is reorderable but never hideable." | academies-dashboard · 30-Aug-2026 | n=1 | **PROMOTED → CP-21, v1.3.0** — *owner override of the n=2 rule, recorded deliberately (see note below)* |
| CAND-005 | "A build-time contrast sweep must measure the pair the SCREEN renders, not the pair the tokens name. Where a surface is drawn as a translucent tint OF THE SAME INK it carries, the ink sits on a lighter or darker ground than any opaque surface in the sweep, and the measured pair is one that appears nowhere in the product. Every composited pair a component can produce belongs in the sweep, or the gate is green about colours nobody sees." | RosiFit · 07-Sep-2026 | n=1 | **PARKED (n=1)** — TD-036 · *found by measuring the live DOM, not by the gate* |
| CAND-004 | "An effect that defers its work until a condition is met must be able to run AGAIN when that condition changes: every input the condition reads belongs in the effect's dependency list, including one reached through a derived value. A deferral whose lifting nothing can observe is a permanent one — and it presents as the very state the deferral was added to prevent." | RosiFit · 07-Sep-2026 | n=1 | **PARKED (n=1)** — RC-025 · *verdict awaiting owner approval* |
| CAND-003 | "A form that writes a column carrying a store-level constraint must state that constraint's rule itself, before it offers Save. A rule enforced only where the data lands is a rule the user meets as the store's own error message — and the store's message names a relation and a constraint, not anything the person can act on." | RosiFit · 07-Sep-2026 | n=1 | **PARKED (n=1)** — RC-023 |
| CAND-002 | "A form that can be opened on an EXISTING record decides create-vs-edit from the route, never from the result of its own lookup, and answers loading, failed and missing before it renders. A lookup that has not answered yet and one that answered "no such record" are not the create case." | RosiFit · 06-Sep-2026 | n=1 | **PARKED (n=1)** — RC-021 |
| CAND-000 | *(example)* "A list that can be reordered must persist the order through the same code path that displays it — two paths drift." | — | — | *(template row — replace on first real entry)* |

### Note on CAND-001 — an override, not a precedent

This register's rule is **n=2 from a different app**. CAND-001 was promoted at **n=1**, by an
explicit owner decision, and this row says so rather than quietly presenting it as normal.

The case for it: the rule states cleanly without any business noun, the pure part of the
implementation (`reconcileOrder`) was already domain-free, and the failure it prevents is one of
gradual decay — a table nobody notices becoming unusable — which is exactly the class a single
sighting is enough to recognise.

The case against, kept because the reason a rule lost is the most valuable line when someone
proposes the next one: **one app's habits are not evidence of generality.** If a second app finds
the three-column threshold wrong, or wants server-persisted preferences, the threshold is
`--threshold` on the audit and the rule text is amendable in place. Do not read this row as
permission to skip the rule of three.
