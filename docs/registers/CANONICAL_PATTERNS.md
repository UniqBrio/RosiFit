# Canonical Patterns

> **One blessed idiom per cross-cutting concern.** Inventing a second way is a defect, not a
> preference.
>
> Read the reference file and mirror it. If a concern has no row yet, **bless one first**, then
> follow it.
>
> Append-only. A row is amended in place, dated, with the superseded language kept
> (`AMENDED 2026-03-14 from "…"`). IDs are never reused.

> **Numbering starts at CP-001, and that is deliberate.** The framework seed's `CP-1`…`CP-21`
> were superseded whole at adoption on 02-Sep-2026 — twenty of their twenty-one reference files
> do not exist in this repository, because RosiFit was adopted rather than scaffolded. They are
> kept verbatim at
> [`_archive/CANONICAL_PATTERNS.framework-v1.md`](_archive/CANONICAL_PATTERNS.framework-v1.md),
> marked SUPERSEDED-AT-ADOPTION. See DECISION_LOG 002.
>
> Every row below names a file **that exists in this repository today**, verified by
> `npm run audit:rules`. A row whose reference stops existing is a dead rung and blocks.

| ID | Concern | The blessed pattern | Reference |
|---|---|---|---|
| CP-001 | Where data comes from | **One** module decides live-vs-fixtures. When `EXPO_PUBLIC_SUPABASE_URL`/`ANON_KEY` are set every read goes to the live project through the anon key and RLS decides what returns; otherwise the fixtures answer. Screens **never** branch on which is in play — they receive the same shapes either way. | `src/data/repository.ts` |
| CP-002 | Screen state | Every screen resolves through the shared hook and renders all three of `loading` / `ready` / `error`. State always starts at `loading` on both prerender and client; a forced state is applied after mount, never during first render. `?state=loading\|error` forces a branch so a reviewer can see it without breaking anything on purpose. | `src/data/useScreenState.ts` |
| CP-003 | Client-facing failure text | The technical detail goes to `console.error`; the person gets a sentence that says what failed **and that nothing was changed by it**. Unreachable-network is distinguished from a real failure. Never a raw engine string. | `src/data/repository.ts` |
| CP-004 | Edge Function error shape | Handlers `throw new HttpError(status, message)`; `errorJson()` is the only thing that writes an error body. A raw Postgres or GoTrue message must never reach a client — catch it, decide what is safe to say, raise `HttpError`. | `supabase/functions/_shared/response.ts` |
| CP-005 | Edge Function authorisation | Authenticated-only functions run as `service_role`, so RLS is **not** what protects them. Every one resolves its caller by hand from the bearer JWT, mirroring `current_app_user_id()`, and checks `is_active`. Elevated actions go through the super-admin variant. | `supabase/functions/_shared/authz.ts` |
| CP-006 | Secret derivation | `PIN_PEPPER` is read from the environment only — **never** defaulted, never generated on the fly, because a different pepper silently invalidates every credential already issued. A missing pepper is a deployment fault: answer `503` naming the fix, not an opaque `500`. | `supabase/functions/_shared/pin.ts` |
| CP-007 | The Supabase client | Exactly one client for the whole app, carrying the anon key and nothing else. During `expo export`'s Node prerender it is built storage-less and stateless; in a browser or on device it is the real one. No component constructs its own. | `src/lib/supabase.ts` |
| CP-008 | Colour | Every colour resolves from the token module. The custom-hue accent is darkened until white-on-accent clears 4.5:1 for **all 360 hues in both themes**; no pair ships unmeasured. `rung: scripts/check-contrast.ts` (2,800 pairs, fails the build) | `src/theme/tokens.ts` |
| CP-009 | Icons | A canvas glyph name is resolved through the alias table, never passed to the icon font directly. A name that stops resolving fails the build, because a missing glyph renders as a blank box — invisible in review. `rung: scripts/check-icons.ts` (71 glyphs) | `src/components/iconAlias.ts` |
| CP-010 | Status signalling | Every status carries its own **word and icon**. Colour is never the only carrier of meaning, in either theme. | `src/theme/tokens.ts` |
| CP-011 | Follow-up membership | Derived from the member list plus the saved rule, evaluated once. **Never stored as a second list** — two lists populated by two queries is exactly how the dashboard count, the weekly list and the send flow drift apart. The database's `follow_up_candidates()` agrees by construction because it evaluates the same conditions over the same figures. | `src/data/followup.ts` |
| CP-012 | Periods | ISO dates and the human label travel **together** as one value. A screen never rebuilds a label from dates, which is how two tiles end up claiming different weeks for the same numbers. Weeks are Monday–Sunday, matching `follow_up_config.week_start_day = 1`. | `src/data/period.ts` |
| CP-013 | Shell-scope state | Selections the persistent header owns — academy-vs-branch scope — live in the shell provider, not in a screen. The header renders above every tabbed screen; a value it writes cannot live inside one of them. Presentation state only: nothing here fetches. | `src/state/academy.tsx` |
| CP-014 | Sheets and modals | A closed sheet renders **nothing** — not a hidden container, which keeps focusable buttons in the DOM. On open, the opener is blurred so nothing focused is left inside an `aria-hidden` subtree. The scrim is a real control and carries a label. | `src/components/Sheet.tsx` |
| CP-015 | Hydration parity | The first client render must agree with the static export's HTML by construction. Anything that can differ between Node and the browser — font readiness, forced state, storage — renders a same-size placeholder until after mount. React discarding the tree (#418) is the failure this prevents. | `src/components/Icon.tsx` |
| CP-016 | Theme preference | Three states, not two: `light` / `dark` / `system`. The choice is the user's own and is persisted; `system` is one of three options, never the only behaviour. | `src/theme/ThemeProvider.tsx` |

---

## Adding a row

1. Confirm no existing row covers the concern. Two rows for one concern is the failure this
   register exists to prevent.
2. Write the pattern as a **rule**, not a description: something a reviewer can hold a diff up
   against.
3. Name a **working reference file**. A row with no reference is an opinion.
4. If the row came from an incident, add a sentence saying which — the *why* is what makes
   people follow it six months later.
5. Where a rung exists that enforces the row mechanically, name it: `rung: <path>`.
