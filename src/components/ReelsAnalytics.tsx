import React, { useMemo, useState } from 'react';
import { useGoogleSheets } from '../hooks/useGoogleSheets';
import { 
  BarChart3, Film, CheckCircle2, XCircle, AlertCircle, Clock, 
  Layers, Users, Award, MapPin, PieChart, Search, Calendar, 
  Play, ArrowLeft, History, TrendingUp, Cpu, Sparkles
} from 'lucide-react';

export const ReelsAnalytics = () => {
  // Fetch data from the 3 sheets using the existing hook
  const { data: rawShootingData, loading: shootingLoading, error: shootingError } = useGoogleSheets('1436746012');
  const { data: rawVeData, loading: veLoading, error: veError } = useGoogleSheets('1939073164');
  const { data: rawCutsData, loading: cutsLoading, error: cutsError } = useGoogleSheets('0');

  const [searchCode, setSearchCode] = useState('');

  const loading = shootingLoading || veLoading || cutsLoading;
  const error = shootingError || veError || cutsError;

  // Date parsing helper
  const parseDate = (dStr: string) => {
    if (!dStr) return null;
    const clean = dStr.trim();
    const parts = clean.split('/');
    if (parts.length === 3) {
      const m = parseInt(parts[0], 10) - 1;
      const d = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime())) return date;
    }
    const date = new Date(clean);
    if (!isNaN(date.getTime())) return date;
    return null;
  };

  const stats = useMemo(() => {
    if (loading || !rawShootingData || !rawVeData || !rawCutsData) return null;

    // Process each stage
    const shootingData = rawShootingData.map(i => ({ ...i, stage: 'Shooting' }));
    const veData = rawVeData.map(i => ({ ...i, stage: 'Ve' }));
    const cutsData = rawCutsData.map(i => ({ ...i, stage: 'Cuts' }));

    // Combine all
    const allData = [...shootingData, ...veData, ...cutsData];

    const total = allData.length;
    const completed = allData.filter(i => i.done).length;
    const pending = total - completed;
    const canceled = allData.filter(i => i.canceled).length;
    const missing = allData.filter(i => i.missingDetails).length;

    // Stage breakdown: total and completed for each of the three stages
    const stageMap = [
      ['تصوير (Shooting)', { count: shootingData.length, completed: shootingData.filter(i => i.done).length }],
      ['مونتاج (Ve)', { count: veData.length, completed: veData.filter(i => i.done).length }],
      ['تقطيع (Cuts)', { count: cutsData.length, completed: cutsData.filter(i => i.done).length }]
    ];

    // Teacher breakdown (exclude 'غير محدد' and empty)
    const teacherMap: Record<string, { count: number, completed: number }> = {};
    allData.forEach((item: any) => {
      const teacher = (item.teacher || 'غير محدد').trim();
      if (teacher === 'غير محدد' || teacher === '') return;
      if (!teacherMap[teacher]) teacherMap[teacher] = { count: 0, completed: 0 };
      teacherMap[teacher].count++;
      if (item.done) teacherMap[teacher].completed++;
    });

    // Branch breakdown
    const branchMap: Record<string, { count: number, completed: number }> = {};
    allData.forEach((item: any) => {
      const branch = (item.branch || 'غير محدد').trim();
      if (!branchMap[branch]) branchMap[branch] = { count: 0, completed: 0 };
      branchMap[branch].count++;
      if (item.done) branchMap[branch].completed++;
    });

    // ── Calculate Lifecycle Averages ───────────────────────
    
    // 1. Idea -> Filmed
    let ideaToFilmingSum = 0;
    let ideaToFilmingCount = 0;
    shootingData.forEach(item => {
      const sDate = parseDate(item.date);
      const fDate = parseDate(item.filmingDate);
      if (sDate && fDate) {
        const diff = (fDate.getTime() - sDate.getTime()) / (1000 * 3600 * 24);
        if (diff >= 0 && diff < 365) {
          ideaToFilmingSum += diff;
          ideaToFilmingCount++;
        }
      }
    });
    const avgIdeaToFilming = ideaToFilmingCount > 0 ? (ideaToFilmingSum / ideaToFilmingCount).toFixed(1) : null;

    // 2. Filmed -> VE Entry
    const shootingFilmingMap = new Map();
    shootingData.forEach(item => {
      if (item.id) {
        shootingFilmingMap.set(item.id.trim().toLowerCase(), item);
      }
    });

    let filmingToVeSum = 0;
    let filmingToVeCount = 0;
    veData.forEach(item => {
      if (item.id) {
        const sItem = shootingFilmingMap.get(item.id.trim().toLowerCase());
        if (sItem) {
          const fDate = parseDate(sItem.filmingDate);
          const veDate = parseDate(item.date);
          if (fDate && veDate) {
            const diff = (veDate.getTime() - fDate.getTime()) / (1000 * 3600 * 24);
            if (diff >= 0 && diff < 365) {
              filmingToVeSum += diff;
              filmingToVeCount++;
            }
          }
        }
      }
    });
    const avgFilmingToVe = filmingToVeCount > 0 ? (filmingToVeSum / filmingToVeCount).toFixed(1) : null;

    // 3. Extract sample reel codes for user helper clicks (first 4 non-empty codes)
    const sampleCodes: string[] = [];
    for (const item of shootingData) {
      if (item.id && item.id.trim()) {
        const code = item.id.trim();
        if (!sampleCodes.includes(code)) {
          sampleCodes.push(code);
          if (sampleCodes.length >= 4) break;
        }
      }
    }

    return {
      total,
      completed,
      pending,
      canceled,
      missing,
      stageMap,
      teacherMap: Object.entries(teacherMap).sort((a, b) => b[1].count - a[1].count),
      branchMap: Object.entries(branchMap).sort((a, b) => b[1].count - a[1].count),
      avgIdeaToFilming,
      avgFilmingToVe,
      sampleCodes
    };
  }, [rawShootingData, rawVeData, rawCutsData, loading]);

  // Find timeline details dynamically for the searched code
  const timelineItem = useMemo(() => {
    const code = searchCode.trim().toLowerCase();
    if (!code || loading || !rawShootingData || !rawVeData || !rawCutsData) return null;

    const sItem = rawShootingData.find(i => i.id?.trim().toLowerCase() === code);
    const vItem = rawVeData.find(i => i.id?.trim().toLowerCase() === code);
    const cItem = rawCutsData.find(i => i.id?.trim().toLowerCase() === code);

    const extractUrl = (val: string) => {
      if (!val) return '';
      const s = String(val).trim();
      const hyperlinkRegex = /=HYPERLINK\s*\(\s*(['"])(.*?)\1\s*,\s*(['"])(.*?)\3\s*\)/i;
      const match = s.match(hyperlinkRegex);
      if (match) return match[2].trim();
      return s;
    };

    if (!sItem && !vItem && !cItem) return null;

    return {
      code: sItem?.id || vItem?.id || cItem?.id || searchCode,
      scriptName: sItem?.script || vItem?.script || cItem?.script || 'اسم غير معروف',
      teacher: sItem?.teacher || vItem?.teacher || 'غير محدد',
      branch: sItem?.branch || vItem?.branch || cItem?.branch || 'غير محدد',
      year: sItem?.year || vItem?.year || cItem?.year || 'غير محدد',
      format: sItem?.format || vItem?.format || cItem?.format || 'REEL',
      type: sItem?.type || vItem?.type || cItem?.type || 'غير محدد',
      
      // Stage 1: Idea
      stage1: {
        active: !!sItem,
        date: sItem?.date || null,
        details: sItem ? `السكريبت: ${sItem.script || 'بدون اسم'} (${sItem.teacher || 'غير محدد'})` : null
      },
      // Stage 2: Filming
      stage2: {
        active: !!sItem?.filmed,
        date: sItem?.filmingDate || null,
        details: sItem?.filmed ? `المصور: ${sItem.by || 'غير محدد'} | التخزين: ${sItem.storage || 'غير محدد'}` : 'قيد تصوير الفكرة'
      },
      // Stage 3: VE / Editing
      stage3: {
        active: !!vItem,
        date: vItem?.date || null,
        details: vItem ? `المحرر المستلم: ${vItem.editorCol || 'غير محدد'}${vItem.notes ? ` (${vItem.notes})` : ''}` : 'قيد الانتظار لدخول المونتاج'
      },
      // Stage 4: Completed
      stage4: {
        active: !!(vItem?.done || cItem?.done),
        date: cItem?.date || vItem?.filmingDate || null,
        details: (vItem?.done || cItem?.done) ? 'تم الانتهاء بنجاح وإنتاج النسخة النهائية!' : 'في انتظار المراجعة والانتهاء',
        link: extractUrl(cItem?.driveFinal || vItem?.driveFinal || '') || null
      }
    };
  }, [searchCode, rawShootingData, rawVeData, rawCutsData, loading]);

  if (loading) {
    return (
      <div className="py-40 text-center">
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto shadow-[0_0_30px_rgba(16,185,129,0.5)]" />
        <p className="mt-6 text-xs font-black uppercase tracking-[0.4em] text-emerald-400 animate-pulse">جاري جلب وتحليل بيانات الريلز...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-center max-w-sm">
          <AlertCircle size={40} className="text-rose-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white arabic-text mb-2">خطأ في جلب البيانات</h3>
          <p className="text-sm text-rose-300/80">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="p-12 space-y-12 animate-fadeIn animate-duration-300" dir="rtl">
      {/* Top Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-l from-emerald-600/20 via-teal-900/20 to-transparent border border-emerald-500/30 relative overflow-hidden flex items-center justify-between shadow-[0_0_50px_rgba(16,185,129,0.15)]">
        <div className="space-y-2 relative z-10">
          <h2 className="text-3xl font-black text-white arabic-text flex items-center gap-3">
            <span>لوحة تحكم إحصائيات الريلز</span>
            <span className="text-xs px-3 py-1 bg-emerald-500 text-white rounded-full font-bold shadow-lg shadow-emerald-500/50">LIVE V3.5</span>
          </h2>
          <p className="text-sm text-emerald-300/80 arabic-text">تحليل فوري لحالة التصوير والمونتاج والتقطيع، متوسط دورة حياة الريل، ومستكشف خط المسار الزمني التفاعلي.</p>
        </div>
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
          <Film size={40} className="animate-pulse" />
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Total Reels */}
        <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/50 transition-all duration-300 group hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-muted group-hover:text-emerald-300 transition-colors arabic-text">إجمالي الريلز</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Film size={20} />
            </div>
          </div>
          <h3 className="text-4xl font-black tracking-tight text-white">{stats.total}</h3>
          <p className="text-[10px] text-muted mt-2 arabic-text opacity-60">تشمل التصوير والمونتاج والتقطيع</p>
        </div>

        {/* Successfully Completed */}
        <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/50 transition-all duration-300 group hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-muted group-hover:text-emerald-400 transition-colors arabic-text">المكتملة بنجاح</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <h3 className="text-4xl font-black tracking-tight text-emerald-400">{stats.completed}</h3>
          <div className="mt-2 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${stats.total > 0 ? (stats.completed/stats.total)*100 : 0}%` }} />
          </div>
        </div>

        {/* In Progress */}
        <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-amber-500/50 transition-all duration-300 group hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-muted group-hover:text-amber-400 transition-colors arabic-text">قيد التنفيذ والمراجعة</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock size={20} />
            </div>
          </div>
          <h3 className="text-4xl font-black tracking-tight text-amber-400">{stats.pending}</h3>
          <div className="mt-2 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full transition-all duration-1000" style={{ width: `${stats.total > 0 ? (stats.pending/stats.total)*100 : 0}%` }} />
          </div>
        </div>

        {/* Missing Details */}
        <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-purple-500/50 transition-all duration-300 group hover:shadow-[0_0_30px_rgba(147,51,234,0.15)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-muted group-hover:text-purple-300 transition-colors arabic-text">تفاصيل ناقصة</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform animate-pulse shadow-[0_0_15px_rgba(147,51,234,0.5)]">
              <AlertCircle size={20} />
            </div>
          </div>
          <h3 className="text-4xl font-black tracking-tight text-purple-400">{stats.missing}</h3>
          <div className="mt-2 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div className="bg-purple-500 h-full rounded-full transition-all duration-1000" style={{ width: `${stats.total > 0 ? (stats.missing/stats.total)*100 : 0}%` }} />
          </div>
        </div>

        {/* Canceled */}
        <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-rose-500/50 transition-all duration-300 group hover:shadow-[0_0_30px_rgba(239,68,68,0.15)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-muted group-hover:text-rose-300 transition-colors arabic-text">ملغية</span>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <XCircle size={20} />
            </div>
          </div>
          <h3 className="text-4xl font-black tracking-tight text-rose-400">{stats.canceled}</h3>
          <div className="mt-2 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div className="bg-rose-500 h-full rounded-full transition-all duration-1000" style={{ width: `${stats.total > 0 ? (stats.canceled/stats.total)*100 : 0}%` }} />
          </div>
        </div>
      </div>

      {/* ── NEW SECTION: Reel Lifecycle Averages & Timeline Explorer ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Averages Panel - 5 Cols */}
        <div className="lg:col-span-5 glass-panel p-8 rounded-3xl border border-white/10 space-y-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white arabic-text">متوسط دورة حياة الريل</h3>
                <p className="text-xs text-muted arabic-text">معدل المدد الزمنية المستغرقة بين مراحل الإنتاج</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-2">
              {/* Average 1 */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-muted arabic-text block">من الفكرة إلى التصوير الفعلي 🎥</span>
                  <span className="text-xs text-white/75 arabic-text block">الفرق بين تاريخ السكريبت وتاريخ التصوير</span>
                </div>
                <div className="text-left font-mono">
                  {stats.avgIdeaToFilming ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-emerald-400">{stats.avgIdeaToFilming}</span>
                      <span className="text-xs font-bold text-muted arabic-text">يوم</span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-muted arabic-text">لا يوجد بيانات</span>
                  )}
                </div>
              </div>

              {/* Average 2 */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-muted arabic-text block">من التصوير إلى دخول المونتاج 🎬</span>
                  <span className="text-xs text-white/75 arabic-text block">الوقت المستغرق لإرسال الماتريال للمونتاج</span>
                </div>
                <div className="text-left font-mono">
                  {stats.avgFilmingToVe ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-emerald-400">{stats.avgFilmingToVe}</span>
                      <span className="text-xs font-bold text-muted arabic-text">يوم</span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-muted arabic-text">لا يوجد بيانات</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 mt-4">
            <Sparkles size={20} className="text-emerald-400 shrink-0" />
            <p className="text-[10px] text-emerald-300 arabic-text leading-relaxed">
              يتم الحساب تلقائياً عن طريق مطابقة أكواد الريلز الفريدة في شيتات التصوير (Shooting) ومونتاج الفيديوهات (VE) ومقارنة التواريخ المدخلة بدقة.
            </p>
          </div>
        </div>

        {/* Timeline Explorer Panel - 7 Cols */}
        <div className="lg:col-span-7 glass-panel p-8 rounded-3xl border border-white/10 space-y-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                <History size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white arabic-text">مستكشف المسار الزمني للريل</h3>
                <p className="text-xs text-muted arabic-text">تتبع دورة حياة ريل محدد ومعرفة حالته في كل مرحلة بالتاريخ</p>
              </div>
            </div>
          </div>

          {/* Search Box */}
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="ادخل كود الريل للبحث... (مثال: s3-cut-hesham-01)"
                value={searchCode}
                onChange={e => setSearchCode(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono text-sm shadow-inner text-left"
                dir="ltr"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
            </div>

            {/* Quick Sample Clickers */}
            {stats.sampleCodes && stats.sampleCodes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted arabic-text">أمثلة سريعة:</span>
                {stats.sampleCodes.map(code => (
                  <button
                    key={code}
                    onClick={() => setSearchCode(code)}
                    className="px-2.5 py-1 bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 border border-white/5 rounded-lg font-mono transition-colors cursor-pointer text-muted"
                  >
                    {code}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Timeline Output / Stepper */}
          <div className="pt-2">
            {timelineItem ? (
              <div className="space-y-6 animate-fadeIn">
                {/* Stepper Header Info */}
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <span className="text-[10px] text-muted uppercase tracking-widest block font-bold">REEL IDENTIFIED</span>
                    <span className="text-sm font-black text-white font-mono">{timelineItem.code}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted arabic-text block font-bold">اسم السكريبت</span>
                    <span className="text-xs font-bold text-emerald-400 arabic-text">{timelineItem.scriptName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted arabic-text block font-bold">المدرس والفرع</span>
                    <span className="text-xs font-bold text-white arabic-text">{timelineItem.teacher} ({timelineItem.branch})</span>
                  </div>
                </div>

                {/* Vertical Stepper Process */}
                <div className="relative border-r border-white/10 pr-6 space-y-8 mr-2">
                  
                  {/* Step 1: Concept/Idea */}
                  <div className="relative">
                    <div className={`absolute right-[-31px] top-1 w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-black ${
                      timelineItem.stage1.active 
                        ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30' 
                        : 'bg-white/5 border-white/10 text-muted'
                    }`}>
                      1
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-white arabic-text">المرحلة الأولى: 📝 إدخال الفكرة والسكريبت</h4>
                        {timelineItem.stage1.date && (
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center gap-1">
                            <Calendar size={10} />
                            {timelineItem.stage1.date}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted arabic-text">
                        {timelineItem.stage1.details || 'فشل في جلب بيانات الفكرة الأساسية'}
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Filmed */}
                  <div className="relative">
                    <div className={`absolute right-[-31px] top-1 w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-black ${
                      timelineItem.stage2.active 
                        ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30' 
                        : 'bg-white/5 border-white/10 text-muted'
                    }`}>
                      2
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-white arabic-text">المرحلة الثانية: 🎥 التصوير الفعلي</h4>
                        {timelineItem.stage2.active && timelineItem.stage2.date && (
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center gap-1">
                            <Calendar size={10} />
                            {timelineItem.stage2.date}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted arabic-text">
                        {timelineItem.stage2.details}
                      </p>
                    </div>
                  </div>

                  {/* Step 3: VE / Editing */}
                  <div className="relative">
                    <div className={`absolute right-[-31px] top-1 w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-black ${
                      timelineItem.stage3.active 
                        ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30' 
                        : 'bg-white/5 border-white/10 text-muted'
                    }`}>
                      3
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-white arabic-text">المرحلة الثالثة: 🎬 دخول المونتاج ومرحلة الـ VE</h4>
                        {timelineItem.stage3.active && timelineItem.stage3.date && (
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center gap-1">
                            <Calendar size={10} />
                            {timelineItem.stage3.date}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted arabic-text">
                        {timelineItem.stage3.details}
                      </p>
                    </div>
                  </div>

                  {/* Step 4: Done / Complete */}
                  <div className="relative">
                    <div className={`absolute right-[-31px] top-1 w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-black ${
                      timelineItem.stage4.active 
                        ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30' 
                        : 'bg-white/5 border-white/10 text-muted'
                    }`}>
                      4
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-white arabic-text">المرحلة الرابعة: ✅ اكتمال الريل وإنتاجه نهائياً</h4>
                        {timelineItem.stage4.active && timelineItem.stage4.date && (
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center gap-1">
                            <Calendar size={10} />
                            {timelineItem.stage4.date}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted arabic-text">
                        {timelineItem.stage4.details}
                      </p>

                      {/* Clickable final link button */}
                      {timelineItem.stage4.link && (
                        <div className="pt-1">
                          <a
                            href={timelineItem.stage4.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 w-fit transition-all hover:scale-105 active:scale-95 shadow-md shadow-purple-500/20"
                          >
                            <Play size={12} />
                            <span>عرض الرابط النهائي للريل</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            ) : searchCode.trim() ? (
              <div className="py-12 text-center bg-white/[0.01] border border-white/5 rounded-2xl space-y-2">
                <AlertCircle className="text-amber-500 mx-auto" size={32} />
                <h4 className="text-sm font-bold text-white arabic-text">لم يتم العثور على الكود</h4>
                <p className="text-xs text-muted arabic-text">يرجى التحقق من صحة كود الريل أو اختيار مثال من الأمثلة السريعة أعلاه.</p>
              </div>
            ) : (
              <div className="py-12 text-center bg-white/[0.01] border border-white/5 rounded-2xl space-y-2 text-muted">
                <Cpu className="mx-auto" size={32} />
                <h4 className="text-sm font-bold arabic-text">في انتظار إدخال الكود</h4>
                <p className="text-xs arabic-text">ادخل كود ريل محدد للبدء في توليد ورسم خط حياته الزمني تلقائياً.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stage Distribution */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <PieChart size={20} />
              </div>
              <h3 className="text-xl font-black text-white arabic-text">توزيع الريلز على المراحل</h3>
            </div>
            <span className="text-xs text-muted font-bold">{stats.stageMap.length} مراحل نشطة</span>
          </div>
          <div className="space-y-5 max-h-[360px] overflow-y-auto pr-2">
            {stats.stageMap.map(([stage, { count, completed }]) => (
              <div key={stage} className="space-y-2">
                <div className="flex justify-between text-sm arabic-text font-bold">
                  <span className="text-white/90">{stage}</span>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-emerald-400">{completed} مكتمل</span>
                    <span className="text-muted">/</span>
                    <span className="text-white">{count} إجمالي</span>
                  </div>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden p-0.5 flex">
                  <div className="bg-gradient-to-l from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${count > 0 ? (completed/count)*100 : 0}%` }} />
                  <div className="bg-white/15 h-full transition-all duration-1000 rounded-full" style={{ width: `${count > 0 ? ((count-completed)/count)*100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Teachers Performance */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Users size={20} />
              </div>
              <h3 className="text-xl font-black text-white arabic-text">أداء المدرسين وحالة المونتاج</h3>
            </div>
            <span className="text-xs text-muted font-bold">{stats.teacherMap.length} مدرسين</span>
          </div>
          <div className="space-y-5 max-h-[360px] overflow-y-auto pr-2">
            {stats.teacherMap.map(([teacher, { count, completed }]) => (
              <div key={teacher} className="space-y-2">
                <div className="flex justify-between text-sm arabic-text font-bold">
                  <span className="text-white/90 flex items-center gap-2">
                    <Award size={14} className="text-amber-400" />
                    <span>{teacher}</span>
                  </span>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-lg">{Math.round((completed/Math.max(1, count))*100)}% إنجاز</span>
                    <span className="text-white">{completed} / {count} ريلز كاملة</span>
                  </div>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-gradient-to-l from-emerald-500 to-indigo-500 h-full rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${count > 0 ? (completed/count)*100 : 0}%` }} />
                </div>
              </div>
            ))}
            {stats.teacherMap.length === 0 && (
              <p className="text-center text-muted text-sm arabic-text py-10">لا يوجد بيانات للمدرسين حالياً.</p>
            )}
          </div>
        </div>

        {/* Branch Distribution */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6 relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <MapPin size={20} />
              </div>
              <h3 className="text-xl font-black text-white arabic-text">توزيع الريلز حسب الفروع</h3>
            </div>
            <span className="text-xs text-muted font-bold">{stats.branchMap.length} فروع نشطة</span>
          </div>
          <div className="space-y-5 max-h-[360px] overflow-y-auto pr-2">
            {stats.branchMap.map(([branch, { count, completed }]) => (
              <div key={branch} className="space-y-2">
                <div className="flex justify-between text-sm arabic-text font-bold">
                  <span className="text-white/90">{branch}</span>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-blue-400">{completed} مكتمل</span>
                    <span className="text-muted">/</span>
                    <span className="text-white">{count} إجمالي</span>
                  </div>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden p-0.5 flex">
                  <div className="bg-gradient-to-l from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${count > 0 ? (completed/count)*100 : 0}%` }} />
                  <div className="bg-white/15 h-full transition-all duration-1000 rounded-full" style={{ width: `${count > 0 ? ((count-completed)/count)*100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
