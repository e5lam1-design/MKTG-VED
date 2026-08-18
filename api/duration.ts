import type { VercelRequest, VercelResponse } from '@vercel/node';

const formatSeconds = (totalSeconds: number) => {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const formattedHrs = hrs > 0 ? `${hrs}:` : '';
  const formattedMins = String(mins).padStart(hrs > 0 ? 2 : 1, '0');
  const formattedSecs = String(secs).padStart(2, '0');
  return `${formattedHrs}${formattedMins}:${formattedSecs}`;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
