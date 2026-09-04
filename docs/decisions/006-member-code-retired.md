# 006 — The member code is retired; the column is kept

**Status:** Accepted · **Date:** 04-Sep-2026

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
expression, and removes every grant on `member_code_seq`. The app stops reading the column
anywhere, and `{{member_code}}` is removed from the token list **and** from the sender that built
it — a token offered but not built would arrive in a member's inbox as literal text.

**Her primary email address is what tells two same-named members apart.** It is already the key
the send path uses, so there is one identity on screen rather than two.

## Consequences

- Every member created before 04-Sep-2026 keeps her code. It is in the audit log and in exports
  people may still hold, and the column is the only record of what those rows were once called.
- `app/match.tsx`'s "link to an existing member" picker returns the **label text** that was
  tapped, so its labels must stay unique — a property the code used to guarantee for free.
  They are now `name · email`, falling back to `name · course · branch` where she has no address
  and to a numbered suffix where even that collides. Ugly beats linking the wrong member.
- The members list subtitle was `code` or `code · email`. It is now the address, or
  `course · branch` for a member with none — the NO EMAIL pill already says which case it is, so
  the line never has to carry that word twice.
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
