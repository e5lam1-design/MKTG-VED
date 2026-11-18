import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

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

  // Extract lesson/session codes like: M3-T1-U3-L1-SS-P0079-Mahmoud Kotb-C20-{نظم الغابات في قارات العالم الجديد}
  const codeMatches = text.match(/[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+-[^\r\n]*?\{[^}\r\n]+\}/g) || [];
  const codes = Array.from(new Set(codeMatches.map(c => c.trim()).filter(Boolean)));

  // Extract HTTP/HTTPS links (TikTok, YouTube, Drive, etc.)
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawUrl = (req.query.url as string) || (req.query.docId as string) || '';
  const docId = extractDocId(rawUrl);
  if (!docId) {
    return res.status(400).json({ error: 'Invalid or missing Google Docs URL/ID' });
  }

  try {
    let plainText = '';

    // 1. Try public export URL first (fast, zero auth overhead for shared docs)
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
      }
    } catch {
      // Fall through to Service Account fallback
    }

    // 2. Fallback to Google Drive API via Service Account if public export failed
    if (!plainText && process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
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
    }

    if (!plainText) {
      return res.status(403).json({
        error: 'تعذر قراءة الملف — تأكد أن الملف مشارك (Anyone with the link can view)',
        docId,
        codes: [],
        links: [],
      });
    }

    const { codes, links } = parseDocContent(plainText);
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(200).json({ docId, codes, links });
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
