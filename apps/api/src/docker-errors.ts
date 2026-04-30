interface DockerErrorShape {
  statusCode?: number;
  reason?: string;
  message?: string;
}

const asDockerError = (error: unknown): DockerErrorShape => {
  if (typeof error !== "object" || error === null) {
    return {};
  }
  const e = error as DockerErrorShape;
  return {
    statusCode: typeof e.statusCode === "number" ? e.statusCode : undefined,
    reason: typeof e.reason === "string" ? e.reason : undefined,
    message: typeof e.message === "string" ? e.message : undefined
  };
};

export const isContainerNotFound = (error: unknown): boolean => {
  const { statusCode, reason, message } = asDockerError(error);
  if (statusCode === 404) {
    return true;
  }
  if (reason && reason.toLowerCase().includes("no such container")) {
    return true;
  }
  if (message && message.toLowerCase().includes("no such container")) {
    return true;
  }
  return false;
};
