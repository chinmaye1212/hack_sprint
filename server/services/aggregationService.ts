import crypto from 'crypto';
import {
  DemoUser,
  HospitalSourceId,
  PurposeOfUse,
  SourceFetchStatus,
  UnifiedPatientViewResponse,
} from '../../src/types/unichart';
import {
  RawAdapterPayload,
  fetchFromSourceAdapter,
  getAllSourceConfigs,
  getSourceConfig,
} from '../adapters/sourceAdapters';
import { appendAuditLog } from '../audit/auditLogger';
import { getMpiEntryById } from '../db/indexDb';
import { NormalizedSourceBundle, normalizeAdapterPayload } from '../normalization/normalizer';
import {
  applyPolicyMaskingAndDeId,
  evaluatePatientAccessPolicy,
  isHospitalFetchConsented,
} from '../policy/policyEngine';
import { reconcileAndDeduplicateBundles } from '../reconciliation/reconciler';

// Short-lived Encrypted-at-Rest Cache (10-minute TTL)
const CACHE_TTL_MS = 10 * 60 * 1000;
const ENCRYPTION_KEY = crypto.randomBytes(32);

interface EncryptedCacheEntry {
  iv: string;
  authTag: string;
  ciphertext: string;
  fetchedAt: string;
  expiresAt: string;
  latencyMs: number;
  rawRecordsCount: number;
}

const adapterCache = new Map<string, EncryptedCacheEntry>();

function encryptPayload(payload: NormalizedSourceBundle): { iv: string; authTag: string; ciphertext: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const json = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  return {
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
    ciphertext: encrypted.toString('hex'),
  };
}

function decryptPayload(entry: EncryptedCacheEntry): NormalizedSourceBundle {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    ENCRYPTION_KEY,
    Buffer.from(entry.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(entry.authTag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(entry.ciphertext, 'hex')),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8'));
}

export function clearAdapterCache() {
  adapterCache.clear();
}

export function getCacheStats() {
  return {
    entriesCount: adapterCache.size,
    ttlMinutes: 10,
    cipherAlgorithm: 'AES-256-GCM (Ephemeral In-Memory KMS Key)',
  };
}

export async function aggregateUnifiedPatientView(
  masterPatientId: string,
  user: DemoUser,
  purpose: PurposeOfUse,
  forceRefresh = false
): Promise<UnifiedPatientViewResponse> {
  const mpiEntry = getMpiEntryById(masterPatientId);
  if (!mpiEntry) {
    throw new Error(`Master Patient ID ${masterPatientId} not found in Central Index.`);
  }

  // Step 1: Evaluate RBAC + ABAC Policy
  const policyResult = evaluatePatientAccessPolicy(user, mpiEntry, purpose);

  if (!policyResult.allowedToFetchClinical) {
    appendAuditLog({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      purposeOfUse: purpose,
      action: 'ACCESS_DENIED',
      masterPatientId,
      outcome: 'DENY',
      details: policyResult.accessDecisionReason,
      anomalyFlag: true,
    });

    // Return index metadata ("Records found at" panel) without calling any hospital clinical adapter!
    const sourceStatuses: SourceFetchStatus[] = getAllSourceConfigs().map((cfg) => {
      const link = mpiEntry.linkedRecords.find((r) => r.sourceId === cfg.sourceId);
      const consent = mpiEntry.consents[cfg.sourceId];
      return {
        sourceId: cfg.sourceId,
        sourceName: cfg.sourceName,
        schemaType: cfg.schemaType,
        online: cfg.online,
        consentStatus: !link ? 'NOT_LINKED' : consent?.granted ? 'GRANTED' : 'DENIED_BY_PATIENT',
        fetchState: 'CONSENT_BLOCKED',
        latencyMs: 0,
        lastSyncedAt: cfg.lastSyncedAt,
        recordsReturned: 0,
        errorMessage: 'Blocked by ABAC Care-Team Policy prior to adapter fan-out.',
      };
    });

    return {
      masterPatient: mpiEntry,
      deIdentified: false,
      accessLevel: policyResult.accessLevel,
      accessDecisionReason: policyResult.accessDecisionReason,
      policyRulesApplied: policyResult.policyRulesApplied,
      sourceStatuses,
      patientSummary: {
        decisionSupportNotice:
          'Clinical Decision Support Only — Access blocked pending Care-Team assignment or Emergency Break-the-Glass justification.',
        activeConditionsCount: 0,
        activeMedsCount: 0,
        abnormalLabsCount: 0,
        careGapsCount: 0,
        keyHighlights: ['No clinical records fetched due to ABAC Treatment Relationship enforcement.'],
        recentEncounterSummary: 'Access restricted.',
      },
      problems: [],
      medications: [],
      labs: [],
      allergies: [],
      encounters: [],
      immunizations: [],
      imaging: [],
      claims: [],
      documents: [],
      careGaps: [],
      maskedItemsCount: 0,
    };
  }

  // Step 2: Parallel fan-out fetch to linked hospitals where Consent is GRANTED
  const allSources = getAllSourceConfigs();
  const normalizedBundles: NormalizedSourceBundle[] = [];
  const sourceStatuses: SourceFetchStatus[] = [];
  const failedSources: string[] = [];

  await Promise.all(
    allSources.map(async (cfg) => {
      const link = mpiEntry.linkedRecords.find((r) => r.sourceId === cfg.sourceId);
      if (!link) {
        sourceStatuses.push({
          sourceId: cfg.sourceId,
          sourceName: cfg.sourceName,
          schemaType: cfg.schemaType,
          online: cfg.online,
          consentStatus: 'NOT_LINKED',
          fetchState: 'NO_RECORDS',
          latencyMs: 0,
          lastSyncedAt: cfg.lastSyncedAt,
          recordsReturned: 0,
        });
        return;
      }

      // Check per-hospital consent BEFORE calling adapter
      const consented = isHospitalFetchConsented(mpiEntry, cfg.sourceId, policyResult.accessLevel);
      if (!consented) {
        sourceStatuses.push({
          sourceId: cfg.sourceId,
          sourceName: cfg.sourceName,
          schemaType: cfg.schemaType,
          online: cfg.online,
          consentStatus: 'DENIED_BY_PATIENT',
          fetchState: 'CONSENT_BLOCKED',
          latencyMs: 0,
          lastSyncedAt: cfg.lastSyncedAt,
          recordsReturned: 0,
          errorMessage: `Records exist at ${cfg.sourceName}, consent required (ABDM Consent Artifact revoked/ungranted). Adapter not called.`,
        });
        return;
      }

      const cacheKey = `${masterPatientId}:${cfg.sourceId}`;
      const cached = adapterCache.get(cacheKey);

      if (!forceRefresh && cached && new Date(cached.expiresAt).getTime() > Date.now() && cfg.online) {
        const bundle = decryptPayload(cached);
        normalizedBundles.push(bundle);
        sourceStatuses.push({
          sourceId: cfg.sourceId,
          sourceName: cfg.sourceName,
          schemaType: cfg.schemaType,
          online: cfg.online,
          consentStatus: 'GRANTED',
          fetchState: 'CACHED',
          latencyMs: 4, // Fast encrypted cache hit
          lastSyncedAt: cached.fetchedAt,
          cachedUntil: cached.expiresAt,
          recordsReturned: cached.rawRecordsCount,
        });
        return;
      }

      try {
        const rawPayload: RawAdapterPayload = await fetchFromSourceAdapter(
          cfg.sourceId,
          link.localPatientId
        );
        const normalized = normalizeAdapterPayload(rawPayload);
        normalizedBundles.push(normalized);

        // Store in short-lived AES-256-GCM encrypted cache (10 min TTL)
        const encrypted = encryptPayload(normalized);
        const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
        adapterCache.set(cacheKey, {
          ...encrypted,
          fetchedAt: rawPayload.fetchedAt,
          expiresAt,
          latencyMs: rawPayload.latencyMs,
          rawRecordsCount: rawPayload.rawRecordsCount,
        });

        sourceStatuses.push({
          sourceId: cfg.sourceId,
          sourceName: cfg.sourceName,
          schemaType: cfg.schemaType,
          online: true,
          consentStatus: 'GRANTED',
          fetchState: 'SUCCESS',
          latencyMs: rawPayload.latencyMs,
          lastSyncedAt: rawPayload.fetchedAt,
          cachedUntil: expiresAt,
          recordsReturned: rawPayload.rawRecordsCount,
        });

        appendAuditLog({
          actorId: user.id,
          actorName: user.name,
          actorRole: user.role,
          purposeOfUse: purpose,
          action: 'ADAPTER_FETCH',
          masterPatientId,
          targetSourceId: cfg.sourceId,
          outcome: 'ALLOW',
          details: `Fetched & normalized ${rawPayload.rawRecordsCount} records from ${cfg.sourceName} (localId=${link.localPatientId}) in ${rawPayload.latencyMs}ms`,
        });
      } catch (err: any) {
        failedSources.push(cfg.sourceName);
        sourceStatuses.push({
          sourceId: cfg.sourceId,
          sourceName: cfg.sourceName,
          schemaType: cfg.schemaType,
          online: false,
          consentStatus: 'GRANTED',
          fetchState: 'OFFLINE_ERROR',
          latencyMs: getSourceConfig(cfg.sourceId).simulatedLatencyMs,
          lastSyncedAt: cfg.lastSyncedAt,
          recordsReturned: 0,
          errorMessage: err?.message || 'Source adapter unavailable',
        });
      }
    })
  );

  // Preserve consistent source order
  const order: HospitalSourceId[] = ['HOSP_A', 'HOSP_B', 'HOSP_C', 'HOSP_D', 'PAYER_CLAIMS', 'IMM_REG'];
  sourceStatuses.sort((a, b) => order.indexOf(a.sourceId) - order.indexOf(b.sourceId));

  // Step 3: Reconcile & Deduplicate across all responding sources
  const reconciled = reconcileAndDeduplicateBundles(normalizedBundles);

  // Step 4: Apply Field-Level Sensitivity Masking, Minimum Necessary Role Filters, and Safe Harbor De-ID
  const { patientView, clinicalData, maskedItemsCount } = applyPolicyMaskingAndDeId(
    mpiEntry,
    reconciled,
    policyResult,
    user
  );

  // Step 5: Compute Rule-Based Decision Support Summary Card
  const activeProbs = clinicalData.problems.filter((p) => !p.masked && p.clinicalStatus === 'active');
  const activeMeds = clinicalData.medications.filter((m) => !m.masked && m.status !== 'stopped');
  const abnormalLabs = clinicalData.labs.filter((l) => !l.masked && l.interpretation !== 'N');
  const latestEnc = clinicalData.encounters.find((e) => !e.masked);

  const highlights: string[] = [];
  if (activeProbs.length > 0) {
    highlights.push(
      `Primary Active Conditions: ${activeProbs
        .slice(0, 3)
        .map((p) => `${p.display} [${p.sources.join(', ')}]`)
        .join('; ')}`
    );
  }
  const doseConflicts = clinicalData.medications.filter((m) => !m.masked && m.conflictFlag);
  if (doseConflicts.length > 0) {
    highlights.push(
      `Medication Reconciliation Alert: ${doseConflicts.length} medication(s) flagged with cross-hospital dose discrepancy, duplicate therapy, or allergy conflict.`
    );
  }
  if (abnormalLabs.length > 0) {
    const latestAbn = abnormalLabs[abnormalLabs.length - 1];
    highlights.push(
      `Notable Lab Finding: ${latestAbn.testName} = ${latestAbn.value} ${latestAbn.unit} (Ref ${latestAbn.referenceRangeLow}–${latestAbn.referenceRangeHigh}) from ${latestAbn.sources.join(', ')}.`
    );
  }
  const blockedByConsent = sourceStatuses.filter((s) => s.fetchState === 'CONSENT_BLOCKED');
  if (blockedByConsent.length > 0) {
    highlights.push(
      `Consent Notice: Records exist at ${blockedByConsent.map((s) => s.sourceName).join(', ')} but were NOT fetched because patient consent is not granted.`
    );
  }

  const partialDataWarning =
    failedSources.length > 0
      ? `Partial Longitudinal View: ${failedSources.join(
          ', '
        )} failed to respond (Simulated Offline / Timeout). Clinical decisions should account for missing external records.`
      : undefined;

  // Step 6: Write Immutable Hash-Chained Audit Log
  appendAuditLog({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    purposeOfUse: purpose,
    action: 'VIEW_UNIFIED_CHART',
    masterPatientId,
    outcome:
      policyResult.accessLevel === 'BREAK_GLASS_ACTIVE'
        ? 'ALERT_FLAGGED'
        : maskedItemsCount > 0
        ? 'PARTIAL_MASK'
        : 'ALLOW',
    details: `Rendered Unified View for ${masterPatientId} (${
      policyResult.accessLevel
    }). Responding sources: ${
      sourceStatuses.filter((s) => s.fetchState === 'SUCCESS' || s.fetchState === 'CACHED').length
    }/${mpiEntry.linkedRecords.length}. Masked items: ${maskedItemsCount}.`,
    anomalyFlag: policyResult.accessLevel === 'BREAK_GLASS_ACTIVE',
  });

  return {
    masterPatient: patientView,
    deIdentified: policyResult.accessLevel === 'DEIDENTIFIED_RESEARCH',
    accessLevel: policyResult.accessLevel,
    accessDecisionReason: policyResult.accessDecisionReason,
    policyRulesApplied: policyResult.policyRulesApplied,
    breakGlassSession: policyResult.breakGlassSession,
    sourceStatuses,
    partialDataWarning,
    patientSummary: {
      decisionSupportNotice:
        'Rule-Based Clinical Summary — For Clinical Decision Support Only. Verify provenance before ordering.',
      activeConditionsCount: activeProbs.length,
      activeMedsCount: activeMeds.length,
      abnormalLabsCount: abnormalLabs.length,
      careGapsCount: clinicalData.careGaps.length,
      keyHighlights: highlights,
      recentEncounterSummary: latestEnc
        ? `${latestEnc.startDate.slice(0, 10)} at ${latestEnc.facilityName} (${latestEnc.department}): ${latestEnc.primaryDiagnosis}`
        : 'No unmasked encounters available for current role/consent.',
    },
    problems: clinicalData.problems,
    medications: clinicalData.medications,
    labs: clinicalData.labs,
    allergies: clinicalData.allergies,
    encounters: clinicalData.encounters,
    immunizations: clinicalData.immunizations,
    imaging: clinicalData.imaging,
    claims: clinicalData.claims,
    documents: clinicalData.documents,
    careGaps: clinicalData.careGaps,
    maskedItemsCount,
  };
}
