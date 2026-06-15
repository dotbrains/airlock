# Deploying Airlock

Airlock's deployment is **provider-pluggable**: every adapter under `deploy/`
builds and runs the _same_ image (the root `Dockerfile`) and satisfies one
shared deployment contract. Docker Compose is one adapter among several — pick
the one that fits your infrastructure, or add your own by implementing the
contract.

Airlock is **local-first**: the recommended deployment is a host you own
(Compose or a VM) where the API can reach the local Docker engine. The managed
adapters are provided for teams that already run that infrastructure.

## The browser-engine requirement

Unlike a stateless web service, the Airlock API **spawns browser containers**.
It therefore needs to reach a Docker engine. That splits the adapters into two
classes:

| Class             | How the API reaches Docker                                | Adapters                            |
| ----------------- | --------------------------------------------------------- | ----------------------------------- |
| **Host engine**   | Bind-mount `/var/run/docker.sock`                         | Docker Compose, Generic VM          |
| **Remote engine** | `AIRLOCK_DOCKER_HOST` → a TLS-protected `tcp://` endpoint | Fly.io, Render, Railway, Kubernetes |

There is no "no-Docker" mode: a platform that grants neither a socket nor a
reachable engine cannot launch sessions. The managed-PaaS adapters below host
the **control plane** (API + dashboard + worker) and point it at an engine you
operate elsewhere.

## Provider matrix

| Provider                                   | Engine access | Command                                                         | When to use                                        |
| ------------------------------------------ | ------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| [Docker Compose](docker-compose/README.md) | Host socket   | `docker compose -f deploy/docker-compose/docker-compose.yml up` | Local dev or a single home server. **Start here.** |
| [Generic VM](vm/README.md)                 | Host socket   | systemd + `docker run`                                          | A Linux host you own.                              |
| [Kubernetes](kubernetes/README.md)         | Remote engine | `kubectl apply -f deploy/kubernetes/`                           | An existing cluster with a reachable engine.       |
| [Fly.io](fly/README.md)                    | Remote engine | `fly deploy -c deploy/fly/fly.toml`                             | Managed host for the control plane.                |
| [Render](render/README.md)                 | Remote engine | Blueprint (`deploy/render/render.yaml`)                         | Managed PaaS with push-to-deploy.                  |
| [Railway](railway/README.md)               | Remote engine | `railway up`                                                    | Managed PaaS, CLI-first.                           |

## The deployment contract

Every adapter implements the same provider-agnostic contract. Anything that
satisfies these points can run Airlock:

| Concern            | Contract                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Image              | The shared root `Dockerfile` — all providers build/run it.                                                        |
| API process        | `bun apps/api/dist/index.js` on internal port **8787** (the image default).                                       |
| Worker process     | `bun apps/worker/dist/index.js` — the prune loop; one per deployment.                                             |
| Healthcheck        | `GET /healthz` — auth-exempt; liveness + readiness probe.                                                         |
| Browser engine     | A Docker socket at `/var/run/docker.sock` **or** `AIRLOCK_DOCKER_HOST`.                                           |
| Recommended secret | `AIRLOCK_API_TOKEN` — bearer token for the dashboard/API. Required whenever the API is reachable beyond loopback. |

Airlock holds **no database**. Session metadata lives entirely in Docker
container labels (`airlock.*`), so the control plane is stateless — there is no
volume to mount. Restarting the API reconstructs the session list by inspecting
the engine; the worker reaps expired containers on its interval.

Optional environment, common to every adapter:

| Variable                      | Purpose                                                    |
| ----------------------------- | ---------------------------------------------------------- |
| `AIRLOCK_PUBLIC_BASE_URL`     | Public base URL used to build `/s/:id` launch links.       |
| `AIRLOCK_SESSION_HOST`        | Host clients use to reach browser containers.              |
| `AIRLOCK_DEFAULT_TTL_SECONDS` | Default session lifetime (clamped 60–86400).               |
| `AIRLOCK_DEFAULT_BROWSER`     | Default browser kind.                                      |
| `AIRLOCK_VNC_PASSWORD`        | VNC password baked into browser containers.                |
| `AIRLOCK_INTERNAL_TOKEN`      | Shared secret gating `/api/internal/prune` (API ↔ worker). |

See [docs/configuration.md](../docs/configuration.md) for the full variable
reference.

## How to add a provider

A new adapter is a thin directory under `deploy/<provider>/` that satisfies the
contract above. Implement these and you are done:

1. **Build the shared image.** Build the root `Dockerfile` (do not fork it);
   set the build context to the repo root so the image matches every other
   adapter.
1. **Give the API an engine.** Either bind-mount `/var/run/docker.sock` or set
   `AIRLOCK_DOCKER_HOST` (with `AIRLOCK_DOCKER_CERT_PATH` for TLS material).
1. **Run both processes.** Start the API (`bun apps/api/dist/index.js`) and a
   single worker (`bun apps/worker/dist/index.js`) sharing `AIRLOCK_INTERNAL_TOKEN`.
1. **Set `AIRLOCK_API_TOKEN`.** Wire the provider's secret mechanism to it
   whenever the API is reachable beyond localhost.
1. **Expose port 8787** and route external traffic to it, with TLS at the edge.
1. **Point a healthcheck at `/healthz`.** It is auth-exempt, so the probe needs
   no token.

Add a `README.md` next to your manifest with the exact operator commands, then
add a row to the provider matrix above. The Docker Compose adapter is the
smallest end-to-end template.
