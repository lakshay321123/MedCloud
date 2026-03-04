# MedCloud — Claude Review Context

## What This Is
AI-powered Revenue Cycle Management (RCM) platform. Next.js frontend on Vercel, AWS backend (Lambda, Aurora PostgreSQL, Cognito, Bedrock, S3, Textract, API Gateway).

**US market only** (UAE on hold). API Gateway: `fm2l2133of.execute-api.us-east-1.amazonaws.com/prod`

## Team
- Dev 1 (Sr) — AWS infra, Aurora, Cognito, API Gateway  
- Dev 2 — Frontend (Next.js, Claude Code)  
- Dev 3 — AI + Backend (Textract, Bedrock, auto-coding)  
- Dev 4 — RCM + Backend (claims, denials, AR, state machines)  
- Alex — Voice AI + AI Scribe (Retell AI — DO NOT TOUCH)

## Locked Architecture Decisions
- **AD-1**: Multi-tenancy via Aurora RLS + `org_id`
- **AD-2**: 12-status claim state machine
- **AD-3**: Audit log 7yr immutable, log all reads
- **AD-4**: US uses ICD-10-CM/CPT
- **AD-5**: Availity primary clearinghouse (no Change Healthcare)
- **AD-6**: Retell AI for Voice (BAA required) — Alex's domain, don't modify
- **AD-7**: Single frontend routes by region via `client_id`

## Critical Rules for Every PR

### 1. No hardcoded org IDs or client names
```ts
// ❌ WRONG
const clientFilter = 'org-102'

// ✅ RIGHT  
const clientFilter = isClinic ? currentUser.organization_id : selectedClient?.id
```

### 2. Demo data must not drive real UI
```ts
// ❌ WRONG — demo data used even when API exists
const accounts = initialAccounts

// ✅ RIGHT — API first, seed fallback only when DB is empty
const accounts = apiAccounts.length > 0 ? apiAccounts : initialAccounts
```

### 3. Every API hook result must be used
```ts
// ❌ WRONG — fetched but ignored
const { data } = useClaims()
const claims = demoClaims // still using demo

// ✅ RIGHT
const { data } = useClaims()  
const claims = data?.data || []
```

### 4. No silent catch blocks
```ts
// ❌ WRONG
} catch { }

// ✅ RIGHT
} catch (err) {
  toast.error('Operation failed — please try again')
}
```

### 5. TypeScript — no implicit any
```ts
// ❌ WRONG
const faxes: any[] = []
.map((m, i) => ...)

// ✅ RIGHT — use proper types or explicit annotations
const faxes: DemoFax[] = []
.map((m: string, i: number) => ...)
```

### 6. Region filtering — US only for now
All modules should filter by `client_id` from `useApp().selectedClient`. UAE filtering code can remain but UAE is not active.

## Module Status Reference
| Module | Backend | Frontend |
|--------|---------|----------|
| Dashboard | ✅ Live | ✅ Wired |
| Claims | ✅ Live | ✅ Wired |
| Coding | ✅ Live | ✅ Wired |
| Eligibility | ✅ Live | ✅ Wired |
| AR Management | ✅ Live | ✅ Wired (claims drive accounts) |
| Denials | ✅ Live | ✅ Wired |
| Payment Posting | ✅ Live | ✅ Wired |
| Tasks | ✅ Live | ✅ Wired + useCreateTask |
| AI Scribe | ✅ Live | ✅ Wired (SOAP notes) |
| Voice AI | ✅ Live (Retell) | ✅ Alex's domain |
| Contracts | ✅ Live | ✅ Wired (payer_config) |
| Credentialing | ✅ Live | ✅ Wired |
| Analytics | ✅ Live | ✅ Wired (real claims) |
| Documents | ✅ Live | ✅ Wired (fax = Sprint 3) |
| EDI | ✅ Live | ✅ Wired |
| Admin | ✅ Live | ✅ Wired |
| Portal/Patients | ✅ Live | ✅ Wired |
| Portal/Appointments | ✅ Live | ✅ Wired |
| Portal/Messages | ✅ Live | ✅ Wired |
| Portal/Scan & Submit | ✅ Live | ✅ Wired |
| Portal/Watch & Track | ✅ Live | ✅ Wired |

## RCM Domain Rules
- Claim statuses: `draft → submitted → accepted → paid | denied | partial`
- CARC codes: 300+ codes map to 8 denial categories (Auth, Eligibility, Coding, Timely Filing, Duplicate, Medical Necessity, Contractual, Other)
- AR aging buckets: 0-30, 31-60, 61-90, 91-120, 120+
- Claim scrubbing V1: 50 rules (NCCI edits, gender/age/procedure mismatch, missing modifiers)
- Appeal levels: L1 internal, L2 external review, L3 state dept
- Write-off requires tiered approval

## What NOT to Flag
- Retell AI / Voice AI code — Alex's domain, working in prod
- AI Scribe recording logic — Alex's domain
- `demoVisits` / `initialAccounts` / seed `providers` arrays used as **fallbacks** when DB is empty — this is intentional
- Fax inbox as empty array — intentionally deferred to Sprint 3
- UAE-related constants existing in code — kept for future use
