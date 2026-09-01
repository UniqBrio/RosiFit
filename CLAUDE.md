# RosiFit

Standalone women's fitness academy PWA. Bootstrapped from an internal web app
framework — the framework is NOT a dependency and NOT a remote of this repo.

Stack: React Native Expo PWA, Supabase (Postgres + Edge Functions), AWS SES
behind an EmailProvider abstraction.

Git rules (binding):
- `origin` is https://github.com/UniqBrio/RosiFit and is the ONLY remote.
  Confirmed by the repo owner on 1 Sep 2026.
- NEVER add, fetch from, or push to the framework repo
  (UniqBrio/Website_development_framework). It is not a remote and not a
  dependency; this repo was bootstrapped from a copy of it.
- Adding or re-pointing a remote is denied in .claude/settings.json, as is any
  push to a literal URL. Only `git push origin ...` is permitted, so a push can
  only ever reach the repo above.
- Commit locally as often as useful.
