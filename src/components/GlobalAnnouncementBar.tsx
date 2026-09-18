import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Megaphone, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  X,
  Sparkles,
  Radio,
  Flame,
  Globe2,
  BarChart2,
  Vote,
  RotateCcw,
  Users,
  Lock,
  Check
} from 'lucide-react';
import type { GlobalAnnouncement, AnnouncementColor, PollOption, PollData } from '../lib/announcements';
import { 
  getGlobalAnnouncement, 
  saveGlobalAnnouncement, 
  deleteGlobalAnnouncement,
  castPollVote,
  resetPollVotes
} from '../lib/announcements';
import { supabase, type Role } from '../lib/supabase';
import { toast } from '../lib/toast';
import { useAuth } from '../contexts/AuthContext';

interface GlobalAnnouncementBarProps {
  userRole?: Role | null;
  userName?: string;
}

interface ColorConfig {
  id: AnnouncementColor;
  label: string;
  bg: string;
  border: string;
  glow: string;
  badge: string;
  titleColor: string;
  accentHex: string;
  icon: React.ReactNode;
}

const COLOR_CONFIGS: Record<AnnouncementColor, ColorConfig> = {
  purple: {
    id: 'purple',
    label: 'بنفسجي إداري',
    bg: 'bg-gradient-to-r from-purple-950/70 via-indigo-950/60 to-purple-950/70',
    border: 'border-purple-500/40',
    glow: 'shadow-[0_0_35px_rgba(168,85,247,0.2)]',
    badge: 'bg-purple-500/20 text-purple-200 border-purple-500/40',
    titleColor: 'text-purple-300',
    accentHex: '#a855f7',
    icon: <Sparkles className="text-purple-300" size={18} />
  },
  blue: {
    id: 'blue',
    label: 'أزرق رسمي',
    bg: 'bg-gradient-to-r from-blue-950/70 via-indigo-950/60 to-sky-950/70',
    border: 'border-blue-500/40',
    glow: 'shadow-[0_0_35px_rgba(59,130,246,0.2)]',
    badge: 'bg-blue-500/20 text-blue-200 border-blue-500/40',
    titleColor: 'text-blue-300',
    accentHex: '#3b82f6',
    icon: <Info className="text-blue-300" size={18} />
  },
  rose: {
    id: 'rose',
    label: 'أحمر عاجل / تحذير',
    bg: 'bg-gradient-to-r from-rose-950/70 via-red-950/60 to-pink-950/70',
    border: 'border-rose-500/40',
    glow: 'shadow-[0_0_35px_rgba(244,63,94,0.25)]',
    badge: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
    titleColor: 'text-rose-300',
    accentHex: '#f43f5e',
    icon: <AlertTriangle className="text-rose-300 animate-pulse" size={18} />
  },
  emerald: {
    id: 'emerald',
    label: 'أخضر إنجاز / خطة',
    bg: 'bg-gradient-to-r from-emerald-950/70 via-teal-950/60 to-cyan-950/70',
    border: 'border-emerald-500/40',
    glow: 'shadow-[0_0_35px_rgba(16,185,129,0.2)]',
    badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
    titleColor: 'text-emerald-300',
    accentHex: '#10b981',
    icon: <CheckCircle2 className="text-emerald-300" size={18} />
  },
  amber: {
    id: 'amber',
    label: 'كهرماني / تنبيه مهم',
    bg: 'bg-gradient-to-r from-amber-950/70 via-yellow-950/60 to-orange-950/70',
    border: 'border-amber-500/40',
    glow: 'shadow-[0_0_35px_rgba(245,158,11,0.2)]',
    badge: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
    titleColor: 'text-amber-300',
    accentHex: '#f59e0b',
    icon: <Flame className="text-amber-300" size={18} />
  },
  cyan: {
    id: 'cyan',
    label: 'سماوي نيون / تقني',
    bg: 'bg-gradient-to-r from-cyan-950/70 via-teal-950/60 to-blue-950/70',
    border: 'border-cyan-500/40',
    glow: 'shadow-[0_0_35px_rgba(6,182,212,0.2)]',
    badge: 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40',
    titleColor: 'text-cyan-300',
    accentHex: '#06b6d4',
    icon: <Radio className="text-cyan-300" size={18} />
  },
  sunset: {
    id: 'sunset',
    label: 'غروب دافئ / حماسي',
    bg: 'bg-gradient-to-r from-orange-950/70 via-rose-950/60 to-purple-950/70',
    border: 'border-orange-500/40',
    glow: 'shadow-[0_0_35px_rgba(249,115,22,0.2)]',
    badge: 'bg-orange-500/20 text-orange-200 border-orange-500/40',
    titleColor: 'text-orange-300',
    accentHex: '#f97316',
    icon: <Sparkles className="text-orange-300" size={18} />
  }
};

export const GlobalAnnouncementBar: React.FC<GlobalAnnouncementBarProps> = ({
  userRole,
  userName = 'المانجر'
}) => {
  const { profile, user } = useAuth();
  const currentUserId = profile?.id || user?.id || profile?.email || profile?.name || userName || 'anon';
  const currentUserName = profile?.name || profile?.email || userName || 'مستخدم';

  const [announcement, setAnnouncement] = useState<GlobalAnnouncement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('global_announcement_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // State to toggle seeing results before voting
  const [showResultsOverride, setShowResultsOverride] = useState<boolean>(false);
  const [isVoting, setIsVoting] = useState<boolean>(false);
  const [showVotersModal, setShowVotersModal] = useState<boolean>(false);

  // Edit Modal form state
  const [announcementKind, setAnnouncementKind] = useState<'text' | 'poll'>('text');

  // Text Announcement Form
  const [formTitle, setFormTitle] = useState<string>('📢 إشعار عام لجميع الأقسام');
  const [formMessage, setFormMessage] = useState<string>('');

  // Poll Form
  const [pollTitle, setPollTitle] = useState<string>('🗳️ استطلاع رأي الفريق');
  const [pollQuestion, setPollQuestion] = useState<string>('');
  const [pollOptions, setPollOptions] = useState<{ id: string; text: string }[]>([
    { id: 'opt_1', text: 'موافق تماماً' },
    { id: 'opt_2', text: 'أقترح تعديلاً' },
    { id: 'opt_3', text: 'غير موافق' }
  ]);

  const [formColor, setFormColor] = useState<AnnouncementColor>('purple');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Management permissions: Admin or Manager only
  const canManage = userRole === 'admin' || userRole === 'manager';

  const loadAnnouncement = useCallback(async () => {
    try {
      const data = await getGlobalAnnouncement();
      setAnnouncement(data);
      if (data) {
        setFormColor(data.color || 'purple');
        if (data.is_poll && data.poll_data) {
          setAnnouncementKind('poll');
          setPollTitle(data.title || '🗳️ استطلاع رأي الفريق');
          setPollQuestion(data.poll_data.question || data.message || '');
          if (data.poll_data.options && data.poll_data.options.length >= 2) {
            setPollOptions(data.poll_data.options.map(o => ({ id: o.id, text: o.text })));
          }
        } else {
          setAnnouncementKind('text');
          setFormTitle(data.title || '📢 إشعار عام لجميع الأقسام');
          setFormMessage(data.message || '');
        }
      }
    } catch (err) {
      console.warn('Failed to load global announcement:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + Realtime Supabase subscription
  useEffect(() => {
    loadAnnouncement();

    // Setup realtime subscription to page_announcements table
    const channel = supabase
      .channel('global_announcements_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'page_announcements',
          filter: 'page_key=eq.__global__'
        },
        () => {
          loadAnnouncement();
        }
      )
      .on('broadcast', { event: 'poll_update' }, () => {
        loadAnnouncement();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAnnouncement]);

  const handleOpenEdit = () => {
    if (announcement) {
      setFormColor(announcement.color || 'purple');
      if (announcement.is_poll && announcement.poll_data) {
        setAnnouncementKind('poll');
        setPollTitle(announcement.title || '🗳️ استطلاع رأي الفريق');
        setPollQuestion(announcement.poll_data.question || announcement.message || '');
        if (announcement.poll_data.options && announcement.poll_data.options.length >= 2) {
          setPollOptions(announcement.poll_data.options.map(o => ({ id: o.id, text: o.text })));
        } else {
          setPollOptions([
            { id: 'opt_1', text: 'موافق تماماً' },
            { id: 'opt_2', text: 'أقترح تعديلاً' },
            { id: 'opt_3', text: 'غير موافق' }
          ]);
        }
      } else {
        setAnnouncementKind('text');
        setFormTitle(announcement.title || '📢 إشعار عام لجميع الأقسام');
        setFormMessage(announcement.message || '');
      }
    } else {
      setAnnouncementKind('text');
      setFormTitle('📢 إشعار عام لجميع الأقسام');
      setFormMessage('');
      setPollTitle('🗳️ استطلاع رأي الفريق');
      setPollQuestion('');
      setPollOptions([
        { id: 'opt_1', text: 'موافق تماماً' },
        { id: 'opt_2', text: 'أقترح تعديلاً' },
        { id: 'opt_3', text: 'غير موافق' }
      ]);
      setFormColor('purple');
    }
    setIsEditing(true);
  };

  const handleAddPollOption = () => {
    if (pollOptions.length >= 8) {
      toast.error('أقصى حد لخيارات التصويت هو 8 خيارات');
      return;
    }
    const newId = `opt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setPollOptions(prev => [...prev, { id: newId, text: '' }]);
  };

  const handleRemovePollOption = (idToRemove: string) => {
    if (pollOptions.length <= 2) {
      toast.error('يجب أن يحتوي التصويت على خيارين على الأقل');
      return;
    }
    setPollOptions(prev => prev.filter(o => o.id !== idToRemove));
  };

  const handleUpdatePollOption = (id: string, text: string) => {
    setPollOptions(prev => prev.map(o => o.id === id ? { ...o, text } : o));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (announcementKind === 'text') {
      if (!formMessage.trim()) {
        toast.error('يرجى كتابة نص الإشعار العام أولاً');
        return;
      }

      setIsSaving(true);
      const titleToSave = formTitle.trim() || '📢 إشعار عام لجميع الأقسام';
      const res = await saveGlobalAnnouncement(
        {
          title: titleToSave,
          message: formMessage.trim(),
          color: formColor,
          is_poll: false
        },
        currentUserName
      );
      setIsSaving(false);

      if (res.success) {
        setAnnouncement({
          title: titleToSave,
          message: formMessage.trim(),
          color: formColor,
          is_active: true,
          is_poll: false,
          updated_by: currentUserName,
          updated_at: new Date().toISOString()
        });
        setIsEditing(false);
        setIsCollapsed(false);
        setShowResultsOverride(false);
        toast.success('🌐 تم نشر الإشعار العام لجميع الصفحات بنجاح!');
      } else {
        toast.error(res.error || 'حدث خطأ أثناء حفظ الإشعار العام');
      }
    } else {
      // Poll Announcement
      if (!pollQuestion.trim()) {
        toast.error('يرجى كتابة سؤال أو موضوع استطلاع الرأي أولاً');
        return;
      }

      const validOptions = pollOptions
        .map(o => ({ ...o, text: o.text.trim() }))
        .filter(o => o.text.length > 0);

      if (validOptions.length < 2) {
        toast.error('يجب إدخال نص لخيارين على الأقل للتصويت');
        return;
      }

      setIsSaving(true);
      const titleToSave = pollTitle.trim() || '🗳️ استطلاع رأي الفريق';

      // Keep existing votes if editing, or start fresh
      const existingVoters = (announcement?.is_poll && announcement.poll_data?.voters) || {};
      const initialOptions: PollOption[] = validOptions.map(vo => {
        const votes = Object.values(existingVoters).filter((v: any) => v && v.optionId === vo.id).length;
        return {
          id: vo.id,
          text: vo.text,
          votes
        };
      });

      const totalVotes = Object.keys(existingVoters).length > 0
        ? Object.keys(existingVoters).length
        : initialOptions.reduce((acc, o) => acc + o.votes, 0);

      const pollDataToSave: PollData = {
        question: pollQuestion.trim(),
        options: initialOptions,
        voters: existingVoters,
        totalVotes,
        createdAt: announcement?.poll_data?.createdAt || new Date().toISOString()
      };

      const res = await saveGlobalAnnouncement(
        {
          title: titleToSave,
          message: pollQuestion.trim(),
          color: formColor,
          is_poll: true,
          poll_data: pollDataToSave
        },
        currentUserName
      );
      setIsSaving(false);

      if (res.success) {
        setAnnouncement({
          title: titleToSave,
          message: pollQuestion.trim(),
          color: formColor,
          is_active: true,
          is_poll: true,
          poll_data: pollDataToSave,
          updated_by: currentUserName,
          updated_at: new Date().toISOString()
        });
        setIsEditing(false);
        setIsCollapsed(false);
        setShowResultsOverride(false);
        toast.success('🗳️ تم نشر استطلاع الرأي والتصويت لجميع الصفحات بنجاح!');
      } else {
        toast.error(res.error || 'حدث خطأ أثناء حفظ التصويت');
      }
    }
  };

  const handleCastVote = async (optionId: string) => {
    if (isVoting) return;
    if (!announcement || !announcement.is_poll || !announcement.poll_data) return;

    if (hasVoted) {
      toast.error('لقد قمت بالتصويت بالفعل مسبقاً! كل عضو له صوت واحد فقط.');
      return;
    }

    setIsVoting(true);
    const res = await castPollVote(optionId, currentUserId, currentUserName);
    setIsVoting(false);

    if (res.success && res.pollData) {
      setAnnouncement(prev => prev ? {
        ...prev,
        poll_data: res.pollData
      } : null);
      setShowResultsOverride(true);
      toast.success('🎉 شكراً لتصويتك! تم تسجيل صوتك بنجاح.');

      // Notify other clients over channel
      try {
        const ch = supabase.channel('global_announcements_channel');
        ch.send({ type: 'broadcast', event: 'poll_update', payload: {} });
      } catch {}
    } else {
      toast.error(res.error || 'حدث خطأ أثناء إرسال صوتك');
    }
  };

  const handleResetVotes = async () => {
    if (!window.confirm('هل أنت متأكد من تصفير نتائج التصويت بالكامل لجميع الأعضاء؟ سيتمكن الجميع من التصويت مجدداً.')) return;

    const res = await resetPollVotes(currentUserName);
    if (res.success) {
      await loadAnnouncement();
      setShowResultsOverride(false);
      toast.success('🔄 تم تصفير نتائج التصويت بنجاح!');
    } else {
      toast.error(res.error || 'حدث خطأ أثناء تصفير التصويت');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الإشعار / التصويت من جميع الصفحات؟')) return;

    const ok = await deleteGlobalAnnouncement();
    if (ok) {
      setAnnouncement(null);
      setFormMessage('');
      setPollQuestion('');
      setIsEditing(false);
      setShowResultsOverride(false);
      toast.success('🗑️ تم الحذف بنجاح');
    } else {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem('global_announcement_collapsed', String(next));
    } catch {}
  };

  // Check user vote in poll
  const userVote = useMemo(() => {
    if (!announcement?.is_poll || !announcement.poll_data?.voters) return null;
    const voters = announcement.poll_data.voters;
    const cleanId = String(currentUserId).trim().toLowerCase();
    const cleanEmail = profile?.email ? String(profile.email).trim().toLowerCase() : '';
    const cleanName = profile?.name ? String(profile.name).trim().toLowerCase() : '';

    if (voters[cleanId]) return voters[cleanId];
    if (cleanEmail && voters[cleanEmail]) return voters[cleanEmail];
    if (cleanName && voters[cleanName]) return voters[cleanName];

    // Check by values
    const foundEntry = Object.entries(voters).find(([k, v]) => {
      const kLow = k.toLowerCase();
      return kLow === cleanId || (cleanEmail && kLow === cleanEmail) || (cleanName && kLow === cleanName) ||
        (v.voterName && cleanName && v.voterName.toLowerCase() === cleanName);
    });

    return foundEntry ? foundEntry[1] : null;
  }, [announcement, currentUserId, profile]);

  const hasVoted = !!userVote;

  if (loading) {
    return null;
  }

  // Active color styling
  const activeColor = announcement?.color && COLOR_CONFIGS[announcement.color]
    ? COLOR_CONFIGS[announcement.color]
    : COLOR_CONFIGS.purple;

  // If no global announcement exists
  if (!announcement || (!announcement.message && !announcement.poll_data?.question)) {
    if (!canManage) return null;

    // Admin / Manager subtle trigger button
    return (
      <div className="mb-4" dir="rtl">
        <button
          onClick={handleOpenEdit}
          className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-purple-500/[0.04] via-blue-500/[0.04] to-purple-500/[0.04] hover:from-purple-500/[0.1] hover:to-blue-500/[0.1] border border-dashed border-purple-500/20 hover:border-purple-500/50 flex items-center justify-between text-xs text-muted hover:text-purple-300 transition-all group shadow-sm cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <Globe2 size={14} />
            </div>
            <span>
              <strong className="text-white font-bold">إشعار عام أو استطلاع رأي للنظام:</strong> كتابة تنبيه أو إطلاق تصويت يظهر في كل الصفحات
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-400 group-hover:translate-x-[-2px] transition-transform">
            <Plus size={14} />
            <span>نشر إشعار / تصويت</span>
          </div>
        </button>

        {/* Edit Modal */}
        {isEditing && renderEditModal()}
      </div>
    );
  }

  const isPollMode = announcement.is_poll === true && !!announcement.poll_data;

  // Active Global Announcement Render
  return (
    <div className="mb-6" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl border backdrop-blur-2xl transition-all ${activeColor.bg} ${activeColor.border} ${activeColor.glow}`}
      >
        {/* Glow Accent Line at the very top */}
        <div 
          className="h-[2px] w-full opacity-80"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${activeColor.accentHex} 50%, transparent 100%)`
          }}
        />

        {/* Header Bar */}
        <div className="px-5 py-3 flex items-center justify-between gap-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 min-w-0">
            {/* Pulsing Icon */}
            <div 
              className="p-2 rounded-xl bg-white/10 border border-white/15 shadow-sm shrink-0"
              style={{ boxShadow: `0 0 15px ${activeColor.accentHex}40` }}
            >
              {isPollMode ? <Vote size={18} style={{ color: activeColor.accentHex }} /> : activeColor.icon}
            </div>

            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {/* Title */}
              <span className={`text-xs md:text-sm font-black tracking-wide ${activeColor.titleColor} flex items-center gap-1.5`}>
                <span>{announcement.title || (isPollMode ? '🗳️ تصويت عام' : '📢 إشعار عام')}</span>
              </span>

              {/* Color Label Badge */}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${activeColor.badge}`}>
                {isPollMode ? 'استطلاع رأي مباشر 🗳️' : activeColor.label}
              </span>

              {/* Total votes badge for polls */}
              {isPollMode && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 border border-white/15 text-white/90">
                  <Users size={11} className="text-purple-300" />
                  <span>{announcement.poll_data?.totalVotes || 0} صوت</span>
                </span>
              )}

              {/* User Voted Badge */}
              {isPollMode && hasVoted && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-200">
                  <Check size={11} />
                  <span>تم تسجيل صوتك</span>
                </span>
              )}

              {/* Universal Live Pulse Indicator */}
              <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/5 border border-white/10 text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>شامل كل الصفحات</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Admin / Manager Controls */}
            {canManage && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
                {isPollMode && (
                  <>
                    <button
                      onClick={() => setShowVotersModal(true)}
                      className="p-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/20 text-muted hover:text-white transition-all text-xs flex items-center gap-1 cursor-pointer"
                      title="عرض تفاصيل وأسماء المصوتين"
                    >
                      <Users size={13} />
                      <span className="hidden md:inline text-[11px] font-bold">المصوتين</span>
                    </button>
                    <button
                      onClick={handleResetVotes}
                      className="p-1.5 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/20 hover:border-amber-500/40 text-amber-300 transition-all text-xs flex items-center gap-1 cursor-pointer"
                      title="تصفير نتائج التصويت"
                    >
                      <RotateCcw size={13} />
                      <span className="hidden md:inline text-[11px] font-bold">تصفير</span>
                    </button>
                  </>
                )}
                <button
                  onClick={handleOpenEdit}
                  className="p-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/20 text-muted hover:text-white transition-all text-xs flex items-center gap-1 cursor-pointer"
                  title="تعديل الإشعار العام"
                >
                  <Edit3 size={13} />
                  <span className="hidden sm:inline text-[11px] font-bold">تعديل</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 transition-all text-xs flex items-center gap-1 cursor-pointer"
                  title="حذف الإشعار العام"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}

            {/* Collapse/Expand Toggle */}
            <button
              onClick={toggleCollapse}
              className="p-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/15 text-muted hover:text-white transition-colors flex items-center gap-1 text-xs cursor-pointer"
              title={isCollapsed ? 'عرض تفاصيل الإشعار' : 'طي الإشعار'}
            >
              {isCollapsed ? (
                <>
                  <span className="text-[11px] font-medium hidden sm:inline">عرض</span>
                  <ChevronDown size={14} />
                </>
              ) : (
                <>
                  <span className="text-[11px] font-medium hidden sm:inline">طي</span>
                  <ChevronUp size={14} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Announcement Content (Expanded) */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-6 py-4"
            >
              {/* CASE 1: Standard Text Announcement */}
              {!isPollMode && (
                <div className="text-sm md:text-[15px] font-medium text-white/95 leading-relaxed whitespace-pre-wrap select-text">
                  {announcement.message}
                </div>
              )}

              {/* CASE 2: Interactive Poll / Voting */}
              {isPollMode && announcement.poll_data && (
                <div className="space-y-4">
                  {/* Poll Question */}
                  <div className="text-sm md:text-base font-black text-white leading-relaxed flex items-start gap-2">
                    <span className="text-lg">❓</span>
                    <span className="flex-1">{announcement.poll_data.question}</span>
                  </div>

                  {/* Subview 1: User has NOT voted and NOT peeking results -> Show Voting Buttons */}
                  {!hasVoted && !showResultsOverride ? (
                    <div className="space-y-2.5 my-3">
                      <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                        <span className="font-bold">اختر إجابتك للتصويت (صوت واحد لكل عضو):</span>
                        <button
                          type="button"
                          onClick={() => setShowResultsOverride(true)}
                          className="text-white/80 hover:text-white hover:underline text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <BarChart2 size={13} className="text-purple-400" />
                          <span>عرض النتائج دون تصويت</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {announcement.poll_data.options.map((option, idx) => (
                          <button
                            key={option.id}
                            disabled={isVoting}
                            onClick={() => handleCastVote(option.id)}
                            className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.12] border border-white/10 hover:border-white/30 text-right flex items-center justify-between gap-3 transition-all duration-200 cursor-pointer group shadow-sm hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-7 h-7 rounded-xl bg-white/10 group-hover:bg-white/20 text-white font-black text-xs flex items-center justify-center shrink-0 border border-white/15">
                                {idx + 1}
                              </span>
                              <span className="text-sm font-bold text-white group-hover:text-white truncate">
                                {option.text}
                              </span>
                            </div>

                            <div className="text-xs text-muted/70 group-hover:text-white flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-bold hidden md:inline">صوّت</span>
                              <div className="w-5 h-5 rounded-full border border-white/30 group-hover:border-white flex items-center justify-center group-hover:bg-white/10">
                                <div className="w-2.5 h-2.5 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Subview 2: User HAS voted OR peeking results -> Show Live Results Bars */
                    <div className="space-y-3 my-3">
                      <div className="flex items-center justify-between text-xs text-white/70 mb-1">
                        <span className="font-bold flex items-center gap-1.5 text-white/90">
                          <BarChart2 size={14} style={{ color: activeColor.accentHex }} />
                          <span>النتائج الحية لتصويت الفريق:</span>
                        </span>

                        {!hasVoted && (
                          <button
                            type="button"
                            onClick={() => setShowResultsOverride(false)}
                            className="text-white/80 hover:text-white hover:underline text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Vote size={13} className="text-emerald-400" />
                            <span>الرجوع وخوض التصويت 🗳️</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        {announcement.poll_data.options.map((option) => {
                          const total = announcement.poll_data!.totalVotes || 0;
                          const percentage = total > 0 ? Math.round((option.votes / total) * 100) : 0;
                          const isMyChoice = userVote?.optionId === option.id;

                          return (
                            <div
                              key={option.id}
                              className={`p-3.5 rounded-2xl border transition-all ${
                                isMyChoice
                                  ? 'bg-white/[0.08] border-white/30 shadow-md ring-1'
                                  : 'bg-white/[0.02] border-white/10'
                              }`}
                              style={{
                                ringColor: isMyChoice ? activeColor.accentHex : undefined
                              }}
                            >
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-bold text-white">
                                    {option.text}
                                  </span>
                                  {isMyChoice && (
                                    <span
                                      className="px-2 py-0.5 rounded-md text-[10px] font-black border flex items-center gap-1 shadow-sm"
                                      style={{
                                        backgroundColor: `${activeColor.accentHex}30`,
                                        color: '#ffffff',
                                        borderColor: `${activeColor.accentHex}60`
                                      }}
                                    >
                                      <Check size={11} />
                                      <span>اختيارك ✓</span>
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-xs font-black text-white shrink-0">
                                  <span className="text-sm font-black" style={{ color: activeColor.accentHex }}>
                                    {percentage}%
                                  </span>
                                  <span className="text-[11px] text-muted font-normal">
                                    ({option.votes} {option.votes === 1 ? 'صوت' : option.votes === 2 ? 'صوتان' : option.votes <= 10 ? 'أصوات' : 'صوت'})
                                  </span>
                                </div>
                              </div>

                              {/* Animated Progress Bar */}
                              <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden relative">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{ duration: 0.6, ease: 'easeOut' }}
                                  className="h-full rounded-full"
                                  style={{
                                    backgroundColor: activeColor.accentHex,
                                    boxShadow: `0 0 10px ${activeColor.accentHex}80`
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {hasVoted && (
                        <div className="text-[11px] text-emerald-300/90 font-bold flex items-center gap-1.5 pt-1">
                          <Lock size={12} />
                          <span>تم حفظ تصويتك بنجاح ولا يمكن تكرار التصويت.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Footer with author and timestamp */}
              <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-muted/80 flex-wrap gap-2">
                <span className="flex items-center gap-1.5">
                  <span>✍️ الناشر:</span>
                  <strong className="text-white/90 font-bold">{announcement.updated_by || 'المانجر'}</strong>
                </span>

                {isPollMode && (
                  <span className="flex items-center gap-1 font-bold text-white/70">
                    <Users size={12} className="text-purple-300" />
                    <span>إجمالي الأصوات: {announcement.poll_data?.totalVotes || 0} مشارك</span>
                  </span>
                )}

                {announcement.updated_at && (
                  <span className="font-mono text-[10px] text-muted/70 flex items-center gap-1">
                    <span>⏱️ آخر تحديث:</span>
                    <span>
                      {new Date(announcement.updated_at).toLocaleDateString('ar-EG', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed 1-Line Preview Bar */}
        {isCollapsed && (
          <div 
            onClick={toggleCollapse}
            className="px-6 py-2.5 bg-black/20 hover:bg-black/30 cursor-pointer flex items-center justify-between gap-4 text-xs text-white/80 transition-colors"
          >
            <span className="truncate flex-1 font-medium flex items-center gap-2">
              {isPollMode ? (
                <>
                  <span className="text-purple-400 font-black">🗳️ [تصويت]:</span>
                  <span>{announcement.poll_data?.question || announcement.message}</span>
                </>
              ) : (
                <span>{announcement.message.split('\n')[0]}</span>
              )}
            </span>
            <span className="text-[11px] text-primary/80 hover:text-primary underline shrink-0 font-bold">
              اضغط لعرض كامل التفاصيل
            </span>
          </div>
        )}
      </motion.div>

      {/* Edit / Create Modal */}
      {isEditing && renderEditModal()}

      {/* Voters List Modal (Admin/Manager) */}
      {showVotersModal && renderVotersModal()}
    </div>
  );

  // Render Voters List Modal
  function renderVotersModal() {
    if (!announcement?.is_poll || !announcement.poll_data) return null;
    const voters = announcement.poll_data.voters || {};
    const voterEntries = Object.entries(voters);

    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn" dir="rtl">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-[#0f172a] border border-white/20 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative text-white space-y-4 max-h-[85vh] flex flex-col"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">تفاصيل أصوات المشاركين</h3>
                <p className="text-xs text-muted">إجمالي {voterEntries.length} صوت مسجل</p>
              </div>
            </div>
            <button
              onClick={() => setShowVotersModal(false)}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-muted hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {voterEntries.length === 0 ? (
              <p className="text-center py-8 text-xs text-muted">لم يقم أحد بالتصويت حتى الآن.</p>
            ) : (
              voterEntries.map(([key, v], i) => {
                const opt = announcement.poll_data?.options.find(o => o.id === v.optionId);
                return (
                  <div key={key} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-white/10 text-white/70 flex items-center justify-center text-[10px] font-bold">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-bold text-white">{v.voterName || key}</p>
                        {v.votedAt && (
                          <p className="text-[10px] text-muted font-mono">
                            {new Date(v.votedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-200 border border-purple-500/30 text-[11px] font-bold">
                      {opt?.text || 'خيار محذوف'}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 border-t border-white/10 flex justify-end">
            <button
              onClick={() => setShowVotersModal(false)}
              className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-all cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Render Edit / Create Modal
  function renderEditModal() {
    const previewConfig = COLOR_CONFIGS[formColor] || COLOR_CONFIGS.purple;

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn" dir="rtl">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-[#0f172a] border border-white/20 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative text-white space-y-5 max-h-[90vh] overflow-y-auto"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg border border-white/10"
                style={{ backgroundColor: `${previewConfig.accentHex}25`, color: previewConfig.accentHex }}
              >
                {announcementKind === 'poll' ? <Vote size={22} /> : <Globe2 size={22} />}
              </div>
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>{announcementKind === 'poll' ? 'إنشاء استطلاع رأي وتصويت' : 'إشعار عام لكل الصفحات'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Live Broadcast
                  </span>
                </h3>
                <p className="text-xs text-muted">سيظهر هذا التحديث في شريط علوي موحد لجميع الصفحات والمستخدمين</p>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(false)}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-muted hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Mode Switcher Tabs: Standard Text vs Poll */}
          <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-[#090d16] border border-white/15 gap-1.5">
            <button
              type="button"
              onClick={() => setAnnouncementKind('text')}
              className={`py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                announcementKind === 'text'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                  : 'text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Megaphone size={15} />
              <span>إشعار نصي عام (الحالي)</span>
            </button>
            <button
              type="button"
              onClick={() => setAnnouncementKind('poll')}
              className={`py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                announcementKind === 'poll'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                  : 'text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Vote size={15} />
              <span>تصويت واستطلاع رأي (Poll) 🗳️</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-5">
            {/* Color Palette Picker */}
            <div>
              <label className="block text-xs font-bold text-white/90 mb-2 flex items-center justify-between">
                <span>اختر لون الإشعار المفضل:</span>
                <span className="text-[11px] font-normal text-muted">
                  اللون المختار: <strong className="text-white font-bold">{previewConfig.label}</strong>
                </span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.values(COLOR_CONFIGS).map((c) => {
                  const isSelected = formColor === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFormColor(c.id)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'border-white/40 bg-white/10 shadow-lg scale-[1.02] ring-2'
                          : 'border-white/10 bg-white/5 text-muted hover:text-white hover:bg-white/10'
                      }`}
                      style={{
                        ...(isSelected ? { ringColor: c.accentHex, borderColor: c.accentHex } : {})
                      }}
                    >
                      <span 
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: c.accentHex }}
                      />
                      <span className="truncate">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CASE A: TEXT ANNOUNCEMENT INPUTS */}
            {announcementKind === 'text' && (
              <>
                {/* Title & Quick Presets */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-white/90">عنوان الإشعار:</label>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted overflow-x-auto">
                      <span>نماذج سريعة:</span>
                      {[
                        '📢 إشعار عام',
                        '🚨 تنبيه عاجل للفريق',
                        '🎉 إنجاز وخطة جديدة',
                        '⚠️ تحديث بالنظام'
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFormTitle(preset)}
                          className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="اكتب عنواناً معبراً للإشعار..."
                    className="w-full bg-[#090d16] border border-white/15 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all font-bold"
                  />
                </div>

                {/* Message Textarea */}
                <div>
                  <label className="block text-xs font-bold text-white/90 mb-2">
                    نص الإشعار أو التحديث (يظهر للجميع):
                  </label>
                  <textarea
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    placeholder="مثال: يرجى العلم أنه تم تحديث خطة عمل يوم السبت وتسليمات مرحلة J4... (يدعم السطور المتعددة والإيموجي)"
                    rows={5}
                    className="w-full bg-[#090d16] border border-white/15 focus:border-purple-500 rounded-2xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all resize-none leading-relaxed"
                    autoFocus
                  />
                </div>
              </>
            )}

            {/* CASE B: POLL ANNOUNCEMENT INPUTS */}
            {announcementKind === 'poll' && (
              <>
                {/* Title & Poll Presets */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-white/90">عنوان استطلاع الرأي:</label>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted overflow-x-auto">
                      <span>نماذج سريعة:</span>
                      {[
                        '🗳️ تصويت الفريق',
                        '📊 استطلاع رأي عام',
                        '❓ سؤال للنقاش',
                        '🎯 تحديد موعد'
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setPollTitle(preset)}
                          className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={pollTitle}
                    onChange={(e) => setPollTitle(e.target.value)}
                    placeholder="عنوان التصويت..."
                    className="w-full bg-[#090d16] border border-white/15 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all font-bold"
                  />
                </div>

                {/* Poll Question */}
                <div>
                  <label className="block text-xs font-bold text-white/90 mb-2">
                    سؤال التصويت أو موضوع الاستطلاع (الذي سيجيب عليه الفريق):
                  </label>
                  <textarea
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="مثال: ما هو الموعد الأنسب لتسليم ملفات مرحلة Middle 3 ليوتيوب؟"
                    rows={2}
                    className="w-full bg-[#090d16] border border-white/15 focus:border-purple-500 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all resize-none leading-relaxed font-medium"
                    autoFocus
                  />
                </div>

                {/* Poll Options Dynamic List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white/90 flex items-center gap-2">
                      <span>خيارات التصويت (عدد الخيارات المعروضة):</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                        {pollOptions.length} خيارات
                      </span>
                    </label>

                    {pollOptions.length < 8 && (
                      <button
                        type="button"
                        onClick={handleAddPollOption}
                        className="px-3 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>إضافة خيار إضافي</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {pollOptions.map((opt, idx) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-white/10 text-white font-black text-xs flex items-center justify-center shrink-0 border border-white/15">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => handleUpdatePollOption(opt.id, e.target.value)}
                          placeholder={`نص الخيار ${idx + 1}...`}
                          className="flex-1 bg-[#090d16] border border-white/15 focus:border-purple-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none transition-all"
                        />
                        {pollOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePollOption(opt.id)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer shrink-0"
                            title="حذف هذا الخيار"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted">
                    💡 يمكن للأعضاء اختيار واحد فقط من هذه الخيارات، وستظهر النتائج والنسب المئوية فور التصويت.
                  </p>
                </div>
              </>
            )}

            {/* Live Preview Box */}
            <div>
              <div className="text-[11px] font-bold text-muted mb-2 flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-400" />
                <span>معاينة حية لشكل {announcementKind === 'poll' ? 'التصويت' : 'الإشعار'} بالألوان المختارة:</span>
              </div>
              <div className={`p-4 rounded-2xl border ${previewConfig.bg} ${previewConfig.border} ${previewConfig.glow} transition-all`}>
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-white/10">
                      {announcementKind === 'poll' ? <Vote size={14} style={{ color: previewConfig.accentHex }} /> : previewConfig.icon}
                    </div>
                    <span className={`text-xs font-bold ${previewConfig.titleColor}`}>
                      {announcementKind === 'poll' ? (pollTitle || '🗳️ تصويت الفريق') : (formTitle || '📢 إشعار عام')}
                    </span>
                    <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold border ${previewConfig.badge}`}>
                      {announcementKind === 'poll' ? 'تصويت مباشر' : previewConfig.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted">معاينة قبل النشر</span>
                </div>

                {announcementKind === 'text' ? (
                  <p className="text-xs text-white/90 leading-relaxed whitespace-pre-wrap">
                    {formMessage || 'هنا سيظهر نص الإشعار العام الذي تكتبه فوراً لجميع أعضاء الفريق...'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-black text-white">
                      {pollQuestion || 'سؤال التصويت سيظهر هنا بشكل بارز...'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      {pollOptions.map((o, idx) => (
                        <div key={o.id} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white/80 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-lg bg-white/10 text-white text-[10px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span className="truncate">{o.text || `خيار ${idx + 1}`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
              {announcement ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>حذف {announcement.is_poll ? 'التصويت' : 'الإشعار'}</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-purple-500/30 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <span>جاري النشر...</span>
                  ) : (
                    <>
                      <span>
                        {announcementKind === 'poll' ? 'نشر استطلاع الرأي والتصويت 🗳️' : 'نشر الإشعار العام لجميع المستخدمين 🚀'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }
};
