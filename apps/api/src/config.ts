import {
  BROWSER_KINDS,
  BrowserKind,
  TTL_DEFAULT_SECONDS,
  clampTtl,
  defaultBrowserImage,
  isBrowserKind,
  toInteger,
  trimTrailingSlash
} from "@airlock/shared";

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const toFloat = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const browserImageEnvKey = (kind: BrowserKind): string => `AIRLOCK_IMAGE_${kind.toUpperCase()}`;

export interface ServerConfig {
  port: number;
  bindHost: string;
  publicBaseUrl: string;
  sessionHost: string;
  webDir?: string;
}

export interface SessionDefaultsConfig {
  ttlSeconds: number;
  browser: BrowserKind;
}

export interface ContainerLaunchConfig {
  dockerSocketPath: string;
  dockerHost?: string;
  dockerCertPath?: string;
  shmSizeBytes: number;
  browserImages: Record<BrowserKind, string>;
  vncPassword: string;
  // Per-container resource caps. A value of 0 means "no limit".
  memoryBytes: number;
  nanoCpus: number;
  pidsLimit: number;
  // Network isolation: when enabled, sessions attach to a dedicated bridge
  // network (inter-container communication disabled) instead of the default
  // bridge, so they cannot reach unrelated containers. egressProxy, when set,
  // is injected as HTTP(S)_PROXY so all browser traffic routes through it.
  networkIsolation: boolean;
  networkName: string;
  egressProxy?: string;
}

export interface LimitsConfig {
  maxSessions: number;
  rateLimitWindowMs: number;
  rateLimitMax: number;
}

export interface AuthConfig {
  token?: string;
}

export interface InternalConfig {
  token?: string;
}

export interface AirlockConfig {
  server: ServerConfig;
  sessionDefaults: SessionDefaultsConfig;
  containerLaunch: ContainerLaunchConfig;
  limits: LimitsConfig;
  auth: AuthConfig;
  internal: InternalConfig;
}

const GIB = 1_073_741_824;

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): AirlockConfig => {
  const port = toInteger(env.AIRLOCK_PORT, 8787);
  const publicBaseUrl = trimTrailingSlash(
    env.AIRLOCK_PUBLIC_BASE_URL ?? `http://localhost:${port}`
  );
  const requestedDefaultBrowser = env.AIRLOCK_DEFAULT_BROWSER ?? "chromium";
  const defaultBrowser = isBrowserKind(requestedDefaultBrowser)
    ? requestedDefaultBrowser
    : "chromium";

  const browserImages = {} as Record<BrowserKind, string>;
  for (const kind of BROWSER_KINDS) {
    browserImages[kind] = env[browserImageEnvKey(kind)] ?? defaultBrowserImage(kind);
  }

  const cpus = Math.max(0, toFloat(env.AIRLOCK_SESSION_CPUS, 2));

  return {
    server: {
      port,
      bindHost: env.AIRLOCK_BIND_HOST ?? "0.0.0.0",
      publicBaseUrl,
      sessionHost: env.AIRLOCK_SESSION_HOST ?? "localhost",
      webDir: env.AIRLOCK_WEB_DIR
    },
    sessionDefaults: {
      ttlSeconds: clampTtl(toInteger(env.AIRLOCK_DEFAULT_TTL_SECONDS, TTL_DEFAULT_SECONDS)),
      browser: defaultBrowser
    },
    containerLaunch: {
      dockerSocketPath: env.AIRLOCK_DOCKER_SOCKET_PATH ?? "/var/run/docker.sock",
      dockerHost: env.AIRLOCK_DOCKER_HOST,
      dockerCertPath: env.AIRLOCK_DOCKER_CERT_PATH,
      shmSizeBytes: clamp(toInteger(env.AIRLOCK_SHM_SIZE_BYTES, GIB), 268435456, 4 * GIB),
      browserImages,
      vncPassword: env.AIRLOCK_VNC_PASSWORD ?? "change-me",
      memoryBytes: Math.max(0, toInteger(env.AIRLOCK_SESSION_MEMORY_BYTES, 2 * GIB)),
      nanoCpus: Math.round(cpus * 1_000_000_000),
      pidsLimit: Math.max(0, toInteger(env.AIRLOCK_SESSION_PIDS_LIMIT, 512)),
      networkIsolation: toBoolean(env.AIRLOCK_NETWORK_ISOLATION, true),
      networkName: env.AIRLOCK_NETWORK_NAME ?? "airlock",
      egressProxy: env.AIRLOCK_EGRESS_PROXY
    },
    limits: {
      maxSessions: Math.max(0, toInteger(env.AIRLOCK_MAX_SESSIONS, 25)),
      rateLimitWindowMs: Math.max(1000, toInteger(env.AIRLOCK_RATE_LIMIT_WINDOW_MS, 60_000)),
      rateLimitMax: Math.max(0, toInteger(env.AIRLOCK_RATE_LIMIT_MAX, 30))
    },
    auth: {
      token: env.AIRLOCK_API_TOKEN
    },
    internal: {
      token: env.AIRLOCK_INTERNAL_TOKEN
    }
  };
};
