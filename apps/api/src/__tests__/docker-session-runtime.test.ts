import { describe, expect, it } from "vitest";
import type Docker from "dockerode";
import { encodeSessionLabels } from "@airlock/shared";
import { DockerSessionRuntime } from "../docker-session-runtime";
import type { AirlockConfig } from "../config";
import { makeTestConfig } from "./_config";

type ContainerSummary = Awaited<ReturnType<Docker["listContainers"]>>[number];

const baseConfig: AirlockConfig = makeTestConfig();

const makeFakeContainer = (overrides: Partial<ContainerSummary> = {}): ContainerSummary => {
  const labels = encodeSessionLabels({
    sessionId: "s-1",
    browser: "chromium",
    targetUrl: "https://example.com",
    vncPassword: "vnc-s-1",
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
  networkMode?: string;
  memory?: number;
  nanoCpus?: number;
  pidsLimit?: number;
  securityOpt?: string[];
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
  networksCreated: string[] = [];
  pulledImages: string[] = [];
  pingCount = 0;
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
    HostConfig: {
      ShmSize: number;
      NetworkMode?: string;
      Memory?: number;
      NanoCpus?: number;
      PidsLimit?: number;
      SecurityOpt?: string[];
    };
  }) => {
    this.createCalls.push({
      name: opts.name,
      image: opts.Image,
      env: opts.Env,
      labels: opts.Labels,
      exposedPorts: Object.keys(opts.ExposedPorts),
      shmSize: opts.HostConfig.ShmSize,
      networkMode: opts.HostConfig.NetworkMode,
      memory: opts.HostConfig.Memory,
      nanoCpus: opts.HostConfig.NanoCpus,
      pidsLimit: opts.HostConfig.PidsLimit,
      securityOpt: opts.HostConfig.SecurityOpt
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

  createNetwork = async (opts: { Name: string }): Promise<unknown> => {
    this.networksCreated.push(opts.Name);
    return {};
  };

  ping = async (): Promise<string> => {
    this.pingCount += 1;
    return "OK";
  };

  getImage = (_name: string) => ({
    inspect: async (): Promise<unknown> => ({ Id: "img" })
  });

  pull = async (image: string): Promise<unknown> => {
    this.pulledImages.push(image);
    return {};
  };

  modem = {
    followProgress: (_stream: unknown, onFinished: (error: Error | null) => void): void => {
      onFinished(null);
    }
  };
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
        vncPassword: "vnc-older",
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
        vncPassword: "vnc-newer",
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
        vncPassword: "vnc-expired",
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
        vncPassword: "vnc-fresh",
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
    // Each session gets a distinct, non-empty VNC password.
    expect(session.vncPassword.length).toBeGreaterThan(0);
    expect(docker.startedIds).toEqual(["abc"]);
    expect(docker.createCalls).toHaveLength(1);

    const call = docker.createCalls[0];
    expect(call.image).toBe("kasmweb/chromium:1.18.0");
    expect(call.exposedPorts).toEqual(["6901/tcp"]);
    expect(call.shmSize).toBe(1073741824);
    expect(call.env).toContain("LAUNCH_URL=https://example.com");
    // The launched password matches what the session reports back.
    expect(call.env).toContain(`VNC_PW=${session.vncPassword}`);
    expect(call.labels["airlock.managed"]).toBe("true");
    expect(call.labels["airlock.session_id"]).toBe(session.sessionId);
    expect(call.labels["airlock.target_url"]).toBe("https://example.com");
    expect(call.labels["airlock.vnc_password"]).toBe(session.vncPassword);
  });

  it("applies resource limits and privilege hardening", async () => {
    const docker = new FakeDocker();
    const runtime = new DockerSessionRuntime({
      config: baseConfig,
      docker: docker as unknown as Docker
    });

    await runtime.createSession({
      browser: "chromium",
      targetUrl: "https://example.com",
      ttlSeconds: 1800
    });

    const call = docker.createCalls[0];
    expect(call.memory).toBe(baseConfig.containerLaunch.memoryBytes);
    expect(call.nanoCpus).toBe(baseConfig.containerLaunch.nanoCpus);
    expect(call.pidsLimit).toBe(baseConfig.containerLaunch.pidsLimit);
    expect(call.securityOpt).toEqual(["no-new-privileges"]);
  });

  it("attaches sessions to the isolated network when enabled", async () => {
    const isolatedConfig: AirlockConfig = makeTestConfig({
      containerLaunch: {
        ...baseConfig.containerLaunch,
        networkIsolation: true,
        networkName: "airlock-net",
        egressProxy: "http://proxy.internal:3128"
      }
    });
    const docker = new FakeDocker();
    const runtime = new DockerSessionRuntime({
      config: isolatedConfig,
      docker: docker as unknown as Docker
    });

    await runtime.createSession({
      browser: "chromium",
      targetUrl: "https://example.com",
      ttlSeconds: 1800
    });

    expect(docker.networksCreated).toContain("airlock-net");
    const call = docker.createCalls[0];
    expect(call.networkMode).toBe("airlock-net");
    expect(call.env).toContain("HTTPS_PROXY=http://proxy.internal:3128");
  });

  it("ping reflects engine reachability", async () => {
    const docker = new FakeDocker();
    const runtime = new DockerSessionRuntime({
      config: baseConfig,
      docker: docker as unknown as Docker
    });
    expect(await runtime.ping()).toBe(true);
    expect(docker.pingCount).toBe(1);
  });

  it("extendSession pushes the expiry out and keeps the container from pruning", async () => {
    const docker = new FakeDocker({ containers: [makeFakeContainer()] });
    const runtime = new DockerSessionRuntime({
      config: baseConfig,
      docker: docker as unknown as Docker
    });

    // The label expiry is 2026-04-30T12:30:00Z; extend well past a later "now".
    const extended = await runtime.extendSession("s-1", 3600);
    expect(extended).not.toBeNull();
    expect(new Date(extended!.expiresAt).getTime()).toBeGreaterThan(
      new Date("2026-04-30T13:00:00.000Z").getTime()
    );

    // At a time past the original label expiry, the extended session survives.
    const pruned = await runtime.pruneExpiredSessions(new Date("2026-04-30T12:45:00.000Z"));
    expect(pruned).toBe(0);
    expect(docker.removed).toEqual([]);
  });

  it("extendSession returns null for an unknown session", async () => {
    const docker = new FakeDocker({ containers: [makeFakeContainer()] });
    const runtime = new DockerSessionRuntime({
      config: baseConfig,
      docker: docker as unknown as Docker
    });
    expect(await runtime.extendSession("missing", 600)).toBeNull();
  });

  it("pullBrowserImages pulls each unique configured image", async () => {
    const docker = new FakeDocker();
    const runtime = new DockerSessionRuntime({
      config: baseConfig,
      docker: docker as unknown as Docker
    });

    const results = await runtime.pullBrowserImages();
    expect(results.every((r) => r.ok)).toBe(true);
    expect(docker.pulledImages).toContain("kasmweb/chromium:1.18.0");
    expect(docker.pulledImages).toContain("kasmweb/tor-browser:1.18.0");
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
