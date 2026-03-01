import { ClientOrg, AppointmentStatus, ClaimStatus, Priority } from '@/types'

export const demoClients: ClientOrg[] = [
  { id: 'org-101', name: 'Gulf Medical Center', region: 'uae', ehr_mode: 'medcloud_ehr' },
  { id: 'org-102', name: 'Irvine Family Practice', region: 'us', ehr_mode: 'external_ehr' },
  { id: 'org-103', name: 'Patel Cardiology', region: 'us', ehr_mode: 'medcloud_ehr' },
  { id: 'org-104', name: 'Dubai Wellness Clinic', region: 'uae', ehr_mode: 'external_ehr' },
]

export interface DemoPatient {
  id: string; firstName: string; lastName: string; dob?: string; gender?: string;
  phone: string; email?: string; emiratesId?: string; ssn?: string;
  insurance?: { payer: string; policyNo: string; groupNo?: string; memberId: string };
  secondaryInsurance?: { payer: string; policyNo: string; memberId: string };
  clientId: string; status: 'active' | 'inactive'; profileComplete: number;
  noShowCount?: number;
}

export const demoPatients: DemoPatient[] = [
  { id: 'P-001', firstName: 'John', lastName: 'Smith', dob: '1985-03-15', gender: 'Male', phone: '(949) 555-0101', email: 'john.smith@email.com', ssn: '***-**-4521', insurance: { payer: 'UnitedHealthcare', policyNo: 'UHC-889921', groupNo: 'GRP-4410', memberId: 'UHC884521' }, clientId: 'org-102', status: 'active', profileComplete: 100 },
  { id: 'P-002', firstName: 'Sarah', lastName: 'Johnson', dob: '1992-07-22', gender: 'Female', phone: '(949) 555-0102', insurance: { payer: 'Aetna', policyNo: 'AET-334201', memberId: 'AET334201' }, clientId: 'org-102', status: 'active', profileComplete: 75 },
  { id: 'P-003', firstName: 'Ahmed', lastName: 'Al Mansouri', dob: '1978-11-08', gender: 'Male', phone: '+971 50 123 4567', email: 'ahmed.m@email.com', emiratesId: '784-1978-1234567-1', insurance: { payer: 'Daman', policyNo: 'DAM-778834', memberId: 'DAM778834' }, clientId: 'org-101', status: 'active', profileComplete: 100 },
  { id: 'P-004', firstName: 'Fatima', lastName: 'Hassan', phone: '+971 55 987 6543', clientId: 'org-101', status: 'active', profileComplete: 20 },
  { id: 'P-005', firstName: 'Robert', lastName: 'Chen', dob: '1965-01-30', gender: 'Male', phone: '(714) 555-0201', email: 'r.chen@email.com', insurance: { payer: 'Medicare', policyNo: 'MED-112093', memberId: 'MED112093' }, secondaryInsurance: { payer: 'BCBS', policyNo: 'BCB-445201', memberId: 'BCB445201' }, clientId: 'org-103', status: 'active', profileComplete: 100, noShowCount: 3 },
  { id: 'P-006', firstName: 'Maria', lastName: 'Garcia', dob: '1990-05-12', gender: 'Female', phone: '(949) 555-0303', clientId: 'org-102', status: 'active', profileComplete: 50 },
  { id: 'P-007', firstName: 'Khalid', lastName: 'Ibrahim', dob: '1988-09-03', gender: 'Male', phone: '+971 52 456 7890', emiratesId: '784-1988-7654321-2', insurance: { payer: 'NAS', policyNo: 'NAS-992341', memberId: 'NAS992341' }, clientId: 'org-104', status: 'active', profileComplete: 85 },
  { id: 'P-008', firstName: 'Emily', lastName: 'Williams', dob: '1975-12-20', gender: 'Female', phone: '(714) 555-0404', clientId: 'org-103', status: 'inactive', profileComplete: 60 },
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
  { id: 'APT-004', patientId: 'P-006', patientName: 'Maria Garcia', provider: 'Dr. Martinez', date: '2026-03-02', time: '10:30', type: 'New Patient', status: 'booked', duration: 60, clientId: 'org-102' },
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

export interface DemoCodingItem {
  id: string; patientName: string; clientId: string; clientName: string;
  source: 'ai_scribe' | 'upload'; dos: string; provider: string;
  aiSuggestedCpt: { code: string; desc: string; confidence: number }[];
  aiSuggestedIcd: { code: string; desc: string; confidence: number }[];
  superbillCpt?: string[]; priority: Priority; receivedAt: string;
}

export const demoCodingQueue: DemoCodingItem[] = [
  { id: 'COD-001', patientName: 'John Smith', clientId: 'org-102', clientName: 'Irvine Family Practice', source: 'upload', dos: '2026-03-02', provider: 'Dr. Martinez', aiSuggestedCpt: [{ code: '99214', desc: 'Office visit, est. patient, moderate', confidence: 94 }, { code: '93000', desc: 'Electrocardiogram, routine', confidence: 78 }], aiSuggestedIcd: [{ code: 'E11.9', desc: 'Type 2 diabetes without complications', confidence: 97 }, { code: 'I10', desc: 'Essential hypertension', confidence: 92 }], superbillCpt: ['99214', '93000'], priority: 'medium', receivedAt: '2026-03-02T08:30:00' },
  { id: 'COD-002', patientName: 'Ahmed Al Mansouri', clientId: 'org-101', clientName: 'Gulf Medical Center', source: 'ai_scribe', dos: '2026-03-01', provider: 'Dr. Al Zaabi', aiSuggestedCpt: [{ code: '99213', desc: 'Office visit, est. patient, low', confidence: 88 }], aiSuggestedIcd: [{ code: 'I25.10', desc: 'Atherosclerotic heart disease', confidence: 95 }], priority: 'medium', receivedAt: '2026-03-01T16:20:00' },
  { id: 'COD-003', patientName: 'Robert Chen', clientId: 'org-103', clientName: 'Patel Cardiology', source: 'ai_scribe', dos: '2026-03-02', provider: 'Dr. Patel', aiSuggestedCpt: [{ code: '93306', desc: 'TTE with Doppler, complete', confidence: 96 }, { code: '93320', desc: 'Doppler echo, complete', confidence: 91 }], aiSuggestedIcd: [{ code: 'I50.9', desc: 'Heart failure, unspecified', confidence: 93 }, { code: 'I25.10', desc: 'ASHD of native coronary artery', confidence: 87 }], priority: 'high', receivedAt: '2026-03-02T09:45:00' },
  { id: 'COD-004', patientName: 'Sarah Johnson', clientId: 'org-102', clientName: 'Irvine Family Practice', source: 'upload', dos: '2026-03-01', provider: 'Dr. Martinez', aiSuggestedCpt: [{ code: '99214', desc: 'Office visit, est. patient, moderate', confidence: 72 }, { code: '99213', desc: 'Office visit, est. patient, low', confidence: 68 }], aiSuggestedIcd: [{ code: 'M54.5', desc: 'Low back pain', confidence: 90 }], superbillCpt: ['99214'], priority: 'medium', receivedAt: '2026-03-01T17:00:00' },
  { id: 'COD-005', patientName: 'Fatima Hassan', clientId: 'org-101', clientName: 'Gulf Medical Center', source: 'upload', dos: '2026-03-02', provider: 'Dr. Al Zaabi', aiSuggestedCpt: [{ code: '99203', desc: 'Office visit, new patient, low', confidence: 82 }], aiSuggestedIcd: [{ code: 'R10.9', desc: 'Unspecified abdominal pain', confidence: 75 }], priority: 'low', receivedAt: '2026-03-02T10:15:00' },
  { id: 'COD-006', patientName: 'Maria Garcia', clientId: 'org-102', clientName: 'Irvine Family Practice', source: 'upload', dos: '2026-02-28', provider: 'Dr. Martinez', aiSuggestedCpt: [{ code: '99213', desc: 'Office visit, est. patient, low', confidence: 91 }], aiSuggestedIcd: [{ code: 'J02.9', desc: 'Acute pharyngitis, unspecified', confidence: 88 }], superbillCpt: ['99213'], priority: 'low', receivedAt: '2026-02-28T15:30:00' },
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
