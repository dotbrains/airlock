import { useCallback, useEffect, useMemo, useState } from "react";
import { LaunchForm } from "./components/LaunchForm";
import { LoginScreen } from "./components/LoginScreen";
import { SessionList } from "./components/SessionList";
import { SessionViewer } from "./components/SessionViewer";
import {
  AirlockApiError,
  AirlockMeta,
  CreateSessionInput,
  SessionResponse,
  createAirlockClient
} from "./lib/api";
import { readStoredToken, writeStoredToken } from "./lib/token-storage";

const POLL_INTERVAL_MS = 4000;

type AuthState = "checking" | "needs-token" | "ready";

export const App = (): JSX.Element => {
  const [token, setToken] = useState<string>(() => readStoredToken());
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [authError, setAuthError] = useState<string | null>(null);
  const [meta, setMeta] = useState<AirlockMeta | null>(null);
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [pullState, setPullState] = useState<"idle" | "pulling" | "done">("idle");

  const client = useMemo(() => createAirlockClient({ token: token || undefined }), [token]);

  const refreshSessions = useCallback(async () => {
    try {
      setSessions(await client.listSessions());
      setListError(null);
    } catch (error) {
      setListError(messageOf(error));
    }
  }, [client]);

  // Validate the token (if any) by fetching meta. A 401 routes to the login
  // screen; anything else surfaces as a connection error worth retrying.
  useEffect(() => {
    let cancelled = false;
    setAuthState("checking");
    client
      .getMeta()
      .then((value) => {
        if (cancelled) {
          return;
        }
        setMeta(value);
        setAuthError(null);
        setAuthState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        if (error instanceof AirlockApiError && error.status === 401) {
          setAuthState("needs-token");
          setAuthError(token ? "That token was rejected." : null);
          return;
        }
        setAuthState("needs-token");
        setAuthError(messageOf(error));
      });
    return () => {
      cancelled = true;
    };
  }, [client, token]);

  // Poll the active session list while authenticated.
  useEffect(() => {
    if (authState !== "ready") {
      return;
    }
    void refreshSessions();
    const handle = window.setInterval(() => void refreshSessions(), POLL_INTERVAL_MS);
    return () => window.clearInterval(handle);
  }, [authState, refreshSessions]);

  const handleConnect = (candidate: string): void => {
    writeStoredToken(candidate);
    setToken(candidate);
  };

  const handleSignOut = (): void => {
    writeStoredToken("");
    setToken("");
    setMeta(null);
    setSessions([]);
    setActiveSessionId(null);
  };

  const handleLaunch = async (input: CreateSessionInput): Promise<void> => {
    setLaunching(true);
    setLaunchError(null);
    try {
      const session = await client.createSession(input);
      await refreshSessions();
      setActiveSessionId(session.sessionId);
    } catch (error) {
      setLaunchError(messageOf(error));
    } finally {
      setLaunching(false);
    }
  };

  const handleExtend = async (sessionId: string, ttlSeconds: number): Promise<void> => {
    setExtendingId(sessionId);
    try {
      await client.extendSession(sessionId, ttlSeconds);
      await refreshSessions();
    } catch (error) {
      setListError(messageOf(error));
    } finally {
      setExtendingId(null);
    }
  };

  const handlePullImages = async (): Promise<void> => {
    setPullState("pulling");
    try {
      await client.pullImages();
      setPullState("done");
      window.setTimeout(() => setPullState("idle"), 3000);
    } catch (error) {
      setLaunchError(messageOf(error));
      setPullState("idle");
    }
  };

  const handleTerminate = async (sessionId: string): Promise<void> => {
    setTerminatingId(sessionId);
    try {
      await client.stopSession(sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
      await refreshSessions();
    } catch (error) {
      setListError(messageOf(error));
    } finally {
      setTerminatingId(null);
    }
  };

  const activeSession = sessions.find((session) => session.sessionId === activeSessionId) ?? null;

  if (authState === "checking") {
    return (
      <div className="screen screen--center">
        <p className="muted">Connecting to Airlock…</p>
      </div>
    );
  }

  if (authState === "needs-token") {
    return <LoginScreen error={authError} onConnect={handleConnect} />;
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            🔐
          </span>
          <span className="brand__name">Airlock</span>
          <span className="brand__tag">disposable browsers, local-first</span>
        </div>
        <button type="button" className="button button--ghost" onClick={handleSignOut}>
          Sign out
        </button>
      </header>

      <main className="app__main">
        {activeSession ? (
          <SessionViewer session={activeSession} onClose={() => setActiveSessionId(null)} />
        ) : (
          <div className="grid">
            <section className="panel">
              <h2 className="panel__title">Launch a disposable browser</h2>
              {meta ? (
                <LaunchForm
                  meta={meta}
                  launching={launching}
                  error={launchError}
                  onLaunch={handleLaunch}
                />
              ) : null}
              <div className="panel__footer">
                <button
                  type="button"
                  className="button button--small button--ghost"
                  disabled={pullState === "pulling"}
                  onClick={() => void handlePullImages()}
                >
                  {pullState === "pulling"
                    ? "Pulling images…"
                    : pullState === "done"
                      ? "Images ready"
                      : "Pre-pull browser images"}
                </button>
                <span className="muted">Warm the Kasm images so the first launch is fast.</span>
              </div>
            </section>

            <section className="panel">
              <h2 className="panel__title">
                Active sessions <span className="badge">{sessions.length}</span>
              </h2>
              {listError ? <p className="error">{listError}</p> : null}
              <SessionList
                sessions={sessions}
                terminatingId={terminatingId}
                extendingId={extendingId}
                onOpen={(id) => setActiveSessionId(id)}
                onExtend={handleExtend}
                onTerminate={handleTerminate}
              />
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : "Something went wrong.";
