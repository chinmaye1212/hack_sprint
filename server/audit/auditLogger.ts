import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  AuditLogEntry,
  HospitalSourceId,
  PurposeOfUse,
  UserRole,
} from '../../src/types/unichart';

const DB_DIR = path.resolve(process.cwd(), 'server/db/storage');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
const AUDIT_FILE = path.join(DB_DIR, 'immutable_audit_chain.sqlite.json');

function computeEntryHash(
  sequenceNumber: number,
  timestamp: string,
  actorId: string,
  action: string,
  masterPatientId: string | undefined,
  outcome: string,
  details: string,
  prevHash: string
): string {
  const payload = `${sequenceNumber}|${timestamp}|${actorId}|${action}|${masterPatientId || 'NONE'}|${outcome}|${details}|${prevHash}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function buildSeedAuditChain(): AuditLogEntry[] {
  const entries: AuditLogEntry[] = [];
  const seeds: Array<{
    timestamp: string;
    actorId: string;
    actorName: string;
    actorRole: UserRole;
    purposeOfUse: PurposeOfUse;
    action: AuditLogEntry['action'];
    masterPatientId?: string;
    targetSourceId?: HospitalSourceId;
    outcome: AuditLogEntry['outcome'];
    details: string;
    ipAddress: string;
    anomalyFlag?: boolean;
  }> = [
    {
      timestamp: '2026-10-12T08:00:12Z',
      actorId: 'USR-ADMIN-01',
      actorName: 'Suresh Menon',
      actorRole: 'Admin',
      purposeOfUse: 'Operations',
      action: 'POLICY_UPDATED',
      outcome: 'ALLOW',
      details: 'Initialized UniChart HIE ABAC Policy Ruleset v4.2 (DPDP Act 2023 + ABDM Consent Manager Enforced)',
      ipAddress: '10.24.1.10',
    },
    {
      timestamp: '2026-10-12T08:42:05Z',
      actorId: 'USR-PAT-01',
      actorName: 'Rameshwar Kumar Sharma (Patient)',
      actorRole: 'Patient',
      purposeOfUse: 'SelfAccess',
      action: 'CONSENT_UPDATED',
      masterPatientId: 'MPI-1001',
      targetSourceId: 'HOSP_B',
      outcome: 'ALLOW',
      details: 'Patient revoked ABDM Consent Artifact ABDM-CA-2026-9001 for St. Jude Heritage Civil Hospital (HOSP_B)',
      ipAddress: '157.48.22.91',
    },
    {
      timestamp: '2026-10-12T09:15:33Z',
      actorId: 'USR-PHYS-01',
      actorName: 'Dr. Aravind Krishnan, MD',
      actorRole: 'Physician',
      purposeOfUse: 'Treatment',
      action: 'VIEW_UNIFIED_CHART',
      masterPatientId: 'MPI-1001',
      outcome: 'PARTIAL_MASK',
      details: 'Aggregated MPI-1001 across HOSP_A, HOSP_C, HOSP_D, PAYER_CLAIMS, IMM_REG (HOSP_B skipped due to revoked consent)',
      ipAddress: '10.24.8.44',
    },
    {
      timestamp: '2026-10-12T10:05:19Z',
      actorId: 'USR-PHYS-02',
      actorName: 'Dr. Vikramaditya Rao, MD',
      actorRole: 'Physician',
      purposeOfUse: 'Treatment',
      action: 'ACCESS_DENIED',
      masterPatientId: 'MPI-1005',
      outcome: 'DENY',
      details: 'ABAC Policy Violation (POL-ABAC-CARETEAM-02): Clinician not on active care team for MPI-1005',
      ipAddress: '10.24.8.112',
      anomalyFlag: true,
    },
  ];

  let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
  seeds.forEach((s, idx) => {
    const seq = idx + 1;
    const hash = computeEntryHash(
      seq,
      s.timestamp,
      s.actorId,
      s.action,
      s.masterPatientId,
      s.outcome,
      s.details,
      prevHash
    );
    entries.push({
      id: `AUD-2026-${1000 + seq}`,
      sequenceNumber: seq,
      ...s,
      prevHash,
      hash,
    });
    prevHash = hash;
  });

  return entries;
}

let auditChain: AuditLogEntry[] = buildSeedAuditChain();
let originalTamperedBackup: { index: number; originalDetails: string } | null = null;

function saveAuditChain() {
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(auditChain, null, 2), 'utf-8');
}
saveAuditChain();

export function appendAuditLog(params: {
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  purposeOfUse: PurposeOfUse;
  action: AuditLogEntry['action'];
  masterPatientId?: string;
  targetSourceId?: HospitalSourceId;
  outcome: AuditLogEntry['outcome'];
  details: string;
  anomalyFlag?: boolean;
}): AuditLogEntry {
  const last = auditChain[auditChain.length - 1];
  const seq = last ? last.sequenceNumber + 1 : 1;
  const prevHash = last
    ? last.hash
    : '0000000000000000000000000000000000000000000000000000000000000000';
  const timestamp = new Date().toISOString();
  const hash = computeEntryHash(
    seq,
    timestamp,
    params.actorId,
    params.action,
    params.masterPatientId,
    params.outcome,
    params.details,
    prevHash
  );

  const entry: AuditLogEntry = {
    id: `AUD-2026-${1000 + seq}`,
    sequenceNumber: seq,
    timestamp,
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    purposeOfUse: params.purposeOfUse,
    action: params.action,
    masterPatientId: params.masterPatientId,
    targetSourceId: params.targetSourceId,
    outcome: params.outcome,
    details: params.details,
    ipAddress: '10.24.16.88',
    prevHash,
    hash,
    anomalyFlag: params.anomalyFlag,
  };

  auditChain.push(entry);
  saveAuditChain();
  return entry;
}

export function getAuditLogs(): AuditLogEntry[] {
  return [...auditChain].reverse(); // newest first for UI display
}

export interface AuditIntegrityReport {
  valid: boolean;
  totalBlocksChecked: number;
  verifiedAt: string;
  brokenAtSequence?: number;
  brokenEntryId?: string;
  expectedHash?: string;
  actualRecordedHash?: string;
  failureExplanation?: string;
}

export function verifyAuditChainIntegrity(): AuditIntegrityReport {
  let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';

  for (let i = 0; i < auditChain.length; i++) {
    const entry = auditChain[i];
    if (entry.prevHash !== prevHash) {
      return {
        valid: false,
        totalBlocksChecked: i + 1,
        verifiedAt: new Date().toISOString(),
        brokenAtSequence: entry.sequenceNumber,
        brokenEntryId: entry.id,
        expectedHash: prevHash,
        actualRecordedHash: entry.prevHash,
        failureExplanation: `Broken hash link at Block #${entry.sequenceNumber} (${entry.id}): prevHash does not match Block #${entry.sequenceNumber - 1} hash.`,
      };
    }

    const recomputed = computeEntryHash(
      entry.sequenceNumber,
      entry.timestamp,
      entry.actorId,
      entry.action,
      entry.masterPatientId,
      entry.outcome,
      entry.details,
      entry.prevHash
    );

    if (recomputed !== entry.hash) {
      return {
        valid: false,
        totalBlocksChecked: i + 1,
        verifiedAt: new Date().toISOString(),
        brokenAtSequence: entry.sequenceNumber,
        brokenEntryId: entry.id,
        expectedHash: recomputed,
        actualRecordedHash: entry.hash,
        failureExplanation: `Cryptographic SHA-256 mismatch at Block #${entry.sequenceNumber} (${entry.id}): Payload details were modified after block sealing! Recomputed SHA-256 (${recomputed.slice(0, 16)}...) != Stored Hash (${entry.hash.slice(0, 16)}...).`,
      };
    }

    prevHash = entry.hash;
  }

  return {
    valid: true,
    totalBlocksChecked: auditChain.length,
    verifiedAt: new Date().toISOString(),
  };
}

// Simulate unauthorized database tampering on an earlier block so the verifier catches it!
export function simulateAuditTampering(): AuditIntegrityReport {
  if (auditChain.length < 3) {
    return verifyAuditChainIntegrity();
  }
  const targetIdx = Math.min(3, auditChain.length - 1);
  if (!originalTamperedBackup) {
    originalTamperedBackup = {
      index: targetIdx,
      originalDetails: auditChain[targetIdx].details,
    };
  }
  auditChain[targetIdx].details =
    '[TAMPERED BY UNAUTHORIZED DB EDIT] Access was authorized by Care Team (Modified retroactively to hide violation)';
  saveAuditChain();
  return verifyAuditChainIntegrity();
}

export function restoreTamperedAuditChain(): AuditIntegrityReport {
  if (originalTamperedBackup) {
    const { index, originalDetails } = originalTamperedBackup;
    if (auditChain[index]) {
      auditChain[index].details = originalDetails;
    }
    originalTamperedBackup = null;
    saveAuditChain();
  }
  return verifyAuditChainIntegrity();
}

export function resetAuditChain() {
  originalTamperedBackup = null;
  auditChain = buildSeedAuditChain();
  saveAuditChain();
}
