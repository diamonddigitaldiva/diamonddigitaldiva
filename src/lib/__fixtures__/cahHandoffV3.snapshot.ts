/**
 * VERBATIM copy of the Creator Access Hub file src/lib/map/handoffV3.ts
 * (CAH project snapshot, commit f02bddf0, read-only, 2026-11-02). Test-only:
 * lets The MAP check that every focus it hands off is one CAH accepts.
 * Do not edit; re-copy when CAH changes it.
 */
/**
 * MAP v3 → CAH handoff: focus IDs and labels.
 *
 * The MAP sends visitors to the hub with one opaque `session` ID in the URL
 * (never a name or email). The session's `primary_stage` holds a v3 focus ID
 * (a path such as `publishing`, a gap such as `message`, or `discover`).
 *
 * Only IDs in this registry are accepted. Old v1/v2 stage or product codes are
 * not mapped to anything, so an unknown value renders nothing rather than a
 * guessed product. Labels mirror The MAP's v3 definitions (map-v3.0).
 */

export type MapFocusKind = "path" | "gap" | "discover";

export interface MapFocus {
  id: string;
  kind: MapFocusKind;
  label: string;
  /** CAH creator path for this focus, when The MAP defines one. */
  creatorPath?: string;
}

const PATHS: Record<string, { label: string; creatorPath?: string }> = {
  digital_products: { label: "Creating and selling digital products", creatorPath: "digital-income" },
  affiliate: { label: "Recommending products as an affiliate" },
  quotes: { label: "A quote or theme page", creatorPath: "quotes" },
  ai_avatar: { label: "AI avatars, images and video", creatorPath: "ai-avatar" },
  publishing: { label: "Books, coloring books and printables", creatorPath: "books-publishing" },
  social: { label: "Growing on social platforms" },
  ai_services: { label: "AI services and systems for businesses" },
  services: { label: "Services for clients or businesses" },
  asmr: { label: "ASMR and visual entertainment", creatorPath: "asmr" },
  business: { label: "Growing your existing business or brand", creatorPath: "brand-business" },
};

const GAPS: Record<string, string> = {
  focus: "Choosing one focus",
  launch: "Finishing and launching",
  reach: "Reaching the right people",
  message: "Explaining your offer's value",
  conversion: "Turning attention into sales",
  content: "Consistent, recognizable content",
  routine: "A routine you can maintain",
  systems: "Setting up tools and systems",
  expansion: "Choosing an added income stream",
  diagnose: "Finding what's really in the way",
};

export const MAP_V3_FOCUS: Readonly<Record<string, MapFocus>> = Object.freeze({
  ...Object.fromEntries(
    Object.entries(PATHS).map(([id, v]) => [id, { id, kind: "path" as const, label: v.label, creatorPath: v.creatorPath }]),
  ),
  ...Object.fromEntries(Object.entries(GAPS).map(([id, label]) => [id, { id, kind: "gap" as const, label }])),
  discover: { id: "discover", kind: "discover", label: "Finding what fits you" },
});

/** Accepts only a known v3 focus ID. Anything else (old codes, free text) is null. */
export function mapFocusFor(id: unknown): MapFocus | null {
  if (typeof id !== "string") return null;
  const key = id.trim();
  if (!/^[a-z_]{1,32}$/.test(key)) return null;
  return Object.prototype.hasOwnProperty.call(MAP_V3_FOCUS, key) ? MAP_V3_FOCUS[key] : null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The opaque session ID from a query string, or null. Nothing else is read. */
export function handoffSessionIdFrom(search: string): string | null {
  const v = new URLSearchParams(search).get("session");
  return v && UUID_RE.test(v) ? v.toLowerCase() : null;
}

/** Query parameters removed from the visible address after a handoff is read. */
const STRIP = ["session", "email", "e", "name", "first_name", "firstName"];

export function stripHandoffParams(href: string): string {
  const u = new URL(href);
  for (const k of STRIP) u.searchParams.delete(k);
  return u.pathname + (u.searchParams.toString() ? `?${u.searchParams}` : "") + u.hash;
}

export interface HandoffSessionRow {
  primary_stage?: string | null;
  secondary_stage?: string | null;
  [k: string]: unknown;
}

/** Reduces a MAP session row to focus IDs only. Names, emails and URLs are dropped. */
export function normalizeHandoff(row: HandoffSessionRow | null | undefined): {
  primary: MapFocus | null;
  secondary: MapFocus | null;
} {
  if (!row) return { primary: null, secondary: null };
  const primary = mapFocusFor(row.primary_stage);
  const secondary = mapFocusFor(row.secondary_stage);
  return { primary, secondary: secondary && secondary.id !== primary?.id ? secondary : null };
}
