# Test summary

_Newest run first. Append-only: never overwrite a prior run._

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

