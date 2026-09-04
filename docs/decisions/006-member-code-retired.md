# 006 — The member code is retired; the column is kept

**Status:** Accepted · **Date:** 04-Sep-2026 · **Amended:** 04-Sep-2026, on merge with `main`

> AMENDMENT. Written on `chore/framework-adoption` while `main` was independently removing the
> same field from the same five screens (`2d2877a`, a different session). The two halves are
> complementary — that branch stopped the code being SHOWN, this one stops it being ASSIGNED —
> and the merge kept both. Three paragraphs below were written before that merge and are marked
> where the merged behaviour differs.

## Context

`0006` gave every member an `RF-000123` code: `NOT NULL`, unique among live rows, minted from
`member_code_seq`. Four places wrote one (`0014`, `0016`, `0023`, `0024` — each carrying the same
`'RF-' || lpad(nextval(...), 6, '0')` expression forward), five places printed one (the member
list, the attendance rows, the match candidates, the member header, the "added" toast), and one
message token exposed it to members (`{{member_code}}`).

It was a second identity for a row that already has a primary key. Nobody at the academy is asked
for a code, nobody quotes one, and follow-up mail is addressed by email. The one job it did was
on screen: distinguishing two members who share a name — most sharply on `app/match.tsx`, where
outcome D exists precisely because two members carry the same canonical name.

The repo owner asked for it to go.

## Decision

Nothing assigns a member code. `0026` makes `members.member_code` nullable, drops
`members_code_live`, re-issues `create_member` and `commit_csv_import` without the minting
expression, and removes every grant on `member_code_seq`. No screen renders a code; the only
thing that still reads the column is the members search box, which matches it without advertising
it. `{{member_code}}` is removed from the token list **and** from the sender that built it — a
token offered but not built would arrive in a member's inbox as literal text.

**Her primary email address is what tells two same-named members apart** where a person has to
choose between them: it is on the match candidate card, next to her course and branch. It is
already the key the send path uses, so there is one identity on screen rather than two. Where the
app itself has to choose, it does not use a display string at all — the picker matches on her id.

## Consequences

- Every member created before 04-Sep-2026 keeps her code. It is in the audit log and in exports
  people may still hold, and the column is the only record of what those rows were once called.
- `app/match.tsx`'s "link to an existing member" picker used to return the **label text** that was
  tapped, so its labels had to stay unique — a property the code guaranteed for free. **Merged
  behaviour:** `2d2877a` gave `SearchPicker` an optional `value` and the picker matches on her
  **id**, which removes the requirement rather than working around it. The label-uniqueness
  scheme this branch wrote (`name · email`, then `name · course · branch`, then a numbered
  suffix) was deleted on the merge — two solutions to one problem is one too many, and matching
  on an id cannot collide at all.
- The members list subtitle was `code` or `code · email`. **Merged behaviour:** it is the address,
  or `No address on file` — `2d2877a`'s wording, verified in a browser, and correct where this
  branch's `course · branch` would have repeated what the card already shows above.
- The member detail header said `branch · RF-000102`. **Merged behaviour:** `branch · joined
  Mar 2026` (`2d2877a`), which needed `joined` on `Member` and `joined_on` in the members query.
  A month she can check against, in the one place a person confirms she has the right member.
- **`Member.code` survives as a search key.** `2d2877a` kept the field readable and searchable
  while removing it from every rendered string, so anybody holding a code from an old export can
  still find her; the placeholder no longer advertises it. That is compatible with this record:
  after `0026` the field is `''` for everyone added since, and a blank is the normal case rather
  than a missing value.
- **`{{member_code}}` goes anyway**, from the offered token list *and* from the sender that built
  it. `2d2877a` left the token alone on the grounds that a stored template using it is the
  academy's choice — true while every member had a code, and no longer true once new members have
  none, because the token would render blank for exactly the members most recently added.
  **Outstanding:** a stored template that already contains `{{member_code}}` will now mail the
  literal text. Production has not been checked for one.
- Two existing DB assertions were **changed rather than added to**, against the append-only rule,
  because they pinned the behaviour that was deliberately reversed:
  `10_add_member.sql` ("her member code is generated" → "none is assigned") and
  `08_csv_import.sql` (an incidental `member_code like 'RF-0%'` join predicate).
  `supabase/tests/20_no_member_code.sql` is the new spec and covers both birth paths.
- Reversing this is expensive: codes for members created after 0026 cannot be reconstructed, only
  freshly minted, and the sequence would hand out numbers that read as if they were contemporary.
  That is why there is a record.

## Options rejected

**Drop the column.** Rejected: it destroys the only record of what pre-0026 members were called,
in a repository whose migration rule is additive. Nullable-and-unread costs one catalogue entry.

**Drop the sequence too.** Rejected: dropping it resets the counter. If anyone ever revives the
scheme, `nextval` starts at 100 again and re-mints codes that former members still carry. A dead
sequence at zero grants is cheaper than a collision nobody would look for.

**Keep the column, just hide it from the UI.** Rejected: the database would go on minting an
identifier that exists solely so a screen has something to print — and it would still appear in
exports and audit entries, which is where somebody would eventually find it and ask what it means.

**Keep the code only on the match screen, where it disambiguates.** Rejected: a code that appears
on exactly one screen is a code an operator has never seen before, at the moment she is being
asked to make an irreversible link. The address is the identifier she already recognises.
