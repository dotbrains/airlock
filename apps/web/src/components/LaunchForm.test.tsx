import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AirlockMeta } from "../lib/api";
import { LaunchForm } from "./LaunchForm";

const meta: AirlockMeta = {
  browsers: ["chromium", "firefox", "tor"],
  defaultBrowser: "chromium",
  defaultTtlSeconds: 1800,
  ttlMinSeconds: 60,
  ttlMaxSeconds: 86400
};

describe("LaunchForm", () => {
  it("submits the entered URL, browser, and TTL in seconds", () => {
    const onLaunch = vi.fn();
    render(<LaunchForm meta={meta} launching={false} error={null} onLaunch={onLaunch} />);

    fireEvent.change(screen.getByLabelText("URL to open"), {
      target: { value: "https://example.com" }
    });
    fireEvent.change(screen.getByLabelText("Browser"), { target: { value: "firefox" } });
    fireEvent.change(screen.getByLabelText("Lifetime (minutes)"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Launch session" }));

    expect(onLaunch).toHaveBeenCalledWith({
      targetUrl: "https://example.com",
      browser: "firefox",
      ttlSeconds: 600
    });
  });

  it("disables the submit button while launching", () => {
    render(<LaunchForm meta={meta} launching error={null} onLaunch={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Launching…" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
