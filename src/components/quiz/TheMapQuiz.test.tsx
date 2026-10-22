import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- mocks: no network, no real webhook, no real HQ events ---------------
const sendWebhook = vi.fn().mockResolvedValue(true);
const forwardToHQ = vi.fn();
const handoffSingle = vi.fn();

vi.mock("@/lib/webhook", () => ({ sendQuizResultsToWebhook: (p: unknown) => sendWebhook(p) }));
vi.mock("@/lib/hqTracking", () => ({ forwardToHQ: (e: unknown) => forwardToHQ(e) }));
vi.mock("@/integrations/supabase/client", () => {
  const thenable = { then: (cb: (r: { error: null }) => void) => { cb({ error: null }); return Promise.resolve(); } };
  return {
    supabase: {
      from: (table: string) => ({
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        insert: () =>
          table === "handoff_sessions"
            ? { select: () => ({ single: handoffSingle }) }
            : thenable,
      }),
      functions: { invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null }) },
    },
  };
});

class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;

import { TheMapQuiz } from "./TheMapQuiz";
import { ASSESSMENT_QUESTIONS } from "@/lib/assessment";

const PICKS: Record<string, string> = {
  q_stage: "Launched. Something is live, but sales are uneven or haven't started.",
  q_avenue: "Digital products or services",
  q_goal: "Make my sales more consistent",
  q_clarity: "I have an offer, but the message isn't landing",
  q_evidence: "Engagement, like comments, saves or followers",
  q_time: "8 to 15 hours",
  q_owned: "A product, book or offer that's already made",
  q_support: "Open to paid support if it clearly fits",
};

async function answerAll(user: ReturnType<typeof userEvent.setup>, picks = PICKS) {
  await user.click(await screen.findByRole("button", { name: /begin the map/i }));
  for (const q of ASSESSMENT_QUESTIONS) {
    await user.click(screen.getByRole("radio", { name: picks[q.id] }));
    await user.click(screen.getByRole("button", { name: /^(next|finish)$/i }));
  }
}

async function submitLead(user: ReturnType<typeof userEvent.setup>, consent: boolean) {
  await user.type(screen.getByPlaceholderText("Your first name"), "Jane");
  await user.type(screen.getByPlaceholderText("your@email.com"), "jane@example.com");
  if (consent) await user.click(screen.getByRole("checkbox"));
  await user.click(screen.getByRole("button", { name: /see my result/i }));
}

describe("The MAP flow", () => {
  beforeEach(() => {
    sendWebhook.mockClear();
    forwardToHQ.mockClear();
    handoffSingle.mockReset();
    sessionStorage.clear();
  });

  it("Next stays disabled until an answer is chosen", async () => {
    const user = userEvent.setup();
    render(<TheMapQuiz />);
    await user.click(await screen.findByRole("button", { name: /begin the map/i }));
    expect(screen.getByRole("button", { name: /^next$/i })).toBeDisabled();
  });

  it("lead form blocks empty details and Back returns to the last question with its answer kept", async () => {
    const user = userEvent.setup();
    render(<TheMapQuiz />);
    await answerAll(user);
    await user.click(screen.getByRole("button", { name: /see my result/i }));
    expect(screen.getByText("Your results await")).toBeInTheDocument();
    expect(sendWebhook).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /^back$/i }));
    expect(screen.getByRole("radio", { name: PICKS.q_support })).toHaveAttribute("aria-checked", "true");
  });

  it("without consent: shows result, plain Browse link with no personal data, no handoff", async () => {
    const user = userEvent.setup();
    render(<TheMapQuiz />);
    await answerAll(user);
    await submitLead(user, false);

    expect(await screen.findByTestId("priority-label")).toHaveTextContent("Turning interest into sales");
    const browse = screen.getByRole("link", { name: /browse the creator access hub/i });
    expect(browse).toHaveAttribute("href", "https://creatoraccesshub.diamonddigitaldiva.com");
    expect(screen.queryByRole("button", { name: /continue to the creator access hub/i })).toBeNull();
    expect(handoffSingle).not.toHaveBeenCalled();

    // No retired offers, every link is a CAH page without query strings.
    for (const a of screen.getAllByRole("link")) {
      const href = a.getAttribute("href") ?? "";
      if (href.startsWith("http")) {
        expect(href).not.toContain("?");
        expect(href).not.toMatch(/\/(foc|dwa|ata|mpv|tacm|create-launch-sell|story-algorithm)\b/);
      }
    }
    expect(screen.queryByText(/check your inbox/i)).toBeNull();

    // Legacy webhook fields kept, v2 data versioned, never a product as the "stage".
    expect(sendWebhook).toHaveBeenCalledTimes(1);
    const payload = sendWebhook.mock.calls[0][0];
    expect(payload).toMatchObject({
      firstName: "Jane",
      email: "jane@example.com",
      primaryStage: "Turning interest into sales",
      secondaryStage: null,
      secondaryStageUrl: null,
      assessmentVersion: "map-v2.0",
    });
    expect(payload.primaryStageUrl).toBe("https://creatoraccesshub.diamonddigitaldiva.com/creator-paths/digital-income");
    expect(payload.answers.q_stage).toBe("stage_launched");

    // HQ event carries no personal data.
    const hq = forwardToHQ.mock.calls.find(([e]) => e.type === "quiz_completed")![0];
    expect(JSON.stringify(hq)).not.toContain("jane");
  });

  it("with consent: hands off via an opaque session and confirms it", async () => {
    handoffSingle.mockResolvedValue({ data: { id: "abc-123" }, error: null });
    const fakeWin = { opener: {}, closed: false, location: { href: "" } };
    const open = vi.spyOn(window, "open").mockReturnValue(fakeWin as unknown as Window);

    const user = userEvent.setup();
    render(<TheMapQuiz />);
    await answerAll(user);
    await submitLead(user, true);

    await user.click(await screen.findByRole("button", { name: /continue to the creator access hub with my results/i }));
    await waitFor(() =>
      expect(fakeWin.location.href).toBe("https://creatoraccesshub.diamonddigitaldiva.com/?session=abc-123")
    );
    expect(fakeWin.opener).toBeNull();
    expect(await screen.findByText(/with your results attached/i)).toBeInTheDocument();
    open.mockRestore();
  });

  it("with consent but session failure: says results were not attached", async () => {
    handoffSingle.mockResolvedValue({ data: null, error: { message: "nope" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fakeWin = { opener: {}, closed: false, location: { href: "" } };
    const open = vi.spyOn(window, "open").mockReturnValue(fakeWin as unknown as Window);

    const user = userEvent.setup();
    render(<TheMapQuiz />);
    await answerAll(user);
    await submitLead(user, true);
    await user.click(await screen.findByRole("button", { name: /continue to the creator access hub/i }));

    expect(await screen.findByText(/couldn't attach your results/i)).toBeInTheDocument();
    expect(fakeWin.location.href).toBe("https://creatoraccesshub.diamonddigitaldiva.com");
    open.mockRestore();
  });

  it("free-only choice shows no resources", async () => {
    const user = userEvent.setup();
    render(<TheMapQuiz />);
    await answerAll(user, { ...PICKS, q_support: "Only free options or what I already own" });
    await submitLead(user, false);
    expect(await screen.findByTestId("resources-note")).toHaveTextContent(/free or already-owned/);
    const section = screen.getByRole("heading", { name: /optional resources/i }).closest("section")!;
    expect(within(section).queryAllByRole("link")).toHaveLength(0);
  });
});
