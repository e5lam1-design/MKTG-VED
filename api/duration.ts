import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

const formatSeconds = (totalSeconds: number) => {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const formattedHrs = hrs > 0 ? `${hrs}:` : '';
  const formattedMins = String(mins).padStart(hrs > 0 ? 2 : 1, '0');
  const formattedSecs = String(secs).padStart(2, '0');
  return `${formattedHrs}${formattedMins}:${formattedSecs}`;
};

function extractDocId(input: string): string | null {
  const s = String(input || '').trim();
  const match = s.match(/\/document\/d\/([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
  return null;
}

function formatPrivateKey(key?: string) {
  if (!key) return undefined;
  return key.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
}

function parseDocContent(rawText: string) {
  const text = String(rawText || '');
  const codeMatches = text.match(/[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+-[^\r\n]*?\{[^}\r\n]+\}/g) || [];
  const codes = Array.from(new Set(codeMatches.map(c => c.trim()).filter(Boolean)));

  const urlMatches = text.match(/https?:\/\/[^\s<>"')\]]+/gi) || [];
  const links = Array.from(
    new Set(
      urlMatches
        .map(u => u.replace(/[.,،;!?]+$/, '').trim())
        .filter(u => u.length > 8)
    )
  );
  return { codes, links };
}

async function handleDocExtract(req: VercelRequest, res: VercelResponse) {
  const rawUrl = (req.query.url as string) || (req.query.docId as string) || '';
  const docId = extractDocId(rawUrl);
  if (!docId) {
    return res.status(400).json({ error: 'Invalid or missing Google Docs URL/ID' });
  }

  try {
    let plainText = '';
    let docTitle = '';
    let isPublic = false;

    const extractTitleFromDisposition = (cd: string) => {
      if (!cd) return '';
      const utf8Match = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
      if (utf8Match?.[1]) {
        try {
          return decodeURIComponent(utf8Match[1]).replace(/\.txt$/i, '').trim();
        } catch {}
      }
      const basicMatch = cd.match(/filename\s*=\s*"?([^";]+)"?/i);
      if (basicMatch?.[1]) {
        return basicMatch[1].replace(/\.txt$/i, '').trim();
      }
      return '';
    };

    try {
      const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
      const docRes = await fetch(exportUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        redirect: 'follow',
      });
      const contentType = docRes.headers.get('content-type') || '';
      if (docRes.ok && contentType.includes('text/plain')) {
        plainText = await docRes.text();
        isPublic = true;
        docTitle = extractTitleFromDisposition(docRes.headers.get('content-disposition') || '');
      }
    } catch {
      // Fall through to Service Account fallback
    }

    if (!plainText && process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      try {
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL.replace(/"/g, '').trim(),
            private_key: formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY),
          },
          scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });
        const drive = google.drive({ version: 'v3', auth });
        const exported = await drive.files.export(
          { fileId: docId, mimeType: 'text/plain' },
          { responseType: 'text' }
        );
        plainText = typeof exported.data === 'string' ? exported.data : String(exported.data || '');
      } catch {
        // Private doc not accessible even by service account -> fall through to 403 isPublic: false
      }
    }

    if (!plainText) {
      return res.status(403).json({
        error: 'تعذر قراءة الملف — تأكد أن الملف مشارك (Anyone with the link can view)',
        docId,
        isPublic: false,
        title: '',
        codes: [],
        links: [],
      });
    }

    if (!docTitle) {
      const firstLine = plainText.split(/\r?\n/).map(l => l.trim()).find(l => l.length >= 2 && !l.startsWith('http'));
      if (firstLine) docTitle = firstLine.slice(0, 80);
    }

    const { codes, links } = parseDocContent(plainText);
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(200).json({ docId, isPublic, title: docTitle, codes, links });
  } catch (err: any) {
    console.error('doc-extract error:', err);
    return res.status(500).json({
      error: err?.message || 'Failed to extract document links',
      docId,
      codes: [],
      links: [],
    });
  }
}

async function handleDocMeta(req: VercelRequest, res: VercelResponse) {
  const rawUrl = (req.query.url as string) || (req.query.docId as string) || '';
  const docId = extractDocId(rawUrl);
  if (!docId) {
    return res.status(400).json({ error: 'Invalid or missing Google Docs URL/ID' });
  }

  try {
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return res.status(503).json({ error: 'Google Service Account not configured', docId });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL.replace(/"/g, '').trim(),
        private_key: formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY),
      },
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

    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=300');
    return res.status(200).json({
      docId,
      name: data.name || '',
      createdTime: data.createdTime || null,
      modifiedTime: data.modifiedTime || null,
      lastModifier: lastModifier || '',
      version: data.version || null,
    });
  } catch (err: any) {
    const status = err?.code === 404 || err?.status === 404 ? 404 : err?.code === 403 || err?.status === 403 ? 403 : 500;
    return res.status(status).json({
      error: status === 403 || status === 404
        ? 'الملف غير مشارك أو لا يمكن الوصول لبياناته'
        : (err?.message || 'Failed to read Google Doc metadata'),
      docId,
    });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.query.action === 'doc-extract') {
    return handleDocExtract(req, res);
  }

  if (req.query.action === 'doc-meta') {
    return handleDocMeta(req, res);
  }

  const url = req.query.url as string;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const fetchRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    const text = await fetchRes.text();
    const durationMatch = text.match(/<meta[^>]*content=["'](\d+)["'][^>]*property=["']video:duration["']/i) ||
                          text.match(/<meta[^>]*property=["']video:duration["'][^>]*content=["'](\d+)["']/i);
    if (durationMatch) {
      const seconds = parseInt(durationMatch[1], 10);
      if (!isNaN(seconds) && seconds > 0) {
        return res.status(200).json({ duration: formatSeconds(seconds) });
      }
    }

    const schemaMatch = text.match(/"duration"\s*:\s*"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"/i);
    if (schemaMatch) {
      const hrs = parseInt(schemaMatch[1] || '0', 10);
      const mins = parseInt(schemaMatch[2] || '0', 10);
      const secs = parseInt(schemaMatch[3] || '0', 10);
      const totalSecs = hrs * 3600 + mins * 60 + secs;
      if (totalSecs > 0) {
        return res.status(200).json({ duration: formatSeconds(totalSecs) });
      }
    }

    return res.status(200).json({ duration: null });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
