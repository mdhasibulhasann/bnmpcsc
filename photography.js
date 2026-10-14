(() => {
  "use strict";

  /* ===========================================================
     01. CONFIGURATION AND PRIVATE SESSION STATE
     =========================================================== */
  const config = window.BNMPC_CONFIG || {};
  const endpoint = String(config.googleAppsScriptUrl || "").trim();
  const byId = id => document.getElementById(id);
  const accessPanel = byId("photography-access");
  const dashboard = byId("photography-dashboard");
  const pinForm = byId("photography-pin-form");
  const pinInput = byId("photography-pin");
  const pinMessage = byId("photography-pin-message");
  const refreshButton = byId("photography-refresh");
  const lockButton = byId("photography-lock");
  const filterBar = byId("photography-filters");
  const grid = byId("photography-grid");
  const emptyState = byId("photography-empty");
  const loadingState = byId("photography-loading");
  const dashboardMessage = byId("photography-dashboard-message");
  const serviceStatus = byId("photography-service-status");

  let organizerPin = "";
  let entries = [];
  let activeFilter = "all";

  const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const normalizedKey = value => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const objectValue = (object, key) => {
    const source = object && typeof object === "object" ? object : {};
    const wanted = normalizedKey(key);
    const matchedKey = Object.keys(source).find(item => normalizedKey(item) === wanted);
    return matchedKey ? source[matchedKey] : "";
  };

  /* ===========================================================
     02. GOOGLE APPS SCRIPT BRIDGE: FETCH + JSONP FALLBACK
     =========================================================== */
  const buildUrl = (action, parameters = {}) => {
    const url = new URL(endpoint);
    url.searchParams.set("action", action);
    url.searchParams.set("_", Date.now().toString());
    Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, String(value ?? "")));
    return url;
  };

  const fetchRequest = async (action, parameters) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(buildUrl(action, parameters).href, {
        method: "GET", mode: "cors", cache: "no-store", redirect: "follow", signal: controller.signal
      });
      if (!response.ok) throw new Error(`Service returned ${response.status}.`);
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  };

  const jsonpRequest = (action, parameters) => new Promise((resolve, reject) => {
    const callbackName = `bnmpcPhotography_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const url = buildUrl(action, parameters);
    url.searchParams.set("callback", callbackName);
    const cleanup = () => { clearTimeout(timeout); script.remove(); delete window[callbackName]; };
    const timeout = setTimeout(() => { cleanup(); reject(new Error("The registration service timed out.")); }, 30000);
    window[callbackName] = response => { cleanup(); resolve(response); };
    script.onerror = () => { cleanup(); reject(new Error("The registration service could not be reached.")); };
    script.src = url.href;
    document.head.appendChild(script);
  });

  const requestBackend = async (action, parameters = {}) => {
    if (!endpoint) throw new Error("Google Sheets endpoint is not configured.");
    try { return await fetchRequest(action, parameters); }
    catch (fetchError) { return await jsonpRequest(action, parameters); }
  };

  /* ===========================================================
     03. AUTHENTICATION, LOADING AND SAFE DATA NORMALIZATION
     =========================================================== */
  const showPinError = message => {
    pinMessage.textContent = message;
    pinMessage.hidden = false;
    pinInput.setAttribute("aria-invalid", "true");
  };

  const normalizeEntry = item => {
    const fields = item.entryFields && typeof item.entryFields === "object" ? item.entryFields : {};
    const rawCategory = String(objectValue(fields, "photographyCategory") || "").trim();
    const category = /dslr/i.test(rawCategory) ? "dslr" : "mobile";
    const member = Array.isArray(item.members) && item.members.length ? item.members[0] : {};
    const rawLink = String(objectValue(fields, "pictureDriveLink") || "").trim();
    let driveLink = "";
    try {
      const parsed = new URL(rawLink);
      if (["drive.google.com", "docs.google.com"].includes(parsed.hostname.toLowerCase())) driveLink = parsed.href;
    } catch (error) {
      driveLink = "";
    }

    return {
      registrationId: String(item.registrationId || "—"),
      category,
      categoryLabel: category === "dslr" ? "DSLR Photography" : "Mobile Photography",
      name: String(item.leadName || member.name || "Unnamed participant"),
      institution: String((item.institutions || [])[0] || member.institution || "Institution not provided"),
      driveLink
    };
  };

  pinForm.addEventListener("submit", async event => {
    event.preventDefault();
    const pin = pinInput.value.trim();
    pinMessage.hidden = true;
    pinInput.removeAttribute("aria-invalid");
    if (!/^\d{4,12}$/.test(pin)) return showPinError("Enter a valid organizer PIN.");

    const button = pinForm.querySelector("button[type='submit']");
    button.disabled = true;
    button.textContent = "Checking…";
    try {
      const response = await requestBackend("gaming-auth", { pin });
      if (!response?.ok || !response?.authorized) throw new Error("Incorrect organizer PIN.");
      organizerPin = pin;
      accessPanel.hidden = true;
      dashboard.hidden = false;
      await loadEntries();
    } catch (error) {
      showPinError(error.message || "Access could not be verified.");
      pinInput.select();
    } finally {
      button.disabled = false;
      button.textContent = "Unlock";
    }
  });

  const loadEntries = async () => {
    loadingState.hidden = false;
    grid.hidden = true;
    emptyState.hidden = true;
    dashboardMessage.hidden = true;
    refreshButton.disabled = true;
    serviceStatus.textContent = "Loading secure records…";
    try {
      const response = await requestBackend("gaming-payments-list", { pin: organizerPin, scope: "organizer" });
      if (!response?.ok || !response?.authorized) throw new Error("Organizer access expired. Lock and sign in again.");
      entries = (Array.isArray(response.payments) ? response.payments : [])
        .filter(item => String(item.segment || "").trim() === "Photography Exhibition")
        .map(normalizeEntry);
      updateCounts();
      renderEntries();
      serviceStatus.textContent = `${entries.length.toLocaleString("en-BD")} photography submission${entries.length === 1 ? "" : "s"}`;
    } catch (error) {
      dashboardMessage.textContent = error.message || "Photography submissions could not be loaded.";
      dashboardMessage.hidden = false;
      serviceStatus.textContent = "Connection problem";
    } finally {
      loadingState.hidden = true;
      refreshButton.disabled = false;
    }
  };

  /* ===========================================================
     04. CATEGORY FILTERS AND PARTICIPANT CARDS
     =========================================================== */
  const updateCounts = () => {
    byId("photography-count-all").textContent = entries.length.toLocaleString("en-BD");
    byId("photography-count-mobile").textContent = entries.filter(entry => entry.category === "mobile").length.toLocaleString("en-BD");
    byId("photography-count-dslr").textContent = entries.filter(entry => entry.category === "dslr").length.toLocaleString("en-BD");
  };

  const renderEntries = () => {
    const visibleEntries = activeFilter === "all" ? entries : entries.filter(entry => entry.category === activeFilter);
    grid.innerHTML = visibleEntries.map(entry => `
      <article class="photography-card" data-category="${entry.category}">
        <div class="photography-card-top">
          <span class="photography-category">${escapeHtml(entry.categoryLabel)}</span>
          <span class="photography-registration-id">${escapeHtml(entry.registrationId)}</span>
        </div>
        <h2>${escapeHtml(entry.name)}</h2>
        <p class="photography-institution">${escapeHtml(entry.institution)}</p>
        ${entry.driveLink
          ? `<a class="photography-link" href="${escapeHtml(entry.driveLink)}" target="_blank" rel="noopener noreferrer">Open Link</a>`
          : `<span class="photography-link" aria-disabled="true">Link unavailable</span>`}
      </article>
    `).join("");
    grid.hidden = visibleEntries.length === 0;
    emptyState.hidden = visibleEntries.length !== 0;
  };

  filterBar.addEventListener("click", event => {
    const button = event.target.closest("[data-photography-filter]");
    if (!button) return;
    activeFilter = button.dataset.photographyFilter;
    filterBar.querySelectorAll("button").forEach(item => item.classList.toggle("active", item === button));
    renderEntries();
  });

  refreshButton.addEventListener("click", loadEntries);
  lockButton.addEventListener("click", () => {
    organizerPin = "";
    entries = [];
    pinInput.value = "";
    dashboard.hidden = true;
    accessPanel.hidden = false;
    grid.innerHTML = "";
    pinInput.focus();
  });
})();
