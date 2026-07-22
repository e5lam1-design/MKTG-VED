import { useState, useEffect, useRef } from 'react';

const normalizeBranch = (val: string) => {
  let v = (val || '').trim();
  const lower = v.toLowerCase();
  if (lower === 'alexandria' || lower === 'alex') return 'اسكندرية';
  if (lower === 'cairo') return 'القاهرة';
  if (lower === 'desouk') return 'دسوق';
  
  if (v === 'اسكندريه' || v === 'الاسكندرية' || v === 'الإسكندرية' || v === 'إسكندرية' || v === 'الاسنكدرية' || v === 'اسنكدرية' || v === 'الاسكندريه') return 'اسكندرية';
  if (v === 'القاهره' || v === 'القاهرة') return 'القاهرة';
  if (v === 'دسوق' || v === 'الدسوق') return 'دسوق';
  return v;
};

const normalizeYear = (val: string) => {
  const clean = (val || '').trim();
  const match = clean.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (match) {
    return `${match[1]} - ${match[2]}`;
  }
  return clean;
};

const formatDateToShort = (dateStr: string) => {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    return clean;
  }
  try {
    const sanitized = clean.replace(/-/g, ' ');
    const d = new Date(sanitized);
    if (!isNaN(d.getTime())) {
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const year = d.getFullYear();
      return `${month}/${day}/${year}`;
    }
  } catch (e) {}
  return clean;
};

// Mapping based on your Google Apps Script and sheet structure
export const mapSheetRow = (row: any[], gid: string) => {
  if (gid === '1535230545') {
    return {
      id: '',
      name: row[1] || 'بدون اسم',
      opSheet: normalizeYear(row[2] || ''),
      branch: normalizeBranch(row[3]),
      notesMarketing: row[4] || '',
      editor: row[5] || '',
      done: row[6] === 'TRUE',
      notesEditors: row[7] || '',
      priority: row[8] === 'TRUE',
      thumbnailLink: row[9] || '',
      time: row[10] || '',
      youtubeLink: row[11] || '',
      uploaded: row[12] === 'TRUE' || row[12] === true,
    };
  }

  if (gid === '1476192399') {
    // Try col 17 first (direct play link), then extract from iframe embed in col 16
    let linkBunny = row[17] || '';
    if (!linkBunny && row[16]) {
      // Extract from iframe src: .../embed/LIBRARY_ID/VIDEO_UUID?...
      const m = String(row[16]).match(/mediadelivery\.net\/embed\/(\d+)\/([a-f0-9-]+)/i);
      if (m) {
        linkBunny = `https://iframe.mediadelivery.net/play/${m[1]}/${m[2]}`;
      }
    }
    return {
      date: formatDateToShort(row[0] || ''),
      term: row[1] || '',
      year: row[2] || '',
      teacher: row[10] || '',
      name: row[11] || 'بدون اسم',
      filingName: row[12] || '',
      smartboard: row[13] || '',
      id: row[10] || '',
      linkBunny,
      rawMinutes: row[14] || '',
      finalMinutes: row[15] || '',
      exactDuration: row[20] || '',
    };
  }

  if (gid === '0') { // CUTS
    return {
      date: formatDateToShort(row[0] || ''),
      branch: normalizeBranch(row[1]),
      year: row[2] || '',
      typeCol: row[3] || '',
      creator: row[4] || '',
      id: row[5] || '', // Code
      dataFiles: row[6] || '',
      script: row[7] || '',
      type: row[8] || '',
      format: row[9] || '',
      creatorNotes: row[10] || '',
      editorNotes: row[11] || '',
      missingDetails: row[12] === 'TRUE' || row[12] === true,
      problem: row[13] === 'TRUE' || row[13] === true,
      done: row[14] === 'TRUE' || row[14] === true,
      editor: row[15] || '',
      driveFinal: row[16] || '',
      canceled: row[17] === 'TRUE' || row[17] === true,
    };
  }

  if (gid === '1436746012' || gid === '1939073164' || gid === '798246690') { // Shooting, Ve, Counter
    return {
      date: formatDateToShort(row[0] || ''),
      branch: normalizeBranch(row[1]),
      year: row[2] || '',
      teacher: row[3] || '',
      extraName: row[4] || '',
      id: row[5] || '', // Code
      script: row[6] || '',
      type: row[7] || '',
      format: row[8] || '',
      filmed: row[9] === 'TRUE' || row[9] === true,
      filmingDate: formatDateToShort(row[10] || ''),
      by: row[11] || '',
      storage: row[12] || '',
      notes: row[13] || '',
      driveRaw: row[14] || '',
      editorCol: row[15] || '', // Editor (Ve sheet)
      done: row[16] === 'TRUE' || row[16] === true,
      driveFinal: row[17] || '',
      canceled: row[18] === 'TRUE' || row[18] === true,
      missingDetails: row[19] === 'TRUE' || row[19] === true,
    };
  }

  if (gid === '501319673') {
    return {
      date: formatDateToShort(row[0] || ''),
      designer: row[1] || '',
      priority: row[2] || '',
      requester: row[3] || '',
      type: row[4] || '',
      deadline: formatDateToShort(row[5] || ''),
      reference: row[6] || '',
      notes: row[7] || '',
      done: row[8] === 'TRUE' || row[8] === true || String(row[8]).toLowerCase() === 'true',
      completed_date: formatDateToShort(row[9] || ''),
    };
  }

  // All sheets (Junior 4 to Senior 3) have the same layout!
  const parsedDate = formatDateToShort(row[2] || row[1] || '');
  return {
    week: row[0] || '',
    date: parsedDate,
    id: row[6] || row[5] || parsedDate || '',
    subject: row[3] || '',
    extra: normalizeBranch(row[4]),
    branch: normalizeBranch(row[4]),
    filingName: row[5] || '',
    name: row[6] || row[5] || 'بدون اسم',
    val: row[7] || '',
    opSheet: row[7] || '',
    check1: row[8] === 'TRUE' || row[8] === true || row[9] === 'TRUE',
    check2: row[9] === 'TRUE' || row[9] === true || row[10] === 'TRUE',
  };
};

const DEFAULT_PUBLISHED_ID = '2PACX-1vRuuQ4J0z5ze6hHeZIvM24VqPApNS_eHIvnBmZ4EyPWj7J1MpvBOyPodwx0DKa1yqNkjlFdahgN6jZI';
const OPERATIONS_GID = '1476192399';

const sheetCache: Record<string, any[]> = {};

export function useGoogleSheets(gid: string, customDocId?: string) {
  const [data, setData] = useState<any[]>(() => sheetCache[gid] || []);
  const [loading, setLoading] = useState(() => !sheetCache[gid]);
  const [error, setError] = useState<string | null>(null);

  const activeGidRef = useRef(gid);

  const fetchData = async (targetGid: string, isSilent = false, docIdOverride?: string) => {
    if (!isSilent) {
      setLoading(true);
    }
    setError(null);
    try {
      let rows: any[][] = [];

      // For all proxy-managed sheets: Operations, Tagme3at Backend, REELS, and Designers/Creators
      const reelsGids = ['1436746012', '1939073164', '0', '798246690'];
      const proxyGids = [OPERATIONS_GID, '1535230545', '2086331904', '501319673', ...reelsGids];
      if (proxyGids.includes(targetGid)) {
        try {
          const res = await fetch(`/api/sheet?gid=${targetGid}&t=${Date.now()}`);
          if (!res.ok) throw new Error(`API error: ${res.status}`);
          const text = await res.text();
          try {
            const json = JSON.parse(text);
            rows = json.rows || [];
          } catch(e) {
            throw new Error('Not JSON response');
          }
        } catch(err) {
          if (targetGid === OPERATIONS_GID) {
            console.log('[Fallback] Loading static test.json for Operations sheet (GitHub Pages mode)');
            const fallbackRes = await fetch('/test.json');
            if (fallbackRes.ok) {
              const json = await fallbackRes.json();
              rows = json.rows || [];
            } else {
              throw err;
            }
          } else if (reelsGids.includes(targetGid)) {
            console.log('[Fallback] Fetching REELS CSV directly from Google Docs');
            const reelsDocId = docIdOverride || customDocId || '2PACX-1vTvcQ3v1JOzacx9tcsYrbriofFyHlu7rOKKlsobvpP9vjnbHGcg_Qn9TLlbkgB2YsGiX0GO1U4wlZjd';
            const url = `https://docs.google.com/spreadsheets/d/e/${reelsDocId}/pub?gid=${targetGid}&output=csv&single=true&t=${Date.now()}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
            const text = await res.text();

            // Robust CSV parse (respects newlines and commas inside quotes)
            rows = [];
            let currentRow: string[] = [];
            let currentCell = '';
            let inQuotes = false;

            for (let i = 0; i < text.length; i++) {
              const char = text[i];
              const nextChar = text[i + 1];

              if (char === '"') {
                if (inQuotes && nextChar === '"') {
                  currentCell += '"';
                  i++;
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (char === ',' && !inQuotes) {
                currentRow.push(currentCell.trim());
                currentCell = '';
              } else if (char === '\n' && !inQuotes) {
                currentRow.push(currentCell.trim());
                rows.push(currentRow);
                currentRow = [];
                currentCell = '';
              } else if (char === '\r' && !inQuotes) {
                // Ignore \r
              } else {
                currentCell += char;
              }
            }
            if (currentCell || currentRow.length > 0) {
              currentRow.push(currentCell.trim());
              rows.push(currentRow);
            }
          } else {
            throw err;
          }
        }
      } else {
        // ── Public published sheet or custom doc ID → direct CSV fetch ─────────────────────
        const activeDocId = docIdOverride || customDocId || DEFAULT_PUBLISHED_ID;
        const url = `https://docs.google.com/spreadsheets/d/e/${activeDocId}/pub?gid=${targetGid}&output=csv&single=true&t=${Date.now()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
        const text = await res.text();

        // Robust CSV parse (respects newlines and commas inside quotes)
        rows = [];
        let currentRow: string[] = [];
        let currentCell = '';
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const nextChar = text[i + 1];

          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              currentCell += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = '';
          } else if (char === '\n' && !inQuotes) {
            currentRow.push(currentCell.trim());
            rows.push(currentRow);
            currentRow = [];
            currentCell = '';
          } else if (char === '\r' && !inQuotes) {
            // Ignore \r
          } else {
            currentCell += char;
          }
        }
        if (currentCell || currentRow.length > 0) {
          currentRow.push(currentCell.trim());
          rows.push(currentRow);
        }
      }

      // Check if this GID is still active before parsing and setting state
      if (activeGidRef.current !== targetGid) return;

      let lastWeek = '';
      let lastDate = '';
      let lastSubject = '';
      let lastBranch = '';

      const seenKeyCounts: Record<string, number> = {};
      const parsedData = rows
        .slice(1) // skip header
        .map((row) => {
          const item = mapSheetRow(row, targetGid);
          
          // Carry over values for merged cells in Stage sheets
          const reelsGids = ['1436746012', '1939073164', '798246690', '0'];
          if (targetGid !== '1476192399' && targetGid !== '1535230545' && !reelsGids.includes(targetGid)) {
            if (item.week) lastWeek = item.week; else item.week = lastWeek;
            if (item.date) lastDate = item.date; else { item.date = lastDate; item.id = lastDate; }
            if (item.subject) lastSubject = item.subject; else item.subject = lastSubject;
            if (item.extra) lastBranch = item.extra; else { item.extra = lastBranch; item.branch = lastBranch; }
          }
          
          // Generate a unique, stable, duplicate-aware key for the row
          const baseName = (item.name || 'empty').trim();
          const baseId = (item.id || item.date || '').trim();
          const baseVal = (item.val || item.branch || '').trim();
          const baseKey = `${baseName}_${baseId}_${baseVal}`;
          
          const occurrence = seenKeyCounts[baseKey] || 0;
          seenKeyCounts[baseKey] = occurrence + 1;
          
          // Clean base key to avoid special character issues and set uniqueKey
          const cleanKey = baseKey.replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_');
          item.uniqueKey = `${targetGid}_${cleanKey}_${occurrence}`;
          
          return item;
        })
        .filter((item: any) => {
          // if (!item.name || item.name === 'بدون اسم') return false; // Temporarily disabled for debugging
          
          // Ignore header rows that sometimes appear in the data
          if (String(item.name).trim().toUpperCase() === 'OP NAME') return false;
          if (String(item.name).trim().toUpperCase() === 'NAME') return false;

          // Fallback client-side filter for Q items
          const qRegex = /Q\s*\d+[^a-zA-Z0-9]*$/i;
          // if (qRegex.test(String(item.name).trim())) return false; // Temporarily disabled for debugging
          // if (item.filingName && qRegex.test(String(item.filingName).trim())) return false; // Temporarily disabled for debugging
          
          return true;
        });

      sheetCache[targetGid] = parsedData;
      setData(parsedData);
    } catch (err: any) {
      if (activeGidRef.current === targetGid) {
        setError(err.message);
      }
    } finally {
      if (activeGidRef.current === targetGid) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    activeGidRef.current = gid;
    if (sheetCache[gid]) {
      setData(sheetCache[gid]);
      setLoading(false);
      fetchData(gid, true, customDocId); // Silent background fetch
    } else {
      setData([]);
      setLoading(true);
      fetchData(gid, false, customDocId); // Normal foreground fetch
    }
  }, [gid, customDocId]);

  const isTransitioning = activeGidRef.current !== gid;
  const displayData = isTransitioning ? (sheetCache[gid] || []) : data;
  const displayLoading = isTransitioning ? !sheetCache[gid] : loading;

  const updateData = (updater: (prev: any[]) => any[]) => {
    setData(prev => {
      const newData = updater(prev);
      if (sheetCache[gid]) {
        sheetCache[gid] = newData;
      }
      return newData;
    });
  };

  return { data: displayData, updateData, loading: displayLoading, error, refresh: (isSilent = false) => fetchData(gid, isSilent) };
}
