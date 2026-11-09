import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  Download, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Link, 
  Link2Off, 
  User, 
  Clock, 
  Copy, 
  Check, 
  Filter,
  AlertTriangle,
  LogIn,
  LogOut,
  Calendar
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuditLog {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  event_type: string;
  timestamp: string;
  created_at: string;
}

interface ParsedAction {
  actionType: 'done_unmarked' | 'done_marked' | 'drive_final_cleared' | 'drive_final_updated' | 'canceled' | 'restore' | 'missing_details' | 'login' | 'logout' | 'other';
  taskCode?: string;
  details: string;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  icon: any;
  label: string;
}

export const recordAuditLog = async (
  profile: any,
  action: 'done_unmarked' | 'done_marked' | 'drive_final_cleared' | 'drive_final_updated' | 'canceled' | 'restore' | 'missing_details' | 'custom',
  taskCode: string,
  details: string
) => {
  try {
    const eventType = `${action} | ${taskCode} | ${details}`;
    await supabase.from('user_logs').insert({
      user_id: profile?.id || null,
      name: profile?.name || 'مستخدم',
      email: profile?.email || '',
      event_type: eventType,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[AuditLog] Failed to record audit log:', err);
  }
};

export const AuditTrailView: React.FC<{ profile: any; toast: any }> = ({ profile, toast }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'done_unmarked' | 'drive_final' | 'done_marked' | 'canceled' | 'auth'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(300);

      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      console.error('[AuditTrail] Error loading logs:', err);
      if (toast && toast.error) toast.error('تعذر جلب سجلات التدقيق');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLogs();

    // Subscribe to new user_logs insertions in real-time
    const channel = supabase
      .channel('user_logs_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_logs' },
        (payload) => {
          const newRow = payload.new as AuditLog;
          setLogs(prev => [newRow, ...prev.slice(0, 299)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLogs]);

  const parseEventType = useCallback((eventType: string): ParsedAction => {
    if (!eventType) {
      return {
        actionType: 'other',
        details: 'عملية غير معروفة',
        badgeColor: 'text-slate-400',
        badgeBg: 'bg-slate-500/10',
        badgeBorder: 'border-slate-500/30',
        icon: Clock,
        label: 'أخرى'
      };
    }

    if (eventType === 'login') {
      return {
        actionType: 'login',
        details: 'تسجيل دخول إلى النظام',
        badgeColor: 'text-indigo-400',
        badgeBg: 'bg-indigo-500/10',
        badgeBorder: 'border-indigo-500/30',
        icon: LogIn,
        label: 'تسجيل دخول'
      };
    }
    if (eventType === 'logout') {
      return {
        actionType: 'logout',
        details: 'تسجيل خروج من النظام',
        badgeColor: 'text-slate-400',
        badgeBg: 'bg-slate-500/10',
        badgeBorder: 'border-slate-500/30',
        icon: LogOut,
        label: 'تسجيل خروج'
      };
    }

    const parts = eventType.split(' | ');
    const act = (parts[0] || '').trim().toLowerCase();
    const taskCode = (parts[1] || '').trim();
    const details = (parts[2] || parts[1] || eventType).trim();

    if (act === 'done_unmarked') {
      return {
        actionType: 'done_unmarked',
        taskCode,
        details: details || 'قام بفك علامة Done عن الريل (إعادة فتحه)',
        badgeColor: 'text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]',
        badgeBg: 'bg-rose-500/15',
        badgeBorder: 'border-rose-500/40',
        icon: RotateCcw,
        label: 'فك علامة Done ↩️'
      };
    }
    if (act === 'done_marked') {
      return {
        actionType: 'done_marked',
        taskCode,
        details: details || 'قام بتعليم الريل كمكتمل Done',
        badgeColor: 'text-emerald-400',
        badgeBg: 'bg-emerald-500/15',
        badgeBorder: 'border-emerald-500/40',
        icon: CheckCircle2,
        label: 'إكمال Done ✅'
      };
    }
    if (act === 'drive_final_cleared') {
      return {
        actionType: 'drive_final_cleared',
        taskCode,
        details: details || 'قام بحذف رابط الفاينال النهائي',
        badgeColor: 'text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]',
        badgeBg: 'bg-amber-500/15',
        badgeBorder: 'border-amber-500/40',
        icon: Link2Off,
        label: 'حذف الرابط النهائي 🗑️'
      };
    }
    if (act === 'drive_final_updated') {
      return {
        actionType: 'drive_final_updated',
        taskCode,
        details: details || 'قام بتعديل وتحديث رابط الفاينال',
        badgeColor: 'text-sky-400',
        badgeBg: 'bg-sky-500/15',
        badgeBorder: 'border-sky-500/40',
        icon: Link,
        label: 'تعديل الرابط النهائي 🎬'
      };
    }
    if (act === 'canceled') {
      return {
        actionType: 'canceled',
        taskCode,
        details: details || 'قام بإلغاء المهمة',
        badgeColor: 'text-rose-300',
        badgeBg: 'bg-rose-500/10',
        badgeBorder: 'border-rose-500/20',
        icon: XCircle,
        label: 'إلغاء مهمة ❌'
      };
    }
    if (act === 'restore') {
      return {
        actionType: 'restore',
        taskCode,
        details: details || 'قام باستعادة المهمة الملغاة',
        badgeColor: 'text-teal-400',
        badgeBg: 'bg-teal-500/10',
        badgeBorder: 'border-teal-500/30',
        icon: RotateCcw,
        label: 'استعادة مهمة ♻️'
      };
    }
    if (act === 'missing_details') {
      return {
        actionType: 'missing_details',
        taskCode,
        details: details || 'حدد تفاصيل ناقصة على المهمة',
        badgeColor: 'text-orange-400',
        badgeBg: 'bg-orange-500/10',
        badgeBorder: 'border-orange-500/30',
        icon: AlertTriangle,
        label: 'تفاصيل ناقصة ⚠️'
      };
    }

    return {
      actionType: 'other',
      taskCode,
      details: eventType,
      badgeColor: 'text-purple-400',
      badgeBg: 'bg-purple-500/10',
      badgeBorder: 'border-purple-500/30',
      icon: Clock,
      label: 'عملية أخرى'
    };
  }, []);

  const stats = useMemo(() => {
    let doneUnmarked = 0;
    let driveFinalEdits = 0;
    let canceled = 0;
    let total = logs.length;

    logs.forEach(l => {
      const parsed = parseEventType(l.event_type);
      if (parsed.actionType === 'done_unmarked') doneUnmarked++;
      if (parsed.actionType === 'drive_final_cleared' || parsed.actionType === 'drive_final_updated') driveFinalEdits++;
      if (parsed.actionType === 'canceled') canceled++;
    });

    return { total, doneUnmarked, driveFinalEdits, canceled };
  }, [logs, parseEventType]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const parsed = parseEventType(l.event_type);
      const query = searchQuery.trim().toLowerCase();

      // Filter category
      if (selectedFilter === 'done_unmarked' && parsed.actionType !== 'done_unmarked') return false;
      if (selectedFilter === 'drive_final' && parsed.actionType !== 'drive_final_cleared' && parsed.actionType !== 'drive_final_updated') return false;
      if (selectedFilter === 'done_marked' && parsed.actionType !== 'done_marked') return false;
      if (selectedFilter === 'canceled' && parsed.actionType !== 'canceled' && parsed.actionType !== 'restore') return false;
      if (selectedFilter === 'auth' && parsed.actionType !== 'login' && parsed.actionType !== 'logout') return false;

      // Text query match
      if (!query) return true;
      const userName = (l.name || '').toLowerCase();
      const userEmail = (l.email || '').toLowerCase();
      const code = (parsed.taskCode || '').toLowerCase();
      const details = (parsed.details || '').toLowerCase();

      return userName.includes(query) || userEmail.includes(query) || code.includes(query) || details.includes(query);
    });
  }, [logs, selectedFilter, searchQuery, parseEventType]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const exportCSV = () => {
    try {
      const rows = [
        ['التاريخ والوقت', 'المستخدم', 'البريد الإلكتروني', 'العملية', 'كود المهمة', 'التفاصيل']
      ];
      filteredLogs.forEach(l => {
        const parsed = parseEventType(l.event_type);
        const dateStr = new Date(l.timestamp).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'medium' });
        rows.push([
          dateStr,
          l.name || 'مستخدم',
          l.email || '',
          parsed.label,
          parsed.taskCode || '',
          parsed.details
        ]);
      });
      const csvContent = '\uFEFF' + rows.map(e => e.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (toast && toast.success) toast.success('تم تصدير سجل التدقيق إلى ملف CSV بنجاح');
    } catch (err) {
      console.error(err);
      if (toast && toast.error) toast.error('تعذر تصدير السجل');
    }
  };

  const formatExactDate = (timestampStr: string) => {
    if (!timestampStr) return '---';
    try {
      const d = new Date(timestampStr);
      const datePart = d.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const timePart = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      return `${datePart} - ${timePart}`;
    } catch {
      return timestampStr;
    }
  };

  const getRelativeTime = (timestampStr: string) => {
    if (!timestampStr) return '';
    try {
      const diffMs = Date.now() - new Date(timestampStr).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'الآن';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `منذ ${diffMin} د`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `منذ ${diffHr} س`;
      const diffDays = Math.floor(diffHr / 24);
      return `منذ ${diffDays} يوم`;
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fadeIn" dir="rtl">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-[#0c101a] via-[#080d16] to-[#05070a] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-rose-600 flex items-center justify-center text-white shadow-xl shadow-primary/30 shrink-0">
              <ShieldAlert size={34} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-white tracking-tight arabic-text">سجل تدقيق وتتبع العمليات الحساسة</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/40 text-[10px] font-black uppercase tracking-wider">
                  Live Audit Trail
                </span>
              </div>
              <p className="text-xs text-muted/80 mt-1 arabic-text">
                مراقبة أمنية دقيقة بالثانية: من قام بفك علامة Done؟ من حذف أو عدل الرابط النهائي؟ مع كشف هوية المستخدم وتاريخ ووقت كل تعديل.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              title="تحديث البيانات الآن"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin text-primary' : ''} />
              <span>تحديث السجل</span>
            </button>
            <button
              onClick={exportCSV}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              <Download size={14} />
              <span>تصدير CSV</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted arabic-text">إجمالي السجلات</p>
              <h4 className="text-2xl font-black text-white font-mono mt-1">{stats.total}</h4>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted">
              <Clock size={20} />
            </div>
          </div>

          <div className="bg-rose-500/[0.05] border border-rose-500/20 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-rose-300/80 arabic-text">فك علامة Done</p>
              <h4 className="text-2xl font-black text-rose-400 font-mono mt-1">{stats.doneUnmarked}</h4>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
              <RotateCcw size={20} />
            </div>
          </div>

          <div className="bg-amber-500/[0.05] border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-amber-300/80 arabic-text">تعديل/حذف روابط الفاينال</p>
              <h4 className="text-2xl font-black text-amber-400 font-mono mt-1">{stats.driveFinalEdits}</h4>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Link2Off size={20} />
            </div>
          </div>

          <div className="bg-purple-500/[0.05] border border-purple-500/20 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-purple-300/80 arabic-text">المهام الملغاة</p>
              <h4 className="text-2xl font-black text-purple-400 font-mono mt-1">{stats.canceled}</h4>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <XCircle size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0c101a] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedFilter === 'all'
                ? 'bg-primary text-white shadow-md shadow-primary/30'
                : 'bg-white/5 text-muted hover:text-white'
            }`}
          >
            الكل ({logs.length})
          </button>
          <button
            onClick={() => setSelectedFilter('done_unmarked')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              selectedFilter === 'done_unmarked'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                : 'bg-white/5 text-muted hover:text-rose-400'
            }`}
          >
            <RotateCcw size={12} />
            <span>فك علامة Done ({stats.doneUnmarked})</span>
          </button>
          <button
            onClick={() => setSelectedFilter('drive_final')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              selectedFilter === 'drive_final'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                : 'bg-white/5 text-muted hover:text-amber-400'
            }`}
          >
            <Link2Off size={12} />
            <span>الروابط النهائية ({stats.driveFinalEdits})</span>
          </button>
          <button
            onClick={() => setSelectedFilter('done_marked')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              selectedFilter === 'done_marked'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                : 'bg-white/5 text-muted hover:text-emerald-400'
            }`}
          >
            <CheckCircle2 size={12} />
            <span>اكتمال Done</span>
          </button>
          <button
            onClick={() => setSelectedFilter('canceled')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              selectedFilter === 'canceled'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-white/5 text-muted hover:text-purple-300'
            }`}
          >
            <XCircle size={12} />
            <span>الإلغاء والاستعادة</span>
          </button>
          <button
            onClick={() => setSelectedFilter('auth')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              selectedFilter === 'auth'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-white/5 text-muted hover:text-indigo-300'
            }`}
          >
            <LogIn size={12} />
            <span>الدخول والخروج</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80 shrink-0">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بكود الريل، اسم المستخدم..."
            className="w-full pl-4 pr-10 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-primary/50 transition-colors arabic-text"
          />
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-[#0c101a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-muted font-bold text-[11px] select-none">
                <th className="px-5 py-4 w-52">التاريخ والوقت بالثانية ⏱️</th>
                <th className="px-5 py-4 w-60">المنفّذ (المستخدم) 👤</th>
                <th className="px-5 py-4 w-48 text-center">نوع العملية 🏷️</th>
                <th className="px-5 py-4 w-52 text-center">كود المهمة / الريل 🎬</th>
                <th className="px-5 py-4">التفاصيل والتغييرات 📝</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted">
                      <RefreshCw size={24} className="animate-spin text-primary" />
                      <p className="font-bold text-xs">جاري تحميل سجلات التدقيق...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted/60">
                      <Clock size={36} className="stroke-1" />
                      <p className="font-bold text-sm arabic-text">لا توجد عمليات مسجلة مطابقة للبحث أو الفلتر المختار</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const parsed = parseEventType(log.event_type);
                  const Icon = parsed.icon;
                  const relative = getRelativeTime(log.timestamp);
                  const exact = formatExactDate(log.timestamp);

                  return (
                    <tr 
                      key={log.id} 
                      className={`hover:bg-white/[0.02] transition-colors ${
                        parsed.actionType === 'done_unmarked' ? 'bg-rose-500/[0.02]' : ''
                      }`}
                    >
                      {/* Date & Time */}
                      <td className="px-5 py-4 font-mono font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-white/90 text-xs">{exact}</span>
                          {relative && (
                            <span className="text-[10px] text-primary/80 font-bold px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                              {relative}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* User */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-primary font-bold text-xs uppercase shrink-0">
                            {(log.name || 'U')[0]}
                          </div>
                          <div className="overflow-hidden">
                            <p className="font-bold text-white text-xs truncate">{log.name || 'مستخدم غير محدد'}</p>
                            <p className="text-[10px] text-muted font-mono truncate">{log.email || 'بدون بريد'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Action Type Badge */}
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${parsed.badgeBg} ${parsed.badgeBorder} ${parsed.badgeColor}`}>
                          <Icon size={13} className="shrink-0" />
                          <span>{parsed.label}</span>
                        </span>
                      </td>

                      {/* Task Code */}
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        {parsed.taskCode ? (
                          <div 
                            onClick={() => copyToClipboard(parsed.taskCode!, log.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/30 transition-all font-mono font-bold text-primary text-xs cursor-pointer group"
                            title="اضغط لنسخ كود الريل"
                          >
                            <span>{parsed.taskCode}</span>
                            {copiedKey === log.id ? (
                              <Check size={11} className="text-emerald-400" />
                            ) : (
                              <Copy size={11} className="text-muted group-hover:text-primary transition-colors" />
                            )}
                          </div>
                        ) : (
                          <span className="text-muted/40 font-mono">---</span>
                        )}
                      </td>

                      {/* Details */}
                      <td className="px-5 py-4">
                        <p className="text-xs text-white/90 leading-relaxed font-medium break-words">
                          {parsed.details}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
