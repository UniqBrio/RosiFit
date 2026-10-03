# CHANGE REQUEST — staff Resubscribe on Reach Out and Attendance, one shared flow
<!-- Filled by workflows/request.md (/request) · Consumed by Track B -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: Reach Out (member pop-up `app/member/[id].tsx`, send draft `app/send/index.tsx`),
  Attendance (`app/(tabs)/attendance.tsx`), member Edit (`app/member/edit.tsx`).
- CURRENT BEHAVIOUR: staff can turn follow-ups back on only from the member Edit form
  (`requests/2026-10-01-resubscribe-recovery-and-gmail-one-click.md`). Reach Out and Attendance show
  an unsubscribed member but offer no way back; the send draft says only "No email address" for
  every excluded member, whatever the reason.
- DESIRED BEHAVIOUR (owner, 01-Oct-2026, "Finish the email unsubscribe/resubscribe implementation end-to-end"):
  - Reach Out: a "Resubscribe" action ONLY for an `unsubscribed` address — never unknown/subscribed,
    bounced or spam-reported. Clicking changes nothing; it opens "Turn follow-ups back on for this
    email?" naming the address and the member. A source is required (WhatsApp / Phone call / In
    person / Replied by email / Other); Other needs a note, otherwise the note is optional.
    Success: "Follow-ups turned back on for this email." The view refreshes and the action goes.
  - Attendance: a compact Resubscribe on a member row when the member has an unsubscribed address;
    the address is named, and chosen when there are several.
  - One shared component/hook for both; no duplicated RPC logic. Edit's "Turn follow-ups back on"
    keeps working. All three call `staff_resubscribe_member_email()` (0084) and nothing else.
  - Already-on is reported, not treated as an error; bounced/spam refusals are shown in the dialog.
- WHY: the member's request reaches whoever is on the screen in front of them — usually Reach Out or
  the register — not the Edit form.
- MUST NOT CHANGE: 0084 (applied to production; not re-applied, no new migration); the guard on
  direct `member_emails` writes; `audit_log` not executable by `authenticated`; bounced and
  spam-reported refusals; the audit trail; the member's own Resubscribe page; Gmail one-click.

## DESIGN SURFACE
- VISUAL?: yes. A secondary button on the member pop-up; a text action per excluded row on the send
  draft and per Attendance row; the existing confirmation dialog, now with the member's name and an
  address chooser when there is more than one. Light and dark.
- STRINGS ADDED OR ALTERED:
  - Action: "Resubscribe" (Reach Out, send draft, Attendance)
  - Dialog title: "Turn follow-ups back on for this email?" (all three entry points)
  - Toast: "Follow-ups turned back on for this email." / "Follow-ups were already on for this email."
  - Address chooser error: "Choose which address to turn back on."
  - Attendance row: "Unsubscribed: <address>"
  - Send draft, excluded row: "<reason> — counted in every figure" (reason from `emailExclusionReason`)
  - Send draft, nothing to send: "N member(s) is/are over the threshold and cannot be emailed. The reason is beside each name below."
  - Member pop-up, unsubscribed: "The member unsubscribed. If the member asks for follow-ups again, use Resubscribe."
- PERMISSIONS: unchanged — the RPC's own gate (any active app user; `anon` has no execute).
- RUN MODE: auto
- SCALE: scoped
