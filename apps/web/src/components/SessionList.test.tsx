import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionResponse } from "../lib/api";
import { SessionList } from "./SessionList";

const session = (overrides: Partial<SessionResponse> = {}): SessionResponse => ({
  sessionId: "s-1",
  browser: "chromium",
  targetUrl: "https://example.com",
  browserUrl: "https://localhost:32792",
  sessionUrl: "http://localhost:8787/s/s-1",
  vncPassword: "pw",
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
  ...overrides
});

const noop = () => undefined;

describe("SessionList", () => {
  it("shows the empty state with no sessions", () => {
    render(
      <SessionList
        sessions={[]}
        terminatingId={null}
        extendingId={null}
        onOpen={noop}
        onExtend={noop}
        onTerminate={noop}
      />
    );
    expect(screen.getByText(/No active sessions/i)).toBeTruthy();
  });

  it("fires open, extend, and terminate handlers with the session id", () => {
    const onOpen = vi.fn();
    const onExtend = vi.fn();
    const onTerminate = vi.fn();
    render(
      <SessionList
        sessions={[session()]}
        terminatingId={null}
        extendingId={null}
        onOpen={onOpen}
        onExtend={onExtend}
        onTerminate={onTerminate}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(screen.getByRole("button", { name: "+15m" }));
    fireEvent.click(screen.getByRole("button", { name: "Terminate" }));

    expect(onOpen).toHaveBeenCalledWith("s-1");
    expect(onExtend).toHaveBeenCalledWith("s-1", 900);
    expect(onTerminate).toHaveBeenCalledWith("s-1");
  });

  it("reflects in-progress states on the buttons", () => {
    render(
      <SessionList
        sessions={[session()]}
        terminatingId="s-1"
        extendingId="s-1"
        onOpen={noop}
        onExtend={noop}
        onTerminate={noop}
      />
    );
    expect((screen.getByRole("button", { name: "Ending…" }) as HTMLButtonElement).disabled).toBe(
      true
    );
    expect((screen.getByRole("button", { name: "Extending…" }) as HTMLButtonElement).disabled).toBe(
      true
    );
  });

  it("copies the share link to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(
      <SessionList
        sessions={[session()]}
        terminatingId={null}
        extendingId={null}
        onOpen={noop}
        onExtend={noop}
        onTerminate={noop}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith("http://localhost:8787/s/s-1");
    // Await the async re-render to "Copied" so the state update is wrapped; the
    // pending reset timer is cleared on unmount.
    await screen.findByRole("button", { name: "Copied" });
  });
});
