// Local development proxy for the Sheets API
// Run with: node dev-proxy.js
import express from 'express';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';

const __dirname = dirname(fileURLToPath(import.meta.url));

const loadEnvFile = (filename) => {
  try {
    const content = readFileSync(join(__dirname, filename), 'utf8');
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
    // Optional local env file.
  }
};

loadEnvFile('.env');
loadEnvFile('.env.local');

// Cache and background fetching system for BunnyCDN durations
import { existsSync, writeFileSync } from 'fs';
const cachePath = join(__dirname, 'bunny_durations.json');
let bunnyCache = {};
try {
  if (existsSync(cachePath)) {
    bunnyCache = JSON.parse(readFileSync(cachePath, 'utf8'));
  }
} catch (e) {
  console.error('[Cache] Failed to load bunny_durations.json:', e);
}

const saveCache = () => {
  try {
    writeFileSync(cachePath, JSON.stringify(bunnyCache, null, 2), 'utf8');
  } catch (e) {
    console.error('[Cache] Failed to save bunny_durations.json:', e);
  }
};

const fetchQueue = new Set();
let isFetching = false;

const formatSeconds = (totalSeconds) => {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const formattedHrs = hrs > 0 ? `${hrs}:` : '';
  const formattedMins = String(mins).padStart(hrs > 0 ? 2 : 1, '0');
  const formattedSecs = String(secs).padStart(2, '0');
  return `${formattedHrs}${formattedMins}:${formattedSecs}`;
};

const processQueue = async () => {
  if (isFetching || fetchQueue.size === 0) return;
  isFetching = true;
  const nextUrl = fetchQueue.values().next().value;
  fetchQueue.delete(nextUrl);
  try {
    const res = await fetch(nextUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    const text = await res.text();
    const durationMatch = text.match(/<meta property="video:duration" content="(\d+)">/i);
    if (durationMatch) {
      const seconds = parseInt(durationMatch[1], 10);
      if (!isNaN(seconds) && seconds > 0) {
        const formatted = formatSeconds(seconds);
        bunnyCache[nextUrl] = formatted;
        console.log(`[Cache] Fetched duration for: ${nextUrl} -> ${formatted}`);
        saveCache();
      }
    } else {
      const schemaMatch = text.match(/"duration"\s*:\s*"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"/i);
      if (schemaMatch) {
        const hrs = parseInt(schemaMatch[1] || '0', 10);
        const mins = parseInt(schemaMatch[2] || '0', 10);
        const secs = parseInt(schemaMatch[3] || '0', 10);
        const totalSecs = hrs * 3600 + mins * 60 + secs;
        if (totalSecs > 0) {
          const formatted = formatSeconds(totalSecs);
          bunnyCache[nextUrl] = formatted;
          console.log(`[Cache] Fetched duration (schema) for: ${nextUrl} -> ${formatted}`);
          saveCache();
        }
      }
    }
  } catch (e) {
    console.error(`[Cache] Error fetching metadata for ${nextUrl}:`, e.message);
  }
  isFetching = false;
  setTimeout(processQueue, 300);
};

const queueFetch = (url) => {
  if (bunnyCache[url] || fetchQueue.has(url)) return;
  fetchQueue.add(url);
  processQueue();
};

const app = express();
app.use(cors());
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[Proxy] ${req.method} ${req.url}`);
  next();
});

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwcGRhcW1ycmpibGRjeWdhZHBpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzNTIyNSwiZXhwIjoyMDk0ODExMjI1fQ.EBZ2wyV48UA9h9tLM0vUrjovR8xCb8lPLIaVgI9aVwU').trim();
const supabaseAuthClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
const supabaseAdminClient = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

const allowedRoles = new Set(['admin', 'manager', 'supervisor', 'junior']);

const getRequesterProfile = async (req) => {
  if (!supabaseAuthClient || !supabaseAdminClient) {
    throw new Error('Missing Supabase server configuration. Set SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  }

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    const err = new Error('Missing authorization token');
    err.status = 401;
    throw err;
  }

  let profile = null;
  let userId = null;

  // 1. Try Supabase getUser
  try {
    const { data: userData, error: userError } = await supabaseAuthClient.auth.getUser(token);
    if (!userError && userData?.user) {
      userId = userData.user.id;
    }
  } catch (e) {
    // Ignore error
  }

  // 2. Query profile by resolved userId
  if (userId) {
    const { data: prof, error: profileError } = await supabaseAdminClient
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    console.log('UUID Lookup:', { token, error: profileError, prof }); if (!profileError && prof) {
      profile = prof;
    }
  }

  // 3. Fallback: check if the token itself is a valid user_profiles id (UUID format)
  if (!profile) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(token)) {
      const { data: prof, error: profileError } = await supabaseAdminClient
        .from('user_profiles')
        .select('*')
        .eq('id', token)
        .single();
      console.log('UUID Lookup:', { token, error: profileError, prof }); if (!profileError && prof) {
        profile = prof;
      }
    }
  }

  if (!profile) {
    const err = new Error('Invalid or expired authorization token');
    err.status = 401;
    throw err;
  }

  if (!profile.is_active) {
    const err = new Error('User profile is not active');
    err.status = 403;
    throw err;
  }

  return profile;
};

const assertCanManageTarget = (requester, targetRole, existingTarget) => {
  if (!allowedRoles.has(targetRole)) {
    const err = new Error('Invalid role');
    err.status = 400;
    throw err;
  }

  if (requester.role === 'manager') {
    if (targetRole === 'admin' || existingTarget?.role === 'admin') {
      const err = new Error('Managers cannot create or edit admin users');
      err.status = 403;
      throw err;
    }
  }
};

const handleApiError = (res, err) => {
  const status = err.status || 500;
  console.error('[Users API]', err.message);
  res.status(status).json({ error: err.message || 'Unexpected server error' });
};

app.post('/api/users', async (req, res) => {
  try {
    const requester = await getRequesterProfile(req);
    if (!['admin', 'manager'].includes(requester.role)) {
      const err = new Error('Only admin and manager users can manage users');
      err.status = 403;
      throw err;
    }
    const rawLogin = String(req.body.email || '').trim().toLowerCase();
    const name = String(req.body.name || '').trim();
    const password = String(req.body.password || '');
    const role = String(req.body.role || 'junior');
    const allowed_tabs = Array.isArray(req.body.allowed_tabs) ? req.body.allowed_tabs : [];

    if (!rawLogin || !name || password.length < 6) {
      const err = new Error('Name, login, and a 6+ character password are required');
      err.status = 400;
      throw err;
    }

    const email = rawLogin.includes('@')
      ? rawLogin
      : `${rawLogin.replace(/[^a-z0-9._-]/g, '') || 'user'}@local.user`;

    assertCanManageTarget(requester, role);

    const { data, error } = await supabaseAdminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
    });
    if (error) throw error;

    const { error: profileError } = await supabaseAdminClient
      .from('user_profiles')
      .upsert({
        id: data.user.id,
        email,
        name,
        role,
        allowed_tabs: role === 'supervisor' ? allowed_tabs : [],
        is_active: true,
        team: req.body.team || '',
      });
    if (profileError) throw profileError;

    res.status(201).json({ user: data.user });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const requester = await getRequesterProfile(req);
    if (!['admin', 'manager'].includes(requester.role)) {
      const err = new Error('Only admin and manager users can manage users');
      err.status = 403;
      throw err;
    }
    const { data, error } = await supabaseAdminClient
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ users: data || [] });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.get('/api/user-teams', async (req, res) => {
  try {
    await getRequesterProfile(req);
    const { data, error } = await supabaseAdminClient
      .from('dashboard_data')
      .select('*')
      .eq('key', 'user_teams_v1')
      .eq('field', 'teams')
      .maybeSingle();
    if (error) throw error;
    const parsed = data?.value ? JSON.parse(data.value) : {};
    res.json({ teams: parsed });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.put('/api/user-teams', async (req, res) => {
  try {
    const requester = await getRequesterProfile(req);
    if (!['admin', 'manager'].includes(requester.role)) {
      const err = new Error('Only admin and manager can update user teams');
      err.status = 403;
      throw err;
    }
    const value = JSON.stringify(req.body.teams || {});
    // Check if exists
    const { data: existing } = await supabaseAdminClient
      .from('dashboard_data')
      .select('key, field')
      .eq('key', 'user_teams_v1')
      .eq('field', 'teams')
      .maybeSingle();

    let error;
    if (existing) {
      const res = await supabaseAdminClient
        .from('dashboard_data')
        .update({ value, updated_by: requester.id })
        .eq('key', 'user_teams_v1')
        .eq('field', 'teams');
      error = res.error;
    } else {
      const res = await supabaseAdminClient
        .from('dashboard_data')
        .insert({ key: 'user_teams_v1', field: 'teams', value, updated_by: requester.id });
      error = res.error;
    }
      
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.get('/api/permissions', async (req, res) => {
  try {
    await getRequesterProfile(req);
    const { data, error } = await supabaseAdminClient
      .from('dashboard_data')
      .select('*')
      .eq('key', 'permissions_v1')
      .eq('field', 'roles')
      .maybeSingle();
    if (error) throw error;
    const parsed = data?.value ? JSON.parse(data.value) : null;
    res.json({ permissions: parsed });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.put('/api/permissions', async (req, res) => {
  try {
    const requester = await getRequesterProfile(req);
    if (requester.role !== 'admin') {
      const err = new Error('Only admin can update role permissions');
      err.status = 403;
      throw err;
    }
    const value = JSON.stringify(req.body.permissions || {});
    // Check if exists
    const { data: existing } = await supabaseAdminClient
      .from('dashboard_data')
      .select('key, field')
      .eq('key', 'permissions_v1')
      .eq('field', 'roles')
      .maybeSingle();

    let error;
    if (existing) {
      const res = await supabaseAdminClient
        .from('dashboard_data')
        .update({ value, updated_by: requester.id })
        .eq('key', 'permissions_v1')
        .eq('field', 'roles');
      error = res.error;
    } else {
      const res = await supabaseAdminClient
        .from('dashboard_data')
        .insert({ key: 'permissions_v1', field: 'roles', value, updated_by: requester.id });
      error = res.error;
    }
      
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.get('/api/task-metadata', async (req, res) => {
  try {
    await getRequesterProfile(req);
    if (!supabaseAdminClient) throw new Error('Supabase admin client not initialized');

    const { data, error } = await supabaseAdminClient
      .from('dashboard_data')
      .select('field, value')
      .eq('key', 'task_metadata');
    if (error) throw error;
    
    const metadata = {};
    if (data) {
      data.forEach(row => {
        try {
          metadata[row.field] = JSON.parse(row.value);
        } catch(e) {}
      });
    }
    res.json({ metadata });
  } catch (err) {
    handleApiError(res, err);
  }
});
// --- REELS Add Entry ---
app.post('/api/reels/add', async (req, res) => {
  try {
    const rowData = req.body.rowData;
    const gid = req.body.gid || '1436746012'; // Default to Shooting sheet GID
    if (!rowData || !Array.isArray(rowData)) return res.status(400).json({ error: 'Missing or invalid rowData' });

    console.log(`[API] POST /api/reels/add called for GID ${gid}. Code: ${rowData[5]}`);

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1GYrPRyPda-w1fGCxFOkieSHT7X5kK5TbikQZuZ-oe1k';

    // 1. Save to Google Sheets (Cuts sheet has A:R range, Shooting has A:O range)
    const range = gid === '0' ? 'Cuts!A:R' : 'Shooting!A:O';
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowData]
      }
    });

    // 2. Save to Supabase 'shooting' table ONLY if not Cuts sheet (cuts sheet has no DB table)
    if (gid !== '0' && supabaseAdminClient) {
      try {
        const parseDate = (dStr) => {
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
          is_canceled: false
        };

        console.log(`[API] Inserting row into Supabase 'shooting' table:`, dbItem);
        const { error: insertError } = await supabaseAdminClient
          .from('shooting')
          .insert(dbItem);

        if (insertError) {
          console.error('[API] Failed to insert row into Supabase:', insertError);
        } else {
          console.log('[API] Successfully inserted row into Supabase shooting table');
        }
      } catch (subErr) {
        console.error('[API] Supabase reels insert exception:', subErr);
      }
    }

    res.json({ success: true, message: 'Row added successfully' });
  } catch (err) {
    handleApiError(res, err);
  }
});


// --- REELS Filmed Checkmark Integration ---
app.put('/api/reels/filmed', async (req, res) => {
  try {
    const { code, filmed } = req.body;
    if (!code) return res.status(400).json({ error: 'Missing code' });

    console.log(`[API] PUT /api/reels/filmed optimized background call. code: ${code}, filmed: ${filmed}`);

    // RESPOND IMMEDIATELY TO ELIMINATE UI LAG!
    res.json({ success: true, message: 'Filmed status update queued in the background' });

    // Execute sheets and supabase operations in the background
    (async () => {
      try {
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: credentials.client_email,
            private_key: credentials.private_key,
          },
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = '1GYrPRyPda-w1fGCxFOkieSHT7X5kK5TbikQZuZ-oe1k';

        // 1. Fetch only Column F (ID) of both sheets in parallel
        const [shootingColRes, veColRes] = await Promise.all([
          sheets.spreadsheets.values.get({ spreadsheetId, range: 'Shooting!F:F' }),
          sheets.spreadsheets.values.get({ spreadsheetId, range: 'Ve!F:F' })
        ]);

        const shootingIds = (shootingColRes.data.values || []).map(r => r[0] || '');
        const veIds = (veColRes.data.values || []).map(r => r[0] || '');

        // Find row index (row number is index + 1)
        const shootingRowIndex = shootingIds.indexOf(code);
        const veRowIndex = veIds.indexOf(code);

        if (shootingRowIndex === -1) {
          console.error(`[API Background] Code not found in Shooting sheet: ${code}`);
          return;
        }

        const updates = [];

        // 2. Queue the update for Shooting J column (filmed checkbox)
        updates.push(
          sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Shooting!J${shootingRowIndex + 1}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[filmed ? true : false]] },
          })
        );

        let fullRowData = [];

        if (filmed) {
          // If filmed is true and not in VE, append it
          if (veRowIndex === -1) {
            // Fetch the full row from Shooting to copy
            const fullRowRes = await sheets.spreadsheets.values.get({
              spreadsheetId,
              range: `Shooting!A${shootingRowIndex + 1}:O${shootingRowIndex + 1}`
            });
            const rowData = fullRowRes.data.values ? [...fullRowRes.data.values[0]] : [];
            while (rowData.length < 15) rowData.push('');
            rowData[9] = 'TRUE'; // Filmed
            fullRowData = [...rowData];

            // Find last data row in VE to append after it
            let lastDataRowIndex = veIds.length;
            while (lastDataRowIndex > 0 && (!veIds[lastDataRowIndex - 1] || veIds[lastDataRowIndex - 1].trim() === '')) {
              lastDataRowIndex--;
            }
            const insertRow = lastDataRowIndex + 2; // Append after header/data

            // Queue VE insert and formatting clear
            updates.push(
              sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `Ve!A${insertRow}:O${insertRow}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [rowData] }
              }).then(() => {
                return sheets.spreadsheets.batchUpdate({
                  spreadsheetId,
                  requestBody: {
                    requests: [{
                      repeatCell: {
                        range: {
                          sheetId: 1939073164,
                          startRowIndex: insertRow - 1,
                          endRowIndex: insertRow,
                          startColumnIndex: 0,
                          endColumnIndex: 15
                        },
                        cell: { userEnteredFormat: { backgroundColor: {} } },
                        fields: 'userEnteredFormat.backgroundColor'
                      }
                    }]
                  }
                });
              })
            );
          }
        } else {
          // If filmed is false and exists in VE, delete it
          if (veRowIndex !== -1) {
            updates.push(
              sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                  requests: [{
                    deleteDimension: {
                      range: {
                        sheetId: 1939073164,
                        dimension: 'ROWS',
                        startIndex: veRowIndex,
                        endIndex: veRowIndex + 1
                      }
                    }
                  }]
                }
              })
            );
          }
        }

        // Execute all updates in parallel!
        await Promise.all(updates);
        console.log(`[API Background] Google Sheets filmed toggle completed for code: ${code}`);

        // 3. Supabase Integration
        if (supabaseAdminClient) {
          try {
            const parseDate = (dStr) => {
              if (!dStr) return null;
              const d = new Date(dStr);
              return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
            };

            // Get or Create shooting row in Supabase
            const { data: shootingRows, error: findError } = await supabaseAdminClient
              .from('shooting')
              .select('id')
              .eq('code', code)
              .maybeSingle();

            let shootingId = shootingRows?.id;

            if (findError) {
              console.error('[Supabase Background] Error finding shooting row:', findError);
            }

            // If not in shooting table, we should first insert it or find the sheet data to insert
            if (!shootingId) {
              // Fetch full row from shooting sheet
              const fullRowRes = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `Shooting!A${shootingRowIndex + 1}:O${shootingRowIndex + 1}`
              });
              const rowData = fullRowRes.data.values ? [...fullRowRes.data.values[0]] : [];
              while (rowData.length < 15) rowData.push('');
              rowData[9] = filmed ? 'TRUE' : 'FALSE';

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
                is_filmed: filmed,
                filming_date: filmed ? new Date().toISOString().split('T')[0] : null,
                filmed_by: rowData[11] || null,
                storage: rowData[12] || null,
                notes: rowData[13] || null,
                drive_raw: rowData[14] || null,
                drive_final: rowData[17] || null,
                is_canceled: false
              };

              const { data: newShooting, error: insError } = await supabaseAdminClient
                .from('shooting')
                .insert(dbItem)
                .select('id')
                .single();

              if (insError) {
                console.error('[Supabase Background] Error inserting missing shooting row:', insError);
              } else {
                shootingId = newShooting.id;
              }
            } else {
              // Just update is_filmed status
              await supabaseAdminClient
                .from('shooting')
                .update({
                  is_filmed: filmed,
                  filming_date: filmed ? new Date().toISOString().split('T')[0] : null
                })
                .eq('id', shootingId);
            }

            if (filmed) {
              // Add to VE table
              if (fullRowData.length === 0) {
                const fullRowRes = await sheets.spreadsheets.values.get({
                  spreadsheetId,
                  range: `Shooting!A${shootingRowIndex + 1}:O${shootingRowIndex + 1}`
                });
                fullRowData = fullRowRes.data.values ? [...fullRowRes.data.values[0]] : [];
                while (fullRowData.length < 15) fullRowData.push('');
                fullRowData[9] = 'TRUE';
              }

              const veItem = {
                shooting_id: shootingId,
                date: parseDate(fullRowData[0]) || new Date().toISOString().split('T')[0],
                branch: fullRowData[1] || null,
                year: fullRowData[2] || null,
                teacher: fullRowData[3] || null,
                column_5: fullRowData[4] || null,
                code: fullRowData[5] || null,
                script_link: fullRowData[6] || null,
                type: fullRowData[7] || null,
                format: fullRowData[8] || null,
                is_filmed: true,
                filming_date: parseDate(fullRowData[10]) || new Date().toISOString().split('T')[0],
                filmed_by: fullRowData[11] || null,
                storage: fullRowData[12] || null,
                notes: fullRowData[13] || null,
                drive_raw: fullRowData[14] || null,
                drive_final: fullRowData[17] || null,
                is_canceled: false,
                editor_name: fullRowData[15] || null,
                is_done: fullRowData[16] === 'TRUE' || fullRowData[16] === true || String(fullRowData[16]).toLowerCase() === 'true'
              };

              const { error: veInsError } = await supabaseAdminClient
                .from('ve')
                .upsert(veItem, { onConflict: 'code' });

              if (veInsError) {
                console.error('[Supabase Background] Error upserting VE row:', veInsError);
              }
            } else {
              // Delete from VE table
              const { error: veDelError } = await supabaseAdminClient
                .from('ve')
                .delete()
                .eq('code', code);

              if (veDelError) {
                console.error('[Supabase Background] Error deleting VE row:', veDelError);
              }
            }
            console.log(`[Supabase Background] Filmed toggle sync completed successfully for code: ${code}`);
          } catch (subErr) {
            console.error('[Supabase Background] Reels filmed sync exception:', subErr);
          }
        }
      } catch (bgErr) {
        console.error('[API Background] Error in filmed background toggle:', bgErr.message);
      }
    })();

  } catch (err) {
    handleApiError(res, err);
  }
});

// Queue for debouncing reels updates to prevent Google Sheets lag and quota exhaustion
const reelsUpdateQueue = new Map();

// --- REELS Update Row ---
app.put('/api/reels/update', async (req, res) => {
  try {
    const { oldCode, rowData } = req.body;
    console.log(`[API] PUT /api/reels/update req.body: oldCode="${oldCode}", rowData length=${rowData ? rowData.length : 'null'}, isArray=${Array.isArray(rowData)}`);
    if (!oldCode || !rowData || !Array.isArray(rowData)) {
      console.error(`[API] PUT /api/reels/update validation failed! oldCode="${oldCode}", rowData="${JSON.stringify(rowData)}"`);
      return res.status(400).json({ error: 'Missing oldCode or invalid rowData' });
    }

    console.log(`[API] PUT /api/reels/update called. Queuing update for oldCode: ${oldCode}`);

    // Respond immediately to the frontend to eliminate any UI lag!
    res.json({ success: true, message: 'Update queued in the background' });

    // Cancel any pending update for this specific row code
    if (reelsUpdateQueue.has(oldCode)) {
      clearTimeout(reelsUpdateQueue.get(oldCode).timeout);
      reelsUpdateQueue.delete(oldCode);
    }

    // Debounce the update: Wait 3 seconds of inactivity before sending to Google Sheets and Supabase
    const timeout = setTimeout(async () => {
      reelsUpdateQueue.delete(oldCode);
      console.log(`[API Background] Processing debounced update for oldCode: ${oldCode}`);
      
      try {
        const auth = new google.auth.GoogleAuth({
          credentials: { client_email: credentials.client_email, private_key: credentials.private_key },
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = '1GYrPRyPda-w1fGCxFOkieSHT7X5kK5TbikQZuZ-oe1k';

        // Fetch sheets data in parallel (with correct range widths)
        const [shootingRes, veRes, counterRes, cutsRes] = await Promise.all([
          sheets.spreadsheets.values.get({ spreadsheetId, range: 'Shooting!A:P' }),
          sheets.spreadsheets.values.get({ spreadsheetId, range: 'Ve!A:T' }),
          sheets.spreadsheets.values.get({ spreadsheetId, range: 'Counter!A:P' }),
          sheets.spreadsheets.values.get({ spreadsheetId, range: 'Cuts!A:R' })
        ]);

        const shootingRows = shootingRes.data.values || [];
        let shootingRowIndex = shootingRows.findIndex(r => r[5] === oldCode);

        const veRows = veRes.data.values || [];
        let veRowIndex = veRows.findIndex(r => r[5] === oldCode);

        const counterRows = counterRes.data.values || [];
        let counterRowIndex = counterRows.findIndex(r => r[5] === oldCode);

        const cutsRows = cutsRes.data.values || [];
        let cutsRowIndex = cutsRows.findIndex(r => r[5] === oldCode);

        const sheetUpdates = [];

        if (shootingRowIndex !== -1) {
          // Construct shooting specific array (16 columns: A to P)
          const shootingRowData = [
            rowData[0] || '',  // Date
            rowData[1] || '',  // Branch
            rowData[2] || '',  // Year
            rowData[3] || '',  // Teacher
            rowData[4] || '',  // Column 5
            rowData[5] || '',  // Code
            rowData[6] || '',  // Script
            rowData[7] || '',  // Type
            rowData[8] || '',  // Format
            rowData[9] || '',  // Filmed
            rowData[10] || '', // Filming Date
            rowData[11] || '', // By
            rowData[12] || '', // Storage
            rowData[13] || '', // Notes
            rowData[14] || '', // Drive Raw
            rowData[17] || ''  // Drive Final (Column P / index 15)
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
          // VE has 20 columns: A to T
          const veRowData = [
            rowData[0] || '',  // Date
            rowData[1] || '',  // Branch
            rowData[2] || '',  // Year
            rowData[3] || '',  // Teacher
            rowData[4] || '',  // Column 5
            rowData[5] || '',  // Code
            rowData[6] || '',  // Script
            rowData[7] || '',  // Type
            rowData[8] || '',  // Format
            rowData[9] || '',  // Filmed
            rowData[10] || '', // Filming Date
            rowData[11] || '', // By
            rowData[12] || '', // Storage
            rowData[13] || '', // Notes
            rowData[14] || '', // Drive Raw
            rowData[15] || '', // Editor
            rowData[16] || '', // Done
            rowData[17] || '', // Drive Final
            rowData[18] || '', // Canceled
            rowData[19] || ''  // Missing Details
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
          // Counter has 16 columns: A to P
          const counterRowData = [
            rowData[0] || '',  // Date
            rowData[1] || '',  // Branch
            rowData[2] || '',  // Year
            rowData[3] || '',  // Teacher
            rowData[4] || '',  // Column 5
            rowData[5] || '',  // Code
            rowData[6] || '',  // Script
            rowData[7] || '',  // Type
            rowData[8] || '',  // Format
            rowData[9] || '',  // Filmed
            rowData[10] || '', // Filming Date
            rowData[11] || '', // By
            rowData[12] || '', // Storage
            rowData[13] || '', // Notes
            rowData[14] || '', // Drive Raw
            rowData[17] || ''  // Drive Final (Column P)
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
          // Cuts has 18 columns: A to R
          const cutsRowData = [
            rowData[0] || '',   // Date
            rowData[1] || '',   // Branch
            rowData[2] || '',   // Year
            rowData[3] || '',   // TypeCol (CUT)
            rowData[4] || '',   // Creator
            rowData[5] || '',   // Code
            rowData[6] || '',   // Data Files
            rowData[7] || '',   // Script
            rowData[8] || '',   // Type
            rowData[9] || '',   // Format
            rowData[10] || '',  // Creator Notes
            rowData[11] || '',  // Editor Notes
            rowData[12] || '',  // Missing Details
            rowData[13] || '',  // Problem
            rowData[14] || '',  // Done
            rowData[15] || '',  // Editor
            rowData[16] || '',  // Drive Final
            rowData[17] || ''   // Canceled
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
          console.log(`[API Background] Google Sheets updated successfully for code: ${oldCode}`);
        }

        // Supabase update in the background
        if (supabaseAdminClient) {
          const parseDate = (dStr) => {
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

          const { data: updatedShooting, error: shootingUpdateError } = await supabaseAdminClient
            .from('shooting')
            .update(dbItem)
            .eq('code', oldCode)
            .select('id')
            .maybeSingle();

          if (shootingUpdateError) {
            console.error('[Supabase Background] Error updating shooting table:', shootingUpdateError);
          }

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

            const { error: veUpdateError } = await supabaseAdminClient
              .from('ve')
              .update(veItem)
              .eq('code', oldCode);

            if (veUpdateError) {
              console.error('[Supabase Background] Error updating ve table:', veUpdateError);
            }
          }
          console.log(`[Supabase Background] Update completed successfully for code: ${oldCode}`);
        }
      } catch (bgErr) {
        console.error('[API Background] Error in debounced background update:', bgErr.message);
      }
    }, 3000);

    reelsUpdateQueue.set(oldCode, { timeout, rowData });

  } catch (err) {
    handleApiError(res, err);
  }
});

// --- REELS Batch Update Rows (Optimized for drag-to-fill) ---
app.put('/api/reels/update-batch', async (req, res) => {
  try {
    const { updates } = req.body;
    console.log(`[API] PUT /api/reels/update-batch received ${updates ? updates.length : 0} updates`);
    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ error: 'Missing updates array' });
    }

    // Respond immediately to eliminate frontend UI waiting
    res.json({ success: true, message: `Queued batch of ${updates.length} updates in the background` });

    // Execute in the background to prevent network/CPU blocking
    (async () => {
      console.log(`[API Background] Starting batch update for ${updates.length} rows`);
      try {
        const auth = new google.auth.GoogleAuth({
          credentials: { client_email: credentials.client_email, private_key: credentials.private_key },
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = '1GYrPRyPda-w1fGCxFOkieSHT7X5kK5TbikQZuZ-oe1k';

        // Fetch sheets data once
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

        // Build O(1) lookup maps
        const shootingCodeToIdx = new Map();
        shootingRows.forEach((r, idx) => { if (r[5]) shootingCodeToIdx.set(r[5], idx); });

        const veCodeToIdx = new Map();
        veRows.forEach((r, idx) => { if (r[5]) veCodeToIdx.set(r[5], idx); });

        const counterCodeToIdx = new Map();
        counterRows.forEach((r, idx) => { if (r[5]) counterCodeToIdx.set(r[5], idx); });

        const cutsCodeToIdx = new Map();
        cutsRows.forEach((r, idx) => { if (r[5]) cutsCodeToIdx.set(r[5], idx); });

        const batchData = [];
        const supabaseUpdates = [];

        for (const update of updates) {
          const { oldCode, rowData } = update;
          if (!oldCode || !rowData || !Array.isArray(rowData)) continue;

          const shootingRowIndex = shootingCodeToIdx.get(oldCode);
          const veRowIndex = veCodeToIdx.get(oldCode);
          const counterRowIndex = counterCodeToIdx.get(oldCode);
          const cutsRowIndex = cutsCodeToIdx.get(oldCode);

          if (shootingRowIndex !== undefined) {
            const shootingRowData = [
              rowData[0] || '',  // Date
              rowData[1] || '',  // Branch
              rowData[2] || '',  // Year
              rowData[3] || '',  // Teacher
              rowData[4] || '',  // Column 5
              rowData[5] || '',  // Code
              rowData[6] || '',  // Script
              rowData[7] || '',  // Type
              rowData[8] || '',  // Format
              rowData[9] || '',  // Filmed
              rowData[10] || '', // Filming Date
              rowData[11] || '', // By
              rowData[12] || '', // Storage
              rowData[13] || '', // Notes
              rowData[14] || '', // Drive Raw
              rowData[17] || ''  // Drive Final (Column P)
            ];
            batchData.push({
              range: `Shooting!A${shootingRowIndex + 1}:P${shootingRowIndex + 1}`,
              values: [shootingRowData]
            });
          }

          if (veRowIndex !== undefined) {
            const veRowData = [
              rowData[0] || '',  // Date
              rowData[1] || '',  // Branch
              rowData[2] || '',  // Year
              rowData[3] || '',  // Teacher
              rowData[4] || '',  // Column 5
              rowData[5] || '',  // Code
              rowData[6] || '',  // Script
              rowData[7] || '',  // Type
              rowData[8] || '',  // Format
              rowData[9] || '',  // Filmed
              rowData[10] || '', // Filming Date
              rowData[11] || '', // By
              rowData[12] || '', // Storage
              rowData[13] || '', // Notes
              rowData[14] || '', // Drive Raw
              rowData[15] || '', // Editor
              rowData[16] || '', // Done
              rowData[17] || '', // Drive Final
              rowData[18] || '', // Canceled
              rowData[19] || ''  // Missing Details
            ];
            batchData.push({
              range: `Ve!A${veRowIndex + 1}:T${veRowIndex + 1}`,
              values: [veRowData]
            });
          }

          if (counterRowIndex !== undefined) {
            const counterRowData = [
              rowData[0] || '',  // Date
              rowData[1] || '',  // Branch
              rowData[2] || '',  // Year
              rowData[3] || '',  // Teacher
              rowData[4] || '',  // Column 5
              rowData[5] || '',  // Code
              rowData[6] || '',  // Script
              rowData[7] || '',  // Type
              rowData[8] || '',  // Format
              rowData[9] || '',  // Filmed
              rowData[10] || '', // Filming Date
              rowData[11] || '', // By
              rowData[12] || '', // Storage
              rowData[13] || '', // Notes
              rowData[14] || '', // Drive Raw
              rowData[17] || ''  // Drive Final
            ];
            batchData.push({
              range: `Counter!A${counterRowIndex + 1}:P${counterRowIndex + 1}`,
              values: [counterRowData]
            });
          }

          if (cutsRowIndex !== undefined) {
            const cutsRowData = [
              rowData[0] || '',   // Date
              rowData[1] || '',   // Branch
              rowData[2] || '',   // Year
              rowData[3] || '',   // TypeCol (CUT)
              rowData[4] || '',   // Creator
              rowData[5] || '',   // Code
              rowData[6] || '',   // Data Files
              rowData[7] || '',   // Script
              rowData[8] || '',   // Type
              rowData[9] || '',   // Format
              rowData[10] || '',  // Creator Notes
              rowData[11] || '',  // Editor Notes
              rowData[12] || '',  // Missing Details
              rowData[13] || '',  // Problem
              rowData[14] || '',  // Done
              rowData[15] || '',  // Editor
              rowData[16] || '',  // Drive Final
              rowData[17] || ''   // Canceled
            ];
            batchData.push({
              range: `Cuts!A${cutsRowIndex + 1}:R${cutsRowIndex + 1}`,
              values: [cutsRowData]
            });
          }

          // Build Supabase batch items
          if (supabaseAdminClient) {
            const parseDate = (dStr) => {
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

            supabaseUpdates.push((async () => {
              try {
                const { data: updatedShooting, error: shootingUpdateError } = await supabaseAdminClient
                  .from('shooting')
                  .update(dbItem)
                  .eq('code', oldCode)
                  .select('id')
                  .maybeSingle();

                if (shootingUpdateError) {
                  console.error(`[Supabase Batch] Error updating shooting for code ${oldCode}:`, shootingUpdateError);
                  return;
                }

                const shootingId = updatedShooting?.id;
                if (veRowIndex !== undefined && shootingId) {
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

                  const { error: veUpdateError } = await supabaseAdminClient
                    .from('ve')
                    .update(veItem)
                    .eq('code', oldCode);

                  if (veUpdateError) {
                    console.error(`[Supabase Batch] Error updating ve for code ${oldCode}:`, veUpdateError);
                  }
                }
              } catch (sErr) {
                console.error(`[Supabase Batch] Exception for code ${oldCode}:`, sErr.message);
              }
            })());
          }
        }

        // Apply Google Sheets updates in one single BatchUpdate request!
        if (batchData.length > 0) {
          console.log(`[API Background] Sending batchUpdate to Google Sheets with ${batchData.length} ranges`);
          await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            requestBody: {
              valueInputOption: 'USER_ENTERED',
              data: batchData
            }
          });
          console.log(`[API Background] Google Sheets batchUpdate completed successfully!`);
        }

        // Apply all Supabase updates in parallel
        if (supabaseUpdates.length > 0) {
          console.log(`[API Background] Executing ${supabaseUpdates.length} Supabase updates in parallel`);
          await Promise.all(supabaseUpdates);
          console.log(`[API Background] Supabase batch updates completed successfully!`);
        }

      } catch (bgErr) {
        console.error('[API Background] Error in background batch update:', bgErr.message);
      }
    })();
  } catch (err) {
    handleApiError(res, err);
  }
});

// --- Tagme3at Endpoints ---
app.get('/api/tagme3at', async (req, res) => {
  try {
    if (!supabaseAdminClient) throw new Error('Supabase admin client not initialized');
    const { data, error } = await supabaseAdminClient.from('tagme3at_items').select('*');
    if (error) throw error;
    res.json({ items: data || [] });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/tagme3at', async (req, res) => {
  try {
    console.log('[API] POST /api/tagme3at called with body:', req.body);
    if (!supabaseAdminClient) throw new Error('Supabase admin client not initialized');
    const item = req.body;
    // Map camelCase from frontend to snake_case in db
    const dbItem = {
      unique_key: item.uniqueKey,
      name: item.name,
      filing_name: item.filingName,
      op_sheet: item.opSheet,
      branch: item.branch,
      date: item.date,
      notes_marketing: item.notesMarketing,
      editor: item.editor,
      notes_editors: item.notesEditors,
      done: item.done || false,
      priority: item.priority || false,
      cancel: item.cancel || false,
      is_transfer: item.isTagmeTransfer !== false,
      thumbnail_link: item.thumbnailLink || '',
      time: item.time || '',
      youtube_link: item.youtubeLink || '',
      uploaded: item.uploaded || false
    };
    
    const { data, error } = await supabaseAdminClient
      .from('tagme3at_items')
      .upsert(dbItem, { onConflict: 'unique_key' })
      .select();
      
    if (error) throw error;
    res.json({ success: true, item: data[0] });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.put('/api/tagme3at/:key', async (req, res) => {
  try {
    console.log(`[API] PUT /api/tagme3at/${req.params.key} called with body:`, req.body);
    if (!supabaseAdminClient) throw new Error('Supabase admin client not initialized');
    const updates = req.body;
    const dbUpdates = {};
    if (updates.notesMarketing !== undefined) dbUpdates.notes_marketing = updates.notesMarketing;
    if (updates.notesEditors !== undefined) dbUpdates.notes_editors = updates.notesEditors;
    if (updates.editor !== undefined) dbUpdates.editor = updates.editor;
    if (updates.done !== undefined) dbUpdates.done = updates.done;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.cancel !== undefined) dbUpdates.cancel = updates.cancel;
    if (updates.thumbnailLink !== undefined) dbUpdates.thumbnail_link = updates.thumbnailLink;
    if (updates.time !== undefined) dbUpdates.time = updates.time;
    if (updates.youtubeLink !== undefined) dbUpdates.youtube_link = updates.youtubeLink;
    if (updates.uploaded !== undefined) dbUpdates.uploaded = updates.uploaded;

    const { data, error } = await supabaseAdminClient
      .from('tagme3at_items')
      .update(dbUpdates)
      .eq('unique_key', req.params.key)
      .select();

    if (error) throw error;
    res.json({ success: true, item: data?.[0] });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.delete('/api/tagme3at/:key', async (req, res) => {
  try {
    console.log(`[API] DELETE /api/tagme3at/${req.params.key} called`);
    if (!supabaseAdminClient) throw new Error('Supabase admin client not initialized');
    const { error } = await supabaseAdminClient
      .from('tagme3at_items')
      .delete()
      .eq('unique_key', req.params.key);
      
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    handleApiError(res, err);
  }
});
// --------------------------

app.put('/api/task-metadata', async (req, res) => {
  try {
    const requester = await getRequesterProfile(req);
    if (!supabaseAdminClient) throw new Error('Supabase admin client not initialized');

    const { field, metadata } = req.body;
    if (!field) {
      const err = new Error('field is required');
      err.status = 400;
      throw err;
    }
    
    const value = JSON.stringify(metadata || {});
    
    const { error } = await supabaseAdminClient
      .from('dashboard_data')
      .upsert(
        { key: 'task_metadata', field, value, updated_by: requester.id },
        { onConflict: 'key,field' }
      );
      
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/resolve-login', async (req, res) => {
  try {
    const raw = String(req.body.identifier || '').trim().toLowerCase();
    if (!raw) return res.status(400).json({ error: 'Missing identifier' });

    const { data, error } = await supabaseAdminClient
      .from('user_profiles')
      .select('email,name')
      .or(`name.ilike.%${raw}%,email.ilike.${raw}@local.user,email.ilike.${raw}%`)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data?.email) return res.status(404).json({ error: 'User not found' });

    return res.json({ email: String(data.email).toLowerCase(), name: data.name || null });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.patch('/api/users/:id', async (req, res) => {
  try {
    const requester = await getRequesterProfile(req);
    if (!['admin', 'manager'].includes(requester.role)) {
      const err = new Error('Only admin and manager users can manage users');
      err.status = 403;
      throw err;
    }
    const targetId = String(req.params.id || '');
    const { data: target, error: targetError } = await supabaseAdminClient
      .from('user_profiles')
      .select('*')
      .eq('id', targetId)
      .single();
    if (targetError || !target) {
      const err = new Error('Target user was not found');
      err.status = 404;
      throw err;
    }

    const updates = {};
    if (typeof req.body.name === 'string') updates.name = req.body.name.trim();
    if (typeof req.body.email === 'string') updates.email = req.body.email.trim().toLowerCase();
    if (typeof req.body.is_active === 'boolean') updates.is_active = req.body.is_active;
    if (Array.isArray(req.body.allowed_tabs)) updates.allowed_tabs = req.body.allowed_tabs;
    if (typeof req.body.role === 'string') updates.role = req.body.role;
    if (typeof req.body.team === 'string') updates.team = req.body.team;

    const nextRole = updates.role || target.role;
    assertCanManageTarget(requester, nextRole, target);
    if (updates.role && updates.role !== 'supervisor') updates.allowed_tabs = [];

    const { data, error } = await supabaseAdminClient
      .from('user_profiles')
      .update(updates)
      .eq('id', targetId)
      .select()
      .single();
    if (error) throw error;

    res.json({ user: data });
  } catch (err) {
    handleApiError(res, err);
  }
});

const getSpreadsheetId = (gid) => {
  const g = String(gid || '');
  const reelsGids = ['1436746012', '1939073164', '0', '798246690'];
  if (reelsGids.includes(g)) {
    return '1GYrPRyPda-w1fGCxFOkieSHT7X5kK5TbikQZuZ-oe1k';
  }
  if (g === '1476192399' || g === '2086331904') {
    return '1Hm7noXxv8ITMU3dNXQmqFEzfZY1mZlBJ4bQ9_ZIR0-M';
  }
  if (g === '501319673') {
    return '1T9x6FXjjXNrdpCwsX8lnFyyXogN11T9ou0hwrQWmdB4';
  }
  return '1lh0-kh9MlT4AZCi3-QBn0fkkiNpMcpg6qcoDfBeNK8g';
};

// Load credentials from JSON file directly (local dev only)
const keyFile = join(__dirname, 'sapient-flight-495410-s3-7ebddbbb3300.json');
const credentials = JSON.parse(readFileSync(keyFile, 'utf-8'));

app.get('/api/drive-preview', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).send('Missing id');
  
  try {
    const googleUrl = `https://drive.google.com/thumbnail?id=${id}&sz=w200`;
    const response = await fetch(googleUrl);
    if (!response.ok) {
      const fallbackUrl = `https://lh3.googleusercontent.com/d/${id}=w200`;
      const fallbackResponse = await fetch(fallbackUrl);
      if (!fallbackResponse.ok) {
        throw new Error('Failed to fetch thumbnail from Google');
      }
      
      const buffer = await fallbackResponse.arrayBuffer();
      res.setHeader('Content-Type', fallbackResponse.headers.get('content-type') || 'image/jpeg');
      return res.send(Buffer.from(buffer));
    }
    
    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[Preview Proxy] Error:', err.message);
    res.status(500).send('Error generating preview');
  }
});

app.get('/api/duration', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url' });
  const strUrl = String(url);
  if (bunnyCache[strUrl]) {
    return res.json({ duration: bunnyCache[strUrl] });
  }
  try {
    const response = await fetch(strUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    const text = await response.text();
    const durationMatch = text.match(/<meta property="video:duration" content="(\d+)">/i);
    if (durationMatch) {
      const seconds = parseInt(durationMatch[1], 10);
      if (!isNaN(seconds) && seconds > 0) {
        const formatted = formatSeconds(seconds);
        bunnyCache[strUrl] = formatted;
        console.log(`[API] On-demand fetched: ${strUrl} -> ${formatted}`);
        saveCache();
        return res.json({ duration: formatted });
      }
    }
    const schemaMatch = text.match(/"duration"\s*:\s*"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"/i);
    if (schemaMatch) {
      const hrs = parseInt(schemaMatch[1] || '0', 10);
      const mins = parseInt(schemaMatch[2] || '0', 10);
      const secs = parseInt(schemaMatch[3] || '0', 10);
      const totalSecs = hrs * 3600 + mins * 60 + secs;
      if (totalSecs > 0) {
        const formatted = formatSeconds(totalSecs);
        bunnyCache[strUrl] = formatted;
        console.log(`[API] On-demand fetched (schema): ${strUrl} -> ${formatted}`);
        saveCache();
        return res.json({ duration: formatted });
      }
    }
    return res.json({ duration: '' });
  } catch (e) {
    console.error(`[API] Error on-demand duration for ${strUrl}:`, e.message);
    return res.status(500).json({ error: e.message });
  }
});

const parseCsv = (text) => {
  const rows = [];
  let currentRow = [];
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

const sheetCacheMap = new Map();
const CACHE_DURATION_MS = 15000; // 15 seconds cache

app.get('/api/sheet', async (req, res) => {
  const { gid } = req.query;
  console.log(`[API] Requested GID: ${gid}`);
  if (!gid) {
    return res.status(400).json({ error: 'Missing GID parameter' });
  }

  // Check cache
  const cached = sheetCacheMap.get(String(gid));
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION_MS)) {
    console.log(`[Cache] Serving sheet GID ${gid} from cache`);
    return res.json(cached.data);
  }

  try {
    let finalRows = [];
    let finalSheetName = '';

    const strGid = String(gid);
    const reelsGids = ['1436746012', '1939073164', '0', '798246690'];
    const isServiceAccountSheet = (strGid === '1476192399' || strGid === '2086331904' || strGid === '501319673' || reelsGids.includes(strGid));

    if (isServiceAccountSheet) {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: credentials.client_email,
          private_key: credentials.private_key,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      console.log('[API] Auth initialized');

      const sheets = google.sheets({ version: 'v4', auth });
      const targetSpreadsheetId = getSpreadsheetId(gid);

      console.log('[API] Fetching spreadsheet metadata...');
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: targetSpreadsheetId });
      console.log('[API] Fetched metadata successfully');
      
      const sheetMeta = spreadsheet.data.sheets?.find(
        (s) => String(s.properties?.sheetId) === String(gid)
      );

      if (!sheetMeta?.properties?.title) {
        console.log(`[API] Error: Sheet GID ${gid} not found`);
        return res.status(404).json({ error: `Sheet GID ${gid} not found` });
      }

      finalSheetName = sheetMeta.properties.title;
      console.log(`[API] Fetching values for range: ${finalSheetName}`);
      const strGid = String(gid);
      if (['1436746012', '1939073164', '798246690'].includes(strGid)) {
        console.log(`[API] Reels sheet detected. Fetching full grid data with hyperlinks for GID ${strGid}`);
        const response = await sheets.spreadsheets.get({
          spreadsheetId: targetSpreadsheetId,
          ranges: [finalSheetName],
          includeGridData: true,
        });
        const sheet = response.data.sheets[0];
        const rowData = sheet.data[0].rowData || [];
        finalRows = rowData.map(r => {
          const cells = r.values || [];
          return cells.map(c => {
            // 1. Check for formula hyperlinks
            if (c.userEnteredValue && c.userEnteredValue.formulaValue && c.userEnteredValue.formulaValue.toUpperCase().startsWith('=HYPERLINK')) {
              return c.userEnteredValue.formulaValue;
            }
            // 2. Check for cell-level hyperlinks
            if (c.hyperlink) {
              return `=HYPERLINK("${c.hyperlink}", "${c.formattedValue || ''}")`;
            }
            // 3. Check for rich text format runs hyperlinks
            if (c.textFormatRuns) {
              const runWithLink = c.textFormatRuns.find(run => run.format && run.format.link && run.format.link.uri);
              if (runWithLink) {
                return `=HYPERLINK("${runWithLink.format.link.uri}", "${c.formattedValue || ''}")`;
              }
            }
            // 4. Check for Google Sheets smart chips (chipRuns)
            if (c.chipRuns) {
              const runWithChip = c.chipRuns.find(run => run.chip && run.chip.richLinkProperties && run.chip.richLinkProperties.uri);
              if (runWithChip) {
                return `=HYPERLINK("${runWithChip.chip.richLinkProperties.uri}", "${c.formattedValue || ''}")`;
              }
            }
            return c.formattedValue || '';
          });
        });
        console.log(`[API] Loaded ${finalRows.length} rows with hyperlink support`);
      } else {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: targetSpreadsheetId,
          range: finalSheetName,
        });
        console.log(`[API] Fetched values: ${response.data.values?.length || 0} rows`);
        finalRows = response.data.values || [];
      }
    } else {
      // Stage sheets: fetch CSV directly from public URL
      const activePublishedId = strGid === '501319673'
        ? '2PACX-1vRkOH2-jRtYqmkf0opn6in9TMg3oOo6FBvlGfkJjhDwn-t-CSYyrTbn4EDjNCFdvKL7tQG6nQ--jSdC'
        : '2PACX-1vRuuQ4J0z5ze6hHeZIvM24VqPApNS_eHIvnBmZ4EyPWj7J1MpvBOyPodwx0DKa1yqNkjlFdahgN6jZI';
      const url = `https://docs.google.com/spreadsheets/d/e/${activePublishedId}/pub?gid=${gid}&output=csv&single=true&t=${Date.now()}`;
      
      console.log(`[API] Fetching public GID ${gid} from CSV url`);
      const csvRes = await fetch(url);
      if (!csvRes.ok) throw new Error(`CSV fetch failed: ${csvRes.status}`);
      const text = await csvRes.text();
      finalRows = parseCsv(text);
      finalSheetName = `Public Sheet ${gid}`;
    }

    // Filter out rows that are entirely empty or just contain whitespace
    let validRows = finalRows.filter(row => 
      row.some(cell => cell && String(cell).trim() !== '')
    );
    
    // Performance optimization for large sheets
    if (strGid === '1476192399' || strGid === '2086331904') {
      const isNewGid = strGid === '1476192399';
      validRows = validRows
        .map(row => {
          if (isNewGid) {
            const sliced = row.slice(0, 21);
            while (sliced.length < 21) sliced.push('');
            let linkBunny = sliced[17] || '';
            // Fallback: extract play URL from iframe embed in col 16 if col 17 is empty
            if (!linkBunny && sliced[16]) {
              const m = String(sliced[16]).match(/mediadelivery\.net\/embed\/(\d+)\/([a-f0-9-]+)/i);
              if (m) {
                linkBunny = `https://iframe.mediadelivery.net/play/${m[1]}/${m[2]}`;
                sliced[17] = linkBunny;
              }
            }
            if (linkBunny && bunnyCache[linkBunny]) {
              sliced[20] = bunnyCache[linkBunny];
            } else if (linkBunny) {
              queueFetch(linkBunny);
            }
            return sliced;
          } else {
            return row.slice(0, 7);
          }
        })
        .filter(row => {
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
    
    console.log(`[API] Filtered GID ${gid} to ${validRows.length} valid rows`);
    const resultData = { rows: validRows, sheetName: finalSheetName };

    sheetCacheMap.set(String(gid), {
      timestamp: Date.now(),
      data: resultData
    });

    res.json(resultData);
  } catch (err) {
    console.error('[API] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Design Tasks Endpoints ---
app.get('/api/design-tasks', async (req, res) => {
  try {
    const requester = await getRequesterProfile(req);
    if (!supabaseAdminClient) throw new Error('Supabase admin not configured');
    const { data, error } = await supabaseAdminClient
      .from('design_tasks')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    res.json({ tasks: data || [] });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/design-tasks', async (req, res) => {
  try {
    const requester = await getRequesterProfile(req);
    if (!supabaseAdminClient) throw new Error('Supabase admin not configured');
    
    const { assigned_date, designer_name, priority, requested_by, design_type, deadline, reference_link, notes, is_done } = req.body;
    
    // Append to Google Sheets GID 501319673
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: credentials.client_email,
          private_key: credentials.private_key,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      const sheets = google.sheets({ version: 'v4', auth });
      const targetSpreadsheetId = '1T9x6FXjjXNrdpCwsX8lnFyyXogN11T9ou0hwrQWmdB4';
      
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: targetSpreadsheetId });
      const sheetMeta = spreadsheet.data.sheets?.find(
        (s) => String(s.properties?.sheetId) === '501319673'
      );
      const sheetTitle = sheetMeta?.properties?.title || 'Designers';
      
      const rowValue = [
        assigned_date || new Date().toLocaleDateString('en-US'),
        designer_name || '',
        priority || '',
        requested_by || '',
        design_type || '',
        deadline || '',
        reference_link || '',
        notes || '',
        is_done ? 'TRUE' : 'FALSE'
      ];
      
      console.log(`[API] Appending row to Designers Google Sheet:`, rowValue);
      await sheets.spreadsheets.values.append({
        spreadsheetId: targetSpreadsheetId,
        range: `${sheetTitle}!A:I`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowValue]
        }
      });
    } catch (sheetErr) {
      console.error('[API] Failed to append to Google Sheets:', sheetErr.message);
    }

    const { data, error } = await supabaseAdminClient
      .from('design_tasks')
      .insert({
        assigned_date: assigned_date || new Date().toISOString().split('T')[0],
        designer_name: designer_name || '',
        priority: priority || '',
        requested_by: requested_by || '',
        design_type: design_type || '',
        deadline: deadline || null,
        reference_link: reference_link || '',
        notes: notes || '',
        is_done: !!is_done,
        updated_by: requester.id
      })
      .select()
      .single();
      
    if (error) throw error;
    res.status(201).json({ task: data });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.patch('/api/design-tasks', async (req, res) => {
  try {
    const requester = await getRequesterProfile(req);
    if (!supabaseAdminClient) throw new Error('Supabase admin not configured');
    
    const targetId = String(req.query.id || req.body.id || '');
    if (!targetId) {
      const err = new Error('Task ID missing');
      err.status = 400;
      throw err;
    }
    
    const updates = { ...req.body };
    delete updates.id;
    updates.updated_by = requester.id;
    
    const { data, error } = await supabaseAdminClient
      .from('design_tasks')
      .update(updates)
      .eq('id', targetId)
      .select()
      .single();
      
    if (error) throw error;
    res.json({ task: data });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.put('/api/design-tasks/update', async (req, res) => {
  try {
    const requester = await getRequesterProfile(req);
    if (!supabaseAdminClient) throw new Error('Supabase admin not configured');
    
    const { id, reference, field, value } = req.body;
    if (!field) {
      return res.status(400).json({ error: 'Missing field parameter' });
    }

    console.log(`[API] Updating design task: id "${id || ''}", reference "${reference || ''}", setting "${field}" to "${value}"`);

    // 1. Update in Supabase
    const dbFieldMap = {
      designer: 'designer_name',
      priority: 'priority',
      requester: 'requested_by',
      type: 'design_type',
      deadline: 'deadline',
      notes: 'notes',
      done: 'is_done'
    };

    const dbField = dbFieldMap[field];
    if (dbField) {
      let dbValue = value;
      if (field === 'done') dbValue = !!value;
      
      const updates = { [dbField]: dbValue, updated_by: requester.id };
      
      if (id) {
        await supabaseAdminClient
          .from('design_tasks')
          .update(updates)
          .eq('id', id);
      } else if (reference && reference !== '-') {
        await supabaseAdminClient
          .from('design_tasks')
          .update(updates)
          .eq('reference_link', reference);
      }
    }

    // 2. Fetch details from database if needed to locate Google Sheet row
    let targetRef = reference;
    let targetDate = '';
    let targetDesigner = '';
    let targetRequester = '';

    if (id) {
      const { data: dbTask } = await supabaseAdminClient
        .from('design_tasks')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (dbTask) {
        if (!targetRef || targetRef === '-') targetRef = dbTask.reference_link;
        targetDate = dbTask.assigned_date;
        targetDesigner = dbTask.designer_name;
        targetRequester = dbTask.requested_by;
      }
    }

    // 3. Update in Google Sheets GID 501319673
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: { client_email: credentials.client_email, private_key: credentials.private_key },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      const sheets = google.sheets({ version: 'v4', auth });
      const targetSpreadsheetId = '1T9x6FXjjXNrdpCwsX8lnFyyXogN11T9ou0hwrQWmdB4';
      
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: targetSpreadsheetId });
      const sheetMeta = spreadsheet.data.sheets?.find(
        (s) => String(s.properties?.sheetId) === '501319673'
      );
      const sheetTitle = sheetMeta?.properties?.title || 'Designers';
      
      const rangeRes = await sheets.spreadsheets.values.get({
        spreadsheetId: targetSpreadsheetId,
        range: `${sheetTitle}!A:J`
      });
      
      const rows = rangeRes.data.values || [];
      let rowIndex = -1;

      // Try finding by reference first
      if (targetRef && targetRef !== '' && targetRef !== '-') {
        rowIndex = rows.findIndex(r => String(r[6] || '').trim() === String(targetRef).trim());
      }

      // Fallback: find by matching date, designer, requester combo
      if (rowIndex === -1) {
        const normalizeDate = (dStr) => {
          if (!dStr) return '';
          const clean = dStr.trim();
          if (clean.includes('-')) {
            const parts = clean.split('-');
            if (parts.length === 3) {
              return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}/${parts[0]}`;
            }
          }
          return clean;
        };

        const sheetDateToMatch = normalizeDate(targetDate);
        
        rowIndex = rows.findIndex(r => {
          const rDate = normalizeDate(r[0]);
          const rDesigner = String(r[1] || '').trim().toUpperCase();
          const rRequester = String(r[3] || '').trim().toUpperCase();
          
          return (rDate === sheetDateToMatch || !sheetDateToMatch) &&
                 rDesigner === String(targetDesigner).trim().toUpperCase() &&
                 rRequester === String(targetRequester).trim().toUpperCase();
        });
      }
      
      if (rowIndex !== -1) {
        const sheetRowNumber = rowIndex + 1;
        
        const sheetColIndexMap = {
          date: 0,
          designer: 1,
          priority: 2,
          requester: 3,
          type: 4,
          deadline: 5,
          reference: 6,
          notes: 7,
          done: 8,
          completed_date: 9
        };
        
        const colIdx = sheetColIndexMap[field];
        if (colIdx !== undefined) {
          const colLetter = String.fromCharCode(65 + colIdx);
          
          let cellValue = value;
          if (field === 'done') cellValue = value ? 'TRUE' : 'FALSE';
          
          console.log(`[API] Writing "${cellValue}" to cell ${colLetter}${sheetRowNumber}`);
          await sheets.spreadsheets.values.update({
            spreadsheetId: targetSpreadsheetId,
            range: `${sheetTitle}!${colLetter}${sheetRowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [[cellValue]]
            }
          });

          // Write completion date to column J if marked done
          if (field === 'done') {
            const completedColLetter = 'J';
            const completedDateVal = value ? new Date().toLocaleDateString('en-US') : '';
            console.log(`[API] Writing completion date "${completedDateVal}" to Column J${sheetRowNumber}`);
            await sheets.spreadsheets.values.update({
              spreadsheetId: targetSpreadsheetId,
              range: `${sheetTitle}!${completedColLetter}${sheetRowNumber}`,
              valueInputOption: 'USER_ENTERED',
              requestBody: {
                values: [[completedDateVal]]
              }
            });
          }
        }
      } else {
        console.error(`[API] Google Sheet row with reference "${targetRef || ''}" or combo not found!`);
      }
    } catch (sheetErr) {
      console.error('[API] Failed to update Google Sheets:', sheetErr.message);
    }

    res.json({ success: true });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.delete('/api/design-tasks', async (req, res) => {
  try {
    const requester = await getRequesterProfile(req);
    if (!supabaseAdminClient) throw new Error('Supabase admin not configured');
    
    const targetId = String(req.query.id || req.body.id || '');
    if (!targetId) {
      const err = new Error('Task ID missing');
      err.status = 400;
      throw err;
    }
    
    const { error } = await supabaseAdminClient
      .from('design_tasks')
      .delete()
      .eq('id', targetId);
      
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.listen(3001, () => console.log('✅ Dev API proxy running on http://localhost:3001'));



