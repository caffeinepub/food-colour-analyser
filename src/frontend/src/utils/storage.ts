export interface AnalysisRecord {
  id: string;
  sampleName: string;
  timestamp: number;
  L: number;
  a: number;
  b: number;
  chroma: number;
  whitenessIndex: number;
  imageDataUrl?: string;
  r: number;
  g: number;
  b_channel: number;
}

const STORAGE_KEY = "food-colour-analyses";

export function loadAnalyses(): AnalysisRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAnalysis(record: AnalysisRecord): AnalysisRecord[] {
  const existing = loadAnalyses();
  const updated = [record, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteAnalysis(id: string): AnalysisRecord[] {
  const existing = loadAnalyses();
  const updated = existing.filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
