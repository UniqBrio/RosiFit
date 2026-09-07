import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveGlyph } from './iconAlias';

/**
 * The canvas draws with Material Symbols. Expo ships Material Icons, which
 * shares the vocabulary in kebab-case -- 69 of the canvas' 71 names
 * transliterate directly, and the two that do not are aliased in
 * iconAlias.ts. scripts/check-icons.ts fails the build if a name stops
 * resolving, because a missing glyph renders as a blank box: invisible in
 * review, and it removes a signal this UI is not allowed to carry in colour
 * alone.
 */
export type GlyphName = keyof typeof MaterialIcons.glyphMap;

const has = (n: string) => n in MaterialIcons.glyphMap;

export function glyph(name: string): GlyphName {
  return (resolveGlyph(name, has) ?? 'help-outline') as GlyphName;
}

/**
 * Why this waits for the font rather than rendering MaterialIcons directly:
 * that component returns an EMPTY <Text/> until its icon font has loaded, and
 * decides that with Font.isLoaded() at render time. Under the static web
 * export the server says loaded and the client, mid-hydration, says not --
 * so React threw #418 and discarded the tree, on whichever screens happened
 * to lose the race.
 *
 * Holding a same-size placeholder until the font is ready makes the server
 * and the first client render agree by construction, and reserves the exact
 * box the glyph will occupy so nothing shifts when it arrives. Every icon in
 * this app sits beside its own word, so the brief gap costs no meaning.
 */
function useFontReady(loadFont?: () => Promise<void>) {
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    let alive = true;
    const done = () => { if (alive) setFontReady(true); };
    // loadFont resolves immediately when the font is already there
    Promise.resolve(loadFont?.()).then(done, done);
    return () => { alive = false; };
  }, [loadFont]);

  return fontReady;
}

export function Icon({ name, size = 20, color }: { name: string; size?: number; color: string }) {
  const fontReady = useFontReady(MaterialIcons.loadFont);

  if (!fontReady) return <View style={{ width: size, height: size }} />;

  // Decorative: every icon in this app sits beside its own word, so
  // announcing it again would just double it up for a screen reader.
  return <MaterialIcons name={glyph(name)} size={size} color={color} accessibilityElementsHidden />;
}

/**
 * WhatsApp, which is a BRAND MARK and not a Material Symbol -- neither
 * Material Icons nor the canvas' Material Symbols has a glyph for it, so it
 * comes from MaterialCommunityIcons instead, behind the same font gate and
 * the same reserved box as Icon.
 *
 * It is deliberately not routed through glyph()/iconAlias: those, and
 * scripts/check-icons.ts with them, are a statement about the canvas'
 * Material vocabulary, and aliasing a brand to the nearest speech bubble
 * would have made this button say `chat` while claiming to say WhatsApp.
 * Like every icon here it sits beside its own word, so it is decorative.
 */
export function WhatsAppIcon({ size = 20, color }: { size?: number; color: string }) {
  const fontReady = useFontReady(MaterialCommunityIcons.loadFont);

  if (!fontReady) return <View style={{ width: size, height: size }} />;

  return <MaterialCommunityIcons name="whatsapp" size={size} color={color} accessibilityElementsHidden />;
}
