import React, { createContext, useContext, useMemo, useState } from 'react';

/**
 * The branch the tabbed screens are looking at.
 *
 * WHAT THIS USED TO ALSO HOLD
 * A `scope` of 'academy' | 'branch', switched by an "Academy wise / Branch
 * wise" tab pair at the top of Overview. Those tabs are gone: Overview now
 * carries a Branch filter that takes any number of branches at once, so
 * "academy wide" is the state of that filter with nothing ticked rather than
 * a second control that could disagree with it. A scope nothing switches is
 * a value nothing can be read from, so it is not kept here either
 * (requests/2026-09-06-overview-filters-and-sections.md).
 *
 * What remains is the single branch the Attendance tab filters by. It lives
 * here rather than in that screen so it survives a hop to a course and back.
 *
 * This is presentation state only. Nothing here fetches; the screens still
 * ask src/data for their figures.
 */

type Academy = {
  branch: string;            // 'All branches' means: not narrowed
  chooseBranch: (b: string) => void;
};

const ALL = 'All branches';

const Ctx = createContext<Academy | null>(null);

export function AcademyProvider({ children }: { children: React.ReactNode }) {
  const [branch, setBranch] = useState<string>(ALL);

  const value = useMemo<Academy>(() => ({ branch, chooseBranch: setBranch }), [branch]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAcademy(): Academy {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAcademy must be used inside AcademyProvider');
  return v;
}

export const ALL_BRANCHES = ALL;
