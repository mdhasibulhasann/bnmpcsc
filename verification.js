(() => {
  "use strict";

  /* ===========================================================
     01. PAGE ELEMENTS AND SAFE DISPLAY HELPERS
     =========================================================== */
  const config = window.BNMPC_CONFIG || {};
  const card = document.getElementById("verification-card");
  const mark = document.getElementById("verification-mark");
  const title = document.getElementById("verification-title");
  const message = document.getElementById("verification-message");
  const details = document.getElementById("verification-details");
  const registrationId = new URLSearchParams(location.search).get("id")?.trim().toUpperCase() || "";

  const setText = (id, value, fallback = "—") => {
    document.getElementById(id).textContent = String(value || fallback);
  };

  const showResult = (result, preview = false) => {
    card.dataset.state = "found";
    mark.textContent = "✓";
    title.textContent = preview ? "Pass Created" : "Registration Verified";
    message.textContent = preview
      ? "This pass exists on this device. Online verification will activate after Google Sheets is connected."
      : "This registration was found in the official carnival registration record.";
    details.hidden = false;
    setText("verify-id", result.registrationId || registrationId);
    setText("verify-segment", result.segment || "Visitor Registration");
    setText("verify-name", result.name);
    setText("verify-group", result.group);
    setText("verify-members", result.memberCount || (result.registrationType === "Visitor" ? "1 visitor" : "—"));
    setText("verify-status", preview ? "Preview · Sheet not connected" : (result.status || "Registered"));
  };

  const showError = (heading, copy) => {
    card.dataset.state = "error";
    mark.textContent = "×";
    title.textContent = heading;
    message.textContent = copy;
    details.hidden = true;
  };

  /* ===========================================================
     02. LOCAL PREVIEW LOOKUP — USED BEFORE SHEETS IS CONNECTED
     =========================================================== */
  const findLocalRegistration = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("bnmpc-registration-preview") || "[]");
      const entry = saved.find(item => String(item.registrationId || "").toUpperCase() === registrationId);
      if (!entry) return null;
      return {
        registrationId: entry.registrationId,
        registrationType: entry.registrationType,
        segment: entry.segment || "Visitor Registration",
        name: entry.registrationType === "Visitor" ? entry.name : entry.members?.[0]?.name,
        group: entry.group || "Open for all",
        memberCount: entry.memberCount || 1,
        status: "Preview"
      };
    } catch (error) {
      return null;
    }
  };

  /* ===========================================================
     03. GOOGLE APPS SCRIPT JSONP LOOKUP
     JSONP works reliably from a static GitHub Pages website.
     =========================================================== */
  const verifyOnline = (endpoint) => new Promise((resolve, reject) => {
    const callbackName = `bnmpcVerify_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const url = new URL(endpoint);
    url.searchParams.set("action", "verify");
    url.searchParams.set("id", registrationId);
    url.searchParams.set("callback", callbackName);
    const cleanup = () => {
      clearTimeout(timeout);
      script.remove();
      delete window[callbackName];
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Verification request timed out."));
    }, 12000);
    window[callbackName] = result => {
      cleanup();
      resolve(result);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("Verification service could not be reached."));
    };
    script.src = url.href;
    document.head.appendChild(script);
  });

  /* ===========================================================
     04. VERIFICATION FLOW
     =========================================================== */
  const runVerification = async () => {
    if (!registrationId || !/^BNMPC26-[A-Z0-9-]+$/.test(registrationId)) {
      showError("Invalid QR Link", "This verification link does not contain a valid BNMPC registration ID.");
      return;
    }

    const endpoint = String(config.googleAppsScriptUrl || "").trim();
    if (config.demoMode || !endpoint) {
      const localEntry = findLocalRegistration();
      if (localEntry) showResult(localEntry, true);
      else showError("Verification Pending", "Google Sheets has not been connected yet, so this registration cannot be checked online from this device.");
      return;
    }

    try {
      const result = await verifyOnline(endpoint);
      if (result?.ok && result?.valid) showResult(result.registration, false);
      else showError("Registration Not Found", "No official registration was found for this code. Please check the ID or contact the organisers.");
    } catch (error) {
      const localEntry = findLocalRegistration();
      if (localEntry) showResult(localEntry, true);
      else showError("Could Not Verify", "The verification service is temporarily unavailable. Please try again shortly.");
    }
  };

  runVerification();
})();
