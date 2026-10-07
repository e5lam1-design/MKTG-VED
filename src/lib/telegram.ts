/**
 * Telegram Integration Module (Disabled per user request)
 * All features, background syncs, queries and notifications are neutralized
 * to ensure zero resource/quota consumption.
 */

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
  statusLabel?: string;
}

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

export const DEFAULT_SYSTEM_BOT_TOKEN = '';
export const DEFAULT_SYSTEM_BOT_USERNAME = '';

export async function getTelegramBotToken(): Promise<string> {
  return '';
}

export async function saveTelegramBotToken(_token: string, _updatedBy?: string): Promise<boolean> {
  return true;
}

export async function getTelegramBotUsername(): Promise<string> {
  return '';
}

export async function saveTelegramBotUsername(_username: string, _updatedBy?: string): Promise<boolean> {
  return true;
}

export async function getUserPhone(_userId?: string, _userName?: string): Promise<string> {
  return '';
}

export async function saveUserPhone(
  _userId: string,
  _phone: string,
  _userName?: string,
  _updatedBy?: string
): Promise<boolean> {
  return true;
}

export async function getUserTelegramChatId(_userId?: string, _userName?: string): Promise<string> {
  return '';
}

export interface TelegramActivationRecord {
  chatId: string;
  source: string;
  updatedAt: string;
  activatedAt?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export async function getAllTelegramActivations(): Promise<Record<string, TelegramActivationRecord>> {
  return {};
}

export async function unlinkUserTelegram(_userId?: string, _userName?: string): Promise<boolean> {
  return true;
}

export function getTelegramDeepLink(_botUsername: string, _userId?: string): string {
  return '';
}

export async function saveUserTelegramChatId(
  _userId: string,
  _chatId: string,
  _userName?: string,
  _updatedBy?: string,
  _metadata?: any
): Promise<boolean> {
  return true;
}

export async function sendTelegramMessage(
  _botToken: string,
  _chatId: string,
  _text: string,
  _options?: any
): Promise<{ ok: boolean; error?: string }> {
  return { ok: true };
}

export async function sendTestTelegramMessage(
  _botToken: string,
  _chatId: string,
  _userName?: string
): Promise<{ ok: boolean; error?: string }> {
  return { ok: true };
}

export async function notifyTaskCompleted(
  _params: TelegramNotificationParams
): Promise<{ ok: boolean; error?: string }> {
  return { ok: true };
}

export async function notifyTaskEditRequested(
  _params: any
): Promise<{ ok: boolean; error?: string }> {
  return { ok: true };
}

export async function notifyHardDriveRequest(
  _params: any
): Promise<{ ok: boolean; error?: string }> {
  return { ok: true };
}

export async function notifyHardDriveDecision(
  _params: any
): Promise<{ ok: boolean; error?: string }> {
  return { ok: true };
}
