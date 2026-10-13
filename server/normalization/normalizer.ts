import {
  CanonicalAllergy,
  CanonicalClaim,
  CanonicalDocument,
  CanonicalEncounter,
  CanonicalImagingStudy,
  CanonicalImmunization,
  CanonicalLabResult,
  CanonicalMedication,
  CanonicalProblem,
  SensitivityCategory,
} from '../../src/types/unichart';
import { RawAdapterPayload, getSourceConfig } from '../adapters/sourceAdapters';

export interface NormalizedSourceBundle {
  problems: CanonicalProblem[];
  medications: CanonicalMedication[];
  labs: CanonicalLabResult[];
  allergies: CanonicalAllergy[];
  encounters: CanonicalEncounter[];
  immunizations: CanonicalImmunization[];
  imaging: CanonicalImagingStudy[];
  claims: CanonicalClaim[];
  documents: CanonicalDocument[];
}

// Convert Legacy DD/MM/YY string (e.g. "19/08/26" or "14/04/51") to ISO YYYY-MM-DD
export function normalizeLegacyDate(ddmmyy: string): string {
  if (!ddmmyy) return '2026-01-01';
  if (/^\d{4}$/.test(ddmmyy.trim())) {
    return `${ddmmyy.trim()}-01-01`;
  }
  const parts = ddmmyy.trim().split('/');
  if (parts.length !== 3) return ddmmyy;
  const [dd, mm, yy] = parts;
  const yearNum = parseInt(yy, 10);
  // Pivot at 30: <= 30 is 20xx, > 30 is 19xx
  const fullYear = yearNum <= 30 ? 2000 + yearNum : 1900 + yearNum;
  return `${fullYear}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

// Terminology Map for Legacy Free-Text Diagnoses (Hospital B) -> ICD-10 with Confidence Score
const FREE_TEXT_ICD10_LEXICON: Array<{
  pattern: RegExp;
  icd10: string;
  standardizedDisplay: string;
  confidence: number;
}> = [
  {
    pattern: /osteoarthrosis.*gouty flare/i,
    icd10: 'M10.072 / M17.0',
    standardizedDisplay: 'Idiopathic gout of left ankle/foot with bilateral primary knee osteoarthritis',
    confidence: 0.89,
  },
  {
    pattern: /inguinal hernia mesh/i,
    icd10: 'Z98.890',
    standardizedDisplay: 'Personal history of right inguinal hernia repair with mesh prosthesis',
    confidence: 0.91,
  },
  {
    pattern: /smoker bronchitis chr airway obst.*cor-pulmonale/i,
    icd10: 'J44.9 / I27.81',
    standardizedDisplay: 'Chronic obstructive pulmonary disease with suspected chronic cor pulmonale',
    confidence: 0.66, // Below 0.75 threshold -> triggers "Needs Clinician Review" flag!
  },
  {
    pattern: /atypical epigastric dyspepsia.*acid peptic.*cardiac/i,
    icd10: 'R10.13 / K30',
    standardizedDisplay: 'Epigastric pain / Functional dyspepsia (rule out atypical ischemic equivalent)',
    confidence: 0.58, // Below 0.75 threshold -> triggers "Needs Clinician Review" flag!
  },
  {
    pattern: /post-menopausal osteopenia.*colles fracture/i,
    icd10: 'M85.80 / Z87.310',
    standardizedDisplay: 'Postmenopausal osteopenia with personal history of healed distal radius (Colles) fracture',
    confidence: 0.87,
  },
  {
    pattern: /ischemic heart disease stable angina/i,
    icd10: 'I25.119',
    standardizedDisplay: 'Atherosclerotic heart disease of native coronary artery with unspecified angina pectoris',
    confidence: 0.92,
  },
  {
    pattern: /duodenal ulcer upper gi bleed/i,
    icd10: 'K26.4',
    standardizedDisplay: 'Chronic or unspecified duodenal ulcer with hemorrhage (resolved)',
    confidence: 0.90,
  },
  {
    pattern: /left mca ischemic stroke.*right hemiparesis/i,
    icd10: 'I69.351',
    standardizedDisplay: 'Hemiplegia and hemiparesis following cerebral infarction affecting right dominant side',
    confidence: 0.94,
  },
];

// Local Code Mapping for Hospital C (Mid-Size Regional Hospital)
const HOSP_C_DIAG_MAP: Record<string, { icd10: string; display: string }> = {
  'CC-REN-03B': {
    icd10: 'N18.32',
    display: 'Chronic kidney disease, stage 3b (moderate)',
  },
  'CC-CARD-09': {
    icd10: 'I50.22',
    display: 'Chronic systolic (congestive) heart failure (HFrEF, EF 38%)',
  },
  'CC-ENDO-02': {
    icd10: 'E03.9',
    display: 'Hypothyroidism, unspecified',
  },
  'CC-GI-14': {
    icd10: 'K76.6',
    display: 'Portal hypertension',
  },
  'CC-NEURO-01': {
    icd10: 'G20',
    display: 'Parkinson disease, dyskinesia-predominant',
  },
};

const HOSP_C_DRUG_RXNORM_MAP: Record<string, { rxNorm: string; class: string }> = {
  'DRG-METO-50': { rxNorm: '866427', class: 'Beta-Adrenergic Blocker' },
  'DRG-AMOX-625': { rxNorm: '617993', class: 'Beta-Lactam / Penicillin Antibiotic' },
  'DRG-DAPA-10': { rxNorm: '1545653', class: 'SGLT2 Inhibitor' },
  'DRG-THYR-50': { rxNorm: '966247', class: 'Thyroid Hormone Replacement' },
};

export function normalizeAdapterPayload(payload: RawAdapterPayload): NormalizedSourceBundle {
  const bundle: NormalizedSourceBundle = {
    problems: [],
    medications: [],
    labs: [],
    allergies: [],
    encounters: [],
    immunizations: [],
    imaging: [],
    claims: [],
    documents: [],
  };

  const srcCfg = getSourceConfig(payload.sourceId);

  if (payload.sourceId === 'HOSP_A') {
    const d = payload.data;
    for (const c of d.conditions || []) {
      bundle.problems.push({
        id: c.resource_id,
        code: c.icd10_code,
        system: 'ICD-10',
        display: c.display_text,
        clinicalStatus: c.clinical_status,
        onsetDate: c.onset_datetime,
        recordedDate: c.recorded_date,
        sensitivity: (c.sensitivity_tag as SensitivityCategory) || 'GENERAL',
        sources: ['HOSP_A'],
        provenance: [
          {
            sourceId: 'HOSP_A',
            sourceName: srcCfg.sourceName,
            originalRecordId: c.resource_id,
            fetchedAt: payload.fetchedAt,
            mappingConfidence: 1.0,
            codingSystem: `FHIR Condition (ICD-10 ${c.icd10_code} / SNOMED ${c.snomed_code})`,
          },
        ],
      });
    }

    for (const m of d.medications || []) {
      bundle.medications.push({
        id: m.resource_id,
        rxNormCode: m.rxnorm_code,
        medicationName: m.med_display,
        genericName: m.generic_name,
        dosage: m.dosage_instruction,
        frequency: m.frequency_code,
        route: m.route,
        status: m.status,
        startDate: m.authored_on,
        prescriber: m.requester,
        therapeuticClass: m.therapeutic_class,
        sensitivity: (m.sensitivity_tag as SensitivityCategory) || 'GENERAL',
        sources: ['HOSP_A'],
        provenance: [
          {
            sourceId: 'HOSP_A',
            sourceName: srcCfg.sourceName,
            originalRecordId: m.resource_id,
            fetchedAt: payload.fetchedAt,
            mappingConfidence: 1.0,
            codingSystem: `RxNorm ${m.rxnorm_code}`,
          },
        ],
      });
    }

    for (const l of d.labs || []) {
      bundle.labs.push({
        id: l.resource_id,
        loincCode: l.loinc_code,
        testName: l.test_display,
        panelName: l.panel_display,
        value: l.value_quantity,
        unit: l.unit_ucum,
        referenceRangeLow: l.ref_low,
        referenceRangeHigh: l.ref_high,
        interpretation: l.interpretation_code,
        effectiveDate: l.effective_datetime,
        sensitivity: (l.sensitivity_tag as SensitivityCategory) || 'GENERAL',
        sources: ['HOSP_A'],
        provenance: [
          {
            sourceId: 'HOSP_A',
            sourceName: srcCfg.sourceName,
            originalRecordId: l.resource_id,
            fetchedAt: payload.fetchedAt,
            mappingConfidence: 1.0,
            codingSystem: `LOINC ${l.loinc_code} (${l.unit_ucum})`,
          },
        ],
      });
    }

    for (const a of d.allergies || []) {
      bundle.allergies.push({
        id: a.resource_id,
        code: a.rxnorm_or_snomed,
        system: a.code_system,
        substance: a.substance_display,
        reaction: a.reaction_manifestation,
        severity: a.severity,
        criticality: a.criticality,
        recordedDate: a.recorded_date,
        sources: ['HOSP_A'],
        provenance: [
          {
            sourceId: 'HOSP_A',
            sourceName: srcCfg.sourceName,
            originalRecordId: a.resource_id,
            fetchedAt: payload.fetchedAt,
            mappingConfidence: 1.0,
            codingSystem: `${a.code_system} ${a.rxnorm_or_snomed}`,
          },
        ],
      });
    }

    for (const e of d.encounters || []) {
      bundle.encounters.push({
        id: e.resource_id,
        encounterType: e.class_code,
        department: e.service_type,
        providerName: e.practitioner_display,
        facilityName: srcCfg.sourceName,
        startDate: e.period_start,
        endDate: e.period_end,
        primaryDiagnosis: e.reason_display,
        dischargeDisposition: e.discharge_disposition,
        summaryNote: e.clinical_note,
        sensitivity: (e.sensitivity_tag as SensitivityCategory) || 'GENERAL',
        sources: ['HOSP_A'],
        provenance: [
          {
            sourceId: 'HOSP_A',
            sourceName: srcCfg.sourceName,
            originalRecordId: e.resource_id,
            fetchedAt: payload.fetchedAt,
            mappingConfidence: 1.0,
            codingSystem: 'FHIR R4 Encounter',
          },
        ],
      });
    }

    for (const doc of d.documents || []) {
      bundle.documents.push({
        id: doc.resource_id,
        title: doc.title,
        documentType: doc.doc_type,
        createdDate: doc.created_datetime,
        author: doc.author_display,
        format: doc.format_code,
        pageCount: doc.pages,
        ocrExcerpt: doc.text_excerpt,
        sensitivity: (doc.sensitivity_tag as SensitivityCategory) || 'GENERAL',
        sources: ['HOSP_A'],
        provenance: [
          {
            sourceId: 'HOSP_A',
            sourceName: srcCfg.sourceName,
            originalRecordId: doc.resource_id,
            fetchedAt: payload.fetchedAt,
            mappingConfidence: 1.0,
            codingSystem: doc.format_code,
          },
        ],
      });
    }
  } else if (payload.sourceId === 'HOSP_B') {
    // Legacy Civil Hospital: Free-text diagnoses, DD/MM/YY dates, uncoded rx strings, scanned PDF charts
    const d = payload.data;
    for (const v of d.visits || []) {
      const isoVisitDate = normalizeLegacyDate(v.visit_dt_ddmmyy);
      const matchedLex = FREE_TEXT_ICD10_LEXICON.find((item) => item.pattern.test(v.free_text_diag));
      const confidence = matchedLex ? matchedLex.confidence : 0.55;
      const needsReview = confidence < 0.75;

      bundle.problems.push({
        id: `${v.row_id}-PROB`,
        code: matchedLex ? matchedLex.icd10 : 'R69 (Uncoded)',
        system: 'FREE-TEXT-MAPPED',
        display: matchedLex ? matchedLex.standardizedDisplay : v.free_text_diag,
        clinicalStatus: 'active',
        onsetDate: isoVisitDate,
        recordedDate: isoVisitDate,
        sensitivity: 'GENERAL',
        sources: ['HOSP_B'],
        provenance: [
          {
            sourceId: 'HOSP_B',
            sourceName: srcCfg.sourceName,
            originalRecordId: v.row_id,
            fetchedAt: payload.fetchedAt,
            mappingConfidence: confidence,
            originalText: v.free_text_diag,
            codingSystem: `Legacy Free-Text NLP -> ICD-10 (${Math.round(confidence * 100)}% conf)`,
            needsClinicianReview: needsReview,
            transformationNotes: `Normalized date '${v.visit_dt_ddmmyy}' -> '${isoVisitDate}'; mapped raw text "${v.free_text_diag}"`,
          },
        ],
      });

      // Parse semicolon/pipe separated legacy medications
      const rxParts = (v.rx_written_text || '').split('|').map((s: string) => s.trim()).filter(Boolean);
      rxParts.forEach((rxRaw: string, idx: number) => {
        let generic = rxRaw;
        let rxCode = 'LEGACY-UNMAPPED';
        let dose = 'As written';
        let freq = 'See original text';
        let theraClass = 'Legacy Prescription';

        if (/indomethacin/i.test(rxRaw)) {
          generic = 'Indomethacin';
          rxCode = '5781';
          dose = '50 mg';
          freq = 'Three times daily (TDS)';
          theraClass = 'NSAID (Nephrotoxic / Bleeding Risk)';
        } else if (/pantoprazole/i.test(rxRaw)) {
          generic = 'Pantoprazole';
          rxCode = '40790';
          dose = '40 mg';
          freq = 'Once daily (OD)';
          theraClass = 'Proton Pump Inhibitor (PPI)';
        } else if (/deriphyllin|theophylline/i.test(rxRaw)) {
          generic = 'Etofylline + Theophylline';
          rxCode = '10438';
          dose = '150 mg';
          freq = 'Twice daily (BD)';
          theraClass = 'Methylxanthine Bronchodilator';
        } else if (/shelcal|calcium/i.test(rxRaw)) {
          generic = 'Calcium Carbonate + Vitamin D3';
          rxCode = '315556';
          dose = '500 mg / 250 IU';
          freq = 'Once daily (OD)';
          theraClass = 'Mineral & Bone Supplement';
        } else if (/rosuvastatin/i.test(rxRaw)) {
          generic = 'Rosuvastatin';
          rxCode = '859751';
          dose = '20 mg';
          freq = 'Once nightly (HS)';
          theraClass = 'HMG-CoA Reductase Inhibitor (Statin)';
        } else if (/clopidogrel/i.test(rxRaw)) {
          generic = 'Clopidogrel';
          rxCode = '309362';
          dose = '75 mg';
          freq = 'Once daily (OD)';
          theraClass = 'P2Y12 Antiplatelet';
        }

        bundle.medications.push({
          id: `${v.row_id}-MED-${idx + 1}`,
          rxNormCode: rxCode,
          medicationName: rxRaw,
          genericName: generic,
          dosage: dose,
          frequency: freq,
          route: 'Oral',
          status: 'active',
          startDate: isoVisitDate,
          prescriber: v.doc_name,
          therapeuticClass: theraClass,
          sensitivity: 'GENERAL',
          sources: ['HOSP_B'],
          provenance: [
            {
              sourceId: 'HOSP_B',
              sourceName: srcCfg.sourceName,
              originalRecordId: v.row_id,
              fetchedAt: payload.fetchedAt,
              mappingConfidence: 0.85,
              originalText: rxRaw,
              codingSystem: `Legacy Free-Text Rx -> RxNorm ${rxCode}`,
            },
          ],
        });
      });

      // Allergy from legacy row
      if (v.allergy_note_raw && !/^nkda$/i.test(v.allergy_note_raw.trim())) {
        bundle.allergies.push({
          id: `${v.row_id}-ALG`,
          code: 'LOCAL-ALG-B',
          system: 'LOCAL',
          substance: v.allergy_note_raw.split('->')[0].trim(),
          reaction: v.allergy_note_raw.split('->')[1]?.trim() || v.allergy_note_raw,
          severity: 'moderate',
          criticality: 'high',
          recordedDate: isoVisitDate,
          sources: ['HOSP_B'],
          provenance: [
            {
              sourceId: 'HOSP_B',
              sourceName: srcCfg.sourceName,
              originalRecordId: v.row_id,
              fetchedAt: payload.fetchedAt,
              mappingConfidence: 0.82,
              originalText: v.allergy_note_raw,
              codingSystem: 'Legacy Free-Text Allergy Field',
            },
          ],
        });
      }

      bundle.encounters.push({
        id: `${v.row_id}-ENC`,
        encounterType: /casualty/i.test(v.dept_txt) ? 'Emergency' : 'Outpatient',
        department: v.dept_txt,
        providerName: v.doc_name,
        facilityName: srcCfg.sourceName,
        startDate: `${isoVisitDate}T10:00:00Z`,
        primaryDiagnosis: v.free_text_diag,
        summaryNote: `${v.remarks_raw} (Raw DOB recorded as '${v.pat_dob_ddmmyy}' under name '${v.pat_name_raw}')`,
        sensitivity: 'GENERAL',
        sources: ['HOSP_B'],
        provenance: [
          {
            sourceId: 'HOSP_B',
            sourceName: srcCfg.sourceName,
            originalRecordId: v.row_id,
            fetchedAt: payload.fetchedAt,
            mappingConfidence: confidence,
            originalText: v.remarks_raw,
            codingSystem: 'Legacy Flat Table Row',
          },
        ],
      });
    }

    for (const sc of d.scans || []) {
      const isoScanDate = normalizeLegacyDate(sc.scan_date_ddmmyy);
      bundle.documents.push({
        id: sc.scan_id,
        title: sc.folder_label,
        documentType: 'Scanned Legacy Chart',
        createdDate: `${isoScanDate}T09:00:00Z`,
        author: 'St. Jude Medical Records Archive (Microfilm OCR)',
        format: 'PDF/Scanned',
        pageCount: sc.page_cnt,
        ocrExcerpt: sc.ocr_snippet,
        sensitivity: 'GENERAL',
        sources: ['HOSP_B'],
        provenance: [
          {
            sourceId: 'HOSP_B',
            sourceName: srcCfg.sourceName,
            originalRecordId: sc.scan_id,
            fetchedAt: payload.fetchedAt,
            mappingConfidence: 0.78,
            codingSystem: 'Scanned Paper Chart Placeholder (OCR)',
            transformationNotes: `Converted DD/MM/YY '${sc.scan_date_ddmmyy}' -> '${isoScanDate}'`,
          },
        ],
      });
    }
  } else if (payload.sourceId === 'HOSP_C') {
    const d = payload.data;
    for (const enc of d.encounters || []) {
      const mappedDiag = HOSP_C_DIAG_MAP[enc.DIAG_LOCAL_CD] || {
        icd10: enc.DIAG_LOCAL_CD,
        display: enc.DIAG_DESC_CUSTOM,
      };

      bundle.problems.push({
        id: `${enc.ENC_SEQ_ID}-PROB`,
        code: mappedDiag.icd10,
        system: 'ICD-10',
        display: mappedDiag.display,
        clinicalStatus: 'active',
        onsetDate: enc.ADM_DT_ISO.slice(0, 10),
        recordedDate: enc.ADM_DT_ISO.slice(0, 10),
        sensitivity: 'GENERAL',
        sources: ['HOSP_C'],
        provenance: [
          {
            sourceId: 'HOSP_C',
            sourceName: srcCfg.sourceName,
            originalRecordId: enc.ENC_SEQ_ID,
            fetchedAt: payload.fetchedAt,
            mappingConfidence: 0.95,
            originalText: `${enc.DIAG_LOCAL_CD}: ${enc.DIAG_DESC_CUSTOM}`,
            codingSystem: `Local Code ${enc.DIAG_LOCAL_CD} -> ICD-10 ${mappedDiag.icd10}`,
          },
        ],
      });

      bundle.encounters.push({
        id: enc.ENC_SEQ_ID,
        encounterType: 'Outpatient',
        department: enc.CLINIC_DEPT_NM,
        providerName: enc.ATTEND_DOC_NM,
        facilityName: srcCfg.sourceName,
        startDate: enc.ADM_DT_ISO,
        primaryDiagnosis: mappedDiag.display,
        summaryNote: enc.CLIN_SUMMARY_TXT,
        sensitivity: 'GENERAL',
        sources: ['HOSP_C'],
        provenance: [
          {
            sourceId: 'HOSP_C',
            sourceName: srcCfg.sourceName,
            originalRecordId: enc.ENC_SEQ_ID,
            fetchedAt: payload.fetchedAt,
            mappingConfidence: 0.96,
            codingSystem: 'Custom Regional Table (tbl_regional_encounters)',
          },
        ],
      });
    }

    for (const rx of d.pharmacy || []) {
      const mappedDrug = HOSP_C_DRUG_RXNORM_MAP[rx.LOCAL_DRUG_CD] || {
        rxNorm: rx.LOCAL_DRUG_CD,
        class: 'General Medication',
      };
      bundle.medications.push({
        id: rx.RX_ORDER_NO,
        rxNormCode: mappedDrug.rxNorm,
        medicationName: `${rx.BRAND_LABEL} (${rx.CHEM_NAME} ${rx.DOSE_STRENGTH})`,
        genericName: rx.CHEM_NAME,
        dosage: rx.DOSE_STRENGTH,
        frequency: rx.SCHED_FREQ,
        route: 'Oral',
        status: rx.ORD_STATUS === 'ACTIVE_RX' ? 'active' : 'stopped',
        startDate: rx.ORD_DATE,
        prescriber: rx.PRESC_DOC,
        therapeuticClass: mappedDrug.class,
        sensitivity: 'GENERAL',
        sources: ['HOSP_C'],
        provenance: [
          {
            sourceId: 'HOSP_C',
            sourceName: srcCfg.sourceName,
            originalRecordId: rx.RX_ORDER_NO,
            fetchedAt: payload.fetchedAt,
            mappingConfidence: 0.96,
            originalText: `${rx.LOCAL_DRUG_CD}: ${rx.BRAND_LABEL} ${rx.DOSE_STRENGTH}`,
            codingSystem: `Local Drug Code ${rx.LOCAL_DRUG_CD} -> RxNorm ${mappedDrug.rxNorm}`,
          },
        ],
      });
    }

    for (const lab of d.labs || []) {
      // UNIT NORMALIZATION: Convert SI units (umol/L Creatinine -> mg/dL; mmol/L Glucose -> mg/dL)
      let loinc = '2160-0';
      let canonicalTestName = lab.ANALYTE_LABEL;
      let panel = 'General Biochemistry';
      let normalizedVal = lab.LAB_VAL_RAW;
      let normalizedUnit: string = lab.LAB_UNIT_STR;
      let refLow = 0.7;
      let refHigh = 1.3;
      let notes = '';

      if (lab.LOCAL_ANALYTE_CD === 'CREAT_SI' && lab.LAB_UNIT_STR === 'umol/L') {
        loinc = '2160-0';
        canonicalTestName = 'Serum Creatinine';
        panel = 'Renal Function Panel';
        normalizedVal = Number((lab.LAB_VAL_RAW / 88.4).toFixed(2));
        normalizedUnit = 'mg/dL';
        refLow = 0.7;
        refHigh = 1.3;
        notes = `Converted SI ${lab.LAB_VAL_RAW} umol/L -> ${normalizedVal} mg/dL (factor ÷ 88.4)`;
      } else if (lab.LOCAL_ANALYTE_CD === 'GLU_FAST_SI' && lab.LAB_UNIT_STR === 'mmol/L') {
        loinc = '2345-7';
        canonicalTestName = 'Fasting Plasma Glucose';
        panel = 'Glycemic Control Panel';
        normalizedVal = Number((lab.LAB_VAL_RAW * 18.0182).toFixed(1));
        normalizedUnit = 'mg/dL';
        refLow = 70;
        refHigh = 100;
        notes = `Converted SI ${lab.LAB_VAL_RAW} mmol/L -> ${normalizedVal} mg/dL (factor × 18.018)`;
      } else if (lab.LOCAL_ANALYTE_CD === 'HBA1C_PCT') {
        loinc = '4548-4';
        canonicalTestName = 'Hemoglobin A1c (HbA1c)';
        panel = 'Glycemic Control Panel';
        refLow = 4.0;
        refHigh = 6.4;
      }

      bundle.labs.push({
        id: lab.LAB_ROW_ID,
        loincCode: loinc,
        testName: canonicalTestName,
        panelName: panel,
        value: normalizedVal,
        unit: normalizedUnit,
        originalValue: lab.LAB_VAL_RAW,
        originalUnit: lab.LAB_UNIT_STR,
        referenceRangeLow: refLow,
        referenceRangeHigh: refHigh,
        interpretation: lab.FLAG_IND === 'HIGH' ? 'H' : lab.FLAG_IND === 'CRIT_HIGH' ? 'HH' : 'N',
        effectiveDate: lab.SPECIMEN_DT,
        sensitivity: 'GENERAL',
        sources: ['HOSP_C'],
        provenance: [
          {
            sourceId: 'HOSP_C',
            sourceName: srcCfg.sourceName,
            originalRecordId: lab.LAB_ROW_ID,
            fetchedAt: payload.fetchedAt,
            mappingConfidence: 0.98,
            originalText: `${lab.ANALYTE_LABEL}: ${lab.LAB_VAL_RAW} ${lab.LAB_UNIT_STR}`,
            codingSystem: `Local ${lab.LOCAL_ANALYTE_CD} -> LOINC ${loinc}`,
            transformationNotes: notes || 'Standard unit verified',
          },
        ],
      });
    }
  } else if (payload.sourceId === 'HOSP_D') {
    const d = payload.data;
    for (const l of d.labs || []) {
      bundle.labs.push({
        id: l.order_id,
        loincCode: l.loinc_cd,
        testName: l.test_name,
        panelName: l.panel_name,
        value: l.result_num,
        unit: l.unit_std,
        referenceRangeLow: l.ref_min,
        referenceRangeHigh: l.ref_max,
        interpretation: l.abn_flag,
        effectiveDate: l.collected_at,
        sensitivity: 'GENERAL',
        sources: ['HOSP_D'],
        provenance: [
          {
            sourceId: 'HOSP_D',
            sourceName: srcCfg.sourceName,
            originalRecordId: l.order_id,
            fetchedAt: payload.fetchedAt,
            mappingConfidence: 0.99,
            codingSystem: `LOINC ${l.loinc_cd}`,
          },
        ],
      });
    }

    for (const img of d.imaging || []) {
      bundle.imaging.push({
        id: img.study_uid,
        modality: img.modality,
        cptCode: img.cpt_code,
        bodySite: img.anatomical_region,
        studyDate: img.performed_at,
        radiologist: img.radiologist_name,
        impression: img.impression_summary,
        findings: img.detailed_findings,
        status: 'final',
        sources: ['HOSP_D'],
        provenance: [
          {
            sourceId: 'HOSP_D',
            sourceName: srcCfg.sourceName,
            originalRecordId: img.study_uid,
            fetchedAt: payload.fetchedAt,
            mappingConfidence: 0.99,
            codingSystem: `CPT-4 ${img.cpt_code} / DICOM`,
          },
        ],
      });
    }

    for (const disp of d.dispenses || []) {
      bundle.medications.push({
        id: disp.dispense_id,
        rxNormCode: disp.rxnorm_code,
        medicationName: `${disp.dispensed_brand} (${disp.generic_ingredient} ${disp.strength})`,
        genericName: disp.generic_ingredient,
        dosage: disp.strength,
        frequency: `${disp.directions} (Refill due: ${disp.refill_due_date})`,
        route: 'Oral',
        status: 'dispensed-only',
        startDate: disp.last_dispensed_date,
        prescriber: 'Retail Pharmacy Dispense Record',
        therapeuticClass: disp.therapeutic_group,
        sensitivity: 'GENERAL',
        sources: ['HOSP_D'],
        provenance: [
          {
            sourceId: 'HOSP_D',
            sourceName: srcCfg.sourceName,
            originalRecordId: disp.dispense_id,
            fetchedAt: payload.fetchedAt,
            mappingConfidence: 0.97,
            originalText: `Dispensed ${disp.days_supply}d supply on ${disp.last_dispensed_date}; due ${disp.refill_due_date}`,
            codingSystem: `RxNorm ${disp.rxnorm_code} (Pharmacy Fill)`,
          },
        ],
      });
    }
  } else if (payload.sourceId === 'PAYER_CLAIMS') {
    for (const c of payload.data.claims || []) {
      bundle.claims.push({
        id: c.claim_id,
        claimNumber: c.claim_id,
        serviceDate: c.service_date,
        cptCodes: c.cpt_codes,
        icd10Codes: c.icd10_codes,
        facilityName: c.facility_name,
        billedAmountInr: c.billed_inr,
        allowedAmountInr: c.allowed_inr,
        paidAmountInr: c.paid_inr,
        status: c.status,
        payerName: c.payer_name,
        sources: ['PAYER_CLAIMS'],
        provenance: [
          {
            sourceId: 'PAYER_CLAIMS',
            sourceName: srcCfg.sourceName,
            originalRecordId: c.claim_id,
            fetchedAt: payload.fetchedAt,
            mappingConfidence: 1.0,
            codingSystem: 'HCX / X12 837 Claim',
          },
        ],
      });
    }
  } else if (payload.sourceId === 'IMM_REG') {
    for (const imm of payload.data.immunizations || []) {
      bundle.immunizations.push({
        id: imm.imm_id,
        cvxCode: imm.cvx_code,
        vaccineName: imm.vaccine_name,
        occurrenceDate: imm.occurrence_date,
        lotNumber: imm.lot_number,
        doseNumber: imm.dose_number,
        status: imm.status,
        sources: ['IMM_REG'],
        provenance: [
          {
            sourceId: 'IMM_REG',
            sourceName: srcCfg.sourceName,
            originalRecordId: imm.imm_id,
            fetchedAt: payload.fetchedAt,
            mappingConfidence: 1.0,
            codingSystem: `CDC CVX ${imm.cvx_code}`,
          },
        ],
      });
    }
  }

  return bundle;
}
