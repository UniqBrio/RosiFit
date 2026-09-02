---
description: Run the deterministic quality gate and report the verdict honestly
---

# /gate

Run the mechanical gate. **The model narrates; the script decides.**

```bash
npm run gate
```

(The npm script resolves the runner correctly everywhere — framework repo, workspace app,
standalone app. A bare `node scripts/gate-runner.mjs` breaks in a workspace app, whose
process half is linked rather than copied.)

**The request / scope:** $ARGUMENTS

---

## Report the verdict as the script computed it

| Exit | Verdict | What it means |
|---|---|---|
| `0` | **PASS** | Every runnable gate is green. Merge is cleared *by the mechanical gate*; the human review items in `checklists/DEFINITION_OF_DONE.md` still apply. |
| `2` | **FAIL** | Merge blocked. List exactly what must resolve. **No partial merges.** |
| `3` | **BLOCKED** | A class could **not** be verified. This is an owner decision, **never a pass.** |

**Never report a pass you did not observe.** If a step could not run, say which, and why — a
suite that reported nothing is indistinguishable from a suite that passed, and that
indistinguishability is the whole reason this script exists.

## Then

- **PASS** → close out, merge, deploy to preview, report the URL. Production promotion is a
  separate approved step.
- **FAIL** → triage per `workflows/test-gate.md` T5. Test-infrastructure defects you may fix and
  re-run. **A genuine application bug is documented and waits for approval** — never auto-fixed.
- **BLOCKED** → name the class and the reason. The owner decides whether to accept it in writing
  for this release, or to make the class runnable.

## Related

`/test` runs the full T0–T6 protocol around this script — case preparation, the four-dimension
sweep, fail-first evidence, findings routing. This command is just the mechanical part.

---

## RosiFit addendum — what this command actually does here

> Added 02-Sep-2026 at framework adoption. **Observed by running it, not predicted.** The contract
> above is the framework's and is unchanged; this section records where this repository's reality
> diverges from it, so the two never disagree silently. Full reasoning: ADR 003 and ADR 004.

RosiFit was **adopted** from a copy of the framework, not scaffolded. There is no `starter/`, no
`fixtures/` and no `design/tokens.json`, so five of the eleven steps have no input.

**`npm run gate` exits 2 (FAIL) in this repository, and that is the expected result today.**
Observed: 5 pass, 5 fail, 1 blocked.

| Step | Verdict here | Why |
|---|---|---|
| G1 · G2 · G3 | FAIL | no `design/tokens.json`. Colour lives in `src/theme/tokens.ts` — ADR 001 |
| G4 No hard-coded colours | PASS | genuine, ratcheted — **`src/` only** |
| G5 Types | PASS | genuine |
| G6 Lint | BLOCKED | no ESLint in this project — TD-004 |
| G7 · G8 | FAIL | no `test:unit` / `test:functional` script exists |
| G9 Automation addressability | PASS | genuine, ratcheted — **`src/` only** |
| G10 Backward compatibility | PASS | **do not believe it** — see below |
| G11 Wide tables | PASS | genuine, ratcheted — **`src/` only** |

### Three things to know before quoting a verdict from this command

**1. G1–G3 and G7–G8 say FAIL but mean BLOCKED.** A missing input is reported as a broken
codebase. `theme-build.mjs` throws a raw `ENOENT` that the runner's `UNAVAILABLE` list does not
match; G7/G8 run `npm run --silent test:unit`, and `--silent` suppresses the `Missing script:`
line that is the exact string the classifier greps for — their logs come back **empty**. Framework
defects F-1 and F-2, ADR 003. `/promote` candidates, deliberately not patched locally.

**2. G10's PASS is false.** `check-backward-compat.mjs` prints `this gate is INERT and is telling
you so` and then exits 0, which the runner reads as PASS. Nothing was compared. This is
green-by-omission in the step meant to prevent it — framework defect F-3, TD-007.

**3. A PASS on G4, G9 or G11 covers `src/` only.** The runner passes no `--dir`, so it never sees
`app/` — where all 30 screens live, and where 13 of the 20 colour-literal files and 29 of the 35
testID-gap files are. ADR 004, TD-008.

### What to run instead, for a verdict you can quote

```bash
npm run check      # typecheck + 2,800 contrast pairs + 71 icons — the app's real theme rungs
npm run audit:all  # all five ratchets, BOTH app/ and src/ — this is what CI runs
```

Those two are green on this branch. `npm run gate` is still worth running — G4, G5, G9 and G11 are
real — but read its report against this table, never on its own.
