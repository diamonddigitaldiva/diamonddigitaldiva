import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { CAH_FEED_URL, V3_MAP_ALLOWLIST, V3_MAP_BLOCKED, type V3CatalogSource } from "@/lib/assessment/v3";
import { loadV3Catalog, resetV3CatalogCache } from "@/lib/assessment/cahCatalog";

const DROP_LABELS: Record<string, string> = {
  "not-on-map-allowlist": "Not on The MAP's reviewed list (new products are never added automatically)",
  "not-cah-preferred": "Not marked MAP-preferred in the Hub",
  "sold-out": "Sold out",
  "not-available": "Not active and available",
  "scope-not-established": "No scope summary",
  "promise-language": "Summary contains a result promise",
  "destination-mismatch": "Hub link doesn't match the product",
  "external-link-not-approved": "External link not owner-approved",
  "no-destination": "No routable link",
  "destination-retired": "Link is retired",
  "link-failed": "Link failed verification",
  "invalid-fits": "Fit data invalid",
  "no-fit": "No recognised fit",
  "unknown-prerequisite": "Unknown prerequisite (excluded to be safe)",
  "invalid-prerequisites": "Prerequisites invalid",
  duplicate: "Duplicate entry",
};
const dropLabel = (r: string) => (r.startsWith("blocked:") ? `Blocked in The MAP (${r.slice(8).replace(/-/g, " ")})` : DROP_LABELS[r] ?? r);

/**
 * Read-only admin view of the live Creator Access Hub feed and what The MAP
 * does with each item. Nothing here edits the Hub.
 */
export function CatalogFeedPanel() {
  const [feed, setFeed] = useState<V3CatalogSource | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (fresh = false) => {
    setLoading(true);
    if (fresh) resetV3CatalogCache();
    setFeed(await loadV3Catalog());
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, []);

  const live = feed?.status === "live" ? feed : null;
  const inFeed = new Set([...(live?.entries ?? []).map((e) => e.id), ...(live?.dropped ?? []).map((d) => d.id)]);
  const notInFeed = V3_MAP_ALLOWLIST.filter((a) => !inFeed.has(a.id));

  return (
    <div className="quiz-card space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg">Creator Access Hub catalog (live feed)</h2>
        <Button type="button" variant="outline" size="sm" onClick={() => void load(true)} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span className="ml-1">Refresh</span>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Suggestions come only from the Hub's public feed, read when someone finishes The MAP and again on the server. Products are
        managed in the Hub. If the feed can't be read, results show no paid suggestions and a link to browse the Hub.
      </p>
      <p className="text-xs text-muted-foreground break-all">Source: {CAH_FEED_URL}</p>

      {loading && !feed ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !live ? (
        <p className="text-sm text-destructive">
          The feed is unavailable right now ({feed?.status === "unavailable" ? feed.reason : "unknown"}). Results currently show no paid
          suggestions.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Generated {live.generatedAt}. {live.entries.length} usable, {live.dropped.length} left out.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-3">Product</th>
                  <th className="py-1 pr-3">Price / needs</th>
                  <th className="py-1 pr-3">Link</th>
                  <th className="py-1 pr-3">In The MAP</th>
                </tr>
              </thead>
              <tbody>
                {live.entries.map((e) => (
                  <tr key={e.id} className="border-t border-border align-top">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{e.name}</div>
                      <code className="text-xs text-muted-foreground">{e.id}</code>
                      <div className="text-xs text-muted-foreground">{e.summary}</div>
                      {e.uncertainties && e.uncertainties.length > 0 && (
                        <div className="text-xs text-muted-foreground">Open questions: {e.uncertainties.join(", ").replace(/_/g, " ")}</div>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {e.price.state === "free-owner-stated" ? "Free (owner-stated)" : e.price.state === "verified" ? `$${e.price.usd}` : "Price not verified"}
                      {e.requirementNote && <div className="text-muted-foreground max-w-xs">{e.requirementNote}</div>}
                    </td>
                    <td className="py-2 pr-3 max-w-xs text-xs">
                      <a href={e.destination!.url} target="_blank" rel="noopener noreferrer" className="underline break-all">
                        {e.destination!.kind === "cah-resource" ? "Hub resource page" : "Owner-approved link"}
                      </a>
                      {e.affiliate && <div className="text-muted-foreground">Affiliate</div>}
                    </td>
                    <td className="py-2 pr-3 text-xs">When answers match</td>
                  </tr>
                ))}
                {live.dropped.map((d, i) => (
                  <tr key={`${d.id}-${i}`} className="border-t border-border align-top text-muted-foreground">
                    <td className="py-2 pr-3">
                      <code className="text-xs">{d.id}</code>
                    </td>
                    <td className="py-2 pr-3" />
                    <td className="py-2 pr-3" />
                    <td className="py-2 pr-3 text-xs">No: {dropLabel(d.reason)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {notInFeed.length > 0 && (
            <p className="text-xs text-muted-foreground">
              On The MAP's list but not in the feed right now (not suggested): {notInFeed.map((a) => a.id).join(", ")}.
            </p>
          )}
        </>
      )}
      <p className="text-xs text-muted-foreground">
        Always left out by The MAP: {Object.entries(V3_MAP_BLOCKED).map(([id, why]) => `${id} (${why.replace(/-/g, " ")})`).join(", ")}.
      </p>
    </div>
  );
}
