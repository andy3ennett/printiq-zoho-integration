# 🔐 Token Lifecycle: Zoho OAuth Integration

This document explains how OAuth tokens are handled in the PrintIQ–Zoho Middleware system.

---

## 🔁 Overview

Zoho CRM API access is secured using OAuth 2.0 tokens. This integration uses a combination of:

- `.env` file for static credentials (client ID/secret, refresh token)
- `token.json` for storing the current access token and refresh token
- Helper logic in `zohoClient.js` for reading and refreshing the token

---

## 🧩 Files Involved

- **.env**

  ```
  ZOHO_CLIENT_ID=
  ZOHO_CLIENT_SECRET=
  ZOHO_REFRESH_TOKEN=
  ZOHO_BASE_URL=https://www.zohoapis.com/crm/v2
  ```

- **token.json**
  Stores:

  ```json
  {
    "access_token": "abc123...",
    "refresh_token": "def456...",
    "expires_in": 3600,
    "expiry_time": "2025-05-18T14:00:00Z"
  }
  ```

- **zohoClient.js**
  Handles:
  - Reading token from `token.json`
  - Adding Authorization header (`Zoho-oauthtoken`)
  - Refreshing token if expired (via Zoho OAuth endpoint)
  - Writing new token data back to `token.json`

---

## 🔄 Refresh Logic

1. Each Zoho API request checks if token is still valid.
2. If expired:
   - A new access token is requested using the stored `refresh_token`.
   - The new token data is written to `token.json`.
3. If token refresh fails:
   - An error is logged.
   - Retry mechanism can trigger manual re-auth if needed.

---

## ⚠️ Fallback Strategy

- If `token.json` is missing or malformed:
  - The app will log an error and exit early.
- If refresh fails due to revoked refresh token:
  - Dev team must manually reauthorize and update `.env`.

---

## ✅ Developer Notes

- Never commit `token.json` to version control (already in `.gitignore`)
- Refresh token provided by CRM Admin should be long-lived.
- Monitor expiry handling and add alerts in retry/monitoring layer (future).

---

## 🧪 Token Doctor (Optional Utility)

You can run `tokenDoctor.js` to verify:

- Current access token validity
- Associated user and scopes
- Upcoming expiry
