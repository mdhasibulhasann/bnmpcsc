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

/* Change this before deployment. Keep the real PIN only in Apps Script. */
const STAFF_PIN = "2026";

const SEGMENT_SHEETS = [
  "Visitor Registration",
  "Project Display",
  "Wall Magazine",
  "Scrapbook",
  "Physics Olympiad",
  "Chemistry Olympiad",
  "Mathematics Olympiad",
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
  headers.push("Status", "Raw Submission", "Check-in Time");
  return headers;
})();

const VISITOR_HEADERS = ["Timestamp", "Registration ID", "Name", "Institution", "Email", "Mobile", "Address / District", "Status", "Raw Submission", "Check-in Time"];

function setupSheets() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  SEGMENT_SHEETS.forEach(name => ensureSheet_(spreadsheet, name, name === "Visitor Registration" ? VISITOR_HEADERS : PARTICIPANT_HEADERS));
}

function doGet(event) {
  try {
    const parameters = event && event.parameter ? event.parameter : {};
    if (parameters.action === "staff-auth") {
      return response_({ ok: true, authorized: validStaffPin_(parameters.pin) }, parameters.callback);
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
    return response_({ ok: true, event: EVENT_NAME, message: "Registration service is running." }, parameters.callback);
  } catch (error) {
    return response_({ ok: false, valid: false, message: error.message || "Verification failed." }, event && event.parameter && event.parameter.callback);
  }
}

function verifyRegistration_(registrationId) {
  const id = String(registrationId || "").trim().toUpperCase();
  if (!/^BNMPC26-[A-Z0-9-]+$/.test(id)) return { ok: true, valid: false };

  const record = findRegistrationRecord_(id);
  if (!record) return { ok: true, valid: false };
  return { ok: true, valid: true, registration: registrationFromRecord_(record) };
}

function validStaffPin_(pin) {
  const supplied = String(pin || "").trim();
  return STAFF_PIN !== "CHANGE_THIS_PIN" && supplied.length >= 4 && supplied === STAFF_PIN;
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
    checkInTime: value("Check-in Time")
  };
}

function staffCheckIn_(registrationId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const record = findRegistrationRecord_(registrationId);
    if (!record) return { ok: true, authorized: true, valid: false };

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
    const isVisitor = data.registrationType === "Visitor";
    const sheetName = isVisitor ? "Visitor Registration" : String(data.segment || "").trim();
    if (SEGMENT_SHEETS.indexOf(sheetName) === -1) throw new Error("Unknown registration segment.");

    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const sheet = ensureSheet_(spreadsheet, sheetName, isVisitor ? VISITOR_HEADERS : PARTICIPANT_HEADERS);
      if (!isVisitor && sheetName === "RoboSoccer") ensureUniqueRoboSoccerMembers_(sheet, data.members || []);
      sheet.appendRow(isVisitor ? visitorRow_(data) : participantRow_(data));
    } finally {
      lock.releaseLock();
    }

    sendConfirmation_(data);
    return json_({ ok: true, registrationId: data.registrationId });
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
  row.push("New", JSON.stringify(data), "");
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

function sendConfirmation_(data) {
  const isVisitor = data.registrationType === "Visitor";

  const recipient = String(
    (isVisitor
      ? data.email
      : ((data.members || [])[0] || {}).email
    ) || ""
  ).trim().toLowerCase();

  if (!recipient) return;

  const registrationId = String(data.registrationId || "").trim();
  const registrationFor = isVisitor
    ? "Visitor Registration"
    : String(data.segment || "Participant Registration");

  const verificationUrl =
    `${VERIFY_PAGE_URL}?id=${encodeURIComponent(registrationId)}`;

  const subject = `${EVENT_NAME} — Registration Confirmation`;

  /* Create QR image */
  let qrBlob = null;

  try {
    const qrApiUrl =
      "https://quickchart.io/qr" +
      "?text=" + encodeURIComponent(verificationUrl) +
      "&size=360" +
      "&margin=2" +
      "&ecLevel=H" +
      "&format=png";

    const qrResponse = UrlFetchApp.fetch(qrApiUrl, {
      muteHttpExceptions: true
    });

    if (qrResponse.getResponseCode() === 200) {
      qrBlob = qrResponse
        .getBlob()
        .setName(`${registrationId}-QR-Pass.png`);
    }
  } catch (error) {
    console.log("QR generation failed: " + error.message);
  }

  const qrSection = qrBlob
    ? `
      <div style="margin:22px 0;text-align:center">
        <p style="margin:0 0 12px;font-weight:700;color:#ffffff">
          Entry QR Pass
        </p>

        <div style="display:inline-block;background:#ffffff;padding:14px;border-radius:16px">
          <img
            src="cid:entryQr"
            width="260"
            height="260"
            alt="Registration QR Code"
            style="display:block"
          >
        </div>

        <p style="margin:12px 0 0;color:#b8b8c2;font-size:13px">
          Present this QR code at the entry desk.
        </p>
      </div>
    `
    : `
      <p style="color:#b8b8c2">
        QR image could not be generated. Your registration ID is still valid.
      </p>
    `;

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;background:#0c0c11;color:#f5f5f8;padding:30px;border-radius:22px">
      
      <p style="color:#ff5750;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">
        Registration confirmed
      </p>

      <h1 style="font-size:28px;margin:8px 0 16px">
        ${EVENT_NAME}
      </h1>

      <p style="color:#c5c5ce;line-height:1.6">
        Thank you for registering. Please keep your registration ID and QR pass for entry verification.
      </p>

      <div style="background:#191921;border:1px solid #30303a;padding:18px;border-radius:14px;margin:20px 0">
        <p style="margin:0 0 8px">
          <strong>Registration ID:</strong>
          ${escapeHtml_(registrationId)}
        </p>

        <p style="margin:0 0 8px">
          <strong>Registration:</strong>
          ${escapeHtml_(registrationFor)}
        </p>

        <p style="margin:0 0 8px">
          <strong>Date:</strong> ${EVENT_DATES}
        </p>

        <p style="margin:0">
          <strong>Venue:</strong> ${EVENT_VENUE}
        </p>
      </div>

      ${qrSection}

      <p style="color:#9b9ba7;font-size:13px;line-height:1.6">
        Please bring a valid institutional ID and follow the official rules of your selected segment.
      </p>

      <p style="margin-top:24px">
        BNMPC Science Club
      </p>
    </div>
  `;

  const mailOptions = {
    to: recipient,
    subject: subject,
    body:
      `Registration confirmed.\n\n` +
      `Registration ID: ${registrationId}\n` +
      `Registration: ${registrationFor}\n` +
      `Date: ${EVENT_DATES}\n` +
      `Venue: ${EVENT_VENUE}\n\n` +
      `Please present your QR pass or registration ID at the entry desk.`,
    htmlBody: htmlBody,
    name: "BNMPC Science Club"
  };

  if (qrBlob) {
    mailOptions.inlineImages = {
      entryQr: qrBlob
    };

    mailOptions.attachments = [
      qrBlob.copyBlob().setName(`${registrationId}-QR-Pass.png`)
    ];
  }

  MailApp.sendEmail(mailOptions);
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
