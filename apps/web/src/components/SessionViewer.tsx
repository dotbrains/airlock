import { useState } from "react";
import { SessionResponse } from "../lib/api";

export interface SessionViewerProps {
  session: SessionResponse;
  onClose: () => void;
}

export const SessionViewer = ({ session, onClose }: SessionViewerProps): JSX.Element => {
  // Bumping the key remounts the iframe, forcing a fresh connection to the
  // stream — the manual "reconnect" when a session drops or the cert is
  // accepted in another tab.
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="viewer">
      <div className="viewer__bar">
        <button type="button" className="button button--ghost" onClick={onClose}>
          ← Back
        </button>
        <span className="viewer__url" title={session.targetUrl}>
          {session.browser} · {session.targetUrl}
        </span>
        <button
          type="button"
          className="button button--small"
          onClick={() => setReloadKey((key) => key + 1)}
        >
          ⟳ Reload stream
        </button>
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
        key={reloadKey}
        className="viewer__frame"
        title={`Airlock session ${session.sessionId}`}
        src={session.browserUrl}
        allow="clipboard-read; clipboard-write; fullscreen"
      />
      <p className="viewer__hint muted">
        The browser streams over the container&apos;s self-signed TLS certificate. If the frame
        stays blank, open it in a new tab once to accept the certificate, then Reload stream.
        Clipboard sync and file upload/download are available from the Kasm control bar inside the
        stream (the tab on the left edge).
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
