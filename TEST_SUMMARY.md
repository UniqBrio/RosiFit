FAIL-FIRST: src/data/holiday.test.ts - observed failing against injected defects before it was
trusted. Two changes to src/data/holiday.ts - `if (!to) return { from, to: '' }` (an empty end
date becoming an OPEN-ENDED range instead of a one-day closure) and `return holiday.branch ===
branch` (dropping the `branch === null` arm, which inverts the widest closure the product has
into the narrowest) - produced, from 12 cases, 3 failures and 9 still-passing:

    not ok 1 - an empty end date is a ONE-DAY closure, not an open-ended one
    not ok 7 - both ends of the range are INCLUSIVE
    not ok 8 - branch null means EVERY branch, never none
    # pass 9  # fail 3

Both defects were reverted and all 12 pass; 22/22 across both spec files.

NOT OBSERVED FAILING: supabase/tests/11_holiday_delete.sql - 18 assertions on 0017 (insert marks,
range edit re-marks, delete restores, completed and cancelled untouched, the BEFORE DELETE
ordering clearing sessions.holiday_id ahead of the foreign key, the audit trail, and that
apply_holiday/remove_holiday are still NOT executable by `authenticated`). It has never been
run: there is no docker, no psql and no postgres server binary on this machine (TD-010's
remaining half), so `bash db/harness/test.sh` cannot start. It will first execute in CI. The
same is true of supabase/tests/10_add_member.sql from the parallel session.

Gate G8 Functional / integration still FAILs on a missing `test:functional` script (TD-006) -
which remains the one step that would have caught RC-008, and would catch a delete button whose
migration is unapplied (TD-013).

---

FAIL-FIRST: src/data/attendance.test.ts - observed failing against an injected defect before it was trusted.
Removing the `if (d > new Date()) continue` guard and setting `expected: true` unconditionally in
attendanceFixture produced, from 10 cases, 2 real failures and 8 still-passing:

    not ok 2 - no row is dated in the future
      error: '2026-09-11 is in the future'
    not ok 3 - an absent row is always expected - the table's own invariant
      expected: false / actual: true
    # pass 8  # fail 2

The defect was reverted and all 10 pass. G7 Unit + pure specs moves FAIL -> PASS with this file;
`npm run test:unit` is now part of `npm run check`.

Still failing, all pre-existing and none touched by this change: G1/G2/G3 want design/tokens.json,
which this app does not have (its measured palette is src/theme/tokens.ts, verified by
`npm run check:contrast` - 2800/2800 pairs). G8 runs `npm run test:functional`, a script that does
not exist. G6 has no local eslint.

---

## Gate run - 2026-09-02 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

- **G1 Theme artifacts in sync** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS
- **G5 Types** - PASS
- **G6 Lint** - BLOCKED - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - PASS
- **G8 Functional / integration** - FAIL

```
exit 1
```

- **G9 Automation addressability** - PASS
- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

---


## Gate run - 2026-09-02 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

- **G1 Theme artifacts in sync** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS
- **G5 Types** - PASS
- **G6 Lint** - BLOCKED - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - PASS
- **G8 Functional / integration** - FAIL

```
exit 1
```

- **G9 Automation addressability** - PASS
- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

---
# Test summary

_Newest run first. Append-only: never overwrite a prior run._

---

## Gate run - 2026-09-02 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.

- **G1 Theme artifacts in sync** - FAIL

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS
- **G5 Types** - PASS
- **G6 Lint** - BLOCKED - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL

```
exit 1
```

- **G8 Functional / integration** - FAIL

```
exit 1
```

- **G9 Automation addressability** - PASS
- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-02 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.

- **G1 Theme artifacts in sync** - FAIL

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS
- **G5 Types** - PASS
- **G6 Lint** - BLOCKED - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL

```
exit 1
```

- **G8 Functional / integration** - FAIL

```
exit 1
```

- **G9 Automation addressability** - PASS
- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-02 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.

- **G1 Theme artifacts in sync** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS
- **G5 Types** - PASS
- **G6 Lint** - BLOCKED - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL

```
exit 1
```

- **G8 Functional / integration** - FAIL

```
exit 1
```

- **G9 Automation addressability** - PASS
- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

