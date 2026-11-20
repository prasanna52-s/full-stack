# ProjectHub

Academic project guidance website with a static Bootstrap frontend and a small Express + Nodemailer API that delivers contact enquiries by email.

```
.
├── index.html / about.html / services.html / contact.html
├── assets/
│   ├── css/style.css
│   ├── js/config.js          # site owner settings (contact details, API URL)
│   ├── js/main.js            # navigation, contact details, enquiry form
│   └── favicon.svg
└── server/                   # Express API (deployable Node web service)
    ├── server.js
    ├── package.json
    └── .env.example
```

- **Frontend:** static HTML, Bootstrap 5, Bootstrap Icons, Google Fonts and plain JavaScript. No build step.
- **Backend:** Express 4, Nodemailer, CORS, `express-rate-limit`, `dotenv`. CommonJS, Node 18.17+.
- **Storage:** none. Enquiries are **emailed but not stored** in any database, so there is no enquiry history to browse or export.

## Local development

### 1. Frontend

```bash
python3 -m http.server 3000        # or: npx serve .
```

Open `http://localhost:3000`. Any static server works. When the page is served from `localhost` or `127.0.0.1`, the form automatically posts to `http://localhost:5000/api/contact`, so no config change is needed for local work.

### 2. Backend

```bash
cd server
npm install
cp .env.example .env               # then fill in real values
npm run dev                        # or: npm start
```

The API listens on `PORT` (default `5000`).

```bash
curl http://localhost:5000/health
# {"ok":true,"status":"ok","emailConfigured":true,...}
```

`emailConfigured` is `false` until all SMTP/recipient variables are set; until then `POST /api/contact` returns **503** instead of pretending to send.

## API

| Method | Path           | Purpose                                                        |
| ------ | -------------- | -------------------------------------------------------------- |
| GET    | `/health`      | Liveness + whether email is configured. Used by the host.      |
| POST   | `/api/contact` | Validate and email an enquiry. JSON body, max 5 per 15 min/IP. |
| GET    | `/`            | Short JSON description of the API.                             |

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
- `413` request body over 16 kB, `429` rate limited, `403` origin not allowed.
- `503` email environment variables incomplete, `502` SMTP delivery failed.

Validation: name 2–80 chars, valid email ≤120, optional phone with 7–15 digits, service from the published list, optional college ≤120 and department ≤100, message 20–3000. All user text is escaped before it is placed in the HTML email; a plain-text alternative and `Reply-To` are included. Passwords and message contents are never logged.

## Environment variables (`server/.env`)

| Variable             | Required | Example                                        |
| -------------------- | -------- | ---------------------------------------------- |
| `PORT`               | no       | `5000` (hosts usually inject this)             |
| `SMTP_HOST`          | yes      | `smtp.gmail.com`                               |
| `SMTP_PORT`          | yes      | `465`                                          |
| `SMTP_SECURE`        | no       | `true` for port 465, `false` for 587           |
| `SMTP_USER`          | yes      | the sending mailbox address                    |
| `SMTP_PASS`          | yes      | an app password from the email provider        |
| `MAIL_FROM`          | no       | `ProjectHub <sender@example.com>`              |
| `MAIL_TO`            | yes      | the inbox that receives enquiries              |
| `ALLOWED_ORIGINS`    | no       | comma-separated browser origins                |
| `RATE_LIMIT_MAX`     | no       | `5` submissions per window                     |
| `RATE_LIMIT_WINDOW_MS` | no     | `900000` (15 minutes)                          |
| `TRUST_PROXY_HOPS`   | no       | `1` behind Render/Railway TLS termination      |

`server/.env` is git-ignored; only `.env.example` (placeholders) is committed. Never put SMTP credentials in `assets/js/config.js` or any frontend file.

For Gmail, `SMTP_PASS` must be a 16-character **App Password** created after enabling 2-Step Verification (Google Account → Security → App passwords). A normal account password will be rejected.

## Frontend configuration

`assets/js/config.js`:

```js
window.PROJECTHUB_CONFIG = {
  email: "",
  phone: "",
  whatsapp: "",
  location: "",
  apiBaseUrl: "",   // e.g. "https://projecthub-api.onrender.com"
  formEndpoint: "", // optional full override
  social: { linkedin: "", github: "", instagram: "" }
};
```

- Empty contact values stay hidden on every page — no placeholder details are shown.
- `apiBaseUrl` is the deployed API origin; the form posts to `<apiBaseUrl>/api/contact`.
- While `apiBaseUrl` is empty on a deployed site, the form shows a "not connected yet" notice and sends nothing. Locally it uses `http://localhost:5000/api/contact`.
- If your deployment serves `js/config.js` instead of `assets/js/config.js`, make the same edit in that file.

## Deploying the API

Any Node web-service host works (Render, Railway, Fly.io, a VPS). Render example:

1. Push this repository to GitHub.
2. Render → **New → Web Service** → connect the repository.
3. Settings:
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
4. Add the environment variables from the table above (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `MAIL_TO`, and `ALLOWED_ORIGINS=https://project-huubb.vercel.app`). Do not commit them.
5. Deploy, then confirm `https://<your-service>.onrender.com/health` returns `200` with `"emailConfigured": true`.
6. Submit one real test enquiry and confirm it arrives in `MAIL_TO`.

Railway/Fly.io use the same values: root `server`, install `npm install`, start `npm start`, health `/health`, and the same environment variables.

## Deploying the frontend changes (Vercel)

1. Set `apiBaseUrl` to the deployed API origin in `assets/js/config.js` (no trailing slash).
2. Commit and push:
   ```bash
   git add .
   git commit -m "Connect contact form to the enquiry API"
   git push
   ```
3. Vercel redeploys automatically on push. Otherwise run `vercel --prod` from the project root, or use **Deployments → Redeploy** in the dashboard (disable the build cache so the updated `config.js` ships).
4. Open `https://project-huubb.vercel.app/contact.html`, submit a test enquiry, and confirm:
   - the "not connected yet" notice is gone,
   - a success message appears and the form resets,
   - the email arrives at `MAIL_TO`.

If your Vercel project is connected to a different repository than this one, copy `server/`, the updated `assets/js/config.js`, `assets/js/main.js`, `assets/css/style.css` and `contact.html` into that repository before redeploying.

## Values only the owner can provide

- `SMTP_USER` — the mailbox that sends enquiries.
- `SMTP_PASS` — that mailbox's app password (never shared in chat or committed).
- `MAIL_TO` — the inbox that should receive enquiries.
- `MAIL_FROM` — a sender address the SMTP account is allowed to use.
- Deployed API URL — set as `apiBaseUrl` in `assets/js/config.js` after deploying the backend.

No email addresses, credentials or contact details are invented anywhere in this project.
