import { BrowserIcon } from './BrowserIcon'
import { Code } from './Code'
import { BROWSERS, ENTRIES, INSTALL, REPO, USAGE } from './data'

const NAV = [
  { id: 'overview', label: 'Overview' },
  { id: 'install', label: 'Install' },
  { id: 'quickstart', label: 'Quickstart' },
  { id: 'entries', label: 'Two ways in' },
  { id: 'api', label: 'API reference' },
  { id: 'browsers', label: 'Browsers' },
  { id: 'configuration', label: 'Configuration' },
  { id: 'security', label: 'Security' },
  { id: 'deployment', label: 'Deployment' },
  { id: 'reference', label: 'Full reference' },
]

const ENDPOINTS: [string, string, string][] = [
  ['GET', '/healthz · /health', 'Liveness probe (no auth).'],
  ['GET', '/readyz', 'Readiness probe — pings the Docker engine (no auth).'],
  ['GET', '/metrics', 'Prometheus metrics (bearer auth).'],
  ['GET', '/api/meta', 'Browser catalog + TTL bounds for the dashboard.'],
  ['POST', '/api/sessions', 'Create a disposable browser session.'],
  ['GET', '/api/sessions', 'List active sessions, newest first.'],
  ['GET', '/api/sessions/:id', 'Session details (410 if expired).'],
  ['PATCH', '/api/sessions/:id', 'Extend a session’s TTL (best-effort, single-node).'],
  ['DELETE', '/api/sessions/:id', 'Stop and remove a session.'],
  ['POST', '/api/images/pull', 'Pre-pull all configured browser images.'],
  ['POST', '/api/internal/prune', 'Prune expired sessions (internal token).'],
  ['GET', '/s/:id', 'Public capability link → 302 to the stream (no auth).'],
]

const BODY_FIELDS: [string, string][] = [
  ['targetUrl', 'Required. Must start with http:// or https://.'],
  ['browser', 'Optional (default chromium). One of the seven browser kinds.'],
  ['ttlSeconds', 'Optional (default 1800). Clamped to 60–86400.'],
]

const ENV_API: [string, string, string][] = [
  ['AIRLOCK_PORT', '8787', 'API server port.'],
  ['AIRLOCK_API_TOKEN', '(none)', 'Bearer token gating the dashboard + management API. Unset = unauthenticated.'],
  ['AIRLOCK_PUBLIC_BASE_URL', 'http://localhost:8787', 'Public base URL for session links.'],
  ['AIRLOCK_SESSION_HOST', 'localhost', 'Host used in redirect URLs to containers.'],
  ['AIRLOCK_DEFAULT_TTL_SECONDS', '1800', 'Default session lifetime (clamped 60–86400).'],
  ['AIRLOCK_DEFAULT_BROWSER', 'chromium', 'Default browser kind.'],
  ['AIRLOCK_MAX_SESSIONS', '25', 'Concurrent-session cap (0 = unlimited).'],
  ['AIRLOCK_NETWORK_ISOLATION', 'true', 'Attach sessions to a dedicated ICC-off bridge.'],
  ['AIRLOCK_EGRESS_PROXY', '(none)', 'Route session egress through an HTTP(S) proxy.'],
  ['AIRLOCK_BIND_HOST', '0.0.0.0', 'Listener interface; 127.0.0.1 for loopback only.'],
  ['AIRLOCK_DOCKER_HOST', '(none)', 'Remote engine (tcp://…); overrides the local socket.'],
]

const ENV_WORKER: [string, string, string][] = [
  ['AIRLOCK_API_BASE_URL', 'http://localhost:8787', 'API base URL the worker calls for prune.'],
  ['AIRLOCK_CLEANUP_INTERVAL_MS', '30000', 'Interval between prune calls (min 5000).'],
  ['AIRLOCK_INTERNAL_TOKEN', '(none)', 'Must match the API’s token to call prune.'],
]

const REPO_DOCS: [string, string][] = [
  ['quickstart.md', 'First disposable session in minutes.'],
  ['installation.md', 'Prerequisites and the developer checkout.'],
  ['configuration.md', 'The full environment-variable surface.'],
  ['architecture.md', 'System overview, session lifecycle, module map.'],
  ['api.md', 'Every endpoint, request/response shape, and error code.'],
  ['web.md', 'The dashboard SPA — launch, manage, view.'],
  ['extensions.md', 'Loading the Chrome and Firefox extensions.'],
  ['security.md', 'Trust boundaries and the operator controls.'],
  ['deployment.md', 'Provider adapters and the deployment contract.'],
  ['operations.md', 'Metrics, structured logs, and health probes.'],
  ['troubleshooting.md', 'Common local and runtime failures.'],
]

function DocsNav() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <a className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </span>
          airlock <span className="brand-sub">/ docs</span>
        </a>
        <nav className="nav-links">
          <a href="/">Home</a>
          <a href="#api">API</a>
          <a href="#browsers">Browsers</a>
          <a className="nav-cta" href={REPO} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        </nav>
      </div>
    </header>
  )
}

export default function Docs() {
  return (
    <>
      <DocsNav />
      <div className="container docs-layout">
        <aside className="docs-side">
          <nav>
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`}>
                {n.label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="doc">
          <section id="overview" className="doc-section">
            <h1>Airlock documentation</h1>
            <p>
              Airlock opens any link in a short-lived, containerized browser
              session — from a <strong>web dashboard</strong> or by{' '}
              <strong>right-clicking a link</strong>. It’s like a cloud-browser
              service, but it runs entirely on a machine you own: no cloud, no
              account, no data leaving the host.
            </p>
            <p>
              Each session is a disposable <strong>Kasm</strong> browser
              container on Docker, created with <code>AutoRemove</code> and no
              persistence volumes. A single Express API (<code>apps/api</code>)
              is the only component that talks to Docker; the dashboard
              (<code>apps/web</code>), the extension, and a cleanup worker
              (<code>apps/worker</code>) all reach it over HTTP. There is no
              database — session state lives in container labels.
            </p>
          </section>

          <section id="install" className="doc-section">
            <h2>Install</h2>
            {INSTALL.map((i) => (
              <div key={i.id} className="doc-install">
                <h3>{i.label}</h3>
                <Code>{i.code}</Code>
                <p className="muted">{i.note}</p>
              </div>
            ))}
          </section>

          <section id="quickstart" className="doc-section">
            <h2>Quickstart</h2>
            <p>
              You need a running Docker engine and Bun 1.1+. Install from the
              repo root, then run the three local processes — or the whole stack
              from one image with <code>docker compose up</code>.
            </p>
            <Code>{USAGE}</Code>
            <p>
              Open <code>http://localhost:5173</code>, enter your{' '}
              <code>AIRLOCK_API_TOKEN</code> if one is set (blank for local dev),
              then launch a session.
            </p>
          </section>

          <section id="entries" className="doc-section">
            <h2>Two ways in</h2>
            <p>
              Both the dashboard and the extension drive the same session API and
              hand back a link to a disposable browser.
            </p>
            <div className="doc-cards">
              {ENTRIES.map((e) => (
                <div className="card backend" key={e.id}>
                  <div className="card-tag">{e.name}</div>
                  <p className="card-tagline">{e.tagline}</p>
                  <ul className="ticks">
                    {e.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section id="api" className="doc-section">
            <h2>API reference</h2>
            <p>
              When <code>AIRLOCK_API_TOKEN</code> is set, the management API
              requires <code>Authorization: Bearer &lt;token&gt;</code>. Health
              probes and the <code>/s/:id</code> capability link are auth-exempt
              by design; <code>/api/internal/prune</code> uses a separate
              internal token.
            </p>
            <div className="doc-table-wrap">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Path</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {ENDPOINTS.map(([m, path, d]) => (
                    <tr key={m + path}>
                      <td>
                        <code>{m}</code>
                      </td>
                      <td>
                        <code>{path}</code>
                      </td>
                      <td>{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3>
              <code>POST /api/sessions</code> body
            </h3>
            <Code>
              {`{
  "targetUrl": "https://example.com",
  "browser": "chromium",
  "ttlSeconds": 1800
}`}
            </Code>
            <div className="doc-table-wrap">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {BODY_FIELDS.map(([f, d]) => (
                    <tr key={f}>
                      <td>
                        <code>{f}</code>
                      </td>
                      <td>{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted">
              The 201 response returns <code>sessionId</code>,{' '}
              <code>browserUrl</code>, a per-session <code>vncPassword</code>,{' '}
              <code>expiresAt</code>, and the public <code>sessionUrl</code>.
              Container internals never cross the public seam.
            </p>
          </section>

          <section id="browsers" className="doc-section">
            <h2>Browsers</h2>
            <p>
              Each browser kind maps to a Kasm container image, configurable via
              the <code>AIRLOCK_IMAGE_*</code> variables. Docker pulls on first
              launch; <code>POST /api/images/pull</code> warms them all.
            </p>
            <div className="doc-table-wrap">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Browser</th>
                    <th>Label</th>
                    <th>Default image</th>
                  </tr>
                </thead>
                <tbody>
                  {BROWSERS.map((b) => (
                    <tr key={b.name}>
                      <td>
                        <span className="doc-agent">
                          <BrowserIcon name={b.name} size={18} />
                          <code>{b.name}</code>
                        </span>
                      </td>
                      <td>{b.label}</td>
                      <td className="doc-hosts">{b.image}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="configuration" className="doc-section">
            <h2>Configuration</h2>
            <p>
              Both apps load env via a shared helper that walks up for a{' '}
              <code>.env</code> file (or honors <code>AIRLOCK_ENV_FILE</code>).
              Every variable has a default; the full table is in the repo.
            </p>
            <h3>API (selected)</h3>
            <div className="doc-table-wrap">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Variable</th>
                    <th>Default</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {ENV_API.map(([v, def, d]) => (
                    <tr key={v}>
                      <td>
                        <code>{v}</code>
                      </td>
                      <td>
                        <code>{def}</code>
                      </td>
                      <td>{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3>Worker</h3>
            <div className="doc-table-wrap">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Variable</th>
                    <th>Default</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {ENV_WORKER.map(([v, def, d]) => (
                    <tr key={v}>
                      <td>
                        <code>{v}</code>
                      </td>
                      <td>
                        <code>{def}</code>
                      </td>
                      <td>{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted">
              <code>AIRLOCK_INTERNAL_TOKEN</code> must agree across the API and
              worker — the API gates <code>/api/internal/prune</code> with it and
              the worker sends it as the <code>x-airlock-internal-token</code>{' '}
              header.
            </p>
          </section>

          <section id="security" className="doc-section">
            <h2>Security</h2>
            <p>
              The control plane is a single Express process that is the{' '}
              <strong>only</strong> component allowed to talk to Docker. A
              mounted <code>/var/run/docker.sock</code> is{' '}
              <strong>root-equivalent on the host</strong> — keep the API behind
              the bearer token and a TLS-terminating proxy whenever it is
              reachable beyond localhost.
            </p>
            <p>
              Sessions run with <code>AutoRemove</code>, no persistence volumes, a
              per-session VNC password, <code>no-new-privileges</code>, and
              memory / CPU / PID caps. By default they attach to a dedicated
              ICC-off bridge. When <code>AIRLOCK_API_TOKEN</code> is unset and the
              API is bound beyond loopback, it logs a loud startup warning.
            </p>
            <p>
              <a
                className="btn"
                href={`${REPO}/blob/main/docs/security.md`}
                target="_blank"
                rel="noreferrer"
              >
                Read the security model ↗
              </a>
            </p>
          </section>

          <section id="deployment" className="doc-section">
            <h2>Deployment</h2>
            <p>
              Airlock is local-first but provider-pluggable: every adapter under{' '}
              <code>deploy/</code> builds the same root image and satisfies one
              contract. Host-socket adapters (Docker Compose, VM) bind-mount the
              socket; remote-engine adapters (Kubernetes, Fly, Render, Railway)
              point <code>AIRLOCK_DOCKER_HOST</code> at a TLS-protected engine.
            </p>
            <p>
              <a
                className="btn"
                href={`${REPO}/blob/main/docs/deployment.md`}
                target="_blank"
                rel="noreferrer"
              >
                Deployment guide ↗
              </a>
            </p>
          </section>

          <section id="reference" className="doc-section">
            <h2>Full reference</h2>
            <p>
              The complete, authoritative docs live in the repository. Each links
              to GitHub:
            </p>
            <ul className="doc-links">
              {REPO_DOCS.map(([file, desc]) => (
                <li key={file}>
                  <a
                    href={`${REPO}/blob/main/docs/${file}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {file}
                  </a>{' '}
                  — {desc}
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>

      <footer className="footer">
        <div className="container footer-inner">
          <a className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </span>
            airlock
          </a>
          <div className="footer-links">
            <a href="/">Home</a>
            <a href={REPO} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href={`${REPO}/tree/main/docs`} target="_blank" rel="noreferrer">
              Docs source
            </a>
          </div>
        </div>
      </footer>
    </>
  )
}
