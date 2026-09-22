import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdminClient } from './_supabase.js';

const DEFAULT_BOT_TOKEN = '8995125962:AAFtthDhRXtVxnpf5TEpfhynx1XLl07X6tA';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;

  // 1. GET: Health check or Chat ID query
  if (req.method === 'GET') {
    const { userId, userName } = req.query;

    if (userId && supabaseAdminClient) {
      const { data } = await supabaseAdminClient
        .from('page_announcements')
        .select('message')
        .eq('page_key', `tg_chat_${userId}`)
        .maybeSingle();

      if (data?.message) {
        return res.json({ ok: true, chatId: String(data.message).trim() });
      }
    }

    if (userName && supabaseAdminClient) {
      const clean = String(userName).trim().toLowerCase();
      const { data } = await supabaseAdminClient
        .from('page_announcements')
        .select('message')
        .eq('page_key', `tg_editor_${clean}`)
        .maybeSingle();

      if (data?.message) {
        return res.json({ ok: true, chatId: String(data.message).trim() });
      }
    }

    return res.json({ ok: true, service: 'telegram-api', status: 'ready' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};

  // 1.5. Unlink Action: { action: 'unlink', userId, userName? }
  if (body.action === 'unlink') {
    const targetId = body.userId;
    const targetName = body.userName ? String(body.userName).trim().toLowerCase() : '';

    if (supabaseAdminClient) {
      if (targetId) {
        try {
          await supabaseAdminClient
            .from('page_announcements')
            .delete()
            .eq('page_key', `tg_chat_${targetId}`);
        } catch {}

        try {
          await supabaseAdminClient
            .from('dashboard_data')
            .delete()
            .eq('key', `tg_chat_${targetId}`);
        } catch {}

        try {
          await supabaseAdminClient
            .from('user_profiles')
            .update({ telegram_chat_id: null, updated_at: new Date().toISOString() })
            .eq('id', targetId);
        } catch {}
      }

      if (targetName) {
        try {
          await supabaseAdminClient
            .from('page_announcements')
            .delete()
            .eq('page_key', `tg_editor_${targetName}`);
        } catch {}

        try {
          await supabaseAdminClient
            .from('dashboard_data')
            .delete()
            .eq('key', `tg_editor_${targetName}`);
        } catch {}
      }
    }

    return res.json({ ok: true, unlinked: true });
  }

  // 2. Direct Notify Request: { chatId, text, token? }
  if (body.chatId && body.text) {
    const activeToken = body.token || botToken;
    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${activeToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: body.chatId,
          text: body.text,
          parse_mode: 'HTML',
          disable_web_page_preview: false
        })
      });

      const data = await tgRes.json();
      if (!tgRes.ok || !data.ok) {
        return res.status(tgRes.status).json({ ok: false, error: data.description || 'Telegram API error' });
      }

      return res.json({ ok: true, result: data.result });
    } catch (err: any) {
      console.error('[Telegram Notify] Error:', err);
      return res.status(500).json({ ok: false, error: err.message || 'Internal error' });
    }
  }

  // 3. Telegram Webhook Update: { update_id, message: { chat, text } }
  const update = body;
  if (update && update.message) {
    const msg = update.message;
    const chatId = msg.chat?.id;
    const text = (msg.text || '').trim();

    if (!chatId || !text) {
      return res.json({ ok: true, ignored: true });
    }

    // Handle /start <userId>
    if (text.startsWith('/start')) {
      const parts = text.split(/\s+/);
      const startPayload = parts[1] ? parts[1].trim() : '';

      if (startPayload && supabaseAdminClient) {
        try {
          const { data: user } = await supabaseAdminClient
            .from('user_profiles')
            .select('*')
            .or(`id.eq.${startPayload},username.eq.${startPayload},name.ilike.${startPayload},email.ilike.${startPayload}`)
            .maybeSingle();

          if (user) {
            // Save to page_announcements (instant client-side read)
            try {
              await supabaseAdminClient.from('page_announcements').upsert([
                {
                  page_key: `tg_chat_${user.id}`,
                  page_label: 'telegram_chat_id',
                  message: String(chatId),
                  type: 'info',
                  is_active: true,
                  updated_at: new Date().toISOString()
                },
                {
                  page_key: `tg_editor_${user.name.trim().toLowerCase()}`,
                  page_label: 'telegram_chat_id',
                  message: String(chatId),
                  type: 'info',
                  is_active: true,
                  updated_at: new Date().toISOString()
                }
              ], { onConflict: 'page_key' });
            } catch {}

            // Save to dashboard_data
            try {
              await supabaseAdminClient.from('dashboard_data').upsert([
                {
                  key: `tg_chat_${user.id}`,
                  field: 'chat_id',
                  value: String(chatId),
                  updated_by: user.name,
                  updated_at: new Date().toISOString()
                },
                {
                  key: `tg_editor_${user.name.trim().toLowerCase()}`,
                  field: user.name.trim().toLowerCase(),
                  value: String(chatId),
                  updated_by: user.name,
                  updated_at: new Date().toISOString()
                }
              ], { onConflict: 'key' });
            } catch {}

            // Try user_profiles
            try {
              await supabaseAdminClient
                .from('user_profiles')
                .update({ telegram_chat_id: String(chatId), updated_at: new Date().toISOString() })
                .eq('id', user.id);
            } catch {}

            // Send confirmation welcome message
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `🎉 <b>أهلاً بك يا ${user.name}!</b>\n\n✅ تم ربط حسابك بنجاح في <b>لوحة تحكم الخطة</b>.\n🚀 من الآن فصاعداً، ستصلك هنا إشعارات فورية بكل المهام التي تنجزها وروابطها تلقائياً!`,
                parse_mode: 'HTML'
              })
            }).catch(() => {});

            return res.json({ ok: true, linked: true, userId: user.id });
          }
        } catch (err: any) {
          console.error('[Telegram Webhook] Error linking user:', err);
        }
      }

      // Default welcome if no payload
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `👋 <b>مرحباً بك في بوت لوحة تحكم الخطة!</b>\n\nلربط حسابك تلقائياً، يرجى فتح لوحة التحكم والضغط على زر <b>"ربط حسابي بتليجرام"</b> في صفحتك الرئيسية.`,
          parse_mode: 'HTML'
        })
      }).catch(() => {});

      return res.json({ ok: true });
    }

    return res.json({ ok: true });
  }

  return res.status(400).json({ error: 'Unrecognized request payload' });
}
