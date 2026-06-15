// Format the time remaining until a session expires as a compact "12m 30s"
// string. Returns "expired" once the deadline has passed.
export const formatTimeRemaining = (expiresAt: string, now: number = Date.now()): string => {
  const remainingMs = new Date(expiresAt).getTime() - now;
  if (Number.isNaN(remainingMs) || remainingMs <= 0) {
    return "expired";
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};
