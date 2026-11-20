# ProjectHub

Academic project guidance website. The frontend is static Bootstrap HTML; enquiries are validated and emailed by a small Express + Nodemailer API that runs either as a Vercel function in this same project or as a standalone Node service.

```
.
├── index.html / about.html / services.html / contact.html
├── assets/
│   ├── css/style.css
│   ├── js/config.js          # site owner settings (contact details, API URL)
│   ├── js/main.js            # navigation, contact details, enquiry form
│   └── favicon.svg
├── api/                      # Vercel functions, served under /api/*
│   ├── contact.js            # POST /api/contact
│   └── health.js             # GET  /api/health
├── server/                   # the same API as a standalone Node service
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── package.json              # dependencies Vercel installs for api/
```

- **Frontend:** static HTML, Bootstrap 5, Bootstrap Icons, Google Fonts, plain JavaScript. No build step.
- **Backend:** Express 4, Nodemailer, CORS, `express-rate-limit`, `dotenv`. Node 18.17+.
- **Storage:** none. Enquiries are **emailed, not stored**, so there is no enquiry history to browse or export.

## How the form works

`contact.html` posts JSON to `/api/contact`:

1. `assets/js/config.js` `formEndpoint` (full override), else
2. `<apiBaseUrl>/api/contact` when `apiBaseUrl` is set, else
3. `http://localhost:5000/api/contact` when the page is served from `localhost`/`127.0.0.1`, else
4. `/api/contact` on the same domain — the Vercel function in `api/`.

The response decides the UI: `200` shows "Message sent" and resets the form; `400` marks the returned fields and shows the server message; `429`/`502`/`503`/network errors show a readable error and keep the entered details. Duplicate submits are blocked while a request is in flight.

## Local development

### Frontend

```bash
python3 -m http.server 3000        # or: npx serve .
```

Open `http://localhost:3000`. The form automatically targets `http://localhost:5000/api/contact`.

### Backend

```bash
cd server
npm install
cp .env.example .env               # then fill in real values
npm run dev                        # or: npm start
```

```bash
curl http://localhost:5000/health
# {"ok":true,"status":"ok","emailConfigured":true,...}
```

`emailConfigured` is `false` until every SMTP/recipient variable is set; enquiries then return **503** instead of pretending to send.

## API

| Method | Path (Vercel) | Path (standalone) | Purpose                                   |
| ------ | ------------- | ----------------- | ----------------------------------------- |
| GET    | `/api/health` | `/health`         | Liveness + whether email is configured    |
| POST   | `/api/contact`| `/api/contact`    | Validate and email an enquiry             |
| GET    | –             | `/`               | Short JSON description of the API         |

`POST /api/contact` body:

```json
{
  "name": "Student name",
  "email": "name@college.edu",
  "phone": "+91 90000 00000",
  "service": "web-development",
  "college": "College name",
  "department": "CSE, final year",
  "message": "What the project involves and its deadline.",
  "contactMethod": "Email"
}
```

Responses:

- `200` `{ "ok": true, "message": "..." }` — enquiry emailed.
- `400` `{ "ok": false, "message": "...", "errors": { "email": "..." } }` — validation failed.
- `403` origin not allowed, `413` body over 16 kB, `429` rate limited.
- `503` email environment variables incomplete, `502` SMTP delivery failed.

Validation: name 2–80 chars, valid email ≤120, optional phone with 7–15 digits, service from the published list, optional college ≤120 and department ≤100, message 20–3000. All user text is escaped before it enters the HTML email; a plain-text alternative and `Reply-To` are included. Passwords and message contents are never logged.

Rate limiting is in-memory: on the standalone server it is a real per-IP limit, while on Vercel each function instance keeps its own counter, so it dampens abuse but is not a global quota.

## Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production, and Preview if you test there), or in `server/.env` for local work.

| Variable               | Required | Example                                   |
| ---------------------- | -------- | ----------------------------------------- |
| `PORT`                 | no       | `5000` (standalone server only)           |
| `SMTP_HOST`            | yes      | `smtp.gmail.com`                          |
| `SMTP_PORT`            | yes      | `465`                                     |
| `SMTP_SECURE`          | no       | `true` for 465, `false` for 587           |
| `SMTP_USER`            | yes      | the sending mailbox address               |
| `SMTP_PASS`            | yes      | the provider's app password               |
| `MAIL_FROM`            | no       | `ProjectHub <sender@example.com>`         |
| `MAIL_TO`              | yes      | inbox that receives enquiries             |
| `ALLOWED_ORIGINS`      | no       | comma-separated browser origins           |
| `RATE_LIMIT_MAX`       | no       | `5` submissions per window                |
| `RATE_LIMIT_WINDOW_MS` | no       | `900000` (15 minutes)                     |
| `TRUST_PROXY_HOPS`     | no       | `1` behind Vercel/Render TLS termination  |

Commit only `.env.example` (placeholders). Never put credentials in `assets/js/config.js` or any frontend file.

For Gmail, `SMTP_PASS` must be a 16-character **App Password** created after enabling 2-Step Verification (Google Account → Security → App passwords). A normal account password is rejected.

## Deploying on Vercel (frontend + API in one project)

`api/contact.js` and `api/health.js` are picked up automatically; dependencies come from the root `package.json`. Vercel blocks outbound port 25 but allows **465 and 587**, which is what Nodemailer uses here.

1. Push this repository (Vercel redeploys on push).
2. Add the environment variables above to the Vercel project — at minimum `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_TO` (and `MAIL_FROM` if the sender differs).
3. Redeploy so the functions receive the new variables (Deployments → Redeploy, or push any commit).
4. Check `https://project-huubb.vercel.app/api/health` → `"emailConfigured": true`.
5. Submit a real enquiry on `/contact.html` and confirm it arrives at `MAIL_TO`.

Leave `apiBaseUrl` empty in `assets/js/config.js` for this setup: the form posts to `/api/contact` on the same domain, so there is no CORS hop.

## Deploying `server/` as a separate Node service (optional)

Use this when the API should live on its own host instead of Vercel. Render example:

1. Render → **New → Web Service** → connect this repository.
2. **Root Directory:** `server`, **Runtime:** Node, **Build Command:** `npm install`, **Start Command:** `npm start`, **Health Check Path:** `/health`.
3. Add the same environment variables, plus `ALLOWED_ORIGINS=https://project-huubb.vercel.app`.
4. Deploy and confirm `https://<your-service>.onrender.com/health` returns `200` with `"emailConfigured": true`.
5. Set `apiBaseUrl: "https://<your-service>.onrender.com"` in `assets/js/config.js` and redeploy the frontend.

Railway/Fly.io use the same values: root `server`, install `npm install`, start `npm start`, health `/health`.

## Frontend settings (`assets/js/config.js`)

```js
window.PROJECTHUB_CONFIG = {
  email: "",
  phone: "",
  whatsapp: "",
  location: "",
  apiBaseUrl: "",   // empty = same-domain /api/contact
  formEndpoint: "", // optional full override
  social: { linkedin: "", github: "", instagram: "" }
};
```

Empty contact values stay hidden on every page — no placeholder details are shown. If your deployment serves `js/config.js` instead of `assets/js/config.js`, make the same edit in that file and redeploy.

## Values only the owner can provide

- `SMTP_USER` — the mailbox that sends enquiries.
- `SMTP_PASS` — that mailbox's app password (set it in the host's environment variables, never in chat or Git).
- `MAIL_TO` — the inbox that should receive enquiries.
- `MAIL_FROM` — a sender address the SMTP account is allowed to use.

No email addresses, credentials or contact details are invented anywhere in this project.
