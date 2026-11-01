import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- mocks: no network, no real webhook, no real HQ events ---------------
const SAVED = { saved: true, delivered: true, queued: false };
const sendWebhook = vi.fn().mockResolvedValue(SAVED);
const forwardToHQ = vi.fn();
const handoffRpc = vi.fn();
const fromTables: string[] = [];

vi.mock("@/lib/webhook", () => ({ sendQuizResultsToWebhook: (p: unknown) => sendWebhook(p) }));
vi.mock("@/lib/hqTracking", () => ({ forwardToHQ: (e: unknown) => forwardToHQ(e) }));
vi.mock("@/integrations/supabase/client", () => {
  const thenable = { then: (cb: (r: { error: null }) => void) => { cb({ error: null }); return Promise.resolve(); } };
  return {
    supabase: {
      from: (table: string) => {
        fromTables.push(table);
        return {
          select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
          insert: () => thenable,
        };
      },
      rpc: (...a: unknown[]) => handoffRpc(...a),
      functions: { invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null }) },
    },
  };
});

class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;

import { TheMapQuiz } from "./TheMapQuiz";
import { getV3Question, V3_OWNER_LINKS, V3_RETIRED_URLS } from "@/lib/assessment/v3";
import { DRAFT_KEY } from "@/lib/assessment/draft";

type User = ReturnType<typeof userEvent.setup>;
const L = (qid: string, oid: string) => getV3Question(qid)!.options.find((o) => o.id === oid)!.label;
const next = (user: User) => user.click(screen.getByRole("button", { name: /^(next|finish|skip)$/i }));
const radio = (user: User, qid: string, oid: string) => user.click(screen.getByRole("radio", { name: L(qid, oid) }));
const check = (user: User, qid: string, oid: string) => user.click(screen.getByRole("checkbox", { name: L(qid, oid) }));

async function comfort(user: User, value = "Open to learning") {
  for (const row of getV3Question("m3_comfort")!.rows!) {
    await user.click(within(screen.getByRole("radiogroup", { name: row.label })).getByRole("radio", { name: value }));
  }
}

async function begin(user: User) {
  await user.click(await screen.findByRole("button", { name: /begin the map/i }));
}

/** A learner who hasn't started: 11 questions. */
async function answerBeginner(user: User, budget = "budget_100") {
  await radio(user, "m3_where", "where_learning"); await next(user);
  await check(user, "m3_help", "help_realistic"); await next(user);
  await check(user, "m3_interests", "int_publishing"); await next(user);
  await check(user, "m3_bring", "bring_skill"); await next(user);
  await comfort(user); await next(user);
  await radio(user, "m3_time", "time3_3_5"); await next(user);
  await radio(user, "m3_device", "dev_windows"); await next(user);
  await next(user); // owned (optional) -> Skip
  await radio(user, "m3_budget", budget); await next(user);
  await check(user, "m3_support", "sup_video"); await next(user);
  await next(user); // notes (optional) -> Finish
}

async function submitLead(user: User, consent: boolean) {
  await user.type(screen.getByPlaceholderText("Your first name"), "Jane");
  await user.type(screen.getByPlaceholderText("your@email.com"), "jane@example.com");
  if (consent) await user.click(screen.getByRole("checkbox"));
  await user.click(screen.getByRole("button", { name: /see my result/i }));
}

describe("The MAP v3 flow", () => {
  beforeEach(() => {
    sendWebhook.mockReset();
    sendWebhook.mockResolvedValue(SAVED);
    forwardToHQ.mockClear();
    handoffRpc.mockReset();
    fromTables.length = 0;
    sessionStorage.clear();
    localStorage.clear();
  });

  it("Next stays disabled until an answer is chosen", async () => {
    const user = userEvent.setup();
    render(<TheMapQuiz />);
    await begin(user);
    expect(screen.getByRole("button", { name: /^next$/i })).toBeDisabled();
  });

  it("a learner skips the existing-creator questions; result, browse link and payload are safe", async () => {
    const user = userEvent.setup();
    render(<TheMapQuiz />);
    await begin(user);
    expect(screen.getByText("Question 1 of 11")).toBeInTheDocument();
    await answerBeginner(user);
    expect(screen.queryByText(getV3Question("m3_obstacle")!.text)).toBeNull();
    await submitLead(user, false);

    expect(await screen.findByTestId("primary-label")).toHaveTextContent("Books, coloring books and printables");
    expect(screen.getByTestId("next-step").textContent!.length).toBeGreaterThan(40);
    const browse = screen.getByRole("link", { name: /browse the creator access hub/i });
    expect(browse).toHaveAttribute("href", "https://creatoraccesshub.diamonddigitaldiva.com");
    expect(handoffRpc).not.toHaveBeenCalled();

    for (const a of screen.getAllByRole("link")) {
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("http")) continue;
      expect(V3_RETIRED_URLS.has(href)).toBe(false);
      expect(href).not.toMatch(/jane|example\.com|%40|@/i);
      if (!href.startsWith("https://creatoraccesshub.diamonddigitaldiva.com")) expect(V3_OWNER_LINKS.has(href)).toBe(true);
      else expect(href).not.toContain("?");
    }

    expect(sendWebhook).toHaveBeenCalledTimes(1);
    const payload = sendWebhook.mock.calls[0][0];
    expect(payload).toMatchObject({
      firstName: "Jane",
      email: "jane@example.com",
      primaryStage: "Books, coloring books and printables",
      secondaryStageUrl: null,
      assessmentVersion: "map-v3.0",
    });
    expect(typeof payload.primaryStageUrl).toBe("string");
    expect(payload.answers.m3_interests).toEqual(["int_publishing"]);
    expect(payload.answers.m3_obstacle).toBeUndefined();
    expect(JSON.stringify(payload.result)).not.toMatch(/jane/i);

    const hq = forwardToHQ.mock.calls.find(([e]) => e.type === "quiz_completed")![0];
    expect(hq).toMatchObject({ primary_stage: "publishing", assessment_version: "map-v3.0" });
    expect(JSON.stringify(hq)).not.toContain("jane");
    expect(payload).not.toHaveProperty("marketingConsent");
    expect(Object.keys(payload).some((k) => /marketing|consent|optin|subscribe/i.test(k))).toBe(false);
    expect(await screen.findByText("Your result has been saved.")).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem(DRAFT_KEY)).toBeNull());
  });

  it("an existing creator sees the extra questions; going back and changing stage removes them", async () => {
    const user = userEvent.setup();
    render(<TheMapQuiz />);
    await begin(user);
    await radio(user, "m3_where", "where_inconsistent"); await next(user);
    await check(user, "m3_help", "help_improve"); await next(user);
    await check(user, "m3_interests", "int_publishing"); await next(user);
    await check(user, "m3_bring", "bring_skill"); await next(user);
    expect(screen.getByText(getV3Question("m3_working_on")!.text)).toBeInTheDocument();
    expect(screen.getByText("Question 5 of 14")).toBeInTheDocument();
    await check(user, "m3_working_on", "work_books");

    for (let i = 0; i < 4; i++) await user.click(screen.getByRole("button", { name: /^back$/i }));
    await radio(user, "m3_where", "where_new");
    for (let i = 0; i < 4; i++) await next(user);
    expect(screen.getByText(getV3Question("m3_comfort")!.text)).toBeInTheDocument();
    expect(screen.getByText("Question 5 of 11")).toBeInTheDocument();
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY)!);
    expect(draft.answers.m3_working_on).toBeUndefined();
  });

  it("support allows at most two choices and says so", async () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ version: "map-v3.0", savedAt: Date.now(), screen: "quiz", currentId: "m3_support", answers: { m3_where: "where_new" } })
    );
    const user = userEvent.setup();
    render(<TheMapQuiz />);
    await screen.findByText(getV3Question("m3_support")!.text);
    await check(user, "m3_support", "sup_guide");
    await check(user, "m3_support", "sup_video");
    await check(user, "m3_support", "sup_live");
    expect(screen.getByRole("checkbox", { name: L("m3_support", "sup_live") })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(/choose up to two/i, { selector: "p[aria-live]" })).toBeInTheDocument();
    await check(user, "m3_support", "sup_unsure");
    expect(screen.getByRole("checkbox", { name: L("m3_support", "sup_guide") })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("checkbox", { name: L("m3_support", "sup_unsure") })).toHaveAttribute("aria-checked", "true");
  });

  it("restores progress after a refresh without storing name or email", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<TheMapQuiz />);
    await begin(user);
    await radio(user, "m3_where", "where_learning"); await next(user);
    await check(user, "m3_help", "help_realistic");
    unmount();
    render(<TheMapQuiz />);
    expect(await screen.findByText(/restored your choices/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: L("m3_help", "help_realistic") })).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem(DRAFT_KEY)).not.toMatch(/@|firstName|email/);
  });

  it("with consent: hands off via an opaque session", async () => {
    handoffRpc.mockResolvedValue({ data: "11111111-2222-3333-4444-555555555555", error: null });
    const fakeWin = { opener: {}, closed: false, location: { href: "" } };
    const open = vi.spyOn(window, "open").mockReturnValue(fakeWin as unknown as Window);
    const user = userEvent.setup();
    render(<TheMapQuiz />);
    await begin(user);
    await answerBeginner(user);
    await submitLead(user, true);
    await user.click(await screen.findByRole("button", { name: /continue to the creator access hub with my results/i }));
    await waitFor(() => expect(fakeWin.location.href).toBe("https://creatoraccesshub.diamonddigitaldiva.com/?session=11111111-2222-3333-4444-555555555555"));
    expect(fakeWin.opener).toBeNull();
    expect(handoffRpc.mock.calls[0][0]).toBe("create_handoff_session");
    expect(fromTables).not.toContain("handoff_sessions");
    expect(await screen.findByText(/with your results attached/i)).toBeInTheDocument();
    open.mockRestore();
  });

  it("with consent but session failure: says results were not attached", async () => {
    handoffRpc.mockResolvedValue({ data: null, error: { message: "nope" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fakeWin = { opener: {}, closed: false, location: { href: "" } };
    const open = vi.spyOn(window, "open").mockReturnValue(fakeWin as unknown as Window);
    const user = userEvent.setup();
    render(<TheMapQuiz />);
    await begin(user);
    await answerBeginner(user);
    await submitLead(user, true);
    await user.click(await screen.findByRole("button", { name: /continue to the creator access hub/i }));
    expect(await screen.findByText(/couldn't attach your results/i)).toBeInTheDocument();
    expect(fakeWin.location.href).toBe("https://creatoraccesshub.diamonddigitaldiva.com");
    open.mockRestore();
  });

  it("free-only shows no paid resources", async () => {
    const user = userEvent.setup();
    render(<TheMapQuiz />);
    await begin(user);
    await answerBeginner(user, "budget_free");
    await submitLead(user, false);
    expect(await screen.findByTestId("resources-note")).toHaveTextContent(/free resources and what you already own/);
    const section = screen.getByRole("heading", { name: /optional resources/i }).closest("section")!;
    for (const a of within(section).queryAllByRole("link")) expect(a).toHaveTextContent(/Free community/);
  });

  it("lead form uses service-only wording with no marketing-enrollment claim", async () => {
    const user = userEvent.setup();
    render(<TheMapQuiz />);
    await begin(user);
    await answerBeginner(user);
    expect(screen.getByText(/we use your details to save your map result/i)).toBeInTheDocument();
    expect(screen.queryByText(/marketing/i)).toBeNull();
  });

  it("shows a saving status while the submission is pending", async () => {
    sendWebhook.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<TheMapQuiz />);
    await begin(user);
    await answerBeginner(user);
    await submitLead(user, false);
    expect(await screen.findByTestId("primary-label")).toBeInTheDocument();
    expect(screen.getByTestId("save-status")).toHaveTextContent(/saving your result/i);
    expect(screen.getByTestId("save-status")).not.toHaveTextContent(/saved\.|email/i);
  });

  it("failed save: keeps the result and draft, warns, and only resends on an explicit retry", async () => {
    sendWebhook.mockResolvedValue({ saved: false, delivered: false, queued: false });
    const user = userEvent.setup();
    render(<TheMapQuiz />);
    await begin(user);
    await answerBeginner(user);
    await submitLead(user, false);
    expect(await screen.findByText(/couldn't save your result/i)).toBeInTheDocument();
    expect(screen.getByTestId("primary-label")).toBeInTheDocument();
    expect(screen.queryByText(/has been saved/i)).toBeNull();
    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();
    await new Promise((r) => setTimeout(r, 50));
    expect(sendWebhook).toHaveBeenCalledTimes(1); // no automatic resend

    sendWebhook.mockResolvedValueOnce(SAVED);
    await user.click(screen.getByRole("button", { name: /try saving again/i }));
    expect(await screen.findByText("Your result has been saved.")).toBeInTheDocument();
    expect(sendWebhook).toHaveBeenCalledTimes(2);
    expect(sendWebhook.mock.calls[1][0]).toEqual(sendWebhook.mock.calls[0][0]);
    expect(screen.queryByRole("button", { name: /try saving again/i })).toBeNull();
    await waitFor(() => expect(localStorage.getItem(DRAFT_KEY)).toBeNull());
  });

  it("retry is limited and ignores presses while a retry is in flight", async () => {
    sendWebhook.mockResolvedValue({ saved: false, delivered: false, queued: false });
    const user = userEvent.setup();
    render(<TheMapQuiz />);
    await begin(user);
    await answerBeginner(user);
    await submitLead(user, false);
    for (let i = 0; i < 3; i++) {
      await user.click(await screen.findByRole("button", { name: /try saving again/i }));
      await screen.findByText(/couldn't save your result/i);
    }
    expect(sendWebhook).toHaveBeenCalledTimes(4);
    expect(screen.queryByRole("button", { name: /try saving again/i })).toBeNull();
    expect(screen.getByText(/save or screenshot this page/i)).toBeInTheDocument();
  });

  it("saved but not yet delivered says so, without a retry button", async () => {
    sendWebhook.mockResolvedValue({ saved: true, delivered: false, queued: true });
    const user = userEvent.setup();
    render(<TheMapQuiz />);
    await begin(user);
    await answerBeginner(user);
    await submitLead(user, false);
    expect(await screen.findByText(/saved\. passing it on to our team is delayed/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /try saving again/i })).toBeNull();
  });
});
