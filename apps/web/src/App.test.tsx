import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the client factory but keep the real AirlockApiError for instanceof.
vi.mock("./lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./lib/api")>();
  return { ...actual, createAirlockClient: vi.fn() };
});

import { App } from "./App";
import { AirlockApiError, AirlockClient, createAirlockClient } from "./lib/api";

const meta = {
  browsers: ["chromium", "firefox"],
  defaultBrowser: "chromium",
  defaultTtlSeconds: 1800,
  ttlMinSeconds: 60,
  ttlMaxSeconds: 86400
};

const makeClient = (overrides: Partial<AirlockClient> = {}): AirlockClient => ({
  getMeta: vi.fn().mockResolvedValue(meta),
  listSessions: vi.fn().mockResolvedValue([]),
  createSession: vi.fn(),
  extendSession: vi.fn(),
  stopSession: vi.fn(),
  pullImages: vi.fn().mockResolvedValue([]),
  ...overrides
});

const useClient = (client: AirlockClient): void => {
  vi.mocked(createAirlockClient).mockReturnValue(client);
};

beforeEach(() => {
  // jsdom in this config may not expose localStorage; token-storage tolerates
  // that, so the test just guards the cleanup.
  try {
    window.localStorage?.clear();
  } catch {
    // ignore
  }
  vi.mocked(createAirlockClient).mockReset();
});

describe("App", () => {
  it("shows the dashboard when the token is accepted", async () => {
    useClient(makeClient());
    render(<App />);
    expect(await screen.findByText("Launch a disposable browser")).toBeTruthy();
    expect(screen.getByText("Active sessions")).toBeTruthy();
  });

  it("shows the login screen on a 401", async () => {
    useClient(
      makeClient({
        getMeta: vi.fn().mockRejectedValue(new AirlockApiError("Unauthorized.", 401))
      })
    );
    render(<App />);
    expect(await screen.findByRole("button", { name: "Connect" })).toBeTruthy();
  });

  it("launches a session through the client", async () => {
    const createSession = vi.fn().mockResolvedValue({
      sessionId: "new-1",
      browser: "chromium",
      targetUrl: "https://example.com",
      browserUrl: "https://localhost:32792",
      sessionUrl: "http://localhost:8787/s/new-1",
      vncPassword: "pw",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 600_000).toISOString()
    });
    useClient(makeClient({ createSession }));
    render(<App />);

    fireEvent.change(await screen.findByLabelText("URL to open"), {
      target: { value: "https://example.com" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Launch session" }));

    await waitFor(() =>
      expect(createSession).toHaveBeenCalledWith(
        expect.objectContaining({ targetUrl: "https://example.com" })
      )
    );
  });

  it("pulls images from the warm action", async () => {
    const pullImages = vi.fn().mockResolvedValue([{ image: "kasmweb/chromium:1.18.0", ok: true }]);
    useClient(makeClient({ pullImages }));
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Pre-pull browser images" }));
    await waitFor(() => expect(pullImages).toHaveBeenCalled());
  });
});
