/* ==========================================================================
   Vercel serverless entry point for the enquiry API.
   --------------------------------------------------------------------------
   Vercel serves this file at POST /api/contact and installs the dependencies
   from the repository root package.json. The Express app in server/server.js
   is reused unchanged, so the same code runs as a standalone Node service or
   as a function attached to the deployed frontend.

   Set SMTP_* and MAIL_TO in Vercel → Project → Settings → Environment
   Variables. No secret is ever stored in the repository.
   ========================================================================== */

"use strict";

module.exports = require("../server/server.js").app;
