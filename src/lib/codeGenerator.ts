import { supabase } from './supabase';

export const SEQUENCE_REGISTRY_KEY = 'code_sequence_registry_v1';
const LOCAL_STORAGE_REGISTRY_KEY = 'mktg_code_sequence_registry_v1';

export type SequenceRegistry = Record<string, number>;

/**
 * Normalizes any code segment (year, teacher, creator) so trailing spaces,
 * double spaces, or casing differences never reset sequence counters.
 */
export function cleanCodePart(val?: string | null): string {
  return String(val ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export interface ParsedReelCode {
  cleanFull: string;
  baseWithoutVersion: string;
  yearPart: string;
  pairKey: string; // e.g. "khalil-taher" or "abo-elkomsan-ahmed-amr" or "cut-ahmed"
  seq: number;
  version: string;
}

/**
 * Parses a reel code like:
 * - "s2-khalil-taher-16 v7"
 * - "s1-abo-elkomsan-ahmed-amr-07 v7"
 * - "x-employee-awney-223 v6"
 * - "s3-cut-ahmed-05 v7"
 * Safely supports hyphens/spaces inside teacher or creator names and 1..6+ digit numbers.
 */
export function parseReelCode(rawCode?: string | null): ParsedReelCode | null {
  const cleanFull = cleanCodePart(rawCode);
  if (!cleanFull) return null;

  // Match: <year>-<middle (greedy)>-<digits>[ optional v<digits>]
  const match = cleanFull.match(/^([^-]+)-(.+)-(\d+)(?:\s*(v\d+))?$/i);
  if (!match) return null;

  const yearPart = cleanCodePart(match[1]);
  const pairKey = cleanCodePart(match[2]);
  const seq = parseInt(match[3], 10);
  const version = (match[4] || 'v7').toLowerCase();

  if (!yearPart || !pairKey || isNaN(seq)) return null;

  const paddedSeq = seq.toString().padStart(2, '0');
  const baseWithoutVersion = `${yearPart}-${pairKey}-${paddedSeq}`;

  return {
    cleanFull,
    baseWithoutVersion,
    yearPart,
    pairKey,
    seq,
    version,
  };
}

export function formatReelCode(
  year: string,
  pairKey: string,
  seq: number,
  version = 'v7'
): string {
  const y = cleanCodePart(year) || 'x';
  const p = cleanCodePart(pairKey);
  const numStr = Math.max(1, Math.floor(seq)).toString().padStart(2, '0');
  return `${y}-${p}-${numStr} ${version.toLowerCase()}`.toLowerCase();
}

export function buildPairKey(params: {
  teacher?: string;
  extraName?: string;
  isCut?: boolean;
}): string {
  const creator = cleanCodePart(params.extraName) || '01';
  if (params.isCut) {
    return `cut-${creator}`;
  }
  const teacher = cleanCodePart(params.teacher) || 'unknown';
  return `${teacher}-${creator}`;
}

/**
 * Loads cached monotonic high-water mark sequence registry from localStorage.
 */
export function loadLocalSequenceRegistry(): SequenceRegistry {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_REGISTRY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveLocalSequenceRegistry(reg: SequenceRegistry): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_REGISTRY_KEY, JSON.stringify(reg));
  } catch {}
}

/**
 * Merges two sequence registries keeping the maximum high-water mark per key.
 */
export function mergeSequenceRegistries(
  a: SequenceRegistry,
  b: SequenceRegistry
): SequenceRegistry {
  const merged: SequenceRegistry = { ...a };
  for (const [k, v] of Object.entries(b || {})) {
    const num = Number(v);
    if (!isNaN(num) && num > (merged[k] || 0)) {
      merged[k] = num;
    }
  }
  return merged;
}

/**
 * Fetches the shared sequence high-water mark registry from Supabase dashboard_data (1 row).
 */
export async function fetchRemoteSequenceRegistry(): Promise<SequenceRegistry> {
  try {
    const { data, error } = await supabase
      .from('dashboard_data')
      .select('value')
      .eq('key', SEQUENCE_REGISTRY_KEY)
      .eq('field', 'sequences')
      .maybeSingle();

    if (error || !data?.value) return loadLocalSequenceRegistry();
    const remote = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    const merged = mergeSequenceRegistries(loadLocalSequenceRegistry(), remote || {});
    saveLocalSequenceRegistry(merged);
    return merged;
  } catch {
    return loadLocalSequenceRegistry();
  }
}

/**
 * Persists a newly claimed sequence number into localStorage + Supabase dashboard_data
 * so even if rows are later deleted or archived, the number is NEVER reused.
 */
export async function recordClaimedSequence(
  pairKey: string,
  exactPrefixKey: string,
  claimedSeq: number,
  currentRegistry?: SequenceRegistry
): Promise<SequenceRegistry> {
  const cleanPair = cleanCodePart(pairKey);
  const cleanPrefix = cleanCodePart(exactPrefixKey);
  const base = mergeSequenceRegistries(loadLocalSequenceRegistry(), currentRegistry || {});

  const nextReg: SequenceRegistry = {
    ...base,
    [cleanPair]: Math.max(base[cleanPair] || 0, claimedSeq),
    [cleanPrefix]: Math.max(base[cleanPrefix] || 0, claimedSeq),
  };

  saveLocalSequenceRegistry(nextReg);

  try {
    const { data: existing } = await supabase
      .from('dashboard_data')
      .select('value')
      .eq('key', SEQUENCE_REGISTRY_KEY)
      .eq('field', 'sequences')
      .maybeSingle();

    const remoteObj =
      existing?.value && typeof existing.value === 'object'
        ? (existing.value as SequenceRegistry)
        : typeof existing?.value === 'string'
        ? JSON.parse(existing.value)
        : {};

    const finalMerged = mergeSequenceRegistries(remoteObj, nextReg);
    saveLocalSequenceRegistry(finalMerged);
    const serialized = JSON.stringify(finalMerged);

    if (existing) {
      await supabase
        .from('dashboard_data')
        .update({
          value: serialized,
          updated_at: new Date().toISOString(),
        })
        .eq('key', SEQUENCE_REGISTRY_KEY)
        .eq('field', 'sequences');
    } else {
      await supabase.from('dashboard_data').insert([
        {
          key: SEQUENCE_REGISTRY_KEY,
          field: 'sequences',
          value: serialized,
          updated_at: new Date().toISOString(),
        },
      ]);
    }
    return finalMerged;
  } catch {
    return nextReg;
  }
}

/**
 * Bulk-records high-water mark sequences for an array of imported codes.
 */
export async function recordBulkClaimedSequences(
  codes: Iterable<string>,
  currentRegistry?: SequenceRegistry
): Promise<SequenceRegistry> {
  const base = mergeSequenceRegistries(loadLocalSequenceRegistry(), currentRegistry || {});
  const nextReg: SequenceRegistry = { ...base };
  let changed = false;

  for (const raw of codes) {
    const parsed = parseReelCode(raw);
    if (!parsed) continue;
    const prefixKey = `${parsed.yearPart}-${parsed.pairKey}`;
    if (parsed.seq > (nextReg[parsed.pairKey] || 0)) {
      nextReg[parsed.pairKey] = parsed.seq;
      changed = true;
    }
    if (parsed.seq > (nextReg[prefixKey] || 0)) {
      nextReg[prefixKey] = parsed.seq;
      changed = true;
    }
  }

  if (!changed) return nextReg;
  saveLocalSequenceRegistry(nextReg);

  try {
    const { data: existing } = await supabase
      .from('dashboard_data')
      .select('value')
      .eq('key', SEQUENCE_REGISTRY_KEY)
      .eq('field', 'sequences')
      .maybeSingle();

    const remoteObj =
      existing?.value && typeof existing.value === 'object'
        ? (existing.value as SequenceRegistry)
        : typeof existing?.value === 'string'
        ? JSON.parse(existing.value)
        : {};

    const finalMerged = mergeSequenceRegistries(remoteObj, nextReg);
    saveLocalSequenceRegistry(finalMerged);
    const serialized = JSON.stringify(finalMerged);

    if (existing) {
      await supabase
        .from('dashboard_data')
        .update({
          value: serialized,
          updated_at: new Date().toISOString(),
        })
        .eq('key', SEQUENCE_REGISTRY_KEY)
        .eq('field', 'sequences');
    } else {
      await supabase.from('dashboard_data').insert([
        {
          key: SEQUENCE_REGISTRY_KEY,
          field: 'sequences',
          value: serialized,
          updated_at: new Date().toISOString(),
        },
      ]);
    }
    return finalMerged;
  } catch {
    return nextReg;
  }
}

export interface ComputeNextCodeParams {
  year: string;
  teacher?: string;
  extraName?: string;
  isCut?: boolean;
  excludeCode?: string;
  allKnownCodes: Iterable<string>;
  sequenceRegistry?: SequenceRegistry;
}

export interface ComputedCodeResult {
  code: string;
  seq: number;
  pairKey: string;
  exactPrefix: string;
}

/**
 * Computes a 100% unique, monotonically increasing reel code across:
 * 1. All years (s1, s2, s3, m1..m3, j4..j6, x) for the same (teacher, creator) pair
 *    — so changing the academic year NEVER restarts numbering back at 01!
 * 2. All Reels tables (Shooting + VE + CUTS) + Studio Calendar + Google Sheets imports
 * 3. Total distinct reels count for that (teacher, creator) pair
 * 4. Persistent high-water mark sequenceRegistry (prevents reusing deleted codes)
 * 5. Collision-proof loop ensuring neither the full code, base code, nor pair sequence is ever duplicated.
 */
export function computeNextUniqueReelCode(params: ComputeNextCodeParams): ComputedCodeResult {
  const cleanYear = cleanCodePart(params.year) || 'x';
  const pairKey = buildPairKey({
    teacher: params.teacher,
    extraName: params.extraName,
    isCut: params.isCut,
  });
  const exactPrefix = `${cleanYear}-${pairKey}`;
  const cleanExclude = cleanCodePart(params.excludeCode);

  const allExistingFull = new Set<string>();
  const allExistingBases = new Set<string>();
  const pairUsedSeqs = new Set<number>();
  const pairDistinctCodes = new Set<string>();

  let maxSeqForPair = 0;

  for (const raw of params.allKnownCodes) {
    const clean = cleanCodePart(raw);
    if (!clean || (cleanExclude && clean === cleanExclude)) continue;

    allExistingFull.add(clean);

    const parsed = parseReelCode(clean);
    if (parsed) {
      allExistingBases.add(parsed.baseWithoutVersion);
      if (parsed.pairKey === pairKey) {
        pairUsedSeqs.add(parsed.seq);
        pairDistinctCodes.add(parsed.baseWithoutVersion);
        if (parsed.seq > maxSeqForPair) {
          maxSeqForPair = parsed.seq;
        }
      }
    } else if (clean.startsWith(`${exactPrefix}-`)) {
      const rem = clean.slice(exactPrefix.length + 1).trim();
      const m = rem.match(/^(\d+)/);
      if (m) {
        const s = parseInt(m[1], 10);
        if (!isNaN(s)) {
          pairUsedSeqs.add(s);
          if (s > maxSeqForPair) maxSeqForPair = s;
        }
      }
    }
  }

  const reg = params.sequenceRegistry || loadLocalSequenceRegistry();
  const regPairMax = Number(reg[pairKey] || 0);
  const regPrefixMax = Number(reg[exactPrefix] || 0);

  let nextSeq =
    Math.max(
      maxSeqForPair,
      pairDistinctCodes.size,
      isNaN(regPairMax) ? 0 : regPairMax,
      isNaN(regPrefixMax) ? 0 : regPrefixMax,
      0
    ) + 1;

  let candidate = formatReelCode(cleanYear, pairKey, nextSeq);
  let candidateBase = `${cleanYear}-${pairKey}-${nextSeq.toString().padStart(2, '0')}`;

  while (
    allExistingFull.has(candidate) ||
    allExistingBases.has(candidateBase) ||
    pairUsedSeqs.has(nextSeq)
  ) {
    nextSeq += 1;
    candidate = formatReelCode(cleanYear, pairKey, nextSeq);
    candidateBase = `${cleanYear}-${pairKey}-${nextSeq.toString().padStart(2, '0')}`;
  }

  return {
    code: candidate,
    seq: nextSeq,
    pairKey,
    exactPrefix,
  };
}

/**
 * Live database verification right before INSERT or code-changing UPDATE:
 * Queries reels_shooting_26, reels_ve_26, and reels_cuts_26 for any matching codes
 * for this (teacher, creator) pair + checks exact code existence, then computes
 * and persists the guaranteed-unique code.
 */
export async function resolveAndClaimUniqueCodeFromDb(params: {
  year: string;
  teacher?: string;
  extraName?: string;
  isCut?: boolean;
  excludeCode?: string;
  localKnownCodes?: Iterable<string>;
  sequenceRegistry?: SequenceRegistry;
  manualCustomCode?: string;
}): Promise<{ code: string; seq: number; registry: SequenceRegistry; duplicateConflict?: string }> {
  const pairKey = buildPairKey({
    teacher: params.teacher,
    extraName: params.extraName,
    isCut: params.isCut,
  });
  const cleanYear = cleanCodePart(params.year) || 'x';
  const exactPrefix = `${cleanYear}-${pairKey}`;
  const cleanExclude = cleanCodePart(params.excludeCode);

  // If the user explicitly typed a custom code override, validate uniqueness across all 3 tables!
  if (params.manualCustomCode && params.manualCustomCode.trim()) {
    const cleanCustom = cleanCodePart(params.manualCustomCode);
    const [shootDup, veDup, cutDup] = await Promise.all([
      supabase.from('reels_shooting_26').select('code').ilike('code', cleanCustom).limit(1),
      supabase.from('reels_ve_26').select('code').ilike('code', cleanCustom).limit(1),
      supabase.from('reels_cuts_26').select('code').ilike('code', cleanCustom).limit(1),
    ]);
    const foundDup =
      shootDup.data?.[0]?.code || veDup.data?.[0]?.code || cutDup.data?.[0]?.code;

    if (foundDup && cleanCodePart(foundDup) !== cleanExclude) {
      return {
        code: cleanCustom,
        seq: 0,
        registry: params.sequenceRegistry || loadLocalSequenceRegistry(),
        duplicateConflict: foundDup,
      };
    }

    const parsedManual = parseReelCode(cleanCustom);
    const updatedReg = parsedManual
      ? await recordClaimedSequence(
          parsedManual.pairKey,
          `${parsedManual.yearPart}-${parsedManual.pairKey}`,
          parsedManual.seq,
          params.sequenceRegistry
        )
      : params.sequenceRegistry || loadLocalSequenceRegistry();

    return {
      code: cleanCustom,
      seq: parsedManual?.seq || 0,
      registry: updatedReg,
    };
  }

  // Fetch all matching codes for this pair across Shooting, VE, and Cuts in parallel
  const likePattern = `%-${pairKey}-%`;
  const [shootRes, veRes, cutRes, remoteReg] = await Promise.all([
    supabase.from('reels_shooting_26').select('code').ilike('code', likePattern),
    supabase.from('reels_ve_26').select('code').ilike('code', likePattern),
    supabase.from('reels_cuts_26').select('code').ilike('code', likePattern),
    fetchRemoteSequenceRegistry(),
  ]);

  const mergedCodes = new Set<string>();
  if (params.localKnownCodes) {
    for (const c of params.localKnownCodes) {
      if (c) mergedCodes.add(c);
    }
  }
  (shootRes.data || []).forEach((r: any) => r?.code && mergedCodes.add(r.code));
  (veRes.data || []).forEach((r: any) => r?.code && mergedCodes.add(r.code));
  (cutRes.data || []).forEach((r: any) => r?.code && mergedCodes.add(r.code));

  const mergedRegistry = mergeSequenceRegistries(
    remoteReg,
    params.sequenceRegistry || {}
  );

  let computed = computeNextUniqueReelCode({
    year: cleanYear,
    teacher: params.teacher,
    extraName: params.extraName,
    isCut: params.isCut,
    excludeCode: cleanExclude,
    allKnownCodes: mergedCodes,
    sequenceRegistry: mergedRegistry,
  });

  // Final paranoid exact-code check across all 3 tables (in case of unusual formatting)
  const [exactShoot, exactVe, exactCut] = await Promise.all([
    supabase.from('reels_shooting_26').select('code').ilike('code', computed.code).limit(1),
    supabase.from('reels_ve_26').select('code').ilike('code', computed.code).limit(1),
    supabase.from('reels_cuts_26').select('code').ilike('code', computed.code).limit(1),
  ]);

  let safetyCounter = 0;
  while (
    safetyCounter < 50 &&
    ((exactShoot.data && exactShoot.data.length > 0 && cleanCodePart(exactShoot.data[0].code) !== cleanExclude) ||
      (exactVe.data && exactVe.data.length > 0 && cleanCodePart(exactVe.data[0].code) !== cleanExclude) ||
      (exactCut.data && exactCut.data.length > 0 && cleanCodePart(exactCut.data[0].code) !== cleanExclude))
  ) {
    mergedCodes.add(computed.code);
    computed = computeNextUniqueReelCode({
      year: cleanYear,
      teacher: params.teacher,
      extraName: params.extraName,
      isCut: params.isCut,
      excludeCode: cleanExclude,
      allKnownCodes: mergedCodes,
      sequenceRegistry: mergedRegistry,
    });
    safetyCounter++;
    const [reS, reV, reC] = await Promise.all([
      supabase.from('reels_shooting_26').select('code').ilike('code', computed.code).limit(1),
      supabase.from('reels_ve_26').select('code').ilike('code', computed.code).limit(1),
      supabase.from('reels_cuts_26').select('code').ilike('code', computed.code).limit(1),
    ]);
    exactShoot.data = reS.data;
    exactVe.data = reV.data;
    exactCut.data = reC.data;
  }

  const savedRegistry = await recordClaimedSequence(
    pairKey,
    exactPrefix,
    computed.seq,
    mergedRegistry
  );

  return {
    code: computed.code,
    seq: computed.seq,
    registry: savedRegistry,
  };
}
