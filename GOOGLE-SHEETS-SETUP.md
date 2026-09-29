# Google Sheets registration setup

The website forms are complete, but Google requires one connection step before live registrations can be stored or confirmation emails can be sent.

## 1. Create the spreadsheet

1. Create a new Google Spreadsheet.
2. Copy the ID between `/d/` and `/edit` in the spreadsheet URL.
3. Open `backend/Code.gs` and replace `PASTE_GOOGLE_SPREADSHEET_ID_HERE` with that ID.

## 2. Create the Apps Script

1. From the spreadsheet, open **Extensions → Apps Script**.
2. Replace the default code with everything from `backend/Code.gs`.
3. Save the project.
4. Select `setupSheets` from the function menu and run it once.
5. Approve the requested Google Sheets and email permissions.

This automatically creates a separate tab for Visitor Registration and every competition segment.

## 3. Deploy the registration service

1. Select **Deploy → New deployment**.
2. Choose **Web app**.
3. Set **Execute as** to **Me**.
4. Set access to **Anyone**.
5. Deploy and copy the Web App URL ending in `/exec`.

## 4. Connect the website

Open `dist/config.js` and change it to:

```js
window.BNMPC_CONFIG = {
  googleAppsScriptUrl: "PASTE_THE_WEB_APP_URL_HERE",
  demoMode: false
};
```

Upload the updated `config.js` to the live website. New registrations will then be stored in the correct segment tab and confirmation emails will be sent automatically.

## Important

- Test with one visitor and one participant registration before publishing the registration link publicly.
- Do not rename spreadsheet tabs after registrations begin.
- If the Apps Script code is changed, create a new deployment version and keep the latest `/exec` URL in `config.js`.
- Apps Script email sending is subject to the daily quota of the Google account that owns the script.
