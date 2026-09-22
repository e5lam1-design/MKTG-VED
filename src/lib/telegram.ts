import { supabase } from './supabase';

const DEFAULT_BOT_TOKEN_KEY = 'telegram_bot_token';
const DEFAULT_BOT_USERNAME_KEY = 'telegram_bot_username';
const DASHBOARD_KEY_SETTINGS = 'system_settings';
const DASHBOARD_KEY_CHAT_IDS = 'telegram_chat_ids';
const DASHBOARD_KEY_USER_PHONES = 'user_phones';
const DASHBOARD_KEY_PHONE_TO_CHAT = 'phone_to_chat';
const DASHBOARD_KEY_EDITOR_MAP = 'telegram_editor_map';

export interface TelegramNotificationParams {
  chatId: string;
  taskTitle: string;
  taskCode?: string;
  driveLink?: string;
  editorName?: string;
  sourceSheet?: string;
  branch?: string;
  notes?: string;
  completedAt?: string;
}

/**
 * Normalizes phone numbers (removes spaces, dashes, +20 to 0)
 * Example: "+20 101-234-5678" -> "01012345678"
 */
export function cleanPhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  let digits = rawPhone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+20')) {
    digits = '0' + digits.slice(3);
  } else if (digits.startsWith('0020')) {
    digits = '0' + digits.slice(4);
  } else if (digits.startsWith('20') && digits.length === 12) {
    digits = '0' + digits.slice(2);
  }
  return digits;
}

export const DEFAULT_SYSTEM_BOT_TOKEN = '8995125962:AAFtthDhRXtVxnpf5TEpfhynx1XLl07X6tA';
export const DEFAULT_SYSTEM_BOT_USERNAME = 'Kheta_notify_bot';

/**
 * Retrieve the Telegram Bot Token
 */
export async function getTelegramBotToken(): Promise<string> {
  const localToken = localStorage.getItem(DEFAULT_BOT_TOKEN_KEY);
  if (localToken && localToken.trim().length > 10) return localToken.trim();

  try {
    const { data } = await supabase
      .from('dashboard_data')
      .select('value')
      .eq('key', 'telegram_bot_token')
      .maybeSingle();

    if (data?.value && data.value.trim().length > 10) {
      localStorage.setItem(DEFAULT_BOT_TOKEN_KEY, data.value.trim());
      return data.value.trim();
    }
  } catch (err) {
    console.warn('[Telegram] Could not fetch bot token from dashboard_data:', err);
  }

  const envToken = (import.meta as any).env?.VITE_TELEGRAM_BOT_TOKEN;
  if (envToken && typeof envToken === 'string' && envToken.trim().length > 10) {
    return envToken.trim();
  }

  return DEFAULT_SYSTEM_BOT_TOKEN;
}

/**
 * Save Telegram Bot Token
 */
export async function saveTelegramBotToken(token: string, updatedBy?: string): Promise<boolean> {
  const cleanToken = token.trim();
  localStorage.setItem(DEFAULT_BOT_TOKEN_KEY, cleanToken);

  try {
    await supabase.from('dashboard_data').upsert([
      {
        key: DASHBOARD_KEY_SETTINGS,
        field: 'telegram_bot_token',
        value: cleanToken,
        updated_by: updatedBy || 'admin',
        updated_at: new Date().toISOString()
      }
    ], { onConflict: 'key,field' });
    return true;
  } catch (err) {
    console.error('[Telegram] Failed to save bot token:', err);
    return false;
  }
}

/**
 * Retrieve Bot Username (e.g. ElkhettaTasksBot)
 */
export async function getTelegramBotUsername(): Promise<string> {
  const localUname = localStorage.getItem(DEFAULT_BOT_USERNAME_KEY);
  if (localUname && localUname.trim()) return localUname.trim().replace(/^@/, '');

  try {
    const { data } = await supabase
      .from('dashboard_data')
      .select('value')
      .eq('key', 'telegram_bot_username')
      .maybeSingle();

    if (data?.value && data.value.trim()) {
      const u = data.value.trim().replace(/^@/, '');
      localStorage.setItem(DEFAULT_BOT_USERNAME_KEY, u);
      return u;
    }
  } catch {
    // ignore
  }

  const envUname = (import.meta as any).env?.VITE_TELEGRAM_BOT_USERNAME;
  if (envUname) return String(envUname).trim().replace(/^@/, '');

  return DEFAULT_SYSTEM_BOT_USERNAME;
}

/**
 * Save Bot Username
 */
export async function saveTelegramBotUsername(username: string, updatedBy?: string): Promise<boolean> {
  const cleanU = username.trim().replace(/^@/, '');
  localStorage.setItem(DEFAULT_BOT_USERNAME_KEY, cleanU);

  try {
    await supabase.from('dashboard_data').upsert([
      {
        key: DASHBOARD_KEY_SETTINGS,
        field: 'telegram_bot_username',
        value: cleanU,
        updated_by: updatedBy || 'admin',
        updated_at: new Date().toISOString()
      }
    ], { onConflict: 'key,field' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieve user's phone number
 */
export async function getUserPhone(userId?: string, userName?: string): Promise<string> {
  if (!userId && !userName) return '';

  if (userId) {
    const localPhone = localStorage.getItem(`user_phone_${userId}`);
    if (localPhone && localPhone.trim()) return localPhone.trim();
  }

  // Check user_profiles table
  if (userId) {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('phone' as any)
        .eq('id', userId)
        .maybeSingle();

      if (data && (data as any).phone) {
        const p = cleanPhoneNumber(String((data as any).phone));
        if (p) {
          localStorage.setItem(`user_phone_${userId}`, p);
          return p;
        }
      }
    } catch {
      // Column might not exist yet
    }
  }

  // Check dashboard_data
  if (userId) {
    try {
      const { data } = await supabase
        .from('dashboard_data')
        .select('value')
        .eq('key', DASHBOARD_KEY_USER_PHONES)
        .eq('field', userId)
        .maybeSingle();

      if (data?.value) {
        const p = cleanPhoneNumber(String(data.value));
        if (p) {
          localStorage.setItem(`user_phone_${userId}`, p);
          return p;
        }
      }
    } catch {}
  }

  return '';
}

/**
 * Save user's phone number in user_profiles and dashboard_data
 */
export async function saveUserPhone(
  userId: string,
  userName: string,
  rawPhone: string
): Promise<{ success: boolean; error?: string }> {
  const phone = cleanPhoneNumber(rawPhone);
  if (!phone || phone.length < 9) {
    return { success: false, error: 'يرجى إدخال رقم هاتف صحيح (مثال: 01012345678)' };
  }

  localStorage.setItem(`user_phone_${userId}`, phone);
  if (userName) {
    localStorage.setItem(`editor_phone_${userName.trim().toLowerCase()}`, phone);
  }

  let savedAny = false;

  // 1. Try update user_profiles directly
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        phone: phone,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', userId);

    if (!error) savedAny = true;
  } catch {
    // column might not exist yet
  }

  // 2. Persist in dashboard_data for 100% guarantee
  try {
    await supabase.from('dashboard_data').upsert([
      {
        key: DASHBOARD_KEY_USER_PHONES,
        field: userId,
        value: phone,
        updated_by: userName || userId,
        updated_at: new Date().toISOString()
      },
      {
        key: 'phone_to_user',
        field: phone,
        value: userId,
        updated_by: userName || userId,
        updated_at: new Date().toISOString()
      }
    ], { onConflict: 'key,field' });

    if (userName) {
      await supabase.from('dashboard_data').upsert([
        {
          key: 'editor_phones',
          field: userName.trim().toLowerCase(),
          value: phone,
          updated_by: userName || userId,
          updated_at: new Date().toISOString()
        }
      ], { onConflict: 'key,field' });
    }

    savedAny = true;
  } catch (err: any) {
    console.error('[Telegram] Failed to save phone in dashboard_data:', err);
    if (!savedAny) {
      return { success: false, error: err?.message || 'فشل حفظ رقم الهاتف' };
    }
  }

  return { success: true };
}

/**
 * Check if the user has an active linked Telegram Chat ID
 */
export async function getUserTelegramChatId(userId?: string, userName?: string): Promise<string> {
  if (!userId && !userName) return '';

  const cleanName = userName ? userName.trim().toLowerCase() : '';

  // 1. Check localStorage first
  if (userId) {
    const localId = localStorage.getItem(`tg_chat_${userId}`);
    if (localId && localId.trim()) return localId.trim();
  }
  if (cleanName) {
    const localNameId = localStorage.getItem(`tg_chat_name_${cleanName}`);
    if (localNameId && localNameId.trim()) return localNameId.trim();
  }

  // 2. Check page_announcements (100% accessible to client-side anon key without RLS issues)
  if (userId) {
    try {
      const { data } = await supabase
        .from('page_announcements')
        .select('message')
        .eq('page_key', `tg_chat_${userId}`)
        .maybeSingle();

      if (data?.message && data.message.trim()) {
        const idStr = String(data.message).trim();
        localStorage.setItem(`tg_chat_${userId}`, idStr);
        return idStr;
      }
    } catch {}
  }

  if (cleanName) {
    try {
      const { data } = await supabase
        .from('page_announcements')
        .select('message')
        .eq('page_key', `tg_editor_${cleanName}`)
        .maybeSingle();

      if (data?.message && data.message.trim()) {
        const idStr = String(data.message).trim();
        localStorage.setItem(`tg_chat_name_${cleanName}`, idStr);
        return idStr;
      }
    } catch {}
  }

  // 3. Check user_profiles directly (if column exists)
  if (userId) {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('telegram_chat_id' as any)
        .eq('id', userId)
        .maybeSingle();

      if (data && (data as any).telegram_chat_id) {
        const idStr = String((data as any).telegram_chat_id).trim();
        localStorage.setItem(`tg_chat_${userId}`, idStr);
        return idStr;
      }
    } catch {}
  }

  // 4. Check dashboard_data by userId
  if (userId) {
    try {
      const { data } = await supabase
        .from('dashboard_data')
        .select('value')
        .eq('key', `tg_chat_${userId}`)
        .maybeSingle();

      if (data?.value) {
        const idStr = String(data.value).trim();
        localStorage.setItem(`tg_chat_${userId}`, idStr);
        return idStr;
      }
    } catch {}
  }

  // 5. Check by editor name in dashboard_data
  if (cleanName) {
    try {
      const { data } = await supabase
        .from('dashboard_data')
        .select('value')
        .eq('key', `tg_editor_${cleanName}`)
        .maybeSingle();

      if (data?.value) {
        return String(data.value).trim();
      }
    } catch {}
  }

  // 6. Direct fallback for Eslam / Admin account (verified Telegram chat ID)
  if (
    userId === '7e04dea1-ec83-4439-a541-13fc3ce79885' ||
    cleanName === 'admin' ||
    cleanName === 'eslam' ||
    cleanName === 'eslam abdalhamid' ||
    cleanName.includes('eslam')
  ) {
    const verifiedChatId = '1288848720';
    if (userId) localStorage.setItem(`tg_chat_${userId}`, verifiedChatId);
    if (cleanName) localStorage.setItem(`tg_chat_name_${cleanName}`, verifiedChatId);
    return verifiedChatId;
  }

  return '';
}

/**
 * Generate 1-click deep link to start the Telegram bot
 * When user taps "Start" in Telegram, Telegram sends `/start <userId>` to the bot!
 */
export function getTelegramDeepLink(botUsername: string, userId?: string): string {
  const cleanUser = botUsername.trim().replace(/^@/, '');
  const param = (userId || '').slice(0, 64);
  if (!cleanUser) return '';
  return `https://t.me/${cleanUser}?start=${param}`;
}

/**
 * Save user's Telegram Chat ID in both page_announcements, user_profiles & fallback storage
 */
export async function saveUserTelegramChatId(
  userId: string,
  userName: string,
  chatId: string
): Promise<{ success: boolean; error?: string }> {
  const cleanId = chatId.trim();
  const cleanName = userName ? userName.trim().toLowerCase() : '';

  localStorage.setItem(`tg_chat_${userId}`, cleanId);
  if (cleanName) {
    localStorage.setItem(`tg_chat_name_${cleanName}`, cleanId);
  }

  let savedAny = false;

  // 1. Save in page_announcements (guaranteed accessible to client without RLS restriction)
  try {
    const p1 = supabase.from('page_announcements').upsert({
      page_key: `tg_chat_${userId}`,
      page_label: 'telegram_chat_id',
      message: cleanId,
      type: 'info',
      is_active: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'page_key' });

    let p2 = Promise.resolve();
    if (cleanName) {
      p2 = supabase.from('page_announcements').upsert({
        page_key: `tg_editor_${cleanName}`,
        page_label: 'telegram_chat_id',
        message: cleanId,
        type: 'info',
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'page_key' }) as any;
    }

    await Promise.all([p1, p2]);
    savedAny = true;
  } catch (e) {
    console.warn('[Telegram] page_announcements fallback error:', e);
  }

  // 2. Try update user_profiles
  try {
    const { error: profileErr } = await supabase
      .from('user_profiles')
      .update({
        telegram_chat_id: cleanId,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', userId);

    if (!profileErr) savedAny = true;
  } catch {}

  // 3. Try update dashboard_data
  try {
    const payload: any[] = [
      {
        key: `tg_chat_${userId}`,
        field: 'chat_id',
        value: cleanId,
        updated_at: new Date().toISOString()
      }
    ];

    if (cleanName) {
      payload.push({
        key: `tg_editor_${cleanName}`,
        field: cleanName,
        value: cleanId,
        updated_at: new Date().toISOString()
      });
    }

    await supabase.from('dashboard_data').upsert(payload, { onConflict: 'key' });
    savedAny = true;
  } catch (err: any) {
    if (!savedAny) {
      return { success: false, error: err?.message || 'فشل حفظ معرف تليجرام' };
    }
  }

  return { success: true };
}

/**
 * Send raw message via Telegram Bot API
 */
export async function sendTelegramMessage(
  token: string,
  chatId: string,
  htmlText: string
): Promise<{ ok: boolean; error?: string }> {
  if (!token) {
    return { ok: false, error: 'لم يتم إعداد توكن بوت تليجرام (Bot Token) بعد' };
  }
  if (!chatId) {
    return { ok: false, error: 'معرف تليجرام (Chat ID) غير متوفر' };
  }

  // 1. Try local proxy / serverless
  try {
    const apiRes = await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, chatId, text: htmlText })
    });
    if (apiRes.ok) {
      const json = await apiRes.json().catch(() => ({}));
      if (json.ok) return { ok: true };
    }
  } catch {}

  // 2. Direct Telegram API call
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlText,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      const errMsg = data.description || `HTTP ${res.status}`;
      return { ok: false, error: errMsg };
    }

    return { ok: true };
  } catch (err: any) {
    console.error('[Telegram] Error sending message:', err);
    return { ok: false, error: err?.message || 'خطأ في الاتصال بتليجرام' };
  }
}

/**
 * Send test message to confirm connection
 */
export async function sendTestTelegramMessage(
  token: string,
  chatId: string,
  userName?: string
): Promise<{ ok: boolean; error?: string }> {
  const time = new Date().toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const msg = [
    `🔔 <b>تجربة إشعار تليجرام ناجحة!</b> 🎉`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `👤 <b>المستخدم:</b> ${userName || 'المستخدم'}`,
    `🕒 <b>الوقت:</b> ${time}`,
    `✅ <b>الحالة:</b> البوت متصل وجاهز لإرسال تفاصيل المهام وروابطها فور إتمامها! 🚀`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `<i>لوحة تحكم الخطة التعليمية — ميزة تجريبية</i>`
  ].join('\n');

  return sendTelegramMessage(token, chatId, msg);
}

/**
 * Format and send task completion notification
 */
export async function notifyTaskCompleted(
  params: TelegramNotificationParams,
  overrideToken?: string
): Promise<{ ok: boolean; error?: string }> {
  const token = overrideToken || (await getTelegramBotToken());
  if (!token) {
    return { ok: false, error: 'توكن البوت غير موجود' };
  }

  const timeStr = params.completedAt
    ? new Date(params.completedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  const dateStr = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const lines = [
    `🎬 <b>تم إنجاز مهمة جديدة بنجاح!</b> ✅`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📌 <b>اسم التاسك:</b> ${escapeHtml(params.taskTitle || 'بدون عنوان')}`,
    params.taskCode ? `🔢 <b>الكود:</b> <code>${escapeHtml(params.taskCode)}</code>` : '',
    params.sourceSheet ? `📂 <b>القسم:</b> ${escapeHtml(params.sourceSheet)}` : '',
    params.branch ? `🏢 <b>الفرع:</b> ${escapeHtml(params.branch)}` : '',
    params.editorName ? `👤 <b>المحرر / المونتير:</b> ${escapeHtml(params.editorName)}` : '',
    `🕒 <b>وقت الإنجاز:</b> ${timeStr} (${dateStr})`,
    params.notes ? `📝 <b>ملاحظات:</b> ${escapeHtml(params.notes)}` : '',
    `━━━━━━━━━━━━━━━━━━━━`,
    params.driveLink && params.driveLink.startsWith('http')
      ? `🔗 <b>الرابط النهائي / الدرايف:</b>\n👉 <a href="${params.driveLink}">${params.driveLink}</a>`
      : params.driveLink
      ? `🔗 <b>الرابط:</b> ${escapeHtml(params.driveLink)}`
      : `⚠️ <i>لم يتم إرفاق رابط نهائي في المهمة</i>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🚀 <i>لوحة تحكم الخطة التعليمية</i>`
  ].filter(Boolean);

  const htmlText = lines.join('\n');
  return sendTelegramMessage(token, params.chatId, htmlText);
}

/**
 * Format and send task edit/problem notification
 */
export async function notifyTaskEditRequested(
  params: TelegramNotificationParams,
  overrideToken?: string
): Promise<{ ok: boolean; error?: string }> {
  const token = overrideToken || (await getTelegramBotToken());
  if (!token) {
    return { ok: false, error: 'توكن البوت غير موجود' };
  }

  const timeStr = params.completedAt
    ? new Date(params.completedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  const dateStr = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const lines = [
    `⚠️ <b>تنبيه: مطلوب تعديل على مهمتك!</b> 📝`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📌 <b>اسم التاسك:</b> ${escapeHtml(params.taskTitle || 'بدون عنوان')}`,
    params.taskCode ? `🔢 <b>الكود:</b> <code>${escapeHtml(params.taskCode)}</code>` : '',
    params.sourceSheet ? `📂 <b>القسم:</b> ${escapeHtml(params.sourceSheet)}` : '',
    params.branch ? `🏢 <b>الفرع:</b> ${escapeHtml(params.branch)}` : '',
    params.editorName ? `👤 <b>المحرر / المونتير:</b> ${escapeHtml(params.editorName)}` : '',
    `🕒 <b>الوقت:</b> ${timeStr} (${dateStr})`,
    params.notes ? `📝 <b>تفاصيل التعديل / الملاحظات:</b>\n<i>${escapeHtml(params.notes)}</i>` : '',
    `━━━━━━━━━━━━━━━━━━━━`,
    params.driveLink && params.driveLink.startsWith('http')
      ? `🔗 <b>رابط المهمة / العمل:</b>\n👉 <a href="${params.driveLink}">${params.driveLink}</a>`
      : params.driveLink
      ? `🔗 <b>الرابط:</b> ${escapeHtml(params.driveLink)}`
      : '',
    `━━━━━━━━━━━━━━━━━━━━`,
    `🚀 <i>لوحة تحكم الخطة التعليمية — إشعار تعديل</i>`
  ].filter(Boolean);

  const htmlText = lines.join('\n');
  return sendTelegramMessage(token, params.chatId, htmlText);
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
