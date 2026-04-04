/**
 * Opcional: sobrescreva a origem da API do portal antes de carregar contact-capture.js
 * window.__ADV_PORTAL_ORIGIN__ = "https://staging-portal.exemplo.com";
 */
(function (w) {
  if (!w.__ADV_PORTAL_ORIGIN__) {
    var host = w.location && w.location.hostname ? w.location.hostname : "";
    if (host === "localhost" || host === "127.0.0.1") {
      w.__ADV_PORTAL_ORIGIN__ = w.location.origin;
    } else {
      w.__ADV_PORTAL_ORIGIN__ = "https://portal.advnoemia.com.br";
    }
  }
})(typeof window !== "undefined" ? window : this);
