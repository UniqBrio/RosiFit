# DEGRADED PATHS — test the mechanism, not just the happy path
<!-- website_workflow/degraded_paths.md — added 2026-08-26 via framework_update.md.
     Cross-cutting on purpose: a DESIGN rule at Phase 2 (define the absence
     semantic once), a BUILD rule at Phase 4 (every consumer uses it), and a
     GATE rule at Phase 5 (evidence the mechanism fired). Folding it into
     qa_workflow.md would hide it from the Phase 2 designer, who is the one
     who can still make it cheap. -->

## PRIME RULE
A safety mechanism that is only ever exercised on the happy path is an
untested assumption, not a safety mechanism.

Wherever the workflow protects against missing, invalid, incomplete,
unavailable or uncertain input, the protection ITSELF must be verified —
deliberately triggered with production-shaped input, executed, observed, and
asserted. "The fallback exists, so it should work" is not evidence.

## THE INCIDENT THIS FILE GENERALISES (2026-08-26, UniqBotz production)
The framework's "unknown stays unknown" rule was implemented as a PENDING
sentinel: `process.env.X ?? PENDING`, with components calling `isPending()`
and degrading honestly. Correct design. It failed in production anyway.
`??` falls back only on `null`/`undefined`. An env block pasted into Vercel
with blank values — exactly what you do for a variable you do not have yet —
delivers an EMPTY STRING. Not null, so `??` passed it through, `isPending("")`
was false, and the UI took its "we have a value" branch with nothing in it.
Live result: `<a href="">LinkedIn</a>` in the footer, an empty href on the
contact page, and a Privacy & Grievance Officer block with a blank name and
blank address — the precise placeholder-legal-contact failure the PENDING
mechanism existed to prevent, defeated by its own fallback operator.
Build green. Types green. 80 Playwright assertions green. Every one of them
ran the path where the values were present.

## 1 — ABSENCE IS A SEMANTIC CONDITION, NOT A VALUE
Before Phase 2 closes, enumerate what "missing" can actually look like for
each failure-sensitive input. Missing has many shapes:
omitted · declared-but-empty · `null` · `undefined` · `""` · whitespace-only
· sentinel/placeholder · `0`/`false` that are LEGITIMATE values and must not
be treated as absent · an API omitting a field vs. returning explicit `null`
· a CMS empty field vs. a nonexistent field.
The question is never "is it null" — it is **"what will the real producer
actually send, in production?"** Local dev, test, staging and production can
disagree; the production shape is the one that matters.

## 2 — CENTRALISE THE SEMANTIC (one definition, every consumer)
Define "absent" ONCE and have every consumer use it. Independent per-consumer
checks are how one representation slips through while the others are handled.
The Phase 2 plan names the single helper/token; Phase 4 uses it everywhere;
a consumer that re-implements its own check is a build-rule violation.

## 3 — TEST WITH THE PRODUCER'S REAL SHAPE
The degraded case must be triggered the way production triggers it — an env
var declared blank, not simply unset, if that is what the deploy platform
does. A test that only deletes the variable proves nothing about the case
that actually shipped.

## 4 — ASSERT THE OBSERVABLE SYMPTOM, NOT THE HELPER
Prefer output-boundary assertions that survive refactoring:
  GOOD: "no rendered link has an empty or invalid href"
  WEAK: "the env helper returns the expected sentinel"
The first catches the bug regardless of which internal mechanism broke; the
second passes while the page is visibly broken.

## 5 — GATE RULE
**Untested degraded path = FAIL for that safety mechanism.**
A green happy-path suite never closes this gate. Build passing, types
passing, unit tests passing, visual output correct WITH complete data — none
of these is evidence about the incomplete-data path.

## 6 — NEVER INVENT THE MISSING VALUE
Unknown stays unknown until the owner or source supplies it. An explicit,
truthful degraded state beats a misleading partially-populated one. Never
ship a heading with an empty value under it, a CTA with an empty
destination, a legal/contact field with a blank accountable person, or a
placeholder indistinguishable from real data.

## DP CATALOGUE — degraded-path failure patterns (append-only)
Same shape as responsive_matrix.md's RF-xxx: symptom → root cause → correct
fix → the WRONG fix to reject → guarding assertion.

**DP-001 — Nullish fallback misses declared-but-empty**
Symptom: the "we have a value" branch renders with nothing in it. Cause:
`??` fires only on `null`/`undefined`; a blank-but-declared env var, an
empty CMS field, or an API `""` sails through. Fix: one central resolver
that trims and treats `""` as absent. REJECT: switching to `||` as the
blanket cure — it also swallows legitimate `0`, `false` and `""` where those
are real values; the fix is an explicit emptiness check, not a looser
operator. Guard: an output-boundary assertion (no empty `href`, no empty
required text node) run with the variable declared blank.

**DP-002 — Validation checked in one direction only**
Symptom: a check passes while the opposite, more dangerous defect ships.
Cause: the guard tests presence but not correctness, or forward but not
reverse. Precedent: `/winit` verifies no `{TOKEN}` was left unresolved, but
never that a literal was left un-tokenized — recorded as UniqBotz M-13, the
same class as DP-001 and the reason this catalogue is append-only rather
than a single rule. Fix: state the invariant in both directions and assert
both. REJECT: "the forward check is green" as evidence about the reverse.

**DP-003 — The fallback depends on the thing that is missing**
Symptom: the degraded path throws instead of degrading. Cause: the fallback
itself consumes the absent value (e.g. a placeholder URL built by string-
concatenating the missing domain; `metadataBase` given an empty string).
Fix: the fallback must be a literal that is valid standalone. Guard: run the
degraded path and assert it renders rather than errors.

## WHERE THIS RUNS
- **Phase 2** — enumerate failure-sensitive inputs, name the ONE absence
  semantic, and list the degraded cases the register must contain.
- **Phase 4** — every consumer uses that semantic; no local re-implementation.
- **Phase 5** — the degraded cases are executed and evidenced, per
  qa_workflow.md source 7 and qa_evidence_gate.md.
- **Any framework change** — if a change adds a fallback, a default, a guard,
  a sentinel, consumes optional data, or depends on owner-supplied input,
  its degraded path is tested before the change is considered complete.

## GENERALISING A NEW INCIDENT (framework_update.md step 3 applies)
Incident → root principle → general rule → workflow gate → evidence
requirement. Add the reusable pattern as a DP-xxx; never copy
incident-specific implementation detail into the framework.
