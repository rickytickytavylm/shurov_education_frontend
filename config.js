(function () {
  const script = document.currentScript;
  let base = "./";
  if (script && script.src) {
    base = script.src.replace(/config\.js(?:\?.*)?$/i, "");
  } else {
    const path = location.pathname.replace(/index\.html$/i, "");
    base = path.endsWith("/") ? path : path.replace(/[^/]+$/, "") || "./";
  }
  window.EDU_BASE = base;
  let el = document.querySelector("base");
  if (!el) {
    el = document.createElement("base");
    document.head.insertBefore(el, document.head.firstChild);
  }
  el.href = base;
  window.EDU_CONFIG = {
    BACKEND_URL:
      location.hostname === "localhost" || location.hostname === "127.0.0.1"
        ? "http://localhost:8788"
        : "https://api.kira-ai.online",
  };
  window.asset = function (path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path) || path.startsWith("data:") || path.startsWith("mailto:")) return path;
    return String(path).replace(/^\//, "");
  };
})();
