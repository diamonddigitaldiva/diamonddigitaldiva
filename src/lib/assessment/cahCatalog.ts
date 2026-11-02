import { CATALOG_NOT_LOADED, fetchCahFeed, type V3CatalogSource } from "@/lib/assessment/v3";

/**
 * Browser read of the public Creator Access Hub feed. Plain GET, no
 * credentials or keys. One successful read is reused for 5 minutes; a failed
 * read is never cached and never replaced by an older list, so results show
 * no paid suggestions rather than possibly stale purchase links.
 */
const TTL_MS = 5 * 60_000;
let cache: { at: number; value: V3CatalogSource } | null = null;
let inflight: Promise<V3CatalogSource> | null = null;

export function loadV3Catalog(now = Date.now()): Promise<V3CatalogSource> {
  if (cache && now - cache.at < TTL_MS) return Promise.resolve(cache.value);
  if (inflight) return inflight;
  inflight = fetchCahFeed((url, init) => fetch(url, init) as never)
    .then((value) => {
      if (value.status === "live") cache = { at: Date.now(), value };
      return value;
    })
    .catch(() => ({ status: "unavailable", reason: "network" }) as V3CatalogSource)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Test hook. */
export function resetV3CatalogCache() {
  cache = null;
  inflight = null;
}

export { CATALOG_NOT_LOADED };
