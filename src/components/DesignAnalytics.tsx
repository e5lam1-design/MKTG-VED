import { useMemo, useState } from 'react';
import { 
  BarChart3, 
  Sparkles, 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileImage
} from 'lucide-react';

interface DesignAnalyticsProps {
  liveData: any[];
  loading: boolean;
}

export function DesignAnalytics({ liveData, loading }: DesignAnalyticsProps) {
  const [selectedDesigner, setSelectedDesigner] = useState<string | null>(null);

  const rows = useMemo(() => {
    return Array.isArray(liveData) ? liveData : [];
  }, [liveData]);

  const stats = useMemo(() => {
    const total = rows.length;
    const done = rows.filter(r => r.done).length;
    const pending = total - done;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    // Workload per designer
    const designerMap: Record<string, { total: number; done: number; pending: number }> = {};
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
      if (!designerMap[designer]) {
        designerMap[designer] = { total: 0, done: 0, pending: 0 };
      }
      designerMap[designer].total += 1;
      
      if (r.done) {
        designerMap[designer].done += 1;
        
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
      const type = (r.type || 'OTHER').trim().toUpperCase();
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
    <div className="flex-1 flex flex-col w-full animate-fadeIn max-w-[1600px] mx-auto space-y-8" dir="rtl">
      
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
            <span className="text-[10px] text-muted font-black uppercase tracking-widest">صناع المحتوى</span>
            <div className="text-3xl font-black text-purple-400">{stats.designers.length}</div>
            <p className="text-[10px] text-muted/40 font-bold">صناع محتوى نشطين هذا الشهر</p>
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
        
        {/* Left Side: Designers Load Breakdown */}
        <div className="bg-[#0a0d14] border border-white/5 p-6 rounded-3xl shadow-xl lg:col-span-2 flex flex-col space-y-6">
          <div>
            <h3 className="text-xl font-black text-white">عبء العمل ومستوى الإنجاز لكل صانع محتوى</h3>
            <p className="text-xs text-muted-foreground/60 mt-1">توزيع المهام بين المنجز (مكتمل) وقيد التنفيذ لكل عضو بالفريق.</p>
          </div>

          <div className="space-y-5 overflow-y-auto max-h-[500px] pr-2">
            {stats.designers.map((designer) => {
              const dCompletion = designer.total > 0 ? Math.round((designer.done / designer.total) * 100) : 0;
              return (
                <div 
                  key={designer.name} 
                  onClick={() => setSelectedDesigner(selectedDesigner === designer.name ? null : designer.name)}
                  className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${selectedDesigner === designer.name ? 'bg-fuchsia-500/10 border-fuchsia-500/30' : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.02]'}`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white">{designer.name}</span>
                      <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-muted-foreground">
                        {designer.total} مهمة إجمالية
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-emerald-400 font-bold">{designer.done} مكتمل</span>
                      <span className="text-xs text-muted/40">•</span>
                      <span className="text-xs text-amber-500 font-bold">{designer.pending} معلق</span>
                      <span className="text-xs text-muted/40">•</span>
                      <span className="text-xs text-fuchsia-400 font-bold" title="متوسط الوقت المستغرق لإنجاز المهمة">
                        ⏱️ {designer.avgDuration} يوم
                      </span>
                      <span className="text-xs font-black text-fuchsia-400 bg-fuchsia-500/10 px-2 py-0.5 rounded mr-2">{dCompletion}%</span>
                    </div>
                  </div>

                  {/* Dual Colored Progress Bar */}
                  <div className="w-full h-3 rounded-full bg-white/[0.04] overflow-hidden flex relative">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500" 
                      style={{ width: `${(designer.done / designer.total) * 100}%` }}
                    />
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500" 
                      style={{ width: `${(designer.pending / designer.total) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Priority & Type Distributions */}
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

    </div>
  );
}
