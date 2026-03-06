import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Camera,
  FileSpreadsheet,
  FileText,
  GitCompareArrows,
  Info,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  computeChroma,
  computeDeltaE,
  computeWhitenessIndex,
  deltaELabel,
  extractColorFromImage,
  getColourName,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  rgbToLab,
} from "../utils/colorUtils";
import {
  type ComparisonExportData,
  exportComparisonToExcel,
  exportComparisonToPDF,
} from "../utils/exportUtils";

// ─── Types ────────────────────────────────────────────────

interface SampleData {
  imageUrl: string;
  name: string;
  colorName: string;
  L: number;
  a: number;
  b: number;
  chroma: number;
  wi: number;
  r: number;
  g: number;
  b_ch: number;
  hex: string;
  hsl: { h: number; s: number; l: number };
  hsv: { h: number; s: number; v: number };
}

interface ComparisonResult {
  a: SampleData;
  b: SampleData;
  deltaE: number;
  deltaELabelStr: string;
}

// ─── Sub-components ───────────────────────────────────────

function DeltaValue({ delta }: { delta: number }) {
  const isPos = delta >= 0;
  const prefix = isPos ? "+" : "";
  return (
    <span
      className={`font-mono text-sm font-semibold ${isPos ? "text-emerald-400" : "text-red-400"}`}
    >
      {prefix}
      {delta.toFixed(2)}
    </span>
  );
}

function CompareRow({
  label,
  valA,
  valB,
  delta,
  unit = "",
  isText = false,
}: {
  label: string;
  valA: number | string;
  valB: number | string;
  delta?: number;
  unit?: string;
  isText?: boolean;
}) {
  const fmtNum = (v: number | string) =>
    typeof v === "number" ? v.toFixed(2) : v;

  return (
    <div className="grid grid-cols-4 gap-1 py-2 border-b border-border/40 last:border-0 items-center">
      <span className="text-xs text-muted-foreground col-span-1">{label}</span>
      <span
        className={`font-mono text-xs text-foreground text-right ${isText ? "text-[10px]" : ""}`}
      >
        {fmtNum(valA)}
        {unit && !isText && (
          <span className="text-muted-foreground ml-0.5">{unit}</span>
        )}
      </span>
      <span
        className={`font-mono text-xs text-foreground text-right ${isText ? "text-[10px]" : ""}`}
      >
        {fmtNum(valB)}
        {unit && !isText && (
          <span className="text-muted-foreground ml-0.5">{unit}</span>
        )}
      </span>
      <div className="text-right">
        {delta !== undefined ? (
          <DeltaValue delta={delta} />
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mt-5 mb-2">
      <h3 className="text-xs font-semibold text-foreground uppercase tracking-widest">
        {title}
      </h3>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function TableHeader() {
  return (
    <div className="grid grid-cols-4 gap-1 pb-1 border-b border-border mb-1">
      <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
        Metric
      </span>
      <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider text-right">
        A
      </span>
      <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider text-right">
        B
      </span>
      <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider text-right">
        Δ
      </span>
    </div>
  );
}

// ─── Image Slot ───────────────────────────────────────────

interface ImageSlotProps {
  label: "A" | "B";
  imageUrl: string | null;
  sampleName: string;
  onNameChange: (name: string) => void;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  imgRef: React.RefObject<HTMLImageElement | null>;
}

function ImageSlot({
  label,
  imageUrl,
  sampleName,
  onNameChange,
  onFileSelect,
  onClear,
  fileInputRef,
  cameraInputRef,
  imgRef,
}: ImageSlotProps) {
  const accentClass =
    label === "A" ? "border-teal-500/50" : "border-violet-400/50";
  const bgClass = label === "A" ? "bg-teal-500/10" : "bg-violet-400/10";
  const textClass = label === "A" ? "text-teal-400" : "text-violet-400";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = "";
  };

  return (
    <div className="flex-1 min-w-0 space-y-2">
      {/* Label badge */}
      <div className="flex items-center gap-2">
        <span
          className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${bgClass} ${textClass} border ${accentClass}`}
        >
          Sample {label}
        </span>
      </div>

      {/* Image area */}
      {!imageUrl ? (
        <div
          data-ocid={`compare.image_${label.toLowerCase()}.canvas_target`}
          className={`relative border-2 border-dashed ${accentClass} rounded-xl flex flex-col items-center justify-center gap-2 min-h-[140px] p-3 transition-colors hover:${bgClass}`}
        >
          <div
            className={`w-10 h-10 rounded-xl ${bgClass} border ${accentClass} flex items-center justify-center`}
          >
            <Upload size={18} className={textClass} />
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Upload or capture
          </p>
          <div className="flex gap-1.5 w-full">
            <Button
              data-ocid={`compare.image_${label.toLowerCase()}.upload_button`}
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-[11px] border-border"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={12} className="mr-1" />
              Gallery
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-[11px] border-border"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera size={12} className="mr-1" />
              Camera
            </Button>
          </div>
        </div>
      ) : (
        <div
          data-ocid={`compare.image_${label.toLowerCase()}.canvas_target`}
          className="relative rounded-xl overflow-hidden border border-border bg-muted"
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt={`Sample ${label}`}
            className="w-full object-contain max-h-[160px]"
            crossOrigin="anonymous"
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-destructive/20 transition-colors"
            aria-label={`Remove sample ${label}`}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleChange}
        tabIndex={-1}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleChange}
        tabIndex={-1}
      />

      {/* Sample name */}
      <Input
        data-ocid={`compare.sample_${label.toLowerCase()}.input`}
        value={sampleName}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder={`Name for Sample ${label}`}
        className="h-9 text-sm bg-muted/50 border-border"
        maxLength={60}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────

export default function ComparePage() {
  const [imageA, setImageA] = useState<string | null>(null);
  const [imageB, setImageB] = useState<string | null>(null);
  const [nameA, setNameA] = useState("");
  const [nameB, setNameB] = useState("");
  const [isComparing, setIsComparing] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  const fileARef = useRef<HTMLInputElement>(null);
  const cameraARef = useRef<HTMLInputElement>(null);
  const fileBRef = useRef<HTMLInputElement>(null);
  const cameraBRef = useRef<HTMLInputElement>(null);
  const imgARef = useRef<HTMLImageElement>(null);
  const imgBRef = useRef<HTMLImageElement>(null);

  const handleFileA = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      if (imageA) URL.revokeObjectURL(imageA);
      setImageA(URL.createObjectURL(file));
      setResult(null);
    },
    [imageA],
  );

  const handleFileB = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      if (imageB) URL.revokeObjectURL(imageB);
      setImageB(URL.createObjectURL(file));
      setResult(null);
    },
    [imageB],
  );

  const clearA = () => {
    if (imageA) URL.revokeObjectURL(imageA);
    setImageA(null);
    setResult(null);
  };

  const clearB = () => {
    if (imageB) URL.revokeObjectURL(imageB);
    setImageB(null);
    setResult(null);
  };

  const handleCompare = async () => {
    if (!imgARef.current || !imgBRef.current) {
      toast.error("Both images must be loaded");
      return;
    }
    setIsComparing(true);
    try {
      await new Promise((r) => setTimeout(r, 50));

      const rawA = extractColorFromImage(imgARef.current);
      const rawB = extractColorFromImage(imgBRef.current);

      const labA = rgbToLab(rawA.r, rawA.g, rawA.b_channel);
      const labB = rgbToLab(rawB.r, rawB.g, rawB.b_channel);
      const hslA = rgbToHsl(rawA.r, rawA.g, rawA.b_channel);
      const hslB = rgbToHsl(rawB.r, rawB.g, rawB.b_channel);
      const hsvA = rgbToHsv(rawA.r, rawA.g, rawA.b_channel);
      const hsvB = rgbToHsv(rawB.r, rawB.g, rawB.b_channel);

      const sampleA: SampleData = {
        imageUrl: imageA!,
        name: nameA.trim() || "Sample A",
        colorName: getColourName(rawA.r, rawA.g, rawA.b_channel),
        L: labA.L,
        a: labA.a,
        b: labA.b,
        chroma: computeChroma(labA.a, labA.b),
        wi: computeWhitenessIndex(labA.L, labA.a, labA.b),
        r: rawA.r,
        g: rawA.g,
        b_ch: rawA.b_channel,
        hex: rgbToHex(rawA.r, rawA.g, rawA.b_channel),
        hsl: hslA,
        hsv: hsvA,
      };

      const sampleB: SampleData = {
        imageUrl: imageB!,
        name: nameB.trim() || "Sample B",
        colorName: getColourName(rawB.r, rawB.g, rawB.b_channel),
        L: labB.L,
        a: labB.a,
        b: labB.b,
        chroma: computeChroma(labB.a, labB.b),
        wi: computeWhitenessIndex(labB.L, labB.a, labB.b),
        r: rawB.r,
        g: rawB.g,
        b_ch: rawB.b_channel,
        hex: rgbToHex(rawB.r, rawB.g, rawB.b_channel),
        hsl: hslB,
        hsv: hsvB,
      };

      const dE = computeDeltaE(
        { L: labA.L, a: labA.a, b: labA.b },
        { L: labB.L, a: labB.a, b: labB.b },
      );

      setResult({
        a: sampleA,
        b: sampleB,
        deltaE: dE,
        deltaELabelStr: deltaELabel(dE),
      });

      toast.success("Comparison complete");
    } catch (err) {
      console.error(err);
      toast.error("Comparison failed — please try different images");
    } finally {
      setIsComparing(false);
    }
  };

  const handleExportExcel = () => {
    if (!result) return;
    const { a, b } = result;
    const exportData: ComparisonExportData = {
      sampleA: a.name,
      sampleB: b.name,
      timestamp: Date.now(),
      A_colorName: a.colorName,
      B_colorName: b.colorName,
      A_L: a.L,
      A_a: a.a,
      A_b: a.b,
      A_chroma: a.chroma,
      A_wi: a.wi,
      B_L: b.L,
      B_a: b.a,
      B_b: b.b,
      B_chroma: b.chroma,
      B_wi: b.wi,
      deltaL: b.L - a.L,
      deltaA: b.a - a.a,
      deltaB: b.b - a.b,
      deltaChroma: b.chroma - a.chroma,
      deltaWI: b.wi - a.wi,
      deltaE: result.deltaE,
      deltaELabel: result.deltaELabelStr,
      A_r: a.r,
      A_g: a.g,
      A_b_ch: a.b_ch,
      A_hex: a.hex,
      B_r: b.r,
      B_g: b.g,
      B_b_ch: b.b_ch,
      B_hex: b.hex,
      deltaR: b.r - a.r,
      deltaG: b.g - a.g,
      deltaB_ch: b.b_ch - a.b_ch,
      A_hsl_h: a.hsl.h,
      A_hsl_s: a.hsl.s,
      A_hsl_l: a.hsl.l,
      B_hsl_h: b.hsl.h,
      B_hsl_s: b.hsl.s,
      B_hsl_l: b.hsl.l,
      A_hsv_h: a.hsv.h,
      A_hsv_s: a.hsv.s,
      A_hsv_v: a.hsv.v,
      B_hsv_h: b.hsv.h,
      B_hsv_s: b.hsv.s,
      B_hsv_v: b.hsv.v,
    };
    exportComparisonToExcel(exportData)
      .then(() => toast.success("Excel comparison downloaded"))
      .catch(() => toast.error("Export failed — please try again"));
  };

  const handleExportPDF = () => {
    if (!result) return;
    const { a, b } = result;
    const exportData: ComparisonExportData = {
      sampleA: a.name,
      sampleB: b.name,
      timestamp: Date.now(),
      A_colorName: a.colorName,
      B_colorName: b.colorName,
      A_L: a.L,
      A_a: a.a,
      A_b: a.b,
      A_chroma: a.chroma,
      A_wi: a.wi,
      B_L: b.L,
      B_a: b.a,
      B_b: b.b,
      B_chroma: b.chroma,
      B_wi: b.wi,
      deltaL: b.L - a.L,
      deltaA: b.a - a.a,
      deltaB: b.b - a.b,
      deltaChroma: b.chroma - a.chroma,
      deltaWI: b.wi - a.wi,
      deltaE: result.deltaE,
      deltaELabel: result.deltaELabelStr,
      A_r: a.r,
      A_g: a.g,
      A_b_ch: a.b_ch,
      A_hex: a.hex,
      B_r: b.r,
      B_g: b.g,
      B_b_ch: b.b_ch,
      B_hex: b.hex,
      deltaR: b.r - a.r,
      deltaG: b.g - a.g,
      deltaB_ch: b.b_ch - a.b_ch,
      A_hsl_h: a.hsl.h,
      A_hsl_s: a.hsl.s,
      A_hsl_l: a.hsl.l,
      B_hsl_h: b.hsl.h,
      B_hsl_s: b.hsl.s,
      B_hsl_l: b.hsl.l,
      A_hsv_h: a.hsv.h,
      A_hsv_s: a.hsv.s,
      A_hsv_v: a.hsv.v,
      B_hsv_h: b.hsv.h,
      B_hsv_s: b.hsv.s,
      B_hsv_v: b.hsv.v,
    };
    exportComparisonToPDF(exportData)
      .then(() => toast.success("PDF comparison downloaded"))
      .catch(() => toast.error("Export failed — please try again"));
  };

  // ΔE badge color
  const deBadgeClass = result
    ? result.deltaE < 1
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
      : result.deltaE < 10
        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
        : "bg-red-500/20 text-red-300 border-red-500/40"
    : "";

  return (
    <div className="px-4 py-5 max-w-lg mx-auto space-y-5">
      {/* Tagline */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Upload two food images to compare their colour profiles side-by-side
        </p>
      </div>

      {/* Two image slots side by side */}
      <div className="flex gap-3">
        <ImageSlot
          label="A"
          imageUrl={imageA}
          sampleName={nameA}
          onNameChange={setNameA}
          onFileSelect={handleFileA}
          onClear={clearA}
          fileInputRef={fileARef}
          cameraInputRef={cameraARef}
          imgRef={imgARef}
        />
        <ImageSlot
          label="B"
          imageUrl={imageB}
          sampleName={nameB}
          onNameChange={setNameB}
          onFileSelect={handleFileB}
          onClear={clearB}
          fileInputRef={fileBRef}
          cameraInputRef={cameraBRef}
          imgRef={imgBRef}
        />
      </div>

      {/* Compare button */}
      <Button
        data-ocid="compare.primary_button"
        onClick={handleCompare}
        disabled={!imageA || !imageB || isComparing}
        className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-40"
      >
        {isComparing ? (
          <>
            <GitCompareArrows size={18} className="mr-2 animate-spin" />
            Comparing…
          </>
        ) : (
          <>
            <GitCompareArrows size={18} className="mr-2" />
            Compare Colours
          </>
        )}
      </Button>

      {/* Helper hint */}
      {(!imageA || !imageB) && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/20 rounded-lg p-2.5 border border-border/50">
          <Info size={13} className="mt-0.5 shrink-0 text-primary/60" />
          <span>
            Upload both Sample A and Sample B images, then tap{" "}
            <strong className="text-foreground">Compare Colours</strong>.
          </span>
        </div>
      )}

      {/* ─── Results ─────────────────────────────────── */}
      {result && (
        <section className="space-y-1 animate-fade-in">
          {/* 1. Overall ΔE */}
          <SectionHeader title="Overall Colour Difference" />

          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            {/* ΔE value */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  ΔE*ab (CIE 1976)
                </p>
                <span className="font-mono text-4xl font-bold text-foreground">
                  {result.deltaE.toFixed(2)}
                </span>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border ${deBadgeClass}`}
              >
                {result.deltaELabelStr}
              </span>
            </div>

            {/* Colour swatches */}
            <div className="flex gap-3 items-center">
              <div className="flex-1 space-y-1">
                <div
                  className="h-14 rounded-lg border border-border shadow-inner"
                  style={{ backgroundColor: result.a.hex }}
                />
                <p className="text-[10px] text-center text-muted-foreground font-mono">
                  {result.a.name}
                  <br />
                  {result.a.hex.toUpperCase()}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <GitCompareArrows size={16} className="text-muted-foreground" />
              </div>
              <div className="flex-1 space-y-1">
                <div
                  className="h-14 rounded-lg border border-border shadow-inner"
                  style={{ backgroundColor: result.b.hex }}
                />
                <p className="text-[10px] text-center text-muted-foreground font-mono">
                  {result.b.name}
                  <br />
                  {result.b.hex.toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          {/* 2. RGB / HEX differences */}
          <SectionHeader title="Component-Level Differences (RGB / HEX)" />
          <div className="bg-card rounded-xl border border-border p-3">
            <TableHeader />
            <CompareRow
              label="R"
              valA={Math.round(result.a.r)}
              valB={Math.round(result.b.r)}
              delta={result.b.r - result.a.r}
            />
            <CompareRow
              label="G"
              valA={Math.round(result.a.g)}
              valB={Math.round(result.b.g)}
              delta={result.b.g - result.a.g}
            />
            <CompareRow
              label="B"
              valA={Math.round(result.a.b_ch)}
              valB={Math.round(result.b.b_ch)}
              delta={result.b.b_ch - result.a.b_ch}
            />
            <CompareRow
              label="HEX"
              valA={result.a.hex.toUpperCase()}
              valB={result.b.hex.toUpperCase()}
              isText
            />
          </div>

          {/* 3. HSL */}
          <SectionHeader title="Perceptual Properties — HSL" />
          <div className="bg-card rounded-xl border border-border p-3">
            <TableHeader />
            <CompareRow
              label="Hue"
              valA={result.a.hsl.h}
              valB={result.b.hsl.h}
              delta={result.b.hsl.h - result.a.hsl.h}
              unit="°"
            />
            <CompareRow
              label="Saturation"
              valA={result.a.hsl.s}
              valB={result.b.hsl.s}
              delta={result.b.hsl.s - result.a.hsl.s}
              unit="%"
            />
            <CompareRow
              label="Lightness"
              valA={result.a.hsl.l}
              valB={result.b.hsl.l}
              delta={result.b.hsl.l - result.a.hsl.l}
              unit="%"
            />
          </div>

          {/* 4. HSV */}
          <SectionHeader title="Perceptual Properties — HSV" />
          <div className="bg-card rounded-xl border border-border p-3">
            <TableHeader />
            <CompareRow
              label="Hue"
              valA={result.a.hsv.h}
              valB={result.b.hsv.h}
              delta={result.b.hsv.h - result.a.hsv.h}
              unit="°"
            />
            <CompareRow
              label="Saturation"
              valA={result.a.hsv.s}
              valB={result.b.hsv.s}
              delta={result.b.hsv.s - result.a.hsv.s}
              unit="%"
            />
            <CompareRow
              label="Value"
              valA={result.a.hsv.v}
              valB={result.b.hsv.v}
              delta={result.b.hsv.v - result.a.hsv.v}
              unit="%"
            />
          </div>

          {/* 5. CIELAB */}
          <SectionHeader title="Colorimetric Coordinates (CIELAB)" />
          <div className="bg-card rounded-xl border border-border p-3">
            <TableHeader />
            <CompareRow
              label="L*"
              valA={result.a.L}
              valB={result.b.L}
              delta={result.b.L - result.a.L}
            />
            <CompareRow
              label="a*"
              valA={result.a.a}
              valB={result.b.a}
              delta={result.b.a - result.a.a}
            />
            <CompareRow
              label="b*"
              valA={result.a.b}
              valB={result.b.b}
              delta={result.b.b - result.a.b}
            />
            <CompareRow
              label="Chroma C*"
              valA={result.a.chroma}
              valB={result.b.chroma}
              delta={result.b.chroma - result.a.chroma}
            />
            <CompareRow
              label="WI"
              valA={result.a.wi}
              valB={result.b.wi}
              delta={result.b.wi - result.a.wi}
            />
          </div>

          {/* Export */}
          <div className="space-y-2 pt-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Export Comparison
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                data-ocid="compare.export_excel.button"
                variant="outline"
                className="h-11 border-border"
                onClick={handleExportExcel}
              >
                <FileSpreadsheet size={16} className="mr-2 text-emerald-400" />
                Excel
              </Button>
              <Button
                data-ocid="compare.export_pdf.button"
                variant="outline"
                className="h-11 border-border"
                onClick={handleExportPDF}
              >
                <FileText size={16} className="mr-2 text-red-400" />
                PDF
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
