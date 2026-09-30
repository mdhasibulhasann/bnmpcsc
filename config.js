/* =============================================================
   REGISTRATION CONNECTION
   Paste the deployed Google Apps Script web-app URL below.
   Keep demoMode true until the Google Sheet connection is ready.
   ============================================================= */
window.BNMPC_CONFIG = {
  googleAppsScriptUrl: "https://script.google.com/macros/s/AKfycbx3BeKE4UPhBZQelZ3uKvWje9D7rVWB1wjuGZAKAvvkIbfcwz2grGjovUO6jbyItALKpg/exec",
  demoMode: false,

  /* The QR code opens this page. Keep it on the final domain. */
  verificationPageUrl: "https://3rd-bnmpcsc-carnival.online/verify.html",

  /* QRCodeJS is loaded only after a registration is completed. */
  qrLibraryUrl: "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js",

  /* Camera scanner used only on the private staff verification page. */
  qrScannerLibraryUrl: "https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js",

  /* Preview only. Ignored after demoMode is changed to false. */
  demoStaffPin: "2026"
};
