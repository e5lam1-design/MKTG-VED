import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const loadEnvFile = (filename) => {
  try {
    const content = fs.readFileSync(path.join(__dirname, filename), 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = value.replace(/\\n/g, '\n');
    }
  } catch {
    // ignore
  }
};

loadEnvFile('.env.local');
loadEnvFile('.env');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://dppdaqmrrjbldcygadpi.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwcGRhcW1ycmpibGRjeWdhZHBpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzNTIyNSwiZXhwIjoyMDk0ODExMjI1fQ.EBZ2wyV48UA9h9tLM0vUrjovR8xCb8lPLIaVgI9aVwU';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Credentials parsing
let credentials = {};
try {
  const secretsPath = path.join(__dirname, 'sapient-flight-495410-s3-7ebddbbb3300.json');
  if (fs.existsSync(secretsPath)) {
    credentials = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
  }
} catch (e) {
  console.error("Credentials error:", e);
}

const formatDateToDb = (dateStr) => {
  if (!dateStr) return null;
  const clean = dateStr.trim();
  try {
    const parts = clean.split('/');
    if (parts.length === 3) {
      // MM/DD/YYYY to YYYY-MM-DD
      const m = parts[0].padStart(2, '0');
      const d = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${y}-${m}-${d}`;
    }
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch (e) {}
  return null;
};

async function syncDesigners() {
  console.log("Starting Designers Google Sheet to Supabase Sync...");
  
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1T9x6FXjjXNrdpCwsX8lnFyyXogN11T9ou0hwrQWmdB4';
  
  // GID 501319673 is the 'May  2026' tab
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetMeta = spreadsheet.data.sheets?.find(
    (s) => String(s.properties?.sheetId) === '501319673'
  );
  const sheetTitle = sheetMeta?.properties?.title || 'May  2026';
  
  console.log(`Fetching rows from tab "${sheetTitle}"...`);
  const rangeRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetTitle}!A:J`
  });
  
  const rows = rangeRes.data.values || [];
  console.log(`Fetched ${rows.length} rows from Google Sheet.`);
  if (rows.length <= 1) {
    console.log("No data rows found.");
    return;
  }

  // Fetch current database entries to avoid duplicates
  const { data: existingTasks, error: dbError } = await supabase
    .from('design_tasks')
    .select('*');

  if (dbError) {
    console.error("Failed to query existing DB tasks:", dbError);
    return;
  }

  console.log(`Found ${existingTasks.length} existing tasks in Supabase.`);

  // Create lookup set/map using reference_link, or date + designer + requester combo if reference is empty
  const makeTaskKey = (task) => {
    if (task.reference_link) return `ref:${task.reference_link.trim()}`;
    return `key:${task.assigned_date}:${task.designer_name}:${task.requested_by}:${task.notes}`;
  };

  const dbTaskKeys = new Set(existingTasks.map(makeTaskKey));
  
  let insertedCount = 0;
  let updatedCount = 0;
  let missingCompletedAtColumn = false;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // A row must have at least a date or designer or priority to be valid
    if (!row[0] && !row[1] && !row[2]) continue;

    const assigned_date = formatDateToDb(row[0]) || new Date().toISOString().split('T')[0];
    const designer_name = String(row[1] || '').trim();
    const priority = String(row[2] || '').trim();
    const requested_by = String(row[3] || '').trim();
    const design_type = String(row[4] || '').trim();
    const deadline = formatDateToDb(row[5]);
    const reference_link = String(row[6] || '').trim();
    const notes = String(row[7] || '').trim();
    const is_done = String(row[8]).toUpperCase() === 'TRUE' || row[8] === true || String(row[8]).toLowerCase() === 'true';
    const completed_at_str = formatDateToDb(row[9]);
    const completed_at = is_done ? (completed_at_str ? `${completed_at_str}T12:00:00.000Z` : new Date().toISOString()) : null;

    const sheetTask = {
      assigned_date,
      designer_name,
      priority,
      requested_by,
      design_type,
      deadline,
      reference_link,
      notes,
      is_done,
      completed_at
    };

    const taskKey = makeTaskKey(sheetTask);

    if (dbTaskKeys.has(taskKey)) {
      // Update the existing record to synchronize state, especially completion status and completion date
      const matched = existingTasks.find(t => makeTaskKey(t) === taskKey);
      if (matched && (matched.is_done !== is_done || matched.designer_name !== designer_name || matched.priority !== priority)) {
        console.log(`Updating task: ${designer_name} - ${priority} (${reference_link || 'no ref'})`);
        
        let { error: updateError } = await supabase
          .from('design_tasks')
          .update(sheetTask)
          .eq('id', matched.id);
        
        if (updateError && updateError.code === 'PGRST204') {
          missingCompletedAtColumn = true;
          // Retry without completed_at column
          const { completed_at: _, ...fallbackTask } = sheetTask;
          const { error: retryError } = await supabase
            .from('design_tasks')
            .update(fallbackTask)
            .eq('id', matched.id);
          updateError = retryError;
        }

        if (updateError) {
          console.error(`Error updating task ID ${matched.id}:`, updateError);
        } else {
          updatedCount++;
        }
      }
    } else {
      // Insert new record
      console.log(`Inserting new task: ${designer_name} - ${priority} (${reference_link || 'no ref'})`);
      
      let { error: insertError } = await supabase
        .from('design_tasks')
        .insert(sheetTask);

      if (insertError && insertError.code === 'PGRST204') {
        missingCompletedAtColumn = true;
        // Retry without completed_at column
        const { completed_at: _, ...fallbackTask } = sheetTask;
        const { error: retryError } = await supabase
          .from('design_tasks')
          .insert(fallbackTask);
        insertError = retryError;
      }

      if (insertError) {
        console.error(`Error inserting task:`, insertError);
      } else {
        insertedCount++;
      }
    }
  }

  console.log(`\n✅ Designers Sync Completed:`);
  console.log(`- Inserted: ${insertedCount} new tasks`);
  console.log(`- Updated: ${updatedCount} existing tasks`);

  if (missingCompletedAtColumn) {
    console.log("\n⚠️ NOTE: The 'completed_at' column was not found in your Supabase table schema.");
    console.log("To enable detailed average completion speed analytics, please run this query in your Supabase SQL Editor:");
    console.log("ALTER TABLE public.design_tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;");
  }
}

syncDesigners();
