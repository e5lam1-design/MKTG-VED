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

            // Send confirmation welcome message with query buttons
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: user?.name
                  ? `أهلاً بك يا ${user.name} 👋\n\nأنت الآن متصل بتاسكات الخطة ✅\n\n👇 يمكنك الآن الاستعلام عن مهامك مباشرة من الأزرار بالأسفل:`
                  : `أنت الآن متصل بتاسكات الخطة ✅\n\n👇 يمكنك الآن الاستعلام عن مهامك مباشرة من الأزرار بالأسفل:`,
                parse_mode: 'HTML',
                reply_markup: {
                  keyboard: [
                    [{ text: '⏳ لسه متعملتش' }, { text: '⚡ أولوية' }],
                    [{ text: '📝 اطلب إيديت' }, { text: '✅ خلصت' }],
                    [{ text: '📥 مهام متاحة' }, { text: '👤 إجمالي مهامي' }],
                    [{ text: '📊 ملخص شامل' }]
                  ],
                  resize_keyboard: true,
                  is_persistent: true
                }
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
          text: `أنت الآن متصل بتاسكات الخطة ✅\n\n👇 يمكنك الاستعلام عن مهامك باستخدام الأزرار أدناه:`,
          parse_mode: 'HTML',
          reply_markup: {
            keyboard: [
              [{ text: '⏳ لسه متعملتش' }, { text: '⚡ أولوية' }],
              [{ text: '📝 اطلب إيديت' }, { text: '✅ خلصت' }],
              [{ text: '📥 مهام متاحة' }, { text: '👤 إجمالي مهامي' }],
              [{ text: '📊 ملخص شامل' }]
            ],
            resize_keyboard: true,
            is_persistent: true
          }
        })
      }).catch(() => {});

      return res.json({ ok: true });
    }

    // Handle Query Buttons when user taps any button
    let targetUserId = '';
    let targetUserName = '';

    if (supabaseAdminClient) {
      try {
        const { data: rows } = await supabaseAdminClient
          .from('page_announcements')
          .select('page_key, message')
          .eq('message', String(chatId));

        if (rows) {
          for (const r of rows) {
            if (r.page_key.startsWith('tg_chat_')) {
              targetUserId = r.page_key.replace('tg_chat_', '');
            } else if (r.page_key.startsWith('tg_editor_')) {
              targetUserName = r.page_key.replace('tg_editor_', '');
            }
          }
        }
      } catch {}

      if (targetUserId && !targetUserName) {
        try {
          const { data: p } = await supabaseAdminClient
            .from('user_profiles')
            .select('name')
            .eq('id', targetUserId)
            .maybeSingle();
          if (p?.name) targetUserName = p.name;
        } catch {}
      }
    }

    // Fetch cached stats from page_announcements
    let statsData: any = null;
    if (supabaseAdminClient && (targetUserId || targetUserName)) {
      try {
        const orFilter = [
          targetUserId ? `page_key.eq.tg_stats_${targetUserId}` : '',
          targetUserName ? `page_key.eq.tg_stats_${targetUserName.trim().toLowerCase()}` : ''
        ].filter(Boolean).join(',');

        if (orFilter) {
          const { data: sRow } = await supabaseAdminClient
            .from('page_announcements')
            .select('message')
            .or(orFilter)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (sRow?.message) {
            statsData = JSON.parse(sRow.message);
          }
        }
      } catch {}
    }

    // Fallback to direct DB query on reels_cuts_26 & reels_ve_26 if statsData not cached
    if (!statsData && supabaseAdminClient && targetUserName) {
      try {
        const cleanU = targetUserName.trim().toLowerCase();
        const [{ data: cuts }, { data: ve }] = await Promise.all([
          supabaseAdminClient
            .from('reels_cuts_26')
            .select('code, editor, done, missing_details, problem, drive_final, creator, editor_notes')
            .ilike('editor', `%${cleanU}%`)
            .limit(100),
          supabaseAdminClient
            .from('reels_ve_26')
            .select('code, editor_col, done, missing_details, edit_check, notes')
            .ilike('editor_col', `%${cleanU}%`)
            .limit(100)
        ]);

        const allTasks = [...(cuts || []), ...(ve || [])];
        const myPending = allTasks.filter(t => !t.done && !t.problem && !t.edit_check);
        const myPriority = allTasks.filter(t => (t.missing_details === true) && !t.done);
        const myEdits = allTasks.filter(t => (t.problem === true || t.edit_check === true) && !t.done);
        const myCompleted = allTasks.filter(t => t.done === true);

        statsData = {
          userName: targetUserName,
          stats: {
            myPending: myPending.length,
            myPriority: myPriority.length,
            myEdits: myEdits.length,
            myCompleted: myCompleted.length,
            availableUnassigned: 0,
            myTotal: allTasks.length
          },
          pendingTasks: myPending.slice(0, 5).map(t => ({ code: t.code, notes: t.editor_notes || t.notes })),
          priorityTasks: myPriority.slice(0, 5).map(t => ({ code: t.code, notes: t.editor_notes || t.notes })),
          editTasks: myEdits.slice(0, 5).map(t => ({ code: t.code, notes: t.editor_notes || t.notes })),
          availableTasks: []
        };
      } catch {}
    }

    let responseMsg = '';

    if (text.includes('لسه') || text.includes('قيد العمل')) {
      const count = statsData?.stats?.myPending ?? 0;
      const list = (statsData?.pendingTasks || []).map((t: any, i: number) => {
        return `${i + 1}️⃣ <b>${t.code || t.title}</b>${t.sheet ? `\n📂 ${t.sheet}` : ''}${t.notes ? `\n📝 ${t.notes}` : ''}`;
      }).join('\n\n');

      responseMsg = [
        `⏳ <b>مهام قيد العمل (لسه متعملتش):</b> ${count} مهمة`,
        `━━━━━━━━━━━━━━━━━━━━`,
        list || (count === 0 ? `🎉 ممتاز! لا توجد مهام قيد العمل حالياً.` : `👉 راجع لوحة التحكم لتفاصيل كافة المهام`),
        `━━━━━━━━━━━━━━━━━━━━`,
        `🚀 <i>لوحة تحكم الخطة</i>`
      ].filter(Boolean).join('\n');

    } else if (text.includes('أولوية') || text.includes('اولوية')) {
      const count = statsData?.stats?.myPriority ?? 0;
      const list = (statsData?.priorityTasks || []).map((t: any, i: number) => {
        return `⚡ <b>${t.code || t.title}</b>${t.sheet ? `\n📂 ${t.sheet}` : ''}${t.notes ? `\n📝 ${t.notes}` : ''}`;
      }).join('\n\n');

      responseMsg = [
        `⚡ <b>المهام العاجلة (أولوية):</b> ${count} مهام`,
        `━━━━━━━━━━━━━━━━━━━━`,
        list || (count === 0 ? `✅ ممتاز! لا توجد أي مهام عاجلة متأخرة.` : `👉 يرجى إنجاز المهام العاجلة أولاً`),
        `━━━━━━━━━━━━━━━━━━━━`,
        `🚀 <i>لوحة تحكم الخطة</i>`
      ].filter(Boolean).join('\n');

    } else if (text.includes('إيديت') || text.includes('ايديت') || text.includes('تعديل')) {
      const count = statsData?.stats?.myEdits ?? 0;
      const list = (statsData?.editTasks || []).map((t: any, i: number) => {
        return `📝 <b>${t.code || t.title}</b>${t.notes ? `\n⚠️ ملاحظات التعديل: ${t.notes}` : ''}`;
      }).join('\n\n');

      responseMsg = [
        `📝 <b>تعديلات وملاحظات مطلوبة (اطلب إيديت):</b> ${count} مهام`,
        `━━━━━━━━━━━━━━━━━━━━`,
        list || (count === 0 ? `🎉 رائع! لا توجد أي طلبات تعديل على مهامك حالياً.` : `👉 يرجى مراجعة التعديلات وإنهائها`),
        `━━━━━━━━━━━━━━━━━━━━`,
        `🚀 <i>لوحة تحكم الخطة</i>`
      ].filter(Boolean).join('\n');

    } else if (text.includes('خلصت') || text.includes('منجزة')) {
      const count = statsData?.stats?.myCompleted ?? 0;
      responseMsg = [
        `✅ <b>المهام المنجزة (خلصت):</b> ${count} مهمة`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `🎉 عاش يا بطل! تم إنجاز وتسليم <b>${count}</b> مهمة بنجاح 🚀`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `🚀 <i>لوحة تحكم الخطة</i>`
      ].join('\n');

    } else if (text.includes('متاحة') || text.includes('استلام')) {
      const count = statsData?.stats?.availableUnassigned ?? 0;
      const list = (statsData?.availableTasks || []).map((t: any, i: number) => {
        return `📥 <b>${t.code || t.title}</b>${t.sheet ? ` (${t.sheet})` : ''}`;
      }).join('\n');

      responseMsg = [
        `📥 <b>المهام المتاحة للاستلام:</b> ${count} مهمة`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `📂 <b>الأقسام:</b> تجميعات • Cuts • Ve ✋`,
        list ? `\n${list}\n` : '',
        `👉 يمكنك فتح لوحة التحكم لاختيار واستلام المهام بنقرة واحدة!`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `🚀 <i>لوحة تحكم الخطة</i>`
      ].filter(Boolean).join('\n');

    } else {
      // Default summary for 'إجمالي مهامي', 'ملخص شامل', or any query
      const s = statsData?.stats || {};
      const name = statsData?.userName || targetUserName || 'المحرر';
      responseMsg = [
        `📊 <b>ملخص مهامك في لوحة تحكم الخطة</b>`,
        `👤 <b>المستخدم:</b> ${name}`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `⏳ <b>لسه متعملتش:</b> ${s.myPending ?? 0}`,
        `⚡ <b>أولوية:</b> ${s.myPriority ?? 0}`,
        `📝 <b>اطلب إيديت:</b> ${s.myEdits ?? 0}`,
        `✅ <b>خلصت:</b> ${s.myCompleted ?? 0}`,
        `📥 <b>مهام متاحة:</b> ${s.availableUnassigned ?? 0}`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `🎯 <b>إجمالي كافة مهامك:</b> ${s.myTotal ?? 0} مهمة`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `🚀 <i>لوحة تحكم الخطة التعليمية</i>`
      ].join('\n');
    }

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: responseMsg,
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [
            [{ text: '⏳ لسه متعملتش' }, { text: '⚡ أولوية' }],
            [{ text: '📝 اطلب إيديت' }, { text: '✅ خلصت' }],
            [{ text: '📥 مهام متاحة' }, { text: '👤 إجمالي مهامي' }],
            [{ text: '📊 ملخص شامل' }]
          ],
          resize_keyboard: true,
          is_persistent: true
        }
      })
    }).catch(() => {});

    return res.json({ ok: true });
  }

  return res.status(400).json({ error: 'Unrecognized request payload' });
}
