# Gaming Payment Update Setup

## 1. Upload the website files

Upload every file from `BNMPC-Gaming-Payment-Frontend.zip` to the root of the GitHub Pages repository. Replace files when GitHub asks.

Do not delete or replace the existing `config.js` or `assets` folder. The update ZIP intentionally does not contain them.

The new public participant page is:

`https://3rd-bnmpcsc-carnival.online/participant-registration.html`

The private gaming committee portal is:

`https://3rd-bnmpcsc-carnival.online/gaming-payments.html`

The private portal is not linked from the website navigation.

## 2. Update Google Apps Script

Before replacing `Code.gs`, copy the current values of:

- `SPREADSHEET_ID`
- `STAFF_PIN`

Replace the complete Apps Script code with the supplied `Code.gs`, then restore those two values. The gaming committee PIN is already:

`4040`

Run `setupSheets()` once. This adds the payment columns without deleting existing registrations.

Then use:

1. Deploy
2. Manage deployments
3. Edit the current Web App deployment
4. Select **New version**
5. Execute as **Me**
6. Access: **Anyone**
7. Deploy

Updating the existing deployment keeps the current `/exec` URL and avoids changing `config.js`.

## 3. Add the official bKash number later

Open `event-data.js` and find:

```js
window.BNMPC_GAMING_PAYMENT = {
  method: "bKash",
  accountNumber: "To be announced",
  accountType: "Personal",
```

Replace only `To be announced` with the official bKash number. Change `Personal` if the account is Merchant or another type.

## 4. Payment workflow

1. Valorant or FIFA registration collects the sender bKash number and Transaction ID.
2. The participant sees a payment-pending message without a QR or registration ID.
3. The entry appears in the private gaming payment portal.
4. **Approve Payment** emails the final registration ID and QR pass.
5. **Payment Issue** opens a reason list. Sending it uses the selected reason as the email subject and includes Md. Tahmid Mahir's contact information.
6. An approved gaming QR can be checked in through the existing staff verification portal.

## 5. Fees

- Valorant: BDT 1,000 per team
- FIFA: BDT 500 per participant

