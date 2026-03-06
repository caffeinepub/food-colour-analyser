import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  ClockIcon,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { rgbToHex } from "../utils/colorUtils";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import { type AnalysisRecord, deleteAnalysis } from "../utils/storage";

interface Props {
  analyses: AnalysisRecord[];
  setAnalyses: (records: AnalysisRecord[]) => void;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HistoryRow({
  record,
  index,
  onDelete,
}: {
  record: AnalysisRecord;
  index: number;
  onDelete: (id: string) => void;
}) {
  const hex = rgbToHex(record.r, record.g, record.b_channel);
  const ocidIndex = index + 1;

  return (
    <div
      data-ocid={`history.item.${ocidIndex}`}
      className="relative bg-card rounded-xl border border-border overflow-hidden animate-fade-in"
    >
      {/* Colour strip */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl"
        style={{ backgroundColor: hex }}
      />

      <div className="pl-4 pr-3 py-3 space-y-2">
        {/* Top row: name + timestamp + delete */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm text-foreground truncate">
              {record.sampleName}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <ClockIcon size={10} />
              {formatDate(record.timestamp)}
            </p>
          </div>

          {/* Colour swatch + delete */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-muted/50 rounded-md px-1.5 py-1 border border-border">
              <div
                className="w-4 h-4 rounded-sm border border-border/50"
                style={{ backgroundColor: hex }}
              />
              <span className="font-mono text-[10px] text-muted-foreground">
                {hex.toUpperCase()}
              </span>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  data-ocid={`history.delete_button.${ocidIndex}`}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  aria-label={`Delete ${record.sampleName}`}
                >
                  <Trash2 size={14} />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-sm mx-4">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Analysis</AlertDialogTitle>
                  <AlertDialogDescription>
                    Delete &ldquo;{record.sampleName}&rdquo;? This cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(record.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-5 gap-1.5">
          <MetricPill label="L*" value={record.L} accent="#5cd8b0" />
          <MetricPill label="a*" value={record.a} accent="#e8836a" />
          <MetricPill label="b*" value={record.b} accent="#6a9ae8" />
          <MetricPill label="C*" value={record.chroma} accent="#5cd8b0" />
          <MetricPill
            label="WI"
            value={record.whitenessIndex}
            accent="#8fc8d8"
          />
        </div>
      </div>
    </div>
  );
}

function MetricPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="flex flex-col items-center bg-muted/40 rounded-md py-1.5 px-1 border border-border/50">
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span
        className="font-mono text-xs font-semibold"
        style={{ color: accent }}
      >
        {value.toFixed(1)}
      </span>
    </div>
  );
}

export default function HistoryPage({ analyses, setAnalyses }: Props) {
  const [isExporting, setIsExporting] = useState(false);

  const handleDelete = (id: string) => {
    const updated = deleteAnalysis(id);
    setAnalyses(updated);
    toast.success("Analysis deleted");
  };

  const handleExportAllExcel = async () => {
    if (analyses.length === 0) {
      toast.error("No analyses to export");
      return;
    }
    setIsExporting(true);
    try {
      await exportToExcel(analyses, "food-colour-analyses-all");
      toast.success(`Exported ${analyses.length} records to Excel`);
    } catch {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAllPDF = async () => {
    if (analyses.length === 0) {
      toast.error("No analyses to export");
      return;
    }
    setIsExporting(true);
    try {
      await exportToPDF(analyses, "food-colour-analyses-all");
      toast.success(`Exported ${analyses.length} records to PDF`);
    } catch {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="px-4 py-5 max-w-lg mx-auto space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold text-foreground">
            Analysis History
          </h2>
          <p className="text-xs text-muted-foreground">
            {analyses.length} record{analyses.length !== 1 ? "s" : ""} saved
          </p>
        </div>

        {analyses.length > 0 && (
          <div className="flex gap-2">
            <Button
              data-ocid="history.export_excel.button"
              variant="outline"
              size="sm"
              className="h-9 border-border px-2.5"
              onClick={handleExportAllExcel}
              disabled={isExporting}
              title="Export all to Excel"
            >
              <FileSpreadsheet size={15} className="text-green-400" />
              <span className="ml-1.5 text-xs hidden sm:inline">Excel</span>
            </Button>
            <Button
              data-ocid="history.export_pdf.button"
              variant="outline"
              size="sm"
              className="h-9 border-border px-2.5"
              onClick={handleExportAllPDF}
              disabled={isExporting}
              title="Export all to PDF"
            >
              <FileText size={15} className="text-red-400" />
              <span className="ml-1.5 text-xs hidden sm:inline">PDF</span>
            </Button>
          </div>
        )}
      </div>

      {/* Column header hint */}
      {analyses.length > 0 && (
        <div className="grid grid-cols-5 gap-1.5 px-4">
          {["L*", "a*", "b*", "C*", "WI"].map((h) => (
            <div
              key={h}
              className="text-center text-[9px] text-muted-foreground/60 uppercase tracking-wider"
            >
              {h}
            </div>
          ))}
        </div>
      )}

      {/* Records list */}
      {analyses.length === 0 ? (
        <div
          data-ocid="history.empty_state"
          className="flex flex-col items-center justify-center gap-4 py-16 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
            <FlaskConical size={28} className="text-muted-foreground/40" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              No analyses yet
            </p>
            <p className="text-xs text-muted-foreground max-w-[220px]">
              Go to the Analyse tab, upload a food image and save the results.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {analyses.map((record, index) => (
            <HistoryRow
              key={record.id}
              record={record}
              index={index}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Export all footer when records exist */}
      {analyses.length > 0 && (
        <div className="border-t border-border pt-4 space-y-2">
          <p className="text-xs text-muted-foreground text-center">
            Export all {analyses.length} records
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              data-ocid="history.export_excel.button"
              variant="outline"
              className="h-11 border-border"
              onClick={handleExportAllExcel}
              disabled={isExporting}
            >
              <FileSpreadsheet size={16} className="mr-2 text-green-400" />
              Excel (.xlsx)
            </Button>
            <Button
              data-ocid="history.export_pdf.button"
              variant="outline"
              className="h-11 border-border"
              onClick={handleExportAllPDF}
              disabled={isExporting}
            >
              <FileText size={16} className="mr-2 text-red-400" />
              PDF (.pdf)
            </Button>
          </div>
        </div>
      )}

      {/* Branding footer */}
      <footer className="pt-4 text-center">
        <p className="text-xs text-muted-foreground/50">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
          >
            Built with ♥ using caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
