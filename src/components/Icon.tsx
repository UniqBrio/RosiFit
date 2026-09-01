import { MaterialIcons } from '@expo/vector-icons';
import { resolveGlyph } from './iconAlias';

/**
 * The canvas draws with Material Symbols. Expo ships Material Icons, whose
 * glyph names use the same vocabulary in kebab-case, so 69 of the canvas' 71
 * names resolve by transliteration alone. The two that do not are aliased in
 * iconAlias.ts rather than silently rendering a blank -- several of these
 * icons carry meaning that colour alone is not allowed to carry.
 *
 * scripts/check-icons.ts fails the build if a canvas name stops resolving.
 */
export type GlyphName = keyof typeof MaterialIcons.glyphMap;

const has = (n: string) => n in MaterialIcons.glyphMap;

export function glyph(name: string): GlyphName {
  return (resolveGlyph(name, has) ?? 'help-outline') as GlyphName;
}

export function Icon({ name, size = 20, color }: { name: string; size?: number; color: string }) {
  // Decorative by default: every icon in this app sits beside its own word,
  // so announcing it again would just double it up for a screen reader.
  return <MaterialIcons name={glyph(name)} size={size} color={color} accessibilityElementsHidden />;
}
