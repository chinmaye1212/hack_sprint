import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  GitMerge,
  KeyRound,
  Lock,
  Search,
  ShieldAlert,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Users,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';
import {
  AuditLogEntry,
  DemoUser,
  HospitalSourceId,
  MasterPatientIndexEntry,
  PurposeOfUse,
  SensitivityCategory,
  StewardMergeCandidate,
} from '../types/unichart';

// ============================================================================
// SCREEN B: PATIENT SEARCH & MPI WORKLIST (Fuzzy Search + Confidence Breakdown)
// ============================================================================
interface PatientSearchWorklistProps {
  currentUser: DemoUser;
  purposeOfUse: PurposeOfUse;
  onSelectPatient: (masterPatientId: string) => void;
}

export const PatientSearchWorklistPage: React.FC<PatientSearchWorklistProps> = ({
  currentUser,
  purposeOfUse,
  onSelectPatient,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    Array<{
      patient: MasterPatientIndexEntry;
      searchMatchScore: number;
      matchedReasons: string[];
      confidenceTier: string;
    }>
  >([]);
  const [loading, setLoading] = useState(false);

  const runSearch = async (qStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/mpi/search?q=${encodeURIComponent(qStr)}`, {
        headers: {
          'x-demo-user-id': currentUser.id,
          'x-purpose-of-use': purposeOfUse,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSearch(query);
  }, [query, currentUser.id]);

  const sampleQueries = [
    { label: 'All Patients (12)', q: '' },
    { label: 'Transliteration: "Kumaar"', q: 'Kumaar' },
    { label: 'Phonetic + Year DOB: "Muhammad 1948"', q: 'Muhammad' },
    { label: 'Maiden Name: "Meera Nair"', q: 'Meera Nair' },
    { label: 'Duplicate Pair: "Saraswathi"', q: 'Saraswathi' },
    { label: 'Nonagenarian (92yo): "Subhash"', q: 'Subhash' },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Enterprise Master Patient Index (EMPI) Search & Worklist
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Probabilistic phonetic & transliteration matching across 4 hospitals + Claims +
              Immunization Registry. High-confidence matches auto-link; medium/low matches queue for
              Data Steward review.
            </p>
          </div>
          <div className="text-xs font-mono text-slate-500 tabular-nums">
            Showing {results.length} MPI Index Records
          </div>
        </div>

        {/* Fuzzy Search Input */}
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Name, Phonetic/Transliteration (e.g., Kumaar, Muhammad), Maiden Name (Nair), Birth Year (1948), Phone, or ABHA ID..."
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
          />
        </div>

        {/* Quick Fuzzy Test Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 mr-1">Test Probabilistic Queries:</span>
          {sampleQueries.map((sq) => (
            <button
              key={sq.label}
              onClick={() => setQuery(sq.q)}
              className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 ${
                query === sq.q
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {sq.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Table */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium">
                <th className="py-3 px-4">MPI / ABHA ID</th>
                <th className="py-3 px-4">Patient & Known Aliases</th>
                <th className="py-3 px-4">DOB / Age / Sex</th>
                <th className="py-3 px-4">Records Found At</th>
                <th className="py-3 px-4">MPI Match Confidence & Explanation</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Executing phonetic & probabilistic MPI lookup...
                  </td>
                </tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No matching patient records found in Central Patient Index.
                  </td>
                </tr>
              ) : (
                results.map(({ patient, searchMatchScore, matchedReasons, confidenceTier }) => {
                  const isCareTeam = currentUser.careTeamMasterIds.includes(
                    patient.masterPatientId
                  );
                  return (
                    <tr
                      key={patient.masterPatientId}
                      className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-3.5 px-4 font-mono tabular-nums align-top">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {patient.masterPatientId}
                        </div>
                        <div className="text-slate-500">{patient.abhaId || 'No ABHA ID'}</div>
                      </td>
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {patient.primaryName}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400">
                          Aliases: {patient.aliases.join(' · ')}
                        </div>
                        <div className="text-blue-700 dark:text-blue-400 font-medium mt-0.5">
                          Scenario: {patient.scenarioTag}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums align-top text-slate-700 dark:text-slate-300">
                        <div>
                          {patient.dob} {patient.dobApproximate ? '(Approx Yr)' : ''}
                        </div>
                        <div>
                          {patient.age} yrs · {patient.sex} · {patient.phone}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-mono text-slate-800 dark:text-slate-200">
                          {patient.linkedRecords.map((r) => r.sourceId).join(' · ')}
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {patient.linkedRecords.length} facility database(s)
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-mono font-semibold tabular-nums">
                          <span
                            className={
                              searchMatchScore >= 85
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }
                          >
                            {searchMatchScore}% ({confidenceTier.replace(/_/g, ' ')})
                          </span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                          {matchedReasons.join(' · ')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right align-top">
                        <button
                          onClick={() => onSelectPatient(patient.masterPatientId)}
                          className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors whitespace-nowrap shrink-0"
                        >
                          Open Unified View
                        </button>
                        {!isCareTeam && currentUser.role === 'Physician' && (
                          <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                            Not on Care Team (BTG Test)
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SCREEN D: DATA STEWARD CONSOLE (Duplicate / Merge Review Queue)
// ============================================================================
interface StewardConsoleProps {
  currentUser: DemoUser;
  purposeOfUse: PurposeOfUse;
  onAfterResolve: () => void;
}

export const StewardConsolePage: React.FC<StewardConsoleProps> = ({
  currentUser,
  purposeOfUse,
  onAfterResolve,
}) => {
  const [queue, setQueue] = useState<StewardMergeCandidate[]>([]);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const loadQueue = async () => {
    const res = await fetch('/api/steward/queue', {
      headers: { 'x-demo-user-id': currentUser.id, 'x-purpose-of-use': purposeOfUse },
    });
    if (res.ok) {
      const data = await res.json();
      setQueue(data.queue || []);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleDecision = async (candidateId: string, decision: 'APPROVED' | 'REJECTED') => {
    const res = await fetch(`/api/steward/queue/${candidateId}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-id': currentUser.id,
        'x-purpose-of-use': purposeOfUse,
      },
      body: JSON.stringify({
        decision,
        notes:
          reviewNotes[candidateId] ||
          (decision === 'APPROVED'
            ? 'Verified transposed DD/MM/YY DOB and patronymic abbreviation; approved MPI link.'
            : 'Rejected merge: distinct spouse names and residential addresses indicate separate individuals.'),
      }),
    });
    if (res.ok) {
      await loadQueue();
      onAfterResolve();
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          EMPI Data Steward Console — Probabilistic Duplicate & Merge Review Queue
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Safety Policy: Candidate pairs scoring between 50% and 84% are never auto-merged. Data
          Stewards inspect side-by-side field comparisons before linking records in the Central
          Patient Index.
        </p>
      </div>

      <div className="space-y-4">
        {queue.map((cand) => (
          <div
            key={cand.id}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Candidate Pair {cand.id}: {cand.leftRecord.name} ↔ {cand.rightRecord.name}
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{cand.reason}</p>
              </div>
              <div className="font-mono text-xs tabular-nums">
                Match Score: <span className="font-bold text-amber-600">{cand.score}%</span> ·
                Status:{' '}
                <span
                  className={
                    cand.status === 'APPROVED'
                      ? 'text-emerald-600 font-bold'
                      : cand.status === 'REJECTED'
                      ? 'text-red-600 font-bold'
                      : 'text-amber-600 font-bold'
                  }
                >
                  {cand.status}
                </span>
              </div>
            </div>

            {/* Side-by-Side Demographic Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500">
                    <th className="py-2 px-3">Demographic Attribute</th>
                    <th className="py-2 px-3">
                      Primary Record ({cand.leftRecord.sourceId} · {cand.leftRecord.localId})
                    </th>
                    <th className="py-2 px-3">
                      Candidate Legacy Record ({cand.rightRecord.sourceId} ·{' '}
                      {cand.rightRecord.localId})
                    </th>
                    <th className="py-2 px-3 text-right">Similarity</th>
                    <th className="py-2 px-3">Algorithmic Explanation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {cand.matchedFields.map((mf, i) => (
                    <tr key={i}>
                      <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                        {mf.field}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-900 dark:text-slate-100">
                        {mf.leftValue}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-900 dark:text-slate-100">
                        {mf.rightValue}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums">
                        {mf.similarity}%
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                        {mf.explanation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {cand.status === 'PENDING' ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <input
                  type="text"
                  value={reviewNotes[cand.id] || ''}
                  onChange={(e) => setReviewNotes({ ...reviewNotes, [cand.id]: e.target.value })}
                  placeholder="Optional Steward review rationale (recorded in SHA-256 audit log)..."
                  className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDecision(cand.id, 'REJECTED')}
                    className="px-3.5 py-1.5 rounded-md border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 text-xs font-medium transition-colors"
                  >
                    Reject Merge (Keep Separate)
                  </button>
                  <button
                    onClick={() => handleDecision(cand.id, 'APPROVED')}
                    className="px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
                  >
                    Approve & Link in Central Index
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2 text-xs text-slate-600 dark:text-slate-400 font-mono">
                Decision: {cand.status} by {cand.reviewedBy} at {cand.reviewedAt?.slice(0, 19)} — “
                {cand.reviewNotes}”
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// SCREEN F: PRIVACY OFFICER & AUDIT INTEGRITY VIEW (Hash Chain + Tamper Test)
// ============================================================================
interface PrivacyOfficerViewProps {
  currentUser: DemoUser;
  purposeOfUse: PurposeOfUse;
}

export const PrivacyOfficerViewPage: React.FC<PrivacyOfficerViewProps> = ({
  currentUser,
  purposeOfUse,
}) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [integrity, setIntegrity] = useState<{
    valid: boolean;
    totalBlocksChecked: number;
    verifiedAt: string;
    brokenAtSequence?: number;
    brokenEntryId?: string;
    expectedHash?: string;
    actualRecordedHash?: string;
    failureExplanation?: string;
  } | null>(null);

  const loadAudit = async () => {
    const res = await fetch('/api/audit/logs', {
      headers: { 'x-demo-user-id': currentUser.id, 'x-purpose-of-use': purposeOfUse },
    });
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs || []);
      setIntegrity(data.integrity);
    }
  };

  useEffect(() => {
    loadAudit();
  }, []);

  const handleVerify = async () => {
    const res = await fetch('/api/audit/verify', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setIntegrity(data.integrity);
      setLogs(data.logs || []);
    }
  };

  const handleSimulateTamper = async () => {
    const res = await fetch('/api/audit/simulate-tamper', {
      method: 'POST',
      headers: { 'x-demo-user-id': currentUser.id, 'x-purpose-of-use': purposeOfUse },
    });
    if (res.ok) {
      const data = await res.json();
      setIntegrity(data.integrity);
      setLogs(data.logs || []);
    }
  };

  const handleRestoreChain = async () => {
    const res = await fetch('/api/audit/restore-chain', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setIntegrity(data.integrity);
      setLogs(data.logs || []);
    }
  };

  const btgAlerts = logs.filter(
    (l) => l.action === 'BREAK_THE_GLASS' || l.action === 'ACCESS_DENIED' || l.anomalyFlag
  );

  return (
    <div className="p-6 space-y-5">
      {/* Cryptographic Hash-Chain Verifier Card */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Privacy Officer Console & Immutable SHA-256 Hash-Chained Audit Ledger
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Every search, chart view, per-hospital adapter fetch, access denial, consent update,
              and Break-the-Glass override is cryptographically chained (`prevHash` → `hash`).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleVerify}
              className="px-3.5 py-2 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium hover:bg-slate-800 transition-colors"
            >
              Verify Hash Chain Integrity
            </button>
            {integrity?.valid ? (
              <button
                onClick={handleSimulateTamper}
                className="px-3.5 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
              >
                Simulate Unauthorized DB Tamper
              </button>
            ) : (
              <button
                onClick={handleRestoreChain}
                className="px-3.5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
              >
                Restore Tampered Block
              </button>
            )}
          </div>
        </div>

        {integrity && (
          <div
            className={`rounded-md border p-4 text-xs ${
              integrity.valid
                ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                : 'border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2 font-semibold">
              <span>
                {integrity.valid
                  ? `CRYPTOGRAPHIC INTEGRITY VERIFIED — All ${integrity.totalBlocksChecked} Hash-Chained Audit Blocks Intact`
                  : `TAMPER DETECTED AT BLOCK #${integrity.brokenAtSequence} (${integrity.brokenEntryId}) — Cryptographic Hash Chain Broken!`}
              </span>
              <span className="font-mono tabular-nums">
                Checked at {new Date(integrity.verifiedAt).toLocaleTimeString()}
              </span>
            </div>
            {!integrity.valid && (
              <div className="mt-2 font-mono space-y-1">
                <div>Reason: {integrity.failureExplanation}</div>
                <div>Expected SHA-256: {integrity.expectedHash}</div>
                <div>Recorded SHA-256: {integrity.actualRecordedHash}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Break-the-Glass & Anomaly Alerts */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Break-the-Glass Overrides, Access Denials & Anomaly Flags ({btgAlerts.length})
        </h2>
        <div className="space-y-2">
          {btgAlerts.map((al) => (
            <div
              key={al.id}
              className="rounded border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <span className="font-mono font-bold text-red-700 dark:text-red-400">
                  [{al.action}]
                </span>{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {al.actorName} ({al.actorRole})
                </span>{' '}
                — {al.details}
              </div>
              <span className="font-mono text-slate-500 shrink-0 tabular-nums">
                Block #{al.sequenceNumber} · {al.timestamp.slice(0, 19)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Full Hash-Chained Audit Table */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium">
                <th className="py-2.5 px-3">Seq #</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor & Role</th>
                <th className="py-2.5 px-3">Action & Outcome</th>
                <th className="py-2.5 px-3">Event Details</th>
                <th className="py-2.5 px-3">PrevHash → Block SHA-256</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {logs.map((log) => {
                const isBroken = integrity && !integrity.valid && integrity.brokenAtSequence === log.sequenceNumber;
                return (
                  <tr
                    key={log.id}
                    className={
                      isBroken
                        ? 'bg-red-100/80 dark:bg-red-950/60'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    }
                  >
                    <td className="py-2.5 px-3 font-mono font-semibold tabular-nums">
                      #{log.sequenceNumber}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">
                      {log.timestamp.slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {log.actorName}
                      </div>
                      <div className="text-slate-500">
                        {log.actorRole} · {log.purposeOfUse}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {log.action}
                      </div>
                      <div
                        className={
                          log.outcome === 'DENY' || log.outcome === 'ALERT_FLAGGED'
                            ? 'text-red-600 font-bold'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }
                      >
                        {log.outcome}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-md">
                      {log.details}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 tabular-nums">
                      <div>prev: {log.prevHash.slice(0, 12)}…</div>
                      <div className="text-slate-800 dark:text-slate-200 font-medium">
                        hash: {log.hash.slice(0, 12)}…
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SCREEN G: PATIENT PORTAL (ABDM Consent Manager & Plain-Language Health Locker)
// ============================================================================
interface PatientPortalProps {
  masterPatientId: string;
  currentUser: DemoUser;
  onConsentChanged: () => void;
}

export const PatientPortalPage: React.FC<PatientPortalProps> = ({
  masterPatientId,
  currentUser,
  onConsentChanged,
}) => {
  const [patient, setPatient] = useState<MasterPatientIndexEntry | null>(null);
  const [savingSource, setSavingSource] = useState<string | null>(null);

  const loadPatient = async () => {
    const res = await fetch(`/api/mpi/patients/${masterPatientId}`);
    if (res.ok) {
      const data = await res.json();
      setPatient(data.patient);
    }
  };

  useEffect(() => {
    loadPatient();
  }, [masterPatientId]);

  const handleToggleHospitalConsent = async (sourceId: HospitalSourceId, granted: boolean) => {
    if (!patient) return;
    setSavingSource(sourceId);
    const existing = patient.consents[sourceId];
    await fetch(`/api/patients/${masterPatientId}/consent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-id': currentUser.id,
        'x-purpose-of-use': 'SelfAccess',
      },
      body: JSON.stringify({
        sourceId,
        granted,
        allowedCategories: existing?.allowedCategories,
        allowedSensitivity: existing?.allowedSensitivity || ['GENERAL'],
      }),
    });
    await loadPatient();
    setSavingSource(null);
    onConsentChanged();
  };

  const handleToggleMentalHealthSensitivity = async (sourceId: HospitalSourceId) => {
    if (!patient) return;
    setSavingSource(sourceId);
    const existing = patient.consents[sourceId];
    const currentSens: SensitivityCategory[] = existing?.allowedSensitivity || ['GENERAL'];
    const hasMh = currentSens.includes('MENTAL_HEALTH');
    const nextSens: SensitivityCategory[] = hasMh
      ? currentSens.filter((s) => s !== 'MENTAL_HEALTH')
      : [...currentSens, 'MENTAL_HEALTH', 'SUBSTANCE_USE'];

    await fetch(`/api/patients/${masterPatientId}/consent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-id': currentUser.id,
        'x-purpose-of-use': 'SelfAccess',
      },
      body: JSON.stringify({
        sourceId,
        granted: existing?.granted ?? true,
        allowedCategories: existing?.allowedCategories,
        allowedSensitivity: nextSens,
      }),
    });
    await loadPatient();
    setSavingSource(null);
    onConsentChanged();
  };

  if (!patient) {
    return <div className="p-6 text-xs text-slate-500">Loading Patient Health Locker...</div>;
  }

  return (
    <div className="p-6 space-y-5">
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Patient Self-Service Portal & ABDM Consent Manager ({patient.primaryName})
          </h1>
          <span className="font-mono text-xs text-blue-600 dark:text-blue-400">
            ABHA ID: {patient.abhaId || 'Unlinked'} · DPDP Act 2023 Compliant
          </span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          In plain language: You control which hospitals are allowed to share your medical records
          with your treating doctors. When consent is turned <strong>OFF</strong> for a hospital
          (such as St. Jude Heritage Civil Hospital), UniChart will show your doctor that records
          exist there, but will <strong>never fetch or display</strong> your clinical data from that
          hospital until you grant consent below.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {patient.linkedRecords.map((link) => {
          const consent = patient.consents[link.sourceId];
          const isGranted = consent?.granted ?? true;
          const sharesSensitive = consent?.allowedSensitivity?.includes('MENTAL_HEALTH');

          return (
            <div
              key={link.sourceId}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {link.sourceName} ({link.sourceId})
                    </h2>
                    <div className="text-xs font-mono text-slate-500">
                      Hospital Patient ID: {link.localPatientId} · Artifact:{' '}
                      {consent?.consentArtifactId}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold ${
                      isGranted
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {isGranted ? 'SHARING ENABLED' : 'CONSENT REVOKED'}
                  </span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400">
                  <strong>Records held at this hospital:</strong>{' '}
                  {link.availableCategories.join(', ')}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Allow Care-Team Doctors to Fetch Records from {link.sourceId}
                  </span>
                  <button
                    disabled={savingSource === link.sourceId}
                    onClick={() => handleToggleHospitalConsent(link.sourceId, !isGranted)}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      isGranted
                        ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {isGranted ? 'Revoke Hospital Consent' : 'Grant Hospital Consent'}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Include Sensitive Behavioral / Mental Health Notes:
                  </span>
                  <button
                    disabled={savingSource === link.sourceId}
                    onClick={() => handleToggleMentalHealthSensitivity(link.sourceId)}
                    className="text-xs font-mono underline text-blue-600 dark:text-blue-400"
                  >
                    {sharesSensitive ? 'Shared (Click to Restrict)' : 'Masked (Click to Share)'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// SCREEN E + ARCHITECTURE & PRODUCTION README PAGE
// ============================================================================
export const AdminAndArchitecturePage: React.FC<{
  sources: Array<{
    sourceId: HospitalSourceId;
    sourceName: string;
    schemaType: string;
    codingSystems: string;
    online: boolean;
    simulatedLatencyMs: number;
    lastSyncedAt: string;
  }>;
  onToggleSource: (sourceId: HospitalSourceId, online: boolean) => Promise<void>;
}> = ({ sources, onToggleSource }) => {
  return (
    <div className="p-6 space-y-6">
      {/* Live Adapter & Source Control Panel */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Admin Console & Hybrid Federated Architecture Blueprint
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage federated hospital adapters, inspect the hybrid architecture pipeline, and review
            production FHIR R4 / SMART on FHIR / ABDM specifications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {sources.map((s) => (
            <div
              key={s.sourceId}
              className="rounded-md border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/50"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-slate-100">
                  <span>
                    {s.sourceName} ({s.sourceId})
                  </span>
                  <span
                    className={`font-mono ${
                      s.online ? 'text-emerald-600' : 'text-red-600 font-bold'
                    }`}
                  >
                    {s.online ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">{s.schemaType}</div>
                <div className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1">
                  Codes: {s.codingSystems}
                </div>
              </div>
              <button
                onClick={() => onToggleSource(s.sourceId, !s.online)}
                className={`w-full py-1.5 rounded text-xs font-medium transition-colors ${
                  s.online
                    ? 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {s.online ? 'Simulate Adapter Outage (Offline)' : 'Restore Adapter Online'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Hybrid Flow Diagram */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          UniChart Hybrid Architecture Pipeline (Zero Clinical Data in Central Index)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="rounded border border-slate-200 dark:border-slate-800 p-3.5 space-y-1.5">
            <div className="font-mono font-bold text-blue-600">01. Identity & MPI Resolution</div>
            <p className="text-slate-600 dark:text-slate-400">
              Central Patient Index stores only demographics, phonetic/Soundex aliases, ABHA ID, and
              facility pointers (`HOSP_A`..`HOSP_D`). Low-confidence matches route to the Data
              Steward queue.
            </p>
          </div>
          <div className="rounded border border-slate-200 dark:border-slate-800 p-3.5 space-y-1.5">
            <div className="font-mono font-bold text-blue-600">
              02. ABAC Policy & ABDM Consent Gate
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Verifies clinician Care-Team assignment, Purpose of Use, and per-hospital ABDM Consent
              Artifacts <em>before</em> invoking any hospital adapter. Unconsented adapters are
              never called.
            </p>
          </div>
          <div className="rounded border border-slate-200 dark:border-slate-800 p-3.5 space-y-1.5">
            <div className="font-mono font-bold text-blue-600">
              03. Parallel Fan-Out & Normalization
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Parallel async adapters query disparate schemas (FHIR R4, Legacy DD/MM/YY flat tables,
              custom SI-unit tables), convert `umol/L → mg/dL`, map free-text to ICD-10, and cache
              with AES-256-GCM (10m TTL).
            </p>
          </div>
          <div className="rounded border border-slate-200 dark:border-slate-800 p-3.5 space-y-1.5">
            <div className="font-mono font-bold text-blue-600">
              04. Reconcile, Mask & Hash-Chain Audit
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Deduplicates records, flags dose/allergy conflicts, masks `MENTAL_HEALTH` /
              `SUBSTANCE_USE` or applies Researcher Safe Harbor De-ID, and appends a SHA-256 block
              to the audit log.
            </p>
          </div>
        </div>
      </div>

      {/* Production Mapping & Regulatory Alignment README */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 text-xs text-slate-700 dark:text-slate-300">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          In-App Engineering README: Production Architecture & Regulatory Mapping
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 leading-relaxed">
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              1. Interoperability & Terminology Standards
            </h3>
            <p>
              • <strong>FHIR R4 & SMART on FHIR:</strong> Production adapters connect to hospital
              EHRs via HL7 FHIR R4 REST APIs (`Patient`, `Condition`, `MedicationRequest`,
              `Observation`, `AllergyIntolerance`, `Encounter`, `DocumentReference`) authorized via
              SMART on FHIR OAuth2/OIDC scopes (`patient/*.read`).
            </p>
            <p>
              • <strong>Terminology Service:</strong> Uses an enterprise FHIR Terminology Server
              (`$translate` & `$lookup`) mapping legacy free-text and local codes to ICD-10-CM,
              SNOMED-CT, LOINC, RxNorm, and UCUM units.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              2. Security, KMS Encryption & DPDP / ABDM / HIPAA Compliance
            </h3>
            <p>
              • <strong>India DPDP Act 2023 & ABDM HIE-CM:</strong> Aligns with Ayushman Bharat
              Digital Mission (ABDM) Health Information User (HIU) and Health Information Provider
              (HIP) flows using DEPA/ABDM Consent Artifacts and 14-digit ABHA IDs.
            </p>
            <p>
              • <strong>KMS & mTLS:</strong> All federated adapter traffic runs over mTLS 1.3; the
              short-lived 10-minute aggregation cache uses envelope encryption backed by Cloud KMS /
              HSM keys.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
