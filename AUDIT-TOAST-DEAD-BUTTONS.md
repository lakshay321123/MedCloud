# MedCloud — Toast & Dead Button Audit

**Date**: 2026-03-15
**Scope**: Full application end-to-end audit of all toast notifications and dead/broken buttons
**Action**: List only — no fixes applied

---

## HIGH SEVERITY

### 1. Dead "Complete" Button — Patient Access Requests (Admin)
- **File**: `src/app/admin/page.tsx` ~line 694
- **Issue**: Button fires `toast.success('Marked complete — use patient access API')` — the toast message itself reveals no API is called. The action is a no-op disguised as success.

---

### 2. Organization Row Click — No Navigation (Admin)
- **File**: `src/app/admin/page.tsx` ~line 403
- **Issue**: Clicking a table row calls `toast.info('Opening ${o.name} settings')` but no modal opens and no navigation occurs. Users expect to navigate; nothing happens.

---

### 3. Dead "Audit Export" Button (Admin)
- **File**: `src/app/admin/page.tsx` ~line 578
- **Issue**: Button fires `toast.info('Audit export queued. You will receive an email.')` with zero API call or export logic. Completely placeholder — no email will ever be sent.

---

### 4. EDI Generation — Success Toast on Failure Path (Claims)
- **File**: `src/app/claims/page.tsx` ~lines 1390–1393
- **Issue**: Three code paths — success, `!res.ok`, and `catch` — all call `toast.success(...)`. Error and exception cases show the same success message as a real success. Silent failure.

---

### 5. Dead "Link" Button — Inbound Fax (Documents)
- **File**: `src/app/documents/page.tsx` ~line 482
- **Issue**: Button calls `e.stopPropagation()` then `toast.info('Open fax in preview drawer to link to a patient')`. No linking logic exists. Button appears functional but does nothing.

---

### 6. Document "Discard" — Misleading Fallback Toast (Documents)
- **File**: `src/app/documents/page.tsx` ~line 428
- **Issue**: On API failure, the `catch` block fires `toast.warning('Document discarded locally')`. Nothing is actually discarded locally — this is a false success disguised as a warning.

---

## MEDIUM SEVERITY

### 7. Peer-to-Peer Review — Error Shows Info Toast (Eligibility)
- **File**: `src/app/eligibility/page.tsx` ~line 858
- **Issue**: `catch` block fires `toast.info('Peer-to-peer review requested')` when the `createTask()` call fails. Failure is reported as a successful "request".

---

### 8. Payment Posting — Sync Failure Downplayed (Payment Posting)
- **File**: `src/app/payment-posting/page.tsx` ~line 761
- **Issue**: `toast.warning('Posted ${approved.length} line(s) locally — failed to sync with server')` implies local persistence, but no local store exists. Data loss is possible; the warning tone hides the severity.

---

### 9. AI Coding — Success Toast on Mock Data (Coding)
- **File**: `src/app/coding/page.tsx` ~lines 685–687
- **Issue**: When Bedrock is unavailable and mock codes are returned, `toast.success('Ai generated X ICD + Y CPT codes (mock — Bedrock unavailable)')` is shown. Using `.success` for a degraded/mock result is misleading.

---

### 10. Voice AI Version Restore — Misleading "Save to Push Live" (Voice AI)
- **File**: `src/app/voice-ai/page.tsx` ~line 1003
- **Issue**: "Restore" button only sets local component state and fires `toast.info('Version restored — save to push live')`. Users may not realize a separate explicit save action is required. No save confirmation prompt is triggered.

---

### 11. AI Scribe Draft — Misleading Local Save (AI Scribe)
- **File**: `src/app/ai-scribe/page.tsx` ~line 922
- **Issue**: `catch` block fires `toast.warning('Draft saved locally')` when server sync fails. SOAP note data is not persisted anywhere locally — the message is false.

---

## LOW SEVERITY

### 12. Fax View Button — Unnecessary Info Toast (Documents)
- **File**: `src/app/documents/page.tsx` ~line 481
- **Issue**: On clicking a valid fax URL, the button opens the URL and additionally fires `toast.info('Opening fax...')`. The toast adds no value; the browser tab opening is self-evident.

---

### 13. "Raise Concern" Support Button — Misleading "Support Notified" (Documents)
- **File**: `src/app/documents/page.tsx` ~line 728
- **Issue**: Button opens `mailto:` link and fires `toast.info('Support notified. Reference: DOC-XXXXXX')`. The email is not sent — the user's email client opens. "Support notified" is factually incorrect until the user manually sends the email.

---

### 14. Coding Rules AI Interpretation — Auto-fire Info Toast (Coding Rules)
- **File**: `src/app/coding-rules/page.tsx` ~line 113
- **Issue**: `toast.info('Rule interpreted — review and adjust the fields below')` fires automatically with no user action needed. Not a dead button, but an unnecessary auto-toast that creates noise.

---

## Summary Table

| # | File | ~Line | Issue | Severity |
|---|------|-------|-------|----------|
| 1 | `src/app/admin/page.tsx` | 694 | Dead "Complete" button — fake success toast | HIGH |
| 2 | `src/app/admin/page.tsx` | 403 | Org row click — info toast, no navigation | HIGH |
| 3 | `src/app/admin/page.tsx` | 578 | "Audit Export" button — no export, fake email toast | HIGH |
| 4 | `src/app/claims/page.tsx` | 1390–1393 | EDI generation — success toast on error/catch paths | HIGH |
| 5 | `src/app/documents/page.tsx` | 482 | "Link" fax button — no-op with info toast | HIGH |
| 6 | `src/app/documents/page.tsx` | 428 | "Discard" button — false "discarded locally" on API failure | HIGH |
| 7 | `src/app/eligibility/page.tsx` | 858 | P2P review — failure shown as info, not error | MEDIUM |
| 8 | `src/app/payment-posting/page.tsx` | 761 | Sync failure — downplayed as local success warning | MEDIUM |
| 9 | `src/app/coding/page.tsx` | 685–687 | Mock AI codes — success toast on degraded path | MEDIUM |
| 10 | `src/app/voice-ai/page.tsx` | 1003 | Version restore — no save triggered, misleading message | MEDIUM |
| 11 | `src/app/ai-scribe/page.tsx` | 922 | Draft save — false "saved locally" on server failure | MEDIUM |
| 12 | `src/app/documents/page.tsx` | 481 | Fax view — redundant info toast | LOW |
| 13 | `src/app/documents/page.tsx` | 728 | "Raise Concern" — "Support notified" before email is sent | LOW |
| 14 | `src/app/coding-rules/page.tsx` | 113 | Auto-fire info toast with no user trigger | LOW |

---

## Patterns

| Pattern | Count | Files |
|---------|-------|-------|
| Placeholder buttons with toast instead of logic | 3 | admin, documents |
| Success toast on error/catch paths | 3 | claims, documents, eligibility |
| False "saved/discarded locally" fallbacks | 2 | documents, ai-scribe |
| Info/warning used where error is correct | 3 | eligibility, payment-posting, claims |
| Misleading state-only actions reported as done | 2 | voice-ai, documents |
