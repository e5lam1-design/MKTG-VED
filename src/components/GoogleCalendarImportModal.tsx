import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Upload, 
  Link2, 
  Check, 
  AlertCircle, 
  Loader2, 
  X, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  Building2, 
  Clock, 
  User, 
  CheckSquare, 
  Square,
  RefreshCw,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { parseIcsContent, type ParsedGoogleEvent } from '../lib/icalParser';
import { BRANCH_DEFINITIONS } from './StudioCalendarView';

interface GoogleCalendarImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (events: ParsedGoogleEvent[]) => Promise<void>;
  existingSessions?: Array<{ date: string; startTime: string; teacher: string; branch: string }>;
  toast?: any;
}

export const GoogleCalendarImportModal: React.FC<GoogleCalendarImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  existingSessions = [],
  toast
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'file'>('url');
  const [icalUrl, setIcalUrl] = useState<string>(() => {
    return localStorage.getItem('saved_google_calendar_ical_url') || '';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  // Parsed events state
  const [parsedEvents, setParsedEvents] = useState<ParsedGoogleEvent[]>([]);
  const [defaultBranch, setDefaultBranch] = useState<string>('القاهرة');
  const [searchFilter, setSearchFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('upcoming'); // 'all' | 'upcoming' | 'current_month'

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
    }
  }, [isOpen]);

  // Handle URL Fetch
  const handleFetchFromUrl = async () => {
    const trimmed = icalUrl.trim();
    if (!trimmed) {
      setErrorMsg('يرجى إدخال رابط تقويم Google iCal.');
      return;
    }

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setErrorMsg('الرابط يجب أن يبدأ بـ https:// أو http://');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Save for subsequent uses
      localStorage.setItem('saved_google_calendar_ical_url', trimmed);

      const resp = await fetch('/api/google-calendar-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed })
      });

      const data = await resp.json();

      if (!resp.ok || !data.success || !data.ics) {
        throw new Error(data.error || 'فشل في جلب التقويم من Google.');
      }

      const events = parseIcsContent(data.ics, defaultBranch);
      if (events.length === 0) {
        setErrorMsg('تم الاتصال بالتقويم بنجاح، لكن لم يتم العثور على أي أحداث أو مواعيد مسجلة.');
      } else {
        setParsedEvents(events);
        if (toast?.success) {
          toast.success(`تم جلب ${events.length} موعد من تقويم Google بنجاح!`);
        }
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء جلب التقويم. تأكد من أن الرابط سليم ومتاح.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text || !text.includes('BEGIN:VCALENDAR')) {
          throw new Error('الملف المرفوع ليس ملف تقويم صالح بصيغة iCalendar (.ics).');
        }
        const events = parseIcsContent(text, defaultBranch);
        if (events.length === 0) {
          setErrorMsg('لم يتم العثور على أي مواعيد داخل الملف.');
        } else {
          setParsedEvents(events);
          if (toast?.success) {
            toast.success(`تم قراءة ${events.length} موعد من الملف بنجاح!`);
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'تعذر قراءة ملف التقويم.');
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg('حدث خطأ أثناء قراءة الملف من جهازك.');
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  // Check if an event already exists in DB
  const isDuplicate = (ev: ParsedGoogleEvent) => {
    return existingSessions.some(
      s => s.date === ev.date && 
           (s.startTime === ev.startTime || s.teacher.trim().toLowerCase() === ev.teacher.trim().toLowerCase())
    );
  };

  // Toggle selection
  const toggleSelectEvent = (id: string) => {
    setParsedEvents(prev => prev.map(ev => ev.id === id ? { ...ev, selected: !ev.selected } : ev));
  };

  // Select all / Deselect all
  const toggleSelectAll = (select: boolean) => {
    setParsedEvents(prev => prev.map(ev => ({ ...ev, selected: select })));
  };

  // Change branch for an event
  const updateEventBranch = (id: string, branch: string) => {
    setParsedEvents(prev => prev.map(ev => ev.id === id ? { ...ev, branch } : ev));
  };

  // Change teacher/title for an event
  const updateEventTeacher = (id: string, teacher: string) => {
    setParsedEvents(prev => prev.map(ev => ev.id === id ? { ...ev, teacher } : ev));
  };

  // Bulk set branch
  const applyBranchToAll = (branch: string) => {
    setDefaultBranch(branch);
    setParsedEvents(prev => prev.map(ev => ({ ...ev, branch })));
  };

  // Filtered events
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM

  const filteredEvents = useMemo(() => {
    return parsedEvents.filter(ev => {
      // Date filter
      if (dateFilter === 'upcoming' && ev.date < todayStr) return false;
      if (dateFilter === 'current_month' && !ev.date.startsWith(currentMonthPrefix)) return false;

      // Text search
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        return ev.teacher.toLowerCase().includes(q) ||
               ev.title.toLowerCase().includes(q) ||
               ev.notes.toLowerCase().includes(q) ||
               ev.branch.toLowerCase().includes(q);
      }
      return true;
    });
  }, [parsedEvents, dateFilter, todayStr, currentMonthPrefix, searchFilter]);

  const selectedCount = parsedEvents.filter(e => e.selected).length;

  // Confirm Import
  const handleConfirmImport = async () => {
    const toImport = parsedEvents.filter(e => e.selected);
    if (toImport.length === 0) {
      setErrorMsg('يرجى تحديد موعد واحد على الأقل للاستيراد.');
      return;
    }

    setIsImporting(true);
    setErrorMsg(null);

    try {
      await onImportSuccess(toImport);
      onClose();
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ المواعيد في قاعدة البيانات.');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-[#1f1f23] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans text-right select-none"
        dir="rtl"
      >
        {/* MODAL HEADER */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-950/40 via-[#1f1f23] to-[#1f1f23] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 border border-white/20 shrink-0">
              <CalendarIcon size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                  استيراد المواعيد من تقويم Google
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Google Calendar
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                مزامنة وسحب حجوزات الأستوديو مباشرة من تقويم جوجل أو عبر ملف iCal (.ics)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* STEP 1: SOURCE SELECTOR (URL vs FILE) - Only show if no events parsed yet or user wants to re-fetch */}
          {parsedEvents.length === 0 ? (
            <div className="space-y-5">
              {/* Tab Selector */}
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 max-w-md mx-auto">
                <button
                  onClick={() => { setActiveTab('url'); setErrorMsg(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'url'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Link2 size={15} />
                  <span>رابط تقويم Google (iCal Link)</span>
                </button>
                <button
                  onClick={() => { setActiveTab('file'); setErrorMsg(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'file'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Upload size={15} />
                  <span>رفع ملف (.ics)</span>
                </button>
              </div>

              {/* TAB 1: URL INPUT */}
              {activeTab === 'url' && (
                <div className="space-y-4 max-w-2xl mx-auto bg-white/[0.02] border border-white/5 p-5 rounded-2xl">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-2">
                      رابط تقويم Google السري (Secret address in iCal format):
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                        value={icalUrl}
                        onChange={e => setIcalUrl(e.target.value)}
                        className="w-full bg-[#161618] border border-white/10 focus:border-blue-500 rounded-xl py-3 px-4 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Instructions accordion */}
                  <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-3.5 text-xs text-blue-200/90 space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowInstructions(!showInstructions)}
                      className="flex items-center justify-between w-full font-bold text-blue-300 hover:text-blue-200 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <HelpCircle size={15} className="text-blue-400" />
                        <span>كيف تحصل على رابط iCal من تقويم Google؟</span>
                      </div>
                      {showInstructions ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>

                    {showInstructions && (
                      <ol className="list-decimal list-inside space-y-1.5 pt-2 text-[11px] leading-relaxed text-blue-100/80 pr-2">
                        <li>افتح <a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="underline text-blue-400 inline-flex items-center gap-1">تقويم Google <ExternalLink size={10} /></a> على الكمبيوتر.</li>
                        <li>في القائمة الجانبية اليسرى (أو اليمنى)، قف بالماوس على التقويم واضغط على الثلاث نقاط (⋮) واختر <strong>الإعدادات والمشاركة (Settings and sharing)</strong>.</li>
                        <li>انزل لأسفل حتى قسم <strong>دمج التقويم (Integrate calendar)</strong>.</li>
                        <li>انسخ الرابط الموجود داخل مربع <strong>العنوان السري بتنسيق iCal (Secret address in iCal format)</strong> والصقه هنا.</li>
                      </ol>
                    )}
                  </div>

                  <button
                    onClick={handleFetchFromUrl}
                    disabled={isLoading || !icalUrl.trim()}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>جاري الاتصال وسحب المواعيد من تقويم Google...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} />
                        <span>جلب المواعيد من Google Calendar</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* TAB 2: FILE UPLOAD */}
              {activeTab === 'file' && (
                <div className="max-w-2xl mx-auto space-y-4">
                  <label className="border-2 border-dashed border-white/20 hover:border-blue-500/60 bg-white/[0.02] hover:bg-blue-500/5 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 group-hover:bg-blue-500/20 text-muted group-hover:text-blue-400 flex items-center justify-center transition-colors">
                      <Upload size={26} />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-bold text-white">
                        اضغط لاختيار ملف التقويم (.ics) أو اسحبه هنا
                      </p>
                      <p className="text-xs text-muted">
                        يمكنك تصدير ملف التقويم من إعدادات Google Calendar &gt; Import & Export &gt; Export
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".ics,text/calendar"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: PREVIEW & CUSTOMIZE PARSED EVENTS */
            <div className="space-y-4 animate-in fade-in duration-300">
              
              {/* TOP BAR: Summary & Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-400" />
                    <span>تم العثور على <strong className="text-blue-400 text-sm">{parsedEvents.length}</strong> موعد</span>
                  </span>
                  <span className="text-xs text-muted">|</span>
                  <span className="text-xs text-emerald-400 font-bold">
                    محدد للاستيراد: {selectedCount}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Branch apply all */}
                  <div className="flex items-center gap-1.5 text-xs bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10">
                    <span className="text-muted text-[11px]">تطبيق الفرع:</span>
                    <select
                      value={defaultBranch}
                      onChange={e => applyBranchToAll(e.target.value)}
                      className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value="القاهرة" className="bg-[#1f1f23]">فرع القاهرة</option>
                      <option value="اسكندرية" className="bg-[#1f1f23]">فرع اسكندرية</option>
                      <option value="دسوق" className="bg-[#1f1f23]">فرع دسوق</option>
                    </select>
                  </div>

                  {/* Reset/New Fetch */}
                  <button
                    onClick={() => { setParsedEvents([]); setErrorMsg(null); }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    تغيير المصدر
                  </button>
                </div>
              </div>

              {/* FILTER ROW */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSelectAll(selectedCount !== parsedEvents.length)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    {selectedCount === parsedEvents.length ? (
                      <>
                        <CheckSquare size={14} className="text-blue-400" />
                        <span>إلغاء تحديد الكل</span>
                      </>
                    ) : (
                      <>
                        <Square size={14} className="text-muted" />
                        <span>تحديد الكل</span>
                      </>
                    )}
                  </button>

                  {/* Date Filter Tabs */}
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                    <button
                      onClick={() => setDateFilter('upcoming')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        dateFilter === 'upcoming' ? 'bg-blue-600 text-white' : 'text-muted hover:text-white'
                      }`}
                    >
                      المواعيد القادمة فقط
                    </button>
                    <button
                      onClick={() => setDateFilter('current_month')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        dateFilter === 'current_month' ? 'bg-blue-600 text-white' : 'text-muted hover:text-white'
                      }`}
                    >
                      الشهر الحالي
                    </button>
                    <button
                      onClick={() => setDateFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        dateFilter === 'all' ? 'bg-blue-600 text-white' : 'text-muted hover:text-white'
                      }`}
                    >
                      جميع المواعيد
                    </button>
                  </div>
                </div>

                {/* Search */}
                <input
                  type="text"
                  placeholder="بحث في المواعيد المستخرجة..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-48 sm:w-64"
                />
              </div>

              {/* EVENTS LIST */}
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/20 divide-y divide-white/5 max-h-[380px] overflow-y-auto custom-scrollbar">
                {filteredEvents.length === 0 ? (
                  <div className="py-12 text-center text-muted text-xs">
                    لا توجد مواعيد تطابق شروط الفلتر الحالية.
                  </div>
                ) : (
                  filteredEvents.map(ev => {
                    const duplicate = isDuplicate(ev);
                    return (
                      <div 
                        key={ev.id}
                        className={`p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors ${
                          ev.selected ? 'bg-blue-950/10' : 'opacity-60'
                        }`}
                      >
                        {/* Checkbox & Details */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleSelectEvent(ev.id)}
                            className="cursor-pointer text-muted hover:text-white shrink-0"
                          >
                            {ev.selected ? (
                              <div className="w-5 h-5 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                                <Check size={13} strokeWidth={3} />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-lg border border-white/20" />
                            )}
                          </button>

                          {/* Date & Time pill */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 shrink-0 text-right">
                            <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950/40 border border-sky-500/20 px-2 py-0.5 rounded-lg">
                              {ev.date}
                            </span>
                            <span className="text-[11px] font-mono text-muted flex items-center gap-1">
                              <Clock size={11} className="text-gray-400" />
                              <span>{ev.startTime} - {ev.endTime}</span>
                            </span>
                          </div>

                          {/* Teacher / Title Input */}
                          <div className="flex-1 min-w-[150px]">
                            <input
                              type="text"
                              value={ev.teacher}
                              onChange={e => updateEventTeacher(ev.id, e.target.value)}
                              className="w-full bg-transparent hover:bg-white/5 focus:bg-[#161618] border border-transparent hover:border-white/10 focus:border-blue-500 rounded-lg px-2 py-1 text-xs font-bold text-white focus:outline-none transition-colors"
                              placeholder="اسم المدرس أو الحدث"
                            />
                            {ev.notes && (
                              <p className="text-[10px] text-muted truncate px-2" title={ev.notes}>
                                {ev.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Branch Selector & Badges */}
                        <div className="flex items-center gap-2 shrink-0">
                          {duplicate && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                              موجود مسبقاً
                            </span>
                          )}

                          <select
                            value={ev.branch}
                            onChange={e => updateEventBranch(ev.id, e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-medium text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                          >
                            <option value="القاهرة" className="bg-[#1f1f23]">القاهرة</option>
                            <option value="اسكندرية" className="bg-[#1f1f23]">اسكندرية</option>
                            <option value="دسوق" className="bg-[#1f1f23]">دسوق</option>
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ERROR ALERT */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs">
              <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                {errorMsg}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white text-xs font-bold transition-colors cursor-pointer"
          >
            إلغاء
          </button>

          {parsedEvents.length > 0 && (
            <button
              onClick={handleConfirmImport}
              disabled={isImporting || selectedCount === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>جاري حفظ {selectedCount} موعد في الكالندر...</span>
                </>
              ) : (
                <>
                  <Check size={15} strokeWidth={2.5} />
                  <span>تأكيد واستيراد ({selectedCount}) موعد إلى الكالندر</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
