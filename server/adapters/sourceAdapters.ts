import { HospitalSourceId } from '../../src/types/unichart';
import {
  claimsPayerDb,
  hospitalADb,
  hospitalBDb,
  hospitalCDb,
  hospitalDDb,
  immunizationRegDb,
} from '../db/hospitalDbs';

export interface SourceConfig {
  sourceId: HospitalSourceId;
  sourceName: string;
  schemaType: string;
  codingSystems: string;
  online: boolean;
  simulatedLatencyMs: number;
  timeoutMs: number;
  lastSyncedAt: string;
}

const sourceRegistry: Record<HospitalSourceId, SourceConfig> = {
  HOSP_A: {
    sourceId: 'HOSP_A',
    sourceName: 'Apex Metro FHIR Medical Center',
    schemaType: 'Modern HL7 FHIR R4 Relational Schema',
    codingSystems: 'ICD-10-CM, SNOMED-CT, LOINC, RxNorm',
    online: true,
    simulatedLatencyMs: 140,
    timeoutMs: 3000,
    lastSyncedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  },
  HOSP_B: {
    sourceId: 'HOSP_B',
    sourceName: 'St. Jude Heritage Civil Hospital (Legacy)',
    schemaType: 'Legacy Flat Table (DD/MM/YY, Free-Text Diagnoses, Scanned PDF)',
    codingSystems: 'Uncoded Free-Text + OCR Microfilm',
    online: true,
    simulatedLatencyMs: 280,
    timeoutMs: 3000,
    lastSyncedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
  },
  HOSP_C: {
    sourceId: 'HOSP_C',
    sourceName: 'City Care Regional Hospital (Mid-Size)',
    schemaType: 'Custom Column Relational (Separate Lab/Pharm Modules, SI Units)',
    codingSystems: 'Proprietary Local Codes (CC-REN-*, DRG-*) + SI Units (umol/L)',
    online: true,
    simulatedLatencyMs: 210,
    timeoutMs: 3000,
    lastSyncedAt: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
  },
  HOSP_D: {
    sourceId: 'HOSP_D',
    sourceName: 'MedGrid Diagnostics & Pharmacy Chain',
    schemaType: 'Retail Diagnostic LIS + PACS + Pharmacy Dispense Log',
    codingSystems: 'LOINC, CPT-4, RxNorm Dispense',
    online: true,
    simulatedLatencyMs: 170,
    timeoutMs: 3000,
    lastSyncedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  PAYER_CLAIMS: {
    sourceId: 'PAYER_CLAIMS',
    sourceName: 'BharatHealth Senior Care Payer Claims',
    schemaType: 'X12 837 / HCX Adjudicated Claims Ledger',
    codingSystems: 'CPT-4, ICD-10, INR Tariff',
    online: true,
    simulatedLatencyMs: 120,
    timeoutMs: 3000,
    lastSyncedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
  IMM_REG: {
    sourceId: 'IMM_REG',
    sourceName: 'National Adult Immunization Registry',
    schemaType: 'U-WIN / HL7 v2 VXU Immunization Registry',
    codingSystems: 'CDC CVX Vaccine Codes',
    online: true,
    simulatedLatencyMs: 110,
    timeoutMs: 3000,
    lastSyncedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
};

export function getAllSourceConfigs(): SourceConfig[] {
  return Object.values(sourceRegistry);
}

export function getSourceConfig(sourceId: HospitalSourceId): SourceConfig {
  return sourceRegistry[sourceId];
}

export function setSourceOnlineStatus(sourceId: HospitalSourceId, online: boolean): SourceConfig {
  sourceRegistry[sourceId].online = online;
  if (online) {
    sourceRegistry[sourceId].lastSyncedAt = new Date().toISOString();
  }
  return sourceRegistry[sourceId];
}

export function resetAllSourcesOnline() {
  (Object.keys(sourceRegistry) as HospitalSourceId[]).forEach((k) => {
    sourceRegistry[k].online = true;
  });
}

export interface RawAdapterPayload {
  sourceId: HospitalSourceId;
  localPatientId: string;
  fetchedAt: string;
  latencyMs: number;
  rawRecordsCount: number;
  data: any;
}

async function delayWithTimeout(ms: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ms > timeoutMs) {
      setTimeout(() => reject(new Error(`Adapter timeout exceeded (${timeoutMs}ms)`)), timeoutMs);
    } else {
      setTimeout(resolve, ms);
    }
  });
}

export async function fetchFromSourceAdapter(
  sourceId: HospitalSourceId,
  localPatientId: string
): Promise<RawAdapterPayload> {
  const cfg = sourceRegistry[sourceId];
  const start = Date.now();

  if (!cfg.online) {
    throw new Error(
      `Connection refused: ${cfg.sourceName} (${sourceId}) endpoint is unreachable or offline (HTTP 503 Gateway Timeout).`
    );
  }

  await delayWithTimeout(cfg.simulatedLatencyMs, cfg.timeoutMs);
  const fetchedAt = new Date().toISOString();
  cfg.lastSyncedAt = fetchedAt;

  switch (sourceId) {
    case 'HOSP_A': {
      const conditions = hospitalADb.fhir_condition.filter((r) => r.patient_ref === localPatientId);
      const medications = hospitalADb.fhir_medication_request.filter((r) => r.patient_ref === localPatientId);
      const labs = hospitalADb.fhir_observation_lab.filter((r) => r.patient_ref === localPatientId);
      const allergies = hospitalADb.fhir_allergy_intolerance.filter((r) => r.patient_ref === localPatientId);
      const encounters = hospitalADb.fhir_encounter.filter((r) => r.patient_ref === localPatientId);
      const documents = hospitalADb.fhir_document_reference.filter((r) => r.patient_ref === localPatientId);
      const count =
        conditions.length +
        medications.length +
        labs.length +
        allergies.length +
        encounters.length +
        documents.length;
      return {
        sourceId,
        localPatientId,
        fetchedAt,
        latencyMs: Date.now() - start,
        rawRecordsCount: count,
        data: { conditions, medications, labs, allergies, encounters, documents },
      };
    }

    case 'HOSP_B': {
      const visits = hospitalBDb.legacy_flat_visits.filter((r) => r.old_pat_no === localPatientId);
      const scans = hospitalBDb.legacy_scanned_files.filter((r) => r.old_pat_no === localPatientId);
      return {
        sourceId,
        localPatientId,
        fetchedAt,
        latencyMs: Date.now() - start,
        rawRecordsCount: visits.length + scans.length,
        data: { visits, scans },
      };
    }

    case 'HOSP_C': {
      const encounters = hospitalCDb.tbl_regional_encounters.filter((r) => r.PAT_MRN_NO === localPatientId);
      const pharmacy = hospitalCDb.tbl_regional_pharmacy.filter((r) => r.PAT_MRN_NO === localPatientId);
      const labs = hospitalCDb.tbl_regional_lab_module.filter((r) => r.PAT_MRN_NO === localPatientId);
      return {
        sourceId,
        localPatientId,
        fetchedAt,
        latencyMs: Date.now() - start,
        rawRecordsCount: encounters.length + pharmacy.length + labs.length,
        data: { encounters, pharmacy, labs },
      };
    }

    case 'HOSP_D': {
      const labs = hospitalDDb.diag_lab_results.filter((r) => r.cust_id === localPatientId);
      const imaging = hospitalDDb.diag_imaging_studies.filter((r) => r.cust_id === localPatientId);
      const dispenses = hospitalDDb.pharm_dispense_log.filter((r) => r.cust_id === localPatientId);
      return {
        sourceId,
        localPatientId,
        fetchedAt,
        latencyMs: Date.now() - start,
        rawRecordsCount: labs.length + imaging.length + dispenses.length,
        data: { labs, imaging, dispenses },
      };
    }

    case 'PAYER_CLAIMS': {
      const claims = claimsPayerDb.claims.filter((r) => r.policy_id === localPatientId);
      return {
        sourceId,
        localPatientId,
        fetchedAt,
        latencyMs: Date.now() - start,
        rawRecordsCount: claims.length,
        data: { claims },
      };
    }

    case 'IMM_REG': {
      const immunizations = immunizationRegDb.immunizations.filter((r) => r.uwin_id === localPatientId);
      return {
        sourceId,
        localPatientId,
        fetchedAt,
        latencyMs: Date.now() - start,
        rawRecordsCount: immunizations.length,
        data: { immunizations },
      };
    }
    default: {
      throw new Error(`Unknown source adapter ID: ${sourceId}`);
    }
  }
}
