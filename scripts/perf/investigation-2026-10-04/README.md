# Performance investigation scripts (4 Oct 2026) — not part of any gate

Read-only diagnostics behind `docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md`. Nothing here touches production.

1. `mkdir certs && openssl req -x509 -newkey rsa:2048 -nodes -keyout certs/k.pem -out certs/c.pem -days 2 -subj /CN=localhost`
2. `EXPO_PUBLIC_SUPABASE_URL=https://localhost:54322 EXPO_PUBLIC_SUPABASE_ANON_KEY=x npx expo export --platform web --clear`
3. `node serve.js dist` (static, :4173, no compression) and either `node standin.js` (answers `[]`, DELAY ms) or `MEMBERS=1644 node standin2.js` (realistic data, PostgREST filter subset).
4. `npm i --no-save playwright-core@1.63.0`, then `node scenarioA.js` (requests per phase: cold start, tabs, idle, focus return), `node scenarioB.js` (DOM nodes, script time, long tasks, keystroke cost per screen), `CPU=4 node scenarioC.js` (throttled cold-start phases).
5. `npx tsx csvtime.ts` (browser CSV parse + edge fuzzy matcher timings).
6. `bash db/harness/start.sh && bash loadtest.sh 1500` (harness replay + `seed_scale.sql` + timings; every write rolled back).
