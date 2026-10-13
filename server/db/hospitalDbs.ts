import fs from 'fs';
import path from 'path';

const DB_DIR = path.resolve(process.cwd(), 'server/db/storage');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// ============================================================================
// 1. HOSPITAL A (MODERN FHIR-STYLE SQLITE DB: hospital_a_fhir.sqlite.json)
// Schema: fhir_condition, fhir_medication_request, fhir_observation_lab,
//         fhir_allergy_intolerance, fhir_encounter, fhir_document_reference
// Coded in ICD-10, RxNorm, LOINC, SNOMED-CT, ISO-8601 timestamps
// ============================================================================
export interface HospitalADatabase {
  databaseFile: string;
  ddl: string;
  fhir_condition: Array<{
    resource_id: string;
    patient_ref: string;
    icd10_code: string;
    snomed_code: string;
    display_text: string;
    clinical_status: 'active' | 'resolved' | 'inactive';
    onset_datetime: string;
    recorded_date: string;
    sensitivity_tag: string;
  }>;
  fhir_medication_request: Array<{
    resource_id: string;
    patient_ref: string;
    rxnorm_code: string;
    med_display: string;
    generic_name: string;
    dosage_instruction: string;
    frequency_code: string;
    route: string;
    status: 'active' | 'completed' | 'stopped';
    authored_on: string;
    requester: string;
    therapeutic_class: string;
    sensitivity_tag: string;
  }>;
  fhir_observation_lab: Array<{
    resource_id: string;
    patient_ref: string;
    loinc_code: string;
    test_display: string;
    panel_display: string;
    value_quantity: number;
    unit_ucum: string;
    ref_low: number;
    ref_high: number;
    interpretation_code: 'N' | 'H' | 'L' | 'HH' | 'LL';
    effective_datetime: string;
    sensitivity_tag: string;
  }>;
  fhir_allergy_intolerance: Array<{
    resource_id: string;
    patient_ref: string;
    rxnorm_or_snomed: string;
    code_system: 'RxNorm' | 'SNOMED-CT';
    substance_display: string;
    reaction_manifestation: string;
    severity: 'mild' | 'moderate' | 'severe';
    criticality: 'low' | 'high';
    recorded_date: string;
  }>;
  fhir_encounter: Array<{
    resource_id: string;
    patient_ref: string;
    class_code: 'Inpatient' | 'Outpatient' | 'Emergency' | 'Telehealth';
    service_type: string;
    practitioner_display: string;
    period_start: string;
    period_end: string;
    reason_display: string;
    discharge_disposition: string;
    clinical_note: string;
    sensitivity_tag: string;
  }>;
  fhir_document_reference: Array<{
    resource_id: string;
    patient_ref: string;
    doc_type: 'Discharge Summary' | 'Operative Note' | 'Psychiatric Eval';
    title: string;
    created_datetime: string;
    author_display: string;
    format_code: 'FHIR-Bundle' | 'HL7-CDA';
    pages: number;
    text_excerpt: string;
    sensitivity_tag: string;
  }>;
}

const INITIAL_HOSP_A: HospitalADatabase = {
  databaseFile: 'hospital_a_fhir.sqlite.json',
  ddl: `
    CREATE TABLE fhir_condition (resource_id TEXT PRIMARY KEY, patient_ref TEXT, icd10_code TEXT, snomed_code TEXT, display_text TEXT, clinical_status TEXT, onset_datetime TEXT, recorded_date TEXT, sensitivity_tag TEXT);
    CREATE TABLE fhir_medication_request (resource_id TEXT PRIMARY KEY, patient_ref TEXT, rxnorm_code TEXT, med_display TEXT, generic_name TEXT, dosage_instruction TEXT, frequency_code TEXT, route TEXT, status TEXT, authored_on TEXT, requester TEXT, therapeutic_class TEXT, sensitivity_tag TEXT);
    CREATE TABLE fhir_observation_lab (resource_id TEXT PRIMARY KEY, patient_ref TEXT, loinc_code TEXT, test_display TEXT, panel_display TEXT, value_quantity REAL, unit_ucum TEXT, ref_low REAL, ref_high REAL, interpretation_code TEXT, effective_datetime TEXT, sensitivity_tag TEXT);
  `,
  fhir_condition: [
    // MPI-1001: Rameshwar Kumar Sharma (FHIR-PAT-8801)
    {
      resource_id: 'HA-COND-101',
      patient_ref: 'FHIR-PAT-8801',
      icd10_code: 'I50.22',
      snomed_code: '441481004',
      display_text: 'Chronic systolic (congestive) heart failure (HFrEF, EF 38%)',
      clinical_status: 'active',
      onset_datetime: '2022-06-10',
      recorded_date: '2026-10-10',
      sensitivity_tag: 'GENERAL',
    },
    {
      resource_id: 'HA-COND-102',
      patient_ref: 'FHIR-PAT-8801',
      icd10_code: 'E11.22',
      snomed_code: '422034002',
      display_text: 'Type 2 diabetes mellitus with diabetic chronic kidney disease',
      clinical_status: 'active',
      onset_datetime: '2015-03-18',
      recorded_date: '2026-10-10',
      sensitivity_tag: 'GENERAL',
    },
    {
      resource_id: 'HA-COND-103',
      patient_ref: 'FHIR-PAT-8801',
      icd10_code: 'N18.32',
      snomed_code: '709044004',
      display_text: 'Chronic kidney disease, stage 3b (moderate)',
      clinical_status: 'active',
      onset_datetime: '2023-11-04',
      recorded_date: '2026-10-10',
      sensitivity_tag: 'GENERAL',
    },
    {
      resource_id: 'HA-COND-104',
      patient_ref: 'FHIR-PAT-8801',
      icd10_code: 'I48.91',
      snomed_code: '49436004',
      display_text: 'Unspecified atrial fibrillation',
      clinical_status: 'active',
      onset_datetime: '2024-02-14',
      recorded_date: '2026-10-10',
      sensitivity_tag: 'GENERAL',
    },
    {
      resource_id: 'HA-COND-105',
      patient_ref: 'FHIR-PAT-8801',
      icd10_code: 'F32.1',
      snomed_code: '310496002',
      display_text: 'Major depressive disorder, single episode, moderate (Geriatric bereavement)',
      clinical_status: 'active',
      onset_datetime: '2025-05-20',
      recorded_date: '2026-09-12',
      sensitivity_tag: 'MENTAL_HEALTH',
    },
    // MPI-1002: Mohammed Abdul Qadir (FHIR-PAT-8829)
    {
      resource_id: 'HA-COND-201',
      patient_ref: 'FHIR-PAT-8829',
      icd10_code: 'J44.1',
      snomed_code: '13645005',
      display_text: 'Chronic obstructive pulmonary disease with (acute) exacerbation',
      clinical_status: 'active',
      onset_datetime: '2019-11-01',
      recorded_date: '2026-10-05',
      sensitivity_tag: 'GENERAL',
    },
    {
      resource_id: 'HA-COND-202',
      patient_ref: 'FHIR-PAT-8829',
      icd10_code: 'I10',
      snomed_code: '38341003',
      display_text: 'Essential (primary) hypertension',
      clinical_status: 'active',
      onset_datetime: '2012-05-10',
      recorded_date: '2026-10-05',
      sensitivity_tag: 'GENERAL',
    },
    // MPI-1003: Meera Nair Deshmukh (FHIR-PAT-8910)
    {
      resource_id: 'HA-COND-301',
      patient_ref: 'FHIR-PAT-8910',
      icd10_code: 'E03.9',
      snomed_code: '40930008',
      display_text: 'Hypothyroidism, unspecified',
      clinical_status: 'active',
      onset_datetime: '2016-08-12',
      recorded_date: '2026-10-07',
      sensitivity_tag: 'GENERAL',
    },
    {
      resource_id: 'HA-COND-302',
      patient_ref: 'FHIR-PAT-8910',
      icd10_code: 'M81.0',
      snomed_code: '64859006',
      display_text: 'Age-related osteoporosis without current pathological fracture',
      clinical_status: 'active',
      onset_datetime: '2023-04-19',
      recorded_date: '2026-10-07',
      sensitivity_tag: 'GENERAL',
    },
    // MPI-1004: Lakshmi Narayanan Iyer (FHIR-PAT-9004)
    {
      resource_id: 'HA-COND-401',
      patient_ref: 'FHIR-PAT-9004',
      icd10_code: 'H40.1132',
      snomed_code: '23986001',
      display_text: 'Primary open-angle glaucoma, bilateral, moderate stage',
      clinical_status: 'active',
      onset_datetime: '2021-09-14',
      recorded_date: '2026-10-09',
      sensitivity_tag: 'GENERAL',
    },
    // MPI-1005: Vikramjit Singh Gill (FHIR-PAT-9055) - Restricted patient with sensitive diagnoses
    {
      resource_id: 'HA-COND-501',
      patient_ref: 'FHIR-PAT-9055',
      icd10_code: 'K70.30',
      snomed_code: '7111000119109',
      display_text: 'Alcoholic cirrhosis of liver without ascites',
      clinical_status: 'active',
      onset_datetime: '2023-01-15',
      recorded_date: '2026-10-11',
      sensitivity_tag: 'SUBSTANCE_USE',
    },
    {
      resource_id: 'HA-COND-502',
      patient_ref: 'FHIR-PAT-9055',
      icd10_code: 'F10.20',
      snomed_code: '15167005',
      display_text: 'Alcohol dependence, uncomplicated (In sustained remission Counseling)',
      clinical_status: 'active',
      onset_datetime: '2021-06-01',
      recorded_date: '2026-10-11',
      sensitivity_tag: 'SUBSTANCE_USE',
    },
    {
      resource_id: 'HA-COND-503',
      patient_ref: 'FHIR-PAT-9055',
      icd10_code: 'I10',
      snomed_code: '38341003',
      display_text: 'Essential (primary) hypertension',
      clinical_status: 'active',
      onset_datetime: '2018-03-11',
      recorded_date: '2026-10-11',
      sensitivity_tag: 'GENERAL',
    },
    // MPI-1006: Saraswati Devi Venkataraman (FHIR-PAT-9106)
    {
      resource_id: 'HA-COND-601',
      patient_ref: 'FHIR-PAT-9106',
      icd10_code: 'I25.10',
      snomed_code: '53741008',
      display_text: 'Atherosclerotic heart disease of native coronary artery without angina pectoris',
      clinical_status: 'active',
      onset_datetime: '2020-02-10',
      recorded_date: '2026-10-01',
      sensitivity_tag: 'GENERAL',
    },
    // MPI-1008: Subhash Chandra Bose Roy (FHIR-PAT-9208) - Age 92
    {
      resource_id: 'HA-COND-801',
      patient_ref: 'FHIR-PAT-9208',
      icd10_code: 'G20',
      snomed_code: '49049000',
      display_text: 'Parkinson disease, dyskinesia-predominant',
      clinical_status: 'active',
      onset_datetime: '2019-07-01',
      recorded_date: '2026-10-03',
      sensitivity_tag: 'GENERAL',
    },
    // MPI-1009, 1011, 1012
    {
      resource_id: 'HA-COND-901',
      patient_ref: 'FHIR-PAT-9309',
      icd10_code: 'I13.0',
      snomed_code: '194779001',
      display_text: 'Hypertensive heart and chronic kidney disease with heart failure',
      clinical_status: 'active',
      onset_datetime: '2022-04-12',
      recorded_date: '2026-10-06',
      sensitivity_tag: 'GENERAL',
    },
    {
      resource_id: 'HA-COND-1101',
      patient_ref: 'FHIR-PAT-9511',
      icd10_code: 'M05.79',
      snomed_code: '69896004',
      display_text: 'Rheumatoid arthritis with rheumatoid factor of multiple sites',
      clinical_status: 'active',
      onset_datetime: '2014-09-20',
      recorded_date: '2026-10-04',
      sensitivity_tag: 'GENERAL',
    },
    {
      resource_id: 'HA-COND-1201',
      patient_ref: 'FHIR-PAT-9612',
      icd10_code: 'I69.351',
      snomed_code: '422504002',
      display_text: 'Hemiplegia and hemiparesis following cerebral infarction affecting right dominant side',
      clinical_status: 'active',
      onset_datetime: '2024-11-10',
      recorded_date: '2026-10-08',
      sensitivity_tag: 'GENERAL',
    },
  ],
  fhir_medication_request: [
    // MPI-1001: Note conflicting dose of Metoprolol with Hospital C (25mg vs 50mg) and Apixaban
    {
      resource_id: 'HA-MED-101',
      patient_ref: 'FHIR-PAT-8801',
      rxnorm_code: '866427',
      med_display: 'Metoprolol Succinate Extended-Release 25 MG Oral Tablet',
      generic_name: 'Metoprolol Succinate',
      dosage_instruction: '25 mg',
      frequency_code: 'Once daily (OD)',
      route: 'Oral',
      status: 'active',
      authored_on: '2026-10-10',
      requester: 'Dr. Aravind Krishnan, MD',
      therapeutic_class: 'Beta-Adrenergic Blocker',
      sensitivity_tag: 'GENERAL',
    },
    {
      resource_id: 'HA-MED-102',
      patient_ref: 'FHIR-PAT-8801',
      rxnorm_code: '1364430',
      med_display: 'Apixaban 5 MG Oral Tablet',
      generic_name: 'Apixaban',
      dosage_instruction: '5 mg',
      frequency_code: 'Twice daily (BD)',
      route: 'Oral',
      status: 'active',
      authored_on: '2026-10-10',
      requester: 'Dr. Aravind Krishnan, MD',
      therapeutic_class: 'Direct Oral Anticoagulant (DOAC)',
      sensitivity_tag: 'GENERAL',
    },
    {
      resource_id: 'HA-MED-103',
      patient_ref: 'FHIR-PAT-8801',
      rxnorm_code: '1545653',
      med_display: 'Dapagliflozin 10 MG Oral Tablet',
      generic_name: 'Dapagliflozin',
      dosage_instruction: '10 mg',
      frequency_code: 'Once daily (Morning)',
      route: 'Oral',
      status: 'active',
      authored_on: '2026-10-10',
      requester: 'Dr. Aravind Krishnan, MD',
      therapeutic_class: 'SGLT2 Inhibitor',
      sensitivity_tag: 'GENERAL',
    },
    {
      resource_id: 'HA-MED-104',
      patient_ref: 'FHIR-PAT-8801',
      rxnorm_code: '4603',
      med_display: 'Furosemide 40 MG Oral Tablet',
      generic_name: 'Furosemide',
      dosage_instruction: '40 mg',
      frequency_code: 'Once daily (Morning)',
      route: 'Oral',
      status: 'active',
      authored_on: '2026-10-10',
      requester: 'Dr. Aravind Krishnan, MD',
      therapeutic_class: 'Loop Diuretic',
      sensitivity_tag: 'GENERAL',
    },
    {
      resource_id: 'HA-MED-105',
      patient_ref: 'FHIR-PAT-8801',
      rxnorm_code: '32937',
      med_display: 'Escitalopram 10 MG Oral Tablet',
      generic_name: 'Escitalopram',
      dosage_instruction: '10 mg',
      frequency_code: 'Once daily at bedtime',
      route: 'Oral',
      status: 'active',
      authored_on: '2026-09-12',
      requester: 'Dr. S. Kulkarni (Geriatric Psychiatry)',
      therapeutic_class: 'SSRI Antidepressant',
      sensitivity_tag: 'MENTAL_HEALTH',
    },
    // MPI-1002
    {
      resource_id: 'HA-MED-201',
      patient_ref: 'FHIR-PAT-8829',
      rxnorm_code: '896188',
      med_display: 'Tiotropium 18 MCG Inhalation Capsule',
      generic_name: 'Tiotropium Bromide',
      dosage_instruction: '18 mcg',
      frequency_code: 'Once daily inhalation',
      route: 'Inhalation',
      status: 'active',
      authored_on: '2026-10-05',
      requester: 'Dr. Aravind Krishnan, MD',
      therapeutic_class: 'LAMA Bronchodilator',
      sensitivity_tag: 'GENERAL',
    },
    // MPI-1003
    {
      resource_id: 'HA-MED-301',
      patient_ref: 'FHIR-PAT-8910',
      rxnorm_code: '966247',
      med_display: 'Levothyroxine Sodium 75 MCG Oral Tablet',
      generic_name: 'Levothyroxine',
      dosage_instruction: '75 mcg',
      frequency_code: 'Once daily empty stomach',
      route: 'Oral',
      status: 'active',
      authored_on: '2026-10-07',
      requester: 'Dr. Aravind Krishnan, MD',
      therapeutic_class: 'Thyroid Hormone Replacement',
      sensitivity_tag: 'GENERAL',
    },
    // MPI-1004
    {
      resource_id: 'HA-MED-401',
      patient_ref: 'FHIR-PAT-9004',
      rxnorm_code: '311269',
      med_display: 'Latanoprost 0.005% Ophthalmic Solution',
      generic_name: 'Latanoprost',
      dosage_instruction: '1 drop both eyes',
      frequency_code: 'Nightly (HS)',
      route: 'Ophthalmic',
      status: 'active',
      authored_on: '2026-10-09',
      requester: 'Dr. N. Prabhu (Ophthalmology)',
      therapeutic_class: 'Prostaglandin Analog',
      sensitivity_tag: 'GENERAL',
    },
    // MPI-1005
    {
      resource_id: 'HA-MED-501',
      patient_ref: 'FHIR-PAT-9055',
      rxnorm_code: '352385',
      med_display: 'Naltrexone Hydrochloride 50 MG Oral Tablet',
      generic_name: 'Naltrexone',
      dosage_instruction: '50 mg',
      frequency_code: 'Once daily',
      route: 'Oral',
      status: 'active',
      authored_on: '2026-10-11',
      requester: 'Dr. R. Hegde (Hepatology & Addiction Medicine)',
      therapeutic_class: 'Opioid Antagonist / AUD Therapy',
      sensitivity_tag: 'SUBSTANCE_USE',
    },
    {
      resource_id: 'HA-MED-502',
      patient_ref: 'FHIR-PAT-9055',
      rxnorm_code: '197361',
      med_display: 'Amlodipine 5 MG Oral Tablet',
      generic_name: 'Amlodipine',
      dosage_instruction: '5 mg',
      frequency_code: 'Once daily',
      route: 'Oral',
      status: 'active',
      authored_on: '2026-10-11',
      requester: 'Dr. R. Hegde',
      therapeutic_class: 'Calcium Channel Blocker',
      sensitivity_tag: 'GENERAL',
    },
    // MPI-1006
    {
      resource_id: 'HA-MED-601',
      patient_ref: 'FHIR-PAT-9106',
      rxnorm_code: '617312',
      med_display: 'Atorvastatin 40 MG Oral Tablet',
      generic_name: 'Atorvastatin',
      dosage_instruction: '40 mg',
      frequency_code: 'Once nightly',
      route: 'Oral',
      status: 'active',
      authored_on: '2026-10-01',
      requester: 'Dr. Aravind Krishnan, MD',
      therapeutic_class: 'HMG-CoA Reductase Inhibitor (Statin)',
      sensitivity_tag: 'GENERAL',
    },
    // MPI-1008
    {
      resource_id: 'HA-MED-801',
      patient_ref: 'FHIR-PAT-9208',
      rxnorm_code: '197440',
      med_display: 'Carbidopa 25 MG / Levodopa 100 MG Oral Tablet',
      generic_name: 'Carbidopa / Levodopa',
      dosage_instruction: '25/100 mg',
      frequency_code: 'Three times daily (TDS)',
      route: 'Oral',
      status: 'active',
      authored_on: '2026-10-03',
      requester: 'Dr. Aravind Krishnan, MD',
      therapeutic_class: 'Dopamine Precursor',
      sensitivity_tag: 'GENERAL',
    },
  ],
  fhir_observation_lab: [
    // Longitudinal Creatinine, eGFR, HbA1c, and Potassium for MPI-1001 showing worsening renal trend!
    {
      resource_id: 'HA-LAB-101',
      patient_ref: 'FHIR-PAT-8801',
      loinc_code: '2160-0',
      test_display: 'Serum Creatinine',
      panel_display: 'Renal Function Panel',
      value_quantity: 1.42,
      unit_ucum: 'mg/dL',
      ref_low: 0.7,
      ref_high: 1.3,
      interpretation_code: 'H',
      effective_datetime: '2026-04-12T08:30:00Z',
      sensitivity_tag: 'GENERAL',
    },
    {
      resource_id: 'HA-LAB-102',
      patient_ref: 'FHIR-PAT-8801',
      loinc_code: '2160-0',
      test_display: 'Serum Creatinine',
      panel_display: 'Renal Function Panel',
      value_quantity: 1.88,
      unit_ucum: 'mg/dL',
      ref_low: 0.7,
      ref_high: 1.3,
      interpretation_code: 'H',
      effective_datetime: '2026-10-10T09:15:00Z',
      sensitivity_tag: 'GENERAL',
    },
    {
      resource_id: 'HA-LAB-103',
      patient_ref: 'FHIR-PAT-8801',
      loinc_code: '4548-4',
      test_display: 'Hemoglobin A1c (HbA1c)',
      panel_display: 'Glycemic Control Panel',
      value_quantity: 7.4,
      unit_ucum: '%',
      ref_low: 4.0,
      ref_high: 6.4,
      interpretation_code: 'H',
      effective_datetime: '2026-04-12T08:30:00Z',
      sensitivity_tag: 'GENERAL',
    },
    {
      resource_id: 'HA-LAB-104',
      patient_ref: 'FHIR-PAT-8801',
      loinc_code: '4548-4',
      test_display: 'Hemoglobin A1c (HbA1c)',
      panel_display: 'Glycemic Control Panel',
      value_quantity: 8.3,
      unit_ucum: '%',
      ref_low: 4.0,
      ref_high: 6.4,
      interpretation_code: 'H',
      effective_datetime: '2026-10-10T09:15:00Z',
      sensitivity_tag: 'GENERAL',
    },
    {
      resource_id: 'HA-LAB-105',
      patient_ref: 'FHIR-PAT-8801',
      loinc_code: '33762-6',
      test_display: 'NT-proBNP',
      panel_display: 'Cardiac Biomarkers',
      value_quantity: 1480,
      unit_ucum: 'pg/mL',
      ref_low: 0,
      ref_high: 450,
      interpretation_code: 'HH',
      effective_datetime: '2026-10-10T09:15:00Z',
      sensitivity_tag: 'GENERAL',
    },
    {
      resource_id: 'HA-LAB-106',
      patient_ref: 'FHIR-PAT-8801',
      loinc_code: '2823-3',
      test_display: 'Serum Potassium',
      panel_display: 'Renal Function Panel',
      value_quantity: 5.3,
      unit_ucum: 'mmol/L',
      ref_low: 3.5,
      ref_high: 5.0,
      interpretation_code: 'H',
      effective_datetime: '2026-10-10T09:15:00Z',
      sensitivity_tag: 'GENERAL',
    },
    // MPI-1002
    {
      resource_id: 'HA-LAB-201',
      patient_ref: 'FHIR-PAT-8829',
      loinc_code: '718-7',
      test_display: 'Hemoglobin',
      panel_display: 'Complete Blood Count',
      value_quantity: 15.8,
      unit_ucum: 'g/dL',
      ref_low: 13.0,
      ref_high: 17.0,
      interpretation_code: 'N',
      effective_datetime: '2026-10-05T10:00:00Z',
      sensitivity_tag: 'GENERAL',
    },
    // MPI-1003
    {
      resource_id: 'HA-LAB-301',
      patient_ref: 'FHIR-PAT-8910',
      loinc_code: '3016-3',
      test_display: 'TSH (Thyrotropin)',
      panel_display: 'Thyroid Panel',
      value_quantity: 6.8,
      unit_ucum: 'mIU/L',
      ref_low: 0.45,
      ref_high: 4.5,
      interpretation_code: 'H',
      effective_datetime: '2026-10-07T09:00:00Z',
      sensitivity_tag: 'GENERAL',
    },
    // MPI-1005
    {
      resource_id: 'HA-LAB-501',
      patient_ref: 'FHIR-PAT-9055',
      loinc_code: '1920-8',
      test_display: 'AST (SGOT)',
      panel_display: 'Hepatic Function Panel',
      value_quantity: 84,
      unit_ucum: 'U/L',
      ref_low: 10,
      ref_high: 40,
      interpretation_code: 'H',
      effective_datetime: '2026-10-11T08:00:00Z',
      sensitivity_tag: 'GENERAL',
    },
  ],
  fhir_allergy_intolerance: [
    // MPI-1001: Severe Penicillin / Beta-lactam allergy
    {
      resource_id: 'HA-ALG-101',
      patient_ref: 'FHIR-PAT-8801',
      rxnorm_or_snomed: '7984',
      code_system: 'RxNorm',
      substance_display: 'Penicillin G / Beta-Lactam Antibiotics',
      reaction_manifestation: 'Anaphylaxis, laryngeal edema, generalized urticaria',
      severity: 'severe',
      criticality: 'high',
      recorded_date: '2021-05-11',
    },
    {
      resource_id: 'HA-ALG-102',
      patient_ref: 'FHIR-PAT-8801',
      rxnorm_or_snomed: '29849002',
      code_system: 'SNOMED-CT',
      substance_display: 'Iodinated Contrast Media',
      reaction_manifestation: 'Acute bronchospasm and flushing',
      severity: 'moderate',
      criticality: 'high',
      recorded_date: '2023-08-19',
    },
    // MPI-1002
    {
      resource_id: 'HA-ALG-201',
      patient_ref: 'FHIR-PAT-8829',
      rxnorm_or_snomed: '1191',
      code_system: 'RxNorm',
      substance_display: 'Aspirin / NSAIDs',
      reaction_manifestation: 'NSAID-induced bronchospasm (Samter triad risk)',
      severity: 'severe',
      criticality: 'high',
      recorded_date: '2022-01-14',
    },
    // MPI-1003
    {
      resource_id: 'HA-ALG-301',
      patient_ref: 'FHIR-PAT-8910',
      rxnorm_or_snomed: '91936005',
      code_system: 'SNOMED-CT',
      substance_display: 'Sulfonamide Antibiotics (Cotrimoxazole)',
      reaction_manifestation: 'Maculopapular rash and pruritus',
      severity: 'moderate',
      criticality: 'low',
      recorded_date: '2018-11-20',
    },
  ],
  fhir_encounter: [
    {
      resource_id: 'HA-ENC-101',
      patient_ref: 'FHIR-PAT-8801',
      class_code: 'Outpatient',
      service_type: 'Geriatric Cardiology & Heart Failure Clinic',
      practitioner_display: 'Dr. Aravind Krishnan, MD',
      period_start: '2026-10-10T09:00:00Z',
      period_end: '2026-10-10T10:15:00Z',
      reason_display: 'Decompensated HFrEF follow-up and rising serum creatinine',
      discharge_disposition: 'Home with Care Coordinator follow-up',
      clinical_note:
        '75M with HFrEF (EF 38%), AFib on Apixaban 5mg BD, and Stage 3b CKD. Noted mild bilateral pedal edema and creatinine rise from 1.42 to 1.88 mg/dL. Maintained Metoprolol Succinate at 25mg OD due to borderline bradycardia (HR 56 bpm). Advised strict fluid restriction.',
      sensitivity_tag: 'GENERAL',
    },
    {
      resource_id: 'HA-ENC-102',
      patient_ref: 'FHIR-PAT-8801',
      class_code: 'Outpatient',
      service_type: 'Geriatric Psychiatry & Behavioral Health',
      practitioner_display: 'Dr. S. Kulkarni, MD (Psychiatry)',
      period_start: '2026-09-12T14:00:00Z',
      period_end: '2026-09-12T15:00:00Z',
      reason_display: 'Geriatric depressive episode assessment',
      discharge_disposition: 'Outpatient psychotherapy + SSRI continuation',
      clinical_note:
        'SENSITIVE BEHAVIORAL HEALTH NOTE: Patient reports persistent low mood and insomnia following loss of brother. PHQ-9 score 13. Continuing Escitalopram 10mg HS; no suicidal ideation.',
      sensitivity_tag: 'MENTAL_HEALTH',
    },
    {
      resource_id: 'HA-ENC-501',
      patient_ref: 'FHIR-PAT-9055',
      class_code: 'Outpatient',
      service_type: 'Hepatology & Addiction Medicine',
      practitioner_display: 'Dr. R. Hegde, DM',
      period_start: '2026-10-11T08:30:00Z',
      period_end: '2026-10-11T09:30:00Z',
      reason_display: 'Alcoholic cirrhosis surveillance and AUD relapse prevention',
      discharge_disposition: 'Continue Naltrexone 50mg and ultrasound surveillance',
      clinical_note:
        '42 CFR Part 2 / DPDP Sensitive Substance Use Record: Patient maintains abstinence for 8 months. MELD-Na score 11. Continue Naltrexone 50mg OD.',
      sensitivity_tag: 'SUBSTANCE_USE',
    },
  ],
  fhir_document_reference: [
    {
      resource_id: 'HA-DOC-101',
      patient_ref: 'FHIR-PAT-8801',
      doc_type: 'Discharge Summary',
      title: 'FHIR Coronary Care Unit Discharge Bundle (AFib Rapid Ventricular Response)',
      created_datetime: '2026-02-18T16:30:00Z',
      author_display: 'Dr. Aravind Krishnan, MD',
      format_code: 'FHIR-Bundle',
      pages: 4,
      text_excerpt:
        'Admitted 14-Feb-2026 with new-onset Atrial Fibrillation with RVR. Rate controlled with Metoprolol; initiated Apixaban 5mg BD (CHA2DS2-VASc = 5). Discharged in stable sinus/rate-controlled rhythm.',
      sensitivity_tag: 'GENERAL',
    },
    {
      resource_id: 'HA-DOC-102',
      patient_ref: 'FHIR-PAT-8801',
      doc_type: 'Psychiatric Eval',
      title: 'Confidential Geriatric Psychiatry Consultation Note',
      created_datetime: '2026-09-12T15:10:00Z',
      author_display: 'Dr. S. Kulkarni, MD',
      format_code: 'HL7-CDA',
      pages: 2,
      text_excerpt:
        'Protected Mental Health Evaluation under DPDP Sensitive Health Data Rules. Diagnosis: Moderate depressive episode (F32.1).',
      sensitivity_tag: 'MENTAL_HEALTH',
    },
  ],
};

// ============================================================================
// 2. HOSPITAL B (LEGACY CIVIL HOSPITAL DB: hospital_b_legacy.sqlite.json)
// Flat tables, DD/MM/YY dates, free-text diagnoses (requiring NLP/lexical
// ICD-10 mapping with confidence scores), missing fields, scanned paper charts
// ============================================================================
export interface HospitalBDatabase {
  databaseFile: string;
  ddl: string;
  legacy_flat_visits: Array<{
    row_id: string;
    old_pat_no: string;
    pat_name_raw: string;
    pat_dob_ddmmyy: string;
    visit_dt_ddmmyy: string;
    dept_txt: string;
    doc_name: string;
    free_text_diag: string; // Deliberately uncoded free text!
    rx_written_text: string;
    allergy_note_raw: string; // e.g., "SULFA RASH" or "NKDA" (conflict!)
    remarks_raw: string;
  }>;
  legacy_scanned_files: Array<{
    scan_id: string;
    old_pat_no: string;
    scan_date_ddmmyy: string;
    folder_label: string;
    page_cnt: number;
    ocr_snippet: string;
  }>;
}

const INITIAL_HOSP_B: HospitalBDatabase = {
  databaseFile: 'hospital_b_legacy.sqlite.json',
  ddl: `
    CREATE TABLE legacy_flat_visits (row_id TEXT PRIMARY KEY, old_pat_no TEXT, pat_name_raw TEXT, pat_dob_ddmmyy TEXT, visit_dt_ddmmyy TEXT, dept_txt TEXT, doc_name TEXT, free_text_diag TEXT, rx_written_text TEXT, allergy_note_raw TEXT, remarks_raw TEXT);
    CREATE TABLE legacy_scanned_files (scan_id TEXT PRIMARY KEY, old_pat_no TEXT, scan_date_ddmmyy TEXT, folder_label TEXT, page_cnt INTEGER, ocr_snippet TEXT);
  `,
  legacy_flat_visits: [
    // MPI-1001: Rameshwar Kumaar Sharma (SJ-OLD-1998-442)
    {
      row_id: 'HB-ROW-01',
      old_pat_no: 'SJ-OLD-1998-442',
      pat_name_raw: 'Rameshwar Kumaar Sharma',
      pat_dob_ddmmyy: '14/04/51',
      visit_dt_ddmmyy: '19/08/26',
      dept_txt: 'CASUALTY / MEDICINE OPD',
      doc_name: 'Dr. M.ob. Gowda',
      free_text_diag: 'B/L knee osteoarthrosis with acute gouty flare left great toe',
      rx_written_text: 'Tab. Indomethacin 50mg TDS x 7 days | Tab. Pantoprazole 40mg OD',
      allergy_note_raw: 'Sulfa drugs -> skin rash (No penicillin allergy recorded in legacy chart)',
      remarks_raw: 'Pt presented to casualty with acute podagra. Prescribed NSAID (Indomethacin) unaware of CKD/Apixaban at other hospital!',
    },
    {
      row_id: 'HB-ROW-02',
      old_pat_no: 'SJ-OLD-1998-442',
      pat_name_raw: 'Rameshwar Kumaar Sharma',
      pat_dob_ddmmyy: '14/04/51',
      visit_dt_ddmmyy: '11/11/24',
      dept_txt: 'GENERAL SURGERY',
      doc_name: 'Dr. P. Hegde',
      free_text_diag: 'Old healed right inguinal hernia mesh repair status',
      rx_written_text: 'Tab. Paracetamol 650mg SOS',
      allergy_note_raw: 'Sulfa drugs -> skin rash',
      remarks_raw: 'Routine annual scar check, no recurrence.',
    },
    // MPI-1002: Muhammad Abdul Kadir (SJ-OLD-1994-108) - Year-only DOB + low-confidence free-text diag!
    {
      row_id: 'HB-ROW-03',
      old_pat_no: 'SJ-OLD-1994-108',
      pat_name_raw: 'Muhammad Abdul Kadir',
      pat_dob_ddmmyy: '1948',
      visit_dt_ddmmyy: '25/09/26',
      dept_txt: 'CHEST CLINIC',
      doc_name: 'Dr. R. Srinivas',
      free_text_diag: 'Smoker bronchitis chr airway obst w/ cor-pulmonale ?early',
      rx_written_text: 'Tab. Deriphyllin Retard 150mg BD | Levolin Inhaler 2 puffs SOS',
      allergy_note_raw: 'Aspirin causes wheezing',
      remarks_raw: 'Approx age 78 yrs (DOB 1948 only on ration card). Coarse creps bilateral bases.',
    },
    {
      row_id: 'HB-ROW-04',
      old_pat_no: 'SJ-OLD-1994-108',
      pat_name_raw: 'Muhammad Abdul Kadir',
      pat_dob_ddmmyy: '1948',
      visit_dt_ddmmyy: '14/02/25',
      dept_txt: 'MEDICINE OPD',
      doc_name: 'Dr. M. Gowda',
      free_text_diag: 'Atypical epigastric dyspepsia ?acid peptic ds vs cardiac',
      rx_written_text: 'Syrup Gelusil 2 tsp TDS | Tab. Famotidine 20mg BD',
      allergy_note_raw: 'Aspirin',
      remarks_raw: 'ECG advised; patient declined admission.',
    },
    // MPI-1003: Meera Krishnan Nair (Maiden name at Legacy Hospital B! SJ-OLD-1989-902)
    {
      row_id: 'HB-ROW-05',
      old_pat_no: 'SJ-OLD-1989-902',
      pat_name_raw: 'Meera Krishnan Nair',
      pat_dob_ddmmyy: '22/11/59',
      visit_dt_ddmmyy: '14/06/26',
      dept_txt: 'ORTHOPAEDICS OPD',
      doc_name: 'Dr. K. Vishwanath',
      free_text_diag: 'Post-menopausal osteopenia with old Colles fracture right wrist',
      rx_written_text: 'Tab. Shelcal-500 (Calcium + Vit D3) OD',
      allergy_note_raw: 'Cotrimoxazole (Septran) -> Severe urticaria',
      remarks_raw: 'Legacy chart registered under maiden name Meera Krishnan Nair.',
    },
    // MPI-1007: Saraswathi V. Raman (SJ-OLD-2001-319 - Unmerged duplicate of MPI-1006!)
    {
      row_id: 'HB-ROW-06',
      old_pat_no: 'SJ-OLD-2001-319',
      pat_name_raw: 'Saraswathi V. Raman',
      pat_dob_ddmmyy: '03/09/49',
      visit_dt_ddmmyy: '19/07/26',
      dept_txt: 'CARDIOLOGY OPD',
      doc_name: 'Dr. V. Murthy',
      free_text_diag: 'Ischemic heart disease stable angina on statin & antiplatelet',
      rx_written_text: 'Tab. Rosuvastatin 20mg HS | Tab. Ecosprin 75mg OD',
      allergy_note_raw: 'ACE Inhibitors -> Dry hacking cough (Enalapril)',
      remarks_raw: 'Note duplicate statin risk if merged with Apex Metro Atorvastatin 40mg!',
    },
    // MPI-1010 & MPI-1012
    {
      row_id: 'HB-ROW-07',
      old_pat_no: 'SJ-OLD-2004-511',
      pat_name_raw: 'Dattatray M Kulkarni',
      pat_dob_ddmmyy: '30/06/50',
      visit_dt_ddmmyy: '12/08/26',
      dept_txt: 'GASTROENTEROLOGY',
      doc_name: 'Dr. S. Pai',
      free_text_diag: 'History of duodenal ulcer upper GI bleed (resolved)',
      rx_written_text: 'Tab. Rabeprazole 20mg OD',
      allergy_note_raw: 'NKDA',
      remarks_raw: 'Endoscopy scar healed.',
    },
    {
      row_id: 'HB-ROW-08',
      old_pat_no: 'SJ-OLD-1999-774',
      pat_name_raw: 'Joseph A Dsouza',
      pat_dob_ddmmyy: '02/10/46',
      visit_dt_ddmmyy: '04/07/26',
      dept_txt: 'NEURO REHAB',
      doc_name: 'Dr. A. Rebello',
      free_text_diag: 'Left MCA ischemic stroke residual right hemiparesis',
      rx_written_text: 'Tab. Clopidogrel 75mg OD | Physiotherapy daily',
      allergy_note_raw: 'Codeine -> Confusion',
      remarks_raw: 'Ambulating with quadripod cane.',
    },
  ],
  legacy_scanned_files: [
    {
      scan_id: 'HB-SCAN-901',
      old_pat_no: 'SJ-OLD-1998-442',
      scan_date_ddmmyy: '14/05/18',
      folder_label: 'Scanned Paper IPD Chart #1998-442 (Microfilm Archive)',
      page_cnt: 12,
      ocr_snippet:
        '[OCR CONFIDENCE 79%] ST. JUDE CIVIL HOSPITAL BANGALORE - Handwritten Discharge Summary: Pt Rameshwar Kumaar Sharma, 67/M. Admitted for acute pyelonephritis & uncontrolledNIDDM. Treated with IV Ceftriaxone -> developed severe generalized rash & wheeze on Day 2 (Suspected Beta-Lactam cross-reactivity).',
    },
    {
      scan_id: 'HB-SCAN-902',
      old_pat_no: 'SJ-OLD-1994-108',
      scan_date_ddmmyy: '08/12/19',
      folder_label: 'Scanned Spirometry & Chest X-Ray Film Packet #1994-108',
      page_cnt: 5,
      ocr_snippet:
        '[OCR CONFIDENCE 74%] Muhammad Abdul Kadir (Birth Yr ~1948). Post-bronchodilator FEV1/FVC = 0.54 (Moderate-to-severe airflow limitation). Hyperinflated lung fields.',
    },
    {
      scan_id: 'HB-SCAN-903',
      old_pat_no: 'SJ-OLD-1989-902',
      scan_date_ddmmyy: '29/03/15',
      folder_label: 'Scanned Orthopaedic Cast Card (Maiden Name: Meera K. Nair)',
      page_cnt: 3,
      ocr_snippet:
        '[OCR CONFIDENCE 85%] Closed reduction and below-elbow POP cast for distal radius fracture right wrist. Patient name updated in margin: Now Mrs. Meera Deshmukh.',
    },
  ],
};

// ============================================================================
// 3. HOSPITAL C (MID-SIZE REGIONAL HOSPITAL DB: hospital_c_midsize.sqlite.json)
// Custom column names (PAT_MRN_NO, DIAG_LOCAL_CD, LAB_VAL_RAW, LAB_UNIT_STR),
// SI units (mmol/L and umol/L requiring unit conversion to mg/dL!),
// separate lab and pharmacy tables.
// ============================================================================
export interface HospitalCDatabase {
  databaseFile: string;
  ddl: string;
  tbl_regional_encounters: Array<{
    ENC_SEQ_ID: string;
    PAT_MRN_NO: string;
    ADM_DT_ISO: string;
    CLINIC_DEPT_NM: string;
    ATTEND_DOC_NM: string;
    DIAG_LOCAL_CD: string; // e.g., "CC-CARD-04", "CC-REN-12"
    DIAG_DESC_CUSTOM: string;
    CLIN_SUMMARY_TXT: string;
  }>;
  tbl_regional_pharmacy: Array<{
    RX_ORDER_NO: string;
    PAT_MRN_NO: string;
    LOCAL_DRUG_CD: string;
    BRAND_LABEL: string;
    CHEM_NAME: string;
    DOSE_STRENGTH: string;
    SCHED_FREQ: string;
    ORD_STATUS: 'ACTIVE_RX' | 'DISCONTINUED';
    ORD_DATE: string;
    PRESC_DOC: string;
  }>;
  tbl_regional_lab_module: Array<{
    LAB_ROW_ID: string;
    PAT_MRN_NO: string;
    LOCAL_ANALYTE_CD: string; // e.g., "CREAT_SI", "GLU_FAST_SI"
    ANALYTE_LABEL: string;
    LAB_VAL_RAW: number; // In SI units (umol/L or mmol/L) so normalization converts to mg/dL!
    LAB_UNIT_STR: 'umol/L' | 'mmol/L' | '%' | 'g/L';
    SPECIMEN_DT: string;
    FLAG_IND: 'NORM' | 'HIGH' | 'CRIT_HIGH' | 'LOW';
  }>;
}

const INITIAL_HOSP_C: HospitalCDatabase = {
  databaseFile: 'hospital_c_midsize.sqlite.json',
  ddl: `
    CREATE TABLE tbl_regional_encounters (ENC_SEQ_ID TEXT PRIMARY KEY, PAT_MRN_NO TEXT, ADM_DT_ISO TEXT, CLINIC_DEPT_NM TEXT, ATTEND_DOC_NM TEXT, DIAG_LOCAL_CD TEXT, DIAG_DESC_CUSTOM TEXT, CLIN_SUMMARY_TXT TEXT);
    CREATE TABLE tbl_regional_pharmacy (RX_ORDER_NO TEXT PRIMARY KEY, PAT_MRN_NO TEXT, LOCAL_DRUG_CD TEXT, BRAND_LABEL TEXT, CHEM_NAME TEXT, DOSE_STRENGTH TEXT, SCHED_FREQ TEXT, ORD_STATUS TEXT, ORD_DATE TEXT, PRESC_DOC TEXT);
    CREATE TABLE tbl_regional_lab_module (LAB_ROW_ID TEXT PRIMARY KEY, PAT_MRN_NO TEXT, LOCAL_ANALYTE_CD TEXT, ANALYTE_LABEL TEXT, LAB_VAL_RAW REAL, LAB_UNIT_STR TEXT, SPECIMEN_DT TEXT, FLAG_IND TEXT);
  `,
  tbl_regional_encounters: [
    // MPI-1001: CC-MRN-50291
    {
      ENC_SEQ_ID: 'HC-ENC-701',
      PAT_MRN_NO: 'CC-MRN-50291',
      ADM_DT_ISO: '2026-10-02T11:30:00Z',
      CLINIC_DEPT_NM: 'Nephrology & Hypertension Clinic',
      ATTEND_DOC_NM: 'Dr. Pradeep Shenoy, DM (Nephro)',
      DIAG_LOCAL_CD: 'CC-REN-03B',
      DIAG_DESC_CUSTOM: 'Diabetic Nephropathy with CKD Stage 3B & Hyperkalemia',
      CLIN_SUMMARY_TXT:
        'Evaluated at City Care Nephrology. Serum Creatinine 148 umol/L (~1.67 mg/dL). Note: Cardiology resident up-titrated Metoprolol Succinate to 50 mg OD here without checking Apex Metro 25 mg regimen!',
    },
    {
      ENC_SEQ_ID: 'HC-ENC-702',
      PAT_MRN_NO: 'CC-MRN-50291',
      ADM_DT_ISO: '2026-07-15T10:00:00Z',
      CLINIC_DEPT_NM: 'Internal Medicine Urgent Care',
      ATTEND_DOC_NM: 'Dr. K. Rajagopal, MD',
      DIAG_LOCAL_CD: 'CC-CARD-09',
      DIAG_DESC_CUSTOM: 'Congestive Cardiac Failure (HFrEF) with Volume Overload',
      CLIN_SUMMARY_TXT: 'IV Furosemide 40mg stat given in observation bay; symptoms improved.',
    },
    // MPI-1003: CC-MRN-61004
    {
      ENC_SEQ_ID: 'HC-ENC-703',
      PAT_MRN_NO: 'CC-MRN-61004',
      ADM_DT_ISO: '2026-09-29T13:00:00Z',
      CLINIC_DEPT_NM: 'Endocrinology & Bone Metabolism',
      ATTEND_DOC_NM: 'Dr. Shalini Rao, DM',
      DIAG_LOCAL_CD: 'CC-ENDO-02',
      DIAG_DESC_CUSTOM: 'Primary Hypothyroidism (Sub-optimally controlled)',
      CLIN_SUMMARY_TXT: 'Advised increasing Levothyroxine from 50 mcg to 75 mcg daily.',
    },
    // MPI-1005: CC-MRN-70112
    {
      ENC_SEQ_ID: 'HC-ENC-704',
      PAT_MRN_NO: 'CC-MRN-70112',
      ADM_DT_ISO: '2026-10-04T18:30:00Z',
      CLINIC_DEPT_NM: 'Gastroenterology Clinic',
      ATTEND_DOC_NM: 'Dr. M. Bopanna, DM',
      DIAG_LOCAL_CD: 'CC-GI-14',
      DIAG_DESC_CUSTOM: 'Portal Hypertension secondary to Chronic Liver Disease',
      CLIN_SUMMARY_TXT: 'Placed on Propranolol prophylaxis for esophageal varices.',
    },
    // MPI-1008: CC-MRN-88301
    {
      ENC_SEQ_ID: 'HC-ENC-705',
      PAT_MRN_NO: 'CC-MRN-88301',
      ADM_DT_ISO: '2026-09-21T14:00:00Z',
      CLINIC_DEPT_NM: 'Geriatric Neurology',
      ATTEND_DOC_NM: 'Dr. A. Chatterji, DM',
      DIAG_LOCAL_CD: 'CC-NEURO-01',
      DIAG_DESC_CUSTOM: 'Idiopathic Parkinson Disease with Postural Instability',
      CLIN_SUMMARY_TXT: '92-year-old male accompanied by son. Fall prevention counseling completed.',
    },
  ],
  tbl_regional_pharmacy: [
    // MPI-1001: Deliberate DOSE CONFLICT on Metoprolol Succinate (50 mg OD here vs 25 mg OD at Hospital A!)
    // AND deliberate Drug-Allergy Conflict (Amoxicillin-Clavulanate ordered empirically despite Penicillin Anaphylaxis at Hospital A!)
    {
      RX_ORDER_NO: 'HC-RX-9001',
      PAT_MRN_NO: 'CC-MRN-50291',
      LOCAL_DRUG_CD: 'DRG-METO-50',
      BRAND_LABEL: 'Metolar XR 50',
      CHEM_NAME: 'Metoprolol Succinate',
      DOSE_STRENGTH: '50 mg',
      SCHED_FREQ: 'Once daily (OD)',
      ORD_STATUS: 'ACTIVE_RX',
      ORD_DATE: '2026-10-02',
      PRESC_DOC: 'Dr. K. Rajagopal, MD (City Care)',
    },
    {
      RX_ORDER_NO: 'HC-RX-9002',
      PAT_MRN_NO: 'CC-MRN-50291',
      LOCAL_DRUG_CD: 'DRG-AMOX-625',
      BRAND_LABEL: 'Augmentin 625 Duo',
      CHEM_NAME: 'Amoxicillin / Clavulanate',
      DOSE_STRENGTH: '625 mg',
      SCHED_FREQ: 'Twice daily (BD) x 5 days',
      ORD_STATUS: 'ACTIVE_RX',
      ORD_DATE: '2026-10-02',
      PRESC_DOC: 'Dr. Pradeep Shenoy, DM (City Care)',
    },
    {
      RX_ORDER_NO: 'HC-RX-9003',
      PAT_MRN_NO: 'CC-MRN-50291',
      LOCAL_DRUG_CD: 'DRG-DAPA-10',
      BRAND_LABEL: 'Forxiga 10',
      CHEM_NAME: 'Dapagliflozin',
      DOSE_STRENGTH: '10 mg',
      SCHED_FREQ: 'Once daily (Morning)',
      ORD_STATUS: 'ACTIVE_RX',
      ORD_DATE: '2026-10-02',
      PRESC_DOC: 'Dr. Pradeep Shenoy, DM (City Care)',
    },
    // MPI-1003: Dose discrepancy on Levothyroxine (50 mcg at Hospital C vs 75 mcg at Hospital A)
    {
      RX_ORDER_NO: 'HC-RX-9004',
      PAT_MRN_NO: 'CC-MRN-61004',
      LOCAL_DRUG_CD: 'DRG-THYR-50',
      BRAND_LABEL: 'Thyronorm 50 mcg',
      CHEM_NAME: 'Levothyroxine',
      DOSE_STRENGTH: '50 mcg',
      SCHED_FREQ: 'Once daily empty stomach',
      ORD_STATUS: 'ACTIVE_RX',
      ORD_DATE: '2026-09-29',
      PRESC_DOC: 'Dr. Shalini Rao, DM',
    },
  ],
  tbl_regional_lab_module: [
    // MPI-1001: Labs recorded in SI units (umol/L for Creatinine, mmol/L for Glucose) to demonstrate unit normalization!
    // 136.1 umol/L Creatinine = 1.54 mg/dL (recorded July 2026)
    // 148.5 umol/L Creatinine = 1.68 mg/dL (recorded Oct 2, 2026)
    {
      LAB_ROW_ID: 'HC-LAB-501',
      PAT_MRN_NO: 'CC-MRN-50291',
      LOCAL_ANALYTE_CD: 'CREAT_SI',
      ANALYTE_LABEL: 'Creatinine, Serum (SI)',
      LAB_VAL_RAW: 136.1,
      LAB_UNIT_STR: 'umol/L',
      SPECIMEN_DT: '2026-07-15T10:30:00Z',
      FLAG_IND: 'HIGH',
    },
    {
      LAB_ROW_ID: 'HC-LAB-502',
      PAT_MRN_NO: 'CC-MRN-50291',
      LOCAL_ANALYTE_CD: 'CREAT_SI',
      ANALYTE_LABEL: 'Creatinine, Serum (SI)',
      LAB_VAL_RAW: 148.5,
      LAB_UNIT_STR: 'umol/L',
      SPECIMEN_DT: '2026-10-02T11:45:00Z',
      FLAG_IND: 'HIGH',
    },
    // Fasting Glucose in mmol/L: 9.2 mmol/L -> 165.8 mg/dL
    {
      LAB_ROW_ID: 'HC-LAB-503',
      PAT_MRN_NO: 'CC-MRN-50291',
      LOCAL_ANALYTE_CD: 'GLU_FAST_SI',
      ANALYTE_LABEL: 'Fasting Plasma Glucose (SI)',
      LAB_VAL_RAW: 9.2,
      LAB_UNIT_STR: 'mmol/L',
      SPECIMEN_DT: '2026-10-02T08:00:00Z',
      FLAG_IND: 'HIGH',
    },
    // HbA1c at Hospital C in July 2026: 7.8%
    {
      LAB_ROW_ID: 'HC-LAB-504',
      PAT_MRN_NO: 'CC-MRN-50291',
      LOCAL_ANALYTE_CD: 'HBA1C_PCT',
      ANALYTE_LABEL: 'Glycated Hb (HbA1c)',
      LAB_VAL_RAW: 7.8,
      LAB_UNIT_STR: '%',
      SPECIMEN_DT: '2026-07-15T10:30:00Z',
      FLAG_IND: 'HIGH',
    },
  ],
};

// ============================================================================
// 4. HOSPITAL D (DIAGNOSTIC & PHARMACY CHAIN DB: hospital_d_diag.sqlite.json)
// Labs, Imaging Reports, and Retail Pharmacy Dispense Records ONLY
// ============================================================================
export interface HospitalDDatabase {
  databaseFile: string;
  ddl: string;
  diag_lab_results: Array<{
    order_id: string;
    cust_id: string;
    loinc_cd: string;
    test_name: string;
    panel_name: string;
    result_num: number;
    unit_std: string;
    ref_min: number;
    ref_max: number;
    abn_flag: 'N' | 'H' | 'L' | 'HH';
    collected_at: string;
  }>;
  diag_imaging_studies: Array<{
    study_uid: string;
    cust_id: string;
    modality: 'CT' | 'MRI' | 'X-Ray' | 'Ultrasound' | 'Echocardiogram';
    cpt_code: string;
    anatomical_region: string;
    performed_at: string;
    radiologist_name: string;
    impression_summary: string;
    detailed_findings: string;
  }>;
  pharm_dispense_log: Array<{
    dispense_id: string;
    cust_id: string;
    rxnorm_code: string;
    dispensed_brand: string;
    generic_ingredient: string;
    strength: string;
    directions: string;
    days_supply: number;
    last_dispensed_date: string;
    refill_due_date: string;
    therapeutic_group: string;
  }>;
}

const INITIAL_HOSP_D: HospitalDDatabase = {
  databaseFile: 'hospital_d_diag.sqlite.json',
  ddl: `
    CREATE TABLE diag_lab_results (order_id TEXT PRIMARY KEY, cust_id TEXT, loinc_cd TEXT, test_name TEXT, panel_name TEXT, result_num REAL, unit_std TEXT, ref_min REAL, ref_max REAL, abn_flag TEXT, collected_at TEXT);
    CREATE TABLE diag_imaging_studies (study_uid TEXT PRIMARY KEY, cust_id TEXT, modality TEXT, cpt_code TEXT, anatomical_region TEXT, performed_at TEXT, radiologist_name TEXT, impression_summary TEXT, detailed_findings TEXT);
    CREATE TABLE pharm_dispense_log (dispense_id TEXT PRIMARY KEY, cust_id TEXT, rxnorm_code TEXT, dispensed_brand TEXT, generic_ingredient TEXT, strength TEXT, directions TEXT, days_supply INTEGER, last_dispensed_date TEXT, refill_due_date TEXT, therapeutic_group TEXT);
  `,
  diag_lab_results: [
    // MPI-1001: MG-CUST-77410 -> Additional longitudinal points so Recharts trend has 5+ points!
    {
      order_id: 'HD-LAB-801',
      cust_id: 'MG-CUST-77410',
      loinc_cd: '2160-0',
      test_name: 'Serum Creatinine',
      panel_name: 'Renal Function Panel',
      result_num: 1.28,
      unit_std: 'mg/dL',
      ref_min: 0.7,
      ref_max: 1.3,
      abn_flag: 'N',
      collected_at: '2026-01-18T08:15:00Z',
    },
    {
      order_id: 'HD-LAB-802',
      cust_id: 'MG-CUST-77410',
      loinc_cd: '2160-0',
      test_name: 'Serum Creatinine',
      panel_name: 'Renal Function Panel',
      result_num: 1.96,
      unit_std: 'mg/dL',
      ref_min: 0.7,
      ref_max: 1.3,
      abn_flag: 'H',
      collected_at: '2026-10-11T08:20:00Z',
    },
    {
      order_id: 'HD-LAB-803',
      cust_id: 'MG-CUST-77410',
      loinc_cd: '4548-4',
      test_name: 'Hemoglobin A1c (HbA1c)',
      panel_name: 'Glycemic Control Panel',
      result_num: 7.1,
      unit_std: '%',
      ref_min: 4.0,
      ref_max: 6.4,
      abn_flag: 'H',
      collected_at: '2026-01-18T08:15:00Z',
    },
    {
      order_id: 'HD-LAB-804',
      cust_id: 'MG-CUST-77410',
      loinc_cd: '2345-7',
      test_name: 'Fasting Plasma Glucose',
      panel_name: 'Glycemic Control Panel',
      result_num: 138,
      unit_std: 'mg/dL',
      ref_min: 70,
      ref_max: 100,
      abn_flag: 'H',
      collected_at: '2026-04-12T08:00:00Z',
    },
    {
      order_id: 'HD-LAB-805',
      cust_id: 'MG-CUST-77410',
      loinc_cd: '2345-7',
      test_name: 'Fasting Plasma Glucose',
      panel_name: 'Glycemic Control Panel',
      result_num: 174,
      unit_std: 'mg/dL',
      ref_min: 70,
      ref_max: 100,
      abn_flag: 'H',
      collected_at: '2026-10-11T08:20:00Z',
    },
    // MPI-1002: MG-CUST-88120
    {
      order_id: 'HD-LAB-806',
      cust_id: 'MG-CUST-88120',
      loinc_cd: '2160-0',
      test_name: 'Serum Creatinine',
      panel_name: 'Renal Function Panel',
      result_num: 1.12,
      unit_std: 'mg/dL',
      ref_min: 0.7,
      ref_max: 1.3,
      abn_flag: 'N',
      collected_at: '2026-10-09T08:45:00Z',
    },
  ],
  diag_imaging_studies: [
    {
      study_uid: 'HD-IMG-301',
      cust_id: 'MG-CUST-77410',
      modality: 'Echocardiogram',
      cpt_code: '93306',
      anatomical_region: 'Transthoracic 2D Doppler Heart',
      performed_at: '2026-10-09T14:30:00Z',
      radiologist_name: 'Dr. Kavita Nambiar, MD, DM',
      impression_summary:
        'LVEF 38% (Moderately reduced). Global LV hypokinesia, moderate left atrial enlargement, mild-to-moderate mitral regurgitation.',
      detailed_findings:
        'Left ventricle is mildly dilated with LVEF 38% by biplane Simpson method. Bi-atrial enlargement consistent with chronic Atrial Fibrillation. IVC 2.2 cm with <50% inspiratory collapse suggesting elevated right atrial pressure.',
    },
    {
      study_uid: 'HD-IMG-302',
      cust_id: 'MG-CUST-77410',
      modality: 'Ultrasound',
      cpt_code: '76770',
      anatomical_region: 'Bilateral Renal & Urinary Tract Ultrasound',
      performed_at: '2026-10-03T11:20:00Z',
      radiologist_name: 'Dr. R. Srinivasan, DMRD',
      impression_summary:
        'Bilateral increased renal cortical echogenicity (Right 9.1 cm, Left 8.9 cm) consistent with medical renal disease (CKD). No hydronephrosis.',
      detailed_findings:
        'Cortico-medullary differentiation is mildly blunted bilaterally. No obstructive calculus or mass lesion.',
    },
    {
      study_uid: 'HD-IMG-303',
      cust_id: 'MG-CUST-88120',
      modality: 'CT',
      cpt_code: '71250',
      anatomical_region: 'HRCT Thorax (Non-Contrast)',
      performed_at: '2026-10-08T16:00:00Z',
      radiologist_name: 'Dr. R. Srinivasan, DMRD',
      impression_summary:
        'Moderate centrilobular and paraseptal emphysema bilateral upper lobes with mild cylindrical bronchiectasis.',
      detailed_findings:
        'Prominent main pulmonary artery (31 mm) suggestive of mild pulmonary arterial hypertension.',
    },
  ],
  pharm_dispense_log: [
    // MPI-1001: Missed refill on Apixaban (last dispensed 48 days ago for 30-day supply!)
    {
      dispense_id: 'HD-DISP-901',
      cust_id: 'MG-CUST-77410',
      rxnorm_code: '1364430',
      dispensed_brand: 'Eliquis 5mg Tablet',
      generic_ingredient: 'Apixaban',
      strength: '5 mg',
      directions: '1 tablet twice daily',
      days_supply: 30,
      last_dispensed_date: '2026-08-22',
      refill_due_date: '2026-09-21', // Overdue by >20 days! Triggers Missed Refill alert
      therapeutic_group: 'Direct Oral Anticoagulant (DOAC)',
    },
    // Dispense of Pantoprazole + Esomeprazole duplicate PPI therapy
    {
      dispense_id: 'HD-DISP-902',
      cust_id: 'MG-CUST-77410',
      rxnorm_code: '284799',
      dispensed_brand: 'Nexpro 40 Tablet (OTC/Retail Fill)',
      generic_ingredient: 'Esomeprazole',
      strength: '40 mg',
      directions: '1 tablet before breakfast',
      days_supply: 30,
      last_dispensed_date: '2026-10-05',
      refill_due_date: '2026-11-04',
      therapeutic_group: 'Proton Pump Inhibitor (PPI)',
    },
    // MPI-1006: Dispense of Rosuvastatin while on Atorvastatin at Hospital A!
    {
      dispense_id: 'HD-DISP-903',
      cust_id: 'MG-CUST-91002',
      rxnorm_code: '859751',
      dispensed_brand: 'Rosuvas 20 Tablet',
      generic_ingredient: 'Rosuvastatin',
      strength: '20 mg',
      directions: '1 tablet at night',
      days_supply: 30,
      last_dispensed_date: '2026-10-08',
      refill_due_date: '2026-11-07',
      therapeutic_group: 'HMG-CoA Reductase Inhibitor (Statin)',
    },
  ],
};

// ============================================================================
// 5. PAYER CLAIMS SOURCE (claims_payer.sqlite.json) & IMMUNIZATION REGISTRY
// ============================================================================
export const INITIAL_CLAIMS_DB = {
  databaseFile: 'claims_payer.sqlite.json',
  claims: [
    {
      claim_id: 'CLM-2026-88410',
      policy_id: 'POL-BH-992011',
      service_date: '2026-10-10',
      facility_name: 'Apex Metro FHIR Medical Center',
      cpt_codes: ['99214', '93306', '80069'],
      icd10_codes: ['I50.22', 'E11.22', 'N18.32'],
      billed_inr: 14800,
      allowed_inr: 12500,
      paid_inr: 11250,
      status: 'Paid' as const,
      payer_name: 'BharatHealth Senior Care TPA (PM-JAY / CGHS Co-Pay)',
    },
    {
      claim_id: 'CLM-2026-81092',
      policy_id: 'POL-BH-992011',
      service_date: '2026-10-02',
      facility_name: 'City Care Regional Hospital',
      cpt_codes: ['99213', '82565'],
      icd10_codes: ['N18.32', 'E11.22'],
      billed_inr: 6400,
      allowed_inr: 5800,
      paid_inr: 5200,
      status: 'Paid' as const,
      payer_name: 'BharatHealth Senior Care TPA (PM-JAY / CGHS Co-Pay)',
    },
    {
      claim_id: 'CLM-2026-60219',
      policy_id: 'POL-BH-992011',
      service_date: '2026-02-18',
      facility_name: 'Apex Metro FHIR Medical Center (CCU Inpatient)',
      cpt_codes: ['99223', '93000'],
      icd10_codes: ['I48.91', 'I50.22'],
      billed_inr: 92500,
      allowed_inr: 84000,
      paid_inr: 79800,
      status: 'Paid' as const,
      payer_name: 'BharatHealth Senior Care TPA (PM-JAY / CGHS Co-Pay)',
    },
    {
      claim_id: 'CLM-2026-90112',
      policy_id: 'POL-BH-774512',
      service_date: '2026-10-11',
      facility_name: 'Apex Metro FHIR Medical Center',
      cpt_codes: ['99214', '80076'],
      icd10_codes: ['K70.30', 'I10'],
      billed_inr: 8900,
      allowed_inr: 7500,
      paid_inr: 0,
      status: 'Pending' as const,
      payer_name: 'StarShield Senior Citizen Mediclaim',
    },
  ],
};

export const INITIAL_IMM_REG_DB = {
  databaseFile: 'immunization_reg.sqlite.json',
  immunizations: [
    {
      imm_id: 'IMM-101',
      uwin_id: 'UWIN-SR-10048',
      cvx_code: '197',
      vaccine_name: 'Influenza, high-dose quadrivalent (Senior 65+)',
      occurrence_date: '2026-09-01',
      lot_number: 'FLU-IN-2609A',
      dose_number: 1,
      status: 'completed' as const,
    },
    {
      imm_id: 'IMM-102',
      uwin_id: 'UWIN-SR-10048',
      cvx_code: '33',
      vaccine_name: 'Pneumococcal Polysaccharide Vaccine (PPSV23)',
      occurrence_date: '2020-11-15',
      lot_number: 'PNEU-2011B',
      dose_number: 1,
      status: 'overdue' as const, // PCV20 / 5-year booster overdue for CKD + Heart Failure patient!
    },
    {
      imm_id: 'IMM-103',
      uwin_id: 'UWIN-SR-10048',
      cvx_code: '187',
      vaccine_name: 'Recombinant Zoster (Shingles) Vaccine (Shingrix) - Dose 2',
      occurrence_date: '2025-10-01',
      lot_number: 'SHX-2510C',
      dose_number: 2,
      status: 'overdue' as const,
    },
    {
      imm_id: 'IMM-201',
      uwin_id: 'UWIN-SR-20411',
      cvx_code: '197',
      vaccine_name: 'Influenza Quadrivalent Vaccine',
      occurrence_date: '2026-08-20',
      lot_number: 'FLU-IN-2608B',
      dose_number: 1,
      status: 'completed' as const,
    },
  ],
};

// Write each hospital DB as a distinct file in server/db/storage/
function ensureDbFile<T extends { databaseFile: string }>(initialData: T): T {
  const filePath = path.join(DB_DIR, initialData.databaseFile);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2), 'utf-8');
  }
  return initialData;
}

export const hospitalADb = ensureDbFile(INITIAL_HOSP_A);
export const hospitalBDb = ensureDbFile(INITIAL_HOSP_B);
export const hospitalCDb = ensureDbFile(INITIAL_HOSP_C);
export const hospitalDDb = ensureDbFile(INITIAL_HOSP_D);
export const claimsPayerDb = ensureDbFile(INITIAL_CLAIMS_DB);
export const immunizationRegDb = ensureDbFile(INITIAL_IMM_REG_DB);
