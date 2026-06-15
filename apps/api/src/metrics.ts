// Tiny in-process metrics registry rendered in Prometheus text format. Counters
// are monotonic process-lifetime totals; the active-sessions gauge is sampled
// at scrape time from the runtime so it never drifts from reality.

export interface MetricsSnapshot {
  sessionsCreated: number;
  sessionsStopped: number;
  sessionsExpired: number;
  sessionCreateFailures: number;
}

export class Metrics {
  private created = 0;
  private stopped = 0;
  private expired = 0;
  private createFailures = 0;

  recordCreated(): void {
    this.created += 1;
  }
  recordStopped(): void {
    this.stopped += 1;
  }
  recordExpired(count: number): void {
    this.expired += count;
  }
  recordCreateFailure(): void {
    this.createFailures += 1;
  }

  snapshot(): MetricsSnapshot {
    return {
      sessionsCreated: this.created,
      sessionsStopped: this.stopped,
      sessionsExpired: this.expired,
      sessionCreateFailures: this.createFailures
    };
  }

  render(activeSessions: number): string {
    const lines = [
      "# HELP airlock_sessions_active Currently running browser sessions.",
      "# TYPE airlock_sessions_active gauge",
      `airlock_sessions_active ${activeSessions}`,
      "# HELP airlock_sessions_created_total Sessions created since process start.",
      "# TYPE airlock_sessions_created_total counter",
      `airlock_sessions_created_total ${this.created}`,
      "# HELP airlock_sessions_stopped_total Sessions explicitly stopped.",
      "# TYPE airlock_sessions_stopped_total counter",
      `airlock_sessions_stopped_total ${this.stopped}`,
      "# HELP airlock_sessions_expired_total Sessions reaped after expiry.",
      "# TYPE airlock_sessions_expired_total counter",
      `airlock_sessions_expired_total ${this.expired}`,
      "# HELP airlock_session_create_failures_total Failed session creations.",
      "# TYPE airlock_session_create_failures_total counter",
      `airlock_session_create_failures_total ${this.createFailures}`
    ];
    return `${lines.join("\n")}\n`;
  }
}
