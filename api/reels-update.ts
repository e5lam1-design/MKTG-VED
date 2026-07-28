import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { oldCode, rowData } = req.body || {};
  if (!oldCode || !rowData || !Array.isArray(rowData)) {
    return res.status(400).json({ error: 'Missing oldCode or invalid rowData' });
  }

  // Respond immediately to the frontend to eliminate UI lag
  res.status(200).json({ success: true, message: 'Update queued in background' });

  // Process update asynchronously in background
  (async () => {
    try {
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.replace(/"/g, '').trim();
      const privateKey = formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY);

      if (!clientEmail || !privateKey) {
        console.error('[API Reels] Missing Google Credentials');
        return;
      }

      const auth = new google.auth.GoogleAuth({
        credentials: { client_email: clientEmail, private_key: privateKey },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = '1GYrPRyPda-w1fGCxFOkieSHT7X5kK5TbikQZuZ-oe1k';

      // Fetch sheets data to locate row by code
      const [shootingRes, veRes, counterRes, cutsRes] = await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId, range: 'Shooting!A:P' }),
        sheets.spreadsheets.values.get({ spreadsheetId, range: 'Ve!A:T' }),
        sheets.spreadsheets.values.get({ spreadsheetId, range: 'Counter!A:P' }),
        sheets.spreadsheets.values.get({ spreadsheetId, range: 'Cuts!A:R' })
      ]);

      const shootingRows = shootingRes.data.values || [];
      const veRows = veRes.data.values || [];
      const counterRows = counterRes.data.values || [];
      const cutsRows = cutsRes.data.values || [];

      const shootingRowIndex = shootingRows.findIndex(r => r[5] === oldCode);
      const veRowIndex = veRows.findIndex(r => r[5] === oldCode);
      const counterRowIndex = counterRows.findIndex(r => r[5] === oldCode);
      const cutsRowIndex = cutsRows.findIndex(r => r[5] === oldCode);

      const sheetUpdates = [];

      if (shootingRowIndex !== -1) {
        const shootingRowData = [
          rowData[0] || '',  rowData[1] || '',  rowData[2] || '',  rowData[3] || '',
          rowData[4] || '',  rowData[5] || '',  rowData[6] || '',  rowData[7] || '',
          rowData[8] || '',  rowData[9] || '',  rowData[10] || '', rowData[11] || '',
          rowData[12] || '', rowData[13] || '', rowData[14] || '', rowData[17] || ''
        ];
        sheetUpdates.push(
          sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Shooting!A${shootingRowIndex + 1}:P${shootingRowIndex + 1}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [shootingRowData] },
          })
        );
      }

      if (veRowIndex !== -1) {
        const veRowData = [
          rowData[0] || '',  rowData[1] || '',  rowData[2] || '',  rowData[3] || '',
          rowData[4] || '',  rowData[5] || '',  rowData[6] || '',  rowData[7] || '',
          rowData[8] || '',  rowData[9] || '',  rowData[10] || '', rowData[11] || '',
          rowData[12] || '', rowData[13] || '', rowData[14] || '', rowData[15] || '',
          rowData[16] || '', rowData[17] || '', rowData[18] || '', rowData[19] || ''
        ];
        sheetUpdates.push(
          sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Ve!A${veRowIndex + 1}:T${veRowIndex + 1}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [veRowData] },
          })
        );
      }

      if (counterRowIndex !== -1) {
        const counterRowData = [
          rowData[0] || '',  rowData[1] || '',  rowData[2] || '',  rowData[3] || '',
          rowData[4] || '',  rowData[5] || '',  rowData[6] || '',  rowData[7] || '',
          rowData[8] || '',  rowData[9] || '',  rowData[10] || '', rowData[11] || '',
          rowData[12] || '', rowData[13] || '', rowData[14] || '', rowData[17] || ''
        ];
        sheetUpdates.push(
          sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Counter!A${counterRowIndex + 1}:P${counterRowIndex + 1}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [counterRowData] },
          })
        );
      }

      if (cutsRowIndex !== -1) {
        const cutsRowData = [
          rowData[0] || '',  rowData[1] || '',  rowData[2] || '',  rowData[3] || '',
          rowData[4] || '',  rowData[5] || '',  rowData[6] || '',  rowData[7] || '',
          rowData[8] || '',  rowData[9] || '',  rowData[10] || '', rowData[11] || '',
          rowData[12] || '', rowData[13] || '', rowData[14] || '', rowData[15] || '',
          rowData[16] || '', rowData[17] || ''
        ];
        sheetUpdates.push(
          sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Cuts!A${cutsRowIndex + 1}:R${cutsRowIndex + 1}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [cutsRowData] },
          })
        );
      }

      if (sheetUpdates.length > 0) {
        await Promise.all(sheetUpdates);
        console.log(`[API Vercel Reels] Updated Google Sheets for code: ${oldCode}`);
      }

      // Supabase update
      if (supabaseAdmin) {
        const parseDate = (dStr: any) => {
          if (!dStr) return null;
          const d = new Date(dStr);
          return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
        };

        const dbItem = {
          date: parseDate(rowData[0]) || new Date().toISOString().split('T')[0],
          branch: rowData[1] || null,
          year: rowData[2] || null,
          teacher: rowData[3] || null,
          column_5: rowData[4] || null,
          code: rowData[5] || null,
          script_link: rowData[6] || null,
          type: rowData[7] || null,
          format: rowData[8] || null,
          is_filmed: rowData[9] === 'TRUE' || rowData[9] === true || String(rowData[9]).toLowerCase() === 'true',
          filming_date: parseDate(rowData[10]),
          filmed_by: rowData[11] || null,
          storage: rowData[12] || null,
          notes: rowData[13] || null,
          drive_raw: rowData[14] || null,
          drive_final: rowData[17] || null,
          is_canceled: String(rowData[18] || '').toUpperCase() === 'TRUE' || rowData[18] === true
        };

        const { data: updatedShooting } = await supabaseAdmin
          .from('shooting')
          .update(dbItem)
          .eq('code', oldCode)
          .select('id')
          .maybeSingle();

        const shootingId = updatedShooting?.id;
        if (veRowIndex !== -1 && shootingId) {
          const veItem = {
            shooting_id: shootingId,
            date: parseDate(rowData[0]) || new Date().toISOString().split('T')[0],
            branch: rowData[1] || null,
            year: rowData[2] || null,
            teacher: rowData[3] || null,
            column_5: rowData[4] || null,
            code: rowData[5] || null,
            script_link: rowData[6] || null,
            type: rowData[7] || null,
            format: rowData[8] || null,
            is_filmed: rowData[9] === 'TRUE' || rowData[9] === true || String(rowData[9]).toLowerCase() === 'true',
            filming_date: parseDate(rowData[10]),
            filmed_by: rowData[11] || null,
            storage: rowData[12] || null,
            notes: rowData[13] || null,
            drive_raw: rowData[14] || null,
            drive_final: rowData[17] || null,
            is_canceled: String(rowData[18] || '').toUpperCase() === 'TRUE' || rowData[18] === true,
            is_missing_details: String(rowData[19] || '').toUpperCase() === 'TRUE' || rowData[19] === true,
            editor_name: rowData[15] || null,
            is_done: rowData[16] === 'TRUE' || rowData[16] === true || String(rowData[16]).toLowerCase() === 'true'
          };

          await supabaseAdmin
            .from('ve')
            .update(veItem)
            .eq('code', oldCode);
        }
      }
    } catch (err: any) {
      console.error('[API Vercel Reels] Error in background update:', err.message);
    }
  })();
}
