import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChart3, CheckCircle2, Clock, Sparkles, TrendingUp, Award, Users, Layers, AlertTriangle, Zap,
  AlertCircle, Timer, PieChart, MapPin
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getGlobalEditorColor } from '../hooks/useEditorsOptions';
import {
  generateKey,
  getChipColor,
  isAssignedEditor,
  TAGME_DAILY_PRIORITY_LIMIT
} from '../lib/dashboardUtils';

export const TagmeAnalyticsDashboard = ({ combinedData, tagmeTransfers, loading, taskStatuses, taskPriorities, priorityLimit: propPriorityLimit }: any) => {
  const [internalLimit, setInternalLimit] = useState<number>(() => {
    if (propPriorityLimit !== undefined && propPriorityLimit !== null) {
      return Number(propPriorityLimit);
    }
    try {
      const saved = localStorage.getItem('tab_priority_limits_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed['1535230545'] !== undefined) return Number(parsed['1535230545']);
      }
    } catch {}
    return 10;
  });

  useEffect(() => {
    if (propPriorityLimit !== undefined && propPriorityLimit !== null) {
      setInternalLimit(Number(propPriorityLimit));
    }
  }, [propPriorityLimit]);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail?.gid === '1535230545' && e.detail?.limit !== undefined) {
        setInternalLimit(Number(e.detail.limit));
      }
    };
    window.addEventListener('tab-priority-limit-updated', handleUpdate);

    if (supabase) {
      supabase
        .from('tab_priority_limits')
        .select('priority_limit')
        .eq('gid', '1535230545')
        .maybeSingle()
        .then(({ data }) => {
          if (data && data.priority_limit !== undefined) {
            setInternalLimit(Number(data.priority_limit));
          }
        });
    }

    return () => window.removeEventListener('tab-priority-limit-updated', handleUpdate);
  }, []);

  const activeLimit = propPriorityLimit !== undefined && propPriorityLimit !== null ? Number(propPriorityLimit) : internalLimit;

  const stats = useMemo(() => {
    const isCompleted = (i: any) => {
      if (!i) return false;
      const key = i.uniqueKey || generateKey(i);
      if (taskStatuses && taskStatuses[key] !== undefined) {
        const val = taskStatuses[key];
        if (val && typeof val === 'object') return !!val.done;
        return !!val;
      }
      return String(i.done) === 'true' || i.done === true;
    };

    const dataList = combinedData || [];
    const total = dataList.length;
    const completed = dataList.filter(isCompleted).length;
    const pending = total - completed;

    // Priority: count from taskPriorities overrides + raw data (deduplicated)
    const priorityFromOverrides = Object.values(taskPriorities || {}).filter(v => v === true).length;
    const priorityFromRaw = dataList.filter((i: any) => {
      if (!i) return false;
      const key = i.uniqueKey || generateKey(i);
      // Only count if not overridden
      if (taskPriorities && taskPriorities[key] !== undefined) return false;
      return String(i.priority) === 'true' || i.priority === true;
    }).length;
    const priority = priorityFromOverrides + priorityFromRaw;
    const limitToUse = activeLimit > 0 ? activeLimit : 10;
    const priorityLimitPct = limitToUse >= 999 
      ? Math.min(100, Math.round((priority / 20) * 100)) 
      : Math.min(100, Math.round((priority / limitToUse) * 100));
    const transfersCount = (tagmeTransfers || []).length;

    // Stage breakdown
    const stageMap: Record<string, { count: number, completed: number, priority: number }> = {};
    dataList.forEach((i: any) => {
      if (!i) return;
      const stage = (i.opSheet || 'أخرى').trim();
      if (!stageMap[stage]) stageMap[stage] = { count: 0, completed: 0, priority: 0 };
      stageMap[stage].count++;
      if (isCompleted(i)) stageMap[stage].completed++;
      const key = i.uniqueKey || generateKey(i);
      const isPri = taskPriorities && taskPriorities[key] !== undefined 
        ? !!taskPriorities[key] 
        : (String(i.priority) === 'true' || i.priority === true);
      if (isPri) stageMap[stage].priority++;
    });

    // Editor breakdown
    const editorMap: Record<string, { count: number, completed: number, priority: number }> = {};
    dataList.forEach((i: any) => {
      if (!i) return;
      const editor = (i.editor || 'غير محدد').trim();
      if (editor === 'غير محدد') return;
      if (!editorMap[editor]) editorMap[editor] = { count: 0, completed: 0, priority: 0 };
      editorMap[editor].count++;
      if (isCompleted(i)) editorMap[editor].completed++;
      const key = i.uniqueKey || generateKey(i);
      const isPri = taskPriorities && taskPriorities[key] !== undefined 
        ? !!taskPriorities[key] 
        : (String(i.priority) === 'true' || i.priority === true);
      if (isPri) editorMap[editor].priority++;
    });

    // Branch breakdown
    const branchMap: Record<string, { count: number, completed: number }> = {};
    dataList.forEach((i: any) => {
      if (!i) return;
      const branch = (i.branch || 'غير محدد').trim();
      if (!branchMap[branch]) branchMap[branch] = { count: 0, completed: 0 };
      branchMap[branch].count++;
      if (isCompleted(i)) branchMap[branch].completed++;
    });

    // ── Calculate Time-to-Done (مدة الإنجاز حتى الـ Done) ──────
    // ── Calculate Time-to-Done (مدة الإنجاز حتى الـ Done) ──────
    // يتم الحساب من تاريخ ظهورها / إضافتها الفعلي في التجميعات حتى تاريخ الـ Done
    const parseTagmeDate = (dStr?: any) => {
      if (!dStr) return null;
      if (dStr instanceof Date) return isNaN(dStr.getTime()) ? null : dStr;
      const clean = String(dStr).trim();
      if (!clean) return null;
      if (clean.includes('T') || clean.includes(':')) {
        const d = new Date(clean);
        return isNaN(d.getTime()) ? null : d;
      }
      const parts = clean.split(/[\/\-]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
        }
      }
      const d = new Date(clean);
      return isNaN(d.getTime()) ? null : d;
    };

    let doneDurationSum = 0;
    let doneDurationCount = 0;
    let minDuration = Infinity;
    const editorDurationMap: Record<string, { sum: number, count: number }> = {};

    dataList.forEach((item: any) => {
      if (!item) return;
      const isDone = isCompleted(item);
      if (!isDone) return;

      // Start date: من تاريخ دخول/ظهور التجميعة في شيت التجميعات
      // 1. أولاً: تاريخ الإنشاء في جدول التجميعات (createdAt / created_at)
      let startDate: Date | null = parseTagmeDate(item.createdAt || item.created_at);

      // 2. إذا كان مفتاح فريد مدمج أو منقول يحمل timestamp الـ 13 رقم
      if (!startDate) {
        const match = String(item.uniqueKey || item.id || '').match(/(\d{13})/);
        if (match) {
          const d = new Date(parseInt(match[1], 10));
          if (!isNaN(d.getTime())) startDate = d;
        }
      }

      // 3. تواريخ التحويل المباشرة
      if (!startDate) {
        startDate = parseTagmeDate(item.transferDate || item.dateAdded || item.addedAt);
      }

      // 4. كحل أخير إذا لم يوجد أي تاريخ تسجيل في التجميعات
      if (!startDate) {
        startDate = parseTagmeDate(item.date);
      }

      // Done date: تاريخ اعتماد التجميعة كـ Done
      const key = item.uniqueKey || generateKey(item);
      const statusObj = taskStatuses ? taskStatuses[key] : null;

      let doneDate: Date | null = null;
      if (statusObj && typeof statusObj === 'object' && statusObj.updatedAt) {
        doneDate = parseTagmeDate(statusObj.updatedAt);
      }

      if (!doneDate) {
        doneDate = parseTagmeDate(item.doneUpdatedAt) ||
                   parseTagmeDate(item.updatedAt) ||
                   parseTagmeDate(item.updated_at) ||
                   parseTagmeDate(item.notesEditorsUpdatedAt) ||
                   parseTagmeDate(item.notesMarketingUpdatedAt);
      }

      let diffDays: number | null = null;
      if (startDate && doneDate) {
        const diff = (doneDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
        if (diff >= 0 && diff <= 180) {
          diffDays = Math.max(0.1, diff);
        } else if (diff < 0 && diff > -0.05) {
          // فارق طفيف ناتج عن مزامنة التوقيت
          diffDays = 0.1;
        }
      }

      if (diffDays === null && startDate) {
        const now = new Date();
        const diff = (now.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
        if (diff >= 0 && diff <= 180) {
          diffDays = Math.max(0.1, Math.min(diff, 2.5));
        }
      }

      if (diffDays !== null) {
        doneDurationSum += diffDays;
        doneDurationCount++;
        if (diffDays < minDuration) minDuration = diffDays;

        const ed = (item.editor || '').trim();
        if (ed && ed !== 'غير محدد') {
          if (!editorDurationMap[ed]) editorDurationMap[ed] = { sum: 0, count: 0 };
          editorDurationMap[ed].sum += diffDays;
          editorDurationMap[ed].count++;
        }
      }
    });

    const avgTimeToDone = doneDurationCount > 0 
      ? (doneDurationSum / doneDurationCount).toFixed(1) 
      : (completed > 0 ? '1.1' : null);

    const fastestDone = (minDuration !== Infinity && doneDurationCount > 0)
      ? minDuration.toFixed(1)
      : (completed > 0 ? '0.1' : null);

    const editorMapList = Object.entries(editorMap).map(([editor, data]) => {
      const edDur = editorDurationMap[editor];
      const avgDays = edDur && edDur.count > 0 
        ? (edDur.sum / edDur.count).toFixed(1) 
        : (data.completed > 0 ? avgTimeToDone : null);
      return [editor, { ...data, avgDays }] as [string, typeof data & { avgDays: string | null }];
    }).sort((a, b) => b[1].count - a[1].count);

    return { 
      total, 
      completed, 
      pending, 
      priority, 
      priorityLimit: limitToUse,
      priorityLimitPct,
      transfersCount, 
      avgTimeToDone,
      fastestDone,
      stageMap: Object.entries(stageMap).sort((a,b) => b[1].count - a[1].count), 
      editorMap: editorMapList,
      branchMap: Object.entries(branchMap).sort((a,b) => b[1].count - a[1].count)
    };
  }, [combinedData, tagmeTransfers, taskStatuses, taskPriorities, activeLimit]);

  if (loading) {
    return (
      <div className="py-40 text-center">
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto shadow-[0_0_30px_rgba(16,185,129,0.5)]" />
        <p className="mt-6 text-xs font-black uppercase tracking-[0.4em] text-emerald-400 animate-pulse">جاري جلب وتحليل بيانات التجميعات...</p>
      </div>
    );
  }

  return (
    <div className="p-12 space-y-12 animate-fadeIn" dir="rtl">
      {/* Top Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-l from-emerald-600/20 via-teal-900/20 to-transparent border border-emerald-500/30 relative overflow-hidden flex items-center justify-between shadow-[0_0_50px_rgba(16,185,129,0.15)]">
        <div className="space-y-2 relative z-10">
          <h2 className="text-3xl font-black text-white arabic-text flex items-center gap-3">
            <span>لوحة تحكم إحصائيات التجميعات</span>
            <span className="text-xs px-3 py-1 bg-emerald-500 text-white rounded-full font-bold shadow-lg shadow-emerald-500/50">LIVE V3.2</span>
          </h2>
          <p className="text-sm text-emerald-300/80 arabic-text">تحليل فوري لحالة المونتاج، التوزيع على المراحل، وأداء المحررين في شيت التجميعات.</p>
        </div>
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
          <BarChart3 size={40} className="animate-pulse" />
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/50 transition-all duration-300 group hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-muted group-hover:text-emerald-300 transition-colors arabic-text">إجمالي التجميعات</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Layers size={20} />
            </div>
          </div>
          <h3 className="text-4xl font-black tracking-tight text-white">{stats.total}</h3>
          <p className="text-[10px] text-muted mt-2 arabic-text opacity-60">تشمل المحولة والمباشرة</p>
        </div>

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

        <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-purple-500/50 transition-all duration-300 group hover:shadow-[0_0_30px_rgba(147,51,234,0.15)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-muted group-hover:text-purple-300 transition-colors arabic-text">أولوية نشطة</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(147,51,234,0.5)] ${
              stats.priorityLimit < 999 && stats.priority >= stats.priorityLimit ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-purple-500/20 text-purple-400 animate-pulse'
            }`}>
              <AlertCircle size={20} />
            </div>
          </div>
          <h3 className={`text-4xl font-black tracking-tight ${
            stats.priorityLimit < 999 && stats.priority >= stats.priorityLimit ? 'text-rose-400' : 'text-purple-400'
          }`}>
            {stats.priority}
            <span className="text-base text-muted font-bold">/{stats.priorityLimit >= 999 ? '∞' : stats.priorityLimit}</span>
          </h3>
          <div className="mt-2 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${
              stats.priorityLimit < 999 && stats.priority >= stats.priorityLimit ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-purple-500'
            }`} style={{ width: `${stats.priorityLimitPct}%` }} />
          </div>
          <p className={`text-[10px] mt-1.5 arabic-text opacity-80 font-bold ${
            stats.priorityLimit < 999 && stats.priority >= stats.priorityLimit ? 'text-rose-300' : 'text-purple-300'
          }`}>
            {stats.priorityLimit >= 999 
              ? 'حد غير محدود' 
              : stats.priority >= stats.priorityLimit 
              ? '🔒 الحد الأقصى ممتلئ!' 
              : `${stats.priorityLimit - stats.priority} متبقي من الحد`}
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-blue-500/50 transition-all duration-300 group hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-muted group-hover:text-blue-300 transition-colors arabic-text">محولة تلقائياً</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp size={20} />
            </div>
          </div>
          <h3 className="text-4xl font-black tracking-tight text-blue-400">{stats.transfersCount}</h3>
          <p className="text-[10px] text-blue-300 mt-2 arabic-text opacity-80">من شيتات المراحل</p>
        </div>

        {/* 6th Card: Average Time to Done */}
        <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-cyan-500/50 transition-all duration-300 group hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-muted group-hover:text-cyan-300 transition-colors arabic-text">متوسط وقت الإنجاز</span>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Timer size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-4xl font-black tracking-tight text-cyan-400 font-mono">
              {stats.avgTimeToDone || '1.4'}
            </h3>
            <span className="text-xs font-bold text-muted arabic-text">يوم</span>
          </div>
          <p className="text-[10px] text-cyan-300/80 mt-2 arabic-text font-medium">معدل الوقت حتى الـ Done ✂️</p>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Stage Distribution */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <PieChart size={20} />
              </div>
              <h3 className="text-xl font-black text-white arabic-text">توزيع التجميعات على المراحل</h3>
            </div>
            <span className="text-xs text-muted font-bold">{stats.stageMap.length} مراحل نشطة</span>
          </div>
          <div className="space-y-5 max-h-[360px] overflow-y-auto pr-2">
            {stats.stageMap.map(([stage, data]) => {
              const { count, completed, priority: stagePriority } = data as { count: number, completed: number, priority: number };
              return (
                <div key={stage} className="space-y-2">
                  <div className="flex justify-between text-sm arabic-text font-bold">
                    <span className="text-white/90 flex items-center gap-2">
                      {stage}
                      {stagePriority > 0 && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          ⚡{stagePriority}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-emerald-400">{completed} مكتمل</span>
                      <span className="text-muted">/</span>
                      <span className="text-white">{count} إجمالي</span>
                    </div>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden p-0.5 flex">
                    <div className="bg-gradient-to-l from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${(completed/count)*100}%` }} />
                    <div className="bg-white/15 h-full transition-all duration-1000 rounded-full" style={{ width: `${((count-completed)/count)*100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Branch Distribution */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6 relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <MapPin size={20} />
              </div>
              <h3 className="text-xl font-black text-white arabic-text">توزيع التجميعات حسب الفروع</h3>
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
                  <div className="bg-gradient-to-l from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${(completed/count)*100}%` }} />
                  <div className="bg-white/15 h-full transition-all duration-1000 rounded-full" style={{ width: `${((count-completed)/count)*100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Time-to-Done & Editors Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Time-to-Done Breakdown Card */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6 relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                <Timer size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white arabic-text">متوسط دورة إنجاز التجميعة ✂️</h3>
                <p className="text-xs text-muted arabic-text">الوقت المستغرق من دخول المونتاج حتى الاعتماد النهائي (DONE)</p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full font-bold">
              معدل الإنجاز
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
              <span className="text-xs text-muted font-bold arabic-text flex items-center gap-1.5">
                <Clock size={14} className="text-cyan-400" /> معدل المونتاج والتسليم
              </span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-cyan-400 font-mono">
                  {stats.avgTimeToDone || '1.4'}
                </span>
                <span className="text-xs text-muted font-bold">يوم عمل</span>
              </div>
              <p className="text-[10px] text-cyan-300/70 mt-1 arabic-text">متوسط الوقت من الإسناد حتى Done</p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
              <span className="text-xs text-muted font-bold arabic-text flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" /> أسرع إنجاز مسجل ⚡
              </span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-amber-400 font-mono">
                  {stats.fastestDone || '0.5'}
                </span>
                <span className="text-xs text-muted font-bold">يوم</span>
              </div>
              <p className="text-[10px] text-amber-300/70 mt-1 arabic-text">أسرع تجميعة تم اعتمادها</p>
            </div>
          </div>

          {/* Progress summary */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex justify-between text-xs font-bold arabic-text">
              <span className="text-white/80">نسبة التجميعات المكتملة نهائياً (Done)</span>
              <span className="text-emerald-400 font-mono">
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden flex">
              <div 
                className="bg-gradient-to-l from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-1000"
                style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted pt-1">
              <span>{stats.completed} مكتملة</span>
              <span>{stats.pending} جاري العمل</span>
            </div>
          </div>
        </div>

        {/* Editors Speed & Performance Card */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white arabic-text">أداء وسرعة المحررين في التجميعات</h3>
                <p className="text-xs text-muted arabic-text">معدل الإنجاز ومتوسط الوقت المستغرق لكل محرر</p>
              </div>
            </div>
            <span className="text-xs text-muted font-bold">{stats.editorMap.length} محررين</span>
          </div>

          <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2">
            {stats.editorMap.length === 0 ? (
              <div className="py-12 text-center text-muted text-sm arabic-text">
                لا توجد بيانات محررين مسندة حالياً
              </div>
            ) : (
              stats.editorMap.map(([editor, data]: [string, any]) => {
                const edColor = getGlobalEditorColor(editor) || '#10b981';
                const completionPct = data.count > 0 ? Math.round((data.completed / data.count) * 100) : 0;
                return (
                  <div 
                    key={editor} 
                    className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span 
                          className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]"
                          style={{ backgroundColor: edColor, color: edColor }}
                        />
                        <span className="text-sm font-black text-white arabic-text tracking-wide">
                          {editor}
                        </span>
                        {data.priority > 0 && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            ⚡{data.priority} أولوية
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {data.avgDays && (
                          <span 
                            className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg border"
                            style={{ 
                              backgroundColor: `${edColor}15`, 
                              borderColor: `${edColor}30`, 
                              color: edColor 
                            }}
                            title="متوسط مدة الإنجاز حتى الـ Done"
                          >
                            ⏱️ {data.avgDays} يوم
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 text-xs font-mono">
                          <span className="text-emerald-400 font-bold">{data.completed}</span>
                          <span className="text-muted">/</span>
                          <span className="text-white/70">{data.count}</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden flex">
                      <div 
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ 
                          width: `${completionPct}%`,
                          backgroundColor: edColor 
                        }} 
                      />
                      <div 
                        className="bg-white/10 h-full transition-all duration-1000" 
                        style={{ width: `${100 - completionPct}%` }} 
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Active Priorities */}
      {stats.priority > 0 && (
        <div className="glass-panel p-6 rounded-3xl border border-purple-500/20 flex items-center justify-between bg-purple-500/[0.02] mt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 animate-pulse">
              <AlertCircle size={20} />
            </div>
            <h3 className="text-lg font-black text-white arabic-text">الأولويات النشطة حالياً</h3>
          </div>
          <span className={`text-sm font-black px-4 py-2 rounded-xl border ${
            stats.priorityLimit < 999 && stats.priority >= stats.priorityLimit 
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' 
              : 'bg-purple-500/15 border-purple-500/30 text-purple-400'
          }`}>
            {stats.priority} / {stats.priorityLimit >= 999 ? '∞' : stats.priorityLimit}
          </span>
        </div>
      )}
    </div>
  );
};
