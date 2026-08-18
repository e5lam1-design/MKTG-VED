import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle, 
  Compass,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

export interface TourStep {
  targetSelector?: string;
  title: string;
  description: string;
  badge?: string;
  position?: 'bottom' | 'top' | 'left' | 'right' | 'center';
  actionHint?: string;
}

interface InteractiveTourProps {
  isOpen: boolean;
  onClose: () => void;
  activeGid: string;
}

export const InteractiveTour: React.FC<InteractiveTourProps> = ({
  isOpen,
  onClose,
  activeGid
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Define tailored tour steps per sheet
  const getStepsForPage = (gid: string): TourStep[] => {
    if (gid === 'op_27') {
      return [
        {
          targetSelector: '#tour-stats-btn',
          title: '1. إحصائيات الدروس وملخص الأداء 📊',
          description: 'اضغط هنا لفتح أو طي ملخص إحصائيات الدروس (المكتملة، قيد العمل، وقيد الانتظار).',
          badge: 'الإحصائيات',
          position: 'bottom',
          actionHint: 'دوس هنا لإظهار/طي الإحصائيات'
        },
        {
          targetSelector: '#tour-search-input',
          title: '2. شريط البحث الفوري 🔍',
          description: 'اكتب اسم الدرس، اسم المدرس، الكود، أو المرحلة للوصول المباشر لأي درس في أجزاء من الثانية.',
          badge: 'البحث',
          position: 'bottom',
          actionHint: 'ابحث بأي كلمة أو كود'
        },
        {
          targetSelector: '#tour-bunny-filters',
          title: '3. فلترة روابط Bunny 🟢 🟡',
          description: 'اضغط على (له لينك 🟢) لعرض الدروس التي تم رفعها ولها فيديو جاهز، أو (بدون لينك 🟡) لعرض الدروس قيد التصوير.',
          badge: 'روابط Bunny',
          position: 'bottom',
          actionHint: 'فلترة سريعة حسب حالة الفيديو'
        },
        {
          targetSelector: '#tour-bunny-col-header',
          title: '4. قائمة الفلترة في رأس الجدول 🔽',
          description: 'يمكنك أيضاً النقر مباشرة على عنوان عمود LINK BUNNY لفتح القائمة المنسدلة والتبديل السريع.',
          badge: 'رأس الجدول',
          position: 'bottom',
          actionHint: 'اضغط لفتح القائمة المنسدلة'
        },
        {
          targetSelector: '#tour-merge-col',
          title: '5. تجميع ودمج الدروس (تجميعة 🔗)',
          description: 'علّم على مربعات الاختيار لتحديد مجموعة دروس، وسيتم حساب مدتها الزمنية تلقائياً وتصديرها كمراجعة مجمعة.',
          badge: 'التجميعات',
          position: 'bottom',
          actionHint: 'اختر الدروس للمراجعات'
        },
        {
          targetSelector: '#tour-sync-btn',
          title: '6. المزامنة مع المنصة ⚡',
          description: 'اضغط هنا لتحديث واستيراد أحدث بيانات ودروس المنصة وقاعدة البيانات في أي وقت.',
          badge: 'المزامنة',
          position: 'bottom',
          actionHint: 'تحديث البيانات الحية'
        }
      ];
    }

    if (gid === '1939073164') { // VE
      return [
        {
          targetSelector: '#tour-search-input',
          title: '1. البحث وفلاتر الريلز 🔍',
          description: 'يمكنك البحث عن أي ريل بالكود، المدرس، السكريبت، أو المونتير.',
          badge: 'البحث',
          position: 'bottom',
          actionHint: 'بحث سريع'
        },
        {
          targetSelector: '#tour-mytasks-btn',
          title: '2. زر مهامي فقط 🎯',
          description: 'اضغط هنا لفلترة الجدول وعرض الريلز المسندة إليك فقط وإخفاء باقي المهام.',
          badge: 'المونتير',
          position: 'bottom',
          actionHint: 'دوس هنا لعرض مهامك فقط'
        },
        {
          targetSelector: '#tour-ve-script-col',
          title: '3. عمود السكريبت والكود 📝',
          description: 'اضغط على السكريبت لفتحه في Google Docs، أو اضغط على الكود لنسخه بضغطة واحدة.',
          badge: 'السكريبت',
          position: 'bottom',
          actionHint: 'فتح السكريبت أو نسخ الكود'
        },
        {
          targetSelector: '#tour-ve-done-col',
          title: '4. خانة الإتمام (DONE?) ✅',
          description: 'عند الانتهاء من مونتاج الريل وإرفاق رابط الفاينال، علّم هنا للإشارة باكتمال المهمة.',
          badge: 'التسليم',
          position: 'bottom',
          actionHint: 'تأكيد اكتمال المونتاج'
        },
        {
          targetSelector: '#tour-ve-edit-col',
          title: '5. زر طلب التعديل (EDIT) الأزرق 🔵',
          description: 'إذا كان هناك تعديل مطلوب على الريل: اضغط على زر EDIT الأزرق لمرة واحدة؛ سيتم إلغاء علامة DONE تلقائياً وإعادة فتح المهمة للتعديل.',
          badge: 'طلب تعديل',
          position: 'bottom',
          actionHint: 'طلب تعديل لمرة واحدة'
        },
        {
          targetSelector: '#tour-ve-final-col',
          title: '6. رابط الفاينال (Drive Link Final) 📁',
          description: 'ضع رابط الدرايف للفيديو النهائي هنا بعد الانتهاء من المونتاج.',
          badge: 'الفاينال',
          position: 'bottom',
          actionHint: 'إرفاق رابط الفيديو النهائي'
        }
      ];
    }

    if (gid === '1436746012') { // Shooting
      return [
        {
          targetSelector: '#tour-add-btn',
          title: '1. إضافة سكريبت ريل جديد ➕',
          description: 'اضغط هنا لفتح نافذة إضافة ريل جديد واختيار المدرس وتوليد الكود التلقائي.',
          badge: 'إضافة',
          position: 'bottom',
          actionHint: 'دوس هنا لإضافة ريل جديد'
        },
        {
          targetSelector: '#tour-shooting-filmed-col',
          title: '2. خانة "اتصور" والمزامنة التلقائية 🎥',
          description: 'بمجرد انتهاء تصوير الريل، علّم على خانة (اتصور)، وسيتم نقله فورياً إلى شيت VE ليبدأ المونتير عمله!',
          badge: 'التصوير',
          position: 'bottom',
          actionHint: 'نقل تلقائي لشيت VE'
        },
        {
          targetSelector: '#tour-shooting-raw-col',
          title: '3. ملفات الراو (Drive Link Raw) 📁',
          description: 'ضع رابط الدرايف لملفات الكاميرا الخام لتكون متاحة للمونتير مباشرة.',
          badge: 'ملفات الراو',
          position: 'bottom',
          actionHint: 'إرفاق راو التصوير'
        }
      ];
    }

    if (gid === '1535230545') { // Tagme3at
      return [
        {
          targetSelector: '#tour-priority-col',
          title: '1. رفع الأولوية (Priority ⭐)',
          description: 'اضغط على علامة النجمة لرفع أولوية التجميعات العاجلة التي يجب إنجازها اليوم أولاً.',
          badge: 'الأولويات',
          position: 'bottom',
          actionHint: 'تحديد الأولويات اليومية'
        },
        {
          targetSelector: '#tour-tagme-editor-col',
          title: '2. إسناد المونتير وملاحظات التسويق 💬',
          description: 'اختر المونتير المسؤول واكتب ملاحظات التسويق والملاحظات الفنية للمراجعة.',
          badge: 'التنسيق',
          position: 'bottom',
          actionHint: 'توجيهات المونتاج والتسويق'
        },
        {
          targetSelector: '#tour-tagme-yt-col',
          title: '3. الرفع واليوتيوب 🌐',
          description: 'إرفاق رابط اليوتيوب وتوقيت الفيديو وعلامة الاكتمال بعد النشر.',
          badge: 'النشر',
          position: 'bottom',
          actionHint: 'توثيق روابط اليوتيوب'
        }
      ];
    }

    // Default general steps
    return [
      {
        targetSelector: '#tour-search-input',
        title: '1. البحث الفوري 🔍',
        description: 'ابحث عن أي درس أو كود أو اسم مدرس بسرعة فائقة.',
        badge: 'البحث',
        position: 'bottom'
      },
      {
        targetSelector: '#tour-mytasks-btn',
        title: '2. مهامي فقط 🎯',
        description: 'تصفية الجدول لعرض المهام المسندة إليك فقط.',
        badge: 'المهام',
        position: 'bottom'
      },
      {
        targetSelector: '#tour-sync-btn',
        title: '3. المزامنة والتحديث ⚡',
        description: 'جلب أحدث التحديثات في الوقت الفعلي.',
        badge: 'المزامنة',
        position: 'bottom'
      }
    ];
  };

  const steps = getStepsForPage(activeGid);
  const currentStep = steps[currentStepIndex] || steps[0];

  // Update target element rect & scroll into view
  useEffect(() => {
    if (!isOpen) return;

    const updateRect = () => {
      if (currentStep?.targetSelector) {
        const el = document.querySelector(currentStep.targetSelector);
        if (el) {
          const rect = el.getBoundingClientRect();
          setTargetRect(rect);
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          return;
        }
      }
      setTargetRect(null);
    };

    updateRect();
    const handleResize = () => updateRect();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [isOpen, currentStepIndex, activeGid, currentStep]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen, activeGid]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] pointer-events-auto" dir="rtl">
      {/* Dark Backdrop Overlay */}
      <div 
        className="absolute inset-0 bg-black/75 backdrop-blur-[2px] transition-all duration-300"
        onClick={onClose}
      />

      {/* Target Element Spotlight Highlight Ring */}
      {targetRect && (
        <motion.div
          layoutId="tour-spotlight"
          initial={false}
          animate={{
            top: Math.max(targetRect.top - 8, 8),
            left: Math.max(targetRect.left - 8, 8),
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute z-[501] rounded-2xl pointer-events-none border-2 border-blue-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.65),0_0_25px_rgba(59,130,246,0.8)] ring-4 ring-blue-500/30 animate-pulse"
        />
      )}

      {/* Floating Interactive Tour Card */}
      <div className="fixed inset-0 z-[502] flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="bg-[#0b1019] border border-blue-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_30px_rgba(37,99,235,0.3)] max-w-lg w-full pointer-events-auto relative overflow-hidden backdrop-blur-xl"
        >
          {/* Top Progress & Badge */}
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
              <span className="text-xs font-black text-blue-400 font-mono">
                خطوة {currentStepIndex + 1} من {steps.length}
              </span>
              {currentStep.badge && (
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold px-2 py-0.5 rounded-md mr-2">
                  {currentStep.badge}
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-rose-500/20 text-muted hover:text-rose-400 flex items-center justify-center transition-all cursor-pointer"
              title="إنهاء الجولة"
            >
              <X size={16} />
            </button>
          </div>

          {/* Step Content */}
          <div className="space-y-3 mb-6">
            <h3 className="text-base font-black text-white arabic-text flex items-center gap-2">
              <Sparkles size={18} className="text-blue-400 shrink-0" />
              <span>{currentStep.title}</span>
            </h3>

            <p className="text-xs text-muted-foreground font-bold arabic-text leading-relaxed bg-white/[0.02] p-3.5 rounded-2xl border border-white/5">
              {currentStep.description}
            </p>

            {currentStep.actionHint && (
              <div className="flex items-center gap-2 text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>💡 {currentStep.actionHint}</span>
              </div>
            )}
          </div>

          {/* Stepper Dots & Navigation Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            {/* Dots */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentStepIndex
                      ? 'w-6 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]'
                      : 'w-2 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>

            {/* Next / Prev / Finish Buttons */}
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <ChevronRight size={16} />
                  <span>السابق</span>
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition-all shadow-lg shadow-blue-600/30 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>{currentStepIndex === steps.length - 1 ? 'إنهاء وفهمت 👍' : 'التالي ➔'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
