import { Toaster } from "@/components/ui/sonner";
import { Camera, ClockIcon, GitCompare } from "lucide-react";
import { useState } from "react";
import AnalysePage from "./pages/AnalysePage";
import ComparePage from "./pages/ComparePage";
import HistoryPage from "./pages/HistoryPage";
import type { AnalysisRecord } from "./utils/storage";
import { loadAnalyses } from "./utils/storage";

type Tab = "analyse" | "history" | "compare";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("analyse");
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>(() =>
    loadAnalyses(),
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary/20 border border-primary/40 flex items-center justify-center">
              <span className="text-primary text-xs font-mono font-bold">
                Lab
              </span>
            </div>
            <div>
              <h1 className="font-display font-semibold text-base leading-none text-foreground">
                Food Colour Analyser
              </h1>
              <p className="text-xs text-muted-foreground leading-none mt-0.5 hidden sm:block">
                CIE L*a*b* Analysis System
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">
              v1.0
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === "analyse" ? (
          <AnalysePage analyses={analyses} setAnalyses={setAnalyses} />
        ) : activeTab === "history" ? (
          <HistoryPage analyses={analyses} setAnalyses={setAnalyses} />
        ) : (
          <ComparePage />
        )}
      </main>

      {/* Bottom tab navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm safe-bottom">
        <div className="flex">
          <button
            type="button"
            data-ocid="nav.analyse.tab"
            onClick={() => setActiveTab("analyse")}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-colors ${
              activeTab === "analyse"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Analyse"
            aria-current={activeTab === "analyse" ? "page" : undefined}
          >
            <Camera
              size={20}
              strokeWidth={activeTab === "analyse" ? 2.5 : 1.75}
            />
            <span className="text-xs font-medium">Analyse</span>
            {activeTab === "analyse" && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
            )}
          </button>

          <button
            type="button"
            data-ocid="nav.history.tab"
            onClick={() => setActiveTab("history")}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-colors ${
              activeTab === "history"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="History"
            aria-current={activeTab === "history" ? "page" : undefined}
          >
            <ClockIcon
              size={20}
              strokeWidth={activeTab === "history" ? 2.5 : 1.75}
            />
            <span className="text-xs font-medium">History</span>
            {analyses.length > 0 && (
              <span className="absolute top-2 ml-5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                {analyses.length > 99 ? "99+" : analyses.length}
              </span>
            )}
            {activeTab === "history" && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
            )}
          </button>

          <button
            type="button"
            data-ocid="nav.compare.tab"
            onClick={() => setActiveTab("compare")}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-colors ${
              activeTab === "compare"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Compare"
            aria-current={activeTab === "compare" ? "page" : undefined}
          >
            <GitCompare
              size={20}
              strokeWidth={activeTab === "compare" ? 2.5 : 1.75}
            />
            <span className="text-xs font-medium">Compare</span>
            {activeTab === "compare" && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        </div>
      </nav>

      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: "oklch(0.2 0.012 220)",
            border: "1px solid oklch(0.35 0.04 175 / 0.5)",
            color: "oklch(0.93 0.015 195)",
          },
        }}
      />
    </div>
  );
}
