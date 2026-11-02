/**
 * Read-only adapter for the Creator Access Hub's public MAP catalog feed
 * (contract cah-map-catalog/v1). Used by the browser result AND by the
 * send-webhook server recomputation, so both apply identical rules.
 *
 * - Plain public GET, no key, no cookies, no scraping.
 * - Strict validation: an invalid envelope makes the whole feed "unavailable";
 *   an invalid item is dropped with a reason. Unknown values fail closed.
 * - Only MAP-allowlisted, CAH-preferred, active/available items survive.
 * - Never falls back to a stale list: unavailable means no paid suggestions.
 */
import { OWNED_RESOURCES, type Platform } from "./definition.ts";
import {
  CAH_BASE,
  GAP_IDS,
  PATH_IDS,
  ROLE_IDS,
  V3_MAP_ALLOWLIST,
  V3_MAP_BLOCKED,
  V3_OWNER_LINKS,
  cahResource,
  v3Recommendability,
  type FocusRole,
  type GapId,
  type PathId,
  type V3CatalogEntry,
  type V3Price,
  type V3Requirements,
} from "./catalog.ts";

export const CAH_FEED_URL = `${CAH_BASE}/api/public/map/catalog/v1`;
export const CAH_FEED_CONTRACT = "cah-map-catalog/v1";
export const CAH_FEED_TIMEOUT_MS = 6000;
/** Real feed is ~19 KB; anything far larger is treated as invalid. */
export const CAH_FEED_MAX_BYTES = 512 * 1024;
const MAX_ITEMS = 500;

export type V3FeedUnavailable = "timeout" | "network" | "http" | "invalid" | "too-large" | "not-loaded";

export interface V3FeedDrop {
  id: string;
  reason: string;
}

export type V3CatalogSource =
  | { status: "live"; contract: string; generatedAt: string; entries: V3CatalogEntry[]; dropped: V3FeedDrop[] }
  | { status: "unavailable"; reason: V3FeedUnavailable };

export const CATALOG_NOT_LOADED: V3CatalogSource = { status: "unavailable", reason: "not-loaded" };

const ITEM_ID = /^[a-z0-9][a-z0-9-]{0,99}$/;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const strs = (v: unknown): string[] | null => (Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : null);
const clean = (s: string) => s.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
/** Decorative emoji are removed from titles; the words are kept exactly. */
const cleanTitle = (s: string) => clean(s.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, ""));
const isIsoDate = (s: unknown): s is string => typeof s === "string" && s.length <= 40 && !Number.isNaN(Date.parse(s));
/** Strong outcome promises are never shown, even if they reach the feed. */
const PROMISE = /guarantee|you(?:'ll| will) (?:earn|make)|get rich|overnight success|quit your job/i;

const ALLOW = new Map(V3_MAP_ALLOWLIST.map((a, i) => [a.id, { ...a, order: i }]));
const OWNED_IDS = new Set(OWNED_RESOURCES.map((r) => r.id));
const OWNED_BY_CATALOG = new Map<string, string[]>();
for (const r of OWNED_RESOURCES) {
  if (!r.catalogId) continue;
  OWNED_BY_CATALOG.set(r.catalogId, [...(OWNED_BY_CATALOG.get(r.catalogId) ?? []), r.id]);
}
const SOCIAL = new Set(["instagram", "threads", "pinterest", "tiktok", "facebook", "youtube"]);

const PREREQ_NOTE: Record<string, string> = {
  computer_windows_or_mac: "Needs a Mac or Windows computer.",
  paid_claude: "Needs a paid Claude plan.",
  outreach: "Built around reaching out to businesses or clients.",
  messages: "Built around direct messages with potential customers.",
  faceless: "Built around faceless content.",
  avatar_comfort: "Built around creating with an AI avatar.",
  existing_avatar: "For people who already have an AI avatar.",
  existing_offer: "For people who already have a product or offer to launch.",
  something_to_sell: "For people who already have something to sell.",
  no_sales_yet: "For people who haven't made a sale yet.",
};

/** Maps feed prerequisites to engine requirements. Unknown => null (item dropped). */
export function mapPrerequisites(list: string[]): { requires: V3Requirements; note: string | null } | null {
  const r: V3Requirements = {};
  const notes: string[] = [];
  const plat: { ids: string[]; modes: Set<string>; labels: string[] } = { ids: [], modes: new Set(), labels: [] };
  for (const p of list) {
    const m = /^platform_(fit|required):([a-z]+)$/.exec(p);
    if (m) {
      if (!SOCIAL.has(m[2])) return null;
      plat.ids.push(`plat_${m[2]}`);
      plat.modes.add(m[1]);
      plat.labels.push(m[2] === "tiktok" ? "TikTok" : m[2] === "youtube" ? "YouTube" : m[2].charAt(0).toUpperCase() + m[2].slice(1));
      continue;
    }
    switch (p) {
      case "computer_windows_or_mac":
        r.platforms = ["windows", "mac"] as Platform[];
        break;
      case "paid_claude":
        r.paidClaude = true;
        break;
      case "outreach":
        r.outreach = true;
        break;
      case "messages":
        r.messages = true;
        break;
      case "faceless":
        r.faceless = true;
        break;
      case "avatar_comfort":
        r.avatar = true;
        break;
      case "existing_avatar":
        r.existingAvatar = true;
        break;
      case "existing_offer":
        r.offer = true;
        break;
      case "something_to_sell":
        r.somethingToSell = true;
        break;
      case "no_sales_yet":
        r.noSalesYet = true;
        break;
      default:
        return null;
    }
    notes.push(PREREQ_NOTE[p]);
  }
  if (plat.ids.length) {
    if (plat.modes.size > 1) return null; // mixed fit/required semantics: not supported
    const required = plat.modes.has("required");
    r.socialPlatforms = { ids: plat.ids, mode: required ? "required" : "avoid-mismatch" };
    notes.push(`${required ? "For" : "Built around"} ${plat.labels.join(" or ")}.`);
  }
  return { requires: r, note: notes.length ? notes.join(" ") : null };
}

function mapPrice(p: unknown): V3Price {
  if (!isObj(p)) return { state: "unverified" };
  if (p.state === "free-owner-stated") return { state: "free-owner-stated" };
  if (
    p.state === "verified" &&
    typeof p.amount === "number" &&
    Number.isFinite(p.amount) &&
    p.amount > 0 &&
    p.currency === "USD" &&
    (p.kind === undefined || p.kind === "one_time") &&
    isIsoDate(p.checked_at) &&
    typeof p.source === "string"
  ) {
    return { state: "verified", usd: p.amount, checkedAt: String(p.checked_at).slice(0, 10), source: `CAH feed: ${clean(p.source).slice(0, 200)}` };
  }
  // Recurring, non-USD, zero or unverified prices are never used for budget checks.
  return { state: "unverified" };
}

/** Adapts one feed item, or returns the reason it can't be used. */
function adaptItem(o: Record<string, unknown>): { entry: V3CatalogEntry; order: number } | { drop: string } {
  const id = o.id as string;
  if (Object.prototype.hasOwnProperty.call(V3_MAP_BLOCKED, id)) return { drop: `blocked:${V3_MAP_BLOCKED[id]}` };
  const allow = ALLOW.get(id);
  if (!allow) return { drop: "not-on-map-allowlist" };
  if (o.map_preferred !== true) return { drop: "not-cah-preferred" };

  const listing = isObj(o.listing) ? o.listing : {};
  const avail = isObj(o.availability) ? o.availability : {};
  if (avail.state === "sold_out" || avail.sold_out === true) return { drop: "sold-out" };
  if (listing.state !== "active" || avail.state !== "available" || avail.coming_soon !== false || avail.being_updated !== false)
    return { drop: "not-available" };

  const title = typeof o.title === "string" ? cleanTitle(o.title) : "";
  const summary = typeof o.summary === "string" ? clean(o.summary) : "";
  if (!title || title.length > 200) return { drop: "invalid-title" };
  if (!summary || summary.length > 600) return { drop: "scope-not-established" };
  if (PROMISE.test(summary) || PROMISE.test(title)) return { drop: "promise-language" };

  const d = isObj(o.destination) ? o.destination : {};
  const url = typeof d.url === "string" ? d.url : "";
  let destination: V3CatalogEntry["destination"];
  const checkedAt = isIsoDate(d.checked_at) ? String(d.checked_at).slice(0, 10) : "unknown";
  const verification = d.verification === "failed" ? "failed" : d.verification === "owner_confirmed" || d.verification === "verified" ? "verified" : "pending";
  if (d.kind === "cah-resource") {
    if (url !== cahResource(id)) return { drop: "destination-mismatch" };
    destination = { kind: "cah-resource", url, verification, checkedAt, note: `CAH resource page; CAH link status ${String(d.verification ?? "unknown")}.` };
  } else if (d.kind === "owner-approved-external") {
    if (!V3_OWNER_LINKS.has(url)) return { drop: "external-link-not-approved" };
    destination = { kind: "owner-provided", url, verification, checkedAt, note: `Owner-approved external link; CAH link status ${String(d.verification ?? "unknown")}.` };
  } else return { drop: "no-destination" };

  const f = isObj(o.fits) ? o.fits : {};
  const fp = strs(f.paths), fg = strs(f.gaps), fr = strs(f.roles);
  if (!fp || !fg || !fr) return { drop: "invalid-fits" };
  const paths = fp.filter((x): x is PathId => (PATH_IDS as readonly string[]).includes(x));
  const gaps = fg.filter((x): x is GapId => (GAP_IDS as readonly string[]).includes(x));
  const roles = fr.filter((x): x is FocusRole => (ROLE_IDS as readonly string[]).includes(x));
  if (roles.length === 0 || (paths.length === 0 && gaps.length === 0)) return { drop: "no-fit" };

  const pre = strs(o.prerequisites);
  if (!pre) return { drop: "invalid-prerequisites" };
  const req = mapPrerequisites(pre);
  if (!req) return { drop: "unknown-prerequisite" };

  const aliases = strs(o.owned_aliases) ?? [];
  const ownedVia = Array.from(new Set([...(OWNED_BY_CATALOG.get(id) ?? []), ...aliases.filter((x) => OWNED_IDS.has(x))]));
  const includedIn = Array.from(new Set((strs(o.included_in) ?? []).flatMap((b) => OWNED_BY_CATALOG.get(b) ?? [])));
  const uncertainties = (strs(o.uncertainties) ?? []).slice(0, 20).map((x) => clean(x).slice(0, 80));

  const entry: V3CatalogEntry = {
    id,
    name: title,
    summary,
    kind: allow.kind,
    status: "active",
    statusSource: "cah-feed",
    scopeSource: "cah-feed",
    shortlist: true,
    price: mapPrice(o.price),
    destination,
    matchable: true,
    fits: { paths, gaps, roles },
    ...(Object.keys(req.requires).length ? { requires: req.requires } : {}),
    ...(req.note ? { requirementNote: req.note } : {}),
    ownedVia,
    ...(includedIn.length ? { includedIn } : {}),
    ...(o.affiliate === true ? { affiliate: true as const } : {}),
    reviewedAt: typeof o.reviewed_at === "string" ? o.reviewed_at.slice(0, 40) : undefined,
    uncertainties,
  };
  const rec = v3Recommendability(entry);
  if (!rec.ok) return { drop: rec.reason };
  return { entry, order: allow.order };
}

/** Validates a parsed feed body. Never throws. */
export function adaptCahFeed(raw: unknown): V3CatalogSource {
  if (!isObj(raw) || raw.contract !== CAH_FEED_CONTRACT || !Array.isArray(raw.items) || !isIsoDate(raw.generated_at))
    return { status: "unavailable", reason: "invalid" };
  const items = raw.items as unknown[];
  if (items.length > MAX_ITEMS || (raw.count !== undefined && raw.count !== items.length)) return { status: "unavailable", reason: "invalid" };
  const seen = new Set<string>();
  const kept: { entry: V3CatalogEntry; order: number }[] = [];
  const dropped: V3FeedDrop[] = [];
  for (const it of items) {
    if (!isObj(it) || typeof it.id !== "string" || !ITEM_ID.test(it.id)) {
      dropped.push({ id: "(invalid)", reason: "invalid-id" });
      continue;
    }
    if (seen.has(it.id)) {
      dropped.push({ id: it.id, reason: "duplicate" });
      continue;
    }
    seen.add(it.id);
    const out = adaptItem(it);
    if ("drop" in out) dropped.push({ id: it.id, reason: out.drop });
    else kept.push(out);
  }
  kept.sort((a, b) => a.order - b.order);
  return { status: "live", contract: CAH_FEED_CONTRACT, generatedAt: String(raw.generated_at), entries: kept.map((k) => k.entry), dropped };
}

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; signal: AbortSignal; credentials?: "omit" }) => Promise<{
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}>;

/** Public GET with a hard timeout. Any failure => "unavailable" (never a stale list). */
export async function fetchCahFeed(fetchImpl: FetchLike, timeoutMs = CAH_FEED_TIMEOUT_MS): Promise<V3CatalogSource> {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, timeoutMs);
  try {
    const res = await Promise.race([
      fetchImpl(CAH_FEED_URL, { method: "GET", headers: { Accept: "application/json" }, signal: ctrl.signal, credentials: "omit" }),
      new Promise<never>((_, rej) => ctrl.signal.addEventListener("abort", () => rej(new Error("timeout")))),
    ]);
    if (!res.ok) return { status: "unavailable", reason: "http" };
    const len = Number(res.headers.get("content-length") ?? "0");
    if (len > CAH_FEED_MAX_BYTES) return { status: "unavailable", reason: "too-large" };
    const text = await Promise.race([
      res.text(),
      new Promise<never>((_, rej) => ctrl.signal.addEventListener("abort", () => rej(new Error("timeout")))),
    ]);
    if (text.length > CAH_FEED_MAX_BYTES) return { status: "unavailable", reason: "too-large" };
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return { status: "unavailable", reason: "invalid" };
    }
    return adaptCahFeed(body);
  } catch {
    return { status: "unavailable", reason: timedOut ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}
