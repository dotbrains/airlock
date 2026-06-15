import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import Docker from "dockerode";
import {
  AirlockSession,
  CreateSessionInput,
  DecodedSessionLabels,
  SessionRuntime,
  browserProfile,
  decodeSessionLabels,
  encodeSessionLabels,
  expiresAt as computeExpiresAt,
  isExpired,
  isManagedLabels
} from "@airlock/shared";
import { AirlockConfig } from "./config";
import { isContainerNotFound } from "./docker-errors";

type DockerContainerSummary = Awaited<ReturnType<Docker["listContainers"]>>[number];

const portKey = (containerPort: number): string => `${containerPort}/tcp`;

const toEnvList = (env: Record<string, string>): string[] =>
  Object.entries(env).map(([key, value]) => `${key}=${value}`);

// Route all browser egress through an operator-controlled proxy when set. Both
// upper- and lower-case forms are emitted because tooling disagrees on which it
// honors.
const proxyEnv = (proxy: string | undefined): Record<string, string> => {
  if (!proxy) {
    return {};
  }
  return {
    HTTP_PROXY: proxy,
    HTTPS_PROXY: proxy,
    http_proxy: proxy,
    https_proxy: proxy
  };
};

const isNetworkConflict = (error: unknown): boolean => {
  const statusCode = (error as { statusCode?: number } | null)?.statusCode;
  return statusCode === 409;
};

// Resolve how dockerode connects: a remote engine via AIRLOCK_DOCKER_HOST
// (tcp://host:port, with optional TLS material from a cert directory) takes
// precedence; otherwise we fall back to the local unix socket. Remote hosts
// are what make the managed-PaaS deploy adapters viable — those platforms
// expose no local socket, so the API talks to an engine over the network.
const dockerConnectionOptions = (
  launch: AirlockConfig["containerLaunch"]
): Docker.DockerOptions => {
  if (!launch.dockerHost) {
    return { socketPath: launch.dockerSocketPath };
  }

  const url = new URL(launch.dockerHost);
  const useTls = url.protocol === "https:" || Boolean(launch.dockerCertPath);
  const base: Docker.DockerOptions = {
    host: url.hostname,
    port: Number.parseInt(url.port, 10) || (useTls ? 2376 : 2375),
    protocol: useTls ? "https" : "http"
  };

  if (!launch.dockerCertPath) {
    return base;
  }

  const certDir = launch.dockerCertPath;
  return {
    ...base,
    ca: readFileSync(path.join(certDir, "ca.pem")),
    cert: readFileSync(path.join(certDir, "cert.pem")),
    key: readFileSync(path.join(certDir, "key.pem"))
  };
};

export interface DockerSessionRuntimeOptions {
  config: AirlockConfig;
  docker?: Docker;
}

export class DockerSessionRuntime implements SessionRuntime {
  private readonly docker: Docker;
  private readonly config: AirlockConfig;

  constructor(options: DockerSessionRuntimeOptions) {
    this.config = options.config;
    this.docker =
      options.docker ?? new Docker(dockerConnectionOptions(this.config.containerLaunch));
  }

  async createSession(input: CreateSessionInput): Promise<AirlockSession> {
    const launch = this.config.containerLaunch;
    const sessionId = randomUUID();
    const browser = input.browser;
    const profile = browserProfile(browser);
    const image = launch.browserImages[browser];
    const createdAt = new Date();
    const expiresAt = computeExpiresAt(createdAt, input.ttlSeconds);
    const containerName = `airlock-${sessionId}`;
    const containerPortKey = portKey(profile.containerPort);
    // A distinct random secret per session so one stream's credentials never
    // grant access to another.
    const vncPassword = randomBytes(18).toString("base64url");

    if (launch.networkIsolation) {
      await this.ensureNetwork(launch.networkName);
    }

    const launchEnv = {
      ...profile.buildLaunchEnv({
        targetUrl: input.targetUrl,
        vncPassword
      }),
      ...proxyEnv(launch.egressProxy)
    };

    const container = await this.docker.createContainer({
      name: containerName,
      Image: image,
      Env: toEnvList(launchEnv),
      ExposedPorts: {
        [containerPortKey]: {}
      },
      Labels: encodeSessionLabels({
        sessionId,
        browser,
        targetUrl: input.targetUrl,
        vncPassword,
        createdAt,
        expiresAt
      }),
      HostConfig: {
        AutoRemove: true,
        PortBindings: {
          [containerPortKey]: [
            {
              HostPort: ""
            }
          ]
        },
        ShmSize: launch.shmSizeBytes,
        Memory: launch.memoryBytes || undefined,
        NanoCpus: launch.nanoCpus || undefined,
        PidsLimit: launch.pidsLimit || undefined,
        // Browser containers never need to escalate privileges.
        SecurityOpt: ["no-new-privileges"],
        NetworkMode: launch.networkIsolation ? launch.networkName : undefined
      }
    });

    await container.start();
    const inspect = await container.inspect();
    const hostPort = inspect.NetworkSettings?.Ports?.[containerPortKey]?.[0]?.HostPort;

    if (!hostPort) {
      await this.safeRemoveContainer(container.id);
      throw new Error("Unable to map browser container to a host port.");
    }

    const hostPortNumber = Number.parseInt(hostPort, 10);
    return {
      sessionId,
      browser,
      targetUrl: input.targetUrl,
      browserUrl: profile.streamUrl(this.config.server.sessionHost, hostPortNumber),
      vncPassword,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString()
    };
  }

  async ping(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch {
      return false;
    }
  }

  async getSession(sessionId: string): Promise<AirlockSession | null> {
    const match = await this.findContainerBySessionId(sessionId);
    if (!match) {
      return null;
    }
    return this.mapContainerToSession(match.container, match.decoded);
  }

  async listSessions(): Promise<AirlockSession[]> {
    const containers = await this.listManagedContainers(false);
    const sessions: AirlockSession[] = [];

    for (const container of containers) {
      const decoded = decodeSessionLabels(container.Labels, this.config.sessionDefaults.browser);
      if (!decoded) {
        continue;
      }
      const session = this.mapContainerToSession(container, decoded);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async stopSession(sessionId: string): Promise<boolean> {
    const match = await this.findContainerBySessionId(sessionId);
    if (!match) {
      return false;
    }
    await this.safeRemoveContainer(match.container.Id);
    return true;
  }

  async pruneExpiredSessions(now: Date = new Date()): Promise<number> {
    const containers = await this.listManagedContainers(true);
    let pruned = 0;

    for (const container of containers) {
      const decoded = decodeSessionLabels(container.Labels, this.config.sessionDefaults.browser);
      if (!decoded) {
        continue;
      }

      if (isExpired(decoded, now)) {
        await this.safeRemoveContainer(container.Id);
        pruned += 1;
      }
    }
    return pruned;
  }

  private async listManagedContainers(includeStopped: boolean): Promise<DockerContainerSummary[]> {
    const allContainers = await this.docker.listContainers({
      all: includeStopped
    });
    return allContainers.filter((container) => isManagedLabels(container.Labels));
  }

  private async findContainerBySessionId(
    sessionId: string
  ): Promise<{ container: DockerContainerSummary; decoded: DecodedSessionLabels } | undefined> {
    const containers = await this.listManagedContainers(true);
    for (const container of containers) {
      const decoded = decodeSessionLabels(container.Labels, this.config.sessionDefaults.browser);
      if (decoded?.sessionId === sessionId) {
        return { container, decoded };
      }
    }
    return undefined;
  }

  private mapContainerToSession(
    container: DockerContainerSummary,
    decoded: DecodedSessionLabels
  ): AirlockSession | null {
    const profile = browserProfile(decoded.browser);
    const hostPort = container.Ports.find(
      (port) => port.PrivatePort === profile.containerPort && port.Type === "tcp"
    )?.PublicPort;
    if (!hostPort) {
      return null;
    }

    return {
      sessionId: decoded.sessionId,
      browser: decoded.browser,
      targetUrl: decoded.targetUrl,
      browserUrl: profile.streamUrl(this.config.server.sessionHost, hostPort),
      vncPassword: decoded.vncPassword,
      createdAt: decoded.createdAt,
      expiresAt: decoded.expiresAt
    };
  }

  // Create the dedicated bridge network on first use. Inter-container
  // communication is disabled so sessions cannot reach each other; an already
  // existing network (409 Conflict) is fine.
  private async ensureNetwork(name: string): Promise<void> {
    try {
      await this.docker.createNetwork({
        Name: name,
        Driver: "bridge",
        CheckDuplicate: true,
        Options: { "com.docker.network.bridge.enable_icc": "false" },
        Labels: { "airlock.managed": "true" }
      });
    } catch (error) {
      if (isNetworkConflict(error)) {
        return;
      }
      throw error;
    }
  }

  private async safeRemoveContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.remove({
        force: true
      });
    } catch (error) {
      if (isContainerNotFound(error)) {
        return;
      }
      throw error;
    }
  }
}
