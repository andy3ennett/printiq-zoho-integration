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
   ZOHO_ACCOUNTS_URL=https://accounts.zoho.eu
   ZOHO_API_BASE=https://www.zohoapis.eu/crm/v2
   PORT=3000
   HEALTH_TOKEN=your_token_for_protected_health_routes
   ```

4. **Authenticate with Zoho**  
   Start the server and visit:  
   `http://localhost:3000/auth`  
   Follow the OAuth flow to generate and store your access token.

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
