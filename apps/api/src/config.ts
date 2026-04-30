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

const browserImageEnvKey = (kind: BrowserKind): string => `AIRLOCK_IMAGE_${kind.toUpperCase()}`;

export interface ServerConfig {
  port: number;
  publicBaseUrl: string;
  sessionHost: string;
}

export interface SessionDefaultsConfig {
  ttlSeconds: number;
  browser: BrowserKind;
}

export interface ContainerLaunchConfig {
  dockerSocketPath: string;
  shmSizeBytes: number;
  browserImages: Record<BrowserKind, string>;
  vncPassword: string;
}

export interface InternalConfig {
  token?: string;
}

export interface AirlockConfig {
  server: ServerConfig;
  sessionDefaults: SessionDefaultsConfig;
  containerLaunch: ContainerLaunchConfig;
  internal: InternalConfig;
}

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

  return {
    server: {
      port,
      publicBaseUrl,
      sessionHost: env.AIRLOCK_SESSION_HOST ?? "localhost"
    },
    sessionDefaults: {
      ttlSeconds: clampTtl(toInteger(env.AIRLOCK_DEFAULT_TTL_SECONDS, TTL_DEFAULT_SECONDS)),
      browser: defaultBrowser
    },
    containerLaunch: {
      dockerSocketPath: env.AIRLOCK_DOCKER_SOCKET_PATH ?? "/var/run/docker.sock",
      shmSizeBytes: clamp(toInteger(env.AIRLOCK_SHM_SIZE_BYTES, 1073741824), 268435456, 4294967296),
      browserImages,
      vncPassword: env.AIRLOCK_VNC_PASSWORD ?? "change-me"
    },
    internal: {
      token: env.AIRLOCK_INTERNAL_TOKEN
    }
  };
};
