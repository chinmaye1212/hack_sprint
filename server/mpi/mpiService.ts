import { MasterPatientIndexEntry } from '../../src/types/unichart';
import { getMpiEntries } from '../db/indexDb';

// Phonetic & Indian Transliteration Canonicalizer (handles Kumar/Kumaar, Mohammed/Muhammad, Qadir/Kadir, Saraswati/Saraswathi, Laxmi/Lakshmi, etc.)
export function canonicalizePhoneticToken(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b(mohammed|muhammad|mohd|mohammad)\b/g, 'mohammed')
    .replace(/\b(qadir|kadir|quader)\b/g, 'qadir')
    .replace(/\b(kumaar|kumar|kmr)\b/g, 'kumar')
    .replace(/\b(saraswathi|saraswati)\b/g, 'saraswati')
    .replace(/\b(venkatraman|venkataraman)\b/g, 'venkataraman')
    .replace(/\b(laxmi|lakshmi)\b/g, 'lakshmi')
    .replace(/\b(vikramjeet|vikramjit)\b/g, 'vikramjit')
    .replace(/\b(subhas|subhash)\b/g, 'subhash')
    .replace(/\b(dattatray|dattatraya)\b/g, 'dattatraya')
    .replace(/\b(padmavathy|padmavathi)\b/g, 'padmavathi')
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/th/g, 't')
    .replace(/bh/g, 'b')
    .replace(/dh/g, 'd')
    .replace(/sh/g, 's')
    .replace(/ph/g, 'f')
    .trim();
}

function tokenOverlapScore(query: string, target: string): number {
  const qNorm = canonicalizePhoneticToken(query);
  const tNorm = canonicalizePhoneticToken(target);
  if (!qNorm || !tNorm) return 0;
  if (tNorm.includes(qNorm) || qNorm.includes(tNorm)) return 98;

  const qTokens = qNorm.split(/\s+/).filter(Boolean);
  const tTokens = tNorm.split(/\s+/).filter(Boolean);
  let matches = 0;
  for (const qt of qTokens) {
    if (tTokens.some((tt) => tt.includes(qt) || qt.includes(tt) || levenshteinDistance(qt, tt) <= 1)) {
      matches++;
    }
  }
  return Math.round((matches / Math.max(qTokens.length, 1)) * 92);
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export interface MpiSearchHit {
  patient: MasterPatientIndexEntry;
  searchMatchScore: number;
  matchedReasons: string[];
  confidenceTier: 'HIGH_AUTO_LINK' | 'MEDIUM_REVIEW' | 'LOW_DO_NOT_MERGE';
}

export function searchMasterPatientIndex(query: string): MpiSearchHit[] {
  const entries = getMpiEntries();
  const q = (query || '').trim();

  if (!q) {
    return entries.map((patient) => ({
      patient,
      searchMatchScore: patient.overallMatchConfidence,
      matchedReasons: [
        `MPI Confidence ${patient.overallMatchConfidence}% across ${patient.linkedRecords.length} linked source(s)`,
        patient.abhaId ? `Verified ABHA ID (${patient.abhaId})` : 'Legacy Demographic Probabilistic Match',
      ],
      confidenceTier:
        patient.overallMatchConfidence >= 85
          ? 'HIGH_AUTO_LINK'
          : patient.overallMatchConfidence >= 65
          ? 'MEDIUM_REVIEW'
          : 'LOW_DO_NOT_MERGE',
    }));
  }

  const results: MpiSearchHit[] = [];

  for (const patient of entries) {
    const reasons: string[] = [];
    let bestScore = 0;

    // 1. Check ABHA ID or MPI ID exact/prefix match
    if (
      patient.masterPatientId.toLowerCase().includes(q.toLowerCase()) ||
      (patient.abhaId && patient.abhaId.replace(/-/g, '').includes(q.replace(/-/g, '')))
    ) {
      bestScore = 99;
      reasons.push(`Strong Identifier Match (MPI / ABHA ID: ${patient.abhaId || patient.masterPatientId})`);
    }

    // 2. Check Primary Name & Phonetic/Transliteration Aliases (incl. Maiden Name!)
    const primaryScore = tokenOverlapScore(q, patient.primaryName);
    if (primaryScore > 0) {
      bestScore = Math.max(bestScore, primaryScore);
      reasons.push(`Primary Name Phonetic/Token Match (${primaryScore}%)`);
    }

    for (const alias of patient.aliases) {
      const aliasScore = tokenOverlapScore(q, alias);
      if (aliasScore > 0) {
        bestScore = Math.max(bestScore, Math.min(95, aliasScore));
        reasons.push(`Alias / Transliteration / Maiden Name Match: "${alias}" (${aliasScore}%)`);
      }
    }

    // 3. Check DOB (including Year-only e.g. "1948" or DD/MM/YY)
    if (patient.dob.includes(q) || patient.linkedRecords.some((r) => r.localDob.includes(q))) {
      bestScore = Math.max(bestScore, patient.dobApproximate ? 86 : 94);
      reasons.push(
        patient.dobApproximate
          ? `Approximate / Year-Only DOB Match (${patient.dob.slice(0, 4)})`
          : `Date of Birth Match (${patient.dob})`
      );
    }

    // 4. Check Phone or Guardian/Spouse or Scenario Tag
    const cleanPhoneQuery = q.replace(/[^0-9]/g, '');
    if (cleanPhoneQuery.length >= 4 && patient.phone.replace(/[^0-9]/g, '').includes(cleanPhoneQuery)) {
      bestScore = Math.max(bestScore, 92);
      reasons.push(`Verified Mobile Number Match (${patient.phone})`);
    }

    if (patient.guardianOrSpouse && tokenOverlapScore(q, patient.guardianOrSpouse) >= 60) {
      bestScore = Math.max(bestScore, 84);
      reasons.push(`Guardian / Spouse Name Match: ${patient.guardianOrSpouse}`);
    }

    if (patient.scenarioTag.toLowerCase().includes(q.toLowerCase())) {
      bestScore = Math.max(bestScore, 85);
      reasons.push(`Clinical Scenario Match: ${patient.scenarioTag}`);
    }

    if (bestScore >= 40) {
      const combinedConfidence = Math.round((bestScore + patient.overallMatchConfidence) / 2);
      results.push({
        patient,
        searchMatchScore: combinedConfidence,
        matchedReasons: reasons,
        confidenceTier:
          combinedConfidence >= 85
            ? 'HIGH_AUTO_LINK'
            : combinedConfidence >= 65
            ? 'MEDIUM_REVIEW'
            : 'LOW_DO_NOT_MERGE',
      });
    }
  }

  return results.sort((a, b) => b.searchMatchScore - a.searchMatchScore);
}
