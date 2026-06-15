import { FormEvent, useState } from "react";
import { AirlockMeta, CreateSessionInput } from "../lib/api";

export interface LaunchFormProps {
  meta: AirlockMeta;
  launching: boolean;
  error: string | null;
  onLaunch: (input: CreateSessionInput) => void;
}

const BROWSER_LABELS: Record<string, string> = {
  chromium: "Chromium",
  chrome: "Chrome",
  firefox: "Firefox",
  edge: "Edge",
  brave: "Brave",
  vivaldi: "Vivaldi",
  tor: "Tor Browser"
};

const labelFor = (browser: string): string => BROWSER_LABELS[browser] ?? browser;

export const LaunchForm = ({ meta, launching, error, onLaunch }: LaunchFormProps): JSX.Element => {
  const [targetUrl, setTargetUrl] = useState("https://");
  const [browser, setBrowser] = useState(meta.defaultBrowser);
  const [ttlMinutes, setTtlMinutes] = useState(Math.round(meta.defaultTtlSeconds / 60));

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onLaunch({
      targetUrl: targetUrl.trim(),
      browser,
      ttlSeconds: clampTtl(ttlMinutes * 60, meta)
    });
  };

  return (
    <form className="launch" onSubmit={handleSubmit}>
      <label className="field">
        <span className="field__label">URL to open</span>
        <input
          className="field__input"
          type="url"
          required
          value={targetUrl}
          onChange={(event) => setTargetUrl(event.target.value)}
          placeholder="https://example.com"
        />
      </label>

      <div className="launch__row">
        <label className="field">
          <span className="field__label">Browser</span>
          <select
            className="field__input"
            value={browser}
            onChange={(event) => setBrowser(event.target.value)}
          >
            {meta.browsers.map((kind) => (
              <option key={kind} value={kind}>
                {labelFor(kind)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Lifetime (minutes)</span>
          <input
            className="field__input"
            type="number"
            min={Math.ceil(meta.ttlMinSeconds / 60)}
            max={Math.floor(meta.ttlMaxSeconds / 60)}
            value={ttlMinutes}
            onChange={(event) => setTtlMinutes(Number(event.target.value))}
          />
        </label>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <button type="submit" className="button button--primary" disabled={launching}>
        {launching ? "Launching…" : "Launch session"}
      </button>
    </form>
  );
};

const clampTtl = (seconds: number, meta: AirlockMeta): number =>
  Math.max(meta.ttlMinSeconds, Math.min(meta.ttlMaxSeconds, seconds));
