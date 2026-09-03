#!/usr/bin/env bash
# check-audit-attribution.test.sh - EXECUTE the attribution gate against scratch trees.
#
# WHY THIS EXISTS AND WHY IT MUST EXECUTE
#   The gate it tests exists because nothing FAILS when an Edge Function drops the actor: the
#   write succeeds, the screen renders, and only a column is empty (RC-011). A gate guarding a
#   silent defect is itself silent when it breaks -- a stray character in its regex and it
#   passes everything forever, reporting "0 unattributed" about a tree it never read.
#
#   So this asserts the gate FAILS on a tree that should fail, and it asserts the count, not
#   just the exit code: "0 unattributed" out of 0 files scanned is the failure mode a pass/fail
#   assertion cannot see.
#
# Run: bash scripts/audits/check-audit-attribution.test.sh
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CHECK="scripts/audits/check-audit-attribution.mjs"
PASS=0; FAIL=0

# The check resolves supabase/functions from process.cwd(), so a scratch tree is a directory
# with that shape and nothing else -- no repo, no fixtures, no chance of reading the real one.
scratch() { local d; d="$(mktemp -d)"; mkdir -p "$d/scripts/audits" "$d/supabase/functions"
  cp "$ROOT/$CHECK" "$d/$CHECK"; echo "$d"; }

fn() { # <dir> <function-name> <body>
  mkdir -p "$1/supabase/functions/$2"; printf '%s\n' "$3" > "$1/supabase/functions/$2/index.ts"; }

expect() { # <label> <expected-exit> <dir>
  local out; out=$( cd "$3" && node "$CHECK" 2>&1 ); local got=$?
  if [ "$got" -eq "$2" ]; then echo "  PASS  $1 (exit $got)"; PASS=$((PASS+1))
  else echo "  FAIL  $1 (expected $2, got $got)"; echo "$out" | sed 's/^/        /'; FAIL=$((FAIL+1)); fi; }

expect_says() { # <label> <substring> <dir>
  local out; out=$( cd "$3" && node "$CHECK" 2>&1 )
  if printf '%s' "$out" | grep -qF "$2"; then echo "  PASS  $1"; PASS=$((PASS+1))
  else echo "  FAIL  $1 -- looked for '$2' in:"; echo "$out" | sed 's/^/        /'; FAIL=$((FAIL+1)); fi; }

echo "audit attribution gate"

# --- an authenticated caller that logs without an actor is the defect ---------------------
d=$(scratch)
fn "$d" send-followups "await admin.rpc('audit_log', { p_action: 'communication.batch_sent' });"
expect      "blocks a post-session function logging with no actor" 1 "$d"
expect_says "and names the file"        "send-followups/index.ts"  "$d"
expect_says "and offers the fix"        "audit_log_as"             "$d"

# --- the same call, attributed, is fine -----------------------------------------------------
d=$(scratch)
fn "$d" send-followups "await admin.rpc('audit_log_as', { p_actor: caller.id, p_action: 'x' });"
expect      "passes once the actor is passed"            0 "$d"
expect_says "and counts it as attributed" "1 attributed"   "$d"

# --- pre-session flows are exempt BY NAME ---------------------------------------------------
# Sign-in, first registration and recovery run before any session exists. Naming the account an
# attempt was aimed at would record her as having done something she may know nothing about.
d=$(scratch)
fn "$d" auth-login     "await admin.rpc('audit_log', { p_action: 'auth.login_failed' });"
fn "$d" auth-bootstrap "await admin.rpc('audit_log', { p_action: 'auth.registered' });"
fn "$d" recovery-check "await admin.rpc('audit_log', { p_action: 'auth.recovery_failed' });"
expect      "the three pre-session functions are exempt"  0 "$d"
expect_says "and are counted as exempt, not as clean" "3 exempt" "$d"

# --- exemption is by FUNCTION, not by action name -------------------------------------------
# The allow-list keys on the directory, so a post-session function cannot borrow the exemption
# by naming its action 'auth.something'.
d=$(scratch)
fn "$d" pin-issue "await admin.rpc('audit_log', { p_action: 'auth.pin_issued' });"
expect "an auth.* action in a NON-exempt function is still blocked" 1 "$d"

# --- an empty tree must not read as clean ----------------------------------------------------
# "0 unattributed" out of nothing scanned is the false green this whole file exists to catch.
d=$(scratch)
expect_says "an empty tree reports 0 attributed, not silence" "0 attributed" "$d"

echo
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
