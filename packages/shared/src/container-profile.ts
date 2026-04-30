export interface LaunchEnvInput {
  targetUrl: string;
  vncPassword?: string;
}

export interface ContainerImageProfile {
  containerPort: number;
  buildLaunchEnv(input: LaunchEnvInput): Record<string, string>;
  streamUrl(host: string, hostPort: number): string;
}

export const KASM_PROFILE: ContainerImageProfile = {
  containerPort: 6901,
  buildLaunchEnv: ({ targetUrl, vncPassword }) => ({
    VNC_PW: vncPassword ?? "",
    LAUNCH_URL: targetUrl
  }),
  streamUrl: (host, hostPort) => `https://${host}:${hostPort}`
};
