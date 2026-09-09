/**
 * WHICH MEMBERS A SEARCH BOX LEAVES ON SCREEN.
 *
 * The send dialog draws one tick box per flagged member, and a real academy
 * week put 456 of them in it: "Enable search bar to select and deselect
 * easily". Finding one name in that list meant scrolling it, and the two bulk
 * controls above it were the only way to touch more than one row at a time.
 *
 * NOTHING HERE STORES A SELECTION, and nothing here narrows what is SENT --
 * it narrows what is DRAWN. The distinction is the whole reason this is a
 * separate, pure function rather than a filter inside the screen: the picked
 * ids are filtered against the recipient list (`app/send/index.tsx`), never
 * against the searched list, so a tick survives a query that hides its row.
 * A search that quietly untucked everybody it scrolled past would be the same
 * defect guardrail 1 is about -- a second list, disagreeing with the first.
 *
 * NAME OR ADDRESS, because those are the two things written on the row. Any
 * address on file, not only the primary one: a member is findable by an
 * address she actually owns even when the row shows a different one. Case and
 * surrounding space are ignored; nothing else is -- no fuzzy matching, no
 * initials, no reordering. A substring is a rule a person can predict from
 * one try.
 *
 * Pure, and takes the members as an argument, for the reason RC-012 records:
 * a derivation that reaches for `mock.ts` cannot be tested against anything
 * else.
 */

/** The two fields a row is searched by. Structural, so anything with a name
 *  and a list of addresses can be narrowed -- recipients and the excluded
 *  alike. */
export type SearchableMember = {
  name: string;
  emails: { address: string }[];
};

/** The query as it is actually compared: trimmed and folded to lower case.
 *  '' means "no search", which is not the same as "a search that matches
 *  nothing" -- every caller below treats it as the whole list. */
export function searchTerm(query: string): string {
  return query.trim().toLowerCase();
}

/** Is this member still on screen under that query. */
export function matchesMemberQuery(m: SearchableMember, query: string): boolean {
  const q = searchTerm(query);
  if (!q) return true;
  return m.name.toLowerCase().includes(q)
    || m.emails.some(e => e.address.toLowerCase().includes(q));
}

/** The members a query leaves, in the order they were given. An empty query
 *  returns the SAME array, not a copy: no query is not a filter. */
export function narrowBySearch<T extends SearchableMember>(members: T[], query: string): T[] {
  return searchTerm(query) ? members.filter(m => matchesMemberQuery(m, query)) : members;
}
