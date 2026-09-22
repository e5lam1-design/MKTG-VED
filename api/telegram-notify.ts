import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, chatId, text } = req.body || {};
  const botToken = token || process.env.TELEGRAM_BOT_TOKEN || '8995125962:AAFtthDhRXtVxnpf5TEpfhynx1XLl07X6tA';

  if (!botToken) {
    return res.status(400).json({ error: 'Missing Telegram bot token' });
  }
  if (!chatId || !text) {
    return res.status(400).json({ error: 'Missing chatId or text' });
  }

  try {
    const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });

    const data = await telegramRes.json();
    if (!telegramRes.ok || !data.ok) {
      return res.status(telegramRes.status).json({ ok: false, error: data.description || 'Telegram API error' });
    }

    return res.json({ ok: true, result: data.result });
  } catch (err: any) {
    console.error('[API telegram-notify] Error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Internal server error' });
  }
}
