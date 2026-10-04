(() => {
  "use strict";

  const sponsorData = window.BNMPC_SPONSORS || {};
  const tierLabels = {
    title: "Title Sponsor",
    cohost: "Co-hosted By",
    powered: "Powered By",
    gold: "Gold Sponsor"
  };

  const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const assetUrl = (value = "") => {
    const url = String(value).trim();
    if (/^(https?:)?\/\//i.test(url) || url.startsWith("/")) return url;
    return `/${url.replace(/^\.\//, "")}`;
  };

  const normaliseSponsor = (item) => {
    if (typeof item === "string") return { name: "Sponsor", logo: item, website: "" };
    if (!item || typeof item !== "object") return null;
    return {
      name: String(item.name || "Sponsor").trim(),
      logo: String(item.logo || "").trim(),
      website: String(item.website || "").trim()
    };
  };

  document.querySelectorAll("[data-sponsor-list]").forEach(list => {
    const tier = list.dataset.sponsorList;
    const sponsors = (Array.isArray(sponsorData[tier]) ? sponsorData[tier] : [])
      .map(normaliseSponsor)
      .filter(item => item && item.logo);

    if (!sponsors.length) return;

    list.innerHTML = sponsors.map((sponsor, index) => {
      const image = `<div class="sponsor-logo-visual"><img src="${escapeHtml(assetUrl(sponsor.logo))}" alt="${escapeHtml(sponsor.name)} logo" loading="lazy"></div>`;
      const content = `${image}<span class="sponsor-logo-name">${escapeHtml(sponsor.name)}</span>`;
      if (/^https?:\/\//i.test(sponsor.website)) {
        return `<a class="sponsor-logo-card" href="${escapeHtml(sponsor.website)}" target="_blank" rel="noreferrer" data-sponsor-index="${index}">${content}</a>`;
      }
      return `<div class="sponsor-logo-card" data-sponsor-index="${index}">${content}</div>`;
    }).join("");

    list.querySelectorAll(".sponsor-logo-card img").forEach(image => {
      image.addEventListener("error", () => {
        image.closest(".sponsor-logo-card")?.remove();
        if (!list.querySelector(".sponsor-logo-card")) {
          list.innerHTML = `<div class="sponsor-placeholder">${escapeHtml(tierLabels[tier] || "Sponsor")}<small>Check logo paths in sponsor-data.js</small></div>`;
        }
      });
    });
  });
})();
