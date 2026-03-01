# MedCloud — Claude Code Implementation Brief

## Context
MedCloud is an RCM (Revenue Cycle Management) platform built by Cosentus (25-year RCM company, 500+ employees, 60+ US clients, UAE expansion). The frontend is a Next.js 14 app on Vercel. Current state: app shell with sidebar/topbar/routing works, but most modules are empty shells and several architectural decisions are wrong.

Reference: `medcloud-rcm-flowchart.html` in the repo root — this is the complete product spec with 11 tabs covering every workflow, role, scenario, and module map.

Tech stack: Next.js 14.2.21, React 18, TypeScript, Tailwind CSS 3.4.16, Lucide React icons. Brand: primary #00B5D6, dark theme default, futuristic aesthetic (glow borders, grid backgrounds, monospace accents).

---

## PART 1: ARCHITECTURAL CHANGES (Do These First)

### 1.1 Add "provider" (Doctor) Role

**File: `src/types/index.ts`**

Add `'provider'` to `UserRole` type. This is a doctor who uses MedCloud as their EHR.

```typescript
export type UserRole =
  | 'admin' | 'director' | 'supervisor' | 'manager'
  | 'coder' | 'biller' | 'ar_team' | 'posting_team'
  | 'provider'  // NEW — doctor/physician
  | 'client'    // clinic office manager / front desk
```

Add `ehr_mode` to Organization:

```typescript
export interface Organization {
  id: string
  name: string
  type: 'rcm_provider' | 'practice' | 'tpa'
  region: 'us' | 'uae'
  ehr_mode: 'medcloud_ehr' | 'external_ehr'  // NEW
  branding?: { logo_url?: string; primary_color?: string; name?: string }
}
```

Add `ClientOrg` type for multi-client context:

```typescript
export interface ClientOrg {
  id: string
  name: string
  region: 'us' | 'uae'
  ehr_mode: 'medcloud_ehr' | 'external_ehr'
  logo_url?: string
}
```

### 1.2 Add Client Context to AppState

**File: `src/lib/context.tsx`**

Add `selectedClient` state for staff global client filter. Client/provider users don't see this — they're locked to their own org.

```typescript
interface AppState {
  // ... existing
  selectedClient: ClientOrg | null   // null = "All Clients"
  clients: ClientOrg[]               // list of all client orgs (for staff)
  setSelectedClient: (c: ClientOrg | null) => void
}
```

Demo clients for development:
```typescript
const demoClients: ClientOrg[] = [
  { id: 'org-101', name: 'Gulf Medical Center', region: 'uae', ehr_mode: 'medcloud_ehr' },
  { id: 'org-102', name: 'Irvine Family Practice', region: 'us', ehr_mode: 'external_ehr' },
  { id: 'org-103', name: 'Patel Cardiology', region: 'us', ehr_mode: 'medcloud_ehr' },
  { id: 'org-104', name: 'Dubai Wellness Clinic', region: 'uae', ehr_mode: 'external_ehr' },
]
```

### 1.3 Restructure Module Config

**File: `src/lib/modules.ts`**

Major changes:
- Add `provider` to role groups
- Rename `talk-to-us` → `messages` (contextual messaging)
- Add `appointments` module (shared: clinic + billing team view)
- Move `scheduling` into portal (clinic-owned) and give billing team read access
- Give `provider` role access to: dashboard, scheduling, ai-scribe, patients, documents
- Remove scheduling from staff-only operations section

```typescript
const providerRoles: UserRole[] = ['provider']
const clinicRoles: UserRole[] = ['client', 'provider']  // anyone at the clinic
const staffRoles: UserRole[] = ['admin', 'director', 'supervisor', 'manager', 'coder', 'biller', 'ar_team', 'posting_team']
const allRoles: UserRole[] = [...staffRoles, ...clinicRoles]

// CLIENT PORTAL section changes:
{ id: 'appointments', label: 'mod.appointments', icon: 'CalendarDays', path: '/portal/appointments', section: 'portal', roles: [...clinicRoles, ...staffRoles] },
// ^ Appointments is shared — clinic manages, billing team views
{ id: 'scan', label: 'mod.scan', icon: 'ScanLine', path: '/portal/scan-submit', section: 'portal', roles: ['client'] },
{ id: 'watch', label: 'mod.watch', icon: 'Eye', path: '/portal/watch-track', section: 'portal', roles: ['client'] },
{ id: 'messages', label: 'mod.messages', icon: 'MessageCircle', path: '/portal/messages', section: 'portal', roles: [...clinicRoles, ...staffRoles] },
// ^ Messages is shared — contextual messaging between clinic and Cosentus
{ id: 'portal-patients', label: 'mod.patients', icon: 'Users', path: '/portal/patients', section: 'portal', roles: clinicRoles },

// AI SECTION — scribe accessible to provider:
{ id: 'scribe', label: 'mod.scribe', icon: 'Mic', path: '/ai-scribe', section: 'ai', roles: ['admin', 'director', 'supervisor', 'manager', 'coder', 'provider'] },
// ^ provider uses it to dictate, coder sees output in coding queue

// REMOVE scheduling from operations. It's now in portal as 'appointments'.
// DELETE the old: { id: 'scheduling', ... section: 'operations', roles: staffRoles }
```

Provider sidebar should show only: Dashboard, Appointments (as "Schedule"), AI Scribe, Patients, Documents. 5 items total. Use section label "CLINICAL" instead of "PORTAL" for provider.

### 1.4 Add Client Filter to Topbar

**File: `src/components/layout/Topbar.tsx`**

For staff roles only (not client, not provider), add a client filter dropdown BEFORE the language/theme controls:

```
[MedCloud logo] ... [Search] ... [Client: All Clients ▼] [🇦🇪/🇺🇸] [🌐] [☀️] [🔔] [👤 admin ▼]
```

- Dropdown shows all client orgs from context
- "All Clients" option at top
- When a client is selected, show their region flag
- When "All Clients" → show mixed indicator
- Client/provider roles: don't show this dropdown (they're locked to their own org)

### 1.5 Fix Role Switcher Bug

**File: `src/components/layout/Topbar.tsx`**

Current bug: navigating between pages sometimes changes the displayed role. The role switcher must persist the selected role across all navigation. Ensure `setRole` in context is only called by the role dropdown `onChange`, never by page navigation.

---

## PART 2: CLIENT PORTAL REBUILDS

### 2.1 Patients Page — Progressive Profile

**File: `src/app/portal/patients/page.tsx`** — FULL REWRITE

**Key principle:** Only require what you have RIGHT NOW. A patient record starts with just name + phone and gets richer over time.

**Features needed:**
- Patient list table with columns: Name, DOB, Phone, Insurance, Profile % (completeness indicator), Status
- Search by name, phone, DOB, member ID
- **Add Patient:** Minimal form — ONLY First Name, Last Name, Phone required. Everything else optional.
- **Edit Patient:** Click any patient → opens editable profile with tabs:
  - **Demographics:** Name, DOB, gender, phone, email, address. All editable.
  - **Insurance:** Primary + Secondary. Each: payer, policy #, group #, member ID. "Upload Insurance Card" button → AI extracts fields.
  - **Documents:** All files linked to this patient (insurance cards, IDs, superbills, clinical notes). Upload button.
  - **Visit History:** List of appointments + linked claims with status.
  - **Messages:** Contextual message thread (Cosentus ↔ Clinic about this patient).
- **Profile completeness bar:** Visual indicator.
  - Red 20%: name + phone only
  - Orange 50%: + DOB + gender
  - Cyan 75%: + insurance
  - Green 100%: fully complete
- **Deactivate patient** (not delete — soft deactivate with reason)
- **Region-aware fields:**
  - If org region = `uae`: Show "Emirates ID" field (format: 784-YYYY-NNNNNNN-N). Show TPA dropdown for payer.
  - If org region = `us`: Show "SSN" field (optional, format: XXX-XX-XXXX). Show commercial payer dropdown.
  - NEVER show both Emirates ID and SSN on the same form.
- **AI ID Scan button:** "Scan ID Card" → simulated Textract extraction → auto-fills demographics
- **AI Insurance Scan button:** "Scan Insurance Card" → simulated Textract → auto-fills payer info

Demo data: 6 patients at various completeness levels (one with just name+phone, one fully complete, one UAE with Emirates ID, etc.)

### 2.2 Appointments Page — Shared View (NEW)

**File: `src/app/portal/appointments/page.tsx`** — NEW FILE

**Replaces the old `/scheduling` module.** Accessible by both clinic (full edit) and billing team (read-only).

**Features:**
- Calendar view toggle: Day / Week / Month / List
- Default to List view for demo (easier to implement)
- **Appointment states** with color badges:
  - Booked (gray) → Confirmed (blue) → Checked In (cyan) → In Progress (amber) → Completed (green)
  - No-Show (red), Cancelled (gray strikethrough), Rescheduled (purple), Walk-In (teal), Late (orange)
- **Each appointment row:** Time, Patient Name, Provider, Visit Type (consultation, follow-up, procedure, telehealth), Status, Duration
- **Clinic users can:** Create appointment (minimal: patient + provider + date/time + type), update status, cancel, reschedule, add notes
- **Staff users see:** Read-only view. Filter by client. "Missing Docs" column (completed visits with no superbill after 48h flagged amber)
- **Stats bar at top:** Today's appointments, Checked In, Completed, No-Shows, Cancellations
- **Create appointment:** Search existing patient OR create new minimal patient inline (name + phone)
- **No-show tracking:** Counter on patient record. Badge if 3+ no-shows.

Demo data: 12 appointments today across various states.

### 2.3 Scan & Submit — REWRITE (Remove Coding Data)

**File: `src/app/portal/scan-submit/page.tsx`** — FULL REWRITE

**What the client sees — SIMPLE:**
1. Search/select patient from dropdown (required)
2. Upload zone (drag & drop, multi-file). Supported: PDF, JPG, PNG, TIFF.
3. Document type dropdown: Superbill, Clinical Note, Insurance Card, ID Card, Op Report, Lab Results, Other
4. Optional note field ("Two visits same day" etc.)
5. **"Submit to Cosentus"** button
6. Confirmation: "✓ Received! Tracking ID: #SUB-2024-0847. Track progress in Watch & Track."
7. **Submission History** table: Date, Patient, Files, Status (Received → In Coding → Claim Submitted → Paid), Tracking ID

**What the client does NOT see:**
- ❌ NO CPT codes
- ❌ NO ICD-10 codes
- ❌ NO charges / dollar amounts
- ❌ NO AI extraction results
- ❌ NO confidence scores
- ❌ NO "Confirm & Submit to Coding" with field review

All AI extraction happens on the Cosentus side, invisible to client.

Demo data: 5 submissions at various statuses.

### 2.4 Watch & Track — Fix Visibility

**File: `src/app/portal/watch-track/page.tsx`** — UPDATE

**Client CAN see:** Claim status (Received → In Process → Submitted → Paid/Denied), patient name, DOS, payer, total charges, amount paid, patient balance, whether appeal is in progress.

**Client CANNOT see:** CPT/ICD codes, coder name, internal notes, AI confidence, scrub errors, task assignments.

Keep existing KPIs and table but remove the CPT column. Add a claim detail side drawer: click a claim → see status timeline, documents, message thread for that claim.

### 2.5 Messages — Replace Talk to Us (REWRITE)

**File: `src/app/portal/messages/page.tsx`** — NEW (replaces `/portal/talk-to-us/`)

**Unified inbox** showing all message threads across entities:

**Left panel:** Thread list, filterable by:
- Entity type: Patient, Claim, Submission, Appointment, General
- Status: Unread, Open, Resolved
- Each thread shows: entity icon + name, last message preview, timestamp, unread badge

**Right panel:** Selected thread conversation:
- Entity header: "Re: Patient — John Smith (P-001)" or "Re: Claim #CLM-4521" or "General"
- Threaded messages: sender name + role badge, timestamp, message text
- File attachments (clinic can drop missing docs right in the thread)
- Reply input with attach button

**"New Message" button:**
- Category: Patient Issue, Claim Issue, Document Issue, Appointment Issue, General
- Link to entity: search patient/claim/appointment (optional for General)
- Message text
- Priority (low/medium/high)

**Staff side:** Same UI but sees threads across all clients. Client column on each thread. Filter by client.

Demo data: 5 threads (one per patient about missing insurance, one about a denied claim, one about an illegible superbill, one appointment note, one general).

Delete: `/portal/talk-to-us/` directory entirely.

---

## PART 3: STAFF MODULE BUILDS (Real Interactive UI with Demo Data)

Each module gets a real working UI — tables, filters, actions, demo data. No more empty shells.

### 3.1 AI Coding — `/coding/page.tsx`

**The coder's primary workspace.** Split-pane layout.

**Left: Source Queue / Document Viewer**
- Queue list: Patient, Client, Source (AI Scribe / Upload), DOS, Priority, Age (time since received)
- Click item → shows source document:
  - If from Scribe: formatted SOAP note (S/O/A/P sections), audio player for visit recording
  - If from Upload: PDF/image viewer (simulated), AI-extracted text overlay
  - Multiple doc tabs if several files attached

**Right: Coding Workspace**
- Patient header: name, DOB, insurance, client name (with badge)
- Date of Service
- Diagnosis codes (ICD-10): AI-suggested list with confidence %. Accept/remove/add/reorder. Primary dx first.
- Procedure codes (CPT): AI-suggested with confidence %, modifiers, units
- If superbill had codes: comparison row — "Superbill: 99214 | AI suggests: 99213" → yellow flag
- Charges: auto-calculated display (read-only, from fee schedule)
- Buttons: "Approve & Send to Billing" | "Query Doctor" (opens message) | "Hold" | "Skip"

**Stats bar:** My Queue (count), Coded Today, AI Acceptance Rate, Avg Time/Chart

Demo data: 8 items in queue from different clients, mix of Scribe and Upload sources, with AI-suggested codes.

### 3.2 Claims Center — `/claims/page.tsx`

**All claims across all clients.** Worklist-style.

**Filters bar:** Status (Draft/Submitted/Accepted/In Process/Paid/Denied/Appealed), Client, Payer, Date Range, Search (claim #, patient)

**Table columns:** Claim #, Patient, Client, Payer, DOS, Codes (CPT shortlist), Charges, Status (color badge), Age (days), Assigned To

**Claim states with colors:**
- Draft (gray), Scrubbing (blue-pulse), Scrub Failed (red), Ready to Submit (cyan), Submitted (blue), Accepted (teal), In Process (amber), Paid (green), Partial Pay (orange), Denied (red), Appealed (purple), Corrected (gray-blue), Write-Off (gray), Timely Filing Risk (red-pulse)

**Click claim → detail drawer:**
- Timeline: creation → scrub → submit → ack → paid (with dates)
- Documents tab (side drawer showing all linked docs)
- Messages tab (contextual thread with client)
- Payment info (if paid)
- Denial info (if denied — reason, appeal status)

**Actions:** Submit Batch, Resubmit, Void, Create Secondary

**Stats bar:** Total Claims, Submitted Today, Clean Claim Rate, Avg Days to Payment

Demo data: 15 claims across 3-4 clients in various states.

### 3.3 Eligibility — `/eligibility/page.tsx`

**Verification requests + results.**

**Two tabs:** Single Check | Batch Overnight

**Single Check form:**
- Client dropdown (auto-selects if client filter is set)
- Patient search (from selected client)
- Region-aware fields:
  - UAE: Emirates ID + TPA dropdown (NAS, Mednet, NextCare, Almadallah, Daman, ADNIC)
  - US: Payer dropdown (UHC, Aetna, BCBS, Cigna, Humana, Medicare, Medicaid)
- Date of Service, Service Type
- "Check Eligibility" button → simulated loading → result card

**Result card:** Coverage status (Active/Inactive/Pending), Network (In/Out), Copay %, Deductible remaining, Benefits summary, Prior Auth required flag, Insurance card preview (inline image)

**Batch tab:** Date selector → "Run batch for all appointments on [date]" → results table

**History table:** Recent checks with patient, client, payer, result, timestamp

Demo data: 6 recent checks with mix of active, inactive, out-of-network results.

### 3.4 Denials & Appeals — `/denials/page.tsx`

**Split-pane: denial worklist LEFT, appeal builder RIGHT.**

**Worklist columns:** Claim #, Patient, Client, Payer, Denial Reason (CARC/RARC code + description), Amount, DOS, Appeal Deadline, Level (L1/L2/L3), Status

**Appeal builder (right panel when item selected):**
- Denial details: reason code, payer's explanation
- Linked documents: original claim, clinical note, denial letter, any prior appeal docs (doc viewer tabs)
- AI-generated appeal letter (editable textarea — AI drafts based on denial reason + clinical docs)
- Attach supporting documents
- "Submit Appeal" button with level selector

**Stats bar:** Open Denials, Appeal Success Rate, Avg Days to Resolution, Top 3 Denial Reasons (mini chart)

**Pattern detection alert:** "⚠ 12 claims denied for 'No Prior Auth' this month from Aetna — review prior auth process"

Demo data: 10 denials from various payers with different reason codes.

### 3.5 A/R Management — `/ar-management/page.tsx`

**Aging buckets + prioritized worklist.**

**Aging visualization:** Horizontal stacked bar showing dollar amounts in each bucket: 0-30 (green), 31-60 (cyan), 61-90 (amber), 91-120 (orange), 120+ (red). Clickable to filter.

**Worklist columns:** Patient, Client, Payer, Original Amount, Balance, Age (days), Last Action, Next Follow-up Date, Assigned To, Priority

**Priority indicators:** High-dollar + old = red. Approaching timely filing = red pulse. Voice AI call scheduled = phone icon.

**Account detail drawer:** Full history: claim, all EOBs, appeal history, call logs (voice AI transcripts), payment plan status, internal notes. Documents tab. Messages tab.

**Actions:** Log Follow-up, Schedule Voice AI Call, Request Supervisor Review, Transfer to Collections, Set Up Payment Plan, Write-off (needs approval above threshold)

**Stats bar:** Total A/R, Accounts Worked Today, Follow-ups Due, Avg Days Outstanding

Demo data: 20 accounts across aging buckets from multiple clients.

### 3.6 Payment Posting — `/payment-posting/page.tsx`

**ERA processing + payment matching.**

**Pending ERA queue:** File name, Client, Claims Count, Total Amount, Date Received, Status (New/Processing/Posted/Exceptions)

**Click ERA → split view:**
- LEFT: ERA detail — list of claims in the ERA with payer amounts, adjustments, patient responsibility
- RIGHT: Matched claim detail — original charge, contracted rate, payment, variance

**Color coding:** Green (exact match), Yellow (minor variance < $5), Red (underpayment > threshold), Orange (overpayment)

**Unmatched Payments section:** Payments that don't match any claim in system. Manual investigation queue.

**Actions:** Auto-Post All (for green matches), Review Exception, Flag Underpayment, Process Refund (overpayment), Manual Match

**Stats bar:** ERAs Pending, Posted Today, Auto-Post Rate (AI), Unmatched Count, Underpayment Alerts

Demo data: 5 ERAs, 3 posted with some exceptions, 2 pending.

### 3.7 Contract Manager — `/contracts/page.tsx`

**Payer contracts + underpayment detection.**

**Contract list:** Payer Name, Client, Effective Date, Expiry Date, Status (Active/Expiring/Expired/Under Negotiation)

**Contract detail:** Fee schedule table (CPT code → contracted rate). Underpayment report (claims where payment < contracted rate).

**Alerts:** Contracts expiring within 90 days. Underpayment trends per payer.

Demo data: 6 contracts, 2 expiring soon, 1 with underpayment pattern.

### 3.8 Voice AI — `/voice-ai/page.tsx`

**Call dashboard + queue + builder.**

**Active/Recent calls table:** Call ID, Type (Payer Status / Payer Appeal / Patient Balance / Patient Reminder), Patient/Payer, Client, Duration, Status (Queued/In Progress/Completed/Failed), Outcome

**Call detail:** Audio player (simulated), transcript viewer, linked claim/patient, call notes, next action

**Campaign launcher:** "Call all patients with balance > $100 from [client]" → generates call queue

**Stats bar:** Calls Today, Avg Duration, Success Rate, On Hold Time, Calls by Type (pie)

Demo data: 15 calls across types and statuses.

### 3.9 AI Scribe — `/ai-scribe/page.tsx`

**Doctor's dictation tool. Also viewable by coders (read-only for reviewing output).**

**For provider role:**
- "Start New Visit" → select patient from today's schedule → recording interface
- Recording UI: waveform visualization, timer, pause/resume/stop
- After stop: AI "processes" (simulated 3s) → split pane: transcript LEFT, editable SOAP note RIGHT
- SOAP sections: Subjective, Objective, Assessment, Plan. Each editable.
- AI-suggested codes shown below (CPT + ICD with confidence)
- "Sign & Send to Billing" button → routes to coding queue
- Pending sign-offs list (notes generated but not yet reviewed)

**For coder/staff role:**
- Read-only view of signed notes
- Can listen to audio, read transcript + SOAP note
- Accessed from coding queue (link to Scribe output)

Demo data: 3 completed visits (2 signed, 1 pending sign-off) with SOAP notes and suggested codes.

### 3.10 Tasks & Workflows — `/tasks/page.tsx`

**Task management across all work types.**

**My Tasks / Team Tasks toggle (supervisors see team)**

**Table:** Task ID, Type (Coding/Billing/AR Follow-up/Appeal/Posting Exception/Query/Document Request), Entity (linked claim/patient), Client, Priority (Low/Med/High/Urgent), Status (Open/In Progress/Blocked/Completed), Assigned To, Due Date, SLA indicator

**SLA colors:** Green (on track), Yellow (approaching), Red (breached), Gray (blocked — paused SLA)

**Task detail:** Description, linked entity with doc drawer, activity log (who did what when), reassignment history

**Actions:** Start Working, Mark Complete, Block (with reason), Reassign, Escalate

**Auto-generated task examples in demo data:** "Missing superbill — Gulf Medical Center — John Smith visit Feb 28" (auto-created 48h after completed appointment), "Denial review — Aetna — Claim #4521", "ERA exception — UHC — Unmatched payment $340"

Demo data: 12 tasks across types and statuses.

### 3.11 Documents — `/documents/page.tsx`

**Document vault — management layer (NOT the primary access method).**

**Search bar:** Full-text search across all documents (simulated)

**Filters:** Document Type, Client, Patient, Date Range, Status (Linked/Unlinked/Processing)

**Table:** Document Name, Type (Superbill/Clinical Note/Insurance Card/EOB/ERA/Denial Letter/Contract/Credential), Client, Patient, Upload Date, Source (Portal/Email/Fax/EHR/Scribe), Status

**Unlinked Queue tab:** Documents that arrived but aren't matched to a patient yet. Staff can click → preview → manually link to patient.

**Fax Center tab:** Inbound/outbound fax log with preview.

**Bulk Upload:** Upload multiple files → AI auto-classifies each.

Demo data: 20 documents across types, 3 unlinked.

### 3.12 Credentialing — `/credentialing/page.tsx`

**Provider credential tracking.**

**Provider roster:** Name, NPI, Client, License Status, Malpractice Expiry, DEA Expiry, CAQH Status, Payer Enrollments (count)

**Provider detail:** All credential documents with expiry dates. Upload/replace. Payer enrollment status per payer (Applied/Active/Pending/Denied). Alerts for approaching expirations.

**Alert banner:** "⚠ 2 providers have credentials expiring within 30 days"

Demo data: 6 providers, 2 with expiring credentials.

### 3.13 Analytics — `/analytics/page.tsx`

**Reporting dashboard — exec/manager view.**

**Tabs:** Financial | Operational | AI Performance | By Client

**Financial:** Revenue trend (line chart placeholder), Collection Rate, Days in A/R, Denial Rate, Payer Mix (pie)
**Operational:** Claims/hour by team, First Pass Rate, Clean Claim Rate, Staff Productivity
**AI Performance:** Auto-coding accuracy, AI acceptance rate, Textract confidence, Voice AI success rate
**By Client:** Per-client breakdown of all KPIs. Client comparison table.

**Filters:** Date range, Client

Demo data: summary KPI cards with realistic numbers.

### 3.14 Admin — `/admin/page.tsx`

**System administration.**

**Tabs:** Users | Organizations | System Health | Audit Log

**Users:** CRUD table — name, email, role, assigned clients, status (active/disabled), last login
**Organizations:** Client list — name, region, EHR mode, pricing model, status
**System Health:** API status, DB connections, AI service status, queue depths
**Audit Log:** Who accessed what when (filterable)

Demo data: 8 users, 4 organizations.

### 3.15 Integration Hub — `/integrations/page.tsx`

**External connections.**

**Connection cards:** Each with status indicator (Connected/Error/Not Configured)
- Clearinghouses (Availity, Change Healthcare, Trizetto)
- EHR Systems (Epic, Cerner, eClinicalWorks)
- Payer Portals (direct connects)
- DHA eClaim (UAE)
- Cloud Fax
- Email Ingest
- SharePoint Sync

**Each card:** Connection name, status, last sync, error count, "Configure" / "Test" buttons

Demo data: 3 connected, 2 with errors, rest not configured.

---

## PART 4: APP-LEVEL FIXES

### 4.1 Shared DocViewer Component

**File: `src/components/shared/DocViewer.tsx`** — NEW

Reusable document viewer embedded in every module. Three modes:

**Props:**
```typescript
interface DocViewerProps {
  entityType: 'patient' | 'claim' | 'encounter' | 'submission' | 'appointment'
  entityId: string
  mode: 'split' | 'drawer' | 'inline'
  onClose?: () => void
}
```

- **Split mode:** 50/50 resizable split. Used by AI Coding, Denials, Payment Posting, AI Scribe.
- **Drawer mode:** Slides in from right (500px). Used by Claims, AR, Tasks, Watch & Track, Credentialing.
- **Inline mode:** Thumbnail with click-to-expand modal. Used by Eligibility (insurance card), Patient profile.

Features: PDF rendering (placeholder), image zoom, document tabs if multiple files, download button.

### 4.2 Shared MessageThread Component

**File: `src/components/shared/MessageThread.tsx`** — NEW

Reusable contextual messaging component embedded on entity detail views.

**Props:**
```typescript
interface MessageThreadProps {
  entityType: 'patient' | 'claim' | 'submission' | 'appointment' | 'general'
  entityId: string
  compact?: boolean  // true = collapsed section, false = full panel
}
```

Shows threaded messages, reply input, file attach button, sender name + role badge.

### 4.3 Toast/Notification System

Add `react-hot-toast` (already in package.json if not, add it). Toaster component in layout. Use for: form saves, submissions, errors, status changes.

### 4.4 Mobile Responsive

Add hamburger menu for sidebar on screens < 768px. Sidebar slides over content as overlay. Close on navigation.

### 4.5 404 Page

**File: `src/app/not-found.tsx`** — NEW

Brand-styled 404 with "Back to Dashboard" link.

### 4.6 Loading States

Add skeleton loaders for page transitions. Use Tailwind `animate-pulse` on placeholder blocks.

---

## PART 5: DASHBOARD UPDATES

**File: `src/app/dashboard/page.tsx`** — UPDATE

Add `ProviderDashboard` component for the new `provider` role:

**Provider Dashboard shows:**
- Today's Schedule (appointment list with patient names, times, status)
- Pending Sign-offs (AI Scribe notes waiting for review — count + list)
- Patients Seen Today / This Week
- Clinical Alerts (drug interactions, care gaps — simulated)
- Recent Notes (last 5 with status: draft/signed/sent to billing)
- Quick Actions: "Start New Visit" → AI Scribe, "View Schedule" → Appointments

Update `ClientDashboard`:
- Remove any reference to CPT/ICD codes
- Add Appointments Today (from shared appointments view)
- Add Submissions Pending (from scan & submit)
- Add Unread Messages count
- Quick actions: Upload Documents, View Schedule, Track Claims, Messages

Add client filter awareness to all staff dashboards — when `selectedClient` is set in context, show KPIs for that client only.

---

## PART 6: ROUTING & NAVIGATION CLEANUP

Delete old files:
- `src/app/scheduling/page.tsx` — replaced by `/portal/appointments`
- `src/app/portal/talk-to-us/page.tsx` — replaced by `/portal/messages`

Add redirect from old paths:
- `/scheduling` → `/portal/appointments`
- `/portal/talk-to-us` → `/portal/messages`

Update sidebar section labels:
- Provider role: show "CLINICAL" instead of "PORTAL"
- Client role: show "MY PRACTICE" instead of "PORTAL"
- Staff role: keep "OPERATIONS", "AI & AUTOMATION", "MANAGEMENT"

---

## PART 7: DEMO DATA STRATEGY

Every module uses hardcoded demo data (no backend yet). All demo data should reference the same demo clients from context:
- Gulf Medical Center (UAE, medcloud_ehr)
- Irvine Family Practice (US, external_ehr)
- Patel Cardiology (US, medcloud_ehr)
- Dubai Wellness Clinic (UAE, external_ehr)

Patient names, claim numbers, and other IDs should be consistent across modules. For example, patient "John Smith" from "Irvine Family Practice" should appear in Patients, Claims, and A/R with the same patient ID.

Shared demo data file: `src/lib/demo-data.ts` — single source of truth for all demo entities (patients, claims, appointments, etc.) that modules import from.

---

## PART 8: FILE STRUCTURE SUMMARY

```
src/
  types/index.ts                    — UPDATED (add provider role, ehr_mode, ClientOrg)
  lib/
    context.tsx                     — UPDATED (add selectedClient, clients)
    modules.ts                      — UPDATED (restructure roles, add appointments, rename messages)
    demo-data.ts                    — NEW (shared demo data)
    utils.ts                        — existing
  components/
    layout/
      AppShell.tsx                  — existing (minor: pass client context)
      Sidebar.tsx                   — UPDATED (section labels per role)
      Topbar.tsx                    — UPDATED (client filter, fix role bug)
    shared/
      KPICard.tsx                   — existing
      ModuleShell.tsx               — existing
      DocViewer.tsx                 — NEW
      MessageThread.tsx             — NEW
  app/
    layout.tsx                      — existing
    page.tsx                        — existing (redirect)
    not-found.tsx                   — NEW
    globals.css                     — existing
    dashboard/page.tsx              — UPDATED (add provider dashboard, client filter)
    claims/page.tsx                 — FULL BUILD
    coding/page.tsx                 — FULL BUILD
    eligibility/page.tsx            — FULL BUILD
    denials/page.tsx                — FULL BUILD
    ar-management/page.tsx          — FULL BUILD
    payment-posting/page.tsx        — FULL BUILD
    contracts/page.tsx              — FULL BUILD
    voice-ai/page.tsx               — FULL BUILD
    ai-scribe/page.tsx              — FULL BUILD
    tasks/page.tsx                  — FULL BUILD
    documents/page.tsx              — FULL BUILD
    credentialing/page.tsx          — FULL BUILD
    analytics/page.tsx              — FULL BUILD
    admin/page.tsx                  — FULL BUILD
    integrations/page.tsx           — FULL BUILD
    scheduling/                     — DELETE (moved to portal/appointments)
    portal/
      appointments/page.tsx         — NEW
      scan-submit/page.tsx          — FULL REWRITE
      watch-track/page.tsx          — UPDATE
      messages/page.tsx             — NEW (replaces talk-to-us)
      patients/page.tsx             — FULL REWRITE
      talk-to-us/                   — DELETE
  i18n/translations.ts             — UPDATE (add new module labels, provider strings)
```

Total: ~30 files to create/modify. Every page module gets real interactive UI with demo data.

---

## PRIORITY ORDER

1. **Types + Context + Modules + Topbar** (architectural foundation)
2. **Demo data file** (shared reference for all modules)
3. **Patient page rewrite** (progressive profile, region-aware)
4. **Appointments page** (new, shared view)
5. **Scan & Submit rewrite** (remove coding data from client view)
6. **Messages page** (contextual messaging)
7. **DocViewer + MessageThread components** (shared, needed by staff modules)
8. **AI Coding** (coder's primary workspace — most complex)
9. **Claims Center** (second most used)
10. **Eligibility** (Sprint 2 priority)
11. **Dashboard updates** (provider + client filter)
12. **Denials, AR, Posting, Voice AI, AI Scribe** (Sprint 3-4 modules)
13. **Tasks, Documents, Contracts, Credentialing** (Sprint 4)
14. **Analytics, Admin, Integrations** (Sprint 5)
15. **App-level fixes** (404, toasts, mobile, loading states)
