import React, { createContext, useContext, useMemo, useState } from 'react';

/**
 * The academy scope the canvas keeps in its shell, not in a screen.
 *
 * In the prototype the branch is chosen from the persistent header — the
 * sheet's own words are "Every figure follows this. Picking one branch
 * switches Home to Branch wise." — so the selection cannot live inside the
 * dashboard: the header renders above every tabbed screen and the dashboard
 * is only one of them. It sits here so the header and Home read and write the
 * same value.
 *
 * This is presentation state only. Nothing here fetches; the screens still
 * ask src/data for their figures.
 */
export type Scope = 'academy' | 'branch';

type Academy = {
  scope: Scope;
  branch: string;            // 'All branches' means: not narrowed
  setScope: (s: Scope) => void;
  setBranch: (b: string) => void;
  /** Picking a real branch implies Branch wise; 'All branches' implies Academy wise. */
  chooseBranch: (b: string) => void;
};

const ALL = 'All branches';

const Ctx = createContext<Academy | null>(null);

export function AcademyProvider({ children }: { children: React.ReactNode }) {
  const [scope, setScope] = useState<Scope>('academy');
  const [branch, setBranch] = useState<string>(ALL);

  const value = useMemo<Academy>(() => ({
    scope, branch, setScope, setBranch,
    chooseBranch: (b: string) => {
      setBranch(b);
      setScope(b === ALL ? 'academy' : 'branch');
    },
  }), [scope, branch]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAcademy(): Academy {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAcademy must be used inside AcademyProvider');
  return v;
}

export const ALL_BRANCHES = ALL;
