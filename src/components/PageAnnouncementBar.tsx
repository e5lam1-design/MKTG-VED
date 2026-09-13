import React, { useEffect, useState } from 'react';
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
  Sparkles
} from 'lucide-react';
import type { PageAnnouncement } from '../lib/announcements';
import { 
  getPageAnnouncement, 
  savePageAnnouncement, 
  deletePageAnnouncement 
} from '../lib/announcements';
import type { Role } from '../lib/supabase';
import { toast } from '../lib/toast';

interface PageAnnouncementBarProps {
  pageKey: string;
  pageLabel: string;
  userRole?: Role | null;
  userName?: string;
}

export const PageAnnouncementBar: React.FC<PageAnnouncementBarProps> = ({
  pageKey,
  pageLabel,
  userRole,
  userName = 'المانجر'
}) => {
  const [announcement, setAnnouncement] = useState<PageAnnouncement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`announcement_collapsed_${pageKey}`) === 'true';
    } catch {
      return false;
    }
  });

  // Edit Modal form state
  const [formMessage, setFormMessage] = useState<string>('');
  const [formType, setFormType] = useState<'info' | 'warning' | 'alert' | 'success'>('info');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Can manage: Manager or Admin only
  const canManage = userRole === 'admin' || userRole === 'manager';

  // Load announcement whenever pageKey changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getPageAnnouncement(pageKey).then((data) => {
      if (isMounted) {
        setAnnouncement(data);
        if (data) {
          setFormMessage(data.message);
          setFormType(data.type || 'info');
        } else {
          setFormMessage('');
          setFormType('info');
        }
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [pageKey]);

  const handleOpenEdit = () => {
    if (announcement) {
      setFormMessage(announcement.message);
      setFormType(announcement.type || 'info');
    } else {
      setFormMessage('');
      setFormType('info');
    }
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMessage.trim()) {
      toast.error('يرجى كتابة نص الإعلان أو التنبيه أولاً');
      return;
    }

    setIsSaving(true);
    const newAnnouncement: PageAnnouncement = {
      page_key: pageKey,
      page_label: pageLabel,
      message: formMessage.trim(),
      type: formType,
      is_active: true
    };

    const res = await savePageAnnouncement(newAnnouncement, userName);
    setIsSaving(false);

    if (res.success) {
      setAnnouncement({
        ...newAnnouncement,
        updated_by: userName,
        updated_at: new Date().toISOString()
      });
      setIsEditing(false);
      setIsCollapsed(false);
      toast.success(`📢 تم نشر التنبيه لصفحة "${pageLabel}" بنجاح!`);
    } else {
      toast.error(res.error || 'حدث خطأ أثناء حفظ التنبيه');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`هل أنت متأكد من حذف التنبيه لصفحة "${pageLabel}"؟`)) return;

    const ok = await deletePageAnnouncement(pageKey);
    if (ok) {
      setAnnouncement(null);
      setFormMessage('');
      toast.success('🗑️ تم حذف التنبيه بنجاح');
    } else {
      toast.error('حدث خطأ أثناء حذف التنبيه');
    }
  };

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem(`announcement_collapsed_${pageKey}`, String(next));
    } catch {}
  };

  // Color schemes based on type
  const typeStyles = {
    info: {
      bg: 'bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border-blue-500/30 text-blue-200',
      icon: <Info className="text-blue-400" size={20} />,
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      glow: 'shadow-[0_0_30px_rgba(59,130,246,0.15)]',
      titleColor: 'text-blue-300'
    },
    warning: {
      bg: 'bg-gradient-to-r from-amber-950/40 via-yellow-950/30 to-orange-950/40 border-amber-500/30 text-amber-200',
      icon: <AlertTriangle className="text-amber-400" size={20} />,
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      glow: 'shadow-[0_0_30px_rgba(245,158,11,0.15)]',
      titleColor: 'text-amber-300'
    },
    alert: {
      bg: 'bg-gradient-to-r from-rose-950/40 via-red-950/30 to-pink-950/40 border-rose-500/30 text-rose-200',
      icon: <Megaphone className="text-rose-400 animate-bounce" size={20} />,
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      glow: 'shadow-[0_0_30px_rgba(244,63,94,0.2)]',
      titleColor: 'text-rose-300'
    },
    success: {
      bg: 'bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-cyan-950/40 border-emerald-500/30 text-emerald-200',
      icon: <CheckCircle2 className="text-emerald-400" size={20} />,
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      glow: 'shadow-[0_0_30px_rgba(16,185,129,0.15)]',
      titleColor: 'text-emerald-300'
    }
  };

  const currentStyle = typeStyles[announcement?.type || 'info'];

  if (loading) {
    return null;
  }

  // If no announcement exists
  if (!announcement || !announcement.message) {
    if (!canManage) return null;

    // Manager / Admin empty state invitation
    return (
      <div className="mb-6" dir="rtl">
        <button
          onClick={handleOpenEdit}
          className="w-full py-2.5 px-4 rounded-2xl bg-white/[0.02] hover:bg-purple-500/[0.06] border border-dashed border-white/10 hover:border-purple-500/40 flex items-center justify-between text-xs text-muted hover:text-purple-300 transition-all group"
        >
          <div className="flex items-center gap-2">
            <Megaphone size={16} className="text-muted group-hover:text-purple-400 transition-colors" />
            <span>إضافة إعلان أو توجيهات إدارية لصفحة <strong className="text-white font-bold">{pageLabel}</strong> (يظهر للفريق بالأعلى)</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-purple-400 group-hover:translate-x-[-2px] transition-transform">
            <Plus size={14} />
            <span>كتابة تنبيه</span>
          </div>
        </button>

        {/* Edit Modal */}
        {isEditing && renderEditModal()}
      </div>
    );
  }

  // Render active announcement
  return (
    <div className="mb-6" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all ${currentStyle.bg} ${currentStyle.glow}`}
      >
        {/* Top Header Bar of Announcement */}
        <div className="px-5 py-3 flex items-center justify-between gap-3 border-b border-white/[0.05]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1.5 rounded-xl bg-white/5 border border-white/10 shadow-sm shrink-0">
              {currentStyle.icon}
            </div>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className={`text-xs font-black tracking-wide ${currentStyle.titleColor} flex items-center gap-1.5`}>
                <Sparkles size={13} />
                <span>توجيهات إدارية — {pageLabel}</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${currentStyle.badge}`}>
                {announcement.type === 'alert' ? 'عاجل وهام' : announcement.type === 'warning' ? 'تنبيه' : announcement.type === 'success' ? 'إنجاز' : 'تعليمات عامة'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Manager / Admin Edit & Delete buttons */}
            {canManage && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
                <button
                  onClick={handleOpenEdit}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-muted hover:text-white transition-all text-xs flex items-center gap-1"
                  title="تعديل نص التنبيه"
                >
                  <Edit3 size={13} />
                  <span className="hidden sm:inline text-[11px] font-bold">تعديل</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 text-rose-400 transition-all text-xs flex items-center gap-1"
                  title="حذف التنبيه"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}

            {/* Collapse/Expand toggle for all users */}
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors"
              title={isCollapsed ? 'عرض التنبيه كاملاً' : 'طي التنبيه'}
            >
              {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          </div>
        </div>

        {/* Message Content */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-6 py-4"
            >
              <div className="text-sm font-medium text-white/90 leading-relaxed whitespace-pre-wrap select-text">
                {announcement.message}
              </div>

              {/* Author & Timestamp footer */}
              <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-muted/70 flex-wrap gap-2">
                <span>
                  ✍️ كتبه: <strong className="text-white/80 font-bold">{announcement.updated_by || 'المانجر'}</strong>
                </span>
                {announcement.updated_at && (
                  <span className="font-mono text-[10px]">
                    ⏱️ آخر تحديث: {new Date(announcement.updated_at).toLocaleDateString('ar-EG', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Edit Modal */}
      {isEditing && renderEditModal()}
    </div>
  );

  function renderEditModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn" dir="rtl">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-[#0f172a] border border-white/15 rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl relative text-white space-y-6"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Megaphone size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">إعلان وتوجيهات صفحة {pageLabel}</h3>
                <p className="text-xs text-muted">سيظهر هذا التنبيه لجميع أعضاء الفريق في هذه الصفحة فوراً</p>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(false)}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-muted hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            {/* Type selector */}
            <div>
              <label className="block text-xs font-bold text-muted mb-2">نوع الإعلان ولون التنبيه:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'info', label: 'معلومات عامة 🔵', color: 'border-blue-500 text-blue-300 bg-blue-500/10' },
                  { id: 'warning', label: 'تنبيه هام 🟡', color: 'border-amber-500 text-amber-300 bg-amber-500/10' },
                  { id: 'alert', label: 'عاجل وتحذير 🔴', color: 'border-rose-500 text-rose-300 bg-rose-500/10' },
                  { id: 'success', label: 'إنجاز وخطة 🟢', color: 'border-emerald-500 text-emerald-300 bg-emerald-500/10' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFormType(t.id as any)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      formType === t.id
                        ? `${t.color} shadow-lg ring-1 ring-white/20`
                        : 'border-white/10 bg-white/5 text-muted hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message input */}
            <div>
              <label className="block text-xs font-bold text-muted mb-2">نص الإعلان أو التوجيهات:</label>
              <textarea
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                placeholder="اكتب التنبيه أو التوجيهات لأعضاء الفريق في هذه الصفحة (يدعم السطور المتعددة والإيموجي)..."
                rows={5}
                className="w-full bg-[#090d16] border border-white/15 focus:border-purple-500 rounded-2xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all resize-none leading-relaxed"
                autoFocus
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white text-xs font-bold transition-all"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? 'جاري الحفظ...' : 'نشر التنبيه الآن 🚀'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }
};
