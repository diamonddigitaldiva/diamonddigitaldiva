import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));

import { createCreatorAccessHubHandoff, CREATOR_ACCESS_HUB_URL } from "@/lib/handoff";
import { CREATOR_PATH_BY_PATH, DISCOVER_LABEL, GAP_LABELS, PATH_LABELS } from "@/lib/assessment/v3";
// Verbatim copy of CAH's receiver rules (src/lib/map/handoffV3.ts).
import { handoffSessionIdFrom, mapFocusFor, normalizeHandoff, stripHandoffParams } from "@/lib/__fixtures__/cahHandoffV3.snapshot";

// Synthetic, in-memory data only: no real session, lead, email, CRM or HQ call.
const ID = "3f6c2a1e-9b7d-4c1a-8e2f-5a6b7c8d9e0f";

describe("MAP → CAH v3 handoff contract", () => {
  beforeEach(() => {
    rpc.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("every focus The MAP can hand off is accepted by CAH with the same label and creator path", () => {
    const all: [string, string][] = [
      ...Object.entries(PATH_LABELS),
      ...Object.entries(GAP_LABELS),
      ["discover", DISCOVER_LABEL],
    ];
    expect(all).toHaveLength(21);
    for (const [id, label] of all) {
      const f = mapFocusFor(id);
      expect(f, id).not.toBeNull();
      expect(f!.label).toBe(label);
      const mine = CREATOR_PATH_BY_PATH[id as keyof typeof CREATOR_PATH_BY_PATH]?.slug;
      expect(f!.creatorPath, id).toBe(mine);
    }
  });

  it("with consent: the session is created via the RPC and the URL carries only the opaque ID, which CAH reads", async () => {
    rpc.mockResolvedValue({ data: ID, error: null });
    const { url, attached } = await createCreatorAccessHubHandoff({
      firstName: "Test",
      email: "synthetic@example.invalid",
      primaryStage: "message",
      primaryStageName: GAP_LABELS.message,
      secondaryStage: "publishing",
      assessmentVersion: "map-v3.0",
    });
    expect(attached).toBe(true);
    const u = new URL(url);
    expect(u.origin).toBe(CREATOR_ACCESS_HUB_URL);
    expect([...u.searchParams.keys()]).toEqual(["session"]);
    expect(url).not.toMatch(/synthetic|example|Test/);
    expect(handoffSessionIdFrom(u.search)).toBe(ID);
    expect(stripHandoffParams(url)).toBe("/");
  });

  it("CAH keeps only focus IDs from the session row; names and emails are dropped", () => {
    const row = { id: ID, first_name: "Test", email: "synthetic@example.invalid", primary_stage: "message", secondary_stage: "publishing", primary_stage_url: "https://x.test" };
    const out = normalizeHandoff(row);
    expect(out.primary?.id).toBe("message");
    expect(out.secondary?.id).toBe("publishing");
    expect(JSON.stringify(out)).not.toMatch(/synthetic|Test|x\.test/);
  });

  it("invalid or missing sessions show nothing: bad IDs are ignored, an expired session (no row) gives no focus", () => {
    expect(handoffSessionIdFrom("?session=not-a-uuid")).toBeNull();
    expect(handoffSessionIdFrom("?email=a@b.co")).toBeNull();
    expect(handoffSessionIdFrom("")).toBeNull();
    // get_handoff_session returns no row once expires_at has passed.
    expect(normalizeHandoff(null)).toEqual({ primary: null, secondary: null });
    // Old v1/v2 stage or product codes are never mapped to anything.
    expect(normalizeHandoff({ primary_stage: "stage_launched" }).primary).toBeNull();
    expect(normalizeHandoff({ primary_stage: "dwa" }).primary).toBeNull();
  });

  it("without consent there is no session: the plain Hub link has no query at all", async () => {
    // ResultScreen offers CREATOR_ACCESS_HUB_URL directly when sharing isn't allowed.
    expect(new URL(CREATOR_ACCESS_HUB_URL).search).toBe("");
    rpc.mockResolvedValue({ data: null, error: { message: "denied" } });
    const r = await createCreatorAccessHubHandoff({ firstName: "Test", email: "synthetic@example.invalid", primaryStage: "message" });
    expect(r).toEqual({ url: CREATOR_ACCESS_HUB_URL, attached: false });
  });
});
