# 🧩 PrintIQ–Zoho CRM Integration

This project provides a robust middleware integration between **PrintIQ** (a print management platform) and **Zoho CRM**, allowing customer, contact, address, and quote data to sync seamlessly via webhooks.

---

## 🚀 Features

- 🔁 **Webhook Listeners** for:

  - Customer create/update → Zoho **Accounts**
  - Contact create/update → Zoho **Contacts**
  - Address updates → Zoho **Account Subforms**
  - Quote accepted events → Zoho **Deals**

- 🔐 **Zoho OAuth 2.0** authentication and token refreshing
- 🩺 **Health-check endpoints** for CRM connection and logging status
- 🧪 **Integration testing CLI** to simulate live webhook events
- ✅ Fully converted to **ES Modules (ESM)** — supports **Node.js 18, 20, or 22**
- 🧹 Linting + Pre-commit hooks via **Husky** and **lint-staged**

---

## 📦 Tech Stack

- Node.js (v18/v20/v22, ESM mode)
- Express.js for webhook routing
- Zoho CRM API
- PrintIQ Webhooks
- Axios for HTTP requests
- ESLint + Prettier for code quality
- Husky for Git hooks

---

## 🔧 Setup Instructions

> Requires Node.js 18, 20, or 22.

1. **Clone the repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/printiq-zoho-integration.git
   cd printiq-zoho-integration
   ```

2. **Install dependencies**

   ```bash
   npm ci --omit=optional
   ```

3. **Create a `.env` file**  
   Add your secrets and config values:

   ```
   ZOHO_CLIENT_ID=your_client_id
   ZOHO_CLIENT_SECRET=your_client_secret
   ZOHO_REDIRECT_URI=http://localhost:3000/oauth/callback
   ZOHO_ACCOUNTS_URL=https://accounts.zoho.com
   ZOHO_BASE_URL=https://www.zohoapis.com
   PORT=3000
   HEALTH_TOKEN=your_token_for_protected_health_routes
   ```

4. **Authenticate with Zoho**  
   Start the server and visit:  
   `http://localhost:3000/auth`  
   Follow the OAuth flow to generate and store your access token.

---

## 🧪 Tests & Lint

Run the unit test suite:

```bash
npm test
```

Run the linter:

```bash
npm run lint
```

Generate a coverage report:

```bash
npm test -- --coverage
```

## 🔩 Zoho Configuration

- Add a custom field on **Accounts** named `PrintIQ_Customer_ID` and set it as the external ID.
- Minimal field mapping:

  | PrintIQ field       | Zoho Account field    |
  | ------------------- | --------------------- |
  | `printiqCustomerId` | `PrintIQ_Customer_ID` |
  | `name`              | `Account_Name`        |

## 🔥 Smoke Test & Monitoring

- Start API and worker: `npm run dev:all`
- Run end-to-end smoke test: `npm run smoke:e2e`
- DLQ management:
  - `npm run dlq:list`
  - `npm run dlq:retry`
- Metrics available at `http://localhost:3000/metrics` when `ENABLE_METRICS=true`

> Metrics are disabled unless the `ENABLE_METRICS` env var is set to `true`.

---

## Logging

We use `pino` with a request ID and PII redaction (emails, phone numbers, long numeric IDs).
Each request is logged with method, path, status, duration, and `req.id`.

Example:
{"level":"info","msg":"GET /webhooks/printiq -> 200 in 12ms","requestId":"b1a8...","status":200}

---

## 📄 Documentation

To follow.

---

## 🛠 Next Phase Ideas

- Add retry logic and background queue for failed syncs
- Build a simple dashboard for sync history
- Expand bidirectional sync (Zoho → PrintIQ)
- Add audit logging and webhook versioning

---

## ⚠️ Gotchas

- Some optional dependencies include platform-specific binaries (e.g., `@rollup/rollup-*`). If they fail to install on your system, use the recommended install command:

  ```bash
  npm ci --omit=optional
  ```

  This skips optional dependencies and matches the CI environment.

---

## 👥 Maintainers

- Original Developer: Andy3ennett

---

## 📬 Feedback & Issues

Please raise issues or questions via GitHub Issues
