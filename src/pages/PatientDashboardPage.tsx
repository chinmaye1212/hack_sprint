import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  HelpCircle,
  Lock,
  Printer,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BreakTheGlassModal,
  ProvenanceInspectorModal,
  WhyCantISeeThisModal,
} from '../components/ProvenanceAndPolicyModal';
import {
  DemoUser,
  HospitalSourceId,
  ProvenanceMetadata,
  PurposeOfUse,
  UnifiedPatientViewResponse,
} from '../types/unichart';

interface PatientDashboardPageProps {
  masterPatientId: string;
  currentUser: DemoUser;
  purposeOfUse: PurposeOfUse;
  onToggleSourceOnline: (sourceId: HospitalSourceId, online: boolean) => Promise<void>;
  onQuickGrantConsent: (sourceId: HospitalSourceId, granted: boolean) => Promise<void>;
  onNavigateToPortal: () => void;
  refreshSignal: number;
}

type DashboardTab =
  | 'Overview'
  | 'Problems'
  | 'Medications'
  | 'Labs'
  | 'Encounters'
  | 'Imaging'
  | 'Immunizations'
  | 'Claims'
  | 'Documents';

export const PatientDashboardPage: React.FC<PatientDashboardPageProps> = ({
  masterPatientId,
  currentUser,
  purposeOfUse,
  onToggleSourceOnline,
  onQuickGrantConsent,
  onNavigateToPortal,
  refreshSignal,
}) => {
  const [data, setData] = useState<UnifiedPatientViewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [progressiveStep, setProgressiveStep] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<DashboardTab>('Overview');

  // Timeline filters
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedLabAnalyte, setSelectedLabAnalyte] = useState<string>('2160-0'); // Serum Creatinine default

  // Modals state
  const [policyModal, setPolicyModal] = useState<{
    open: boolean;
    title: string;
    reason?: string;
    rule?: string;
  }>({ open: false, title: '' });

  const [provModal, setProvModal] = useState<{
    open: boolean;
    title: string;
    list: ProvenanceMetadata[];
  }>({ open: false, title: '', list: [] });

  const [btgModalOpen, setBtgModalOpen] = useState(false);

  const fetchUnifiedView = async (forceRefresh = false) => {
    setLoading(true);
    setProgressiveStep(1);
    const stepTimer1 = setTimeout(() => setProgressiveStep(2), 140);
    const stepTimer2 = setTimeout(() => setProgressiveStep(3), 280);

    try {
      const res = await fetch(
        `/api/patients/${masterPatientId}/unified-view${forceRefresh ? '?refresh=true' : ''}`,
        {
          headers: {
            'x-demo-user-id': currentUser.id,
            'x-purpose-of-use': purposeOfUse,
          },
        }
      );
      if (res.ok) {
        const json: UnifiedPatientViewResponse = await res.json();
        setData(json);
        if (json.accessLevel === 'CLAIMS_ONLY') {
          setActiveTab('Claims');
        } else if (activeTab === 'Claims') {
          setActiveTab('Overview');
        }
      }
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setProgressiveStep(4);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnifiedView(false);
  }, [masterPatientId, currentUser.id, purposeOfUse, refreshSignal]);

  const handleBreakGlassSubmit = async (justification: string, reAuthPin: string) => {
    const res = await fetch(`/api/patients/${masterPatientId}/break-glass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-id': currentUser.id,
        'x-purpose-of-use': purposeOfUse,
      },
      body: JSON.stringify({ justification, reAuthPin }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to execute Break-the-Glass');
    }
    await fetchUnifiedView(true);
  };

  const handlePrintSummary = async () => {
    await fetch('/api/audit/log-export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-id': currentUser.id,
        'x-purpose-of-use': purposeOfUse,
      },
      body: JSON.stringify({ masterPatientId, format: 'Print Watermarked Summary' }),
    });
    window.print();
  };

  // Build unified longitudinal timeline events
  const timelineEvents = useMemo(() => {
    if (!data) return [];
    const items: Array<{
      id: string;
      date: string;
      category: string;
      title: string;
      subtitle: string;
      sources: HospitalSourceId[];
      masked?: boolean;
      maskReason?: string;
      policyRuleCited?: string;
      provenance: ProvenanceMetadata[];
      conflictFlag?: boolean;
    }> = [];

    data.encounters.forEach((e) =>
      items.push({
        id: e.id,
        date: e.startDate.slice(0, 10),
        category: 'Encounters',
        title: `${e.encounterType}: ${e.department} (${e.facilityName})`,
        subtitle: e.masked ? e.summaryNote : `${e.primaryDiagnosis} — ${e.summaryNote}`,
        sources: e.sources,
        masked: e.masked,
        maskReason: e.maskReason,
        policyRuleCited: e.policyRuleCited,
        provenance: e.provenance,
      })
    );

    data.problems.forEach((p) =>
      items.push({
        id: p.id,
        date: p.recordedDate,
        category: 'Problems',
        title: `${p.display} (${p.code})`,
        subtitle: `Coding: ${p.system} · Status: ${p.clinicalStatus}`,
        sources: p.sources,
        masked: p.masked,
        maskReason: p.maskReason,
        policyRuleCited: p.policyRuleCited,
        provenance: p.provenance,
      })
    );

    data.medications.forEach((m) =>
      items.push({
        id: m.id,
        date: m.startDate,
        category: 'Medications',
        title: `${m.medicationName} — ${m.dosage} (${m.frequency})`,
        subtitle: m.conflictDescription || `Class: ${m.therapeuticClass} · Status: ${m.status}`,
        sources: m.sources,
        masked: m.masked,
        maskReason: m.maskReason,
        policyRuleCited: m.policyRuleCited,
        provenance: m.provenance,
        conflictFlag: m.conflictFlag,
      })
    );

    data.labs.forEach((l) =>
      items.push({
        id: l.id,
        date: l.effectiveDate.slice(0, 10),
        category: 'Labs',
        title: l.masked
          ? l.testName
          : `${l.testName}: ${l.value} ${l.unit} (Ref ${l.referenceRangeLow}–${l.referenceRangeHigh})`,
        subtitle: l.originalUnit
          ? `Normalized from ${l.originalValue} ${l.originalUnit} · Flag: ${l.interpretation}`
          : `LOINC ${l.loincCode} · Flag: ${l.interpretation}`,
        sources: l.sources,
        masked: l.masked,
        maskReason: l.maskReason,
        policyRuleCited: l.policyRuleCited,
        provenance: l.provenance,
      })
    );

    data.imaging.forEach((img) =>
      items.push({
        id: img.id,
        date: img.studyDate.slice(0, 10),
        category: 'Imaging',
        title: `${img.modality}: ${img.bodySite} (CPT ${img.cptCode})`,
        subtitle: img.impression,
        sources: img.sources,
        provenance: img.provenance,
      })
    );

    data.documents.forEach((doc) =>
      items.push({
        id: doc.id,
        date: doc.createdDate.slice(0, 10),
        category: 'Documents',
        title: `${doc.documentType}: ${doc.title}`,
        subtitle: doc.ocrExcerpt,
        sources: doc.sources,
        masked: doc.masked,
        maskReason: doc.maskReason,
        policyRuleCited: doc.policyRuleCited,
        provenance: doc.provenance,
      })
    );

    return items
      .filter((it) => {
        if (
          selectedSourceFilter !== 'ALL' &&
          !it.sources.includes(selectedSourceFilter as HospitalSourceId)
        ) {
          return false;
        }
        if (selectedTypeFilter !== 'ALL' && it.category !== selectedTypeFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data, selectedSourceFilter, selectedTypeFilter]);

  // Filter labs for Recharts trend
  const chartLabs = useMemo(() => {
    if (!data) return [];
    return data.labs
      .filter((l) => !l.masked && l.loincCode === selectedLabAnalyte)
      .map((l) => ({
        date: l.effectiveDate.slice(0, 10),
        value: l.value,
        unit: l.unit,
        source: l.sources.join(', '),
        original: l.originalUnit ? `${l.originalValue} ${l.originalUnit}` : `${l.value} ${l.unit}`,
        refHigh: l.referenceRangeHigh,
        refLow: l.referenceRangeLow,
      }));
  }, [data, selectedLabAnalyte]);

  if (loading && !data) {
    return (
      <div className="p-6 space-y-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <span>
              {progressiveStep === 1 &&
                'Step 1/3: Resolving Master Patient Index (MPI) & verifying ABAC Care-Team attributes...'}
              {progressiveStep === 2 &&
                'Step 2/3: Checking ABDM Consent Artifacts per hospital & fanning out parallel adapter requests...'}
              {progressiveStep >= 3 &&
                'Step 3/3: Normalizing legacy schemas, converting SI lab units, reconciling conflicts & sealing SHA-256 audit log...'}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-20 rounded-md bg-slate-100 dark:bg-slate-800/60 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-sm text-slate-600 dark:text-slate-400">
        Unable to load patient record.
      </div>
    );
  }

  const { masterPatient } = data;
  const canExport =
    currentUser.role === 'Physician' ||
    currentUser.role === 'Patient' ||
    currentUser.role === 'Care Coordinator';

  return (
    <div className="space-y-5 pb-12">
      {/* Subtle PHI Accountability Header Strip (Visible & Print) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 px-6 py-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
        <span>
          PHI SESSION WATERMARK: {currentUser.id} ({currentUser.name} · {currentUser.role} · Purpose:{' '}
          {purposeOfUse})
        </span>
        <span className="tabular-nums">
          MPI: {masterPatient.masterPatientId} · Match Confidence:{' '}
          {masterPatient.overallMatchConfidence}%
        </span>
      </div>

      <div className="px-6 space-y-5">
        {/* Sticky Patient Banner */}
        <div className="sticky top-0 z-20 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-5 py-4 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {masterPatient.primaryName}
                </h1>
                <span className="text-xs font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                  {data.deIdentified && masterPatient.age >= 90
                    ? 'Age: 90+ (Top-Coded Safe Harbor)'
                    : `${masterPatient.age} yrs`}{' '}
                  · Sex: {masterPatient.sex} · DOB: {masterPatient.dob}
                  {masterPatient.dobApproximate ? ' [Approximate / Year-Only Legacy DOB]' : ''}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono">ABHA: {masterPatient.abhaId || 'Unlinked'}</span>
                <span aria-hidden="true">·</span>
                <span>Aliases: {masterPatient.aliases.join(', ')}</span>
                <span aria-hidden="true">·</span>
                <span>Next of Kin: {masterPatient.guardianOrSpouse || 'Not recorded'}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 no-print">
              {/* High-criticality allergy banner alert */}
              {data.allergies.length > 0 ? (
                <div className="rounded-md border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/40 px-3 py-1.5 text-xs text-red-800 dark:text-red-300">
                  <span className="font-semibold">Allergy Alert: </span>
                  {data.allergies.map((a) => a.substance).join(', ')}
                </div>
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  No unmasked allergies
                </div>
              )}

              <button
                onClick={() => fetchUnifiedView(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                title="Bypass 10-min encrypted cache and re-query all hospital adapters"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Sources</span>
              </button>

              {canExport ? (
                <button
                  onClick={handlePrintSummary}
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 dark:bg-slate-100 px-3 py-1.5 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Summary</span>
                </button>
              ) : (
                <span
                  className="text-xs text-slate-400 dark:text-slate-500 font-mono"
                  title="Export/Print disabled for this role under Minimum Necessary policy"
                >
                  [Export Disabled for {currentUser.role}]
                </span>
              )}
            </div>
          </div>

          {/* Access / Policy Status Sub-bar */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              {data.accessLevel === 'DENIED_NO_RELATIONSHIP' ? (
                <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
              ) : data.accessLevel === 'BREAK_GLASS_ACTIVE' ? (
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              )}
              <span className="font-medium">{data.accessDecisionReason}</span>
            </div>

            <div className="flex items-center gap-3">
              {data.maskedItemsCount > 0 && (
                <span className="font-mono text-amber-700 dark:text-amber-400 tabular-nums">
                  {data.maskedItemsCount} record(s) masked by policy
                </span>
              )}
              {data.accessLevel === 'DENIED_NO_RELATIONSHIP' && (
                <button
                  onClick={() => setBtgModalOpen(true)}
                  className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-medium text-xs transition-colors whitespace-nowrap shrink-0"
                >
                  Invoke Emergency Break-the-Glass
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Partial Data / Offline Source Warning Banner */}
        {data.partialDataWarning && (
          <div
            role="alert"
            className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 flex items-start justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-semibold text-amber-900 dark:text-amber-200">
                  Incomplete Longitudinal Record — Source Adapter Unreachable
                </div>
                <p className="text-amber-800 dark:text-amber-300">{data.partialDataWarning}</p>
              </div>
            </div>
          </div>
        )}

        {/* "RECORDS FOUND AT" CENTRAL PATIENT INDEX PANEL + SOURCE HEALTH */}
        <section
          aria-label="Central Patient Index Discovery and Source Health"
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Central Patient Index Discovery (“Records Found At”) & Federated Adapter Status
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Index stores zero clinical content — only pointers, demographic match confidence,
                and ABDM consent state per source.
              </p>
            </div>
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              Linked Facilities: {masterPatient.linkedRecords.length} / 6 Network Sources · Cache
              TTL: 10m (AES-256-GCM)
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {data.sourceStatuses.map((src) => {
              const mpiLink = masterPatient.linkedRecords.find((r) => r.sourceId === src.sourceId);
              const isConsentBlocked = src.fetchState === 'CONSENT_BLOCKED';
              const isOffline = !src.online || src.fetchState === 'OFFLINE_ERROR';

              return (
                <div
                  key={src.sourceId}
                  className="rounded-md border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col justify-between gap-2.5 bg-slate-50/50 dark:bg-slate-950/40"
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {src.sourceName}
                      </span>
                      <span className="text-xs font-mono tabular-nums shrink-0 text-slate-600 dark:text-slate-400">
                        {isOffline
                          ? 'RED · OFFLINE'
                          : isConsentBlocked
                          ? 'AMBER · CONSENT REQ'
                          : src.fetchState === 'NO_RECORDS'
                          ? 'GRAY · NO LINK'
                          : `GREEN · ${src.latencyMs}ms`}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {src.schemaType}
                    </div>

                    {mpiLink ? (
                      <div className="pt-1 space-y-1 text-xs">
                        <div className="font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                          Local ID: {mpiLink.localPatientId} · Name: “{mpiLink.localName}” · Match:{' '}
                          {mpiLink.matchConfidence}%
                        </div>
                        <div className="text-slate-500 dark:text-slate-400">
                          Matched: {mpiLink.matchedFields.join(' · ')}
                        </div>
                        <div className="text-slate-600 dark:text-slate-400">
                          Available Modules: {mpiLink.availableCategories.join(' / ')}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1 text-xs text-slate-400 dark:text-slate-500">
                        No records linked in Central Patient Index for this patient.
                      </div>
                    )}
                  </div>

                  {/* Action / Status Footer per Hospital Source */}
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    {isConsentBlocked && mpiLink && data.accessLevel !== 'DENIED_NO_RELATIONSHIP' ? (
                      <div className="w-full flex items-center justify-between gap-2 text-amber-700 dark:text-amber-400">
                        <span className="font-medium">
                          Records exist at {src.sourceId}, consent required
                        </span>
                        <button
                          onClick={() => onQuickGrantConsent(src.sourceId, true)}
                          className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition-colors whitespace-nowrap shrink-0"
                        >
                          Grant Consent Now
                        </button>
                      </div>
                    ) : (
                      <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        {src.fetchState === 'CACHED'
                          ? `Cached (${src.recordsReturned} items)`
                          : src.fetchState === 'SUCCESS'
                          ? `Fetched ${src.recordsReturned} items`
                          : src.fetchState === 'OFFLINE_ERROR'
                          ? 'Adapter Timeout / 503'
                          : 'Idle'}
                      </span>
                    )}

                    {/* Quick simulation toggle for Demo #5 (Offline source) */}
                    {mpiLink && (
                      <button
                        onClick={() => onToggleSourceOnline(src.sourceId, !src.online)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 underline whitespace-nowrap shrink-0 no-print"
                      >
                        {src.online ? (
                          <>
                            <Wifi className="h-3 w-3 text-emerald-600" />
                            <span>Simulate Offline</span>
                          </>
                        ) : (
                          <>
                            <WifiOff className="h-3 w-3 text-red-600" />
                            <span>Restore Online</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* If Access Denied due to No Care Relationship (Demo #3), show explicit denial gate */}
        {data.accessLevel === 'DENIED_NO_RELATIONSHIP' ? (
          <div className="rounded-lg border border-red-300 dark:border-red-900 bg-white dark:bg-slate-900 p-8 text-center space-y-4">
            <ShieldAlert className="h-10 w-10 text-red-600 mx-auto" />
            <div className="max-w-xl mx-auto space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Clinical Fetch Blocked by ABAC Least-Privilege Policy
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {data.accessDecisionReason}
              </p>
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Rules Enforced: {data.policyRulesApplied.join(' · ')}
              </div>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => setBtgModalOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Invoke Emergency Break-the-Glass Override
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* RULE-BASED PATIENT SUMMARY & CARE GAPS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Rule-Based Patient Summary Card */}
              <div className="lg:col-span-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Longitudinal Patient Summary
                    </h2>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      Rule-Based Decision Support Only
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 py-2 border-b border-slate-100 dark:border-slate-800 text-center">
                    <div>
                      <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {data.patientSummary.activeConditionsCount}
                      </div>
                      <div className="text-xs text-slate-500">Conditions</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {data.patientSummary.activeMedsCount}
                      </div>
                      <div className="text-xs text-slate-500">Active Meds</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                        {data.patientSummary.abnormalLabsCount}
                      </div>
                      <div className="text-xs text-slate-500">Abnormal Labs</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold font-mono tabular-nums text-red-600 dark:text-red-400">
                        {data.patientSummary.careGapsCount}
                      </div>
                      <div className="text-xs text-slate-500">Care Alerts</div>
                    </div>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    {data.patientSummary.keyHighlights.map((hl, idx) => (
                      <li key={idx} className="leading-relaxed">
                        • {hl}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Most Recent Encounter:{' '}
                  </span>
                  {data.patientSummary.recentEncounterSummary}
                </div>
              </div>

              {/* Clinical Care Gaps & Cross-Hospital Reconciliation Alerts */}
              <div className="lg:col-span-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Cross-Hospital Care Gaps & Safety Alerts ({data.careGaps.length})
                  </h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Automated Multi-Source Reconciliation
                  </span>
                </div>

                {data.careGaps.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No active cross-hospital conflicts or care gaps detected for visible records.
                  </div>
                ) : (
                  <div className="mt-3 space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {data.careGaps.map((gap) => (
                      <div
                        key={gap.id}
                        className="rounded-md border border-slate-200 dark:border-slate-800 p-3 text-xs space-y-1 bg-slate-50/60 dark:bg-slate-950/50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-semibold ${
                              gap.severity === 'critical'
                                ? 'text-red-700 dark:text-red-400'
                                : gap.severity === 'warning'
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-blue-700 dark:text-blue-400'
                            }`}
                          >
                            [{gap.severity.toUpperCase()}] {gap.title}
                          </span>
                          <span className="font-mono text-slate-500 shrink-0">
                            Sources: {gap.involvedSources.join(' · ')}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">{gap.description}</p>
                        <div className="text-slate-500 dark:text-slate-400">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            Action:{' '}
                          </span>
                          {gap.recommendation}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* MODULE TABS (Segmented Functional Controls) */}
            <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800/80 no-print">
              {(
                [
                  { id: 'Overview', label: `Timeline (${timelineEvents.length})` },
                  { id: 'Problems', label: `Problems (${data.problems.length})` },
                  { id: 'Medications', label: `Medications (${data.medications.length})` },
                  { id: 'Labs', label: `Labs & Trends (${data.labs.length})` },
                  { id: 'Encounters', label: `Encounters (${data.encounters.length})` },
                  { id: 'Imaging', label: `Imaging (${data.imaging.length})` },
                  { id: 'Immunizations', label: `Immunizations (${data.immunizations.length})` },
                  { id: 'Claims', label: `Claims (${data.claims.length})` },
                  { id: 'Documents', label: `Documents (${data.documents.length})` },
                ] as Array<{ id: DashboardTab; label: string }>
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: LONGITUDINAL TIMELINE */}
            {activeTab === 'Overview' && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Unified Longitudinal Clinical Timeline
                    </h3>
                    <p className="text-xs text-slate-500">
                      Chronological view across all consented hospitals with provenance and conflict
                      indicators.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 no-print">
                    <select
                      aria-label="Filter timeline by hospital source"
                      value={selectedSourceFilter}
                      onChange={(e) => setSelectedSourceFilter(e.target.value)}
                      className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <option value="ALL">All Consented Sources</option>
                      <option value="HOSP_A">HOSP_A (Apex Metro FHIR)</option>
                      <option value="HOSP_B">HOSP_B (St. Jude Legacy)</option>
                      <option value="HOSP_C">HOSP_C (City Care Regional)</option>
                      <option value="HOSP_D">HOSP_D (MedGrid Diagnostics)</option>
                    </select>

                    <select
                      aria-label="Filter timeline by record category"
                      value={selectedTypeFilter}
                      onChange={(e) => setSelectedTypeFilter(e.target.value)}
                      className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <option value="ALL">All Record Categories</option>
                      <option value="Encounters">Encounters</option>
                      <option value="Problems">Problems</option>
                      <option value="Medications">Medications</option>
                      <option value="Labs">Labs</option>
                      <option value="Imaging">Imaging</option>
                      <option value="Documents">Scanned & Clinical Documents</option>
                    </select>
                  </div>
                </div>

                {timelineEvents.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No longitudinal events match the selected filter criteria.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {timelineEvents.map((ev) => (
                      <div
                        key={`${ev.category}-${ev.id}`}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                              {ev.date}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-blue-700 dark:text-blue-400">
                              {ev.category}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">Sources: {ev.sources.join(', ')}</span>
                            {ev.conflictFlag && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-red-600 dark:text-red-400">
                                  Reconcile Conflict Flagged
                                </span>
                              </>
                            )}
                          </div>

                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {ev.title}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            {ev.subtitle}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 no-print">
                          {ev.masked ? (
                            <button
                              onClick={() =>
                                setPolicyModal({
                                  open: true,
                                  title: ev.title,
                                  reason: ev.maskReason,
                                  rule: ev.policyRuleCited,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-amber-300 dark:border-amber-800 text-xs font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-50 transition-colors whitespace-nowrap shrink-0"
                            >
                              <HelpCircle className="h-3.5 w-3.5" />
                              <span>Why can’t I see this?</span>
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setProvModal({
                                  open: true,
                                  title: ev.title,
                                  list: ev.provenance,
                                })
                              }
                              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                            >
                              Provenance ({ev.provenance.length})
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PROBLEMS (Harmonized ICD-10 / SNOMED + Legacy Free-Text Confidence) */}
            {activeTab === 'Problems' && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Harmonized Problem List (ICD-10-CM / SNOMED-CT)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Deduplicated across hospitals; legacy free-text diagnoses show NLP mapping
                      confidence and clinician review flags.
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium">
                        <th className="py-2.5 px-4">ICD-10 / Code</th>
                        <th className="py-2.5 px-4">Standardized Problem Display</th>
                        <th className="py-2.5 px-4">Onset / Recorded</th>
                        <th className="py-2.5 px-4">Mapping Confidence</th>
                        <th className="py-2.5 px-4">Contributing Sources</th>
                        <th className="py-2.5 px-4 text-right">Lineage / Policy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {data.problems.map((p) => {
                        const minConf = Math.min(
                          ...p.provenance.map((pr) => pr.mappingConfidence)
                        );
                        const needsReview = p.provenance.some((pr) => pr.needsClinicianReview);
                        return (
                          <tr
                            key={p.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                          >
                            <td className="py-3 px-4 font-mono font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                              {p.code}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-900 dark:text-slate-100">
                                {p.display}
                              </div>
                              {needsReview && !p.masked && (
                                <div className="text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                                  Needs Clinician Review — Mapped from Legacy Free-Text: “
                                  {p.provenance[0]?.originalText}”
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                              {p.onsetDate} / {p.recordedDate}
                            </td>
                            <td className="py-3 px-4 font-mono tabular-nums">
                              {p.masked ? (
                                <span className="text-amber-600">Restricted</span>
                              ) : (
                                <span
                                  className={
                                    minConf < 0.75
                                      ? 'text-amber-700 dark:text-amber-400 font-semibold'
                                      : 'text-emerald-700 dark:text-emerald-400'
                                  }
                                >
                                  {Math.round(minConf * 100)}% ({p.system})
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                              {p.sources.join(' · ')}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {p.masked ? (
                                <button
                                  onClick={() =>
                                    setPolicyModal({
                                      open: true,
                                      title: p.display,
                                      reason: p.maskReason,
                                      rule: p.policyRuleCited,
                                    })
                                  }
                                  className="text-amber-700 dark:text-amber-400 underline font-medium"
                                >
                                  Why can’t I see this?
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    setProvModal({
                                      open: true,
                                      title: `${p.display} (${p.code})`,
                                      list: p.provenance,
                                    })
                                  }
                                  className="font-mono text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  Inspect ({p.provenance.length})
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: MEDICATIONS & RECONCILIATION VIEW */}
            {activeTab === 'Medications' && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Multi-Hospital Medication Reconciliation & RxNorm View
                  </h3>
                  <p className="text-xs text-slate-500">
                    Automatically flags cross-hospital dose discrepancies, duplicate therapeutic
                    classes, and drug-allergy conflicts.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium">
                        <th className="py-2.5 px-4">RxNorm</th>
                        <th className="py-2.5 px-4">Medication & Generic</th>
                        <th className="py-2.5 px-4">Dosage & Frequency</th>
                        <th className="py-2.5 px-4">Reconciliation Status</th>
                        <th className="py-2.5 px-4">Sources</th>
                        <th className="py-2.5 px-4 text-right">Provenance / Policy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {data.medications.map((m) => (
                        <tr
                          key={m.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        >
                          <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                            {m.masked ? 'MASKED' : m.rxNormCode}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {m.medicationName}
                            </div>
                            <div className="text-slate-500">{m.therapeuticClass}</div>
                            {m.conflictFlag && !m.masked && (
                              <div className="mt-1 text-red-600 dark:text-red-400 font-medium">
                                Reconcile Alert: {m.conflictDescription}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-800 dark:text-slate-200">
                            {m.masked ? '—' : `${m.dosage} · ${m.frequency}`}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {m.masked ? (
                              <span className="text-amber-600">Restricted</span>
                            ) : m.conflictFlag ? (
                              <span className="text-red-600 dark:text-red-400 font-semibold">
                                Reconcile Required ({m.reconciliationStatus})
                              </span>
                            ) : (
                              <span className="text-emerald-700 dark:text-emerald-400">
                                {m.reconciliationStatus}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                            {m.sources.join(' · ')}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {m.masked ? (
                              <button
                                onClick={() =>
                                  setPolicyModal({
                                    open: true,
                                    title: m.medicationName,
                                    reason: m.maskReason,
                                    rule: m.policyRuleCited,
                                  })
                                }
                                className="text-amber-700 dark:text-amber-400 underline font-medium"
                              >
                                Why can’t I see this?
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  setProvModal({
                                    open: true,
                                    title: m.medicationName,
                                    list: m.provenance,
                                  })
                                }
                                className="font-mono text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Inspect ({m.provenance.length})
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: LABS & RECHARTS TRENDS (Unit Conversion Demonstration) */}
            {activeTab === 'Labs' && (
              <div className="space-y-5">
                {/* Recharts Longitudinal Trend Card */}
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Harmonized Longitudinal Lab Trend (SI to Conventional Unit Normalization)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Hospital C values recorded in SI units (umol/L or mmol/L) are automatically
                        converted to canonical mg/dL before plotting.
                      </p>
                    </div>
                    <div className="flex items-center gap-1 p-1 rounded-md bg-slate-100 dark:bg-slate-800">
                      {[
                        { code: '2160-0', label: 'Serum Creatinine (mg/dL)' },
                        { code: '4548-4', label: 'HbA1c (%)' },
                        { code: '2345-7', label: 'Fasting Glucose (mg/dL)' },
                      ].map((item) => (
                        <button
                          key={item.code}
                          onClick={() => setSelectedLabAnalyte(item.code)}
                          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                            selectedLabAnalyte === item.code
                              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {chartLabs.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-500">
                      No unmasked data points for the selected analyte.
                    </div>
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartLabs}
                          margin={{ top: 10, right: 24, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.4} />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                          <Tooltip
                            contentStyle={{
                              fontSize: '12px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                            }}
                            formatter={(val: any, _name: any, props: any) => [
                              `${val} ${props.payload.unit} (Raw: ${props.payload.original} from ${props.payload.source})`,
                              'Normalized Value',
                            ]}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          {chartLabs[0]?.refHigh && (
                            <ReferenceLine
                              y={chartLabs[0].refHigh}
                              stroke="#dc2626"
                              strokeDasharray="4 4"
                              label={{
                                value: `Upper Limit (${chartLabs[0].refHigh})`,
                                fill: '#dc2626',
                                fontSize: 11,
                              }}
                            />
                          )}
                          <Line
                            type="monotone"
                            dataKey="value"
                            name="Canonical Harmonized Value"
                            stroke="#2563eb"
                            strokeWidth={2.5}
                            dot={{ r: 5, fill: '#2563eb' }}
                            activeDot={{ r: 7 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Lab Results Table */}
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium">
                          <th className="py-2.5 px-4">Date</th>
                          <th className="py-2.5 px-4">LOINC & Analyte</th>
                          <th className="py-2.5 px-4 text-right">Normalized Value</th>
                          <th className="py-2.5 px-4 text-right">Original Source Value</th>
                          <th className="py-2.5 px-4 text-right">Ref Range</th>
                          <th className="py-2.5 px-4">Flag</th>
                          <th className="py-2.5 px-4">Source</th>
                          <th className="py-2.5 px-4 text-right">Lineage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {data.labs.map((l) => (
                          <tr
                            key={l.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                          >
                            <td className="py-3 px-4 font-mono tabular-nums text-slate-600 dark:text-slate-400">
                              {l.effectiveDate.slice(0, 10)}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                              {l.testName}{' '}
                              <span className="font-mono text-slate-500">({l.loincCode})</span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                              {l.masked ? 'MASKED' : `${l.value} ${l.unit}`}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                              {l.masked
                                ? '—'
                                : l.originalUnit
                                ? `${l.originalValue} ${l.originalUnit} (Converted)`
                                : `${l.value} ${l.unit}`}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                              {l.referenceRangeLow} – {l.referenceRangeHigh} {l.unit}
                            </td>
                            <td className="py-3 px-4 font-mono font-semibold">
                              {l.interpretation === 'N' ? (
                                <span className="text-emerald-700 dark:text-emerald-400">
                                  NORMAL
                                </span>
                              ) : (
                                <span className="text-red-600 dark:text-red-400">
                                  ABNORMAL ({l.interpretation})
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                              {l.sources.join(', ')}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {l.masked ? (
                                <button
                                  onClick={() =>
                                    setPolicyModal({
                                      open: true,
                                      title: l.testName,
                                      reason: l.maskReason,
                                      rule: l.policyRuleCited,
                                    })
                                  }
                                  className="text-amber-700 underline"
                                >
                                  Why masked?
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    setProvModal({
                                      open: true,
                                      title: `${l.testName} (${l.effectiveDate.slice(0, 10)})`,
                                      list: l.provenance,
                                    })
                                  }
                                  className="font-mono text-blue-600 hover:underline"
                                >
                                  Inspect
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: ENCOUNTERS */}
            {activeTab === 'Encounters' && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                {data.encounters.map((enc) => (
                  <div key={enc.id} className="p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {enc.startDate.slice(0, 10)} · {enc.encounterType} · {enc.department} (
                        {enc.facilityName})
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-500">
                          Provider: {enc.providerName} · Source: {enc.sources.join(', ')}
                        </span>
                        {enc.masked ? (
                          <button
                            onClick={() =>
                              setPolicyModal({
                                open: true,
                                title: `${enc.department} Encounter`,
                                reason: enc.maskReason,
                                rule: enc.policyRuleCited,
                              })
                            }
                            className="text-amber-700 dark:text-amber-400 underline font-medium"
                          >
                            Why can’t I see this?
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              setProvModal({
                                open: true,
                                title: `${enc.department} (${enc.startDate.slice(0, 10)})`,
                                list: enc.provenance,
                              })
                            }
                            className="font-mono text-blue-600 hover:underline"
                          >
                            Provenance
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      Diagnosis: {enc.primaryDiagnosis}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {enc.summaryNote}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 6: IMAGING */}
            {activeTab === 'Imaging' && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                {data.imaging.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No imaging studies returned from linked diagnostic sources.
                  </div>
                ) : (
                  data.imaging.map((img) => (
                    <div key={img.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {img.studyDate.slice(0, 10)} · {img.modality} — {img.bodySite} (CPT{' '}
                          {img.cptCode})
                        </span>
                        <button
                          onClick={() =>
                            setProvModal({
                              open: true,
                              title: `${img.modality}: ${img.bodySite}`,
                              list: img.provenance,
                            })
                          }
                          className="font-mono text-blue-600 hover:underline"
                        >
                          Source: {img.sources.join(', ')} (Inspect)
                        </button>
                      </div>
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        Impression: {img.impression}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Findings: {img.findings} (Radiologist: {img.radiologist})
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 7: IMMUNIZATIONS */}
            {activeTab === 'Immunizations' && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium">
                      <th className="py-2.5 px-4">CVX Code</th>
                      <th className="py-2.5 px-4">Vaccine Name</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Lot Number</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Registry Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {data.immunizations.map((imm) => (
                      <tr key={imm.id}>
                        <td className="py-3 px-4 font-mono tabular-nums">{imm.cvxCode}</td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                          {imm.vaccineName}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums">{imm.occurrenceDate}</td>
                        <td className="py-3 px-4 font-mono">{imm.lotNumber}</td>
                        <td className="py-3 px-4 font-medium">
                          {imm.status === 'overdue' ? (
                            <span className="text-amber-700 dark:text-amber-400">
                              OVERDUE BOOSTER
                            </span>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-400">
                              COMPLETED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono">{imm.sources.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 8: CLAIMS (Visible to Billing Analyst & Authorized Roles) */}
            {activeTab === 'Claims' && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Payer & TPA Adjudicated Claims Ledger
                  </h3>
                  <p className="text-xs text-slate-500">
                    Accessible to Billing Analyst under Minimum Necessary Policy (clinical notes and
                    lab values remain masked).
                  </p>
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium">
                      <th className="py-2.5 px-4">Claim ID</th>
                      <th className="py-2.5 px-4">Service Date</th>
                      <th className="py-2.5 px-4">Facility & Payer</th>
                      <th className="py-2.5 px-4">CPT / ICD-10</th>
                      <th className="py-2.5 px-4 text-right">Billed (INR)</th>
                      <th className="py-2.5 px-4 text-right">Paid (INR)</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {data.claims.map((c) => (
                      <tr key={c.id}>
                        <td className="py-3 px-4 font-mono font-medium">{c.claimNumber}</td>
                        <td className="py-3 px-4 font-mono tabular-nums">{c.serviceDate}</td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {c.facilityName}
                          </div>
                          <div className="text-slate-500">{c.payerName}</div>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          CPT: {c.cptCodes.join(', ')} · ICD: {c.icd10Codes.join(', ')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          ₹{c.billedAmountInr.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                          ₹{c.paidAmountInr.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 font-medium text-emerald-700 dark:text-emerald-400">
                          {c.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 9: DOCUMENTS & SCANNED LEGACY PAPER CHARTS */}
            {activeTab === 'Documents' && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                {data.documents.map((doc) => (
                  <div key={doc.id} className="p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        [{doc.format}] {doc.title} ({doc.pageCount} pages)
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-500 tabular-nums">
                          Date: {doc.createdDate.slice(0, 10)} · Source: {doc.sources.join(', ')}
                        </span>
                        {doc.masked ? (
                          <button
                            onClick={() =>
                              setPolicyModal({
                                open: true,
                                title: doc.title,
                                reason: doc.maskReason,
                                rule: doc.policyRuleCited,
                              })
                            }
                            className="text-amber-700 underline font-medium"
                          >
                            Why can’t I see this?
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              setProvModal({
                                open: true,
                                title: doc.title,
                                list: doc.provenance,
                              })
                            }
                            className="font-mono text-blue-600 hover:underline"
                          >
                            Provenance
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {doc.ocrExcerpt}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Policy Explainer Modal */}
      <WhyCantISeeThisModal
        isOpen={policyModal.open}
        onClose={() => setPolicyModal({ open: false, title: '' })}
        itemTitle={policyModal.title}
        maskReason={policyModal.reason}
        policyRuleCited={policyModal.rule}
        currentRole={currentUser.role}
        currentPurpose={purposeOfUse}
        canBreakGlass={currentUser.role === 'Physician' || currentUser.role === 'Nurse'}
        onTriggerBreakGlass={() => setBtgModalOpen(true)}
      />

      {/* Provenance Inspector Modal */}
      <ProvenanceInspectorModal
        isOpen={provModal.open}
        onClose={() => setProvModal({ open: false, title: '', list: [] })}
        title={provModal.title}
        provenanceList={provModal.list}
      />

      {/* Break-the-Glass Emergency Override Modal */}
      <BreakTheGlassModal
        isOpen={btgModalOpen}
        onClose={() => setBtgModalOpen(false)}
        patientName={masterPatient.primaryName}
        masterPatientId={masterPatient.masterPatientId}
        clinicianName={currentUser.name}
        onSubmitBreakGlass={handleBreakGlassSubmit}
      />
    </div>
  );
};
