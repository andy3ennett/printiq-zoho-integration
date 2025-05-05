## 🚀 Feature Summary
Brief description of what this PR adds or changes.

## 🔍 Related Issues / Tickets
- Closes #[ticket-number] or relates to [Epic/Brief Name]

## ✅ Acceptance Criteria
- [ ] Deal stages are updated based on lifecycle events
- [ ] Retry queue logs and re-attempts failed syncs
- [ ] All events are routed through `/deal-lifecycle` endpoint

## 🧪 Testing Notes
- Describe how to test manually (CLI tool, sample payloads)
- What CRM fields should be checked

## 📸 Screenshots / Logs (if applicable)

## 🧼 Code Review Checklist
- [ ] Code follows existing formatting and ESLint rules
- [ ] LowDB is used for retry store
- [ ] Filters out non-PrintIQ events unless accepted