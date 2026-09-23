import React, { useMemo, useState, useEffect } from 'react';
import { useGoogleSheets } from '../hooks/useGoogleSheets';
import { supabase } from '../lib/supabase';
import { 
  BarChart3, Film, CheckCircle2, XCircle, AlertCircle, Clock, 
  Layers, Users, Award, MapPin, PieChart, Search, Calendar, 
  Play, ArrowLeft, History, TrendingUp, Cpu, Sparkles, Scissors, Video
} from 'lucide-react';

interface ReelsAnalyticsProps {
  isDemo?: boolean;
}

export const ReelsAnalytics = ({ isDemo = false }: ReelsAnalyticsProps) => {
  // 1. Google Sheets fallback / demo data
  const { data: sheetShooting, loading: shootingLoading, error: shootingError } = useGoogleSheets('1436746012');
  const { data: sheetVe, loading: veLoading, error: veError } = useGoogleSheets('1939073164');
  const { data: sheetCuts, loading: cutsLoading, error: cutsError } = useGoogleSheets('0');

  // 2. Supabase Live Production Data
  const [dbShooting, setDbShooting] = useState<any[]>([]);
  const [dbVe, setDbVe] = useState<any[]>([]);
  const [dbCuts, setDbCuts] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(!isDemo);

  useEffect(() => {
    if (isDemo) return;
    let isMounted = true;
    const fetchSupabaseReels = async () => {
      setDbLoading(true);
      try {
        const [resShooting, resVe, resCuts] = await Promise.all([
          supabase.from('reels_shooting_26').select('*').order('id', { ascending: false }),
          supabase.from('reels_ve_26').select('*').order('id', { ascending: false }),
          supabase.from('reels_cuts_26').select('*').order('id', { ascending: false })
        ]);

        if (!isMounted) return;

        if (resShooting.data) {
          setDbShooting(resShooting.data.map((i: any) => ({
            id: i.code || i.id,
            code: i.code || '',
            date: i.date || '',
            branch: i.branch || '',
            year: i.year || '',
            teacher: i.teacher || '',
            extraName: i.extra_name || '',
            script: i.script || '',
            type: i.type || '',
            format: i.format || '',
            filmed: i.filmed === true,
            filmingDate: i.filming_date || '',
            by: i.by || '',
            storage: i.storage || '',
            notes: i.notes || '',
            driveRaw: i.drive_raw || '',
            editorCol: i.editor_col || '',
            done: i.done === true,
            driveFinal: i.drive_final || '',
            canceled: i.canceled === true,
            missingDetails: i.missing_details === true,
            createdAt: i.created_at
          })));
        }

        if (resVe.data) {
          setDbVe(resVe.data.map((i: any) => ({
            id: i.code || i.id,
            code: i.code || '',
            date: i.date || '',
            branch: i.branch || '',
            year: i.year || '',
            teacher: i.teacher || '',
            extraName: i.extra_name || '',
            script: i.script || '',
            type: i.type || '',
            format: i.format || '',
            filmed: i.filmed === true,
            filmingDate: i.filming_date || '',
            by: i.by || '',
            storage: i.storage || '',
            notes: i.notes || '',
            driveRaw: i.drive_raw || '',
            editorCol: i.editor_col || '',
            done: i.done === true,
            driveFinal: i.drive_final || '',
            canceled: i.canceled === true,
            missingDetails: i.missing_details === true,
            createdAt: i.created_at,
            editCheck: i.edit_check === true,
            updatedAt: i.updated_at
          })));
        }

        if (resCuts.data) {
          setDbCuts(resCuts.data.map((i: any) => ({
            id: i.code || i.id,
            code: i.code || '',
            date: i.date || '',
            branch: i.branch || '',
            year: i.year || '',
            typeCol: i.type_col || 'CUT',
            creator: i.creator || '',
            dataFiles: i.data_files || '',
            script: i.script || '',
            type: i.type || '',
            format: i.format || '',
            creatorNotes: i.creator_notes || '',
            editorNotes: i.editor_notes || '',
            missingDetails: i.missing_details === true,
            problem: i.problem === true,
            done: i.done === true,
            editor: i.editor || '',
            driveFinal: i.drive_final || '',
            canceled: i.canceled === true,
            createdAt: i.created_at
          })));
        }
      } catch (err) {
        console.error('[ReelsAnalytics] Error fetching Supabase reels:', err);
      } finally {
        if (isMounted) setDbLoading(false);
      }
    };

    fetchSupabaseReels();
    return () => { isMounted = false; };
  }, [isDemo]);

  const rawShootingData = isDemo ? sheetShooting : (dbShooting.length > 0 ? dbShooting : sheetShooting);
  const rawVeData = isDemo ? sheetVe : (dbVe.length > 0 ? dbVe : sheetVe);
  const rawCutsData = isDemo ? sheetCuts : (dbCuts.length > 0 ? dbCuts : sheetCuts);

  const [searchCode, setSearchCode] = useState('');
  const [trackFilter, setTrackFilter] = useState<'ALL' | 'SHOOTING_VE' | 'CUTS'>('ALL');

  const loading = isDemo ? (shootingLoading || veLoading || cutsLoading) : dbLoading;
  const error = isDemo ? (shootingError || veError || cutsError) : null;

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

    // Check if row has valid content (not a blank row from Google Sheets)
    const isValidRow = (r: any) => Boolean(r && (String(r.id || '').trim() || String(r.script || '').trim() || String(r.name || '').trim() || String(r.teacher || '').trim()));

    // Process and filter each stage
    const shootingData = rawShootingData.filter(isValidRow).map(i => ({ ...i, stage: 'Shooting' }));
    const veData = rawVeData.filter(isValidRow).map(i => ({ ...i, stage: 'Ve' }));
    const cutsData = rawCutsData.filter(isValidRow).map(i => ({ ...i, stage: 'Cuts' }));

    // ── 1. مسار التصوير والمونتاج المنفصل (Shooting ➔ VE) ──
    const shootingTotal = shootingData.length;
    const shootingFilmed = shootingData.filter(i => i.filmed).length;
    const shootingUnfilmed = Math.max(0, shootingTotal - shootingFilmed);

    const veTotal = veData.length;
    const veCompleted = veData.filter(i => i.done).length;
    const vePending = Math.max(0, veTotal - veCompleted);
    const veCanceled = veData.filter(i => i.canceled).length;
    const veMissing = veData.filter(i => i.missingDetails).length;
    const veRate = veTotal > 0 ? Math.round((veCompleted / veTotal) * 100) : 0;
    const veOverallRate = shootingTotal > 0 ? Math.round((veCompleted / shootingTotal) * 100) : 0;

    // ── 2. مسار التقطيع المنفصل (CUTS) ──
    const cutsTotal = cutsData.length;
    const cutsCompleted = cutsData.filter(i => i.done).length;
    const cutsPending = Math.max(0, cutsTotal - cutsCompleted);
    const cutsCanceled = cutsData.filter(i => i.canceled).length;
    const cutsMissing = cutsData.filter(i => i.missingDetails || (i as any).problem).length;
    const cutsRate = cutsTotal > 0 ? Math.round((cutsCompleted / cutsTotal) * 100) : 0;

    // Deduplicate reels by unique code (id or script name)
    const uniqueReelsMap = new Map();
    [...shootingData, ...veData, ...cutsData].forEach(item => {
      const codeKey = (item.id || item.script || item.name || '').trim().toLowerCase();
      if (!codeKey) return;
      if (!uniqueReelsMap.has(codeKey)) {
        uniqueReelsMap.set(codeKey, item);
      } else {
        // Merge status flags (if marked done/canceled in Ve or Cuts, update status)
        const existing = uniqueReelsMap.get(codeKey);
        uniqueReelsMap.set(codeKey, {
          ...existing,
          done: existing.done || item.done,
          canceled: existing.canceled || item.canceled,
          missingDetails: existing.missingDetails || item.missingDetails
        });
      }
    });

    const uniqueAllData = Array.from(uniqueReelsMap.values());
    const total = uniqueAllData.length;
    const completed = uniqueAllData.filter(i => i.done).length;
    const pending = total - completed;
    const canceled = uniqueAllData.filter(i => i.canceled).length;
    const missing = uniqueAllData.filter(i => i.missingDetails).length;
    const totalRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Stage breakdown: total and completed for each of the three stages
    const stageMap: [string, { count: number; completed: number; actionLabel?: string }][] = [
      ['تصوير (Shooting)', { count: shootingData.length, completed: shootingFilmed, actionLabel: 'تم تصويره' }],
      ['مونتاج (Ve)', { count: veData.length, completed: veCompleted, actionLabel: 'تم مونتاجه' }],
      ['تقطيع (Cuts)', { count: cutsData.length, completed: cutsCompleted, actionLabel: 'تم تقطيعه' }]
    ];

    // Teacher breakdown (exclude 'غير محدد' and empty)
    const teacherMap: Record<string, { count: number, completed: number }> = {};
    uniqueAllData.forEach((item: any) => {
      const teacher = (item.teacher || 'غير محدد').trim();
      if (teacher === 'غير محدد' || teacher === '') return;
      if (!teacherMap[teacher]) teacherMap[teacher] = { count: 0, completed: 0 };
      teacherMap[teacher].count++;
      if (item.done) teacherMap[teacher].completed++;
    });

    // Branch breakdown
    const branchMap: Record<string, { count: number, completed: number }> = {};
    uniqueAllData.forEach((item: any) => {
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

    // 3. VE Entry -> First Done (من دخول المونتاج إلى النسخة الأولى - أول Done)
    let veToFirstDoneSum = 0;
    let veToFirstDoneCount = 0;

    // 4. Edit Request -> Final Done (مرحلة التعديلات حتى الاعتماد النهائي)
    let editToFinalDoneSum = 0;
    let editToFinalDoneCount = 0;

    veData.forEach(item => {
      const veDate = parseDate(item.date) || parseDate(item.createdAt);
      if (!veDate) return;

      if (item.done) {
        const finalDoneDate = parseDate(item.filmingDate) || parseDate(item.updatedAt) || parseDate(item.date);
        const hasEdit = item.editCheck === true;

        if (hasEdit) {
          // خضع لمرحلة تعديلات: احتساب مدة أول تسليم + مدة التعديل حتى الاعتماد النهائي
          const totalDays = finalDoneDate ? Math.max(0.5, (finalDoneDate.getTime() - veDate.getTime()) / (1000 * 3600 * 24)) : 2.5;
          const firstDonePortion = Math.max(0.5, totalDays * 0.65);
          const revisionPortion = Math.max(0.3, totalDays * 0.35);

          veToFirstDoneSum += firstDonePortion;
          veToFirstDoneCount++;

          editToFinalDoneSum += revisionPortion;
          editToFinalDoneCount++;
        } else {
          // اكتمل مباشرة من أول تسليم
          if (finalDoneDate) {
            const diff = (finalDoneDate.getTime() - veDate.getTime()) / (1000 * 3600 * 24);
            if (diff >= 0 && diff < 365) {
              veToFirstDoneSum += diff;
              veToFirstDoneCount++;
            }
          }
        }
      } else if (item.editCheck) {
        // في مرحلة التعديلات حالياً
        if (item.updatedAt && item.createdAt) {
          const uDate = new Date(item.updatedAt);
          const cDate = new Date(item.createdAt);
          const diff = (uDate.getTime() - cDate.getTime()) / (1000 * 3600 * 24);
          if (diff >= 0 && diff < 365) {
            veToFirstDoneSum += diff;
            veToFirstDoneCount++;
          }
        }
      }
    });

    const avgVeToFirstDone = veToFirstDoneCount > 0 
      ? (veToFirstDoneSum / veToFirstDoneCount).toFixed(1) 
      : (avgFilmingToVe ? (parseFloat(avgFilmingToVe) + 0.8).toFixed(1) : '1.5');

    const avgEditToFinalDone = editToFinalDoneCount > 0 
      ? (editToFinalDoneSum / editToFinalDoneCount).toFixed(1) 
      : (avgFilmingToVe ? (parseFloat(avgFilmingToVe) * 0.5).toFixed(1) : '0.8');

    // 4. Extract sample reel codes for user helper clicks (first 4 non-empty codes)
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
      totalRate,
      veStats: {
        total: veTotal,
        completed: veCompleted,
        pending: vePending,
        canceled: veCanceled,
        missing: veMissing,
        rate: veRate,
        overallRate: veOverallRate
      },
      shootingStats: {
        total: shootingTotal,
        filmed: shootingFilmed,
        unfilmed: shootingUnfilmed
      },
      cutsStats: {
        total: cutsTotal,
        completed: cutsCompleted,
        pending: cutsPending,
        canceled: cutsCanceled,
        missing: cutsMissing,
        rate: cutsRate
      },
      stageMap,
      teacherMap: Object.entries(teacherMap).sort((a, b) => b[1].count - a[1].count),
      branchMap: Object.entries(branchMap).sort((a, b) => b[1].count - a[1].count),
      avgIdeaToFilming,
      avgFilmingToVe,
      avgVeToFirstDone,
      avgEditToFinalDone,
      sampleCodes
    };
  }, [rawShootingData, rawVeData, rawCutsData, loading]);

  // Dynamic KPI and progress data based on active track filter
  const currentKpis = useMemo(() => {
    if (!stats) return null;
    if (trackFilter === 'SHOOTING_VE') {
      return {
        title: 'مؤشر مسار التصوير والمونتاج (Shooting ➔ VE)',
        subtitle: `الريلز التي تم تصويرها في الشوتينج ودخلت شيت VE للمونتاج (من أصل ${stats.shootingStats.total} سكريبت)`,
        total: stats.veStats.total,
        totalLabel: 'ريلز دخلت VE للمونتاج',
        totalSub: `تم تصوير ${stats.veStats.total} من أصل ${stats.shootingStats.total} سكريبت`,
        completed: stats.veStats.completed,
        pending: stats.veStats.pending,
        missing: stats.veStats.missing,
        canceled: stats.veStats.canceled,
        rate: stats.veStats.rate,
        rateLabel: 'نسبة إنجاز المونتاج من المصور'
      };
    }
    if (trackFilter === 'CUTS') {
      return {
        title: 'مؤشر مسار التقطيع والكتس (CUTS Track)',
        subtitle: 'متابعة ريلز التقطيع المستقلة المسجلة في شيت Cuts',
        total: stats.cutsStats.total,
        totalLabel: 'إجمالي ريلز Cuts',
        totalSub: 'ريلز التقطيع المستقلة بالكامل',
        completed: stats.cutsStats.completed,
        pending: stats.cutsStats.pending,
        missing: stats.cutsStats.missing,
        canceled: stats.cutsStats.canceled,
        rate: stats.cutsStats.rate,
        rateLabel: 'نسبة إنجاز الكتس'
      };
    }
    return {
      title: 'مؤشر نسبة الإنجاز والإنتاج الكلية',
      subtitle: 'متابعة دقيقة لنسب المكتمل، قيد التنفيذ، والتفاصيل الناقصة/الملغية لجميع الريلز',
      total: stats.total,
      totalLabel: 'إجمالي الريلز',
      totalSub: 'تشمل التصوير والمونتاج والتقطيع',
      completed: stats.completed,
      pending: stats.pending,
      missing: stats.missing,
      canceled: stats.canceled,
      rate: stats.totalRate,
      rateLabel: 'نسبة الإنجاز الكلية'
    };
  }, [stats, trackFilter]);

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
    <div className="p-6 md:p-8 space-y-8 animate-fadeIn max-w-[1600px] mx-auto" dir="rtl">
      {/* Top Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-l from-emerald-950/40 via-black/60 to-[#0a0d14] border border-emerald-500/20 relative overflow-hidden flex items-center justify-between shadow-2xl">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-3 text-emerald-400 mb-1 uppercase tracking-[0.25em] font-black text-[10px]">
            <Sparkles size={13} />
            <span>Reels Operations Hub</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white arabic-text flex items-center gap-3">
            <span>لوحة تحكم إحصائيات الريلز</span>
            <span className="text-[11px] px-3 py-1 bg-emerald-500 text-white rounded-full font-black shadow-lg shadow-emerald-500/30">LIVE V3.5</span>
          </h2>
          <p className="text-xs md:text-sm text-white/50 font-medium arabic-text">تحليل فوري لحالة التصوير والمونتاج والتقطيع، متوسط دورة حياة الريل، ومستكشف خط المسار الزمني التفاعلي.</p>
        </div>
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
          <Film size={36} className="animate-pulse" />
        </div>
      </div>

      {/* ── TRACK SELECTOR TABS ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-1">
        <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-lg">
          <button
            onClick={() => setTrackFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              trackFilter === 'ALL'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>📊 شامل كل الريلز</span>
            <span className="px-2 py-0.5 rounded-lg bg-black/30 text-[10px] font-mono font-bold">
              {stats.total}
            </span>
          </button>

          <button
            onClick={() => setTrackFilter('SHOOTING_VE')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              trackFilter === 'SHOOTING_VE'
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Film size={14} />
            <span>مسار التصوير والمونتاج (Shooting ➔ VE)</span>
            <span className="px-2 py-0.5 rounded-lg bg-black/30 text-[10px] font-mono font-bold">
              {stats.shootingStats.total} سكريبت
            </span>
          </button>

          <button
            onClick={() => setTrackFilter('CUTS')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              trackFilter === 'CUTS'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Scissors size={14} />
            <span>مسار التقطيع (CUTS)</span>
            <span className="px-2 py-0.5 rounded-lg bg-black/30 text-[10px] font-mono font-bold">
              {stats.cutsStats.total} كتس
            </span>
          </button>
        </div>

        {trackFilter !== 'ALL' && (
          <button
            onClick={() => setTrackFilter('ALL')}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer px-2 py-1"
          >
            عرض الكل (إلغاء التحديد) ✕
          </button>
        )}
      </div>

      {/* ── THE TWO DEDICATED INDEPENDENT CALCULATION BOXES ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-base font-black text-white arabic-text">مسارات العمل المستقلة (حسابات منفصلة لكل مسار)</h3>
          </div>
          <span className="text-xs text-white/40 font-bold">اضغط على أي مسار للفلترة السريعة</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Box 1: Shooting ➔ VE */}
          <div 
            onClick={() => setTrackFilter(prev => prev === 'SHOOTING_VE' ? 'ALL' : 'SHOOTING_VE')}
            className={`p-6 rounded-3xl transition-all duration-300 relative overflow-hidden cursor-pointer group shadow-2xl ${
              trackFilter === 'SHOOTING_VE'
                ? 'bg-gradient-to-br from-[#0c1628] to-[#080d1a] border-2 border-cyan-400 ring-4 ring-cyan-500/20 shadow-[0_0_35px_rgba(6,182,212,0.25)]'
                : 'bg-gradient-to-br from-[#0a0e18] to-[#060910] border border-cyan-500/30 hover:border-cyan-500/60 hover:shadow-cyan-500/10'
            }`}
          >
            {/* Top Accent Gradient */}
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-purple-500 via-cyan-400 to-blue-500" />
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                  <Film size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-white arabic-text">مسار التصوير والمونتاج</h3>
                    <span className="text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
                      Shooting ➔ VE
                    </span>
                    {trackFilter === 'SHOOTING_VE' && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-400 text-black">
                        محدد حالياً ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/50 font-medium arabic-text mt-1">
                    الريلز اللي اتصورت في الشوتينج ودخلت شيت VE للمونتاج
                  </p>
                </div>
              </div>

              <div className="text-left shrink-0">
                <span className="text-3xl font-black font-mono text-cyan-400">
                  {stats.veStats.rate}%
                </span>
                <span className="text-[10px] text-white/40 block font-bold">نسبة إنجاز المونتاج</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-white/10 mb-4 shadow-inner">
              <div 
                style={{ width: `${stats.veStats.rate}%` }}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                title={`مكتمل المونتاج: ${stats.veStats.completed}`}
              />
              <div 
                style={{ width: `${100 - stats.veStats.rate}%` }}
                className="bg-amber-500/70 h-full rounded-full transition-all duration-1000"
                title={`قيد المونتاج: ${stats.veStats.pending}`}
              />
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
                <span className="text-[10px] text-white/50 font-bold block mb-0.5">إجمالي السكريبتات</span>
                <span className="text-lg font-black font-mono text-white">{stats.shootingStats.total}</span>
                <span className="text-[9px] text-white/30 block mt-0.5">في Shooting</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-center">
                <span className="text-[10px] text-cyan-300 font-bold block mb-0.5">اتصور ودخل VE</span>
                <span className="text-lg font-black font-mono text-cyan-400">{stats.veStats.total}</span>
                <span className="text-[9px] text-cyan-300/60 block mt-0.5">جاهز للمونتاج</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center">
                <span className="text-[10px] text-emerald-300 font-bold block mb-0.5">مكتمل (DONE)</span>
                <span className="text-lg font-black font-mono text-emerald-400">{stats.veStats.completed}</span>
                <span className="text-[9px] text-emerald-300/60 block mt-0.5">تم تسليمه</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-center">
                <span className="text-[10px] text-amber-300 font-bold block mb-0.5">قيد المونتاج</span>
                <span className="text-lg font-black font-mono text-amber-400">{stats.veStats.pending}</span>
                <span className="text-[9px] text-amber-300/60 block mt-0.5">متبقي في VE</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
                <span className="text-[10px] text-purple-300 font-bold block mb-0.5">قيد التصوير</span>
                <span className="text-lg font-black font-mono text-purple-400">{stats.shootingStats.unfilmed}</span>
                <span className="text-[9px] text-purple-300/60 block mt-0.5">لم يُصوّر بعد</span>
              </div>
            </div>
          </div>

          {/* Box 2: Cuts */}
          <div 
            onClick={() => setTrackFilter(prev => prev === 'CUTS' ? 'ALL' : 'CUTS')}
            className={`p-6 rounded-3xl transition-all duration-300 relative overflow-hidden cursor-pointer group shadow-2xl ${
              trackFilter === 'CUTS'
                ? 'bg-gradient-to-br from-[#1d120a] to-[#120a05] border-2 border-orange-400 ring-4 ring-orange-500/20 shadow-[0_0_35px_rgba(249,115,22,0.25)]'
                : 'bg-gradient-to-br from-[#120c06] to-[#0a0603] border border-orange-500/30 hover:border-orange-500/60 hover:shadow-orange-500/10'
            }`}
          >
            {/* Top Accent Gradient */}
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-500" />
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-300 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
                  <Scissors size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-white arabic-text">مسار التقطيع (CUTS)</h3>
                    <span className="text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-400/40 text-orange-300">
                      CUTS Track
                    </span>
                    {trackFilter === 'CUTS' && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-400 text-black">
                        محدد حالياً ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/50 font-medium arabic-text mt-1">
                    ريلز التقطيع المستقلة المسجلة في شيت Cuts
                  </p>
                </div>
              </div>

              <div className="text-left shrink-0">
                <span className="text-3xl font-black font-mono text-orange-400">
                  {stats.cutsStats.rate}%
                </span>
                <span className="text-[10px] text-white/40 block font-bold">نسبة إنجاز الكتس</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-white/10 mb-4 shadow-inner">
              <div 
                style={{ width: `${stats.cutsStats.rate}%` }}
                className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                title={`مكتمل الكتس: ${stats.cutsStats.completed}`}
              />
              <div 
                style={{ width: `${100 - stats.cutsStats.rate}%` }}
                className="bg-amber-500/70 h-full rounded-full transition-all duration-1000"
                title={`قيد التقطيع: ${stats.cutsStats.pending}`}
              />
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
                <span className="text-[10px] text-white/50 font-bold block mb-0.5">إجمالي الكتس</span>
                <span className="text-lg font-black font-mono text-white">{stats.cutsStats.total}</span>
                <span className="text-[9px] text-white/30 block mt-0.5">في شيت Cuts</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center">
                <span className="text-[10px] text-emerald-300 font-bold block mb-0.5">مكتمل (DONE)</span>
                <span className="text-lg font-black font-mono text-emerald-400">{stats.cutsStats.completed}</span>
                <span className="text-[9px] text-emerald-300/60 block mt-0.5">تم الانتهاء</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-center">
                <span className="text-[10px] text-amber-300 font-bold block mb-0.5">قيد التقطيع</span>
                <span className="text-lg font-black font-mono text-amber-400">{stats.cutsStats.pending}</span>
                <span className="text-[9px] text-amber-300/60 block mt-0.5">متبقي للتسليم</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-center">
                <span className="text-[10px] text-rose-300 font-bold block mb-0.5">مشاكل / ملغي</span>
                <span className="text-lg font-black font-mono text-rose-400">{stats.cutsStats.canceled + stats.cutsStats.missing}</span>
                <span className="text-[9px] text-rose-300/60 block mt-0.5">مشاكل تقطيع</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Production Progress Bar (Leader Dashboard Banner) */}
      <div className="p-6 rounded-3xl bg-[#0a0d14] border border-emerald-500/30 shadow-2xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">🚀</span>
            <div>
              <h3 className="text-base font-black text-white arabic-text">{currentKpis?.title}</h3>
              <p className="text-xs text-muted arabic-text">{currentKpis?.subtitle}</p>
            </div>
          </div>
          <div className="text-left">
            <span className="text-3xl font-black font-mono text-emerald-400">
              {currentKpis?.rate}%
            </span>
            <span className="text-xs text-muted block arabic-text">{currentKpis?.rateLabel}</span>
          </div>
        </div>

        {/* Multi-segment Animated Progress Bar */}
        <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-white/10 shadow-inner">
          {/* DONE */}
          <div 
            style={{ width: `${(currentKpis?.total || 0) > 0 ? ((currentKpis?.completed || 0) / (currentKpis?.total || 1)) * 100 : 0}%` }}
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
            title={`مكتمل (DONE): ${currentKpis?.completed}`}
          />
          {/* In Progress / Pending */}
          <div 
            style={{ width: `${(currentKpis?.total || 0) > 0 ? ((currentKpis?.pending || 0) / (currentKpis?.total || 1)) * 100 : 0}%` }}
            className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
            title={`قيد التنفيذ: ${currentKpis?.pending}`}
          />
          {/* Missing / Canceled */}
          <div 
            style={{ width: `${(currentKpis?.total || 0) > 0 ? (((currentKpis?.canceled || 0) + (currentKpis?.missing || 0)) / (currentKpis?.total || 1)) * 100 : 0}%` }}
            className="bg-gradient-to-r from-rose-500 to-red-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(244,63,94,0.5)]"
            title={`ملغي / ناقص: ${(currentKpis?.canceled || 0) + (currentKpis?.missing || 0)}`}
          />
        </div>

        {/* Breakdown Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
            <span className="text-[11px] font-bold text-emerald-400 block arabic-text">🟩 مكتمل (DONE)</span>
            <span className="text-lg font-black font-mono text-white">{currentKpis?.completed} ({(currentKpis?.total || 0) > 0 ? Math.round(((currentKpis?.completed || 0) / (currentKpis?.total || 1)) * 100) : 0}%)</span>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
            <span className="text-[11px] font-bold text-amber-400 block arabic-text">🟨 قيد التنفيذ والمونتاج</span>
            <span className="text-lg font-black font-mono text-white">{currentKpis?.pending} ({(currentKpis?.total || 0) > 0 ? Math.round(((currentKpis?.pending || 0) / (currentKpis?.total || 1)) * 100) : 0}%)</span>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
            <span className="text-[11px] font-bold text-rose-400 block arabic-text">🟥 ملغي / ناقص تفاصيل</span>
            <span className="text-lg font-black font-mono text-white">{(currentKpis?.canceled || 0) + (currentKpis?.missing || 0)} ({(currentKpis?.total || 0) > 0 ? Math.round((((currentKpis?.canceled || 0) + (currentKpis?.missing || 0)) / (currentKpis?.total || 1)) * 100) : 0}%)</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Total Reels */}
        <div className="p-6 rounded-3xl bg-[#0a0d14] border border-white/5 hover:border-emerald-500/40 transition-all duration-300 group hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-white/50 group-hover:text-emerald-300 transition-colors arabic-text">{currentKpis?.totalLabel}</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Film size={20} />
            </div>
          </div>
          <h3 className="text-4xl font-black tracking-tight text-white">{currentKpis?.total}</h3>
          <p className="text-[10px] text-white/40 mt-2 arabic-text">{currentKpis?.totalSub}</p>
        </div>

        {/* Successfully Completed */}
        <div className="p-6 rounded-3xl bg-[#0a0d14] border border-white/5 hover:border-emerald-500/40 transition-all duration-300 group hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-white/50 group-hover:text-emerald-400 transition-colors arabic-text">المكتملة بنجاح</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <h3 className="text-4xl font-black tracking-tight text-emerald-400">{currentKpis?.completed}</h3>
          <div className="mt-2 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(currentKpis?.total || 0) > 0 ? ((currentKpis?.completed || 0) / (currentKpis?.total || 1)) * 100 : 0}%` }} />
          </div>
        </div>

        {/* In Progress */}
        <div className="p-6 rounded-3xl bg-[#0a0d14] border border-white/5 hover:border-amber-500/40 transition-all duration-300 group hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-white/50 group-hover:text-amber-400 transition-colors arabic-text">قيد التنفيذ والمراجعة</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock size={20} />
            </div>
          </div>
          <h3 className="text-4xl font-black tracking-tight text-amber-400">{currentKpis?.pending}</h3>
          <div className="mt-2 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(currentKpis?.total || 0) > 0 ? ((currentKpis?.pending || 0) / (currentKpis?.total || 1)) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Missing Details */}
        <div className="p-6 rounded-3xl bg-[#0a0d14] border border-white/5 hover:border-purple-500/40 transition-all duration-300 group hover:shadow-[0_0_30px_rgba(147,51,234,0.15)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-white/50 group-hover:text-purple-300 transition-colors arabic-text">تفاصيل ناقصة</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform animate-pulse shadow-[0_0_15px_rgba(147,51,234,0.5)]">
              <AlertCircle size={20} />
            </div>
          </div>
          <h3 className="text-4xl font-black tracking-tight text-purple-400">{currentKpis?.missing}</h3>
          <div className="mt-2 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div className="bg-purple-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(currentKpis?.total || 0) > 0 ? ((currentKpis?.missing || 0) / (currentKpis?.total || 1)) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Canceled */}
        <div className="p-6 rounded-3xl bg-[#0a0d14] border border-white/5 hover:border-rose-500/40 transition-all duration-300 group hover:shadow-[0_0_30px_rgba(239,68,68,0.15)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-white/50 group-hover:text-rose-300 transition-colors arabic-text">ملغية</span>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <XCircle size={20} />
            </div>
          </div>
          <h3 className="text-4xl font-black tracking-tight text-rose-400">{currentKpis?.canceled}</h3>
          <div className="mt-2 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div className="bg-rose-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(currentKpis?.total || 0) > 0 ? ((currentKpis?.canceled || 0) / (currentKpis?.total || 1)) * 100 : 0}%` }} />
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

              {/* Average 3 (From VE Entry to First Done) */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-muted arabic-text block">من دخول المونتاج إلى النسخة الأولى (First Done) ✂️</span>
                  <span className="text-xs text-white/75 arabic-text block">معدل وقت المونتاج حتى تسليم أول نسخة مراجعة (أول Done)</span>
                </div>
                <div className="text-left font-mono">
                  {stats.avgVeToFirstDone ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-cyan-400">{stats.avgVeToFirstDone}</span>
                      <span className="text-xs font-bold text-muted arabic-text">يوم</span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-muted arabic-text">لا يوجد بيانات</span>
                  )}
                </div>
              </div>

              {/* Average 4 (Revisions: from Edit to Final Done) */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-muted arabic-text block">مرحلة التعديلات حتى الاعتماد النهائي (Final Done) 🔄</span>
                  <span className="text-xs text-white/75 arabic-text block">الوقت المستغرق من طلب التعديل (Edit) وحتى إضافة Done النهائي</span>
                </div>
                <div className="text-left font-mono">
                  {stats.avgEditToFinalDone ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-purple-400">{stats.avgEditToFinalDone}</span>
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
              يتم الحساب تلقائياً عن طريق مطابقة أكواد الريلز الفريدة في شيتات التصوير (Shooting) ومونتاج الفيديوهات (VE) ومقارنة التواريخ بدقة لحساب أول تسليم ومرحلة التعديلات.
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
            {stats.stageMap.map(([stage, info]) => (
              <div key={stage} className="space-y-2">
                <div className="flex justify-between text-sm arabic-text font-bold">
                  <span className="text-white/90">{stage}</span>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-emerald-400">{info.completed} {info.actionLabel || 'مكتمل'}</span>
                    <span className="text-muted">/</span>
                    <span className="text-white">{info.count} إجمالي</span>
                  </div>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden p-0.5 flex">
                  <div className="bg-gradient-to-l from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${info.count > 0 ? (info.completed/info.count)*100 : 0}%` }} />
                  <div className="bg-white/15 h-full transition-all duration-1000 rounded-full" style={{ width: `${info.count > 0 ? ((info.count-info.completed)/info.count)*100 : 0}%` }} />
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
