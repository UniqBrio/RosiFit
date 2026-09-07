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
| 028 | [Reach out sends to the member whose record is open](../decisions/020-reach-out-is-one-members-send.md) | Accepted | 07-Sep-2026 | narrows a shipped route on the requester's own choice; the all-courses button stays broken and is TD-033 |

| 029 | [Staff own the register: the owner keeps the account and its record, not the courses](../decisions/022-staff-own-the-register.md) | Accepted | 07-Sep-2026 | supersedes the 02-Sep "Write organisation" and 04-Sep "Bulk import" rows of `RBAC_MATRIX.md` for COURSES and MEMBERS; branches and holidays keep the old reasoning |
| 030 | [The member card READS attendance; it does not write it](../decisions/023-the-member-card-reads-attendance-it-does-not-write-it.md) | Accepted | 07-Sep-2026 | supersedes the client-control half of the write-path record — `docs/decisions/021-…`, which this log does not index (TD-039), so it is cited by file. `set_attendance` (0035) keeps its grants and its tests and is now called by nothing (TD-040) |


| 031 | [The session was never lost; the screen never asked](../decisions/024-the-session-was-never-lost-the-screen-never-asked.md) | Accepted | 07-Sep-2026 | declines the HttpOnly-cookie + session-table mechanism the request specified, on the requester’s choice once shown that the app is a static export with no server on its own origin and that RLS reads the JWT. Sign out narrows from every device to this one. Session lifetime is indefinite until Sign Out, held in the Supabase project’s Auth settings and deliberately NOT as a constant in this repo. Leaves the `localStorage` XSS exposure open and names it as TD-042 |
| 032 | [The service worker is a shell, not a data cache](../decisions/025-the-service-worker-is-not-a-data-cache.md) | Accepted | 07-Sep-2026 | rejects caching API responses to make the app work offline: a cached member list is the second list guardrail 1 forbids, and a register that looks normal while it is stale is worse than one that says the server is unreachable. Also rejects skipWaiting. |
| 033 | [The course form offers ONE follow-up trigger, and the engine keeps two](../decisions/026-the-follow-up-trigger-is-weekly-only.md) | Accepted | 07-Sep-2026 | removes the consecutive trigger from `course/edit` on the requester's instruction. `save_course` (0040), both `course_follow_up_config` columns, `follow_up_candidates()` (0009) and `supabase/tests/16_save_course.sql` are untouched — the option goes, the capability stays in the engine. Courses stored as consecutive convert on their next save and the form says so first; how many exist is unknown (the production count was blocked during the run) |
| 034 | [A dialog leaves by its own controls; a picker still leaves by its backdrop](../decisions/027-a-dialog-leaves-by-its-own-controls.md) | Accepted | 07-Sep-2026 | amends CP-014, whose “the layer beside it is a real control” now holds for pickers only. `FormDialog` (eleven screens) and `ConfirmDialog` (seven) keep the backdrop, the dim and the blur and keep swallowing the press — the screen under a `transparentModal` route is live — but it no longer closes them and is no longer announced as a control. Rejects the plain reading of the requester’s “all”: `Sheet` and `AnchoredPanel` draw no close button between them, so Notifications and every field picker would have had no way out. Also rejects a discard-confirmation in its place, which needs a dirty check eleven forms do not have |

| 035 | [A filter applies on the pick; the panel leaves by the press beside it](../decisions/028-a-filter-applies-on-the-pick.md) | Accepted | 07-Sep-2026 | deletes `DropdownDone` and `DropdownPanel`'s `footer` slot from the library, and the custom range's confirming button from `PeriodFilter`. Neither had ever applied anything — both only closed the panel, which told a reader the figures already on screen were provisional. Rejects closing a multi-choice panel on a tick (it would silently take Overview's Course and Branch down to one value each) and rejects leaving the field as the only way out (the panel floats over the figures, so a scrolled reader would have nothing to press). In its place `DropdownRow` takes a `dismiss`: an untinted, full-window press layer, `fixed` on web and negatively-inset `absolute` on native. Extends CP-014's picker half to a third layer; consistent with ADR 034, which kept backdrop dismissal for pickers when it removed it from dialogs |

| 036 | [The upload lives on the day; the message does not come back](../decisions/029-the-upload-lives-on-the-day.md) | Accepted | 07-Sep-2026 | third round on the course week strip. Puts a labelled **Awaiting upload** button on each awaiting date card, opening `/upload` with that day's `date` — the dated push round 1 wrote and 0024 reads — and brings back nothing under the strip. States what round 2 missed: the day card was a message AND a button, and only the message was the complaint. Rejects restoring the card (the exact thing the requester removed), a button beside the roster caption (one day at a time, and not on the day), and overloading the date press (tapping a day SELECTS it, ADR 030). The card becomes a frame holding two sibling controls, never a button inside a button; a phone gets the cloud alone with the word in the legend |

Status: `Proposed` · `Accepted` · `Superseded by NNN` · `Deprecated`

---

**Superseded records are never deleted.** The reasoning that was correct in 2026 explains why
the system is shaped as it is, and a reader who cannot find it will assume the shape was an
accident.

**The most valuable section of any record is "options rejected".** Six months from now, someone
will propose one of them again — and the reason it lost is the sentence that saves the
conversation.
