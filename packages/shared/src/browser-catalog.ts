import { ContainerImageProfile, KASM_PROFILE } from "./container-profile";

export interface BrowserCatalogEntry {
  defaultImage: string;
  profile: ContainerImageProfile;
}

export const BROWSER_CATALOG = {
  chromium: { defaultImage: "kasmweb/chromium:1.18.0", profile: KASM_PROFILE },
  chrome: { defaultImage: "kasmweb/chrome:1.18.0", profile: KASM_PROFILE },
  firefox: { defaultImage: "kasmweb/firefox:1.18.0", profile: KASM_PROFILE },
  edge: { defaultImage: "kasmweb/edge:1.18.0", profile: KASM_PROFILE },
  brave: { defaultImage: "kasmweb/brave:1.18.0", profile: KASM_PROFILE },
  vivaldi: { defaultImage: "kasmweb/vivaldi:1.18.0", profile: KASM_PROFILE },
  tor: { defaultImage: "kasmweb/tor-browser:1.18.0", profile: KASM_PROFILE }
} as const satisfies Record<string, BrowserCatalogEntry>;

export type BrowserKind = keyof typeof BROWSER_CATALOG;

export const BROWSER_KINDS = [
  "chromium",
  "chrome",
  "firefox",
  "edge",
  "brave",
  "vivaldi",
  "tor"
] as const satisfies readonly BrowserKind[];

export const isBrowserKind = (value: unknown): value is BrowserKind =>
  typeof value === "string" && value in BROWSER_CATALOG;

export const toBrowserKind = (value: unknown, fallback: BrowserKind): BrowserKind =>
  isBrowserKind(value) ? value : fallback;

export const defaultBrowserImage = (browser: BrowserKind): string =>
  BROWSER_CATALOG[browser].defaultImage;

export const browserProfile = (browser: BrowserKind): ContainerImageProfile =>
  BROWSER_CATALOG[browser].profile;
