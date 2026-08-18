import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Copy, 
  Check, 
  Video, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Sparkles,
  ExternalLink,
  GraduationCap,
  Layers,
  Filter,
  RefreshCw,
  User,
  Undo2,
  MonitorPlay
} from 'lucide-react';
import op27Data from '../data/op27_tasks.json';

interface TaskItem {
  id: string;
  code: string;
  fullName: string;
  name: string;
  filingName: string;
  teacher: string;
  teacherCode: string;
  subject: string;
  stage: string;
  stageCode: string;
  course: string;
  startDate: string;
  dueDate: string;
  priority: string;
  status: string;
  bunnyVideoId: string;
  bunnyLibraryId: string;
  bunnyEmbedCode: string;
  stepsCount: number;
  completedSteps: number;
  createdAt: string;
}

export interface Op27ViewProps {
  onNavigateToStage?: (gid: string, label: string, uniqueKey?: string) => void;
  onExecuteMergeToStage?: (mergedItem: any, targetStageGid: string, combinedNames: string) => void;
}

export const getTargetStage26 = (item: any) => {
  const str = String(item?.stage || item?.stageCode || item?.fullName || item?.filingName || item?.name || '').toUpperCase();
  if (str.includes('J4') || str.includes('JUNIOR 4')) return { gid: '1877995166', label: 'Junior 4', year: 'j4' };
  if (str.includes('J5') || str.includes('JUNIOR 5')) return { gid: '787130252', label: 'Junior 5', year: 'j5' };
  if (str.includes('J6') || str.includes('JUNIOR 6')) return { gid: '2023530687', label: 'Junior 6', year: 'j6' };
  if (str.includes('M1') || str.includes('MIDDLE 1')) return { gid: '716035071', label: 'Middle 1', year: 'm1' };
  if (str.includes('M2') || str.includes('MIDDLE 2')) return { gid: '1138865611', label: 'Middle 2', year: 'm2' };
  if (str.includes('M3') || str.includes('MIDDLE 3')) return { gid: '1120286828', label: 'Middle 3', year: 'm3' };
  if (str.includes('S1') || str.includes('SENIOR 1')) return { gid: '812264560', label: 'Senior 1', year: 's1' };
  if (str.includes('S2') || str.includes('SENIOR 2')) return { gid: '1241088469', label: 'Senior 2', year: 's2' };
  if (str.includes('S3') || str.includes('SENIOR 3')) return { gid: '1130635955', label: 'Senior 3', year: 's3' };
  return { gid: '1877995166', label: 'Junior 4', year: 'j4' };
};

const BunnyLinkPill: React.FC<{ task: TaskItem }> = ({ task }) => {
  const url = task.bunnyVideoId && task.bunnyLibraryId
    ? `https://video.bunnycdn.com/play/${task.bunnyLibraryId}/${task.bunnyVideoId}`
    : '';

  const rawDate = task.dueDate || task.startDate;
  const dateDisplay = rawDate
    ? (rawDate.includes('T') ? rawDate.split('T')[0] : rawDate)
    : '---';

  const [duration, setDuration] = useState<string>(() => {
    if (!url) return '0:00:00';
    try {
      const cachedUrl = localStorage.getItem(`dur_${url}`);
      if (cachedUrl && cachedUrl !== '0:00:00' && cachedUrl !== '00:00') return cachedUrl;
      if (task.bunnyVideoId) {
        const cachedId = localStorage.getItem(`dur_${task.bunnyVideoId}`);
        if (cachedId && cachedId !== '0:00:00' && cachedId !== '00:00') return cachedId;
      }
    } catch {}
    return '';
  });

  useEffect(() => {
    if (!url) return;
    let isMounted = true;
    const fetchDur = () => {
      fetch(`/api/duration?url=${encodeURIComponent(url)}`)
        .then(res => res.json())
        .then(data => {
          if (isMounted && data.duration && data.duration !== '0:00:00') {
            setDuration(data.duration);
            try { 
              localStorage.setItem(`dur_${url}`, data.duration);
              if (task.bunnyVideoId) localStorage.setItem(`dur_${task.bunnyVideoId}`, data.duration);
            } catch {}
          } else if (isMounted && (data.status === 'queued' || !data.duration)) {
            setTimeout(fetchDur, 600);
          }
        })
        .catch(() => {});
    };
    fetchDur();

    return () => {
      isMounted = false;
    };
  }, [url, task.bunnyVideoId]);

  // 1. Has Bunny Video Link -> Always Green Capsule (الأخضر)
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 hover:border-emerald-500/70 transition-all inline-flex flex-col items-center gap-0.5 shadow-md shadow-emerald-500/10 hover:scale-105 active:scale-95 cursor-pointer min-w-[110px] group/pill"
        title="تم التصوير ورفع الفيديو ✓ (اضغط للمشاهدة على Bunny)"
      >
        <span className="text-[11px] font-black text-emerald-300 font-mono leading-none flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse"></span>
          {dateDisplay}
        </span>
        <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1 mt-1 leading-none font-mono whitespace-nowrap group-hover/pill:text-emerald-300">
          ⏱️ {duration || '...'}
        </span>
      </a>
    );
  }

  // 2. No Link (Pending / Not Filmed Yet) -> Yellow / Amber Capsule (الأصفر)
  return (
    <div
      className="px-4 py-2 rounded-2xl bg-amber-950/25 border border-amber-500/30 inline-flex flex-col items-center gap-0.5 min-w-[110px] shadow-sm"
      title="قيد التصوير / لم يرفع بعد"
    >
      <span className="text-[11px] font-black text-amber-300/90 font-mono leading-none flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
        {dateDisplay}
      </span>
      <span className="text-[10px] font-bold text-amber-400/90 mt-1 leading-none font-mono whitespace-nowrap">
        ⏱️ 0:00:00
      </span>
    </div>
  );
};

export const Op27View: React.FC<Op27ViewProps> = ({ onNavigateToStage, onExecuteMergeToStage }) => {
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem('op27_tasks_live');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return op27Data as TaskItem[];
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return localStorage.getItem('op27_last_synced') || '';
  });
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [teacherFilter, setTeacherFilter] = useState('All');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [bypassTeacherSelection, setBypassTeacherSelection] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const handleSyncPlatform = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/sync-op27', { method: 'POST' });
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        throw new Error('تعذر قراءة استجابة السيرفر. تأكد من تشغيل سيرفر الـ Proxy المحلي (node dev-proxy.js) أو النشر على Vercel.');
      }

      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
        try {
          localStorage.setItem('op27_tasks_live', JSON.stringify(data.tasks));
          const nowStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
          setLastSyncTime(nowStr);
          localStorage.setItem('op27_last_synced', nowStr);
        } catch {}
        setSyncFeedback(`✅ تم تحديث البيانات بنجاح من المنصة (${data.count} مهمة) 🚀`);
        setTimeout(() => setSyncFeedback(null), 5000);
      } else {
        throw new Error(data.error || 'فشل تحديث البيانات من المنصة');
      }
    } catch (err: any) {
      console.error('Sync error:', err);
      setSyncFeedback(`⚠️ ${err.message || 'تعذر الاتصال بالمنصة'}`);
      setTimeout(() => setSyncFeedback(null), 8000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Extract unique stages, teachers, subjects for filters
  const stagesList = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => { if (t.stage) set.add(t.stage); });
    return Array.from(set).sort();
  }, [tasks]);

  const teachersWithCounts = useMemo(() => {
    const countsMap = new Map<string, { count: number; code?: string; subject?: string }>();
    tasks.forEach(t => {
      if (t.teacher && t.teacher !== '---') {
        const existing = countsMap.get(t.teacher) || { count: 0, code: t.teacherCode, subject: t.subject };
        existing.count += 1;
        countsMap.set(t.teacher, existing);
      }
    });
    return Array.from(countsMap.entries())
      .map(([teacher, info]) => ({ teacher, count: info.count, code: info.code, subject: info.subject }))
      .sort((a, b) => a.teacher.localeCompare(b.teacher, 'ar'));
  }, [tasks]);

  const teachersList = useMemo(() => {
    return teachersWithCounts.map(t => t.teacher);
  }, [teachersWithCounts]);

  const subjectsList = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => { if (t.subject) set.add(t.subject); });
    return Array.from(set).sort();
  }, [tasks]);

  // Status counts
  const counts = useMemo(() => {
    let all = tasks.length;
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let cancelled = 0;

    tasks.forEach(t => {
      if (t.status === 'Completed') completed++;
      else if (t.status === 'In Progress') inProgress++;
      else if (t.status === 'Cancelled') cancelled++;
      else pending++;
    });

    return { all, pending, inProgress, completed, cancelled };
  }, [tasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = 
          (t.name && t.name.toLowerCase().includes(q)) ||
          (t.fullName && t.fullName.toLowerCase().includes(q)) ||
          (t.code && t.code.toLowerCase().includes(q)) ||
          (t.teacher && t.teacher.toLowerCase().includes(q)) ||
          (t.course && t.course.toLowerCase().includes(q)) ||
          (t.stage && t.stage.toLowerCase().includes(q));
        if (!match) return false;
      }

      // Stage
      if (stageFilter !== 'All' && t.stage !== stageFilter) return false;

      // Teacher
      if (teacherFilter !== 'All' && t.teacher !== teacherFilter) return false;

      // Subject
      if (subjectFilter !== 'All' && t.subject !== subjectFilter) return false;

      // Status
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;

      return true;
    });
  }, [tasks, searchQuery, stageFilter, teacherFilter, subjectFilter, statusFilter]);

  const selectedTaskObjects = useMemo(() => {
    return tasks.filter(t => selectedTasks.includes(t.id));
  }, [tasks, selectedTasks]);

  // Formatted total duration sum
  const formattedTotalTime = useMemo(() => {
    let totalSeconds = 0;
    selectedTaskObjects.forEach(task => {
      let durStr = '';
      if (task.bunnyVideoId) {
        const url = `https://video.bunnycdn.com/play/${task.bunnyLibraryId}/${task.bunnyVideoId}`;
        try {
          durStr = localStorage.getItem(`dur_${url}`) || '';
        } catch {}
      }
      if (durStr) {
        const clean = durStr.replace(/[^\d:]/g, '');
        if (clean.includes(':')) {
          const parts = clean.split(':').map(n => parseInt(n, 10)).filter(n => !isNaN(n));
          if (parts.length === 3) totalSeconds += parts[0] * 3600 + parts[1] * 60 + parts[2];
          else if (parts.length === 2) totalSeconds += parts[0] * 60 + parts[1];
        }
      }
    });

    if (totalSeconds === 0) return '0:00:00';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [selectedTaskObjects]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSelectTask = (id: string) => {
    setSelectedTasks(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const handleExecuteMerge = async () => {
    if (selectedTaskObjects.length === 0) return;
    const sample = selectedTaskObjects[0];
    const targetStage = getTargetStage26(sample);

    const combinedCodes = selectedTaskObjects.map(t => t.fullName || t.name).join('\n');
    const combinedNames = selectedTaskObjects.map(t => t.name || t.fullName).join(' + ');
    const uniqueKey = 'merge-op27-' + Date.now();

    const mergedItem = {
      uniqueKey: uniqueKey,
      id: uniqueKey,
      name: combinedCodes,
      filingName: combinedNames,
      val: targetStage.label,
      idVal: sample.teacher || '---',
      date: sample.dueDate || sample.startDate || new Date().toISOString().split('T')[0],
      subject: sample.subject || 'عام',
      extra: 'يوتيوب العمليات (تجميعة)',
      branch: 'يوتيوب العمليات (تجميعة)',
      opSheet: 'OP 26/27',
      check1: false,
      check2: false,
      isYoutubeTransfer: true,
      time: formattedTotalTime !== '--:--' && formattedTotalTime !== '0:00:00' ? formattedTotalTime : '',
      week: 'أسبوع 1',
      isTagme3a: false,
      delivered: false,
      thumbnailLink: '',
      youtubeLink: '',
      uploaded: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (onExecuteMergeToStage) {
      onExecuteMergeToStage(mergedItem, targetStage.gid, combinedNames);
    }

    if (onNavigateToStage) {
      onNavigateToStage(targetStage.gid, targetStage.label, uniqueKey);
    }

    setSelectedTasks([]);
  };

  // Helper for stage short label
  const getStageShort = (stage: string) => {
    if (!stage) return '---';
    if (stage.includes('Senior 3')) return 'S3';
    if (stage.includes('Senior 2')) return 'S2';
    if (stage.includes('Senior 1')) return 'S1';
    if (stage.includes('Middle 3')) return 'M3';
    if (stage.includes('Middle 2')) return 'M2';
    if (stage.includes('Middle 1')) return 'M1';
    if (stage.includes('Junior 6')) return 'J6';
    if (stage.includes('Junior 5')) return 'J5';
    if (stage.includes('Junior 4')) return 'J4';
    return stage.slice(0, 3).toUpperCase();
  };

  const isInitialTeacherGrid = teacherFilter === 'All' && !searchQuery.trim() && !bypassTeacherSelection;

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      {/* Header Info Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-purple-900/30 border border-blue-500/20 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold font-mono">
              <Sparkles size={14} className="animate-pulse" />
              <span>OP 26/27 Tasks Platform (Elkheta)</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight arabic-text">
              قاعدة مهام ودروس العمليات (OP 26/27) ⚡
            </h1>
            <p className="text-sm text-muted arabic-text">
              تم سحب وعرض جميع مهام الدروس من منصة التحديثات بشكل كامل مع الحالات والربط المباشر.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Sync Button */}
            <button
              onClick={handleSyncPlatform}
              disabled={isSyncing}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-xl shadow-blue-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-white/15"
              title="سحب وتحديث جميع المهام والدروس الجديدة من منصة tasks.elkheta.org"
            >
              <RefreshCw size={15} className={isSyncing ? "animate-spin text-white" : "text-white"} />
              <span className="font-extrabold">{isSyncing ? "جاري التحديث..." : "🔄 تحديث من المنصة"}</span>
            </button>

            <div className="bg-black/30 border border-white/10 rounded-2xl px-5 py-3 text-center min-w-[100px]">
              <div className="text-2xl font-black text-blue-400 font-mono">{tasks.length}</div>
              <div className="text-[11px] text-muted font-bold">إجمالي المهام</div>
            </div>
          </div>
        </div>

        {/* Sync feedback notification */}
        {syncFeedback && (
          <div className="mt-4 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-bold animate-fadeIn flex items-center justify-between">
            <span>{syncFeedback}</span>
            {lastSyncTime && <span className="font-mono text-muted text-[11px]">آخر تحديث: {lastSyncTime}</span>}
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <button
            onClick={() => setStatusFilter('All')}
            className={`p-3 rounded-2xl border transition-all text-right ${
              statusFilter === 'All'
                ? 'bg-blue-500/20 border-blue-500/50 shadow-lg shadow-blue-500/10'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="text-xs font-bold text-muted flex items-center justify-between">
              <span>الكل</span>
              <Layers size={14} />
            </div>
            <div className="text-lg font-black text-white font-mono mt-1">{counts.all}</div>
          </button>

          <button
            onClick={() => setStatusFilter('In Progress')}
            className={`p-3 rounded-2xl border transition-all text-right ${
              statusFilter === 'In Progress'
                ? 'bg-amber-500/20 border-amber-500/50 shadow-lg shadow-amber-500/10'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="text-xs font-bold text-amber-400 flex items-center justify-between">
              <span>قيد العمل ⏳</span>
              <Clock size={14} />
            </div>
            <div className="text-lg font-black text-amber-300 font-mono mt-1">{counts.inProgress}</div>
          </button>

          <button
            onClick={() => setStatusFilter('Completed')}
            className={`p-3 rounded-2xl border transition-all text-right ${
              statusFilter === 'Completed'
                ? 'bg-emerald-500/20 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="text-xs font-bold text-emerald-400 flex items-center justify-between">
              <span>مكتملة ✅</span>
              <CheckCircle2 size={14} />
            </div>
            <div className="text-lg font-black text-emerald-300 font-mono mt-1">{counts.completed}</div>
          </button>

          <button
            onClick={() => setStatusFilter('Pending')}
            className={`p-3 rounded-2xl border transition-all text-right ${
              statusFilter === 'Pending'
                ? 'bg-purple-500/20 border-purple-500/50 shadow-lg shadow-purple-500/10'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="text-xs font-bold text-purple-400 flex items-center justify-between">
              <span>قيد الانتظار 🕒</span>
              <AlertCircle size={14} />
            </div>
            <div className="text-lg font-black text-purple-300 font-mono mt-1">{counts.pending}</div>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-[#0b1019]/80 border border-white/10 rounded-2xl p-4 backdrop-blur-xl flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[220px] relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input
            type="text"
            placeholder="بحث باسم الدرس، المدرس، الكود، المرحلة..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim()) setBypassTeacherSelection(true);
            }}
            className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-4 py-2 text-xs font-bold text-white placeholder:text-muted/60 outline-none focus:border-blue-500 transition-all"
          />
        </div>

        {/* Stage Filter */}
        <div className="flex items-center gap-1.5">
          <GraduationCap size={14} className="text-muted shrink-0" />
          <select
            value={stageFilter}
            onChange={e => {
              setStageFilter(e.target.value);
              if (e.target.value !== 'All') setBypassTeacherSelection(true);
            }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="All" className="bg-[#0b1019] text-white">كل المراحل</option>
            {stagesList.map(st => (
              <option key={st} value={st} className="bg-[#0b1019] text-white">{st}</option>
            ))}
          </select>
        </div>

        {/* Teacher Filter */}
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-muted shrink-0" />
          <select
            value={teacherFilter}
            onChange={e => {
              setTeacherFilter(e.target.value);
              if (e.target.value !== 'All') setBypassTeacherSelection(false);
            }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500 cursor-pointer max-w-[150px] truncate"
          >
            <option value="All" className="bg-[#0b1019] text-white">كل المدرسين</option>
            {teachersList.map(t => (
              <option key={t} value={t} className="bg-[#0b1019] text-white">{t}</option>
            ))}
          </select>
        </div>

        {/* Subject Filter */}
        <select
          value={subjectFilter}
          onChange={e => {
            setSubjectFilter(e.target.value);
            if (e.target.value !== 'All') setBypassTeacherSelection(true);
          }}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="All" className="bg-[#0b1019] text-white">كل المواد</option>
          {subjectsList.map(sub => (
            <option key={sub} value={sub} className="bg-[#0b1019] text-white">{sub}</option>
          ))}
        </select>

        <div className="text-xs text-muted font-mono font-bold mr-auto">
          النتائج: <span className="text-blue-400">{filteredTasks.length}</span>
        </div>
      </div>

      {/* Selected Teacher Return Banner */}
      {teacherFilter !== 'All' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-blue-900/40 border border-blue-500/30 rounded-2xl p-4 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold">
              <User size={22} />
            </div>
            <div>
              <div className="text-xs text-muted font-bold">المدرس المحدد:</div>
              <div className="text-lg font-black text-white arabic-text">{teacherFilter}</div>
            </div>
          </div>

          <button
            onClick={() => {
              setTeacherFilter('All');
              setBypassTeacherSelection(false);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/15 hover:border-white/30 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md"
          >
            <Undo2 size={16} className="text-blue-400" />
            <span>رجوع لاختيار المدرس</span>
          </button>
        </motion.div>
      )}

      {/* Main Content: Teacher Selection Cards Grid vs Operations-Style Tasks Table */}
      {isInitialTeacherGrid ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#0b1019]/90 border border-white/10 rounded-3xl p-6 md:p-10 backdrop-blur-xl shadow-2xl space-y-8"
        >
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h3 className="text-2xl md:text-3xl font-black text-white arabic-text tracking-tight">
              اختر المدرس
            </h3>
            <p className="text-sm text-muted arabic-text">
              يرجى اختيار المدرس لعرض العمليات والدروس الخاصة به
            </p>
            <button
              onClick={() => setBypassTeacherSelection(true)}
              className="mt-3 inline-flex items-center gap-2 px-5 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:text-blue-300 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm hover:scale-105"
            >
              <Layers size={14} />
              <span>عرض جميع العمليات والمهام مباشرة ({tasks.length} مهمة)</span>
            </button>
          </div>

          {/* Teacher Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {teachersWithCounts.map((item, idx) => (
              <motion.button
                key={item.teacher}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.015, 0.35) }}
                onClick={() => {
                  setTeacherFilter(item.teacher);
                  setBypassTeacherSelection(false);
                }}
                className="bg-white/5 border border-white/10 hover:bg-gradient-to-b hover:from-blue-500/15 hover:to-indigo-500/10 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 rounded-2xl p-6 text-center group cursor-pointer relative overflow-hidden flex flex-col items-center justify-between min-h-[160px]"
              >
                <div className="w-14 h-14 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all text-muted group-hover:text-blue-400 border border-white/5 group-hover:border-blue-500/30">
                  <User size={24} />
                </div>
                
                <div className="w-full">
                  <span className="font-extrabold text-white text-sm block truncate arabic-text group-hover:text-blue-300" title={item.teacher}>
                    {item.teacher}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-white/5 w-full">
                  {item.subject && (
                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-md border border-white/10 text-muted font-mono">
                      {item.subject}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono font-bold group-hover:text-blue-400 transition-colors">
                    {item.count} RECORDS
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      ) : (
        /* Operations-Style Table Container matching User's UI with precise LTR column arrangement */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0b1019]/90 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl relative"
        >
          <div className="overflow-x-auto min-h-[450px]">
            <table className="w-full border-collapse table-fixed" dir="ltr">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-black text-muted tracking-wider uppercase">
                  <th className="w-[32%] px-8 py-5 text-left">
                    <span className="inline-block px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-[10px]">
                      OPERATION DETAILS
                    </span>
                  </th>
                  <th className="w-[20%] px-3 py-5 text-center">
                    <span className="inline-block px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-[10px]">
                      TEACHER / SUBJECT
                    </span>
                  </th>
                  <th className="w-[8%] px-3 py-5 text-center">
                    <span className="inline-block px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-[10px]">
                      TERM
                    </span>
                  </th>
                  <th className="w-[12%] px-3 py-5 text-center">
                    <span className="inline-block px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-[10px]">
                      SMARTBOARD
                    </span>
                  </th>
                  <th className="w-[14%] px-3 py-5 text-center">
                    <span className="inline-block px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-[10px]">
                      LINK BUNNY
                    </span>
                  </th>
                  <th className="w-[8%] px-3 py-5 text-center text-purple-400 font-black arabic-text">
                    نشر يوتيوب
                  </th>
                  <th className="w-[6%] px-3 py-5 text-center text-purple-400 font-black arabic-text">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>تجميعة 🔗</span>
                      {selectedTasks.length > 0 && (
                        <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center shadow-lg shadow-purple-600/50 animate-bounce">
                          {selectedTasks.length}
                        </span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03] text-xs font-bold">
                {filteredTasks.slice(0, 100).map((task, index) => {
                  const isCopied = copiedId === task.id;
                  const isSelected = selectedTasks.includes(task.id);
                  const stageShort = getStageShort(task.stage);

                  return (
                    <motion.tr
                      key={task.id || index}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.005, 0.3) }}
                      className={`transition-all duration-300 border-b border-white/[0.03] hover:bg-white/[0.02] ${
                        isSelected ? 'bg-purple-500/[0.06] shadow-[inset_0_0_20px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/30' : ''
                      }`}
                    >
                      {/* Operation Details Column */}
                      <td className="px-8 py-5 text-left">
                        <div className="flex flex-col text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-white arabic-text truncate" title={task.name || task.fullName}>
                              {task.name || task.fullName}
                            </span>
                          </div>
                          <div 
                            onClick={() => handleCopy(task.fullName, task.id)}
                            className="inline-flex items-center gap-1.5 mt-1 cursor-pointer group/code max-w-full"
                            title="اضغط لنسخ كود التاسك الكامل"
                          >
                            <span className="text-[10px] text-muted/70 group-hover/code:text-blue-300 font-mono truncate tracking-wider uppercase transition-colors" dir="ltr">
                              {task.fullName}
                            </span>
                            <div className="p-1 rounded-md bg-white/5 group-hover/code:bg-blue-500/20 border border-white/10 group-hover/code:border-blue-500/30 text-muted group-hover/code:text-blue-300 transition-all shrink-0 flex items-center justify-center">
                              {isCopied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                            </div>
                            {isCopied && (
                              <span className="text-[10px] text-emerald-400 font-bold font-mono animate-fadeIn shrink-0">
                                تم النسخ ✓
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Teacher / Subject Chip Column */}
                      <td className="px-3 py-5 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 max-w-[200px] truncate shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 shadow-sm" />
                          <span className="text-[11px] font-extrabold text-white truncate arabic-text">
                            {task.teacher}
                          </span>
                        </div>
                      </td>

                      {/* Term / Stage Pill Column */}
                      <td className="px-3 py-5 text-center">
                        <div className="flex flex-col gap-1 items-center justify-center">
                          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-muted font-bold">
                            T1
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] font-mono text-blue-300 font-bold">
                            {stageShort}
                          </span>
                        </div>
                      </td>

                      {/* Smartboard / Subject Column */}
                      <td className="px-3 py-5 text-center">
                        <span className="inline-block px-3.5 py-1.5 rounded-full bg-blue-900/20 border border-blue-500/30 text-blue-300 text-[11px] font-extrabold tracking-wider">
                          {task.subject ? task.subject.toUpperCase() : 'SMARTBOARD'}
                        </span>
                      </td>

                      {/* Link Bunny / Date Column */}
                      <td className="px-3 py-5 text-center">
                        <BunnyLinkPill task={task} />
                      </td>

                      {/* Publish Youtube Column */}
                      <td className="px-3 py-5 text-center">
                        <button
                          onClick={() => handleCopy(task.fullName, task.id)}
                          className="w-11 h-11 rounded-2xl bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/40 text-muted hover:text-purple-400 flex items-center justify-center mx-auto transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          title="نشر يوتيوب / نسخ الاسم"
                        >
                          <MonitorPlay size={20} />
                        </button>
                      </td>

                      {/* Tagme3a Checkbox Column */}
                      <td className="px-3 py-5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectTask(task.id)}
                          className="w-5 h-5 accent-purple-600 rounded transition-transform cursor-pointer hover:scale-110"
                          title="تحديد لإضافتها للتجميعة"
                        />
                      </td>
                    </motion.tr>
                  );
                })}

                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-muted">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Search size={32} className="opacity-30" />
                        <div className="text-sm font-bold">لا توجد دروس أو عمليات مطابقة لخيارات البحث</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer count indicator */}
          {filteredTasks.length > 100 && (
            <div className="px-6 py-4 bg-white/[0.02] border-t border-white/[0.05] text-center text-xs text-muted font-bold" dir="rtl">
              يتم عرض أول 100 نتيجة من إجمالي <span className="text-blue-400 font-mono">{filteredTasks.length}</span> مهمة. استخدم البحث بالأعلى للوصول لأي درس محدد.
            </div>
          )}
        </motion.div>
      )}

      {/* Floating Bottom Bar for Selected Merge Tasks (Matching Screenshot) */}
      <AnimatePresence>
        {selectedTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#0d121c]/95 border-2 border-purple-500/50 backdrop-blur-2xl px-8 py-4 rounded-3xl shadow-[0_0_50px_rgba(147,51,234,0.6)] flex items-center gap-8 text-white max-w-3xl w-full justify-between"
            dir="rtl"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold text-xl animate-pulse shrink-0">
                {selectedTasks.length}
              </div>
              <div className="flex flex-col text-right min-w-0">
                <span className="text-base font-bold text-white arabic-text flex items-center gap-2">
                  <span>تم تحديد عدة دروس لتجميعها معاً في يوتيوب 🔗</span>
                </span>
                <span className="text-xs text-emerald-400 font-bold arabic-text mt-0.5 font-mono">
                  ⏱️ إجمالي الوقت: {formattedTotalTime}
                </span>
                <span className="text-[10px] text-purple-300 arabic-text truncate mt-0.5" title={selectedTaskObjects.map(i => i.name || i.fullName).join(' + ')}>
                  {selectedTaskObjects.map(i => i.name || i.fullName).join(' + ')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleExecuteMerge}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold arabic-text rounded-2xl shadow-lg shadow-purple-600/40 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 text-xs"
              >
                <span>تجميع وتحويل للمرحلة 🚀</span>
              </button>
              <button
                onClick={() => setSelectedTasks([])}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 text-muted hover:text-white font-bold arabic-text rounded-2xl transition-all cursor-pointer text-xs"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
