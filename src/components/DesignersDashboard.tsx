import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Loader2, Search, CheckSquare, Square, ChevronDown, Plus, X, Undo2, Redo2, Layers, Calendar, User, Eye, Sparkles, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDesignersTasks } from '../hooks/useDesignersTasks';

const DEFAULT_DESIGNERS = ['SHERIF', 'SHROUK', 'ESRAA', 'Hesham', 'Sohaila', 'alaa', 'alaa zakria', 'NOUR', 'NOURHAN', 'KHALED', 'EMAN', 'AWNEY', 'ANAS', 'SAMIR', 'MONA', 'YOMNA', 'MANAR', 'MARAM', 'Esraa nagi', 'A.AMR', 'AHMED', 'nada', 'abdelkerim', 'Donia', 'Esraa Naga', 'A.Medhat'];
const DEFAULT_PRIORITIES = ['انهارده - ضروري', 'بكرة', 'انهارده - ممكن يتأجل', 'CHECK DEADLINE'];
const DEFAULT_REQUESTERS = ['Narden', 'AYA', 'MANAR', 'JUMANA'];
const DEFAULT_TYPES = ['THUMBNAIL', 'YT-COMMUNTIY', 'SOCIAL-MEDIA', 'OTHER'];

// Interactive Floating Popover for Review Tasks (Opens Upwards with Distinct Filter Controls)
const ReviewTasksPopover = ({
  name,
  count,
  tasks,
  isActive,
  onToggleFilter,
  colorScheme
}: {
  name: string;
  count: number;
  tasks: any[];
  isActive: boolean;
  onToggleFilter: () => void;
  colorScheme: {
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    activeRing: string;
    dotColor: string;
    glowColor?: string;
  };
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const isUrgent = count > 5;

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Floating Interactive Popover (OPENS DOWNWARDS WITH ZERO CLIPPING) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-3.5 w-84 sm:w-96 bg-[#070a12] border border-purple-500/40 rounded-3xl p-4 shadow-[0_30px_80px_rgba(0,0,0,0.98)] ring-1 ring-white/10 z-[500] space-y-3.5"
            dir="rtl"
          >
            {/* Pointer triangle arrow pointing UP towards pill */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0e1322] border-t border-l border-purple-500/40 rotate-45 pointer-events-none" />

            {/* Header with gradient background */}
            <div className="flex items-center justify-between bg-white/[0.04] -mx-4 -mt-4 p-4 rounded-t-3xl border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className={`w-3 h-3 rounded-full ${colorScheme.dotColor} shadow-md animate-pulse`} />
                <div>
                  <h4 className="text-sm font-black text-white arabic-text flex items-center gap-2">
                    <span>مهام المراجعة لـ {name}</span>
                    <Sparkles size={14} className="text-amber-400" />
                  </h4>
                  <p className="text-[10px] text-white/50 font-bold">
                    {count === 0 ? 'لا توجد مهام معلقة' : `يوجد ${count} مهام قيد المراجعة والتنفيذ`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Task Cards List */}
            <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-white/50 text-xs font-bold arabic-text flex flex-col items-center gap-2 bg-white/[0.02] rounded-2xl border border-white/5">
                  <span className="text-3xl">🎉</span>
                  <span className="text-emerald-400 font-black">All Clear!</span>
                  <span className="text-[11px]">لا توجد مهام مراجعة نشطة لهذا المصمم</span>
                </div>
              ) : (
                tasks.map((t: any, idx: number) => {
                  const taskTitle = t.notes || t.reference || t.type || `مهمة #${idx + 1}`;
                  return (
                    <div
                      key={t.id || idx}
                      className="bg-[#111624] hover:bg-[#161d30] border border-white/10 hover:border-purple-500/50 rounded-2xl p-3.5 transition-all space-y-2.5 group shadow-md text-right"
                    >
                      {/* Task Top Row */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-purple-300 font-mono bg-purple-500/20 px-2 py-0.5 rounded-lg border border-purple-500/30">
                          تاسك #{idx + 1}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {t.type && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm">
                              {t.type}
                            </span>
                          )}
                          {t.priority && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                              {t.priority}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title / Description */}
                      <p className="text-xs font-bold text-white arabic-text leading-relaxed line-clamp-3">
                        {taskTitle}
                      </p>

                      {/* Details row: Creator, Deadline */}
                      <div className="flex items-center justify-between text-[11px] text-white/70 pt-2 border-t border-white/5">
                        {t.designer ? (
                          <span className="font-bold truncate max-w-[140px] flex items-center gap-1">
                            <span className="text-muted/60">الكريتور:</span>
                            <span className="text-white font-black">{t.designer}</span>
                          </span>
                        ) : <span />}
                        {t.deadline ? (
                          <span className="font-mono text-amber-300 font-bold bg-amber-500/15 px-2.5 py-0.5 rounded-lg border border-amber-500/30 shadow-sm">
                            📅 {t.deadline}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Distinctive Filter Toggle Button in Popover */}
            <div className="pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  onToggleFilter();
                  setIsOpen(false);
                }}
                className={`w-full py-2.5 px-4 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                  isActive
                    ? 'bg-rose-500/25 hover:bg-rose-500/40 border border-rose-500/50 text-rose-300 hover:text-white'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/40 hover:scale-[1.02] active:scale-98'
                }`}
              >
                {isActive ? (
                  <>
                    <X size={15} />
                    <span>إلغاء فلتر جدول {name} (عرض الكل)</span>
                  </>
                ) : (
                  <>
                    <Eye size={15} />
                    <span>تصفية الجدول على مهام {name} فقط ({count} تاسك) 🎯</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger Pill Button with Single Click (Filter) & Double Click (Open Popup) */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onToggleFilter()}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(prev => !prev);
          }}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-black transition-all hover:scale-105 active:scale-95 select-none outline-none cursor-pointer ${
            isActive
              ? `${colorScheme.badgeBg} text-white border-2 ${colorScheme.badgeBorder} shadow-xl ring-2 ${colorScheme.activeRing} scale-105`
              : `${colorScheme.badgeBg} ${colorScheme.badgeText} border ${colorScheme.badgeBorder} shadow-lg hover:brightness-125`
          } ${isUrgent ? 'animate-bounce' : ''}`}
          title={`نقرة واحدة: فلترة الجدول على ${name} | نقرتين مزدوجتين: عرض تفاصيل الـ Pop-up`}
        >
          <span className={`w-2 h-2 rounded-full ${colorScheme.dotColor} ${isUrgent ? 'animate-ping' : 'animate-pulse'}`} />
          <span>{isUrgent ? `⚠️ ${name}:` : `${name}:`}</span>
          
          {/* Clickable Count Badge (opens popup on direct click too!) */}
          <span
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(prev => !prev);
            }}
            className="text-white font-black font-mono bg-white/15 hover:bg-white/30 px-1.5 py-0.5 rounded-md text-xs transition-colors shadow-inner flex items-center gap-1"
            title="اضغط لعرض تفاصيل المهام"
          >
            <span>{count}</span>
            <ChevronDown size={10} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-white' : 'opacity-70'}`} />
          </span>
        </button>

        {/* If filtered, show quick cancel badge */}
        {isActive && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFilter();
            }}
            className="p-1 rounded-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/40 transition-all text-[10px] font-bold cursor-pointer"
            title="إلغاء الفلتر"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

// Helper to get custom items stored in localStorage
const getStoredCustomItems = (key: string, defaults: string[]) => {
  try {
    const saved = localStorage.getItem(`custom_options_${key}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return Array.from(new Set([...defaults, ...parsed]));
      }
    }
  } catch (e) {}
  return defaults;
};

// Helper to save new custom item to localStorage
const saveCustomItem = (key: string, newItem: string) => {
  try {
    const saved = localStorage.getItem(`custom_options_${key}`);
    let list: string[] = saved ? JSON.parse(saved) : [];
    if (!list.includes(newItem)) {
      list.push(newItem);
      localStorage.setItem(`custom_options_${key}`, JSON.stringify(list));
    }
  } catch (e) {}
};

// Custom Google-Sheets-style Dropdown component (pill shaped)
const DropdownSelect = ({ value, onChange, options, getStyles, categoryKey }: any) => {
  const finalOptions = useMemo(() => {
    const valStr = String(value || '').trim();
    if (valStr && !options.includes(valStr) && valStr !== '__ADD_NEW__') {
      return [valStr, ...options];
    }
    return options;
  }, [value, options]);

  const handleSelectChange = (val: string) => {
    if (val === '__ADD_NEW__') {
      const customVal = prompt('أدخل اسم أو كلمة جديدة (Custom):');
      if (customVal && customVal.trim() !== '') {
        const cleanVal = customVal.trim();
        if (categoryKey) {
          saveCustomItem(categoryKey, cleanVal);
        }
        onChange(cleanVal);
      }
    } else {
      onChange(val);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => handleSelectChange(e.target.value)}
        className={`appearance-none text-[11px] font-black pl-6 pr-2.5 py-1 rounded-full border cursor-pointer outline-none transition-all shadow-sm ${getStyles(value)}`}
      >
        {finalOptions.map((opt: string) => (
          <option key={opt} value={opt} className="bg-[#0a0d14] text-white">
            {opt}
          </option>
        ))}
        <option value="__ADD_NEW__" className="bg-[#121624] text-emerald-400 font-bold">
          ➕ إضافة جديد...
        </option>
      </select>
      <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-80">
        <ChevronDown size={9} />
      </div>
    </div>
  );
};

// Custom header drop-down filter component
const HeaderFilter = ({ label, value, onChange, options }: any) => {
  const isFiltered = value !== 'All';
  return (
    <div className="flex flex-col items-start gap-0.5 justify-center my-0.5 select-none">
      <span className="text-[9px] text-muted/60 uppercase tracking-wider font-black arabic-text">{label}</span>
      <div className="relative inline-flex items-center">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`appearance-none bg-black/40 hover:bg-black/60 text-[10px] font-black pl-5 pr-2 py-1 rounded-lg border cursor-pointer outline-none transition-all ${
            isFiltered 
              ? 'border-purple-500/60 text-purple-400 font-bold bg-purple-500/10' 
              : 'border-white/5 text-white/50 hover:text-white/80'
          }`}
        >
          <option value="All" className="bg-[#0a0d14] text-white/70 font-bold">الكل</option>
          {options.map((opt: string) => (
            <option key={opt} value={opt} className="bg-[#0a0d14] text-white">
              {opt}
            </option>
          ))}
        </select>
        <div className={`absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-current transition-colors ${isFiltered ? 'text-purple-400' : 'opacity-40'}`}>
          <ChevronDown size={9} className="stroke-[3]" />
        </div>
      </div>
    </div>
  );
};

// Enhanced inline editable Notes Input with Undo/Redo History system
const NotesInput = ({ value, onChange, className, itemKey }: any) => {
  const historyKey = `hist_design_notes_${itemKey || 'global'}`;
  
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(historyKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return value ? [value] : [''];
  });
  
  const [currentIndex, setCurrentIndex] = useState<number>(() => history.length - 1);
  const [val, setVal] = useState(value || '');

  useEffect(() => {
    setVal(value || '');
  }, [value]);

  const commitValue = (newVal: string) => {
    if (newVal !== history[currentIndex] && newVal !== history[history.length - 1]) {
      const newHistory = [...history.slice(0, currentIndex + 1), newVal].slice(-25);
      setHistory(newHistory);
      setCurrentIndex(newHistory.length - 1);
      try {
        localStorage.setItem(historyKey, JSON.stringify(newHistory));
      } catch (e) {}
      onChange(newVal);
    } else if (newVal !== (value || '')) {
      onChange(newVal);
    }
  };

  const handleBlur = () => {
    commitValue(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const undo = () => {
    if (currentIndex > 0) {
      const prevVal = history[currentIndex - 1];
      setCurrentIndex(currentIndex - 1);
      setVal(prevVal);
      onChange(prevVal);
    }
  };

  const redo = () => {
    if (currentIndex < history.length - 1) {
      const nextVal = history[currentIndex + 1];
      setCurrentIndex(currentIndex + 1);
      setVal(nextVal);
      onChange(nextVal);
    }
  };

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return (
    <div className="relative flex items-center gap-1 group w-full max-w-[280px]">
      <button 
        onClick={undo} 
        disabled={!canUndo}
        type="button"
        className={`p-1 rounded-full bg-black/40 border transition-all shrink-0 cursor-pointer ${
          canUndo 
            ? 'border-purple-500/50 text-purple-400 hover:bg-purple-500/20 hover:scale-110 shadow-lg' 
            : 'border-white/5 text-white/10 opacity-30 cursor-not-allowed'
        }`}
        title="تراجع (Undo)"
      >
        <Undo2 size={12} />
      </button>

      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="إضافة ملاحظات..."
        className={`bg-transparent text-xs font-medium border border-transparent focus:border-purple-500/50 hover:bg-white/5 focus:bg-[#0a0d14] rounded-lg px-2.5 py-1.5 outline-none text-right transition-all w-full arabic-text placeholder:text-white/10 ${className}`}
        dir="rtl"
      />

      <button 
        onClick={redo} 
        disabled={!canRedo}
        type="button"
        className={`p-1 rounded-full bg-black/40 border transition-all shrink-0 cursor-pointer ${
          canRedo 
            ? 'border-purple-500/50 text-purple-400 hover:bg-purple-500/20 hover:scale-110 shadow-lg' 
            : 'border-white/5 text-white/10 opacity-30 cursor-not-allowed'
        }`}
        title="إعادة (Redo)"
      >
        <Redo2 size={12} />
      </button>
    </div>
  );
};

export default function DesignersDashboard({ isDemoMode = false, liveData: sheetData }: { isDemoMode?: boolean; liveData?: any[] } = {}) {
  const currentMonthNum = String(new Date().getMonth() + 1);
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState<number>(300);
  const [filters, setFilters] = useState({
    designer: 'All',
    priority: 'All',
    requester: 'All',
    type: 'All',
    done: 'All'
  });

  useEffect(() => {
    setVisibleLimit(300);
  }, [selectedMonth, searchTerm, filters]);

  // ── Time-aware alert: fires on tab entry if current time ≥ 14:30 ──────────
  const [showLateAlert, setShowLateAlert] = useState(false);
  useEffect(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    // After 14:30 (2:30 PM)
    if (hours > 14 || (hours === 14 && minutes >= 30)) {
      setShowLateAlert(true);
    }
  }, []); // only on mount (tab entry)
  
  const toggleRequesterFilter = (name: string) => {
    setFilters(prev => {
      const isAlreadyActive = prev.requester.toLowerCase() === name.toLowerCase();
      return {
        ...prev,
        requester: isAlreadyActive ? 'All' : name,
        done: 'All'
      };
    });
  };

  const formatDateToInput = (dateStr: string) => {
    if (!dateStr) return '';
    const clean = String(dateStr).trim();
    if (!clean || clean === '-') return '';
    
    // Case 1: Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean;
    }
    
    // Case 2: MM/DD/YYYY or M/D/YYYY
    const parts = clean.split('/');
    if (parts.length === 3) {
      let month = parts[0];
      let day = parts[1];
      let year = parts[2];
      
      if (month.length === 1) month = '0' + month;
      if (day.length === 1) day = '0' + day;
      if (year.length === 2) year = '20' + year;
      
      return `${year}-${month}-${day}`;
    }
    
    // Case 3: Parse with standard Date
    try {
      const d = new Date(clean);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {}
    
    return '';
  };

  const formatDateFromInput = (dateStr: string) => {
    if (!dateStr) return '';
    const clean = String(dateStr).trim();
    if (!clean) return '';
    
    const parts = clean.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      return `${month}/${day}/${year}`;
    }
    return clean;
  };

  const getTaskDuration = (row: any) => {
    if (!row.done || !row.date || !(row.completed_date || row.completed_at)) return null;
    try {
      const start = new Date(row.date);
      const end = new Date(row.completed_date || row.completed_at);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diffTime = end.getTime() - start.getTime();
        return Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
      }
    } catch (e) {}
    return null;
  };
  
  // ── Data source: Supabase in production, Google Sheets in demo ──────────
  const supabase = useDesignersTasks();
  const localRows: any[] = isDemoMode
    ? (Array.isArray(sheetData) ? sheetData : [])
    : supabase.tasks;
  const loading = isDemoMode ? false : supabase.loading;
  const addTask = isDemoMode ? null : supabase.addTask;
  const updateTask = isDemoMode ? null : supabase.updateTask;
  const toggleDone = isDemoMode ? null : supabase.toggleDone;

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    date: new Date().toLocaleDateString('en-US'),
    designer: DEFAULT_DESIGNERS[0],
    priority: DEFAULT_PRIORITIES[0],
    requester: DEFAULT_REQUESTERS[0],
    type: DEFAULT_TYPES[0],
    deadline: '',
    reference: '',
    notes: '',
    done: false
  });

  const handleCellChange = async (rowIdOrKey: any, field: string, value: any) => {
    // Find target row by id (number or string) or uniqueKey
    let targetRow = localRows.find((r: any) => 
      (r.id !== undefined && String(r.id) === String(rowIdOrKey)) || 
      (r.uniqueKey && r.uniqueKey === rowIdOrKey)
    );
    if (!targetRow && typeof rowIdOrKey === 'number' && localRows[rowIdOrKey]) {
      targetRow = localRows[rowIdOrKey];
    }
    if (!targetRow) {
      console.warn('[DesignersDashboard] targetRow not found for key:', rowIdOrKey);
      return;
    }

    const numericId = Number(targetRow.id);

    if (field === 'done') {
      if (toggleDone && !isNaN(numericId)) await toggleDone(numericId, targetRow.done);
    } else if (field === 'done_designer') {
      if (updateTask && !isNaN(numericId)) {
        await updateTask(numericId, {
          done_designer: Boolean(value),
          done_designer_at: value ? new Date().toISOString() : null,
        });
      }
    } else if (field === 'received_creator') {
      if (updateTask && !isNaN(numericId)) {
        await updateTask(numericId, {
          received_creator: Boolean(value),
          received_creator_at: value ? new Date().toISOString() : null,
        });
      }
    } else {
      if (updateTask && !isNaN(numericId)) {
        await updateTask(numericId, { [field]: value });
      }
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (addTask) {
        await addTask(addForm as any);
      } else {
        // Demo mode — local only
        console.log('[Demo] Would add task:', addForm);
      }
      setShowAddModal(false);
      // Reset form
      setAddForm({
        name: '',
        date: new Date().toLocaleDateString('en-US'),
        designer: allDesignersList[0] || '',
        priority: allPrioritiesList[0] || '',
        requester: allRequestersList[0] || '',
        type: allTypesList[0] || '',
        deadline: '',
        reference: '',
        notes: '',
        done: false
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Exact Google Sheet custom color mapping for Column 2 (المصمم)
  const getDesignerStyle = (val: string) => {
    const v = String(val || '').toLowerCase().trim();
    
    if (v === 'sherif') return 'bg-[#00f5ff] text-[#006064] border-[#00e5ff]';
    if (v === 'shrouk' || v === 'nour' || v === 'nourhan' || v === 'awney') {
      return 'bg-[#2d6a4f] text-[#d8f3dc] border-[#1b4332]';
    }
    if (v === 'alaa zakria') return 'bg-[#d8f3dc] text-[#1b4332] border-[#b7e4c7]';
    if (v === 'alaa') return 'bg-[#264653] text-[#f4a261] border-[#2a9d8f]';
    if (v === 'esraa' || v === 'yomna') return 'bg-[#0077b6] text-white border-[#03045e]';
    if (v === 'hesham') return 'bg-[#4a4a58] text-white border-[#33333d]';
    if (v === 'sohaila') return 'bg-[#fff9c4] text-[#f57f17] border-[#fff59d]';
    if (v === 'khaled') return 'bg-[#2a9d8f] text-white border-[#264653]';
    if (v === 'eman') return 'bg-[#7209b7] text-white border-[#560bad]';
    if (v === 'anas') return 'bg-[#e63946] text-white border-[#d90429]';
    if (v === 'samir') return 'bg-[#1d3557] text-white border-[#f1faee]';
    if (v === 'mona' || v === 'maram' || v === 'esraa nagi') return 'bg-[#3f51b5] text-white border-[#1a237e]';
    if (v === 'manar') return 'bg-[#009688] text-white border-[#00796b]';
    if (v === 'a.amr') return 'bg-[#ba68c8] text-white border-[#8e24aa]';
    if (v === 'ahmed') return 'bg-[#e53935] text-white border-[#b71c1c]';
    if (v === 'nada') return 'bg-[#e1bee7] text-[#4a148c] border-[#ba68c8]';
    if (v === 'abdelkerim') return 'bg-[#5d4037] text-white border-[#3e2723]';
    if (v === 'donia') return 'bg-[#bbdefb] text-[#0d47a1] border-[#90caf9]';
    if (v === 'esraa naga') return 'bg-[#f8bbd0] text-[#880e4f] border-[#f48fb1]';
    if (v === 'a.medhat') return 'bg-[#00796b] text-white border-[#004d40]';
    
    return 'bg-[#2a2d3d] text-white/90 border-[#3a3d52]';
  };

  // Exact Google Sheet custom color mapping for Column 3 (الأولوية)
  const getPriorityStyle = (val: string) => {
    const v = String(val || '').trim();
    if (v === 'انهارده - ضروري') {
      return 'bg-[#c62828] text-white border-[#b71c1c] font-black';
    }
    if (v === 'انهارده - ممكن يتأجل') {
      return 'bg-[#fbc02d] text-[#3e2723] border-[#f9a825] font-black';
    }
    if (v === 'CHECK DEADLINE') {
      return 'bg-[#b3e5fc] text-[#01579b] border-[#81d4fa] font-black';
    }
    if (v === 'بكرة') {
      return 'bg-[#00796b] text-[#e0f2f1] border-[#004d40] font-black';
    }
    return 'bg-[#2a2d3d] text-white/70 border-[#3a3d52]';
  };

  // Exact Google Sheet custom color mapping for Column 4 (المراجع)
  const getRequesterStyle = (val: string) => {
    const v = String(val || '').toLowerCase().trim();
    if (v === 'narden') return 'bg-[#ffcdd2] text-[#b71c1c] border-[#ef9a9a]';
    if (v === 'aya') return 'bg-[#6a1b9a] text-white border-[#4a148c]';
    if (v === 'manar') return 'bg-[#bbdefb] text-[#0d47a1] border-[#90caf9]';
    if (v === 'jumana') return 'bg-[#00695c] text-[#e0f2f1] border-[#004d40]';
    return 'bg-[#2a2d3d] text-white/75 border-[#3a3d52]';
  };

  // Exact Google Sheet custom color mapping for Column 5 (النوع)
  const getTypeStyle = (val: string) => {
    const v = String(val || '').toUpperCase().trim();
    if (v === 'social-media') return 'bg-[#bbdefb] text-[#0d47a1] border-[#90caf9]';
    if (v === 'yt-communtiy') return 'bg-[#e1bee7] text-[#4a148c] border-[#ce93d8]';
    if (v === 'thumbnail') return 'bg-[#ffcdd2] text-[#b71c1c] border-[#ef9a9a]';
    if (v === 'other') return 'bg-[#fff9c4] text-[#f57f17] border-[#ffe082]';
    
    // Exact mapping check
    if (v.includes('SOCIAL-MEDIA')) return 'bg-[#bbdefb] text-[#0d47a1] border-[#90caf9]';
    if (v.includes('YT-COMMUNTIY')) return 'bg-[#e1bee7] text-[#4a148c] border-[#ce93d8]';
    if (v.includes('THUMBNAIL')) return 'bg-[#ffcdd2] text-[#b71c1c] border-[#ef9a9a]';
    if (v.includes('OTHER')) return 'bg-[#fff9c4] text-[#f57f17] border-[#ffe082]';
    
    return 'bg-[#2a2d3d] text-white/80 border-[#3a3d52]';
  };

  // Helper to extract month number (1-12) from any date format
  const extractMonthNum = (dateVal: any): string | null => {
    if (!dateVal) return null;
    const str = String(dateVal).trim();
    if (!str || str === '-') return null;

    // Format 1: M/D/YYYY or MM/DD/YYYY
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        const m = parseInt(parts[0], 10);
        if (!isNaN(m) && m >= 1 && m <= 12) return String(m);
      }
    }
    // Format 2: YYYY-MM-DD
    if (str.includes('-')) {
      const parts = str.split('-');
      if (parts.length === 3) {
        const m = parseInt(parts[1], 10);
        if (!isNaN(m) && m >= 1 && m <= 12) return String(m);
      }
    }
    // Format 3: Standard JS Date parse
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return String(d.getMonth() + 1);
      }
    } catch (e) {}

    return null;
  };

  // Extract available months dynamically from dates
  const availableMonths = useMemo(() => {
    const monthNames: Record<string, string> = {
      '1': 'شهر 1 - يناير (January)',
      '2': 'شهر 2 - فبراير (February)',
      '3': 'شهر 3 - مارس (March)',
      '4': 'شهر 4 - أبريل (April)',
      '5': 'شهر 5 - مايو (May)',
      '6': 'شهر 6 - يونيو (June)',
      '7': 'شهر 7 - يوليو (July)',
      '8': 'شهر 8 - أغسطس (August)',
      '9': 'شهر 9 - سبتمبر (September)',
      '10': 'شهر 10 - أكتوبر (October)',
      '11': 'شهر 11 - نوفمبر (November)',
      '12': 'شهر 12 - ديسمبر (December)'
    };
    const set = new Set<string>();
    if (Array.isArray(localRows)) {
      localRows.forEach(row => {
        if (row && row.date) {
          const m = extractMonthNum(row.date);
          if (m) set.add(m);
        }
      });
    }

    // Ensure 5 (May) through 8 (August) are represented if data is present
    ['5', '6', '7', '8'].forEach(m => set.add(m));

    return Array.from(set).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).map(m => ({
      key: m,
      label: monthNames[m] || `شهر ${m}`
    }));
  }, [localRows]);

  // Filter rows while keeping track of original index to support clean local editing
  const filteredRows = useMemo(() => {
    if (!Array.isArray(localRows)) return [];
    const mapped = localRows.map((r, idx) => (r ? { ...r, originalIndex: idx } : { originalIndex: idx }));
    return mapped.filter((row: any) => {
      if (!row) return false;
      // 0. Month filter match
      if (selectedMonth !== 'All') {
        const rowMonth = extractMonthNum(row.date);
        if (rowMonth !== selectedMonth) return false;
      }
      // 1. Search term match
      if (searchTerm) {
        const searchString = `${row.name || ''} ${row.task_name || ''} ${row.script || ''} ${row.date || ''} ${row.designer || ''} ${row.priority || ''} ${row.requester || ''} ${row.type || ''} ${row.reference || ''} ${row.notes || ''}`.toLowerCase();
        if (!searchString.includes(searchTerm.toLowerCase())) return false;
      }
      // 2. Designer filter match
      if (filters.designer !== 'All' && String(row.designer || '').trim() !== filters.designer) return false;
      // 3. Priority filter match
      if (filters.priority !== 'All' && String(row.priority || '').trim() !== filters.priority) return false;
      // 4. Requester / Designer filter match (case-insensitive & matches requester OR designer)
      if (filters.requester !== 'All') {
        const reqFilter = filters.requester.toLowerCase().trim();
        const rowReq = String(row.requester || '').toLowerCase().trim();
        const rowDes = String(row.designer || '').toLowerCase().trim();
        if (rowReq !== reqFilter && rowDes !== reqFilter && !rowReq.includes(reqFilter) && !rowDes.includes(reqFilter)) {
          return false;
        }
      }
      // 5. Type filter match
      if (filters.type !== 'All' && String(row.type || '').trim() !== filters.type) return false;
      // 6. Done filter match (based on done_designer or legacy done)
      if (filters.done !== 'All') {
        const isDone = filters.done === 'Done';
        const rowIsDone = Boolean(row.done_designer || row.done);
        if (rowIsDone !== isDone) return false;
      }
      return true;
    });
  }, [localRows, searchTerm, filters, selectedMonth]);

  // Helper to check if a task is actively in review (not yet finished by designer)
  const isTaskActiveReview = (r: any) => {
    if (!r) return false;
    return !r.done_designer && !r.done;
  };

  // Extract unique options dynamically from localRows & localStorage
  const allDesignersList = useMemo(() => {
    const stored = getStoredCustomItems('designer', DEFAULT_DESIGNERS);
    if (!Array.isArray(localRows)) return stored;
    const fromRows = localRows.map(r => String(r?.designer || '').trim()).filter(Boolean);
    return Array.from(new Set([...stored, ...fromRows]));
  }, [localRows]);

  const allPrioritiesList = useMemo(() => {
    const stored = getStoredCustomItems('priority', DEFAULT_PRIORITIES);
    if (!Array.isArray(localRows)) return stored;
    const fromRows = localRows.map(r => String(r?.priority || '').trim()).filter(Boolean);
    return Array.from(new Set([...stored, ...fromRows]));
  }, [localRows]);

  const allRequestersList = useMemo(() => {
    const stored = getStoredCustomItems('requester', DEFAULT_REQUESTERS);
    if (!Array.isArray(localRows)) return stored;
    const fromRows = localRows.map(r => String(r?.requester || '').trim()).filter(Boolean);
    return Array.from(new Set([...stored, ...fromRows]));
  }, [localRows]);

  const allTypesList = useMemo(() => {
    const stored = getStoredCustomItems('type', DEFAULT_TYPES);
    if (!Array.isArray(localRows)) return stored;
    const fromRows = localRows.map(r => String(r?.type || '').trim()).filter(Boolean);
    return Array.from(new Set([...stored, ...fromRows]));
  }, [localRows]);

  const tasksAya = useMemo(() => {
    if (!Array.isArray(localRows)) return [];
    return localRows.filter((r: any) => 
      isTaskActiveReview(r) && 
      (String(r.requester || '').toLowerCase().includes('aya') || 
       String(r.designer || '').toLowerCase().includes('aya'))
    );
  }, [localRows]);

  const tasksManar = useMemo(() => {
    if (!Array.isArray(localRows)) return [];
    return localRows.filter((r: any) => 
      isTaskActiveReview(r) && 
      (String(r.requester || '').toLowerCase().includes('manar') || 
       String(r.designer || '').toLowerCase().includes('manar'))
    );
  }, [localRows]);

  const tasksNarden = useMemo(() => {
    if (!Array.isArray(localRows)) return [];
    return localRows.filter((r: any) => 
      isTaskActiveReview(r) && 
      (String(r.requester || '').toLowerCase().includes('narden') || 
       String(r.designer || '').toLowerCase().includes('narden'))
    );
  }, [localRows]);

  // Calculate real-time workload for all candidate designers to suggest the least busy one
  const designerWorkloads = useMemo(() => {
    if (!Array.isArray(localRows)) return [];
    return allRequestersList.map(name => {
      const activeCount = localRows.filter((r: any) => 
        isTaskActiveReview(r) && 
        (String(r.requester || '').toLowerCase().trim() === name.toLowerCase() || 
         String(r.designer || '').toLowerCase().trim() === name.toLowerCase())
      ).length;
      return { name, count: activeCount };
    }).sort((a, b) => a.count - b.count);
  }, [localRows, allRequestersList]);

  const bestSuggestedDesigner = designerWorkloads[0];

  // Automatically pre-select the most available / free designer when opening the Add Modal
  useEffect(() => {
    if (showAddModal && bestSuggestedDesigner?.name) {
      setAddForm(prev => ({
        ...prev,
        requester: bestSuggestedDesigner.name
      }));
    }
  }, [showAddModal]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] bg-[#05070a]">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-6" />
        <p className="text-white/40 text-sm font-black tracking-[0.3em] uppercase">Syncing with Google Sheets...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full animate-fadeIn max-w-[1600px] mx-auto">

      {/* ⏰ Late-Day Toast Alert */}
      <AnimatePresence>
        {showLateAlert && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full mb-4"
            dir="rtl"
          >
            <div className="relative w-full bg-[#0f0900] border border-amber-500/40 rounded-2xl px-5 py-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.6)] flex items-center justify-between gap-4 overflow-hidden">
              {/* Ambient glow */}
              <div className="absolute inset-0 bg-amber-500/[0.04] pointer-events-none" />

              {/* Icon + Text */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl shrink-0">⚠️</span>
                <p className="text-sm font-black text-amber-200 arabic-text leading-snug">
                  بعد الساعة <span className="text-white text-base">٢:٣٠</span> الحاجة مش هتخلص في نفس اليوم
                </p>
              </div>

              {/* Close */}
              <button
                onClick={() => setShowLateAlert(false)}
                className="shrink-0 w-7 h-7 rounded-full bg-white/5 hover:bg-amber-500/20 text-white/30 hover:text-amber-300 flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Sticky Header & Controls */}
      <div className="sticky top-4 z-40 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-[#0a0d14]/90 backdrop-blur-xl p-6 rounded-3xl border border-purple-500/20 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        <div>
          <div className="flex items-center gap-3 text-purple-500 mb-2 uppercase tracking-[0.3em] font-black text-[10px]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
            <span>Designers Hub</span>
          </div>
          <h2 className="text-5xl lg:text-6xl font-black tracking-tightest text-white mb-3">Designers</h2>
          <div className="flex flex-wrap items-center gap-5 sm:gap-6 mt-4">
            <p className="text-sm sm:text-base text-white/80 font-bold tracking-wider">
              {filteredRows.length} RECORDS LOADED {isDemoMode ? 'FROM GOOGLE SHEETS' : 'FROM DATABASE'}
            </p>
            <div className="h-6 w-0.5 bg-white/20 hidden sm:block" />
            <div className="flex flex-wrap items-center gap-3 bg-black/40 border border-white/10 px-4 py-2 rounded-2xl shadow-inner backdrop-blur-md">
              <span className="text-xs sm:text-sm uppercase font-black text-purple-300 tracking-wider flex items-center gap-2">
                <Sparkles size={14} className="text-purple-400" />
                <span>Active Review Tasks:</span>
              </span>
              
              {/* AYA Popover */}
              <ReviewTasksPopover
                name="AYA"
                count={tasksAya.length}
                tasks={tasksAya}
                isActive={filters.requester.toLowerCase() === 'aya'}
                onToggleFilter={() => toggleRequesterFilter('AYA')}
                colorScheme={{
                  badgeBg: 'bg-[#6a1b9a]/30',
                  badgeBorder: 'border-[#6a1b9a]/60',
                  badgeText: 'text-[#d8b4fe]',
                  activeRing: 'ring-purple-400/50',
                  dotColor: 'bg-[#c084fc]'
                }}
              />

              {/* MANAR Popover */}
              <ReviewTasksPopover
                name="MANAR"
                count={tasksManar.length}
                tasks={tasksManar}
                isActive={filters.requester.toLowerCase() === 'manar'}
                onToggleFilter={() => toggleRequesterFilter('MANAR')}
                colorScheme={{
                  badgeBg: 'bg-[#0077b6]/30',
                  badgeBorder: 'border-[#0077b6]/60',
                  badgeText: 'text-[#90caf9]',
                  activeRing: 'ring-sky-400/50',
                  dotColor: 'bg-[#38bdf8]'
                }}
              />

              {/* Narden Popover */}
              <ReviewTasksPopover
                name="Narden"
                count={tasksNarden.length}
                tasks={tasksNarden}
                isActive={filters.requester.toLowerCase() === 'narden'}
                onToggleFilter={() => toggleRequesterFilter('Narden')}
                colorScheme={{
                  badgeBg: 'bg-[#b71c1c]/30',
                  badgeBorder: 'border-[#b71c1c]/60',
                  badgeText: 'text-[#fca5a5]',
                  activeRing: 'ring-rose-400/50',
                  dotColor: 'bg-[#fca5a5]'
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <div className="relative group w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/50 w-4 h-4 group-focus-within:text-purple-400 transition-colors" />
            <input
              type="text"
              placeholder="البحث في المهام..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/5 focus:border-purple-500/50 rounded-2xl pl-11 pr-4 py-2.5 text-xs sm:text-sm font-bold text-white outline-none transition-all arabic-text placeholder:text-muted/30"
            />
          </div>
        </div>
      </div>

      {/* Monthly Sheets Navigation Bar (شيتات الشهور المنفصلة) */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 px-3.5 py-2 rounded-2xl shrink-0 arabic-text">
            📑 شيتات الشهور:
          </span>
          {availableMonths.map((m) => {
            const isActive = selectedMonth === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setSelectedMonth(m.key)}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all border shrink-0 cursor-pointer flex items-center gap-2 arabic-text ${
                  isActive
                    ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/40 scale-105 ring-2 ring-purple-400/50'
                    : 'bg-[#0a0d14] border-white/10 text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white animate-pulse' : 'bg-purple-400'}`} />
                <span>{m.label}</span>
                {m.key === currentMonthNum && (
                  <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold">الشهر الحالي ⚡</span>
                )}
              </button>
            );
          })}
          <button
            onClick={() => setSelectedMonth('All')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all border shrink-0 cursor-pointer arabic-text ${
              selectedMonth === 'All'
                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-105'
                : 'bg-[#0a0d14] border-white/10 text-muted/60 hover:text-white hover:bg-white/5'
            }`}
          >
            📂 الأرشيف الكامل (كل الشهور)
          </button>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="bg-[#0a0d14] rounded-3xl border border-white/5 overflow-hidden flex-1 flex flex-col shadow-2xl">
        <div className="overflow-x-auto flex-1 relative">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-white/5 bg-black/40 text-[10px] uppercase tracking-[0.12em] font-black text-muted/60">
                <th className="px-2.5 py-3 font-bold sticky top-0 bg-[#080a0f] z-10 w-10 text-center text-muted/60">#</th>
                <th className="px-2.5 py-3 font-bold sticky top-0 bg-[#080a0f] z-10 text-right text-muted/60 w-20">التاريخ</th>
                <th className="px-2.5 py-2 sticky top-0 bg-[#080a0f] z-10 text-right">
                  <HeaderFilter 
                    label="الكريتور" 
                    value={filters.designer} 
                    onChange={(val: any) => setFilters(p => ({ ...p, designer: val }))} 
                    options={allDesignersList} 
                  />
                </th>
                <th className="px-2.5 py-2 sticky top-0 bg-[#080a0f] z-10 text-right">
                  <HeaderFilter 
                    label="الأولوية" 
                    value={filters.priority} 
                    onChange={(val: any) => setFilters(p => ({ ...p, priority: val }))} 
                    options={allPrioritiesList} 
                  />
                </th>
                <th className="px-2.5 py-2 sticky top-0 bg-[#080a0f] z-10 text-right">
                  <HeaderFilter 
                    label="المصمم" 
                    value={filters.requester} 
                    onChange={(val: any) => setFilters(p => ({ ...p, requester: val }))} 
                    options={allRequestersList} 
                  />
                </th>
                <th className="px-2.5 py-2 sticky top-0 bg-[#080a0f] z-10 text-right">
                  <HeaderFilter 
                    label="النوع" 
                    value={filters.type} 
                    onChange={(val: any) => setFilters(p => ({ ...p, type: val }))} 
                    options={allTypesList} 
                  />
                </th>
                <th className="px-2.5 py-3 font-bold sticky top-0 bg-[#080a0f] z-10 text-right text-muted/60 min-w-[120px]">اسم السكريبت / التاسك</th>
                <th className="px-2.5 py-3 font-bold sticky top-0 bg-[#080a0f] z-10 text-right text-muted/60 w-24">ميعاد التسليم</th>
                <th className="px-2.5 py-3 font-bold sticky top-0 bg-[#080a0f] z-10 text-center text-muted/60 w-16">المرجع</th>
                <th className="px-2.5 py-3 font-bold sticky top-0 bg-[#080a0f] z-10 max-w-[160px] text-right text-muted/60">ملاحظات</th>

                {/* DONE — المصمم: with filter dropdown */}
                <th className="px-3 py-2 sticky top-0 bg-[#080a0f] z-10 text-center w-16">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] font-black text-emerald-400 tracking-wider uppercase">DONE</span>
                    <span className="text-[8px] text-white/30 font-bold">المصمم</span>
                    <select
                      value={filters.done}
                      onChange={(e) => setFilters(p => ({ ...p, done: e.target.value }))}
                      className="mt-0.5 text-[9px] bg-[#0e1322] border border-white/10 rounded-md px-1 py-0.5 text-white/60 cursor-pointer outline-none hover:border-emerald-500/40 transition-colors"
                    >
                      <option value="All">الكل</option>
                      <option value="Done">منتهي ✅</option>
                      <option value="Pending">قيد التنفيذ</option>
                    </select>
                  </div>
                </th>
                {/* RECEIVED — الكريتور */}
                <th className="px-3 py-2 sticky top-0 bg-[#080a0f] z-10 text-center w-16">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] font-black text-sky-400 tracking-wider uppercase">RECEIVED</span>
                    <span className="text-[8px] text-white/30 font-bold">الكريتور</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              
              {/* Quick-Add Row */}
              <tr 
                onClick={() => setShowAddModal(true)}
                className="border-b border-white/[0.05] bg-purple-500/[0.02] hover:bg-purple-500/[0.08] transition-colors cursor-pointer group"
              >
                <td className="px-2.5 py-3 text-center">
                  <div className="w-7 h-7 rounded-full bg-purple-500/10 group-hover:bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto transition-all scale-100 group-hover:scale-110 shadow-sm">
                    <Plus size={15} className="stroke-[3]" />
                  </div>
                </td>
                <td colSpan={11} className="px-4 py-3 text-right arabic-text">
                  <span className="text-xs font-black text-purple-400 group-hover:text-purple-300 transition-colors tracking-wide">
                    + إضافة تاسك جديد (Add New Design Task)
                  </span>
                </td>
              </tr>

              {filteredRows.slice(0, visibleLimit).map((row: any, i) => {
                const isDone = !!row.done_designer;
                const priorityStr = String(row.priority || '').trim();
                
                // Dynamically resolve high-contrast theme classes
                let rowBgClass = '';
                let textDateClass = 'text-white/80';
                let textDeadlineClass = 'text-red-400 font-mono';
                let textNotesClass = 'text-white/60';
                
                if (isDone) {
                  // Case 1: Subtle green (15% opacity) for Completed/Done tasks
                  rowBgClass = 'bg-emerald-500/[0.12] hover:bg-emerald-500/[0.18] border-l-2 border-l-emerald-500/40';
                  textDateClass = 'text-emerald-300/80 font-bold';
                  textDeadlineClass = 'text-emerald-300/80 font-mono font-bold';
                  textNotesClass = 'text-emerald-200/60';
                } else if (priorityStr === 'انهارده - ممكن يتأجل') {
                  // Case 2: Yellow row for pending postponable tasks ("انهارده - ممكن يتأجل")
                  rowBgClass = 'bg-amber-900/65 hover:bg-amber-900/80 border-l-[6px] border-l-amber-400 text-amber-100';
                  textDateClass = 'text-amber-200 font-bold';
                  textDeadlineClass = 'text-amber-300 font-mono font-bold';
                  textNotesClass = 'text-amber-200/80';
                } else {
                  // Case 3: Red row for all other standard or urgent pending tasks
                  rowBgClass = 'bg-rose-900/65 hover:bg-rose-900/80 border-l-[6px] border-l-rose-400 text-rose-100';
                  textDateClass = 'text-rose-200 font-bold';
                  textDeadlineClass = 'text-rose-300 font-mono font-black';
                  textNotesClass = 'text-rose-200/80';
                }

                return (
                  <tr 
                    key={row.uniqueKey || i} 
                    className={`border-b border-white/[0.02] transition-all duration-300 ${rowBgClass}`}
                  >
                    <td className="px-2.5 py-2 text-center text-xs text-muted/30 font-mono">{i + 1}</td>
                    
                    {/* التاريخ */}
                    <td className="px-2.5 py-2">
                      <span className={`text-xs font-bold ${textDateClass}`}>{row.date || '-'}</span>
                    </td>

                    {/* المصمم */}
                    <td className="px-2.5 py-2">
                      <DropdownSelect
                        value={row.designer}
                        onChange={(val: string) => handleCellChange(row.id || row.uniqueKey || row.originalIndex, 'designer', val)}
                        options={allDesignersList}
                        getStyles={getDesignerStyle}
                        categoryKey="designer"
                      />
                    </td>

                    {/* الأولوية */}
                    <td className="px-2.5 py-2">
                      <DropdownSelect
                        value={row.priority}
                        onChange={(val: string) => handleCellChange(row.id || row.uniqueKey || row.originalIndex, 'priority', val)}
                        options={allPrioritiesList}
                        getStyles={getPriorityStyle}
                        categoryKey="priority"
                      />
                    </td>

                    {/* المراجع */}
                    <td className="px-2.5 py-2">
                      <DropdownSelect
                        value={row.requester}
                        onChange={(val: string) => handleCellChange(row.id || row.uniqueKey || row.originalIndex, 'requester', val)}
                        options={allRequestersList}
                        getStyles={getRequesterStyle}
                        categoryKey="requester"
                      />
                    </td>

                    {/* النوع */}
                    <td className="px-2.5 py-2">
                      <DropdownSelect
                        value={row.type}
                        onChange={(val: string) => handleCellChange(row.id || row.uniqueKey || row.originalIndex, 'type', val)}
                        options={allTypesList}
                        getStyles={getTypeStyle}
                        categoryKey="type"
                      />
                    </td>

                    {/* اسم السكريبت / التاسك */}
                    <td className="px-2.5 py-2 min-w-[120px]">
                      <input
                        type="text"
                        value={row.name || row.task_name || row.script || ''}
                        placeholder="تسمية التاسك..."
                        onChange={(e) => handleCellChange(row.id || row.uniqueKey || row.originalIndex, 'name', e.target.value)}
                        className="bg-transparent text-xs font-bold border border-transparent focus:border-purple-500/50 hover:bg-white/5 focus:bg-[#0a0d14] rounded-lg px-2 py-1 outline-none text-right transition-all w-full arabic-text placeholder:text-white/15 text-white"
                        dir="rtl"
                      />
                    </td>

                    {/* ميعاد التسليم */}
                    <td className="px-2.5 py-2">
                      <input
                        type="date"
                        value={formatDateToInput(row.deadline)}
                        onChange={(e) => {
                          const formatted = formatDateFromInput(e.target.value);
                          handleCellChange(row.id || row.uniqueKey || row.originalIndex, 'deadline', formatted);
                        }}
                        className={`bg-transparent text-xs font-bold font-mono border border-transparent focus:border-white/20 hover:bg-white/5 focus:bg-[#0a0d14] rounded-lg px-1.5 py-1 outline-none text-right cursor-pointer transition-all ${
                          isDone 
                            ? 'text-emerald-300' 
                            : priorityStr === 'انهارده - ممكن يتأجل'
                            ? 'text-amber-300'
                            : 'text-rose-300'
                        }`}
                        style={{ colorScheme: 'dark' }}
                        dir="ltr"
                      />
                    </td>

                    {/* Reference */}
                    <td className="px-2.5 py-2 text-center">
                      {row.reference ? (
                        <a 
                          href={row.reference} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 text-[11px] font-bold border border-indigo-500/30 hover:border-indigo-500/60 transition-all shadow-sm"
                          title={row.reference}
                        >
                          <Link size={11} />
                          <span>المستند</span>
                        </a>
                      ) : (
                        <span className="text-xs text-muted/30">-</span>
                      )}
                    </td>

                    {/* Notes */}
                    <td className="px-2.5 py-2 max-w-[160px]">
                      <NotesInput
                        itemKey={row.id || row.uniqueKey || row.originalIndex}
                        value={row.notes}
                        onChange={(val: string) => handleCellChange(row.id || row.uniqueKey || row.originalIndex, 'notes', val)}
                        className={textNotesClass}
                      />
                    </td>

                    {/* DONE — المصمم */}
                    <td className="px-6 py-3 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleCellChange(row.id || row.uniqueKey || row.originalIndex, 'done_designer', !row.done_designer)}
                          title="Done — المصمم"
                          className={`p-1.5 rounded-lg transition-all ${
                            row.done_designer
                              ? 'bg-emerald-500/20 text-emerald-400 scale-110 shadow-md shadow-emerald-500/20'
                              : 'bg-white/5 text-white/20 hover:bg-emerald-500/10 hover:text-emerald-400'
                          }`}
                        >
                          {row.done_designer ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                        {row.done_designer && (
                          (() => {
                            const days = getTaskDuration(row);
                            if (days !== null) {
                              return (
                                <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 px-1.5 py-0.5 rounded shadow-sm select-none tracking-wide">
                                  ⏱️ {days} {days === 1 ? 'يوم' : days === 2 ? 'يومين' : 'أيام'}
                                </span>
                              );
                            }
                            return null;
                          })()
                        )}
                      </div>
                    </td>

                    {/* RECEIVED — الكريتور */}
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => handleCellChange(row.id || row.uniqueKey || row.originalIndex, 'received_creator', !row.received_creator)}
                        title="استلمته — الكريتور"
                        className={`p-1.5 rounded-lg transition-all ${
                          row.received_creator
                            ? 'bg-sky-500/20 text-sky-400 scale-110 shadow-md shadow-sky-500/20'
                            : 'bg-white/5 text-white/20 hover:bg-sky-500/10 hover:text-sky-400'
                        }`}
                      >
                        {row.received_creator ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </td>
                  </tr>
                );
              })}
              
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center opacity-40">
                      <Search className="w-12 h-12 mb-4" />
                      <p className="text-sm font-bold uppercase tracking-widest arabic-text">لا توجد مهام تطابق البحث</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Design Task Glass Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="bg-[#0b1019] border border-white/10 rounded-3xl p-8 max-w-xl w-full shadow-[0_0_50px_rgba(0,0,0,0.8)] space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[80px] -z-10" />
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Plus size={20} className="stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white arabic-text">إضافة مهمة تصميمية جديدة</h3>
                  <p className="text-xs text-muted-foreground/60 mt-1">سيتم إضافتها فوراً إلى جدول المصممين النشط.</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-white p-2 transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground/70 mb-1.5">تاريخ الإضافة</label>
                  <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-sm flex items-center justify-between opacity-80 cursor-not-allowed select-none" dir="ltr">
                    <span>{addForm.date}</span>
                    <span className="text-[10px] text-purple-400 font-black arabic-text bg-purple-500/10 px-2 py-0.5 rounded-lg">📅 اليوم</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground/70 mb-1.5">ميعاد التسليم المتوقع</label>
                  <input
                    type="date"
                    value={formatDateToInput(addForm.deadline)}
                    onChange={e => setAddForm({...addForm, deadline: formatDateFromInput(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors font-bold text-sm text-left cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground/70 mb-1.5">الكريتور (Creator)</label>
                  <select
                    value={addForm.designer}
                    onChange={e => setAddForm({...addForm, designer: e.target.value})}
                    className="w-full bg-[#0b1019] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors font-bold text-sm cursor-pointer"
                  >
                    {allDesignersList.map(d => (
                      <option key={d} value={d} className="bg-[#0b1019]">{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground/70 mb-1.5">الأولوية (Priority)</label>
                  <select
                    value={addForm.priority}
                    onChange={e => setAddForm({...addForm, priority: e.target.value})}
                    className="w-full bg-[#0b1019] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors font-bold text-sm cursor-pointer"
                  >
                    {allPrioritiesList.map(p => (
                      <option key={p} value={p} className="bg-[#0b1019]">{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-muted-foreground/70">المصمم (Designer)</label>
                    {bestSuggestedDesigner && (
                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <Sparkles size={11} className="text-amber-400" />
                        <span>الأكثر تفرغاً: {bestSuggestedDesigner.name} ({bestSuggestedDesigner.count} مهام)</span>
                      </span>
                    )}
                  </div>
                  <select
                    value={addForm.requester}
                    onChange={e => setAddForm({...addForm, requester: e.target.value})}
                    className="w-full bg-[#0b1019] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors font-bold text-sm cursor-pointer"
                  >
                    {designerWorkloads.map(item => (
                      <option key={item.name} value={item.name} className="bg-[#0b1019]">
                        {item.name} — {item.count === 0 ? '🟢 متفرغ تماماً (0 مهام)' : item.count === 1 ? '🟡 1 مهمة قيد المراجعة' : `🔴 ${item.count} مهام نشطة`}
                      </option>
                    ))}
                  </select>

                  {/* Quick Select Suggestion Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-white/50 font-bold ml-1">اقتراح ذكي:</span>
                    {designerWorkloads.map(item => {
                      const isSelected = addForm.requester === item.name;
                      const isFree = item.count === 0;
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => setAddForm({ ...addForm, requester: item.name })}
                          className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-purple-600 border-purple-400 text-white shadow-md scale-105 ring-1 ring-purple-400/50'
                              : isFree
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                              : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                          }`}
                          title={`اضغط لاختيار ${item.name} (لديه ${item.count} مهام حالياً)`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isFree ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                          <span>{item.name}</span>
                          <span className="font-mono text-[9px] opacity-75">({item.count})</span>
                          {isFree && <span className="text-[9px]">✨</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground/70 mb-1.5">النوع (Type)</label>
                  <select
                    value={addForm.type}
                    onChange={e => setAddForm({...addForm, type: e.target.value})}
                    className="w-full bg-[#0b1019] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors font-bold text-sm cursor-pointer"
                  >
                    {allTypesList.map(t => (
                      <option key={t} value={t} className="bg-[#0b1019]">{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* اسم السكريبت / التاسك مع زر توليد الاسم */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-muted-foreground/70">
                    اسم السكريبت (Script Name / Task)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const autoName = `${addForm.type || 'TASK'}-${addForm.designer || 'CREATOR'}-${new Date().toLocaleDateString('en-GB').replace(/\//g, '')}`;
                      setAddForm({ ...addForm, name: autoName });
                    }}
                    className="text-[11px] font-black text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <span>توليد اسم</span>
                    <span>✨🪄</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="مثال: سكريبت مستر حسام أو كود التاسك..."
                  value={addForm.name || ''}
                  onChange={e => setAddForm({...addForm, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors font-bold text-sm arabic-text placeholder:text-white/20"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground/70 mb-1.5">رابط المرجع (Reference Link) <span className="text-red-500 font-bold">*</span></label>
                <input
                  type="url"
                  required
                  placeholder="https://docs.google.com/..."
                  value={addForm.reference}
                  onChange={e => setAddForm({...addForm, reference: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors font-bold text-sm text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground/70 mb-1.5">ملاحظات إضافية</label>
                <textarea
                  placeholder="اكتب تفاصيل أو ملاحظات إضافية للمصمم هنا..."
                  value={addForm.notes}
                  rows={2}
                  onChange={e => setAddForm({...addForm, notes: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors font-bold text-sm arabic-text resize-none"
                />
              </div>

              <div className="flex gap-4 pt-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-purple-600/20 active:scale-[0.98] cursor-pointer text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <span>حفظ وإضافة المهمة</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3.5 px-6 rounded-xl transition-all active:scale-[0.98] cursor-pointer text-sm"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
