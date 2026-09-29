/* =============================================================
   3rd BNMPC National Science Carnival 2026
   GOOGLE APPS SCRIPT BACKEND

   1. Paste the Google Spreadsheet ID below.
   2. Run setupSheets() once.
   3. Deploy as a Web App: Execute as "Me"; access "Anyone".
   4. Paste the deployment URL into dist/config.js.
   ============================================================= */

const SPREADSHEET_ID = "PASTE_GOOGLE_SPREADSHEET_ID_HERE";
const EVENT_NAME = "3rd BNMPC National Science Carnival 2026";
const EVENT_DATES = "29–31 October 2026";
const EVENT_VENUE = "Birshreshtha Noor Mohammad Public College, Peelkhana, Dhaka";

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
  headers.push("Status", "Raw Submission");
  return headers;
})();

const VISITOR_HEADERS = ["Timestamp", "Registration ID", "Name", "Institution", "Email", "Mobile", "Address / District", "Status", "Raw Submission"];

function setupSheets() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  SEGMENT_SHEETS.forEach(name => ensureSheet_(spreadsheet, name, name === "Visitor Registration" ? VISITOR_HEADERS : PARTICIPANT_HEADERS));
}

function doGet() {
  return json_({ ok: true, event: EVENT_NAME, message: "Registration service is running." });
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
  }
  return sheet;
}

function visitorRow_(data) {
  return [new Date(), data.registrationId, data.name, data.institution, data.email, data.phone, data.address, "New", JSON.stringify(data)];
}

function participantRow_(data) {
  const row = [new Date(), data.registrationId, data.segment, data.group || "", data.teamName || "", data.entryName || "", JSON.stringify(data.entryFields || {}), Number(data.memberCount || 0)];
  const members = Array.isArray(data.members) ? data.members : [];
  for (let index = 0; index < 7; index += 1) {
    const member = members[index] || {};
    row.push(member.name || "", member.className || "", member.institution || "", member.mobile || "", member.email || "", member.inGameNameTag || "", member.discordUsername || "");
  }
  row.push("New", JSON.stringify(data));
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
  const recipients = isVisitor
    ? [data.email]
    : (data.members || []).map(member => member.email).filter(Boolean);
  const uniqueRecipients = [...new Set(recipients.map(email => String(email).trim().toLowerCase()).filter(Boolean))];
  if (!uniqueRecipients.length) return;

  const registrationFor = isVisitor ? "Visitor Registration" : data.segment;
  const subject = `${EVENT_NAME} — Registration Confirmation`;
  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;background:#0c0c11;color:#f5f5f8;padding:30px;border-radius:22px">
      <p style="color:#ff5750;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Registration confirmed</p>
      <h1 style="font-size:28px;margin:8px 0 16px">${EVENT_NAME}</h1>
      <p style="color:#c5c5ce;line-height:1.6">Thank you for registering. Please keep the registration ID below for verification.</p>
      <div style="background:#191921;border:1px solid #30303a;padding:18px;border-radius:14px;margin:20px 0">
        <p style="margin:0 0 8px"><strong>Registration ID:</strong> ${escapeHtml_(data.registrationId)}</p>
        <p style="margin:0 0 8px"><strong>Registration:</strong> ${escapeHtml_(registrationFor)}</p>
        <p style="margin:0 0 8px"><strong>Date:</strong> ${EVENT_DATES}</p>
        <p style="margin:0"><strong>Venue:</strong> ${EVENT_VENUE}</p>
      </div>
      <p style="color:#9b9ba7;font-size:13px;line-height:1.6">Please bring a valid institutional ID and follow the official rules of your selected segment.</p>
      <p style="margin-top:24px">BNMPC Science Club</p>
    </div>`;

  MailApp.sendEmail({
    to: uniqueRecipients[0],
    bcc: uniqueRecipients.slice(1).join(","),
    subject,
    htmlBody,
    name: "BNMPC Science Club"
  });
}

function escapeHtml_(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
