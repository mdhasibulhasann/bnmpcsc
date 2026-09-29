/* =============================================================
   REGISTRATION CONNECTION
   Paste the deployed Google Apps Script web-app URL below.
   Keep demoMode true until the Google Sheet connection is ready.
   ============================================================= */
window.BNMPC_CONFIG = {
  googleAppsScriptUrl: "",
  demoMode: true,

  /* The QR code opens this page. Keep it on the final domain. */
  verificationPageUrl: "https://3rd-bnmpcsc-carnival.online/verify.html",

  /* QRCodeJS is loaded only after a registration is completed. */
  qrLibraryUrl: "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"
};
