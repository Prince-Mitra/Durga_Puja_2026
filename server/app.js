const fs = require("fs");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const config = require("./config/env");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const publicRoutes = require("./routes/publicRoutes");
const requireDb = require("./middleware/requireDb");
const { requireCustomHeader } = require("./middleware/auth");
const { apiLimiter } = require("./middleware/rateLimits");
const { notFound, errorHandler } = require("./middleware/errorHandler");

function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", config.trustProxy);

  const mediaOrigin = config.storage.publicBaseUrl
    ? [config.storage.publicBaseUrl]
    : [];
  app.use(
    helmet({
      // Uploaded media may be embedded by a client served from a different origin in dev.
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "blob:", ...mediaOrigin],
          mediaSrc: ["'self'", "blob:", ...mediaOrigin],
          connectSrc: ["'self'", "ws:", "wss:", ...config.clientUrls],
          objectSrc: ["'none'"],
          frameAncestors: ["'self'"],
        },
      },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header = same-origin navigation, curl, server-to-server: allowed.
        if (!origin || config.clientUrls.includes(origin))
          return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "50kb" }));

  // Uploaded media. Immutable file names (uuid) -> safe to cache for a long time. Range requests work (video seeking).
  app.use(
    "/uploads",
    express.static(config.storage.uploadDir, {
      index: false,
      dotfiles: "ignore",
      maxAge: "30d",
      immutable: true,
      setHeaders: (res) => res.setHeader("Content-Disposition", "inline"),
    }),
  );

  app.get("/api/health", (req, res) => {
    const connected = mongoose.connection.readyState === 1;
    res
      .status(connected ? 200 : 503)
      .json({
        status: connected ? "ok" : "degraded",
        database: connected ? "up" : "down",
      });
  });

  app.use("/api", apiLimiter, requireDb, requireCustomHeaderForAdminOnly());
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api", publicRoutes);
  app.use("/api", notFound);

  // In production the same server can serve the built React app (single deployment).
  const clientDist = path.resolve(config.serverRoot, "../client/dist");
  if (fs.existsSync(path.join(clientDist, "index.html"))) {
    app.use(express.static(clientDist, { index: false, maxAge: "1h" }));
    app.get("*", (req, res) =>
      res.sendFile(path.join(clientDist, "index.html")),
    );
  }

  app.use(errorHandler);
  return app;
}

// Cookie-authenticated routes need the CSRF header; public anonymous routes use header tokens, not cookies.
function requireCustomHeaderForAdminOnly() {
  return (req, res, next) =>
    /^\/(admin|auth)(\/|$)/.test(req.path)
      ? requireCustomHeader(req, res, next)
      : next();
}

module.exports = createApp;
