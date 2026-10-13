import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileSearch,
  Lock,
  ShieldAlert,
  X,
} from 'lucide-react';
import { ProvenanceMetadata } from '../types/unichart';

interface WhyCantISeeThisModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemTitle: string;
  maskReason?: string;
  policyRuleCited?: string;
  currentRole: string;
  currentPurpose: string;
  canBreakGlass: boolean;
  onTriggerBreakGlass: () => void;
}

export const WhyCantISeeThisModal: React.FC<WhyCantISeeThisModalProps> = ({
  isOpen,
  onClose,
  itemTitle,
  maskReason,
  policyRuleCited,
  currentRole,
  currentPurpose,
  canBreakGlass,
  onTriggerBreakGlass,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="policy-explainer-title"
    >
      <div className="w-full max-w-lg rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <h2
              id="policy-explainer-title"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              Policy & Privacy Decision Explainer (“Why can’t I see this?”)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm text-slate-700 dark:text-slate-300">
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Restricted Data Element
            </div>
            <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">{itemTitle}</div>
          </div>

          <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 space-y-2">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Active Session Attributes (ABAC Context)
            </div>
            <div className="font-mono text-xs text-slate-800 dark:text-slate-200">
              Role: {currentRole} · Purpose of Use: {currentPurpose}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Masking / Restriction Reason
            </div>
            <p className="mt-1 text-slate-800 dark:text-slate-200">
              {maskReason ||
                'Field-level masking enforced by backend policy engine prior to payload serialization.'}
            </p>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Cited Regulatory & Engine Policy Rule
            </div>
            <div className="mt-1 rounded border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-3 font-mono text-xs text-amber-900 dark:text-amber-200">
              {policyRuleCited ||
                'POL-SENS-DPDP-42CFR-07: Sensitive Health Data & Minimum Necessary Enforcement'}
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Aligned with India DPDP Act 2023 (Consent-centric Processing), ABDM Health Data
            Management Policy, HIPAA Minimum Necessary (45 CFR § 164.502(b)), and 42 CFR Part 2
            (Substance Use & Behavioral Health Confidentiality).
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
          {canBreakGlass && (
            <button
              onClick={() => {
                onClose();
                onTriggerBreakGlass();
              }}
              className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              Emergency Break-the-Glass Override
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            Close Explainer
          </button>
        </div>
      </div>
    </div>
  );
};

interface ProvenanceDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  provenanceList: ProvenanceMetadata[];
}

export const ProvenanceInspectorModal: React.FC<ProvenanceDrawerModalProps> = ({
  isOpen,
  onClose,
  title,
  provenanceList,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="provenance-modal-title"
    >
      <div className="w-full max-w-2xl rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Database className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <h2
                id="provenance-modal-title"
                className="text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                Data Lineage & Normalization Provenance
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close provenance inspector"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {provenanceList.map((prov, i) => (
            <div
              key={`${prov.sourceId}-${prov.originalRecordId}-${i}`}
              className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-2.5 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {prov.sourceName} ({prov.sourceId})
                </span>
                <span className="font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                  Original ID: {prov.originalRecordId} · Confidence:{' '}
                  {Math.round(prov.mappingConfidence * 100)}%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Coding / Schema Mapping: </span>
                  <span className="font-mono">{prov.codingSystem}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Adapter Fetched At: </span>
                  <span className="font-mono tabular-nums">
                    {new Date(prov.fetchedAt).toLocaleTimeString()} ({prov.fetchedAt.slice(0, 10)})
                  </span>
                </div>
              </div>

              {prov.originalText && (
                <div className="pt-1">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">
                    Raw Source String (Pre-Normalization):
                  </span>
                  <div className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 font-mono text-slate-800 dark:text-slate-200">
                    “{prov.originalText}”
                  </div>
                </div>
              )}

              {prov.transformationNotes && (
                <div className="text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    Harmonization Rule:{' '}
                  </span>
                  {prov.transformationNotes}
                </div>
              )}

              {prov.needsClinicianReview && (
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium pt-1">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Flagged for Clinician Verification (Lexical ICD-10 mapping confidence below 75%
                    threshold)
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

interface BreakGlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  masterPatientId: string;
  clinicianName: string;
  onSubmitBreakGlass: (justification: string, pin: string) => Promise<void>;
}

export const BreakTheGlassModal: React.FC<BreakGlassModalProps> = ({
  isOpen,
  onClose,
  patientName,
  masterPatientId,
  clinicianName,
  onSubmitBreakGlass,
}) => {
  const [reasonPreset, setReasonPreset] = useState(
    'Emergency Clinical Stabilization — Patient unconscious / acute decompensation in ED'
  );
  const [customNotes, setCustomNotes] = useState(
    'Urgent cross-hospital medication and allergy verification required for immediate acute care.'
  );
  const [pin, setPin] = useState('4491');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const fullJustification = `${reasonPreset} — ${customNotes}`.trim();
    if (fullJustification.length < 15) {
      setError('Please enter a detailed clinical justification (at least 15 characters).');
      return;
    }
    if (pin.trim().length < 4) {
      setError('Please enter your 4-digit clinician re-authentication PIN.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmitBreakGlass(fullJustification, pin);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Break-the-glass request failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="btg-modal-title"
    >
      <div className="w-full max-w-xl rounded-lg border border-red-300 dark:border-red-900 bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0" />
            <div>
              <h2
                id="btg-modal-title"
                className="text-base font-semibold text-red-700 dark:text-red-400"
              >
                Emergency “Break-the-Glass” Override Warning
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Patient: {patientName} ({masterPatientId})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Cancel Break-the-Glass"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="mt-4 space-y-4 text-sm">
          <div className="rounded-md border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 p-3.5 text-xs text-red-900 dark:text-red-200 space-y-1.5">
            <div className="font-semibold">Mandatory Privacy & Audit Notice (DPDP Act / HIPAA):</div>
            <p>
              You ({clinicianName}) do not have an established Care-Team relationship or granular
              sensitivity consent for this record. Invoking Break-the-Glass grants{' '}
              <strong>15-minute time-limited emergency access</strong>, records an immutable
              SHA-256 audit block, and dispatches an <strong>immediate high-priority alert</strong>{' '}
              to the Chief Privacy Officer.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Emergency Clinical Category
            </label>
            <select
              value={reasonPreset}
              onChange={(e) => setReasonPreset(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="Emergency Clinical Stabilization — Patient unconscious / acute decompensation in ED">
                Emergency Clinical Stabilization — Patient unconscious / acute decompensation in ED
              </option>
              <option value="Urgent Cross-Hospital Drug-Allergy & Anticoagulation Verification">
                Urgent Cross-Hospital Drug-Allergy & Anticoagulation Verification
              </option>
              <option value="On-Call Cross-Cover Consultation for Deteriorating Inpatient">
                On-Call Cross-Cover Consultation for Deteriorating Inpatient
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Typed Clinical Justification (Recorded in Immutable Audit Log)
            </label>
            <textarea
              rows={3}
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              placeholder="State specific emergency clinical reason..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Clinician Step-Up Re-Authentication PIN (Demo PIN pre-filled: 4491)
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-48 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100"
            />
          </div>

          {error && <div className="text-xs font-medium text-red-600 dark:text-red-400">{error}</div>}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              {submitting
                ? 'Authorizing & Logging...'
                : 'Confirm Emergency Override (15-Min Access)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
