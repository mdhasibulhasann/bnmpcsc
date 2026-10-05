(() => {
  "use strict";

  /* ===========================================================
     01. SHARED HELPERS AND MOBILE NAVIGATION
     =========================================================== */
  const modalRoot = document.getElementById("modal-root");
  const events = Array.isArray(window.BNMPC_EVENTS) ? window.BNMPC_EVENTS : [];
  const eventCategories = Array.isArray(window.BNMPC_EVENT_CATEGORIES) ? window.BNMPC_EVENT_CATEGORIES : [];
  const gamingPayment = window.BNMPC_GAMING_PAYMENT || {};
  const config = window.BNMPC_CONFIG || {};
  let lastFocused = null;

  const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const groupLabels = {
    A: "Group A · Class 3–5 (BNMPC only)",
    B: "Group B · Class 6–8",
    C: "Group C · Class 9–10",
    D: "Group D · Class 11–12"
  };

  /* Olympiads that run at the same time for specific groups.
     Registration remains available after the participant acknowledges
     that they can physically attend only one conflicting event. */
  const scheduleConflicts = {
    "science-olympiad": { B: "Mathematics Olympiad" },
    "mathematics-olympiad": { B: "Science Olympiad", C: "Biology Olympiad", D: "Biology Olympiad" },
    "physics-olympiad": { C: "Chemistry Olympiad", D: "Chemistry Olympiad" },
    "chemistry-olympiad": { C: "Physics Olympiad", D: "Physics Olympiad" },
    "biology-olympiad": { C: "Mathematics Olympiad", D: "Mathematics Olympiad" },
    "it-olympiad": { C: "General Knowledge Olympiad", D: "General Knowledge Olympiad" },
    "gk-olympiad": { C: "IT Olympiad", D: "IT Olympiad" }
  };

  document.querySelectorAll("[data-image-slot]").forEach(slot => {
    const image = slot.querySelector("[data-upload-image]");
    if (!image) return;
    const markReady = () => slot.classList.toggle("asset-ready", image.naturalWidth > 0);
    image.addEventListener("load", markReady);
    image.addEventListener("error", () => {
      const fallback = image.dataset.fallbackSrc;
      if (fallback && image.src !== new URL(fallback, document.baseURI).href) {
        image.src = fallback;
        return;
      }
      markReady();
    });
    if (image.complete) markReady();
  });

  const menuToggle = document.querySelector("[data-menu-toggle]");
  const primaryNav = document.getElementById("primary-nav");
  const setMenu = (open) => {
    if (!menuToggle || !primaryNav) return;
    menuToggle.setAttribute("aria-expanded", String(open));
    primaryNav.classList.toggle("open", open);
  };
  menuToggle?.addEventListener("click", () => setMenu(menuToggle.getAttribute("aria-expanded") !== "true"));
  primaryNav?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setMenu(false)));

  /* ===========================================================
     02. ACCESSIBLE MODAL SYSTEM
     =========================================================== */
  const closeModal = () => {
    const backdrop = modalRoot?.querySelector(".modal-backdrop");
    if (!backdrop) return;
    backdrop.remove();
    document.body.style.overflow = "";
    lastFocused?.focus?.();
  };

  const openModal = (content, label = "Dialog", wide = false) => {
    if (!modalRoot) return;
    lastFocused = document.activeElement;
    modalRoot.innerHTML = `<div class="modal-backdrop" role="presentation"><section class="modal${wide ? " modal-wide" : ""}" role="dialog" aria-modal="true" aria-label="${escapeHtml(label)}"><button class="modal-close" type="button" aria-label="Close dialog">×</button>${content}</section></div>`;
    document.body.style.overflow = "hidden";
    modalRoot.querySelector(".modal-close")?.addEventListener("click", closeModal);
    // Keep registration/details dialogs open when the shaded area is clicked.
    // Users close them deliberately with the cross or an on-screen action.
    modalRoot.querySelector("button, a, input, select, textarea")?.focus();
  };

  const showScheduleConflictWarning = ({ event, group, conflictingEvent, onCancel, onProceed }) => {
    const modal = modalRoot?.querySelector(".modal");
    if (!modal) return;

    document.querySelector(".schedule-conflict-overlay")?.remove();
    const overlay = document.createElement("div");
    overlay.className = "schedule-conflict-overlay";
    overlay.innerHTML = `
      <section class="schedule-conflict-dialog" role="alertdialog" aria-modal="true" aria-labelledby="schedule-conflict-title" aria-describedby="schedule-conflict-copy">
        <span class="schedule-conflict-icon" aria-hidden="true">!</span>
        <p class="modal-kicker">${escapeHtml(groupLabels[group] || `Group ${group}`)} · Schedule conflict</p>
        <h3 id="schedule-conflict-title">These events run at the same time</h3>
        <p id="schedule-conflict-copy"><strong>${escapeHtml(event.title)}</strong> and <strong>${escapeHtml(conflictingEvent)}</strong> will be held at the same time for this group. A participant can attend only one of these events.</p>
        <p class="schedule-conflict-note">You may continue this registration, but please choose your event carefully.</p>
        <div class="modal-actions schedule-conflict-actions">
          <button class="ghost-button" type="button" data-conflict-cancel>Change Selection</button>
          <button class="primary-button" type="button" data-conflict-proceed>Proceed Anyway</button>
        </div>
      </section>`;
    document.body.appendChild(overlay);

    const finish = (proceed) => {
      overlay.remove();
      if (proceed) onProceed?.();
      else onCancel?.();
    };

    overlay.querySelector("[data-conflict-cancel]")?.addEventListener("click", () => finish(false));
    overlay.querySelector("[data-conflict-proceed]")?.addEventListener("click", () => finish(true));
    overlay.querySelector("[data-conflict-proceed]")?.focus();
  };

  const successContent = (title, message, payload, demo) => `
    <div class="success-state">
      <div class="success-mark" aria-hidden="true">✓</div>
      <span class="modal-kicker">${demo ? "Form preview complete" : "Registration received"}</span>
      <h2>${escapeHtml(title)}</h2>
      <p class="modal-lead">${escapeHtml(message)}</p>
      <div class="registration-pass-preview">
        <div class="registration-qr" data-registration-qr aria-label="Entry pass QR code"><span>Creating QR…</span></div>
        <div class="registration-pass-copy">
          <div class="registration-id"><span>Registration ID</span><strong>${escapeHtml(payload.registrationId)}</strong></div>
          <p><strong>${escapeHtml(payload.segment || "Visitor Registration")}</strong></p>
          <small>Present this QR pass at the entry desk</small>
        </div>
      </div>
      ${payload.registrationType === "Visitor"
        ? '<p class="visitor-download-required">IMPORTANT: You must download and save this QR pass now. Visitor confirmation will not be sent by email.</p>'
        : demo
          ? '<p class="connection-notice">Your preview entry pass is ready. Official organiser validation will activate after Google Sheets is connected.</p>'
          : '<p class="connection-notice success">Your entry pass is ready. Download it and present it to the organisers at the entry desk.</p>'}
      <p class="qr-error" data-qr-error hidden></p>
      <div class="modal-actions pass-actions"><button class="primary-button" type="button" data-download-pass disabled>Preparing pass…</button><button class="ghost-button" type="button" data-finish>Done</button></div>
    </div>`;

  const paymentPendingContent = (payload, demo) => `
    <div class="success-state payment-pending-state">
      <div class="success-mark payment-pending-mark" aria-hidden="true">⌛</div>
      <span class="modal-kicker">Payment verification pending</span>
      <h2>Registration received</h2>
      <p class="modal-lead">Your ${escapeHtml(payload.segment)} registration and payment information have been submitted.</p>
      <div class="pending-payment-summary">
        <div><span>Event</span><strong>${escapeHtml(payload.segment)}</strong></div>
        <div><span>Amount</span><strong>৳${Number(payload.paymentAmount || 0).toLocaleString("en-BD")}</strong></div>
        <div><span>Payment method</span><strong>bKash</strong></div>
        <div><span>Status</span><strong>${demo ? "Preview pending" : "Under committee review"}</strong></div>
      </div>
      <p class="connection-notice success">The committee will verify the payment. Your confirmed registration ID and QR entry pass will be sent to the first participant’s email after approval.</p>
      <div class="modal-actions pass-actions"><button class="primary-button" type="button" data-finish>Done</button></div>
    </div>`;

  const createRegistrationId = () => `BNMPC26-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  /* ===========================================================
     02A. QR REGISTRATION PASS AND PNG DOWNLOAD
     =========================================================== */
  const verificationUrlFor = (registrationId) => {
    const configured = String(config.verificationPageUrl || "").trim();
    const pageUrl = configured || new URL("verify.html", document.baseURI).href;
    const url = new URL(pageUrl, document.baseURI);
    url.searchParams.set("id", registrationId);
    return url.href;
  };

  let qrLibraryPromise;
  const loadQrLibrary = () => {
    if (window.QRCode) return Promise.resolve(window.QRCode);
    if (qrLibraryPromise) return qrLibraryPromise;
    qrLibraryPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = String(config.qrLibraryUrl || "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js");
      script.async = true;
      script.onload = () => window.QRCode ? resolve(window.QRCode) : reject(new Error("QR library did not load."));
      script.onerror = () => reject(new Error("QR library could not be downloaded."));
      document.head.appendChild(script);
    });
    return qrLibraryPromise;
  };

  const imageFrom = (src) => new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });

  const roundedRect = (context, x, y, width, height, radius) => {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.roundRect(x, y, width, height, safeRadius);
  };

  const fitImage = (context, image, x, y, maxWidth, maxHeight) => {
    if (!image) return;
    const ratio = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const width = image.naturalWidth * ratio;
    const height = image.naturalHeight * ratio;
    context.drawImage(image, x + (maxWidth - width) / 2, y + (maxHeight - height) / 2, width, height);
  };

  const createPassCanvas = async (payload, qrCanvas, verificationUrl) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext("2d");
    const leaderName = payload.registrationType === "Visitor" ? payload.name : payload.members?.[0]?.name;
    const registrationFor = payload.segment || "Visitor Registration";
    const teamLine = payload.teamName ? `Team: ${payload.teamName}` : "";
    const [eventLogo, clubLogo] = await Promise.all([
      imageFrom("assets/event-logo.png").then(image => image || imageFrom("assets/event-logo.jpg")),
      imageFrom("assets/header-logo.png").then(image => image || imageFrom("assets/club-logo.jpg"))
    ]);

    const background = context.createLinearGradient(0, 0, 1080, 1350);
    background.addColorStop(0, "#07070c");
    background.addColorStop(.48, "#030307");
    background.addColorStop(1, "#100307");
    context.fillStyle = background;
    context.fillRect(0, 0, 1080, 1350);

    const redGlow = context.createRadialGradient(1010, 180, 20, 1010, 180, 460);
    redGlow.addColorStop(0, "rgba(255,36,40,.52)");
    redGlow.addColorStop(1, "rgba(255,36,40,0)");
    context.fillStyle = redGlow;
    context.fillRect(0, 0, 1080, 720);
    const blueGlow = context.createRadialGradient(40, 1030, 20, 40, 1030, 420);
    blueGlow.addColorStop(0, "rgba(44,76,255,.42)");
    blueGlow.addColorStop(1, "rgba(44,76,255,0)");
    context.fillStyle = blueGlow;
    context.fillRect(0, 650, 850, 700);

    context.strokeStyle = "rgba(255,255,255,.16)";
    context.lineWidth = 2;
    roundedRect(context, 45, 45, 990, 1260, 44);
    context.stroke();

    if (clubLogo) {
      context.save();
      roundedRect(context, 82, 78, 88, 88, 44);
      context.clip();
      context.fillStyle = "#ffffff";
      context.fillRect(82, 78, 88, 88);
      fitImage(context, clubLogo, 82, 78, 88, 88);
      context.restore();
    }
    context.fillStyle = "#ffffff";
    context.font = "800 31px Arial, sans-serif";
    context.fillText("BNMPC SCIENCE CLUB", 190, 118);
    context.fillStyle = "rgba(255,255,255,.62)";
    context.font = "700 18px Arial, sans-serif";
    context.fillText("OFFICIAL REGISTRATION PASS · 2026", 190, 149);

    if (eventLogo) fitImage(context, eventLogo, 110, 190, 860, 255);
    else {
      context.textAlign = "center";
      context.fillStyle = "#ffffff";
      context.font = "900 42px Arial, sans-serif";
      context.fillText("3RD BNMPC NATIONAL SCIENCE CARNIVAL 2026", 540, 320);
      context.textAlign = "left";
    }

    context.fillStyle = "rgba(8,8,13,.88)";
    roundedRect(context, 80, 470, 920, 655, 42);
    context.fill();
    context.strokeStyle = "rgba(255,255,255,.13)";
    context.stroke();

    context.fillStyle = "#ffffff";
    roundedRect(context, 340, 515, 400, 400, 28);
    context.fill();
    context.drawImage(qrCanvas, 370, 545, 340, 340);

    context.textAlign = "center";
    context.fillStyle = "#ff625c";
    context.font = "800 18px Arial, sans-serif";
    context.fillText("REGISTRATION ID", 540, 970);
    context.fillStyle = "#ffffff";
    context.font = "900 35px Arial, sans-serif";
    context.fillText(payload.registrationId, 540, 1015);
    context.fillStyle = "rgba(255,255,255,.78)";
    context.font = "700 24px Arial, sans-serif";
    context.fillText(registrationFor, 540, 1060);
    context.font = "500 20px Arial, sans-serif";
    context.fillText(`${leaderName || "Registered participant"}${teamLine ? ` · ${teamLine}` : ""}`, 540, 1095);

    context.fillStyle = "rgba(255,255,255,.62)";
    context.font = "700 20px Arial, sans-serif";
    context.fillText("29–31 OCTOBER 2026  ·  BNMPC, PEELKHANA, DHAKA", 540, 1192);
    context.font = "500 16px Arial, sans-serif";
    context.fillText("PRESENT THIS QR PASS AT THE ENTRY DESK", 540, 1230);
    context.font = "500 13px Arial, sans-serif";
    context.fillStyle = "rgba(255,255,255,.42)";
    context.fillText("FOR ORGANISER SCAN · NOT TRANSFERABLE", 540, 1260);
    context.textAlign = "left";
    return canvas;
  };

  const prepareRegistrationPass = async (modal, payload) => {
    const qrMount = modal.querySelector("[data-registration-qr]");
    const downloadButton = modal.querySelector("[data-download-pass]");
    const errorBox = modal.querySelector("[data-qr-error]");
    const verificationUrl = verificationUrlFor(payload.registrationId);
    try {
      const QRCodeConstructor = await loadQrLibrary();
      qrMount.innerHTML = "";
      new QRCodeConstructor(qrMount, {
        text: verificationUrl,
        width: 220,
        height: 220,
        colorDark: "#060608",
        colorLight: "#ffffff",
        correctLevel: QRCodeConstructor.CorrectLevel.H
      });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const qrCanvas = qrMount.querySelector("canvas");
      if (!qrCanvas) throw new Error("QR canvas was not created.");
      const downloadLabel = payload.registrationType === "Visitor" ? "Download QR Pass — Required" : "Download QR Pass";
      downloadButton.disabled = false;
      downloadButton.textContent = downloadLabel;
      downloadButton.addEventListener("click", async () => {
        downloadButton.disabled = true;
        downloadButton.textContent = "Creating image…";
        try {
          const passCanvas = await createPassCanvas(payload, qrCanvas, verificationUrl);
          const link = document.createElement("a");
          link.download = `${payload.registrationId}-BNMPC-pass.png`;
          link.href = passCanvas.toDataURL("image/png");
          link.click();
        } finally {
          downloadButton.disabled = false;
          downloadButton.textContent = downloadLabel;
        }
      });
    } catch (error) {
      qrMount.innerHTML = "<span>QR unavailable</span>";
      errorBox.hidden = false;
      errorBox.textContent = "The QR generator could not load. Your registration ID is still valid; check the internet connection and try again.";
      downloadButton.textContent = "QR unavailable";
    }
  };

  const requestPublicBackend = async (action, parameters = {}) => {
    const endpoint = String(config.googleAppsScriptUrl || "").trim();
    if (!endpoint) throw new Error("Registration service is not configured.");
    const makeUrl = () => {
      const url = new URL(endpoint);
      url.searchParams.set("action", action);
      url.searchParams.set("_", Date.now().toString());
      Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, String(value ?? "")));
      return url;
    };

    try {
      const response = await fetch(makeUrl().href, { method: "GET", mode: "cors", cache: "no-store", redirect: "follow" });
      if (!response.ok) throw new Error("Service request failed.");
      return await response.json();
    } catch (fetchError) {
      return await new Promise((resolve, reject) => {
        const callbackName = `bnmpcPublic_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const script = document.createElement("script");
        const url = makeUrl();
        url.searchParams.set("callback", callbackName);
        const timeout = setTimeout(() => {
          script.remove();
          delete window[callbackName];
          reject(new Error("Registration service could not be reached."));
        }, 15000);
        window[callbackName] = response => {
          clearTimeout(timeout);
          script.remove();
          delete window[callbackName];
          resolve(response);
        };
        script.onerror = () => {
          clearTimeout(timeout);
          script.remove();
          delete window[callbackName];
          reject(new Error("Registration service could not be reached."));
        };
        script.src = url.href;
        document.head.appendChild(script);
      });
    }
  };

  const submitRegistration = async (payload) => {
    const endpoint = String(config.googleAppsScriptUrl || "").trim();
    if (config.demoMode || !endpoint) {
      const saved = JSON.parse(localStorage.getItem("bnmpc-registration-preview") || "[]");
      saved.push(payload);
      localStorage.setItem("bnmpc-registration-preview", JSON.stringify(saved.slice(-25)));
      return { demo: true };
    }
    if (payload.paymentRequired) {
      const availability = await requestPublicBackend("gaming-transaction-available", { transactionId: payload.transactionId });
      if (!availability?.ok) throw new Error(availability?.message || "Payment information could not be checked.");
      if (!availability.available) throw new Error("This transaction ID has already been used for another gaming registration.");
    }
    await fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    return { demo: false };
  };

  const connectForm = (form, makePayload, successTitle, successMessage) => {
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const errorBox = form.querySelector("[data-form-error]");
      if (errorBox) { errorBox.textContent = ""; errorBox.hidden = true; }
      const button = form.querySelector("button[type='submit']");
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = "Submitting…";
      try {
        const payload = makePayload();
        if (!payload) return;
        const result = await submitRegistration(payload);
        const modal = modalRoot.querySelector(".modal");
        modal.classList.add("success-modal");
        modal.innerHTML = payload.paymentRequired
          ? paymentPendingContent(payload, result.demo)
          : successContent(successTitle, successMessage, payload, result.demo);
        modal.querySelector("[data-finish]")?.addEventListener("click", closeModal);
        if (!payload.paymentRequired) prepareRegistrationPass(modal, payload);
      } catch (error) {
        if (errorBox) {
          errorBox.textContent = error.message || "Registration could not be submitted. Please check your connection and try again.";
          errorBox.hidden = false;
        }
      } finally {
        if (button?.isConnected) {
          button.disabled = false;
          button.textContent = originalText;
        }
      }
    });
  };

  /* ===========================================================
     03. VISITOR REGISTRATION
     =========================================================== */
  const visitorForm = () => {
    openModal(`
      <span class="modal-kicker">Free visitor access</span>
      <h2>Register as a Visitor</h2>
      <p class="modal-lead">Join us at BNMPC Campus from October 29–31, 2026.</p>
      <form class="registration-form" id="visitor-form">
        <div class="field"><label for="visitor-name">Full Name</label><input id="visitor-name" name="name" autocomplete="name" required></div>
        <div class="field"><label for="visitor-institution">Institution</label><input id="visitor-institution" name="institution" required></div>
        <div class="field"><label for="visitor-email">Email Address</label><input id="visitor-email" name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="visitor-phone">Mobile Number</label><input id="visitor-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required></div>
        <div class="field full"><label for="visitor-address">Address / District</label><textarea id="visitor-address" name="address" autocomplete="street-address" required></textarea></div>
        <div class="honeypot" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
        <p class="form-error" data-form-error hidden></p>
        <p class="form-note">Visitor registration is free. After submitting, you must download and save the QR entry pass shown on the screen.</p>
        <button class="submit-button primary-button" type="submit">Submit Registration</button>
      </form>`, "Visitor registration");
    const form = document.getElementById("visitor-form");
    connectForm(form, () => {
      const data = new FormData(form);
      return {
        registrationId: createRegistrationId(),
        registrationType: "Visitor",
        submittedAt: new Date().toISOString(),
        name: data.get("name"),
        institution: data.get("institution"),
        email: data.get("email"),
        phone: data.get("phone"),
        address: data.get("address"),
        website: data.get("website")
      };
    }, "Thank you!", "Your visitor registration has been received successfully.");
  };

  const registrationChoice = () => {
    openModal(`
      <span class="modal-kicker">3rd BNMPC National Science Carnival</span>
      <h2>How would you like to join?</h2>
      <p class="modal-lead">Visitor entry is free. Participants can select a competition segment before registering.</p>
      <div class="register-choice">
        <a class="choice-card participant-choice" href="/participant-registration/"><span class="choice-visual" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M10 5h12v5c0 6-2.7 9-6 9s-6-3-6-9V5Z"/><path d="M10 8H5c0 5 2.1 8 6.4 8M22 8h5c0 5-2.1 8-6.4 8M16 19v5M11 28h10M13 24h6v4"/></svg></span><strong>Register as Participant</strong><span>Choose a category, review a segment and enter the competition.</span></a>
        <button class="choice-card" type="button" data-visitor-choice><span class="choice-visual" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"/><path d="M5.5 28c.8-5.2 4.3-8 10.5-8s9.7 2.8 10.5 8"/><path d="M24 8h5v8h-5"/></svg></span><strong>Register as Visitor</strong><span>Visit the exhibitions and experience the carnival.</span></button>
      </div>`, "Registration options");
    modalRoot.querySelector("[data-visitor-choice]")?.addEventListener("click", visitorForm);
  };

  document.querySelectorAll("[data-register-trigger]").forEach(button => button.addEventListener("click", registrationChoice));

  /* ===========================================================
     04. EVENTS PAGE AND OFFICIAL RULES
     =========================================================== */
  const eventGrid = document.getElementById("event-grid");
  const categoryNav = document.getElementById("category-nav");
  const categorySections = document.getElementById("category-sections");

  const eventCardMarkup = (event, index) => {
    const paymentActions = event.paymentRequired ? `
      <div class="card-actions gaming-card-top-actions">
        <button class="ghost-button details-button" type="button">See Details</button>
        <button class="ghost-button payment-guide-button" type="button">How to Pay</button>
      </div>
      <button class="primary-button event-register gaming-register-button" type="button">Register Now · ৳${Number(event.paymentAmount).toLocaleString("en-BD")}</button>` : `
      <div class="card-actions">
        <button class="ghost-button details-button" type="button">See Details</button>
        <button class="primary-button event-register" type="button">Register Now</button>
      </div>`;

    return `<article class="event-card glass-panel${event.paymentRequired ? " gaming-event-card" : ""}" data-event-slug="${escapeHtml(event.slug)}">
      <div class="card-top"><span class="event-number">${String(index + 1).padStart(2, "0")}</span><span class="event-type">${escapeHtml(event.type)}</span></div>
      <h2>${escapeHtml(event.title)}</h2>
      <p>${escapeHtml(event.summary)}</p>
      ${event.paymentRequired ? `<div class="gaming-fee-chip"><span>Registration fee</span><strong>৳${Number(event.paymentAmount).toLocaleString("en-BD")} / ${escapeHtml(event.paymentUnit)}</strong></div>` : ""}
      ${paymentActions}
    </article>`;
  };

  if (eventGrid && events.length) {
    eventGrid.innerHTML = events.map(event => eventCardMarkup(event, events.indexOf(event))).join("");
  }

  if (categoryNav && categorySections && events.length && eventCategories.length) {
    categoryNav.innerHTML = eventCategories.map((category, index) => `
      <a class="category-tab${index === 0 ? " active" : ""}" href="#category-${escapeHtml(category.slug)}">${escapeHtml(category.title)}</a>`).join("");

    categorySections.innerHTML = eventCategories.map((category, index) => {
      const categoryEvents = category.eventSlugs.map(slug => events.find(event => event.slug === slug)).filter(Boolean);
      return `<section class="event-category-section" id="category-${escapeHtml(category.slug)}" data-category-index="${index}">
        <div class="category-heading">
          <div><span class="category-number">${String(index + 1).padStart(2, "0")}</span><h2>${escapeHtml(category.title)}</h2></div>
          <p>${escapeHtml(category.description)}</p>
          <span class="category-count">${categoryEvents.length} event${categoryEvents.length === 1 ? "" : "s"}</span>
        </div>
        <div class="event-grid category-event-grid">${categoryEvents.map(event => eventCardMarkup(event, events.indexOf(event))).join("")}</div>
      </section>`;
    }).join("");

    categoryNav.addEventListener("click", event => {
      const tab = event.target.closest(".category-tab");
      if (!tab) return;
      event.preventDefault();
      setActiveCategory([...categoryNav.querySelectorAll(".category-tab")].indexOf(tab));
      document.querySelector(tab.getAttribute("href"))?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // Follow the visible category while the page is scrolled and keep the
    // corresponding category indicator visible inside the horizontal bar.
    const categorySectionNodes = [...categorySections.querySelectorAll(".event-category-section")];
    const categoryTabs = [...categoryNav.querySelectorAll(".category-tab")];
    let activeCategoryIndex = -1;
    let categoryScrollFrame = 0;

    const setActiveCategory = (index) => {
      if (index < 0 || index === activeCategoryIndex) return;
      activeCategoryIndex = index;
      categoryTabs.forEach((tab, tabIndex) => tab.classList.toggle("active", tabIndex === index));
      const activeTab = categoryTabs[index];
      if (!activeTab) return;
      const targetLeft = activeTab.offsetLeft - ((categoryNav.clientWidth - activeTab.offsetWidth) / 2);
      categoryNav.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
    };

    const syncCategoryIndicator = () => {
      categoryScrollFrame = 0;
      const marker = window.innerWidth <= 720 ? 170 : 205;
      let visibleIndex = 0;
      categorySectionNodes.forEach((section, index) => {
        if (section.getBoundingClientRect().top <= marker) visibleIndex = index;
      });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) {
        visibleIndex = categorySectionNodes.length - 1;
      }
      setActiveCategory(visibleIndex);
    };

    const requestCategorySync = () => {
      if (categoryScrollFrame) return;
      categoryScrollFrame = window.requestAnimationFrame(syncCategoryIndicator);
    };

    window.addEventListener("scroll", requestCategorySync, { passive: true });
    window.addEventListener("resize", requestCategorySync);
    syncCategoryIndicator();
  }

  const memberFormat = (event) => {
    if (event.valorantRoster) return "5 players + up to 2 substitutes";
    if (event.minMembers === 1 && event.maxMembers === 1) return "Solo event";
    if (event.minMembers === event.maxMembers) return `${event.minMembers} members`;
    return `${event.minMembers}–${event.maxMembers} members`;
  };

  const findEvent = (element) => events.find(event => event.slug === element.closest("[data-event-slug]")?.dataset.eventSlug);

  const showPaymentGuide = (event) => {
    const accountNumber = String(gamingPayment.accountNumber || "To be announced");
    const numberReady = /\d{8,}/.test(accountNumber.replace(/\D/g, ""));
    openModal(`
      <span class="modal-kicker">${escapeHtml(event.title)} · bKash payment</span>
      <h2>How to Pay</h2>
      <p class="modal-lead">Pay the registration fee before submitting the gaming registration form.</p>
      <div class="payment-guide-amount"><span>Registration fee</span><strong>৳${Number(event.paymentAmount).toLocaleString("en-BD")}</strong><small>Per ${escapeHtml(event.paymentUnit)}</small></div>
      <div class="payment-account-card${numberReady ? "" : " payment-number-pending"}">
        <span>bKash ${escapeHtml(gamingPayment.accountType || "Personal")} number</span>
        <strong>${escapeHtml(accountNumber)}</strong>
        ${numberReady ? "" : "<small>The official payment number will be added here before gaming registration opens.</small>"}
      </div>
      <section class="rules-panel payment-steps"><h3>Payment steps</h3><ol>
        <li>Open the bKash app and choose <strong>Send Money</strong>.</li>
        <li>Enter the official BNMPC Science Club payment number shown above.</li>
        <li>Send exactly <strong>৳${Number(event.paymentAmount).toLocaleString("en-BD")}</strong> for ${escapeHtml(event.title)} registration.</li>
        <li>Keep the bKash sender number and Transaction ID.</li>
        <li>Enter both correctly in the registration form and submit for committee verification.</li>
      </ol></section>
      <p class="payment-contact-note">Payment support: <strong>${escapeHtml(gamingPayment.contactName || "Md. Tahmid Mahir")}</strong> · ${escapeHtml(gamingPayment.contactPhone || "+880 19 0222 3848")}</p>
      <div class="modal-actions"><button class="ghost-button" type="button" data-cancel>Close</button><button class="primary-button" type="button" data-register-event>Continue to Registration</button></div>`, `${event.title} payment guide`, true);
    modalRoot.querySelector("[data-cancel]")?.addEventListener("click", closeModal);
    modalRoot.querySelector("[data-register-event]")?.addEventListener("click", () => participantForm(event));
  };

  const eventDetails = (event, index) => {
    openModal(`
      <span class="modal-kicker">Event ${String(index + 1).padStart(2, "0")} · Official details</span>
      <h2>${escapeHtml(event.title)}</h2>
      <p class="modal-lead">${escapeHtml(event.summary)}</p>
      <div class="detail-meta">
        <div><span>Eligibility</span><strong>${escapeHtml(event.eligibility)}</strong></div>
        <div><span>Format</span><strong>${escapeHtml(memberFormat(event))}</strong></div>
        <div><span>Venue</span><strong>BNMPC Campus</strong></div>
        <div><span>Event dates</span><strong>October 29–31, 2026</strong></div>
        ${event.paymentRequired ? `<div><span>Registration fee</span><strong>৳${Number(event.paymentAmount).toLocaleString("en-BD")} / ${escapeHtml(event.paymentUnit)}</strong></div>` : ""}
      </div>
      <section class="rules-panel"><h3>Rules & Guidelines</h3><ol>${event.rules.map(rule => `<li>${escapeHtml(rule)}</li>`).join("")}</ol></section>
      <div class="modal-actions"><button class="ghost-button" type="button" data-cancel>Close</button>${event.paymentRequired ? '<button class="ghost-button" type="button" data-payment-guide>How to Pay</button>' : ""}<button class="primary-button" type="button" data-register-event>Register Now</button></div>`, `${event.title} details`, event.rules.length > 7);
    modalRoot.querySelector("[data-cancel]")?.addEventListener("click", closeModal);
    modalRoot.querySelector("[data-payment-guide]")?.addEventListener("click", () => showPaymentGuide(event));
    modalRoot.querySelector("[data-register-event]")?.addEventListener("click", () => participantForm(event));
  };

  [eventGrid, categorySections].filter(Boolean).forEach(root => root.addEventListener("click", clickEvent => {
    const detailsButton = clickEvent.target.closest(".details-button");
    const paymentButton = clickEvent.target.closest(".payment-guide-button");
    const registerButton = clickEvent.target.closest(".event-register");
    const actionButton = detailsButton || paymentButton || registerButton;
    if (!actionButton) return;
    const eventData = findEvent(actionButton);
    if (!eventData) return;
    if (detailsButton) eventDetails(eventData, events.indexOf(eventData));
    if (paymentButton) showPaymentGuide(eventData);
    if (registerButton) participantForm(eventData);
  }));

  /* ===========================================================
     05. DYNAMIC PARTICIPANT REGISTRATION
     =========================================================== */
  const groupOptions = (groups) => groups.map(group => `<option value="${group}">${escapeHtml(groupLabels[group])}</option>`).join("");

  const extraFieldMarkup = (field) => {
    if (field.type === "select") {
      return `<div class="field full"><label for="entry-${field.key}">${escapeHtml(field.label)}</label><select id="entry-${field.key}" name="${field.key}" data-entry-field ${field.required ? "required" : ""}><option value="">Select ${escapeHtml(field.label.toLowerCase())}</option>${field.options.map(option => `<option>${escapeHtml(option)}</option>`).join("")}</select></div>`;
    }
    const inputType = field.type === "url" ? "url" : "text";
    const placeholder = field.placeholder ? ` placeholder="${escapeHtml(field.placeholder)}"` : "";
    const pattern = field.pattern ? ` pattern="${escapeHtml(field.pattern)}"` : "";
    return `<div class="field full"><label for="entry-${field.key}">${escapeHtml(field.label)}</label><input id="entry-${field.key}" name="${field.key}" type="${inputType}" data-entry-field${placeholder}${pattern} ${field.required ? "required" : ""}></div>`;
  };

  const participantForm = (event) => {
    const countChoices = Array.from({ length: event.maxMembers - event.minMembers + 1 }, (_, index) => event.minMembers + index);
    const isTeamEvent = event.maxMembers > 1;
    const isGaming = Boolean(event.paymentRequired);
    const skipsClass = event.slug === "valorant" || event.slug === "fifa";
    const hasScheduleConflict = Boolean(scheduleConflicts[event.slug]);
    const asksGroup = (event.groups.length < 4 || hasScheduleConflict) && event.slug !== "valorant";
    const groupField = asksGroup ? `<div class="field full registration-group-field"><label for="registration-group">Select Group</label><select id="registration-group" name="registrationGroup" required><option value="" selected disabled>Select your group</option>${groupOptions(event.groups)}</select></div>` : "";
    const countField = isTeamEvent ? `
      <div class="field full member-count-field"><label for="member-count">Select Your Team Size</label><select id="member-count" name="memberCount" required><option value="" selected disabled>Select your team size</option>${countChoices.map(count => `<option value="${count}">${event.valorantRoster ? (count === 5 ? "5 main players" : `5 main players + ${count - 5} substitute${count === 6 ? "" : "s"}`) : `${count} member${count > 1 ? "s" : ""}`}</option>`).join("")}</select></div>` : `<input type="hidden" id="member-count" name="memberCount" value="1">`;
    const paymentFields = isGaming ? `
      <section class="gaming-payment-fields full">
        <div class="gaming-payment-heading"><div><span>bKash payment verification</span><strong>Payable amount: ৳${Number(event.paymentAmount).toLocaleString("en-BD")}</strong></div><em>Use the How to Pay guide on the event card before completing this form.</em></div>
        <div class="gaming-payment-inputs">
          <div class="field"><label for="payment-phone">Payment bKash Number</label><input id="payment-phone" name="paymentPhone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="01XXXXXXXXX" pattern="01[3-9][0-9]{8}" required></div>
          <div class="field"><label for="transaction-id">Transaction ID</label><input id="transaction-id" name="transactionId" inputmode="text" autocomplete="off" placeholder="e.g. A1B2C3D4E5" minlength="6" maxlength="20" pattern="[A-Za-z0-9]+" required></div>
        </div>
        <p>Your payment will be checked by the carnival committee. The final registration ID and QR pass will be emailed only after approval.</p>
      </section>` : "";

    openModal(`
      <span class="modal-kicker">Participant registration</span>
      <h2>${escapeHtml(event.title)}</h2>
      <p class="modal-lead">${escapeHtml(event.eligibility)} · ${escapeHtml(memberFormat(event))}</p>
      <form class="registration-form participant-registration" id="participant-form">
        ${groupField}
        ${event.teamName ? '<div class="field full"><label for="team-name">Team Name</label><input id="team-name" name="teamName" required></div>' : ""}
        ${event.entryNameLabel ? `<div class="field full"><label for="entry-name">${escapeHtml(event.entryNameLabel)}</label><input id="entry-name" name="entryName" required></div>` : ""}
        ${(event.extraFields || []).map(extraFieldMarkup).join("")}
        ${countField}
        <div class="member-fields full" id="member-fields"></div>
        ${paymentFields}
        <div class="honeypot" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
        <p class="form-error" data-form-error hidden></p>
        <p class="form-note">Please provide accurate information for every registered participant.</p>
        <button class="submit-button primary-button" type="submit">Submit Registration</button>
      </form>`, `${event.title} registration`, true);

    const form = document.getElementById("participant-form");
    const memberFields = document.getElementById("member-fields");
    const countSelect = document.getElementById("member-count");
    const groupSelect = document.getElementById("registration-group");

    const renderMembers = (count) => {
      if (!count) { memberFields.innerHTML = ""; return; }
      memberFields.innerHTML = Array.from({ length: count }, (_, index) => {
        const displayNumber = index + 1;
        const label = event.valorantRoster ? (index < 5 ? `Player ${displayNumber}` : `Substitute ${displayNumber - 5}`) : (count === 1 ? "Participant" : `Member ${displayNumber}`);
        const institutionOrGaming = event.valorantRoster
          ? `<div class="field"><label for="member-${index}-ign">In-game Name &amp; Tag</label><input id="member-${index}-ign" data-member-field="inGameNameTag" placeholder="PlayerName#TAG" required></div><div class="field"><label for="member-${index}-discord">Discord Username</label><input id="member-${index}-discord" data-member-field="discordUsername" required></div>`
          : `<div class="field"><label for="member-${index}-institution">Institution</label><input id="member-${index}-institution" data-member-field="institution" required></div>`;
        return `<fieldset class="member-block" data-member-index="${index}"><legend><span>${String(displayNumber).padStart(2, "0")}</span>${label} Details</legend>
          <div class="member-grid-fields">
            <div class="field"><label for="member-${index}-name">Full Name</label><input id="member-${index}-name" data-member-field="name" autocomplete="name" required></div>
            ${skipsClass ? "" : `<div class="field"><label for="member-${index}-class">Class</label><input id="member-${index}-class" data-member-field="className" placeholder="e.g. Class 9" required></div>`}
            ${institutionOrGaming}
            <div class="field"><label for="member-${index}-mobile">Mobile Number</label><input id="member-${index}-mobile" data-member-field="mobile" type="tel" inputmode="tel" autocomplete="tel" required></div>
            <div class="field full"><label for="member-${index}-email">Email Address</label><input id="member-${index}-email" data-member-field="email" type="email" autocomplete="email" required></div>
          </div>
        </fieldset>`;
      }).join("");
    };

    if (isTeamEvent) countSelect.addEventListener("change", () => renderMembers(Number(countSelect.value)));
    else renderMembers(1);

    groupSelect?.addEventListener("change", () => {
      const group = groupSelect.value;
      const conflictingEvent = scheduleConflicts[event.slug]?.[group];
      const conflictKey = conflictingEvent ? `${event.slug}:${group}:${conflictingEvent}` : "";

      if (!conflictingEvent) {
        delete groupSelect.dataset.approvedConflict;
        return;
      }
      if (groupSelect.dataset.approvedConflict === conflictKey) return;

      showScheduleConflictWarning({
        event,
        group,
        conflictingEvent,
        onCancel: () => {
          groupSelect.value = "";
          delete groupSelect.dataset.approvedConflict;
          groupSelect.focus();
        },
        onProceed: () => {
          groupSelect.dataset.approvedConflict = conflictKey;
          groupSelect.focus();
        }
      });
    });

    connectForm(form, () => {
      const errorBox = form.querySelector("[data-form-error]");
      const members = [...form.querySelectorAll("[data-member-index]")].map(section => ({
        name: section.querySelector('[data-member-field="name"]').value.trim(),
        className: section.querySelector('[data-member-field="className"]')?.value.trim() || "",
        institution: section.querySelector('[data-member-field="institution"]')?.value.trim() || "",
        inGameNameTag: section.querySelector('[data-member-field="inGameNameTag"]')?.value.trim() || "",
        discordUsername: section.querySelector('[data-member-field="discordUsername"]')?.value.trim() || "",
        mobile: section.querySelector('[data-member-field="mobile"]').value.trim(),
        email: section.querySelector('[data-member-field="email"]').value.trim()
      }));

      if (event.sameInstitution) {
        const institutions = new Set(members.map(member => member.institution.toLowerCase().replace(/\s+/g, " ")));
        if (institutions.size > 1) {
          errorBox.textContent = "All members of this segment must be from the same institution.";
          errorBox.hidden = false;
          return null;
        }
      }

      const formData = new FormData(form);
      const entryFields = {};
      form.querySelectorAll("[data-entry-field]").forEach(field => { entryFields[field.name] = field.value; });
      return {
        registrationId: createRegistrationId(),
        registrationType: "Participant",
        submittedAt: new Date().toISOString(),
        segment: event.title,
        segmentSlug: event.slug,
        group: formData.get("registrationGroup") || "",
        teamName: formData.get("teamName") || "",
        entryName: formData.get("entryName") || "",
        entryFields,
        memberCount: members.length,
        members,
        paymentRequired: isGaming,
        paymentMethod: isGaming ? "bKash" : "",
        paymentAmount: isGaming ? Number(event.paymentAmount) : 0,
        paymentUnit: isGaming ? event.paymentUnit : "",
        paymentPhone: isGaming ? String(formData.get("paymentPhone") || "").trim() : "",
        transactionId: isGaming ? String(formData.get("transactionId") || "").trim().toUpperCase() : "",
        paymentStatus: isGaming ? "Pending" : "Not Required",
        website: formData.get("website") || ""
      };
    }, "Registration received", `Your ${event.title} registration has been submitted successfully.`);
  };

  /* ===========================================================
     06. SCHEDULE DAY NAVIGATION
     =========================================================== */
  const dayTabs = [...document.querySelectorAll(".day-tab")];
  const scheduleBoards = [...document.querySelectorAll("[data-schedule-day]")];
  const selectScheduleDay = (day) => {
    dayTabs.forEach(tab => {
      const selected = tab.dataset.day === String(day);
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-pressed", String(selected));
    });
  };
  dayTabs.forEach(tab => tab.addEventListener("click", () => {
    selectScheduleDay(tab.dataset.day);
    document.getElementById(`day-${tab.dataset.day}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  if (scheduleBoards.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) selectScheduleDay(visible.target.dataset.scheduleDay);
    }, { rootMargin: "-210px 0px -48% 0px", threshold: [0, .15, .35] });
    scheduleBoards.forEach(board => observer.observe(board));
  }

  /* ===========================================================
     07. GALLERY FILTERS AND LIGHTBOX
     =========================================================== */
  const galleryGrid = document.getElementById("gallery-grid");
  const galleryItems = Array.isArray(window.BNMPC_GALLERY) ? window.BNMPC_GALLERY : [];
  const renderGallery = (day = "all") => {
    if (!galleryGrid || !galleryItems.length) return;
    const filtered = galleryItems.map((item, index) => ({ ...item, originalIndex: index })).filter(item => day === "all" || String(item.day) === day);
    galleryGrid.innerHTML = filtered.length ? filtered.map(item => `<button class="gallery-card" type="button" data-gallery-index="${item.originalIndex}"><img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt)}" loading="lazy"><span>Day ${escapeHtml(item.day)}</span></button>`).join("") : '<div class="gallery-empty glass-panel"><h2>No photos in this category yet</h2></div>';
  };
  if (galleryItems.length) renderGallery();
  document.querySelectorAll(".gallery-tab").forEach(tab => tab.addEventListener("click", () => {
    document.querySelectorAll(".gallery-tab").forEach(item => item.classList.toggle("active", item === tab));
    renderGallery(tab.dataset.galleryDay);
  }));
  galleryGrid?.addEventListener("click", event => {
    const card = event.target.closest("[data-gallery-index]");
    if (!card) return;
    const item = galleryItems[Number(card.dataset.galleryIndex)];
    openModal(`<div class="gallery-lightbox"><img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt)}"><p>${escapeHtml(item.alt)}</p></div>`, item.alt, true);
  });

  /* ===========================================================
     08. LIVE EVENT COUNTDOWN
     =========================================================== */
  const countdown = () => {
    const target = new Date("2026-10-29T08:00:00+06:00").getTime();
    const distance = Math.max(0, target - Date.now());
    const values = {
      days: Math.floor(distance / 86400000),
      hours: Math.floor((distance % 86400000) / 3600000),
      minutes: Math.floor((distance % 3600000) / 60000),
      seconds: Math.floor((distance % 60000) / 1000)
    };
    Object.entries(values).forEach(([key, value]) => {
      const node = document.getElementById(key);
      if (node) node.textContent = String(value).padStart(2, "0");
    });
  };
  countdown();
  if (document.getElementById("days")) setInterval(countdown, 1000);

  /* ===========================================================
     09. DESKTOP EVENT-LOGO PARALLAX
     =========================================================== */
  const parallax = document.querySelector("[data-parallax]");
  if (parallax && matchMedia("(pointer:fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.addEventListener("pointermove", event => {
      const x = (event.clientX / innerWidth - .5) * 7;
      const y = (event.clientY / innerHeight - .5) * -5;
      parallax.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
    });
    document.addEventListener("pointerleave", () => { parallax.style.transform = ""; });
  }

  /* ===========================================================
     10. KEYBOARD ACCESSIBILITY
     =========================================================== */
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") { closeModal(); setMenu(false); }
    if (event.key !== "Tab") return;
    const modal = modalRoot?.querySelector(".modal");
    if (!modal) return;
    const focusable = [...modal.querySelectorAll("button, a[href], input, select, textarea")].filter(element => !element.disabled && element.tabIndex !== -1);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
})();
