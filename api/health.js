/* ==========================================================================
   Vercel serverless health probe: GET /api/health
   Reports whether the SMTP/recipient variables are present. Never returns
   their values.
   ========================================================================== */

"use strict";

const { isMailConfigured } = require("../server/server.js");

module.exports = function health(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    ok: true,
    status: "ok",
    emailConfigured: isMailConfigured(),
    timestamp: new Date().toISOString()
  });
};
