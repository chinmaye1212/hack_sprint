export type HospitalSourceId =
  | 'HOSP_A'
  | 'HOSP_B'
  | 'HOSP_C'
  | 'HOSP_D'
  | 'PAYER_CLAIMS'
  | 'IMM_REG';

export type UserRole =
  | 'Physician'
  | 'Nurse'
  | 'Pharmacist'
  | 'Lab Tech'
  | 'Billing Analyst'
  | 'Care Coordinator'
  | 'Researcher'
  | 'Data Steward'
  | 'Privacy Officer'
  | 'Admin'
  | 'Patient';

export type PurposeOfUse = 'Treatment' | 'Payment' | 'Operations' | 'Research' | 'SelfAccess';

export type SensitivityCategory =
  | 'GENERAL'
  | 'MENTAL_HEALTH'
  | 'SUBSTANCE_USE'
  | 'HIV_STD'
  | 'REPRODUCTIVE'
  | 'MINOR_CONFIDENTIAL';

export type RecordCategory =
  | 'Problems'
  | 'Medications'
  | 'Labs'
  | 'Encounters'
  | 'Allergies'
  | 'Immunizations'
  | 'Imaging'
  | 'Claims'
  | 'Documents';

export interface DemoUser {
  id: string;
  name: string;
  role: UserRole;
  department: string;
  facility: string;
  defaultPurpose: PurposeOfUse;
  careTeamMasterIds: string[];
  linkedPatientMasterId?: string;
  badgeCode: string;
}

export interface ProvenanceMetadata {
  sourceId: HospitalSourceId;
  sourceName: string;
  originalRecordId: string;
  fetchedAt: string;
  mappingConfidence: number;
  originalText?: string;
  codingSystem: string;
  needsClinicianReview?: boolean;
  transformationNotes?: string;
}

export interface LinkedHospitalRecord {
  sourceId: HospitalSourceId;
  sourceName: string;
  localPatientId: string;
  localName: string;
  localDob: string;
  localSex: string;
  localAddress?: string;
  localPhone?: string;
  matchConfidence: number;
  matchedFields: string[];
  availableCategories: RecordCategory[];
  lastUpdated: string;
}

export interface ConsentGrant {
  sourceId: HospitalSourceId;
  granted: boolean;
  allowedCategories: RecordCategory[];
  allowedSensitivity: SensitivityCategory[];
  expiresAt: string;
  updatedAt: string;
  consentArtifactId: string;
}

export interface MasterPatientIndexEntry {
  masterPatientId: string;
  abhaId?: string;
  primaryName: string;
  aliases: string[];
  dob: string;
  dobApproximate?: boolean;
  age: number;
  sex: 'M' | 'F' | 'O';
  phone: string;
  address: string;
  guardianOrSpouse?: string;
  primaryLanguage: string;
  bloodGroup?: string;
  overallMatchConfidence: number;
  scenarioTag: string;
  linkedRecords: LinkedHospitalRecord[];
  consents: Record<HospitalSourceId, ConsentGrant>;
}

export interface CanonicalProblem {
  id: string;
  code: string;
  system: 'ICD-10' | 'SNOMED-CT' | 'FREE-TEXT-MAPPED';
  display: string;
  clinicalStatus: 'active' | 'resolved' | 'inactive';
  onsetDate: string;
  recordedDate: string;
  sensitivity: SensitivityCategory;
  masked?: boolean;
  maskReason?: string;
  policyRuleCited?: string;
  sources: HospitalSourceId[];
  provenance: ProvenanceMetadata[];
  conflictFlag?: boolean;
  conflictDescription?: string;
}

export interface CanonicalMedication {
  id: string;
  rxNormCode: string;
  medicationName: string;
  genericName: string;
  dosage: string;
  frequency: string;
  route: string;
  status: 'active' | 'completed' | 'stopped' | 'dispensed-only';
  startDate: string;
  prescriber?: string;
  therapeuticClass: string;
  sensitivity: SensitivityCategory;
  masked?: boolean;
  maskReason?: string;
  policyRuleCited?: string;
  sources: HospitalSourceId[];
  provenance: ProvenanceMetadata[];
  conflictFlag?: boolean;
  conflictDescription?: string;
  reconciliationStatus?: 'Verified' | 'Dose Discrepancy' | 'Single-Source Only' | 'Duplicate Therapy';
}

export interface CanonicalLabResult {
  id: string;
  loincCode: string;
  testName: string;
  panelName: string;
  value: number;
  unit: string;
  originalValue?: number;
  originalUnit?: string;
  referenceRangeLow: number;
  referenceRangeHigh: number;
  interpretation: 'N' | 'H' | 'L' | 'HH' | 'LL';
  effectiveDate: string;
  sensitivity: SensitivityCategory;
  masked?: boolean;
  maskReason?: string;
  policyRuleCited?: string;
  sources: HospitalSourceId[];
  provenance: ProvenanceMetadata[];
}

export interface CanonicalAllergy {
  id: string;
  code: string;
  system: 'RxNorm' | 'SNOMED-CT' | 'LOCAL';
  substance: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe';
  criticality: 'low' | 'high';
  recordedDate: string;
  sources: HospitalSourceId[];
  provenance: ProvenanceMetadata[];
  conflictFlag?: boolean;
  conflictDescription?: string;
}

export interface CanonicalEncounter {
  id: string;
  encounterType: 'Inpatient' | 'Outpatient' | 'Emergency' | 'Diagnostic' | 'Telehealth';
  department: string;
  providerName: string;
  facilityName: string;
  startDate: string;
  endDate?: string;
  primaryDiagnosis: string;
  dischargeDisposition?: string;
  summaryNote: string;
  sensitivity: SensitivityCategory;
  masked?: boolean;
  maskReason?: string;
  policyRuleCited?: string;
  sources: HospitalSourceId[];
  provenance: ProvenanceMetadata[];
}

export interface CanonicalImmunization {
  id: string;
  cvxCode: string;
  vaccineName: string;
  occurrenceDate: string;
  lotNumber: string;
  doseNumber: number;
  status: 'completed' | 'overdue';
  sources: HospitalSourceId[];
  provenance: ProvenanceMetadata[];
}

export interface CanonicalImagingStudy {
  id: string;
  modality: 'CT' | 'MRI' | 'X-Ray' | 'Ultrasound' | 'PET' | 'Echocardiogram';
  cptCode: string;
  bodySite: string;
  studyDate: string;
  radiologist: string;
  impression: string;
  findings: string;
  status: 'final' | 'preliminary';
  sources: HospitalSourceId[];
  provenance: ProvenanceMetadata[];
}

export interface CanonicalClaim {
  id: string;
  claimNumber: string;
  serviceDate: string;
  cptCodes: string[];
  icd10Codes: string[];
  facilityName: string;
  billedAmountInr: number;
  allowedAmountInr: number;
  paidAmountInr: number;
  status: 'Paid' | 'Pending' | 'Denied' | 'Partially Approved';
  payerName: string;
  sources: HospitalSourceId[];
  provenance: ProvenanceMetadata[];
}

export interface CanonicalDocument {
  id: string;
  title: string;
  documentType: 'Scanned Legacy Chart' | 'Discharge Summary' | 'Operative Note' | 'Consent Form' | 'Psychiatric Eval';
  createdDate: string;
  author: string;
  format: 'PDF/Scanned' | 'HL7-CDA' | 'FHIR-Bundle';
  pageCount: number;
  ocrExcerpt: string;
  sensitivity: SensitivityCategory;
  masked?: boolean;
  maskReason?: string;
  policyRuleCited?: string;
  sources: HospitalSourceId[];
  provenance: ProvenanceMetadata[];
}

export interface ClinicalCareGapAlert {
  id: string;
  category: 'Drug-Allergy Conflict' | 'Duplicate Therapy' | 'Overdue Vaccine' | 'Missed Refill' | 'Worsening Lab Trend' | 'Cross-Hospital Conflict';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  involvedSources: HospitalSourceId[];
  recommendation: string;
}

export interface SourceFetchStatus {
  sourceId: HospitalSourceId;
  sourceName: string;
  schemaType: string;
  online: boolean;
  consentStatus: 'GRANTED' | 'DENIED_BY_PATIENT' | 'NOT_LINKED';
  fetchState: 'SUCCESS' | 'OFFLINE_ERROR' | 'CONSENT_BLOCKED' | 'NO_RECORDS' | 'CACHED';
  latencyMs: number;
  lastSyncedAt: string;
  cachedUntil?: string;
  recordsReturned: number;
  errorMessage?: string;
}

export interface UnifiedPatientViewResponse {
  masterPatient: MasterPatientIndexEntry;
  deIdentified: boolean;
  accessLevel: 'FULL_CLINICAL' | 'LIMITED_ROLE' | 'CLAIMS_ONLY' | 'DEIDENTIFIED_RESEARCH' | 'BREAK_GLASS_ACTIVE' | 'DENIED_NO_RELATIONSHIP';
  accessDecisionReason: string;
  policyRulesApplied: string[];
  breakGlassSession?: {
    grantedAt: string;
    expiresAt: string;
    justification: string;
    authorizedBy: string;
  };
  sourceStatuses: SourceFetchStatus[];
  partialDataWarning?: string;
  patientSummary: {
    decisionSupportNotice: string;
    activeConditionsCount: number;
    activeMedsCount: number;
    abnormalLabsCount: number;
    careGapsCount: number;
    keyHighlights: string[];
    recentEncounterSummary: string;
  };
  problems: CanonicalProblem[];
  medications: CanonicalMedication[];
  labs: CanonicalLabResult[];
  allergies: CanonicalAllergy[];
  encounters: CanonicalEncounter[];
  immunizations: CanonicalImmunization[];
  imaging: CanonicalImagingStudy[];
  claims: CanonicalClaim[];
  documents: CanonicalDocument[];
  careGaps: ClinicalCareGapAlert[];
  maskedItemsCount: number;
}

export interface StewardMergeCandidate {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  score: number;
  reason: string;
  matchedFields: {
    field: string;
    leftValue: string;
    rightValue: string;
    similarity: number;
    explanation: string;
  }[];
  leftRecord: {
    masterPatientId: string;
    sourceId: HospitalSourceId;
    localId: string;
    name: string;
    dob: string;
    sex: string;
    phone: string;
    address: string;
    guardian?: string;
    abhaId?: string;
  };
  rightRecord: {
    masterPatientId?: string;
    sourceId: HospitalSourceId;
    localId: string;
    name: string;
    dob: string;
    sex: string;
    phone: string;
    address: string;
    guardian?: string;
    abhaId?: string;
  };
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface AuditLogEntry {
  id: string;
  sequenceNumber: number;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  purposeOfUse: PurposeOfUse;
  action:
    | 'PATIENT_SEARCH'
    | 'VIEW_UNIFIED_CHART'
    | 'ADAPTER_FETCH'
    | 'ACCESS_DENIED'
    | 'BREAK_THE_GLASS'
    | 'CONSENT_UPDATED'
    | 'STEWARD_MERGE_DECISION'
    | 'EXPORT_SUMMARY'
    | 'POLICY_UPDATED'
    | 'TAMPER_SIMULATION';
  masterPatientId?: string;
  targetSourceId?: HospitalSourceId;
  outcome: 'ALLOW' | 'DENY' | 'PARTIAL_MASK' | 'ALERT_FLAGGED';
  details: string;
  ipAddress: string;
  prevHash: string;
  hash: string;
  anomalyFlag?: boolean;
}
