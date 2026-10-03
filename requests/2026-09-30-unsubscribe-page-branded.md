# CHANGE REQUEST — the unsubscribe pages carry the RosiFit brand
<!-- Filled by workflows/request.md (/request) · Consumed by Track B -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: the page a member lands on after the unsubscribe link — `rosi-fit.vercel.app/unsubscribed` and `/unsubscribe-failed` (`public/unsubscribed.html`, `public/unsubscribe-failed.html`, RC-122)
- CURRENT BEHAVIOUR: plain black-on-white text: heading, one sentence, academy name.
- DESIRED BEHAVIOUR: "the page is plain it should be professional with rosifit logo right?"
- WHY: the page is the academy's, seen by a member; it should look like it.
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR — the words (heading, body), the redirect from `unsubscribe`, the opt-out itself, no app bundle loaded, the academy name set as text only.
- CORRECTION ROUND: 1

## DESIGN SURFACE
- VISUAL?: yes
- SCREENS & STATES TOUCHED: both pages (the confirmation and the link-did-not-work state); light and dark.
- STRINGS ADDED OR ALTERED: none — the heading and body are frozen; the logo is decorative (`alt=""`) beside the academy name.
- PERMISSIONS: no
- USAGE: unknown — members who click unsubscribe in a follow-up email, on any device.
- RUN MODE: auto (default — none stated)
- SCALE: micro
