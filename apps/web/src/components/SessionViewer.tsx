import { SessionResponse } from "../lib/api";

export interface SessionViewerProps {
  session: SessionResponse;
  onClose: () => void;
}

export const SessionViewer = ({ session, onClose }: SessionViewerProps): JSX.Element => {
  return (
    <div className="viewer">
      <div className="viewer__bar">
        <button type="button" className="button button--ghost" onClick={onClose}>
          ← Back
        </button>
        <span className="viewer__url" title={session.targetUrl}>
          {session.browser} · {session.targetUrl}
        </span>
        <a
          className="button button--small"
          href={session.browserUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open in new tab ↗
        </a>
      </div>
      <iframe
        className="viewer__frame"
        title={`Airlock session ${session.sessionId}`}
        src={session.browserUrl}
        allow="clipboard-read; clipboard-write; fullscreen"
      />
      <p className="viewer__hint muted">
        The browser streams over the container&apos;s self-signed TLS certificate. If the frame
        stays blank, open it in a new tab once to accept the certificate, then return here.
        {session.vncPassword ? (
          <>
            {" "}
            If prompted for a password, use <code>{session.vncPassword}</code> — it is unique to
            this session.
          </>
        ) : null}
      </p>
    </div>
  );
};
