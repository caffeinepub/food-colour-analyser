# Food Colour Analyser

## Current State

- AnalysePage lets users upload/capture a food image, then runs colour extraction on the central 50% of the image (fixed sampling region), displaying L*, a*, b*, Chroma, WI, Colour Name, RGB/HEX, and 4 channel visualisation images.
- ComparePage shows two image slots (A and B) and runs extraction on both without any crop step.
- There is no interactive crop functionality anywhere in the app.

## Requested Changes (Diff)

### Add
- A `CropModal` component: a full-screen modal/sheet that renders the uploaded image on a `<canvas>` and lets the user drag to draw a rectangular crop selection. It should show a resizable/draggable selection box with handles, a "Crop & Analyse" confirm button, and a "Cancel" button.
- A "Crop Image" button that appears on AnalysePage after an image is loaded (between the image preview and the Analyse button).
- The same crop button inside each ImageSlot on ComparePage after an image is loaded.
- When the user confirms the crop, the cropped region is drawn onto an offscreen canvas and a new blob URL is produced, replacing the original imageUrl for that slot. The channel images and analysis will then run on this cropped image.
- A small badge/indicator on the image preview when a crop has been applied (e.g. "Cropped" pill).

### Modify
- AnalysePage: add crop state (`isCropped`, `cropModalOpen`) and wire the CropModal; pass the cropped blob URL to analysis and channel image generation.
- ComparePage / ImageSlot: add crop state per slot and wire the CropModal for each.

### Remove
- Nothing removed.

## Implementation Plan

1. Create `src/frontend/src/components/CropModal.tsx`:
   - Accept `imageUrl`, `open`, `onConfirm(croppedUrl: string)`, `onCancel` props.
   - Render an overlay/dialog with the image on a canvas.
   - Support touch (for Android) and mouse drag to draw/resize the selection rectangle.
   - "Crop & Analyse" button: draw selected region to an offscreen canvas → `canvas.toDataURL()` → call `onConfirm` with the data URL.
   - "Cancel" button closes without changing state.

2. Update `AnalysePage.tsx`:
   - Add `cropModalOpen` and `croppedImageUrl` state.
   - Show a "Crop Image" button (Crop icon) after image preview, before Analyse button.
   - When crop confirmed, set `croppedImageUrl` and use it in place of `imageUrl` for analysis and PDF/channel generation.
   - Show a "Cropped" badge on the preview if crop has been applied.
   - Reset crop state on `handleReset`.

3. Update `ComparePage.tsx` / `ImageSlot`:
   - Add per-slot `cropModalOpen` and `croppedImageUrl` state lifted into the parent.
   - Expose a "Crop" icon button on each image slot after upload.
   - Pass cropped URL to `extractColorFromImage` calls.
   - Show "Cropped" badge on the slot image when cropped.

4. Use deterministic `data-ocid` markers on all new crop buttons, modal, and confirm/cancel controls.
