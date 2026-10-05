/* =============================================================
   3rd BNMPC National Science Carnival 2026
   GOOGLE APPS SCRIPT BACKEND

   1. Paste the Google Spreadsheet ID below.
   2. Run setupSheets() once.
   3. Deploy as a Web App: Execute as "Me"; access "Anyone".
   4. Paste the deployment URL into dist/config.js.
   ============================================================= */

const SPREADSHEET_ID = "1mZpwjLMkXXte22ZmvM52nox3AQKwzCkNUtUtbmxbOuw";
const EVENT_NAME = "3rd BNMPC National Science Carnival 2026";
const EVENT_DATES = "29–31 October 2026";
const EVENT_VENUE = "Birshreshtha Noor Mohammad Public College, Peelkhana, Dhaka";
const VERIFY_PAGE_URL = "https://3rd-bnmpcsc-carnival.online/verify.html";
const BACKEND_VERSION = "2026-10-06-three-fix-v1";

/* Change this before deployment. Keep the real PIN only in Apps Script. */
const STAFF_PIN = "2026";

/* Private PIN for the gaming payment committee portal. */
const GAMING_STAFF_PIN = "4040";
const GAMING_SHEETS = ["Valorant", "FIFA"];
const PAYMENT_CONTACT_NAME = "Md. Tahmid Mahir";
const PAYMENT_CONTACT_ROLE = "General Secretary";
const PAYMENT_CONTACT_PHONE = "+880 19 0222 3848";

const SEGMENT_SHEETS = [
  "Visitor Registration",
  "Project Display",
  "Wall Magazine",
  "Scrapbook",
  "Photography Exhibition",
  "Physics Olympiad",
  "Chemistry Olympiad",
  "Mathematics Olympiad",
  "Science Olympiad",
  "Biology Olympiad",
  "IT Olympiad",
  "General Knowledge Olympiad",
  "Marvel & DC Quiz",
  "Movie & Series Quiz",
  "Team Quiz",
  "Multimedia Presentation",
  "Extempore Speech",
  "Scientific Story Writing",
  "Sudoku",
  "Case Solving",
  "Coding Contest",
  "RoboSoccer",
  "Rubik’s Cube",
  "Valorant",
  "FIFA"
];

const PARTICIPANT_HEADERS = (() => {
  const headers = ["Timestamp", "Registration ID", "Segment", "Group", "Team Name", "Project / Item / Topic Name", "Additional Fields", "Member Count"];
  for (let number = 1; number <= 7; number += 1) {
    headers.push(`Member ${number} Name`, `Member ${number} Class`, `Member ${number} Institution`, `Member ${number} Mobile`, `Member ${number} Email`, `Member ${number} In-game Name & Tag`, `Member ${number} Discord Username`);
  }
  headers.push(
    "Status", "Raw Submission", "Check-in Time",
    "Payment Method", "Payment Amount", "Payment bKash Number",
    "Transaction ID", "Payment Status", "Payment Review Note", "Payment Approved Time"
  );
  return headers;
})();

const VISITOR_HEADERS = ["Timestamp", "Registration ID", "Name", "Institution", "Email", "Mobile", "Address / District", "Status", "Raw Submission", "Check-in Time"];

function setupSheets() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  SEGMENT_SHEETS.forEach(name => {
    const headers = name === "Visitor Registration" ? VISITOR_HEADERS : PARTICIPANT_HEADERS;
    const sheet = ensureSheet_(spreadsheet, name, headers);
    sheet.showSheet();
  });

  SpreadsheetApp.flush();
  console.log("Spreadsheet updated: " + spreadsheet.getUrl());
  console.log("Total sheets: " + spreadsheet.getSheets().length);
  console.log("Available sheets: " + spreadsheet.getSheets().map(sheet => sheet.getName()).join(" | "));
}

/* Run this only if Photography Exhibition or Science Olympiad is not visible. */
function createMissingEventSheets() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const newEventSheets = ["Photography Exhibition", "Science Olympiad"];

  newEventSheets.forEach(name => {
    let sheet = spreadsheet.getSheetByName(name);
    if (!sheet) sheet = spreadsheet.insertSheet(name);
    sheet.showSheet();

    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, PARTICIPANT_HEADERS.length)
        .setValues([PARTICIPANT_HEADERS])
        .setFontWeight("bold")
        .setBackground("#111118")
        .setFontColor("#ffffff");
      sheet.setFrozenRows(1);
    }
  });

  SpreadsheetApp.flush();
  console.log("Spreadsheet updated: " + spreadsheet.getUrl());
  console.log("Available sheets: " + spreadsheet.getSheets().map(sheet => sheet.getName()).join(" | "));
}

function doGet(event) {
  try {
    const parameters = event && event.parameter ? event.parameter : {};
    if (parameters.action === "staff-auth") {
      return response_({ ok: true, authorized: validStaffPin_(parameters.pin) }, parameters.callback);
    }
    if (parameters.action === "gaming-transaction-available") {
      const transactionId = normalizeTransactionId_(parameters.transactionId);
      return response_({
        ok: true,
        available: Boolean(transactionId) && isGamingTransactionAvailable_(transactionId)
      }, parameters.callback);
    }
    if (parameters.action === "gaming-auth") {
      return response_({ ok: true, authorized: validGamingPin_(parameters.pin) }, parameters.callback);
    }
    if (parameters.action === "gaming-payments-list") {
      if (!validGamingPin_(parameters.pin)) {
        return response_({ ok: false, authorized: false, payments: [] }, parameters.callback);
      }
      return response_({ ok: true, authorized: true, payments: listGamingPayments_() }, parameters.callback);
    }
    if (parameters.action === "gaming-payment-approve") {
      if (!validGamingPin_(parameters.pin)) {
        return response_({ ok: false, authorized: false }, parameters.callback);
      }
      return response_(approveGamingPayment_(parameters.id), parameters.callback);
    }
    if (parameters.action === "gaming-payment-issue") {
      if (!validGamingPin_(parameters.pin)) {
        return response_({ ok: false, authorized: false }, parameters.callback);
      }
      return response_(flagGamingPaymentIssue_(parameters.id, parameters.reason), parameters.callback);
    }
    if (parameters.action === "staff-checkin") {
      if (!validStaffPin_(parameters.pin)) {
        return response_({ ok: false, authorized: false, valid: false }, parameters.callback);
      }
      return response_(staffCheckIn_(parameters.id), parameters.callback);
    }
    if (parameters.action === "verify") {
      if (!validStaffPin_(parameters.pin)) {
        return response_({ ok: false, authorized: false, valid: false }, parameters.callback);
      }
      const result = verifyRegistration_(parameters.id);
      return response_(result, parameters.callback);
    }
    return response_({
      ok: true,
      event: EVENT_NAME,
      version: BACKEND_VERSION,
      visitorEmailEnabled: false,
      segmentCount: SEGMENT_SHEETS.length - 1,
      photographySheetEnabled: SEGMENT_SHEETS.indexOf("Photography Exhibition") !== -1,
      scienceOlympiadSheetEnabled: SEGMENT_SHEETS.indexOf("Science Olympiad") !== -1,
      message: "Registration service is running."
    }, parameters.callback);
  } catch (error) {
    return response_({ ok: false, valid: false, message: error.message || "Verification failed." }, event && event.parameter && event.parameter.callback);
  }
}

function verifyRegistration_(registrationId) {
  const id = String(registrationId || "").trim().toUpperCase();
  if (!/^BNMPC26-[A-Z0-9-]+$/.test(id)) return { ok: true, valid: false };

  const record = findRegistrationRecord_(id);
  if (!record) return { ok: true, valid: false };
  if (GAMING_SHEETS.indexOf(record.sheetName) !== -1 && valueFromRecord_(record, "Payment Status") !== "Approved") {
    return { ok: true, valid: false, paymentPending: true };
  }
  return { ok: true, valid: true, registration: registrationFromRecord_(record) };
}

function validStaffPin_(pin) {
  const supplied = String(pin || "").trim();
  return STAFF_PIN !== "CHANGE_THIS_PIN" && supplied.length >= 4 && supplied === STAFF_PIN;
}

function validGamingPin_(pin) {
  const supplied = String(pin || "").trim();
  return supplied.length >= 4 && supplied === GAMING_STAFF_PIN;
}

function findRegistrationRecord_(registrationId) {
  const id = String(registrationId || "").trim().toUpperCase();
  if (!/^BNMPC26-[A-Z0-9-]+$/.test(id)) return null;

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  for (let index = 0; index < SEGMENT_SHEETS.length; index += 1) {
    const sheetName = SEGMENT_SHEETS[index];
    const isVisitor = sheetName === "Visitor Registration";
    const headers = isVisitor ? VISITOR_HEADERS : PARTICIPANT_HEADERS;
    const sheet = ensureSheet_(spreadsheet, sheetName, headers);
    if (sheet.getLastRow() < 2) continue;
    const match = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1)
      .createTextFinder(id)
      .matchEntireCell(true)
      .matchCase(false)
      .findNext();
    if (!match) continue;
    return {
      id: id,
      isVisitor: isVisitor,
      sheetName: sheetName,
      sheet: sheet,
      rowNumber: match.getRow(),
      headers: headers,
      row: sheet.getRange(match.getRow(), 1, 1, headers.length).getDisplayValues()[0]
    };
  }
  return null;
}

function registrationFromRecord_(record) {
  const raw = record.row[record.headers.indexOf("Raw Submission")];
  let data = {};
  try { data = JSON.parse(raw || "{}"); } catch (error) { data = {}; }
  const firstMember = Array.isArray(data.members) && data.members.length ? data.members[0] : {};
  const value = header => record.row[record.headers.indexOf(header)] || "";

  return {
    registrationId: record.id,
    registrationType: record.isVisitor ? "Visitor" : "Participant",
    segment: record.isVisitor ? "Visitor Registration" : record.sheetName,
    name: record.isVisitor ? (data.name || value("Name")) : (firstMember.name || value("Member 1 Name")),
    institution: record.isVisitor ? (data.institution || value("Institution")) : (firstMember.institution || value("Member 1 Institution")),
    group: record.isVisitor ? "Open for all" : (data.group || value("Group") || "Open for all"),
    teamName: record.isVisitor ? "" : (data.teamName || value("Team Name")),
    memberCount: record.isVisitor ? 1 : (data.memberCount || value("Member Count") || 1),
    status: value("Status") || "Registered",
    checkInTime: value("Check-in Time"),
    paymentStatus: record.isVisitor ? "Not Required" : (value("Payment Status") || "Not Required")
  };
}

function valueFromRecord_(record, header) {
  const index = record.headers.indexOf(header);
  return index >= 0 ? String(record.row[index] || "") : "";
}

function staffCheckIn_(registrationId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const record = findRegistrationRecord_(registrationId);
    if (!record) return { ok: true, authorized: true, valid: false };

    if (GAMING_SHEETS.indexOf(record.sheetName) !== -1 && valueFromRecord_(record, "Payment Status") !== "Approved") {
      return { ok: true, authorized: true, valid: false, paymentPending: true };
    }

    const statusIndex = record.headers.indexOf("Status");
    const timeIndex = record.headers.indexOf("Check-in Time");
    const currentStatus = String(record.row[statusIndex] || "");
    if (/checked\s*in/i.test(currentStatus)) {
      return {
        ok: true,
        authorized: true,
        valid: true,
        alreadyCheckedIn: true,
        registration: registrationFromRecord_(record)
      };
    }

    const checkedInAt = new Date();
    record.sheet.getRange(record.rowNumber, statusIndex + 1).setValue("Checked In");
    record.sheet.getRange(record.rowNumber, timeIndex + 1).setValue(checkedInAt);
    record.row[statusIndex] = "Checked In";
    record.row[timeIndex] = Utilities.formatDate(checkedInAt, Session.getScriptTimeZone() || "Asia/Dhaka", "dd MMM yyyy, hh:mm a");

    return {
      ok: true,
      authorized: true,
      valid: true,
      alreadyCheckedIn: false,
      registration: registrationFromRecord_(record)
    };
  } finally {
    lock.releaseLock();
  }
}

function doPost(event) {
  try {
    if (!event || !event.postData || !event.postData.contents) throw new Error("No submission data received.");
    const data = JSON.parse(event.postData.contents);
    if (data.website) return json_({ ok: false, message: "Spam rejected." });

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const registrationType = String(data.registrationType || "").trim().toLowerCase();
    const isVisitor = registrationType === "visitor";
    const sheetName = isVisitor ? "Visitor Registration" : String(data.segment || "").trim();
    if (SEGMENT_SHEETS.indexOf(sheetName) === -1) throw new Error("Unknown registration segment.");
    const isGaming = !isVisitor && GAMING_SHEETS.indexOf(sheetName) !== -1;

    if (isGaming) validateGamingPayment_(data, sheetName);

    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const sheet = ensureSheet_(spreadsheet, sheetName, isVisitor ? VISITOR_HEADERS : PARTICIPANT_HEADERS);
      if (!isVisitor && sheetName === "RoboSoccer") ensureUniqueRoboSoccerMembers_(sheet, data.members || []);
      if (isGaming && !isGamingTransactionAvailable_(data.transactionId)) {
        throw new Error("This transaction ID has already been used for another gaming registration.");
      }
      sheet.appendRow(isVisitor ? visitorRow_(data) : participantRow_(data));
    } finally {
      lock.releaseLock();
    }

    // Visitor registrations and pending gaming registrations are saved without
    // sending email. Normal participants receive confirmation immediately.
    // Gaming participants receive the final ID and QR email only after payment
    // approval from the private gaming payment portal.
    if (!isVisitor && !isGaming) {
      sendConfirmation_(data);
    }
    return json_({ ok: true, registrationId: data.registrationId, paymentPending: isGaming });
  } catch (error) {
    return json_({ ok: false, message: error.message || "Registration failed." });
  }
}

function ensureSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#111118").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  } else {
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    headers.forEach(header => {
      if (currentHeaders.indexOf(header) === -1) {
        currentHeaders.push(header);
        sheet.getRange(1, currentHeaders.length).setValue(header).setFontWeight("bold").setBackground("#111118").setFontColor("#ffffff");
      }
    });
  }
  return sheet;
}

function visitorRow_(data) {
  return [new Date(), data.registrationId, data.name, data.institution, data.email, data.phone, data.address, "New", JSON.stringify(data), ""];
}

function participantRow_(data) {
  const row = [new Date(), data.registrationId, data.segment, data.group || "", data.teamName || "", data.entryName || "", JSON.stringify(data.entryFields || {}), Number(data.memberCount || 0)];
  const members = Array.isArray(data.members) ? data.members : [];
  for (let index = 0; index < 7; index += 1) {
    const member = members[index] || {};
    row.push(member.name || "", member.className || "", member.institution || "", member.mobile || "", member.email || "", member.inGameNameTag || "", member.discordUsername || "");
  }
  const paymentRequired = Boolean(data.paymentRequired);
  row.push(
    paymentRequired ? "Payment Pending" : "New",
    JSON.stringify(data),
    "",
    paymentRequired ? "bKash" : "",
    paymentRequired ? Number(data.paymentAmount || 0) : "",
    paymentRequired ? String(data.paymentPhone || "") : "",
    paymentRequired ? normalizeTransactionId_(data.transactionId) : "",
    paymentRequired ? "Pending" : "Not Required",
    "",
    ""
  );
  return row;
}

function ensureUniqueRoboSoccerMembers_(sheet, members) {
  if (sheet.getLastRow() < 2) return;
  const existing = sheet.getRange(2, sheet.getLastColumn(), sheet.getLastRow() - 1, 1).getDisplayValues().flat().join(" ").toLowerCase();
  const duplicate = members.some(member => {
    const email = String(member.email || "").trim().toLowerCase();
    const mobile = String(member.mobile || "").replace(/\D/g, "");
    return (email && existing.indexOf(email) !== -1) || (mobile.length >= 8 && existing.replace(/\D/g, "").indexOf(mobile) !== -1);
  });
  if (duplicate) throw new Error("A RoboSoccer participant cannot register with multiple teams.");
}

/* =============================================================
   GAMING PAYMENT VALIDATION AND COMMITTEE WORKFLOW
   ============================================================= */
function normalizeTransactionId_(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function validateGamingPayment_(data, sheetName) {
  const paymentPhone = String(data.paymentPhone || "").replace(/\D/g, "");
  const transactionId = normalizeTransactionId_(data.transactionId);
  if (!/^01[3-9][0-9]{8}$/.test(paymentPhone)) throw new Error("Enter a valid 11-digit bKash number.");
  if (!/^[A-Z0-9]{6,20}$/.test(transactionId)) throw new Error("Enter a valid bKash Transaction ID.");

  data.paymentRequired = true;
  data.paymentMethod = "bKash";
  data.paymentPhone = paymentPhone;
  data.transactionId = transactionId;
  data.paymentAmount = sheetName === "Valorant" ? 1000 : 200;
  data.paymentUnit = sheetName === "Valorant" ? "team" : "participant";
  data.paymentStatus = "Pending";
}

function isGamingTransactionAvailable_(transactionId) {
  const normalized = normalizeTransactionId_(transactionId);
  if (!normalized) return false;
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

  for (let index = 0; index < GAMING_SHEETS.length; index += 1) {
    const sheet = ensureSheet_(spreadsheet, GAMING_SHEETS[index], PARTICIPANT_HEADERS);
    if (sheet.getLastRow() < 2) continue;
    const transactionColumn = PARTICIPANT_HEADERS.indexOf("Transaction ID") + 1;
    const match = sheet.getRange(2, transactionColumn, sheet.getLastRow() - 1, 1)
      .createTextFinder(normalized)
      .matchEntireCell(true)
      .matchCase(false)
      .findNext();
    if (match) return false;
  }
  return true;
}

function rawSubmissionFromRecord_(record) {
  const raw = valueFromRecord_(record, "Raw Submission");
  try { return JSON.parse(raw || "{}"); } catch (error) { return {}; }
}

function setRecordValue_(record, header, value) {
  const index = record.headers.indexOf(header);
  if (index < 0) throw new Error(`Missing sheet column: ${header}`);
  record.sheet.getRange(record.rowNumber, index + 1).setValue(value);
  record.row[index] = value;
}

function gamingPaymentFromRecord_(record) {
  const data = rawSubmissionFromRecord_(record);
  const firstMember = Array.isArray(data.members) && data.members.length ? data.members[0] : {};
  return {
    registrationId: record.id,
    segment: record.sheetName,
    submittedAt: valueFromRecord_(record, "Timestamp"),
    leaderName: firstMember.name || valueFromRecord_(record, "Member 1 Name"),
    teamName: data.teamName || valueFromRecord_(record, "Team Name"),
    email: firstMember.email || valueFromRecord_(record, "Member 1 Email"),
    mobile: firstMember.mobile || valueFromRecord_(record, "Member 1 Mobile"),
    memberCount: data.memberCount || valueFromRecord_(record, "Member Count"),
    paymentMethod: valueFromRecord_(record, "Payment Method") || "bKash",
    paymentAmount: valueFromRecord_(record, "Payment Amount") || (record.sheetName === "Valorant" ? 1000 : 200),
    paymentPhone: valueFromRecord_(record, "Payment bKash Number") || data.paymentPhone,
    transactionId: valueFromRecord_(record, "Transaction ID") || data.transactionId,
    paymentStatus: valueFromRecord_(record, "Payment Status") || "Pending",
    reviewNote: valueFromRecord_(record, "Payment Review Note"),
    approvedTime: valueFromRecord_(record, "Payment Approved Time")
  };
}

function listGamingPayments_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const payments = [];

  GAMING_SHEETS.forEach(sheetName => {
    const sheet = ensureSheet_(spreadsheet, sheetName, PARTICIPANT_HEADERS);
    if (sheet.getLastRow() < 2) return;
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, PARTICIPANT_HEADERS.length).getDisplayValues();
    rows.forEach((row, index) => {
      const id = String(row[1] || "").trim().toUpperCase();
      if (!id) return;
      payments.push(gamingPaymentFromRecord_({
        id,
        isVisitor: false,
        sheetName,
        sheet,
        rowNumber: index + 2,
        headers: PARTICIPANT_HEADERS,
        row
      }));
    });
  });

  return payments.reverse();
}

function approveGamingPayment_(registrationId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const record = findRegistrationRecord_(registrationId);
    if (!record || GAMING_SHEETS.indexOf(record.sheetName) === -1) {
      return { ok: false, authorized: true, message: "Gaming registration not found." };
    }
    if (valueFromRecord_(record, "Payment Status") === "Approved") {
      return { ok: true, authorized: true, alreadyApproved: true, payment: gamingPaymentFromRecord_(record) };
    }

    const data = rawSubmissionFromRecord_(record);
    data.paymentStatus = "Approved";
    sendConfirmation_(data);

    const approvedAt = new Date();
    setRecordValue_(record, "Status", "New");
    setRecordValue_(record, "Payment Status", "Approved");
    setRecordValue_(record, "Payment Review Note", "");
    setRecordValue_(record, "Payment Approved Time", approvedAt);
    setRecordValue_(record, "Raw Submission", JSON.stringify(data));

    return { ok: true, authorized: true, approved: true, payment: gamingPaymentFromRecord_(record) };
  } finally {
    lock.releaseLock();
  }
}

function flagGamingPaymentIssue_(registrationId, requestedReason) {
  const allowedReasons = [
    "Transaction not found",
    "Wrong payment amount",
    "Incorrect bKash number",
    "Duplicate Transaction ID",
    "Other payment issue"
  ];
  const reason = allowedReasons.indexOf(String(requestedReason || "").trim()) !== -1
    ? String(requestedReason).trim()
    : "Other payment issue";

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const record = findRegistrationRecord_(registrationId);
    if (!record || GAMING_SHEETS.indexOf(record.sheetName) === -1) {
      return { ok: false, authorized: true, message: "Gaming registration not found." };
    }
    if (valueFromRecord_(record, "Payment Status") === "Approved") {
      return { ok: false, authorized: true, message: "This payment is already approved." };
    }

    const data = rawSubmissionFromRecord_(record);
    data.paymentStatus = "Needs Attention";
    data.paymentReviewNote = reason;
    sendPaymentIssueEmail_(data, reason);

    setRecordValue_(record, "Status", "Payment Issue");
    setRecordValue_(record, "Payment Status", "Needs Attention");
    setRecordValue_(record, "Payment Review Note", reason);
    setRecordValue_(record, "Raw Submission", JSON.stringify(data));

    return { ok: true, authorized: true, flagged: true, payment: gamingPaymentFromRecord_(record) };
  } finally {
    lock.releaseLock();
  }
}

function sendPaymentIssueEmail_(data, reason) {
  const firstMember = Array.isArray(data.members) && data.members.length ? data.members[0] : {};
  const recipient = String(firstMember.email || "").trim().toLowerCase();
  if (!recipient) throw new Error("The first participant email is missing.");

  const subject = `${EVENT_NAME} — ${reason}`;
  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;background:#0c0c11;color:#f5f5f8;padding:30px;border-radius:22px">
      <p style="color:#ffb45c;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Payment requires attention</p>
      <h1 style="font-size:27px;margin:8px 0 16px">${escapeHtml_(data.segment || "Gaming Registration")}</h1>
      <p style="color:#c5c5ce;line-height:1.6">The carnival committee could not approve your gaming payment for the following reason:</p>
      <div style="background:#21170c;border:1px solid #5a3a16;padding:18px;border-radius:14px;margin:20px 0"><strong>${escapeHtml_(reason)}</strong></div>
      <p style="color:#c5c5ce;line-height:1.6">Please contact the responsible club representative to correct the payment information.</p>
      <div style="background:#191921;border:1px solid #30303a;padding:18px;border-radius:14px;margin:20px 0">
        <p style="margin:0 0 7px"><strong>${escapeHtml_(PAYMENT_CONTACT_NAME)}</strong></p>
        <p style="margin:0 0 7px;color:#c5c5ce">${escapeHtml_(PAYMENT_CONTACT_ROLE)}</p>
        <p style="margin:0"><a href="tel:+8801902223848" style="color:#ffffff;text-decoration:none">${escapeHtml_(PAYMENT_CONTACT_PHONE)}</a></p>
      </div>
      <p style="margin-top:24px">BNMPC Science Club</p>
    </div>`;

  MailApp.sendEmail({
    to: recipient,
    subject,
    body: `Payment requires attention: ${reason}\n\nPlease contact ${PAYMENT_CONTACT_NAME}, ${PAYMENT_CONTACT_ROLE}, at ${PAYMENT_CONTACT_PHONE}.`,
    htmlBody,
    name: "BNMPC Science Club"
  });
}

function sendConfirmation_(data) {
  const isVisitor = String(data.registrationType || "").trim().toLowerCase() === "visitor";

  // Visitor passes are downloaded from the website. Never email visitors,
  // even if this function is called accidentally from another code path.
  if (isVisitor) return;

  const recipient = String((((data.members || [])[0] || {}).email) || "").trim().toLowerCase();
  if (!recipient) return;

  const registrationId = String(data.registrationId || "").trim();
  const registrationFor = isVisitor ? "Visitor Registration" : data.segment;
  const verificationUrl = `${VERIFY_PAGE_URL}?id=${encodeURIComponent(registrationId)}`;
  const subject = `${EVENT_NAME} — Registration Confirmation`;

  let qrBlob = null;
  try {
    const qrApiUrl = "https://quickchart.io/qr" +
      "?text=" + encodeURIComponent(verificationUrl) +
      "&size=360&margin=2&ecLevel=H&format=png";
    const qrResponse = UrlFetchApp.fetch(qrApiUrl, { muteHttpExceptions: true });
    if (qrResponse.getResponseCode() === 200) {
      qrBlob = qrResponse.getBlob().setName(`${registrationId}-QR-Pass.png`);
    }
  } catch (error) {
    console.log("QR generation failed: " + error.message);
  }

  const qrSection = qrBlob ? `
      <div style="margin:22px 0;text-align:center">
        <p style="margin:0 0 12px;font-weight:700;color:#ffffff">Entry QR Pass</p>
        <div style="display:inline-block;background:#ffffff;padding:14px;border-radius:16px">
          <img src="cid:entryQr" width="260" height="260" alt="Registration QR Code" style="display:block">
        </div>
        <p style="margin:12px 0 0;color:#b8b8c2;font-size:13px">Present this QR code at the entry desk.</p>
      </div>` : `
      <p style="color:#b8b8c2">QR image could not be generated. Your registration ID is still valid.</p>`;

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;background:#0c0c11;color:#f5f5f8;padding:30px;border-radius:22px">
      <p style="color:#ff5750;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Registration confirmed</p>
      <h1 style="font-size:28px;margin:8px 0 16px">${EVENT_NAME}</h1>
      <p style="color:#c5c5ce;line-height:1.6">Thank you for registering. Please keep your registration ID and QR pass for entry verification.</p>
      <div style="background:#191921;border:1px solid #30303a;padding:18px;border-radius:14px;margin:20px 0">
        <p style="margin:0 0 8px"><strong>Registration ID:</strong> ${escapeHtml_(registrationId)}</p>
        <p style="margin:0 0 8px"><strong>Registration:</strong> ${escapeHtml_(registrationFor)}</p>
        <p style="margin:0 0 8px"><strong>Date:</strong> ${EVENT_DATES}</p>
        <p style="margin:0"><strong>Venue:</strong> ${EVENT_VENUE}</p>
      </div>
      ${qrSection}
      <p style="color:#9b9ba7;font-size:13px;line-height:1.6">Please bring a valid institutional ID and follow the official rules of your selected segment.</p>
      <p style="margin-top:24px">BNMPC Science Club</p>
    </div>`;

  const mailOptions = {
    to: recipient,
    subject,
    body: `Registration confirmed.\n\nRegistration ID: ${registrationId}\nRegistration: ${registrationFor}\nDate: ${EVENT_DATES}\nVenue: ${EVENT_VENUE}\n\nPlease present your QR pass or registration ID at the entry desk.`,
    htmlBody,
    name: "BNMPC Science Club"
  };

  if (qrBlob) {
    mailOptions.inlineImages = { entryQr: qrBlob };
    mailOptions.attachments = [qrBlob.copyBlob().setName(`${registrationId}-QR-Pass.png`)];
  }

  MailApp.sendEmail(mailOptions);
}

function escapeHtml_(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function response_(data, callback) {
  const callbackName = String(callback || "").trim();
  if (/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callbackName)) {
    return ContentService
      .createTextOutput(`${callbackName}(${JSON.stringify(data)});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json_(data);
}
