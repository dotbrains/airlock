# Kubernetes adapter

Runs the Airlock control plane (API + dashboard and the cleanup worker) as two
single-replica Deployments behind a ClusterIP Service. There is no PVC —
Airlock keeps no database; session state lives in Docker container labels.

## The engine question

The API must reach a Docker engine to spawn browser containers. In a cluster
the recommended pattern is a **remote engine** reachable over TLS, set via
`AIRLOCK_DOCKER_HOST` in the Secret. Mounting a node's container socket into the
Pod works but grants node-root and is discouraged; do it only on clusters you
fully control.

## Deploy

```bash
# 1. Build and push the shared image to a registry your cluster can pull.
docker build -t ghcr.io/dotbrains/airlock:latest .
docker push ghcr.io/dotbrains/airlock:latest

# 2. Create the secret (edit the example first, or use --from-literal).
cp deploy/kubernetes/secret.example.yaml deploy/kubernetes/secret.yaml
$EDITOR deploy/kubernetes/secret.yaml
kubectl apply -f deploy/kubernetes/secret.yaml

# 3. Apply the workloads + service.
kubectl apply -f deploy/kubernetes/deployment.yaml
kubectl apply -f deploy/kubernetes/service.yaml
```

Expose `airlock-api` with an Ingress (TLS at the edge) or
`kubectl port-forward svc/airlock-api 8787:8787` for a quick look.

## How it maps to the contract

| Contract       | This adapter                                                   |
| -------------- | -------------------------------------------------------------- |
| Image          | `ghcr.io/dotbrains/airlock:latest` from the root `Dockerfile`. |
| API process    | `airlock-api` Deployment → `bun apps/api/dist/index.js`.       |
| Worker process | `airlock-worker` Deployment (1 replica).                       |
| Healthcheck    | `/healthz` liveness + readiness probes.                        |
| Browser engine | `AIRLOCK_DOCKER_HOST` (remote, TLS).                           |
| Secret         | `airlock-secrets` → `AIRLOCK_API_TOKEN`, etc.                  |

## Notes

- Keep `airlock-worker` at 1 replica; the prune loop needs no parallelism.
- The Service name `airlock-api` is what the worker dials
  (`AIRLOCK_API_BASE_URL=http://airlock-api:8787`) — keep them in sync if you
  rename it.
