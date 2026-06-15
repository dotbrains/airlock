// Persist the operator's access token in localStorage so a reload keeps the
// dashboard authenticated. The token is only ever sent to the same-origin API.
const STORAGE_KEY = "airlock.token";

export const readStoredToken = (): string => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
};

export const writeStoredToken = (token: string): void => {
  try {
    if (token) {
      window.localStorage.setItem(STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Private-mode browsers can throw on write; the in-memory token still works
    // for the current session.
  }
};
