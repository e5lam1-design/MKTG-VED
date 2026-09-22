import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Send, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  MessageCircle, 
  RefreshCw,
  Users,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  ArrowRight,
  Shield,
  Smartphone
} from 'lucide-react';
import { toast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { usePresence } from '../contexts/PresenceContext';
import { 
  getUserTelegramChatId, 
  sendTestTelegramMessage, 
  getTelegramBotToken,
  getAllTelegramActivations,
  unlinkUserTelegram,
  type TelegramActivationRecord
} from '../lib/telegram';

export interface TelegramUser {
  id: string;
  name: string;
  username?: string;
  email?: string;
  role?: string;
  is_active?: boolean;
  telegram_chat_id?: string;
  team?: string;
}

interface TelegramQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: TelegramUser | null;
  botUsername?: string;
  initialTab?: 'my_qr' | 'team_tracker';
  allUsers?: TelegramUser[];
}

export const TelegramQrModal: React.FC<TelegramQrModalProps> = ({
  isOpen,
  onClose,
  user: initialUser,
  botUsername = 'Kheta_notify_bot',
  initialTab = 'my_qr',
  allUsers: propAllUsers
}) => {
  const [activeTab, setActiveTab] = useState<'my_qr' | 'team_tracker'>(initialTab);
  const [selectedUser, setSelectedUser] = useState<TelegramUser | null>(initialUser);
  const [teamUsers, setTeamUsers] = useState<TelegramUser[]>(propAllUsers || []);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [activations, setActivations] = useState<Record<string, TelegramActivationRecord>>({});
  
  // Single User Tab state
  const [copied, setCopied] = useState(false);
  const [chatId, setChatId] = useState<string>('');
  const [loadingChatId, setLoadingChatId] = useState(false);
  const [testingMsg, setTestingMsg] = useState(false);
  const [testingUserId, setTestingUserId] = useState<string | null>(null);
  const [unlinkingUserId, setUnlinkingUserId] = useState<string | null>(null);
  const [qrLoaded, setQrLoaded] = useState(false);

  // Tracker Tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'connected' | 'not_connected' | 'online'>('all');
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const { isUserOnline, onlineCount } = usePresence();

  // Sync selected user and initial tab when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedUser(initialUser);
      setActiveTab(initialTab);
    }
  }, [isOpen, initialUser, initialTab]);

  // Clean Bot Username
  const cleanBot = (botUsername || 'Kheta_notify_bot').replace(/^@/, '');

  // Helper to get deep link for any user
  const getUserDeepLink = (u: TelegramUser | null) => {
    if (!u) return `https://t.me/${cleanBot}`;
    const payload = u.id || u.username || u.name;
    return `https://t.me/${cleanBot}?start=${encodeURIComponent(payload)}`;
  };

  const activeLink = getUserDeepLink(selectedUser);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(activeLink)}&margin=1`;

  // Fetch Team Users if not supplied
  const fetchTeamUsers = async () => {
    if (propAllUsers && propAllUsers.length > 0) {
      setTeamUsers(propAllUsers);
      return;
    }
    setLoadingUsers(true);
    try {
      // 1. Try Supabase user_profiles
      const { data: dbData, error } = await supabase
        .from('user_profiles')
        .select('id, name, username, email, role, is_active')
        .order('name');

      if (!error && dbData && dbData.length > 0) {
        setTeamUsers(dbData as TelegramUser[]);
      } else {
        // 2. Try /api/users
        const res = await fetch('/api/users').catch(() => null);
        if (res && res.ok) {
          const json = await res.json().catch(() => ({}));
          if (Array.isArray(json.users) && json.users.length > 0) {
            setTeamUsers(json.users);
          }
        }
      }
    } catch (e) {
      console.warn('[TelegramQrModal] Failed to fetch team users:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch all live activations
  const fetchActivations = async () => {
    try {
      const map = await getAllTelegramActivations();
      setActivations(map);
    } catch (e) {
      console.warn('[TelegramQrModal] fetchActivations error:', e);
    }
  };

  // On modal open: fetch users + activations + set up realtime
  useEffect(() => {
    if (!isOpen) return;

    fetchTeamUsers();
    fetchActivations();

    // 1. Supabase Realtime for instant updates on page_announcements
    const channel = supabase
      .channel('tg-activations-tracker')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'page_announcements' },
        (payload) => {
          const key = (payload.new as any)?.page_key || (payload.old as any)?.page_key || '';
          if (key.startsWith('tg_')) {
            fetchActivations();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dashboard_data' },
        (payload) => {
          const key = (payload.new as any)?.key || (payload.old as any)?.key || '';
          if (key.includes('telegram') || key.startsWith('tg_')) {
            fetchActivations();
          }
        }
      )
      .subscribe();

    // 2. Polling interval every 3s as guaranteed fallback
    const interval = setInterval(() => {
      fetchActivations();
    }, 3000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [isOpen]);

  // Sync selected user's chat ID
  useEffect(() => {
    if (!isOpen || !selectedUser?.id) return;

    // Check pre-loaded activations first
    const fromMap = activations[selectedUser.id] || activations[selectedUser.name?.trim().toLowerCase()];
    if (fromMap?.chatId) {
      setChatId(fromMap.chatId);
      return;
    }

    setLoadingChatId(true);
    getUserTelegramChatId(selectedUser.id, selectedUser.name)
      .then((id) => {
        setChatId(id || '');
        setLoadingChatId(false);
      })
      .catch(() => setLoadingChatId(false));
  }, [isOpen, selectedUser?.id, selectedUser?.name, activations]);

  // Helper to check user connection status
  const getUserStatus = (u: TelegramUser) => {
    const cleanName = u.name ? u.name.trim().toLowerCase() : '';
    const record = activations[u.id] || (cleanName ? activations[cleanName] : undefined);
    const isConnected = !!(record?.chatId || u.telegram_chat_id);
    const resolvedChatId = record?.chatId || u.telegram_chat_id || '';
    return {
      isConnected,
      chatId: resolvedChatId,
      updatedAt: record?.updatedAt
    };
  };

  // Metrics Calculation
  const stats = useMemo(() => {
    const total = teamUsers.length;
    let connected = 0;
    teamUsers.forEach((u) => {
      if (getUserStatus(u).isConnected) connected++;
    });
    const notConnected = Math.max(0, total - connected);
    const percentage = total > 0 ? Math.round((connected / total) * 100) : 0;
    return { total, connected, notConnected, percentage };
  }, [teamUsers, activations]);

  // Filtered Team Users
  const filteredUsers = useMemo(() => {
    return teamUsers.filter((u) => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = 
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q);

      if (!matchSearch) return false;

      const { isConnected } = getUserStatus(u);
      const isOnline = isUserOnline(u.id, u.name);
      if (statusFilter === 'connected') return isConnected;
      if (statusFilter === 'not_connected') return !isConnected;
      if (statusFilter === 'online') return isOnline;
      return true;
    });
  }, [teamUsers, searchQuery, statusFilter, activations, isUserOnline]);

  if (!isOpen) return null;

  // Handlers
  const handleCopyUserLink = (u: TelegramUser) => {
    const link = getUserDeepLink(u);
    navigator.clipboard.writeText(link);
    setCopiedUserId(u.id);
    toast.success(`تم نسخ رابط التفعيل لـ (${u.name}) بنجاح! 📋`);
    setTimeout(() => setCopiedUserId(null), 2500);
  };

  const handleCopySelectedLink = () => {
    navigator.clipboard.writeText(activeLink);
    setCopied(true);
    toast.success('تم نسخ الرابط المخصص للمستخدم بنجاح!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = (u: TelegramUser) => {
    const link = getUserDeepLink(u);
    const text = `👋 أهلاً ${u.name}،\n\nيرجى فتح الرابط التالي والضغط على زر Start لربط حسابك وتلقي إشعارات المهام والتعديلات تلقائياً على تليجرام:\n🔗 ${link}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSendTest = async (u: TelegramUser, targetChatId?: string) => {
    const cId = targetChatId || chatId;
    if (!cId || cId === 'متصل بالبوت') {
      toast.error('لم يتم تحديد Chat ID صحيح لهذا المستخدم بعد');
      return;
    }
    setTestingUserId(u.id);
    setTestingMsg(true);
    try {
      const token = await getTelegramBotToken();
      const res = await sendTestTelegramMessage(token, cId, u.name);
      if (res.ok) {
        toast.success(`🎉 تم إرسال رسالة تجريبية إلى تليجرام (${u.name}) بنجاح!`);
      } else {
        toast.error(`تعذر الإرسال: ${res.error || 'تأكد من بدء المحادثة مع البوت'}`);
      }
    } catch (e: any) {
      toast.error(e.message || 'خطأ في الإرسال');
    } finally {
      setTestingUserId(null);
      setTestingMsg(false);
    }
  };

  const handleUnlink = async (u: TelegramUser) => {
    if (!confirm(`هل أنت متأكد من رغبتك في إلغاء ربط تليجرام للمستخدم (${u.name})؟`)) return;
    setUnlinkingUserId(u.id);
    try {
      await unlinkUserTelegram(u.id, u.name);
      // Clean local state immediately
      setActivations((prev) => {
        const next = { ...prev };
        delete next[u.id];
        if (u.name) delete next[u.name.trim().toLowerCase()];
        return next;
      });
      if (selectedUser?.id === u.id) {
        setChatId('');
      }
      toast.success(`تم إلغاء ربط حساب (${u.name}) من تليجرام بنجاح`);
    } catch (e: any) {
      toast.error(e.message || 'فشل إلغاء الربط');
    } finally {
      setUnlinkingUserId(null);
    }
  };

  const switchToUserQr = (u: TelegramUser) => {
    setSelectedUser(u);
    setActiveTab('my_qr');
    setQrLoaded(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={`relative w-full ${activeTab === 'team_tracker' ? 'max-w-3xl' : 'max-w-md'} bg-[#0a0e14] border border-sky-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden z-10 transition-all duration-300`}
          dir="rtl"
        >
          {/* Header Accent Glow */}
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer z-20"
          >
            <X size={16} />
          </button>

          {/* Modal Header */}
          <div className="flex items-center justify-between gap-3 mb-5 pr-1">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/30 shrink-0">
                <Send size={20} className="translate-x-[-1px] translate-y-[1px]" />
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>بوت تليجرام</span>
                  <span className="text-xs font-mono font-bold text-sky-400">@{cleanBot}</span>
                </h3>
                <p className="text-xs text-white/50 font-medium mt-0.5">
                  تتبع إشعارات وتحديثات المهام فورياً عبر تليجرام
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tab Bar */}
          <div className="flex items-center gap-2 p-1 bg-white/[0.04] border border-white/10 rounded-2xl mb-5">
            <button
              onClick={() => setActiveTab('my_qr')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'my_qr'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <QrCode size={14} />
              <span>كود التفعيل المباشر</span>
            </button>

            <button
              onClick={() => setActiveTab('team_tracker')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'team_tracker'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users size={14} />
              <span>تتبع تفعيل الفريق</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'team_tracker'
                  ? 'bg-white/20 text-white'
                  : 'bg-sky-500/20 text-sky-300'
              }`}>
                {stats.connected}/{stats.total}
              </span>
            </button>
          </div>

          {/* TAB 1: PERSONAL QR & DEEP LINK */}
          {activeTab === 'my_qr' && (
            <motion.div
              key="my_qr"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* If viewing a selected user from team tracker */}
              {selectedUser && initialUser && selectedUser.id !== initialUser.id && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 mb-4 text-xs">
                  <div className="flex items-center gap-2 text-sky-300 font-bold">
                    <span>عرض كود المستخدم:</span>
                    <b className="text-white">{selectedUser.name}</b>
                  </div>
                  <button
                    onClick={() => switchToUserQr(initialUser)}
                    className="text-[11px] text-sky-400 hover:text-sky-200 font-black flex items-center gap-1 cursor-pointer"
                  >
                    <span>الرجوع لحسابي</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              )}

              {/* Connection Status Badge */}
              <div className={`p-3 rounded-2xl border mb-5 flex items-center justify-between gap-3 ${
                chatId 
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                  : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${chatId ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
                  <span className="text-xs font-bold">
                    {loadingChatId 
                      ? 'جاري التحقق من الاتصال...' 
                      : chatId 
                      ? 'الحساب مربوط بنجاح ومتصل 🟢' 
                      : 'بانتظار المسح أو الضغط على الرابط 🟡'}
                  </span>
                </div>
                {chatId && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-200">
                    {chatId}
                  </span>
                )}
              </div>

              {/* QR Code Card */}
              <div className="flex flex-col items-center justify-center p-4 bg-white/[0.02] border border-white/10 rounded-2xl mb-4">
                <div className="relative w-44 h-44 bg-white p-2.5 rounded-2xl shadow-xl border border-sky-400/30 flex items-center justify-center overflow-hidden">
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
              <div className="space-y-1.5 mb-4">
                <label className="text-[10px] font-bold text-white/50 block">الرابط المباشر للربط (Deep Link)</label>
                <div className="flex items-center gap-2 bg-[#06090e] border border-white/10 rounded-xl p-1.5 pl-3">
                  <input
                    type="text"
                    readOnly
                    value={activeLink}
                    className="bg-transparent text-sky-300 text-xs font-mono font-bold flex-1 outline-none select-all truncate"
                    dir="ltr"
                  />
                  <button
                    onClick={handleCopySelectedLink}
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
                  href={activeLink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 transition-all cursor-pointer"
                >
                  <ExternalLink size={14} />
                  <span>فتح في تليجرام</span>
                </a>

                <button
                  onClick={() => selectedUser && handleWhatsAppShare(selectedUser)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <MessageCircle size={14} />
                  <span>إرسال عبر واتساب</span>
                </button>
              </div>

              {/* Test & Unlink Controls (If connected) */}
              {chatId && selectedUser && (
                <div className="space-y-2 pt-1 border-t border-white/5">
                  <button
                    onClick={() => handleSendTest(selectedUser, chatId)}
                    disabled={testingMsg}
                    className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sky-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {testingMsg ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                    <span>إرسال إشعار تجريبي لهذا المستخدم 🧪</span>
                  </button>

                  <button
                    onClick={() => handleUnlink(selectedUser)}
                    disabled={unlinkingUserId === selectedUser.id}
                    className="w-full py-2 rounded-xl hover:bg-rose-500/10 text-rose-400/70 hover:text-rose-400 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {unlinkingUserId === selectedUser.id ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                    <span>إلغاء ربط الحساب من تليجرام</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: TEAM ACTIVATION TRACKER */}
          {activeTab === 'team_tracker' && (
            <motion.div
              key="team_tracker"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col items-center text-center">
                  <span className="text-[11px] font-bold text-white/50">إجمالي الفريق</span>
                  <span className="text-xl font-black text-white mt-0.5">{stats.total}</span>
                  <span className="text-[10px] text-white/40">عضو مسجل</span>
                </div>

                <div 
                  onClick={() => setStatusFilter(prev => prev === 'online' ? 'all' : 'online')}
                  className={`p-3 rounded-2xl border flex flex-col items-center text-center cursor-pointer transition-all ${
                    statusFilter === 'online'
                      ? 'bg-emerald-950/60 border-emerald-400 ring-2 ring-emerald-500/40'
                      : 'bg-emerald-950/30 border-emerald-500/30 hover:border-emerald-400/50'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
                    <span className="text-[11px] font-bold text-emerald-300">أونلاين الآن</span>
                  </div>
                  <span className="text-xl font-black text-emerald-400 mt-0.5">{onlineCount}</span>
                  <span className="text-[10px] font-bold text-emerald-300/80">فاتح الموقع الآن</span>
                </div>

                <div 
                  onClick={() => setStatusFilter(prev => prev === 'connected' ? 'all' : 'connected')}
                  className={`p-3 rounded-2xl border flex flex-col items-center text-center cursor-pointer transition-all ${
                    statusFilter === 'connected'
                      ? 'bg-sky-950/60 border-sky-400 ring-2 ring-sky-500/40'
                      : 'bg-sky-950/20 border-sky-500/30 hover:border-sky-400/50'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Send size={11} className="text-sky-400" />
                    <span className="text-[11px] font-bold text-sky-300">مفعل بالتليجرام</span>
                  </div>
                  <span className="text-xl font-black text-sky-400 mt-0.5">{stats.connected}</span>
                  <span className="text-[10px] font-bold text-sky-300/70">{stats.percentage}% من الفريق</span>
                </div>

                <div 
                  onClick={() => setStatusFilter(prev => prev === 'not_connected' ? 'all' : 'not_connected')}
                  className={`p-3 rounded-2xl border flex flex-col items-center text-center cursor-pointer transition-all ${
                    statusFilter === 'not_connected'
                      ? 'bg-amber-950/50 border-amber-400 ring-2 ring-amber-500/40'
                      : 'bg-amber-950/20 border-amber-500/30 hover:border-amber-400/50'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-[11px] font-bold text-amber-300">غير مفعل</span>
                  </div>
                  <span className="text-xl font-black text-amber-400 mt-0.5">{stats.notConnected}</span>
                  <span className="text-[10px] font-bold text-amber-300/70">{100 - stats.percentage}% متبقي</span>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث باسم العضو أو الرتبة..."
                    className="w-full pr-10 pl-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-bold outline-none focus:border-sky-500/50 transition-all placeholder-white/30"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white text-xs cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/10 shrink-0 flex-wrap sm:flex-nowrap">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'all' ? 'bg-sky-500 text-white shadow' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    الكل ({stats.total})
                  </button>
                  <button
                    onClick={() => setStatusFilter('online')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      statusFilter === 'online' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-400/80 hover:text-emerald-300'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>أونلاين ({onlineCount})</span>
                  </button>
                  <button
                    onClick={() => setStatusFilter('connected')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      statusFilter === 'connected' ? 'bg-sky-600 text-white shadow' : 'text-sky-400/80 hover:text-sky-300'
                    }`}
                  >
                    <CheckCircle2 size={12} />
                    <span>مفعل ({stats.connected})</span>
                  </button>
                  <button
                    onClick={() => setStatusFilter('not_connected')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      statusFilter === 'not_connected' ? 'bg-amber-600 text-white shadow' : 'text-amber-400/70 hover:text-amber-300'
                    }`}
                  >
                    <Clock size={12} />
                    <span>غير مفعل ({stats.notConnected})</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    fetchActivations();
                    fetchTeamUsers();
                    toast.success('تم تحديث بيانات التفعيل 🔄');
                  }}
                  title="تحديث فوري"
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer shrink-0"
                >
                  <RefreshCw size={14} className={loadingUsers ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Team Members List */}
              <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {filteredUsers.length === 0 ? (
                  <div className="py-12 text-center text-white/40">
                    <Users size={36} className="mx-auto mb-2 opacity-30 stroke-1" />
                    <p className="text-xs font-bold">لا يوجد أعضاء مطابقين للبحث</p>
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const { isConnected, chatId: uChatId } = getUserStatus(u);
                    const isSelected = selectedUser?.id === u.id;
                    const isCurrent = initialUser?.id === u.id;
                    const isOnline = isUserOnline(u.id, u.name);
                    const roleLabel = u.role || 'junior';

                    return (
                      <div
                        key={u.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap ${
                          isConnected
                            ? 'bg-emerald-950/20 border-emerald-500/20 hover:border-emerald-500/40'
                            : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                        } ${isSelected ? 'ring-2 ring-sky-500/50' : ''}`}
                      >
                        {/* Member Identity */}
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div className="relative shrink-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-md ${
                              isConnected
                                ? 'bg-gradient-to-br from-emerald-500 to-teal-700'
                                : 'bg-gradient-to-br from-slate-700 to-slate-900'
                            }`}>
                              {u.name?.slice(0, 2).toUpperCase()}
                            </div>
                            {isOnline && (
                              <span 
                                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a0e14] shadow-[0_0_8px_#10b981] animate-pulse z-10" 
                                title="فاتح الموقع في هذه اللحظة 🟢"
                              />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white">{u.name}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  أنت
                                </span>
                              )}
                              {isOnline && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  فاتح الموقع
                                </span>
                              )}
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white/5 text-white/50 border border-white/10">
                                {roleLabel}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mt-0.5">
                              {isConnected ? (
                                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  <span>مفعل ومتصل 🟢</span>
                                  {uChatId && uChatId !== 'متصل بالبوت' && (
                                    <span className="font-mono text-[9px] text-emerald-300/70">({uChatId})</span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-400/80 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  <span>بانتظار التفعيل ⚪</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 mr-auto">
                          {/* 1. Copy Link */}
                          <button
                            onClick={() => handleCopyUserLink(u)}
                            title="نسخ رابط التفعيل المباشر لهذا المستخدم"
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer active:scale-95 flex items-center gap-1 text-[11px] font-bold"
                          >
                            {copiedUserId === u.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            <span className="hidden sm:inline">رابط</span>
                          </button>

                          {/* 2. WhatsApp Invite */}
                          <button
                            onClick={() => handleWhatsAppShare(u)}
                            title="إرسال رابط التفعيل عبر واتساب"
                            className="p-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 transition-all cursor-pointer active:scale-95 flex items-center gap-1 text-[11px] font-bold border border-emerald-500/20"
                          >
                            <MessageCircle size={13} />
                            <span className="hidden sm:inline">واتساب</span>
                          </button>

                          {/* 3. Open QR */}
                          <button
                            onClick={() => switchToUserQr(u)}
                            title="عرض كود QR الخاص بهذا المستخدم"
                            className="p-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 transition-all cursor-pointer active:scale-95 flex items-center gap-1 text-[11px] font-bold border border-sky-500/20"
                          >
                            <QrCode size={13} />
                            <span className="hidden sm:inline">QR</span>
                          </button>

                          {/* 4. Test Notification (If connected) */}
                          {isConnected && (
                            <button
                              onClick={() => handleSendTest(u, uChatId)}
                              disabled={testingUserId === u.id}
                              title="إرسال إشعار تجريبي لهذا المستخدم على تليجرام"
                              className="p-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 transition-all cursor-pointer active:scale-95 disabled:opacity-50 border border-purple-500/20"
                            >
                              {testingUserId === u.id ? (
                                <RefreshCw size={13} className="animate-spin text-purple-400" />
                              ) : (
                                <Send size={13} />
                              )}
                            </button>
                          )}

                          {/* 5. Unlink (If connected) */}
                          {isConnected && (
                            <button
                              onClick={() => handleUnlink(u)}
                              disabled={unlinkingUserId === u.id}
                              title="إلغاء ربط تليجرام لهذا المستخدم"
                              className="p-2 rounded-xl hover:bg-rose-500/20 text-rose-400/60 hover:text-rose-400 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                            >
                              {unlinkingUserId === u.id ? (
                                <RefreshCw size={13} className="animate-spin" />
                              ) : (
                                <Trash2 size={13} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
