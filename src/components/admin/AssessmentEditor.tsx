import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCcw, Save } from "lucide-react";
import {
  ASSESSMENT_QUESTIONS,
  ASSESSMENT_VERSION,
  CATALOG,
  CATALOG_LAST_REVIEWED,
  MAX_OVERRIDE_LENGTH,
  REASON_LABELS,
  overrideKey,
  recommendability,
} from "@/lib/assessment";

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

      {ASSESSMENT_QUESTIONS.map((q, i) => (
        <div key={q.id} className="quiz-card space-y-4">
          <h3 className="font-heading text-base">Question {i + 1}</h3>
          {renderRow(overrideKey(q.id), q.text)}
          <div className="space-y-3 pl-4 border-l border-border">
            <Label className="text-xs uppercase tracking-wide">Answers</Label>
            {q.options.map((o) => renderRow(overrideKey(q.id, o.id), o.label))}
          </div>
        </div>
      ))}

      <div className="quiz-card space-y-3">
        <h2 className="font-heading text-lg">Creator Access Hub catalog</h2>
        <p className="text-sm text-muted-foreground">
          Last reviewed {CATALOG_LAST_REVIEWED}. Curated by hand from Hub resource pages and owner confirmations. Automatic sync with the
          Hub catalog is not implemented, so update the catalog file when Hub offers change.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 pr-3">Product</th>
                <th className="py-1 pr-3">Product status</th>
                <th className="py-1 pr-3">CAH listing</th>
                <th className="py-1 pr-3">Link</th>
                <th className="py-1 pr-3">Recommended</th>
              </tr>
            </thead>
            <tbody>
              {CATALOG.map((e) => {
                const r = recommendability(e);
                return (
                  <tr key={e.id} className="border-t border-border align-top">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{e.name}</div>
                      <code className="text-xs text-muted-foreground">{e.id}</code>
                      {e.summary && <div className="text-xs text-muted-foreground">{e.summary}</div>}
                      {e.scopeNote && <div className="text-xs text-amber-700">{e.scopeNote}</div>}
                    </td>
                    <td className="py-2 pr-3">
                      {e.product.status.replace(/_/g, " ")}
                      <div className="text-xs text-muted-foreground">{e.product.source.replace(/-/g, " ")}</div>
                      {e.product.note && <div className="text-xs text-muted-foreground max-w-xs">{e.product.note}</div>}
                    </td>
                    <td className="py-2 pr-3">{e.cahListing.replace(/-/g, " ")}</td>
                    <td className="py-2 pr-3 max-w-xs">
                      {e.destination ? (
                        <>
                          <a href={e.destination.url} target="_blank" rel="noopener noreferrer" className="underline break-all text-xs">
                            {e.destination.kind === "cah-resource" ? "CAH resource page" : "Owner-provided link"}
                          </a>
                          <div className="text-xs">Verification: {e.destination.verification.state} ({e.destination.verification.checkedAt})</div>
                          <div className="text-xs text-muted-foreground">{e.destination.verification.note}</div>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                      {(e.retiredDestinations ?? []).map((d) => (
                        <div key={d.url} className="text-xs text-muted-foreground line-through break-all">{d.url}</div>
                      ))}
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {r.ok ? (e.eligibilityNote ?? "When matched") : `No: ${REASON_LABELS[r.reason]}`}
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
