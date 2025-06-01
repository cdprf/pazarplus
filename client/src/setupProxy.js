const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  // Get the local IP address for external device access
  const LOCAL_IP = "192.168.1.105"; // Your machine's IP address
  const SERVER_PORT = 5001;

  // Proxy only API requests to the backend server
  app.use(
    "/api",
    createProxyMiddleware({
      target: `http://${LOCAL_IP}:${SERVER_PORT}`, // Use local IP for external access
      changeOrigin: true,
      secure: false,
      logLevel: "info",
      onError: (err, req, res) => {
        console.log("Proxy error:", err.message);
        console.log("Request URL:", req.url);
        console.log("Target:", `http://${LOCAL_IP}:${SERVER_PORT}`);
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(
          `Proxying ${req.method} ${req.url} -> http://${LOCAL_IP}:${SERVER_PORT}${req.url}`
        );
      },
    })
  );

  // Ensure webpack HMR files are NOT proxied
  app.use("*.hot-update.json", (req, res, next) => {
    // Skip proxy for HMR files - let webpack dev server handle them
    next();
  });

  app.use("*.hot-update.js", (req, res, next) => {
    // Skip proxy for HMR files - let webpack dev server handle them
    next();
  });
};
