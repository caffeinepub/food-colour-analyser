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

/**
 * RGB (0–255) → HSL (h: 0–360, s: 0–100, l: 0–100)
 */
export function rgbToHsl(
  r: number,
  g: number,
  b: number,
): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));

    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }

    h = h * 60;
    if (h < 0) h += 360;
  }

  return { h, s: s * 100, l: l * 100 };
}

/**
 * RGB (0–255) → HSV (h: 0–360, s: 0–100, v: 0–100)
 */
export function rgbToHsv(
  r: number,
  g: number,
  b: number,
): { h: number; s: number; v: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const v = max;

  if (max !== 0) {
    s = delta / max;
  }

  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }

    h = h * 60;
    if (h < 0) h += 360;
  }

  return { h, s: s * 100, v: v * 100 };
}

/**
 * CIE 1976 ΔE*ab — perceptual colour difference
 */
export function computeDeltaE(
  lab1: { L: number; a: number; b: number },
  lab2: { L: number; a: number; b: number },
): number {
  const dL = lab2.L - lab1.L;
  const da = lab2.a - lab1.a;
  const db = lab2.b - lab1.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Descriptive label for ΔE*ab value
 */
export function deltaELabel(deltaE: number): string {
  if (deltaE < 1) return "Imperceptible";
  if (deltaE < 2) return "Just noticeable";
  if (deltaE < 10) return "Noticeable";
  if (deltaE <= 50) return "Large difference";
  return "Very large difference";
}

// ─── Channel Image Generators ────────────────────────────────────────────────

/**
 * Linear interpolation between two 3-component colour tuples.
 */
function lerp3(
  t: number,
  c0: [number, number, number],
  c1: [number, number, number],
): [number, number, number] {
  return [
    c0[0] + (c1[0] - c0[0]) * t,
    c0[1] + (c1[1] - c0[1]) * t,
    c0[2] + (c1[2] - c0[2]) * t,
  ];
}

/**
 * Generate a false-colour canvas data URL for a single Lab channel.
 *
 * mode 'L': greyscale — L* 0→100 maps to black→white
 * mode 'a': green (a*<0) → grey (a*=0) → red (a*>0)  range −128..+127
 * mode 'b': blue (b*<0) → grey (b*=0) → yellow (b*>0) range −128..+127
 *
 * The source image is scaled to at most 400×400 before per-pixel processing
 * to keep PDF generation fast while still producing a crisp thumbnail.
 */
export function generateChannelImage(
  sourceImg: HTMLImageElement,
  mode: "L" | "a" | "b",
): string {
  const MAX_DIM = 400;

  const nw = sourceImg.naturalWidth || sourceImg.width;
  const nh = sourceImg.naturalHeight || sourceImg.height;

  // Scale down to MAX_DIM while preserving aspect ratio
  const scale = Math.min(1, MAX_DIM / Math.max(nw, nh, 1));
  const w = Math.max(1, Math.round(nw * scale));
  const h = Math.max(1, Math.round(nh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.drawImage(sourceImg, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const pixels = imageData.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const bPx = pixels[i + 2];

    const { L, a, b } = rgbToLab(r, g, bPx);

    let outR: number;
    let outG: number;
    let outB: number;

    if (mode === "L") {
      const grey = Math.round(Math.max(0, Math.min(255, (L / 100) * 255)));
      outR = grey;
      outG = grey;
      outB = grey;
    } else if (mode === "a") {
      // a* range −128..+127 → t ∈ [0,1]
      const t = Math.max(0, Math.min(1, (a + 128) / 255));
      let rgb: [number, number, number];
      if (t <= 0.5) {
        rgb = lerp3(t * 2, [0, 180, 0], [128, 128, 128]);
      } else {
        rgb = lerp3((t - 0.5) * 2, [128, 128, 128], [220, 30, 30]);
      }
      outR = Math.round(rgb[0]);
      outG = Math.round(rgb[1]);
      outB = Math.round(rgb[2]);
    } else {
      // b* range −128..+127 → t ∈ [0,1]
      const t = Math.max(0, Math.min(1, (b + 128) / 255));
      let rgb: [number, number, number];
      if (t <= 0.5) {
        rgb = lerp3(t * 2, [30, 30, 220], [128, 128, 128]);
      } else {
        rgb = lerp3((t - 0.5) * 2, [128, 128, 128], [220, 200, 30]);
      }
      outR = Math.round(rgb[0]);
      outG = Math.round(rgb[1]);
      outB = Math.round(rgb[2]);
    }

    pixels[i] = outR;
    pixels[i + 1] = outG;
    pixels[i + 2] = outB;
    // alpha unchanged
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * Returns a human-readable colour name based on RGB values.
 * Uses HSL bucketing: hue, saturation, and lightness bands.
 */
export function getColourName(r: number, g: number, b: number): string {
  const { h, s, l } = rgbToHsl(r, g, b);

  // Achromatic range
  if (s < 12) {
    if (l >= 93) return "White";
    if (l >= 78) return "Light Grey";
    if (l >= 55) return "Grey";
    if (l >= 30) return "Dark Grey";
    return "Black";
  }

  // Near-white / very light tints
  if (l >= 88) {
    if (h >= 30 && h < 70) return "Cream";
    return "White";
  }

  // Very dark shades
  if (l < 15) return "Black";

  // Hue-based naming
  if (h < 15 || h >= 345) return l < 35 ? "Dark Red" : "Red";
  if (h < 30) return l < 40 ? "Brown" : s > 60 ? "Orange-Red" : "Terracotta";
  if (h < 50) return l < 40 ? "Dark Orange" : "Orange";
  if (h < 65) return l < 50 ? "Dark Yellow" : s < 50 ? "Beige" : "Yellow";
  if (h < 80) return s < 45 ? "Olive" : "Yellow-Green";
  if (h < 150) return l < 35 ? "Dark Green" : "Green";
  if (h < 185) return "Cyan";
  if (h < 255) return l < 35 ? "Dark Blue" : "Blue";
  if (h < 290) return "Violet";
  if (h < 330) return l > 60 ? "Pink" : "Magenta";
  return l > 55 ? "Pink" : "Dark Pink";
}
