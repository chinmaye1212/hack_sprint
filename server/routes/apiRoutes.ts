import { Router } from 'express';
import {
  DemoUser,
  HospitalSourceId,
  PurposeOfUse,
  RecordCategory,
  SensitivityCategory,
} from '../../src/types/unichart';
import {
  getAllSourceConfigs,
  resetAllSourcesOnline,
  setSourceOnlineStatus,
} from '../adapters/sourceAdapters';
import {
  appendAuditLog,
  getAuditLogs,
  resetAuditChain,
  restoreTamperedAuditChain,
  simulateAuditTampering,
  verifyAuditChainIntegrity,
} from '../audit/auditLogger';
import {
  DEMO_USERS,
  getMpiEntries,
  getMpiEntryById,
  getStewardQueue,
  resetIndexDb,
  resolveStewardCandidate,
  updatePatientConsent,
} from '../db/indexDb';
import { searchMasterPatientIndex } from '../mpi/mpiService';
import { clearAllBreakGlassGrants, grantBreakTheGlass } from '../policy/policyEngine';
import {
  aggregateUnifiedPatientView,
  clearAdapterCache,
  getCacheStats,
} from '../services/aggregationService';

export const apiRouter = Router();

function resolveUserFromHeaders(req: any): { user: DemoUser; purpose: PurposeOfUse } {
  const userId = (req.headers['x-demo-user-id'] as string) || 'USR-PHYS-01';
  const user = DEMO_USERS.find((u) => u.id === userId) || DEMO_USERS[0];
  const purpose = ((req.headers['x-purpose-of-use'] as PurposeOfUse) || user.defaultPurpose) as PurposeOfUse;
  return { user, purpose };
}

// 1. Auth / Demo Users & System Status
apiRouter.get('/users', (_req, res) => {
  res.json({ users: DEMO_USERS });
});

// 2. Patient Search & MPI Worklist (fuzzy search + confidence explanation)
apiRouter.get('/mpi/search', (req, res) => {
  const { user, purpose } = resolveUserFromHeaders(req);
  const q = (req.query.q as string) || '';
  const results = searchMasterPatientIndex(q);

  if (q.trim().length > 0) {
    appendAuditLog({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      purposeOfUse: purpose,
      action: 'PATIENT_SEARCH',
      outcome: 'ALLOW',
      details: `MPI fuzzy search query="${q.trim()}" returned ${results.length} candidate(s)`,
    });
  }

  res.json({
    query: q,
    count: results.length,
    results,
  });
});

// 3. Get MPI Entry Only ("Records found at" panel before clinical fetch)
apiRouter.get('/mpi/patients/:masterPatientId', (req, res) => {
  const entry = getMpiEntryById(req.params.masterPatientId);
  if (!entry) {
    return res.status(404).json({ error: 'Patient not found in Central Index' });
  }
  res.json({ patient: entry });
});

// 4. Aggregate Unified Patient View (Full hybrid flow)
apiRouter.get('/patients/:masterPatientId/unified-view', async (req, res) => {
  try {
    const { user, purpose } = resolveUserFromHeaders(req);
    const forceRefresh = req.query.refresh === 'true';
    const view = await aggregateUnifiedPatientView(
      req.params.masterPatientId,
      user,
      purpose,
      forceRefresh
    );
    res.json(view);
  } catch (err: any) {
    res.status(404).json({ error: err?.message || 'Failed to aggregate patient view' });
  }
});

// 5. Break-the-Glass Emergency Access Override
apiRouter.post('/patients/:masterPatientId/break-glass', (req, res) => {
  const { user, purpose } = resolveUserFromHeaders(req);
  const { justification, reAuthPin } = req.body || {};

  if (!justification || String(justification).trim().length < 10) {
    return res.status(400).json({
      error: 'A clinical justification of at least 10 characters is required for Break-the-Glass emergency override.',
    });
  }
  if (!reAuthPin || String(reAuthPin).trim().length < 4) {
    return res.status(400).json({
      error: 'Clinician re-authentication PIN is required to confirm emergency Break-the-Glass access.',
    });
  }

  const grant = grantBreakTheGlass(user.id, req.params.masterPatientId, String(justification).trim());

  appendAuditLog({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    purposeOfUse: purpose,
    action: 'BREAK_THE_GLASS',
    masterPatientId: req.params.masterPatientId,
    outcome: 'ALERT_FLAGGED',
    details: `EMERGENCY BREAK-THE-GLASS OVERRIDE by ${user.name} (${user.department}). Justification: "${justification}". Immediate alert dispatched to Privacy Officer.`,
    anomalyFlag: true,
  });

  res.json({ grant });
});

// 6. Update Patient Consent per Hospital & Sensitivity Category (Patient Portal & Demo #4)
apiRouter.post('/patients/:masterPatientId/consent', (req, res) => {
  const { user, purpose } = resolveUserFromHeaders(req);
  const { sourceId, granted, allowedCategories, allowedSensitivity } = req.body as {
    sourceId: HospitalSourceId;
    granted: boolean;
    allowedCategories?: RecordCategory[];
    allowedSensitivity?: SensitivityCategory[];
  };

  const updated = updatePatientConsent(
    req.params.masterPatientId,
    sourceId,
    Boolean(granted),
    allowedCategories,
    allowedSensitivity
  );
  if (!updated) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  // Invalidate cache for this patient/source when consent changes
  clearAdapterCache();

  appendAuditLog({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    purposeOfUse: purpose,
    action: 'CONSENT_UPDATED',
    masterPatientId: req.params.masterPatientId,
    targetSourceId: sourceId,
    outcome: 'ALLOW',
    details: `ABDM Consent Artifact updated for source ${sourceId}: granted=${Boolean(
      granted
    )}, sensitivity=[${(allowedSensitivity || ['GENERAL']).join(', ')}]`,
  });

  res.json({ patient: updated });
});

// 7. Data Steward Duplicate / Merge Review Queue
apiRouter.get('/steward/queue', (_req, res) => {
  res.json({
    queue: getStewardQueue(),
    mpiPatients: getMpiEntries(),
  });
});

apiRouter.post('/steward/queue/:candidateId/resolve', (req, res) => {
  const { user, purpose } = resolveUserFromHeaders(req);
  const { decision, notes } = req.body as { decision: 'APPROVED' | 'REJECTED'; notes: string };
  const resolved = resolveStewardCandidate(
    req.params.candidateId,
    decision,
    user.name,
    notes || `Reviewed by ${user.name}`
  );
  if (!resolved) {
    return res.status(404).json({ error: 'Candidate not found' });
  }
  clearAdapterCache();

  appendAuditLog({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    purposeOfUse: purpose,
    action: 'STEWARD_MERGE_DECISION',
    masterPatientId: resolved.leftRecord.masterPatientId,
    outcome: 'ALLOW',
    details: `Data Steward ${decision} identity merge candidate ${resolved.id} (${resolved.leftRecord.name} <-> ${resolved.rightRecord.name}). Notes: ${resolved.reviewNotes}`,
  });

  res.json({
    candidate: resolved,
    queue: getStewardQueue(),
  });
});

// 8. Source Health & Offline Simulation Toggle (Admin & Demo #5)
apiRouter.get('/sources', (_req, res) => {
  res.json({
    sources: getAllSourceConfigs(),
    cacheStats: getCacheStats(),
  });
});

apiRouter.post('/sources/:sourceId/status', (req, res) => {
  const { user, purpose } = resolveUserFromHeaders(req);
  const sourceId = req.params.sourceId as HospitalSourceId;
  const { online } = req.body as { online: boolean };
  const updated = setSourceOnlineStatus(sourceId, Boolean(online));

  appendAuditLog({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    purposeOfUse: purpose,
    action: 'POLICY_UPDATED',
    targetSourceId: sourceId,
    outcome: 'ALLOW',
    details: `Source adapter ${updated.sourceName} (${sourceId}) state set to ${
      updated.online ? 'ONLINE' : 'SIMULATED OFFLINE'
    }`,
  });

  res.json({ source: updated, sources: getAllSourceConfigs() });
});

// 9. Audit Log, Integrity Verifier, Tamper Simulation & Export Logging
apiRouter.get('/audit/logs', (_req, res) => {
  res.json({
    logs: getAuditLogs(),
    integrity: verifyAuditChainIntegrity(),
  });
});

apiRouter.post('/audit/verify', (_req, res) => {
  res.json({
    integrity: verifyAuditChainIntegrity(),
    logs: getAuditLogs(),
  });
});

apiRouter.post('/audit/simulate-tamper', (req, res) => {
  const { user, purpose } = resolveUserFromHeaders(req);
  const integrity = simulateAuditTampering();
  appendAuditLog({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    purposeOfUse: purpose,
    action: 'TAMPER_SIMULATION',
    outcome: 'ALERT_FLAGGED',
    details: `Admin/Privacy Officer triggered cryptographic tamper simulation on historical block #${integrity.brokenAtSequence}`,
    anomalyFlag: true,
  });
  res.json({
    integrity: verifyAuditChainIntegrity(),
    logs: getAuditLogs(),
  });
});

apiRouter.post('/audit/restore-chain', (_req, res) => {
  const integrity = restoreTamperedAuditChain();
  res.json({
    integrity,
    logs: getAuditLogs(),
  });
});

apiRouter.post('/audit/log-export', (req, res) => {
  const { user, purpose } = resolveUserFromHeaders(req);
  const { masterPatientId, format } = req.body || {};
  appendAuditLog({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    purposeOfUse: purpose,
    action: 'EXPORT_SUMMARY',
    masterPatientId,
    outcome: 'ALLOW',
    details: `Printed / exported Watermarked Patient Summary (${format || 'Print PDF'}) by ${user.name}`,
  });
  res.json({ ok: true });
});

// 10. Reset Demo Environment to Clean Seeded State
apiRouter.post('/demo/reset', (_req, res) => {
  resetIndexDb();
  resetAllSourcesOnline();
  clearAdapterCache();
  clearAllBreakGlassGrants();
  resetAuditChain();
  res.json({ ok: true });
});
