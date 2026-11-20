import React, { useState, useMemo, useEffect, useRef, useContext, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Clock, Undo2, Redo2, ChevronDown, X, Calendar, FileImage, Check, Copy
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  formatArabicTimestamp,
  getCachedNoteAuthors,
  getChipColor,
  toInputDate,
  fromInputDate,
  formatDuration,
  parseDriveLink,
  type HistoryEntry
} from '../lib/dashboardUtils';

export const PreviewImage = ({ url }: { url: string }) => {
  const [loadStep, setLoadStep] = useState(0);

  if (!url) return null;
  const s = String(url).trim();
  
  let cleanUrl = s;
  const hyperlinkRegex = /=HYPERLINK\s*\(\s*(['"])(.*?)\1\s*,\s*(['"])(.*?)\3\s*\)/i;
  const formulaMatch = s.match(hyperlinkRegex);
  if (formulaMatch) {
    cleanUrl = formulaMatch[2].trim();
  }

  let fileId: string | null = null;
  const fileIdMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]{25,55})/);
  if (fileIdMatch) fileId = fileIdMatch[1];
  else {
    const idParamMatch = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]{25,55})/);
    if (idParamMatch) fileId = idParamMatch[1];
    else {
      const driveIdRegex = /^[a-zA-Z0-9_-]{25,55}$/;
      if (driveIdRegex.test(cleanUrl)) fileId = cleanUrl;
    }
  }

  const isDirectImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)/i.test(cleanUrl);

  if (!fileId && !isDirectImage) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/30">
        <FileImage size={14} />
      </div>
    );
  }

  if (loadStep >= 3) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/30">
        <FileImage size={14} />
      </div>
    );
  }

  let src = '';
  if (isDirectImage) {
    src = cleanUrl;
  } else {
    if (loadStep === 0) {
      src = `/api/drive-preview?id=${fileId}`;
    } else if (loadStep === 1) {
      src = `https://lh3.googleusercontent.com/d/${fileId}=w200`;
    } else {
      src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w200`;
    }
  }

  return (
    <img 
      src={src} 
      alt="Preview" 
      className="w-full h-full object-cover"
      onError={() => {
        if (isDirectImage) {
          setLoadStep(3);
        } else {
          setLoadStep(prev => prev + 1);
        }
      }}
    />
  );
};

export const HistoryInput = ({ itemKey, fieldKey, value, onChange, placeholder, updatedAt, updatedBy, fallbackAuthor, disabled }: any) => {
  const { profile } = useAuth();
  
  const getLoggedInUserName = () => {
    if (profile?.name && profile.name.trim()) return profile.name.trim();
    try {
      const raw = localStorage.getItem('local_profile_login');
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.name && p.name.trim()) return p.name.trim();
      }
    } catch {}
    const legacy = localStorage.getItem('user_editor_name');
    if (legacy && legacy.trim()) return legacy.trim();
    return 'مستخدم';
  };

  const loggedInName = getLoggedInUserName();

  const historyKey = `hist_${fieldKey || 'note'}_${itemKey || 'global'}`;
  const timestampKey = `time_${fieldKey || 'note'}_${itemKey || 'global'}`;
  const authorKey = `author_${fieldKey || 'note'}_${itemKey || 'global'}`;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Resolve the true author of an existing note:
  // 1. updatedBy from server note_authors or table column
  // 2. fallbackAuthor (e.g. assigned editor for editor notes, or creator for notes)
  // 3. Cached localStorage author ONLY if it doesn't match the current viewer (preventing old bug contamination)
  const getResolvedExistingAuthor = () => {
    if (updatedBy && String(updatedBy).trim() && String(updatedBy).trim() !== 'غير محدد') {
      return String(updatedBy).trim();
    }
    if (fallbackAuthor && String(fallbackAuthor).trim() && String(fallbackAuthor).trim() !== 'غير محدد') {
      return String(fallbackAuthor).trim();
    }
    try {
      const savedAuthor = localStorage.getItem(authorKey);
      if (savedAuthor && savedAuthor.trim() && savedAuthor.trim() !== loggedInName && savedAuthor.trim() !== 'غير محدد') {
        return savedAuthor.trim();
      }
    } catch {}
    return undefined;
  };
  
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const currentText = (value || '').trim();
    if (!currentText) {
      return [{ text: '', timestamp: '', author: '' }];
    }

    const saved = localStorage.getItem(historyKey);
    let entries: HistoryEntry[] = [];
    const resolvedAuthor = getResolvedExistingAuthor();

    // 1. Check server-synced note_authors history first if available
    try {
      const allAuthors = getCachedNoteAuthors();
      if (allAuthors && fieldKey && itemKey) {
        const serverHist = allAuthors[`${fieldKey}_${itemKey}`]?.history;
        if (Array.isArray(serverHist) && serverHist.length > 0) {
          entries = serverHist;
        }
      }
    } catch {}

    // 2. Merge / prefer local history if it has more snapshots
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= entries.length && parsed.length > 0) {
          entries = parsed.map((item: any) => {
            if (typeof item === 'string') {
              return { text: item, timestamp: updatedAt || new Date().toISOString(), author: resolvedAuthor || '' };
            }
            if (resolvedAuthor && item.author === loggedInName && resolvedAuthor !== loggedInName) {
              return { ...item, author: resolvedAuthor };
            }
            return item;
          });
        }
      } catch (e) {}
    }

    // Ensure baseline empty state at index 0 so existing notes always have an active Undo button
    if (entries.length === 0) {
      entries.push({ text: '', timestamp: '', author: '' });
    } else if (entries.length === 1 && entries[0].text === currentText) {
      entries.unshift({ text: '', timestamp: '', author: '' });
    }

    if (entries[entries.length - 1].text !== currentText) {
      entries.push({
        text: currentText,
        timestamp: updatedAt || new Date().toISOString(),
        author: resolvedAuthor || ''
      });
    } else if (resolvedAuthor && entries[entries.length - 1].author !== resolvedAuthor) {
      entries[entries.length - 1].author = resolvedAuthor;
    }

    return entries.slice(-30);
  });
  
  const [currentIndex, setCurrentIndex] = useState(() => {
    const cur = (value || '').trim();
    if (!cur) return 0;
    const idx = history.findIndex(e => e.text === cur);
    return idx !== -1 ? idx : Math.max(0, history.length - 1);
  });
  const [localValue, setLocalValue] = useState(value || '');
  const isUndoRedoRef = useRef(false);

  const [lastEditedAt, setLastEditedAt] = useState<string | undefined>(() => {
    return (history.length > 0 && currentIndex >= 0 && history[currentIndex]?.timestamp) 
      ? history[currentIndex].timestamp 
      : updatedAt || localStorage.getItem(timestampKey) || undefined;
  });
  const [lastEditedBy, setLastEditedBy] = useState<string | undefined>(() => {
    const resolved = getResolvedExistingAuthor();
    if (resolved) return resolved;
    if (history.length > 0 && currentIndex >= 0 && history[currentIndex]?.author) {
      const entryAuthor = history[currentIndex].author;
      if (entryAuthor && entryAuthor !== loggedInName) return entryAuthor;
    }
    return undefined;
  });

  // Sync external value if it changes independently
  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    const valStr = value || '';
    if (valStr !== localValue) {
      setLocalValue(valStr);
    }

    const resolved = getResolvedExistingAuthor();
    if (resolved) {
      setLastEditedBy(resolved);
    }
    if (updatedAt) {
      setLastEditedAt(updatedAt);
    }

    const trimmed = valStr.trim();
    if (trimmed) {
      const currentAuthor = resolved || '';
      setHistory(prev => {
        let base = prev.length === 0 ? [{ text: '', timestamp: '', author: '' }] : [...prev];
        if (base.length === 1 && base[0].text === trimmed) {
          base.unshift({ text: '', timestamp: '', author: '' });
        }
        const existingIdx = base.findIndex((e, idx) => idx > 0 && e.text === trimmed);
        if (existingIdx !== -1) {
          setCurrentIndex(existingIdx);
          if (resolved && base[existingIdx].author !== resolved) {
            base[existingIdx] = { ...base[existingIdx], author: resolved };
          }
          return base;
        }
        const newH = [...base, { text: trimmed, timestamp: updatedAt || new Date().toISOString(), author: currentAuthor }].slice(-30);
        try { localStorage.setItem(historyKey, JSON.stringify(newH)); } catch {}
        setCurrentIndex(newH.length - 1);
        return newH;
      });
    } else {
      setCurrentIndex(0);
    }
  }, [value, updatedBy, updatedAt, fallbackAuthor]);

  // Auto-grow textarea height with buffer so text is never clipped
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(38, textareaRef.current.scrollHeight + 4)}px`;
    }
  }, [localValue]);

  const typingTimerRef = useRef<any>(null);

  const commitValue = (newVal: string) => {
    if (disabled || isUndoRedoRef.current) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    const trimmed = (newVal || '').trim();
    if (trimmed === (value || '').trim() && history.length > 0 && history[currentIndex]?.text === trimmed) return;

    const nowIso = new Date().toISOString();
    const currentUser = getLoggedInUserName();
    const newEntry: HistoryEntry = { text: trimmed, timestamp: nowIso, author: currentUser };

    setLastEditedAt(nowIso);
    setLastEditedBy(currentUser);
    try {
      localStorage.setItem(timestampKey, nowIso);
      localStorage.setItem(authorKey, currentUser);
    } catch {}

    const baseHistory = history.length === 0 ? [{ text: '', timestamp: '', author: '' }] : history.slice(0, currentIndex + 1);
    const newHistory = [...baseHistory, newEntry].slice(-30);
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
    try {
      localStorage.setItem(historyKey, JSON.stringify(newHistory));
    } catch {}

    onChange(trimmed, nowIso, currentUser);
  };

  const handleChange = (e: any) => {
    const val = e.target.value;
    setLocalValue(val);
    if (e.target) {
      e.target.style.height = 'auto';
      e.target.style.height = `${Math.max(38, e.target.scrollHeight + 4)}px`;
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    // Debounce 3500ms to avoid firing notifications and network requests while user is actively typing
    typingTimerRef.current = setTimeout(() => {
      commitValue(val);
    }, 3500);
  };

  const handleBlur = () => {
    if (isUndoRedoRef.current) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    commitValue(localValue);
  };

  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      commitValue(localValue);
      e.currentTarget.blur();
    }
  };

  // ── Undo: Go back to previous historical snapshot (preserving its original time & author) ──
  const undo = () => {
    if (disabled) return;
    if (currentIndex > 0) {
      const prevEntry = history[currentIndex - 1];
      if (!prevEntry) return;
      isUndoRedoRef.current = true;
      setCurrentIndex(currentIndex - 1);
      setLocalValue(prevEntry.text);
      // Keep original snapshot time & author — do NOT overwrite with now or current user!
      setLastEditedAt(prevEntry.timestamp);
      setLastEditedBy(prevEntry.author);
      try {
        localStorage.setItem(timestampKey, prevEntry.timestamp);
        if (prevEntry.author) localStorage.setItem(authorKey, prevEntry.author);
      } catch {}
      onChange(prevEntry.text, prevEntry.timestamp, prevEntry.author);
      setTimeout(() => { isUndoRedoRef.current = false; }, 300);
    }
  };

  // ── Redo: Advance to next historical snapshot (preserving its original time & author) ──
  const redo = () => {
    if (disabled) return;
    if (currentIndex < history.length - 1) {
      const nextEntry = history[currentIndex + 1];
      if (!nextEntry) return;
      isUndoRedoRef.current = true;
      setCurrentIndex(currentIndex + 1);
      setLocalValue(nextEntry.text);
      // Keep original snapshot time & author — do NOT overwrite with now or current user!
      setLastEditedAt(nextEntry.timestamp);
      setLastEditedBy(nextEntry.author);
      try {
        localStorage.setItem(timestampKey, nextEntry.timestamp);
        if (nextEntry.author) localStorage.setItem(authorKey, nextEntry.author);
      } catch {}
      onChange(nextEntry.text, nextEntry.timestamp, nextEntry.author);
      setTimeout(() => { isUndoRedoRef.current = false; }, 300);
    }
  };

  const hasValue = !!localValue;
  const timeLabel = formatArabicTimestamp(lastEditedAt);

  return (
    <div className="relative flex items-center justify-center group/history mx-auto w-full min-w-[190px] max-w-[280px]">
      {/* Floating Hover Tooltip */}
      {hasValue && (timeLabel || lastEditedBy) && (
        <div className="absolute bottom-full mb-2 hidden group-hover/history:flex flex-col items-center z-[300] pointer-events-none animate-fadeIn left-1/2 -translate-x-1/2">
          <div className="bg-[#0c121e]/95 border border-emerald-500/40 rounded-xl px-3 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.7)] backdrop-blur-md text-[11px] text-white whitespace-nowrap text-right flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            {timeLabel && <span className="font-mono text-emerald-300 font-bold">{timeLabel}</span>}
            {lastEditedBy && (
              <span className="text-muted/90 text-[10px] arabic-text font-bold">👤 {lastEditedBy}</span>
            )}
          </div>
          <div className="w-2 h-2 bg-[#0c121e] border-r border-b border-emerald-500/40 rotate-45 -mt-1"></div>
        </div>
      )}

      <button 
        onMouseDown={(e) => e.preventDefault()}
        onClick={undo} 
        disabled={disabled || currentIndex <= 0 || !hasValue}
        type="button"
        className={`absolute -left-6 p-1.5 rounded-full border transition-all z-10 ${
          !disabled && currentIndex > 0 && hasValue
            ? 'bg-blue-500/15 border-blue-400/70 text-blue-300 hover:bg-blue-500/30 hover:scale-110 shadow-[0_0_10px_rgba(59,130,246,0.3)] opacity-100 cursor-pointer' 
            : 'bg-white/[0.04] border-white/15 text-white/40 opacity-30 cursor-not-allowed pointer-events-none'
        }`}
        title={disabled ? "غير مسموح بتعديل أو مسح ملاحظات هذا القسم 🔒" : (currentIndex > 0 && hasValue ? `تراجع إلى النسخة السابقة (${formatArabicTimestamp(history[currentIndex - 1]?.timestamp) || 'فراغ'})` : "لا يوجد تراجع")}
      >
        <Undo2 size={12} />
      </button>
      
      <textarea
        ref={textareaRef}
        rows={1}
        dir="auto"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={disabled}
        className={`w-full min-w-[190px] resize-none overflow-y-auto max-h-48 scrollbar-thin rounded-xl px-3.5 py-2 text-xs font-bold text-white text-center outline-none transition-all shadow-inner leading-relaxed arabic-text placeholder:text-[11px] placeholder:text-muted/60 ${
          disabled
            ? 'cursor-not-allowed opacity-75 bg-white/[0.03] border border-white/5 select-none'
            : hasValue 
              ? 'bg-emerald-500/5 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)] text-emerald-200 focus:bg-[#0b1019] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40' 
              : 'bg-white/5 border border-white/10 hover:border-white/20 focus:bg-[#0b1019] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40'
        }`}
        style={{ minHeight: '38px', lineHeight: '1.5' }}
        title={disabled ? "خاص بفريق آخر (للقراءة فقط - لا يمكن التعديل أو المسح) 🔒" : undefined}
      />

      <button 
        onMouseDown={(e) => e.preventDefault()}
        onClick={redo} 
        disabled={disabled || currentIndex >= history.length - 1}
        type="button"
        className={`absolute -right-6 p-1.5 rounded-full border transition-all z-10 ${
          !disabled && currentIndex < history.length - 1 
            ? 'bg-emerald-500/15 border-emerald-400/70 text-emerald-300 hover:bg-emerald-500/30 hover:scale-110 shadow-[0_0_10px_rgba(16,185,129,0.3)] opacity-100 cursor-pointer' 
            : 'bg-white/[0.04] border-white/15 text-white/40 opacity-30 cursor-not-allowed pointer-events-none'
        }`}
        title={disabled ? "غير مسموح بتعديل أو مسح ملاحظات هذا القسم 🔒" : (currentIndex < history.length - 1 ? `تقدم إلى النسخة التالية (${formatArabicTimestamp(history[currentIndex + 1]?.timestamp)})` : "لا يوجد تقدم")}
      >
        <Redo2 size={12} />
      </button>
    </div>
  );
};

export const InlineCombobox = React.memo(({ value, onChange, options, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const isUp = spaceBelow < 280 && rect.top > 280;
    
    const menuWidth = Math.max(200, rect.width);
    let left = rect.left + rect.width / 2 - menuWidth / 2;
    if (left < 10) left = 10;
    if (left + menuWidth > window.innerWidth - 10) {
      left = window.innerWidth - menuWidth - 10;
    }

    setDropdownPos({
      top: isUp ? undefined : rect.bottom + 6,
      bottom: isUp ? window.innerHeight - rect.top + 6 : undefined,
      left,
      width: menuWidth,
    });
  }, []);

  const toggleOpen = () => {
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setInputValue('');
      return;
    }
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, updatePosition]);

  const filteredOptions = options ? options.filter((o: string) => String(o).toLowerCase().includes(String(inputValue).toLowerCase())) : [];

  const chipColors = getChipColor(value);

  return (
    <div className="relative w-full min-w-[100px]" ref={containerRef}>
      <button
        type="button"
        onClick={toggleOpen}
        style={chipColors.style}
        className={`w-full flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider focus:outline-none cursor-pointer transition-all rounded-full px-3.5 py-1.5 shadow-md border ${chipColors.bg || ''} ${chipColors.text || ''} ${chipColors.border || ''} hover:brightness-125 hover:scale-[1.02]`}
      >
        <div className="flex items-center gap-1.5 truncate max-w-[100px]">
          {chipColors.dot && (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm border border-white/20"
              style={{ backgroundColor: chipColors.dot }}
            />
          )}
          <span className="truncate">{value || placeholder || '---'}</span>
        </div>
        <ChevronDown size={10} className={`transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 opacity-100' : 'opacity-60'}`} />
      </button>
      
      {isOpen && dropdownPos && createPortal(
        <div 
          ref={dropdownRef}
          style={{ 
            position: 'fixed',
            top: dropdownPos.top !== undefined ? `${dropdownPos.top}px` : 'auto',
            bottom: dropdownPos.bottom !== undefined ? `${dropdownPos.bottom}px` : 'auto',
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
            backgroundColor: 'var(--dropdown-bg, #0c1222)',
            zIndex: 999999
          }}
          className="border border-white/25 rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.98)] py-2 flex flex-col justify-between max-h-96 overflow-hidden animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex-1 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => { onChange(''); setIsOpen(false); }}
              className={`w-full text-right px-4 py-1.5 text-[10px] font-bold block transition-all text-muted hover:bg-white/5 hover:text-white ${!value || value === 'غير محدد' ? 'text-primary bg-primary/5 font-black' : ''}`}
            >
              غير محدد (---)
            </button>
            {filteredOptions.map((o: string) => {
              const optColors = getChipColor(o);
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => { onChange(o); setIsOpen(false); }}
                  className={`w-full flex items-center justify-center px-3 py-1.5 transition-all hover:bg-white/5 ${value === o ? 'bg-primary/5 border-r-2 border-primary' : ''}`}
                >
                  <span 
                    style={optColors.style}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] border font-black text-center inline-flex max-w-[90%] truncate shadow-sm transition-all ${optColors.bg || ''} ${optColors.text || ''} ${optColors.border || ''} hover:brightness-110`}
                  >
                    {optColors.dot && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm border border-white/20"
                        style={{ backgroundColor: optColors.dot }}
                      />
                    )}
                    <span className="truncate">{o}</span>
                  </span>
                </button>
              );
            })}
          </div>
          
          <div 
            style={{ backgroundColor: 'var(--dropdown-bg, #0c1222)' }}
            className="px-2 pt-2 mt-2 border-t border-white/10 shrink-0 z-10 pb-1"
          >
             <input 
                type="text" 
                placeholder="+ ابحث أو ضف جديد..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (inputValue.trim()) {
                      onChange(inputValue.trim());
                      setIsOpen(false);
                    }
                  }
                }}
                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-[10px] font-bold text-white outline-none focus:border-primary transition-all arabic-text"
                autoFocus
             />
             {inputValue.trim() && !filteredOptions.includes(inputValue.trim()) && (
               <button
                 type="button"
                 onClick={() => { onChange(inputValue.trim()); setIsOpen(false); }}
                 className="w-full text-center py-2 text-[10px] font-black tracking-wider transition-all hover:bg-primary/20 text-primary bg-primary/10 mt-2 rounded-lg border border-primary/20 cursor-pointer"
               >
                 + إضافة: {inputValue.trim()}
               </button>
             )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

export const CustomSelect = ({ value, onChange, options, placeholder, isColumn = false }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const isUp = !isColumn && spaceBelow < 280 && rect.top > 280;
    
    const menuWidth = Math.max(180, Math.min(240, rect.width + 40));
    let left = rect.left + rect.width / 2 - menuWidth / 2;
    if (left < 10) left = 10;
    if (left + menuWidth > window.innerWidth - 10) {
      left = window.innerWidth - menuWidth - 10;
    }

    setDropdownPos({
      top: isUp ? undefined : rect.bottom + 6,
      bottom: isUp ? window.innerHeight - rect.top + 6 : undefined,
      left,
      width: menuWidth,
    });
  }, [isColumn]);

  const toggleOpen = () => {
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setSearchFilter('');
      return;
    }
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, updatePosition]);

  const filteredOptions = useMemo(() => {
    if (!searchFilter.trim()) return options;
    return options.filter((o: string) => String(o).toLowerCase().includes(searchFilter.trim().toLowerCase()));
  }, [options, searchFilter]);

  const displayVal = value === 'All' ? placeholder : value;
  const chipColors = getChipColor(value === 'All' ? '' : value);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-wider focus:outline-none cursor-pointer transition-all ${
          isColumn 
            ? `rounded-full px-3 py-1.5 min-w-[90px] justify-between shadow-md border ${chipColors.bg} ${chipColors.text} ${chipColors.border} hover:brightness-125 hover:scale-[1.02]` 
            : 'bg-transparent border-none text-muted hover:text-white px-1'
        }`}
      >
        <span className="truncate max-w-[90px]">{displayVal}</span>
        {isColumn && value && value !== 'All' ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange('All');
              setIsOpen(false);
            }}
            className="w-4 h-4 rounded-full bg-white/20 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0 ml-1"
            title="إلغاء الفلتر"
          >
            <X size={10} className="stroke-[3]" />
          </span>
        ) : (
          <ChevronDown size={10} className={`transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 opacity-100' : 'opacity-60'}`} />
        )}
      </button>

      {isOpen && dropdownPos && createPortal(
        <div
          ref={dropdownRef}
          style={{ 
            position: 'fixed',
            top: dropdownPos.top !== undefined ? `${dropdownPos.top}px` : 'auto',
            bottom: dropdownPos.bottom !== undefined ? `${dropdownPos.bottom}px` : 'auto',
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
            backgroundColor: 'var(--dropdown-bg, #0c1222)',
            zIndex: 999999
          }}
          className="border border-white/25 rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.98)] py-2 flex flex-col max-h-64 overflow-hidden animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input Box */}
          <div 
            style={{ backgroundColor: 'var(--dropdown-bg, #0c1222)' }}
            className="px-2 pb-2 border-b border-white/10 shrink-0"
          >
            <input
              type="text"
              placeholder="بحث..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              className="w-full bg-white/5 border border-white/15 rounded-lg px-2.5 py-1 text-[10px] font-bold text-white outline-none focus:border-primary transition-all arabic-text"
              autoFocus
            />
          </div>

          <div className="overflow-y-auto scrollbar-thin max-h-48 pt-1">
            <button
              type="button"
              onClick={() => { onChange('All'); setIsOpen(false); }}
              className={`w-full text-right px-4 py-1.5 text-[10px] font-bold block transition-all text-muted hover:bg-white/5 hover:text-white ${value === 'All' ? 'text-primary bg-primary/5 font-black border-r-2 border-primary' : ''}`}
            >
              الكل (All)
            </button>
            {filteredOptions.map((o: string) => {
              const optColors = getChipColor(o);
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => { onChange(o); setIsOpen(false); }}
                  className={`w-full flex items-center justify-center px-3 py-1.5 transition-all hover:bg-white/5 ${value === o ? 'bg-primary/5 border-r-2 border-primary' : ''}`}
                >
                  <span className={`px-3 py-1 rounded-full text-[10px] border font-black text-center inline-block max-w-[90%] truncate shadow-sm transition-all ${optColors.bg} ${optColors.text} ${optColors.border} hover:brightness-110`}>
                    {o}
                  </span>
                </button>
              );
            })}
            {filteredOptions.length === 0 && (
              <div className="px-3 py-2 text-center text-[10px] text-white/40 font-bold">لا يوجد نتائج</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export const Chip = ({ value }: { value: string }) => {
  const colors = getChipColor(value);
  return (
    <span className={`chip-base inline-flex items-center gap-1.5 ${colors.bg} ${colors.text} ${colors.border}`}>
      {colors.dot && <span className="w-2 h-2 rounded-full shrink-0 shadow-sm border border-white/20" style={{ backgroundColor: colors.dot }} />}
      <span>{value || '---'}</span>
    </span>
  );
};

export interface FilterContextType {
  combinedData: any[];
  liveData: any[];
  colFilters: Record<string, string>;
  teacherFilter?: string;
  onFilterChange: (colKey: string, val: string) => void;
}

export const FilterContext = React.createContext<FilterContextType>({
  combinedData: [],
  liveData: [],
  colFilters: {},
  onFilterChange: () => {}
});

// Standalone memoized column filter component (never unmounts on parent re-renders)
export const ColFilter = React.memo(({ colKey, label }: { colKey: string; label: string }) => {
  const { combinedData, liveData, colFilters, teacherFilter, onFilterChange } = useContext(FilterContext);

  const options = useMemo(() => {
    if (colKey === 'filmed') {
      return ['اتصور', 'لم يتصور'];
    }
    if (colKey === 'done') {
      return ['Done', 'Not Done'];
    }
    const source = Array.isArray(combinedData) && combinedData.length > 0 ? combinedData : liveData;
    let rawValues = source
      .map(i => String(i[colKey] || '').trim())
      .filter(v => v !== '' && v !== 'false' && v !== 'true' && v !== 'undefined' && v !== 'null' && v !== '---');

    // For Tagme3at branches or Arabic branch context, ensure standard branches are included and filter out non-branch text
    if (colKey === 'branch') {
      rawValues = rawValues.filter(v => !v.includes('يوتيوب') && !v.includes('تجميعة'));
      const hasArabic = rawValues.some(v => /[\u0600-\u06FF]/.test(v)) || source.some(i => i.opSheet && (i.notesMarketing !== undefined || i.notesEditors !== undefined));
      if (hasArabic) {
        ['القاهرة', 'اسكندرية', 'دسوق'].forEach(b => rawValues.push(b));
      }
    }

    // Deduplicate case-insensitively and preserve clean values (e.g. keeping ALEXANDRIA)
    const uniqueMap = new Map<string, string>();
    rawValues.forEach(val => {
      const lower = val.toLowerCase();
      if (!uniqueMap.has(lower)) {
        uniqueMap.set(lower, val);
      } else {
        if (val === val.toUpperCase()) uniqueMap.set(lower, val);
      }
    });

    if (colKey === 'filmingDate' || colKey === 'date') {
      return Array.from(uniqueMap.values()).sort((a, b) => {
        const timeA = new Date(a).getTime() || 0;
        const timeB = new Date(b).getTime() || 0;
        return timeB - timeA;
      });
    }

    return Array.from(uniqueMap.values()).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  }, [combinedData, liveData, colKey]);

  const currentValue = colKey === 'teacher' && teacherFilter && teacherFilter !== 'All'
    ? teacherFilter
    : (colFilters[colKey] || 'All');

  return (
    <div className="flex flex-col items-center justify-center my-1 relative min-h-[30px]">
      <CustomSelect
        value={currentValue}
        onChange={(val: string) => onFilterChange(colKey, val)}
        options={options}
        placeholder={label}
        isColumn={true}
      />
    </div>
  );
});


export const DatePickerCell = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'اختر تاريخ 📅'
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTriggerPicker = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    if (inputRef.current) {
      try {
        if (typeof inputRef.current.showPicker === 'function') {
          inputRef.current.showPicker();
        } else {
          inputRef.current.focus();
        }
      } catch {
        inputRef.current.focus();
      }
    }
  };

  return (
    <div
      onClick={handleTriggerPicker}
      className={`relative inline-flex items-center justify-center cursor-pointer group/datepicker select-none ${
        disabled ? 'cursor-not-allowed opacity-60' : ''
      }`}
      title="اضغط لاختيار التاريخ من التقويم 📅"
    >
      <input
        ref={inputRef}
        type="date"
        style={{ colorScheme: 'dark' }}
        value={toInputDate(value)}
        disabled={disabled}
        onChange={(e) => {
          const picked = fromInputDate(e.target.value);
          if (picked && picked !== value) {
            onChange(picked);
          }
        }}
        onClick={(e) => {
          try {
            if (typeof e.currentTarget.showPicker === 'function') {
              e.currentTarget.showPicker();
            }
          } catch {}
        }}
        className="date-picker-fill absolute inset-0 opacity-0 w-full h-full cursor-pointer z-20"
      />
      <div className="px-3 py-1.5 rounded-full bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 text-xs font-mono font-black flex items-center gap-1.5 shadow-md shadow-emerald-500/10 transition-all group-hover/datepicker:scale-105 min-w-[105px] justify-center pointer-events-none">
        <Calendar size={13} className="text-emerald-400 shrink-0" />
        <span>{value || placeholder}</span>
      </div>
    </div>
  );
};

export const VideoDuration = ({ url, fallback }: { url: string; fallback: string }) => {
  const [duration, setDuration] = useState(fallback);

  useEffect(() => {
    if (!url) return;
    let isMounted = true;
    fetch(`http://localhost:3001/api/duration?url=${encodeURIComponent(url)}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.duration) {
          setDuration(data.duration);
        }
      })
      .catch(err => console.error('Error fetching duration:', err));

    return () => {
      isMounted = false;
    };
  }, [url, fallback]);

  return <span className="whitespace-nowrap">⏱️ {duration}</span>;
};

export const AutofillCell = React.memo(({ 
  colKey, 
  rowIndex, 
  value, 
  autofillDrag, 
  setAutofillDrag, 
  onApply, 
  activeCell, 
  setActiveCell, 
  liveDataLength = 200, 
  className = "px-3 py-5 text-center", 
  children 
}: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowQuickMenu(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, [showQuickMenu]);

  const isSelected = useMemo(() => {
    if (!autofillDrag || autofillDrag.colKey !== colKey) return false;
    const start = Math.min(autofillDrag.startIdx, autofillDrag.currentIdx);
    const end = Math.max(autofillDrag.startIdx, autofillDrag.currentIdx);
    return rowIndex >= start && rowIndex <= end;
  }, [autofillDrag, colKey, rowIndex]);

  const isActive = useMemo(() => {
    return activeCell && activeCell.colKey === colKey && activeCell.rowIndex === rowIndex;
  }, [activeCell, colKey, rowIndex]);

  const borderClasses = useMemo(() => {
    if (!isSelected || !autofillDrag) return null;
    const start = Math.min(autofillDrag.startIdx, autofillDrag.currentIdx);
    const end = Math.max(autofillDrag.startIdx, autofillDrag.currentIdx);
    
    const isTop = rowIndex === start;
    const isBottom = rowIndex === end;
    
    let borderStyle = 'absolute border-2 border-dashed border-primary pointer-events-none z-20';
    
    if (start === end) {
      return { style: `${borderStyle} -inset-[3px] rounded-lg` };
    } else if (isTop) {
      return { style: `${borderStyle} -left-[3px] -right-[3px] -top-[3px] border-b-0 rounded-t-lg` };
    } else if (isBottom) {
      return { style: `${borderStyle} -left-[3px] -right-[3px] -bottom-[3px] border-t-0 rounded-b-lg` };
    } else {
      return { style: `${borderStyle} -left-[3px] -right-[3px] -top-[1px] -bottom-[1px] border-t-0 border-b-0` };
    }
  }, [isSelected, autofillDrag, rowIndex]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAutofillDrag({
      colKey,
      startIdx: rowIndex,
      currentIdx: rowIndex,
      value
    });
  };

  const handleMouseEnter = () => {
    if (autofillDrag && autofillDrag.colKey === colKey) {
      setAutofillDrag({
        ...autofillDrag,
        currentIdx: rowIndex
      });
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const lastIdx = Math.max(rowIndex, liveDataLength - 1);
    if (lastIdx > rowIndex) {
      onApply(colKey, rowIndex, lastIdx, value);
    }
  };

  const handleQuickFill = (rowsCount: number) => {
    const endIdx = Math.min(rowIndex + rowsCount, liveDataLength - 1);
    if (endIdx > rowIndex) {
      onApply(colKey, rowIndex, endIdx, value);
    } else {
      onApply(colKey, rowIndex, rowIndex + rowsCount, value);
    }
    setShowQuickMenu(false);
  };

  const handleCellClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.closest('button')) {
      setActiveCell({ colKey, rowIndex });
      return;
    }
    setActiveCell({ colKey, rowIndex });
  };

  const showHandle = (isActive || (isHovered && value !== undefined && value !== '')) && !autofillDrag;

  return (
    <td 
      onClick={handleCellClick}
      className={`relative autofill-cell-td transition-all ${className} ${isActive ? 'z-40' : isSelected ? 'bg-primary/5 ring-1 ring-primary/30 z-10' : ''}`}
      onMouseEnter={() => { setIsHovered(true); handleMouseEnter(); }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative w-full h-full">
        {children}
        
        {isSelected && borderClasses && (
          <div className={borderClasses.style} />
        )}

        {isSelected && autofillDrag && rowIndex === Math.max(autofillDrag.startIdx, autofillDrag.currentIdx) && (
          <div className="absolute top-full right-1/2 translate-x-1/2 mt-1.5 bg-primary/95 text-white text-[10px] font-black px-2.5 py-1 rounded-xl shadow-[0_4px_12px_rgba(59,130,246,0.3)] border border-white/10 z-50 animate-pulse whitespace-nowrap arabic-text">
            تعبئة: {autofillDrag.value || '---'}
          </div>
        )}

        {isActive && !autofillDrag && (
          <div className="absolute -inset-[3px] border-2 border-primary pointer-events-none rounded-lg z-20 shadow-[0_0_8px_rgba(59,130,246,0.2)]" />
        )}
        
        {showHandle && (
          <>
            {!isActive && (
              <div className="absolute -inset-[3px] border border-primary/50 pointer-events-none rounded-lg z-20" />
            )}
            <div 
              onMouseDown={handleMouseDown}
              onDoubleClick={handleDoubleClick}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowQuickMenu(true);
              }}
              className="absolute -bottom-[6px] -right-[6px] w-[10px] h-[10px] bg-primary border-2 border-white rounded-full cursor-crosshair z-30 shadow-md hover:scale-125 transition-transform animate-fadeIn"
              title="اضغط واسحب للأسفل للتعبئة، أو اضغط مرتين للتعبئة التلقائية، أو اضغط ضغطة واحدة لخيارات التعبئة"
            />
          </>
        )}

        {showQuickMenu && (
          <div 
            ref={menuRef}
            className="absolute right-0 bottom-full mb-2 w-52 bg-[#0a0e16]/95 border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] py-2.5 z-[300] backdrop-blur-xl animate-fadeIn flex flex-col text-right arabic-text"
          >
            <div className="px-4 py-1.5 text-[10px] font-black text-muted uppercase tracking-wider border-b border-white/5 pb-2 mb-1">
              خيارات التعبئة السريعة
            </div>
            <button
              onClick={() => handleQuickFill(1)}
              className="w-full px-4 py-2 text-xs font-bold text-white/90 hover:bg-white/5 transition-all text-right"
            >
              نسخ للخلية التالية (1 صف)
            </button>
            <button
              onClick={() => handleQuickFill(5)}
              className="w-full px-4 py-2 text-xs font-bold text-white/90 hover:bg-white/5 transition-all text-right"
            >
              تعبئة 5 صفوف تالية
            </button>
            <button
              onClick={() => handleQuickFill(10)}
              className="w-full px-4 py-2 text-xs font-bold text-white/90 hover:bg-white/5 transition-all text-right"
            >
              تعبئة 10 صفوف تالية
            </button>
            {liveDataLength - 1 - rowIndex > 0 && (
              <button
                onClick={() => handleQuickFill(liveDataLength - 1 - rowIndex)}
                className="w-full px-4 py-2 text-xs font-bold text-primary hover:bg-primary/10 transition-all text-right border-t border-white/5 mt-1 pt-2"
              >
                تعبئة لنهاية الجدول ({liveDataLength - 1 - rowIndex} صف)
              </button>
            )}
          </div>
        )}
      </div>
    </td>
  );
});
