/**
 * Brand tokens, ported from the Claude Design canvas.
 *
 * Every value here is MEASURED, not chosen by eye. The pairs below were
 * verified against WCAG 2.2 with the surfaces they actually sit on:
 *   - body text            >= 4.5:1   (1.4.3)
 *   - large text (>=24px)  >= 3.0:1   (1.4.3)
 *   - borders, focus rings >= 3.0:1   (1.4.11)
 *
 * The light-mode `accentInk` is the important one. The canvas used a single
 * pale tint for accent-coloured text in both themes; on a light surface that
 * measured 1.19-1.53:1 across every accent, including the brand pink. Light
 * mode therefore needs its OWN accent ink, darkened until it clears 4.5:1 on
 * the darkest light surface. See scripts/check-contrast.ts, which fails the
 * build if any pair regresses.
 */

export type Accent = {
  key: string;
  label: string;
  value: string;      // the fill. White text sits on this.
  tintDark: string;   // accent-coloured TEXT on dark surfaces
  tintLight: string;  // accent-coloured TEXT on light surfaces
  deep: string;       // chrome / headers
  deep2: string;      // mid stop of the header gradient
  deep3: string;      // far stop of the header gradient
  avatar: string;
};

/**
 * C-82: a controlled, pre-measured set. No free colour input reaches the app.
 *
 * Coral, Teal and Gold are DARKER here than on the design canvas. The canvas
 * darkens custom hues until white text clears 4.5:1, but its six hardcoded
 * presets never went through that guard, and those three shipped white button
 * labels at 3.05-3.67:1. Hue is preserved; only lightness moved.
 */
export const ACCENTS: Accent[] = [
  { key: 'rosifit', label: 'RosiFit pink', value: '#D6157F', tintDark: '#F5A8CE', tintLight: '#C81477', deep: '#5C0F63', deep2: '#33073A', deep3: '#210528', avatar: '#93245F' },
  { key: 'plum',    label: 'Plum',         value: '#9B2BA8', tintDark: '#E3B0EC', tintLight: '#9B2BA8', deep: '#4A1057', deep2: '#2C0733', deep3: '#1C0522', avatar: '#7C2490' },
  { key: 'coral',   label: 'Coral',        value: '#D53F20', tintDark: '#F8B7A4', tintLight: '#BF391C', deep: '#6B2418', deep2: '#3D1409', deep3: '#260C06', avatar: '#A83A26' },
  { key: 'teal',    label: 'Teal',         value: '#0C8572', tintDark: '#8FE0D2', tintLight: '#0B7766', deep: '#0B4A42', deep2: '#062B27', deep3: '#041B18', avatar: '#127666' },
  { key: 'indigo',  label: 'Indigo',       value: '#5566E0', tintDark: '#B5BEF7', tintLight: '#485ADE', deep: '#232C6B', deep2: '#141A3E', deep3: '#0D1128', avatar: '#414FB4' },
  { key: 'gold',    label: 'Gold',         value: '#986E0E', tintDark: '#F2D48A', tintLight: '#88620D', deep: '#5A4008', deep2: '#332504', deep3: '#201703', avatar: '#96690D' },
];

export const DARK = {
  bg: '#08040A', shell: '#0C0409', surface: '#170A14', surface2: '#12060F', control: '#21101C',
  fgStrong: '#FFFFFF', fg: '#EDE3EA', muted: '#A78E9E', dim: '#8A7C86',
  line: 'rgba(255,255,255,0.12)', lineStrong: 'rgba(255,255,255,0.28)',
  onAccent: '#FFFFFF', onDeep: '#E4C4D8',
  // The controls that sit ON the deep header gradient -- the back button, the
  // course delete. The header is the SAME dark plum in both themes, so these
  // are too: a theme-varying fill there would be a light control on a dark
  // ground in one of them. Measured in check-contrast.ts against every
  // accent's deep stops.
  deepControl: 'rgba(12,4,9,0.4)', deepControlLine: 'rgba(255,255,255,0.16)', // allow-literal-color: this file IS the token source, and the pair is measured in check-contrast.ts
  success: '#2FBE8C', warning: '#E8B93B', danger: '#F2683C', possible: '#B487EA',
  // 0.5, not the 0.7 this was until 05-Sep-2026. The value was chosen while a
  // dialog route still painted an opaque panel over the screen behind it, so
  // the scrim alone had to carry "this is over something" and there was
  // nothing underneath for it to hide. RC-016 removed the panel and left the
  // number; at 0.7 over the near-black app background only 30% of the screen
  // behind survives -- the black backdrop reported twice. At 0.5 half of it
  // does, and the 14px blur in FormDialog keeps it a backdrop rather than
  // competing content. Bounded by src/theme/scrim.test.ts.
  scrim: 'rgba(6,2,7,0.5)',
};

export const LIGHT = {
  bg: '#F4EEF2', shell: '#FBF8FA', surface: '#FFFFFF', surface2: '#F6F0F4', control: '#F0E7ED',
  fgStrong: '#1C0A17', fg: '#2E1727', muted: '#6B5563', dim: '#6E5A68',
  line: 'rgba(28,10,23,0.14)', lineStrong: 'rgba(28,10,23,0.42)',
  onAccent: '#FFFFFF', onDeep: '#FFFFFF',
  // The controls that sit ON the deep header gradient -- the back button, the
  // course delete. The header is the SAME dark plum in both themes, so these
  // are too: a theme-varying fill there would be a light control on a dark
  // ground in one of them. Measured in check-contrast.ts against every
  // accent's deep stops.
  deepControl: 'rgba(12,4,9,0.4)', deepControlLine: 'rgba(255,255,255,0.16)', // allow-literal-color: this file IS the token source, and the pair is measured in check-contrast.ts
  success: '#0F7551', warning: '#7A5300', danger: '#B3261E', possible: '#6B3FA0',
  // UNCHANGED at 0.42, deliberately. The reported defect is the dark theme's
  // (the screenshot was dark), and 0.42 of a dark plum over this theme's own
  // pale ground already leaves it legible -- scrim.test.ts passed on this
  // value before the dark one was touched. Lowering it is the riskier
  // direction here: the dialog card is itself light, so less dimming costs
  // the separation between card and backdrop that the dark theme gets for
  // free.
  scrim: 'rgba(28,10,23,0.42)',
};

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
export const RADIUS = { sm: 10, md: 14, lg: 18, xl: 22, pill: 999 } as const;

/** 44pt is the minimum comfortable touch target. Nothing tappable goes below it. */
export const TAP_MIN = 44;

/* ------------------------------------------------------------------ status
 * The canvas' S map. Every status carries its own WORD and ICON as well as a
 * colour, so the meaning survives greyscale, colour blindness and a bad
 * screen. Nothing in the app is allowed to say "red row" and stop there.
 */
export type StatusKey =
  | 'present' | 'absent' | 'awaiting' | 'scheduled'
  | 'cancelled' | 'holiday' | 'extra' | 'none';

export type StatusTone = {
  /** foreground / icon colour, per theme */
  fgDark: string; fgLight: string;
  /** the word. Never omitted — colour is never the only signal. */
  word: string;
  /** a Material Symbols name, mirrored by IconGlyph */
  icon: string;
};

/**
 * Dark inks are the canvas values. Light inks are darkened for the same
 * reason the accent inks are (see the note at the top of this file): the
 * canvas uses one ink for both themes, and on a light surface the canvas
 * greens and yellows measured well under 4.5:1. Hue is preserved.
 */
export const STATUS: Record<StatusKey, StatusTone> = {
  present:   { fgDark: '#2FBE8C', fgLight: '#0F7551', word: 'Present',         icon: 'check' },
  absent:    { fgDark: '#F2683C', fgLight: '#B3261E', word: 'Absent',          icon: 'close' },
  awaiting:  { fgDark: '#E8B93B', fgLight: '#7A5300', word: 'Awaiting upload', icon: 'cloud_upload' },
  scheduled: { fgDark: '#7FA9E8', fgLight: '#2C5AA8', word: 'Scheduled',       icon: 'schedule' },
  cancelled: { fgDark: '#8A7C86', fgLight: '#6E5A68', word: 'Cancelled',       icon: 'block' },
  holiday:   { fgDark: '#B487EA', fgLight: '#6B3FA0', word: 'Holiday',         icon: 'celebration' },
  extra:     { fgDark: '#4FD1C5', fgLight: '#0B6E66', word: 'Extra attended',  icon: 'add' },
  none:      { fgDark: '#A78E9E', fgLight: '#6B5563', word: 'Not expected',    icon: 'remove' },
};

/**
 * The ink for text written ON a status fill -- a count inside a bar segment.
 *
 * Theme-dependent, and it has to be: the canvas is a dark-only prototype and
 * letters its bar counts in a near-black. That ink measures 7.01:1 on the
 * DARK green and 2.91:1 on the LIGHT one, because the light theme darkens the
 * fill itself -- so copying the prototype's literal ships an unreadable
 * number in light mode. White is the correct ink there (5.70:1 on the light
 * green, 6.54:1 on the light red).
 *
 * Both directions are swept in scripts/check-contrast.ts, so neither can
 * regress silently. Guardrail 2: colour ships measured, never trusted.
 */
const ON_STATUS_FILL_DARK = '#06231B';

export function onStatusFill(isDark: boolean): string {
  // DARK.onAccent rather than a second white literal -- it is the same ink
  // the accent buttons already use, and it is already measured.
  return isDark ? ON_STATUS_FILL_DARK : DARK.onAccent;
}

/** A status fill/border, derived from its ink at the alphas the canvas uses. */
export function statusSurface(ink: string): { bg: string; border: string } {
  const [r, g, b] = hexToRgb(ink);
  return { bg: `rgba(${r},${g},${b},0.13)`, border: `rgba(${r},${g},${b},0.34)` };
}

/* ------------------------------------------------- custom accent (any hue)
 * C-82 let only six pre-measured accents through. The canvas adds a hue
 * slider, which would reopen the hole that guard closed — so the generator
 * below carries the guard with it: the fill is darkened until white text on
 * it clears 4.5:1, and the light-mode ink is darkened until it clears 4.5:1
 * on the darkest LIGHT surface. Every hue in 0..359 is verified in CI by
 * scripts/check-contrast.ts, so no slider position can ship a failing pair.
 */
export function hexToRgb(c: string): [number, number, number] {
  const m = c.replace('#', '');
  return [0, 2, 4].map(i => parseInt(m.slice(i, i + 2), 16)) as [number, number, number];
}

/**
 * A typed hex, as a HUE.
 *
 * The custom accent is stored as a hue and nothing else, on purpose: the
 * generator below darkens that hue until white text clears 4.5:1, and
 * check-contrast.ts verifies all 360 of them. Storing an arbitrary hex would
 * walk straight round that guard -- a pure yellow taken verbatim ships white
 * labels at about 1.07:1 -- so a typed value contributes its HUE and the
 * measured generator decides the rest.
 *
 * Returns null for anything that is not a 6-digit hex, so a half-typed value
 * leaves the current colour alone rather than jumping to red.
 */
export function hueFromHex(value: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  if (!m) return null;
  const [r, g, b] = hexToRgb(m[1]).map(n => n / 255) as [number, number, number];
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  // A grey has no hue to read. Keeping 0 would silently mean "red", so the
  // caller is told there is nothing here rather than given a wrong answer.
  if (d === 0) return null;
  const h = max === r ? ((g - b) / d) % 6
    : max === g ? (b - r) / d + 2
    : (r - g) / d + 4;
  // Rounded BEFORE the final modulo. Taking the modulo first lets a value a
  // hair under 360 -- a red one point off pure, which is 359.765 -- round UP
  // to 360, a hue the generator was never measured at: check-contrast.ts
  // verifies 0..359. 360 and 0 are the same colour; only one is checked.
  return Math.round(h * 60 + 360) % 360;
}

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const hx = (n: number) => clamp255(n).toString(16).padStart(2, '0');
const toHex = (t: [number, number, number]) => '#' + hx(t[0]) + hx(t[1]) + hx(t[2]);

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((((h % 360) + 360) % 360) / 60);
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const m = l - c / 2;
  const t: [number, number, number] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x]
    : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  return [(t[0] + m) * 255, (t[1] + m) * 255, (t[2] + m) * 255];
}

export function relLuminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [x, y] = [relLuminance(a) + 0.05, relLuminance(b) + 0.05];
  return x > y ? x / y : y / x;
}

const WHITE: [number, number, number] = [255, 255, 255];
/** the darkest surface light mode ever puts accent-coloured text on */
const LIGHT_CONTROL = hexToRgb(LIGHT.control);

export type CustomAccent = Accent & { hue: number; ratio: string };

/** Snap to the 8-bit value that will actually ship, so the loops below
 *  measure the rendered colour rather than a float that rounds down past
 *  the threshold afterwards. */
const snap = (t: [number, number, number]): [number, number, number] =>
  [clamp255(t[0]), clamp255(t[1]), clamp255(t[2])];

export function customAccent(hue: number): CustomAccent {
  // darken the fill until WHITE text on it clears body-text contrast
  let l = 0.46;
  let rgb = snap(hslToRgb(hue, 0.74, l));
  while (contrast(rgb, WHITE) < 4.5 && l > 0.18) { l -= 0.01; rgb = snap(hslToRgb(hue, 0.74, l)); }

  // darken the light-mode ink until it clears 4.5:1 on the darkest light surface
  let li = Math.min(l, 0.42);
  let ink = snap(hslToRgb(hue, 0.68, li));
  while (contrast(ink, LIGHT_CONTROL) < 4.5 && li > 0.08) { li -= 0.01; ink = snap(hslToRgb(hue, 0.68, li)); }

  return {
    key: 'custom',
    label: 'Custom',
    hue,
    value: toHex(rgb),
    tintDark: toHex(hslToRgb(hue, 0.68, Math.min(l + 0.34, 0.84))),
    tintLight: toHex(ink),
    deep: toHex(hslToRgb(hue, 0.70, Math.max(l - 0.28, 0.10))),
    deep2: toHex(hslToRgb(hue, 0.72, Math.max(l - 0.36, 0.06))),
    deep3: toHex(hslToRgb(hue, 0.74, Math.max(l - 0.42, 0.04))),
    avatar: toHex(hslToRgb(hue, 0.68, Math.max(l - 0.09, 0.16))),
    ratio: contrast(rgb, WHITE).toFixed(1) + ':1',
  };
}

/** The four swatches the appearance screen shows under the hue slider. */
export function customShades(hue: number) {
  const a = customAccent(hue);
  return [
    { label: 'Accent', color: a.value },
    { label: 'Tint',   color: a.tintDark },
    { label: 'Header', color: a.deep },
    { label: 'Avatar', color: a.avatar },
  ];
}

export const DEFAULT_HUE = 322;
