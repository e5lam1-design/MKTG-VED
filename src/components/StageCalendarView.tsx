import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Video, 
  Sparkles,
  Layers,
  Search,
  BookOpen
} from 'lucide-react';

interface StageCalendarViewProps {
  items: any[];
  activeLabel: string;
  activeGid: string;
  profile: any;
  tagmeTransfers?: any[];
  onTagmeToggle?: (item: any, activeLabel: string, nextVal: boolean) => void;
  onToggleDelivered?: (rowKey: string, nextVal: boolean) => void;
  onUpdateDate?: (rowKey: string, newDate: string) => void;
  getChipColor?: (val: string) => any;
  getWeekColor?: (w: string) => string;
  parseDriveLink?: (url: string) => any;
}

const MONTH_NAMES_AR = [
  'يناير (January)', 'فبراير (February)', 'مارس (March)', 'أبريل (April)',
  'مايو (May)', 'يونيو (June)', 'يوليو (July)', 'أغسطس (August)',
  'سبتمبر (September)', 'أكتوبر (October)', 'نوفمبر (November)', 'ديسمبر (December)'
];

const DAYS_OF_WEEK_AR = [
  'الأحد (Sun)', 'الإثنين (Mon)', 'الثلاثاء (Tue)', 'الأربعاء (Wed)', 
  'الخميس (Thu)', 'الجمعة (Fri)', 'السبت (Sat)'
];

export const StageCalendarView: React.FC<StageCalendarViewProps> = ({
  items,
  activeLabel,
  profile,
  tagmeTransfers = [],
  onTagmeToggle,
  onToggleDelivered,
  onUpdateDate,
  getChipColor,
  getWeekColor,
  parseDriveLink
}) => {
  // Determine initial month/year based on today or the first dated item
  const initialDate = useMemo(() => {
    const firstDated = items.find(i => i.date && String(i.date).trim().length >= 7);
    if (firstDated && firstDated.date) {
      const parts = String(firstDated.date).trim().split(/[-/]/);
      if (parts.length >= 2) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11) {
          return new Date(year, month, 1);
        }
      }
    }
    return new Date();
  }, [items]);

  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [showUndated, setShowUndated] = useState(false);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Helper to normalize dates to YYYY-MM-DD
  const normalizeDate = (d: any): string => {
    if (!d) return '';
    const clean = String(d).trim().split('T')[0];
    const parts = clean.includes('/') ? clean.split('/') : clean.includes('-') ? clean.split('-') : [];
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const mm = String(parseInt(parts[1], 10)).padStart(2, '0');
        const dd = String(parseInt(parts[2], 10)).padStart(2, '0');
        return `${parts[0]}-${mm}-${dd}`;
      } else {
        const mm = String(parseInt(parts[1], 10)).padStart(2, '0');
        const dd = String(parseInt(parts[0], 10)).padStart(2, '0');
        const yyyy = parts[2];
        return `${yyyy}-${mm}-${dd}`;
      }
    }
    return clean;
  };

  // Unique subjects for filter
  const subjects = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.subject && String(i.subject).trim() !== '' && i.subject !== '---') {
        set.add(String(i.subject).trim().toUpperCase());
      }
    });
    return Array.from(set).sort();
  }, [items]);

  // Group items by normalized date
  const { itemsByDate, undatedItems, monthStats } = useMemo(() => {
    const map: Record<string, any[]> = {};
    const undated: any[] = [];
    let monthTotal = 0;
    let monthUploaded = 0;
    let monthTagme = 0;
    let monthReviews = 0;

    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    items.forEach(item => {
      const searchMatch = !searchFilter.trim() ||
        String(item.name || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
        String(item.filingName || '').toLowerCase().includes(searchFilter.toLowerCase());
      
      const subjectMatch = selectedSubject === 'All' ||
        String(item.subject || '').toUpperCase() === selectedSubject;

      if (!searchMatch || !subjectMatch) return;

      const norm = normalizeDate(item.date);
      if (!norm) {
        undated.push(item);
      } else {
        if (!map[norm]) map[norm] = [];
        map[norm].push(item);

        if (norm.startsWith(monthPrefix)) {
          monthTotal++;
          const isUp = item.delivered === true || item.check2 === true || item.received === true || item.uploaded === true || item.uploaded === 'TRUE' || item.uploaded === 'true';
          const isTgm = item.isTagme3a === true || item.check1 === true || String(item.check1).toLowerCase() === 'true';
          const isRev = String(item.week || '').includes('مراجعة') || String(item.week || '').includes('مراجعات') || String(item.name || '').includes('مراجعة');
          if (isUp) monthUploaded++;
          if (isTgm) monthTagme++;
          if (isRev) monthReviews++;
        }
      }
    });

    return { 
      itemsByDate: map, 
      undatedItems: undated, 
      monthStats: { monthTotal, monthUploaded, monthTagme, monthReviews } 
    };
  }, [items, searchFilter, selectedSubject, currentYear, currentMonth]);

  // Generate calendar grid days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = normalizeDate(new Date().toISOString().split('T')[0]);

    // Leading days from previous month
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr
      });
    }

    // Trailing days from next month to make grid complete 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(currentYear, currentMonth + 1, d);
      const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-12" dir="rtl">
      {/* Calendar Header & Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.06] p-5 rounded-3xl shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <CalendarIcon className="text-white" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white arabic-text">
                تقويم مرحلة: <span className="text-primary">{activeLabel}</span>
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-muted font-bold">
                {MONTH_NAMES_AR[currentMonth]} {currentYear}
              </span>
            </div>
            <p className="text-xs text-muted/80 mt-1 arabic-text">
              عرض وجدولة الدروس والمراجعات على مدار الشهر مع إمكانية المتابعة والتحكم المباشر.
            </p>
          </div>
        </div>

        {/* Navigation & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handlePrevMonth}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
            title="الشهر السابق"
          >
            <ChevronRight size={18} />
          </button>

          <button
            onClick={handleToday}
            className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-black text-white transition-all cursor-pointer shadow-sm hover:border-primary/50"
          >
            اليوم (Today)
          </button>

          <button
            onClick={handleNextMonth}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
            title="الشهر التالي"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Quick Subject Filter */}
          {subjects.length > 0 && (
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#0b1019] border border-white/10 text-xs font-bold text-white outline-none cursor-pointer focus:border-primary transition-all"
            >
              <option value="All">كل المواد ({subjects.length})</option>
              {subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}

          {/* Search Input */}
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="بحث في دروس التقويم..."
              className="pr-8 pl-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-muted outline-none focus:border-primary/50 focus:bg-[#0b1019] transition-all w-44"
            />
          </div>
        </div>
      </div>

      {/* Monthly Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white/[0.02] border border-white/[0.05] p-3.5 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Layers size={16} />
            </div>
            <div>
              <p className="text-[10px] text-muted font-bold arabic-text">دروس هذا الشهر</p>
              <p className="text-base font-black text-white font-mono">{monthStats.monthTotal}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] p-3.5 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <p className="text-[10px] text-muted font-bold arabic-text">مرفوعة (Uploaded ✓)</p>
              <p className="text-base font-black text-blue-300 font-mono">{monthStats.monthUploaded}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] p-3.5 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-[10px] text-muted font-bold arabic-text">تمت التجميعة ✓</p>
              <p className="text-base font-black text-emerald-300 font-mono">{monthStats.monthTagme}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] p-3.5 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <BookOpen size={16} />
            </div>
            <div>
              <p className="text-[10px] text-muted font-bold arabic-text">مراجعات الشهر 📚</p>
              <p className="text-base font-black text-amber-300 font-mono">{monthStats.monthReviews}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl overflow-hidden shadow-2xl">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-white/5 bg-white/[0.01]">
          {DAYS_OF_WEEK_AR.map((day, idx) => (
            <div 
              key={day} 
              className={`py-3.5 text-center text-xs font-black arabic-text border-l border-white/5 last:border-l-0 ${
                idx === 5 || idx === 6 ? 'text-rose-400/80 bg-rose-500/[0.02]' : 'text-muted'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days Cells */}
        <div className="grid grid-cols-7 auto-rows-fr">
          {calendarDays.map((cell) => {
            const dayItems = itemsByDate[cell.dateStr] || [];
            const hasItems = dayItems.length > 0;

            return (
              <div
                key={cell.dateStr}
                className={`min-h-[140px] p-2.5 border-b border-l border-white/5 last:border-l-0 flex flex-col justify-between transition-colors relative group ${
                  !cell.isCurrentMonth
                    ? 'bg-black/25 opacity-40'
                    : cell.isToday
                    ? 'bg-primary/[0.07] ring-1 ring-primary/40'
                    : hasItems
                    ? 'bg-white/[0.015] hover:bg-white/[0.03]'
                    : 'hover:bg-white/[0.01]'
                }`}
              >
                {/* Cell Header: Day Number & Badges */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs font-mono font-black w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                      cell.isToday
                        ? 'bg-primary text-white shadow-md shadow-primary/30'
                        : cell.isCurrentMonth
                        ? 'text-white/80 group-hover:text-white'
                        : 'text-muted/60'
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {hasItems && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono shadow-sm">
                      {dayItems.length} {dayItems.length === 1 ? 'درس' : 'دروس'}
                    </span>
                  )}
                </div>

                {/* Day Tasks List */}
                <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto max-h-[160px] pr-1 scrollbar-hide">
                  {dayItems.map((item: any, iIdx: number) => {
                    const rowKey = item.uniqueKey || item.id || `idx-${iIdx}`;
                    const isUploaded = item.delivered === true || item.check2 === true || item.received === true || item.uploaded === true || item.uploaded === 'TRUE' || item.uploaded === 'true';
                    const isTagmeChecked = item.isTagme3a === true || item.check1 === true || String(item.check1).toLowerCase() === 'true' || (tagmeTransfers || []).some((t: any) => t.uniqueKey === 'tgm-' + rowKey);
                    const isReview = String(item.week || '').includes('مراجعة') || String(item.week || '').includes('مراجعات') || String(item.name || '').includes('مراجعة');
                    const subjectColors = getChipColor ? getChipColor(item.subject || '') : null;
                    const weekColorClass = getWeekColor && item.week ? getWeekColor(item.week) : 'bg-white/10 text-white';

                    return (
                      <div
                        key={rowKey}
                        className={`p-2 rounded-xl border text-[11px] font-bold transition-all relative flex flex-col gap-1 shadow-sm ${
                          isReview
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                            : isUploaded
                            ? 'bg-blue-500/10 border-blue-500/25 text-blue-100'
                            : 'bg-white/5 border-white/10 text-white/90 hover:border-primary/40'
                        }`}
                      >
                        {/* Top Row: Subject & Week */}
                        <div className="flex items-center justify-between gap-1">
                          {item.subject && (
                            <span 
                              className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                subjectColors?.bg || 'bg-white/10'
                              } ${subjectColors?.text || 'text-white'} ${subjectColors?.border || 'border-transparent'}`}
                            >
                              {item.subject}
                            </span>
                          )}

                          {item.week && (
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md arabic-text truncate max-w-[80px] ${weekColorClass}`}>
                              {item.week}
                            </span>
                          )}
                        </div>

                        {/* Lesson Title */}
                        <p 
                          className="font-bold text-xs leading-snug line-clamp-2 arabic-text text-white/95"
                          title={item.name}
                        >
                          {item.name}
                        </p>

                        {/* Bottom Row: Status Badges & Quick Actions */}
                        <div className="flex items-center justify-between pt-1 border-t border-white/5 gap-1 text-[10px]">
                          <div className="flex items-center gap-1.5">
                            {/* Toggle Uploaded ✓ */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onToggleDelivered) onToggleDelivered(rowKey, !isUploaded);
                              }}
                              className={`px-1.5 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                                isUploaded 
                                  ? 'bg-blue-500 text-white shadow-sm font-black' 
                                  : 'bg-white/10 text-muted hover:bg-blue-500/20 hover:text-blue-300'
                              }`}
                              title={isUploaded ? 'تم الرفع (Uploaded ✓)' : 'انقر للتحديد كمرفوع'}
                            >
                              <CheckCircle2 size={10} />
                              <span>{isUploaded ? 'مرفوع' : 'Upload'}</span>
                            </button>

                            {/* Toggle Tagme3a ✓ */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onTagmeToggle) onTagmeToggle(item, activeLabel, !isTagmeChecked);
                              }}
                              className={`px-1.5 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                                isTagmeChecked
                                  ? 'bg-emerald-500 text-white shadow-sm font-black'
                                  : 'bg-white/10 text-muted hover:bg-emerald-500/20 hover:text-emerald-300'
                              }`}
                              title={isTagmeChecked ? 'تجميعة ✓' : 'انقر لإضافته لتجميعة'}
                            >
                              <Sparkles size={10} />
                              <span>تجميعة</span>
                            </button>
                          </div>

                          {/* Links: YouTube / Thumbnail / Time */}
                          <div className="flex items-center gap-1">
                            {item.time && (
                              <span className="font-mono text-muted text-[9px] flex items-center gap-0.5">
                                <Clock size={9} />
                                {item.time}
                              </span>
                            )}
                            {item.youtubeLink && (
                              <a
                                href={item.youtubeLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-rose-400 hover:text-rose-300 transition-colors p-0.5"
                                title="فتح لينك الفيديو / اليوتيوب"
                              >
                                <Video size={12} />
                              </a>
                            )}
                            {item.thumbnailLink && parseDriveLink && (
                              <a
                                href={parseDriveLink(item.thumbnailLink).url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-cyan-400 hover:text-cyan-300 transition-colors p-0.5"
                                title="معاينة الصورة المصغرة (Thumbnail)"
                              >
                                <ExternalLink size={11} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Undated Lessons Section (if any exist) */}
      {undatedItems.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-lg">⏳</span>
              <div>
                <h3 className="font-black text-sm text-white arabic-text">
                  دروس بدون تاريخ محدد ({undatedItems.length})
                </h3>
                <p className="text-xs text-muted arabic-text">
                  هذه الدروس لم يتم تحديد موعد تقويم لها بعد، يمكنك تعيين تاريخ لها لتظهر في التقويم.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowUndated(p => !p)}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-white transition-all cursor-pointer"
            >
              {showUndated ? 'إخفاء الدروس ▲' : `عرض الدروس (${undatedItems.length}) ▼`}
            </button>
          </div>

          {showUndated && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {undatedItems.map((item: any, uIdx: number) => {
                const rowKey = item.uniqueKey || item.id || `undated-${uIdx}`;
                const isUploaded = item.delivered === true || item.check2 === true || item.received === true || item.uploaded === true || item.uploaded === 'TRUE' || item.uploaded === 'true';

                return (
                  <div 
                    key={rowKey}
                    className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        {item.subject && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white/10 text-white">
                            {item.subject}
                          </span>
                        )}
                        {item.week && (
                          <span className="text-[10px] font-bold text-muted font-mono">
                            {item.week}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-white arabic-text leading-snug">
                        {item.name}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        {/* Quick Set Date Input */}
                        <input
                          type="date"
                          onChange={(e) => {
                            if (e.target.value && onUpdateDate) {
                              onUpdateDate(rowKey, e.target.value);
                            }
                          }}
                          className="px-2 py-1 bg-[#0b1019] border border-white/10 rounded-lg text-xs font-bold text-white outline-none cursor-pointer focus:border-primary"
                        />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isUploaded ? 'bg-blue-500/20 text-blue-300' : 'bg-white/10 text-muted'}`}>
                        {isUploaded ? 'Uploaded ✓' : 'لم يُرفع'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
