/* ==========================================================================
   ProjectHub API
   --------------------------------------------------------------------------
   Express + Nodemailer service for the ProjectHub enquiry form.

     GET  /health       Liveness/configuration probe for the host.
     POST /api/contact  Validates an enquiry and emails it to MAIL_TO.

   Secrets are read from environment variables only (see .env.example).
   Enquiries are emailed; nothing is written to a database.
   ========================================================================== */

"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");

/* --- Configuration ------------------------------------------------------- */

const PORT = Number(process.env.PORT) || 5000;

const DEFAULT_ALLOWED_ORIGINS = [
  "https://project-huubb.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8080",
  "http://127.0.0.1:8080"
];

function parseOrigins(value) {
  const source = typeof value === "string" && value.trim() ? value : DEFAULT_ALLOWED_ORIGINS.join(",");
  return source
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

const ALLOWED_ORIGINS = parseOrigins(process.env.ALLOWED_ORIGINS);

const MAIL = {
  host: (process.env.SMTP_HOST || "").trim(),
  port: Number(process.env.SMTP_PORT) || 587,
  secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
  user: (process.env.SMTP_USER || "").trim(),
  pass: process.env.SMTP_PASS || "",
  from: (process.env.MAIL_FROM || "").trim() || (process.env.SMTP_USER || "").trim(),
  to: (process.env.MAIL_TO || "").trim()
};

const MAIL_CONFIGURED = Boolean(MAIL.host && MAIL.user && MAIL.pass && MAIL.to);

const SERVICE_LABELS = {
  assignments: "College Assignments",
  "mini-projects": "Mini Projects",
  "web-development": "Web Development",
  "software-projects": "Software Projects",
  documentation: "Documentation & Presentations",
  guidance: "Project Guidance",
  other: "Something else"
};

const CONTACT_METHODS = ["Email", "Phone", "WhatsApp", "Either"];

const LIMITS = {
  name: 80,
  email: 120,
  phone: 30,
  college: 120,
  department: 100,
  message: 3000
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_CHARS_RE = /^[\d+()\-.\s]+$/;

/* --- Helpers ------------------------------------------------------------- */

function cleanText(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

function cleanLine(value) {
  return cleanText(value).replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* --- Validation ---------------------------------------------------------- */

function validateEnquiry(body) {
  const input = body && typeof body === "object" ? body : {};

  const data = {
    name: cleanLine(input.name),
    email: cleanLine(input.email).toLowerCase(),
    phone: cleanLine(input.phone),
    service: cleanLine(input.service).toLowerCase(),
    college: cleanLine(input.college),
    department: cleanLine(input.department),
    message: cleanText(input.message || input.details),
    contactMethod: cleanLine(input.contactMethod)
  };

  const errors = {};

  if (data.name.length < 2) {
    errors.name = "Enter your name (at least 2 characters).";
  } else if (data.name.length > LIMITS.name) {
    errors.name = `Keep the name under ${LIMITS.name} characters.`;
  }

  if (!data.email) {
    errors.email = "An email address is required.";
  } else if (data.email.length > LIMITS.email || !EMAIL_RE.test(data.email)) {
    errors.email = "Enter a valid email address, such as name@college.edu.";
  }

  if (!data.service) {
    errors.service = "Choose the kind of support you are looking for.";
  } else if (!Object.prototype.hasOwnProperty.call(SERVICE_LABELS, data.service)) {
    const match = Object.keys(SERVICE_LABELS).find(
      (slug) => SERVICE_LABELS[slug].toLowerCase() === data.service
    );
    if (match) {
      data.service = match;
    } else {
      errors.service = "Choose one of the listed services.";
    }
  }

  if (data.phone) {
    const digits = data.phone.replace(/\D/g, "");
    if (!PHONE_CHARS_RE.test(data.phone) || digits.length < 7 || digits.length > 15) {
      errors.phone = "Enter a phone number with 7–15 digits, including the country code.";
    } else if (data.phone.length > LIMITS.phone) {
      errors.phone = "That phone number is too long.";
    }
  }

  if (data.college.length > LIMITS.college) {
    errors.college = `Keep the college name under ${LIMITS.college} characters.`;
  }

  if (data.department.length > LIMITS.department) {
    errors.department = `Keep the department under ${LIMITS.department} characters.`;
  }

  if (data.message.length < 20) {
    errors.message = "Add at least 20 characters so the project can be understood.";
  } else if (data.message.length > LIMITS.message) {
    errors.message = `Keep the project details under ${LIMITS.message} characters.`;
  }

  if (data.contactMethod && !CONTACT_METHODS.includes(data.contactMethod)) {
    data.contactMethod = "";
  }

  data.serviceLabel = SERVICE_LABELS[data.service] || "";

  return { data, errors };
}

/* --- Email --------------------------------------------------------------- */

let transport = null;

function getTransport() {
  if (transport) return transport;

  transport = nodemailer.createTransport({
    host: MAIL.host,
    port: MAIL.port,
    secure: MAIL.secure || MAIL.port === 465,
    auth: { user: MAIL.user, pass: MAIL.pass },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000
  });

  return transport;
}

function buildPlainText(data) {
  return [
    "New ProjectHub enquiry",
    "",
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Phone / WhatsApp: ${data.phone || "Not provided"}`,
    `Service: ${data.serviceLabel}`,
    `College: ${data.college || "Not provided"}`,
    `Department: ${data.department || "Not provided"}`,
    `Preferred contact: ${data.contactMethod || "Not specified"}`,
    "",
    "Project details:",
    data.message,
    "",
    "---",
    "Sent from the ProjectHub website contact form."
  ].join("\n");
}

function buildHtml(data) {
  const rows = [
    ["Name", data.name],
    ["Email", data.email],
    ["Phone / WhatsApp", data.phone || "Not provided"],
    ["Service", data.serviceLabel],
    ["College", data.college || "Not provided"],
    ["Department", data.department || "Not provided"],
    ["Preferred contact", data.contactMethod || "Not specified"]
  ];

  const rowHtml = rows
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:8px 16px 8px 0;color:#4b5563;font-weight:600;vertical-align:top;">${escapeHtml(
          label
        )}</th><td style="padding:8px 0;color:#111827;">${escapeHtml(value)}</td></tr>`
    )
    .join("");

  const messageHtml = escapeHtml(data.message).replace(/\n/g, "<br>");

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px;">
      <tr>
        <td>
          <h1 style="margin:0 0 4px;font-size:20px;color:#111827;">New ProjectHub enquiry</h1>
          <p style="margin:0 0 20px;font-size:13px;color:#6b7280;">Sent from the website contact form.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;border-collapse:collapse;">${rowHtml}</table>
          <h2 style="margin:24px 0 8px;font-size:15px;color:#111827;">Project details</h2>
          <div style="font-size:14px;line-height:1.6;color:#111827;padding:12px 16px;background:#f9fafb;border-left:3px solid #8b5cf6;border-radius:6px;">${messageHtml}</div>
          <p style="margin:24px 0 0;font-size:12px;color:#6b7280;">Reply directly to this email to answer the student.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendEnquiryEmail(data) {
  const subject = `New ProjectHub enquiry — ${data.serviceLabel} — ${data.name}`.slice(0, 180);

  return getTransport().sendMail({
    from: MAIL.from,
    to: MAIL.to,
    replyTo: data.email,
    subject,
    text: buildPlainText(data),
    html: buildHtml(data)
  });
}

/* --- App ----------------------------------------------------------------- */

const app = express();

app.disable("x-powered-by");

// Hosts such as Render/Railway terminate TLS in front of the app.
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS) || 1);

app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header (curl, health checks) are allowed.
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin.replace(/\/+$/, ""))) return callback(null, true);

      const error = new Error("Origin not allowed by CORS");
      error.code = "CORS_NOT_ALLOWED";
      return callback(error);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept"],
    maxAge: 86400
  })
);

app.use(express.json({ limit: "16kb" }));

const contactLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX) || 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler(req, res) {
    res.status(429).json({
      ok: false,
      message: "Too many enquiries from this address. Please wait a few minutes and try again."
    });
  }
});

app.get("/", (req, res) => {
  res.status(200).json({
    ok: true,
    name: "ProjectHub API",
    endpoints: {
      health: "GET /health",
      contact: "POST /api/contact"
    }
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    status: "ok",
    emailConfigured: MAIL_CONFIGURED,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.post("/api/contact", contactLimiter, async (req, res) => {
  const { data, errors } = validateEnquiry(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      ok: false,
      message: "Please check the highlighted fields and try again.",
      errors
    });
  }

  // Honeypot: a real browser never fills this hidden field.
  if (cleanLine(req.body && req.body.company)) {
    return res.status(200).json({ ok: true, message: "Thanks — your enquiry was received." });
  }

  if (!MAIL_CONFIGURED) {
    console.warn("[contact] Enquiry rejected: email environment variables are incomplete.");
    return res.status(503).json({
      ok: false,
      message: "The enquiry service is not fully configured yet. Please try again later."
    });
  }

  try {
    await sendEnquiryEmail(data);
    console.log(`[contact] Enquiry emailed (service=${data.service}).`);
    return res.status(200).json({
      ok: true,
      message: "Thanks — your enquiry was sent. A reply will follow using the contact method you chose."
    });
  } catch (error) {
    // Log the failure type only: never message contents or credentials.
    console.error("[contact] Email delivery failed:", (error && (error.code || error.name)) || "unknown");
    return res.status(502).json({
      ok: false,
      message: "The enquiry could not be delivered right now. Please try again in a moment."
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ ok: false, message: "Not found." });
});

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  if (error && error.code === "CORS_NOT_ALLOWED") {
    return res.status(403).json({ ok: false, message: "Origin not allowed." });
  }

  if (error && error.type === "entity.too.large") {
    return res.status(413).json({ ok: false, message: "Request body is too large." });
  }

  if (error && error.type === "entity.parse.failed") {
    return res.status(400).json({ ok: false, message: "Malformed JSON body." });
  }

  console.error("[server] Unhandled error:", (error && (error.code || error.name)) || "unknown");

  if (res.headersSent) return next(error);
  return res.status(500).json({ ok: false, message: "Unexpected server error." });
});

function startServer(port = PORT) {
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`[server] ProjectHub API listening on port ${port}`);
    if (!MAIL_CONFIGURED) {
      console.warn(
        "[server] Email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_TO in server/.env"
      );
    }
    console.log(`[server] Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
  });

  const shutdown = () => server.close(() => process.exit(0));
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, validateEnquiry };
