# Staff QR Verification Setup

## What the system does

- Opens verify.html behind a staff PIN.
- Uses a phone camera or computer webcam to scan the existing registration QR.
- Accepts a registration ID manually if the camera cannot read the pass.
- Shows Verified, Already Checked In, Invalid, or Service Error.
- Saves Checked In and the check-in time in the correct segment sheet.
- Keeps the verification page out of search engines and does not add it to the website menu.

## A. Preview before Google Sheets is connected

1. Upload these four files to the GitHub repository root:
   - verify.html
   - verification.js
   - verification.css
   - config.js
2. Open: https://3rd-bnmpcsc-carnival.online/verify.html
3. The preview PIN is 2026.
4. Camera scanning works, but official verification/check-in requires Google Sheets.

## B. Enable official verification and check-in

1. Open the Google Apps Script project connected to the registration spreadsheet.
2. Replace its Code.gs with the supplied backend/Code.gs.
3. At the top of Code.gs, paste the correct Google Spreadsheet ID into SPREADSHEET_ID.
4. Replace CHANGE_THIS_PIN in STAFF_PIN with a private 4-12 digit PIN.
5. Run setupSheets() once. This creates missing segment sheets and adds the Check-in Time column without deleting existing registrations.
6. Deploy the Apps Script as a new Web App version:
   - Execute as: Me
   - Who has access: Anyone
7. Copy the new /exec deployment URL.
8. In config.js, paste it into googleAppsScriptUrl and change demoMode to false.
9. Upload the updated config.js to GitHub.

## C. Event-day use

1. Organisers open: https://3rd-bnmpcsc-carnival.online/verify.html
2. Enter the private staff PIN.
3. Press Start Camera and allow camera access.
4. Scan the participant's QR.
5. A first valid scan becomes Verified & Checked In.
6. A repeated valid scan becomes Already Checked In.
7. An unknown or damaged code becomes Invalid / Not Found.

Keep the staff PIN private. The real PIN is stored only in the private Apps Script source; the public website does not contain it after demoMode is disabled.
