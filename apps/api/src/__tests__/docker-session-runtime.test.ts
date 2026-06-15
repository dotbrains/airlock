import { describe, expect, it } from "vitest";
import type Docker from "dockerode";
import { encodeSessionLabels } from "@airlock/shared";
import { DockerSessionRuntime } from "../docker-session-runtime";
import type { AirlockConfig } from "../config";

type ContainerSummary = Awaited<ReturnType<Docker["listContainers"]>>[number];

const baseConfig: AirlockConfig = {
  server: {
    port: 8787,
    publicBaseUrl: "http://localhost:8787",
    sessionHost: "localhost"
  },
  sessionDefaults: {
    ttlSeconds: 1800,
    browser: "chromium"
  },
  containerLaunch: {
    dockerSocketPath: "/var/run/docker.sock",
    shmSizeBytes: 1073741824,
    vncPassword: "pw",
    browserImages: {
      chromium: "kasmweb/chromium:1.18.0",
      chrome: "kasmweb/chrome:1.18.0",
      firefox: "kasmweb/firefox:1.18.0",
      edge: "kasmweb/edge:1.18.0",
      brave: "kasmweb/brave:1.18.0",
      vivaldi: "kasmweb/vivaldi:1.18.0",
      tor: "kasmweb/tor-browser:1.18.0"
    }
  },
  auth: {},
  internal: {}
};

const makeFakeContainer = (overrides: Partial<ContainerSummary> = {}): ContainerSummary => {
  const labels = encodeSessionLabels({
    sessionId: "s-1",
    browser: "chromium",
    targetUrl: "https://example.com",
    createdAt: new Date("2026-04-30T12:00:00.000Z"),
    expiresAt: new Date("2026-04-30T12:30:00.000Z")
  });
  return {
    Id: "container-id-1",
    Names: ["/airlock-s-1"],
    Image: "kasmweb/chromium:1.18.0",
    ImageID: "img",
    Command: "",
    Created: 0,
    Ports: [{ PrivatePort: 6901, PublicPort: 32792, Type: "tcp" }],
    Labels: labels,
    State: "running",
    Status: "Up 1 second",
    HostConfig: { NetworkMode: "default" },
    NetworkSettings: { Networks: {} },
    Mounts: [],
    ...overrides
  } as ContainerSummary;
};

interface CreateContainerCall {
  name: string;
  image: string;
  env: string[];
  labels: Record<string, string>;
  exposedPorts: string[];
  shmSize: number;
}

interface FakeDockerOptions {
  containers?: ContainerSummary[];
  hostPortByContainerPort?: Record<string, string>;
  nextContainerId?: string;
}

class FakeDocker {
  containers: ContainerSummary[];
  removed: string[] = [];
  createCalls: CreateContainerCall[] = [];
  startedIds: string[] = [];
  private readonly hostPortByContainerPort: Record<string, string>;
  private readonly nextContainerId: string;

  constructor(options: FakeDockerOptions = {}) {
    this.containers = options.containers ?? [];
    this.hostPortByContainerPort = options.hostPortByContainerPort ?? { "6901/tcp": "32792" };
    this.nextContainerId = options.nextContainerId ?? "created-container-id";
  }

  listContainers = async (_opts: unknown): Promise<ContainerSummary[]> => this.containers;

  createContainer = async (opts: {
    name: string;
    Image: string;
    Env: string[];
    Labels: Record<string, string>;
    ExposedPorts: Record<string, unknown>;
    HostConfig: { ShmSize: number };
  }) => {
    this.createCalls.push({
      name: opts.name,
      image: opts.Image,
      env: opts.Env,
      labels: opts.Labels,
      exposedPorts: Object.keys(opts.ExposedPorts),
      shmSize: opts.HostConfig.ShmSize
    });
    const id = this.nextContainerId;
    const ports = this.hostPortByContainerPort;
    return {
      id,
      start: async (): Promise<void> => {
        this.startedIds.push(id);
      },
      inspect: async () => {
        const portEntries: Record<string, Array<{ HostPort: string }> | null> = {};
        for (const [key, hostPort] of Object.entries(ports)) {
          portEntries[key] = hostPort ? [{ HostPort: hostPort }] : null;
        }
        return {
          Id: id,
          State: { Status: "running" },
          NetworkSettings: { Ports: portEntries }
        };
      }
    };
  };

  getContainer = (id: string) => ({
    remove: async (_opts: unknown): Promise<void> => {
      this.removed.push(id);
      this.containers = this.containers.filter((c) => c.Id !== id);
    }
  });
}

describe("DockerSessionRuntime", () => {
  it("getSession returns a decoded session", async () => {
    const docker = new FakeDocker({ containers: [makeFakeContainer()] });
    const runtime = new DockerSessionRuntime({
      config: baseConfig,
      docker: docker as unknown as Docker
    });

    const session = await runtime.getSession("s-1");
    expect(session).not.toBeNull();
    expect(session?.sessionId).toBe("s-1");
    expect(session?.browserUrl).toBe("https://localhost:32792");
    expect(session?.targetUrl).toBe("https://example.com");
  });

  it("getSession returns null when sessionId not found", async () => {
    const docker = new FakeDocker({ containers: [makeFakeContainer()] });
    const runtime = new DockerSessionRuntime({
      config: baseConfig,
      docker: docker as unknown as Docker
    });
    expect(await runtime.getSession("missing")).toBeNull();
  });

  it("listSessions maps every managed container, newest first", async () => {
    const older = makeFakeContainer({
      Id: "older",
      Labels: encodeSessionLabels({
        sessionId: "older",
        browser: "firefox",
        targetUrl: "https://a.example",
        createdAt: new Date("2026-04-30T11:00:00.000Z"),
        expiresAt: new Date("2026-04-30T11:30:00.000Z")
      })
    });
    const newer = makeFakeContainer({
      Id: "newer",
      Labels: encodeSessionLabels({
        sessionId: "newer",
        browser: "chromium",
        targetUrl: "https://b.example",
        createdAt: new Date("2026-04-30T12:00:00.000Z"),
        expiresAt: new Date("2026-04-30T12:30:00.000Z")
      })
    });
    const docker = new FakeDocker({ containers: [older, newer] });
    const runtime = new DockerSessionRuntime({
      config: baseConfig,
      docker: docker as unknown as Docker
    });

    const sessions = await runtime.listSessions();
    expect(sessions.map((session) => session.sessionId)).toEqual(["newer", "older"]);
  });

  it("listSessions skips unmanaged containers", async () => {
    const managed = makeFakeContainer();
    const unmanaged = makeFakeContainer({ Id: "u", Labels: {} });
    const docker = new FakeDocker({ containers: [managed, unmanaged] });
    const runtime = new DockerSessionRuntime({
      config: baseConfig,
      docker: docker as unknown as Docker
    });

    const sessions = await runtime.listSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].sessionId).toBe("s-1");
  });

  it("stopSession removes the container and returns true", async () => {
    const docker = new FakeDocker({ containers: [makeFakeContainer()] });
    const runtime = new DockerSessionRuntime({
      config: baseConfig,
      docker: docker as unknown as Docker
    });

    expect(await runtime.stopSession("s-1")).toBe(true);
    expect(docker.removed).toEqual(["container-id-1"]);
  });

  it("stopSession returns false when no container matches", async () => {
    const docker = new FakeDocker();
    const runtime = new DockerSessionRuntime({
      config: baseConfig,
      docker: docker as unknown as Docker
    });
    expect(await runtime.stopSession("s-1")).toBe(false);
  });

  it("pruneExpiredSessions removes only expired containers", async () => {
    const expired = makeFakeContainer({
      Id: "expired",
      Labels: encodeSessionLabels({
        sessionId: "expired",
        browser: "chromium",
        targetUrl: "https://example.com",
        createdAt: new Date("2026-04-30T11:00:00.000Z"),
        expiresAt: new Date("2026-04-30T11:30:00.000Z")
      })
    });
    const fresh = makeFakeContainer({
      Id: "fresh",
      Labels: encodeSessionLabels({
        sessionId: "fresh",
        browser: "chromium",
        targetUrl: "https://example.com",
        createdAt: new Date("2026-04-30T12:00:00.000Z"),
        expiresAt: new Date("2026-04-30T13:00:00.000Z")
      })
    });
    const docker = new FakeDocker({ containers: [expired, fresh] });
    const runtime = new DockerSessionRuntime({
      config: baseConfig,
      docker: docker as unknown as Docker
    });

    const pruned = await runtime.pruneExpiredSessions(new Date("2026-04-30T12:00:00.000Z"));
    expect(pruned).toBe(1);
    expect(docker.removed).toEqual(["expired"]);
  });

  it("createSession launches a container and returns a public Session", async () => {
    const docker = new FakeDocker({ nextContainerId: "abc" });
    const runtime = new DockerSessionRuntime({
      config: baseConfig,
      docker: docker as unknown as Docker
    });

    const session = await runtime.createSession({
      browser: "chromium",
      targetUrl: "https://example.com",
      ttlSeconds: 1800
    });

    expect(session.browser).toBe("chromium");
    expect(session.targetUrl).toBe("https://example.com");
    expect(session.browserUrl).toBe("https://localhost:32792");
    expect(session.sessionId).toMatch(/[0-9a-f-]{36}/);
    expect(docker.startedIds).toEqual(["abc"]);
    expect(docker.createCalls).toHaveLength(1);

    const call = docker.createCalls[0];
    expect(call.image).toBe("kasmweb/chromium:1.18.0");
    expect(call.exposedPorts).toEqual(["6901/tcp"]);
    expect(call.shmSize).toBe(1073741824);
    expect(call.env).toContain("LAUNCH_URL=https://example.com");
    expect(call.env).toContain("VNC_PW=pw");
    expect(call.labels["airlock.managed"]).toBe("true");
    expect(call.labels["airlock.session_id"]).toBe(session.sessionId);
    expect(call.labels["airlock.target_url"]).toBe("https://example.com");
  });

  it("createSession removes the container and throws when no host port is mapped", async () => {
    const docker = new FakeDocker({
      nextContainerId: "doomed",
      hostPortByContainerPort: { "6901/tcp": "" }
    });
    const runtime = new DockerSessionRuntime({
      config: baseConfig,
      docker: docker as unknown as Docker
    });

    await expect(
      runtime.createSession({
        browser: "chromium",
        targetUrl: "https://example.com",
        ttlSeconds: 1800
      })
    ).rejects.toThrow(/host port/i);

    expect(docker.removed).toEqual(["doomed"]);
  });

  it("ignores unmanaged containers", async () => {
    const unmanaged = makeFakeContainer({ Id: "u", Labels: {} });
    const docker = new FakeDocker({ containers: [unmanaged] });
    const runtime = new DockerSessionRuntime({
      config: baseConfig,
      docker: docker as unknown as Docker
    });

    expect(await runtime.getSession("u")).toBeNull();
    expect(await runtime.pruneExpiredSessions(new Date("2030-01-01T00:00:00.000Z"))).toBe(0);
  });
});
