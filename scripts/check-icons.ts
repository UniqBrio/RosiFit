/**
 * Fails if any icon name the canvas uses stops resolving to a real glyph.
 * A missing glyph renders as a blank box -- invisible in review, and it
 * removes a signal this UI is not allowed to carry in colour alone.
 */
import fs from 'node:fs';
import { resolveGlyph } from '../src/components/iconAlias.ts';

// run from the repo root, like the other guards (npm run check:icons)
const html = fs.readFileSync('design/RosiFit App.dc.html', 'utf8');
const map = JSON.parse(fs.readFileSync(
  'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialIcons.json',
  'utf8')) as Record<string, number>;

const names = new Set<string>();
for (const m of html.matchAll(/class="ms"[^>]*>([a-z_]+)</g)) names.add(m[1]);
for (const m of html.matchAll(/icon:\s*'([a-z_]+)'/g)) names.add(m[1]);

const has = (n: string) => n in map;
const unresolved = [...names].filter(n => resolveGlyph(n, has) === null);

for (const n of unresolved) console.log(`  FAIL  no glyph for "${n}"`);
console.log(`\n${names.size - unresolved.length}/${names.size} canvas icons resolve.`);
if (unresolved.length) process.exit(1);
