import { MAP_V3_VERSION, pruneV3, type V3Answers } from "@/lib/assessment/v3";

/**
 * Versioned in-progress draft so a refresh doesn't lose answers. Stores only
 * assessment answers and the current question: never the name or email.
 * Drafts from another version are ignored, and drafts expire.
 */
export const DRAFT_KEY = `map-draft:${MAP_V3_VERSION}`;
export const DRAFT_TTL_MS = 48 * 60 * 60 * 1000;

export interface Draft {
  version: string;
  answers: V3Answers;
  currentId: string;
  screen: "quiz" | "lead";
  savedAt: number;
}

export function loadDraft(now = Date.now()): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<Draft>;
    if (d.version !== MAP_V3_VERSION || typeof d.savedAt !== "number" || now - d.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    if (!d.answers || typeof d.answers !== "object" || typeof d.currentId !== "string") return null;
    return {
      version: MAP_V3_VERSION,
      answers: pruneV3(d.answers as V3Answers),
      currentId: d.currentId,
      screen: d.screen === "lead" ? "lead" : "quiz",
      savedAt: d.savedAt,
    };
  } catch {
    return null;
  }
}

export function saveDraft(answers: V3Answers, currentId: string, screen: "quiz" | "lead") {
  try {
    const d: Draft = { version: MAP_V3_VERSION, answers, currentId, screen, savedAt: Date.now() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    // storage unavailable: progress just won't persist
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
