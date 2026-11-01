import { describe, it, expect, beforeEach } from "vitest";
import { DRAFT_KEY, loadDraft, saveDraft } from "@/lib/assessment/draft";

describe("draft persistence", () => {
  beforeEach(() => localStorage.clear());

  it("saves structured selections but never free text", () => {
    saveDraft(
      {
        m3_where: "where_new",
        m3_interests: ["int_social"],
        m3_platforms: ["plat_other"],
        m3_platforms_other: "My private group, call 555-0100",
        m3_owned: ["res_cfw"],
        m3_owned_other: "jane@example.com course",
        m3_notes: "I'm Jane, my number is 555-0100",
      },
      "m3_notes",
      "quiz"
    );
    const raw = localStorage.getItem(DRAFT_KEY)!;
    expect(raw).not.toMatch(/555|jane|private/i);
    const d = JSON.parse(raw);
    expect(d.answers.m3_notes).toBeUndefined();
    expect(d.answers.m3_owned_other).toBeUndefined();
    expect(d.answers.m3_platforms_other).toBeUndefined();
    expect(d.answers.m3_platforms).toEqual(["plat_other"]);
    expect(d.answers.m3_owned).toEqual(["res_cfw"]);
  });

  it("drops free text from older drafts on load", () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ version: "map-v3.0", savedAt: Date.now(), screen: "quiz", currentId: "m3_help", answers: { m3_where: "where_new", m3_notes: "secret" } })
    );
    expect(loadDraft()!.answers).toEqual({ m3_where: "where_new" });
  });
});
