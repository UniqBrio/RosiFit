
## Gate run - 2026-09-04 - VERDICT: FAIL

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

THE FOLLOW-UP THRESHOLD IS THE ACADEMY'S NOW, 1..7. Same verdict, same four accepted-
unverifiable steps.

Asked to seed a member who satisfies the missed-session rule so a live SES send could be
tested. Seeding her was easy; getting her PAST the rule was not, and the reason is a defect:

  save_course hard-coded the count at FOUR (0022, in the values list, twice). Postnatal runs
  four days a week and its schedule only starts 04-Sep, so this week holds ONE session --
  four was unreachable without inventing sessions the course never ran. And a course running
  once or twice a week could never reach four in a week AT ALL: its trigger reads as switched
  on in the form and is unreachable by arithmetic. Prenatal here runs three days; its weekly
  rule could never have fired.

course_follow_up_config has carried weekly_threshold and consecutive_threshold since 0009. The
columns were always there. Only the form and save_course insisted on four.

  0030          p_threshold smallint default 4, range 1..7, checked in SQL. The old 9-arg
                signature is DROPPED, not left beside it -- two save_course functions differing
                only in a defaulted trailing argument is an ambiguous call for PostgREST.
  followup.ts   MIN/MAX_THRESHOLD and clampThreshold, in the PURE layer: the form imports
                react-native, which cannot be transformed under node, so anything a spec needs
                to reach lives there. It is also the layer that already owns what a rule means.
  course/edit   a - N + stepper. Both radio labels now say the real number, and when the
                threshold exceeds the days the course runs it says so in place: "This course
                runs 2 days a week, so 4 can never be reached -- nobody will ever be followed
                up." That sentence is the defect, made visible where it is caused.

FAIL-FIRST: src/data/threshold.test.ts -- observed failing against a tree where clampThreshold
trusts the stored value as-is (`return n`), which is exactly what the form would do if it
believed whatever the database handed it. 0009 put no CHECK on these columns, so a row written
before 0030 or by hand can say anything.

  with the defect: 7 tests, 2 pass, 5 FAIL
    not ok 2  the stepper cannot go below one
    not ok 3  the stepper cannot go above seven
    not ok 5  a stored value outside the range is pulled back in, not trusted
    not ok 6  a fraction rounds rather than sneaking through
    not ok 7  a nonsense value falls back to four, the number this always used to be
  reverted:        7 tests, 7 pass, 0 fail

Seven unit specs (266 -> 273) pin the bounds, the rounding and the NaN fallback.
supabase/tests/23_course_threshold.sql adds 14 assertions -- unrun, no psql (ADR 005).

REHEARSED against production by the ADR 007 rolled-back method, 10 of 10:

  01 exactly one save_course (no overload)      06 eight REFUSED
  02 an omitted argument still means 4          07 neither refused call wrote a course
  03 threshold 1 accepted, returned             08 Postnatal edits to 1
  04 the disabled trigger keeps the count       09 Shazia IS FLAGGED -- "Missed 1 of 1
  05 zero REFUSED                                  sessions this week", email true
                                                10 nobody else pulled in (1 on the list)

That tenth one mattered: Anita is also in Postnatal and has a REAL third-party address on
file. She has no absences, so she stays off the list and cannot receive a test email.

Rolled back clean: 0 probe courses, Postnatal still at 4. Live: one save_course, it takes
p_threshold, ledger 26.

---

## Gate run - 2026-09-05 - VERDICT: FAIL

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

## Gate run - 2026-09-05 - VERDICT: FAIL

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

## Gate run - 2026-09-05 - VERDICT: FAIL

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

## Gate run - 2026-09-05 - VERDICT: FAIL

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

## Gate run - 2026-09-05 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

Steps: 4 pass, 4 fail, 3 blocked.

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
- **G5 Types** - FAIL

```
app/(tabs)/attendance.tsx(215,41): error TS2345: Argument of type 'string' is not assignable to parameter of type '"/upload" | "/audit" | "/(tabs)/weekly" | RelativePathString | ExternalPathString | "/appearance" | `/appearance?${string}` | `/appearance#${string}` | `/audit?${string}` | ... 137 more ... | { ...; }'.
app/(tabs)/attendance.tsx(226,41): error TS2345: Argument of type 'string' is not assignable to parameter of type '"/upload" | "/audit" | "/(tabs)/weekly" | RelativePathString | ExternalPathString | "/appearance" | `/appearance?${string}` | `/appearance#${string}` | `/audit?${string}` | ... 137 more ... | { ...; }'.
app/(tabs)/attendance.tsx(240,39): error TS2345: Argument of type 'string' is not assignable to parameter of type '"/upload" | "/audit" | "/(tabs)/weekly" | RelativePathString | ExternalPathString | "/appearance" | `/appearance?${string}` | `/appearance#${string}` | `/audit?${string}` | ... 137 more ... | { ...; }'.
app/(tabs)/members.tsx(107,39): error TS2345: Argument of type 'string' is not assignable to parameter of type '"/upload" | "/audit" | "/(tabs)/weekly" | RelativePathString | ExternalPathString | "/appearance" | `/appearance?${string}` | `/appear
... (truncated)
```

- **G6 Lint** - BLOCKED - prerequisite G5 did not pass
- **G7 Unit + pure specs** - BLOCKED - prerequisite G5 did not pass
- **G8 Functional / integration** - BLOCKED - prerequisite G5 did not pass
- **G9 Automation addressability** - PASS
- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

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

RETIRING THE MEMBER CODE: this verdict is the SAME verdict the run above it recorded, on the
same four steps, and none of them is this change. G1/G2/G3 fail on a missing `design/tokens.json`
that this repository deliberately does not have (DECISION_LOG 003-005); G8 fails because no
`test:functional` script exists (DECISION_LOG 009); G6 is blocked for want of a local eslint
(DECISION_LOG 007). Compare the two reports line for line -- every step that reports on code
this change touched is PASS, and G5 Types, G7 Unit and G10 Backward compatibility (fixtures) are
the three that would have caught it if the Member type, the eight fixtures or the token map had
gone out of step.

What was verified directly, and is not in the gate:
  npm run check  -- 229 unit assertions, 2840/2840 contrast pairs, 75/75 icons
  npm run audit:all -- six audits, no new violations; COLUMN CONTROL and DEAD WEIGHT still clean

What was NOT verified, and must be before 0026 is applied anywhere:
  bash db/harness/test.sh -- this machine has neither psql nor Docker, which is exactly the
  situation ADR 005 was written for: CI runs the harness against services: postgres:16, and that
  run is the rehearsal. 0026 and supabase/tests/20_no_member_code.sql have never been executed.

---
FAIL-FIRST: src/data/meetCsv.test.ts (REAL_FILE) - observed failing against the tree, on the
genuine export rather than on a fixture. This is the SECOND time this parser was wrong about the
same file, and the first fix is why:

That fix was written against `*,Meeting code: gzj-yhru-ehp` -- copied from a SPREADSHEET VIEW of
the export, where Excel shows the bullet in column A and the text in column B because it splits on
whitespace for display. The bytes are one quoted cell:

    "*     Meeting code: gzj-yhru-ehp"

so a pattern anchored at the label matched nothing. Running the actual file:

    meta.code : null      created : null      ended : null      date : null

The rows parsed, so nothing looked broken -- and the upload's Process button is disabled without a
date, so the import could not be started at all. A fixture that passed and a parser that failed.

The fixture is now reconstructed from the file itself, BOM and CRLF included, so it cannot be
"fixed" against a picture of a file again. Also fixed: the UTF-8 BOM was left in the first cell,
which is harmless while the table starts on line 5 and fatal for an export whose header is line 1
-- "Full Name" would fail to match on an invisible character and the message would blame the file.

FAIL-FIRST: src/data/meetCsv.test.ts (the real export shape) and supabase/tests/18_import_session.sql
- both were observed failing against the tree BEFORE the fix, and the first failure was found by
running the parser against a REAL Google Meet export rather than against a fixture I wrote.

The file:

    *,Meet
    *,Meeting code: gzj-yhru-ehp
    *,Created on 2026-08-31 20:12:56
    *,Ended on 2026-08-31 20:15:25
    Full Name,First Seen,Time in Call
    RosiFit,2026-08-31 20:12:56,00:00:32
    UniqBotz Info,2026-08-31 20:12:58,00:02:28

Parsed against the old reader:

    rows      : [{"full_name":"RosiFit",...},{"full_name":"UniqBotz Info",...}]
    skipped   : 4
    meta.code : null
    created   : null
    ended     : null
    date      : null

THE ROWS PARSED, so nothing looked broken. readMeta took cells[0] as the label and cells[1..] as
the value, which only fits `Meeting code,abc-defg-hij`. A real export writes ONE cell -- "Meeting
code: gzj-yhru-ehp" -- behind a `*` marker, so the file's only evidence of WHICH meeting it came
from and WHEN was silently discarded. The session could not be derived from the file at all, which
is the whole mechanism this change rests on.

The value is matched by PREFIX, not by splitting on ':', and there is a case pinning why:
"Created on 2026-08-31 20:12:56" split at its first colon yields the time 12:56 and a date ending
in 20.

18_import_session.sql failed against 0023 on the assertion that matters most:

    FAIL  a session the schedule does not cover expects EVERYONE ENROLLED, not nobody
          got 'schedule' want 'all_enrolled'
    FAIL  both enrolled members were due -- this is the number that used to be 0
          got 0 want 2

That is the defect stated exactly: attendance "recorded" for a class that counted for nobody.

ALSO OBSERVED, my own bug rather than the product's: three assertions first errored with "column
reference status is ambiguous" -- attendance_records and sessions both have one and I joined them
without qualifying. Fixed in the spec, not in the product.

NOT OBSERVED FAILING: rosterScope (src/data/course.test.ts, 8 new cases) - the helper is new and
every case passed on its first run. It was not written for a defect already in the tree; it was
written because the change that needed it INTRODUCED the exposure. The chevron on a course card
opens /members?courseName=…, and the members screen renders that value as its heading and inside
"Nobody is enrolled in X". Without resolution against the academy's own course list, any link
could have put any string in the app's mouth, spoken as fact.

Driven in a browser against the exported build, since "what does the heading say" is only
answerable there:

  ?courseId=c1&courseName=Prenatal%20Flow  -> Prenatal Flow | 3 members in this course
  ?courseName=prenatal%20flow              -> Prenatal Flow | 3 members in this course
  ?courseName=Advanced%20Wizardry          -> Members | 8 members · 3 branches · 4 courses
  ?courseName=All%20courses                -> Members | 8 members · 3 branches · 4 courses
  ?courseName=<script>alert(1)</script>    -> Members | 8 members · 3 branches · 4 courses
  (no parameter)                           -> Members | 8 members · 3 branches · 4 courses

The lowercase case matters as much as the refusals: the ACADEMY'S spelling is rendered, never the
caller's, so a hand-edited URL cannot restyle a course name in the heading.

The "All courses" case is a hole the first version had. fetchFilterOptions heads its option list
with that literal for the picker, so ?courseName=All courses resolved to it and produced an empty
roster under a heading naming a course nobody teaches. The screen slices the head off before
asking; the case pins WHY, so deleting the slice fails here rather than in production.

NOT OBSERVED FAILING: src/data/uploadScope.test.ts - scopeSessions is new and all 13 cases passed
on their first run. The behaviour it replaces was not a wrong computation but an ABSENT one:
app/upload.tsx read `const sessions = pending.data ?? []` and offered every session awaiting a
file in the academy, whatever screen had opened it. There was no branch to fail.

Verified instead by driving all six shapes against the exported build, which is where "did the
narrowing happen" is actually answerable:

  /upload                              -> 2 sessions, picker      (academy-wide, unchanged)
  /upload?courseId=c1                  -> straight to step 2      (c1 has one pending session)
  /upload?courseId=c1&date=2026-08-22  -> straight to step 2      (preselected)
  /upload?courseId=c1&date=2026-08-19  -> "That session is no longer waiting for a file"
  /upload?courseId=c9                  -> "No session for this course is waiting for a file."
  /upload?courseId=c1&date=undefined   -> the course scope, date ignored
  then "Change" on step 2              -> back to /upload, full picker

THE TWO CASES THAT MATTER are refusals, and both are asserted rather than merely observed:

  - a scope matching nothing does NOT widen back to every session. She tapped "Upload this
    session" about ONE session; handing her twelve others as though that were the answer is how
    the wrong file reaches the wrong class.
  - two sessions of one course on one day (two branches) are NOT resolved to the first. Silently
    taking one would attach Coimbatore's register to Chennai.

'?date=undefined' is asserted because that is literally what `${maybeDate}` produces from a
missing value; filtering on it would empty the list and blame the sessions.

NOT OBSERVED FAILING: src/data/nav.test.ts - safeBackTarget was written after the defect it
serves was reproduced in a BROWSER, and every case passed on its first run. The defect itself was
observed, twice, against the exported build:

  BEFORE: course detail -> "Weekly review" -> back  ==>  http://127.0.0.1:8100/
  AFTER : course detail -> "Weekly review" -> back  ==>  http://127.0.0.1:8100/course/c1

The first is Overview, not the course the person opened Weekly review from. Weekly lives inside
the tab group (the canvas keeps the academy header and nav pill on it), and navigating to a screen
in a Tabs navigator switches the focused tab rather than pushing -- so router.back() pops to the
FIRST tab. Nothing in the code says so; only running it does.

The refusal cases are the substance, and one of them was also driven in the browser:

  /weekly?from=https%3A%2F%2Fevil.example  ->  back  ==>  http://127.0.0.1:8100/courses

`from` is a URL parameter on a control whose whole promise is "you will end up where you were", so
an unvalidated one is an open redirect wearing an arrow icon. //host and /\host are asserted
separately from the absolute-URL case because both START WITH A SLASH and would otherwise read as
in-app paths.

FAIL-FIRST: scripts/audits/check-audit-attribution.test.sh - the gate it tests was observed
failing and passing by hand before the cases were written: reverting send-followups' one call
site from audit_log_as back to audit_log made `npm run audit:auditactor` exit 1 naming that file,
and restoring it returned "OK ... 0 unattributed". The cases reproduce exactly that, plus the
three the hand check could not cover:

  - an auth.* action inside a NON-exempt function is still blocked, so a post-session function
    cannot borrow the pre-session exemption by naming its action 'auth.something'
  - the three exempt functions are counted AS exempt rather than folded into the clean count
  - an EMPTY tree reports "0 attributed" rather than silence

That last one is the reason the file asserts on output and not only on exit codes. A gate that
guards a silent defect is silent when it breaks: one stray character in its regex and it passes
everything forever, cheerfully reporting "0 unattributed" about a tree it never read. Exit code 0
is indistinguishable between "clean" and "scanned nothing".

FAIL-FIRST: supabase/tests/17_audit_actor.sql - observed failing against the tree BEFORE 0023,
which is the defect itself rather than an injected one. Every assertion naming audit_log_as failed
with

    ERROR:  function public.audit_log_as(unknown, unknown, unknown, unknown) does not exist

and the two assertions that PIN the old behaviour passed then and pass now, which is the point of
their being there:

    PASS  audit_log() through service_role still records NO actor -- the defect, unchanged
    PASS  and still labels it anon, which is what an unauthenticated request would carry (= anon)

The defect was reproduced first, in one statement on the harness, before any code was written:

    begin; set local role service_role;
    select public.audit_log('communication.batch_sent','email_batch','b1'); commit;
    -->  actor_app_user_id | actor_kind |          action
         ------------------+------------+--------------------------

## Gate run - 2026-09-04 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

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

## Gate run - 2026-09-04 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

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

## Gate run - 2026-09-04 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

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

## Gate run - 2026-09-04 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

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

## Gate run - 2026-09-04 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

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

## Gate run - 2026-09-03 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

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

## Gate run - 2026-09-03 - VERDICT: FAIL

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
- **G7 Unit + pure specs** - PASS
- **G8 Functional / integration** - FAIL

```
exit 1
```

- **G9 Automation addressability** - FAIL

```
BLOCKED [TEST ID COVERAGE] - 1 new violation(s):
BLOCKED [TEST ID COVERAGE] - 1 baselined item(s) now pass but are still listed:
```

- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-03 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

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

## Gate run - 2026-09-03 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

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

## Gate run - 2026-09-03 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

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
                           | anon       | communication.batch_sent

A null actor with kind 'anon' -- the label an UNAUTHENTICATED request carries -- for a batch of
emails a named super admin sent. That query is what turned "the spec says attribute actions" into
a defect with a reproduction.

ALSO OBSERVED, and the reason the fix stops where it does: the same probe run as `authenticated`
with a JWT claim set records the actor correctly (branch.insert, super_admin, "Client Admin"), so
the row triggers were never broken and only the service-role path needed the actor passing in.

FAIL-FIRST: src/data/signin.test.ts - the spec failed on its FIRST run, against my own first
cut of groupPhone. That version stripped non-digits and took the first ten, so a number pasted
whole from a contact card -- "+91 80563 29742", beside a field already labelled +91 -- shifted
two places and became "91805 63297". A plausible ten-digit number belonging to nobody, with
nothing on screen to say it was wrong.

    not ok 4 - punctuation and spaces are dropped, never counted
      error: |-
        Expected values to be strictly equal:
        + actual - expected
        + '91805 63297'
        - '80563 29742'

Captured verbatim in .evidence/signin-fail-first.txt. The fix strips a leading 91 or 0 only when
the input is LONGER than ten digits, so '91234 56789' -- a real number that begins 91 -- keeps
all ten. Both halves of that are asserted, because stripping unconditionally would have eaten
two of somebody's real digits and passed the original case.

NOT OBSERVED FAILING: needsRegistration - the routing predicate was written after the defect
above and every case passed on its first run. Its negative cases are the substance: auth-login's
generic refusal, a lockout, a disabled account and a network error must all NOT route to
registration, since treating the generic refusal as "unknown number" would rebuild the
enumeration oracle the function is built to deny.

FAIL-FIRST: src/data/message.test.ts - run against a SINGLE-brace filler, which is the defect
the course form's preview caught the first time it rendered. The stored templates use
{{double_brace}} tokens because that is what send-followups/index.ts renders; a single-brace
filler matched the INNER braces and turned "{{first_name}}" into "{Divya}", then flagged five of
the seeded template's own tokens as unknown.

    not ok 2  - the name splits to a first name
    not ok 3  - the figures are the member's own
    not ok 4  - attendance is a percentage of what was EXPECTED
    not ok 5  - nothing expected is an em dash, never 0%
    not ok 8  - a value containing a token is not substituted again
    not ok 9  - the same token repeated is filled every time
    not ok 13 - SINGLE braces are not tokens - the sender only reads double
    # pass 7  # fail 7

FAIL-FIRST: src/data/recipients.test.ts - run with the exclusion half dropped, which is the
C-76 defect in its purest form: a draft that lists only who it WILL reach reads as complete
while it silently skips somebody the rule named.

    not ok 2 - a member with NO address is excluded and kept, not dropped
    not ok 3 - the two halves account for EVERY flagged member
    # pass 5  # fail 2

Writing that spec also surfaced a require cycle the typechecker could not see: importing mock's
hasEmail as a VALUE into followup.ts closed a loop -- mock imports isEligible and attendancePct
from followup and calls both in its module body, so it ran before they existed and threw at
load. Type imports are erased, which is why the cycle had never bitten. Both revert clean:
156/156.

NOT OBSERVED FAILING: supabase/tests/15_course_communication.sql (17 assertions) and
16_save_course.sql (18) are new against migrations that did not exist before them, so there is
no prior implementation to observe failing. They were written against the running harness and
each was seen to fail while being written -- the type mismatch on sessions_per_week and the
`set local` outside a transaction both showed up that way -- but that is a spec being corrected,
not a defect being caught, and it is recorded as the weaker thing it is.

09_grants.sql now fails in a THIRD way, and this one is caused here: it is a whitelist scoped to
"0002-0010" and course_communication (0021) is outside it, so the table reads as want[none]. The
new table's grants are asserted in 15_course_communication.sql instead, because test files are
append-only and repairing the whitelist means editing an existing spec. Worth the repo owner's
decision rather than mine.

---

## Gate run - 2026-09-03 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

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

## Gate run - 2026-09-03 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

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

## Gate run - 2026-09-03 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

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

FAIL-FIRST: src/data/course.test.ts - the two defects this spec exists to hold were injected
and observed. Counting a member with no address as needing follow-up, and letting the follow-up
sentence outrank "no weekdays":

    not ok 5 - a member with NO ADDRESS is never counted as needing follow-up
    not ok 9 - NO WEEKDAYS outranks the follow-up sentence entirely
    # pass 12  # fail 2

not ok 5 is C-76: she is over the threshold and cannot be emailed, so counting her promises a
send with nowhere to go. not ok 9 is the worse one -- a course with no weekdays expects nothing
of anyone, so no absence can be counted and it sits outside the engine entirely; reporting
"nobody needs follow-up" there is true and deeply misleading. Both revert to 14/14.

FAIL-FIRST: src/data/report.test.ts (bar geometry) - run against the naive implementation the
cases exist to rule out: every bar filling the track, and a count written into every segment
however narrow.

    not ok 16 - the bar LENGTH is the scheduled count, which is what its legend claims
    not ok 17 - the split inside a bar is that row's attendance
    not ok 20 - a count is written inside a segment only when it fits
    not ok 22 - the widest row fills the track exactly, never overflows it
    # pass 18  # fail 4

not ok 16 is the one the legend promises out loud: "Bar length = sessions scheduled". A full-
width bar per row makes a 4-session course look like a 40-session one, which is the whole
comparison the screen exists for. Reverted, 22/22.

NOT OBSERVED FAILING: the shell's two-tab row and the Attendance workspace card carry no unit
specs of their own -- they are layout, and this repository has no renderer in its test program.
Both were verified by SCREENSHOT in a browser instead, in both themes, against the design
prototype driven side by side. That is weaker than a spec and is recorded as such rather than
counted as green.

---

## Gate run - 2026-09-03 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

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

FAIL-FIRST: src/data/meetCsv.test.ts - observed failing against the parser it replaces. The
pre-fix parser read `lines[0]` as the header and captured no meta; restoring exactly that
produced 6 failures from 23, headed by the one that matters:

    not ok 1 - a REAL export with a preamble is read, not refused
    not ok 2 - the preamble lines are counted, not silently swallowed
    not ok 4 - a preamble row is never mistaken for a member
    not ok 5 - the meeting code is captured, because it is the only evidence of WHICH meeting
    not ok 6 - created and ended times are captured verbatim
    not ok 8 - an unquoted timestamp split across commas is rejoined, not truncated
    # pass 17  # fail 6

not ok 1 is the shipped defect, not a hypothetical: a genuine Google Meet export was refused
with "that file has no Full Name column", so the reader was wrong and the message blamed the
file. not ok 4 is the one that would have corrupted an import rather than blocking it --
"Meeting code" read in as a member's name.

FAIL-FIRST: src/theme/hue.test.ts - this spec caught its defect DURING development, and the
failure was reproduced afterwards by restoring it (taking the modulo before the round instead
of after):

    not ok 10 - every hue it returns is inside 0..359, which is what the generator takes
    # pass 9  # fail 1

A red one point off pure has a true hue of 359.765, which rounded UP to 360 -- a position
check-contrast.ts never measures, because the sweep it verifies is 0..359.

FAIL-FIRST: src/data/report.test.ts - the arithmetic it covers replaced hardcoded arrays, so
the two defects a re-implementation would most plausibly carry were injected instead: averaging
each group's member percentages rather than summing expected and attended, and returning 0 for
a group where nothing was expected. 6 failures from 14:

    not ok 2 - the Courses scope groups and SUMS, it does not average percentages
    not ok 4 - groups come back in a stable, name-sorted order
    not ok 5 - nothing expected is null, NEVER zero per cent
    not ok 6 - a group where nobody was expected is null too
    not ok 7 - one expected member rescues a group from null
    not ok 9 - the total of an empty set is null, not a division by zero
    # pass 8  # fail 6

not ok 5 is the one that misleads a reader of the report: a course with no sessions this month
and a course everybody skipped are different facts, and 0% states the second about the first.

FAIL-FIRST: src/data/distribution.test.ts - the arithmetic was extracted verbatim from the
dashboard's render body, so it could not fail as-found; the two defects the spec exists to hold
were injected instead - dropping the Math.max clamp on `missed`, and dropping the not-expected
segment. 5 failures from 10:

    not ok 3 - a REDUCED schedule counts as not-expected, never as missed
    not ok 5 - a reduced schedule AND an absence are counted separately
    not ok 6 - attending more than expected is an extra, never a negative miss
    not ok 7 - one extra does not cancel another member's real absence
    not ok 8 - a member expected at nothing is entirely not-expected
    # pass 5  # fail 5

not ok 3 is the consequential one: a member on a 4-day override reads as a 6-day member who
skipped twice, and gets chased for two sessions she was never due at. not ok 7 is the quieter
one - one member's extra attendance cancelling another's real absence, so the academy's total
misses are under-reported.

All four specs pass with the injected defects reverted: 113/113 across the suite.

---

## Gate run - 2026-09-03 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

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

GATE VERDICT UNCHANGED BY THIS BRANCH. The run below is FAIL, and was FAIL on main before any
of this work: "6 pass, 4 fail, 1 blocked" on 2026-09-02 and the same on 2026-09-03. Every one of
those five is a structural gap in the repo, not a regression from these commits, and each was
checked rather than assumed:

  * G1/G2/G3 (theme artifacts, tokens in sync, theme assets per theme) - all three open
    design/tokens.json, which has NEVER been committed: `git log --all -- design/tokens.json`
    returns nothing. The 2026-09-02 run failed the same way, with a Windows path in the error.
  * G6 (Lint) - BLOCKED. eslint is not a dependency; `grep -c eslint package.json` is 0. The
    gate refuses to fetch it from the registry on purpose, so this class stays unverified.
  * G8 (Functional / integration) - runs `npm run test:functional`, which is not a script in
    package.json ("Missing script"). Nothing to execute, so nothing can pass.

What this branch DID verify, on this machine:
  * npm run check green - 113 unit assertions (57 added here), 2836/2836 contrast pairs,
    75/75 canvas icons.
  * npm run audit:all clean, with three ratchets PAID DOWN rather than baselined:
    hardcoded colours 13 -> 11 in app/, test ids 26 -> 24 in app/.
  * bash db/harness/test.sh - Postgres 16 IS available in this session, so the DB harness ran
    for the first time (TD-010's remaining half is closed on this machine). 215 assertions pass.
    0019 and 0020 both apply cleanly, and the two specs added here pass in full:
    13_branch_add_remove.sql 11/11 and 14_delete_course.sql 16/16.

    TWO specs fail, and BOTH are pre-existing. Proved rather than assumed: with 0019, 0020,
    13_* and 14_* moved out of the tree, the harness fails identically, at the same line
    numbers, on main's schema alone.
      - 09_grants.sql - "authenticated holds exactly the table privileges 0002-0010 intended"
        wants holidays [INSERT,SELECT,UPDATE] and gets [DELETE,INSERT,SELECT,UPDATE]. 0017
        added that DELETE grant deliberately, so the SPEC is stale against a later migration.
        Neither is touched here: test files are append-only, and 0017 is applied.
      - 11_holiday_delete.sql - errors at its own setup, before any assertion runs
        ("duplicate key value violates unique constraint sessions_unique_live").
  * Every screen changed was driven in a real browser in BOTH themes: the simplified dashboard,
    the courses branch filter, the reports export (downloaded and its CSV content read), the
    upload session map against three real Meet-shaped files, and all four hex-input paths.

One earlier claim in this session was WRONG and is corrected here: a low-contrast reading of
1.12:1 on stack screen titles in dark mode was an artefact of a verification script walking up
to an ancestor container instead of the painted header. Pixel sampling of the header shows
#0C0409 in dark and #FBF8FA in light, identical with and without a change I had begun making,
so app/_layout.tsx was left exactly as it was. There was no contrast defect.

---

FAIL-FIRST: src/data/schedule.test.ts - observed failing against the implementation it replaces
before it was trusted. The two call sites in repository.ts each carried their own inline copy of
the schedule-window arithmetic; both were re-injected into src/data/schedule.ts - `effective_to
<= onDate` (an exclusive end, which is what an inline `to < today` guard becomes once the row is
closed at `new_start - 1`) and a bare `out.set(...)` with no comparison (last row wins, which is
what a plain overwrite loop does). From 10 cases that produced 2 failures and 8 still-passing:

    not ok 3 - a version ENDING today is still in force -- both ends are inclusive
    not ok 8 - row order does not decide the answer
    # pass 8  # fail 2

Both defects were reverted; 10/10 pass and 32/32 across all spec files. The first failure is the
one worth naming: an exclusive end leaves the CHANGEOVER DAY covered by neither version, so on
the day a schedule changes every member is expected at nothing and nothing errors.

NOT OBSERVED FAILING: supabase/tests/12_offering_schedule.sql - 17 assertions on 0018
(set_offering_schedule exists at all, weekday sorting and de-duplication, the staff refusal,
versioning and the closure date, the same-day correction, the completed-session guard from both
sides plus the day-after boundary its error message promises, empty and out-of-range weekdays,
and that offering_schedules STILL has no direct write policy). It has never been run: no docker,
no psql, no postgres binary on this machine (TD-010's remaining half), so `bash db/harness/
test.sh` cannot start. It will first execute in CI. The same remains true of 10_add_member.sql
and 11_holiday_delete.sql from the parallel sessions.

0018 IS NOT APPLIED. It is committed as a file. The live schema is 0001-0015; set_offering_schedule
is absent from it, confirmed by a read-only PostgREST probe from a parallel session. Applying it
is the repo owner's decision, and CLAUDE.md's rule stands: the live Supabase project is never an
automated target without explicit instruction.

---

## Gate run - 2026-09-03 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

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

## Gate run - 2026-09-03 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

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


---

## 05-Sep-2026 — Continue validates the mobile number
`requests/2026-09-05-mobile-number-not-validated.md` · Track C · RC-015

**FAIL-FIRST** — `src/data/signin.test.ts`, run against the pre-fix tree
(`npx tsx --test src/data/signin.test.ts`), captured in
`.evidence/continue-validation-fail-first.txt`:

```
not ok 20 - a recognised number goes to the PIN screen, never straight in
not ok 21 - an unrecognised number goes to registration
not ok 22 - a lookup that did not answer STAYS on the number screen
```

`(0 , import_signin.continueDestination) is not a function` — the decision the
screen was making inline did not exist as anything a test could reach, which
is the reason it could be wrong without anybody noticing.

**PASS after the fix** — 22/22 in that file; `npm run check` green end to end:
typecheck · 266 unit cases · 2,840/2,840 contrast pairs · 75/75 icons.

**NOT OBSERVED FAILING** — the server half. `supabase/functions/auth-lookup/`
is new, has no JS test path (Deno, deployed separately), and **is not deployed**,
so nothing has exercised it against a real `app_users` row. Its behaviour is
proven only by reading. That is a real gap, not a formality: the three JS cases
prove what the screen does with an answer, not that the answer is right.

**DB harness — N/A.** No migration. `auth-lookup` reads `app_users.phone_e164`,
a column `auth-login` already reads; nothing about the schema changes.
