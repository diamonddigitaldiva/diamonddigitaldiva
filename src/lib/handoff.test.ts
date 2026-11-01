import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
const from = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...a: unknown[]) => rpc(...a), from: (...a: unknown[]) => from(...a) },
}));

import { createCreatorAccessHubHandoff, CREATOR_ACCESS_HUB_URL } from "@/lib/handoff";

const ID = "11111111-1111-1111-1111-111111111111";
const payload = {
  firstName: "Jane",
  email: "jane@example.com",
  primaryStage: "publishing",
  secondaryStage: null,
  assessmentVersion: "map-v3.0",
};

describe("Creator Access Hub handoff", () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("creates the session through the RPC and never reads handoff_sessions directly", async () => {
    rpc.mockResolvedValue({ data: ID, error: null });
    await createCreatorAccessHubHandoff(payload);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0]).toBe("create_handoff_session");
    expect(rpc.mock.calls[0][1]).toMatchObject({ _first_name: "Jane", _email: "jane@example.com", _primary_stage: "publishing" });
    expect(rpc.mock.calls[0][1]._secondary_stage).toBeUndefined();
    expect(from).not.toHaveBeenCalled();
  });

  it("returns an opaque session URL with no personal data when the session is created", async () => {
    rpc.mockResolvedValue({ data: ID, error: null });
    const r = await createCreatorAccessHubHandoff(payload);
    expect(r).toEqual({ url: `${CREATOR_ACCESS_HUB_URL}/?session=${ID}`, attached: true });
    expect(r.url).not.toMatch(/jane|example\.com/);
  });

  it("falls back to the plain Hub URL and reports not attached on error", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "denied" } });
    expect(await createCreatorAccessHubHandoff(payload)).toEqual({ url: CREATOR_ACCESS_HUB_URL, attached: false });
  });

  it("does not attach when the RPC returns something other than an id", async () => {
    rpc.mockResolvedValue({ data: { first_name: "Jane" }, error: null });
    expect(await createCreatorAccessHubHandoff(payload)).toEqual({ url: CREATOR_ACCESS_HUB_URL, attached: false });
  });

  it("falls back when the request throws", async () => {
    rpc.mockRejectedValue(new Error("network"));
    expect(await createCreatorAccessHubHandoff(payload)).toEqual({ url: CREATOR_ACCESS_HUB_URL, attached: false });
  });
});
