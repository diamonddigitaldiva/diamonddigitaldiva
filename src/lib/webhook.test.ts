import { describe, it, expect, vi, beforeEach } from "vitest";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }));

import { sendQuizResultsToWebhook, type QuizResultPayload } from "@/lib/webhook";

const payload: QuizResultPayload = {
  firstName: "Test",
  email: "test@example.invalid",
  primaryStage: "x",
  secondaryStage: null,
  primaryStageUrl: "https://creatoraccesshub.diamonddigitaldiva.com",
  secondaryStageUrl: null,
  timestamp: "2026-01-01T00:00:00.000Z",
  source: "https://preview.example",
};

describe("sendQuizResultsToWebhook outcome", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it("delivered and saved", async () => {
    invoke.mockResolvedValue({ data: { success: true, saved: true, delivered: true, queued: false }, error: null });
    expect(await sendQuizResultsToWebhook(payload)).toEqual({ saved: true, delivered: true, queued: false, keptPrivate: false });
  });

  it("saved but queued (202 with success false) is not reported as delivered", async () => {
    invoke.mockResolvedValue({ data: { success: false, saved: true, delivered: false, queued: true }, error: null });
    expect(await sendQuizResultsToWebhook(payload)).toEqual({ saved: true, delivered: false, queued: true, keptPrivate: false });
  });

  it("non-2xx error reads the body and never claims saved unless it says so", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { context: { json: () => Promise.resolve({ success: false, saved: false, delivered: false }) } },
    });
    expect(await sendQuizResultsToWebhook(payload)).toEqual({ saved: false, delivered: false, queued: false, keptPrivate: false });
  });

  it("network failure is a failed save", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    invoke.mockImplementation(() => {
      throw new TypeError("Failed to fetch");
    });
    expect(await sendQuizResultsToWebhook(payload)).toEqual({ saved: false, delivered: false, queued: false, keptPrivate: false });
  });

  it("saved without marketing consent is reported as kept private, not as a delay", async () => {
    invoke.mockResolvedValue({
      data: { success: false, saved: true, delivered: false, queued: false, forwarded: false, reason: "no_marketing_consent" },
      error: null,
    });
    expect(await sendQuizResultsToWebhook(payload)).toEqual({ saved: true, delivered: false, queued: false, keptPrivate: true });
  });
});
