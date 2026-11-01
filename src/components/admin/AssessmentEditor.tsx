import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { MAX_OVERRIDE_LENGTH, overrideKey } from "@/lib/assessment";
import {
  MAP_V3_VERSION as ASSESSMENT_VERSION,
  V3_QUESTIONS,
  V3_CATALOG,
  V3_CATALOG_LAST_REVIEWED,
  v3Recommendability,
} from "@/lib/assessment/v3";
import { helperKey } from "@/lib/assessment/v3Overrides";

const REASON_LABELS: Record<string, string> = {
  "status-not-active": "Not confirmed active (or pending)",
  "scope-not-established": "Scope not established",
  "no-destination": "No routable link",
  "destination-retired": "Link is retired",
  "link-failed": "Link failed verification",
  "external-link-not-approved": "External link not owner-approved",
  "not-on-shortlist": "Not on owner's paid shortlist",
};

/**
 * Admin wording editor for the live versioned assessment. Admins can change
 * how a question or option reads; IDs, order and scoring are fixed in code,
 * so edits can't change anyone's result.
 */
export function AssessmentEditor() {
  const { toast } = useToast();
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("assessment_text_overrides")
        .select("item_key, text")
        .eq("assessment_version", ASSESSMENT_VERSION);
      if (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to load wording overrides." });
      } else {
        const m: Record<string, string> = {};
        (data ?? []).forEach((r) => (m[r.item_key] = r.text));
        setSaved(m);
        setDrafts(m);
      }
      setIsLoading(false);
    })();
  }, [toast]);

  const save = async (key: string) => {
    const text = (drafts[key] ?? "").trim();
    if (!text || text.length > MAX_OVERRIDE_LENGTH) {
      toast({ variant: "destructive", title: "Not saved", description: `Wording must be 1 to ${MAX_OVERRIDE_LENGTH} characters.` });
      return;
    }
    setBusyKey(key);
    const { error } = await supabase
      .from("assessment_text_overrides")
      .upsert({ assessment_version: ASSESSMENT_VERSION, item_key: key, text }, { onConflict: "assessment_version,item_key" });
    setBusyKey(null);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save wording." });
      return;
    }
    setSaved((s) => ({ ...s, [key]: text }));
    toast({ title: "Saved", description: "Wording updated. Scoring is unchanged." });
  };

  const reset = async (key: string) => {
    setBusyKey(key);
    const { error } = await supabase
      .from("assessment_text_overrides")
      .delete()
      .eq("assessment_version", ASSESSMENT_VERSION)
      .eq("item_key", key);
    setBusyKey(null);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to reset wording." });
      return;
    }
    setSaved((s) => { const n = { ...s }; delete n[key]; return n; });
    setDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
  };

  // Plain render function (not a component) so inputs keep focus while typing.
  const renderRow = (itemKey: string, fallback: string) => {
    const value = drafts[itemKey] ?? "";
    const isOverridden = saved[itemKey] !== undefined;
    const dirty = value.trim() !== (saved[itemKey] ?? "");
    return (
      <div key={itemKey} className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <code>{itemKey}</code>
          {isOverridden && <Badge variant="secondary">Edited</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Input
            aria-label={`Wording for ${itemKey}`}
            placeholder={fallback}
            value={value}
            maxLength={MAX_OVERRIDE_LENGTH}
            onChange={(e) => setDrafts((d) => ({ ...d, [itemKey]: e.target.value }))}
          />
          <Button size="sm" onClick={() => save(itemKey)} disabled={!dirty || !value.trim() || busyKey === itemKey}>
            {busyKey === itemKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="sr-only">Save</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => reset(itemKey)} disabled={!isOverridden || busyKey === itemKey}>
            <RotateCcw className="w-4 h-4" />
            <span className="sr-only">Reset to default</span>
          </Button>
        </div>
        {!value && <p className="text-xs text-muted-foreground">Default: {fallback}</p>}
      </div>
    );
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading assessment...</div>;

  return (
    <div className="space-y-6">
      <div className="quiz-card space-y-2">
        <h2 className="font-heading text-lg">Live assessment: {ASSESSMENT_VERSION}</h2>
        <p className="text-sm text-muted-foreground">
          You can change wording here. Question IDs, answer IDs, order and scoring are fixed for this version
          so edits never change anyone's result. Changing meaning needs a new version. Leave a field empty to use the default.
        </p>
      </div>

      {V3_QUESTIONS.map((q, i) => (
        <div key={q.id} className="quiz-card space-y-4">
          <h3 className="font-heading text-base">
            Question {i + 1} <span className="text-xs text-muted-foreground">({q.kind}{q.showIf ? ", conditional" : ""}{q.required ? "" : ", optional"})</span>
          </h3>
          {renderRow(overrideKey(q.id), q.text)}
          {q.helper && renderRow(helperKey(q.id), q.helper)}
          {q.rows && (
            <div className="space-y-3 pl-4 border-l border-border">
              <Label className="text-xs uppercase tracking-wide">Rows</Label>
              {q.rows.map((r) => renderRow(overrideKey(q.id, r.id), r.label))}
            </div>
          )}
          {q.options.length > 0 && (
            <div className="space-y-3 pl-4 border-l border-border">
              <Label className="text-xs uppercase tracking-wide">Answers</Label>
              {q.options
                .filter((o) => !(q.kind === "owned" && o.id.startsWith("res_")))
                .map((o) => renderRow(overrideKey(q.id, o.id), o.label))}
              {q.kind === "owned" && (
                <p className="text-xs text-muted-foreground">
                  The resource list uses catalog names and isn't editable here. Selecting one only records ownership.
                </p>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="quiz-card space-y-3">
        <h2 className="font-heading text-lg">Creator Access Hub catalog</h2>
        <p className="text-sm text-muted-foreground">
          Last reviewed {V3_CATALOG_LAST_REVIEWED}. Curated by hand from Hub resource pages and owner confirmations. Automatic sync with the
          Hub catalog is not implemented, so update the catalog file when Hub offers change.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 pr-3">Product</th>
                <th className="py-1 pr-3">Product status</th>
                <th className="py-1 pr-3">Price / needs</th>
                <th className="py-1 pr-3">Link</th>
                <th className="py-1 pr-3">Recommended</th>
              </tr>
            </thead>
            <tbody>
              {V3_CATALOG.map((e) => {
                const r = v3Recommendability(e);
                return (
                  <tr key={e.id} className="border-t border-border align-top">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{e.name}</div>
                      <code className="text-xs text-muted-foreground">{e.id}</code>
                      {e.summary && <div className="text-xs text-muted-foreground">{e.summary}</div>}
                      {e.scopeNote && <div className="text-xs text-amber-700">{e.scopeNote}</div>}
                    </td>
                    <td className="py-2 pr-3">
                      {e.status.replace(/_/g, " ")}
                      <div className="text-xs text-muted-foreground">{e.statusSource.replace(/-/g, " ")}</div>
                      <div className="text-xs text-muted-foreground">{e.shortlist ? "On paid shortlist" : "Not on paid shortlist"}</div>
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {e.price.state === "free-owner-stated" ? "Free (owner-stated)" : e.price.state === "verified" ? `$${e.price.usd}` : "Price not verified"}
                      {e.requirementNote && <div className="text-muted-foreground max-w-xs">{e.requirementNote}</div>}
                    </td>
                    <td className="py-2 pr-3 max-w-xs">
                      {e.destination ? (
                        <>
                          <a href={e.destination.url} target="_blank" rel="noopener noreferrer" className="underline break-all text-xs">
                            {e.destination.kind === "cah-resource" ? "CAH resource page" : "Owner-provided link"}
                          </a>
                          <div className="text-xs">Verification: {e.destination.verification} ({e.destination.checkedAt})</div>
                          <div className="text-xs text-muted-foreground">{e.destination.note}</div>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                      {(e.retiredUrls ?? []).map((u) => (
                        <div key={u} className="text-xs text-muted-foreground line-through break-all">{u}</div>
                      ))}
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {r.ok ? "When answers match" : `No: ${REASON_LABELS[r.reason]}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          An archived Hub listing is not treated as proof a product is discontinued. Product status and link status are tracked separately.
        </p>
      </div>
    </div>
  );
}
