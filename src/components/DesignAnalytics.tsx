import { useMemo, useState } from 'react';
import { 
  BarChart3, 
  Sparkles, 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileImage, 
  Search, 
  Cpu, 
  Timer, 
  ArrowLeft,
  Calendar,
  Layers
} from 'lucide-react';
import { useDesignersTasks } from '../hooks/useDesignersTasks';

// Helper: format ISO timestamp to readable Arabic datetime
const formatArabicTime = (iso: string | null | undefined) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString('ar-EG', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  } catch { return null; }
};

const diffHours = (a: string | null | undefined, b: string | null | undefined): number | null => {
  if (!a || !b) return null;
  const da = new Date(a), db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return null;
  return Math.abs(db.getTime() - da.getTime()) / (1000 * 60 * 60);
};

const formatDurationBetween = (a: string | null | undefined, b: string | null | undefined): string | null => {
  if (!a || !b) return null;
  const da = new Date(a), db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return null;
  const diffMs = Math.abs(db.getTime() - da.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHour / 24);

  if (diffMin < 1) {
    return 'أقل من دقيقة';
  }
  if (diffMin < 60) {
    if (diffMin === 1) return 'دقيقة واحدة';
    if (diffMin === 2) return 'دقيقتين';
    if (diffMin <= 10) return `${diffMin} دقائق`;
    return `${diffMin} دقيقة`;
  }
  if (diffHour < 24) {
    const remainMin = diffMin % 60;
    if (diffHour === 1) return remainMin > 0 ? `ساعة و ${remainMin} دقيقة` : 'ساعة واحدة';
    if (diffHour === 2) return remainMin > 0 ? `ساعتين و ${remainMin} دقيقة` : 'ساعتين';
    if (diffHour <= 10) return remainMin > 0 ? `${diffHour} ساعات و ${remainMin} دقيقة` : `${diffHour} ساعات`;
    return remainMin > 0 ? `${diffHour} ساعة و ${remainMin} دقيقة` : `${diffHour} ساعة`;
  }
  
  const remainHours = diffHour % 24;
  if (diffDays === 1) return remainHours > 0 ? `يوم و ${remainHours} ساعة` : 'يوم واحد';
  if (diffDays === 2) return remainHours > 0 ? `يومين و ${remainHours} ساعة` : 'يومين';
  if (diffDays <= 10) return remainHours > 0 ? `${diffDays} أيام و ${remainHours} ساعة` : `${diffDays} أيام`;
  return remainHours > 0 ? `${diffDays} يوم و ${remainHours} ساعة` : `${diffDays} يوم`;
};

const fmtAverageHours = (hours: number | null) => {
  if (hours === null || isNaN(hours) || hours <= 0) return '—';
  const totalMin = Math.round(hours * 60);
  if (totalMin < 1) return 'أقل من دقيقة';
  if (totalMin < 60) return `${totalMin} دقيقة`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h < 24) {
    return m > 0 ? `${h} س و ${m} د` : `${h} ساعة`;
  }
  const days = (hours / 24).toFixed(1);
  return `${days} يوم`;
};

interface DesignAnalyticsProps {
  liveData?: any[];
  loading?: boolean;
}

export function DesignAnalytics(_props: DesignAnalyticsProps) {
  const { tasks, loading } = useDesignersTasks();
  const [selectedDesigner, setSelectedDesigner] = useState<string | null>(null);
  const [taskSearch, setTaskSearch] = useState('');

  const rows = useMemo(() => tasks, [tasks]);

  const stats = useMemo(() => {
    const total = rows.length;
    const done = rows.filter(r => r.done).length;
    const pending = total - done;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    // Workload and per-type completed breakdown per designer
    const designerMap: Record<string, { total: number; done: number; pending: number; typesDone: Record<string, number> }> = {};
    // Priority breakdown
    const priorityMap: Record<string, number> = {};
    // Request type breakdown
    const typeMap: Record<string, number> = {};
    // Requesters breakdown
    const requesterMap: Record<string, number> = {};
    
    // Median and Percentile calculation helpers to prevent single outliers from skewing averages
    const calculateMedian = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    const calculatePercentile = (arr: number[], percentile: number) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const index = Math.floor(sorted.length * (percentile / 100));
      return sorted[Math.min(index, sorted.length - 1)];
    };

    const doneDurations: number[] = [];
    const designerDurationsMap: Record<string, number[]> = {};

    // Speed range buckets
    let fastCount = 0; // 1 day
    let standardCount = 0; // 2 days
    let averageCount = 0; // 3-5 days
    let slowCount = 0; // 6+ days

    rows.forEach(r => {
      // Designers (Creators)
      const designer = (r.designer || 'غير محدد').trim();
      const type = (r.type || 'OTHER').trim().toUpperCase();

      if (!designerMap[designer]) {
        designerMap[designer] = { total: 0, done: 0, pending: 0, typesDone: {} };
      }
      designerMap[designer].total += 1;
      
      if (r.done) {
        designerMap[designer].done += 1;
        designerMap[designer].typesDone[type] = (designerMap[designer].typesDone[type] || 0) + 1;
        
        let durationDays = 0;
        const endLoc = r.completed_date || r.completed_at || r.deadline;
        if (r.date && endLoc) {
          const start = new Date(r.date);
          const end = new Date(endLoc);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const diffTime = end.getTime() - start.getTime();
            durationDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
            if (durationDays > 30) durationDays = 3; // clamp extreme outliers
          }
        }

        // Fallback for historical tasks with no dates recorded
        if (durationDays === 0) {
          durationDays = 2; // Default to typical standard speed
        }
        
        doneDurations.push(durationDays);
        
        if (durationDays === 1) fastCount++;
        else if (durationDays === 2) standardCount++;
        else if (durationDays >= 3 && durationDays <= 5) averageCount++;
        else if (durationDays >= 6) slowCount++;
        
        if (!designerDurationsMap[designer]) {
          designerDurationsMap[designer] = [];
        }
        designerDurationsMap[designer].push(durationDays);
      } else {
        designerMap[designer].pending += 1;
      }

      // Priority
      const priority = (r.priority || 'طبيعية - عادية').trim();
      priorityMap[priority] = (priorityMap[priority] || 0) + 1;

      // Type
      typeMap[type] = (typeMap[type] || 0) + 1;

      // Requester
      const req = (r.requester || 'غير محدد').trim();
      requesterMap[req] = (requesterMap[req] || 0) + 1;
    });

    const medianDurationOverall = doneDurations.length > 0 
      ? calculateMedian(doneDurations).toFixed(1) 
      : '1.0';

    const p80DurationOverall = doneDurations.length > 0
      ? calculatePercentile(doneDurations, 80).toFixed(0)
      : '2';

    const designers = Object.entries(designerMap)
      .map(([name, data]) => {
        const dDurations = designerDurationsMap[name] || [];
        const avgDuration = dDurations.length > 0 
          ? calculateMedian(dDurations).toFixed(1) 
          : '1.0';
        return { name, ...data, avgDuration };
      })
      .sort((a, b) => b.total - a.total);

    const priorities = Object.entries(priorityMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const types = Object.entries(typeMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const requesters = Object.entries(requesterMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Urgent pending tasks list
    const urgentPending = rows.filter(r => 
      !r.done && 
      (String(r.priority).includes('عاجلة') || String(r.priority).includes('متأخرة') || String(r.priority).includes('DEADLINE'))
    ).slice(0, 5);

    return {
      total,
      done,
      pending,
      completionRate,
      designers,
      priorities,
      types,
      requesters,
      urgentPending,
      medianDurationOverall,
      p80DurationOverall,
      fastCount,
      standardCount,
      averageCount,
      slowCount
    };
  }, [rows]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] bg-[#05070a]">
        <Clock className="w-12 h-12 text-fuchsia-500 animate-spin mb-6" />
        <p className="text-white/40 text-sm font-black tracking-[0.3em] uppercase">Loading Design Analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fadeIn" dir="rtl">
      {/* Production Progress Bar (Leader Dashboard Banner) */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/40 via-black/60 to-fuchsia-950/40 border border-fuchsia-500/30 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎨</span>
            <div>
              <h3 className="text-base font-black text-white arabic-text">مؤشر نسبة الإنجاز والإنتاج الكلية للتصاميم</h3>
              <p className="text-xs text-muted arabic-text">متابعة دقيقة لنسب التصاميم المنتهية، قيد التصميم، والمتأخرة</p>
            </div>
          </div>
          <div className="text-left">
            <span className="text-3xl font-black font-mono text-fuchsia-400">
              {stats.completionRate}%
            </span>
            <span className="text-xs text-muted block arabic-text">نسبة الإنجاز النهائية</span>
          </div>
        </div>

        {/* Multi-segment Animated Progress Bar */}
        <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-white/10 shadow-inner">
          <div 
            style={{ width: `${stats.total > 0 ? (stats.done / stats.total) * 100 : 0}%` }}
            className="bg-gradient-to-r from-fuchsia-500 to-purple-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(217,70,239,0.5)]"
            title={`مكتمل: ${stats.done}`}
          />
          <div 
            style={{ width: `${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%` }}
            className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
            title={`قيد التصميم: ${stats.pending}`}
          />
        </div>

        {/* Breakdown Badges */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-xl p-3 text-center">
            <span className="text-[11px] font-bold text-fuchsia-400 block arabic-text">🟪 تصاميم منتهية (DONE)</span>
            <span className="text-lg font-black font-mono text-white">{stats.done} ({stats.completionRate}%)</span>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
            <span className="text-[11px] font-bold text-amber-400 block arabic-text">🟨 قيد التنفيذ والتصميم</span>
            <span className="text-lg font-black font-mono text-white">{stats.pending} ({stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}%)</span>
          </div>
        </div>
      </div>
      
      {/* Page Title & Context */}
      <div className="bg-[#0a0d14] p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-[100px] -z-10" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 text-fuchsia-500 mb-2 uppercase tracking-[0.3em] font-black text-[10px]">
              <Sparkles size={14} />
              <span>Visual Design Metrics</span>
            </div>
            <h2 className="text-4xl font-black tracking-tight leading-none text-white">احصائيات التصاميم 📊</h2>
            <p className="text-muted-foreground/60 text-xs mt-2 font-medium">متابعة الأداء اليومي، إنتاجية صناع المحتوى، وتوزيع المهام العاجلة.</p>
          </div>
          <div className="bg-white/[0.02] border border-white/10 px-6 py-3 rounded-2xl">
            <span className="text-[10px] text-muted font-black tracking-widest block uppercase">سجل البيانات الحالي</span>
            <span className="text-2xl font-black text-white">{stats.total} مهمة مسجلة</span>
          </div>
        </div>
      </div>

      {/* Grid of Key Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        
        {/* Card 1: Completion rate */}
        <div className="bg-[#0a0d14] border border-white/5 p-6 rounded-3xl flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="space-y-2">
            <span className="text-[10px] text-muted font-black uppercase tracking-widest">نسبة الإنجاز</span>
            <div className="text-3xl font-black text-white">{stats.completionRate}%</div>
            <p className="text-[10px] text-emerald-400 font-bold">مهام مكتملة بنجاح</p>
          </div>
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-fuchsia-500/10 text-fuchsia-400 shrink-0">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Card 2: Total Completed */}
        <div className="bg-[#0a0d14] border border-white/5 p-6 rounded-3xl flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="space-y-2">
            <span className="text-[10px] text-muted font-black uppercase tracking-widest">المهام المنجزة</span>
            <div className="text-3xl font-black text-emerald-400">{stats.done}</div>
            <p className="text-[10px] text-muted/40 font-bold">من إجمالي {stats.total} مهمة</p>
          </div>
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 shrink-0">
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Card 3: Pending Tasks */}
        <div className="bg-[#0a0d14] border border-white/5 p-6 rounded-3xl flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="space-y-2">
            <span className="text-[10px] text-muted font-black uppercase tracking-widest">قيد التنفيذ</span>
            <div className="text-3xl font-black text-amber-500">{stats.pending}</div>
            <p className="text-[10px] text-muted/40 font-bold">تنتظر المراجعة والتسليم</p>
          </div>
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 shrink-0">
            <Clock size={24} />
          </div>
        </div>

        {/* Card 4: Team Load */}
        <div className="bg-[#0a0d14] border border-white/5 p-6 rounded-3xl flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="space-y-2">
            <span className="text-[10px] text-muted font-black uppercase tracking-widest">فريق المصممين</span>
            <div className="text-3xl font-black text-purple-400">{stats.designers.length}</div>
            <p className="text-[10px] text-muted/40 font-bold">مصممين نشطين هذا الشهر</p>
          </div>
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-400 shrink-0">
            <Users size={24} />
          </div>
        </div>

        {/* Card 5: Typical Completion Speed */}
        <div className="bg-[#0a0d14] border border-white/5 p-6 rounded-3xl flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="space-y-2 text-right">
            <span className="text-[10px] text-muted font-black uppercase tracking-widest block">سرعة الإنجاز النموذجية</span>
            <div className="text-2xl font-black text-fuchsia-400">{stats.medianDurationOverall} يوم</div>
            <p className="text-[10px] text-muted/40 font-bold">زمن إنجاز 80% من المهام هو {stats.p80DurationOverall} أيام أو أقل</p>
          </div>
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-fuchsia-500/10 text-fuchsia-400 shrink-0">
            <Sparkles size={24} />
          </div>
        </div>

      </div>

      {/* Main Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Main Load Breakdown (Designers - Narden, AYA, MANAR, JUMANA) */}
        <div className="bg-[#0a0d14] border border-white/5 p-6 rounded-3xl shadow-xl lg:col-span-2 flex flex-col space-y-6">
          <div>
            <h3 className="text-xl font-black text-white">عبء العمل ومستوى الإنجاز لكل مصمم (Designers) 🎨</h3>
            <p className="text-xs text-muted-foreground/60 mt-1">توزيع التصاميم والمهام المنجزة والمعلقة لكل مصمم (Narden, AYA, MANAR, JUMANA...)</p>
          </div>

          <div className="space-y-5 overflow-y-auto max-h-[500px] pr-2">
            {stats.requesters.map((req) => {
              const reqData = stats.designers.find(d => d.name.toLowerCase() === req.name.toLowerCase()) || { done: req.count, pending: 0, total: req.count, avgDuration: '1.0', typesDone: {} };
              const dCompletion = reqData.total > 0 ? Math.round((reqData.done / reqData.total) * 100) : 100;
              return (
                <div 
                  key={req.name} 
                  onClick={() => setSelectedDesigner(selectedDesigner === req.name ? null : req.name)}
                  className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${selectedDesigner === req.name ? 'bg-fuchsia-500/10 border-fuchsia-500/30' : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.02]'}`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white">{req.name}</span>
                      <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-muted-foreground">
                        {req.count} تصميم إجمالي
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-emerald-400 font-bold">{reqData.done} مكتمل</span>
                      <span className="text-xs text-muted/40">•</span>
                      <span className="text-xs text-amber-500 font-bold">{reqData.pending} معلق</span>
                      <span className="text-xs text-muted/40">•</span>
                      <span className="text-xs font-black text-fuchsia-400 bg-fuchsia-500/10 px-2 py-0.5 rounded mr-2">{dCompletion}%</span>
                    </div>
                  </div>

                  {/* Dual Colored Progress Bar */}
                  <div className="w-full h-3 rounded-full bg-white/[0.04] overflow-hidden flex relative mb-3">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500" 
                      style={{ width: `${(reqData.done / Math.max(1, reqData.total)) * 100}%` }}
                    />
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500" 
                      style={{ width: `${(reqData.pending / Math.max(1, reqData.total)) * 100}%` }}
                    />
                  </div>

                  {/* Per-Type Completed Tasks Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-muted arabic-text">أنواع المكتمل:</span>
                    {Object.keys(reqData.typesDone || {}).length === 0 ? (
                      <span className="text-[10px] text-muted/40 arabic-text">لا يوجد مكتمل حتى الآن</span>
                    ) : (
                      Object.entries(reqData.typesDone).map(([tName, tCount]) => (
                        <span 
                          key={tName}
                          className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1"
                        >
                          <span>{tName}:</span>
                          <span className="font-mono font-black text-white">{tCount as number}</span>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Priority, Type & Content Creators Distributions */}
        <div className="space-y-8 flex flex-col justify-between lg:col-span-1">
          
          {/* Priorities card */}
          <div className="bg-[#0a0d14] border border-white/5 p-6 rounded-3xl shadow-xl flex-1 flex flex-col space-y-4">
            <div>
              <h3 className="text-lg font-black text-white">توزيع الأولوية المهام</h3>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">تصنيف المهام حسب درجة الاستعجال.</p>
            </div>
            
            <div className="space-y-3.5 flex-1 flex flex-col justify-center">
              {stats.priorities.map((priority) => {
                const percentage = stats.total > 0 ? Math.round((priority.count / stats.total) * 100) : 0;
                const isUrgent = priority.name.includes('عاجلة') || priority.name.includes('متأخرة') || priority.name.includes('CHECK');
                return (
                  <div key={priority.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className={isUrgent ? 'text-red-400' : 'text-white/80'}>{priority.name}</span>
                      <span className="text-white/60">{priority.count} مهمة ({percentage}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isUrgent ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-fuchsia-500 to-purple-600'}`} 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Type Distribution */}
          <div className="bg-[#0a0d14] border border-white/5 p-6 rounded-3xl shadow-xl flex-1 flex flex-col space-y-4">
            <div>
              <h3 className="text-lg font-black text-white">أنواع التصاميم المطلوبة</h3>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">توزيع الطلبات بين مصغرات وفيديو ويوتيوب وغيرها.</p>
            </div>
            
            <div className="space-y-3.5 flex-1 flex flex-col justify-center">
              {stats.types.map((type) => {
                const percentage = stats.total > 0 ? Math.round((type.count / stats.total) * 100) : 0;
                return (
                  <div key={type.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-white/80">{type.name}</span>
                      <span className="text-white/60">{type.count} ({percentage}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content Creators Breakdown Card (SHERIF, SHROUK, ESRAA, Hesham...) */}
          <div className="bg-[#0a0d14] border border-white/5 p-6 rounded-3xl shadow-xl flex-1 flex flex-col space-y-4">
            <div>
              <h3 className="text-lg font-black text-white">إحصائيات صناع المحتوى (Content Creators) 📣</h3>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">توزيع الطلبات والمهام المقدمة من كل صانع محتوى (SHERIF, SHROUK, ESRAA...)</p>
            </div>
            
            <div className="space-y-3.5 flex-1 flex flex-col justify-center">
              {stats.designers.map((des) => {
                const percentage = stats.total > 0 ? Math.round((des.total / stats.total) * 100) : 0;
                return (
                  <div key={des.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-pink-300 font-black">{des.name}</span>
                      <span className="text-white/60">{des.done} مكتمل من {des.total} ({percentage}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Speed Distribution breakdown */}
          <div className="bg-[#0a0d14] border border-white/5 p-6 rounded-3xl shadow-xl flex-1 flex flex-col space-y-4">
            <div>
              <h3 className="text-lg font-black text-white">تصنيف سرعة إنجاز المهام ⏱️</h3>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">توزيع المهام المنجزة حسب عدد الأيام المستغرقة.</p>
            </div>
            
            <div className="space-y-3.5 flex-1 flex flex-col justify-center">
              {(() => {
                const totalRecorded = stats.fastCount + stats.standardCount + stats.averageCount + stats.slowCount;
                const getPercent = (count: number) => totalRecorded > 0 ? Math.round((count / totalRecorded) * 100) : 0;
                
                const speedBuckets = [
                  { name: 'إنجاز سريع جداً (يوم واحد)', count: stats.fastCount, color: 'from-emerald-500 to-teal-500' },
                  { name: 'إنجاز قياسي (يومين)', count: stats.standardCount, color: 'from-cyan-500 to-blue-500' },
                  { name: 'إنجاز متوسط (3-5 أيام)', count: stats.averageCount, color: 'from-amber-500 to-orange-500' },
                  { name: 'إنجاز طويل / متأخر (أكثر من 5 أيام)', count: stats.slowCount, color: 'from-rose-500 to-red-600' }
                ];
                
                return speedBuckets.map((bucket) => {
                  const pct = getPercent(bucket.count);
                  return (
                    <div key={bucket.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-white/80">{bucket.name}</span>
                        <span className="text-white/60">{bucket.count} مهمة ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden">
                        <div 
                          className={`h-full rounded-full bg-gradient-to-r ${bucket.color} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

        </div>

      </div>

      {/* Urgent Pending Tasks List */}
      <div className="bg-[#0a0d14] border border-white/5 p-6 rounded-3xl shadow-2xl flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <AlertCircle className="text-red-400" size={20} />
              <span>مهام عاجلة ومتأخرة تنتظر التنفيذ ⚡</span>
            </h3>
            <p className="text-xs text-muted-foreground/60 mt-1">المهام ذات الأولوية القصوى التي لم يتم الانتهاء منها بعد.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse whitespace-nowrap min-w-max">
            <thead>
              <tr className="border-b border-white/5 bg-black/40 text-[10px] uppercase tracking-[0.1em] font-black text-muted/60">
                <th className="px-6 py-4 font-bold">الكريتور</th>
                <th className="px-4 py-4 font-bold">الأولوية</th>
                <th className="px-4 py-4 font-bold">النوع</th>
                <th className="px-4 py-4 font-bold">المصمم</th>
                <th className="px-4 py-4 font-bold">التسليم المتوقع</th>
                <th className="px-4 py-4 font-bold">REFERENCE</th>
                <th className="px-6 py-4 font-bold">الملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {stats.urgentPending.map((row, i) => (
                <tr key={i} className="hover:bg-white/[0.01] transition-colors group">
                  
                  {/* Designer */}
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold px-3 py-1.5 rounded-lg border bg-white/5 border-white/10 text-white">
                      {row.designer || 'غير محدد'}
                    </span>
                  </td>

                  {/* Priority */}
                  <td className="px-4 py-4">
                    <span className="text-xs font-black px-2.5 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400">
                      {row.priority}
                    </span>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded">
                      {row.type || '-'}
                    </span>
                  </td>

                  {/* Requester */}
                  <td className="px-4 py-4">
                    <span className="text-xs font-bold text-white/70">{row.requester || '-'}</span>
                  </td>

                  {/* Deadline */}
                  <td className="px-4 py-4">
                    <span className="text-xs font-bold text-rose-400 font-mono">{row.deadline || '-'}</span>
                  </td>

                  {/* Reference */}
                  <td className="px-4 py-4">
                    {row.reference ? (
                      <a href={row.reference} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline max-w-[150px] truncate block font-medium">
                        رابط المرجع 🔗
                      </a>
                    ) : (
                      <span className="text-xs text-muted/30">-</span>
                    )}
                  </td>

                  {/* Notes */}
                  <td className="px-6 py-4">
                    <p className="text-xs text-white/50 truncate max-w-[350px] arabic-text">{row.notes || '-'}</p>
                  </td>

                </tr>
              ))}

              {stats.urgentPending.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center opacity-40">
                      <CheckCircle2 className="w-10 h-10 mb-3 text-emerald-400" />
                      <p className="text-xs font-bold uppercase tracking-widest arabic-text">رائع! لا توجد مهام عاجلة معلقة حالياً</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section: مستكشف المسار الزمني للتاسك & متوسط دورة حياة التاسك ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" dir="rtl">
        
        {/* ── Left Card: مستكشف المسار الزمني للتاسك ── */}
        <div className="bg-[#0b0e17] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2.5">
                  <Timer className="w-5 h-5 text-indigo-400" />
                  <span>مستكشف المسار الزمني للتاسك</span>
                </h3>
                <p className="text-xs text-white/40 font-bold mt-1">تتبع دورة حياة تاسك محدد ومعرفة حالته في كل مرحلة بالتاريخ</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Timer size={20} />
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={taskSearch}
                onChange={e => setTaskSearch(e.target.value)}
                placeholder="(مثال: اسم السكريبت، الكريتور، أو النوع) ... ادخل اسم أو كود التاسك للبحث"
                dir="rtl"
                className="w-full bg-[#121624] border border-white/10 focus:border-indigo-500/50 rounded-2xl pr-11 pl-4 py-3.5 text-xs sm:text-sm text-white placeholder:text-white/25 outline-none transition-all arabic-text shadow-inner"
              />
              <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" />
            </div>

            {/* Quick Chips (أمثلة سريعة) */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black text-white/40 ml-1">أمثلة سريعة:</span>
              {rows.slice(0, 5).map((t: any, idx: number) => {
                // Generate a clean human-readable title without any URLs
                let chipLabel = '';
                if (t.name && !String(t.name).startsWith('http')) {
                  chipLabel = t.name;
                } else if (t.task_name && !String(t.task_name).startsWith('http')) {
                  chipLabel = t.task_name;
                } else if (t.script && !String(t.script).startsWith('http')) {
                  chipLabel = t.script;
                } else if (t.notes && !String(t.notes).startsWith('http') && t.notes.length <= 25) {
                  chipLabel = t.notes;
                } else {
                  const type = t.type || 'تاسك';
                  const person = t.designer || t.requester || '';
                  chipLabel = person ? `${type} - ${person}` : `تاسك #${t.id || idx + 1}`;
                }

                // Clean search query when clicked
                const searchQuery = (t.name && !String(t.name).startsWith('http')) ? t.name : (t.id ? String(t.id) : chipLabel);

                return (
                  <button
                    key={t.id || idx}
                    type="button"
                    onClick={() => setTaskSearch(searchQuery)}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white/5 hover:bg-indigo-500/20 text-white/70 hover:text-white border border-white/10 hover:border-indigo-500/40 transition-all truncate max-w-[170px] cursor-pointer"
                    title={chipLabel}
                  >
                    {chipLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Task Details & Timeline / Empty State */}
          <div className="min-h-[220px] flex flex-col justify-center">
            {(() => {
              const q = taskSearch.trim().toLowerCase();
              const matchedTask = q ? rows.find((r: any) => 
                String(r.name || '').toLowerCase().includes(q) ||
                String(r.task_name || '').toLowerCase().includes(q) ||
                String(r.script || '').toLowerCase().includes(q) ||
                String(r.notes || '').toLowerCase().includes(q) ||
                String(r.designer || '').toLowerCase().includes(q) ||
                String(r.requester || '').toLowerCase().includes(q) ||
                String(r.type || '').toLowerCase().includes(q) ||
                String(r.reference || '').toLowerCase().includes(q) ||
                String(r.id || '').includes(q)
              ) : null;

              if (!matchedTask) {
                return (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-black/20 rounded-2xl border border-white/5 space-y-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 mb-1">
                      <Cpu size={24} />
                    </div>
                    <h4 className="text-sm font-black text-white/80 arabic-text">في انتظار إدخال الكود</h4>
                    <p className="text-xs text-white/40 max-w-sm arabic-text">ادخل كود أو اسم تاسك محدد للبدء في توليد ورسم خط حياته الزمني تلقائياً.</p>
                  </div>
                );
              }

              const doneAt = formatArabicTime(matchedTask.done_designer_at);
              const receivedAt = formatArabicTime(matchedTask.received_creator_at);
              const createdAt = formatArabicTime(matchedTask.created_at || matchedTask.date);
              
              const durCreatedToDoneStr = matchedTask.done_designer 
                ? formatDurationBetween(matchedTask.created_at || matchedTask.date, matchedTask.done_designer_at) 
                : null;
              const durDoneToReceivedStr = matchedTask.received_creator 
                ? formatDurationBetween(matchedTask.done_designer_at, matchedTask.received_creator_at) 
                : null;

              return (
                <div className="bg-[#121624] border border-indigo-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
                  {/* Task Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <h4 className="text-sm font-black text-white arabic-text">
                        {matchedTask.name || matchedTask.task_name || matchedTask.script || matchedTask.notes || matchedTask.reference || matchedTask.type || 'تاسك التصميم'}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-white/60 font-bold mt-1">
                        <span>🎨 المصمم: <strong className="text-white">{matchedTask.designer || '-'}</strong></span>
                        <span>•</span>
                        <span>📣 الكريتور: <strong className="text-white">{matchedTask.requester || '-'}</strong></span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {matchedTask.type || 'DESIGN'}
                    </span>
                  </div>

                  {/* Visual Stepper Timeline */}
                  <div className="space-y-3 pt-1">
                    {/* Step 1: Created */}
                    <div className="flex items-start gap-3 relative">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center text-[10px] font-black shrink-0">
                        1
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-white">تاريخ الإنشاء والطلب 🆕</p>
                        <p className="text-[11px] font-mono text-white/60">{createdAt || 'مسجل بالجدول'}</p>
                      </div>
                    </div>

                    {/* Step 2: Designer Done */}
                    <div className="flex items-start gap-3 relative">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                        matchedTask.done_designer 
                          ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400' 
                          : 'bg-white/5 border border-white/10 text-white/30'
                      }`}>
                        2
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-white">إنهاء المصمم (DONE) 🎨</p>
                          {durCreatedToDoneStr && (
                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                              استغرق {durCreatedToDoneStr}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-white/60">
                          {doneAt ? doneAt : <span className="text-amber-400/80 italic">قيد التصميم والتنفيذ ⏳</span>}
                        </p>
                      </div>
                    </div>

                    {/* Step 3: Creator Received */}
                    <div className="flex items-start gap-3 relative">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                        matchedTask.received_creator 
                          ? 'bg-sky-500/20 border border-sky-500/50 text-sky-400' 
                          : 'bg-white/5 border border-white/10 text-white/30'
                      }`}>
                        3
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-white">استلام الكريتور (RECEIVED) 📥</p>
                          {durDoneToReceivedStr && (
                            <span className="text-[10px] font-black text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 font-mono">
                              بعد {durDoneToReceivedStr}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-white/60">
                          {receivedAt ? receivedAt : <span className="text-white/30 italic">في انتظار مراجعة واستلام الكريتور</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── Right Card: متوسط دورة حياة التاسك ── */}
        <div className="bg-[#0b0e17] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2.5">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <span>متوسط دورة حياة التاسك</span>
                </h3>
                <p className="text-xs text-white/40 font-bold mt-1">معدل المدد الزمنية المستغرقة بين مراحل الإنتاج</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <TrendingUp size={20} />
              </div>
            </div>

            {/* Calculate overall lifecycle stats */}
            {(() => {
              const durCreatedToDone: number[] = [];
              const durDoneToReceived: number[] = [];
              const durTotalCycle: number[] = [];

              rows.forEach((r: any) => {
                const created = r.created_at || r.date;
                const doneAt = r.done_designer_at;
                const recvAt = r.received_creator_at;

                if (created && doneAt) {
                  const h = diffHours(created, doneAt);
                  if (h !== null && h >= 0 && h < 24 * 60) durCreatedToDone.push(h);
                }
                if (doneAt && recvAt) {
                  const h = diffHours(doneAt, recvAt);
                  if (h !== null && h >= 0 && h < 24 * 60) durDoneToReceived.push(h);
                }
                if (created && recvAt) {
                  const h = diffHours(created, recvAt);
                  if (h !== null && h >= 0 && h < 24 * 60) durTotalCycle.push(h);
                }
              });

              const avg = (arr: number[]) => {
                if (arr.length === 0) return null;
                return arr.reduce((a, b) => a + b, 0) / arr.length;
              };

              const avgC2D = avg(durCreatedToDone);
              const avgD2R = avg(durDoneToReceived);
              const avgTotal = avg(durTotalCycle);

              return (
                <div className="space-y-3.5">
                  {/* Row 1 */}
                  <div className="bg-[#121624] border border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-white arabic-text flex items-center gap-2">
                        <span>من الفكرة إلى إنهاء المصمم</span>
                        <span>🎨</span>
                      </h4>
                      <p className="text-[10px] text-white/40 font-bold arabic-text">الفرق بين تاريخ إنشاء التاسك وتاريخ إنهاء المصمم</p>
                    </div>
                    <div className="text-left font-mono">
                      <span className="text-2xl font-black text-emerald-400">
                        {fmtAverageHours(avgC2D)}
                      </span>
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="bg-[#121624] border border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-white arabic-text flex items-center gap-2">
                        <span>من إنهاء المصمم إلى استلام الكريتور</span>
                        <span>📥</span>
                      </h4>
                      <p className="text-[10px] text-white/40 font-bold arabic-text">الوقت المستغرق لمراجعة واستلام الكريتور للتصميم</p>
                    </div>
                    <div className="text-left font-mono">
                      <span className="text-2xl font-black text-sky-400">
                        {fmtAverageHours(avgD2R)}
                      </span>
                    </div>
                  </div>

                  {/* Row 3 */}
                  <div className="bg-[#121624] border border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-white arabic-text flex items-center gap-2">
                        <span>من الإنشاء إلى الاستلام النهائي (DONE)</span>
                        <span>🏁</span>
                      </h4>
                      <p className="text-[10px] text-white/40 font-bold arabic-text">معدل وقت دورة حياة التصميم والمراجعة حتى التسليم النهائي</p>
                    </div>
                    <div className="text-left font-mono">
                      <span className="text-2xl font-black text-fuchsia-400">
                        {fmtAverageHours(avgTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Bottom Callout Banner */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-[11px] text-emerald-300/80 font-bold arabic-text leading-relaxed">
              يتم الحساب تلقائياً عن طريق مطابقة تواريخ إنشاء التاسكات وتواريخ الإنهاء والاستلام المدخلة بدقة.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
