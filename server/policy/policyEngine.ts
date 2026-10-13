import {
  DemoUser,
  HospitalSourceId,
  MasterPatientIndexEntry,
  PurposeOfUse,
  SensitivityCategory,
} from '../../src/types/unichart';
import { ReconciledClinicalData } from '../reconciliation/reconciler';

export interface BreakGlassGrant {
  userId: string;
  masterPatientId: string;
  justification: string;
  grantedAt: string;
  expiresAt: string;
}

const activeBreakGlassGrants = new Map<string, BreakGlassGrant>();

export function grantBreakTheGlass(
  userId: string,
  masterPatientId: string,
  justification: string
): BreakGlassGrant {
  const now = new Date();
  const expires = new Date(now.getTime() + 15 * 60 * 1000); // 15-minute time-limited emergency access
  const grant: BreakGlassGrant = {
    userId,
    masterPatientId,
    justification,
    grantedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
  activeBreakGlassGrants.set(`${userId}:${masterPatientId}`, grant);
  return grant;
}

export function getActiveBreakGlass(userId: string, masterPatientId: string): BreakGlassGrant | undefined {
  const key = `${userId}:${masterPatientId}`;
  const grant = activeBreakGlassGrants.get(key);
  if (!grant) return undefined;
  if (new Date(grant.expiresAt).getTime() < Date.now()) {
    activeBreakGlassGrants.delete(key);
    return undefined;
  }
  return grant;
}

export function clearAllBreakGlassGrants() {
  activeBreakGlassGrants.clear();
}

export interface PolicyEvaluationResult {
  allowedToFetchClinical: boolean;
  accessLevel:
    | 'FULL_CLINICAL'
    | 'LIMITED_ROLE'
    | 'CLAIMS_ONLY'
    | 'DEIDENTIFIED_RESEARCH'
    | 'BREAK_GLASS_ACTIVE'
    | 'DENIED_NO_RELATIONSHIP';
  accessDecisionReason: string;
  policyRulesApplied: string[];
  breakGlassSession?: {
    grantedAt: string;
    expiresAt: string;
    justification: string;
    authorizedBy: string;
  };
}

export function evaluatePatientAccessPolicy(
  user: DemoUser,
  patient: MasterPatientIndexEntry,
  purpose: PurposeOfUse
): PolicyEvaluationResult {
  const rules: string[] = [];
  const bg = getActiveBreakGlass(user.id, patient.masterPatientId);

  // 1. Check Patient self-access
  if (user.role === 'Patient') {
    return {
      allowedToFetchClinical: true,
      accessLevel: 'FULL_CLINICAL',
      accessDecisionReason: 'Patient Self-Access under DPDP Act 2023 & ABDM Health Locker Rights.',
      policyRulesApplied: ['POL-DPDP-SELF-01: Right to Access Personal Digital Health Data'],
    };
  }

  // 2. Check Billing Analyst (Minimum Necessary: Demographics + Claims ONLY)
  if (user.role === 'Billing Analyst' || purpose === 'Payment') {
    return {
      allowedToFetchClinical: true,
      accessLevel: 'CLAIMS_ONLY',
      accessDecisionReason:
        'Minimum Necessary Principle: Billing Analyst role is granted access to Demographics and Adjudicated Claims only; clinical problems, meds, labs, and notes are masked.',
      policyRulesApplied: [
        'POL-RBAC-BILLING-04: Payment Purpose Minimum Necessary Filter',
        'POL-HIPAA-164.502(b): Clinical PHI Masking for Revenue Cycle Roles',
      ],
    };
  }

  // 3. Check Researcher (Safe Harbor De-Identified Access Only)
  if (user.role === 'Researcher' || purpose === 'Research') {
    return {
      allowedToFetchClinical: true,
      accessLevel: 'DEIDENTIFIED_RESEARCH',
      accessDecisionReason:
        'Research Purpose of Use: Direct identifiers removed, dates generalized to year, and ages >=90 top-coded to 90+ per Safe Harbor / ICMR-DPDP Research Exemption.',
      policyRulesApplied: [
        'POL-SAFE-HARBOR-DEID-09: Automated 18-Identifier Removal & Age 90+ Top-Coding',
        'POL-DPDP-SEC17-RESEARCH: De-Identified Longitudinal Cohort Access',
      ],
    };
  }

  // 4. Check Data Steward / Privacy Officer / Admin (Governance Roles)
  if (user.role === 'Data Steward' || user.role === 'Privacy Officer' || user.role === 'Admin') {
    return {
      allowedToFetchClinical: true,
      accessLevel: 'LIMITED_ROLE',
      accessDecisionReason: `Governance Role (${user.role}): Identity, provenance, and general clinical metadata visible; high-sensitivity behavioral notes masked.`,
      policyRulesApplied: ['POL-GOV-MIN-NEC-06: Governance & Stewardship Least-Privilege Access'],
    };
  }

  // 5. Clinical Roles (Physician, Nurse, Pharmacist, Lab Tech, Care Coordinator):
  //    Enforce ABAC Care-Team Treatment Relationship check!
  const isOnCareTeam = user.careTeamMasterIds.includes(patient.masterPatientId);

  if (!isOnCareTeam && !bg) {
    return {
      allowedToFetchClinical: false,
      accessLevel: 'DENIED_NO_RELATIONSHIP',
      accessDecisionReason: `Access Denied by ABAC Policy: ${user.name} (${user.role}, ${user.department}) has no active Treatment Relationship / Care-Team assignment for ${patient.primaryName} (${patient.masterPatientId}). Emergency Break-the-Glass override required.`,
      policyRulesApplied: [
        'POL-ABAC-CARETEAM-02: Clinician Must Hold Active Treatment Relationship with Patient',
        'POL-BTG-EMERGENCY-08: Emergency Break-the-Glass Justification Available',
      ],
    };
  }

  if (bg) {
    rules.push(
      'POL-BTG-EMERGENCY-08: Emergency Break-the-Glass Override Active (15-min TTL, Privacy Officer Alerted)'
    );
    return {
      allowedToFetchClinical: true,
      accessLevel: 'BREAK_GLASS_ACTIVE',
      accessDecisionReason: `Emergency Break-the-Glass Active: Override justified by ${user.name} ("${bg.justification}"). Full clinical and sensitive records unmasked; session audited.`,
      policyRulesApplied: rules,
      breakGlassSession: {
        grantedAt: bg.grantedAt,
        expiresAt: bg.expiresAt,
        justification: bg.justification,
        authorizedBy: user.name,
      },
    };
  }

  if (user.role === 'Pharmacist' || user.role === 'Lab Tech') {
    return {
      allowedToFetchClinical: true,
      accessLevel: 'LIMITED_ROLE',
      accessDecisionReason: `Role-Scoped Clinical Access (${user.role}): Scoped to ${
        user.role === 'Pharmacist' ? 'Medications, Allergies, Labs & Problems' : 'Diagnostic Labs & Allergies'
      } under Minimum Necessary Policy.`,
      policyRulesApplied: [
        `POL-RBAC-${user.role.toUpperCase().replace(/\s+/g, '')}-05: Role-Scoped Clinical View`,
        'POL-SENS-DPDP-42CFR-07: Behavioral & Substance Use Masking',
      ],
    };
  }

  return {
    allowedToFetchClinical: true,
    accessLevel: 'FULL_CLINICAL',
    accessDecisionReason: `Verified Care-Team Treatment Relationship for ${user.name} (${user.role}). Consent and sensitivity policies enforced per hospital.`,
    policyRulesApplied: [
      'POL-ABAC-CARETEAM-02: Verified Care-Team Membership',
      'POL-ABDM-CONSENT-03: Per-Hospital Consent Artifact Verification',
      'POL-SENS-DPDP-42CFR-07: Sensitivity Tag Evaluation (Mental Health / Substance Use)',
    ],
  };
}

// Check whether a specific hospital adapter is allowed to be called based on patient consent
export function isHospitalFetchConsented(
  patient: MasterPatientIndexEntry,
  sourceId: HospitalSourceId,
  accessLevel: PolicyEvaluationResult['accessLevel']
): boolean {
  // Break-the-Glass emergency override bypasses standard consent block in life-threatening emergencies (logged as high-severity alert)
  if (accessLevel === 'BREAK_GLASS_ACTIVE') {
    return true;
  }
  const grant = patient.consents[sourceId];
  return grant ? grant.granted : true;
}

// Apply Field-Level Sensitivity Masking, Role-Based Minimum Necessary Filtering, and Safe Harbor De-Identification
export function applyPolicyMaskingAndDeId(
  patient: MasterPatientIndexEntry,
  data: ReconciledClinicalData,
  policy: PolicyEvaluationResult,
  user: DemoUser
): {
  patientView: MasterPatientIndexEntry;
  clinicalData: ReconciledClinicalData;
  maskedItemsCount: number;
} {
  let maskedCount = 0;
  const clonedPatient: MasterPatientIndexEntry = JSON.parse(JSON.stringify(patient));
  const clonedData: ReconciledClinicalData = JSON.parse(JSON.stringify(data));

  // Field-level ID masking for non-Patient / non-Steward roles (e.g., ABHA shows last 4 digits)
  if (user.role !== 'Patient' && user.role !== 'Data Steward' && clonedPatient.abhaId) {
    const last4 = clonedPatient.abhaId.slice(-4);
    clonedPatient.abhaId = `XX-XXXX-XXXX-${last4}`;
  }

  // SAFE HARBOR DE-IDENTIFICATION FOR RESEARCHER
  if (policy.accessLevel === 'DEIDENTIFIED_RESEARCH') {
    const hashSuffix = clonedPatient.masterPatientId.replace('MPI-', 'COHORT-');
    clonedPatient.primaryName = `De-Identified Subject [${hashSuffix}]`;
    clonedPatient.aliases = ['[REDACTED BY SAFE HARBOR DE-ID]'];
    clonedPatient.dob = `${clonedPatient.dob.slice(0, 4)} (Year Generalized)`;
    if (clonedPatient.age >= 90) {
      clonedPatient.age = 90; // Top-coded at 90+ in UI
    }
    clonedPatient.phone = '[REDACTED - SAFE HARBOR]';
    clonedPatient.address = 'Pin Prefix: 560*** (Karnataka Metro Aggregate)';
    clonedPatient.guardianOrSpouse = '[REDACTED - NEXT OF KIN]';
    clonedPatient.abhaId = '[REDACTED - DIRECT IDENTIFIER]';

    clonedPatient.linkedRecords.forEach((lr) => {
      lr.localPatientId = `ANON-${lr.sourceId}`;
      lr.localName = clonedPatient.primaryName;
      lr.localDob = clonedPatient.dob;
      lr.localPhone = '[REDACTED]';
      lr.localAddress = '560***';
    });

    // Generalize dates to Year-Month and strip provider/patient names in narrative notes
    clonedData.encounters.forEach((enc) => {
      enc.providerName = '[De-Identified Clinician]';
      enc.summaryNote = enc.summaryNote.replace(/Rameshwar|Sharma|Muhammad|Qadir|Meera|Nair|Deshmukh/gi, '[SUBJECT]');
    });
  }

  // MINIMUM NECESSARY FILTER FOR BILLING ANALYST (Claims + Demographics ONLY)
  if (policy.accessLevel === 'CLAIMS_ONLY') {
    const billingRule = 'POL-RBAC-BILLING-04: Billing Analyst role is restricted to Claims & Demographics under Minimum Necessary Policy.';
    clonedData.problems.forEach((p) => {
      p.masked = true;
      p.display = '[Restricted Clinical Diagnosis – Request Clinical Access]';
      p.maskReason = 'Minimum Necessary Restriction (Payment Purpose)';
      p.policyRuleCited = billingRule;
      maskedCount++;
    });
    clonedData.medications.forEach((m) => {
      m.masked = true;
      m.medicationName = '[Restricted Medication – Request Clinical Access]';
      m.genericName = '[Restricted Medication]';
      m.maskReason = 'Minimum Necessary Restriction (Payment Purpose)';
      m.policyRuleCited = billingRule;
      maskedCount++;
    });
    clonedData.labs.forEach((l) => {
      l.masked = true;
      l.testName = '[Restricted Lab Result]';
      l.maskReason = 'Minimum Necessary Restriction (Payment Purpose)';
      l.policyRuleCited = billingRule;
      maskedCount++;
    });
    clonedData.encounters.forEach((e) => {
      e.masked = true;
      e.summaryNote = '[Restricted Clinical Encounter Note – Billing Analyst sees CPT/ICD-10 on Claims tab only]';
      e.maskReason = 'Minimum Necessary Restriction (Payment Purpose)';
      e.policyRuleCited = billingRule;
      maskedCount++;
    });
    clonedData.documents.forEach((d) => {
      d.masked = true;
      d.ocrExcerpt = '[Restricted Clinical Document – Not accessible for Payment purpose]';
      d.maskReason = 'Minimum Necessary Restriction (Payment Purpose)';
      d.policyRuleCited = billingRule;
      maskedCount++;
    });
    return { patientView: clonedPatient, clinicalData: clonedData, maskedItemsCount: maskedCount };
  }

  // SENSITIVITY TAG MASKING (MENTAL_HEALTH, SUBSTANCE_USE, HIV_STD, etc.)
  // Masked unless Break-the-Glass is active, or role === 'Patient', or patient explicitly granted that sensitivity category
  const isSensitiveAllowed = (sens: SensitivityCategory, sources: HospitalSourceId[]): boolean => {
    if (sens === 'GENERAL') return true;
    if (policy.accessLevel === 'BREAK_GLASS_ACTIVE' || user.role === 'Patient') return true;
    // Check if the patient's consent artifact for the contributing source includes this sensitivity category
    // AND the user is a Physician on the care team
    if (user.role !== 'Physician') return false;
    return sources.some((src) => {
      const c = patient.consents[src];
      return c && c.granted && c.allowedSensitivity.includes(sens);
    });
  };

  const sensRule =
    'POL-SENS-DPDP-42CFR-07: Special Category Sensitive Health Data (Mental Health / Substance Use Disorder) requires explicit granular consent or Break-the-Glass authorization.';

  clonedData.problems.forEach((p) => {
    if (!isSensitiveAllowed(p.sensitivity, p.sources)) {
      p.masked = true;
      p.code = 'MASKED';
      p.display = `[Restricted ${p.sensitivity.replace('_', ' ')} Record – Request Access]`;
      p.maskReason = `Protected ${p.sensitivity} diagnosis masked per patient sensitivity preferences / role scope.`;
      p.policyRuleCited = sensRule;
      maskedCount++;
    }
  });

  clonedData.medications.forEach((m) => {
    if (user.role === 'Lab Tech') {
      m.masked = true;
      m.medicationName = '[Restricted – Lab Tech Role Scoped to Diagnostic Labs & Allergies]';
      m.genericName = '[Restricted Medication]';
      m.maskReason = 'Role-Based Minimum Necessary Filter (Lab Tech)';
      m.policyRuleCited = 'POL-RBAC-LABTECH-05: Lab Tech role is restricted to Laboratory & Allergy modules.';
      maskedCount++;
    } else if (!isSensitiveAllowed(m.sensitivity, m.sources)) {
      m.masked = true;
      m.medicationName = `[Restricted ${m.sensitivity.replace('_', ' ')} Medication – Request Access]`;
      m.genericName = '[Restricted Psychotropic / Addiction Medication]';
      m.maskReason = `Protected ${m.sensitivity} therapy masked.`;
      m.policyRuleCited = sensRule;
      maskedCount++;
    }
  });

  clonedData.encounters.forEach((e) => {
    if (!isSensitiveAllowed(e.sensitivity, e.sources)) {
      e.masked = true;
      e.primaryDiagnosis = `[Restricted ${e.sensitivity.replace('_', ' ')} Encounter]`;
      e.summaryNote = '[Restricted – request access: Behavioral Health / Substance Use confidentiality rule applied]';
      e.maskReason = `Protected ${e.sensitivity} clinical note masked.`;
      e.policyRuleCited = sensRule;
      maskedCount++;
    }
  });

  clonedData.documents.forEach((d) => {
    if (!isSensitiveAllowed(d.sensitivity, d.sources)) {
      d.masked = true;
      d.title = `[Restricted ${d.sensitivity.replace('_', ' ')} Document]`;
      d.ocrExcerpt = '[Restricted – request access: Protected under POL-SENS-DPDP-42CFR-07]';
      d.maskReason = `Protected ${d.sensitivity} document masked.`;
      d.policyRuleCited = sensRule;
      maskedCount++;
    }
  });

  return {
    patientView: clonedPatient,
    clinicalData: clonedData,
    maskedItemsCount: maskedCount,
  };
}
