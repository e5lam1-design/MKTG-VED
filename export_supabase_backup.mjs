import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = "https://dppdaqmrrjbldcygadpi.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwcGRhcW1ycmpibGRjeWdhZHBpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzNTIyNSwiZXhwIjoyMDk0ODExMjI1fQ.EBZ2wyV48UA9h9tLM0vUrjovR8xCb8lPLIaVgI9aVwU";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const TABLES = [
  'reels_shooting_26',
  'reels_ve_26',
  'reels_cuts_26',
  'tagme3at_26',
  'page_announcements',
  'user_logs',
  'dashboard_data',
  'stage_j4_26',
  'stage_j5_26',
  'stage_j6_26',
  'stage_m1_26',
  'stage_m2_26',
  'stage_m3_26',
  'stage_s1_26',
  'stage_s2_26',
  'stage_s3_26',
  'user_profiles',
  'task_overrides',
  'manual_tasks',
  'tasks',
  'tagme3at_items',
  'shooting',
  've',
  'cuts',
  'design_tasks',
  'designers_tasks_26',
  'feedback_reports_26',
  'designers_team_options_26',
  'tab_priority_limits',
  'editors_team_options_26'
];

function toCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const csvLines = [headers.join(',')];

  for (const row of rows) {
    const values = headers.map(header => {
      let val = row[header];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'object') val = JSON.stringify(val);
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    });
    csvLines.push(values.join(','));
  }
  return csvLines.join('\r\n');
}

function sqlEscape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return Number.isFinite(val) ? val.toString() : 'NULL';
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

function toSQL(tableName, rows) {
  if (!rows || rows.length === 0) return `-- Table public.${tableName} is empty\n`;
  const headers = Object.keys(rows[0]);
  const sqlHeader = `-- Table: public.${tableName} (${rows.length} rows)\n`;
  const insertStatements = rows.map(row => {
    const cols = headers.map(h => `"${h}"`).join(', ');
    const vals = headers.map(h => sqlEscape(row[h])).join(', ');
    return `INSERT INTO public."${tableName}" (${cols}) VALUES (${vals});`;
  });
  return sqlHeader + insertStatements.join('\n') + '\n\n';
}

async function runBackup() {
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const targetDirDesktop = path.join('C:', 'Users', 'El-Khetta', 'Desktop', `Supabase_Backup_MKTGVD_${dateStr}`);
  const targetDirProject = path.join(process.cwd(), 'backups', `supabase_backup_${dateStr}`);

  fs.mkdirSync(path.join(targetDirDesktop, 'json'), { recursive: true });
  fs.mkdirSync(path.join(targetDirDesktop, 'csv'), { recursive: true });
  fs.mkdirSync(path.join(targetDirProject, 'json'), { recursive: true });
  fs.mkdirSync(path.join(targetDirProject, 'csv'), { recursive: true });

  console.log(`Starting backup to:\n1) ${targetDirDesktop}\n2) ${targetDirProject}\n`);

  let fullSQL = `-- ==================================================\n`;
  fullSQL += `-- Supabase Complete Database Backup (MKTGVD)\n`;
  fullSQL += `-- Date: ${new Date().toISOString()}\n`;
  fullSQL += `-- Project ID: dppdaqmrrjbldcygadpi\n`;
  fullSQL += `-- Organization: sumejnhevpszulijezja (e5lam1-design's Org)\n`;
  fullSQL += `-- ==================================================\n\n`;

  const summary = [];

  // Backup all public tables
  for (const table of TABLES) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .range(0, 9999);

      if (error) {
        console.warn(`[WARN] Error fetching ${table}:`, error.message);
        summary.push({ table, count: 0, status: 'Error: ' + error.message });
        continue;
      }

      const count = data ? data.length : 0;
      console.log(`✓ Fetched ${table}: ${count} rows`);
      summary.push({ table, count, status: 'OK' });

      // 1. JSON
      const jsonStr = JSON.stringify(data || [], null, 2);
      fs.writeFileSync(path.join(targetDirDesktop, 'json', `${table}.json`), jsonStr, 'utf8');
      fs.writeFileSync(path.join(targetDirProject, 'json', `${table}.json`), jsonStr, 'utf8');

      // 2. CSV
      if (count > 0) {
        const csvStr = toCSV(data);
        fs.writeFileSync(path.join(targetDirDesktop, 'csv', `${table}.csv`), csvStr, 'utf8');
        fs.writeFileSync(path.join(targetDirProject, 'csv', `${table}.csv`), csvStr, 'utf8');
      }

      // 3. SQL Insert
      fullSQL += toSQL(table, data || []);
    } catch (err) {
      console.error(`[ERR] Failed table ${table}:`, err.message);
      summary.push({ table, count: 0, status: 'Fatal: ' + err.message });
    }
  }

  // Backup Auth Users
  try {
    const { data: authData, error: authErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (!authErr && authData && authData.users) {
      const users = authData.users.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        role: u.role,
        raw_user_meta_data: u.user_metadata
      }));
      console.log(`✓ Fetched auth.users: ${users.length} accounts`);
      fs.writeFileSync(path.join(targetDirDesktop, 'json', 'auth_users.json'), JSON.stringify(users, null, 2), 'utf8');
      fs.writeFileSync(path.join(targetDirProject, 'json', 'auth_users.json'), JSON.stringify(users, null, 2), 'utf8');
      fs.writeFileSync(path.join(targetDirDesktop, 'csv', 'auth_users.csv'), toCSV(users), 'utf8');
      fs.writeFileSync(path.join(targetDirProject, 'csv', 'auth_users.csv'), toCSV(users), 'utf8');
      summary.push({ table: 'auth.users', count: users.length, status: 'OK' });
    }
  } catch (authErr) {
    console.warn(`[WARN] Auth users backup skipped:`, authErr.message);
  }

  // Write full SQL
  fs.writeFileSync(path.join(targetDirDesktop, 'complete_database_backup.sql'), fullSQL, 'utf8');
  fs.writeFileSync(path.join(targetDirProject, 'complete_database_backup.sql'), fullSQL, 'utf8');

  // Write Summary Report (HTML & Markdown)
  const reportHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>نسخة احتياطية كاملة - Supabase MKTGVD</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 30px; margin: 0; }
    h1 { color: #38bdf8; margin-bottom: 8px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-weight: bold; font-size: 13px; }
    .badge-ok { background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }
    .badge-empty { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #1e293b; border-radius: 12px; overflow: hidden; }
    th, td { padding: 12px 16px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06); }
    th { background: #334155; color: #94a3b8; font-size: 14px; }
    tr:hover { background: rgba(255,255,255,0.02); }
    .card { background: #1e293b; padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.08); }
    a { color: #38bdf8; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>📦 تم أخذ نسخة احتياطية كاملة من قاعدة بيانات Supabase</h1>
  <p style="color: #94a3b8;">تاريخ التصدير: ${new Date().toLocaleString('ar-EG')} | المشروع: <code>dppdaqmrrjbldcygadpi (MKTGVD)</code></p>
  
  <div class="card">
    <h3 style="margin-top:0;">📁 مسار حفظ الملفات على جهازك:</h3>
    <p><code>${targetDirDesktop}</code></p>
    <ul>
      <li>ملف الـ SQL المجمع: <code>complete_database_backup.sql</code></li>
      <li>مجلد ملفات الـ JSON: <code>json/</code></li>
      <li>مجلد ملفات الـ CSV: <code>csv/</code></li>
    </ul>
  </div>

  <h2>📊 الجداول والبيانات المصدرة:</h2>
  <table>
    <thead>
      <tr>
        <th>اسم الجدول</th>
        <th>عدد السجلات</th>
        <th>الحالة</th>
        <th>ملف JSON</th>
        <th>ملف CSV</th>
      </tr>
    </thead>
    <tbody>
      ${summary.map(s => `
        <tr>
          <td><strong>${s.table}</strong></td>
          <td>${s.count.toLocaleString()}</td>
          <td><span class="badge ${s.count > 0 ? 'badge-ok' : 'badge-empty'}">${s.count > 0 ? 'مكتمل' : 'فارغ'}</span></td>
          <td><a href="json/${s.table.replace('public.', '').replace('auth.', 'auth_')}.json" target="_blank">فتح JSON</a></td>
          <td>${s.count > 0 ? `<a href="csv/${s.table.replace('public.', '').replace('auth.', 'auth_')}.csv" target="_blank">فتح CSV</a>` : '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;

  fs.writeFileSync(path.join(targetDirDesktop, 'backup_summary.html'), reportHtml, 'utf8');
  fs.writeFileSync(path.join(targetDirProject, 'backup_summary.html'), reportHtml, 'utf8');

  console.log(`\n🎉 Backup finished successfully! All tables saved to:\n${targetDirDesktop}`);
}

runBackup().catch(err => {
  console.error("Backup failed:", err);
  process.exit(1);
});
