const CONTEXT_MENU_ID = "airlock-open-in-disposable-browser";
const DEFAULT_API_BASE_URL = "http://localhost:8787";

// Both Chrome MV3+ and Firefox expose browser.* APIs.
// Firefox provides native promise-based APIs; Chrome provides
// them as promise-wrapped aliases of chrome.*.
const extAPI = typeof browser !== "undefined" ? browser : chrome;

const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

const openErrorTab = async (message) => {
  const html = `
    <html>
      <body style="font-family: sans-serif; margin: 24px;">
        <h2>Airlock Extension Error</h2>
        <p>${message}</p>
        <p>Open extension options and confirm your API URL is correct.</p>
      </body>
    </html>
  `;
  await extAPI.tabs.create({
    url: `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
  });
};

const createSession = async (targetUrl) => {
  const { apiBaseUrl = DEFAULT_API_BASE_URL, apiToken = "" } = await extAPI.storage.sync.get([
    "apiBaseUrl",
    "apiToken"
  ]);
  const baseUrl = trimTrailingSlash(apiBaseUrl);
  const headers = {
    "content-type": "application/json"
  };
  // Send the bearer token when configured so a token-protected API accepts the
  // request; without it the API returns 401.
  if (apiToken) {
    headers.authorization = `Bearer ${apiToken}`;
  }
  const response = await fetch(`${baseUrl}/api/sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      targetUrl
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API request failed with ${response.status}: ${body}`);
  }

  return response.json();
};

extAPI.runtime.onInstalled.addListener(() => {
  extAPI.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "Open in Airlock",
    contexts: ["link"]
  });
});

extAPI.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== CONTEXT_MENU_ID || !info.linkUrl) {
    return;
  }

  try {
    const payload = await createSession(info.linkUrl);
    if (!payload.sessionUrl) {
      throw new Error("Session created without a sessionUrl.");
    }
    await extAPI.tabs.create({
      url: payload.sessionUrl
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await openErrorTab(message);
  }
});
