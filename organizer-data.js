(() => {
  "use strict";

  /* ===========================================================
     01. CONFIGURATION AND PRIVATE SESSION STATE
     =========================================================== */
  const config = window.BNMPC_CONFIG || {};
  const endpoint = String(config.googleAppsScriptUrl || "").trim();
  const byId = id => document.getElementById(id);
  const accessCard = byId("organizer-access-card");
  const dashboard = byId("organizer-dashboard");
  const pinForm = byId("organizer-pin-form");
  const pinInput = byId("organizer-pin");
  const pinMessage = byId("organizer-pin-message");
  const refreshButton = byId("organizer-refresh");
  const lockButton = byId("organizer-lock");
  const searchInput = byId("organizer-search");
  const projectCategoryField = byId("organizer-project-category-field");
  const categorySelect = byId("organizer-category");
  const segmentSelect = byId("organizer-segment");
  const groupSelect = byId("organizer-group");
  const institutionSelect = byId("organizer-institution");
  const tableCard = byId("organizer-table-card");
  const tableBody = byId("organizer-table-body");
  const emptyState = byId("organizer-empty");
  const loadingState = byId("organizer-loading");
  const dashboardError = byId("organizer-dashboard-error");
  const modal = byId("organizer-detail-modal");
  const modalContent = byId("organizer-modal-content");
  const reportOpenButton = byId("organizer-report-open");
  const reportModal = byId("organizer-report-modal");
  const reportSummary = byId("organizer-report-summary");
  const reportPagesInput = byId("organizer-report-pages");
  const reportError = byId("organizer-report-error");
  const reportPrintButton = byId("organizer-report-print");
  const reportDownloadButton = byId("organizer-report-download");
  const reportRoot = byId("organizer-report-root");

  const PAGE_SIZE = 40;
  const FIRST_REPORT_PAGE_SIZE = 20;
  const LATER_REPORT_PAGE_SIZE = 25;
  let organizerPin = "";
  let registrations = [];
  let filteredRegistrations = [];
  let currentPage = 1;
  let lastFocusedElement = null;

  const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const normalize = value => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  const uniqueSorted = values => [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }));
  const formatDate = value => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value || "—");
    return new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
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
    const callbackName = `bnmpcOrganizer_${Date.now()}_${Math.random().toString(36).slice(2)}`;
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
     03. PIN AUTHENTICATION AND DATA LOADING
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
    if (!/^\d{4,12}$/.test(pin)) return showPinError("Enter a valid organizer PIN.");

    const button = pinForm.querySelector("button[type='submit']");
    button.disabled = true;
    button.textContent = "Checking…";
    try {
      const response = await requestBackend("gaming-auth", { pin });
      if (!response?.ok || !response?.authorized) throw new Error("Incorrect organizer PIN.");
      organizerPin = pin;
      accessCard.hidden = true;
      dashboard.hidden = false;
      await loadRegistrations();
    } catch (error) {
      showPinError(error.message || "Access could not be verified.");
      pinInput.select();
    } finally {
      button.disabled = false;
      button.textContent = "Unlock Portal";
    }
  });

  const lockPortal = () => {
    organizerPin = "";
    registrations = [];
    filteredRegistrations = [];
    pinInput.value = "";
    dashboard.hidden = true;
    accessCard.hidden = false;
    closeModal();
    closeReportModal();
    pinInput.focus();
  };
  lockButton.addEventListener("click", lockPortal);

  const loadRegistrations = async () => {
    loadingState.hidden = false;
    dashboardError.hidden = true;
    tableCard.hidden = true;
    emptyState.hidden = true;
    refreshButton.disabled = true;
    try {
      const response = await requestBackend("gaming-payments-list", { pin: organizerPin, scope: "organizer" });
      if (!response?.ok || !response?.authorized) throw new Error("Organizer access expired. Lock and sign in again.");
      registrations = Array.isArray(response.payments) ? response.payments : [];
      populateAllFilters();
      applyFilters(true);
      byId("organizer-service-status").textContent = "Connected to all participant sheets";
    } catch (error) {
      dashboardError.textContent = error.message || "Participant registrations could not be loaded.";
      dashboardError.hidden = false;
      byId("organizer-service-status").textContent = "Connection problem";
    } finally {
      loadingState.hidden = true;
      refreshButton.disabled = false;
    }
  };
  refreshButton.addEventListener("click", loadRegistrations);

  /* ===========================================================
     04. FILTER OPTIONS, FILTERING AND LIVE COUNTS
     =========================================================== */
  const replaceOptions = (select, values, label, preserve = true) => {
    const current = preserve ? select.value : "";
    select.innerHTML = `<option value="">${escapeHtml(label)}</option>${values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
    if (values.includes(current)) select.value = current;
  };

  const populateAllFilters = () => {
    const selectedCategory = categorySelect.value;
    categorySelect.innerHTML = `<option value="">All project categories</option>
      <option value="Mechanical">1. Mechanical</option>
      <option value="Non-Mechanical">2. Non-Mechanical</option>
      <option value="IT">3. IT</option>`;
    if (["Mechanical", "Non-Mechanical", "IT"].includes(selectedCategory)) categorySelect.value = selectedCategory;
    replaceOptions(segmentSelect, uniqueSorted(registrations.map(item => item.segment)), "All segments");
    replaceOptions(groupSelect, uniqueSorted(registrations.map(item => item.group)), "All groups");
    replaceOptions(institutionSelect, uniqueSorted(registrations.flatMap(item => item.institutions || [])), "All institutions");
    toggleProjectCategoryFilter();
  };

  const toggleProjectCategoryFilter = () => {
    const showProjectCategory = segmentSelect.value === "Project Display";
    projectCategoryField.hidden = !showProjectCategory;
    if (!showProjectCategory) categorySelect.value = "";
  };

  const registrationSearchText = item => normalize([
    item.caReference, item.registrationId, item.projectCategory, item.segment, item.group, item.teamName, item.entryName,
    ...(item.institutions || []),
    ...(item.members || []).flatMap(member => [member.name, member.className, member.institution, member.mobile, member.email, member.inGameNameTag, member.discordUsername])
  ].join(" "));

  const updateSummary = () => {
    const participants = filteredRegistrations.reduce((sum, item) => sum + (Number(item.memberCount) || (item.members || []).length || 1), 0);
    const institutions = uniqueSorted(filteredRegistrations.flatMap(item => item.institutions || [])).length;
    const segments = uniqueSorted(filteredRegistrations.map(item => item.segment)).length;
    byId("summary-registrations").textContent = filteredRegistrations.length.toLocaleString("en-BD");
    byId("summary-participants").textContent = participants.toLocaleString("en-BD");
    byId("summary-institutions").textContent = institutions.toLocaleString("en-BD");
    byId("summary-segments").textContent = segments.toLocaleString("en-BD");
    reportOpenButton.disabled = filteredRegistrations.length === 0;
  };

  const applyFilters = resetPage => {
    const search = normalize(searchInput.value);
    const segment = segmentSelect.value;
    const category = segment === "Project Display" ? categorySelect.value : "";
    const group = groupSelect.value;
    const institution = normalize(institutionSelect.value);
    filteredRegistrations = registrations.filter(item => {
      if (category && item.projectCategory !== category) return false;
      if (segment && item.segment !== segment) return false;
      if (group && item.group !== group) return false;
      if (institution && !(item.institutions || []).some(value => normalize(value) === institution)) return false;
      if (search && !registrationSearchText(item).includes(search)) return false;
      return true;
    });
    if (resetPage) currentPage = 1;
    updateSummary();
    renderTable();
  };

  categorySelect.addEventListener("change", () => applyFilters(true));
  segmentSelect.addEventListener("change", () => { toggleProjectCategoryFilter(); applyFilters(true); });
  [groupSelect, institutionSelect].forEach(select => select.addEventListener("change", () => applyFilters(true)));
  searchInput.addEventListener("input", () => applyFilters(true));
  byId("organizer-reset").addEventListener("click", () => {
    searchInput.value = "";
    segmentSelect.value = "";
    categorySelect.value = "";
    toggleProjectCategoryFilter();
    groupSelect.value = "";
    institutionSelect.value = "";
    applyFilters(true);
  });

  /* ===========================================================
     05. REGISTRATION TABLE AND PAGINATION
     =========================================================== */
  const statusClass = item => {
    const status = normalize(item.paymentStatus === "Approved" ? "Approved" : item.status);
    if (status.includes("checked")) return "checked";
    if (status.includes("issue") || status.includes("pending")) return "pending";
    return "new";
  };

  const displayStatus = item => {
    if (["Valorant", "FIFA"].includes(item.segment) && item.paymentStatus && item.paymentStatus !== "Not Required") return item.paymentStatus;
    return item.status || "New";
  };

  const rowHtml = item => {
    const institution = (item.institutions || []).join(", ") || "—";
    const lead = item.teamName || item.leadName || "—";
    return `<tr>
      <td data-label="Date">${escapeHtml(formatDate(item.submittedAt))}</td>
      <td data-label="Registration ID"><code>${escapeHtml(item.registrationId)}</code></td>
      <td data-label="Project Category">${escapeHtml(item.projectCategory || "—")}</td>
      <td data-label="Segment"><strong>${escapeHtml(item.segment)}</strong></td>
      <td data-label="Group">${escapeHtml(item.group || "—")}</td>
      <td data-label="Institution">${escapeHtml(institution)}</td>
      <td data-label="Lead / Team">${escapeHtml(lead)}</td>
      <td data-label="Members">${escapeHtml(item.memberCount || (item.members || []).length || 1)}</td>
      <td data-label="Status"><span class="organizer-status ${statusClass(item)}">${escapeHtml(displayStatus(item))}</span></td>
      <td data-label=""><button class="organizer-view-button" type="button" data-registration-id="${escapeHtml(item.registrationId)}">View Details</button></td>
    </tr>`;
  };

  const renderTable = () => {
    const pageCount = Math.max(1, Math.ceil(filteredRegistrations.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, pageCount);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageRows = filteredRegistrations.slice(start, start + PAGE_SIZE);
    tableBody.innerHTML = pageRows.map(rowHtml).join("");
    tableCard.hidden = filteredRegistrations.length === 0;
    emptyState.hidden = filteredRegistrations.length !== 0;
    byId("organizer-page-summary").textContent = filteredRegistrations.length
      ? `${(start + 1).toLocaleString("en-BD")}–${Math.min(start + PAGE_SIZE, filteredRegistrations.length).toLocaleString("en-BD")} of ${filteredRegistrations.length.toLocaleString("en-BD")} registrations`
      : "0 registrations";
    byId("organizer-page-number").textContent = `Page ${currentPage} of ${pageCount}`;
    byId("organizer-previous").disabled = currentPage <= 1;
    byId("organizer-next").disabled = currentPage >= pageCount;
  };

  byId("organizer-previous").addEventListener("click", () => { if (currentPage > 1) { currentPage -= 1; renderTable(); tableCard.scrollIntoView({ behavior: "smooth" }); } });
  byId("organizer-next").addEventListener("click", () => { if (currentPage * PAGE_SIZE < filteredRegistrations.length) { currentPage += 1; renderTable(); tableCard.scrollIntoView({ behavior: "smooth" }); } });
  tableBody.addEventListener("click", event => {
    const button = event.target.closest("[data-registration-id]");
    if (!button) return;
    const registration = registrations.find(item => item.registrationId === button.dataset.registrationId);
    if (registration) openModal(registration, button);
  });

  /* ===========================================================
     06. BLACK-AND-WHITE PRINT AND DIRECT PDF REPORT
     =========================================================== */
  const paginateReportRows = rows => {
    if (!rows.length) return [];
    const pages = [rows.slice(0, FIRST_REPORT_PAGE_SIZE)];
    for (let index = FIRST_REPORT_PAGE_SIZE; index < rows.length; index += LATER_REPORT_PAGE_SIZE) {
      pages.push(rows.slice(index, index + LATER_REPORT_PAGE_SIZE));
    }
    return pages;
  };

  const reportFilterText = () => {
    const filters = [];
    if (searchInput.value.trim()) filters.push(`Search: ${searchInput.value.trim()}`);
    if (segmentSelect.value) filters.push(`Segment: ${segmentSelect.value}`);
    if (segmentSelect.value === "Project Display" && categorySelect.value) filters.push(`Project Category: ${categorySelect.value}`);
    if (groupSelect.value) filters.push(`Group: ${groupSelect.value}`);
    if (institutionSelect.value) filters.push(`Institution: ${institutionSelect.value}`);
    return filters.length ? filters.join(" | ") : "All participant registrations";
  };

  const reportRowHtml = item => {
    const institution = (item.institutions || []).join(", ") || "—";
    const lead = item.teamName || item.leadName || "—";
    return `<tr>
      <td><span>${escapeHtml(formatDate(item.submittedAt))}</span></td>
      <td><span>${escapeHtml(item.registrationId)}</span></td>
      <td><span>${escapeHtml(item.projectCategory || "—")}</span></td>
      <td><span>${escapeHtml(item.segment || "—")}</span></td>
      <td><span>${escapeHtml(item.group || "—")}</span></td>
      <td><span>${escapeHtml(institution)}</span></td>
      <td><span>${escapeHtml(lead)}</span></td>
      <td><span>${escapeHtml(item.memberCount || (item.members || []).length || 1)}</span></td>
      <td><span>${escapeHtml(displayStatus(item))}</span></td>
    </tr>`;
  };

  const reportTableHtml = rows => `<table class="organizer-print-table">
    <colgroup><col class="print-date"><col class="print-id"><col class="print-category"><col class="print-segment"><col class="print-group"><col class="print-institution"><col class="print-lead"><col class="print-members"><col class="print-status"></colgroup>
    <thead><tr><th>Date</th><th>Registration ID</th><th>Project Category</th><th>Segment</th><th>Group</th><th>Institution</th><th>Lead / Team</th><th>Members</th><th>Status</th></tr></thead>
    <tbody>${rows.map(reportRowHtml).join("")}</tbody>
  </table>`;

  const reportPageHtml = (rows, pageNumber, totalPages) => {
    const participantCount = filteredRegistrations.reduce((sum, item) => sum + (Number(item.memberCount) || (item.members || []).length || 1), 0);
    const generatedAt = new Intl.DateTimeFormat("en-BD", {
      dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka"
    }).format(new Date());
    const heading = pageNumber === 1 ? `<header class="organizer-print-heading">
      <h1>BNMPC National Science Carnival 2026</h1>
      <p>Organizer Registration Report</p>
      <dl>
        <div><dt>Filters</dt><dd>${escapeHtml(reportFilterText())}</dd></div>
        <div><dt>Registrations</dt><dd>${filteredRegistrations.length.toLocaleString("en-BD")}</dd></div>
        <div><dt>Participants</dt><dd>${participantCount.toLocaleString("en-BD")}</dd></div>
        <div><dt>Generated</dt><dd>${escapeHtml(generatedAt)}</dd></div>
      </dl>
    </header>` : "";
    return `<section class="organizer-report-page" data-report-page="${pageNumber}">
      ${heading}
      ${reportTableHtml(rows)}
      <footer>Page ${pageNumber} of ${totalPages}</footer>
    </section>`;
  };

  const parseReportPages = (value, totalPages) => {
    const selected = new Set();
    const tokens = String(value || "").split(",").map(token => token.trim()).filter(Boolean);
    if (!tokens.length) throw new Error("Enter the page numbers you want, for example 1,3-5,8.");
    tokens.forEach(token => {
      const single = token.match(/^(\d+)$/);
      const range = token.match(/^(\d+)\s*-\s*(\d+)$/);
      if (single) {
        selected.add(Number(single[1]));
        return;
      }
      if (range) {
        const start = Number(range[1]);
        const end = Number(range[2]);
        if (start > end) throw new Error(`Invalid page range: ${token}.`);
        for (let page = start; page <= end; page += 1) selected.add(page);
        return;
      }
      throw new Error(`Invalid page selection: ${token}.`);
    });
    const pages = [...selected].sort((left, right) => left - right);
    if (pages.some(page => page < 1 || page > totalPages)) throw new Error(`Choose pages between 1 and ${totalPages}.`);
    return pages;
  };

  const selectedReportPages = allPages => {
    const scope = reportModal.querySelector('input[name="organizer-report-scope"]:checked')?.value || "all";
    const pageNumbers = scope === "custom"
      ? parseReportPages(reportPagesInput.value, allPages.length)
      : allPages.map((_, index) => index + 1);
    return pageNumbers.map(pageNumber => ({ pageNumber, rows: allPages[pageNumber - 1] }));
  };

  const prepareReport = () => {
    reportError.hidden = true;
    const allPages = paginateReportRows(filteredRegistrations);
    if (!allPages.length) throw new Error("There are no filtered registrations to print.");
    const selected = selectedReportPages(allPages);
    reportRoot.innerHTML = selected.map(page => reportPageHtml(page.rows, page.pageNumber, allPages.length)).join("");
    reportRoot.setAttribute("aria-hidden", "false");
    return selected;
  };

  const clearPreparedReport = () => {
    reportRoot.innerHTML = "";
    reportRoot.setAttribute("aria-hidden", "true");
    document.body.classList.remove("organizer-report-printing");
  };

  const showReportError = message => {
    reportError.textContent = message;
    reportError.hidden = false;
  };

  const openReportModal = () => {
    const pages = paginateReportRows(filteredRegistrations);
    if (!pages.length) return;
    const participants = filteredRegistrations.reduce((sum, item) => sum + (Number(item.memberCount) || (item.members || []).length || 1), 0);
    reportSummary.textContent = `${filteredRegistrations.length.toLocaleString("en-BD")} registrations · ${participants.toLocaleString("en-BD")} participants · ${pages.length.toLocaleString("en-BD")} printable pages`;
    reportModal.querySelector('input[value="all"]').checked = true;
    reportPagesInput.value = "";
    reportPagesInput.disabled = true;
    reportError.hidden = true;
    reportModal.hidden = false;
    document.body.classList.add("organizer-modal-open");
    byId("organizer-report-close").focus();
  };

  function closeReportModal() {
    if (reportModal.hidden) return;
    reportModal.hidden = true;
    if (modal.hidden) document.body.classList.remove("organizer-modal-open");
    reportOpenButton.focus();
  }

  reportOpenButton.addEventListener("click", openReportModal);
  byId("organizer-report-close").addEventListener("click", closeReportModal);
  reportModal.querySelector("[data-close-organizer-report]").addEventListener("click", closeReportModal);
  reportModal.querySelectorAll('input[name="organizer-report-scope"]').forEach(input => {
    input.addEventListener("change", () => {
      reportPagesInput.disabled = input.value !== "custom";
      reportError.hidden = true;
      if (!reportPagesInput.disabled) reportPagesInput.focus();
    });
  });

  reportPrintButton.addEventListener("click", () => {
    try {
      prepareReport();
      closeReportModal();
      document.body.classList.add("organizer-report-printing");
      window.addEventListener("afterprint", clearPreparedReport, { once: true });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        window.print();
        setTimeout(clearPreparedReport, 250);
      }));
    } catch (error) {
      clearPreparedReport();
      showReportError(error.message || "The print report could not be prepared.");
    }
  });

  reportDownloadButton.addEventListener("click", async () => {
    const originalText = reportDownloadButton.textContent;
    try {
      const selected = prepareReport();
      const html2canvas = window.html2canvas;
      const JsPdf = window.jspdf?.jsPDF;
      if (!html2canvas || !JsPdf) throw new Error("The PDF tool could not be loaded. Check the internet connection and try again.");
      reportDownloadButton.disabled = true;
      reportPrintButton.disabled = true;
      const pdf = new JsPdf({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
      const pageElements = [...reportRoot.querySelectorAll(".organizer-report-page")];
      for (let index = 0; index < pageElements.length; index += 1) {
        reportDownloadButton.textContent = `Preparing ${index + 1}/${selected.length}…`;
        const canvas = await html2canvas(pageElements[index], {
          scale: 1.5,
          backgroundColor: "#ffffff",
          logging: false,
          useCORS: true
        });
        if (index > 0) pdf.addPage("a4", "landscape");
        pdf.addImage(canvas.toDataURL("image/jpeg", .94), "JPEG", 0, 0, 297, 210, undefined, "FAST");
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      const stamp = new Date().toISOString().slice(0, 10);
      pdf.save(`BNMPC-Registration-Report-${stamp}.pdf`);
      closeReportModal();
    } catch (error) {
      showReportError(error.message || "The PDF could not be downloaded.");
    } finally {
      clearPreparedReport();
      reportDownloadButton.disabled = false;
      reportPrintButton.disabled = false;
      reportDownloadButton.textContent = originalText;
    }
  });

  /* ===========================================================
     07. COMPLETE REGISTRATION DETAILS MODAL
     =========================================================== */
  const detailItem = (label, value) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "—")}</dd></div>`;
  const prettyLabel = value => String(value || "").replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
  const memberCard = (member, index) => `<article class="organizer-member-card">
    <div class="organizer-member-heading"><span>Member ${index + 1}</span><strong>${escapeHtml(member.name || "Unnamed member")}</strong></div>
    <dl>${detailItem("Class", member.className)}${detailItem("Institution", member.institution)}${detailItem("Mobile", member.mobile)}${detailItem("Email", member.email)}${member.inGameNameTag ? detailItem("In-game Name & Tag", member.inGameNameTag) : ""}${member.discordUsername ? detailItem("Discord Username", member.discordUsername) : ""}</dl>
  </article>`;

  const openModal = (item, trigger) => {
    lastFocusedElement = trigger;
    byId("organizer-detail-title").textContent = item.segment || "Participant registration";
    const additionalFields = Object.entries(item.entryFields || {}).filter(([, value]) => value !== "" && value != null);
    const hasPayment = ["Valorant", "FIFA"].includes(item.segment) || (item.paymentStatus && item.paymentStatus !== "Not Required");
    modalContent.innerHTML = `
      <section class="organizer-detail-section">
        <h3>Registration</h3>
        <dl class="organizer-detail-grid">
          ${detailItem("Registration ID", item.registrationId)}${detailItem("Submitted", formatDate(item.submittedAt))}${detailItem("Project Category", item.projectCategory)}${detailItem("Segment", item.segment)}${detailItem("Group", item.group)}${detailItem("Team Name", item.teamName)}${detailItem("Entry / Topic Name", item.entryName)}${detailItem("CA Reference", item.caReference)}${detailItem("Member Count", item.memberCount)}${detailItem("Status", item.status)}${item.checkInTime ? detailItem("Check-in Time", item.checkInTime) : ""}
          ${additionalFields.map(([key, value]) => detailItem(prettyLabel(key), Array.isArray(value) ? value.join(", ") : String(value))).join("")}
        </dl>
      </section>
      ${hasPayment ? `<section class="organizer-detail-section"><h3>Payment</h3><dl class="organizer-detail-grid">${detailItem("Method", item.paymentMethod)}${detailItem("Amount", item.paymentAmount ? `৳${item.paymentAmount}` : "")}${detailItem("bKash Number", item.paymentPhone)}${detailItem("Transaction ID", item.transactionId)}${detailItem("Payment Status", item.paymentStatus)}${detailItem("Review Note", item.paymentReviewNote)}${item.paymentApprovedTime ? detailItem("Approved Time", item.paymentApprovedTime) : ""}</dl></section>` : ""}
      <section class="organizer-detail-section"><h3>Members</h3><div class="organizer-member-grid">${(item.members || []).length ? item.members.map(memberCard).join("") : "<p>No member details were found in this record.</p>"}</div></section>`;
    modal.hidden = false;
    document.body.classList.add("organizer-modal-open");
    byId("organizer-modal-close").focus();
  };

  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove("organizer-modal-open");
    if (lastFocusedElement) lastFocusedElement.focus();
  }
  byId("organizer-modal-close").addEventListener("click", closeModal);
  modal.querySelector("[data-close-organizer-modal]").addEventListener("click", closeModal);
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (!reportModal.hidden) closeReportModal();
    else if (!modal.hidden) closeModal();
  });
})();
