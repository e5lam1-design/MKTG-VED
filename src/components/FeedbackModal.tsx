import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Send, MessageSquarePlus, Bug, Sparkles, HelpCircle, 
  Calculator, CheckCircle2, AlertCircle, Loader2, User, Layers 
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: string;
  userProfile?: {
    name?: string;
    email?: string;
    role?: string;
  } | null;
  toast?: {
    success: (msg: string) => void;
    error: (msg: string) => void;
  };
}

const CATEGORIES = [
  { id: 'bug', label: 'عطل أو مشكلة تقنية', icon: Bug, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
  { id: 'suggestion', label: 'اقتراح أو فكرة تحسين', icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  { id: 'calculation', label: 'خطأ في الأرقام أو الحسابات', icon: Calculator, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
  { id: 'general', label: 'ملاحظة أو استفسار عام', icon: HelpCircle, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
];

export const FeedbackModal = ({ isOpen, onClose, currentPage, userProfile, toast }: FeedbackModalProps) => {
  const [category, setCategory] = useState('bug');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !details.trim()) {
      setErrorMessage('يرجى كتابة عنوان وتفاصيل الملاحظة أو المشكلة');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const payload = {
        user_name: userProfile?.name || 'مستخدم غير محدد',
        user_email: userProfile?.email || '',
        user_role: userProfile?.role || 'user',
        page_tab: currentPage || 'الرئيسية',
        category: category,
        title: title.trim(),
        details: details.trim(),
        status: 'open',
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('feedback_reports_26').insert([payload]);

      if (error) {
        console.error('[FeedbackModal] Error saving feedback to Supabase:', error);
      }

      setIsSuccess(true);
      if (toast) {
        toast.success('تم إرسال ملاحظتك بنجاح! شكراً لمساعدتنا في تحسين النظام ❤️');
      }

      setTimeout(() => {
        setIsSuccess(false);
        setTitle('');
        setDetails('');
        setCategory('bug');
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('[FeedbackModal] Submission exception:', err);
      setErrorMessage('حدث خطأ أثناء الإرسال: ' + (err?.message || 'حاول مجدداً'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-lg bg-[#0d111a] border border-white/10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-purple-950/20 via-transparent to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
                  <MessageSquarePlus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white arabic-text flex items-center gap-2">
                    <span>إرسال ملاحظة أو بلاغ عن مشكلة</span>
                  </h3>
                  <p className="text-xs text-white/40 font-medium arabic-text">
                    ملاحظاتك تصل مباشرة للوحة التحكم لمتابعتها وحلها فوراً
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            {isSuccess ? (
              <div className="p-10 flex flex-col items-center justify-center text-center space-y-4 animate-fadeIn">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 size={36} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-white arabic-text">تم إرسال الملاحظة بنجاح!</h4>
                  <p className="text-xs text-emerald-300/80 arabic-text">شكراً لمساعدتنا في تحسين وتطوير المنظومة ❤️</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {errorMessage && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2 text-rose-300 text-xs font-bold arabic-text">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Context Info Banner */}
                <div className="flex items-center justify-between bg-black/40 border border-white/5 px-4 py-2.5 rounded-2xl text-xs text-white/70">
                  <span className="flex items-center gap-2">
                    <User size={13} className="text-purple-400" />
                    <strong className="text-white">{userProfile?.name || 'مستخدم'}</strong>
                  </span>
                  <span className="flex items-center gap-2">
                    <Layers size={13} className="text-emerald-400" />
                    <span>الصفحة الحالية: <strong className="text-emerald-300 font-mono">{currentPage}</strong></span>
                  </span>
                </div>

                {/* Category Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-white/70 arabic-text block">نوع الملاحظة:</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`p-3 rounded-2xl border text-right transition-all flex items-center gap-2.5 cursor-pointer ${
                            isSelected
                              ? `${cat.bg} ${cat.color} font-black shadow-lg scale-[1.02]`
                              : 'bg-white/[0.02] border-white/5 text-white/50 hover:bg-white/[0.05] hover:text-white'
                          }`}
                        >
                          <Icon size={16} className={isSelected ? cat.color : 'opacity-60'} />
                          <span className="text-xs arabic-text leading-tight">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-white/70 arabic-text block">
                    عنوان المشكلة / الملاحظة: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: زر التصدير لا يستجيب في صفحة الريلز..."
                    className="w-full bg-black/40 border border-white/10 focus:border-purple-500/50 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder:text-white/20 outline-none transition-all arabic-text shadow-inner"
                    dir="rtl"
                  />
                </div>

                {/* Details Textarea */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-white/70 arabic-text block">
                    الشرح والتفاصيل: <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="اشرح المشكلة بالتفصيل أو اذكر الكود/الصفحة والخطوات التي قمت بها..."
                    className="w-full bg-black/40 border border-white/10 focus:border-purple-500/50 rounded-2xl p-4 text-xs sm:text-sm text-white placeholder:text-white/20 outline-none transition-all arabic-text resize-none shadow-inner leading-relaxed"
                    dir="rtl"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/30 hover:scale-[1.02] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>جاري الإرسال...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>إرسال الملاحظة الآن 🚀</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="py-3.5 px-5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-black transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
