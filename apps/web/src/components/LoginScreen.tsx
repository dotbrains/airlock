import { FormEvent, useState } from "react";

export interface LoginScreenProps {
  error: string | null;
  onConnect: (token: string) => void;
}

export const LoginScreen = ({ error, onConnect }: LoginScreenProps): JSX.Element => {
  const [token, setToken] = useState("");

  const trimmed = token.trim();

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!trimmed) {
      return;
    }
    onConnect(trimmed);
  };

  return (
    <div className="screen screen--center">
      <form className="panel login" onSubmit={handleSubmit}>
        <div className="brand brand--stacked">
          <span className="brand__mark" aria-hidden="true">
            🔐
          </span>
          <span className="brand__name">Airlock</span>
        </div>
        <p className="muted">
          Enter your access token to manage disposable browser sessions. This is the
          <code> AIRLOCK_API_TOKEN</code> configured on the server.
        </p>
        <label className="field">
          <span className="field__label">Access token</span>
          <input
            className="field__input"
            type="password"
            autoComplete="current-password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="paste token"
            autoFocus
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="button button--primary" disabled={!trimmed}>
          Connect
        </button>
      </form>
    </div>
  );
};
