# Rollback scripts

One file per migration that has one, named `<migration>.down.sql`.

**Nothing here is ever run automatically.** `db/harness/reset.sh` replays
`supabase/migrations/*.sql` and nothing else, so a file in this directory cannot
be picked up by the harness, by the CI `db-harness` job, or by an apply. It is
run by hand, deliberately, by somebody who has read it.

## Why a directory rather than a comment at the foot of the migration

A rollback written as commented-out SQL inside the migration it undoes cannot be
executed, cannot be syntax-checked, and is edited by nobody when the migration
above it changes. A file can be run with `psql -f`, which is the only form of
rollback anybody reaches for at the moment they need one.

## Why most migrations have none

Most of this schema's migrations are additive — a column, a function, a policy —
and the useful rollback for an additive change is usually "leave it; it is
inert". A file appears here only where the undo is a real statement somebody
might have to type under pressure, and where getting it wrong would cost data.

Every one states what has to happen **before** it is run. For `0067` that is:
revert the app first. Dropping a function the screen still calls turns the
course screen into the Load failed state added in Phase A — honest, retryable,
and still a broken screen.

`0070` needs nothing before it: it re-issues `0067`'s body over the same
signature, so no screen breaks — the defect RC-044 describes simply comes back.
