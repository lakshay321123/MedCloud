import { ClientOrg, AppointmentStatus, ClaimStatus, Priority } from '@/types'

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
  },
  {
    id: 'P-002', firstName: 'Sarah', lastName: 'Johnson',
    dob: '1992-07-22', gender: 'Female',
    phone: '(949) 555-0102', email: 'sarah.j@email.com',
    preferredLanguage: 'English', preferredContact: 'SMS',
    insurance: { payer: 'Aetna', policyNo: 'AET-334201', memberId: 'AET334201', relationship: 'Self' },
    address: { line1: '789 Campus Dr', city: 'Irvine', state: 'CA', zip: '92617', country: 'United States' },
    clientId: 'org-102', status: 'active', profileComplete: 75,
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

export interface DemoClaim {
  id: string; patientId: string; patientName: string; clientId: string; clientName: string;
  payer: string; dos: string; cptCodes: string[]; icdCodes: string[]; charges: number;
  paid: number; status: ClaimStatus; age: number; assignedTo?: string; denialReason?: string;
}

export const demoClaims: DemoClaim[] = [
  { id: 'CLM-4501', patientId: 'P-001', patientName: 'John Smith', clientId: 'org-102', clientName: 'Irvine Family Practice', payer: 'UnitedHealthcare', dos: '2026-02-25', cptCodes: ['99214'], icdCodes: ['E11.9', 'I10'], charges: 250, paid: 250, status: 'paid', age: 5 },
  { id: 'CLM-4502', patientId: 'P-003', patientName: 'Ahmed Al Mansouri', clientId: 'org-101', clientName: 'Gulf Medical Center', payer: 'Daman', dos: '2026-02-24', cptCodes: ['99213', '93000'], icdCodes: ['I25.10'], charges: 420, paid: 0, status: 'submitted', age: 6 },
  { id: 'CLM-4503', patientId: 'P-005', patientName: 'Robert Chen', clientId: 'org-103', clientName: 'Patel Cardiology', payer: 'Medicare', dos: '2026-02-20', cptCodes: ['93306', '93320'], icdCodes: ['I50.9'], charges: 890, paid: 712, status: 'partial_pay', age: 10 },
  { id: 'CLM-4504', patientId: 'P-002', patientName: 'Sarah Johnson', clientId: 'org-102', clientName: 'Irvine Family Practice', payer: 'Aetna', dos: '2026-02-18', cptCodes: ['99215'], icdCodes: ['M54.5'], charges: 350, paid: 0, status: 'denied', age: 12, denialReason: 'Prior authorization required' },
  { id: 'CLM-4505', patientId: 'P-007', patientName: 'Khalid Ibrahim', clientId: 'org-104', clientName: 'Dubai Wellness Clinic', payer: 'NAS', dos: '2026-02-22', cptCodes: ['99213'], icdCodes: ['J06.9'], charges: 180, paid: 0, status: 'in_process', age: 8 },
  { id: 'CLM-4506', patientId: 'P-001', patientName: 'John Smith', clientId: 'org-102', clientName: 'Irvine Family Practice', payer: 'UnitedHealthcare', dos: '2026-03-02', cptCodes: ['99214'], icdCodes: ['E11.9'], charges: 250, paid: 0, status: 'draft', age: 0 },
  { id: 'CLM-4507', patientId: 'P-005', patientName: 'Robert Chen', clientId: 'org-103', clientName: 'Patel Cardiology', payer: 'Medicare', dos: '2026-02-10', cptCodes: ['93350'], icdCodes: ['I50.9', 'I25.10'], charges: 1200, paid: 0, status: 'appealed', age: 20, denialReason: 'Not medically necessary' },
  { id: 'CLM-4508', patientId: 'P-006', patientName: 'Maria Garcia', clientId: 'org-102', clientName: 'Irvine Family Practice', payer: 'Self-Pay', dos: '2026-02-15', cptCodes: ['99213'], icdCodes: ['J02.9'], charges: 180, paid: 0, status: 'ready', age: 15 },
  { id: 'CLM-4509', patientId: 'P-003', patientName: 'Ahmed Al Mansouri', clientId: 'org-101', clientName: 'Gulf Medical Center', payer: 'Daman', dos: '2026-01-30', cptCodes: ['99214', '93000'], icdCodes: ['I25.10', 'I10'], charges: 480, paid: 480, status: 'paid', age: 31 },
  { id: 'CLM-4510', patientId: 'P-002', patientName: 'Sarah Johnson', clientId: 'org-102', clientName: 'Irvine Family Practice', payer: 'Aetna', dos: '2026-02-05', cptCodes: ['99214'], icdCodes: ['M54.5'], charges: 280, paid: 224, status: 'paid', age: 25 },
  { id: 'CLM-4511', patientId: 'P-007', patientName: 'Khalid Ibrahim', clientId: 'org-104', clientName: 'Dubai Wellness Clinic', payer: 'NAS', dos: '2026-01-15', cptCodes: ['99215'], icdCodes: ['E11.65'], charges: 320, paid: 0, status: 'denied', age: 46, denialReason: 'Timely filing exceeded' },
  { id: 'CLM-4512', patientId: 'P-005', patientName: 'Robert Chen', clientId: 'org-103', clientName: 'Patel Cardiology', payer: 'BCBS', dos: '2026-02-28', cptCodes: ['93005'], icdCodes: ['R00.0'], charges: 150, paid: 0, status: 'scrubbing', age: 2 },
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
  aiSuggestedCpt: AISuggestedCode[]
  aiSuggestedIcd: AISuggestedCode[]
  superbillCpt?: string[]
  hasSuperbill: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
  receivedAt: string
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
    hasSuperbill: true, superbillCpt: ['99214', '93000'], priority: 'medium', receivedAt: '2026-03-02T08:30:00',
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
    hasSuperbill: false, priority: 'medium', receivedAt: '2026-03-01T16:20:00',
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
    hasSuperbill: false, priority: 'high', receivedAt: '2026-03-02T09:45:00',
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
    hasSuperbill: true, superbillCpt: ['99214'], priority: 'medium', receivedAt: '2026-03-01T17:00:00',
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
    hasSuperbill: false, priority: 'low', receivedAt: '2026-03-02T10:15:00',
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
    hasSuperbill: true, superbillCpt: ['99213'], priority: 'low', receivedAt: '2026-02-28T15:30:00',
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

export const demoERALineItems: EOBLineItem[] = [
  { id: 'EOB-001', eraId: 'ERA-001', claimId: 'CLM-4501', patientName: 'John Smith', patientId: 'P-001', cpt: '99214', cptDesc: 'Office visit, est. moderate', dos: '2026-02-25', billed: 250, allowed: 218, paid: 218, denied: 0, adjCode: 'CO-45', adjReason: 'Contractual adjustment', patBalance: 30, action: 'post' },
  { id: 'EOB-002', eraId: 'ERA-001', claimId: 'CLM-4501', patientName: 'John Smith', patientId: 'P-001', cpt: '93000', cptDesc: 'ECG, routine', dos: '2026-02-25', billed: 85, allowed: 62, paid: 62, denied: 0, adjCode: 'CO-45', adjReason: 'Contractual adjustment', patBalance: 0, action: 'post' },
  { id: 'EOB-003', eraId: 'ERA-001', claimId: 'CLM-4510', patientName: 'Maria Garcia', patientId: 'P-006', cpt: '99213', cptDesc: 'Office visit, est. low', dos: '2026-02-28', billed: 175, allowed: 152, paid: 152, denied: 0, adjCode: 'CO-45', adjReason: 'Contractual adjustment', patBalance: 25, action: 'post' },
  { id: 'EOB-004', eraId: 'ERA-001', claimId: 'CLM-4511', patientName: 'David Park', patientId: 'P-009', cpt: '99215', cptDesc: 'Office visit, est. high', dos: '2026-02-26', billed: 380, allowed: 0, paid: 0, denied: 380, adjCode: 'CO-197', adjReason: 'Prior auth required — not obtained', patBalance: 0, action: 'deny_route' },
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
