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
| CAND-009 | "A check that reads SOURCE can prove a feature is wired and can never prove it is visible. Where the deliverable is something a person must SEE, one check has to open the running page and measure it — its size, and whether the pixels at its centre actually change when it appears. Presence, correct dimensions and being inside the viewport are all satisfied by an element painted entirely behind another one." | RosiFit · 11-Sep-2026 | n=1 | **PARKED (n=1)** — KL-007 · *three defects in one small change survived a 12-assertion source spec and were each found by a browser: an 82px-wide bubble, a bubble hidden behind a card, and a check that blamed the app for being right* |
| CAND-008 | "A control that is disabled because something must happen FIRST has to say what that something is, in a form a sighted user can perceive — and the sentence it shows and the sentence it announces must be one expression, not two. An accessible name alone leaves everyone who is not using a screen reader looking at grey. Where the platform makes a disabled control unreachable by pointer, keyboard and hover alike, the affordance is attached to a WRAPPER rather than dropped." | RosiFit · 11-Sep-2026 | n=1 | **PARKED (n=1)** — KL-006 · *capability decision for this run: PARK. `src/components/Tooltip.tsx` is reusable-looking, but the library's UI rows point at `starter/`, which this app does not have (adopted, not scaffolded), so there is nowhere to contribute it to yet* |
| CAND-007 | "A per-item predicate must mention the item in every clause. A condition that answers about the CONTEXT rather than the item, evaluated once per item, answers the same way for all of them — so a selector built from it selects everything, and a selector that selects everything selects nothing a reader can use." | RosiFit · 10-Sep-2026 | n=1 | **PARKED (n=1)** — RC-040 |
| CAND-006 | "Every gate a project runs proves things about code against fixture-sized data, and a platform's own limits do not react to fixture-sized data. A read of an unbounded set must be proved at a volume ABOVE the platform's response cap, because the failure mode of such a cap is usually a SUCCESSFUL reply that is silently short — identical code passes at 999 rows and lies at 1001, and no amount of correct code below the threshold is evidence about behaviour above it." | RosiFit · 10-Sep-2026 | n=1 | **PARKED (n=1)** — RC-039 · *the process check that produced it: no gate in this project has ever been run against a data volume the platform reacts to* |
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
