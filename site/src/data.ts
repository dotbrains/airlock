// All site copy in one place. The landing page (App.tsx) and the docs page
// (Docs.tsx) read from here; the theme is index.css. Adapted to Airlock —
// local, disposable browser isolation backed by Kasm containers on Docker.

export const REPO = 'https://github.com/dotbrains/airlock'

// ---------------------------------------------------------------------------
// Browsers
// ---------------------------------------------------------------------------

export type Browser = { name: string; label: string; image: string }

// The seven Kasm browser kinds Airlock can launch, with their default image
// tags (the AIRLOCK_IMAGE_* defaults from docs/configuration.md).
export const BROWSERS: Browser[] = [
  { name: 'chromium', label: 'Chromium', image: 'kasmweb/chromium:1.18.0' },
  { name: 'chrome', label: 'Chrome', image: 'kasmweb/chrome:1.18.0' },
  { name: 'firefox', label: 'Firefox', image: 'kasmweb/firefox:1.18.0' },
  { name: 'edge', label: 'Edge', image: 'kasmweb/edge:1.18.0' },
  { name: 'brave', label: 'Brave', image: 'kasmweb/brave:1.18.0' },
  { name: 'vivaldi', label: 'Vivaldi', image: 'kasmweb/vivaldi:1.18.0' },
  { name: 'tor', label: 'Tor Browser', image: 'kasmweb/tor-browser:1.18.0' },
]

export const BROWSER_IMAGE: Record<string, string> = Object.fromEntries(
  BROWSERS.map((b) => [b.name, b.image]),
)

// Monogram badges for the icon set (distinct 2-letter mark + brand-ish color).
export type Badge = { code: string; color: string }
export const BROWSER_BADGE: Record<string, Badge> = {
  chromium: { code: 'Cm', color: '#6aa6f8' },
  chrome: { code: 'Ch', color: '#4285f4' },
  firefox: { code: 'Fx', color: '#ff7139' },
  edge: { code: 'Ed', color: '#36c5f0' },
  brave: { code: 'Br', color: '#fb542b' },
  vivaldi: { code: 'Vi', color: '#ef3939' },
  tor: { code: 'To', color: '#a974e0' },
}

// ---------------------------------------------------------------------------
// Trace surfaces
// ---------------------------------------------------------------------------

export type TraceRow = { surface: string; normally: string; airlock: string }

export const TRACE: TraceRow[] = [
  {
    surface: 'Browsing artifacts (history, cache, cookies)',
    normally: 'written to your everyday browser profile',
    airlock: 'live in a throwaway container — gone on exit',
  },
  {
    surface: 'The page’s code execution',
    normally: 'runs in your main browser, on your network',
    airlock: 'runs inside an isolated Kasm container',
  },
  {
    surface: 'Downloads & file writes',
    normally: 'land in ~/Downloads on your host',
    airlock: 'stay in the container — no host path is mounted',
  },
  {
    surface: 'Logged-in sessions & tokens',
    normally: 'linger long after you close the tab',
    airlock: 'no persistence volumes — the filesystem dies with it',
  },
  {
    surface: 'Cross-tab / cross-session reach',
    normally: 'shares state with every other tab you have open',
    airlock: 'dedicated bridge, ICC disabled — sessions can’t see each other',
  },
  {
    surface: 'Cleanup',
    normally: 'you forget to clear it',
    airlock: 'a TTL + cleanup worker reap it automatically',
  },
]

// ---------------------------------------------------------------------------
// Two ways in
// ---------------------------------------------------------------------------

export type Entry = {
  id: string
  name: string
  tagline: string
  points: string[]
}

export const ENTRIES: Entry[] = [
  {
    id: 'dashboard',
    name: 'dashboard',
    tagline: 'A local cloud-browser console — launch, watch, embed, terminate.',
    points: [
      'launch form: enter a URL, pick a browser, set a lifetime',
      'active sessions poll live with a countdown to expiry',
      'embed the VNC stream in-page, or open it in a new tab',
      'extend (+15m), copy a share link, or terminate on the spot',
    ],
  },
  {
    id: 'extension',
    name: 'extension',
    tagline: 'Right-click any link → “Open in Airlock”. No dashboard needed.',
    points: [
      'Chrome / Brave / Edge and Firefox, one shared source',
      'adds a single context-menu item to every link',
      'opens a fresh, disposable session in a new tab',
      'point it at any API base URL from the options page',
    ],
  },
]

// ---------------------------------------------------------------------------
// Grants
// ---------------------------------------------------------------------------

export const GRANTS = {
  allowed: [
    'Load the target URL in a real, throwaway browser',
    'Stream the live session to your screen over VNC',
    'Clipboard sync and file up/download via the Kasm control bar',
    'Reach the internet — optionally routed through an egress proxy',
  ],
  denied: [
    'Touching your host filesystem — no volumes are mounted',
    'Persisting anything past the TTL — no state survives exit',
    'Reaching other sessions on the host (ICC disabled)',
    'Gaining host privileges (no-new-privileges; capped cpu/mem/pids)',
  ],
}

// ---------------------------------------------------------------------------
// Configure to taste
// ---------------------------------------------------------------------------

export type ConfigItem = {
  title: string
  tag: string
  body: string
  code: string
}

export const CONFIG: ConfigItem[] = [
  {
    title: 'Session lifetime',
    tag: 'AIRLOCK_DEFAULT_TTL_SECONDS · ttlSeconds',
    body: 'Set a default lifetime, or pass one per session (60s–24h). The cleanup worker reaps the container the moment it expires.',
    code: 'AIRLOCK_DEFAULT_TTL_SECONDS=1800\n\n# or per request\ncurl -X POST :8787/api/sessions \\\n  -d \'{"targetUrl":"https://x.dev","ttlSeconds":900}\'',
  },
  {
    title: 'Resource caps',
    tag: 'memory · cpus · pids · shm',
    body: 'Bound a single runaway session’s blast radius on the host. Each cap is uncapped when set to 0.',
    code: 'AIRLOCK_SESSION_MEMORY_BYTES=2147483648  # 2 GiB\nAIRLOCK_SESSION_CPUS=2\nAIRLOCK_SESSION_PIDS_LIMIT=512\nAIRLOCK_SHM_SIZE_BYTES=1073741824        # 1 GiB',
  },
  {
    title: 'Network isolation & egress',
    tag: 'AIRLOCK_NETWORK_ISOLATION · AIRLOCK_EGRESS_PROXY',
    body: 'Sessions attach to a dedicated ICC-off bridge by default. Route all egress through an HTTP(S) proxy when you need attribution control.',
    code: 'AIRLOCK_NETWORK_ISOLATION=true\nAIRLOCK_NETWORK_NAME=airlock\nAIRLOCK_EGRESS_PROXY=http://proxy.local:3128',
  },
]

// ---------------------------------------------------------------------------
// Install / run
// ---------------------------------------------------------------------------

export type Install = { id: string; label: string; code: string; note: string }

export const INSTALL: Install[] = [
  {
    id: 'source',
    label: 'From source (Bun)',
    code: 'git clone https://github.com/dotbrains/airlock.git\ncd airlock\nbun install\ncp .env.sample .env',
    note: 'Needs Bun 1.1+ and a running Docker engine.',
  },
  {
    id: 'compose',
    label: 'Docker Compose',
    code: 'docker compose up',
    note: 'API + dashboard + worker on :8787 from one shared image.',
  },
]

export const USAGE = `# local dev runs as three processes, each in its own terminal
bun run dev:api    # session API on :8787
bun run dev:worker # cleanup worker — reaps expired sessions
bun run dev:web    # dashboard on :5173 (proxies /api and /s → :8787)

# then open http://localhost:5173 and launch a session`

// A transparency terminal: create a session over the API and watch it
// self-destruct. Mirrors what the runtime actually does.
export const PROOF = `$ curl -sX POST localhost:8787/api/sessions \\
    -d '{"targetUrl":"https://sketchy.example","browser":"chromium","ttlSeconds":1800}'
{ "sessionId": "a1b2c3…", "browserUrl": "https://localhost:32792",
  "sessionUrl": "http://localhost:8787/s/a1b2c3…", "expiresAt": "…+30m" }

airlock: chromium session — AutoRemove · no persistence volumes · ICC-isolated bridge

# open the short link — a 302 to the live VNC stream
$ open http://localhost:8787/s/a1b2c3…                          # ✓ streaming
✓ caps: memory 2 GiB · cpus 2 · pids 512 · no-new-privileges
✓ host filesystem: not mounted
…you browse the link, fully sandboxed…

# TTL elapses → the worker prunes the container
✓ session expired → container removed → nothing persists`

// ---------------------------------------------------------------------------
// Deploy
// ---------------------------------------------------------------------------

export type Provider = { name: string; engine: string; when: string }

export const PROVIDERS: Provider[] = [
  { name: 'Docker Compose', engine: 'Host socket', when: 'The simplest local / self-hosted run.' },
  { name: 'Generic VM', engine: 'Host socket', when: 'You own a Linux host (systemd units).' },
  { name: 'Kubernetes', engine: 'Remote', when: 'You already run a cluster.' },
  { name: 'Fly.io', engine: 'Remote', when: 'You want a managed control-plane host.' },
  { name: 'Render', engine: 'Remote', when: 'You want a managed control-plane host.' },
  { name: 'Railway', engine: 'Remote', when: 'You want a managed control-plane host.' },
]

// TTL presets for the session builder (label → seconds).
export const TTL_PRESETS: { label: string; seconds: number }[] = [
  { label: '5 minutes', seconds: 300 },
  { label: '15 minutes', seconds: 900 },
  { label: '30 minutes', seconds: 1800 },
  { label: '1 hour', seconds: 3600 },
  { label: '6 hours', seconds: 21600 },
  { label: '24 hours', seconds: 86400 },
]
