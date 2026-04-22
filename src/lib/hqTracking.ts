import { supabase } from "@/integrations/supabase/client";

type HqEvent =
  | {
      type: "quiz_completed";
      primary_stage: string;
      secondary_stage?: string | null;
    }
  | {
      type: "link_click";
      link_name: string;
      link_url?: string | null;
      primary_stage?: string | null;
      secondary_stage?: string | null;
      hub_consent?: boolean | null;
    }
  | {
      type: "feedback_submitted";
      rating?: number | null;
      has_message?: boolean;
    }
  | {
      type: "contact_message";
      first_name: string;
      email: string;
      message: string;
    };

const DEDUPE_STORAGE_KEY = "hq_tracking_dedupe_v1";
// Time window after which the same event can fire again (handles legitimate retakes).
const DEDUPE_TTL_MS = 30 * 60 * 1000; // 30 minutes

type DedupeStore = Record<string, number>;

function loadStore(): DedupeStore {
  try {
    const raw = sessionStorage.getItem(DEDUPE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DedupeStore;
    const now = Date.now();
    // Drop expired entries on read.
    return Object.fromEntries(
      Object.entries(parsed).filter(([, ts]) => now - ts < DEDUPE_TTL_MS)
    );
  } catch {
    return {};
  }
}

function saveStore(store: DedupeStore) {
  try {
    sessionStorage.setItem(DEDUPE_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // sessionStorage unavailable — dedupe degrades gracefully.
  }
}

function dedupeKey(event: HqEvent): string | null {
  // Feedback is intentionally NOT deduped — repeated submissions matter.
  switch (event.type) {
    case "quiz_completed":
      return `quiz_completed:${event.primary_stage}:${event.secondary_stage ?? ""}`;
    case "link_click":
      return `link_click:${event.link_name}:${event.primary_stage ?? ""}:${event.secondary_stage ?? ""}`;
    default:
      return null;
  }
}

/**
 * Fire-and-forget forward of an event to Elleni's HQ.
 * Deduplicates `quiz_completed` and `link_click` events within a 30-minute
 * window per browser session (survives refresh, not new tabs/sessions).
 */
export function forwardToHQ(event: HqEvent) {
  const key = dedupeKey(event);
  if (key) {
    const store = loadStore();
    if (store[key]) {
      // Recently sent — skip.
      return;
    }
    store[key] = Date.now();
    saveStore(store);
  }

  supabase.functions
    .invoke("forward-to-hq", { body: event })
    .then(({ error }) => {
      if (error) {
        console.error("HQ forward failed:", error);
        // On failure, allow the event to be retried later by clearing its key.
        if (key) {
          const store = loadStore();
          delete store[key];
          saveStore(store);
        }
      }
    });
}
