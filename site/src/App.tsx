import { type ReactNode } from "react";
import { BrowserIcon } from "./BrowserIcon";
import { Code } from "./Code";
import SessionBuilder from "./SessionBuilder";
import {
  BROWSERS,
  CONFIG,
  ENTRIES,
  GRANTS,
  INSTALL,
  PROOF,
  PROVIDERS,
  REPO,
  TRACE,
  USAGE
} from "./data";

function Mark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    </span>
  );
}

function Nav() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <a className="brand" href="#top">
          <Mark />
          airlock
        </a>
        <nav className="nav-links">
          <a href="#how">How it works</a>
          <a href="#entries">Two ways in</a>
          <a href="#browsers">Browsers</a>
          <a href="#builder">Builder</a>
          <a href="/docs">Docs ↗</a>
          <a className="nav-cta" href={REPO} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" id="top">
      <div className="container hero-inner">
        <div className="hero-copy">
          <p className="eyebrow">disposable browser isolation, on your own machine</p>
          <h1>
            Open the link.
            <br />
            <span className="accent">Nothing</span> sticks to you.
          </h1>
          <p className="lede">
            <strong>Airlock</strong> opens any link in a short-lived, containerized browser — from a{" "}
            <strong>web dashboard</strong> or by <strong>right-clicking a link</strong>. Like a
            cloud-browser service, but it runs <strong>entirely on your own machine</strong>.
          </p>
          <p className="lede sub">
            No cloud, no account, no data leaving the host. The session lives in a throwaway Kasm
            container that <strong>evaporates on exit</strong> — no profile, no downloads, no
            lingering logins.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href="#install">
              Get started
            </a>
            <a className="btn" href="/docs">
              Read the docs ↗
            </a>
            <a className="btn" href="#how">
              How it works
            </a>
          </div>
        </div>
        <div className="hero-term" aria-hidden="true">
          <div className="term">
            <div className="term-bar">
              <span className="dot dot-r" />
              <span className="dot dot-y" />
              <span className="dot dot-g" />
              <span className="term-title">airlock</span>
            </div>
            <pre className="term-body">
              <span className="ln">
                <span className="prompt">$</span> docker compose up
              </span>
              <span className="ln dim">
                airlock: dashboard + API + worker → http://localhost:8787
              </span>
              <span className="ln">
                <span className="ok">✓</span> POST /api/sessions — chromium, ttl 30m
              </span>
              <span className="ln">
                <span className="ok">✓</span> container --rm · no host mounts · ICC bridge
              </span>
              <span className="ln dim">…you browse the link, sandboxed…</span>
              <span className="ln">
                <span className="ok">✓</span> ttl hit — session evaporated
                <span className="cursor" />
              </span>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function Trace() {
  return (
    <section className="section" id="how">
      <div className="container">
        <h2>Every trace surface, closed</h2>
        <p className="section-lede">
          What a sketchy link normally leaves on your machine — and what Airlock does with it
          instead.
        </p>
        <div className="trace">
          <div className="trace-head">
            <span>Surface</span>
            <span>Normally</span>
            <span>Under Airlock</span>
          </div>
          {TRACE.map((row) => (
            <div className="trace-row" key={row.surface}>
              <span className="trace-surface">{row.surface}</span>
              <span className="trace-normal">{row.normally}</span>
              <span className="trace-airlock">
                <span className="ok">✓</span> {row.airlock}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Entries() {
  return (
    <section className="section alt" id="entries">
      <div className="container">
        <h2>Two ways in, one API</h2>
        <p className="section-lede">
          Drive Airlock from a full dashboard or straight from your address bar. Both hit the same
          session API; both hand back a link to a disposable browser.
        </p>
        <div className="cards two">
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
      </div>
    </section>
  );
}

function Grants() {
  return (
    <section className="section">
      <div className="container">
        <h2>What a session can — and can’t — touch</h2>
        <p className="section-lede">
          A session is a single browser in a box. It reaches the web and your screen; it never
          reaches your machine.
        </p>
        <div className="cards two">
          <div className="card grant ok-card">
            <h3>
              <span className="ok">✓</span> Allowed
            </h3>
            <ul className="ticks">
              {GRANTS.allowed.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
          <div className="card grant no-card">
            <h3>
              <span className="no">✗</span> Denied
            </h3>
            <ul className="ticks no">
              {GRANTS.denied.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function proofLine(line: string, i: number): ReactNode {
  let inner: ReactNode = line;
  if (line.trim() === "") {
    inner = " ";
  } else if (line.includes("✓")) {
    inner = <span className="hl-ok">{line}</span>;
  } else if (line.trimStart().startsWith("#")) {
    inner = <span className="hl-comment">{line}</span>;
  } else if (line.startsWith("airlock:")) {
    inner = <span className="dim">{line}</span>;
  } else {
    const m = line.match(/^(\s*)(\$)(\s.*)$/);
    if (m) {
      inner = (
        <>
          {m[1]}
          <span className="hl-prompt">{m[2]}</span>
          <span className="hl-cmd">{m[3]}</span>
        </>
      );
    }
  }
  return (
    <span className="ln" key={i}>
      {inner}
    </span>
  );
}

function Proof() {
  return (
    <section className="section alt">
      <div className="container narrow">
        <h2>Disposable, by construction</h2>
        <p className="section-lede">
          Create a session over the API, browse, and watch the worker delete the whole container at
          expiry. There is no profile to clear because there was never a profile.
        </p>
        <div className="term proof">
          <div className="term-bar">
            <span className="dot dot-r" />
            <span className="dot dot-y" />
            <span className="dot dot-g" />
            <span className="term-title">session lifecycle</span>
          </div>
          <pre className="term-body">
            <code>{PROOF.split("\n").map(proofLine)}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}

function Browsers() {
  return (
    <section className="section" id="browsers">
      <div className="container">
        <h2>Seven browsers, all disposable</h2>
        <p className="section-lede">
          Pick the engine per session. Each is a Kasm container image, pulled on first launch and
          pre-pullable so the next launch is instant.
        </p>
        <div className="agent-grid">
          {BROWSERS.map((b) => (
            <div className="agent" key={b.name}>
              <div className="agent-top">
                <BrowserIcon name={b.name} size={22} />
                <span className="agent-cmd">{b.name}</span>
              </div>
              <span className="agent-label">{b.label}</span>
              <span className="agent-backends">{b.image}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function configIcon(title: string): ReactNode {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8 } as const;
  if (title === "Session lifetime") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" {...p} strokeLinecap="round">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </svg>
    );
  }
  if (title === "Resource caps") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" {...p} strokeLinejoin="round">
        <rect x="5" y="5" width="14" height="14" rx="2" />
        <line x1="9.5" y1="9.5" x2="14.5" y2="9.5" strokeLinecap="round" />
        <line x1="9.5" y1="14.5" x2="14.5" y2="14.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      {...p}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </svg>
  );
}

function Config() {
  return (
    <section className="section">
      <div className="container">
        <h2>Configure to taste</h2>
        <div className="config-list">
          {CONFIG.map((c) => (
            <div className="config-item" key={c.title}>
              <div className="config-text">
                <div className="config-ico">{configIcon(c.title)}</div>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </div>
              <div className="term config-term">
                <div className="term-bar">
                  <span className="dot dot-r" />
                  <span className="dot dot-y" />
                  <span className="dot dot-g" />
                  <span className="term-title">{c.tag}</span>
                </div>
                <pre className="term-body small">
                  <code>{c.code}</code>
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Deploy() {
  return (
    <section className="section alt" id="deploy">
      <div className="container">
        <h2>Local-first, provider-pluggable</h2>
        <p className="section-lede">
          The happy path is a host you own, where the API reaches the local Docker engine. Beyond
          that, every adapter builds the same shared image and satisfies one contract — there’s no
          database to provision.
        </p>
        <div className="trace deploy-table">
          <div className="trace-head deploy-head">
            <span>Provider</span>
            <span>Engine</span>
            <span>Start here if…</span>
          </div>
          {PROVIDERS.map((p) => (
            <div className="trace-row deploy-head" key={p.name}>
              <span className="trace-surface">{p.name}</span>
              <span className="trace-normal">{p.engine}</span>
              <span className="trace-airlock">{p.when}</span>
            </div>
          ))}
        </div>
        <p className="deploy-note">
          <a
            className="btn"
            href={`${REPO}/blob/main/docs/deployment.md`}
            target="_blank"
            rel="noreferrer"
          >
            Deployment guide ↗
          </a>
        </p>
      </div>
    </section>
  );
}

function Install() {
  return (
    <section className="section" id="install">
      <div className="container">
        <h2>Get started</h2>
        <div className="cards install-cards">
          {INSTALL.map((i) => (
            <div className="card install" key={i.id}>
              <div className="install-head">
                <h3>{i.label}</h3>
                <p className="muted">{i.note}</p>
              </div>
              <Code>{i.code}</Code>
            </div>
          ))}
        </div>
        <h3 className="usage-title">Then run it locally</h3>
        <Code>{USAGE}</Code>
      </div>
    </section>
  );
}

function Secure() {
  return (
    <section className="section alt">
      <div className="container narrow center">
        <h2>Secure before you expose</h2>
        <p className="section-lede">
          The management API is unauthenticated until you set <code>AIRLOCK_API_TOKEN</code>. A
          mounted Docker socket is root-equivalent on the host — keep the API behind the token and a
          TLS-terminating proxy. Bound beyond loopback with no token, Airlock logs a loud startup
          warning rather than fail silent.
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
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <a className="brand" href="#top">
            <Mark />
            airlock
          </a>
          <p className="muted">
            Local, disposable browser isolation ·{" "}
            <a href={`${REPO}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
              PolyForm Shield 1.0.0
            </a>
          </p>
        </div>
        <div className="footer-links">
          <a href={REPO} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href="/docs">Docs</a>
          <a href={`${REPO}/blob/main/docs/architecture.md`} target="_blank" rel="noreferrer">
            Architecture
          </a>
          <a href="https://dotbrains.dev" target="_blank" rel="noreferrer">
            dotbrains
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Trace />
        <Entries />
        <Grants />
        <Proof />
        <Browsers />
        <Config />
        <SessionBuilder />
        <Deploy />
        <Install />
        <Secure />
      </main>
      <Footer />
    </>
  );
}
