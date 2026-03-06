# Food Colour Analyser

## Current State
New project. No existing backend or frontend code.

## Requested Changes (Diff)

### Add
- Food image upload functionality (camera capture or file selection, mobile-friendly)
- Color analysis engine that processes uploaded images and computes:
  - CIE L* (lightness)
  - CIE a* (green-red axis)
  - CIE b* (blue-yellow axis)
  - Chroma (C* = sqrt(a*² + b*²))
  - Whiteness Index (WI = 100 - sqrt((100 - L*)² + a*² + b*²))
- Storage of analysis results with sample name, image reference, and computed values
- Analysis history list showing all past analyses
- Export to Excel (.xlsx) using SheetJS (client-side)
- Export to PDF using jsPDF (client-side)
- Mobile-responsive layout optimized for Android browser use

### Modify
N/A (new project)

### Remove
N/A (new project)

## Implementation Plan
1. Backend (Motoko):
   - Store analysis records: id, sampleName, timestamp, L, a, b, chroma, whitenessIndex, imageData (base64 or blob reference)
   - CRUD: createAnalysis, getAnalyses, deleteAnalysis

2. Frontend (React + TypeScript):
   - Landing/home page with upload CTA
   - Image upload component (file input + camera capture on mobile)
   - Color extraction: sample pixels from the uploaded image via HTML Canvas, convert RGB → XYZ → CIE L*a*b*
   - Compute Chroma and Whiteness Index from L*a*b*
   - Results display card showing all computed values
   - Save result to backend with a sample name
   - History page listing all saved analyses
   - Export buttons: Download Excel (SheetJS/xlsx) and Download PDF (jsPDF)
   - Mobile-first responsive layout
