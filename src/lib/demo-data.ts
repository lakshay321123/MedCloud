import { ClientOrg, AppointmentStatus, ClaimStatus, Priority } from '@/types'

// ─── Document types (used by DocViewer) ────────────────────────────────────
export interface DemoDocument {
  id: string
  name: string
  type: 'superbill' | 'clinical_note' | 'insurance_card' | 'eob' | 'denial_letter' | 'prior_auth'
  content?: Record<string, string>
  url?: string
}

export const demoClients: ClientOrg[] = [
  { id: 'org-101', name: 'Gulf Medical Center', region: 'uae', ehr_mode: 'medcloud_ehr' },
  { id: 'org-102', name: 'Irvine Family Practice', region: 'us', ehr_mode: 'external_ehr' },
  { id: 'org-103', name: 'Patel Cardiology', region: 'us', ehr_mode: 'medcloud_ehr' },
  { id: 'org-104', name: 'Dubai Wellness Clinic', region: 'uae', ehr_mode: 'external_ehr' },
]

export interface DemoPatient {
  id: string
  firstName: string
  lastName: string
  middleName?: string
  preferredName?: string
  dob?: string
  gender?: string
  maritalStatus?: string
  phone: string
  secondaryPhone?: string
  email?: string
  preferredLanguage?: string
  preferredContact?: string
  emiratesId?: string
  ssn?: string
  driversLicense?: string
  passport?: string
  insurance?: {
    payer: string
    policyNo: string
    groupNo?: string
    memberId: string
    subscriberName?: string
    subscriberDob?: string
    relationship?: string
    copay?: number
  }
  secondaryInsurance?: { payer: string; policyNo: string; memberId: string }
  address?: { line1: string; line2?: string; city: string; state: string; zip: string; country: string }
  emergencyContact?: { name: string; relationship: string; phone: string }
  employment?: { status: string; employer?: string; workPhone?: string; occupation?: string }
  allergies?: string[]
  medications?: string[]
  referringPhysician?: string
  primaryCarePhysician?: string
  clientId: string
  status: 'active' | 'inactive'
  profileComplete: number
  noShowCount?: number
  documents?: DemoDocument[]
}

export const demoPatients: DemoPatient[] = [
  {
    id: 'P-001', firstName: 'John', middleName: 'Robert', lastName: 'Smith',
    dob: '1985-03-15', gender: 'Male', maritalStatus: 'Married',
    phone: '(949) 555-0101', secondaryPhone: '(949) 555-0199',
    email: 'john.smith@email.com', preferredLanguage: 'English', preferredContact: 'Email',
    ssn: '***-**-4521', driversLicense: 'CA-D3456789',
    insurance: { payer: 'UnitedHealthcare', policyNo: 'UHC-889921', groupNo: 'GRP-4410', memberId: 'UHC884521', relationship: 'Self', copay: 30 },
    address: { line1: '123 Irvine Blvd', city: 'Irvine', state: 'CA', zip: '92602', country: 'United States' },
    emergencyContact: { name: 'Mary Smith', relationship: 'Spouse', phone: '(949) 555-0199' },
    employment: { status: 'Employed', employer: 'TechCorp Inc', occupation: 'Software Engineer', workPhone: '(949) 555-9000' },
    allergies: ['Penicillin'], medications: ['Metformin 500mg', 'Lisinopril 10mg'],
    referringPhysician: 'Dr. James Wilson', primaryCarePhysician: 'Dr. Martinez',
    clientId: 'org-102', status: 'active', profileComplete: 100,
    documents: [
      { id: 'DOC-P001-1', name: 'Superbill_2026-02-15.pdf', type: 'superbill', content: {
        'Patient': 'John Smith', 'DOS': '02/15/2026', 'Provider': 'Dr. Sarah Martinez',
        'CPT Codes': '99214, 93000', 'ICD Codes': 'E11.9, I10', 'Charges': '$485.00'
      }},
      { id: 'DOC-P001-2', name: 'Clinical_Note_2026-02-15.pdf', type: 'clinical_note', content: {
        'S': 'Patient presents with fatigue and elevated BP readings at home',
        'O': 'BP 148/92, HR 78, weight 185 lbs. EKG performed.',
        'A': 'Type 2 DM uncontrolled. Essential hypertension.',
        'P': 'Increase metformin to 1000mg BID. Recheck in 6 weeks.'
      }},
    ],
  },
  {
    id: 'P-002', firstName: 'Sarah', lastName: 'Johnson',
    dob: '1992-07-22', gender: 'Female',
    phone: '(949) 555-0102', email: 'sarah.j@email.com',
    preferredLanguage: 'English', preferredContact: 'SMS',
    insurance: { payer: 'Aetna', policyNo: 'AET-334201', memberId: 'AET334201', relationship: 'Self' },
    address: { line1: '789 Campus Dr', city: 'Irvine', state: 'CA', zip: '92617', country: 'United States' },
    clientId: 'org-102', status: 'active', profileComplete: 75,
    documents: [
      { id: 'DOC-P002-1', name: 'Superbill_2026-02-18.pdf', type: 'superbill', content: {
        'Patient': 'Sarah Johnson', 'DOS': '02/18/2026', 'Provider': 'Dr. Sarah Martinez',
        'CPT Codes': '99215', 'ICD Codes': 'M54.5', 'Charges': '$350.00'
      }},
    ],
  },
  {
    id: 'P-003', firstName: 'Ahmed', lastName: 'Al Mansouri',
    dob: '1978-11-08', gender: 'Male', maritalStatus: 'Married',
    phone: '+971 50 123 4567', email: 'ahmed.m@email.com',
    preferredLanguage: 'Arabic', preferredContact: 'Phone',
    emiratesId: '784-1978-1234567-1', passport: 'AE1234567',
    insurance: { payer: 'Daman', policyNo: 'DAM-778834', memberId: 'DAM778834', relationship: 'Self', copay: 0 },
    address: { line1: 'Villa 42, Al Raha Gardens', city: 'Abu Dhabi', state: 'Abu Dhabi', zip: '', country: 'United Arab Emirates' },
    emergencyContact: { name: 'Layla Al Mansouri', relationship: 'Spouse', phone: '+971 50 765 4321' },
    employment: { status: 'Employed', employer: 'ADNOC', occupation: 'Engineer', workPhone: '+971 2 123 4567' },
    allergies: [], medications: ['Aspirin 81mg'],
    primaryCarePhysician: 'Dr. Al Zaabi',
    clientId: 'org-101', status: 'active', profileComplete: 100,
    documents: [
      { id: 'DOC-P003-1', name: 'Superbill_2026-02-24.pdf', type: 'superbill', content: {
        'Patient': 'Ahmed Al Mansouri', 'DOS': '02/24/2026', 'Provider': 'Dr. Al Zaabi',
        'CPT Codes': '99213, 93000', 'ICD Codes': 'I25.10', 'Charges': '$420.00'
      }},
      { id: 'DOC-P003-2', name: 'Clinical_Note_2026-02-24.pdf', type: 'clinical_note', content: {
        'S': 'Stable on current medications. No chest pain or dyspnea.',
        'O': 'BP 124/78, HR 64, SpO2 98%. RRR, no murmurs.',
        'A': 'Stable CAD on optimal medical therapy.',
        'P': 'Continue current meds. Lipid panel in 3 months. Follow-up 6 months.'
      }},
    ],
  },
  {
    id: 'P-004', firstName: 'Fatima', lastName: 'Hassan',
    phone: '+971 55 987 6543', clientId: 'org-101', status: 'active', profileComplete: 20,
  },
  {
    id: 'P-005', firstName: 'Robert', middleName: 'James', lastName: 'Chen',
    dob: '1965-01-30', gender: 'Male', maritalStatus: 'Married',
    phone: '(714) 555-0201', email: 'r.chen@email.com',
    preferredLanguage: 'English', preferredContact: 'Phone',
    ssn: '***-**-7788', driversLicense: 'CA-C9876543',
    insurance: { payer: 'Medicare', policyNo: 'MED-112093', memberId: 'MED112093', relationship: 'Self', copay: 0 },
    secondaryInsurance: { payer: 'BCBS', policyNo: 'BCB-445201', memberId: 'BCB445201' },
    address: { line1: '456 Harbor Blvd', city: 'Anaheim', state: 'CA', zip: '92801', country: 'United States' },
    emergencyContact: { name: 'Linda Chen', relationship: 'Spouse', phone: '(714) 555-0202' },
    employment: { status: 'Retired', occupation: 'Former Engineer' },
    allergies: ['Sulfa drugs', 'Aspirin'],
    medications: ['Carvedilol 25mg', 'Furosemide 40mg', 'Warfarin 5mg'],
    primaryCarePhysician: 'Dr. Patel',
    clientId: 'org-103', status: 'active', profileComplete: 100, noShowCount: 3,
  },
  {
    id: 'P-006', firstName: 'Maria', lastName: 'Garcia',
    dob: '1990-05-12', gender: 'Female',
    phone: '(949) 555-0303', preferredLanguage: 'Spanish', preferredContact: 'SMS',
    clientId: 'org-102', status: 'active', profileComplete: 50,
  },
  {
    id: 'P-007', firstName: 'Khalid', lastName: 'Ibrahim',
    dob: '1988-09-03', gender: 'Male', maritalStatus: 'Single',
    phone: '+971 52 456 7890', preferredLanguage: 'Arabic',
    emiratesId: '784-1988-7654321-2',
    insurance: { payer: 'NAS', policyNo: 'NAS-992341', memberId: 'NAS992341', relationship: 'Self' },
    address: { line1: 'Apt 1204, Marina Residences', city: 'Dubai', state: 'Dubai', zip: '', country: 'United Arab Emirates' },
    clientId: 'org-104', status: 'active', profileComplete: 85,
  },
  {
    id: 'P-008', firstName: 'Emily', lastName: 'Williams',
    dob: '1975-12-20', gender: 'Female',
    phone: '(714) 555-0404', email: 'emily.w@email.com',
    ssn: '***-**-3344',
    clientId: 'org-103', status: 'inactive', profileComplete: 60,
  },
]

export interface DemoAppointment {
  id: string; patientId: string; patientName: string; provider: string;
  date: string; time: string; type: string; status: AppointmentStatus;
  duration: number; clientId: string; notes?: string;
}

export const demoAppointments: DemoAppointment[] = [
  { id: 'APT-001', patientId: 'P-001', patientName: 'John Smith', provider: 'Dr. Martinez', date: '2026-03-02', time: '09:00', type: 'Follow-up', status: 'completed', duration: 30, clientId: 'org-102' },
  { id: 'APT-002', patientId: 'P-002', patientName: 'Sarah Johnson', provider: 'Dr. Martinez', date: '2026-03-02', time: '09:30', type: 'Consultation', status: 'checked_in', duration: 45, clientId: 'org-102' },
  { id: 'APT-003', patientId: 'P-003', patientName: 'Ahmed Al Mansouri', provider: 'Dr. Al Zaabi', date: '2026-03-02', time: '10:00', type: 'Follow-up', status: 'confirmed', duration: 30, clientId: 'org-101' },
  { id: 'APT-004', patientId: 'P-006', patientName: 'Maria Garcia', provider: 'Dr. Martinez', date: '2026-03-02', time: '10:30', type: 'Initial Visit', status: 'booked', duration: 60, clientId: 'org-102' },
  { id: 'APT-005', patientId: 'P-005', patientName: 'Robert Chen', provider: 'Dr. Patel', date: '2026-03-02', time: '09:00', type: 'Cardiology Consult', status: 'in_progress', duration: 45, clientId: 'org-103' },
  { id: 'APT-006', patientId: 'P-007', patientName: 'Khalid Ibrahim', provider: 'Dr. Noor', date: '2026-03-02', time: '11:00', type: 'Check-up', status: 'confirmed', duration: 30, clientId: 'org-104' },
  { id: 'APT-007', patientId: 'P-001', patientName: 'John Smith', provider: 'Dr. Martinez', date: '2026-02-25', time: '09:00', type: 'Follow-up', status: 'completed', duration: 30, clientId: 'org-102' },
  { id: 'APT-008', patientId: 'P-008', patientName: 'Emily Williams', provider: 'Dr. Patel', date: '2026-03-02', time: '10:00', type: 'Follow-up', status: 'no_show', duration: 30, clientId: 'org-103' },
  { id: 'APT-009', patientId: 'P-004', patientName: 'Fatima Hassan', provider: 'Dr. Al Zaabi', date: '2026-03-02', time: '11:30', type: 'Walk-in', status: 'walk_in', duration: 30, clientId: 'org-101' },
  { id: 'APT-010', patientId: 'P-006', patientName: 'Maria Garcia', provider: 'Dr. Martinez', date: '2026-02-28', time: '14:00', type: 'Follow-up', status: 'cancelled', duration: 30, clientId: 'org-102', notes: 'Patient called to cancel' },
  { id: 'APT-011', patientId: 'P-005', patientName: 'Robert Chen', provider: 'Dr. Patel', date: '2026-03-02', time: '14:00', type: 'ECG Review', status: 'booked', duration: 30, clientId: 'org-103' },
  { id: 'APT-012', patientId: 'P-002', patientName: 'Sarah Johnson', provider: 'Dr. Martinez', date: '2026-03-02', time: '15:00', type: 'Lab Review', status: 'booked', duration: 20, clientId: 'org-102' },
]

export interface ClaimScrubError {
  ruleId: number
  severity: 'error' | 'warning'
  name: string
  description: string
  fix: string
}

export interface ClaimTimelineEvent {
  status: ClaimStatus
  timestamp: string
  by: string
}

export interface DemoClaim {
  id: string; patientId: string; patientName: string; clientId: string; clientName: string;
  payer: string; payerId: string; dos: string; cptCodes: string[]; icdCodes: string[];
  billed: number; allowed: number; paid: number;
  status: ClaimStatus; age: number; assignedTo?: string; denialReason?: string;
  submittedDate?: string; paymentDate?: string; daysTilDeadline?: number;
  placeOfService?: string;
  scrubErrors: ClaimScrubError[];
  timeline: ClaimTimelineEvent[];
  documents: DemoDocument[];
  apiId?: string;
}

const claimDocs: DemoDocument[] = [
  { id: 'DOC-CLM-1', name: 'Superbill_2026-02-15.pdf', type: 'superbill', content: {
    'Patient': 'John Smith', 'DOS': '02/15/2026', 'Provider': 'Dr. Sarah Martinez',
    'CPT Codes': '99214, 93000', 'ICD Codes': 'E11.9, I10', 'Charges': '$485.00'
  }},
  { id: 'DOC-CLM-2', name: 'Clinical_Note_2026-02-15.pdf', type: 'clinical_note', content: {
    'S': 'Patient presents with fatigue and elevated BP readings at home',
    'O': 'BP 148/92, HR 78, weight 185 lbs. EKG performed.',
    'A': 'Type 2 DM uncontrolled. Essential hypertension.',
    'P': 'Increase metformin to 1000mg BID. Recheck in 6 weeks.'
  }},
]

export const demoClaims: DemoClaim[] = [
  {
    id: 'CLM-4501', patientId: 'P-001', patientName: 'John Smith', clientId: 'org-102', clientName: 'Irvine Family Practice',
    payer: 'UnitedHealthcare', payerId: 'UHC', dos: '2026-02-25', cptCodes: ['99214', '93000'], icdCodes: ['E11.9', 'I10'],
    billed: 485, allowed: 320, paid: 320, status: 'paid', age: 5,
    submittedDate: '2026-02-26', paymentDate: '2026-03-01', daysTilDeadline: 85, scrubErrors: [],
    timeline: [
      { status: 'draft', timestamp: '2026-02-25 14:30', by: 'Maria Rodriguez' },
      { status: 'scrubbing', timestamp: '2026-02-25 14:31', by: 'System' },
      { status: 'ready', timestamp: '2026-02-25 14:31', by: 'System' },
      { status: 'submitted', timestamp: '2026-02-26 09:00', by: 'James Wilson' },
      { status: 'accepted', timestamp: '2026-02-26 12:00', by: 'System (Clearinghouse)' },
      { status: 'paid', timestamp: '2026-03-01 11:00', by: 'System (ERA)' },
    ],
    documents: claimDocs,
  },
  {
    id: 'CLM-4502', patientId: 'P-003', patientName: 'Ahmed Al Mansouri', clientId: 'org-101', clientName: 'Gulf Medical Center',
    payer: 'Daman', payerId: 'DAMAN', dos: '2026-02-24', cptCodes: ['99213', '93000'], icdCodes: ['I25.10'],
    billed: 420, allowed: 380, paid: 0, status: 'submitted', age: 6,
    submittedDate: '2026-02-25', daysTilDeadline: 84, scrubErrors: [],
    timeline: [
      { status: 'draft', timestamp: '2026-02-24 15:00', by: 'Maria Rodriguez' },
      { status: 'scrubbing', timestamp: '2026-02-24 15:01', by: 'System' },
      { status: 'ready', timestamp: '2026-02-24 15:01', by: 'System' },
      { status: 'submitted', timestamp: '2026-02-25 08:30', by: 'James Wilson' },
    ],
    documents: claimDocs,
  },
  {
    id: 'CLM-4503', patientId: 'P-005', patientName: 'Robert Chen', clientId: 'org-103', clientName: 'Patel Cardiology',
    payer: 'Medicare', payerId: 'MEDICARE', dos: '2026-02-20', cptCodes: ['93306', '93320'], icdCodes: ['I50.9'],
    billed: 890, allowed: 712, paid: 712, status: 'partial_pay', age: 10,
    submittedDate: '2026-02-21', paymentDate: '2026-03-01', daysTilDeadline: 80, scrubErrors: [],
    timeline: [
      { status: 'draft', timestamp: '2026-02-20 11:00', by: 'Maria Rodriguez' },
      { status: 'scrubbing', timestamp: '2026-02-20 11:01', by: 'System' },
      { status: 'ready', timestamp: '2026-02-20 11:02', by: 'System' },
      { status: 'submitted', timestamp: '2026-02-21 08:00', by: 'James Wilson' },
      { status: 'accepted', timestamp: '2026-02-21 14:00', by: 'System (Clearinghouse)' },
      { status: 'partial_pay', timestamp: '2026-03-01 10:00', by: 'System (ERA)' },
    ],
    documents: claimDocs,
  },
  {
    id: 'CLM-4504', patientId: 'P-002', patientName: 'Sarah Johnson', clientId: 'org-102', clientName: 'Irvine Family Practice',
    payer: 'Aetna', payerId: 'AETNA', dos: '2026-02-18', cptCodes: ['99215'], icdCodes: ['M54.5'],
    billed: 350, allowed: 0, paid: 0, status: 'denied', age: 12,
    denialReason: 'Prior authorization required', submittedDate: '2026-02-19', daysTilDeadline: 78, scrubErrors: [],
    timeline: [
      { status: 'draft', timestamp: '2026-02-18 16:00', by: 'Maria Rodriguez' },
      { status: 'scrubbing', timestamp: '2026-02-18 16:01', by: 'System' },
      { status: 'ready', timestamp: '2026-02-18 16:01', by: 'System' },
      { status: 'submitted', timestamp: '2026-02-19 09:00', by: 'James Wilson' },
      { status: 'accepted', timestamp: '2026-02-19 15:00', by: 'System (Clearinghouse)' },
      { status: 'denied', timestamp: '2026-02-22 10:00', by: 'System (ERA)' },
    ],
    documents: claimDocs,
  },
  {
    id: 'CLM-4505', patientId: 'P-007', patientName: 'Khalid Ibrahim', clientId: 'org-104', clientName: 'Dubai Wellness Clinic',
    payer: 'NAS', payerId: 'NAS', dos: '2026-02-22', cptCodes: ['99213'], icdCodes: ['J06.9'],
    billed: 180, allowed: 160, paid: 0, status: 'in_process', age: 8,
    submittedDate: '2026-02-23', daysTilDeadline: 82, scrubErrors: [],
    timeline: [
      { status: 'draft', timestamp: '2026-02-22 10:00', by: 'Maria Rodriguez' },
      { status: 'ready', timestamp: '2026-02-22 10:30', by: 'System' },
      { status: 'submitted', timestamp: '2026-02-23 08:00', by: 'James Wilson' },
      { status: 'accepted', timestamp: '2026-02-23 12:00', by: 'System' },
      { status: 'in_process', timestamp: '2026-02-24 09:00', by: 'System (Payer)' },
    ],
    documents: claimDocs,
  },
  {
    id: 'CLM-4506', patientId: 'P-001', patientName: 'John Smith', clientId: 'org-102', clientName: 'Irvine Family Practice',
    payer: 'UnitedHealthcare', payerId: 'UHC', dos: '2026-03-02', cptCodes: ['99214'], icdCodes: ['E11.9'],
    billed: 250, allowed: 0, paid: 0, status: 'draft', age: 0, daysTilDeadline: 90, scrubErrors: [],
    timeline: [
      { status: 'draft', timestamp: '2026-03-02 09:00', by: 'Maria Rodriguez' },
    ],
    documents: claimDocs,
  },
  {
    id: 'CLM-4507', patientId: 'P-005', patientName: 'Robert Chen', clientId: 'org-103', clientName: 'Patel Cardiology',
    payer: 'Medicare', payerId: 'MEDICARE', dos: '2026-02-10', cptCodes: ['93350'], icdCodes: ['I50.9', 'I25.10'],
    billed: 1200, allowed: 0, paid: 0, status: 'appealed', age: 20,
    denialReason: 'Not medically necessary', submittedDate: '2026-02-11', daysTilDeadline: 40, scrubErrors: [],
    timeline: [
      { status: 'draft', timestamp: '2026-02-10 14:00', by: 'Maria Rodriguez' },
      { status: 'ready', timestamp: '2026-02-10 14:30', by: 'System' },
      { status: 'submitted', timestamp: '2026-02-11 08:00', by: 'James Wilson' },
      { status: 'denied', timestamp: '2026-02-17 10:00', by: 'System (ERA)' },
      { status: 'appealed', timestamp: '2026-02-20 15:00', by: 'AR Team' },
    ],
    documents: claimDocs,
  },
  {
    id: 'CLM-4508', patientId: 'P-006', patientName: 'Maria Garcia', clientId: 'org-102', clientName: 'Irvine Family Practice',
    payer: 'Self-Pay', payerId: 'SELF', dos: '2026-02-15', cptCodes: ['99213'], icdCodes: ['J02.9'],
    billed: 180, allowed: 180, paid: 0, status: 'ready', age: 15, daysTilDeadline: 75, scrubErrors: [],
    timeline: [
      { status: 'draft', timestamp: '2026-02-15 13:00', by: 'Maria Rodriguez' },
      { status: 'scrubbing', timestamp: '2026-02-15 13:01', by: 'System' },
      { status: 'ready', timestamp: '2026-02-15 13:02', by: 'System' },
    ],
    documents: claimDocs,
  },
  {
    id: 'CLM-4509', patientId: 'P-003', patientName: 'Ahmed Al Mansouri', clientId: 'org-101', clientName: 'Gulf Medical Center',
    payer: 'Daman', payerId: 'DAMAN', dos: '2026-01-30', cptCodes: ['99214', '93000'], icdCodes: ['I25.10', 'I10'],
    billed: 480, allowed: 480, paid: 480, status: 'paid', age: 31,
    submittedDate: '2026-01-31', paymentDate: '2026-02-15', daysTilDeadline: 59, scrubErrors: [],
    timeline: [
      { status: 'draft', timestamp: '2026-01-30 14:00', by: 'Maria Rodriguez' },
      { status: 'ready', timestamp: '2026-01-30 14:30', by: 'System' },
      { status: 'submitted', timestamp: '2026-01-31 09:00', by: 'James Wilson' },
      { status: 'paid', timestamp: '2026-02-15 11:00', by: 'System (ERA)' },
    ],
    documents: claimDocs,
  },
  {
    id: 'CLM-4510', patientId: 'P-002', patientName: 'Sarah Johnson', clientId: 'org-102', clientName: 'Irvine Family Practice',
    payer: 'Aetna', payerId: 'AETNA', dos: '2026-02-05', cptCodes: ['99214'], icdCodes: ['M54.5'],
    billed: 280, allowed: 230, paid: 224, status: 'paid', age: 25,
    submittedDate: '2026-02-06', paymentDate: '2026-02-20', daysTilDeadline: 65, scrubErrors: [],
    timeline: [
      { status: 'draft', timestamp: '2026-02-05 10:00', by: 'Maria Rodriguez' },
      { status: 'ready', timestamp: '2026-02-05 10:30', by: 'System' },
      { status: 'submitted', timestamp: '2026-02-06 08:00', by: 'James Wilson' },
      { status: 'paid', timestamp: '2026-02-20 11:00', by: 'System (ERA)' },
    ],
    documents: claimDocs,
  },
  {
    id: 'CLM-4511', patientId: 'P-007', patientName: 'Khalid Ibrahim', clientId: 'org-104', clientName: 'Dubai Wellness Clinic',
    payer: 'NAS', payerId: 'NAS', dos: '2026-01-15', cptCodes: ['99215'], icdCodes: ['E11.65'],
    billed: 320, allowed: 0, paid: 0, status: 'denied', age: 46,
    denialReason: 'Timely filing exceeded', submittedDate: '2026-02-20', daysTilDeadline: 10, scrubErrors: [],
    timeline: [
      { status: 'draft', timestamp: '2026-01-15 14:00', by: 'Maria Rodriguez' },
      { status: 'submitted', timestamp: '2026-02-20 09:00', by: 'James Wilson' },
      { status: 'denied', timestamp: '2026-02-24 10:00', by: 'System (ERA)' },
    ],
    documents: claimDocs,
  },
  {
    id: 'CLM-4512', patientId: 'P-005', patientName: 'Robert Chen', clientId: 'org-103', clientName: 'Patel Cardiology',
    payer: 'BCBS', payerId: 'BCBS', dos: '2026-02-28', cptCodes: ['93005'], icdCodes: ['R00.0'],
    billed: 150, allowed: 0, paid: 0, status: 'scrubbing', age: 2, daysTilDeadline: 88, scrubErrors: [],
    timeline: [
      { status: 'draft', timestamp: '2026-02-28 11:00', by: 'Maria Rodriguez' },
      { status: 'scrubbing', timestamp: '2026-02-28 11:01', by: 'System' },
    ],
    documents: claimDocs,
  },
  {
    id: 'CLM-4513', patientId: 'P-001', patientName: 'John Smith', clientId: 'org-102', clientName: 'Irvine Family Practice',
    payer: 'UnitedHealthcare', payerId: 'UHC', dos: '2026-02-10', cptCodes: ['99214', '99214-25'], icdCodes: ['E11.9', 'I10'],
    billed: 485, allowed: 0, paid: 0, status: 'scrub_failed', age: 20, daysTilDeadline: 70,
    scrubErrors: [
      { ruleId: 23, severity: 'error', name: 'Missing Modifier 25', description: 'CPT 99214 billed with procedure on same date', fix: 'Add modifier 25 to CPT 99214' }
    ],
    timeline: [
      { status: 'draft', timestamp: '2026-02-10 14:00', by: 'Maria Rodriguez' },
      { status: 'scrubbing', timestamp: '2026-02-10 14:01', by: 'System' },
      { status: 'scrub_failed', timestamp: '2026-02-10 14:01', by: 'System (Rules Engine)' },
    ],
    documents: claimDocs,
  },
  {
    id: 'CLM-4514', patientId: 'P-003', patientName: 'Ahmed Al Mansouri', clientId: 'org-101', clientName: 'Gulf Medical Center',
    payer: 'Daman', payerId: 'DAMAN', dos: '2026-02-20', cptCodes: ['99213'], icdCodes: ['I25.10'],
    billed: 280, allowed: 280, paid: 280, status: 'paid', age: 10,
    submittedDate: '2026-02-21', paymentDate: '2026-03-02', daysTilDeadline: 80, scrubErrors: [],
    timeline: [
      { status: 'draft', timestamp: '2026-02-20 10:00', by: 'Maria Rodriguez' },
      { status: 'ready', timestamp: '2026-02-20 10:30', by: 'System' },
      { status: 'submitted', timestamp: '2026-02-21 08:00', by: 'James Wilson' },
      { status: 'paid', timestamp: '2026-03-02 11:00', by: 'System (ERA)' },
    ],
    documents: claimDocs,
  },
  {
    id: 'CLM-4515', patientId: 'P-008', patientName: 'Emily Williams', clientId: 'org-103', clientName: 'Patel Cardiology',
    payer: 'Medicare', payerId: 'MEDICARE', dos: '2026-02-18', cptCodes: ['99214'], icdCodes: ['I50.9'],
    billed: 250, allowed: 0, paid: 0, status: 'denied', age: 12,
    denialReason: 'Expenses not covered — inactive coverage', submittedDate: '2026-02-19', daysTilDeadline: 28, scrubErrors: [],
    timeline: [
      { status: 'draft', timestamp: '2026-02-18 10:00', by: 'Maria Rodriguez' },
      { status: 'ready', timestamp: '2026-02-18 10:30', by: 'System' },
      { status: 'submitted', timestamp: '2026-02-19 08:00', by: 'James Wilson' },
      { status: 'denied', timestamp: '2026-02-25 10:00', by: 'System (ERA)' },
    ],
    documents: claimDocs,
  },
]

export interface AISuggestedCode {
  code: string
  desc: string
  confidence: number
  modifiers?: string[]
  reasoning?: string
}

export interface DemoCodingItem {
  id: string
  patientName: string
  patientId: string
  clientId: string
  clientName: string
  source: 'upload' | 'ai_scribe'
  dos: string
  provider: string
  providerSpecialty: string
  providerNpi: string
  aiSuggestedCpt: AISuggestedCode[]
  aiSuggestedIcd: AISuggestedCode[]
  superbillCpt?: string[]
  hasSuperbill: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
  receivedAt: string
  status: 'pending' | 'in_progress' | 'on_hold' | 'query_sent' | 'approved'
  patientDob: string
  patientGender: 'Male' | 'Female' | 'Other'
  patientPayer: string
  patientPayerId: string
  placeOfService: string
  visitType: 'New Patient' | 'Established Patient' | 'Telehealth' | 'Consultation'
  priorAuthStatus: 'not_required' | 'obtained' | 'pending' | 'not_obtained'
  priorAuthNumber?: string
  slaNotes?: string
  visitNote: {
    subjective: string
    objective: string
    assessment: string
    plan: string
  }
}

export const demoCodingQueue: DemoCodingItem[] = [
  {
    id: 'COD-001', patientName: 'John Smith', patientId: 'P-001', clientId: 'org-102', clientName: 'Irvine Family Practice',
    source: 'upload', dos: '2026-03-02', provider: 'Dr. Martinez', providerSpecialty: 'Family Medicine',
    providerNpi: '1234567890',
    hasSuperbill: true, superbillCpt: ['99214', '93000'], priority: 'medium',
    receivedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    patientDob: '1985-03-15', patientGender: 'Male', patientPayer: 'UnitedHealthcare', patientPayerId: 'UHC',
    placeOfService: '11 - Office', visitType: 'Established Patient', priorAuthStatus: 'not_required',
    aiSuggestedCpt: [
      { code: '99214', desc: 'Office visit, est. patient, moderate', confidence: 94, modifiers: [], reasoning: 'Moderate complexity: 4 HPI elements, 2 organ systems examined, moderate MDM with prescription management.' },
      { code: '93000', desc: 'Electrocardiogram, routine', confidence: 78, modifiers: [], reasoning: 'ECG documented in objective. Separate reportable service.' }
    ],
    aiSuggestedIcd: [
      { code: 'E11.9', desc: 'Type 2 diabetes without complications', confidence: 97 },
      { code: 'I10', desc: 'Essential hypertension', confidence: 92 }
    ],
    visitNote: {
      subjective: 'Patient presents for routine follow-up of type 2 diabetes and hypertension. Reports increasing fatigue over the past 2 weeks. Compliant with metformin and lisinopril. Denies chest pain, shortness of breath, or visual changes. Diet adherence has been inconsistent.',
      objective: 'Vitals: BP 138/86, HR 78, SpO2 96%, Temp 98.4°F, Weight 198 lbs (up 3 lbs). General: Alert, oriented, no acute distress. HEENT: Normal. Cardiovascular: RRR, no murmurs. Lungs: Clear bilateral. Extremities: No edema. ECG: Normal sinus rhythm.',
      assessment: `1. Type 2 diabetes mellitus — HbA1c due, fatigue may indicate suboptimal control
2. Essential hypertension — slightly elevated today, may need adjustment
3. Weight gain — counseling on diet and exercise`,
      plan: `1. Order HbA1c and CMP
2. Continue metformin 1000mg BID
3. Increase lisinopril to 20mg daily
4. ECG performed today — normal sinus rhythm
5. Nutrition counseling referral
6. Follow-up 3 months`
    }
  },
  {
    id: 'COD-002', patientName: 'Ahmed Al Mansouri', patientId: 'P-003', clientId: 'org-101', clientName: 'Gulf Medical Center',
    source: 'ai_scribe', dos: '2026-03-01', provider: 'Dr. Al Zaabi', providerSpecialty: 'Internal Medicine',
    providerNpi: '9876543210',
    hasSuperbill: false, priority: 'medium',
    receivedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    patientDob: '1978-11-08', patientGender: 'Male', patientPayer: 'Daman', patientPayerId: 'DAMAN',
    placeOfService: '11 - Office', visitType: 'Established Patient', priorAuthStatus: 'pending', priorAuthNumber: 'AUTH-2026-0892',
    aiSuggestedCpt: [
      { code: '99213', desc: 'Office visit, est. patient, low', confidence: 88, modifiers: [], reasoning: 'Low complexity: 2 HPI elements, limited exam, straightforward MDM.' }
    ],
    aiSuggestedIcd: [{ code: 'I25.10', desc: 'Atherosclerotic heart disease of native coronary artery', confidence: 95 }],
    visitNote: {
      subjective: 'Patient returns for follow-up of known coronary artery disease. Stable on current medications. No chest pain, palpitations, or dyspnea. Walking 30 minutes daily without symptoms. Compliant with aspirin, statin, and beta-blocker.',
      objective: 'Vitals: BP 124/78, HR 64, SpO2 98%. Cardiovascular: RRR, no murmurs or gallops. Lungs: Clear. No peripheral edema. Medications reviewed and reconciled.',
      assessment: 'Stable atherosclerotic heart disease on optimal medical therapy. Risk factors well controlled.',
      plan: `1. Continue aspirin 81mg, atorvastatin 40mg, metoprolol 50mg BID
2. Lipid panel in 3 months
3. Follow-up 6 months unless symptoms change`
    }
  },
  {
    id: 'COD-003', patientName: 'Robert Chen', patientId: 'P-005', clientId: 'org-103', clientName: 'Patel Cardiology',
    source: 'ai_scribe', dos: '2026-03-02', provider: 'Dr. Patel', providerSpecialty: 'Cardiology',
    providerNpi: '1122334455',
    hasSuperbill: false, priority: 'high',
    receivedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    status: 'in_progress',
    patientDob: '1965-01-30', patientGender: 'Male', patientPayer: 'Medicare', patientPayerId: 'MEDICARE',
    placeOfService: '11 - Office', visitType: 'Established Patient', priorAuthStatus: 'not_required',
    aiSuggestedCpt: [
      { code: '93306', desc: 'TTE with Doppler, complete', confidence: 96, modifiers: ['26'], reasoning: 'Complete transthoracic echo with Doppler documented. Modifier 26 for professional component — interpretation only.' },
      { code: '93320', desc: 'Doppler echo, complete', confidence: 91, modifiers: [], reasoning: 'Separate Doppler study documented with spectral and color flow analysis.' }
    ],
    aiSuggestedIcd: [{ code: 'I50.9', desc: 'Heart failure, unspecified', confidence: 93 }, { code: 'I25.10', desc: 'ASHD of native coronary artery', confidence: 87 }],
    visitNote: {
      subjective: 'Patient presents with progressive dyspnea on exertion over 3 weeks. Can walk only 1 block before stopping. Two-pillow orthopnea. Mild lower extremity swelling. Denies chest pain. History of CAD with 2-vessel stenting 2019.',
      objective: 'Vitals: BP 146/92, HR 88, SpO2 93% on RA, Weight 210 lbs (up 8 lbs in 2 weeks). JVD present at 10cm. Cardiovascular: S3 gallop, 2/6 systolic murmur at apex. Lungs: Bibasilar crackles. Extremities: 2+ bilateral pitting edema. Echo: EF 35% (prev 50%), moderate MR, diastolic dysfunction Grade II.',
      assessment: `1. New-onset heart failure with reduced ejection fraction — EF 35%, likely ischemic etiology
2. Volume overload — 8 lb weight gain, crackles, edema, elevated JVP
3. Coronary artery disease — stable post-stenting`,
      plan: `1. Start furosemide 40mg daily
2. Start carvedilol 3.125mg BID (uptitrate as tolerated)
3. Continue aspirin, statin
4. BNP, BMP, CBC today
5. Cardiology follow-up 1 week with repeat weight check
6. Daily weight monitoring — call if >2 lbs/day gain
7. Sodium restriction <2g/day`
    }
  },
  {
    id: 'COD-004', patientName: 'Sarah Johnson', patientId: 'P-002', clientId: 'org-102', clientName: 'Irvine Family Practice',
    source: 'upload', dos: '2026-03-01', provider: 'Dr. Martinez', providerSpecialty: 'Family Medicine',
    providerNpi: '1234567890',
    hasSuperbill: true, superbillCpt: ['99214'], priority: 'medium',
    receivedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    patientDob: '1992-07-22', patientGender: 'Female', patientPayer: 'Aetna', patientPayerId: 'AETNA',
    placeOfService: '11 - Office', visitType: 'Established Patient', priorAuthStatus: 'not_required',
    aiSuggestedCpt: [
      { code: '99214', desc: 'Office visit, est. patient, moderate', confidence: 72, modifiers: [], reasoning: 'Borderline 99213/99214. Moderate MDM due to prescription management, but exam is limited. Superbill ticked 99214.' },
      { code: '99213', desc: 'Office visit, est. patient, low', confidence: 68, modifiers: [], reasoning: 'Alternative: low complexity visit — only 1 chronic condition addressed with stable management.' }
    ],
    aiSuggestedIcd: [{ code: 'M54.5', desc: 'Low back pain', confidence: 90 }],
    visitNote: {
      subjective: 'Patient complains of low back pain for 5 days after lifting heavy boxes during move. Pain is dull, constant, rated 6/10. Worse with bending and sitting. No radiation to legs. No numbness or tingling. No bowel/bladder issues. Taking ibuprofen with mild relief.',
      objective: 'Vitals: BP 118/74, HR 72. Musculoskeletal: Tenderness over L4-L5 paraspinal muscles bilaterally. ROM limited in flexion. Negative straight leg raise. Normal strength and sensation in lower extremities. Gait normal.',
      assessment: 'Acute mechanical low back pain — muscular strain, no red flags for radiculopathy or serious pathology.',
      plan: `1. Continue ibuprofen 600mg TID with food × 7 days
2. Muscle relaxant: cyclobenzaprine 10mg at bedtime × 5 days
3. Ice/heat alternating
4. Gentle stretching exercises handout provided
5. Return if no improvement in 2 weeks or if symptoms worsen`
    }
  },
  {
    id: 'COD-005', patientName: 'Fatima Hassan', patientId: 'P-004', clientId: 'org-101', clientName: 'Gulf Medical Center',
    source: 'upload', dos: '2026-03-02', provider: 'Dr. Al Zaabi', providerSpecialty: 'Internal Medicine',
    providerNpi: '9876543210',
    hasSuperbill: false, priority: 'low',
    receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    patientDob: '1980-06-15', patientGender: 'Female', patientPayer: 'Daman', patientPayerId: 'DAMAN',
    placeOfService: '11 - Office', visitType: 'New Patient', priorAuthStatus: 'not_obtained',
    aiSuggestedCpt: [{ code: '99203', desc: 'Office visit, new patient, low', confidence: 82, modifiers: [], reasoning: 'New patient, low complexity. Straightforward presentation with single acute complaint.' }],
    aiSuggestedIcd: [{ code: 'R10.9', desc: 'Unspecified abdominal pain', confidence: 75, reasoning: 'Abdominal pain NOS — consider more specific code once workup complete (R10.31 RLQ, K30 dyspepsia, etc.)' }],
    visitNote: {
      subjective: 'New patient, walk-in. 46-year-old female with 2 days of diffuse abdominal pain. Pain is crampy, intermittent, mainly periumbilical. Associated with mild nausea, no vomiting. No fever, no diarrhea. Last meal was spicy food 2 days ago. No similar episodes before.',
      objective: 'Vitals: BP 126/80, HR 76, Temp 98.6°F. Abdomen: Soft, mild tenderness periumbilical, no guarding or rebound. Bowel sounds active. No organomegaly.',
      assessment: 'Acute abdominal pain — likely functional dyspepsia vs gastritis. Low suspicion for surgical abdomen.',
      plan: `1. Omeprazole 20mg daily × 14 days
2. Bland diet for 1 week
3. Return if pain worsens, fever develops, or no improvement in 5 days
4. Consider H. pylori testing if recurrent`
    }
  },
  {
    id: 'COD-006', patientName: 'Maria Garcia', patientId: 'P-006', clientId: 'org-102', clientName: 'Irvine Family Practice',
    source: 'upload', dos: '2026-02-28', provider: 'Dr. Martinez', providerSpecialty: 'Family Medicine',
    providerNpi: '1234567890',
    hasSuperbill: true, superbillCpt: ['99213'], priority: 'low',
    receivedAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    status: 'on_hold',
    patientDob: '1990-05-12', patientGender: 'Female', patientPayer: 'Aetna', patientPayerId: 'AETNA',
    placeOfService: '11 - Office', visitType: 'Established Patient', priorAuthStatus: 'not_required',
    aiSuggestedCpt: [{ code: '99213', desc: 'Office visit, est. patient, low', confidence: 91, modifiers: [], reasoning: 'Low complexity: 1 acute problem, limited exam, straightforward decision making. Matches superbill.' }],
    aiSuggestedIcd: [{ code: 'J02.9', desc: 'Acute pharyngitis, unspecified', confidence: 88 }],
    visitNote: {
      subjective: 'Patient presents with 3-day sore throat. Mild difficulty swallowing. Low-grade fever (100.2°F at home). No cough, congestion, or ear pain. No sick contacts. No strep exposure known.',
      objective: 'Vitals: BP 112/68, HR 74, Temp 99.8°F. HEENT: Pharynx erythematous with mild tonsillar enlargement. No exudates. No cervical lymphadenopathy. Ears: TMs normal. Lungs: Clear.',
      assessment: 'Acute pharyngitis — likely viral. Rapid strep negative.',
      plan: `1. Symptomatic care: warm salt water gargles, lozenges
2. Acetaminophen 500mg q6h PRN for pain/fever
3. Increase fluid intake
4. Return if symptoms worsen or persist > 7 days
5. Throat culture sent — will call if positive`
    }
  },
]

export interface EOBLineItem {
  id: string
  eraId: string
  claimId: string
  patientName: string
  patientId: string
  cpt: string
  cptDesc: string
  dos: string
  billed: number
  allowed: number
  paid: number
  denied: number
  adjCode: string
  adjReason: string
  patBalance: number
  action: 'post' | 'deny_route' | 'patient_bill' | 'review' | 'posted'
  notes?: string
}

export interface DemoERAFile {
  id: string
  file: string
  payer: string
  client: string
  clientId: string
  claims: number
  total: number
  status: 'new' | 'processing' | 'posted'
  exceptions: number
  receivedAt: string
}

export const demoERAFiles: DemoERAFile[] = [
  { id: 'ERA-001', file: 'UHC_ERA_20260301.835', payer: 'UnitedHealthcare', client: 'Irvine Family Practice', clientId: 'org-102', claims: 5, total: 1842, status: 'processing', exceptions: 2, receivedAt: '2026-03-01T06:00:00' },
  { id: 'ERA-002', file: 'AETNA_ERA_20260301.835', payer: 'Aetna', client: 'Irvine Family Practice', clientId: 'org-102', claims: 3, total: 680, status: 'new', exceptions: 1, receivedAt: '2026-03-01T06:15:00' },
  { id: 'ERA-003', file: 'MEDICARE_ERA_20260228.835', payer: 'Medicare', client: 'Patel Cardiology', clientId: 'org-103', claims: 4, total: 2340, status: 'processing', exceptions: 1, receivedAt: '2026-02-28T18:00:00' },
  { id: 'ERA-004', file: 'DAMAN_REM_20260301.csv', payer: 'Daman', client: 'Gulf Medical Center', clientId: 'org-101', claims: 3, total: 1260, status: 'new', exceptions: 0, receivedAt: '2026-03-01T07:00:00' },
  { id: 'ERA-005', file: 'NAS_REM_20260228.csv', payer: 'NAS', client: 'Dubai Wellness Clinic', clientId: 'org-104', claims: 2, total: 640, status: 'posted', exceptions: 0, receivedAt: '2026-02-28T12:00:00' },
]


export const demoUnmatchedPayments = [
  { id: 'UNM-001', payer: 'BCBS', amount: 340, reason: 'Claim # not found in system', client: 'Patel Cardiology' },
  { id: 'UNM-002', payer: 'UHC', amount: 125, reason: 'Patient ID mismatch', client: 'Irvine Family Practice' },
]

export const demoERALineItems: EOBLineItem[] = [
  { id: 'EOB-001', eraId: 'ERA-001', claimId: 'CLM-4501', patientName: 'John Smith', patientId: 'P-001', cpt: '99214', cptDesc: 'Office visit, est. moderate', dos: '2026-02-25', billed: 250, allowed: 218, paid: 218, denied: 0, adjCode: 'CO-45', adjReason: 'Contractual adjustment', patBalance: 30, action: 'post' },
  { id: 'EOB-002', eraId: 'ERA-001', claimId: 'CLM-4501', patientName: 'John Smith', patientId: 'P-001', cpt: '93000', cptDesc: 'ECG, routine', dos: '2026-02-25', billed: 85, allowed: 62, paid: 62, denied: 0, adjCode: 'CO-45', adjReason: 'Contractual adjustment', patBalance: 0, action: 'post' },
  { id: 'EOB-003', eraId: 'ERA-001', claimId: 'CLM-4510', patientName: 'Maria Garcia', patientId: 'P-006', cpt: '99213', cptDesc: 'Office visit, est. low', dos: '2026-02-28', billed: 175, allowed: 152, paid: 152, denied: 0, adjCode: 'CO-45', adjReason: 'Contractual adjustment', patBalance: 25, action: 'post' },
  { id: 'EOB-004', eraId: 'ERA-001', claimId: 'CLM-4511', patientName: 'Khalid Ibrahim', patientId: 'P-007', cpt: '99215', cptDesc: 'Office visit, est. high', dos: '2026-02-26', billed: 380, allowed: 0, paid: 0, denied: 380, adjCode: 'CO-197', adjReason: 'Prior auth required — not obtained', patBalance: 0, action: 'deny_route' },
  { id: 'EOB-005', eraId: 'ERA-001', claimId: 'CLM-4512', patientName: 'Linda Torres', patientId: 'P-010', cpt: '99214', cptDesc: 'Office visit, est. moderate', dos: '2026-02-27', billed: 250, allowed: 218, paid: 175, denied: 0, adjCode: 'CO-45', adjReason: 'Contractual + underpaid by $43', patBalance: 30, action: 'review', notes: 'Paid $43 less than contracted rate' },
  { id: 'EOB-006', eraId: 'ERA-002', claimId: 'CLM-4504', patientName: 'Sarah Johnson', patientId: 'P-002', cpt: '99214', cptDesc: 'Office visit, est. moderate', dos: '2026-02-20', billed: 250, allowed: 0, paid: 0, denied: 250, adjCode: 'CO-4', adjReason: 'Prior authorization required', patBalance: 0, action: 'deny_route' },
  { id: 'EOB-007', eraId: 'ERA-002', claimId: 'CLM-4513', patientName: 'Sarah Johnson', patientId: 'P-002', cpt: '99213', cptDesc: 'Office visit, est. low', dos: '2026-02-22', billed: 175, allowed: 156, paid: 131, denied: 0, adjCode: 'PR-2', adjReason: 'Coinsurance', patBalance: 25, action: 'patient_bill' },
  { id: 'EOB-008', eraId: 'ERA-002', claimId: 'CLM-4514', patientName: 'James Wilson', patientId: 'P-011', cpt: '99212', cptDesc: 'Office visit, est. straightforward', dos: '2026-02-24', billed: 110, allowed: 98, paid: 98, denied: 0, adjCode: 'CO-45', adjReason: 'Contractual adjustment', patBalance: 0, action: 'post' },
  { id: 'EOB-009', eraId: 'ERA-003', claimId: 'CLM-4506', patientName: 'Robert Chen', patientId: 'P-005', cpt: '93306', cptDesc: 'TTE with Doppler, complete', dos: '2026-02-20', billed: 650, allowed: 480, paid: 384, denied: 0, adjCode: 'PR-2', adjReason: 'Coinsurance 20%', patBalance: 96, action: 'patient_bill' },
  { id: 'EOB-010', eraId: 'ERA-003', claimId: 'CLM-4506', patientName: 'Robert Chen', patientId: 'P-005', cpt: '93320', cptDesc: 'Doppler echo, complete', dos: '2026-02-20', billed: 320, allowed: 240, paid: 192, denied: 0, adjCode: 'PR-2', adjReason: 'Coinsurance 20%', patBalance: 48, action: 'patient_bill' },
  { id: 'EOB-011', eraId: 'ERA-003', claimId: 'CLM-4515', patientName: 'Emily Williams', patientId: 'P-008', cpt: '99214', cptDesc: 'Office visit, est. moderate', dos: '2026-02-18', billed: 250, allowed: 0, paid: 0, denied: 250, adjCode: 'CO-27', adjReason: 'Expenses not covered — inactive coverage', patBalance: 0, action: 'deny_route' },
  { id: 'EOB-012', eraId: 'ERA-003', claimId: 'CLM-4516', patientName: 'William Davis', patientId: 'P-012', cpt: '93000', cptDesc: 'ECG, routine', dos: '2026-02-22', billed: 85, allowed: 68, paid: 54, denied: 0, adjCode: 'PR-2', adjReason: 'Coinsurance 20%', patBalance: 14, action: 'post' },
  { id: 'EOB-013', eraId: 'ERA-004', claimId: 'CLM-4502', patientName: 'Ahmed Al Mansouri', patientId: 'P-003', cpt: '99213', cptDesc: 'Office visit, est. low', dos: '2026-02-24', billed: 280, allowed: 280, paid: 280, denied: 0, adjCode: '-', adjReason: '-', patBalance: 0, action: 'post' },
  { id: 'EOB-014', eraId: 'ERA-004', claimId: 'CLM-4502', patientName: 'Ahmed Al Mansouri', patientId: 'P-003', cpt: '93000', cptDesc: 'ECG, routine', dos: '2026-02-24', billed: 140, allowed: 140, paid: 140, denied: 0, adjCode: '-', adjReason: '-', patBalance: 0, action: 'post' },
  { id: 'EOB-015', eraId: 'ERA-004', claimId: 'CLM-4517', patientName: 'Fatima Hassan', patientId: 'P-004', cpt: '99203', cptDesc: 'Office visit, new patient', dos: '2026-02-26', billed: 300, allowed: 300, paid: 300, denied: 0, adjCode: '-', adjReason: '-', patBalance: 0, action: 'post' },
]

export interface DemoMessage {
  id: string; entityType: 'patient' | 'claim' | 'submission' | 'appointment' | 'general';
  entityId: string; entityLabel: string; clientId: string; clientName: string;
  subject: string; lastMessage: string; lastSender: string; lastSenderRole: 'client' | 'staff';
  timestamp: string; unread: boolean; status: 'open' | 'resolved';
  messages: { sender: string; role: 'client' | 'staff'; text: string; time: string }[];
}

export const demoMessages: DemoMessage[] = [
  { id: 'MSG-001', entityType: 'patient', entityId: 'P-004', entityLabel: 'Fatima Hassan', clientId: 'org-101', clientName: 'Gulf Medical Center', subject: 'Missing insurance information', lastMessage: 'Patient is coming in tomorrow, will bring card then.', lastSender: 'Dr. Al Zaabi Office', lastSenderRole: 'client', timestamp: '2026-03-02T08:15:00', unread: true, status: 'open', messages: [
    { sender: 'Billing Team', role: 'staff', text: 'Hi, we need insurance details for Fatima Hassan to proceed with billing. Can you please upload the insurance card?', time: '2026-03-01T14:00:00' },
    { sender: 'Dr. Al Zaabi Office', role: 'client', text: 'Patient is coming in tomorrow, will bring card then.', time: '2026-03-02T08:15:00' },
  ]},
  { id: 'MSG-002', entityType: 'claim', entityId: 'CLM-4504', entityLabel: 'Claim #CLM-4504 — Sarah Johnson', clientId: 'org-102', clientName: 'Irvine Family Practice', subject: 'Denied — prior auth required', lastMessage: 'We have attached the appeal letter. Working on it.', lastSender: 'AR Team', lastSenderRole: 'staff', timestamp: '2026-03-01T16:30:00', unread: false, status: 'open', messages: [
    { sender: 'AR Team', role: 'staff', text: 'Claim denied by Aetna for missing prior authorization. Do you have an auth number for this visit?', time: '2026-02-28T10:00:00' },
    { sender: 'Front Desk', role: 'client', text: 'We didn\'t get prior auth for this one. Can you submit a retro auth?', time: '2026-02-28T14:30:00' },
    { sender: 'AR Team', role: 'staff', text: 'We have attached the appeal letter. Working on it.', time: '2026-03-01T16:30:00' },
  ]},
  { id: 'MSG-003', entityType: 'submission', entityId: 'SUB-003', entityLabel: 'Upload — Maria Garcia superbill', clientId: 'org-102', clientName: 'Irvine Family Practice', subject: 'Illegible page 2', lastMessage: 'Sorry about that! Here is a clearer copy.', lastSender: 'Front Desk', lastSenderRole: 'client', timestamp: '2026-03-01T11:00:00', unread: false, status: 'resolved', messages: [
    { sender: 'Coding Team', role: 'staff', text: 'The second page of Maria Garcia\'s superbill from Feb 28 is too blurry to read. Can you resend?', time: '2026-02-28T16:00:00' },
    { sender: 'Front Desk', role: 'client', text: 'Sorry about that! Here is a clearer copy.', time: '2026-03-01T11:00:00' },
  ]},
  { id: 'MSG-004', entityType: 'appointment', entityId: 'APT-008', entityLabel: 'Emily Williams — No Show', clientId: 'org-103', clientName: 'Patel Cardiology', subject: 'Patient no-show, 3rd time', lastMessage: 'Noted. We will contact the patient.', lastSender: 'Office Manager', lastSenderRole: 'client', timestamp: '2026-03-02T11:00:00', unread: true, status: 'open', messages: [
    { sender: 'Billing Team', role: 'staff', text: 'Emily Williams no-showed again today (3rd time). This is impacting scheduling and billing. Should we flag this patient?', time: '2026-03-02T10:30:00' },
    { sender: 'Office Manager', role: 'client', text: 'Noted. We will contact the patient.', time: '2026-03-02T11:00:00' },
  ]},
  { id: 'MSG-005', entityType: 'general', entityId: 'GEN-001', entityLabel: 'Account', clientId: 'org-101', clientName: 'Gulf Medical Center', subject: 'New provider starting April 1', lastMessage: 'Great, we will start the credentialing process.', lastSender: 'Credentialing Team', lastSenderRole: 'staff', timestamp: '2026-02-27T09:00:00', unread: false, status: 'open', messages: [
    { sender: 'Admin', role: 'client', text: 'We have a new cardiologist, Dr. Amira Khalil, starting April 1. Please begin payer enrollment.', time: '2026-02-26T10:00:00' },
    { sender: 'Credentialing Team', role: 'staff', text: 'Great, we will start the credentialing process. Can you share her NPI, medical license, and DEA certificate?', time: '2026-02-26T14:00:00' },
    { sender: 'Admin', role: 'client', text: 'Attached all documents.', time: '2026-02-27T08:00:00' },
    { sender: 'Credentialing Team', role: 'staff', text: 'Great, we will start the credentialing process.', time: '2026-02-27T09:00:00' },
  ]},
]

export const demoSubmissions = [
  { id: 'SUB-001', patientId: 'P-001', patientName: 'John Smith', clientId: 'org-102', files: ['superbill_smith_20260302.pdf'], docType: 'Superbill', status: 'in_coding' as const, submittedAt: '2026-03-02T08:30:00', trackingId: '#SUB-2026-0847' },
  { id: 'SUB-002', patientId: 'P-003', patientName: 'Ahmed Al Mansouri', clientId: 'org-101', files: ['clinical_note_mansouri_20260301.pdf'], docType: 'Clinical Note', status: 'claim_submitted' as const, submittedAt: '2026-03-01T10:00:00', trackingId: '#SUB-2026-0843' },
  { id: 'SUB-003', patientId: 'P-006', patientName: 'Maria Garcia', clientId: 'org-102', files: ['superbill_garcia_20260228.pdf'], docType: 'Superbill', status: 'received' as const, submittedAt: '2026-02-28T15:30:00', trackingId: '#SUB-2026-0840' },
  { id: 'SUB-004', patientId: 'P-005', patientName: 'Robert Chen', clientId: 'org-103', files: ['echo_report_chen.pdf', 'referral_chen.pdf'], docType: 'Clinical Note', status: 'paid' as const, submittedAt: '2026-02-10T09:00:00', trackingId: '#SUB-2026-0798' },
  { id: 'SUB-005', patientId: 'P-007', patientName: 'Khalid Ibrahim', clientId: 'org-104', files: ['superbill_ibrahim_20260222.pdf'], docType: 'Superbill', status: 'claim_submitted' as const, submittedAt: '2026-02-22T11:00:00', trackingId: '#SUB-2026-0821' },
]

export function getClientName(clientId: string): string {
  return demoClients.find(c => c.id === clientId)?.name || 'Unknown'
}

export function getClientRegion(clientId: string) {
  return demoClients.find(c => c.id === clientId)?.region || 'us'
}

// AR accounts for dashboard and AR management page
export const demoARAccounts = [
  { id: 'AR-001', patient: 'Robert Chen', client: 'Patel Cardiology', payer: 'Medicare', original: 1200, balance: 488, age: 95, lastAction: 'Voice AI call — "In process"', nextFollowup: '2026-03-04', priority: 'urgent' as const, source: 'denied_claim' as const },
  { id: 'AR-002', patient: 'Khalid Ibrahim', client: 'Dubai Wellness Clinic', payer: 'NAS', original: 320, balance: 320, age: 46, lastAction: 'Initial submission', nextFollowup: '2026-03-03', priority: 'high' as const, source: 'underpayment' as const },
  { id: 'AR-003', patient: 'Sarah Johnson', client: 'Irvine Family Practice', payer: 'Aetna', original: 350, balance: 126, age: 12, lastAction: 'Partial payment posted', nextFollowup: '2026-03-10', priority: 'medium' as const, source: 'patient_balance' as const },
  { id: 'AR-004', patient: 'John Smith', client: 'Irvine Family Practice', payer: 'UHC', original: 250, balance: 0, age: 5, lastAction: 'Paid in full', nextFollowup: '-', priority: 'low' as const, source: 'denied_claim' as const },
  { id: 'AR-005', patient: 'Ahmed Al Mansouri', client: 'Gulf Medical Center', payer: 'Daman', original: 480, balance: 0, age: 31, lastAction: 'Paid in full', nextFollowup: '-', priority: 'low' as const, source: 'denied_claim' as const },
  { id: 'AR-006', patient: 'Emily Williams', client: 'Patel Cardiology', payer: 'BCBS', original: 890, balance: 890, age: 120, lastAction: 'Appeal L1 submitted', nextFollowup: '2026-03-02', priority: 'urgent' as const, source: 'timely_filing_risk' as const },
]

// Denials for dashboard and denials page
export const demoDenialsData = [
  { id: 'DEN-001', claimId: 'CLM-4504', patientName: 'Sarah Johnson', payer: 'Aetna', denialReason: 'Prior authorization required', status: 'denied' as const, appealLevel: 'L1' as const },
  { id: 'DEN-002', claimId: 'CLM-4507', patientName: 'Robert Chen', payer: 'Medicare', denialReason: 'Not medically necessary', status: 'appealed' as const, appealLevel: null },
  { id: 'DEN-003', claimId: 'CLM-4511', patientName: 'Khalid Ibrahim', payer: 'NAS', denialReason: 'Prior auth required — not obtained', status: 'denied' as const, appealLevel: null },
  { id: 'DEN-004', claimId: 'CLM-4515', patientName: 'Emily Williams', payer: 'Medicare', denialReason: 'Expenses not covered — inactive coverage', status: 'denied' as const, appealLevel: null },
]

export const demoPriorVisitHistory: Record<string, Array<{
  dos: string
  provider: string
  icdCodes: string[]
  cptCodes: string[]
  claimStatus: string
}>> = {
  'P-001': [
    { dos: '2026-02-25', provider: 'Dr. Martinez', icdCodes: ['E11.9', 'I10'], cptCodes: ['99214', '93000'], claimStatus: 'Paid' },
    { dos: '2026-01-20', provider: 'Dr. Martinez', icdCodes: ['E11.65', 'I10'], cptCodes: ['99213'], claimStatus: 'Paid' },
    { dos: '2025-12-10', provider: 'Dr. Martinez', icdCodes: ['E11.9', 'I10', 'Z79.4'], cptCodes: ['99214'], claimStatus: 'Paid' },
  ],
  'P-003': [
    { dos: '2026-01-30', provider: 'Dr. Al Zaabi', icdCodes: ['I25.10', 'I10'], cptCodes: ['99214', '93000'], claimStatus: 'Paid' },
    { dos: '2025-11-15', provider: 'Dr. Al Zaabi', icdCodes: ['I25.10'], cptCodes: ['99213'], claimStatus: 'Denied' },
  ],
  'P-005': [
    { dos: '2026-02-20', provider: 'Dr. Patel', icdCodes: ['I50.9'], cptCodes: ['93306', '93320'], claimStatus: 'Pending' },
    { dos: '2026-01-05', provider: 'Dr. Patel', icdCodes: ['I50.9', 'I25.10'], cptCodes: ['93350'], claimStatus: 'Paid' },
  ],
}

// ─── Contracts ──────────────────────────────────────────────────────────────
export interface ContractFeeRow {
  cpt: string
  description: string
  contractedRate: number
  medicarePercent: number
  effectiveDate: string
}

export interface ContractUnderpayment {
  claimId: string
  patientName: string
  dos: string
  cpt: string
  contracted: number
  paid: number
  variance: number
}

export interface DemoContract {
  id: string
  payer: string
  payerId: string
  client: string
  clientId: string
  effective: string
  expiry: string | null
  status: 'active' | 'expiring_soon' | 'expired' | 'negotiating'
  paymentTerms: string
  timelyFiling: number
  appealDeadline: number
  feeScheduleFrequency: string
  feeSchedule: ContractFeeRow[]
  underpayments: ContractUnderpayment[]
}

export const demoContracts: DemoContract[] = [
  {
    id: 'CTR-001', payer: 'UnitedHealthcare', payerId: 'UHC',
    client: 'Irvine Family Practice', clientId: 'org-102',
    effective: '2025-01-01', expiry: '2026-12-31', status: 'active',
    paymentTerms: 'Net 30', timelyFiling: 90, appealDeadline: 180, feeScheduleFrequency: 'Annual',
    feeSchedule: [
      { cpt: '99213', description: 'Office visit, est. low', contractedRate: 115, medicarePercent: 118, effectiveDate: '2025-01-01' },
      { cpt: '99214', description: 'Office visit, est. moderate', contractedRate: 155, medicarePercent: 120, effectiveDate: '2025-01-01' },
      { cpt: '99215', description: 'Office visit, est. high', contractedRate: 210, medicarePercent: 122, effectiveDate: '2025-01-01' },
      { cpt: '93000', description: 'ECG, routine', contractedRate: 42, medicarePercent: 105, effectiveDate: '2025-01-01' },
      { cpt: '99203', description: 'Office visit, new patient low', contractedRate: 148, medicarePercent: 115, effectiveDate: '2025-01-01' },
    ],
    underpayments: [
      { claimId: 'CLM-4501', patientName: 'John Smith', dos: '2026-02-25', cpt: '99214', contracted: 155, paid: 112, variance: -43 },
      { claimId: 'CLM-4510', patientName: 'Sarah Johnson', dos: '2026-02-05', cpt: '99214', contracted: 155, paid: 130, variance: -25 },
      { claimId: 'CLM-4508', patientName: 'Maria Garcia', dos: '2026-02-15', cpt: '99213', contracted: 115, paid: 95, variance: -20 },
    ],
  },
  {
    id: 'CTR-002', payer: 'Aetna', payerId: 'AETNA',
    client: 'Irvine Family Practice', clientId: 'org-102',
    effective: '2025-06-01', expiry: '2026-04-30', status: 'expiring_soon',
    paymentTerms: 'Net 30', timelyFiling: 120, appealDeadline: 180, feeScheduleFrequency: 'Annual',
    feeSchedule: [
      { cpt: '99213', description: 'Office visit, est. low', contractedRate: 110, medicarePercent: 113, effectiveDate: '2025-06-01' },
      { cpt: '99214', description: 'Office visit, est. moderate', contractedRate: 148, medicarePercent: 115, effectiveDate: '2025-06-01' },
      { cpt: '99215', description: 'Office visit, est. high', contractedRate: 200, medicarePercent: 117, effectiveDate: '2025-06-01' },
      { cpt: '93000', description: 'ECG, routine', contractedRate: 38, medicarePercent: 100, effectiveDate: '2025-06-01' },
      { cpt: '99396', description: 'Preventive visit, 40-64 yr', contractedRate: 225, medicarePercent: 125, effectiveDate: '2025-06-01' },
    ],
    underpayments: [],
  },
  {
    id: 'CTR-003', payer: 'Medicare', payerId: 'MEDICARE',
    client: 'Patel Cardiology', clientId: 'org-103',
    effective: '2025-01-01', expiry: null, status: 'active',
    paymentTerms: 'Net 14', timelyFiling: 365, appealDeadline: 120, feeScheduleFrequency: 'Annual (CMS update)',
    feeSchedule: [
      { cpt: '93306', description: 'TTE with Doppler, complete', contractedRate: 480, medicarePercent: 100, effectiveDate: '2025-01-01' },
      { cpt: '93320', description: 'Doppler echo, complete', contractedRate: 240, medicarePercent: 100, effectiveDate: '2025-01-01' },
      { cpt: '93350', description: 'Stress echo', contractedRate: 580, medicarePercent: 100, effectiveDate: '2025-01-01' },
      { cpt: '93005', description: 'ECG, routine', contractedRate: 68, medicarePercent: 100, effectiveDate: '2025-01-01' },
      { cpt: '99214', description: 'Office visit, est. moderate', contractedRate: 135, medicarePercent: 100, effectiveDate: '2025-01-01' },
      { cpt: '99215', description: 'Office visit, est. high', contractedRate: 185, medicarePercent: 100, effectiveDate: '2025-01-01' },
    ],
    underpayments: [
      { claimId: 'CLM-4503', patientName: 'Robert Chen', dos: '2026-02-20', cpt: '93306', contracted: 480, paid: 384, variance: -96 },
    ],
  },
  {
    id: 'CTR-004', payer: 'Daman', payerId: 'DAMAN',
    client: 'Gulf Medical Center', clientId: 'org-101',
    effective: '2025-03-01', expiry: '2027-02-28', status: 'active',
    paymentTerms: 'Net 45', timelyFiling: 90, appealDeadline: 90, feeScheduleFrequency: 'Biennial',
    feeSchedule: [
      { cpt: '99213', description: 'Office visit, est. low', contractedRate: 280, medicarePercent: 130, effectiveDate: '2025-03-01' },
      { cpt: '99214', description: 'Office visit, est. moderate', contractedRate: 380, medicarePercent: 132, effectiveDate: '2025-03-01' },
      { cpt: '93000', description: 'ECG, routine', contractedRate: 140, medicarePercent: 120, effectiveDate: '2025-03-01' },
      { cpt: '99203', description: 'Office visit, new patient low', contractedRate: 300, medicarePercent: 128, effectiveDate: '2025-03-01' },
      { cpt: '99215', description: 'Office visit, est. high', contractedRate: 480, medicarePercent: 135, effectiveDate: '2025-03-01' },
    ],
    underpayments: [],
  },
  {
    id: 'CTR-005', payer: 'NAS', payerId: 'NAS',
    client: 'Dubai Wellness Clinic', clientId: 'org-104',
    effective: '2025-07-01', expiry: '2026-06-30', status: 'negotiating',
    paymentTerms: 'Net 45', timelyFiling: 60, appealDeadline: 60, feeScheduleFrequency: 'Annual',
    feeSchedule: [
      { cpt: '99213', description: 'Office visit, est. low', contractedRate: 250, medicarePercent: 125, effectiveDate: '2025-07-01' },
      { cpt: '99214', description: 'Office visit, est. moderate', contractedRate: 340, medicarePercent: 128, effectiveDate: '2025-07-01' },
      { cpt: '99215', description: 'Office visit, est. high', contractedRate: 420, medicarePercent: 130, effectiveDate: '2025-07-01' },
      { cpt: '93000', description: 'ECG, routine', contractedRate: 120, medicarePercent: 115, effectiveDate: '2025-07-01' },
    ],
    underpayments: [
      { claimId: 'CLM-4505', patientName: 'Khalid Ibrahim', dos: '2026-02-22', cpt: '99213', contracted: 250, paid: 212, variance: -38 },
      { claimId: 'CLM-4511', patientName: 'Khalid Ibrahim', dos: '2026-01-15', cpt: '99215', contracted: 420, paid: 380, variance: -40 },
    ],
  },
  {
    id: 'CTR-006', payer: 'BCBS', payerId: 'BCBS',
    client: 'Irvine Family Practice', clientId: 'org-102',
    effective: '2024-01-01', expiry: '2026-01-31', status: 'expired',
    paymentTerms: 'Net 30', timelyFiling: 90, appealDeadline: 180, feeScheduleFrequency: 'Annual',
    feeSchedule: [
      { cpt: '99213', description: 'Office visit, est. low', contractedRate: 112, medicarePercent: 115, effectiveDate: '2024-01-01' },
      { cpt: '99214', description: 'Office visit, est. moderate', contractedRate: 150, medicarePercent: 116, effectiveDate: '2024-01-01' },
      { cpt: '93000', description: 'ECG, routine', contractedRate: 40, medicarePercent: 102, effectiveDate: '2024-01-01' },
    ],
    underpayments: [],
  },
]

// ─── Voice AI Data ──────────────────────────────────────────────────────────
export interface DemoCall {
  id: string
  type: 'Payer Status Check' | 'Payer Appeal Follow-up' | 'Patient Balance Reminder' | 'Appointment Reminder'
  target: string
  targetId: string
  client: string
  clientId: string
  duration: string
  status: 'connected' | 'on_hold' | 'ivr' | 'queued' | 'completed' | 'failed'
  holdTime?: string
  stage?: string
  claimRef?: string
  outcome?: 'Got Status' | 'Voicemail' | 'Transferred' | 'Failed'
  transcript?: { role: 'AI' | 'IVR' | 'REP'; text: string }[]
  ivrSteps?: { label: string; done: boolean; current: boolean }[]
}

export const demoActiveCalls: DemoCall[] = [
  {
    id: 'CALL-A01', type: 'Payer Status Check', target: 'UHC — Claim #CLM-4502', targetId: 'CLM-4502',
    client: 'Gulf Medical Center', clientId: 'org-101', duration: '2:14', status: 'connected',
    stage: 'With Rep', claimRef: 'CLM-4502',
    transcript: [
      { role: 'AI', text: 'Thank you for calling. I am calling on behalf of Gulf Medical Center regarding claim CLM-4502.' },
      { role: 'IVR', text: 'Thank you for calling UnitedHealthcare. For claim status, press 2.' },
      { role: 'AI', text: 'Pressing 2.' },
      { role: 'IVR', text: 'Please enter your NPI number followed by the pound sign.' },
      { role: 'AI', text: 'Entering NPI: 1234567890.' },
      { role: 'REP', text: 'Claims department, how can I help you today?' },
      { role: 'AI', text: 'I am calling to check the status of claim CLM-4502 for patient Ahmed Al Mansouri, DOS February 24, 2026.' },
      { role: 'REP', text: 'Let me pull that up. One moment please...' },
    ],
    ivrSteps: [
      { label: 'Dial Payer', done: true, current: false },
      { label: 'Press 2 Billing', done: true, current: false },
      { label: 'Enter NPI', done: true, current: false },
      { label: 'Wait for Rep', done: true, current: false },
      { label: 'State Claim', done: false, current: true },
      { label: 'Record Outcome', done: false, current: false },
    ],
  },
  {
    id: 'CALL-A02', type: 'Payer Appeal Follow-up', target: 'Aetna — Claim #CLM-4504', targetId: 'CLM-4504',
    client: 'Irvine Family Practice', clientId: 'org-102', duration: '4:23', status: 'on_hold',
    holdTime: '4:23', stage: 'On Hold', claimRef: 'CLM-4504',
    transcript: [
      { role: 'AI', text: 'Calling Aetna regarding appeal for claim CLM-4504.' },
      { role: 'IVR', text: 'Please hold while we connect you to a representative.' },
      { role: 'AI', text: 'Holding...' },
    ],
    ivrSteps: [
      { label: 'Dial Payer', done: true, current: false },
      { label: 'Navigate IVR', done: true, current: false },
      { label: 'On Hold', done: false, current: true },
      { label: 'Speak to Rep', done: false, current: false },
      { label: 'Record Outcome', done: false, current: false },
    ],
  },
  {
    id: 'CALL-A03', type: 'Payer Status Check', target: 'NAS — Claim #CLM-4505', targetId: 'CLM-4505',
    client: 'Dubai Wellness Clinic', clientId: 'org-104', duration: '1:07', status: 'ivr',
    stage: 'IVR Navigation', claimRef: 'CLM-4505',
    transcript: [
      { role: 'AI', text: 'Dialing NAS Insurance claims line.' },
      { role: 'IVR', text: 'Welcome to NAS Insurance. For claims, press 1.' },
      { role: 'AI', text: 'Pressing 1.' },
      { role: 'IVR', text: 'For claim status, press 2. For new submissions, press 3.' },
      { role: 'AI', text: 'Pressing 2.' },
    ],
    ivrSteps: [
      { label: 'Dial Payer', done: true, current: false },
      { label: 'Press 1 Claims', done: true, current: false },
      { label: 'Press 2 Status', done: false, current: true },
      { label: 'Enter Claim ID', done: false, current: false },
      { label: 'Record Outcome', done: false, current: false },
    ],
  },
  {
    id: 'CALL-A04', type: 'Patient Balance Reminder', target: 'John Smith — $85.00', targetId: 'P-001',
    client: 'Irvine Family Practice', clientId: 'org-102', duration: '-', status: 'queued',
    stage: 'Queued', claimRef: '',
    transcript: [],
    ivrSteps: [],
  },
  {
    id: 'CALL-A05', type: 'Appointment Reminder', target: 'Maria Garcia — Appt Mar 5', targetId: 'P-006',
    client: 'Irvine Family Practice', clientId: 'org-102', duration: '-', status: 'queued',
    stage: 'Queued', claimRef: '',
    transcript: [],
    ivrSteps: [],
  },
]

export const demoCallLog: DemoCall[] = [
  { id: 'CALL-L01', type: 'Payer Status Check', target: 'UHC — Claim #CLM-4501', targetId: 'CLM-4501', client: 'Irvine Family Practice', clientId: 'org-102', duration: '4:32', status: 'completed', outcome: 'Got Status', claimRef: 'CLM-4501' },
  { id: 'CALL-L02', type: 'Patient Balance Reminder', target: 'Robert Chen — $488', targetId: 'P-005', client: 'Patel Cardiology', clientId: 'org-103', duration: '2:15', status: 'completed', outcome: 'Got Status', claimRef: '' },
  { id: 'CALL-L03', type: 'Payer Appeal Follow-up', target: 'Aetna — Claim #CLM-4504', targetId: 'CLM-4504', client: 'Irvine Family Practice', clientId: 'org-102', duration: '0:12', status: 'failed', outcome: 'Failed', claimRef: 'CLM-4504' },
  { id: 'CALL-L04', type: 'Appointment Reminder', target: 'Maria Garcia — Appt Mar 3', targetId: 'P-006', client: 'Irvine Family Practice', clientId: 'org-102', duration: '0:45', status: 'completed', outcome: 'Voicemail', claimRef: '' },
  { id: 'CALL-L05', type: 'Payer Status Check', target: 'NAS — Claim #CLM-4505', targetId: 'CLM-4505', client: 'Dubai Wellness Clinic', clientId: 'org-104', duration: '5:18', status: 'completed', outcome: 'Got Status', claimRef: 'CLM-4505' },
  { id: 'CALL-L06', type: 'Patient Balance Reminder', target: 'Khalid Ibrahim — AED 1,175', targetId: 'P-007', client: 'Dubai Wellness Clinic', clientId: 'org-104', duration: '3:08', status: 'completed', outcome: 'Transferred', claimRef: '' },
  { id: 'CALL-L07', type: 'Payer Status Check', target: 'Medicare — Claim #CLM-4503', targetId: 'CLM-4503', client: 'Patel Cardiology', clientId: 'org-103', duration: '6:22', status: 'completed', outcome: 'Got Status', claimRef: 'CLM-4503' },
  { id: 'CALL-L08', type: 'Appointment Reminder', target: 'Robert Chen — Appt Mar 2', targetId: 'P-005', client: 'Patel Cardiology', clientId: 'org-103', duration: '0:38', status: 'completed', outcome: 'Got Status', claimRef: '' },
  { id: 'CALL-L09', type: 'Payer Status Check', target: 'Daman — Claim #CLM-4502', targetId: 'CLM-4502', client: 'Gulf Medical Center', clientId: 'org-101', duration: '7:44', status: 'completed', outcome: 'Got Status', claimRef: 'CLM-4502' },
  { id: 'CALL-L10', type: 'Payer Appeal Follow-up', target: 'UHC — Claim #CLM-4501', targetId: 'CLM-4501', client: 'Irvine Family Practice', clientId: 'org-102', duration: '4:01', status: 'completed', outcome: 'Transferred', claimRef: 'CLM-4501' },
  { id: 'CALL-L11', type: 'Patient Balance Reminder', target: 'Sarah Johnson — $120', targetId: 'P-002', client: 'Irvine Family Practice', clientId: 'org-102', duration: '1:55', status: 'completed', outcome: 'Voicemail', claimRef: '' },
  { id: 'CALL-L12', type: 'Appointment Reminder', target: 'Ahmed Al Mansouri — Appt Feb 28', targetId: 'P-003', client: 'Gulf Medical Center', clientId: 'org-101', duration: '0:52', status: 'completed', outcome: 'Got Status', claimRef: '' },
]

export interface DemoCampaign {
  id: string; name: string; type: string; target: string; schedule: string
  estimatedCalls: number; status: 'active' | 'paused' | 'draft'; lastRun?: string
}

export const demoCampaigns: DemoCampaign[] = [
  { id: 'CMP-001', name: 'Weekly Payer Status', type: 'Payer Status Check', target: 'Claims > $200 aged > 14 days', schedule: 'Weekly Mon 9:00 AM', estimatedCalls: 18, status: 'active', lastRun: '2026-02-24' },
  { id: 'CMP-002', name: 'Monthly Balance Reminders', type: 'Patient Balance Reminder', target: 'Patient balance > $50', schedule: 'Monthly 1st 10:00 AM', estimatedCalls: 34, status: 'active', lastRun: '2026-03-01' },
  { id: 'CMP-003', name: 'Aetna Denial Appeals', type: 'Payer Appeal Follow-up', target: 'Aetna denied > 30 days', schedule: 'Daily 8:00 AM', estimatedCalls: 6, status: 'paused', lastRun: '2026-02-28' },
  { id: 'CMP-004', name: 'Appointment Confirmations', type: 'Appointment Reminder', target: 'Appt in next 48h not confirmed', schedule: 'Daily 3:00 PM', estimatedCalls: 12, status: 'draft' },
]

export interface DemoScript {
  id: string; payer: string; type: string; lastUpdated: string
  steps: { type: 'DIAL' | 'DTMF' | 'SPEAK' | 'WAIT' | 'RECORD'; content: string }[]
}

export const demoScripts: DemoScript[] = [
  {
    id: 'SCR-001', payer: 'UnitedHealthcare', type: 'Payer Status Check', lastUpdated: '2026-02-15',
    steps: [
      { type: 'DIAL', content: 'UHC Claims: 1-800-842-3585' },
      { type: 'DTMF', content: 'Press 2 for Billing' },
      { type: 'DTMF', content: 'Enter NPI: {npi}' },
      { type: 'WAIT', content: 'Wait for Rep (max 15 min)' },
      { type: 'SPEAK', content: 'State Claim Info: {claim_id}, DOS {dos}, Patient {patient_name}' },
      { type: 'RECORD', content: 'Record Outcome + Reference #' },
    ],
  },
  {
    id: 'SCR-002', payer: 'Aetna', type: 'Payer Appeal Follow-up', lastUpdated: '2026-02-20',
    steps: [
      { type: 'DIAL', content: 'Aetna Appeals: 1-800-238-6279' },
      { type: 'DTMF', content: 'Press 3 for Appeals Department' },
      { type: 'DTMF', content: 'Enter Member ID: {member_id}' },
      { type: 'WAIT', content: 'Wait for Rep (max 20 min)' },
      { type: 'SPEAK', content: 'Reference Appeal #{appeal_ref}, Claim {claim_id}' },
      { type: 'RECORD', content: 'Record Outcome + Next Steps' },
    ],
  },
  {
    id: 'SCR-003', payer: 'Medicare', type: 'Payer Status Check', lastUpdated: '2026-01-30',
    steps: [
      { type: 'DIAL', content: 'Medicare: 1-800-633-4227' },
      { type: 'DTMF', content: 'Press 1 for English' },
      { type: 'DTMF', content: 'Press 2 for Claims' },
      { type: 'DTMF', content: 'Enter Beneficiary ID: {beneficiary_id}' },
      { type: 'WAIT', content: 'Wait for Rep' },
      { type: 'RECORD', content: 'Record Status + Payment ETA' },
    ],
  },
  {
    id: 'SCR-004', payer: 'Daman (UAE)', type: 'Payer Status Check', lastUpdated: '2026-02-10',
    steps: [
      { type: 'DIAL', content: 'Daman: +971-2-614-9999' },
      { type: 'DTMF', content: 'Press 2 for Providers' },
      { type: 'SPEAK', content: 'Provider TRN: {trn}, Claim {eclaim_id}' },
      { type: 'WAIT', content: 'Wait for Representative' },
      { type: 'RECORD', content: 'Record Status' },
    ],
  },
  {
    id: 'SCR-005', payer: 'NAS (UAE)', type: 'Payer Appeal Follow-up', lastUpdated: '2026-02-25',
    steps: [
      { type: 'DIAL', content: 'NAS: +971-4-270-8888' },
      { type: 'DTMF', content: 'Press 1 for Claims Department' },
      { type: 'SPEAK', content: 'Policy: {policy_no}, Claim Ref: {claim_ref}' },
      { type: 'WAIT', content: 'Wait for Adjudicator' },
      { type: 'RECORD', content: 'Record Appeal Decision' },
    ],
  },
]

// ─── AI Scribe Demo Data ────────────────────────────────────────────────────
export interface DemoVisit {
  id: string; patientId: string; patientName: string; dos: string
  status: 'pending_signoff' | 'signed' | 'draft'
  provider: string; encounterType: string
  soap: { s: string; o: string; a: string; p: string }
  transcript: string
  suggestedCodes: {
    cpt?: string; icd?: string; description: string
    confidence: number; reasoning?: string; modifiers?: string[]
    kept?: boolean
  }[]
}

export const demoVisits: DemoVisit[] = [
  {
    id: 'V-001', patientId: 'P-001', patientName: 'John Smith', dos: '2026-03-01',
    status: 'pending_signoff', provider: 'Dr. Sarah Martinez', encounterType: 'Office Visit',
    soap: {
      s: 'Patient reports ongoing fatigue and occasional headaches over the past 2 weeks. Blood sugars running slightly high per home glucometer readings (145–175 fasting). Denies chest pain, shortness of breath, or lower extremity swelling.',
      o: 'BP 148/92, HR 76, Weight 187 lbs, SpO2 98% on room air. Lungs clear. Heart RRR, no murmurs. Abdomen soft, non-tender. No peripheral edema. Fundoscopic exam deferred.',
      a: 'T2DM with suboptimal glycemic control. Essential hypertension, not at goal. Fatigue likely multifactorial — poorly controlled HTN and DM.',
      p: 'Increase metformin to 1000mg BID. Add amlodipine 5mg daily for BP control. Repeat fasting glucose and HbA1c in 6 weeks. Dietary counseling discussed. Follow up in 4–6 weeks.',
    },
    transcript: 'Dr. Martinez: Good morning John, how have you been feeling?\nJohn Smith: Not great, doctor. I\'ve been tired and getting headaches a lot lately.\nDr. Martinez: Let\'s check your vitals first. [pause] Your blood pressure is 148 over 92, that\'s still higher than we want. How are your blood sugars at home?\nJohn Smith: Running about 145 to 175 when I check in the morning.\nDr. Martinez: That\'s a bit high for fasting. Let\'s talk about your medications...',
    suggestedCodes: [
      { cpt: '99214', description: 'Office visit, moderate complexity', confidence: 94, reasoning: 'MDM moderate — 2 chronic conditions, Rx management, new prescription added', modifiers: ['25'], kept: true },
      { icd: 'E11.9', description: 'Type 2 diabetes mellitus without complications', confidence: 91, kept: true },
      { icd: 'I10', description: 'Essential (primary) hypertension', confidence: 88, kept: true },
      { icd: 'R53.83', description: 'Other fatigue', confidence: 72, kept: false },
    ],
  },
  {
    id: 'V-002', patientId: 'P-005', patientName: 'Robert Chen', dos: '2026-03-01',
    status: 'pending_signoff', provider: 'Dr. Patel', encounterType: 'Cardiology Follow-up',
    soap: {
      s: 'Patient reports increasing dyspnea on exertion over the past 2 weeks. Bilateral ankle swelling noted since last week. Denies chest pain or palpitations. Compliant with medications.',
      o: 'BP 138/86, HR 78, Weight 192 lbs (up 4 lbs from last visit). SpO2 96% at rest. JVD present at 45°. Bilateral LE pitting edema 2+. Lung bases: crackles bilaterally.',
      a: 'Heart failure with reduced EF, decompensating. NYHA Class II-III. Volume overloaded.',
      p: 'Increase furosemide to 40mg daily. Add metolazone 2.5mg prn for refractory edema. Daily weights. Strict 2g sodium restriction. Repeat BMP in 3 days. Echocardiogram ordered. Return in 1 week.',
    },
    transcript: 'Dr. Patel: How are you feeling since your last visit, Robert?\nRobert Chen: Not so great, doctor. I\'m getting more winded going up the stairs, and my ankles have been swelling.\nDr. Patel: Let me examine you. [pause] Your weight is up 4 pounds from last week. I can see some extra fluid in your lungs. We need to adjust your water pill...',
    suggestedCodes: [
      { cpt: '99214', description: 'Office visit, moderate complexity', confidence: 91, reasoning: 'Established patient with worsening chronic condition requiring medication adjustment', kept: true },
      { icd: 'I50.9', description: 'Heart failure, unspecified', confidence: 96, kept: true },
      { icd: 'R60.0', description: 'Localized edema', confidence: 83, kept: true },
    ],
  },
  {
    id: 'V-003', patientId: 'P-002', patientName: 'Sarah Johnson', dos: '2026-02-28',
    status: 'signed', provider: 'Dr. Sarah Martinez', encounterType: 'Follow-up',
    soap: {
      s: 'Follow-up visit for lower back pain. Patient reports improvement since physical therapy started. Pain now 3/10, previously 7/10. Able to perform ADLs without difficulty.',
      o: 'BP 118/74, HR 68. Musculoskeletal: lumbar ROM improved. No radiculopathy. Straight leg raise negative bilaterally.',
      a: 'Lumbar radiculopathy improving with conservative management.',
      p: 'Continue PT for 4 more sessions. Naproxen PRN. Return if worsening. Imaging not indicated at this time.',
    },
    transcript: 'Dr. Martinez: Sarah, how has your back been doing?\nSarah Johnson: Much better actually! Physical therapy is really helping. Maybe a 3 out of 10 now.\nDr. Martinez: That\'s great progress. Let me check your range of motion...',
    suggestedCodes: [
      { cpt: '99213', description: 'Office visit, low complexity', confidence: 89, kept: true },
      { icd: 'M54.5', description: 'Low back pain', confidence: 95, kept: true },
    ],
  },
]

// ─── Document Center Demo Data ──────────────────────────────────────────────
export interface DemoDocRecord {
  id: string; name: string
  type: 'Superbill' | 'Clinical Note' | 'Insurance Card' | 'EOB' | 'Denial Letter' | 'Contract' | 'Credential' | 'Fax'
  client: string; clientId: string; patient: string; patientId?: string
  uploadDate: string; source: 'Portal Upload' | 'Email Ingest' | 'Fax' | 'Manual Upload' | 'Textract Scan'
  status: 'Linked' | 'Unlinked' | 'Processing'
  aiConfidence?: number
}

export const demoDocs: DemoDocRecord[] = [
  { id: 'D-001', name: 'superbill_smith_20260302.pdf', type: 'Superbill', client: 'Irvine Family Practice', clientId: 'org-102', patient: 'John Smith', patientId: 'P-001', uploadDate: '2026-03-02', source: 'Portal Upload', status: 'Linked' },
  { id: 'D-002', name: 'clinical_note_mansouri.pdf', type: 'Clinical Note', client: 'Gulf Medical Center', clientId: 'org-101', patient: 'Ahmed Al Mansouri', patientId: 'P-003', uploadDate: '2026-03-01', source: 'Manual Upload', status: 'Linked' },
  { id: 'D-003', name: 'eob_uhc_20260301.pdf', type: 'EOB', client: 'Irvine Family Practice', clientId: 'org-102', patient: '—', uploadDate: '2026-03-01', source: 'Email Ingest', status: 'Linked' },
  { id: 'D-004', name: 'denial_aetna_clm4504.pdf', type: 'Denial Letter', client: 'Irvine Family Practice', clientId: 'org-102', patient: 'Sarah Johnson', patientId: 'P-002', uploadDate: '2026-02-28', source: 'Email Ingest', status: 'Linked' },
  { id: 'D-005', name: 'insurance_card_garcia.jpg', type: 'Insurance Card', client: 'Irvine Family Practice', clientId: 'org-102', patient: 'Maria Garcia', patientId: 'P-006', uploadDate: '2026-02-28', source: 'Portal Upload', status: 'Linked' },
  { id: 'D-006', name: 'fax_inbound_20260301_1.pdf', type: 'Clinical Note', client: '—', clientId: '', patient: '—', uploadDate: '2026-03-01', source: 'Fax', status: 'Unlinked', aiConfidence: 72 },
  { id: 'D-007', name: 'superbill_scan_03012026.jpg', type: 'Superbill', client: '—', clientId: '', patient: '—', uploadDate: '2026-03-01', source: 'Email Ingest', status: 'Unlinked', aiConfidence: 94 },
  { id: 'D-008', name: 'email_superbill_20260228.pdf', type: 'Superbill', client: '—', clientId: '', patient: '—', uploadDate: '2026-02-28', source: 'Email Ingest', status: 'Unlinked', aiConfidence: 87 },
  { id: 'D-009', name: 'echo_report_chen.pdf', type: 'Clinical Note', client: 'Patel Cardiology', clientId: 'org-103', patient: 'Robert Chen', patientId: 'P-005', uploadDate: '2026-02-10', source: 'Portal Upload', status: 'Linked' },
  { id: 'D-010', name: 'credential_martinez.pdf', type: 'Credential', client: 'Irvine Family Practice', clientId: 'org-102', patient: '—', uploadDate: '2026-01-15', source: 'Manual Upload', status: 'Linked' },
  { id: 'D-011', name: 'contract_uhc_2025.pdf', type: 'Contract', client: 'Irvine Family Practice', clientId: 'org-102', patient: '—', uploadDate: '2025-12-01', source: 'Manual Upload', status: 'Linked' },
  { id: 'D-012', name: 'insurance_card_chen.jpg', type: 'Insurance Card', client: 'Patel Cardiology', clientId: 'org-103', patient: 'Robert Chen', patientId: 'P-005', uploadDate: '2026-02-01', source: 'Portal Upload', status: 'Linked' },
  { id: 'D-013', name: 'eob_aetna_feb2026.pdf', type: 'EOB', client: 'Irvine Family Practice', clientId: 'org-102', patient: '—', uploadDate: '2026-02-25', source: 'Email Ingest', status: 'Linked' },
  { id: 'D-014', name: 'fax_prior_auth_request.pdf', type: 'Fax', client: 'Irvine Family Practice', clientId: 'org-102', patient: 'Maria Garcia', patientId: 'P-006', uploadDate: '2026-02-20', source: 'Fax', status: 'Linked' },
  { id: 'D-015', name: 'superbill_johnson_0218.pdf', type: 'Superbill', client: 'Irvine Family Practice', clientId: 'org-102', patient: 'Sarah Johnson', patientId: 'P-002', uploadDate: '2026-02-18', source: 'Portal Upload', status: 'Linked' },
  { id: 'D-016', name: 'denial_medicare_chen.pdf', type: 'Denial Letter', client: 'Patel Cardiology', clientId: 'org-103', patient: 'Robert Chen', patientId: 'P-005', uploadDate: '2026-02-12', source: 'Email Ingest', status: 'Linked' },
  { id: 'D-017', name: 'textract_scan_superbill.jpg', type: 'Superbill', client: '—', clientId: '', patient: '—', uploadDate: '2026-03-02', source: 'Textract Scan', status: 'Processing' },
  { id: 'D-018', name: 'clinical_note_ibrahim.pdf', type: 'Clinical Note', client: 'Dubai Wellness Clinic', clientId: 'org-104', patient: 'Khalid Ibrahim', patientId: 'P-007', uploadDate: '2026-02-22', source: 'Manual Upload', status: 'Linked' },
  { id: 'D-019', name: 'eob_nas_feb2026.pdf', type: 'EOB', client: 'Dubai Wellness Clinic', clientId: 'org-104', patient: '—', uploadDate: '2026-02-15', source: 'Email Ingest', status: 'Linked' },
  { id: 'D-020', name: 'insurance_card_hassan.jpg', type: 'Insurance Card', client: 'Gulf Medical Center', clientId: 'org-101', patient: 'Fatima Hassan', patientId: 'P-004', uploadDate: '2026-02-05', source: 'Portal Upload', status: 'Linked' },
]

export interface DemoFax {
  id: string; direction: 'Inbound' | 'Outbound'
  fromTo: string; date: string; pages: number
  status: 'Received' | 'Sent' | 'Failed' | 'Pending'
  document?: string; client: string
}

export const demoFaxes: DemoFax[] = [
  { id: 'FAX-001', direction: 'Inbound', fromTo: 'From: Aetna (1-800-238-6279)', date: '2026-03-02', pages: 3, status: 'Received', document: 'denial_aetna_clm4504.pdf', client: 'Irvine Family Practice' },
  { id: 'FAX-002', direction: 'Outbound', fromTo: 'To: UHC Prior Auth (1-800-842-3585)', date: '2026-03-01', pages: 5, status: 'Sent', document: 'prior_auth_smith.pdf', client: 'Irvine Family Practice' },
  { id: 'FAX-003', direction: 'Inbound', fromTo: 'From: Unknown (1-714-555-0001)', date: '2026-03-01', pages: 2, status: 'Received', document: 'fax_inbound_20260301_1.pdf', client: '—' },
  { id: 'FAX-004', direction: 'Outbound', fromTo: 'To: Medicare DME (1-800-633-4227)', date: '2026-02-28', pages: 8, status: 'Failed', client: 'Patel Cardiology' },
  { id: 'FAX-005', direction: 'Outbound', fromTo: 'To: Daman UAE (+971-2-614-9999)', date: '2026-03-02', pages: 4, status: 'Pending', document: 'appeal_daman_clm4502.pdf', client: 'Gulf Medical Center' },
]

// ─── Admin — Audit Log ──────────────────────────────────────────────────────
export interface DemoAuditEntry {
  id: string; timestamp: string; user: string; role: string
  action: 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT'
  entity: string; entityId: string; ip: string
}

export const demoAuditLog: DemoAuditEntry[] = [
  { id: 'AUD-001', timestamp: '2026-03-02 09:14:22', user: 'Admin User', role: 'admin', action: 'VIEW', entity: 'Patient', entityId: 'P-001', ip: '192.168.1.42' },
  { id: 'AUD-002', timestamp: '2026-03-02 09:10:05', user: 'Sarah Kim', role: 'coder', action: 'UPDATE', entity: 'Claim', entityId: 'CLM-4502', ip: '192.168.1.55' },
  { id: 'AUD-003', timestamp: '2026-03-02 09:07:31', user: 'Dr. Martinez', role: 'provider', action: 'CREATE', entity: 'Visit Note', entityId: 'V-001', ip: '192.168.1.88' },
  { id: 'AUD-004', timestamp: '2026-03-02 08:55:17', user: 'Mike Rodriguez', role: 'ar_team', action: 'EXPORT', entity: 'AR Report', entityId: 'RPT-0302', ip: '192.168.1.60' },
  { id: 'AUD-005', timestamp: '2026-03-02 08:48:03', user: 'Lisa Tran', role: 'posting_team', action: 'UPDATE', entity: 'ERA File', entityId: 'ERA-2024', ip: '192.168.1.71' },
  { id: 'AUD-006', timestamp: '2026-03-02 08:40:55', user: 'Amy Chen', role: 'coder', action: 'VIEW', entity: 'Claim', entityId: 'CLM-4503', ip: '192.168.1.92' },
  { id: 'AUD-007', timestamp: '2026-03-02 08:35:12', user: 'Tom Baker', role: 'supervisor', action: 'UPDATE', entity: 'User', entityId: 'USR-009', ip: '192.168.1.44' },
  { id: 'AUD-008', timestamp: '2026-03-02 08:28:47', user: 'Sarah Kim', role: 'coder', action: 'CREATE', entity: 'Claim', entityId: 'CLM-4512', ip: '192.168.1.55' },
  { id: 'AUD-009', timestamp: '2026-03-02 08:21:33', user: 'Admin User', role: 'admin', action: 'CREATE', entity: 'User', entityId: 'USR-011', ip: '192.168.1.42' },
  { id: 'AUD-010', timestamp: '2026-03-01 17:55:06', user: 'Mike Rodriguez', role: 'ar_team', action: 'UPDATE', entity: 'Denial', entityId: 'DEN-088', ip: '192.168.1.60' },
  { id: 'AUD-011', timestamp: '2026-03-01 17:41:22', user: 'Lisa Tran', role: 'posting_team', action: 'CREATE', entity: 'Payment', entityId: 'PAY-4501', ip: '192.168.1.71' },
  { id: 'AUD-012', timestamp: '2026-03-01 17:30:19', user: 'Dr. Martinez', role: 'provider', action: 'UPDATE', entity: 'Visit Note', entityId: 'V-003', ip: '192.168.1.88' },
  { id: 'AUD-013', timestamp: '2026-03-01 16:44:08', user: 'Tom Baker', role: 'supervisor', action: 'EXPORT', entity: 'Coding Report', entityId: 'RPT-0301', ip: '192.168.1.44' },
  { id: 'AUD-014', timestamp: '2026-03-01 16:22:51', user: 'Amy Chen', role: 'coder', action: 'DELETE', entity: 'Draft Claim', entityId: 'CLM-DRAFT-07', ip: '192.168.1.92' },
  { id: 'AUD-015', timestamp: '2026-03-01 15:58:37', user: 'Admin User', role: 'admin', action: 'VIEW', entity: 'Audit Log', entityId: 'AUD-*', ip: '192.168.1.42' },
  { id: 'AUD-016', timestamp: '2026-03-01 15:30:14', user: 'Sarah Kim', role: 'coder', action: 'UPDATE', entity: 'Claim', entityId: 'CLM-4501', ip: '192.168.1.55' },
  { id: 'AUD-017', timestamp: '2026-03-01 14:17:42', user: 'Mike Rodriguez', role: 'ar_team', action: 'VIEW', entity: 'Patient', entityId: 'P-005', ip: '192.168.1.60' },
  { id: 'AUD-018', timestamp: '2026-03-01 13:55:09', user: 'Tom Baker', role: 'supervisor', action: 'UPDATE', entity: 'Campaign', entityId: 'CMP-003', ip: '192.168.1.44' },
  { id: 'AUD-019', timestamp: '2026-03-01 11:22:30', user: 'Amy Chen', role: 'coder', action: 'VIEW', entity: 'Document', entityId: 'D-007', ip: '192.168.1.92' },
  { id: 'AUD-020', timestamp: '2026-03-01 10:08:15', user: 'Admin User', role: 'admin', action: 'UPDATE', entity: 'Integration', entityId: 'INT-Availity', ip: '192.168.1.42' },
]
