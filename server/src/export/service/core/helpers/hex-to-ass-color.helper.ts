/**
 * Converts a hex color string (#RRGGBB or #RGB) and opacity (0..1)
 * into ASS subtitle format: &HAABBGGRR (where AA is transparency byte: 00=opaque, FF=transparent).
 */
export function hexToAssColor(hex: string, opacity: number = 1.0): string {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('');
  }

  if (cleanHex.length !== 6) {
    cleanHex = 'FFFFFF';
  }

  const rr = cleanHex.substring(0, 2);
  const gg = cleanHex.substring(2, 4);
  const bb = cleanHex.substring(4, 6);

  const clampedOpacity = Math.max(0, Math.min(1, opacity));
  // ASS alpha is transparency: 0x00 = fully opaque, 0xFF = fully transparent
  const alphaVal = Math.round((1 - clampedOpacity) * 255);
  const aa = alphaVal.toString(16).padStart(2, '0').toUpperCase();

  return `&H${aa}${bb.toUpperCase()}${gg.toUpperCase()}${rr.toUpperCase()}`;
}
