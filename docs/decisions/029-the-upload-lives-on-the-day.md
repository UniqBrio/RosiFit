# ADR-036 — The upload lives on the day; the message does not come back

**Status:** Accepted
**Date:** 07-Sep-2026 · **Deciders:** requester, this run
**Request:** `requests/2026-09-07-awaiting-upload-button-on-each-day.md`

## Context

The course screen's week strip has now been corrected three times over one
question: where does a person upload a session for a particular day?

Round 1 (`requests/2026-09-06-upload-imports-on-pick.md`) put an **Upload
session** button on the card that opened under the strip when a day was
tapped, and widened it from awaiting days to every day. Round 2
(`requests/2026-09-06-course-search-under-heading-day-panel-gone.md`,
commit `2b4c516`) removed that card whole — the status word, the sentence,
the date and the button — on the requester's words: *"remove that extra
upload session dialog appearing with a message as we already have a upload
session button on top beside send communication."* The course bar's undated
**Upload Session** became the one way to upload from this screen.

This round the requester asked for the button back, per day, and was
specific about its shape across three messages: *"bring awaiting upload
button as earlier for each day"*, *"awaiting upload text like a
notification"*, *"a button with text, on click of it user should be able
to upload"*. Shown three placements and asked to choose, the requester
delegated the choice.

**What round 2 missed.** The card was two things — a message and a button —
and the complaint named the pair as one: a dialog in the way. Removing both
answered the words and lost the capability. Nobody asked, at the time,
whether the button had a home that was not the card. It did: the day.

## Options considered

### Option A — The button on the day card itself (chosen)
Each awaiting day's status slot becomes a labelled press — the cloud and the
word **Awaiting upload** — that opens `/upload` with `courseId` and that
day's `date`. Uploaded days keep their tick, not-expected days their dash,
and neither is pressable.
· **Pros:** it is what was asked for, in the requester's own reading of
"for each day"; every awaiting day is one press from its upload at once, not
one selection and then a press; nothing returns under the strip.
· **Cons:** two controls on one card. A phone's 33pt card cannot hold the
word, so under 768pt the press is the cloud alone and the word stays in the
legend — the same arrangement the other three icons have always had.
· **Cost:** one screen, one spec, the card restructured from one press into a
frame holding two.

### Option B — A labelled button beside the *Attendance for …* caption
The strip untouched; when the selected day is awaiting, an **Upload session**
button sits on the caption row under the search box.
· **Pros:** a full-size, worded control at every width, no nesting question,
no phone compromise.
· **Cons:** one day at a time — a person uploading Monday, Wednesday and
Friday selects each first. And it is not on the day, which is where the
requester twice said it should be.
· **Cost:** smaller than A.

### Option C — Bring the day card back
Restore what round 2 removed.
· **Pros:** the smallest diff; the button "as earlier", literally.
· **Cons:** it is the exact thing the requester asked to remove, message and
all. Round 4 would be round 2 again.

### Option D — The card's own press opens the upload
Make tapping an awaiting day go straight to `/upload`.
· **Pros:** one control per card, nothing new to draw.
· **Cons:** tapping a day SELECTS it — the roster's *Attendance for …*
caption and every card's reading depend on it (ADR-030) — and an awaiting
day is precisely the one a person wants to select to see who is yet to be
marked. Overloading the press takes that away on the days it matters most.

## Decision

Option A. The card is a `View` frame wearing the border and fill; inside it
the date block is the select press (`course-day-<iso>`, unchanged testID,
unchanged label) and, on an awaiting day only, the upload button
(`course-day-upload-<iso>`) is its **sibling** — never its child. A button
inside a button is one control to a screen reader and a coin-toss to a
finger, and react-native-web would render exactly that.

The word is `STATUS.awaiting.word`, read from the token and never retyped, so
the legend and the button cannot drift. The push is the one round 1 wrote —
`{ pathname: '/upload', params: { courseId, date } }` — because the date
parameter is what lets the import ASK when the file turns out to be from
another day (0024). The course bar's undated **Upload Session** stays; this
adds the dated path beside it rather than moving it.

Under 768pt the button is the cloud alone, 26pt tall and the card's width,
on the same press with the same accessibility label. The word is not
truncated with an ellipsis anywhere: from 768pt it wraps to two lines where
the card is narrower than the phrase, and at 1024pt and up it sits on one.

## Consequences

**Positive:** every awaiting day is one press from its own upload, at every
width, with nothing under the strip. The capability round 2 lost is back
without the message that lost it.

**Negative:** the strip's card is now two controls, and a spec
(`src/components/dayStripUploadButton.test.ts`) has to hold them apart —
the select press must close before the upload button opens. A phone reads
the word from the legend, not from the button.

**What this forecloses:** an undated upload from the strip. There is none by
design — the undated path is the course bar's, one row up.

## Revisit when

The strip stops being seven cards at phone width (an earlier request fixed
it at seven), at which point the phone can carry the word too. Or when a
day gains a second action — a cancel, a holiday — and the slot has to become
a menu rather than one button.
