(() => {
  "use strict";

  /* ===========================================================
     01. SHARED HELPERS AND MOBILE NAVIGATION
     =========================================================== */
  const modalRoot = document.getElementById("modal-root");
  const events = Array.isArray(window.BNMPC_EVENTS) ? window.BNMPC_EVENTS : [];
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
    const backdrop = modalRoot.querySelector(".modal-backdrop");
    modalRoot.querySelector(".modal-close")?.addEventListener("click", closeModal);
    backdrop?.addEventListener("click", event => { if (event.target === backdrop) closeModal(); });
    modalRoot.querySelector("button, a, input, select, textarea")?.focus();
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
      ${demo ? '<p class="connection-notice">Your preview entry pass is ready. Official organiser validation will activate after Google Sheets is connected.</p>' : '<p class="connection-notice success">Your entry pass is ready. Download it and present it to the organisers at the entry desk.</p>'}
      <p class="qr-error" data-qr-error hidden></p>
      <div class="modal-actions pass-actions"><button class="primary-button" type="button" data-download-pass disabled>Preparing pass…</button><button class="ghost-button" type="button" data-finish>Done</button></div>
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
      downloadButton.disabled = false;
      downloadButton.textContent = "Download QR Pass";
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
          downloadButton.textContent = "Download QR Pass";
        }
      });
    } catch (error) {
      qrMount.innerHTML = "<span>QR unavailable</span>";
      errorBox.hidden = false;
      errorBox.textContent = "The QR generator could not load. Your registration ID is still valid; check the internet connection and try again.";
      downloadButton.textContent = "QR unavailable";
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
        modal.innerHTML = successContent(successTitle, successMessage, payload, result.demo);
        modal.querySelector("[data-finish]")?.addEventListener("click", closeModal);
        prepareRegistrationPass(modal, payload);
      } catch (error) {
        if (errorBox) {
          errorBox.textContent = "Registration could not be submitted. Please check your connection and try again.";
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
        <p class="form-note">Visitor registration is free. A confirmation email will be sent after successful online submission.</p>
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
        <button class="choice-card" type="button" data-visitor-choice><span class="choice-visual" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"/><path d="M5.5 28c.8-5.2 4.3-8 10.5-8s9.7 2.8 10.5 8"/><path d="M24 8h5v8h-5"/></svg></span><strong>Register as Visitor</strong><span>Visit the exhibitions and experience the carnival.</span></button>
        <a class="choice-card" href="events.html"><span class="choice-visual" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M10 5h12v5c0 6-2.7 9-6 9s-6-3-6-9V5Z"/><path d="M10 8H5c0 5 2.1 8 6.4 8M22 8h5c0 5-2.1 8-6.4 8M16 19v5M11 28h10M13 24h6v4"/></svg></span><strong>Register as Participant</strong><span>Choose a segment and enter the competition.</span></a>
      </div>`, "Registration options");
    modalRoot.querySelector("[data-visitor-choice]")?.addEventListener("click", visitorForm);
  };

  document.querySelectorAll("[data-register-trigger]").forEach(button => button.addEventListener("click", registrationChoice));

  /* ===========================================================
     04. EVENTS PAGE AND OFFICIAL RULES
     =========================================================== */
  const eventGrid = document.getElementById("event-grid");
  if (eventGrid && events.length) {
    eventGrid.innerHTML = events.map((event, index) => `
      <article class="event-card glass-panel" data-event-slug="${escapeHtml(event.slug)}">
        <div class="card-top"><span class="event-number">${String(index + 1).padStart(2, "0")}</span><span class="event-type">${escapeHtml(event.type)}</span></div>
        <h2>${escapeHtml(event.title)}</h2>
        <p>${escapeHtml(event.summary)}</p>
        <div class="card-actions"><button class="ghost-button details-button" type="button">See Details</button><button class="primary-button event-register" type="button">Register Now</button></div>
      </article>`).join("");
  }

  const memberFormat = (event) => {
    if (event.valorantRoster) return "5 players + up to 2 substitutes";
    if (event.minMembers === 1 && event.maxMembers === 1) return "Solo event";
    if (event.minMembers === event.maxMembers) return `${event.minMembers} members`;
    return `${event.minMembers}–${event.maxMembers} members`;
  };

  const findEvent = (element) => events.find(event => event.slug === element.closest("[data-event-slug]")?.dataset.eventSlug);

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
      </div>
      <section class="rules-panel"><h3>Rules & Guidelines</h3><ol>${event.rules.map(rule => `<li>${escapeHtml(rule)}</li>`).join("")}</ol></section>
      <div class="modal-actions"><button class="ghost-button" type="button" data-cancel>Close</button><button class="primary-button" type="button" data-register-event>Register Now</button></div>`, `${event.title} details`, event.rules.length > 7);
    modalRoot.querySelector("[data-cancel]")?.addEventListener("click", closeModal);
    modalRoot.querySelector("[data-register-event]")?.addEventListener("click", () => participantForm(event));
  };

  eventGrid?.addEventListener("click", event => {
    const detailsButton = event.target.closest(".details-button");
    const registerButton = event.target.closest(".event-register");
    if (!detailsButton && !registerButton) return;
    const eventData = findEvent(detailsButton || registerButton);
    if (!eventData) return;
    if (detailsButton) eventDetails(eventData, events.indexOf(eventData));
    if (registerButton) participantForm(eventData);
  });

  /* ===========================================================
     05. DYNAMIC PARTICIPANT REGISTRATION
     =========================================================== */
  const groupOptions = (groups) => groups.map(group => `<option value="${group}">${escapeHtml(groupLabels[group])}</option>`).join("");

  const extraFieldMarkup = (field) => {
    if (field.type === "select") {
      return `<div class="field full"><label for="entry-${field.key}">${escapeHtml(field.label)}</label><select id="entry-${field.key}" name="${field.key}" data-entry-field ${field.required ? "required" : ""}><option value="">Select ${escapeHtml(field.label.toLowerCase())}</option>${field.options.map(option => `<option>${escapeHtml(option)}</option>`).join("")}</select></div>`;
    }
    return `<div class="field full"><label for="entry-${field.key}">${escapeHtml(field.label)}</label><input id="entry-${field.key}" name="${field.key}" data-entry-field ${field.required ? "required" : ""}></div>`;
  };

  const participantForm = (event) => {
    const countChoices = Array.from({ length: event.maxMembers - event.minMembers + 1 }, (_, index) => event.minMembers + index);
    const isTeamEvent = event.maxMembers > 1;
    const skipsClass = event.slug === "valorant" || event.slug === "fifa";
    const asksGroup = event.groups.length < 4 && event.slug !== "valorant";
    const groupField = asksGroup ? `<div class="field full registration-group-field"><label for="registration-group">Select Group</label><select id="registration-group" name="registrationGroup" required><option value="" selected disabled>Select your group</option>${groupOptions(event.groups)}</select></div>` : "";
    const countField = isTeamEvent ? `
      <div class="field full member-count-field"><label for="member-count">Select Your Team Size</label><select id="member-count" name="memberCount" required><option value="" selected disabled>Select your team size</option>${countChoices.map(count => `<option value="${count}">${event.valorantRoster ? (count === 5 ? "5 main players" : `5 main players + ${count - 5} substitute${count === 6 ? "" : "s"}`) : `${count} member${count > 1 ? "s" : ""}`}</option>`).join("")}</select></div>` : `<input type="hidden" id="member-count" name="memberCount" value="1">`;

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
        <div class="honeypot" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
        <p class="form-error" data-form-error hidden></p>
        <p class="form-note">Please provide accurate information for every registered participant.</p>
        <button class="submit-button primary-button" type="submit">Submit Registration</button>
      </form>`, `${event.title} registration`, true);

    const form = document.getElementById("participant-form");
    const memberFields = document.getElementById("member-fields");
    const countSelect = document.getElementById("member-count");

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
      if (node) node.textContent = key === "days" ? String(value).padStart(3, "0") : String(value).padStart(2, "0");
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
