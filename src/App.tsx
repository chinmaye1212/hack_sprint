import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileSpreadsheet,
  GitMerge,
  Lock,
  Moon,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Sun,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  AdminAndArchitecturePage,
  PatientPortalPage,
  PatientSearchWorklistPage,
  PrivacyOfficerViewPage,
  StewardConsolePage,
} from './pages/GovernanceAndPortalPages';
import { PatientDashboardPage } from './pages/PatientDashboardPage';
import {
  DemoUser,
  HospitalSourceId,
  PurposeOfUse,
} from './types/unichart';

type NavScreen =
  | 'DASHBOARD'
  | 'SEARCH'
  | 'STEWARD'
  | 'PRIVACY'
  | 'PORTAL'
  | 'ADMIN_ARCH';

interface GuidedDemoStep {
  id: number;
  title: string;
  subtitle: string;
  actionLabel: string;
}

const GUIDED_DEMO_STEPS: GuidedDemoStep[] = [
  {
    id: 1,
    title: '1. Complex Patient Across 4 Hospitals',
    subtitle: 'Dr. Krishnan opens Rameshwar Sharma (MPI-1001); unified view loads progressively.',
    actionLabel: 'Run Scenario 1',
  },
  {
    id: 2,
    title: '2. Billing Analyst Minimum Necessary',
    subtitle: 'Switch to Billing Analyst on MPI-1001: clinical data masked, Claims visible.',
    actionLabel: 'Run Scenario 2',
  },
  {
    id: 3,
    title: '3. No Care Team → Break-the-Glass',
    subtitle: 'Non-care-team physician Dr. Rao is denied on MPI-1005, then uses Break-the-Glass.',
    actionLabel: 'Run Scenario 3',
  },
  {
    id: 4,
    title: '4. Hospital B Consent Gate & Portal',
    subtitle: 'Hospital B is blocked until patient grants consent in Patient Portal.',
    actionLabel: 'Run Scenario 4',
  },
  {
    id: 5,
    title: '5. Hospital C Goes Offline',
    subtitle: 'Simulate City Care (HOSP_C) outage: partial-data banner shows, other sources load.',
    actionLabel: 'Run Scenario 5',
  },
  {
    id: 6,
    title: '6. Legacy Fuzzy Match & Free-Text ICD-10',
    subtitle: 'Find Muhammad Abdul Qadir (Year-only DOB 1948) with NLP confidence scores.',
    actionLabel: 'Run Scenario 6',
  },
  {
    id: 7,
    title: '7. Data Steward Duplicate Merge Review',
    subtitle: 'Inspect Saraswati Venkataraman vs Saraswathi Raman (68% score) side-by-side.',
    actionLabel: 'Run Scenario 7',
  },
  {
    id: 8,
    title: '8. Researcher Safe Harbor De-ID (Age 90+)',
    subtitle: 'Switch to Researcher viewing 92yo Subhash Roy (MPI-1008) top-coded to 90+.',
    actionLabel: 'Run Scenario 8',
  },
  {
    id: 9,
    title: '9. Audit Hash-Chain & Tamper Simulation',
    subtitle: 'Verify SHA-256 audit log integrity, then trigger unauthorized DB tamper check.',
    actionLabel: 'Run Scenario 9',
  },
];

export function App() {
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [purposeOfUse, setPurposeOfUse] = useState<PurposeOfUse>('Treatment');
  const [activeScreen, setActiveScreen] = useState<NavScreen>('DASHBOARD');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('MPI-1001');
  const [sources, setSources] = useState<any[]>([]);
  const [refreshSignal, setRefreshSignal] = useState<number>(0);
  const [completedDemos, setCompletedDemos] = useState<number[]>([1]);
  const [activeDemoStep, setActiveDemoStep] = useState<number>(1);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [sessionLocked, setSessionLocked] = useState<boolean>(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const loadBootstrap = async () => {
    const [uRes, sRes] = await Promise.all([fetch('/api/users'), fetch('/api/sources')]);
    if (uRes.ok) {
      const uData = await uRes.json();
      setUsers(uData.users || []);
      if (!currentUser && uData.users?.length > 0) {
        setCurrentUser(uData.users[0]);
        setPurposeOfUse(uData.users[0].defaultPurpose);
      }
    }
    if (sRes.ok) {
      const sData = await sRes.json();
      setSources(sData.sources || []);
    }
  };

  useEffect(() => {
    loadBootstrap();
  }, []);

  const handleSwitchUser = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
      setPurposeOfUse(found.defaultPurpose);
      if (found.role === 'Data Steward') {
        setActiveScreen('STEWARD');
      } else if (found.role === 'Privacy Officer') {
        setActiveScreen('PRIVACY');
      } else if (found.role === 'Patient') {
        setSelectedPatientId(found.linkedPatientMasterId || 'MPI-1001');
        setActiveScreen('PORTAL');
      } else {
        setActiveScreen('DASHBOARD');
      }
    }
  };

  const handleToggleSourceOnline = async (sourceId: HospitalSourceId, online: boolean) => {
    if (!currentUser) return;
    const res = await fetch(`/api/sources/${sourceId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-id': currentUser.id,
        'x-purpose-of-use': purposeOfUse,
      },
      body: JSON.stringify({ online }),
    });
    if (res.ok) {
      const data = await res.json();
      setSources(data.sources || []);
      setRefreshSignal((n) => n + 1);
    }
  };

  const handleQuickGrantConsent = async (sourceId: HospitalSourceId, granted: boolean) => {
    if (!currentUser) return;
    await fetch(`/api/patients/${selectedPatientId}/consent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-id': currentUser.id,
        'x-purpose-of-use': purposeOfUse,
      },
      body: JSON.stringify({ sourceId, granted }),
    });
    setRefreshSignal((n) => n + 1);
  };

  const handleResetDemoState = async () => {
    await fetch('/api/demo/reset', { method: 'POST' });
    await loadBootstrap();
    if (users.length > 0) {
      setCurrentUser(users[0]);
      setPurposeOfUse(users[0].defaultPurpose);
    }
    setSelectedPatientId('MPI-1001');
    setActiveScreen('DASHBOARD');
    setRefreshSignal((n) => n + 1);
  };

  const executeGuidedDemoStep = async (stepId: number) => {
    setActiveDemoStep(stepId);
    if (!completedDemos.includes(stepId)) {
      setCompletedDemos((prev) => [...prev, stepId]);
    }

    const findUser = (id: string) => users.find((u) => u.id === id) || users[0];

    switch (stepId) {
      case 1: {
        // Physician opens complex patient MPI-1001 across 4 hospitals
        const phys = findUser('USR-PHYS-01');
        setCurrentUser(phys);
        setPurposeOfUse('Treatment');
        setSelectedPatientId('MPI-1001');
        setActiveScreen('DASHBOARD');
        setRefreshSignal((n) => n + 1);
        break;
      }
      case 2: {
        // Billing analyst opens MPI-1001 -> clinical masked, claims visible
        const bill = findUser('USR-BILL-01');
        setCurrentUser(bill);
        setPurposeOfUse('Payment');
        setSelectedPatientId('MPI-1001');
        setActiveScreen('DASHBOARD');
        setRefreshSignal((n) => n + 1);
        break;
      }
      case 3: {
        // Non-care-team physician Dr. Vikramaditya Rao opens MPI-1005 -> Access Denied -> Break-the-Glass
        const nonCarePhys = findUser('USR-PHYS-02');
        setCurrentUser(nonCarePhys);
        setPurposeOfUse('Treatment');
        setSelectedPatientId('MPI-1005');
        setActiveScreen('DASHBOARD');
        setRefreshSignal((n) => n + 1);
        break;
      }
      case 4: {
        // Patient Portal consent toggle for Hospital B on MPI-1001
        const pat = findUser('USR-PAT-01');
        setCurrentUser(pat);
        setPurposeOfUse('SelfAccess');
        setSelectedPatientId('MPI-1001');
        setActiveScreen('PORTAL');
        break;
      }
      case 5: {
        // Hospital C goes offline -> partial data banner shows
        const phys = findUser('USR-PHYS-01');
        setCurrentUser(phys);
        setPurposeOfUse('Treatment');
        setSelectedPatientId('MPI-1001');
        await handleToggleSourceOnline('HOSP_C', false);
        setActiveScreen('DASHBOARD');
        break;
      }
      case 6: {
        // Legacy patient with year-only DOB (1948) and free-text diagnoses mapped to ICD-10
        const phys = findUser('USR-PHYS-01');
        setCurrentUser(phys);
        setPurposeOfUse('Treatment');
        setSelectedPatientId('MPI-1002');
        setActiveScreen('DASHBOARD');
        setRefreshSignal((n) => n + 1);
        break;
      }
      case 7: {
        // Steward reviews duplicate pair MPI-1006 <-> MPI-1007
        const stew = findUser('USR-STEW-01');
        setCurrentUser(stew);
        setPurposeOfUse('Operations');
        setActiveScreen('STEWARD');
        break;
      }
      case 8: {
        // Researcher sees Safe Harbor de-identified data on 92yo patient MPI-1008 (Age 90+)
        const resUser = findUser('USR-RES-01');
        setCurrentUser(resUser);
        setPurposeOfUse('Research');
        setSelectedPatientId('MPI-1008');
        setActiveScreen('DASHBOARD');
        setRefreshSignal((n) => n + 1);
        break;
      }
      case 9: {
        // Privacy Officer / Admin verifies SHA-256 audit log & runs tamper simulation
        const priv = findUser('USR-PRIV-01');
        setCurrentUser(priv);
        setPurposeOfUse('Operations');
        setActiveScreen('PRIVACY');
        break;
      }
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-sm text-slate-600">
        Initializing UniChart Hybrid Patient Index & Federated Hospital Adapters...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Persistent Regulatory Synthetic Data Banner */}
      <div className="bg-slate-900 text-slate-200 px-6 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <span className="font-medium">
          Synthetic data only. Not for clinical use. — UniChart Hybrid Longitudinal Health Record
          Aggregator (DPDP Act 2023 / ABDM / HIPAA Aligned)
        </span>
        <div className="flex items-center gap-4 no-print">
          <button
            onClick={() => setSessionLocked(true)}
            className="text-slate-300 hover:text-white underline text-xs"
          >
            Simulate Idle Session Lock
          </button>
          <button
            onClick={handleResetDemoState}
            className="text-blue-400 hover:text-blue-300 underline text-xs"
          >
            Reset All Demo Data
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="inline-flex items-center gap-1 text-slate-300 hover:text-white"
            aria-label="Toggle color theme"
          >
            {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            <span>{darkMode ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </div>

      {/* Top Bar Contract: 3 Zones (Brand Wordmark — 5 Single-Line Nav Links — 1 Primary Action) */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 no-print">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            setActiveScreen('DASHBOARD');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
        >
          UniChart
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary Workspace Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          <button
            onClick={() => setActiveScreen('DASHBOARD')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeScreen === 'DASHBOARD'
                ? 'text-blue-600 dark:text-blue-400 underline underline-offset-8'
                : ''
            }`}
          >
            Patient View
          </button>
          <button
            onClick={() => setActiveScreen('SEARCH')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeScreen === 'SEARCH'
                ? 'text-blue-600 dark:text-blue-400 underline underline-offset-8'
                : ''
            }`}
          >
            MPI Worklist
          </button>
          <button
            onClick={() => setActiveScreen('STEWARD')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeScreen === 'STEWARD'
                ? 'text-blue-600 dark:text-blue-400 underline underline-offset-8'
                : ''
            }`}
          >
            Steward Queue
          </button>
          <button
            onClick={() => setActiveScreen('PRIVACY')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeScreen === 'PRIVACY'
                ? 'text-blue-600 dark:text-blue-400 underline underline-offset-8'
                : ''
            }`}
          >
            Privacy & Audit
          </button>
          <button
            onClick={() => setActiveScreen('PORTAL')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeScreen === 'PORTAL'
                ? 'text-blue-600 dark:text-blue-400 underline underline-offset-8'
                : ''
            }`}
          >
            Patient Portal
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveScreen('ADMIN_ARCH')}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
          >
            Architecture & Admin
          </button>
        </div>
      </header>

      {/* Main Workspace Layout: Left Sidebar (Role Switcher + 9-Step Guided Demo Checklist) + Main Viewport */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Sidebar (280px on desktop) */}
        <aside className="w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-5 no-print">
          {/* Mock SSO & RBAC/ABAC Role Switcher */}
          <div className="space-y-2.5 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Active SSO Role & ABAC Context
            </div>

            <div>
              <label
                htmlFor="sso-user-select"
                className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1"
              >
                Switch Authenticated User (11 Roles)
              </label>
              <select
                id="sso-user-select"
                value={currentUser.id}
                onChange={(e) => handleSwitchUser(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    [{u.role}] {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="purpose-select"
                  className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1"
                >
                  Purpose of Use
                </label>
                <select
                  id="purpose-select"
                  value={purposeOfUse}
                  onChange={(e) => setPurposeOfUse(e.target.value as PurposeOfUse)}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-xs"
                >
                  <option value="Treatment">Treatment</option>
                  <option value="Payment">Payment</option>
                  <option value="Operations">Operations</option>
                  <option value="Research">Research</option>
                  <option value="SelfAccess">SelfAccess</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="patient-quick-select"
                  className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1"
                >
                  Active Patient
                </label>
                <select
                  id="patient-quick-select"
                  value={selectedPatientId}
                  onChange={(e) => {
                    setSelectedPatientId(e.target.value);
                    if (activeScreen !== 'PORTAL') setActiveScreen('DASHBOARD');
                  }}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-xs font-mono"
                >
                  <option value="MPI-1001">MPI-1001 (R. Sharma - 4 Hosps)</option>
                  <option value="MPI-1002">MPI-1002 (M. Qadir - 1948 DOB)</option>
                  <option value="MPI-1003">MPI-1003 (M. Deshmukh - Married)</option>
                  <option value="MPI-1004">MPI-1004 (L. Iyer - 1 Hosp)</option>
                  <option value="MPI-1005">MPI-1005 (V. Gill - Restricted)</option>
                  <option value="MPI-1006">MPI-1006 (S. Venkataraman - Dup A)</option>
                  <option value="MPI-1007">MPI-1007 (S. Raman - Dup B)</option>
                  <option value="MPI-1008">MPI-1008 (S. Roy - Age 92)</option>
                  <option value="MPI-1009">MPI-1009 (P. Gopalan)</option>
                  <option value="MPI-1010">MPI-1010 (D. Kulkarni)</option>
                  <option value="MPI-1011">MPI-1011 (H. Sandhu)</option>
                  <option value="MPI-1012">MPI-1012 (J. D’Souza)</option>
                </select>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Dept: {currentUser.department}
            </div>
          </div>

          {/* 9-Step Guided Demo Mode Checklist */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Guided Demo Mode (9 Scenarios)
              </span>
              <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                {completedDemos.length}/9 Run
              </span>
            </div>

            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
              {GUIDED_DEMO_STEPS.map((step) => {
                const isCurrent = activeDemoStep === step.id;
                const isDone = completedDemos.includes(step.id);
                return (
                  <div
                    key={step.id}
                    className={`rounded-md border p-2.5 text-xs transition-colors ${
                      isCurrent
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {step.title}
                      </span>
                      {isDone && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                      {step.subtitle}
                    </p>
                    <button
                      onClick={() => executeGuidedDemoStep(step.id)}
                      className="mt-2 w-full py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-blue-600 text-xs font-medium text-blue-700 dark:text-blue-400 transition-colors"
                    >
                      {step.actionLabel}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main Viewport */}
        <main className="flex-1 min-w-0">
          {activeScreen === 'DASHBOARD' && (
            <PatientDashboardPage
              masterPatientId={selectedPatientId}
              currentUser={currentUser}
              purposeOfUse={purposeOfUse}
              onToggleSourceOnline={handleToggleSourceOnline}
              onQuickGrantConsent={handleQuickGrantConsent}
              onNavigateToPortal={() => setActiveScreen('PORTAL')}
              refreshSignal={refreshSignal}
            />
          )}

          {activeScreen === 'SEARCH' && (
            <PatientSearchWorklistPage
              currentUser={currentUser}
              purposeOfUse={purposeOfUse}
              onSelectPatient={(mpiId) => {
                setSelectedPatientId(mpiId);
                setActiveScreen('DASHBOARD');
              }}
            />
          )}

          {activeScreen === 'STEWARD' && (
            <StewardConsolePage
              currentUser={currentUser}
              purposeOfUse={purposeOfUse}
              onAfterResolve={() => setRefreshSignal((n) => n + 1)}
            />
          )}

          {activeScreen === 'PRIVACY' && (
            <PrivacyOfficerViewPage
              currentUser={currentUser}
              purposeOfUse={purposeOfUse}
            />
          )}

          {activeScreen === 'PORTAL' && (
            <PatientPortalPage
              masterPatientId={selectedPatientId}
              currentUser={currentUser}
              onConsentChanged={() => setRefreshSignal((n) => n + 1)}
            />
          )}

          {activeScreen === 'ADMIN_ARCH' && (
            <AdminAndArchitecturePage
              sources={sources}
              onToggleSource={handleToggleSourceOnline}
            />
          )}
        </main>
      </div>

      {/* Session Idle Timeout Auto-Lock Overlay */}
      {sessionLocked && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-6 text-center space-y-4 text-slate-100">
            <Lock className="h-10 w-10 text-blue-400 mx-auto" />
            <h2 className="text-lg font-bold">HIPAA / DPDP Clinical Session Auto-Locked</h2>
            <p className="text-xs text-slate-400">
              PHI screen blurred and locked due to workstation inactivity timeout. Re-authenticate
              as <strong>{currentUser.name}</strong> to resume clinical session.
            </p>
            <button
              onClick={() => setSessionLocked(false)}
              className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-colors"
            >
              Re-Authenticate & Unlock Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
