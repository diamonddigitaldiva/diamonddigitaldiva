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
  CATALOG_EXCLUSIONS,
  CATALOG_LAST_REVIEWED,
  MAX_OVERRIDE_LENGTH,
  overrideKey,
  resourceUrl,
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

  const Row = ({ itemKey, fallback }: { itemKey: string; fallback: string }) => {
    const value = drafts[itemKey] ?? "";
    const isOverridden = saved[itemKey] !== undefined;
    const dirty = value.trim() !== (saved[itemKey] ?? "");
    return (
      <div className="space-y-1">
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
          <Row itemKey={overrideKey(q.id)} fallback={q.text} />
          <div className="space-y-3 pl-4 border-l border-border">
            <Label className="text-xs uppercase tracking-wide">Answers</Label>
            {q.options.map((o) => (
              <Row key={o.id} itemKey={overrideKey(q.id, o.id)} fallback={o.label} />
            ))}
          </div>
        </div>
      ))}

      <div className="quiz-card space-y-3">
        <h2 className="font-heading text-lg">Creator Access Hub catalog</h2>
        <p className="text-sm text-muted-foreground">
          Last reviewed {CATALOG_LAST_REVIEWED}. Curated by hand from Hub resource pages. Automatic sync with the
          Hub catalog is not implemented, so update the catalog file when Hub offers change.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 pr-3">Resource</th>
                <th className="py-1 pr-3">Kind</th>
                <th className="py-1 pr-3">Recommended</th>
              </tr>
            </thead>
            <tbody>
              {CATALOG.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="py-1 pr-3">
                    <a href={resourceUrl(e.id)} target="_blank" rel="noopener noreferrer" className="underline">{e.name}</a>
                    <div className="text-xs text-muted-foreground">{e.summary}</div>
                  </td>
                  <td className="py-1 pr-3">{e.kind}</td>
                  <td className="py-1 pr-3">{e.matchable ? (e.eligibilityNote ?? "When matched") : "No (scope not established)"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="font-heading text-base pt-2">Never recommended</h3>
        <ul className="text-sm space-y-1">
          {CATALOG_EXCLUSIONS.map((x) => (
            <li key={x.id}>
              <code>{x.id}</code> {x.name}: <span className="text-muted-foreground">{x.reason.replace(/-/g, " ")}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
