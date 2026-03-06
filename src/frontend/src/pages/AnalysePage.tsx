import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Camera,
  Crop,
  Download,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Info,
  RotateCcw,
  Save,
  Upload,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import CropModal from "../components/CropModal";
import {
  extractColorFromImage,
  generateChannelImage,
  getColourName,
  rgbToHex,
} from "../utils/colorUtils";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import {
  type AnalysisRecord,
  generateId,
  saveAnalysis,
} from "../utils/storage";

interface Props {
  analyses: AnalysisRecord[];
  setAnalyses: (records: AnalysisRecord[]) => void;
}

interface LabValues {
  L: number;
  a: number;
  b: number;
  chroma: number;
  whitenessIndex: number;
  r: number;
  g: number;
  b_channel: number;
  hex: string;
  colourName: string;
}

function MetricCard({
  label,
  value,
  unit,
  colorClass,
  description,
  accent,
}: {
  label: string;
  value: number;
  unit?: string;
  colorClass: string;
  description: string;
  accent: string;
}) {
  return (
    <div
      className={`metric-card relative bg-card rounded-lg border border-border p-3 flex flex-col gap-1 ${colorClass}`}
      style={{ borderTopColor: accent }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {label}
        </span>
        <span className="text-[10px] text-muted-foreground/60">
          {description}
        </span>
      </div>
      <span
        className="font-mono text-2xl font-bold count-up"
        style={{ color: accent }}
      >
        {value.toFixed(2)}
        {unit && (
          <span className="text-sm font-normal text-muted-foreground ml-1">
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

export default function AnalysePage({ setAnalyses }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [labValues, setLabValues] = useState<LabValues | null>(null);
  const [sampleName, setSampleName] = useState("");
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [channelImages, setChannelImages] = useState<{
    originalUrl: string;
    lUrl: string;
    aUrl: string;
    bUrl: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setLabValues(null);
    setIsSaved(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be reselected
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleAnalyse = async () => {
    if (!imageUrl) {
      toast.error("Please upload an image first");
      return;
    }
    const effectiveUrl = croppedImageUrl ?? imageUrl;
    setIsAnalysing(true);
    try {
      // Load a fresh Image object from the effective URL to avoid any ref/CORS issues
      const freshImg = await new Promise<HTMLImageElement>(
        (resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = effectiveUrl;
        },
      );

      const result = extractColorFromImage(freshImg);
      const hex = rgbToHex(result.r, result.g, result.b_channel);
      const colourName = getColourName(result.r, result.g, result.b_channel);
      setLabValues({ ...result, hex, colourName });

      // Generate channel images for on-screen display
      try {
        const lImg = generateChannelImage(freshImg, "L");
        const aImg = generateChannelImage(freshImg, "a");
        const bImg = generateChannelImage(freshImg, "b");
        setChannelImages({
          originalUrl: effectiveUrl,
          lUrl: lImg,
          aUrl: aImg,
          bUrl: bImg,
        });
      } catch (e) {
        console.warn("Channel image generation failed:", e);
      }

      toast.success("Colour analysis complete");
    } catch (err) {
      console.error(err);
      toast.error("Analysis failed — please try a different image");
    } finally {
      setIsAnalysing(false);
    }
  };

  const handleSave = () => {
    if (!labValues) {
      toast.error("Run analysis first");
      return;
    }
    const record: AnalysisRecord = {
      id: generateId(),
      sampleName: sampleName.trim() || "Unnamed Sample",
      timestamp: Date.now(),
      L: labValues.L,
      a: labValues.a,
      b: labValues.b,
      chroma: labValues.chroma,
      whitenessIndex: labValues.whitenessIndex,
      r: labValues.r,
      g: labValues.g,
      b_channel: labValues.b_channel,
      imageDataUrl: imageUrl ?? undefined,
      colorName: labValues.colourName,
    };
    const updated = saveAnalysis(record);
    setAnalyses(updated);
    setIsSaved(true);
    toast.success("Analysis saved to history");
  };

  const handleReset = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setCroppedImageUrl(null);
    setCropModalOpen(false);
    setLabValues(null);
    setSampleName("");
    setIsSaved(false);
    setChannelImages(null);
  };

  const handleExportExcel = async () => {
    if (!labValues) {
      toast.error("Run analysis first");
      return;
    }
    const record: AnalysisRecord = {
      id: generateId(),
      sampleName: sampleName.trim() || "Unnamed Sample",
      timestamp: Date.now(),
      L: labValues.L,
      a: labValues.a,
      b: labValues.b,
      chroma: labValues.chroma,
      whitenessIndex: labValues.whitenessIndex,
      r: labValues.r,
      g: labValues.g,
      b_channel: labValues.b_channel,
      colorName: labValues.colourName,
    };
    try {
      await exportToExcel([record], "food-colour-analysis");
      toast.success("Excel file downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Export failed — please try again");
    }
  };

  const handleExportPDF = async () => {
    if (!labValues) {
      toast.error("Run analysis first");
      return;
    }
    const record: AnalysisRecord = {
      id: generateId(),
      sampleName: sampleName.trim() || "Unnamed Sample",
      timestamp: Date.now(),
      L: labValues.L,
      a: labValues.a,
      b: labValues.b,
      chroma: labValues.chroma,
      whitenessIndex: labValues.whitenessIndex,
      r: labValues.r,
      g: labValues.g,
      b_channel: labValues.b_channel,
      colorName: labValues.colourName,
    };

    // Use already-generated channel images if available, otherwise generate fresh
    const effectiveUrl = croppedImageUrl ?? imageUrl;
    let pdfChannelImages:
      | { originalUrl: string; lUrl: string; aUrl: string; bUrl: string }
      | undefined;
    if (channelImages) {
      pdfChannelImages = channelImages;
    } else if (effectiveUrl) {
      try {
        const freshImg = await new Promise<HTMLImageElement>(
          (resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = effectiveUrl;
          },
        );
        const lImg = generateChannelImage(freshImg, "L");
        const aImg = generateChannelImage(freshImg, "a");
        const bImg = generateChannelImage(freshImg, "b");
        pdfChannelImages = {
          originalUrl: effectiveUrl,
          lUrl: lImg,
          aUrl: aImg,
          bUrl: bImg,
        };
      } catch (err) {
        console.warn("Could not generate channel images for PDF:", err);
      }
    }

    try {
      await exportToPDF([record], "food-colour-analysis", pdfChannelImages);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Export failed — please try again");
    }
  };

  return (
    <div className="px-4 py-5 max-w-lg mx-auto space-y-5">
      {/* Tagline */}
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">
          Upload or capture a food image to extract CIE L*a*b* colour metrics
        </p>
      </div>

      {/* Upload zone */}
      {!imageUrl ? (
        <div
          data-ocid="analyse.canvas_target"
          className="relative border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-4 dropzone-pulse transition-all hover:border-primary/60 hover:bg-primary/5 min-h-[220px]"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Upload size={28} className="text-primary" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground">
              Drop image here or tap to browse
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WEBP — analysed in your browser
            </p>
          </div>

          <div className="flex gap-3 w-full max-w-xs">
            <Button
              data-ocid="analyse.upload_button"
              type="button"
              variant="outline"
              className="flex-1 border-border"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Upload size={16} className="mr-2" />
              Gallery
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-border"
              onClick={(e) => {
                e.stopPropagation();
                cameraInputRef.current?.click();
              }}
            >
              <Camera size={16} className="mr-2" />
              Camera
            </Button>
          </div>
        </div>
      ) : (
        /* Image preview */
        <div className="space-y-3">
          <div
            data-ocid="analyse.canvas_target"
            className="relative rounded-xl overflow-hidden border border-border bg-muted"
          >
            <img
              ref={imgRef}
              src={croppedImageUrl ?? imageUrl}
              alt="Food sample"
              className="w-full object-contain max-h-[320px]"
            />

            {/* Cropped badge */}
            {croppedImageUrl && (
              <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                <Crop size={10} />
                <span className="text-[10px] font-semibold">Cropped</span>
              </div>
            )}

            {/* Sampling region overlay */}
            {!labValues && !croppedImageUrl && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="absolute border-2 border-primary/60 rounded"
                  style={{
                    top: "25%",
                    left: "25%",
                    right: "25%",
                    bottom: "25%",
                  }}
                >
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-primary bg-background px-1 whitespace-nowrap">
                    Sampling region
                  </span>
                </div>
              </div>
            )}

            {/* Colour swatch overlay when analysed */}
            {labValues && (
              <div className="absolute top-2 right-2 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1.5 border border-border">
                <div
                  className="w-5 h-5 rounded border border-border/50"
                  style={{ backgroundColor: labValues.hex }}
                  aria-label={`Extracted colour: ${labValues.hex}`}
                />
                <span className="text-xs font-mono text-foreground">
                  {labValues.hex.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Crop button — only before analysis */}
          {!labValues && (
            <Button
              data-ocid="analyse.crop.button"
              type="button"
              variant="outline"
              className="w-full h-10 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/60"
              onClick={() => setCropModalOpen(true)}
            >
              <Crop size={15} className="mr-2" />
              {croppedImageUrl ? "Re-crop Image" : "Crop Image"}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground w-full"
            onClick={handleReset}
          >
            <RotateCcw size={14} className="mr-1.5" />
            Use a different image
          </Button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileInput}
        tabIndex={-1}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileInput}
        tabIndex={-1}
      />

      {/* Analyse button */}
      {imageUrl && (
        <Button
          data-ocid="analyse.primary_button"
          onClick={handleAnalyse}
          disabled={isAnalysing}
          className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 glow-primary transition-all"
        >
          {isAnalysing ? (
            <>
              <FlaskConical size={18} className="mr-2 animate-spin" />
              Analysing…
            </>
          ) : (
            <>
              <FlaskConical size={18} className="mr-2" />
              Analyse Colour
            </>
          )}
        </Button>
      )}

      {/* Results */}
      {labValues && (
        <section className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Analysis Results
            </h2>
            <div className="flex-1 h-px bg-border" />
            <div
              className="w-4 h-4 rounded-full border border-border/50 shadow-sm"
              style={{ backgroundColor: labValues.hex }}
            />
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5 border border-border">
            <Info size={13} className="mt-0.5 shrink-0 text-primary/70" />
            <span>
              Values represent the average colour of the central 50% of the
              image.
            </span>
          </div>

          {/* L* a* b* metrics */}
          <div className="grid grid-cols-3 gap-3">
            <MetricCard
              label="L*"
              value={labValues.L}
              description="Lightness"
              colorClass=""
              accent="oklch(0.82 0.12 95)"
            />
            <MetricCard
              label="a*"
              value={labValues.a}
              description="Green–Red"
              colorClass=""
              accent="oklch(0.65 0.22 25)"
            />
            <MetricCard
              label="b*"
              value={labValues.b}
              description="Blue–Yellow"
              colorClass=""
              accent="oklch(0.62 0.18 240)"
            />
          </div>

          {/* Chroma & WI */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Chroma C*"
              value={labValues.chroma}
              description="Saturation"
              colorClass=""
              accent="oklch(0.72 0.18 175)"
            />
            <MetricCard
              label="WI"
              value={labValues.whitenessIndex}
              description="Whiteness Index"
              colorClass=""
              accent="oklch(0.78 0.1 200)"
            />
          </div>

          {/* RGB reference */}
          <div className="bg-card rounded-lg border border-border p-3 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg border border-border shrink-0"
              style={{ backgroundColor: labValues.hex }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">
                Average RGB (sampled region)
              </p>
              <p className="font-mono text-sm text-foreground">
                R:{Math.round(labValues.r)} G:{Math.round(labValues.g)} B:
                {Math.round(labValues.b_channel)}
              </p>
            </div>
            <span className="font-mono text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">
              {labValues.hex.toUpperCase()}
            </span>
          </div>

          {/* Colour Name */}
          <div className="bg-card rounded-lg border border-border p-3 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg border border-border shrink-0 flex items-center justify-center"
              style={{ backgroundColor: labValues.hex }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Colour Name</p>
              <p className="text-sm font-semibold text-foreground">
                {labValues.colourName}
              </p>
            </div>
          </div>

          {/* Sample name + save */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="sample-name"
                className="text-xs text-muted-foreground uppercase tracking-wider"
              >
                Sample Name
              </Label>
              <Input
                id="sample-name"
                data-ocid="analyse.sample_name.input"
                placeholder="e.g. Mango pulp, Turmeric powder…"
                value={sampleName}
                onChange={(e) => setSampleName(e.target.value)}
                className="bg-muted/50 border-border h-11"
                maxLength={80}
              />
            </div>

            <Button
              data-ocid="analyse.save_button"
              onClick={handleSave}
              disabled={isSaved}
              variant="outline"
              className="w-full h-11 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/60"
            >
              <Save size={16} className="mr-2" />
              {isSaved ? "Saved to History ✓" : "Save Analysis"}
            </Button>
          </div>

          {/* Export buttons */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Export Current Result
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                data-ocid="analyse.export_excel.button"
                variant="outline"
                className="h-11 border-border"
                onClick={handleExportExcel}
              >
                <FileSpreadsheet size={16} className="mr-2 text-green-400" />
                Excel
              </Button>
              <Button
                data-ocid="analyse.export_pdf.button"
                variant="outline"
                className="h-11 border-border"
                onClick={handleExportPDF}
              >
                <FileText size={16} className="mr-2 text-red-400" />
                PDF
              </Button>
            </div>
          </div>

          {/* Channel Visualisation Images */}
          {channelImages && (
            <section
              className="space-y-3"
              data-ocid="analyse.channel_images.panel"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Channel Visualisation
                </h3>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { url: channelImages.originalUrl, label: "Original" },
                  { url: channelImages.lUrl, label: "L* (Lightness)" },
                  { url: channelImages.aUrl, label: "a* (Green→Red)" },
                  { url: channelImages.bUrl, label: "b* (Blue→Yellow)" },
                ].map(({ url, label }, index) => (
                  <div
                    key={label}
                    className="space-y-1.5"
                    data-ocid={`analyse.channel_image.item.${index + 1}`}
                  >
                    <div className="rounded-lg overflow-hidden border border-border bg-muted aspect-square">
                      <img
                        src={url}
                        alt={label}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-center text-muted-foreground font-medium">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </section>
      )}

      {/* Empty state prompt when no image */}
      {!imageUrl && (
        <div className="text-center py-4 space-y-3">
          <div className="flex items-center justify-center gap-4 text-muted-foreground/40">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-widest">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <p className="text-xs text-muted-foreground">
            Take a photo directly with your device camera
          </p>
          <Button
            type="button"
            size="lg"
            className="w-full h-12 bg-primary text-primary-foreground font-semibold"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera size={18} className="mr-2" />
            Open Camera
          </Button>
        </div>
      )}

      {/* Export button when no analysis (disabled state) */}
      {imageUrl && !labValues && (
        <div className="flex gap-3">
          <Button
            data-ocid="analyse.export_excel.button"
            variant="outline"
            className="flex-1 h-11 border-border opacity-40"
            disabled
          >
            <Download size={16} className="mr-2" />
            Export Excel
          </Button>
          <Button
            data-ocid="analyse.export_pdf.button"
            variant="outline"
            className="flex-1 h-11 border-border opacity-40"
            disabled
          >
            <Download size={16} className="mr-2" />
            Export PDF
          </Button>
        </div>
      )}

      {/* Crop Modal */}
      {imageUrl && (
        <CropModal
          imageUrl={imageUrl}
          open={cropModalOpen}
          onConfirm={(url) => {
            setCroppedImageUrl(url);
            setCropModalOpen(false);
          }}
          onCancel={() => setCropModalOpen(false)}
        />
      )}
    </div>
  );
}
