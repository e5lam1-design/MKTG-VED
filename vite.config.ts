import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { google } from 'googleapis'

function loadGoogleServiceCreds() {
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return {
      client_email: process.env.GOOGLE_CLIENT_EMAIL.replace(/"/g, '').trim(),
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
    };
  }
  const candidates = [
    path.resolve(__dirname, '.env.local'),
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '../marketing-dashboard v1/.env.local'),
  ];
  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const text = fs.readFileSync(file, 'utf8');
      const map: Record<string, string> = {};
      for (const line of text.split(/\r?\n/)) {
        const eq = line.indexOf('=');
        if (eq === -1) continue;
        const k = line.slice(0, eq).trim();
        let v = line.slice(eq + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        map[k] = v;
      }
      if (map.GOOGLE_CLIENT_EMAIL && map.GOOGLE_PRIVATE_KEY) {
        return {
          client_email: map.GOOGLE_CLIENT_EMAIL.trim(),
          private_key: map.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        };
      }
    } catch {}
  }
  return null;
}

function localDocExtractPlugin() {
  return {
    name: 'local-doc-extract',
    configureServer(server: any) {
      server.middlewares.use('/api/duration', async (req: any, res: any, next: any) => {
        try {
          const reqUrl = new URL(req.url || '', 'http://localhost');
          const action = reqUrl.searchParams.get('action');

          if (action === 'doc-meta') {
            const rawUrl = reqUrl.searchParams.get('url') || reqUrl.searchParams.get('docId') || '';
            const match = rawUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/i);
            const docId = (match && match[1]) || (/^[a-zA-Z0-9_-]{20,}$/.test(rawUrl.trim()) ? rawUrl.trim() : null);
            res.setHeader('Content-Type', 'application/json');
            if (!docId) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid or missing Google Docs URL/ID' }));
              return;
            }
            const creds = loadGoogleServiceCreds();
            if (!creds) {
              res.statusCode = 503;
              res.end(JSON.stringify({ error: 'Google Service Account not configured locally', docId }));
              return;
            }
            try {
              const auth = new google.auth.GoogleAuth({
                credentials: creds,
                scopes: ['https://www.googleapis.com/auth/drive.readonly'],
              });
              const drive = google.drive({ version: 'v3', auth });
              const meta = await drive.files.get({
                fileId: docId,
                fields: 'id,name,createdTime,modifiedTime,lastModifyingUser(displayName,emailAddress),version',
                supportsAllDrives: true,
              });
              const data = meta.data;
              const lastModifier =
                data.lastModifyingUser?.displayName ||
                (data.lastModifyingUser?.emailAddress ? data.lastModifyingUser.emailAddress.split('@')[0] : '');
              res.statusCode = 200;
              res.end(JSON.stringify({
                docId,
                name: data.name || '',
                createdTime: data.createdTime || null,
                modifiedTime: data.modifiedTime || null,
                lastModifier: lastModifier || '',
                version: data.version || null,
              }));
            } catch (err: any) {
              const status = err?.code === 404 || err?.status === 404 ? 404 : err?.code === 403 || err?.status === 403 ? 403 : 500;
              res.statusCode = status;
              res.end(JSON.stringify({
                error: status === 403 || status === 404
                  ? 'الملف غير مشارك أو لا يمكن الوصول لبياناته'
                  : (err?.message || 'Failed to read Google Doc metadata'),
                docId,
              }));
            }
            return;
          }

          if (action !== 'doc-extract') {
            return next();
          }
          const rawUrl = reqUrl.searchParams.get('url') || reqUrl.searchParams.get('docId') || '';
          const match = rawUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/i);
          const docId = (match && match[1]) || (/^[a-zA-Z0-9_-]{20,}$/.test(rawUrl.trim()) ? rawUrl.trim() : null);

          if (!docId) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid or missing Google Docs URL/ID' }));
            return;
          }

          const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
          const docRes = await fetch(exportUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            redirect: 'follow',
          });
          const ct = docRes.headers.get('content-type') || '';
          if (!docRes.ok || !ct.includes('text/plain')) {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: 'تعذر قراءة الملف محلياً — تأكد أن الملف مشارك (Anyone with the link)',
              docId,
              isPublic: false,
              title: '',
              codes: [],
              links: [],
            }));
            return;
          }

          let docTitle = '';
          const cd = docRes.headers.get('content-disposition') || '';
          const utf8Match = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
          if (utf8Match?.[1]) {
            try { docTitle = decodeURIComponent(utf8Match[1]).replace(/\.txt$/i, '').trim(); } catch {}
          } else {
            const basicMatch = cd.match(/filename\s*=\s*"?([^";]+)"?/i);
            if (basicMatch?.[1]) docTitle = basicMatch[1].replace(/\.txt$/i, '').trim();
          }

          const text = await docRes.text();
          if (!docTitle) {
            const firstLine = text.split(/\r?\n/).map(l => l.trim()).find(l => l.length >= 2 && !l.startsWith('http'));
            if (firstLine) docTitle = firstLine.slice(0, 80);
          }

          const codeMatches = text.match(/[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+-[^\r\n]*?\{[^}\r\n]+\}/g) || [];
          const codes = Array.from(new Set(codeMatches.map(c => c.trim()).filter(Boolean)));

          const urlMatches = text.match(/https?:\/\/[^\s<>"')\]]+/gi) || [];
          const links = Array.from(
            new Set(urlMatches.map(u => u.replace(/[.,،;!?]+$/, '').trim()).filter(u => u.length > 8))
          );

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ docId, isPublic: true, title: docTitle, codes, links }));
        } catch {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localDocExtractPlugin()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
