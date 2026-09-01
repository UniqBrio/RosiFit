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
  { key: 'rosifit', label: 'RosiFit pink', value: '#D6157F', tintDark: '#F5A8CE', tintLight: '#C81477', deep: '#5C0F63', avatar: '#93245F' },
  { key: 'plum',    label: 'Plum',         value: '#9B2BA8', tintDark: '#E3B0EC', tintLight: '#9B2BA8', deep: '#4A1057', avatar: '#7C2490' },
  { key: 'coral',   label: 'Coral',        value: '#D53F20', tintDark: '#F8B7A4', tintLight: '#BF391C', deep: '#6B2418', avatar: '#A83A26' },
  { key: 'teal',    label: 'Teal',         value: '#0C8572', tintDark: '#8FE0D2', tintLight: '#0B7766', deep: '#0B4A42', avatar: '#127666' },
  { key: 'indigo',  label: 'Indigo',       value: '#5566E0', tintDark: '#B5BEF7', tintLight: '#485ADE', deep: '#232C6B', avatar: '#414FB4' },
  { key: 'gold',    label: 'Gold',         value: '#986E0E', tintDark: '#F2D48A', tintLight: '#88620D', deep: '#5A4008', avatar: '#96690D' },
];

export const DARK = {
  bg: '#08040A', shell: '#0C0409', surface: '#170A14', surface2: '#12060F', control: '#21101C',
  fgStrong: '#FFFFFF', fg: '#EDE3EA', muted: '#A78E9E', dim: '#8A7C86',
  line: 'rgba(255,255,255,0.12)', lineStrong: 'rgba(255,255,255,0.28)',
  onAccent: '#FFFFFF', onDeep: '#E4C4D8',
  success: '#2FBE8C', warning: '#E8B93B', danger: '#F2683C', possible: '#B487EA',
  scrim: 'rgba(6,2,7,0.7)',
};

export const LIGHT = {
  bg: '#F4EEF2', shell: '#FBF8FA', surface: '#FFFFFF', surface2: '#F6F0F4', control: '#F0E7ED',
  fgStrong: '#1C0A17', fg: '#2E1727', muted: '#6B5563', dim: '#6E5A68',
  line: 'rgba(28,10,23,0.14)', lineStrong: 'rgba(28,10,23,0.42)',
  onAccent: '#FFFFFF', onDeep: '#FFFFFF',
  success: '#0F7551', warning: '#7A5300', danger: '#B3261E', possible: '#6B3FA0',
  scrim: 'rgba(28,10,23,0.42)',
};

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
export const RADIUS = { sm: 10, md: 14, lg: 18, xl: 22, pill: 999 } as const;

/** 44pt is the minimum comfortable touch target. Nothing tappable goes below it. */
export const TAP_MIN = 44;
