import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  X, 
  Sparkles, 
  Video, 
  Briefcase, 
  Layers, 
  GraduationCap, 
  Film, 
  BarChart3,
  Compass,
  Info
} from 'lucide-react';

interface SystemGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGid: string;
  currentLabel: string;
}

export const SystemGuideModal: React.FC<SystemGuideModalProps> = ({
  isOpen,
  onClose,
  currentGid,
  currentLabel
}) => {
  // Guide topics
  const guideSections = [
    {
      id: 'op_27',
      gidMatch: ['op_27'],
      title: 'شيت العمليات OP 26/27',
      badge: 'العمليات والمحتوى',
      icon: Briefcase,
      color: '#3b82f6',
      summary: 'متابعة وتوثيق جميع دروس المنصة، روابط Bunny، النشر، وتجميع المراجعات.',
      steps: [
        {
          title: '1. متابعة الرفع وروابط Bunny (LINK BUNNY)',
          desc: 'يحدد الكبسولة حالة الفيديو: الأخضر 🟢 يعني تم رفع الفيديو بنجاح وله رابط Bunny جاهز للمشاهدة والنسخ، والأصفر 🟡 يعني قيد التصوير وبدون رابط.',
          tag: '🟢 تم الرفع / 🟡 قيد التصوير'
        },
        {
          title: '2. فلاتر التصفية الذكية',
          desc: 'يمكنك الفلترة حسب المدرس، المرحلة، المادة، أو الضغط على أزرار (الكل / له لينك 🟢 / بدون لينك 🟡) أو الضغط مباشرة على عنوان عمود LINK BUNNY.',
          tag: '🔍 فلترة سريعة'
        },
        {
          title: '3. التجميع والنقل (تجميعة 🔗)',
          desc: 'يمكنك تحديد دروس متعددة باستخدام مربعات الاختيار لإنشاء تجميعة وحساب المدة الإجمالية للفيديوهات وتصديرها للمراحل الدراسية.',
          tag: '🔗 دمج ومراجعات'
        },
        {
          title: '4. المزامنة مع المنصة (SYNCHRONIZE)',
          desc: 'الضغط على زر التحديث يجلب أحدث الدروس وربطها مع استجابات المنصة وقاعدة البيانات مباشرة.',
          tag: '⚡ تحديث حي'
        }
      ]
    },
    {
      id: 'shooting',
      gidMatch: ['1436746012'],
      title: 'شيت التصوير (Shooting)',
      badge: 'إدارة وتصوير الريلز',
      icon: Video,
      color: '#b49fee',
      summary: 'تسجيل السكريبتات الجديدة، متابعة استوديوهات التصوير، والنقل التلقائي لشيت VE.',
      steps: [
        {
          title: '1. إضافة وتوليد كود الريل',
          desc: 'عند إضافة ريل جديد، يتم توليد الكود التلقائي (مثل: s1-hossam-01 v7) وربطه برابط السكريبت.',
          tag: '🪄 كود تلقائي'
        },
        {
          title: '2. زر "اتصور" والمزامنة الفورية',
          desc: 'بمجرد تصوير الريل، اضغط على زر (اتصور). سيتم حفظ تاريخ التصوير ونقل الريل تلقائياً إلى شيت VE ليبدأ المونتير عمله فوراً!',
          tag: '🎥 نقل تلقائي لـ VE'
        },
        {
          title: '3. روابط الراو (Drive Link Raw)',
          desc: 'يتم حفظ رابط الدرايف لملفات الفيديو الخام لتسهيل وصول المونتير إليها.',
          tag: '📁 ملفات الراو'
        }
      ]
    },
    {
      id: 've',
      gidMatch: ['1939073164'],
      title: 'شيت المونتاج (VE - Video Editing)',
      badge: 'مونتاج وتسليم الريلز',
      icon: Film,
      color: '#92dcf7',
      summary: 'مساحة عمل المونتيرين لإنهاء الريلز، إرفاق الفاينال، وطلب التعديلات.',
      steps: [
        {
          title: '1. إسناد المونتير والتفاصيل',
          desc: 'تحديد المونتير المسؤول (EDITOR) ومتابعة أي تفاصيل ناقصة.',
          tag: '👤 إسناد المهمة'
        },
        {
          title: '2. إتمام المونتاج (DONE?)',
          desc: 'عند الانتهاء من المونتاج وإرفاق رابط الفاينال (Drive Link Final)، يتم تفعيل DONE للإشارة لاكتمال الريل.',
          tag: '✅ إتمام وتسليم'
        },
        {
          title: '3. زر طلب التعديل (EDIT) الأزرق 🔵',
          desc: 'إذا وُجدت ملاحظات على الفيديو: يتم الضغط على زر EDIT (الأزرق) لمرة واحدة فقط، والذي يقوم تلقائياً بطلب تعديل وإلغاء علامة DONE لفتح الريل للمراجعة.',
          tag: '⚠️ طلب تعديل لمرة واحدة'
        },
        {
          title: '4. النشر والمشاركة (Publish & Shared Link)',
          desc: 'متابعة نشر الريل على المنصات وروابط المشاركة.',
          tag: '🚀 النشر النهائي'
        }
      ]
    },
    {
      id: 'tagme3at',
      gidMatch: ['1535230545'],
      title: 'شيت التجميعات (Tagme3at)',
      badge: 'قوائم المراجعات والدمج',
      icon: Layers,
      color: '#10b981',
      summary: 'إدارة مهام التجميع، الأولويات اليومية، ونقل الفيديوهات لقنوات اليوتيوب.',
      steps: [
        {
          title: '1. نظام الأولويات (Priority ⭐)',
          desc: 'رفع أولوية المهام ذات الأهمية القصوى لليوم مع وجود حد أقصى للأولويات لضمان كفاءة الإنتاج.',
          tag: '⭐ أولوية مرتفعة'
        },
        {
          title: '2. تعيين المونتير وملاحظات التسويق',
          desc: 'تنسيق العمل بين قسم التسويق والمونتير عبر خانتي Marketing Notes و Editor Notes.',
          tag: '💬 تواصل وتسليم'
        },
        {
          title: '3. متابعة الحالة والرفع',
          desc: 'تحديث حالة التجميعة (Pending / In Progress / Done) وإرفاق الثامبنيل ولينك اليوتيوب.',
          tag: '📊 اكتمال ورفع'
        }
      ]
    },
    {
      id: 'cuts',
      gidMatch: ['0'],
      title: 'شيت الكتس (CUTS)',
      badge: 'قص وتجهيز مقاطع الكورسات',
      icon: Film,
      color: '#ff7843',
      summary: 'متابعة مقاطع الكت وتفريغ المحاضرات لمسؤولي المحتوى والمصممين.',
      steps: [
        {
          title: '1. تسجيل فكرة الكَت والشرح',
          desc: 'تدوين شرح الفكرة ومحتوى المقطع وروابط الداتا (Data Files).',
          tag: '💡 الفكرة والداتا'
        },
        {
          title: '2. تتبع المنشئ (Creator) والحالة',
          desc: 'إسناد المقاطع ومتابعة حالات التنفيذ والتسليم.',
          tag: '✂️ قص وتسليم'
        }
      ]
    },
    {
      id: 'stages',
      gidMatch: ['497207661', '96752860', '346788121', '458352282', '2113852114', '2089699920', '1640460225', '595027661', '286303232'],
      title: 'المراحل الدراسية (Junior & Middle & Senior)',
      badge: 'جداول المناهج والصفوف',
      icon: GraduationCap,
      color: '#a855f7',
      summary: 'متابعة تصوير وتسليم ونشر دروس المناهج المدرسية أسبوعاً بأسبوع.',
      steps: [
        {
          title: '1. التصفية بالأسبوع (Week Filter)',
          desc: 'تصفية سريعة بالكبسولات لعرض دروس أسبوع محدد مثل (أسبوع 1، أسبوع 2...).',
          tag: '📌 تصفية الأسابيع'
        },
        {
          title: '2. علامات التسليم والتجميع (تجميعة ✓ / اتسلمت ✓)',
          desc: 'توثيق استلام الحصص وجاهزيتها للتجميع أو الرفع.',
          tag: '📦 استلام المناهج'
        },
        {
          title: '3. الرفع واليوتيوب (UPLOADED? & Time)',
          desc: 'إرفاق رابط اليوتيوب ومدة الفيديو وعلامة الاكتمال عند النشر للطلاب.',
          tag: '🌐 نشر للطلاب'
        }
      ]
    },
    {
      id: 'analytics',
      gidMatch: ['reels-analytics', 'analytics_tagme3at', 'design-analytics'],
      title: 'لوحات الإحصائيات (Analytics)',
      badge: 'التقارير ومؤشرات الأداء',
      icon: BarChart3,
      color: '#ec4899',
      summary: 'تحليل إنتاجية الفريق، معدلات الإنجاز، وإحصائيات التسليم الدقيقة.',
      steps: [
        {
          title: '1. إحصائيات المونتيرين والمصممين',
          desc: 'حساب عدد الساعات والريلز المنجزة لكل عضو في الفريق بدقة.',
          tag: '👥 أداء الفريق'
        },
        {
          title: '2. نسب الاكتمال ومعدل التعديل',
          desc: 'رسوم بيانية حية توضح نسبة المهام المكتملة، قيد العمل، وطلبات التعديل.',
          tag: '📈 نسب الإنجاز'
        }
      ]
    }
  ];

  // Determine initial active topic based on current page
  const matchedSection = guideSections.find(s => s.gidMatch.includes(currentGid)) || guideSections[0];
  const [selectedTopicId, setSelectedTopicId] = useState<string>(matchedSection.id);
  const [viewMode, setViewMode] = useState<'page' | 'lifecycle'>('page');

  const currentTopic = guideSections.find(s => s.id === selectedTopicId) || matchedSection;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-[#0b1019] border border-white/15 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden relative"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-950/40 via-purple-950/20 to-black/40">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/10">
                <BookOpen size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white arabic-text">دليل استخدام المنظومة 💡</h2>
                  <span className="text-[10px] bg-blue-500/20 border border-blue-500/40 text-blue-300 font-bold px-2 py-0.5 rounded-full">
                    تفاعلي
                  </span>
                </div>
                <p className="text-xs text-muted font-bold arabic-text mt-0.5">
                  شرح مبسط لكيفية عمل كل شيت، الأزرار، والتدفق التلقائي للبيانات
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Mode Switcher */}
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('page')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'page'
                      ? 'bg-blue-600 text-white shadow-sm font-black'
                      : 'text-muted hover:text-white'
                  }`}
                >
                  شرح الشيتات
                </button>
                <button
                  onClick={() => setViewMode('lifecycle')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'lifecycle'
                      ? 'bg-purple-600 text-white shadow-sm font-black'
                      : 'text-muted hover:text-white'
                  }`}
                >
                  <Compass size={14} />
                  <span>دورة العمل الكاملة</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 text-muted hover:text-rose-400 flex items-center justify-center transition-all cursor-pointer"
                title="إغلاق الدليل"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          {viewMode === 'page' ? (
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* Topics Sidebar */}
              <div className="w-full md:w-64 border-b md:border-b-0 md:border-l border-white/10 p-3 bg-black/20 overflow-y-auto space-y-1.5 shrink-0">
                <div className="text-[10px] font-black text-muted uppercase tracking-widest px-3 py-1">
                  اختر الشيت للشرح:
                </div>
                {guideSections.map(sec => {
                  const Icon = sec.icon;
                  const isSelected = sec.id === selectedTopicId;
                  const isCurrent = sec.gidMatch.includes(currentGid);

                  return (
                    <button
                      key={sec.id}
                      onClick={() => setSelectedTopicId(sec.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border text-right transition-all cursor-pointer group ${
                        isSelected
                          ? 'bg-white/10 border-blue-500/50 shadow-lg shadow-blue-500/10 scale-[1.02]'
                          : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div 
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${sec.color}20`, color: sec.color }}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="truncate">
                          <span className={`text-xs block font-bold truncate ${isSelected ? 'text-white font-black' : 'text-muted group-hover:text-white'}`}>
                            {sec.title}
                          </span>
                          <span className="text-[9px] text-muted/70 block truncate">
                            {sec.badge}
                          </span>
                        </div>
                      </div>

                      {isCurrent && (
                        <span className="text-[9px] bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded-md font-bold shrink-0 ml-1">
                          أنت هنا
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Topic Detail Content */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {/* Topic Header Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 flex items-start gap-4">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
                    style={{ backgroundColor: `${currentTopic.color}25`, color: currentTopic.color, border: `1px solid ${currentTopic.color}40` }}
                  >
                    <currentTopic.icon size={26} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-white arabic-text">{currentTopic.title}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/10 text-muted">
                        {currentTopic.badge}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-bold arabic-text mt-1 leading-relaxed">
                      {currentTopic.summary}
                    </p>
                  </div>
                </div>

                {/* Steps / Feature Explanations */}
                <div className="space-y-3">
                  <div className="text-xs font-black text-white/80 flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-400" />
                    <span>أهم الوظائف وطريقة الاستخدام:</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {currentTopic.steps.map((step, idx) => (
                      <div 
                        key={idx}
                        className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 transition-all space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-blue-300 arabic-text">
                            {step.title}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/10 text-muted">
                            {step.tag}
                          </span>
                        </div>
                        <p className="text-xs text-muted font-bold arabic-text leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Pro-Tips */}
                <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 flex items-start gap-3">
                  <Info size={20} className="text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-200 font-bold arabic-text leading-relaxed">
                    💡 <strong className="text-white">نصيحة سريعة:</strong> يمكنك الضغط على أي كود لنسخه بلمسة واحدة، أو النقر على رؤوس الأعمدة للفلترة السريعة وتخصيص طريقة العرض.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Full Workflow Diagram */
            <div className="flex-1 p-8 overflow-y-auto space-y-8">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <h3 className="text-lg font-black text-white arabic-text">🚀 دورة تدفق العمل داخل المنظومة (System Workflow)</h3>
                <p className="text-xs text-muted font-bold arabic-text leading-relaxed">
                  توضح هذه الخريطة كيف تنتقل المهمة والريل من مرحلة الفكرة وحتى النشر والمراجعات والتجميعات بشكل متسلسل ومؤتمت:
                </p>
              </div>

              {/* Step Flow Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                {/* Step 1 */}
                <div className="bg-white/5 border border-purple-500/30 p-4 rounded-2xl text-center space-y-2 relative group hover:bg-purple-500/10 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 mx-auto flex items-center justify-center font-black">
                    1
                  </div>
                  <h4 className="text-xs font-black text-white">السكريبت والكود</h4>
                  <p className="text-[11px] text-muted font-bold leading-relaxed">
                    تسجيل الريل في Shooting وتوليد الكود الفريد تلقائياً.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="bg-white/5 border border-blue-500/30 p-4 rounded-2xl text-center space-y-2 relative group hover:bg-blue-500/10 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 mx-auto flex items-center justify-center font-black">
                    2
                  </div>
                  <h4 className="text-xs font-black text-white">التصوير (اتصور)</h4>
                  <p className="text-[11px] text-muted font-bold leading-relaxed">
                    الضغط على "اتصور" ينقله فورياً ومباشرة لشيت VE.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="bg-white/5 border border-cyan-500/30 p-4 rounded-2xl text-center space-y-2 relative group hover:bg-cyan-500/10 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 mx-auto flex items-center justify-center font-black">
                    3
                  </div>
                  <h4 className="text-xs font-black text-white">المونتاج والتسليم</h4>
                  <p className="text-[11px] text-muted font-bold leading-relaxed">
                    المونتير يرفق الفاينال ويضغط DONE أو يتم طلب EDIT.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="bg-white/5 border border-emerald-500/30 p-4 rounded-2xl text-center space-y-2 relative group hover:bg-emerald-500/10 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center font-black">
                    4
                  </div>
                  <h4 className="text-xs font-black text-white">العمليات والرفع</h4>
                  <p className="text-[11px] text-muted font-bold leading-relaxed">
                    توثيق روابط Bunny 🟢 في OP 26/27 وربطها مع المنصة.
                  </p>
                </div>

                {/* Step 5 */}
                <div className="bg-white/5 border border-amber-500/30 p-4 rounded-2xl text-center space-y-2 relative group hover:bg-amber-500/10 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center font-black">
                    5
                  </div>
                  <h4 className="text-xs font-black text-white">التجميع والنشر</h4>
                  <p className="text-[11px] text-muted font-bold leading-relaxed">
                    دمج الحصص لمراجعات التجميعات والنشر على اليوتيوب.
                  </p>
                </div>
              </div>

              {/* Bottom Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/30 via-indigo-950/30 to-blue-950/30 border border-white/10 text-center space-y-2">
                <span className="text-sm font-black text-white block">🔄 مزامنة فورية Realtime مع قاعدة البيانات</span>
                <p className="text-xs text-muted font-bold max-w-2xl mx-auto leading-relaxed">
                  جميع التحديثات تُحفظ وتظهر لباقي أعضاء الفريق في نفس اللحظة عبر Supabase دون الحاجة لإعادة تحميل الصفحة يدوياً.
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-white/10 flex items-center justify-between bg-black/40 px-6">
            <div className="text-xs text-muted font-bold flex items-center gap-2">
              <span>الصفحة النشطة حالياً:</span>
              <span className="text-blue-400 font-black">{currentLabel || 'الرئيسية'}</span>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              فهمت، شكراً 👍
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
