# Food Colour Analyser

## Current State

- Single-image analysis page (AnalysePage) that extracts CIE L*a*b*, Chroma, Whiteness Index, and RGB from the central 50% of an uploaded/captured image.
- History page that lists saved analyses with export (Excel/PDF).
- Utility functions: `colorUtils.ts` (rgbToLab, rgbToXyz, xyzToLab, chroma, whiteness, hex), `exportUtils.ts`, `storage.ts`.
- Two-tab navigation: Analyse | History.
- No image comparison feature exists.

## Requested Changes (Diff)

### Add
- A third tab "Compare" in the bottom navigation.
- `ComparePage.tsx` — side-by-side comparison of two food images with:
  - Image A and Image B upload/camera capture slots.
  - Trigger button "Compare Colours" that analyses both images.
  - **Colour Difference** section: ΔE*ab (CIE 1976) with a descriptive scale label (imperceptible / noticeable / large), and a visual delta bar.
  - **Component-Level Differences (RGB/HEX)**: shows RGB values for A and B, per-channel delta (ΔR, ΔG, ΔB), hex swatches.
  - **Perceptual Properties (HSL/HSV)**: H, S, L (HSL) and H, S, V (HSV) for A and B with per-property deltas.
  - **Colorimetric Coordinates (CIELAB)**: L*, a*, b*, Chroma, Whiteness Index for A and B with per-value deltas.
  - Export comparison as Excel and PDF (new comparison-specific export functions).
- New utility functions in `colorUtils.ts`:
  - `rgbToHsl(r, g, b)` → { h, s, l }
  - `rgbToHsv(r, g, b)` → { h, s, v }
  - `computeDeltaE(lab1, lab2)` → number (CIE 1976 ΔE*ab = sqrt(ΔL²+Δa²+Δb²))
  - `deltaELabel(deltaE)` → descriptive string
- New export functions in `exportUtils.ts`:
  - `exportComparisonToExcel(comparison, filename)`
  - `exportComparisonToPDF(comparison, filename)`

### Modify
- `App.tsx`: add "Compare" tab with GitCompare icon; pass tab state to nav; render ComparePage.
- `colorUtils.ts`: add HSL, HSV, ΔE functions.
- `exportUtils.ts`: add comparison export functions.

### Remove
- Nothing removed.

## Implementation Plan

1. Add `rgbToHsl`, `rgbToHsv`, `computeDeltaE`, `deltaELabel` to `colorUtils.ts`.
2. Add `exportComparisonToExcel` and `exportComparisonToPDF` to `exportUtils.ts`.
3. Create `src/frontend/src/pages/ComparePage.tsx` with full comparison UI.
4. Update `App.tsx` to add the Compare tab and render `ComparePage`.
