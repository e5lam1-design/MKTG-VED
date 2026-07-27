import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

const getSpreadsheetId = (gid: any) => {
  const g = String(gid || '');
  const reelsGids = ['1436746012', '1939073164', '0', '798246690'];
  if (reelsGids.includes(g)) {
    return '1GYrPRyPda-w1fGCxFOkieSHT7X5kK5TbikQZuZ-oe1k';
  }
  if (g === '501319673' || g === 'designers') {
    return '1T9x6FXjjXNrdpCwsX8lnFyyXogN11T9ou0hwrQWmdB4';
  }
  if (g === '1476192399' || g === '2086331904') {
    return '1Hm7noXxv8ITMU3dNXQmqFEzfZY1mZlBJ4bQ9_ZIR0-M';
  }
  return '1lh0-kh9MlT4AZCi3-QBn0fkkiNpMcpg6qcoDfBeNK8g';
};

function formatPrivateKey(key: string | undefined): string {
  if (!key) return '';
  let formatted = key.replace(/"/g, '').trim();
  formatted = formatted.replace(/\\n/g, '\n');
  
  // If newlines were stripped, rebuild the PEM format
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

const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
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
      // ignore
    } else {
      currentCell += char;
    }
  }
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }
  return rows;
};

const GID_TO_TAB: Record<string, string> = {
  '1476192399': 'Operations',
  '1535230545': 'تجميعات',
  '497207661': 'Junior 4',
  '96752860': 'Junior 5',
  '346788121': 'Junior 6',
  '458352282': 'Middle 1',
  '2113852114': 'Middle 2',
  '2089699920': 'Middle 3',
  '1640460225': 'Senior 1',
  '595027661': 'Senior 2',
  '286303232': 'Senior 3',
  '501319673': 'Designers',
  '1436746012': 'Shooting',
  '1939073164': 'Ve',
  '0': 'CUTS',
};

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { gid } = req.query;
  if (!gid) {
    return res.status(400).json({ error: 'Missing GID parameter' });
  }

  // 🔒 1. Extract Bearer Authorization Token
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (token) {
    let userId: string | null = null;

    // Try Supabase auth token verification
    const { data: userData } = await supabaseAdmin.auth.getUser(token);
    if (userData?.user) {
      userId = userData.user.id;
    } else {
      // Fallback for custom user profile ID (local token login)
      userId = token;
    }

    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('role, allowed_tabs, is_active')
        .eq('id', userId)
        .maybeSingle();

      if (profile && profile.is_active !== false) {
        // Admins and Managers have full access to all tabs
        if (profile.role !== 'admin' && profile.role !== 'manager') {
          const allowedTabs: string[] = profile.allowed_tabs || [];
          const requestedTab = GID_TO_TAB[String(gid)];

          // If custom allowed_tabs array is defined and non-empty, strictly check against requested tab
          if (allowedTabs.length > 0 && requestedTab) {
            const isAllowed = allowedTabs.some(
              t => t.trim().toLowerCase() === requestedTab.trim().toLowerCase()
            );
            if (!isAllowed) {
              return res.status(403).json({ error: 'Forbidden: No access to this tab' });
            }
          }
        }
      }
    }
  }

  try {
    const strGid = String(gid);
    const reelsGids = ['1436746012', '1939073164', '0', '798246690'];
    const isServiceAccountSheet = (strGid === '1476192399' || strGid === '2086331904' || reelsGids.includes(strGid));

    let rows: any[][] = [];
    let sheetName = '';

    if (isServiceAccountSheet) {
      // Authenticate using Service Account credentials from environment variables
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL?.replace(/"/g, '').trim(),
          private_key: formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const targetSpreadsheetId = getSpreadsheetId(gid);

      // Get all sheet names to find the one with matching GID
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: targetSpreadsheetId,
      });

      // Find sheet name by GID
      const sheetMeta = spreadsheet.data.sheets?.find(
        (s) => String(s.properties?.sheetId) === String(gid)
      );

      if (!sheetMeta?.properties?.title) {
        return res.status(404).json({ error: `Sheet with GID ${gid} not found` });
      }

      sheetName = sheetMeta.properties.title;

      // Fetch the data
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: targetSpreadsheetId,
        range: sheetName,
      });

      rows = response.data.values || [];
    } else {
      // Stage sheets: fetch CSV directly from public URL
      const reelsGids = ['1436746012', '1939073164', '0', '798246690', '371641707', '97351444', '1639251452'];
      const activePublishedId = reelsGids.includes(strGid)
        ? '2PACX-1vTvcQ3v1JOzacx9tcsYrbriofFyHlu7rOKKlsobvpP9vjnbHGcg_Qn9TLlbkgB2YsGiX0GO1U4wlZjd'
        : strGid === '501319673'
        ? '2PACX-1vRkOH2-jRtYqmkf0opn6in9TMg3oOo6FBvlGfkJjhDwn-t-CSYyrTbn4EDjNCFdvKL7tQG6nQ--jSdC'
        : '1GFMUIYZIfqFyrQ0nKxCcATP6T6HKj4_noqSqN2sVEsU';
      const url = `https://docs.google.com/spreadsheets/d/e/${activePublishedId}/pub?gid=${gid}&output=csv&single=true&t=${Date.now()}`;
      
      const csvRes = await fetch(url);
      if (!csvRes.ok) throw new Error(`CSV fetch failed: ${csvRes.status}`);
      const text = await csvRes.text();
      rows = parseCsv(text);
      sheetName = `Public Sheet ${gid}`;
    }
    
    // Filter out rows that are entirely empty or just contain whitespace
    let validRows = rows.filter((row: any[]) => 
      row.some(cell => cell && String(cell).trim() !== '')
    );
    
    // Performance optimization for large sheets
    if (strGid === '1476192399' || strGid === '2086331904') {
      const isNewGid = strGid === '1476192399';
      validRows = validRows
        .map((row: any[]) => {
          if (isNewGid) {
            const sliced = row.slice(0, 21);
            while (sliced.length < 21) sliced.push('');
            // Fallback: extract play URL from iframe embed in col 16 if col 17 is empty
            if (!sliced[17] && sliced[16]) {
              const m = String(sliced[16]).match(/mediadelivery\.net\/embed\/(\d+)\/([a-f0-9-]+)/i);
              if (m) {
                sliced[17] = `https://iframe.mediadelivery.net/play/${m[1]}/${m[2]}`;
              }
            }
            return sliced;
          } else {
            return row.slice(0, 7);
          }
        })
        .filter((row: any[]) => {
          const nameIdx = isNewGid ? 11 : 4;
          const filingIdx = isNewGid ? 12 : 5;
          if (!row[nameIdx] || row[nameIdx] === 'بدون اسم') return false;
          // Filter out rows ending with Q and a number, optionally followed by closing brace (e.g., Q1, Q20, Q20})
          const qRegex = /Q\s*\d+[^a-zA-Z0-9]*$/i;
          if (qRegex.test(String(row[nameIdx]).trim()) || (row[filingIdx] && qRegex.test(String(row[filingIdx]).trim()))) {
            return false;
          }
          return true;
        });
    }
    
    return res.status(200).json({ rows: validRows, sheetName });

  } catch (err: any) {
    console.error('Sheets API error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
