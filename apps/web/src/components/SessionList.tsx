import { useEffect, useState } from "react";
import { SessionResponse } from "../lib/api";
import { formatTimeRemaining } from "../lib/time";

// Minutes added when the operator clicks "Extend".
const EXTEND_SECONDS = 15 * 60;

export interface SessionListProps {
  sessions: SessionResponse[];
  terminatingId: string | null;
  extendingId: string | null;
  onOpen: (sessionId: string) => void;
  onExtend: (sessionId: string, ttlSeconds: number) => void;
  onTerminate: (sessionId: string) => void;
}

export const SessionList = ({
  sessions,
  terminatingId,
  extendingId,
  onOpen,
  onExtend,
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
            <CopyLinkButton url={session.sessionUrl} />
            <button
              type="button"
              className="button button--small"
              disabled={extendingId === session.sessionId}
              onClick={() => onExtend(session.sessionId, EXTEND_SECONDS)}
            >
              {extendingId === session.sessionId ? "Extending…" : "+15m"}
            </button>
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

const CopyLinkButton = ({ url }: { url: string }): JSX.Element => {
  const [copied, setCopied] = useState(false);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied; leave the label unchanged.
    }
  };

  return (
    <button type="button" className="button button--small" onClick={() => void copy()}>
      {copied ? "Copied" : "Copy link"}
    </button>
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
