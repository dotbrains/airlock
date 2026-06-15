import { useEffect, useState } from "react";
import { SessionResponse } from "../lib/api";
import { formatTimeRemaining } from "../lib/time";

export interface SessionListProps {
  sessions: SessionResponse[];
  terminatingId: string | null;
  onOpen: (sessionId: string) => void;
  onTerminate: (sessionId: string) => void;
}

export const SessionList = ({
  sessions,
  terminatingId,
  onOpen,
  onTerminate
}: SessionListProps): JSX.Element => {
  const now = useTick(1000);

  if (sessions.length === 0) {
    return <p className="muted">No active sessions. Launch one to get started.</p>;
  }

  return (
    <ul className="sessions">
      {sessions.map((session) => (
        <li key={session.sessionId} className="session">
          <div className="session__info">
            <span className="session__browser">{session.browser}</span>
            <span className="session__url" title={session.targetUrl}>
              {session.targetUrl}
            </span>
            <span className="session__ttl">{formatTimeRemaining(session.expiresAt, now)} left</span>
          </div>
          <div className="session__actions">
            <button
              type="button"
              className="button button--small"
              onClick={() => onOpen(session.sessionId)}
            >
              Open
            </button>
            <button
              type="button"
              className="button button--small button--danger"
              disabled={terminatingId === session.sessionId}
              onClick={() => onTerminate(session.sessionId)}
            >
              {terminatingId === session.sessionId ? "Ending…" : "Terminate"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};

// Re-render on an interval so the "time left" labels count down live.
const useTick = (intervalMs: number): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const handle = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(handle);
  }, [intervalMs]);
  return now;
};
