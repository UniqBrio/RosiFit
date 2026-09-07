# Decision Log

> Index of architecture decision records in `docs/decisions/`.
>
> Anything expensive to reverse gets a record. Template:
> [templates/docs/ADR.md](../../templates/docs/ADR.md).

| # | Decision | Status | Date | Supersedes |
|---|---|---|---|---|
| 001 | [Colour stays in `src/theme/tokens.ts`; `design/tokens.json` is not adopted](../decisions/001-colour-source-of-truth.md) | Accepted | 02-Sep-2026 | |
| 002 | [Framework `CP-1…CP-21` superseded at adoption rather than amended](../decisions/002-canonical-patterns-supersession.md) | Accepted | 02-Sep-2026 | |
| 003 | [G1 Theme artifacts in sync — accepted unverifiable; no `design/tokens.json`](../decisions/003-accepted-unverifiable-gate-classes.md) | Accepted | 02-Sep-2026 | |
| 004 | [G2 Framework contrast gate — accepted unverifiable; substitute rung is `scripts/check-contrast.ts`](../decisions/003-accepted-unverifiable-gate-classes.md) | Accepted | 02-Sep-2026 | |
| 005 | [G3 Theme assets per theme — accepted unverifiable; no declared asset set](../decisions/003-accepted-unverifiable-gate-classes.md) | Accepted | 02-Sep-2026 | |
| 006 | [G5 Types — NOT accepted as unverifiable: it runs and PASSES](../decisions/003-accepted-unverifiable-gate-classes.md) | Accepted | 02-Sep-2026 | |
| 007 | [G6 Lint — accepted unverifiable; this project has no ESLint](../decisions/003-accepted-unverifiable-gate-classes.md) | Accepted | 02-Sep-2026 | |
| 008 | [G7 Unit + pure specs — accepted unverifiable; no `test:unit` script exists](../decisions/003-accepted-unverifiable-gate-classes.md) | Accepted | 02-Sep-2026 | |
| 009 | [G8 Functional / integration — accepted unverifiable; no `test:functional` script exists](../decisions/003-accepted-unverifiable-gate-classes.md) | Accepted | 02-Sep-2026 | |
| 010 | [G10 Backward compatibility — accepted INERT, and its PASS must not be believed](../decisions/003-accepted-unverifiable-gate-classes.md) | Accepted | 02-Sep-2026 | |
| 011 | [`gate-runner.mjs` is not edited locally; its `src`-only default is carried as debt](../decisions/004-gate-runner-dir-gap.md) | Accepted | 02-Sep-2026 | |
| 012 | [The DB harness is unverifiable on the adopting machine (no `psql`, no Docker)](../decisions/003-accepted-unverifiable-gate-classes.md) | **Superseded by 013** | 02-Sep-2026 | |
| 013 | [The DB harness is runnable, and CI is what keeps it runnable](../decisions/005-db-harness-runnable.md) | Accepted | 02-Sep-2026 | 012 |
| 014 | [The member code is retired; the column is kept](../decisions/006-member-code-retired.md) | Accepted | 04-Sep-2026 | |
| 015 | [A rolled-back rehearsal against production, when the harness cannot run](../decisions/007-production-rollback-rehearsal.md) | Accepted | 04-Sep-2026 | |
| 016 | [Continue validates the number, and the enumeration oracle is accepted](../decisions/008-continue-validates-the-number.md) | Accepted | 05-Sep-2026 | |
| 017 | [The attendance upload and its match review are dialogs, not pages](../decisions/009-upload-and-match-are-dialogs.md) | Accepted | 05-Sep-2026 | amended 06-Sep-2026: `member/import` came off the exclusion list — its premise (“reached from More”) was never true; amended again the same day: `member/[id]`, one member’s record, is a dialog over the list she was tapped on (`requests/2026-09-06-member-detail-as-popup.md`) |
| 018 | [A member's Active/Inactive is STORED, and it is the engine's own `members.status`](../decisions/010-member-status-is-stored-not-derived.md) | Accepted | 05-Sep-2026 | |
| 019 | [A detail is TAPPED into the wording, not typed](../decisions/011-inserting-a-detail-into-the-wording.md) | Accepted | 05-Sep-2026 | |
| 020 | [The send draft picks its recipients, and marks who has already had one](../decisions/012-send-picks-recipients.md) | Accepted | 06-Sep-2026 | |
| 021 | [The import resolves itself, and “add display name” became a real merge](../decisions/013-import-resolves-itself-and-the-merge-is-real.md) | Accepted | 06-Sep-2026 | reverses the blocking half of C-79 |
| 022 | [The file imports on the pick, and the instructor is never a member](../decisions/014-the-file-imports-on-the-pick.md) | Accepted | 06-Sep-2026 | retires the last of C-79's blocking rule; supersedes the “Not a member” chip from 021 |
| 023 | [The Overview drops "Not expected" and the scope tabs, and gains a mark per question](../decisions/015-overview-drops-not-expected-and-the-scope-tabs.md) | Accepted | 06-Sep-2026 | departs from the canvas’ Overview; amended by 026 — the course and period marks are rings now, the removals stand |
| 024 | [The calendar sizes itself and hangs under the field, in every place a date is chosen](../decisions/016-the-date-picker-hangs-under-the-field.md) | Accepted | 06-Sep-2026 | |
| 025 | [Her status is a FIELD on the edit form, written by Save](../decisions/017-member-status-on-the-edit-form-applies-on-save.md) | Accepted | 06-Sep-2026 | extends 018 — a second control, the same write path, a different mechanism |
| 026 | [The Overview's sections sit two to a row, and course and period are rings](../decisions/018-overview-sections-two-up-and-rings.md) | Accepted | 06-Sep-2026 | amends 023 — replaces its course and period marks on the requester's instruction |
| 027 | [A second file REPLACES the day's register, and says so before it does](../decisions/019-a-second-file-replaces-the-register-and-says-so-first.md) | Accepted | 07-Sep-2026 | extends 022 — the import still runs on the pick; the one ask gains a second reason, and “override” is made true (0037, unrehearsed) |

| 027 | [Reach out sends to the member whose record is open](../decisions/020-reach-out-is-one-members-send.md) | Accepted | 07-Sep-2026 | narrows a shipped route on the requester's own choice; the all-courses button stays broken and is TD-033 |

Status: `Proposed` · `Accepted` · `Superseded by NNN` · `Deprecated`

---

**Superseded records are never deleted.** The reasoning that was correct in 2026 explains why
the system is shaped as it is, and a reader who cannot find it will assume the shape was an
accident.

**The most valuable section of any record is "options rejected".** Six months from now, someone
will propose one of them again — and the reason it lost is the sentence that saves the
conversation.
