# BUG REQUEST — something is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->
<!-- Root cause comes before any fix - always. Stated fields are BINDING; "unknown" is honest. -->

Run **Track C** ([workflows/bug.md](../../workflows/bug.md)) with this request.

## FIELDS
- WHERE: The member pop-up (`app/member/[id].tsx`, `This week` panel) → **Edit** → **Save Changes** → back on the pop-up. The two lines that do not move are the email panel and the rule label under it.
- WHAT HAPPENS: `"I clicked on Edit button and then added email and then saved but its not reflecting why?"` — the save reports success and the card still reads **"No usable email"**, with *"The member is shown and counted as excluded from every send, never quietly dropped."* and *"Last contacted 9/19/2026"*, and under it **"Rule is not met, No email to send"**. The requester's screenshot is of *Ajma tenkasi june (Diet)* — Postnatal · Main, joined Sep 2026.
- WHAT SHOULD HAPPEN: After saving an address, the panel reads **"Email on file"** with that address, and the rule label stops saying there is no email to send. If the address cannot be used, the card and the Edit form must SAY SO and say why — a save that cannot take effect must not report success (C-76: listed and excluded, never quietly dropped).
- WHEN IT STARTED: unknown. The card shows the member was last contacted 9/19/2026, so an address was usable on that date.
- WHO IS AFFECTED: Observed on one member, *Ajma tenkasi june* (Postnatal · Main). The requester stated no wider selectivity. **Selectivity established by investigation during intake, not stated by the requester:** a member whose only address carries `member_emails.status` of `bounced` or `unsubscribed`, where the operator re-enters *that same address*. Entering a *different* address on the same member is expected to work. Track C must re-derive this rather than inherit it.
- REPRO STEPS:
  1. Open a member whose card reads "No usable email" (see the selectivity note above).
  2. Tap **Edit** — the Email addresses list shows nothing at all.
  3. Type the address the academy holds for that member — the same one that is already on the record — and add it.
  4. Tap **Save Changes**. The form flashes `"<first name> saved"` and closes.
  5. The member pop-up still reads "No usable email" and "No email to send".
- WAS WORKING BEFORE?: unknown.
- CORRECTION ROUND: 1

## ALSO RAISED AT INTAKE (not the reported symptom — Track C to scope in or out)
Three readings of one question, "does this member have an email we can use":
- `follow_up_candidates` counts `has_email` as `me.status <> 'bounced'` (`0009_communication.sql:107`, restated `0045_member_inactive_from.sql:138`, `0072_member_active_again_from.sql:165`) — an *unsubscribed* address still counts as reachable.
- The client drops both `bounced` and `unsubscribed` (`src/data/repository.ts:302`).
- `send-followups` refuses both (`supabase/functions/send-followups/index.ts:233-234`).
- `'complained'` is filtered by nobody and refused by nobody.

Guardrail 1's reason for existing is that two answers to one question drift. This is four.

## STANDING INSTRUCTIONS (do not edit)
- Track C order is binding: search `docs/registers/ROOT_CAUSE_REGISTER.md` for the same class;
  state the ROOT CAUSE, distinct from the symptom, BEFORE any fix; reproduce with a failing
  test, fix at the root, make it pass; if the cause is a pattern, sweep EVERY sibling site;
  append the root-cause entry; then the test gate.
- WHO IS AFFECTED is evidence — a fix whose mechanism does not explain the stated selectivity
  has not found the root cause.
- CORRECTION ROUND ≥ 2: before proposing anything, read the previous attempt and state what it
  missed and why. A recurring "fixed" bug is a process finding — flag `/framework-update`.
- Data-store-level cause → STOP, propose the change, wait for approval. Production is never
  touched automatically.
