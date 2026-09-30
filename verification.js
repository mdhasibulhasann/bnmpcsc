(() => {
  "use strict";

  /* ===========================================================
     01. CONFIGURATION, ELEMENTS AND SESSION STATE
     =========================================================== */
  const config = window.BNMPC_CONFIG || {};
  const endpoint = String(config.googleAppsScriptUrl || "").trim();
  const queryId = new URLSearchParams(location.search).get("id")?.trim().toUpperCase() || "";
  const validIdPattern = /^BNMPC26-[A-Z0-9-]+$/;
  const byId = id => document.getElementById(id);

  const accessCard = byId("staff-access-card");
  const scannerConsole = byId("scanner-console");
  const pinForm = byId("staff-pin-form");
  const pinInput = byId("staff-pin");
  const pinMessage = byId("staff-pin-message");
  const serviceIndicator = byId("service-indicator");
  const cameraState = byId("camera-state");
  const scannerIdle = byId("scanner-idle");
  const startButton = byId("start-scanner");
  const stopButton = byId("stop-scanner");
  const lockButton = byId("staff-lock-button");
  const manualForm = byId("manual-verify-form");
  const manualInput = byId("manual-registration-id");
  const resultCard = byId("staff-result-card");
  const resultMark = byId("staff-result-mark");
  const resultKicker = byId("staff-result-kicker");
  const resultTitle = byId("staff-result-title");
  const resultMessage = byId("staff-result-message");
  const resultDetails = byId("staff-result-details");
  const scanNextButton = byId("scan-next");

  let staffPin = "";
  let scanner = null;
  let scannerRunning = false;
  let scanLocked = false;
  let scannerLibraryPromise = null;

  const setText = (id, value, fallback = "—") => {
    const element = byId(id);
    if (element) element.textContent = String(value || fallback);
  };

  const setServiceStatus = label => {
    const text = serviceIndicator?.querySelector("b");
    if (text) text.textContent = label;
  };

  /* ===========================================================
     02. JSONP BRIDGE: STATIC WEBSITE TO GOOGLE APPS SCRIPT
     =========================================================== */
  const requestBackend = (action, parameters = {}) => new Promise((resolve, reject) => {
    if (!endpoint) return reject(new Error("Google Sheets endpoint is not configured."));

    const callbackName = `bnmpcStaff_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const url = new URL(endpoint);
    url.searchParams.set("action", action);
    url.searchParams.set("callback", callbackName);
    Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, String(value ?? "")));

    const cleanup = () => {
      clearTimeout(timeout);
      script.remove();
      delete window[callbackName];
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("The verification service timed out."));
    }, 15000);

    window[callbackName] = response => {
      cleanup();
      resolve(response);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("The verification service could not be reached."));
    };
    script.src = url.href;
    document.head.appendChild(script);
  });

  /* ===========================================================
     03. STAFF PIN AUTHENTICATION
     =========================================================== */
  const showPinError = copy => {
    pinMessage.textContent = copy;
    pinMessage.hidden = false;
    pinInput.setAttribute("aria-invalid", "true");
  };

  const unlockConsole = pin => {
    staffPin = pin;
    accessCard.hidden = true;
    scannerConsole.hidden = false;
    setServiceStatus(config.demoMode ? "Preview mode" : "Service online");
    manualInput.value = validIdPattern.test(queryId) ? queryId : "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  pinForm.addEventListener("submit", async event => {
    event.preventDefault();
    const pin = pinInput.value.trim();
    pinMessage.hidden = true;
    pinInput.removeAttribute("aria-invalid");
    if (!/^\d{4,12}$/.test(pin)) return showPinError("Enter a valid 4–12 digit staff PIN.");

    const button = pinForm.querySelector("button");
    button.disabled = true;
    button.textContent = "Checking…";
    try {
      if (config.demoMode || !endpoint) {
        if (pin !== String(config.demoStaffPin || "2026")) throw new Error("Incorrect staff PIN.");
        unlockConsole(pin);
      } else {
        const response = await requestBackend("staff-auth", { pin });
        if (!response?.ok || !response?.authorized) throw new Error("Incorrect staff PIN.");
        unlockConsole(pin);
      }
    } catch (error) {
      showPinError(error.message || "Access could not be verified.");
      pinInput.select();
    } finally {
      button.disabled = false;
      button.textContent = "Unlock";
    }
  });

  /* ===========================================================
     04. CAMERA QR SCANNER
     =========================================================== */
  const loadScannerLibrary = () => {
    if (window.Html5Qrcode) return Promise.resolve(window.Html5Qrcode);
    if (scannerLibraryPromise) return scannerLibraryPromise;
    scannerLibraryPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = String(config.qrScannerLibraryUrl || "https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js");
      script.async = true;
      script.onload = () => window.Html5Qrcode ? resolve(window.Html5Qrcode) : reject(new Error("QR scanner did not load."));
      script.onerror = () => reject(new Error("QR scanner library could not be downloaded."));
      document.head.appendChild(script);
    });
    return scannerLibraryPromise;
  };

  const extractRegistrationId = decodedText => {
    const raw = String(decodedText || "").trim();
    const direct = raw.toUpperCase();
    if (validIdPattern.test(direct)) return direct;
    try {
      const url = new URL(raw, location.href);
      const id = String(url.searchParams.get("id") || "").trim().toUpperCase();
      return validIdPattern.test(id) ? id : "";
    } catch (error) {
      const match = direct.match(/BNMPC26-[A-Z0-9-]+/);
      return match && validIdPattern.test(match[0]) ? match[0] : "";
    }
  };

  const stopScanner = async () => {
    if (!scanner || !scannerRunning) return;
    try { await scanner.stop(); } catch (error) { /* Already stopped. */ }
    try { await scanner.clear(); } catch (error) { /* Already cleared. */ }
    scannerRunning = false;
    cameraState.textContent = "Camera off";
    cameraState.classList.remove("active");
    scannerIdle.hidden = false;
    startButton.hidden = false;
    stopButton.hidden = true;
  };

  const startScanner = async () => {
    if (scannerRunning || scanLocked) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      return showErrorResult("Camera Unavailable", "Camera scanning requires an HTTPS website and camera permission.");
    }

    startButton.disabled = true;
    startButton.textContent = "Starting…";
    try {
      await loadScannerLibrary();
      if (!scanner) scanner = new window.Html5Qrcode("qr-reader", { verbose: false });
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.round(Math.min(width, height) * .72);
            return { width: size, height: size };
          },
          aspectRatio: 1.333334
        },
        async decodedText => {
          if (scanLocked) return;
          scanLocked = true;
          const id = extractRegistrationId(decodedText);
          await stopScanner();
          if (!id) return showInvalidResult("Invalid QR Code", "This QR does not contain a valid BNMPC registration ID.");
          manualInput.value = id;
          await processRegistration(id);
        },
        () => {}
      );
      scannerRunning = true;
      scannerIdle.hidden = true;
      cameraState.textContent = "Scanning";
      cameraState.classList.add("active");
      startButton.hidden = true;
      stopButton.hidden = false;
    } catch (error) {
      showErrorResult("Camera Could Not Start", "Allow camera permission and make sure no other app is using the camera.");
    } finally {
      startButton.disabled = false;
      startButton.textContent = "Start Camera";
    }
  };

  startButton.addEventListener("click", startScanner);
  stopButton.addEventListener("click", stopScanner);
  window.addEventListener("pagehide", stopScanner);

  lockButton.addEventListener("click", async () => {
    await stopScanner();
    staffPin = "";
    pinInput.value = "";
    resultCard.hidden = true;
    scannerConsole.hidden = true;
    accessCard.hidden = false;
    pinInput.focus();
  });

  /* ===========================================================
     05. REGISTRATION LOOKUP, CHECK-IN AND RESULT UI
     =========================================================== */
  const localPreviewLookup = id => {
    try {
      const saved = JSON.parse(localStorage.getItem("bnmpc-registration-preview") || "[]");
      const entry = saved.find(item => String(item.registrationId || "").toUpperCase() === id);
      if (!entry) return null;
      const leader = entry.registrationType === "Visitor" ? entry : (entry.members || [])[0] || {};
      return {
        registrationId: id,
        registrationType: entry.registrationType,
        segment: entry.segment || "Visitor Registration",
        name: leader.name || entry.name,
        institution: leader.institution || entry.institution,
        group: entry.group || "Open for all",
        teamName: entry.teamName || "",
        memberCount: entry.memberCount || 1,
        status: "Preview",
        checkInTime: "Preview only"
      };
    } catch (error) {
      return null;
    }
  };

  const showResultBase = (state, markText, kicker, heading, copy) => {
    resultCard.hidden = false;
    resultCard.dataset.state = state;
    resultMark.textContent = markText;
    resultKicker.textContent = kicker;
    resultTitle.textContent = heading;
    resultMessage.textContent = copy;
    resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const fillRegistrationDetails = registration => {
    resultDetails.hidden = false;
    setText("verify-id", registration.registrationId);
    setText("verify-segment", registration.segment || "Visitor Registration");
    setText("verify-name", registration.name);
    setText("verify-institution", registration.institution);
    setText("verify-group", registration.group);
    setText("verify-team", registration.teamName);
    setText("verify-members", registration.memberCount || (registration.registrationType === "Visitor" ? "1 visitor" : "—"));
    setText("verify-time", registration.checkInTime);
    setText("verify-status", registration.status || "Checked In");
  };

  const showVerifiedResult = (registration, preview = false) => {
    showResultBase(
      "verified", "✓", preview ? "Preview verification" : "Entry approved",
      preview ? "Registration Found" : "Verified & Checked In",
      preview ? "This registration exists on this device. Connect Google Sheets for official check-in." : "The registration is valid and its check-in has been saved."
    );
    fillRegistrationDetails(registration);
  };

  const showAlreadyResult = registration => {
    showResultBase("already", "!", "Duplicate scan", "Already Checked In", "This valid pass was checked in earlier. Do not create a second entry.");
    fillRegistrationDetails(registration);
  };

  const showInvalidResult = (heading = "Registration Not Found", copy = "No official registration was found for this ID.") => {
    showResultBase("invalid", "×", "Entry rejected", heading, copy);
    resultDetails.hidden = true;
  };

  const showErrorResult = (heading, copy) => {
    showResultBase("error", "!", "Service error", heading, copy);
    resultDetails.hidden = true;
  };

  const processRegistration = async idValue => {
    const id = String(idValue || "").trim().toUpperCase();
    if (!validIdPattern.test(id)) return showInvalidResult("Invalid Registration ID", "Enter or scan a valid BNMPC registration ID.");

    scanLocked = true;
    showResultBase("checking", "···", "Checking official record", "Verifying Pass…", `Checking ${id} in the carnival registration records.`);
    resultDetails.hidden = true;
    setServiceStatus("Checking…");
    try {
      if (config.demoMode || !endpoint) {
        const registration = localPreviewLookup(id);
        if (registration) showVerifiedResult(registration, true);
        else showInvalidResult("Preview Record Not Found", "This ID is not stored on this device. Connect Google Sheets for official verification.");
        return;
      }

      const response = await requestBackend("staff-checkin", { id, pin: staffPin });
      if (!response?.authorized) {
        await stopScanner();
        staffPin = "";
        scannerConsole.hidden = true;
        accessCard.hidden = false;
        showPinError("Your staff session is no longer authorised. Enter the PIN again.");
        return;
      }
      if (!response?.ok) throw new Error(response?.message || "Verification failed.");
      if (!response.valid) showInvalidResult();
      else if (response.alreadyCheckedIn) showAlreadyResult(response.registration);
      else showVerifiedResult(response.registration);
    } catch (error) {
      showErrorResult("Could Not Verify", error.message || "The verification service is temporarily unavailable.");
    } finally {
      setServiceStatus(config.demoMode ? "Preview mode" : "Ready");
    }
  };

  manualForm.addEventListener("submit", async event => {
    event.preventDefault();
    await stopScanner();
    await processRegistration(extractRegistrationId(manualInput.value) || manualInput.value);
  });

  scanNextButton.addEventListener("click", async () => {
    resultCard.hidden = true;
    resultDetails.hidden = true;
    manualInput.value = "";
    scanLocked = false;
    await startScanner();
  });

  pinInput.focus();
})();
