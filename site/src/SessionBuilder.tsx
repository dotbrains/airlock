import { useMemo, useState } from 'react'
import { BrowserIcon } from './BrowserIcon'
import Dropdown from './Dropdown'
import { BROWSERS, BROWSER_IMAGE, TTL_PRESETS } from './data'

const BROWSER_OPTIONS = BROWSERS.map((b) => ({
  value: b.name,
  name: b.name,
  label: b.label,
}))
const TTL_OPTIONS = TTL_PRESETS.map((t) => ({
  value: String(t.seconds),
  name: t.label,
}))

function MiniCopy({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="copy"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1400)
        })
      }}
    >
      {copied ? 'copied' : 'copy'}
    </button>
  )
}

function humanBytes(n: number): string {
  if (n === 0) return 'unlimited'
  const gib = n / 1024 ** 3
  if (gib >= 1) return `${Number.isInteger(gib) ? gib : gib.toFixed(1)} GiB`
  return `${Math.round(n / 1024 ** 2)} MiB`
}

function humanTtl(seconds: number): string {
  if (seconds % 3600 === 0) return `${seconds / 3600}h`
  if (seconds % 60 === 0) return `${seconds / 60}m`
  return `${seconds}s`
}

export default function SessionBuilder() {
  const [baseUrl, setBaseUrl] = useState('http://localhost:8787')
  const [targetUrl, setTargetUrl] = useState('https://example.com')
  const [browser, setBrowser] = useState('chromium')
  const [ttl, setTtl] = useState(1800)
  const [token, setToken] = useState('')
  const [isolation, setIsolation] = useState(true)
  const [proxy, setProxy] = useState('')

  const memBytes = 2 * 1024 ** 3
  const cpus = 2
  const pids = 512

  const curl = useMemo(() => {
    const base = baseUrl.replace(/\/+$/, '') || 'http://localhost:8787'
    const body = JSON.stringify({
      targetUrl: targetUrl || 'https://example.com',
      browser,
      ttlSeconds: ttl,
    })
    const lines = [`curl -X POST ${base}/api/sessions \\`]
    if (token.trim()) lines.push(`  -H "Authorization: Bearer ${token.trim()}" \\`)
    lines.push('  -H "Content-Type: application/json" \\')
    lines.push(`  -d '${body}'`)
    return lines.join('\n')
  }, [baseUrl, targetUrl, browser, ttl, token])

  const summary = useMemo(() => {
    const out: string[] = []
    out.push('# what Airlock launches for this request')
    out.push(`image        ${BROWSER_IMAGE[browser]}`)
    out.push(
      `network      ${isolation ? 'airlock bridge — ICC disabled' : 'default docker bridge'}`,
    )
    if (proxy.trim()) out.push(`egress       HTTP(S)_PROXY → ${proxy.trim()}`)
    out.push('lifecycle    AutoRemove — container self-deletes on stop')
    out.push('host fs      not mounted — no persistence volumes')
    out.push(`memory cap   ${humanBytes(memBytes)}`)
    out.push(`cpu cap      ${cpus}`)
    out.push(`pids cap     ${pids}`)
    out.push('hardening    no-new-privileges')
    out.push(`expires      ${humanTtl(ttl)} after creation`)
    out.push('stream       https://<host>:<mapped-port> · per-session VNC password')
    out.push('# at expiry the cleanup worker prunes it — nothing persists')
    return out.join('\n')
  }, [browser, isolation, proxy, ttl])

  const unauth = !token.trim()

  return (
    <section className="section alt" id="builder">
      <div className="container">
        <h2>Build a session request</h2>
        <p className="section-lede">
          The dashboard and the extension both drive one HTTP endpoint. Tune the
          request here and copy the exact <code>curl</code> — plus a plain-English
          summary of what the runtime will do with it.
        </p>
        <div className="builder">
          <form className="builder-form" onSubmit={(e) => e.preventDefault()}>
            <fieldset>
              <legend>Target</legend>
              <label className="field">
                <span>Link to open</span>
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </label>
              <label className="field">
                <span>Browser</span>
                <Dropdown
                  value={browser}
                  onChange={setBrowser}
                  options={BROWSER_OPTIONS}
                  renderIcon={(v) => <BrowserIcon name={v} />}
                />
              </label>
              <label className="field">
                <span>Lifetime (TTL)</span>
                <Dropdown
                  value={String(ttl)}
                  onChange={(v) => setTtl(Number(v))}
                  options={TTL_OPTIONS}
                />
              </label>
            </fieldset>

            <fieldset>
              <legend>API</legend>
              <label className="field">
                <span>API base URL</span>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://localhost:8787"
                />
              </label>
              <label className="field">
                <span>Bearer token (AIRLOCK_API_TOKEN) — blank for local dev</span>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="(unset — unauthenticated)"
                />
              </label>
            </fieldset>

            <fieldset>
              <legend>Isolation</legend>
              <label className="check">
                <input
                  type="checkbox"
                  checked={isolation}
                  onChange={(e) => setIsolation(e.target.checked)}
                />
                <span>
                  Dedicated ICC-off bridge <code>AIRLOCK_NETWORK_ISOLATION</code>
                </span>
              </label>
              <label className="field">
                <span>Egress proxy → AIRLOCK_EGRESS_PROXY (optional)</span>
                <input
                  type="text"
                  value={proxy}
                  onChange={(e) => setProxy(e.target.value)}
                  placeholder="http://proxy.local:3128"
                />
              </label>
            </fieldset>
          </form>

          <div className="builder-out">
            <div className="preview-browser">
              <BrowserIcon name={browser} size={26} />
              <span>
                <code>{browser}</code> · {BROWSER_IMAGE[browser]}
              </span>
            </div>

            {unauth && (
              <div className="warn">
                No token set — the management API is <strong>unauthenticated</strong>.
                Fine for loopback dev; set <code>AIRLOCK_API_TOKEN</code> before
                exposing Airlock beyond localhost.
              </div>
            )}

            <div className="out-block">
              <div className="out-head">
                <span>Request</span>
                <MiniCopy text={curl} />
              </div>
              <pre className="out-pre">
                <code>{curl}</code>
              </pre>
            </div>

            <div className="out-block">
              <div className="out-head">
                <span>Effective session</span>
                <MiniCopy text={summary} />
              </div>
              <pre className="out-pre tall">
                <code>{summary}</code>
              </pre>
              <p className="muted note">
                Defaults shown; resource caps come from the <code>AIRLOCK_SESSION_*</code>{' '}
                variables. Shown here for transparency.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
