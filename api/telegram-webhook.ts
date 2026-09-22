import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdminClient } from './_supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const update = req.body;
  if (!update || !update.message) {
    return res.json({ ok: true, ignored: true });
  }

  const msg = update.message;
  const chatId = msg.chat?.id;
  const text = (msg.text || '').trim();

  if (!chatId || !text) {
    return res.json({ ok: true });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN || '8995125962:AAFtthDhRXtVxnpf5TEpfhynx1XLl07X6tA';

  // Handle /start <payload>
  if (text.startsWith('/start')) {
    const parts = text.split(/\s+/);
    const startPayload = parts[1] ? parts[1].trim() : '';

    if (startPayload && supabaseAdminClient) {
      try {
        // Find user by id, username, or name
        const { data: user } = await supabaseAdminClient
          .from('user_profiles')
          .select('*')
          .or(`id.eq.${startPayload},username.eq.${startPayload},name.ilike.${startPayload},email.ilike.${startPayload}`)
          .maybeSingle();

        if (user) {
          // 1. Update user_profiles
          try {
            await supabaseAdminClient
              .from('user_profiles')
              .update({
                telegram_chat_id: String(chatId),
                updated_at: new Date().toISOString()
              })
              .eq('id', user.id);
          } catch {}

          // 2. Persist in page_announcements (instantly readable by client) & dashboard_data
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

          // Send welcome message
          if (botToken) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `🎉 <b>أهلاً بك يا ${user.name}!</b>\n\n✅ تم ربط حسابك بنجاح في <b>لوحة تحكم الخطة</b>.\n🚀 من الآن فصاعداً، ستصلك هنا إشعارات فورية بكل المهام التي تنجزها وروابطها تلقائياً!`,
                parse_mode: 'HTML'
              })
            }).catch(() => {});
          }

          return res.json({ ok: true, linked: true, userId: user.id });
        }
      } catch (err: any) {
        console.error('[Telegram Webhook] Error linking user:', err.message);
      }
    }

    // Default reply if no payload
    if (botToken) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `👋 <b>مرحباً بك في بوت لوحة تحكم الخطة!</b>\n\nلربط حسابك تلقائياً، يرجى فتح لوحة التحكم والضغط على زر <b>"ربط تليجرام بنقرة واحدة"</b> في صفحتك الرئيسية.`,
          parse_mode: 'HTML'
        })
      }).catch(() => {});
    }
  }

  return res.json({ ok: true });
}
