import { describe, it, expect, vi, beforeEach } from "vitest";

const single = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ insert: () => ({ select: () => ({ single }) }) }),
  },
}));

import { createCreatorAccessHubHandoff, CREATOR_ACCESS_HUB_URL } from "@/lib/handoff";

const payload = {
  firstName: "Jane",
  email: "jane@example.com",
  primaryStage: "validation",
  assessmentVersion: "map-v2.0",
};

describe("Creator Access Hub handoff", () => {
  beforeEach(() => {
    single.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns an opaque session URL with no personal data when the session is created", async () => {
    single.mockResolvedValue({ data: { id: "11111111-1111-1111-1111-111111111111" }, error: null });
    const r = await createCreatorAccessHubHandoff(payload);
    expect(r.attached).toBe(true);
    expect(r.url).toBe(`${CREATOR_ACCESS_HUB_URL}/?session=11111111-1111-1111-1111-111111111111`);
    expect(r.url).not.toContain("jane");
    expect(r.url).not.toContain("example.com");
  });

  it("falls back to the plain Hub URL and reports not attached on error", async () => {
    single.mockResolvedValue({ data: null, error: { message: "denied" } });
    const r = await createCreatorAccessHubHandoff(payload);
    expect(r).toEqual({ url: CREATOR_ACCESS_HUB_URL, attached: false });
  });

  it("falls back when the request throws", async () => {
    single.mockRejectedValue(new Error("network"));
    const r = await createCreatorAccessHubHandoff(payload);
    expect(r).toEqual({ url: CREATOR_ACCESS_HUB_URL, attached: false });
  });
});
