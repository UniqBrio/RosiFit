/**
 * T-407: icon sets are imported one at a time, never from the barrel.
 *
 * Run: npx tsx --test src/components/iconImports.test.ts
 *
 * `import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'`
 * shipped EVERY icon set's glyph table -- Metro keeps unused exports -- about
 * 400 KB of JavaScript (MaterialCommunityIcons 186 KB, FontAwesome6 ~120 KB,
 * MaterialIcons 45 KB, Ionicons 30 KB ...), measured from the export's source
 * map. The app draws from two sets, and from one of them a single glyph.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : sources(p);
    return /\.(tsx?|jsx?)$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
  });
}

test('no source imports the @expo/vector-icons barrel', () => {
  const offenders = [...sources(path.join(root, 'app')), ...sources(path.join(root, 'src'))]
    .filter(p => /(from\s+|import\s*\(\s*|import\s+|require\(\s*)['"]@expo\/vector-icons['"]/.test(fs.readFileSync(p, 'utf8')))
    .map(p => path.relative(root, p));
  assert.deepEqual(offenders, []);
});

test('the one-glyph WhatsApp set points at the real "whatsapp" codepoint', () => {
  const map = JSON.parse(fs.readFileSync(path.join(root,
    'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json'), 'utf8'));
  const icon = fs.readFileSync(path.join(root, 'src/components/Icon.tsx'), 'utf8');
  const m = /WHATSAPP_CODEPOINT\s*=\s*(\d+)/.exec(icon);
  assert.ok(m, 'Icon.tsx declares WHATSAPP_CODEPOINT');
  assert.equal(Number(m![1]), map.whatsapp);
  assert.match(icon, /Fonts\/MaterialCommunityIcons\.ttf/, 'and draws it from the MaterialCommunityIcons font');
  // the same family name the library registers for that font, and the pinned constant is the one used
  const lib = fs.readFileSync(path.join(root, 'node_modules/@expo/vector-icons/build/MaterialCommunityIcons.js'), 'utf8');
  const family = /createIconSet\(glyphMap,\s*'([^']+)'/.exec(lib);
  assert.ok(family, 'the library still builds the set with createIconSet(glyphMap, <family>, font)');
  assert.match(icon, new RegExp(`createIconSet\\(\\{\\s*whatsapp:\\s*WHATSAPP_CODEPOINT\\s*\\},\\s*'${family![1]}'`),
    'the one-glyph set uses WHATSAPP_CODEPOINT and the library\'s own family name');
});
