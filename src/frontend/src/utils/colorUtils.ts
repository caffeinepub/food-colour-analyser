/**
 * CIE L*a*b* colour analysis utilities
 * Reference: CIE D65 illuminant, 2° observer (CIE 1931)
 */

export interface LabResult {
  L: number;
  a: number;
  b: number;
  chroma: number;
  whitenessIndex: number;
  r: number;
  g: number;
  b_channel: number;
}

// D65 reference white (2° observer)
const REF_X = 95.047;
const REF_Y = 100.0;
const REF_Z = 108.883;

/**
 * Linearise sRGB component (apply inverse gamma)
 */
function srgbLinearise(value: number): number {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/**
 * RGB (0–255) → CIE XYZ (D65 illuminant)
 */
export function rgbToXyz(
  r: number,
  g: number,
  b: number,
): { x: number; y: number; z: number } {
  const lr = srgbLinearise(r);
  const lg = srgbLinearise(g);
  const lb = srgbLinearise(b);

  // Observer = 2°, Illuminant = D65
  const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) * 100;
  const y = (lr * 0.2126729 + lg * 0.7151522 + lb * 0.072175) * 100;
  const z = (lr * 0.0193339 + lg * 0.119192 + lb * 0.9503041) * 100;

  return { x, y, z };
}

/**
 * XYZ → CIE L*a*b*
 */
export function xyzToLab(
  x: number,
  y: number,
  z: number,
): { L: number; a: number; b: number } {
  const fx = labF(x / REF_X);
  const fy = labF(y / REF_Y);
  const fz = labF(z / REF_Z);

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);

  return { L, a, b: bVal };
}

function labF(t: number): number {
  const delta = 6 / 29;
  return t > delta * delta * delta
    ? Math.cbrt(t)
    : t / (3 * delta * delta) + 4 / 29;
}

/**
 * RGB (0–255) → CIE L*a*b*
 */
export function rgbToLab(
  r: number,
  g: number,
  b: number,
): { L: number; a: number; b: number } {
  const { x, y, z } = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

/**
 * Chroma C* = sqrt(a*² + b*²)
 */
export function computeChroma(a: number, b: number): number {
  return Math.sqrt(a * a + b * b);
}

/**
 * Whiteness Index (ASTM E313 approximation)
 * WI = 100 - sqrt((100 - L*)² + a*² + b*²)
 */
export function computeWhitenessIndex(L: number, a: number, b: number): number {
  return 100 - Math.sqrt((100 - L) * (100 - L) + a * a + b * b);
}

/**
 * Extract dominant / average colour from an HTMLImageElement via canvas.
 * Samples the central 50% of the image to avoid background interference.
 */
export function extractColorFromImage(
  imageElement: HTMLImageElement,
): LabResult {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas 2D context");

  const w = imageElement.naturalWidth || imageElement.width;
  const h = imageElement.naturalHeight || imageElement.height;

  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(imageElement, 0, 0, w, h);

  // Sample the central 50% region
  const x0 = Math.floor(w * 0.25);
  const y0 = Math.floor(h * 0.25);
  const sw = Math.floor(w * 0.5);
  const sh = Math.floor(h * 0.5);

  const imageData = ctx.getImageData(x0, y0, sw, sh);
  const pixels = imageData.data;

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let count = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    if (alpha < 128) continue; // skip transparent pixels
    totalR += pixels[i];
    totalG += pixels[i + 1];
    totalB += pixels[i + 2];
    count++;
  }

  if (count === 0) {
    throw new Error("No opaque pixels found in the sampled region");
  }

  const avgR = totalR / count;
  const avgG = totalG / count;
  const avgB = totalB / count;

  const { L, a, b } = rgbToLab(avgR, avgG, avgB);
  const chroma = computeChroma(a, b);
  const whitenessIndex = computeWhitenessIndex(L, a, b);

  return {
    L,
    a,
    b,
    chroma,
    whitenessIndex,
    r: avgR,
    g: avgG,
    b_channel: avgB,
  };
}

/**
 * RGB → hex string (for colour swatch display)
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((v) =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
