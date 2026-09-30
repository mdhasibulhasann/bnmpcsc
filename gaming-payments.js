(() => {
  "use strict";

  /* ===========================================================
     01. CONFIGURATION AND SESSION STATE
     =========================================================== */
  const config = window.BNMPC_CONFIG || {};
  const endpoint = String(config.googleAppsScriptUrl || "").trim();
  const byId = id => document.getElementById(id);
  const accessCard = byId("gaming-access-card");
  const dashboard = byId("gaming-dashboard");
  const pinForm = byId("gaming-pin-form");
  const pinInput = byId("gaming-pin");
  const pinMessage = byId("gaming-pin-message");
  const refreshButton = byId("refresh-payments");
  const lockButton = byId("gaming-lock-button");
  const filterBar = byId("payment-filter-bar");
  const reviewGrid = byId("payment-review-grid");
  const loadingState = byId("payment-loading");
  const dashboardError = byId("gaming-dashboard-error");

  let committeePin = "";
  let payments = [];
  let activeFilter = "Pending";

  const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

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
        method: "GET",
        mode: "cors",
        cache: "no-store",
        redirect: "follow",
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Service returned ${response.status}.`);
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  };

  const jsonpRequest = (action, parameters) => new Promise((resolve, reject) => {
    const callbackName = `bnmpcGaming_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const url = buildUrl(action, parameters);
    url.searchParams.set("callback", callbackName);

    const cleanup = () => {
      clearTimeout(timeout);
      script.remove();
      delete window[callbackName];
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("The payment service timed out."));
    }, 30000);

    window[callbackName] = response => {
      cleanup();
      resolve(response);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("The payment service could not be reached."));
    };
    script.src = url.href;
    document.head.appendChild(script);
  });

  const requestBackend = async (action, parameters = {}) => {
    if (!endpoint) throw new Error("Google Sheets endpoint is not configured.");
    try {
      return await fetchRequest(action, parameters);
    } catch (fetchError) {
      return await jsonpRequest(action, parameters);
    }
  };

  /* ===========================================================
     03. PIN AUTHENTICATION
     =========================================================== */
  const showPinError = message => {
    pinMessage.textContent = message;
    pinMessage.hidden = false;
    pinInput.setAttribute("aria-invalid", "true");
  };

  pinForm.addEventListener("submit", async event => {
    event.preventDefault();
    const pin = pinInput.value.trim();
    pinMessage.hidden = true;
    pinInput.removeAttribute("aria-invalid");
    if (!/^\d{4,12}$/.test(pin)) return showPinError("Enter a valid committee PIN.");

    const button = pinForm.querySelector("button[type='submit']");
    button.disabled = true;
    button.textContent = "Checking…";
    try {
      const response = await requestBackend("gaming-auth", { pin });
      if (!response?.ok || !response?.authorized) throw new Error("Incorrect committee PIN.");
      committeePin = pin;
      accessCard.hidden = true;
      dashboard.hidden = false;
      await loadPayments();
    } catch (error) {
      showPinError(error.message || "Access could not be verified.");
      pinInput.select();
    } finally {
      button.disabled = false;
      button.textContent = "Unlock Portal";
    }
  });

  lockButton.addEventListener("click", () => {
    committeePin = "";
    payments = [];
    pinInput.value = "";
    dashboard.hidden = true;
    accessCard.hidden = false;
    pinInput.focus();
  });

  /* ===========================================================
     04. PAYMENT LIST, COUNTS AND FILTERS
     =========================================================== */
  const setCount = (id, value) => { byId(id).textContent = String(value); };

  const updateCounts = () => {
    setCount("payment-total", payments.length);
    setCount("payment-pending", payments.filter(item => item.paymentStatus === "Pending").length);
    setCount("payment-issues", payments.filter(item => item.paymentStatus === "Needs Attention").length);
    setCount("payment-approved", payments.filter(item => item.paymentStatus === "Approved").length);
  };

  const statusClass = status => {
    if (status === "Approved") return "approved";
    if (status === "Needs Attention") return "issue";
    return "pending";
  };

  const paymentCard = payment => {
    const status = payment.paymentStatus || "Pending";
    const approved = status === "Approved";
    return `<article class="payment-review-card" data-registration-id="${escapeHtml(payment.registrationId)}" data-payment-status="${escapeHtml(status)}">
      <div class="payment-card-top">
        <span class="game-badge">${escapeHtml(payment.segment)}</span>
        <span class="payment-status ${statusClass(status)}">${escapeHtml(status)}</span>
      </div>
      <div class="payment-card-title">
        <div><span>Player / Team leader</span><h2>${escapeHtml(payment.leaderName || "Unnamed participant")}</h2></div>
        <strong>৳${Number(payment.paymentAmount || 0).toLocaleString("en-BD")}</strong>
      </div>
      ${payment.teamName ? `<p class="payment-team-name">Team: <strong>${escapeHtml(payment.teamName)}</strong></p>` : ""}
      <dl class="payment-record-details">
        <div><dt>Transaction ID</dt><dd>${escapeHtml(payment.transactionId || "—")}</dd></div>
        <div><dt>bKash Number</dt><dd>${escapeHtml(payment.paymentPhone || "—")}</dd></div>
        <div><dt>Email</dt><dd>${escapeHtml(payment.email || "—")}</dd></div>
        <div><dt>Mobile</dt><dd>${escapeHtml(payment.mobile || "—")}</dd></div>
        <div><dt>Members</dt><dd>${escapeHtml(payment.memberCount || "1")}</dd></div>
        <div><dt>Submitted</dt><dd>${escapeHtml(payment.submittedAt || "—")}</dd></div>
      </dl>
      ${payment.reviewNote ? `<p class="payment-review-note"><span>Review note</span>${escapeHtml(payment.reviewNote)}</p>` : ""}
      ${approved ? `<p class="payment-approved-note">Approved ${escapeHtml(payment.approvedTime || "")}</p>` : `
        <div class="payment-card-actions">
          <button class="approve-payment-button" type="button">Approve Payment</button>
          <button class="issue-payment-button" type="button">Payment Issue</button>
        </div>
        <div class="payment-issue-panel" hidden>
          <label>Select the issue to use as the email subject
            <select class="payment-issue-reason">
              <option value="">Select a reason</option>
              <option>Transaction not found</option>
              <option>Wrong payment amount</option>
              <option>Incorrect bKash number</option>
              <option>Duplicate Transaction ID</option>
              <option>Other payment issue</option>
            </select>
          </label>
          <div><button class="cancel-issue-button" type="button">Cancel</button><button class="send-issue-button" type="button">Send Issue Email</button></div>
        </div>`}
    </article>`;
  };

  const renderPayments = () => {
    const filtered = activeFilter === "All" ? payments : payments.filter(item => item.paymentStatus === activeFilter);
    reviewGrid.innerHTML = filtered.length
      ? filtered.map(paymentCard).join("")
      : `<div class="payment-empty-state"><strong>No ${escapeHtml(activeFilter.toLowerCase())} payments</strong><span>Use Refresh to check the latest Google Sheet entries.</span></div>`;
  };

  const loadPayments = async () => {
    loadingState.hidden = false;
    dashboardError.hidden = true;
    reviewGrid.innerHTML = "";
    refreshButton.disabled = true;
    try {
      const response = await requestBackend("gaming-payments-list", { pin: committeePin });
      if (!response?.ok || !response?.authorized) throw new Error("Committee access expired. Lock and sign in again.");
      payments = Array.isArray(response.payments) ? response.payments : [];
      updateCounts();
      renderPayments();
      byId("gaming-service-status").textContent = "Connected to Valorant & FIFA sheets";
    } catch (error) {
      dashboardError.textContent = error.message || "Gaming payments could not be loaded.";
      dashboardError.hidden = false;
      byId("gaming-service-status").textContent = "Connection problem";
    } finally {
      loadingState.hidden = true;
      refreshButton.disabled = false;
    }
  };

  refreshButton.addEventListener("click", loadPayments);
  filterBar.addEventListener("click", event => {
    const button = event.target.closest("[data-payment-filter]");
    if (!button) return;
    activeFilter = button.dataset.paymentFilter;
    filterBar.querySelectorAll("button").forEach(item => item.classList.toggle("active", item === button));
    renderPayments();
  });

  /* ===========================================================
     05. APPROVE OR SEND PAYMENT ISSUE EMAIL
     =========================================================== */
  const runCardAction = async (card, button, action, parameters) => {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = action === "gaming-payment-approve" ? "Approving…" : "Sending…";
    try {
      const response = await requestBackend(action, { pin: committeePin, id: card.dataset.registrationId, ...parameters });
      if (!response?.ok) throw new Error(response?.message || "The payment action failed.");
      await loadPayments();
    } catch (error) {
      dashboardError.textContent = error.message || "The payment action failed.";
      dashboardError.hidden = false;
      button.disabled = false;
      button.textContent = originalText;
    }
  };

  reviewGrid.addEventListener("click", async event => {
    const card = event.target.closest(".payment-review-card");
    if (!card) return;

    const approveButton = event.target.closest(".approve-payment-button");
    if (approveButton) {
      if (!window.confirm("Approve this payment and email the final registration ID and QR pass?")) return;
      await runCardAction(card, approveButton, "gaming-payment-approve", {});
      return;
    }

    const issueButton = event.target.closest(".issue-payment-button");
    if (issueButton) {
      card.querySelector(".payment-issue-panel").hidden = false;
      issueButton.closest(".payment-card-actions").hidden = true;
      card.querySelector(".payment-issue-reason").focus();
      return;
    }

    const cancelButton = event.target.closest(".cancel-issue-button");
    if (cancelButton) {
      card.querySelector(".payment-issue-panel").hidden = true;
      card.querySelector(".payment-card-actions").hidden = false;
      return;
    }

    const sendButton = event.target.closest(".send-issue-button");
    if (sendButton) {
      const reason = card.querySelector(".payment-issue-reason").value;
      if (!reason) {
        card.querySelector(".payment-issue-reason").focus();
        return;
      }
      if (!window.confirm(`Send a payment issue email with the subject “${reason}”?`)) return;
      await runCardAction(card, sendButton, "gaming-payment-issue", { reason });
    }
  });
})();
