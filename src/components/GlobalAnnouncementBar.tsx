import React, { useEffect, useState, useCallback } from 'react';
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
  Globe2
} from 'lucide-react';
import type { GlobalAnnouncement, AnnouncementColor } from '../lib/announcements';
import { 
  getGlobalAnnouncement, 
  saveGlobalAnnouncement, 
  deleteGlobalAnnouncement 
} from '../lib/announcements';
import { supabase, type Role } from '../lib/supabase';
import { toast } from '../lib/toast';

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

  // Edit Modal form state
  const [formTitle, setFormTitle] = useState<string>('📢 إشعار عام لجميع الأقسام');
  const [formMessage, setFormMessage] = useState<string>('');
  const [formColor, setFormColor] = useState<AnnouncementColor>('purple');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Management permissions: Admin or Manager only
  const canManage = userRole === 'admin' || userRole === 'manager';

  const loadAnnouncement = useCallback(async () => {
    try {
      const data = await getGlobalAnnouncement();
      setAnnouncement(data);
      if (data) {
        setFormTitle(data.title || '📢 إشعار عام لجميع الأقسام');
        setFormMessage(data.message);
        setFormColor(data.color || 'purple');
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
          // Re-fetch when global announcement changes
          loadAnnouncement();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAnnouncement]);

  const handleOpenEdit = () => {
    if (announcement) {
      setFormTitle(announcement.title || '📢 إشعار عام لجميع الأقسام');
      setFormMessage(announcement.message);
      setFormColor(announcement.color || 'purple');
    } else {
      setFormTitle('📢 إشعار عام لجميع الأقسام');
      setFormMessage('');
      setFormColor('purple');
    }
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
        color: formColor
      },
      userName
    );
    setIsSaving(false);

    if (res.success) {
      setAnnouncement({
        title: titleToSave,
        message: formMessage.trim(),
        color: formColor,
        is_active: true,
        updated_by: userName,
        updated_at: new Date().toISOString()
      });
      setIsEditing(false);
      setIsCollapsed(false);
      try {
        localStorage.setItem('global_announcement_collapsed', 'false');
      } catch {}
      toast.success('🌐 تم نشر الإشعار العام لجميع الصفحات بنجاح!');
    } else {
      toast.error(res.error || 'حدث خطأ أثناء حفظ الإشعار العام');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('هل أنت متأكد من حذف الإشعار العام من جميع الصفحات؟')) return;

    const ok = await deleteGlobalAnnouncement();
    if (ok) {
      setAnnouncement(null);
      setFormMessage('');
      setIsEditing(false);
      toast.success('🗑️ تم حذف الإشعار العام بنجاح');
    } else {
      toast.error('حدث خطأ أثناء حذف الإشعار العام');
    }
  };

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem('global_announcement_collapsed', String(next));
    } catch {}
  };

  if (loading) {
    return null;
  }

  // Active color styling
  const activeColor = announcement?.color && COLOR_CONFIGS[announcement.color]
    ? COLOR_CONFIGS[announcement.color]
    : COLOR_CONFIGS.purple;

  // If no global announcement exists
  if (!announcement || !announcement.message) {
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
              <strong className="text-white font-bold">إشعار عام للنظام:</strong> كتابة تنبيه أو تحديث يظهر في كل الصفحات لجميع المستخدمين
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-400 group-hover:translate-x-[-2px] transition-transform">
            <Plus size={14} />
            <span>نشر إشعار عام</span>
          </div>
        </button>

        {/* Edit Modal */}
        {isEditing && renderEditModal()}
      </div>
    );
  }

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
              {activeColor.icon}
            </div>

            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {/* Title */}
              <span className={`text-xs md:text-sm font-black tracking-wide ${activeColor.titleColor} flex items-center gap-1.5`}>
                <span>{announcement.title || '📢 إشعار عام'}</span>
              </span>

              {/* Color Label Badge */}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${activeColor.badge}`}>
                {activeColor.label}
              </span>

              {/* Universal Live Pulse Indicator */}
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/5 border border-white/10 text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>شامل كل الصفحات</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Admin / Manager Controls */}
            {canManage && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
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

        {/* Announcement Message Content */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-6 py-4"
            >
              <div className="text-sm md:text-[15px] font-medium text-white/95 leading-relaxed whitespace-pre-wrap select-text">
                {announcement.message}
              </div>

              {/* Footer with author and timestamp */}
              <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-muted/80 flex-wrap gap-2">
                <span className="flex items-center gap-1.5">
                  <span>✍️ الناشر:</span>
                  <strong className="text-white/90 font-bold">{announcement.updated_by || 'المانجر'}</strong>
                </span>
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
            <span className="truncate flex-1 font-medium">
              {announcement.message.split('\n')[0]}
            </span>
            <span className="text-[11px] text-primary/80 hover:text-primary underline shrink-0 font-bold">
              اضغط لعرض كامل التفاصيل
            </span>
          </div>
        )}
      </motion.div>

      {/* Edit Modal */}
      {isEditing && renderEditModal()}
    </div>
  );

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
                <Globe2 size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>إشعار عام لكل الصفحات</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Live Broadcast
                  </span>
                </h3>
                <p className="text-xs text-muted">سيظهر هذا الإشعار في أعلى جميع صفحات النظام (الأوبراشن، التجميعات، المراحل، الريلز، وغيرها)</p>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(false)}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-muted hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
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

            {/* Live Preview Box */}
            <div>
              <div className="text-[11px] font-bold text-muted mb-2 flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-400" />
                <span>معاينة حية لشكل الإشعار بالألوان المختارة:</span>
              </div>
              <div className={`p-4 rounded-2xl border ${previewConfig.bg} ${previewConfig.border} ${previewConfig.glow} transition-all`}>
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-white/10">{previewConfig.icon}</div>
                    <span className={`text-xs font-bold ${previewConfig.titleColor}`}>
                      {formTitle || '📢 إشعار عام'}
                    </span>
                    <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold border ${previewConfig.badge}`}>
                      {previewConfig.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted">معاينة قبل النشر</span>
                </div>
                <p className="text-xs text-white/90 leading-relaxed whitespace-pre-wrap">
                  {formMessage || 'هنا سيظهر نص الإشعار العام الذي تكتبه فوراً لجميع أعضاء الفريق...'}
                </p>
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
                  <span>حذف الإشعار العام</span>
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
                      <span>نشر الإشعار العام لجميع المستخدمين 🚀</span>
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
