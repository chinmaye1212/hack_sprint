import fs from 'fs';
import path from 'path';
import {
  DemoUser,
  HospitalSourceId,
  MasterPatientIndexEntry,
  RecordCategory,
  SensitivityCategory,
  StewardMergeCandidate,
} from '../../src/types/unichart';

const DB_DIR = path.resolve(process.cwd(), 'server/db/storage');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: 'USR-PHYS-01',
    name: 'Dr. Aravind Krishnan, MD',
    role: 'Physician',
    department: 'Internal Medicine & Geriatrics',
    facility: 'Apex Metro FHIR Medical Center (HOSP_A)',
    defaultPurpose: 'Treatment',
    careTeamMasterIds: [
      'MPI-1001',
      'MPI-1002',
      'MPI-1003',
      'MPI-1004',
      'MPI-1006',
      'MPI-1007',
      'MPI-1008',
      'MPI-1009',
      'MPI-1010',
      'MPI-1011',
      'MPI-1012',
    ],
    badgeCode: 'ATTENDING-GERI',
  },
  {
    id: 'USR-PHYS-02',
    name: 'Dr. Vikramaditya Rao, MD',
    role: 'Physician',
    department: 'Surgical Oncology (Non-Care-Team Demo)',
    facility: 'Apex Metro FHIR Medical Center (HOSP_A)',
    defaultPurpose: 'Treatment',
    // Intentionally NOT on MPI-1001 or MPI-1005 care team so Demo #3 triggers Access Denied -> Break-the-Glass!
    careTeamMasterIds: ['MPI-1009'],
    badgeCode: 'CONSULT-SURG',
  },
  {
    id: 'USR-NURS-01',
    name: 'Sister Meenakshi Nair, RN',
    role: 'Nurse',
    department: 'Acute Geriatric Ward',
    facility: 'Apex Metro FHIR Medical Center (HOSP_A)',
    defaultPurpose: 'Treatment',
    careTeamMasterIds: ['MPI-1001', 'MPI-1002', 'MPI-1003', 'MPI-1004', 'MPI-1005'],
    badgeCode: 'CHARGE-RN',
  },
  {
    id: 'USR-PHARM-01',
    name: 'Dr. Siddharth Verma, PharmD',
    role: 'Pharmacist',
    department: 'Clinical Pharmacy & Med Reconciliation',
    facility: 'MedGrid Diagnostics & Pharmacy Chain (HOSP_D)',
    defaultPurpose: 'Treatment',
    careTeamMasterIds: ['MPI-1001', 'MPI-1002', 'MPI-1003', 'MPI-1004', 'MPI-1005', 'MPI-1006'],
    badgeCode: 'CLIN-PHARM',
  },
  {
    id: 'USR-LAB-01',
    name: 'Rohan Deshmukh, DMLT',
    role: 'Lab Tech',
    department: 'Central Pathology & Biochemistry',
    facility: 'MedGrid Diagnostics & Pharmacy Chain (HOSP_D)',
    defaultPurpose: 'Operations',
    careTeamMasterIds: ['MPI-1001', 'MPI-1002', 'MPI-1003', 'MPI-1004'],
    badgeCode: 'PATH-TECH',
  },
  {
    id: 'USR-BILL-01',
    name: 'Priya Subramanian, MBA',
    role: 'Billing Analyst',
    department: 'Revenue Cycle & TPA Claims',
    facility: 'Central Health Network Billing',
    defaultPurpose: 'Payment',
    careTeamMasterIds: [],
    badgeCode: 'REV-CLAIMS',
  },
  {
    id: 'USR-COORD-01',
    name: 'Ananya Chatterjee, MSW',
    role: 'Care Coordinator',
    department: 'Transitional Care & Geriatric Outreach',
    facility: 'City Care Regional Hospital (HOSP_C)',
    defaultPurpose: 'Operations',
    careTeamMasterIds: ['MPI-1001', 'MPI-1002', 'MPI-1003', 'MPI-1004', 'MPI-1005'],
    badgeCode: 'CARE-COORD',
  },
  {
    id: 'USR-RES-01',
    name: 'Dr. Kabir Sen, PhD',
    role: 'Researcher',
    department: 'Population Health & Geriatric Epidemiology',
    facility: 'National Institute of Aging Research',
    defaultPurpose: 'Research',
    careTeamMasterIds: [],
    badgeCode: 'EPI-RESEARCH',
  },
  {
    id: 'USR-STEW-01',
    name: 'Deepak Kulkarni, RHIA',
    role: 'Data Steward',
    department: 'Enterprise Master Patient Index (EMPI)',
    facility: 'UniChart Health Information Exchange',
    defaultPurpose: 'Operations',
    careTeamMasterIds: [],
    badgeCode: 'MPI-STEWARD',
  },
  {
    id: 'USR-PRIV-01',
    name: 'Nandini Iyer, CIPP/A, LLM',
    role: 'Privacy Officer',
    department: 'DPDP / ABDM Compliance & Information Security',
    facility: 'UniChart Health Information Exchange',
    defaultPurpose: 'Operations',
    careTeamMasterIds: [],
    badgeCode: 'CHIEF-PRIVACY',
  },
  {
    id: 'USR-ADMIN-01',
    name: 'Suresh Menon',
    role: 'Admin',
    department: 'Health Information Exchange Infrastructure',
    facility: 'UniChart Health Information Exchange',
    defaultPurpose: 'Operations',
    careTeamMasterIds: [],
    badgeCode: 'SYS-ADMIN',
  },
  {
    id: 'USR-PAT-01',
    name: 'Rameshwar Kumar Sharma (Patient)',
    role: 'Patient',
    department: 'Patient Self-Service Consent Manager',
    facility: 'ABDM Health Locker Portal',
    defaultPurpose: 'SelfAccess',
    careTeamMasterIds: ['MPI-1001'],
    linkedPatientMasterId: 'MPI-1001',
    badgeCode: 'ABHA-HOLDER',
  },
];

const ALL_CATEGORIES: RecordCategory[] = [
  'Problems',
  'Medications',
  'Labs',
  'Encounters',
  'Allergies',
  'Immunizations',
  'Imaging',
  'Claims',
  'Documents',
];

const ALL_SENSITIVITIES: SensitivityCategory[] = [
  'GENERAL',
  'MENTAL_HEALTH',
  'SUBSTANCE_USE',
  'HIV_STD',
  'REPRODUCTIVE',
  'MINOR_CONFIDENTIAL',
];

function buildDefaultConsents(
  overrides: Partial<Record<HospitalSourceId, { granted: boolean; allowedSensitivity?: SensitivityCategory[] }>> = {}
): Record<HospitalSourceId, any> {
  const sources: HospitalSourceId[] = ['HOSP_A', 'HOSP_B', 'HOSP_C', 'HOSP_D', 'PAYER_CLAIMS', 'IMM_REG'];
  const result: Record<string, any> = {};
  sources.forEach((src, idx) => {
    const ov = overrides[src];
    result[src] = {
      sourceId: src,
      granted: ov ? ov.granted : true,
      allowedCategories: [...ALL_CATEGORIES],
      allowedSensitivity: ov?.allowedSensitivity ?? ['GENERAL'],
      expiresAt: '2027-03-31T23:59:59Z',
      updatedAt: '2026-09-15T10:20:00Z',
      consentArtifactId: `ABDM-CA-2026-${9000 + idx}`,
    };
  });
  return result as Record<HospitalSourceId, any>;
}

// Central Patient Index (MPI) - STRICTLY NO CLINICAL CONTENT STORED HERE
export const INITIAL_MPI_INDEX: MasterPatientIndexEntry[] = [
  {
    masterPatientId: 'MPI-1001',
    abhaId: '91-4821-7734-9012',
    primaryName: 'Rameshwar Kumar Sharma',
    aliases: ['Rameshwar Kumaar Sharma', 'R. K. Sharma', 'Rameshwar Kumar'],
    dob: '1951-04-14',
    dobApproximate: false,
    age: 75,
    sex: 'M',
    phone: '+91-98201-44510',
    address: '42 Shanti Niketan, Plot 8, Indiranagar, Bengaluru 560038',
    guardianOrSpouse: 'Savitri Devi Sharma (Spouse)',
    primaryLanguage: 'Hindi / English',
    bloodGroup: 'B+',
    overallMatchConfidence: 96,
    scenarioTag: 'All 4 Hospitals + Claims + Registry (Complex Longitudinal)',
    linkedRecords: [
      {
        sourceId: 'HOSP_A',
        sourceName: 'Apex Metro FHIR Medical Center',
        localPatientId: 'FHIR-PAT-8801',
        localName: 'Rameshwar Kumar Sharma',
        localDob: '1951-04-14',
        localSex: 'male',
        localAddress: '42 Shanti Niketan, Indiranagar, Bengaluru 560038',
        localPhone: '+91-98201-44510',
        matchConfidence: 99,
        matchedFields: ['ABHA ID', 'Full Name', 'Exact DOB', 'Phone', 'Address'],
        availableCategories: ['Problems', 'Medications', 'Labs', 'Encounters', 'Allergies', 'Documents'],
        lastUpdated: '2026-10-10T14:22:00Z',
      },
      {
        sourceId: 'HOSP_B',
        sourceName: 'St. Jude Heritage Civil Hospital (Legacy)',
        localPatientId: 'SJ-OLD-1998-442',
        localName: 'Rameshwar Kumaar Sharma',
        localDob: '14/04/51',
        localSex: 'M',
        localAddress: '42 Shantiniketan Indiranagar Bangalore',
        localPhone: '9820144510',
        matchConfidence: 91,
        matchedFields: ['Phonetic Name (Kumar/Kumaar)', 'DD/MM/YY DOB', 'Phone Suffix', 'Spouse Name (Savitri)'],
        availableCategories: ['Problems', 'Medications', 'Encounters', 'Allergies', 'Documents'],
        lastUpdated: '2026-08-19T09:15:00Z',
      },
      {
        sourceId: 'HOSP_C',
        sourceName: 'City Care Regional Hospital (Mid-Size)',
        localPatientId: 'CC-MRN-50291',
        localName: 'Sharma, Rameshwar K.',
        localDob: '1951-04-14',
        localSex: 'M',
        localAddress: 'Plot 8, Shanti Niketan, Bengaluru',
        localPhone: '+91-98201-44510',
        matchConfidence: 96,
        matchedFields: ['ABHA ID', 'Inverted Name', 'Exact DOB', 'Phone'],
        availableCategories: ['Problems', 'Medications', 'Labs', 'Encounters', 'Allergies'],
        lastUpdated: '2026-10-02T17:40:00Z',
      },
      {
        sourceId: 'HOSP_D',
        sourceName: 'MedGrid Diagnostics & Pharmacy Chain',
        localPatientId: 'MG-CUST-77410',
        localName: 'Rameshwar Kumar',
        localDob: '1951-04-14',
        localSex: 'M',
        localPhone: '+91-98201-44510',
        matchConfidence: 94,
        matchedFields: ['First/Middle Name', 'Exact DOB', 'Verified Mobile'],
        availableCategories: ['Labs', 'Imaging', 'Medications'],
        lastUpdated: '2026-10-11T11:05:00Z',
      },
      {
        sourceId: 'PAYER_CLAIMS',
        sourceName: 'BharatHealth Senior Care Payer Claims',
        localPatientId: 'POL-BH-992011',
        localName: 'Rameshwar Kumar Sharma',
        localDob: '1951-04-14',
        localSex: 'M',
        matchConfidence: 99,
        matchedFields: ['ABHA ID', 'Policy Holder Name', 'DOB'],
        availableCategories: ['Claims'],
        lastUpdated: '2026-10-08T18:00:00Z',
      },
      {
        sourceId: 'IMM_REG',
        sourceName: 'National Adult Immunization Registry',
        localPatientId: 'UWIN-SR-10048',
        localName: 'Rameshwar K Sharma',
        localDob: '1951-04-14',
        localSex: 'M',
        matchConfidence: 98,
        matchedFields: ['ABHA ID', 'DOB', 'Mobile'],
        availableCategories: ['Immunizations'],
        lastUpdated: '2026-09-01T12:00:00Z',
      },
    ],
    // Note: For Demo #4, Hospital B starts with consent granted = false so user can see consent block and toggle it!
    consents: buildDefaultConsents({
      HOSP_B: { granted: false, allowedSensitivity: ['GENERAL'] },
      HOSP_A: { granted: true, allowedSensitivity: ['GENERAL', 'MENTAL_HEALTH'] },
    }),
  },
  {
    masterPatientId: 'MPI-1002',
    abhaId: '91-3310-5582-1190',
    primaryName: 'Mohammed Abdul Qadir',
    aliases: ['Muhammad Abdul Qadir', 'Mohd A. Kadir', 'M. A. Qadir'],
    dob: '1948-01-01',
    dobApproximate: true, // Year-only legacy DOB (1948)
    age: 78,
    sex: 'M',
    phone: '+91-94480-11223',
    address: '19 Charminar Cross Road, Shivajinagar, Bengaluru 560051',
    guardianOrSpouse: 'Zainab Begum (Spouse) / Tariq Qadir (Son)',
    primaryLanguage: 'Urdu / Kannada',
    bloodGroup: 'O+',
    overallMatchConfidence: 88,
    scenarioTag: 'Legacy Year-Only DOB (1948) + Transliteration (Mohammed/Muhammad)',
    linkedRecords: [
      {
        sourceId: 'HOSP_B',
        sourceName: 'St. Jude Heritage Civil Hospital (Legacy)',
        localPatientId: 'SJ-OLD-1994-108',
        localName: 'Muhammad Abdul Kadir',
        localDob: '1948 (Approx)',
        localSex: 'M',
        localAddress: '19 Charminar X Rd Shivajinagar',
        localPhone: '9448011223',
        matchConfidence: 86,
        matchedFields: ['Transliterated Name (Mohammed/Muhammad, Qadir/Kadir)', 'Approx Birth Year 1948', 'Guardian (Tariq Qadir)', 'Phone'],
        availableCategories: ['Problems', 'Medications', 'Encounters', 'Documents'],
        lastUpdated: '2026-09-25T10:30:00Z',
      },
      {
        sourceId: 'HOSP_A',
        sourceName: 'Apex Metro FHIR Medical Center',
        localPatientId: 'FHIR-PAT-8829',
        localName: 'Mohammed Abdul Qadir',
        localDob: '1948-01-01',
        localSex: 'male',
        localAddress: '19 Charminar Cross Road, Shivajinagar, Bengaluru',
        localPhone: '+91-94480-11223',
        matchConfidence: 94,
        matchedFields: ['ABHA ID', 'Phonetic Name', 'Birth Year 1948', 'Phone'],
        availableCategories: ['Problems', 'Medications', 'Labs', 'Encounters', 'Allergies'],
        lastUpdated: '2026-10-05T15:12:00Z',
      },
      {
        sourceId: 'HOSP_D',
        sourceName: 'MedGrid Diagnostics & Pharmacy Chain',
        localPatientId: 'MG-CUST-88120',
        localName: 'Mohd A Qadir',
        localDob: '1948-01-01',
        localSex: 'M',
        localPhone: '+91-94480-11223',
        matchConfidence: 89,
        matchedFields: ['Abbreviated Name', 'Birth Year', 'Phone'],
        availableCategories: ['Labs', 'Imaging', 'Medications'],
        lastUpdated: '2026-10-09T08:45:00Z',
      },
    ],
    consents: buildDefaultConsents(),
  },
  {
    masterPatientId: 'MPI-1003',
    abhaId: '91-7741-2091-4432',
    primaryName: 'Meera Nair Deshmukh',
    aliases: ['Meera Krishnan Nair (Maiden)', 'Meera S. Deshmukh'],
    dob: '1959-11-22',
    dobApproximate: false,
    age: 66,
    sex: 'F',
    phone: '+91-98452-33901',
    address: 'Flat 402, Lotus Enclave, Koramangala 4th Block, Bengaluru 560034',
    guardianOrSpouse: 'Shashank Deshmukh (Spouse) / Late K. Nair (Father)',
    primaryLanguage: 'Malayalam / Marathi / English',
    bloodGroup: 'A+',
    overallMatchConfidence: 92,
    scenarioTag: 'Name Change After Marriage (Meera Nair -> Meera Deshmukh)',
    linkedRecords: [
      {
        sourceId: 'HOSP_B',
        sourceName: 'St. Jude Heritage Civil Hospital (Legacy)',
        localPatientId: 'SJ-OLD-1989-902',
        localName: 'Meera Krishnan Nair',
        localDob: '22/11/59',
        localSex: 'F',
        localAddress: 'Koramangala 4th Blk Bangalore',
        localPhone: '9845233901',
        matchConfidence: 88,
        matchedFields: ['First Name (Meera)', 'Exact DOB (22/11/1959)', 'Father Name (K. Nair)', 'Mobile Number'],
        availableCategories: ['Problems', 'Encounters', 'Allergies', 'Documents'],
        lastUpdated: '2026-06-14T11:20:00Z',
      },
      {
        sourceId: 'HOSP_A',
        sourceName: 'Apex Metro FHIR Medical Center',
        localPatientId: 'FHIR-PAT-8910',
        localName: 'Meera Nair Deshmukh',
        localDob: '1959-11-22',
        localSex: 'female',
        localAddress: 'Flat 402, Lotus Enclave, Koramangala 4th Block',
        localPhone: '+91-98452-33901',
        matchConfidence: 98,
        matchedFields: ['ABHA ID', 'Married + Maiden Name', 'Exact DOB', 'Mobile Number'],
        availableCategories: ['Problems', 'Medications', 'Labs', 'Encounters', 'Allergies'],
        lastUpdated: '2026-10-07T16:10:00Z',
      },
      {
        sourceId: 'HOSP_C',
        sourceName: 'City Care Regional Hospital (Mid-Size)',
        localPatientId: 'CC-MRN-61004',
        localName: 'Deshmukh, Meera S.',
        localDob: '1959-11-22',
        localSex: 'F',
        localAddress: 'Lotus Enclave, Koramangala, Bengaluru',
        localPhone: '+91-98452-33901',
        matchConfidence: 94,
        matchedFields: ['ABHA ID', 'Married Surname', 'Exact DOB', 'Spouse (Shashank Deshmukh)'],
        availableCategories: ['Problems', 'Medications', 'Labs', 'Encounters'],
        lastUpdated: '2026-09-29T13:05:00Z',
      },
      {
        sourceId: 'IMM_REG',
        sourceName: 'National Adult Immunization Registry',
        localPatientId: 'UWIN-SR-20411',
        localName: 'Meera Deshmukh',
        localDob: '1959-11-22',
        localSex: 'F',
        matchConfidence: 97,
        matchedFields: ['ABHA ID', 'Exact DOB'],
        availableCategories: ['Immunizations'],
        lastUpdated: '2026-08-20T09:00:00Z',
      },
    ],
    consents: buildDefaultConsents(),
  },
  {
    masterPatientId: 'MPI-1004',
    abhaId: '91-6012-8834-5501',
    primaryName: 'Lakshmi Narayanan Iyer',
    aliases: ['L. N. Iyer', 'Laxmi Narayan Iyer'],
    dob: '1954-07-08',
    dobApproximate: false,
    age: 72,
    sex: 'F',
    phone: '+91-99001-77889',
    address: '14 Temple Street, Malleswaram, Bengaluru 560003',
    guardianOrSpouse: 'Narayanan Iyer (Spouse)',
    primaryLanguage: 'Tamil / English',
    bloodGroup: 'AB+',
    overallMatchConfidence: 99,
    scenarioTag: 'Single Hospital Record Only (Apex Metro Hospital A)',
    linkedRecords: [
      {
        sourceId: 'HOSP_A',
        sourceName: 'Apex Metro FHIR Medical Center',
        localPatientId: 'FHIR-PAT-9004',
        localName: 'Lakshmi Narayanan Iyer',
        localDob: '1954-07-08',
        localSex: 'female',
        localAddress: '14 Temple Street, Malleswaram, Bengaluru 560003',
        localPhone: '+91-99001-77889',
        matchConfidence: 99,
        matchedFields: ['ABHA ID', 'Exact Name', 'Exact DOB', 'Phone', 'Address'],
        availableCategories: ['Problems', 'Medications', 'Labs', 'Encounters', 'Allergies', 'Immunizations'],
        lastUpdated: '2026-10-09T10:00:00Z',
      },
    ],
    consents: buildDefaultConsents(),
  },
  {
    masterPatientId: 'MPI-1005',
    abhaId: '91-5590-1209-3344',
    primaryName: 'Vikramjit Singh Gill',
    aliases: ['Vikramjeet S. Gill', 'V. S. Gill'],
    dob: '1956-02-19',
    dobApproximate: false,
    age: 70,
    sex: 'M',
    phone: '+91-98112-66540',
    address: '88 Defence Colony, HAL 2nd Stage, Bengaluru 560008',
    guardianOrSpouse: 'Harpreet Kaur Gill (Spouse)',
    primaryLanguage: 'Punjabi / English',
    bloodGroup: 'B-',
    overallMatchConfidence: 95,
    scenarioTag: 'Restricted Care Team + Behavioral Health Sensitivity (Break-the-Glass Demo)',
    linkedRecords: [
      {
        sourceId: 'HOSP_A',
        sourceName: 'Apex Metro FHIR Medical Center',
        localPatientId: 'FHIR-PAT-9055',
        localName: 'Vikramjit Singh Gill',
        localDob: '1956-02-19',
        localSex: 'male',
        localAddress: '88 Defence Colony, HAL 2nd Stage, Bengaluru',
        localPhone: '+91-98112-66540',
        matchConfidence: 98,
        matchedFields: ['ABHA ID', 'Full Name', 'Exact DOB', 'Phone'],
        availableCategories: ['Problems', 'Medications', 'Labs', 'Encounters', 'Allergies', 'Documents'],
        lastUpdated: '2026-10-11T08:30:00Z',
      },
      {
        sourceId: 'HOSP_C',
        sourceName: 'City Care Regional Hospital (Mid-Size)',
        localPatientId: 'CC-MRN-70112',
        localName: 'Gill, Vikramjeet S.',
        localDob: '1956-02-19',
        localSex: 'M',
        localAddress: '88 Defence Colony, Bengaluru',
        localPhone: '+91-98112-66540',
        matchConfidence: 93,
        matchedFields: ['Phonetic First Name', 'Exact DOB', 'Phone'],
        availableCategories: ['Problems', 'Medications', 'Labs', 'Encounters'],
        lastUpdated: '2026-10-04T19:20:00Z',
      },
      {
        sourceId: 'PAYER_CLAIMS',
        sourceName: 'BharatHealth Senior Care Payer Claims',
        localPatientId: 'POL-BH-774512',
        localName: 'Vikramjit Singh Gill',
        localDob: '1956-02-19',
        localSex: 'M',
        matchConfidence: 99,
        matchedFields: ['ABHA ID', 'Exact DOB'],
        availableCategories: ['Claims'],
        lastUpdated: '2026-10-06T12:00:00Z',
      },
    ],
    consents: buildDefaultConsents({
      HOSP_A: { granted: true, allowedSensitivity: ['GENERAL'] }, // Mental health & substance use masked unless Break-the-Glass or explicit consent!
    }),
  },
  {
    masterPatientId: 'MPI-1006',
    abhaId: '91-8122-4901-6671',
    primaryName: 'Saraswati Devi Venkataraman',
    aliases: ['Saraswathi Venkatraman'],
    dob: '1949-09-03',
    dobApproximate: false,
    age: 77,
    sex: 'F',
    phone: '+91-98804-55219',
    address: '21 South End Road, Jayanagar 3rd Block, Bengaluru 560011',
    guardianOrSpouse: 'Karthik Venkataraman (Son)',
    primaryLanguage: 'Kannada / Tamil',
    bloodGroup: 'O+',
    overallMatchConfidence: 72,
    scenarioTag: 'Likely Duplicate Pair A (Queued in Steward Review with MPI-1007)',
    linkedRecords: [
      {
        sourceId: 'HOSP_A',
        sourceName: 'Apex Metro FHIR Medical Center',
        localPatientId: 'FHIR-PAT-9106',
        localName: 'Saraswati Devi Venkataraman',
        localDob: '1949-09-03',
        localSex: 'female',
        localAddress: '21 South End Road, Jayanagar 3rd Block',
        localPhone: '+91-98804-55219',
        matchConfidence: 97,
        matchedFields: ['ABHA ID', 'Full Name', 'Exact DOB'],
        availableCategories: ['Problems', 'Medications', 'Labs', 'Encounters'],
        lastUpdated: '2026-10-01T11:15:00Z',
      },
      {
        sourceId: 'HOSP_D',
        sourceName: 'MedGrid Diagnostics & Pharmacy Chain',
        localPatientId: 'MG-CUST-91002',
        localName: 'Saraswati Venkataraman',
        localDob: '1949-09-03',
        localSex: 'F',
        localPhone: '+91-98804-55219',
        matchConfidence: 94,
        matchedFields: ['Name', 'Exact DOB', 'Mobile'],
        availableCategories: ['Labs', 'Medications'],
        lastUpdated: '2026-10-08T14:50:00Z',
      },
    ],
    consents: buildDefaultConsents(),
  },
  {
    masterPatientId: 'MPI-1007',
    primaryName: 'Saraswathi V. Raman',
    aliases: ['Smt. Saraswathi Raman'],
    dob: '1949-03-09', // Transposed DD/MM vs MM/DD! 03/09/49 vs 09/03/49
    dobApproximate: false,
    age: 77,
    sex: 'F',
    phone: '+91-98804-55291', // Transposed last 2 digits
    address: '21 S. End Rd, Jayanagar, Bangalore',
    guardianOrSpouse: 'K. Venkatraman (Son)',
    primaryLanguage: 'Kannada / Tamil',
    bloodGroup: 'O+',
    overallMatchConfidence: 68,
    scenarioTag: 'Likely Duplicate Pair B (Unmerged Legacy Record - Needs Steward Review)',
    linkedRecords: [
      {
        sourceId: 'HOSP_B',
        sourceName: 'St. Jude Heritage Civil Hospital (Legacy)',
        localPatientId: 'SJ-OLD-2001-319',
        localName: 'Saraswathi V. Raman',
        localDob: '03/09/49',
        localSex: 'F',
        localAddress: '21 S. End Rd Jayanagar',
        localPhone: '9880455291',
        matchConfidence: 68,
        matchedFields: ['Phonetic Name (Saraswati/Saraswathi)', 'Transposed Date (03/09/49)', 'Street Address Match'],
        availableCategories: ['Problems', 'Medications', 'Encounters', 'Documents'],
        lastUpdated: '2026-07-19T16:40:00Z',
      },
    ],
    consents: buildDefaultConsents(),
  },
  {
    masterPatientId: 'MPI-1008',
    abhaId: '91-4409-3182-7760',
    primaryName: 'Subhash Chandra Bose Roy',
    aliases: ['S. C. Roy', 'Subhas Chandra Roy'],
    dob: '1934-08-12',
    dobApproximate: false,
    age: 92, // Age 90+ for Safe Harbor Researcher De-identification demo!
    sex: 'M',
    phone: '+91-98300-19283',
    address: '7 Tagore Park, Ulsoor Lake Road, Bengaluru 560042',
    guardianOrSpouse: 'Debashish Roy (Son)',
    primaryLanguage: 'Bengali / English',
    bloodGroup: 'A-',
    overallMatchConfidence: 95,
    scenarioTag: 'Nonagenarian (Age 92 -> 90+ Safe Harbor De-ID Demo)',
    linkedRecords: [
      {
        sourceId: 'HOSP_A',
        sourceName: 'Apex Metro FHIR Medical Center',
        localPatientId: 'FHIR-PAT-9208',
        localName: 'Subhash Chandra Bose Roy',
        localDob: '1934-08-12',
        localSex: 'male',
        localAddress: '7 Tagore Park, Ulsoor, Bengaluru 560042',
        localPhone: '+91-98300-19283',
        matchConfidence: 98,
        matchedFields: ['ABHA ID', 'Full Name', 'Exact DOB'],
        availableCategories: ['Problems', 'Medications', 'Labs', 'Encounters', 'Imaging'],
        lastUpdated: '2026-10-03T11:10:00Z',
      },
      {
        sourceId: 'HOSP_C',
        sourceName: 'City Care Regional Hospital (Mid-Size)',
        localPatientId: 'CC-MRN-88301',
        localName: 'Roy, Subhas C.',
        localDob: '1934-08-12',
        localSex: 'M',
        localAddress: '7 Tagore Park, Ulsoor',
        localPhone: '+91-98300-19283',
        matchConfidence: 93,
        matchedFields: ['Phonetic Name', 'Exact DOB', 'Son Name (Debashish Roy)'],
        availableCategories: ['Problems', 'Medications', 'Labs', 'Encounters'],
        lastUpdated: '2026-09-21T14:00:00Z',
      },
    ],
    consents: buildDefaultConsents(),
  },
  {
    masterPatientId: 'MPI-1009',
    abhaId: '91-2910-6643-8821',
    primaryName: 'Padmavathi Gopalan',
    aliases: ['Padmavathy Gopalan'],
    dob: '1953-12-05',
    dobApproximate: false,
    age: 72,
    sex: 'F',
    phone: '+91-94441-82736',
    address: '103 Kaveri Apartments, Basavanagudi, Bengaluru 560004',
    guardianOrSpouse: 'Gopalan S. (Spouse)',
    primaryLanguage: 'Tamil / Kannada',
    bloodGroup: 'B+',
    overallMatchConfidence: 94,
    scenarioTag: 'Cardio-Renal Syndrome Across 3 Facilities',
    linkedRecords: [
      {
        sourceId: 'HOSP_A',
        sourceName: 'Apex Metro FHIR Medical Center',
        localPatientId: 'FHIR-PAT-9309',
        localName: 'Padmavathi Gopalan',
        localDob: '1953-12-05',
        localSex: 'female',
        localPhone: '+91-94441-82736',
        matchConfidence: 97,
        matchedFields: ['ABHA ID', 'Full Name', 'Exact DOB'],
        availableCategories: ['Problems', 'Medications', 'Labs', 'Encounters'],
        lastUpdated: '2026-10-06T09:40:00Z',
      },
      {
        sourceId: 'HOSP_C',
        sourceName: 'City Care Regional Hospital (Mid-Size)',
        localPatientId: 'CC-MRN-89112',
        localName: 'Gopalan, Padmavathy',
        localDob: '1953-12-05',
        localSex: 'F',
        localPhone: '+91-94441-82736',
        matchConfidence: 92,
        matchedFields: ['Phonetic Name', 'Exact DOB', 'Phone'],
        availableCategories: ['Labs', 'Medications'],
        lastUpdated: '2026-09-18T16:20:00Z',
      },
      {
        sourceId: 'HOSP_D',
        sourceName: 'MedGrid Diagnostics & Pharmacy Chain',
        localPatientId: 'MG-CUST-93019',
        localName: 'Padmavathi Gopalan',
        localDob: '1953-12-05',
        localSex: 'F',
        localPhone: '+91-94441-82736',
        matchConfidence: 95,
        matchedFields: ['Full Name', 'Exact DOB', 'Phone'],
        availableCategories: ['Labs', 'Imaging', 'Medications'],
        lastUpdated: '2026-10-10T07:55:00Z',
      },
    ],
    consents: buildDefaultConsents(),
  },
  {
    masterPatientId: 'MPI-1010',
    abhaId: '91-3819-0042-1920',
    primaryName: 'Dattatraya M.ulkarni',
    aliases: ['Dattatray Kulkarni', 'D. M. Kulkarni'],
    dob: '1950-06-30',
    dobApproximate: false,
    age: 76,
    sex: 'M',
    phone: '+91-98220-71625',
    address: '55 Tilak Nagar, Jayanagar 9th Block, Bengaluru 560069',
    guardianOrSpouse: 'Sunanda Kulkarni (Spouse)',
    primaryLanguage: 'Marathi / Kannada',
    bloodGroup: 'O-',
    overallMatchConfidence: 91,
    scenarioTag: 'Anticoagulation & GI Bleed History',
    linkedRecords: [
      {
        sourceId: 'HOSP_B',
        sourceName: 'St. Jude Heritage Civil Hospital (Legacy)',
        localPatientId: 'SJ-OLD-2004-511',
        localName: 'Dattatray M Kulkarni',
        localDob: '30/06/50',
        localSex: 'M',
        localPhone: '9822071625',
        matchConfidence: 91,
        matchedFields: ['Phonetic Name', 'DD/MM/YY DOB', 'Phone'],
        availableCategories: ['Problems', 'Medications', 'Encounters'],
        lastUpdated: '2026-08-12T10:00:00Z',
      },
      {
        sourceId: 'HOSP_D',
        sourceName: 'MedGrid Diagnostics & Pharmacy Chain',
        localPatientId: 'MG-CUST-94001',
        localName: 'D. M. Kulkarni',
        localDob: '1950-06-30',
        localSex: 'M',
        localPhone: '+91-98220-71625',
        matchConfidence: 90,
        matchedFields: ['Initials + Surname', 'Exact DOB', 'Mobile'],
        availableCategories: ['Labs', 'Medications'],
        lastUpdated: '2026-10-09T18:10:00Z',
      },
    ],
    consents: buildDefaultConsents(),
  },
  {
    masterPatientId: 'MPI-1011',
    abhaId: '91-6721-9930-1122',
    primaryName: 'Harbhajan Kaur Sandhu',
    aliases: ['H. K. Sandhu', 'Harbhajan Sandhu'],
    dob: '1952-01-26',
    dobApproximate: false,
    age: 74,
    sex: 'F',
    phone: '+91-98140-33445',
    address: '12 Gurudwara Road, Commercial Street Area, Bengaluru 560001',
    guardianOrSpouse: 'Gurpreet Singh Sandhu (Son)',
    primaryLanguage: 'Punjabi / Hindi',
    bloodGroup: 'B+',
    overallMatchConfidence: 95,
    scenarioTag: 'Rheumatoid Arthritis & Biologic Therapy',
    linkedRecords: [
      {
        sourceId: 'HOSP_A',
        sourceName: 'Apex Metro FHIR Medical Center',
        localPatientId: 'FHIR-PAT-9511',
        localName: 'Harbhajan Kaur Sandhu',
        localDob: '1952-01-26',
        localSex: 'female',
        localPhone: '+91-98140-33445',
        matchConfidence: 98,
        matchedFields: ['ABHA ID', 'Full Name', 'Exact DOB'],
        availableCategories: ['Problems', 'Medications', 'Labs', 'Encounters', 'Immunizations'],
        lastUpdated: '2026-10-04T12:15:00Z',
      },
      {
        sourceId: 'HOSP_C',
        sourceName: 'City Care Regional Hospital (Mid-Size)',
        localPatientId: 'CC-MRN-91008',
        localName: 'Sandhu, Harbhajan K.',
        localDob: '1952-01-26',
        localSex: 'F',
        localPhone: '+91-98140-33445',
        matchConfidence: 94,
        matchedFields: ['ABHA ID', 'Exact DOB', 'Phone'],
        availableCategories: ['Labs', 'Medications'],
        lastUpdated: '2026-09-27T15:30:00Z',
      },
    ],
    consents: buildDefaultConsents(),
  },
  {
    masterPatientId: 'MPI-1012',
    abhaId: '91-9043-2218-7765',
    primaryName: 'Joseph Anthony D’Souza',
    aliases: ['Joseph A. Dsouza', 'Joe Dsouza'],
    dob: '1946-10-02',
    dobApproximate: false,
    age: 80,
    sex: 'M',
    phone: '+91-98450-90817',
    address: '9 Brigade Road Cross, Richmond Town, Bengaluru 560025',
    guardianOrSpouse: 'Maria D’Souza (Spouse)',
    primaryLanguage: 'English / Konkani',
    bloodGroup: 'A+',
    overallMatchConfidence: 93,
    scenarioTag: 'Post-Stroke Rehabilitation & Polypharmacy',
    linkedRecords: [
      {
        sourceId: 'HOSP_A',
        sourceName: 'Apex Metro FHIR Medical Center',
        localPatientId: 'FHIR-PAT-9612',
        localName: 'Joseph Anthony D’Souza',
        localDob: '1946-10-02',
        localSex: 'male',
        localPhone: '+91-98450-90817',
        matchConfidence: 97,
        matchedFields: ['ABHA ID', 'Full Name', 'Exact DOB'],
        availableCategories: ['Problems', 'Medications', 'Labs', 'Encounters', 'Imaging'],
        lastUpdated: '2026-10-08T10:45:00Z',
      },
      {
        sourceId: 'HOSP_B',
        sourceName: 'St. Jude Heritage Civil Hospital (Legacy)',
        localPatientId: 'SJ-OLD-1999-774',
        localName: 'Joseph A Dsouza',
        localDob: '02/10/46',
        localSex: 'M',
        localPhone: '9845090817',
        matchConfidence: 90,
        matchedFields: ['Punctuation-Normalized Surname', 'DD/MM/YY DOB', 'Phone'],
        availableCategories: ['Problems', 'Medications', 'Encounters', 'Documents'],
        lastUpdated: '2026-07-04T14:15:00Z',
      },
    ],
    consents: buildDefaultConsents(),
  },
];

export const INITIAL_STEWARD_QUEUE: StewardMergeCandidate[] = [
  {
    id: 'MERGE-CAND-001',
    status: 'PENDING',
    score: 68,
    reason:
      'Probabilistic match (68%) between MPI-1006 (Apex Metro FHIR) and MPI-1007 (St. Jude Legacy). Phonetic name match (Saraswati Venkataraman vs Saraswathi V. Raman) and street address match, but DOB month/day transposed (1949-09-03 vs 03/09/49) and phone last two digits transposed.',
    matchedFields: [
      {
        field: 'Full Name (Soundex + Jaro-Winkler)',
        leftValue: 'Saraswati Devi Venkataraman',
        rightValue: 'Saraswathi V. Raman',
        similarity: 84,
        explanation: 'Transliteration variant (ti/thi) + abbreviated patronymic (Venkataraman -> V. Raman)',
      },
      {
        field: 'Date of Birth',
        leftValue: '1949-09-03 (ISO)',
        rightValue: '03/09/49 (Legacy DD/MM/YY)',
        similarity: 90,
        explanation: 'Exact match once Legacy DD/MM/YY (3 Sept 1949) is normalized to ISO 1949-09-03',
      },
      {
        field: 'Phone Number',
        leftValue: '+91-98804-55219',
        rightValue: '9880455291',
        similarity: 80,
        explanation: '8 of 10 digits identical; trailing digits 19 vs 91 likely clerical transposition',
      },
      {
        field: 'Residential Address',
        leftValue: '21 South End Road, Jayanagar 3rd Block',
        rightValue: '21 S. End Rd Jayanagar',
        similarity: 92,
        explanation: 'Identical house number and street in Jayanagar',
      },
      {
        field: 'Next of Kin / Guardian',
        leftValue: 'Karthik Venkataraman (Son)',
        rightValue: 'K. Venkatraman (Son)',
        similarity: 89,
        explanation: 'First initial + surname match with identical relationship (Son)',
      },
    ],
    leftRecord: {
      masterPatientId: 'MPI-1006',
      sourceId: 'HOSP_A',
      localId: 'FHIR-PAT-9106',
      name: 'Saraswati Devi Venkataraman',
      dob: '1949-09-03',
      sex: 'F',
      phone: '+91-98804-55219',
      address: '21 South End Road, Jayanagar 3rd Block',
      guardian: 'Karthik Venkataraman (Son)',
      abhaId: '91-8122-4901-6671',
    },
    rightRecord: {
      masterPatientId: 'MPI-1007',
      sourceId: 'HOSP_B',
      localId: 'SJ-OLD-2001-319',
      name: 'Saraswathi V. Raman',
      dob: '03/09/49',
      sex: 'F',
      phone: '9880455291',
      address: '21 S. End Rd Jayanagar',
      guardian: 'K. Venkatraman (Son)',
    },
  },
  {
    id: 'MERGE-CAND-002',
    status: 'PENDING',
    score: 54,
    reason:
      'Low-medium confidence match (54%) between MPI-1001 (Rameshwar Kumar Sharma) and unlinked City Care record CC-MRN-59920 (Ramesh Kumar Verma). Similar first/middle name and birth year 1951, but different surname, spouse name, and address.',
    matchedFields: [
      {
        field: 'Full Name',
        leftValue: 'Rameshwar Kumar Sharma',
        rightValue: 'Ramesh Kumar Verma',
        similarity: 62,
        explanation: 'Shared root "Ramesh/Kumar", distinct surname (Sharma vs Verma)',
      },
      {
        field: 'Date of Birth',
        leftValue: '1951-04-14',
        rightValue: '1951-04-19',
        similarity: 75,
        explanation: 'Same birth year and month (April 1951), 5 days apart',
      },
      {
        field: 'Phone Number',
        leftValue: '+91-98201-44510',
        rightValue: '+91-98450-11900',
        similarity: 20,
        explanation: 'No phone overlap',
      },
      {
        field: 'Guardian / Spouse',
        leftValue: 'Savitri Devi Sharma',
        rightValue: 'Kamala Verma',
        similarity: 10,
        explanation: 'Distinct spouse names',
      },
    ],
    leftRecord: {
      masterPatientId: 'MPI-1001',
      sourceId: 'HOSP_A',
      localId: 'FHIR-PAT-8801',
      name: 'Rameshwar Kumar Sharma',
      dob: '1951-04-14',
      sex: 'M',
      phone: '+91-98201-44510',
      address: '42 Shanti Niketan, Indiranagar, Bengaluru',
      guardian: 'Savitri Devi Sharma (Spouse)',
      abhaId: '91-4821-7734-9012',
    },
    rightRecord: {
      sourceId: 'HOSP_C',
      localId: 'CC-MRN-59920',
      name: 'Ramesh Kumar Verma',
      dob: '1951-04-19',
      sex: 'M',
      phone: '+91-98450-11900',
      address: '104 MG Road, Mysuru',
      guardian: 'Kamala Verma (Spouse)',
    },
  },
];

// Persist Central Patient Index to disk as its own database file
const INDEX_DB_FILE = path.join(DB_DIR, 'central_mpi_index.sqlite.json');

interface IndexDatabaseState {
  schemaVersion: string;
  ddl: string;
  mpiEntries: MasterPatientIndexEntry[];
  stewardQueue: StewardMergeCandidate[];
}

function loadIndexDb(): IndexDatabaseState {
  if (fs.existsSync(INDEX_DB_FILE)) {
    try {
      const raw = fs.readFileSync(INDEX_DB_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch {
      // Fallback to initial seed
    }
  }
  const initialState: IndexDatabaseState = {
    schemaVersion: '1.0.0-MPI-NO-CLINICAL-DATA',
    ddl: `
      CREATE TABLE master_patient_index (
        master_patient_id TEXT PRIMARY KEY,
        abha_id TEXT UNIQUE,
        primary_name TEXT NOT NULL,
        dob TEXT NOT NULL,
        dob_approximate INTEGER DEFAULT 0,
        sex TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        guardian_or_spouse TEXT,
        overall_match_confidence REAL
      );
      CREATE TABLE mpi_hospital_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        master_patient_id TEXT REFERENCES master_patient_index(master_patient_id),
        source_id TEXT NOT NULL,
        local_patient_id TEXT NOT NULL,
        match_confidence REAL NOT NULL,
        available_categories_json TEXT NOT NULL
      );
      CREATE TABLE abdm_consent_artifacts (
        artifact_id TEXT PRIMARY KEY,
        master_patient_id TEXT REFERENCES master_patient_index(master_patient_id),
        source_id TEXT NOT NULL,
        granted INTEGER NOT NULL,
        allowed_categories_json TEXT NOT NULL,
        allowed_sensitivity_json TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
    `,
    mpiEntries: JSON.parse(JSON.stringify(INITIAL_MPI_INDEX)),
    stewardQueue: JSON.parse(JSON.stringify(INITIAL_STEWARD_QUEUE)),
  };
  fs.writeFileSync(INDEX_DB_FILE, JSON.stringify(initialState, null, 2), 'utf-8');
  return initialState;
}

let dbState = loadIndexDb();

export function saveIndexDb() {
  fs.writeFileSync(INDEX_DB_FILE, JSON.stringify(dbState, null, 2), 'utf-8');
}

export function resetIndexDb() {
  dbState = {
    schemaVersion: '1.0.0-MPI-NO-CLINICAL-DATA',
    ddl: dbState.ddl,
    mpiEntries: JSON.parse(JSON.stringify(INITIAL_MPI_INDEX)),
    stewardQueue: JSON.parse(JSON.stringify(INITIAL_STEWARD_QUEUE)),
  };
  saveIndexDb();
}

export function getMpiEntries(): MasterPatientIndexEntry[] {
  return dbState.mpiEntries;
}

export function getMpiEntryById(masterPatientId: string): MasterPatientIndexEntry | undefined {
  return dbState.mpiEntries.find((p) => p.masterPatientId === masterPatientId);
}

export function updatePatientConsent(
  masterPatientId: string,
  sourceId: HospitalSourceId,
  granted: boolean,
  allowedCategories?: RecordCategory[],
  allowedSensitivity?: SensitivityCategory[]
): MasterPatientIndexEntry | undefined {
  const entry = dbState.mpiEntries.find((p) => p.masterPatientId === masterPatientId);
  if (!entry) return undefined;
  const existing = entry.consents[sourceId];
  entry.consents[sourceId] = {
    sourceId,
    granted,
    allowedCategories: allowedCategories ?? existing?.allowedCategories ?? [...ALL_CATEGORIES],
    allowedSensitivity: allowedSensitivity ?? existing?.allowedSensitivity ?? ['GENERAL'],
    expiresAt: '2027-03-31T23:59:59Z',
    updatedAt: new Date().toISOString(),
    consentArtifactId: existing?.consentArtifactId ?? `ABDM-CA-${Date.now()}`,
  };
  saveIndexDb();
  return entry;
}

export function getStewardQueue(): StewardMergeCandidate[] {
  return dbState.stewardQueue;
}

export function resolveStewardCandidate(
  candidateId: string,
  decision: 'APPROVED' | 'REJECTED',
  reviewerName: string,
  notes: string
): StewardMergeCandidate | undefined {
  const cand = dbState.stewardQueue.find((c) => c.id === candidateId);
  if (!cand) return undefined;
  cand.status = decision;
  cand.reviewedBy = reviewerName;
  cand.reviewedAt = new Date().toISOString();
  cand.reviewNotes = notes;

  // If approved and rightRecord has a separate masterPatientId (e.g. MPI-1007 -> merge into MPI-1006), link its hospital records!
  if (decision === 'APPROVED' && cand.rightRecord.masterPatientId) {
    const targetMpi = dbState.mpiEntries.find((m) => m.masterPatientId === cand.leftRecord.masterPatientId);
    const sourceMpiIdx = dbState.mpiEntries.findIndex((m) => m.masterPatientId === cand.rightRecord.masterPatientId);
    if (targetMpi && sourceMpiIdx !== -1) {
      const sourceMpi = dbState.mpiEntries[sourceMpiIdx];
      sourceMpi.linkedRecords.forEach((rec) => {
        const alreadyLinked = targetMpi.linkedRecords.some(
          (r) => r.sourceId === rec.sourceId && r.localPatientId === rec.localPatientId
        );
        if (!alreadyLinked) {
          targetMpi.linkedRecords.push({
            ...rec,
            matchConfidence: 95,
            matchedFields: [...rec.matchedFields, `Steward Verified Merge (${reviewerName})`],
          });
        }
      });
      if (!targetMpi.aliases.includes(sourceMpi.primaryName)) {
        targetMpi.aliases.push(sourceMpi.primaryName);
      }
      targetMpi.overallMatchConfidence = 96;
      targetMpi.scenarioTag = 'Merged Longitudinal Record (Steward Approved MPI-1006 + MPI-1007)';
      dbState.mpiEntries.splice(sourceMpiIdx, 1);
    }
  }
  saveIndexDb();
  return cand;
}
