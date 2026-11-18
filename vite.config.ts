import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function localDocExtractPlugin() {
  return {
    name: 'local-doc-extract',
    configureServer(server: any) {
      server.middlewares.use('/api/doc-extract', async (req: any, res: any, next: any) => {
        try {
          const reqUrl = new URL(req.url || '', 'http://localhost');
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
              codes: [],
              links: [],
            }));
            return;
          }

          const text = await docRes.text();
          const codeMatches = text.match(/[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+-[^\r\n]*?\{[^}\r\n]+\}/g) || [];
          const codes = Array.from(new Set(codeMatches.map(c => c.trim()).filter(Boolean)));

          const urlMatches = text.match(/https?:\/\/[^\s<>"')\]]+/gi) || [];
          const links = Array.from(
            new Set(urlMatches.map(u => u.replace(/[.,،;!?]+$/, '').trim()).filter(u => u.length > 8))
          );

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ docId, codes, links }));
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
