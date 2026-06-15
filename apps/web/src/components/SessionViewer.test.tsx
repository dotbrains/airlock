import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionResponse } from "../lib/api";
import { SessionViewer } from "./SessionViewer";

const session: SessionResponse = {
  sessionId: "s-1",
  browser: "firefox",
  targetUrl: "https://example.com",
  browserUrl: "https://localhost:32792",
  sessionUrl: "http://localhost:8787/s/s-1",
  vncPassword: "hunter2",
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 600_000).toISOString()
};

describe("SessionViewer", () => {
  it("embeds the stream and surfaces the per-session password", () => {
    render(<SessionViewer session={session} onClose={() => undefined} />);

    const frame = screen.getByTitle("Airlock session s-1") as HTMLIFrameElement;
    expect(frame.getAttribute("src")).toBe("https://localhost:32792");
    expect(screen.getByText("hunter2")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open in new tab/ }).getAttribute("href")).toBe(
      "https://localhost:32792"
    );
  });

  it("calls onClose from the Back button", () => {
    const onClose = vi.fn();
    render(<SessionViewer session={session} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(onClose).toHaveBeenCalled();
  });

  it("remounts the iframe when Reload stream is clicked", () => {
    render(<SessionViewer session={session} onClose={() => undefined} />);
    const before = screen.getByTitle("Airlock session s-1");
    fireEvent.click(screen.getByRole("button", { name: /Reload stream/ }));
    const after = screen.getByTitle("Airlock session s-1");
    // A remount produces a new element instance for the same title.
    expect(before).not.toBe(after);
  });
});
