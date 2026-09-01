/**
 * Fails if any colour pair the UI actually renders falls below its WCAG
 * threshold. Run in CI: a palette regression is silent otherwise -- it looks
 * fine to whoever picked the colour and is unreadable to everyone else.
 */
import { ACCENTS, DARK, LIGHT, STATUS, customAccent } from '../src/theme/tokens.ts';

const hex = (c: string): [number, number, number] => {
  const m = c.replace('#', '');
  return [0, 2, 4].map(i => parseInt(m.slice(i, i + 2), 16)) as [number, number, number];
};
const lum = ([r, g, b]: number[]) => {
  const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(hex(a)) + 0.05, lum(hex(b)) + 0.05];
  return x > y ? x / y : y / x;
};

type Check = { label: string; fg: string; bg: string; need: number };
const checks: Check[] = [];

for (const [themeName, T] of [['dark', DARK], ['light', LIGHT]] as const) {
  const surfaces = [
    ['bg', T.bg], ['shell', T.shell], ['surface', T.surface],
    ['surface2', T.surface2], ['control', T.control],
  ] as const;

  for (const [sName, s] of surfaces) {
    checks.push({ label: `${themeName}: body text on ${sName}`,      fg: T.fg,       bg: s, need: 4.5 });
    checks.push({ label: `${themeName}: strong text on ${sName}`,    fg: T.fgStrong, bg: s, need: 4.5 });
    checks.push({ label: `${themeName}: muted text on ${sName}`,     fg: T.muted,    bg: s, need: 4.5 });
    checks.push({ label: `${themeName}: dim text on ${sName}`,       fg: T.dim,      bg: s, need: 4.5 });
    for (const st of ['success', 'warning', 'danger', 'possible'] as const) {
      checks.push({ label: `${themeName}: ${st} status on ${sName}`, fg: T[st],      bg: s, need: 4.5 });
    }
    // every accent's TEXT ink, on every surface of this theme
    for (const a of ACCENTS) {
      const ink = themeName === 'dark' ? a.tintDark : a.tintLight;
      checks.push({ label: `${themeName}: ${a.label} ink on ${sName}`, fg: ink, bg: s, need: 4.5 });
    }
  }
  // white label on the accent fill (buttons), and the accent as a border
  for (const a of ACCENTS) {
    checks.push({ label: `${themeName}: ${a.label} button label`, fg: T.onAccent, bg: a.value,  need: 4.5 });
    checks.push({ label: `${themeName}: ${a.label} fill vs surface (border)`, fg: a.value, bg: T.surface, need: 3.0 });
    // the header gradient runs deep -> deep2 -> deep3, and the same ink sits
    // on all three stops, so all three are checked rather than just the first
    for (const [stop, bg] of [['deep', a.deep], ['deep2', a.deep2], ['deep3', a.deep3]] as const) {
      checks.push({ label: `${themeName}: onDeep text on ${a.label} ${stop}`, fg: T.onDeep, bg, need: 4.5 });
    }
  }
}

/* Every status ink, on every surface of its theme. The canvas ships one ink
 * per status for both themes; the light inks here are darkened copies, and
 * this is what proves they were darkened far enough. */
for (const [themeName, T] of [['dark', DARK], ['light', LIGHT]] as const) {
  const surfaces = [
    ['bg', T.bg], ['shell', T.shell], ['surface', T.surface],
    ['surface2', T.surface2], ['control', T.control],
  ] as const;
  for (const [sName, s] of surfaces) {
    for (const [k, st] of Object.entries(STATUS)) {
      const ink = themeName === 'dark' ? st.fgDark : st.fgLight;
      checks.push({ label: `${themeName}: status ${k} on ${sName}`, fg: ink, bg: s, need: 4.5 });
    }
  }
}

/* The hue slider is free input, so it gets swept rather than sampled: all 360
 * positions, both themes. customAccent() darkens until each pair measures --
 * if that guard is ever weakened, this is what catches it. */
for (let hue = 0; hue < 360; hue++) {
  const a = customAccent(hue);
  checks.push({ label: `custom hue ${hue}: white button label`, fg: DARK.onAccent, bg: a.value, need: 4.5 });
  for (const [themeName, T] of [['dark', DARK], ['light', LIGHT]] as const) {
    const ink = themeName === 'dark' ? a.tintDark : a.tintLight;
    for (const [sName, s] of [['bg', T.bg], ['surface', T.surface], ['control', T.control]] as const) {
      checks.push({ label: `custom hue ${hue} (${themeName}): ink on ${sName}`, fg: ink, bg: s, need: 4.5 });
    }
  }
}

let failed = 0;
for (const c of checks) {
  const got = ratio(c.fg, c.bg);
  if (got < c.need) {
    failed++;
    console.log(`  FAIL  ${got.toFixed(2)} / ${c.need}  ${c.label}   ${c.fg} on ${c.bg}`);
  }
}
console.log(`\n${checks.length - failed}/${checks.length} contrast pairs pass.`);
if (failed) { console.log(`${failed} FAILING.`); process.exit(1); }
