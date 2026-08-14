import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = 'https://dppdaqmrrjbldcygadpi.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwcGRhcW1ycmpibGRjeWdhZHBpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzNTIyNSwiZXhwIjoyMDk0ODExMjI1fQ.EBZ2wyV48UA9h9tLM0vUrjovR8xCb8lPLIaVgI9aVwU';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const keyFilePath = path.join(__dirname, 'sapient-flight-495410-s3-7ebddbbb3300.json');

const auth = new google.auth.GoogleAuth({
  keyFile: keyFilePath,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

const getSpreadsheetId = (gid) => {
  const g = String(gid || '');
  if (['1436746012', '1939073164', '0', '798246690'].includes(g)) return '1GYrPRyPda-w1fGCxFOkieSHT7X5kK5TbikQZuZ-oe1k';
  if (g === '501319673' || g === 'designers') return '1T9x6FXjjXNrdpCwsX8lnFyyXogN11T9ou0hwrQWmdB4';
  if (g === '1476192399' || g === '2086331904') return '1Hm7noXxv8ITMU3dNXQmqFEzfZY1mZlBJ4bQ9_ZIR0-M';
  return '1lh0-kh9MlT4AZCi3-QBn0fkkiNpMcpg6qcoDfBeNK8g';
};

const stages = [
  { gid: '1476192399', label: 'Operations', tab: 'Operations' },
  { gid: '1535230545', label: 'تجميعات', tab: 'تجميعات' },
  { gid: '497207661', label: 'Junior 4', tab: 'Junior 4' },
  { gid: '96752860', label: 'Junior 5', tab: 'Junior 5' },
  { gid: '346788121', label: 'Junior 6', tab: 'Junior 6' },
  { gid: '458352282', label: 'Middle 1', tab: 'Middle 1' },
  { gid: '2113852114', label: 'Middle 2', tab: 'Middle 2' },
  { gid: '2089699920', label: 'Middle 3', tab: 'Middle 3' },
  { gid: '1640460225', label: 'Senior 1', tab: 'Senior 1' },
  { gid: '595027661', label: 'Senior 2', tab: 'Senior 2' },
  { gid: '286303232', label: 'Senior 3', tab: 'Senior 3' },
];

const generateKey = (item) => {
  let hash = 0;
  const str = String(item?.name || '') + String(item?.id || '') + String(item?.filingName || '') + String(item?.val || '');
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return 'row-' + Math.abs(hash);
};

async function migrateStageViaApi(stage) {
  console.log(`\n🔄 Fetching ${stage.label} (GID: ${stage.gid})...`);
  const spreadsheetId = getSpreadsheetId(stage.gid);

  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const targetSheet = meta.data.sheets?.find(s => String(s.properties?.sheetId) === String(stage.gid));
    const sheetTitle = targetSheet ? targetSheet.properties?.title : stage.tab;

    console.log(`Found sheet title: "${sheetTitle}"`);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetTitle}'!A:Z`,
      valueRenderOption: 'FORMATTED_VALUE',
    });

    const rawRows = res.data.values || [];
    if (rawRows.length <= 1) {
      console.log(`No rows in ${stage.label}`);
      return;
    }

    const rows = rawRows.slice(1).filter(r => r && r.some(c => String(c).trim().length > 0));
    console.log(`Found ${rows.length} rows in ${stage.label}. Mapping tasks...`);

    const taskBatch = [];
    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];
      let taskObj = {};

      if (stage.gid === '1476192399') { // Operations
        const nameVal = r[11] || 'بدون اسم';
        const teacherVal = r[10] || '';
        const filingVal = r[12] || '';
        const rawDate = r[0] || '';
        const linkBunny = r[17] || r[16] || '';

        taskObj = {
          task_key: `op-${idx}-${generateKey({ name: nameVal, id: teacherVal })}`,
          gid: stage.gid,
          stage_label: stage.label,
          name: nameVal,
          filing_name: filingVal,
          val: teacherVal,
          subject: filingVal ? (filingVal.includes('AR') ? 'عربي' : filingVal.includes('MATH') ? 'ماث' : filingVal.includes('SCI') ? 'ساينس' : filingVal.includes('SS') ? 'دراسات' : 'عام') : '',
          extra: teacherVal,
          editor: null,
          notes_editors: null,
          notes_marketing: null,
          opsheet: null,
          branch: null,
          assigned_date: rawDate,
          bunny_link: linkBunny,
          done: false,
          cancel: false,
          priority: false,
          raw: {
            teacher: teacherVal,
            date: rawDate,
            term: r[1] || '',
            year: r[2] || '',
            smartboard: r[13] || '',
            rawMinutes: r[14] || '',
            finalMinutes: r[15] || '',
            exactDuration: r[20] || '',
          }
        };
      } else if (stage.gid === '1535230545') { // Tagme3at
        const nameVal = r[1] || 'بدون اسم';
        taskObj = {
          task_key: `tgm-${idx}-${generateKey({ name: nameVal })}`,
          gid: stage.gid,
          stage_label: stage.label,
          name: nameVal,
          filing_name: '',
          val: null,
          subject: null,
          extra: r[3] || '',
          editor: r[5] || '',
          notes_marketing: r[4] || '',
          notes_editors: r[7] || '',
          opsheet: r[2] || '',
          branch: r[3] || '',
          assigned_date: '',
          bunny_link: '',
          done: String(r[6]).toUpperCase() === 'TRUE',
          cancel: false,
          priority: String(r[8]).toUpperCase() === 'TRUE',
          raw: {
            thumbnailLink: r[9] || '',
            time: r[10] || '',
            youtubeLink: r[11] || '',
            uploaded: String(r[12]).toUpperCase() === 'TRUE'
          }
        };
      } else { // Stages (J4..S3)
        const nameVal = r[2] || 'بدون اسم';
        taskObj = {
          task_key: `stg-${stage.gid}-${idx}-${generateKey({ name: nameVal })}`,
          gid: stage.gid,
          stage_label: stage.label,
          name: nameVal,
          filing_name: '',
          val: null,
          subject: r[3] || '',
          extra: r[4] || '',
          editor: null,
          notes_editors: null,
          notes_marketing: null,
          opsheet: r[5] || '',
          branch: r[4] || '',
          assigned_date: r[1] || '',
          bunny_link: '',
          done: String(r[7]).toUpperCase() === 'TRUE',
          cancel: false,
          priority: false,
          raw: {
            week: r[0] || '',
            date: r[1] || '',
            check1: String(r[6]).toUpperCase() === 'TRUE',
            check2: String(r[7]).toUpperCase() === 'TRUE',
            thumbnailLink: r[8] || '',
            time: r[9] || '',
            youtubeLink: r[10] || '',
            uploaded: String(r[11]).toUpperCase() === 'TRUE'
          }
        };
      }

      taskBatch.push(taskObj);
    }

    const BATCH_SIZE = 100;
    for (let i = 0; i < taskBatch.length; i += BATCH_SIZE) {
      const chunk = taskBatch.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('tasks')
        .upsert(chunk, { onConflict: 'task_key' });

      if (error) {
        console.error(`Error inserting batch for ${stage.label}:`, error.message);
      } else {
        console.log(`  ✓ Inserted ${chunk.length} tasks (${i + chunk.length}/${taskBatch.length})`);
      }
    }
  } catch (err) {
    console.error(`Failed to migrate ${stage.label}:`, err.message);
  }
}

async function migrateCuts() {
  console.log(`\n🔄 Migrating CUTS (GID: 0)...`);
  const spreadsheetId = getSpreadsheetId('0');
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'CUTS'!A:R`,
      valueRenderOption: 'FORMATTED_VALUE',
    });

    const rawRows = res.data.values || [];
    if (rawRows.length <= 1) return;

    const rows = rawRows.slice(1).filter(r => r && r.some(c => String(c).trim().length > 0));
    console.log(`Found ${rows.length} CUTS rows. Upserting into cuts table...`);

    const cutsBatch = rows.map((r, idx) => {
      const parsedDate = r[0] ? new Date(r[0]) : null;
      return {
        date: parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.toISOString().split('T')[0] : null,
        cut_name: r[7] || r[4] || `Cut ${idx + 1}`,
        code: r[5] || `CUT-${idx + 1}`,
        script_link: r[6] || null,
        status: String(r[14]).toUpperCase() === 'TRUE' ? 'DONE' : 'PENDING',
        editor_name: r[15] || null,
        notes: r[11] || null,
        drive_raw: r[16] || null,
        is_done: String(r[14]).toUpperCase() === 'TRUE'
      };
    }).filter(c => c.code);

    const BATCH_SIZE = 100;
    for (let i = 0; i < cutsBatch.length; i += BATCH_SIZE) {
      const chunk = cutsBatch.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('cuts').upsert(chunk, { onConflict: 'code' });
      if (error) {
        console.error('CUTS upsert error:', error.message);
      } else {
        console.log(`  ✓ Inserted ${chunk.length} cuts (${i + chunk.length}/${cutsBatch.length})`);
      }
    }
  } catch (err) {
    console.error('Failed to migrate CUTS:', err.message);
  }
}

async function main() {
  console.log('==============================================');
  console.log('🚀 Migrating Google Sheets Data to Supabase');
  console.log('==============================================');

  for (const s of stages) {
    await migrateStageViaApi(s);
  }

  await migrateCuts();

  console.log('\n==============================================');
  console.log('🎉 Migration Completed Successfully!');
  console.log('==============================================');
}

main().catch(console.error);
