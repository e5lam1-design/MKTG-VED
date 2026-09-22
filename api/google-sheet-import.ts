import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key);
};

function formatPrivateKey(key: string | undefined): string {
  if (!key) return '';
  let formatted = key.replace(/"/g, '').trim();
  formatted = formatted.replace(/\\n/g, '\n');
  if (!formatted.includes('\n')) {
    const beginHeader = '-----BEGIN PRIVATE KEY-----';
    const endHeader = '-----END PRIVATE KEY-----';
    if (formatted.includes(beginHeader) && formatted.includes(endHeader)) {
      let body = formatted.substring(
        formatted.indexOf(beginHeader) + beginHeader.length,
        formatted.indexOf(endHeader)
      );
      body = body.replace(/\s+/g, '');
      const matchedBody = body.match(/.{1,64}/g);
      const bodyLines = matchedBody ? matchedBody.join('\n') : body;
      formatted = `${beginHeader}\n${bodyLines}\n${endHeader}`;
    }
  }
  return formatted;
}

// Robust CSV & TSV parser
function parseTableText(text: string): string[][] {
  const isTsv = text.includes('\t') && !text.includes('","');
  const rows: string[][] = [];
  
  if (isTsv) {
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      rows.push(line.split('\t').map(c => c.trim()));
    }
    return rows;
  }

  // Standard CSV parsing
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
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else if (char === '\r' && !inQuotes) {
      // ignore \r
    } else {
      currentCell += char;
    }
  }
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }
  return rows;
}

function extractSheetDetails(urlOrId: string): { spreadsheetId: string | null; gid: string | null } {
  const input = (urlOrId || '').trim();
  if (!input) return { spreadsheetId: null, gid: null };

  // Check if it's already just an ID (contains no slashes or dots)
  if (!input.includes('/') && !input.includes('http') && input.length >= 20) {
    return { spreadsheetId: input, gid: null };
  }

  // Extract spreadsheet ID
  const idMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const spreadsheetId = idMatch ? idMatch[1] : null;

  // Extract GID
  const gidMatch = input.match(/[#&?]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : null;

  return { spreadsheetId, gid };
}

// Smart auto-detection of column mapping based on header text
function detectColumnMapping(headers: string[], sampleRows: string[][] = []): Record<string, number> {
  const mapping: Record<string, number> = {};
  const normalizedHeaders = headers.map(h => (h || '').toLowerCase().trim().replace(/[\r\n\t_]/g, ' '));

  const definitions: Record<string, string[]> = {
    date: ['تاريخ', 'date', 'التاريخ', 'يوم', 'column 1', 'عمود 1'],
    branch: ['فرع', 'الفرع', 'branches', 'branch', 'column 2', 'عمود 2'],
    year: ['سنة', 'السنة', 'عام', 'grade', 'year', 'stage', 'المرحلة', 'column 3', 'عمود 3'],
    teacher: ['مدرس', 'المدرس', 'أستاذ', 'الاستاذ', 'معلم', 'teacher', 'column 4', 'عمود 4'],
    extra_name: ['صانع', 'صانع المحتوى', 'اسم إضافي', 'اسم اضافي', 'creator', 'extra', 'column 5', 'عمود 5', 'المعد', 'الكريتور'],
    code: ['كود', 'الكود', 'code', 'id', 'رمز', 'column 6', 'عمود 6'],
    script: [
      'اسكربت', 'الاسكربت', 'سكربت', 'السكربت',
      'اسكريبت', 'السكريبت', 'سكريبت', 'السكريبتات', 'الاسكربتات',
      'رابط الاسكربت', 'رابط الاسكريبت', 'لينك الاسكربت', 'لينك الاسكريبت',
      'رابط', 'لينك', 'link', 'script', 'url', 'doc', 'docs', 'google doc', 'google docs',
      'مستند', 'مستندات', 'درس', 'الدرس', 'اسم الدرس', 'رابط الدرس',
      'محتوى', 'عنوان', 'document', 'drive', 'درايف', 'الدرايف',
      'عمود 3', 'column 3', 'عمود 7', 'column 7'
    ],
    type: ['نوع', 'النوع', 'type', 'column 8', 'عمود 8'],
    format: ['مقاس', 'المقاس', 'format', 'أبعاد', 'ابعاد', 'column 9', 'عمود 9'],
    filmed: ['اتصور', 'اتصور؟', 'تم التصوير', 'filmed'],
    filming_date: ['تاريخ التصوير', 'filming date'],
    by: ['المصور', 'تصوير', 'by', 'filmed by', 'shooter'],
    storage: ['كارت', 'مساحة', 'storage', 'الكارت'],
    notes: ['ملاحظات', 'ملاحظة', 'notes', 'تعليق'],
    drive_raw: ['خام', 'raw', 'drive raw', 'ماتريال', 'درايف الخام', 'لينك الخام', 'drive link (raw)']
  };

  for (const [field, keywords] of Object.entries(definitions)) {
    let foundIdx = normalizedHeaders.findIndex(header => 
      keywords.some(kw => header === kw || header.startsWith(kw + ' ') || header.includes(kw))
    );
    if (foundIdx !== -1) {
      mapping[field] = foundIdx;
    }
  }

  // Content inspection: if script is not mapped, inspect sample row cells
  if (mapping.script === undefined && sampleRows.length > 0) {
    const numCols = Math.max(...sampleRows.map(r => r.length), headers.length);
    for (let c = 0; c < numCols; c++) {
      const isDoc = sampleRows.some(row => {
        const cell = String(row[c] || '').toLowerCase().trim();
        return cell.includes('document/d/') ||
               cell.includes('cument/d/') ||
               cell.includes('docs.google.com') ||
               cell.includes('drive.google.com') ||
               cell.includes('/document/') ||
               cell.startsWith('http://') ||
               cell.startsWith('https://') ||
               cell.startsWith('=hyperlink') ||
               /1[a-zA-Z0-9_-]{25,}/.test(cell);
      });
      if (isDoc) {
        mapping.script = c;
        break;
      }
    }
  }

  // Content inspection: if code is not mapped
  if (mapping.code === undefined && sampleRows.length > 0) {
    const numCols = Math.max(...sampleRows.map(r => r.length), headers.length);
    for (let c = 0; c < numCols; c++) {
      const isCode = sampleRows.some(row => {
        const cell = String(row[c] || '').toLowerCase().trim();
        return /^[msj]\d+-[a-z0-9\s._-]+v\d+/i.test(cell) || cell.includes(' v6') || cell.includes(' v7');
      });
      if (isCode) {
        mapping.code = c;
        break;
      }
    }
  }

  // Content inspection: if extra_name is not mapped
  if (mapping.extra_name === undefined && sampleRows.length > 0) {
    const knownCreators = [
      'alaa zakria', 'hesham', 'esraa', 'maram', 'han', 'nader', 'eman', 'noor',
      'manar', 'yomna', 'hima', 'ramy', 'rawan', 'nourhan', 'sohaila', 'ahmed samir',
      'adham elbadry', 'awney', 'sherif', 'donia', 'nada', 'khaled', 'anas', 'habiba', 'khalil', 'hassanien'
    ];
    const numCols = Math.max(...sampleRows.map(r => r.length), headers.length);
    for (let c = 0; c < numCols; c++) {
      const isCreator = sampleRows.some(row => {
        const cell = String(row[c] || '').toLowerCase().trim();
        return knownCreators.some(kc => cell === kc || cell.includes(kc));
      });
      if (isCreator) {
        mapping.extra_name = c;
        break;
      }
    }
  }

  return mapping;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, url, csvText, tabName, gid: requestedGid, rowsToImport, targetSpreadsheetId } = req.body || {};

  try {
    // ─── ACTION 1: PREVIEW SHEET DATA ───────────────────────────────────────────
    if (action === 'preview') {
      let rawRows: string[][] = [];
      let tabs: { title: string; sheetId: number }[] = [];
      let activeTabName = tabName || '';
      let sheetTitle = 'Google Sheet';

      if (csvText && csvText.trim()) {
        // Direct pasted CSV/TSV
        rawRows = parseTableText(csvText.trim());
        sheetTitle = 'بيانات ملصوقة يدوياً (Pasted Data)';
      } else if (url && url.trim()) {
        const { spreadsheetId, gid } = extractSheetDetails(url.trim());
        const effectiveGid = requestedGid || gid;

        if (!spreadsheetId) {
          return res.status(400).json({ error: 'رابط غير صالح: لم يتم العثور على معرّف Google Sheet الصحيح في الرابط المدخل.' });
        }

        const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.replace(/"/g, '').trim();
        const privateKey = formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY);

        let fetchedViaApi = false;

        // Try Google Sheets API with Service Account credentials
        if (clientEmail && privateKey) {
          try {
            const auth = new google.auth.GoogleAuth({
              credentials: { client_email: clientEmail, private_key: privateKey },
              scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
            });
            const sheets = google.sheets({ version: 'v4', auth });

            // 1. Get spreadsheet metadata (title and tabs)
            const meta = await sheets.spreadsheets.get({ spreadsheetId });
            sheetTitle = meta.data.properties?.title || 'Google Sheet';
            tabs = (meta.data.sheets || []).map(s => ({
              title: s.properties?.title || 'Sheet',
              sheetId: s.properties?.sheetId ?? 0,
            }));

            // Pick requested tab, or tab matching gid, or first tab
            let targetTab = tabs[0]?.title || '';
            if (activeTabName) {
              const found = tabs.find(t => t.title.toLowerCase() === activeTabName.toLowerCase());
              if (found) targetTab = found.title;
            } else if (effectiveGid) {
              const found = tabs.find(t => String(t.sheetId) === String(effectiveGid));
              if (found) targetTab = found.title;
            }

            activeTabName = targetTab;

            // 2. Fetch sheet values with rich metadata (extracts Smart Chips, hyperlinks, and text)
            const sheetDataRes = await sheets.spreadsheets.get({
              spreadsheetId,
              ranges: [targetTab],
              fields: 'sheets/data/rowData/values(formattedValue,hyperlink,chipRuns,textFormatRuns)',
            });

            const rowData = sheetDataRes.data.sheets?.[0]?.data?.[0]?.rowData || [];
            rawRows = rowData.map(r => (r.values || []).map(c => {
              const text = (c.formattedValue || '').trim();
              const chipUri = c.chipRuns?.[0]?.chip?.richLinkProperties?.uri || '';
              const textRunUri = c.textFormatRuns?.[0]?.format?.link?.uri || '';
              const link = (c.hyperlink || chipUri || textRunUri || '').trim();

              if (link && text && link !== text) {
                return `=HYPERLINK("${link}", "${text}")`;
              }
              if (link) return link;
              if (text.includes('document/d/')) {
                const idx = text.indexOf('document/d/');
                return 'https://docs.google.com/' + text.substring(idx);
              }
              return text;
            }));
            fetchedViaApi = true;
          } catch (apiErr: any) {
            console.warn('[Google Sheet Import] Service Account API fetch warning:', apiErr?.message);
          }
        }

        // Fallback: If Service Account failed (e.g. private sheet not shared with SA), try public export or GViz
        if (!fetchedViaApi) {
          const exportUrl = effectiveGid
            ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${effectiveGid}`
            : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;

          const csvRes = await fetch(exportUrl);
          if (csvRes.ok) {
            const text = await csvRes.text();
            rawRows = parseTableText(text);
          } else {
            // Try GViz URL
            const gvizUrl = effectiveGid
              ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${effectiveGid}`
              : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;

            const gvizRes = await fetch(gvizUrl);
            if (gvizRes.ok) {
              const text = await gvizRes.text();
              rawRows = parseTableText(text);
            } else {
              return res.status(403).json({
                error: 'تعذر الوصول إلى الشيت. تأكد من أن الرابط متاح لأي شخص لديه الرابط (Public Link) أو قم بمشاركة الشيت مع إيميل الخدمة: ' + (clientEmail || 'Google Service Account') + ' أو استخدم خيار لصق البيانات مباشرة.',
                needsShare: true,
                serviceEmail: clientEmail
              });
            }
          }
        }
      } else {
        return res.status(400).json({ error: 'يرجى إدخال رابط الشيت أو لصق بيانات الجدول' });
      }

      // Filter out completely blank rows
      const nonEmptyRows = rawRows.filter(row => row.some(cell => cell && cell.trim() !== ''));

      if (nonEmptyRows.length === 0) {
        return res.status(400).json({ error: 'الشيت المحدد فارغ أو لا يحتوي على صفوف بيانات صالحة' });
      }

      // First row is headers, subsequent rows are data
      const headers = nonEmptyRows[0].map((h, i) => (h && h.trim()) ? h.trim() : `عمود ${i + 1}`);
      const dataRows = nonEmptyRows.slice(1);

      // Auto-detect column mapping
      const detectedMapping = detectColumnMapping(headers);

      return res.status(200).json({
        success: true,
        sheetTitle,
        tabs,
        selectedTab: activeTabName,
        headers,
        detectedMapping,
        totalRows: dataRows.length,
        previewRows: dataRows.slice(0, 100), // First 100 for fast preview
        allRows: dataRows
      });
    }

    // ─── ACTION 2: APPEND TO GOOGLE SHEET ──────────────────────────────────────
    if (action === 'append_to_sheet') {
      if (!rowsToImport || !Array.isArray(rowsToImport) || rowsToImport.length === 0) {
        return res.status(400).json({ error: 'Missing rowsToImport' });
      }

      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.replace(/"/g, '').trim();
      const privateKey = formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY);
      const targetId = targetSpreadsheetId || '1GYrPRyPda-w1fGCxFOkieSHT7X5kK5TbikQZuZ-oe1k';

      if (clientEmail && privateKey) {
        try {
          const auth = new google.auth.GoogleAuth({
            credentials: { client_email: clientEmail, private_key: privateKey },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
          });
          const sheets = google.sheets({ version: 'v4', auth });

          await sheets.spreadsheets.values.append({
            spreadsheetId: targetId,
            range: 'Shooting!A:R',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
              values: rowsToImport
            }
          });
          return res.status(200).json({ success: true, count: rowsToImport.length });
        } catch (appendErr: any) {
          console.error('[Google Sheet Import] Append to Google Sheet failed:', appendErr);
          // Return non-fatal so Supabase rows are still preserved
          return res.status(200).json({ success: false, warning: appendErr?.message });
        }
      }
      return res.status(200).json({ success: true, note: 'No service account credentials to append to Google Sheets' });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error: any) {
    console.error('[Google Sheet Import Error]:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
