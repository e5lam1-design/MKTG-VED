import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Send, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  Share2, 
  MessageCircle, 
  RefreshCw,
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { toast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { getUserTelegramChatId, sendTestTelegramMessage, getTelegramBotToken } from '../lib/telegram';

interface TelegramQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string;
    username?: string;
    role?: string;
    telegram_chat_id?: string;
  } | null;
  botUsername?: string;
}

export const TelegramQrModal: React.FC<TelegramQrModalProps> = ({
  isOpen,
  onClose,
  user,
  botUsername = 'Kheta_notify_bot'
}) => {
  const [copied, setCopied] = useState(false);
  const [chatId, setChatId] = useState<string>('');
  const [loadingChatId, setLoadingChatId] = useState(false);
  const [testingMsg, setTestingMsg] = useState(false);
  const [qrLoaded, setQrLoaded] = useState(false);

  const cleanBot = (botUsername || 'Kheta_notify_bot').replace(/^@/, '');
  const userPayload = user?.id || user?.username || 'user';
  const telegramLink = `https://t.me/${cleanBot}?start=${userPayload}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(telegramLink)}&margin=1`;

  // Fetch or verify chat ID when opened + Realtime listener
  useEffect(() => {
    if (!isOpen || !user?.id) return;
    setChatId(user.telegram_chat_id || '');
    setLoadingChatId(true);

    getUserTelegramChatId(user.id, user.name).then((id) => {
      if (id) setChatId(id);
      setLoadingChatId(false);
    }).catch(() => setLoadingChatId(false));

    // 1. Supabase Realtime subscription for instant 100ms detection
    const channel = supabase
      .channel(`tg-modal-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'page_announcements'
        },
        (payload) => {
          const key = (payload.new as any)?.page_key || (payload.old as any)?.page_key;
          if (key === `tg_chat_${user.id}` || key === `tg_editor_${user.name?.trim().toLowerCase()}`) {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const newChatId = String((payload.new as any)?.message || '').trim();
              if (newChatId && newChatId !== chatId) {
                setChatId(newChatId);
                toast.success(`🎉 تم ربط حساب (${user.name}) بتليجرام بنجاح!`);
              }
            } else if (payload.eventType === 'DELETE') {
              setChatId('');
            }
          }
        }
      )
      .subscribe();

    // 2. Fast 1.5s fallback polling while modal is open
    const interval = setInterval(async () => {
      const liveId = await getUserTelegramChatId(user.id, user.name);
      if (liveId !== chatId) {
        setChatId(liveId);
        if (liveId && !chatId) {
          toast.success(`🎉 تم ربط حساب (${user.name}) بتليجرام بنجاح!`);
        }
      }
    }, 1500);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [isOpen, user?.id, user?.name, chatId]);

  if (!isOpen || !user) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(telegramLink);
    setCopied(true);
    toast.success('تم نسخ الرابط المخصص للمستخدم بنجاح!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const text = `👋 أهلاً ${user.name}،\n\nيرجى فتح الرابط التالي والضغط على زر Start لربط حسابك وتلقي إشعارات المهام والتعديلات تلقائياً على تليجرام:\n🔗 ${telegramLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleTestMessage = async () => {
    if (!chatId) {
      toast.error('لم يتم ربط الحساب بعد لإرسال رسالة تجريبية');
      return;
    }
    setTestingMsg(true);
    try {
      const token = await getTelegramBotToken();
      const res = await sendTestTelegramMessage(token, chatId, user.name);
      if (res.ok) {
        toast.success(`🎉 تم إرسال رسالة تجريبية إلى تليجرام ${user.name} بنجاح!`);
      } else {
        toast.error(`تعذر الإرسال: ${res.error || 'تأكد من بدء المحادثة مع البوت'}`);
      }
    } catch (e: any) {
      toast.error(e.message || 'خطأ في الإرسال');
    } finally {
      setTestingMsg(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-[#0a0e14] border border-sky-500/30 rounded-3xl p-6 shadow-2xl overflow-hidden z-10"
          dir="rtl"
        >
          {/* Header Accent Glow */}
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all cursor-pointer"
          >
            <X size={16} />
          </button>

          {/* Header Title */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/30 shrink-0">
              <Send size={22} className="translate-x-[-1px] translate-y-[1px]" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>ربط تليجرام للمستخدم</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {user.role || 'عضو'}
                </span>
              </h3>
              <p className="text-xs text-sky-200/70 font-bold mt-0.5">{user.name}</p>
            </div>
          </div>

          {/* Connection Status Badge */}
          <div className={`p-3 rounded-2xl border mb-5 flex items-center justify-between gap-3 ${
            chatId 
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
              : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${chatId ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
              <span className="text-xs font-bold">
                {chatId ? 'الحساب مربوط بنجاح ومتصل 🟢' : 'بانتظار المسح أو الضغط على الرابط 🟡'}
              </span>
            </div>
            {chatId && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-200">
                {chatId}
              </span>
            )}
          </div>

          {/* QR Code Card */}
          <div className="flex flex-col items-center justify-center p-4 bg-white/[0.02] border border-white/10 rounded-2xl mb-5">
            <div className="relative w-48 h-48 bg-white p-2.5 rounded-2xl shadow-xl border border-sky-400/30 flex items-center justify-center overflow-hidden">
              <img
                src={qrCodeUrl}
                alt="Telegram QR Code"
                onLoad={() => setQrLoaded(true)}
                className={`w-full h-full object-contain transition-opacity duration-300 ${qrLoaded ? 'opacity-100' : 'opacity-20'}`}
              />
              {!qrLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <RefreshCw size={24} className="animate-spin text-sky-600" />
                </div>
              )}
            </div>
            <p className="text-[11px] text-white/60 font-bold mt-3 text-center">
              امسح الكود بكاميرا الموبايل لفتح تليجرام والربط فوراً 📱
            </p>
          </div>

          {/* Personal Deep Link Box */}
          <div className="space-y-1.5 mb-5">
            <label className="text-[10px] font-bold text-white/50 block">الرابط المباشر للربط (Deep Link)</label>
            <div className="flex items-center gap-2 bg-[#06090e] border border-white/10 rounded-xl p-1.5 pl-3">
              <input
                type="text"
                readOnly
                value={telegramLink}
                className="bg-transparent text-sky-300 text-xs font-mono font-bold flex-1 outline-none select-all truncate"
                dir="ltr"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copied ? 'تم النسخ!' : 'نسخ'}</span>
              </button>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <a
              href={telegramLink}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 transition-all cursor-pointer"
            >
              <ExternalLink size={14} />
              <span>فتح في تليجرام</span>
            </a>

            <button
              onClick={handleWhatsAppShare}
              className="px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <MessageCircle size={14} />
              <span>إرسال عبر واتساب</span>
            </button>
          </div>

          {/* Test message button if linked */}
          {chatId && (
            <button
              onClick={handleTestMessage}
              disabled={testingMsg}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sky-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {testingMsg ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
              <span>إرسال إشعار تجريبي لهذا المستخدم 🧪</span>
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
