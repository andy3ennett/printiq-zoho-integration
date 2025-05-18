## 🚀 Feature Summary

This PR finalizes CLI integration and webhook routing for the PrintIQ-Zoho middleware, supporting all mapped event types.

## 🔍 Related Issues / Tickets

- Supports [PrintIQ Webhook Integration Brief, May 2025]
- Enables QA lifecycle simulation via CLI

## ✅ Acceptance Criteria

- [x] All webhook routes implemented and centralized in `printiqWebhooks.js`
- [x] CLI posts mock payloads to correct endpoint dynamically
- [x] File/path resolution and URL handling fully debugged
- [x] Logging confirms payload and endpoint accuracy
- [x] ESLint issues resolved (unused imports, invalid exports)

## 🧪 Testing Notes

- Run the CLI: `node scripts/testWebhookCLI.js quote_accepted.json`
- Confirm logs show:
  - File loaded ✅
  - Payload logged ✅
  - URL posted to ✅
- All routes accept known payloads with `event` field
- CRM updates validated via test logs (or queued in retryStore)

## 📸 Screenshots / Logs (if applicable)

```
👉 Posting to http://localhost:3000/webhooks/printiq/job
✅ Sent quote_accepted.json: [202] Accepted
```

## 🧼 Code Review Checklist

- [x] Code follows existing formatting and ESLint rules
- [x] All handlers route through `printiqWebhooks.js`
- [x] Base URL and filenames sanitized in CLI
- [x] Retry payload store created if missing
