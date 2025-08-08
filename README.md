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
- ✅ Fully converted to **ES Modules (ESM)** using `Node.js v22+`
- 🧹 Linting + Pre-commit hooks via **Husky** and **lint-staged**

---

## 📦 Tech Stack

- Node.js (v22+, ESM mode)
- Express.js for webhook routing
- Zoho CRM API
- PrintIQ Webhooks
- Axios for HTTP requests
- ESLint + Prettier for code quality
- Husky for Git hooks

---

## 🔧 Setup Instructions

1. **Clone the repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/printiq-zoho-integration.git
   cd printiq-zoho-integration
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create a `.env` file**  
   Add your secrets and config values:

   ```
   ZOHO_CLIENT_ID=your_client_id
   ZOHO_CLIENT_SECRET=your_client_secret
   ZOHO_REDIRECT_URI=http://localhost:3000/oauth/callback
   ZOHO_ACCOUNTS_URL=https://accounts.zoho.com
   ZOHO_BASE_URL=https://www.zohoapis.com/crm/v2
   PORT=3000
   HEALTH_TOKEN=your_token_for_protected_health_routes
   ```

4. **Authenticate with Zoho**
   Start the server and visit:
   `http://localhost:3000/auth`
   Follow the OAuth flow to generate and store your access token.

---

## Queues & Retries

This project uses **BullMQ** with Redis to process webhook events asynchronously.

### Local development

```bash
docker compose up -d redis
npm run dev:all
```

The `dev:all` script starts the API and worker together. Webhook handlers enqueue jobs to the `zoho` queue and return `202 Accepted` immediately.

- Idempotency keys: `printiq:{eventType}:{eventId}` with a 30 minute TTL.
- Retry policy: up to 5 attempts with exponential backoff and jitter. Failed jobs are moved to a dead-letter queue.

---

## 🧪 Running Tests

```bash
npm run test:integration
```

Or test individual handlers via:

```bash
node tests/testAddressWebhook.js
```

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

## 👥 Maintainers

- Original Developer: Andy3ennett

---

## 📬 Feedback & Issues

Please raise issues or questions via GitHub Issues
