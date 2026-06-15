const DEFAULT_API_BASE_URL = "http://localhost:8787";

// Both Chrome MV3+ and Firefox expose browser.* APIs.
const extAPI = typeof browser !== "undefined" ? browser : chrome;

const input = document.getElementById("apiBaseUrl");
const tokenInput = document.getElementById("apiToken");
const saveButton = document.getElementById("save");
const status = document.getElementById("status");

const showStatus = (message) => {
  status.textContent = message;
  setTimeout(() => {
    status.textContent = "";
  }, 1500);
};

const restore = async () => {
  const { apiBaseUrl = DEFAULT_API_BASE_URL } = await extAPI.storage.sync.get("apiBaseUrl");
  // The token is kept in storage.local, not sync: storage.sync is replicated to
  // the browser vendor's servers, which a bearer secret should never touch.
  const { apiToken = "" } = await extAPI.storage.local.get("apiToken");
  input.value = apiBaseUrl;
  tokenInput.value = apiToken;
};

const save = async () => {
  const value = input.value.trim();
  if (!value) {
    showStatus("API URL cannot be empty.");
    return;
  }
  await extAPI.storage.sync.set({ apiBaseUrl: value });
  await extAPI.storage.local.set({ apiToken: tokenInput.value.trim() });
  showStatus("Saved.");
};

saveButton.addEventListener("click", () => {
  void save();
});

void restore();
