const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  // Proxy only API requests to the backend server
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://192.168.1.240:5001",
      changeOrigin: true,
      secure: false,
      logLevel: "warn",
      onError: (err, req, res) => {
        console.log("Proxy error:", err.message);
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
