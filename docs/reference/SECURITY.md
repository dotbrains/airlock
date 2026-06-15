# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.x     | Yes       |

Only the latest release on the current major version line receives security
updates.

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Please report vulnerabilities privately through
[GitHub Security Advisories](https://github.com/dotbrains/airlock/security/advisories).

1. Go to the [Security Advisories page](https://github.com/dotbrains/airlock/security/advisories)
2. Click **"New draft security advisory"** (or use the **Report a
   vulnerability** button on the repository's **Security** tab)
3. Fill in a description of the vulnerability, including steps to reproduce if
   possible

Reports reach the dotbrains maintainers. Please give us a reasonable window to
investigate and ship a fix before any public disclosure.

### Response Timeline

- **Acknowledgment**: Within 48 hours of your report
- **Initial assessment**: Within 7 days
- **Fix or mitigation**: Within 30 days for confirmed vulnerabilities

We will keep you informed of progress throughout the process.

## Scope

Airlock launches disposable browser containers and exposes an HTTP API plus a
live VNC stream of each session. A few boundaries are central to the threat
model — see [security.md](../security.md) and
[architecture.md](../architecture.md#auth) for the full picture:

- The management API (`/api/meta`, `/api/sessions*`) is gated by a bearer token
  (`AIRLOCK_API_TOKEN`), compared in constant time. **When the token is unset
  the guard is a no-op** — frictionless for local dev, but the API must not be
  exposed beyond localhost without it.
- `/healthz`, `/health`, and `/s/:sessionId` are auth-exempt by design. The
  session id is an unguessable capability followed by plain navigation that
  cannot carry an `Authorization` header.
- `POST /api/internal/prune` is gated by its own shared secret
  (`AIRLOCK_INTERNAL_TOKEN`), independent of the bearer token.
- A mounted Docker socket is **root-equivalent on the host**. Keep the API
  behind the bearer token and a TLS-terminating proxy, and treat any deployment
  that exposes it as security-sensitive.

If you find a way to bypass the bearer guard, reach Docker through an
auth-exempt path, escape a browser container, or otherwise cross one of these
boundaries, please report it through the process above.
