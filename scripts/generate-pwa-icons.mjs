/**
 * Generates the PWA icons in public/ from the RosiFit brand mark.
 *
 * This is a DEV TOOL, not a build step. It runs by hand, its three PNGs are
 * committed, and the app never imports it — so nothing here reaches the bundle
 * (RC-013: a dependency's Node build bundled into the app, and the build stayed
 * green). `jimp-compact` is present transitively via @expo/image-utils; if a
 * future install dedupes it away, `npm i -D jimp-compact` and re-run, or
 * regenerate the three files by hand. Nothing that ships depends on it.
 *
 *   node scripts/generate-pwa-icons.mjs            # writes the shipping icons
 *   node scripts/generate-pwa-icons.mjs --candidates  # writes the plate options
 *
 * SOURCE ARTWORK. `assets/rosifit-logo.png` is the ONLY real RosiFit artwork in
 * the repo. `assets/icon.png`, `assets/favicon.png`, `assets/splash-icon.png`
 * and both `assets/android-icon-*.png` layers are unedited Expo scaffold
 * placeholders — a blue "A" with construction guides — so they are not used
 * here. That is logged as tech debt; it is not this change's to fix.
 *
 * THE PLATE. The mark is 55.7% transparent, so it needs an opaque plate behind
 * it: a maskable icon may not be transparent, and iOS renders transparency in
 * an apple-touch-icon as black. The plate colour is a brand decision the
 * requester makes — see PLATE below.
 *
 * THE TWO INSETS. `any` icons put the mark at 80% of the canvas. The maskable
 * icon puts it at 60%, because a launcher may crop a maskable icon to any
 * shape and only the inner 80% diameter is guaranteed to survive; 60% keeps the
 * whole crest inside that circle with room to spare.
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const Jimp = require('jimp-compact');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MARK = path.join(root, 'assets', 'rosifit-logo.png');

/**
 * The shipping plate. It is a value from `src/theme/tokens.ts`, never a new
 * colour — CP-008. `#08040A` is DARK.bg, the colour the app actually paints
 * behind itself, so the icon plate, the manifest `background_color` and the
 * launch screen are one colour rather than three near-misses.
 *
 * NOT `#130D18`, which is what `app.json` carries: that value matches no token
 * in the theme module and never has (TD — see docs/registers/TECH_DEBT.md).
 * `src/pwa/manifest.test.ts` holds the manifest to the token table, so this
 * cannot drift from the theme silently.
 */
const PLATE = '#08040A'; // DARK.bg, src/theme/tokens.ts:48

const CANDIDATE_PLATES = {
  'a-app-background': '#08040A', // DARK.bg — tokens.ts:48
  'b-white': '#FFFFFF', // LIGHT.surface — tokens.ts:71
  'c-accent-deep': '#5C0F63', // ACCENTS.rosifit.deep — tokens.ts:39
};

/** Draws the mark centred on an opaque plate. */
async function plateIcon(size, inset, plate) {
  const canvas = new Jimp(size, size, plate);
  const mark = await Jimp.read(MARK);
  const target = Math.round(size * inset);
  mark.scaleToFit(target, target, Jimp.RESIZE_BICUBIC);
  canvas.composite(
    mark,
    Math.round((size - mark.bitmap.width) / 2),
    Math.round((size - mark.bitmap.height) / 2),
  );
  return canvas;
}

async function main() {
  const candidates = process.argv.includes('--candidates');
  const outDir = candidates
    ? path.join(root, '.evidence', 'pwa-icon-candidates')
    : path.join(root, 'public');
  mkdirSync(outDir, { recursive: true });

  if (candidates) {
    for (const [name, plate] of Object.entries(CANDIDATE_PLATES)) {
      const icon = await plateIcon(512, 0.8, plate);
      await icon.writeAsync(path.join(outDir, `${name}.png`));
      console.log(`wrote .evidence/pwa-icon-candidates/${name}.png`);
    }
    return;
  }

  for (const size of [192, 512]) {
    const icon = await plateIcon(size, 0.8, PLATE);
    await icon.writeAsync(path.join(outDir, `icon-${size}.png`));
    console.log(`wrote public/icon-${size}.png (${size}x${size})`);
  }

  const maskable = await plateIcon(512, 0.6, PLATE);
  await maskable.writeAsync(path.join(outDir, 'icon-maskable-512.png'));
  console.log('wrote public/icon-maskable-512.png (512x512)');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
