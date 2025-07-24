import logger from "../utils/logger";
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  // Get the server host from environment or use localhost as fallback
  const SERVER_HOST = process.env.REACT_APP_SERVER_HOST || "localhost";
  const SERVER_PORT = process.env.REACT_APP_SERVER_PORT || 5001;

  // Proxy API requests to the backend server
  app.use(
    "/api",
    createProxyMiddleware({
      target: `http://${SERVER_HOST}:${SERVER_PORT}`,
      changeOrigin: true,
      secure: false,
      logLevel: "info",
      onError: (err, req, res) => {
        logger.info("Proxy error:", err.message);
        logger.info("Request URL:", req.url);
        logger.info("Target:", `http://${SERVER_HOST}:${SERVER_PORT}`);
      },
      onProxyReq: (proxyReq, req, res) => {
        logger.info(
          `Proxying ${req.method} ${req.url} -> http://${SERVER_HOST}:${SERVER_PORT}${req.url}`
        );
      },
    })
  );

  // Proxy WebSocket connections to the backend server
  app.use(
    "/ws",
    createProxyMiddleware({
      target: `ws://${SERVER_HOST}:${SERVER_PORT}`,
      changeOrigin: true,
      secure: false,
      ws: true, // Enable WebSocket proxying
      logLevel: "debug", // Increased log level
      onError: (err, req, res) => {
        logger.info("WebSocket proxy error:", err.message);
        logger.info("WebSocket Request URL:", req.url);
        logger.info("WebSocket Target:", `ws://${SERVER_HOST}:${SERVER_PORT}`);
      },
      onProxyReqWs: (proxyReq, req, socket, options, head) => {
        logger.info(
          `Proxying WebSocket ${req.url} -> ws://${SERVER_HOST}:${SERVER_PORT}${req.url}`
        );
      },
      onOpen: (proxySocket) => {
        logger.info("WebSocket proxy connection opened");
      },
      onClose: (res, socket, head) => {
        logger.info("WebSocket proxy connection closed");
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
