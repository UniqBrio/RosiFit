# CHANGE REQUEST — Attendance search finds display names and email
<!-- Filled by workflows/request.md (/request) · Consumed by Track B -->

## FIELDS
- FEATURE / SCREEN: Attendance tab, the search box.
- CURRENT BEHAVIOUR: matches the member's name only; the placeholder "Search a member or code"
  promised a code it did not match.
- DESIRED BEHAVIOUR (owner, 01-Oct-2026, verbatim): "Under search bar under attendance enable
  search by display name as well and update the placeholder text with search by name, display
  name and email or which ever is relavant".
  - Matches name, Google Meet display names (member_aliases, alias_type 'name'), live email
    addresses, and the member code (kept searchable, not advertised -- as on Members).
  - Placeholder: "Search by name, display name or email".
- HOW: `fetchAttendance` reads the display names and live addresses of the members already on
  the page (paged and chunked, like its name read); `matchesAttendanceQuery` in memberSearch.ts.
- MUST NOT CHANGE: the filters, counts and rows; the course day roster read.
- RUN MODE: auto · SCALE: micro
