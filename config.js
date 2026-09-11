window.EDU_CONFIG = {
  BACKEND_URL:
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
      ? "http://localhost:8791"
      : "",
};
