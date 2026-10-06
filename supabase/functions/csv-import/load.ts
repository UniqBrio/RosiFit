// The register a preview matches against, read once and indexed once.
//
// The reads themselves stay in index.ts, one statement each, because
// src/data/edgeFunctionPagedReads.test.ts reads them there one by one; they
// are now started together and awaited once (RC-10 of
// docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md). What moved here is the
// INDEXING: every per-row question the matcher asks -- which members hold
// this display name, which carry this canonical name, which are close to it
// -- was a scan of the whole register per row (`.filter` over every alias,
// `.filter` over every member, `similarity()` against every member). Each is
// now a Map lookup, and the fuzzy tier's bigrams are built once per request.
// index.ts calls Deno.serve at module scope and cannot be imported, so this
// lives where a test can reach it.
import { prepareFuzzy, type FuzzyIndex } from '../_shared/match.ts';

type Row = Record<string, unknown>;

/** The register as the matcher reads it: every lookup a Map, the fuzzy tier prepared once. */
export type RegisterIndex = {
  aliasesByNormalized: Map<string, AliasRow[]>;
  membersByNormalized: Map<string, MemberRow[]>;
  memberById: Map<string, MemberRow>;
  hasEmail: Set<string>;
  emailBy: Map<string, string>;
  lastPresentBy: Map<string, string | null>;
  offeringByMember: Map<string, string>;
  offeringById: Map<string, OfferingRow>;
  courseNameById: Map<string, string>;
  branchNameById: Map<string, string>;
  aliasNamesByMember: Map<string, string[]>;
  fuzzy: FuzzyIndex;
};

export function indexRegister(r: Register): RegisterIndex {
  const aliasesByNormalized = new Map<string, AliasRow[]>();
  for (const a of r.aliases) {
    const list = aliasesByNormalized.get(a.alias_normalized) ?? [];
    list.push(a);
    aliasesByNormalized.set(a.alias_normalized, list);
  }
  const membersByNormalized = new Map<string, MemberRow[]>();
  for (const m of r.members) {
    const key = m.name_normalized ?? '';
    const list = membersByNormalized.get(key) ?? [];
    list.push(m);
    membersByNormalized.set(key, list);
  }
  const aliasNamesByMember = new Map<string, string[]>();
  for (const a of r.aliases) {
    const list = aliasNamesByMember.get(a.member_id) ?? [];
    list.push(a.alias_display);
    aliasNamesByMember.set(a.member_id, list);
  }
  return {
    aliasesByNormalized,
    membersByNormalized,
    memberById: new Map(r.members.map(m => [m.id, m])),
    hasEmail: new Set(r.primaryEmails.map(e => e.member_id)),
    emailBy: new Map(r.primaryEmails.map(e => [e.member_id, e.email])),
    lastPresentBy: new Map(r.stats.map(s => [s.member_id, s.last_present_date])),
    offeringByMember: new Map(r.enrollments.map(e => [e.member_id, e.offering_id])),
    offeringById: new Map(r.offerings.map(o => [o.id, o])),
    courseNameById: new Map(r.courses.map(c => [c.id, c.name])),
    branchNameById: new Map(r.branches.map(b => [b.id, b.name])),
    aliasNamesByMember,
    fuzzy: prepareFuzzy(r.members.map(m => ({ id: m.id, normalized: m.name_normalized }))),
  };
}
