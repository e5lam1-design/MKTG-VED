import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Layers, 
  GraduationCap, 
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Clock,
  BarChart3,
  Briefcase,
  User,
  Bell,
  MonitorPlay,
  PieChart,
  TrendingUp,
  Award,
  Users,
  Undo2,
  Redo2,
  Copy,
  Check,
  Pencil,
  Sparkles,
  Link,
  LogOut,
  Shield,
  Settings,
  MapPin,
  FolderOpen,
  Video,
  FileImage,
  Pin,
  Trash2,
  Bookmark
} from 'lucide-react';
import { useGoogleSheets } from './hooks/useGoogleSheets';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { UserManagement } from './components/UserManagement';
import { ReelsAnalytics } from './components/ReelsAnalytics';
import DesignersDashboard from './components/DesignersDashboard';
import { DesignAnalytics } from './components/DesignAnalytics';
import { supabase, PERMISSIONS, ROLE_LABELS, ROLE_COLORS, DEFAULT_ROLE_PERMISSIONS, setRuntimeRolePermissions } from './lib/supabase';


const yearLabels: Record<string, string> = {
  'J4': 'Junior 4 (الرابع الابتدائي)',
  'J5': 'Junior 5 (الخامس الابتدائي)',
  'J6': 'Junior 6 (السادس الابتدائي)',
  'M1': 'Middle 1 (الأول الإعدادي)',
  'M2': 'Middle 2 (الثاني الإعدادي)',
  'M3': 'Middle 3 (الثالث الإعدادي)',
  'S1': 'Senior 1 (الأول الثانوي)',
  'S2': 'Senior 2 (الثاني الثانوي)',
  'S3': 'Senior 3 (الثالث الثانوي)',
};

const generateKey = (item: any) => {
  let hash = 0;
  const str = String(item?.name || '') + String(item?.id || '') + String(item?.val || '');
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; 
  }
  return 'row-' + Math.abs(hash);
};

function parseDriveLink(val: string) {
  if (!val) return { url: '', text: '' };
  let s = String(val).trim();
  
  // Check if it is a hyperlink formula
  const hyperlinkRegex = /=HYPERLINK\s*\(\s*(['"])(.*?)\1\s*,\s*(['"])(.*?)\3\s*\)/i;
  const formulaMatch = s.match(hyperlinkRegex);
  if (formulaMatch) {
    let url = formulaMatch[2].trim();
    let text = formulaMatch[4].trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    return { url, text };
  }
  
  let url = s;
  const driveIdRegex = /^[a-zA-Z0-9_-]{25,55}$/;
  
  if (url.includes('drive.google.com') || url.includes('docs.google.com') || url.includes('spreadsheets/d/') || url.includes('document/d/') || url.includes('file/d/')) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.startsWith('drive.google.com') || url.startsWith('docs.google.com')) {
        url = 'https://' + url;
      } else if (url.startsWith('www.drive.google.com') || url.startsWith('www.docs.google.com')) {
        url = 'https://' + url;
      } else {
        if (url.startsWith('/')) url = url.substring(1);
        if (url.startsWith('file/d/')) {
          url = 'https://drive.google.com/' + url;
        } else if (url.startsWith('d/')) {
          url = 'https://drive.google.com/file/' + url;
        } else {
          url = 'https://' + url;
        }
      }
    }
  } else if (driveIdRegex.test(url)) {
    url = `https://drive.google.com/file/d/${url}/view?usp=sharing`;
  } else if (!url.startsWith('http://') && !url.startsWith('https://') && url.includes('.')) {
    url = 'https://' + url;
  }

  return {
    url,
    text: 'Link'
  };
}

const PreviewImage = ({ url }: { url: string }) => {
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

const HistoryInput = ({ itemKey, fieldKey, value, onChange, placeholder }: any) => {
  const historyKey = `hist_${fieldKey}_${itemKey}`;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [history, setHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem(historyKey);
    return saved ? JSON.parse(saved) : (value ? [value] : []);
  });
  
  const [currentIndex, setCurrentIndex] = useState(history.length > 0 ? history.length - 1 : -1);
  const [localValue, setLocalValue] = useState(value);

  // Sync external value if it changes independently
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Auto-grow textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [localValue]);

  const commitValue = (newVal: string) => {
    if (newVal !== history[currentIndex] && newVal !== history[history.length - 1]) {
      const newHistory = [...history.slice(0, currentIndex + 1), newVal].slice(-20);
      setHistory(newHistory);
      setCurrentIndex(newHistory.length - 1);
      localStorage.setItem(historyKey, JSON.stringify(newHistory));
      onChange(newVal);
    } else if (newVal !== value) {
      onChange(newVal);
    }
  };

  const handleBlur = () => {
    commitValue(localValue);
  };

  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.target.blur();
    }
  };

  const undo = () => {
    if (currentIndex > 0) {
      const prevVal = history[currentIndex - 1];
      setCurrentIndex(currentIndex - 1);
      setLocalValue(prevVal);
      onChange(prevVal);
    }
  };

  const redo = () => {
    if (currentIndex < history.length - 1) {
      const nextVal = history[currentIndex + 1];
      setCurrentIndex(currentIndex + 1);
      setLocalValue(nextVal);
      onChange(nextVal);
    }
  };

  const hasValue = !!localValue;
  return (
    <div className="relative flex items-center justify-center group mx-auto w-full min-w-[130px] max-w-[160px]">
      {history.length > 1 && (
        <button 
          onClick={undo} 
          disabled={currentIndex <= 0}
          className={`absolute -left-6 p-1.5 rounded-full bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 transition-all z-10 ${currentIndex <= 0 ? 'text-white/20' : 'text-blue-400 hover:bg-blue-500/20 hover:scale-110 shadow-lg'}`}
          title="تراجع (السابق)"
        >
          <Undo2 size={12} />
        </button>
      )}
      
      <textarea
        ref={textareaRef}
        rows={1}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full min-w-[130px] resize-none overflow-hidden rounded-xl px-3 py-2 text-xs font-bold text-white text-center outline-none transition-all shadow-inner text-[11px] placeholder:text-[10px] placeholder:text-muted/60 ${
          hasValue 
            ? 'bg-emerald-500/5 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)] text-emerald-300' 
            : 'bg-white/5 border border-white/10 hover:border-white/20'
        } focus:bg-[#0b1019] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30`}
        style={{ minHeight: '34px', lineHeight: '1.3' }}
      />

      {history.length > 1 && (
        <button 
          onClick={redo} 
          disabled={currentIndex >= history.length - 1}
          className={`absolute -right-6 p-1.5 rounded-full bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 transition-all z-10 ${currentIndex >= history.length - 1 ? 'text-white/20' : 'text-emerald-400 hover:bg-emerald-500/20 hover:scale-110 shadow-lg'}`}
          title="تقدم (التالي)"
        >
          <Redo2 size={12} />
        </button>
      )}
    </div>
  );
};

const InlineCombobox = ({ value, onChange, options, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setInputValue('');
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredOptions = options ? options.filter((o: string) => String(o).toLowerCase().includes(String(inputValue).toLowerCase())) : [];

  const chipColors = getChipColor(value);

  return (
    <div className="relative w-full min-w-[100px]" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider focus:outline-none cursor-pointer transition-all rounded-full px-3.5 py-1.5 shadow-md border ${chipColors.bg} ${chipColors.text} ${chipColors.border} hover:brightness-125 hover:scale-[1.02]`}
      >
        <span className="truncate max-w-[90px]">{value || placeholder || '---'}</span>
        <ChevronDown size={10} className={`transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 opacity-100' : 'opacity-60'}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-2 w-full min-w-[170px] bg-[#0a0e16]/95 border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] py-2 z-[250] scrollbar-hide backdrop-blur-xl max-h-60 overflow-y-auto left-1/2 -translate-x-1/2 animate-fadeIn flex flex-col justify-between">
          <div className="flex-1 overflow-y-auto">
            {filteredOptions.map((o: string) => {
              const optColors = getChipColor(o);
              return (
                <button
                  key={o}
                  onClick={() => { onChange(o); setIsOpen(false); }}
                  className={`w-full flex items-center justify-center px-3 py-1.5 transition-all hover:bg-white/5 ${value === o ? 'bg-primary/5 border-r-2 border-primary' : ''}`}
                >
                  <span className={`px-3 py-1 rounded-full text-[10px] border font-black text-center inline-block max-w-[90%] truncate shadow-sm transition-all ${optColors.bg} ${optColors.text} ${optColors.border} hover:brightness-110`}>
                    {o}
                  </span>
                </button>
              );
            })}
          </div>
          
          <div className="px-2 pt-2 mt-2 border-t border-white/10 sticky bottom-0 bg-[#0a0e16]/95 z-10 pb-1">
             <input 
                type="text" 
                placeholder="+ ابحث أو ضف جديد..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && inputValue.trim()) {
                    onChange(inputValue.trim());
                    setIsOpen(false);
                  }
                }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold text-white outline-none focus:border-primary transition-all arabic-text"
             />
             {inputValue.trim() && !filteredOptions.includes(inputValue.trim()) && (
               <button
                 onClick={() => { onChange(inputValue.trim()); setIsOpen(false); }}
                 className="w-full text-center py-2 text-[10px] font-black tracking-wider transition-all hover:bg-primary/20 text-primary bg-primary/10 mt-2 rounded-lg border border-primary/20 cursor-pointer"
               >
                 + إضافة: {inputValue.trim()}
               </button>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

const CustomSelect = ({ value, onChange, options, placeholder, isColumn = false }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayVal = value === 'All' ? placeholder : value;
  const chipColors = getChipColor(value === 'All' ? '' : value);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-wider focus:outline-none cursor-pointer transition-all ${
          isColumn 
            ? `rounded-full px-3.5 py-1.5 min-w-[100px] justify-between shadow-md border ${chipColors.bg} ${chipColors.text} ${chipColors.border} hover:brightness-125 hover:scale-[1.02]` 
            : 'bg-transparent border-none text-muted hover:text-white px-1'
        }`}
      >
        <span className="truncate max-w-[100px]">{displayVal}</span>
        <ChevronDown size={10} className={`transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 opacity-100' : 'opacity-60'}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full mt-2 bg-[#0a0e16]/95 border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] py-2 z-[250] scrollbar-hide backdrop-blur-xl w-max min-w-[140px] max-w-[200px] max-h-48 overflow-y-auto left-1/2 -translate-x-1/2`}
          >
            <button
              onClick={() => { onChange('All'); setIsOpen(false); }}
              className={`w-full text-right px-4 py-2.5 text-[10px] font-bold block transition-all text-muted hover:bg-white/5 hover:text-white ${value === 'All' ? 'text-primary bg-primary/5 font-black border-r-2 border-primary' : ''}`}
            >
              الكل
            </button>
            {options.map((o: string) => {
              const optColors = getChipColor(o);
              return (
                <button
                  key={o}
                  onClick={() => { onChange(o); setIsOpen(false); }}
                  className={`w-full flex items-center justify-center px-3 py-1.5 transition-all hover:bg-white/5 ${value === o ? 'bg-primary/5 border-r-2 border-primary' : ''}`}
                >
                  <span className={`px-3 py-1 rounded-full text-[10px] border font-black text-center inline-block max-w-[90%] truncate shadow-sm transition-all ${optColors.bg} ${optColors.text} ${optColors.border} hover:brightness-110`}>
                    {o}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Sidebar Item ─────────────────────────────────────────────────────────────
const SidebarItem = ({ icon: Icon, label, active, onClick, colorHex, colorful, isPinned, onTogglePin }: any) => {
  const cHex = colorHex || '#3b82f6';

  const bgStyle = colorful
    ? (active 
        ? { backgroundColor: `${cHex}35`, color: '#ffffff', borderColor: `${cHex}80`, boxShadow: `0 0 25px ${cHex}40` } 
        : { backgroundColor: `${cHex}18`, color: '#ffffff', borderColor: `${cHex}30` })
    : (active
        ? { backgroundColor: `rgba(255,255,255,0.08)`, color: '#ffffff', borderColor: `rgba(255,255,255,0.15)` }
        : { backgroundColor: `transparent`, color: '#94a3b8', borderColor: `transparent` });

  const iconBgStyle = colorful
    ? (active 
        ? { backgroundColor: cHex, color: '#ffffff', boxShadow: `0 0 20px ${cHex}` } 
        : { backgroundColor: `${cHex}30`, color: cHex })
    : (active
        ? { backgroundColor: `#3b82f6`, color: '#ffffff', boxShadow: `0 0 20px rgba(59,130,246,0.5)` }
        : { backgroundColor: `rgba(255,255,255,0.05)`, color: '#94a3b8' });

  return (
    <button
      onClick={onClick}
      style={bgStyle}
      className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl border transition-all duration-300 group cursor-pointer ${
        active 
          ? 'font-black scale-[1.03]' 
          : 'hover:scale-[1.01] hover:brightness-125 opacity-85 hover:opacity-100'
      }`}
    >
      <div style={iconBgStyle} className="p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110 flex items-center justify-center shrink-0">
        <Icon size={20} />
      </div>
      <span className="font-bold text-sm tracking-tight truncate text-left text-white flex-1">{label}</span>
      {onTogglePin && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            isPinned 
              ? 'text-amber-400 bg-amber-400/10 opacity-100' 
              : 'text-white/20 hover:text-amber-400 hover:bg-white/10 opacity-0 group-hover:opacity-100'
          }`}
          title={isPinned ? 'إلغاء التثبيت من المفضلة' : 'تثبيت في المفضلة'}
        >
          <Pin size={14} className={isPinned ? 'fill-amber-400' : ''} />
        </span>
      )}
      {active && <motion.div layoutId="active-pill" className="text-white"><ChevronRight size={16} /></motion.div>}
    </button>
  );
};

// ─── Collapsible Sidebar Group ────────────────────────────────────────────────
const SidebarGroup = ({ title, iconEmoji, colorHex, stagesList, activeGid, onSelectStage, pinnedTabs, togglePinTab, colorful, profile }: any) => {
  const visibleStages = stagesList.filter((stage: any) =>
    !profile?.role || PERMISSIONS.canViewTab(profile.role, stage.label, profile.allowed_tabs || [])
  );

  const isAnyActive = visibleStages.some((s: any) => s.gid === activeGid);
  const [isOpen, setIsOpen] = useState(isAnyActive);

  useEffect(() => {
    if (isAnyActive) setIsOpen(true);
  }, [isAnyActive]);

  if (visibleStages.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 my-1">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <span className="text-base">{iconEmoji}</span>
          <span className="font-bold text-xs text-white/90 group-hover:text-white transition-colors arabic-text">{title}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-muted border border-white/10">
            {visibleStages.length}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-muted group-hover:text-white transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-1 pr-2 pt-1 border-r-2 border-white/10 mr-4 overflow-hidden"
          >
            {visibleStages.map((stage: any) => (
              <SidebarItem
                key={stage.gid}
                icon={stage.icon}
                label={stage.label}
                colorHex={stage.colorHex}
                colorful={colorful}
                active={activeGid === stage.gid}
                isPinned={pinnedTabs.includes(stage.gid)}
                onTogglePin={() => togglePinTab(stage.gid)}
                onClick={() => onSelectStage(stage.gid, stage.label)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Chip Colors ──────────────────────────────────────────────────────────────
const getChipColor = (val: string) => {
  if (!val) return { bg: 'bg-white/5', text: 'text-muted-foreground/60', border: 'border-white/5' };
  const v = val.toUpperCase();
  
  // Reels Branches
  if (v.includes('DESOUK') || v.includes('دسور') || v.includes('دسوق')) 
    return { bg: 'bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.05)]', text: 'text-emerald-400 font-extrabold', border: 'border-emerald-500/20' };
  if (v.includes('ALEXANDRIA') || v.includes('ALEX') || v.includes('اسكندريه') || v.includes('الاسكندرية')) 
    return { bg: 'bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.05)]', text: 'text-blue-400 font-extrabold', border: 'border-blue-500/20' };
  if (v.includes('CAIRO') || v.includes('القاهره') || v.includes('القاهرة')) 
    return { bg: 'bg-rose-500/10 shadow-[0_0_10px_rgba(244,63,94,0.05)]', text: 'text-rose-400 font-extrabold', border: 'border-rose-500/20' };
  if (v.includes('ONLINE') || v.includes('أونلاين') || v.includes('اونلاين')) 
    return { bg: 'bg-purple-500/10 shadow-[0_0_10px_rgba(168,85,247,0.05)]', text: 'text-purple-400 font-extrabold', border: 'border-purple-500/20' };

  // Year level colors
  if (v.includes('M3') || v.includes('MIDDLE 3')) 
    return { bg: 'bg-teal-500/10 shadow-[0_0_10px_rgba(20,184,166,0.05)]', text: 'text-teal-400 font-extrabold', border: 'border-teal-500/20' };
  if (v.includes('M2') || v.includes('MIDDLE 2')) 
    return { bg: 'bg-cyan-500/10 shadow-[0_0_10px_rgba(6,182,212,0.05)]', text: 'text-cyan-400 font-extrabold', border: 'border-cyan-500/20' };
  if (v.includes('M1') || v.includes('MIDDLE 1')) 
    return { bg: 'bg-sky-500/10 shadow-[0_0_10px_rgba(14,165,233,0.05)]', text: 'text-sky-400 font-extrabold', border: 'border-sky-500/20' };
  if (v.includes('S3') || v.includes('SENIOR 3')) 
    return { bg: 'bg-indigo-500/10 shadow-[0_0_10px_rgba(99,102,241,0.05)]', text: 'text-indigo-400 font-extrabold', border: 'border-indigo-500/20' };
  if (v.includes('S2') || v.includes('SENIOR 2')) 
    return { bg: 'bg-violet-500/10 shadow-[0_0_10px_rgba(139,92,246,0.05)]', text: 'text-violet-400 font-extrabold', border: 'border-violet-500/20' };
  if (v.includes('S1') || v.includes('SENIOR 1')) 
    return { bg: 'bg-fuchsia-500/10 shadow-[0_0_10px_rgba(217,70,239,0.05)]', text: 'text-fuchsia-400 font-extrabold', border: 'border-fuchsia-500/20' };

  if (v.includes('POSTPONED')) return { bg: 'bg-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.2)]', text: 'text-yellow-400 font-extrabold uppercase', border: 'border-yellow-500/40 animate-pulse' };
  if (v.includes('علوم') || v.includes('KIRO') || v.includes('COMPLETED') || v.includes('SMARTBOARD')) return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' };
  if (v.includes('ماث') || v.includes('2025') || v.includes('BASEL') || v.includes('URGENT') || v.includes('CANCEL')) return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' };
  if (v.includes('رياضه') || v.includes('PENDING') || v.includes('IN PROGRESS')) return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
  if (v.includes('ساينس') || v.includes('HASSANEN') || v.includes('DONE')) return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
  if (v.includes('دراسات') || v.includes('LOW')) return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' };
  
  // Default slate-like grey pill for other values (like employee, sohaila, etc.)
  return { bg: 'bg-slate-500/10 border border-slate-500/20 shadow-[0_0_10px_rgba(100,116,139,0.05)]', text: 'text-slate-300 font-bold', border: 'border-slate-500/20' };
};

// ─── Chip component ───────────────────────────────────────────────────────────
const Chip = ({ value }: { value: string }) => {
  const colors = getChipColor(value);
  return (
    <span className={`chip-base ${colors.bg} ${colors.text} ${colors.border}`}>
      {value || '---'}
    </span>
  );
};

const getTargetStageGid = (item: any) => {
  const str = String(item?.filingName || item?.name || '').toUpperCase();
  if (str.includes('J4') || str.includes('JUNIOR 4')) return { gid: '497207661', label: 'Junior 4' };
  if (str.includes('J5') || str.includes('JUNIOR 5')) return { gid: '96752860', label: 'Junior 5' };
  if (str.includes('J6') || str.includes('JUNIOR 6')) return { gid: '346788121', label: 'Junior 6' };
  if (str.includes('M1') || str.includes('MIDDLE 1')) return { gid: '458352282', label: 'Middle 1' };
  if (str.includes('M2') || str.includes('MIDDLE 2')) return { gid: '2113852114', label: 'Middle 2' };
  if (str.includes('M3') || str.includes('MIDDLE 3')) return { gid: '2089699920', label: 'Middle 3' };
  if (str.includes('S1') || str.includes('SENIOR 1')) return { gid: '1640460225', label: 'Senior 1' };
  if (str.includes('S2') || str.includes('SENIOR 2')) return { gid: '595027661', label: 'Senior 2' };
  if (str.includes('S3') || str.includes('SENIOR 3')) return { gid: '286303232', label: 'Senior 3' };
  return { gid: '497207661', label: 'Junior 4' };
};

const getSubjectFromFiling = (str: string) => {
  if (!str) return 'عام';
  const s = str.toUpperCase();
  if (s.includes('AR')) return 'عربي';
  if (s.includes('MATH')) return 'ماث';
  if (s.includes('SCI')) return 'ساينس';
  if (s.includes('SS') || s.includes('SOCIAL')) return 'دراسات';
  if (s.includes('EN')) return 'إنجليزي';
  return 'عام';
};

const formatDuration = (val: string | number) => {
  const str = String(val || '').trim();
  if (!str) return '';
  if (str.includes(':')) return str;
  const totalMinutes = parseFloat(str);
  if (isNaN(totalMinutes) || totalMinutes <= 0) return str;
  const hrs = Math.floor(totalMinutes / 60);
  const mins = Math.floor(totalMinutes % 60);
  const secs = Math.round((totalMinutes % 1) * 60);
  const formattedHrs = hrs > 0 ? `${hrs}:` : '';
  const formattedMins = String(mins).padStart(hrs > 0 ? 2 : 1, '0');
  const formattedSecs = String(secs).padStart(2, '0');
  return `${formattedHrs}${formattedMins}:${formattedSecs}`;
};

export const calculateTotalDuration = (items: any[]) => {
  let totalSeconds = 0;
  
  items.forEach(item => {
    const finalM = (item.finalMinutes && String(item.finalMinutes).trim() !== '0') ? item.finalMinutes : item.rawMinutes;
    const durStr = String(item.exactDuration || formatDuration(finalM) || '');
    
    if (durStr) {
      const parts = durStr.split(':').map(n => parseInt(n) || 0);
      if (parts.length === 3) {
        totalSeconds += parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        totalSeconds += parts[0] * 60 + parts[1];
      }
    }
  });

  if (totalSeconds === 0) return '';

  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  return `⏱️ إجمالي الوقت: ${h > 0 ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const VideoDuration = ({ url, fallback }: { url: string; fallback: string }) => {
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

// ─── Operations Row ───────────────────────────────────────────────────────────
const OperationsRow = ({ item, index, youtubeItems, onYoutubeToggle, isSelectedForMerge, onToggleMergeSelect, isGlowing, onOpenBunnyLinkModal }: any) => {
  const { profile } = useAuth();
  const stage = getTargetStageGid(item);
  const itemKey = item.uniqueKey || generateKey(item);
  const isYoutubeChecked = (youtubeItems?.[stage.gid] || []).some((i: any) => 
    i.uniqueKey === ('yt-' + itemKey) || (i.mergedItemKeys && i.mergedItemKeys.includes(itemKey))
  );

  const finalM = (item.finalMinutes && String(item.finalMinutes).trim() !== '0') ? item.finalMinutes : item.rawMinutes;
  const duration = item.exactDuration || formatDuration(finalM);

  const isPostponed = Object.values(item).some(
    val => typeof val === 'string' && val.toUpperCase().includes('POSTPONED')
  );

  return (
    <motion.tr
      id={itemKey}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.01 }}
      className={`transition-all duration-500 border-b border-white/[0.03] row-hover ${
        isGlowing 
          ? 'bg-emerald-500/20 shadow-[inset_0_0_25px_rgba(16,185,129,0.4)] ring-2 ring-emerald-500/50 border-emerald-500/50 animate-pulse relative z-10' 
          : isPostponed
            ? 'bg-yellow-500/10 shadow-[inset_0_0_25px_rgba(234,179,8,0.15)] ring-1 ring-yellow-500/30 border-yellow-500/30'
            : isYoutubeChecked 
              ? 'bg-purple-600/[0.08]' 
              : isSelectedForMerge 
                ? 'bg-purple-500/[0.04]' 
                : ''
      }`}
    >
      <td className="px-8 py-5" dir="rtl">
        <div className="flex flex-col text-right">
          <span className="text-sm font-bold arabic-text mb-1 whitespace-pre-wrap leading-relaxed tracking-wide text-white/95">{item.name}</span>
          <span className="text-[10px] text-muted font-black opacity-40 uppercase tracking-[0.2em]">{item.filingName || 'NO-FILING'}</span>
        </div>
      </td>
      <td className="px-3 py-5 text-center"><Chip value={item.teacher} /></td>
      <td className="px-3 py-5 text-center">
        <div className="flex flex-col gap-1 items-center">
          <span className="chip-base bg-white/5 border-white/10 text-muted">{item.term}</span>
          <span className="chip-base bg-primary/10 border-primary/20 text-primary">{item.year}</span>
        </div>
      </td>
      <td className="px-3 py-5 text-center"><Chip value={item.smartboard} /></td>
      <td className="px-3 py-5 text-center">
        {item.linkBunny ? (
          <a
            href={item.linkBunny}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/40 transition-all inline-block shadow-sm cursor-pointer"
          >
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[11px] font-black text-purple-400 leading-none">{item.date || 'فيديو'}</span>
              {duration && (
                <span className="text-[11px] font-black text-purple-300 leading-none mt-1.5 whitespace-nowrap">
                  <VideoDuration url={item.linkBunny} fallback={duration} />
                </span>
              )}
            </div>
          </a>
        ) : (
          <button
            onClick={() => {
              if (profile?.role && PERMISSIONS.canEditBunnyLinks(profile.role)) {
                onOpenBunnyLinkModal(item.uniqueKey || generateKey(item), item.name, item.linkBunny || '');
              }
            }}
            className={`px-3.5 py-2 rounded-xl transition-all inline-block shadow-sm text-center ${profile?.role && PERMISSIONS.canEditBunnyLinks(profile.role) ? 'bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/40 active:scale-95 cursor-pointer' : 'bg-white/5 border border-white/10 text-muted opacity-50 cursor-not-allowed'}`}
            title="اضغط لإضافة رابط فيديو Bunny"
            disabled={!(profile?.role && PERMISSIONS.canEditBunnyLinks(profile.role))}
          >
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[11px] font-black text-purple-400 leading-none">{item.date || '---'}</span>
              {duration && (
                <span className="text-[11px] font-black text-purple-300 leading-none mt-1.5 whitespace-nowrap">
                  ⏱️ {duration}
                </span>
              )}
            </div>
          </button>
        )}
      </td>
      <td className="px-4 py-5 text-center">
        <button
          onClick={() => onYoutubeToggle(item, !isYoutubeChecked)}
          disabled={!(profile?.role && PERMISSIONS.canAddEntry(profile.role))}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center mx-auto transition-all duration-300 ${
            isYoutubeChecked 
              ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.6)] scale-110 ring-2 ring-purple-400' 
              : 'bg-white/5 text-muted'
          } ${profile?.role && PERMISSIONS.canAddEntry(profile.role) ? 'cursor-pointer hover:bg-purple-500/20 hover:text-purple-400' : 'opacity-50 cursor-not-allowed'}`}
        >
          <MonitorPlay size={22} className={isYoutubeChecked ? 'animate-pulse' : ''} />
        </button>
      </td>
      <td className="px-4 py-5 text-center">
        <input
          type="checkbox"
          checked={isSelectedForMerge}
          onChange={() => onToggleMergeSelect(item)}
          disabled={!(profile?.role && PERMISSIONS.canAddEntry(profile.role))}
          className={`w-5 h-5 accent-purple-600 rounded transition-transform ${profile?.role && PERMISSIONS.canAddEntry(profile.role) ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed opacity-50'}`}
          title="تحديد لإضافتها لتجميعة يوتيوب"
        />
      </td>
    </motion.tr>
  );
};

// ─── Tagme3at Row ─────────────────────────────────────────────────────────────
const TagmeRow = ({ 
  item, 
  index, 
  isSimple = false,
  onUpdateEditor, 
  editorsList, 
  onUpdateEditorNotes, 
  onUpdateMarketingNotes, 
  opSheetsList, 
  branchesList, 
  onUpdateOpSheet, 
  onUpdateBranch, 
  onUpdateDate, 
  isGlowing, 
  liveData, 
  canRaisePriority, 
  priorityLimit, 
  onStatusChange, 
  isSubscribed, 
  onToggleSubscribe, 
  priorityOverride, 
  statusOverride,
  onUpdateThumbnailLink,
  onUpdateTime,
  onUpdateYoutubeLink,
  onUpdateUploaded
}: any) => {
  const { profile } = useAuth();
  const [done, setDone] = useState(item.done);
  const [cancel, setCancel] = useState(false);
  const [priority, setPriority] = useState(item.priority);
  const [copied, setCopied] = useState(false);

  const [thumbnailVal, setThumbnailVal] = useState(item.thumbnailLink || '');
  const [isEditingThumbnail, setIsEditingThumbnail] = useState(false);
  const [timeVal, setTimeVal] = useState(item.time || '');
  const [youtubeVal, setYoutubeVal] = useState(item.youtubeLink || '');
  const [isEditingYoutube, setIsEditingYoutube] = useState(false);
  const [isUploaded, setIsUploaded] = useState(item.uploaded === true || String(item.uploaded) === 'true');

  useEffect(() => {
    setThumbnailVal(item.thumbnailLink || '');
  }, [item.thumbnailLink]);

  useEffect(() => {
    setTimeVal(item.time || '');
  }, [item.time]);

  useEffect(() => {
    setYoutubeVal(item.youtubeLink || '');
  }, [item.youtubeLink]);

  useEffect(() => {
    setIsUploaded(item.uploaded === true || String(item.uploaded) === 'true');
  }, [item.uploaded]);

  useEffect(() => {
    if (priorityOverride !== undefined) setPriority(priorityOverride);
  }, [priorityOverride]);

  useEffect(() => {
    if (statusOverride !== undefined) {
       setDone(statusOverride.done);
       setCancel(statusOverride.cancel);
    }
  }, [statusOverride]);

  const handleCopy = () => {
    navigator.clipboard.writeText(item.name || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toInputDate = (dStr: string) => {
    if (!dStr || dStr === '---') return '';
    const parts = dStr.split('/');
    if (parts.length === 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return '';
  };

  const fromInputDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parseInt(parts[1], 10).toString();
      const day = parseInt(parts[2], 10).toString();
      return `${month}/${day}/${year}`;
    }
    return '';
  };

  const originalKey = item.uniqueKey ? String(item.uniqueKey).replace('tgm-', '') : '';
  const matchedItem = liveData?.find((i: any) => (i.uniqueKey || generateKey(i)) === originalKey);
  const date = item.date || matchedItem?.date || '---';

  return (
    <motion.tr
      id={item.uniqueKey || generateKey(item)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`transition-all duration-500 border-b border-white/[0.03] row-hover group/row ${
        isGlowing 
          ? 'bg-emerald-500/20 shadow-[inset_0_0_25px_rgba(16,185,129,0.4)] ring-2 ring-emerald-500/50 border-emerald-500/50 animate-pulse relative z-10' 
          : done 
            ? 'bg-emerald-500/[0.03]' 
            : priority 
              ? 'bg-purple-600/[0.05]' 
              : cancel 
                ? 'bg-amber-500/[0.03]' 
                : ''
      }`}
    >
      <td className="px-8 py-6" dir="rtl">
        <div className="flex items-center justify-end gap-4 min-w-[280px] text-right">
          <div className="flex flex-col text-right">
            <span className="text-base font-bold arabic-text mb-1 whitespace-pre-wrap leading-relaxed tracking-wide text-white/95">{item.name}</span>
            {item.filingName && item.filingName !== item.name && (
              <span className="text-[10px] text-muted font-black opacity-40 uppercase tracking-[0.15em]">{item.filingName}</span>
            )}
          </div>
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className={`w-2.5 h-12 rounded-full transition-all duration-500 ${
              done 
                ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]' 
                : priority 
                ? 'bg-purple-600 shadow-[0_0_16px_rgba(147,51,234,0.9)] animate-pulse' 
                : cancel 
                ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]' 
                : 'bg-white/15'
            }`} />
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCopy}
                className={`transition-all duration-300 cursor-pointer p-0.5 ${copied ? 'text-emerald-400 opacity-100 scale-110' : 'text-white opacity-10 hover:opacity-80'}`}
                title="نسخ المسارات"
              >
                {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
              </button>
              <button 
                onClick={onToggleSubscribe}
                className={`transition-all duration-300 cursor-pointer p-1.5 rounded-lg border flex items-center justify-center ${
                  isSubscribed 
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-400 scale-105 shadow-[0_0_10px_rgba(244,63,94,0.2)]' 
                    : 'border-white/10 bg-white/5 text-white/30 hover:border-white/30 hover:bg-white/10 hover:text-white/60'
                }`}
                title={isSubscribed ? 'إلغاء المتابعة' : 'متابعة هذه التجميعة'}
              >
                <Bell size={12} className={isSubscribed ? 'animate-pulse' : ''} />
              </button>
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-6 text-center">
        <select
          value={item.opSheet || ''}
          onChange={(e) => onUpdateOpSheet(item.uniqueKey || generateKey(item), e.target.value)}
          disabled={!(profile?.role && PERMISSIONS.canEditEditors(profile.role))}
          className={`bg-white/5 border border-white/10 hover:border-emerald-500/50 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none transition-all shadow-lg focus:ring-2 focus:ring-emerald-500/50 min-w-[90px] ${profile?.role && PERMISSIONS.canEditEditors(profile.role) ? 'cursor-pointer hover:bg-white/10' : 'cursor-not-allowed opacity-50'}`}
        >
          <option value="" className="bg-[#0b1019] text-muted">غير محدد</option>
          {opSheetsList?.map((sheet: string) => (
            <option key={sheet} value={sheet} className="bg-[#0b1019] text-white font-bold">{sheet}</option>
          ))}
        </select>
      </td>
      {!isSimple && (
        <td className="px-3 py-6 text-center">
          <input
            type="date"
            value={toInputDate(date)}
            onChange={(e) => {
              const newDate = fromInputDate(e.target.value);
              onUpdateDate(item.uniqueKey || generateKey(item), newDate);
            }}
            style={{ colorScheme: 'dark' }}
            disabled={!(profile?.role && PERMISSIONS.canEditEditors(profile.role))}
            className={`bg-white/5 border border-white/10 hover:border-emerald-500/50 rounded-xl px-2 py-1 text-xs font-bold text-white text-center outline-none focus:bg-[#0b1019] focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-inner font-mono max-w-[125px] ${profile?.role && PERMISSIONS.canEditEditors(profile.role) ? '' : 'cursor-not-allowed opacity-50'}`}
          />
        </td>
      )}
      {!isSimple && (
        <td className="px-3 py-6 text-center">
          <select
            value={item.branch || ''}
            onChange={(e) => onUpdateBranch(item.uniqueKey || generateKey(item), e.target.value)}
            disabled={!(profile?.role && PERMISSIONS.canEditEditors(profile.role))}
            className={`bg-white/5 border border-white/10 hover:border-emerald-500/50 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none transition-all shadow-lg focus:ring-2 focus:ring-emerald-500/50 min-w-[90px] ${profile?.role && PERMISSIONS.canEditEditors(profile.role) ? 'cursor-pointer hover:bg-white/10' : 'cursor-not-allowed opacity-50'}`}
          >
            <option value="" className="bg-[#0b1019] text-muted">غير محدد</option>
            {branchesList?.map((branch: string) => (
              <option key={branch} value={branch} className="bg-[#0b1019] text-white font-bold">{branch}</option>
            ))}
          </select>
        </td>
      )}
      <td className="px-3 py-6 text-center">
        <HistoryInput
          itemKey={item.uniqueKey || generateKey(item)}
          fieldKey="mktg_notes"
          value={item.notesMarketing || ''}
          onChange={(val: string) => onUpdateMarketingNotes(item.uniqueKey || generateKey(item), val)}
          placeholder="أضف ملاحظة..."
          disabled={!(profile?.role && PERMISSIONS.canEditNotes(profile.role))}
        />
      </td>
      <td className="px-3 py-6 text-center">
        <select
          value={item.editor || 'غير محدد'}
          onChange={(e) => onUpdateEditor(item.uniqueKey || generateKey(item), e.target.value)}
          disabled={!(profile?.role && PERMISSIONS.canEditEditors(profile.role))}
          className={`bg-white/5 border border-white/10 hover:border-emerald-500/50 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none transition-all shadow-lg focus:ring-2 focus:ring-emerald-500/50 ${profile?.role && PERMISSIONS.canEditEditors(profile.role) ? 'cursor-pointer hover:bg-white/10' : 'cursor-not-allowed opacity-50'}`}
        >
          <option value="غير محدد" className="bg-[#0b1019] text-muted">غير محدد</option>
          {editorsList.map((editor: string) => (
            <option key={editor} value={editor} className="bg-[#0b1019] text-white font-bold">{editor}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-6 text-center">
        <div className="flex justify-center gap-3">
          <button
            onClick={() => {
              const newDone = !done;
              setDone(newDone);
              const editor = item.editor;
              if (editor && editor !== 'غير محدد' && onStatusChange) {
                onStatusChange(item.uniqueKey || generateKey(item), item.name, editor, newDone ? 'done' : 'undone');
              }
            }}
            disabled={!(profile?.role && PERMISSIONS.canEditEditors(profile.role))}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ${done ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105' : 'bg-white/5 text-muted hover:bg-emerald-500/10 hover:text-emerald-400'} ${!(profile?.role && PERMISSIONS.canEditEditors(profile.role)) && 'opacity-50 cursor-not-allowed'}`}
          >
            <CheckCircle2 size={20} />
          </button>
          <button
            onClick={() => {
              const newCancel = !cancel;
              setCancel(newCancel);
              const editor = item.editor;
              if (editor && editor !== 'غير محدد' && onStatusChange) {
                onStatusChange(item.uniqueKey || generateKey(item), item.name, editor, newCancel ? 'cancel' : 'uncancel');
              }
            }}
            disabled={!(profile?.role && PERMISSIONS.canEditEditors(profile.role))}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ${cancel ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 scale-105' : 'bg-white/5 text-muted hover:bg-amber-500/10 hover:text-amber-400'} ${!(profile?.role && PERMISSIONS.canEditEditors(profile.role)) && 'opacity-50 cursor-not-allowed'}`}
          >
            <AlertCircle size={20} />
          </button>
        </div>
      </td>
      {!isSimple && (
        <td className="px-3 py-6 text-center">
          <HistoryInput
            itemKey={item.uniqueKey || generateKey(item)}
            fieldKey="editor_notes"
            value={item.notesEditors || ''}
            onChange={(val: string) => onUpdateEditorNotes(item.uniqueKey || generateKey(item), val)}
            placeholder="اكتب ملاحظة..."
            disabled={!(profile?.role && PERMISSIONS.canEditNotes(profile.role))}
          />
        </td>
      )}
      <td className="px-6 py-6 text-center">
          <button
            onClick={() => {
              const newPriority = !priority;
              setPriority(newPriority);
              const editor = item.editor;
              if (onStatusChange) {
                onStatusChange(item.uniqueKey || generateKey(item), item.name, editor || 'غير محدد', newPriority ? 'priority' : 'unpriority');
              }
            }}
            disabled={!(profile?.role && PERMISSIONS.canEditEditors(profile.role)) || (!priority && !canRaisePriority)}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center mx-auto transition-all duration-500 ${
              priority 
                ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.6)] ring-2 ring-purple-400 scale-110 animate-pulse' 
                : 'bg-white/5 text-muted hover:bg-purple-500/20 hover:text-purple-400'
            } ${!(profile?.role && PERMISSIONS.canEditEditors(profile.role)) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={!priority && !canRaisePriority ? `تم الوصول للحد اليومي (${priorityLimit})` : 'Priority'}
          >
            <AlertCircle size={20} />
          </button>
      </td>
      {!isSimple && (
        <td className="px-3 py-6 text-center">
          <div className="flex items-center justify-center gap-1.5">
            {isEditingThumbnail ? (
              <input 
                autoFocus
                type="text" 
                value={thumbnailVal} 
                onChange={e => setThumbnailVal(e.target.value)}
                onBlur={() => {
                  setIsEditingThumbnail(false);
                  if (thumbnailVal !== item.thumbnailLink) {
                    onUpdateThumbnailLink(item.uniqueKey || generateKey(item), thumbnailVal);
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="w-full max-w-[120px] bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl px-2 py-1 text-xs font-bold text-center text-white/90 outline-none transition-all focus:bg-[#0b1019] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 text-left" 
                placeholder="Paste link..."
              />
            ) : (
              <div className="flex items-center justify-center gap-1.5">
                {item.thumbnailLink ? (
                  (() => {
                    const parsed = parseDriveLink(item.thumbnailLink);
                    return (
                      <div className="flex flex-col items-center gap-1.5">
                        <a 
                          href={parsed.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-2 py-1 rounded-lg bg-blue-500/15 text-blue-400 font-mono text-[10px] underline cursor-pointer shadow-sm truncate max-w-[110px]"
                          title={parsed.url}
                        >
                          {parsed.url}
                        </a>
                        <div 
                          onClick={() => parsed.url && window.open(parsed.url, '_blank')}
                          className="relative group/preview mt-1.5 w-32 h-20 rounded-xl overflow-hidden border border-white/10 hover:border-blue-500/50 shadow-md bg-white/5 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
                          title="عرض الملف"
                        >
                          <PreviewImage url={item.thumbnailLink} />
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <span className="text-muted/40 text-xs px-2 shrink-0">---</span>
                )}
                <button 
                  onClick={() => setIsEditingThumbnail(true)} 
                  className="p-1 rounded-full bg-white/5 hover:bg-white/15 text-muted hover:text-white transition-all scale-90 cursor-pointer shrink-0" 
                  title="تعديل الثمنيل"
                >
                  <Pencil size={9} />
                </button>
              </div>
            )}
          </div>
        </td>
      )}
      {!isSimple && (
        <td className="px-3 py-6 text-center">
          <input
            type="datetime-local"
            value={timeVal}
            onChange={e => setTimeVal(e.target.value)}
            onBlur={() => {
              if (timeVal !== item.time) {
                onUpdateTime(item.uniqueKey || generateKey(item), timeVal);
              }
            }}
            style={{ colorScheme: 'dark' }}
            className="bg-white/5 border border-white/10 hover:border-emerald-500/50 rounded-xl px-2 py-1 text-xs font-bold text-white text-center outline-none focus:bg-[#0b1019] focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-inner font-mono max-w-[190px]"
          />
        </td>
      )}
      {!isSimple && (
        <td className="px-3 py-6 text-center">
          <div className="flex items-center justify-center gap-1.5">
            {isEditingYoutube ? (
              <input 
                autoFocus
                type="text" 
                value={youtubeVal} 
                onChange={e => setYoutubeVal(e.target.value)}
                onBlur={() => {
                  setIsEditingYoutube(false);
                  if (youtubeVal !== item.youtubeLink) {
                    onUpdateYoutubeLink(item.uniqueKey || generateKey(item), youtubeVal);
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="w-full max-w-[120px] bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl px-2 py-1 text-xs font-bold text-center text-white/90 outline-none transition-all focus:bg-[#0b1019] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 text-left" 
                placeholder="Paste Youtube..."
              />
            ) : (
              <div className="flex items-center justify-center gap-1.5">
                {item.youtubeLink ? (
                  (() => {
                    const parsed = parseDriveLink(item.youtubeLink);
                    return (
                      <a 
                        href={parsed.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="px-2 py-1 rounded-lg bg-red-500/15 text-red-400 font-mono text-[10px] underline cursor-pointer shadow-sm truncate max-w-[110px]"
                        title={parsed.url}
                      >
                        {parsed.url}
                      </a>
                    );
                  })()
                ) : (
                  <span className="text-muted/40 text-xs px-2 shrink-0">---</span>
                )}
                <button 
                  onClick={() => setIsEditingYoutube(true)} 
                  className="p-1 rounded-full bg-white/5 hover:bg-white/15 text-muted hover:text-white transition-all scale-90 cursor-pointer shrink-0" 
                  title="تعديل رابط اليوتيوب"
                >
                  <Pencil size={9} />
                </button>
              </div>
            )}
          </div>
        </td>
      )}
      {!isSimple && (
        <td className="px-3 py-6 text-center">
          <button
            onClick={() => {
              const nextVal = !isUploaded;
              setIsUploaded(nextVal);
              onUpdateUploaded(item.uniqueKey || generateKey(item), nextVal);
            }}
            className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all duration-300 cursor-pointer ${
              isUploaded ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/10 text-muted hover:bg-emerald-500/30 hover:text-emerald-300'
            }`}
            title="تم الرفع؟"
          >
            {isUploaded && <CheckCircle2 size={14} />}
          </button>
        </td>
      )}
    </motion.tr>
  );
};

// ─── Stage Row (Junior/Middle/Senior) ─────────────────────────────────────────
const StageRow = ({ item, index, tagmeTransfers, onTagmeToggle, activeLabel, isGlowing, onUpdateDate, onUpdateWeek }: any) => {
  const { profile } = useAuth();
  const rowKey = item.uniqueKey || generateKey(item);
  const itemKey = 'tgm-' + rowKey;
  const isTagmeChecked = (tagmeTransfers || []).some((i: any) => i.uniqueKey === itemKey);
  const [received, setReceived] = useState(item.check2);
  const [weekVal, setWeekVal] = useState(item.week || '');
  const [dateVal, setDateVal] = useState(item.date || item.id || '');

  useEffect(() => {
    setWeekVal(item.week || '');
  }, [item.week]);

  useEffect(() => {
    setDateVal(item.date || item.id || '');
  }, [item.date, item.id]);

  const toInputDate = (dStr: string) => {
    if (!dStr || dStr === '---') return '';
    const parts = dStr.split('/');
    if (parts.length === 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      let year = parts[2];
      if (year.length === 2) year = '20' + year;
      return `${year}-${month}-${day}`;
    }
    return dStr;
  };

  const fromInputDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parseInt(parts[1], 10).toString();
      const day = parseInt(parts[2], 10).toString();
      return `${month}/${day}/${year}`;
    }
    return dStr;
  };

  const getWeekColor = (w: string) => {
    if (!w) return 'bg-white/5 border-white/10 text-muted';
    const num = w.replace(/\D/g, '');
    const code = parseInt(num) || (w.charCodeAt(w.length - 1) % 6);
    switch (code % 6) {
      case 1: return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
      case 2: return 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]';
      case 3: return 'bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]';
      case 4: return 'bg-purple-500/15 border-purple-500/30 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.15)]';
      case 5: return 'bg-rose-500/15 border-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]';
      default: return 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]';
    }
  };

  return (
    <motion.tr
      id={item.uniqueKey || generateKey(item)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.01 }}
      className={`transition-all duration-300 border-b border-white/[0.03] row-hover group/row ${
        isGlowing 
          ? 'bg-emerald-500/20 shadow-[inset_0_0_25px_rgba(16,185,129,0.4)] ring-2 ring-emerald-500/50 border-emerald-500/50 animate-pulse relative z-10' 
          : isTagmeChecked 
            ? 'bg-emerald-500/[0.08]' 
            : ''
      }`}
    >
      <td className="px-4 py-5 text-center">
        <input
          type="text"
          value={weekVal}
          onChange={(e) => setWeekVal(e.target.value)}
          onBlur={() => {
            if (onUpdateWeek && weekVal !== item.week) {
              onUpdateWeek(rowKey, weekVal);
            }
          }}
          disabled={!(profile?.role && PERMISSIONS.canEditEditors(profile.role))}
          placeholder="الأسبوع..."
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-mono text-center outline-none focus:ring-2 focus:ring-primary/50 transition-all max-w-[105px] ${getWeekColor(weekVal)} ${profile?.role && PERMISSIONS.canEditEditors(profile.role) ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
        />
      </td>
      <td className="px-4 py-5 text-center">
        <input
          type="date"
          value={toInputDate(dateVal)}
          onChange={(e) => {
            const newDate = fromInputDate(e.target.value);
            setDateVal(newDate);
            if (onUpdateDate) {
              onUpdateDate(rowKey, newDate);
            }
          }}
          style={{ colorScheme: 'dark' }}
          disabled={!(profile?.role && PERMISSIONS.canEditEditors(profile.role))}
          className={`bg-white/5 border border-white/10 hover:border-emerald-500/50 rounded-xl px-2.5 py-1.5 text-xs font-bold text-blue-400 text-center outline-none focus:bg-[#0b1019] focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-inner font-mono max-w-[135px] ${profile?.role && PERMISSIONS.canEditEditors(profile.role) ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
        />
      </td>
      <td className="px-8 py-5" dir="rtl">
        <div className="flex flex-col text-right">
          <span className="text-sm font-bold arabic-text mb-1 whitespace-pre-wrap leading-relaxed tracking-wide text-white/95">{item.name}</span>
          {item.filingName && item.filingName !== item.name && (
            <span className="text-[10px] text-muted font-black opacity-40 uppercase tracking-[0.15em]">{item.filingName}</span>
          )}
        </div>
      </td>
      <td className="px-3 py-5 text-center"><Chip value={item.subject} /></td>
      <td className="px-3 py-5 text-center"><Chip value={item.branch || item.extra} /></td>
      <td className="px-3 py-5 text-center"><Chip value={item.isYoutubeTransfer ? 'العمليات' : (item.opSheet || item.val)} /></td>
      <td className="px-6 py-5 text-center">
        <button
          onClick={() => onTagmeToggle(item, activeLabel, !isTagmeChecked)}
          disabled={!(profile?.role && PERMISSIONS.canAddEntry(profile.role))}
          className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all duration-300 ${isTagmeChecked ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400 scale-110' : 'bg-white/5 text-muted hover:bg-emerald-500/10 hover:text-emerald-400'} ${!(profile?.role && PERMISSIONS.canAddEntry(profile.role)) && 'opacity-50 cursor-not-allowed'}`}
        >
          <CheckCircle2 size={18} />
        </button>
      </td>
      <td className="px-6 py-5 text-center">
        <button
          onClick={() => setReceived(!received)}
          disabled={!(profile?.role && PERMISSIONS.canAddEntry(profile.role))}
          className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all duration-300 ${received ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-muted hover:bg-blue-500/10 hover:text-blue-400'} ${!(profile?.role && PERMISSIONS.canAddEntry(profile.role)) && 'opacity-50 cursor-not-allowed'}`}
        >
          <CheckCircle2 size={18} />
        </button>
      </td>
    </motion.tr>
  );
};

const AutofillCell = ({ 
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
      className={`relative autofill-cell-td transition-all ${className} ${isSelected ? 'bg-primary/5 ring-1 ring-primary/30 z-10' : ''}`}
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
};

// ─── REELS Row (Shooting, Ve, Counter) ────────────────────────────────────────
const ShootingRow = ({ item, index, activeGid, onToggleFilmed, loadingFilmedCode, onUpdateShootingRow, liveData, optionsLists, autofillDrag, setAutofillDrag, onApplyAutofill, activeCell, setActiveCell, toast, isSubscribed, onToggleSubscribe }: any) => {
  const isGlowing = false;
  const [editForm, setEditForm] = useState({
    branch: item.branch || '',
    year: item.year || '',
    teacher: item.teacher || '',
    extraName: item.extraName || '',
    type: item.type || '',
    format: item.format || '',
    by: item.by || '',
    storage: item.storage || '',
    script: item.script || '',
    notes: item.notes || '',
    driveRaw: item.driveRaw || '',
    editorCol: item.editorCol || '',
    driveFinal: item.driveFinal || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [isEditingRaw, setIsEditingRaw] = useState(false);
  const [isEditingFinal, setIsEditingFinal] = useState(false);
  const [copied, setCopied] = useState(false);
  const { profile } = useAuth();

  const parseScriptValue = (val: string) => {
    if (!val) return null;
    const s = String(val).trim();
    
    // 1. Check if it is a hyperlink formula (highly resilient to spacing and quotes)
    const hyperlinkRegex = /=HYPERLINK\s*\(\s*(['"])(.*?)\1\s*,\s*(['"])(.*?)\3\s*\)/i;
    const formulaMatch = s.match(hyperlinkRegex);
    if (formulaMatch) {
      return {
        url: formulaMatch[2].trim(),
        text: formulaMatch[4].trim(),
        isLink: true
      };
    }
    
    // 2. Check if it contains a google docs/drive URL or is a raw Google Doc path
    if (s.includes('document/d/') || s.includes('spreadsheets/d/') || s.includes('drive.google.com') || s.includes('docs.google.com') || s.startsWith('http://') || s.startsWith('https://')) {
      let url = s;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.startsWith('docs.google.com') || url.startsWith('drive.google.com')) {
          url = 'https://' + url;
        } else if (url.includes('document/d/')) {
          const idx = url.indexOf('document/d/');
          url = 'https://docs.google.com/' + url.substring(idx);
        } else {
          url = 'https://' + url;
        }
      }
      
      // Clean display text to preserve document ID path, but omit domain to keep chips beautifully compact
      let text = s;
      if (text.startsWith('https://')) text = text.substring(8);
      if (text.startsWith('http://')) text = text.substring(7);
      if (text.startsWith('www.')) text = text.substring(4);
      if (text.startsWith('docs.google.com/')) text = text.substring(16);
      
      // Limit length to keep the chip layout beautiful and prevent wrapping
      if (text.length > 32) {
        text = text.substring(0, 30) + '...';
      }
      
      return {
        url,
        text: text,
        isLink: true
      };
    }
    
    // 3. Default raw text
    return {
      url: null,
      text: s,
      isLink: false
    };
  };



  // Sync editForm if item changes from outside (e.g. after save)
  useEffect(() => {
    setEditForm({
      branch: item.branch || '',
      year: item.year || '',
      teacher: item.teacher || '',
      extraName: item.extraName || '',
      type: item.type || '',
      format: item.format || '',
      by: item.by || '',
      storage: item.storage || '',
      script: item.script || '',
      notes: item.notes || '',
      driveRaw: item.driveRaw || '',
      editorCol: item.editorCol || '',
      driveFinal: item.driveFinal || ''
    });
  }, [item]);

  const generatedCode = useMemo(() => {
    if (!['1436746012', '1939073164', '798246690'].includes(activeGid)) return item.id;
    const prefix = `${editForm.year}-${editForm.teacher}-${editForm.extraName}-`.toLowerCase().replace(/\s+/g, ' ');
    const currentPrefix = `${item.year}-${item.teacher}-${item.extraName}-`.toLowerCase().replace(/\s+/g, ' ');
    if (prefix === currentPrefix) return item.id;

    const currentSheetData = Array.isArray(liveData) ? liveData : [];
    let maxSeq = -1;
    currentSheetData.forEach((row: any) => {
      if (row.id && row.id.toLowerCase().startsWith(prefix) && row.id !== item.id) {
        const parts = row.id.split('-');
        if (parts.length >= 4) {
          const seqStr = parts[3].split(' ')[0];
          const seq = parseInt(seqStr, 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
    });
    const nextSeq = maxSeq + 1;
    return `${prefix}${nextSeq.toString().padStart(2, '0')} v6`.toLowerCase();
  }, [editForm, item, liveData, activeGid]);

  const handleFieldChange = async (fieldName: string, value: string) => {
    // 1. Update the state immediately for fast feedback
    const updatedForm = { ...editForm, [fieldName]: value };
    setEditForm(updatedForm);

    // 2. Generate new code if year, teacher, or extraName changes
    let newCode = item.id;
    if (['1436746012', '1939073164', '798246690'].includes(activeGid) && (fieldName === 'year' || fieldName === 'teacher' || fieldName === 'extraName')) {
      const prefix = `${updatedForm.year}-${updatedForm.teacher}-${updatedForm.extraName}-`.toLowerCase().replace(/\s+/g, ' ');
      const currentPrefix = `${item.year}-${item.teacher}-${item.extraName}-`.toLowerCase().replace(/\s+/g, ' ');
      if (prefix !== currentPrefix) {
        const currentSheetData = Array.isArray(liveData) ? liveData : [];
        let maxSeq = -1;
        currentSheetData.forEach((row: any) => {
          if (row.id && row.id.toLowerCase().startsWith(prefix) && row.id !== item.id) {
            const parts = row.id.split('-');
            if (parts.length >= 4) {
              const seqStr = parts[3].split(' ')[0];
              const seq = parseInt(seqStr, 10);
              if (!isNaN(seq) && seq > maxSeq) {
                maxSeq = seq;
              }
            }
          }
        });
        const nextSeq = maxSeq + 1;
        newCode = `${prefix}${nextSeq.toString().padStart(2, '0')} v6`.toLowerCase();
      }
    }

    // Done status logic: if fieldName is 'driveFinal' and the value is empty/invalid,
    // we automatically uncheck done for everyone!
    let nextDoneStatus = item.done;
    if (fieldName === 'driveFinal' && item.done) {
      const val = String(value || '').trim();
      const driveIdRegex = /^[a-zA-Z0-9_-]{25,55}$/;
      const isValidLink = val && (val.toLowerCase() === 'تم' || val.includes('http://') || val.includes('https://') || val.includes('drive.google.com') || val.includes('docs.google.com') || driveIdRegex.test(val));
      if (!isValidLink) {
        nextDoneStatus = false;
      }
    }

    // 3. Call the update api with the final values
    if (!onUpdateShootingRow) return;
    setIsSaving(true);
    const rowData = [
      item.date,
      updatedForm.branch,
      updatedForm.year,
      updatedForm.teacher,
      updatedForm.extraName,
      newCode,
      updatedForm.script,
      updatedForm.type,
      updatedForm.format,
      item.filmed ? 'TRUE' : 'FALSE',
      item.filmingDate,
      updatedForm.by,
      updatedForm.storage,
      updatedForm.notes,
      updatedForm.driveRaw,
      updatedForm.editorCol,
      nextDoneStatus ? 'TRUE' : 'FALSE',
      updatedForm.driveFinal,
      item.canceled ? 'TRUE' : 'FALSE',
      item.missingDetails ? 'TRUE' : 'FALSE'
    ];
    try {
      await onUpdateShootingRow(item.id, rowData);
    } catch(e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle = "w-full bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-center text-white/90 outline-none transition-all focus:bg-[#0b1019] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30";

  const isCanceled = item.canceled === true || item.canceled === 'TRUE';
  const isMissing = item.missingDetails === true || item.missingDetails === 'TRUE';
  const isDone = item.done === true || item.done === 'TRUE';

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.01 }}
      className={`transition-all duration-300 border-b border-white/[0.03] row-hover ${
        isCanceled 
          ? 'bg-rose-500/[0.06] hover:bg-rose-500/[0.12] border-rose-500/20 text-rose-100/90' 
          : isMissing 
            ? 'bg-amber-500/[0.06] hover:bg-amber-500/[0.12] border-amber-500/20 text-amber-100/90' 
            : isDone 
              ? 'bg-emerald-500/[0.06] hover:bg-emerald-500/[0.12] border-emerald-500/20 text-emerald-100/90' 
              : ''
      } ${isGlowing ? 'bg-emerald-500/20 shadow-[inset_0_0_25px_rgba(16,185,129,0.4)] ring-2 ring-emerald-500/50 border-emerald-500/50 animate-pulse relative z-10' : ''}`}
    >
      <td className="px-4 py-5 text-center"><span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-bold text-blue-400 shrink-0">{item.date || '---'}</span></td>
      
      <AutofillCell colKey="branch" rowIndex={index} value={editForm.branch} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
        <InlineCombobox options={optionsLists?.branches} value={editForm.branch} onChange={(val: string) => handleFieldChange('branch', val)} />
      </AutofillCell>

      <AutofillCell colKey="year" rowIndex={index} value={editForm.year} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
        <InlineCombobox options={optionsLists?.years} value={editForm.year} onChange={(val: string) => handleFieldChange('year', val)} />
      </AutofillCell>

      <AutofillCell colKey="teacher" rowIndex={index} value={editForm.teacher} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
        <InlineCombobox options={optionsLists?.teachers} value={editForm.teacher} onChange={(val: string) => handleFieldChange('teacher', val)} />
      </AutofillCell>

      <AutofillCell colKey="extraName" rowIndex={index} value={editForm.extraName} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
        <InlineCombobox options={optionsLists?.extraNames} value={editForm.extraName} onChange={(val: string) => handleFieldChange('extraName', val)} />
      </AutofillCell>

      <td className="px-3 py-5 text-center">
        <div className="flex items-center justify-center gap-2">
          <div 
            onClick={() => {
              navigator.clipboard.writeText(generatedCode);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/30 transition-all duration-200 cursor-pointer shadow-sm text-xs font-mono font-bold text-emerald-400 hover:scale-[1.02] active:scale-95 group whitespace-nowrap"
            title="اضغط لنسخ الكود"
          >
            <span className="tracking-wide">{generatedCode}</span>
            {copied ? (
              <Check size={12} className="text-emerald-400 shrink-0 animate-fadeIn" />
            ) : (
              <Copy size={12} className="text-emerald-500/40 group-hover:text-emerald-400 transition-colors shrink-0" />
            )}
          </div>
          <button 
            onClick={() => onToggleSubscribe(generatedCode)}
            className={`transition-all duration-300 cursor-pointer p-2 rounded-xl border flex items-center justify-center ${
              isSubscribed 
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-400 scale-105 shadow-[0_0_10px_rgba(244,63,94,0.2)]' 
                : 'border-white/10 bg-white/5 text-white/30 hover:border-white/30 hover:bg-white/10 hover:text-white/60'
            }`}
            title={isSubscribed ? 'إلغاء المتابعة' : 'متابعة هذا السكريبت'}
          >
            <Bell size={12} className={isSubscribed ? 'animate-pulse' : ''} />
          </button>
        </div>
      </td>

      <AutofillCell colKey="script" rowIndex={index} value={editForm.script} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length} className="px-4 py-5 text-right font-bold arabic-text">
        {isEditingScript ? (
          <input 
            autoFocus
            type="text" 
            value={editForm.script} 
            onChange={e => setEditForm({...editForm, script: e.target.value})}
            onBlur={() => {
              setIsEditingScript(false);
              if (editForm.script !== item.script) {
                handleFieldChange('script', editForm.script);
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            className={inputStyle + " min-w-[150px] text-left"} 
            placeholder="Paste Drive Link..."
          />
        ) : (
          <div className="flex items-center justify-end gap-2">
            {(() => {
              const parsed = parseScriptValue(item.script);
              if (!parsed) return <span className="text-muted/40 text-xs px-2 shrink-0">---</span>;
              
              if (parsed.isLink) {
                return (
                  <a 
                    href={parsed.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-[11px] font-extrabold transition-all text-blue-400 shadow-sm shrink-0 hover:scale-[1.02] active:scale-95 cursor-pointer"
                  >
                    <FolderOpen size={12} className="shrink-0 text-blue-400" />
                    <span className="truncate max-w-[130px] arabic-text" title={parsed.url}>{parsed.text}</span>
                  </a>
                );
              } else {
                return (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[11px] font-bold text-white/90 shadow-sm shrink-0">
                    <span className="truncate max-w-[130px] arabic-text" title={parsed.text}>{parsed.text}</span>
                  </span>
                );
              }
            })()}
            <button 
              onClick={() => setIsEditingScript(true)} 
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-muted hover:text-white transition-all scale-95 cursor-pointer shrink-0" 
              title="تعديل الاسكريبت"
            >
              <Pencil size={11} />
            </button>
          </div>
        )}
      </AutofillCell>
      <AutofillCell colKey="type" rowIndex={index} value={editForm.type} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
        <InlineCombobox options={optionsLists?.types} value={editForm.type} onChange={(val: string) => handleFieldChange('type', val)} />
      </AutofillCell>
      <AutofillCell colKey="format" rowIndex={index} value={editForm.format} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
        <InlineCombobox options={optionsLists?.formats} value={editForm.format} onChange={(val: string) => handleFieldChange('format', val)} />
      </AutofillCell>
      <td className="px-3 py-5 text-center">
        <button
          onClick={() => {
            if (activeGid === '1939073164') return;
            onToggleFilmed && onToggleFilmed(item, !item.filmed);
          }}
          className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all duration-300 ${activeGid === '1939073164' ? 'cursor-default' : 'cursor-pointer'} ${loadingFilmedCode === item.id && activeGid !== '1939073164' ? 'opacity-50 pointer-events-none' : ''} ${
            (item.filmed || activeGid === '1939073164') ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/10 text-muted hover:bg-emerald-500/30 hover:text-emerald-300'
          }`}
        >
          {loadingFilmedCode === item.id && activeGid !== '1939073164' ? (
            <span className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
          ) : (item.filmed || activeGid === '1939073164') ? (
            <CheckCircle2 size={14} />
          ) : null}
        </button>
      </td>
      <td className="px-4 py-5 text-center text-xs text-muted">{item.filmingDate || '---'}</td>
      <AutofillCell colKey="by" rowIndex={index} value={editForm.by} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
        <InlineCombobox options={optionsLists?.bys} value={editForm.by} onChange={(val: string) => handleFieldChange('by', val)} />
      </AutofillCell>
      <AutofillCell colKey="storage" rowIndex={index} value={editForm.storage} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
        <InlineCombobox options={optionsLists?.storages} value={editForm.storage} onChange={(val: string) => handleFieldChange('storage', val)} />
      </AutofillCell>
      <AutofillCell colKey="notes" rowIndex={index} value={editForm.notes} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length} className="px-5 py-5 text-center text-xs font-bold text-white/90 arabic-text">
        <HistoryInput
          itemKey={item.id}
          fieldKey="shooting_notes"
          value={editForm.notes}
          onChange={(val: string) => handleFieldChange('notes', val)}
          placeholder="اكتب ملاحظة..."
          disabled={false}
        />
      </AutofillCell>
      <td className="px-4 py-5 text-center">
        <div className="flex flex-col gap-2 items-center justify-center">
          {isEditingRaw ? (
            <input 
              autoFocus
              type="text" 
              value={editForm.driveRaw} 
              onChange={e => setEditForm({...editForm, driveRaw: e.target.value})}
              onBlur={() => {
                setIsEditingRaw(false);
                if (editForm.driveRaw !== item.driveRaw) {
                  handleFieldChange('driveRaw', editForm.driveRaw);
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              className="w-full max-w-[150px] bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-center text-white/90 outline-none transition-all focus:bg-[#0b1019] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 text-left" 
              placeholder="Paste Raw Drive Link..."
            />
          ) : (
            <div className="flex items-center justify-center gap-1.5">
              {item.driveRaw ? (
                (() => {
                  const parsed = parseDriveLink(item.driveRaw);
                  return (
                    <a 
                      href={parsed.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-mono text-[11px] underline cursor-pointer shadow-sm shrink-0 truncate max-w-[220px]"
                      title={parsed.url}
                    >
                      {parsed.url}
                    </a>
                  );
                })()
              ) : (
                <span className="text-muted/40 text-xs px-2 shrink-0">---</span>
              )}
              <button 
                onClick={() => setIsEditingRaw(true)} 
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-muted hover:text-white transition-all scale-95 cursor-pointer shrink-0" 
                title="تعديل لينك الدرايف"
              >
                <Pencil size={11} />
              </button>
            </div>
          )}
          {isSaving && (
            <span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin block" title="جاري الحفظ تلقائياً..." />
          )}
        </div>
      </td>
      {activeGid === '1939073164' && (
        <>
          <AutofillCell colKey="editorCol" rowIndex={index} value={editForm.editorCol} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
            <InlineCombobox options={optionsLists?.editors} value={editForm.editorCol} onChange={(val: string) => handleFieldChange('editorCol', val)} />
          </AutofillCell>
          {/* Missing Details Checkmark */}
          <td className="px-3 py-5 text-center">
            <button
              onClick={async () => {
                if (!item.id) { alert("لا يمكن تعديل هذا الصف لعدم وجود كود (Code)"); return; }
                if (!onUpdateShootingRow) return;
                setIsSaving(true);
                const nextMissing = !isMissing;
                const rowData = [
                  item.date,
                  editForm.branch,
                  editForm.year,
                  editForm.teacher,
                  editForm.extraName,
                  item.id,
                  editForm.script,
                  editForm.type,
                  editForm.format,
                  item.filmed ? 'TRUE' : 'FALSE',
                  item.filmingDate,
                  editForm.by,
                  editForm.storage,
                  editForm.notes,
                  editForm.driveRaw,
                  editForm.editorCol,
                  item.done ? 'TRUE' : 'FALSE',
                  editForm.driveFinal,
                  item.canceled ? 'TRUE' : 'FALSE',
                  nextMissing ? 'TRUE' : 'FALSE'
                ];
                try {
                  await onUpdateShootingRow(item.id, rowData);
                } catch(e) {
                  console.error(e);
                } finally {
                  setIsSaving(false);
                }
              }}
              className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all duration-300 cursor-pointer ${
                isMissing ? 'bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-white/10 text-muted hover:bg-amber-500/30 hover:text-amber-300'
              }`}
              title="تفاصيل ناقصة"
            >
              {isMissing && <CheckCircle2 size={14} />}
            </button>
          </td>
          {/* DONE Checkmark */}
          <td className="px-3 py-5 text-center">
            <button
              onClick={async () => {
                if (!item.id) { alert("لا يمكن تعديل هذا الصف لعدم وجود كود (Code)"); return; }
                const nextDone = !isDone;
                if (nextDone) {
                  const finalVal = String(editForm.driveFinal || '').trim();
                  const driveIdRegex = /^[a-zA-Z0-9_-]{25,55}$/;
                  if (!finalVal || (finalVal.toLowerCase() !== 'تم' && !finalVal.includes('http://') && !finalVal.includes('https://') && !finalVal.includes('drive.google.com') && !finalVal.includes('docs.google.com') && !driveIdRegex.test(finalVal))) {
                    if (toast && toast.error) {
                      toast.error("لا يمكن تحديد المهمة كمكتملة (Done) إلا بعد إضافة رابط المونتاج النهائي (Final Link) أو كتابة 'تم'");
                    } else {
                      alert("لا يمكن تحديد المهمة كمكتملة (Done) إلا بعد إضافة رابط المونتاج النهائي (Final Link) أو كتابة 'تم'");
                    }
                    return;
                  }
                }
                if (!onUpdateShootingRow) return;
                setIsSaving(true);
                const rowData = [
                  item.date,
                  editForm.branch,
                  editForm.year,
                  editForm.teacher,
                  editForm.extraName,
                  item.id,
                  editForm.script,
                  editForm.type,
                  editForm.format,
                  item.filmed ? 'TRUE' : 'FALSE',
                  item.filmingDate,
                  editForm.by,
                  editForm.storage,
                  editForm.notes,
                  editForm.driveRaw,
                  editForm.editorCol,
                  nextDone ? 'TRUE' : 'FALSE',
                  editForm.driveFinal,
                  item.canceled ? 'TRUE' : 'FALSE',
                  item.missingDetails ? 'TRUE' : 'FALSE'
                ];
                try {
                  await onUpdateShootingRow(item.id, rowData);
                } catch(e) {
                  console.error(e);
                } finally {
                  setIsSaving(false);
                }
              }}
              className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all duration-300 cursor-pointer ${
                isDone ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/10 text-muted hover:bg-emerald-500/30 hover:text-emerald-300'
              }`}
              title="تم الإنجاز"
            >
              {isDone && <CheckCircle2 size={14} />}
            </button>
          </td>
          {/* Cancel Checkmark */}
          <td className="px-3 py-5 text-center">
            <button
              onClick={async () => {
                if (!item.id) { alert("لا يمكن تعديل هذا الصف لعدم وجود كود (Code)"); return; }
                if (!onUpdateShootingRow) return;
                setIsSaving(true);
                const nextCanceled = !isCanceled;
                const rowData = [
                  item.date,
                  editForm.branch,
                  editForm.year,
                  editForm.teacher,
                  editForm.extraName,
                  item.id,
                  editForm.script,
                  editForm.type,
                  editForm.format,
                  item.filmed ? 'TRUE' : 'FALSE',
                  item.filmingDate,
                  editForm.by,
                  editForm.storage,
                  editForm.notes,
                  editForm.driveRaw,
                  editForm.editorCol,
                  item.done ? 'TRUE' : 'FALSE',
                  editForm.driveFinal,
                  nextCanceled ? 'TRUE' : 'FALSE',
                  item.missingDetails ? 'TRUE' : 'FALSE'
                ];
                try {
                  await onUpdateShootingRow(item.id, rowData);
                } catch(e) {
                  console.error(e);
                } finally {
                  setIsSaving(false);
                }
              }}
              className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all duration-300 cursor-pointer ${
                isCanceled 
                  ? activeGid === '798246690' 
                    ? 'bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]' 
                    : 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                  : activeGid === '798246690'
                    ? 'bg-white/10 text-muted hover:bg-amber-500/30 hover:text-amber-300'
                    : 'bg-white/10 text-muted hover:bg-rose-500/30 hover:text-rose-300'
              }`}
              title={activeGid === '798246690' ? "مشكلة" : "ملغي"}
            >
              {isCanceled && (activeGid === '798246690' ? <AlertCircle size={14} /> : <XCircle size={14} />)}
            </button>
          </td>
        </>
      )}
      <td className="px-4 py-5 text-center">
        <div className="flex flex-col gap-2 items-center justify-center">
          {isEditingFinal ? (
            <input 
              autoFocus
              type="text" 
              value={editForm.driveFinal} 
              onChange={e => setEditForm({...editForm, driveFinal: e.target.value})}
              onBlur={() => {
                setIsEditingFinal(false);
                if (editForm.driveFinal !== item.driveFinal) {
                  handleFieldChange('driveFinal', editForm.driveFinal);
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              className="w-full max-w-[150px] bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-center text-white/90 outline-none transition-all focus:bg-[#0b1019] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 text-left" 
              placeholder="Paste Final Drive Link..."
            />
          ) : (
            <div className="flex items-center justify-center gap-1.5">
              {item.driveFinal ? (
                (() => {
                  const parsed = parseDriveLink(item.driveFinal);
                  return (
                    <a 
                      href={parsed.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-mono text-[11px] underline cursor-pointer shadow-sm shrink-0 truncate max-w-[220px]"
                      title={parsed.url}
                    >
                      {parsed.url}
                    </a>
                  );
                })()
              ) : (
                <span className="text-muted/40 text-xs px-2 shrink-0">---</span>
              )}
              <button 
                onClick={() => setIsEditingFinal(true)} 
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-muted hover:text-white transition-all scale-95 cursor-pointer shrink-0" 
                title="تعديل لينك فاينال"
              >
                <Pencil size={11} />
              </button>
            </div>
          )}
        </div>
      </td>
    </motion.tr>
  );
};

// ─── CUTS Row ───────────────────────────────────────────────────────────────
const CutsRow = ({ 
  item, 
  index, 
  onUpdateShootingRow, 
  liveData, 
  optionsLists, 
  autofillDrag, 
  setAutofillDrag, 
  onApplyAutofill, 
  activeCell, 
  setActiveCell,
  toast,
  isSubscribed,
  onToggleSubscribe
}: any) => {
  const [editForm, setEditForm] = useState({
    branch: item.branch || '',
    year: item.year || '',
    creator: item.creator || '',
    type: item.type || '',
    format: item.format || '',
    dataFiles: item.dataFiles || '',
    script: item.script || '',
    creatorNotes: item.creatorNotes || '',
    editorNotes: item.editorNotes || '',
    editor: item.editor || '',
    driveFinal: item.driveFinal || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingDataFiles, setIsEditingDataFiles] = useState(false);
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [isEditingFinal, setIsEditingFinal] = useState(false);
  const [copied, setCopied] = useState(false);
  const { profile } = useAuth();

  const parseCutsLink = (val: string, fallbackText: string) => {
    if (!val) return null;
    let s = String(val).trim();
    
    // Hyperlink formula
    const hyperlinkRegex = /=HYPERLINK\s*\(\s*(['"])(.*?)\1\s*,\s*(['"])(.*?)\3\s*\)/i;
    const formulaMatch = s.match(hyperlinkRegex);
    if (formulaMatch) {
      let url = formulaMatch[2].trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      return {
        url,
        text: formulaMatch[4].trim(),
        isLink: true
      };
    }
    
    let url = s;
    const driveIdRegex = /^[a-zA-Z0-9_-]{25,55}$/;
    
    if (url.includes('drive.google.com') || url.includes('docs.google.com') || url.includes('spreadsheets/d/') || url.includes('document/d/') || url.includes('file/d/')) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.startsWith('drive.google.com') || url.startsWith('docs.google.com')) {
          url = 'https://' + url;
        } else if (url.startsWith('www.drive.google.com') || url.startsWith('www.docs.google.com')) {
          url = 'https://' + url;
        } else {
          if (url.startsWith('/')) url = url.substring(1);
          if (url.startsWith('file/d/')) {
            url = 'https://drive.google.com/' + url;
          } else if (url.startsWith('d/')) {
            url = 'https://drive.google.com/file/' + url;
          } else {
            url = 'https://' + url;
          }
        }
      }
      return {
        url,
        text: fallbackText,
        isLink: true
      };
    } else if (driveIdRegex.test(url)) {
      url = `https://drive.google.com/file/d/${url}/view?usp=sharing`;
      return {
        url,
        text: fallbackText,
        isLink: true
      };
    } else if (!url.startsWith('http://') && !url.startsWith('https://') && url.includes('.')) {
      url = 'https://' + url;
      return {
        url,
        text: fallbackText,
        isLink: true
      };
    }
    
    // Plain text
    return {
      url: null,
      text: s,
      isLink: false
    };
  };

  useEffect(() => {
    setEditForm({
      branch: item.branch || '',
      year: item.year || '',
      creator: item.creator || '',
      type: item.type || '',
      format: item.format || '',
      dataFiles: item.dataFiles || '',
      script: item.script || '',
      creatorNotes: item.creatorNotes || '',
      editorNotes: item.editorNotes || '',
      editor: item.editor || '',
      driveFinal: item.driveFinal || ''
    });
  }, [item]);

  const handleFieldChange = async (fieldName: string, value: string) => {
    const updatedForm = { ...editForm, [fieldName]: value };
    setEditForm(updatedForm);

    if (!onUpdateShootingRow) return;
    setIsSaving(true);

    let targetCode = item.id;
    if (fieldName === 'year' || fieldName === 'creator') {
      const parts = String(item.id).split('-');
      if (parts.length >= 4) {
        const currentYear = fieldName === 'year' ? value : updatedForm.year;
        const currentCreator = fieldName === 'creator' ? value : updatedForm.creator;
        const sequencePart = parts[3]; // e.g. "03 v6" or "00 v6"
        targetCode = `${currentYear}-cut-${currentCreator}-${sequencePart}`.toLowerCase().replace(/\s+/g, ' ');
      }
    }

    // Done status logic: if fieldName is 'driveFinal' and the value is empty/invalid,
    // we automatically uncheck done for everyone!
    let nextDoneStatus = item.done;
    if (fieldName === 'driveFinal' && item.done) {
      const val = String(value || '').trim();
      const driveIdRegex = /^[a-zA-Z0-9_-]{25,55}$/;
      const isValidLink = val && (val.toLowerCase() === 'تم' || val.includes('http://') || val.includes('https://') || val.includes('drive.google.com') || val.includes('docs.google.com') || driveIdRegex.test(val));
      if (!isValidLink) {
        nextDoneStatus = false;
      }
    }

    const rowData = [
      item.date,
      updatedForm.branch,
      updatedForm.year,
      item.typeCol, // static
      updatedForm.creator,
      targetCode,   // dynamically updated code!
      updatedForm.dataFiles,
      updatedForm.script,
      updatedForm.type,
      updatedForm.format,
      updatedForm.creatorNotes,
      updatedForm.editorNotes,
      item.missingDetails ? 'TRUE' : 'FALSE',
      item.problem ? 'TRUE' : 'FALSE',
      nextDoneStatus ? 'TRUE' : 'FALSE',
      updatedForm.editor,
      updatedForm.driveFinal,
      item.canceled ? 'TRUE' : 'FALSE'
    ];
    try {
      await onUpdateShootingRow(item.id, rowData);
    } catch(e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (fieldName: string, currentVal: boolean) => {
    if (!item.id) { alert("لا يمكن تعديل هذا الصف لعدم وجود كود (Code)"); return; }
    if (!onUpdateShootingRow) return;
    setIsSaving(true);
    const newVal = !currentVal;

    // Done status validation
    if (fieldName === 'done' && newVal) {
      const finalVal = String(editForm.driveFinal || '').trim();
      const driveIdRegex = /^[a-zA-Z0-9_-]{25,55}$/;
      if (!finalVal || (finalVal.toLowerCase() !== 'تم' && !finalVal.includes('http://') && !finalVal.includes('https://') && !finalVal.includes('drive.google.com') && !finalVal.includes('docs.google.com') && !driveIdRegex.test(finalVal))) {
        if (toast && toast.error) {
          toast.error("لا يمكن تحديد المهمة كمكتملة (Done) إلا بعد إضافة رابط المونتاج النهائي (Final Link) أو كتابة 'تم'");
        } else {
          alert("لا يمكن تحديد المهمة كمكتملة (Done) إلا بعد إضافة رابط المونتاج النهائي (Final Link) أو كتابة 'تم'");
        }
        setIsSaving(false);
        return;
      }
    }
    
    const rowData = [
      item.date,
      editForm.branch,
      editForm.year,
      item.typeCol,
      editForm.creator,
      item.id,
      editForm.dataFiles,
      editForm.script,
      editForm.type,
      editForm.format,
      editForm.creatorNotes,
      editForm.editorNotes,
      fieldName === 'missingDetails' ? (newVal ? 'TRUE' : 'FALSE') : (item.missingDetails ? 'TRUE' : 'FALSE'),
      fieldName === 'problem' ? (newVal ? 'TRUE' : 'FALSE') : (item.problem ? 'TRUE' : 'FALSE'),
      fieldName === 'done' ? (newVal ? 'TRUE' : 'FALSE') : (item.done ? 'TRUE' : 'FALSE'),
      editForm.editor,
      editForm.driveFinal,
      fieldName === 'canceled' ? (newVal ? 'TRUE' : 'FALSE') : (item.canceled ? 'TRUE' : 'FALSE')
    ];
    
    try {
      await onUpdateShootingRow(item.id, rowData);
    } catch(e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle = "w-full bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-center text-white/90 outline-none transition-all focus:bg-[#0b1019] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30";

  const isCanceled = item.canceled === true || item.canceled === 'TRUE';
  const isProblem = item.problem === true || item.problem === 'TRUE';
  const isMissing = item.missingDetails === true || item.missingDetails === 'TRUE';
  const isDone = item.done === true || item.done === 'TRUE';

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.01 }}
      className={`transition-all duration-300 border-b border-white/[0.03] row-hover ${
        isCanceled || isProblem
          ? 'bg-rose-500/[0.06] hover:bg-rose-500/[0.12] border-rose-500/20 text-rose-100/90' 
          : isMissing 
            ? 'bg-amber-500/[0.06] hover:bg-amber-500/[0.12] border-amber-500/20 text-amber-100/90' 
            : isDone 
              ? 'bg-emerald-500/[0.06] hover:bg-emerald-500/[0.12] border-emerald-500/20 text-emerald-100/90' 
              : ''
      }`}
    >
      <td className="px-4 py-5 text-center"><span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-bold text-blue-400 shrink-0">{item.date || '---'}</span></td>
      
      <AutofillCell colKey="branch" rowIndex={index} value={editForm.branch} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
        <InlineCombobox options={optionsLists?.branches} value={editForm.branch} onChange={(val: string) => handleFieldChange('branch', val)} />
      </AutofillCell>

      <AutofillCell colKey="year" rowIndex={index} value={editForm.year} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
        <InlineCombobox options={optionsLists?.years} value={editForm.year} onChange={(val: string) => handleFieldChange('year', val)} />
      </AutofillCell>

      <td className="px-3 py-5 text-center"><Chip value={item.typeCol} /></td>
      
      <AutofillCell colKey="creator" rowIndex={index} value={editForm.creator} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
        <InlineCombobox options={optionsLists?.extraNames} value={editForm.creator} onChange={(val: string) => handleFieldChange('creator', val)} />
      </AutofillCell>

      <td className="px-3 py-5 text-center">
        <div className="flex items-center justify-center gap-2">
          <div 
            onClick={() => {
              if (item.id) {
                navigator.clipboard.writeText(item.id);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/30 transition-all duration-200 cursor-pointer shadow-sm text-xs font-mono font-bold text-emerald-400 hover:scale-[1.02] active:scale-95 group whitespace-nowrap"
            title="اضغط لنسخ الكود"
          >
            <span className="tracking-wide">{item.id || '---'}</span>
            {copied ? (
              <Check size={12} className="text-emerald-400 shrink-0 animate-fadeIn" />
            ) : (
              <Copy size={12} className="text-emerald-500/40 group-hover:text-emerald-400 transition-colors shrink-0" />
            )}
          </div>
          <button 
            onClick={() => onToggleSubscribe(item.id)}
            className={`transition-all duration-300 cursor-pointer p-2 rounded-xl border flex items-center justify-center ${
              isSubscribed 
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-400 scale-105 shadow-[0_0_10px_rgba(244,63,94,0.2)]' 
                : 'border-white/10 bg-white/5 text-white/30 hover:border-white/30 hover:bg-white/10 hover:text-white/60'
            }`}
            title={isSubscribed ? 'إلغاء المتابعة' : 'متابعة هذا السكريبت'}
          >
            <Bell size={12} className={isSubscribed ? 'animate-pulse' : ''} />
          </button>
        </div>
      </td>

      <AutofillCell colKey="dataFiles" rowIndex={index} value={editForm.dataFiles} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length} className="px-4 py-5 text-right font-bold arabic-text">
        {isEditingDataFiles ? (
          <input 
            autoFocus
            type="text" 
            value={editForm.dataFiles} 
            onChange={e => setEditForm({...editForm, dataFiles: e.target.value})}
            onBlur={() => {
              setIsEditingDataFiles(false);
              if (editForm.dataFiles !== item.dataFiles) {
                handleFieldChange('dataFiles', editForm.dataFiles);
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            className={inputStyle + " min-w-[150px] text-left"} 
            placeholder="Paste Link..."
          />
        ) : (
          <div className="flex items-center justify-end gap-2">
            {(() => {
              const parsed = parseCutsLink(item.dataFiles, 'Files Link');
              if (!parsed) return <span className="text-muted/40 text-xs px-2 shrink-0">---</span>;
              
              if (parsed.isLink) {
                return (
                  <a 
                    href={parsed.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-[11px] font-extrabold transition-all text-blue-400 shadow-sm shrink-0 hover:scale-[1.02] active:scale-95 cursor-pointer"
                  >
                    <FolderOpen size={12} className="shrink-0 text-blue-400" />
                    <span className="truncate max-w-[130px] arabic-text" title={parsed.url}>{parsed.text}</span>
                  </a>
                );
              } else {
                return (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[11px] font-bold text-white/90 shadow-sm shrink-0">
                    <span className="truncate max-w-[130px] arabic-text" title={parsed.text}>{parsed.text}</span>
                  </span>
                );
              }
            })()}
            <button 
              onClick={() => setIsEditingDataFiles(true)} 
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-muted hover:text-white transition-all scale-95 cursor-pointer shrink-0" 
              title="تعديل لينك الملفات"
            >
              <Pencil size={11} />
            </button>
          </div>
        )}
      </AutofillCell>

      <AutofillCell colKey="script" rowIndex={index} value={editForm.script} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length} className="px-4 py-5 text-right font-bold arabic-text">
        {isEditingScript ? (
          <input 
            autoFocus
            type="text" 
            value={editForm.script} 
            onChange={e => setEditForm({...editForm, script: e.target.value})}
            onBlur={() => {
              setIsEditingScript(false);
              if (editForm.script !== item.script) {
                handleFieldChange('script', editForm.script);
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            className={inputStyle + " min-w-[150px] text-left"} 
            placeholder="Paste Link..."
          />
        ) : (
          <div className="flex items-center justify-end gap-2">
            {(() => {
              const parsed = parseCutsLink(item.script, 'Idea/Content Link');
              if (!parsed) return <span className="text-muted/40 text-xs px-2 shrink-0">---</span>;
              
              if (parsed.isLink) {
                return (
                  <a 
                    href={parsed.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-[11px] font-extrabold transition-all text-blue-400 shadow-sm shrink-0 hover:scale-[1.02] active:scale-95 cursor-pointer"
                  >
                    <FolderOpen size={12} className="shrink-0 text-blue-400" />
                    <span className="truncate max-w-[130px] arabic-text" title={parsed.url}>{parsed.text}</span>
                  </a>
                );
              } else {
                return (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[11px] font-bold text-white/90 shadow-sm shrink-0">
                    <span className="truncate max-w-[130px] arabic-text" title={parsed.text}>{parsed.text}</span>
                  </span>
                );
              }
            })()}
            <button 
              onClick={() => setIsEditingScript(true)} 
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-muted hover:text-white transition-all scale-95 cursor-pointer shrink-0" 
              title="تعديل الشرح"
            >
              <Pencil size={11} />
            </button>
          </div>
        )}
      </AutofillCell>

      <AutofillCell colKey="type" rowIndex={index} value={editForm.type} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
        <InlineCombobox options={optionsLists?.types} value={editForm.type} onChange={(val: string) => handleFieldChange('type', val)} />
      </AutofillCell>

      <AutofillCell colKey="format" rowIndex={index} value={editForm.format} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
        <InlineCombobox options={optionsLists?.formats} value={editForm.format} onChange={(val: string) => handleFieldChange('format', val)} />
      </AutofillCell>

      <AutofillCell colKey="creatorNotes" rowIndex={index} value={editForm.creatorNotes} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length} className="px-5 py-5 text-center text-xs font-bold text-white/90 arabic-text">
        <HistoryInput
          itemKey={item.id}
          fieldKey="cuts_creator_notes"
          value={editForm.creatorNotes}
          onChange={(val: string) => handleFieldChange('creatorNotes', val)}
          placeholder="ملاحظات المبتكر..."
          disabled={false}
        />
      </AutofillCell>

      <AutofillCell colKey="editorNotes" rowIndex={index} value={editForm.editorNotes} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length} className="px-5 py-5 text-center text-xs font-bold text-white/90 arabic-text">
        <HistoryInput
          itemKey={item.id}
          fieldKey="cuts_editor_notes"
          value={editForm.editorNotes}
          onChange={(val: string) => handleFieldChange('editorNotes', val)}
          placeholder="ملاحظات المحرر..."
          disabled={false}
        />
      </AutofillCell>

      {/* Missing Details Checkmark (تفاصيل ناقصة) - amber-500 (yellow) */}
      <td className="px-3 py-5 text-center">
        <button
          onClick={() => toggleStatus('missingDetails', isMissing)}
          className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all duration-300 cursor-pointer ${
            isMissing ? 'bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-white/10 text-muted hover:bg-amber-500/30 hover:text-amber-300'
          }`}
          title="تفاصيل ناقصة"
        >
          {isMissing && <CheckCircle2 size={14} />}
        </button>
      </td>

      {/* Problem Checkmark (مشكلة) - rose-500 (red) */}
      <td className="px-3 py-5 text-center">
        <button
          onClick={() => toggleStatus('problem', isProblem)}
          className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all duration-300 cursor-pointer ${
            isProblem ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-white/10 text-muted hover:bg-rose-500/30 hover:text-rose-300'
          }`}
          title="مشكلة"
        >
          {isProblem && <CheckCircle2 size={14} />}
        </button>
      </td>

      {/* DONE Checkmark (DONE) - emerald-500 (green) */}
      <td className="px-3 py-5 text-center">
        <button
          onClick={() => toggleStatus('done', isDone)}
          className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all duration-300 cursor-pointer ${
            isDone ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/10 text-muted hover:bg-emerald-500/30 hover:text-emerald-300'
          }`}
          title="تم الإنجاز"
        >
          {isDone && <CheckCircle2 size={14} />}
        </button>
      </td>

      <AutofillCell colKey="editor" rowIndex={index} value={editForm.editor} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
        <InlineCombobox options={optionsLists?.editors} value={editForm.editor} onChange={(val: string) => handleFieldChange('editor', val)} />
      </AutofillCell>

      <td className="px-4 py-5 text-center">
        <div className="flex flex-col gap-2 items-center justify-center">
          {isEditingFinal ? (
            <input 
              autoFocus
              type="text" 
              value={editForm.driveFinal} 
              onChange={e => setEditForm({...editForm, driveFinal: e.target.value})}
              onBlur={() => {
                setIsEditingFinal(false);
                if (editForm.driveFinal !== item.driveFinal) {
                  handleFieldChange('driveFinal', editForm.driveFinal);
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              className="w-full max-w-[150px] bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-center text-white/90 outline-none transition-all focus:bg-[#0b1019] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 text-left" 
              placeholder="Paste Final Link..."
            />
          ) : (
            <div className="flex items-center justify-center gap-1.5">
              {item.driveFinal ? (
                (() => {
                  const parsed = parseCutsLink(item.driveFinal, 'Final');
                  return (
                    <a 
                      href={parsed?.url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-mono text-[11px] underline cursor-pointer shadow-sm shrink-0 truncate max-w-[220px]"
                      title={parsed?.url || ''}
                    >
                      {parsed?.url || ''}
                    </a>
                  );
                })()
              ) : (
                <span className="text-muted/40 text-xs px-2 shrink-0">---</span>
              )}
              <button 
                onClick={() => setIsEditingFinal(true)} 
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-muted hover:text-white transition-all scale-95 cursor-pointer shrink-0" 
                title="تعديل لينك فاينال"
              >
                <Pencil size={11} />
              </button>
            </div>
          )}
          {isSaving && (
            <span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin block" title="جاري الحفظ تلقائياً..." />
          )}
        </div>
      </td>

      {/* Canceled Checkmark (CANCELO) - red-500 (red) */}
      <td className="px-3 py-5 text-center">
        <button
          onClick={() => toggleStatus('canceled', isCanceled)}
          className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all duration-300 cursor-pointer ${
            isCanceled ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-white/10 text-muted hover:bg-red-500/30 hover:text-red-300'
          }`}
          title="ملغي"
        >
          {isCanceled && <CheckCircle2 size={14} />}
        </button>
      </td>
    </motion.tr>
  );
};

const TAGME_DAILY_PRIORITY_LIMIT = 10;

const TagmeAnalyticsDashboard = ({ combinedData, tagmeTransfers, loading, taskStatuses, taskPriorities }: any) => {
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
    const priorityLimitPct = Math.min(100, Math.round((priority / TAGME_DAILY_PRIORITY_LIMIT) * 100));
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

    return { 
      total, 
      completed, 
      pending, 
      priority, 
      priorityLimitPct,
      transfersCount, 
      stageMap: Object.entries(stageMap).sort((a,b) => b[1].count - a[1].count), 
      editorMap: Object.entries(editorMap).sort((a,b) => b[1].count - a[1].count),
      branchMap: Object.entries(branchMap).sort((a,b) => b[1].count - a[1].count)
    };
  }, [combinedData, tagmeTransfers, taskStatuses, taskPriorities]);

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
              stats.priority >= TAGME_DAILY_PRIORITY_LIMIT ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-purple-500/20 text-purple-400 animate-pulse'
            }`}>
              <AlertCircle size={20} />
            </div>
          </div>
          <h3 className={`text-4xl font-black tracking-tight ${
            stats.priority >= TAGME_DAILY_PRIORITY_LIMIT ? 'text-rose-400' : 'text-purple-400'
          }`}>{stats.priority}<span className="text-base text-muted font-bold">/{TAGME_DAILY_PRIORITY_LIMIT}</span></h3>
          <div className="mt-2 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${
              stats.priority >= TAGME_DAILY_PRIORITY_LIMIT ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-purple-500'
            }`} style={{ width: `${stats.priorityLimitPct}%` }} />
          </div>
          <p className={`text-[10px] mt-1.5 arabic-text opacity-80 font-bold ${
            stats.priority >= TAGME_DAILY_PRIORITY_LIMIT ? 'text-rose-300' : 'text-purple-300'
          }`}>
            {stats.priority >= TAGME_DAILY_PRIORITY_LIMIT ? '🔒 الحد الأقصى ممتلئ!' : `${TAGME_DAILY_PRIORITY_LIMIT - stats.priority} متبقي من الحد`}
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
            stats.priority >= TAGME_DAILY_PRIORITY_LIMIT 
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' 
              : 'bg-purple-500/15 border-purple-500/30 text-purple-400'
          }`}>
            {stats.priority} / {TAGME_DAILY_PRIORITY_LIMIT}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const { profile, signOut, session } = useAuth();
  const [rolePermissions, setRolePermissions] = useState<any>(DEFAULT_ROLE_PERMISSIONS);
  const [activeGid, setActiveGid] = useState('1476192399');
  const [activeLabel, setActiveLabel] = useState('Operations');
  const [appMode, setAppMode] = useState<'OP' | 'REELS' | 'DESIGNERS'>('OP');
  const isUsersPage = activeGid === '__users__';

  const isOperations = activeGid === '1476192399';
  const isTagme3at = activeGid === '1535230545';
  const isAnalyticsTagme = activeGid === 'analytics_tagme3at';
  const isReelsAnalytics = activeGid === 'reels-analytics';
  const isDesignersPage = activeGid === '501319673';
  const isDesignAnalytics = activeGid === 'design-analytics';
  const isDesignersMode = isDesignersPage || isDesignAnalytics;

  const isReelsStage = ['1436746012', '1939073164', '0', '798246690'].includes(activeGid);
  const isStage = !isOperations && !isTagme3at && !isAnalyticsTagme && !isReelsAnalytics && !isDesignersMode;

  const sheetGidToFetch = isAnalyticsTagme 
    ? '1535230545' 
    : isReelsAnalytics 
    ? '1436746012' 
    : isDesignAnalytics 
    ? '501319673' 
    : activeGid;

  const activeDocId = isReelsStage 
    ? '2PACX-1vTvcQ3v1JOzacx9tcsYrbriofFyHlu7rOKKlsobvpP9vjnbHGcg_Qn9TLlbkgB2YsGiX0GO1U4wlZjd' 
    : isDesignersMode 
    ? '2PACX-1vRkOH2-jRtYqmkf0opn6in9TMg3oOo6FBvlGfkJjhDwn-t-CSYyrTbn4EDjNCFdvKL7tQG6nQ--jSdC' 
    : undefined;
  const { data: liveData, updateData: setLiveData, loading, refresh } = useGoogleSheets(sheetGidToFetch, activeDocId);

  const [itemToasts, setItemToasts] = useState<{ id: string, name: string, filingName?: string }[]>([]);

  const toast = useMemo(() => {
    const show = (msg: string, variant: 'success' | 'error' | 'loading' = 'success', options?: { id?: string }) => {
      const id = options?.id || 'toast-' + Math.random().toString(36).substr(2, 9);
      const icon = variant === 'success' ? '✅' : variant === 'error' ? '❌' : '⏳';
      
      setItemToasts(prev => {
        const filtered = prev.filter(t => t.id !== id);
        return [...filtered, { id, name: `${icon} ${msg}` }];
      });

      if (variant !== 'loading') {
        setTimeout(() => {
          setItemToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
      }
      return id;
    };
    return {
      success: (msg: string, options?: { id?: string }) => show(msg, 'success', options),
      error: (msg: string, options?: { id?: string }) => show(msg, 'error', options),
      loading: (msg: string, options?: { id?: string }) => show(msg, 'loading', options),
      dismiss: (id: string) => {
        setItemToasts(prev => prev.filter(t => t.id !== id));
      }
    };
  }, []);

  // Background polling every 45 seconds to fetch changes silently
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !loading) {
        refresh(true); // silent refresh
      }
    }, 45000);
    return () => clearInterval(interval);
  }, [refresh, loading]);

  const currentUserName = profile?.name || localStorage.getItem('user_editor_name') || 'ESLAM';
  const [isMyTasksOnly, setIsMyTasksOnly] = useState(false);

  const [pinnedTabs, setPinnedTabs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mktg_pinned_tabs');
      return saved ? JSON.parse(saved) : ['1476192399', '1535230545'];
    } catch {
      return ['1476192399', '1535230545'];
    }
  });

  const togglePinTab = (gid: string) => {
    setPinnedTabs(prev => {
      const updated = prev.includes(gid) ? prev.filter(g => g !== gid) : [...prev, gid];
      try { localStorage.setItem('mktg_pinned_tabs', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const [customPresets, setCustomPresets] = useState<{ id: string, name: string, teacherFilter: string, yearFilter: string, termFilter: string, statusFilter: string, activeGid: string }[]>(() => {
    try {
      const saved = localStorage.getItem('mktg_custom_presets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newPresetName, setNewPresetName] = useState('');
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);

  const saveCurrentPreset = () => {
    if (!newPresetName.trim()) return;
    const preset = {
      id: 'preset-' + Date.now(),
      name: newPresetName.trim(),
      teacherFilter,
      yearFilter,
      termFilter,
      statusFilter,
      activeGid,
    };
    const updated = [...customPresets, preset];
    setCustomPresets(updated);
    try { localStorage.setItem('mktg_custom_presets', JSON.stringify(updated)); } catch {}
    setNewPresetName('');
    setShowSavePresetModal(false);
    toast.success(`تم حفظ الفلتر "${preset.name}" بنجاح!`);
  };

  const deletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customPresets.filter(p => p.id !== id);
    setCustomPresets(updated);
    try { localStorage.setItem('mktg_custom_presets', JSON.stringify(updated)); } catch {}
    toast.success('تم حذف الفلتر المحفوظ');
  };

  const applyPreset = (preset: any) => {
    if (preset.activeGid && preset.activeGid !== activeGid) {
      setActiveGid(preset.activeGid);
    }
    setTeacherFilter(preset.teacherFilter || 'All');
    setYearFilter(preset.yearFilter || 'All');
    setTermFilter(preset.termFilter || 'All');
    setStatusFilter(preset.statusFilter || 'All');
    toast.success(`تم تطبيق الفلتر: ${preset.name}`);
  };

  const jumpToTask = (taskId: string) => {
    const el = document.getElementById(taskId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-rose-500', 'bg-rose-500/20', 'shadow-[0_0_30px_rgba(244,63,94,0.5)]');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-rose-500', 'bg-rose-500/20', 'shadow-[0_0_30px_rgba(244,63,94,0.5)]');
      }, 2500);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [teacherFilter, setTeacherFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [termFilter, setTermFilter] = useState('All');
  const [bypassYearTerm, setBypassYearTerm] = useState(false);
  const [tagmeViewMode, setTagmeViewMode] = useState<'SIMPLE' | 'DETAILED'>('SIMPLE');
  const [colFilters, setColFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    setBypassYearTerm(false);
  }, [teacherFilter, activeGid]);

  const [newItems, setNewItems] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // ─── Personal Notifications via Supabase Realtime Broadcast ───────────────
  type PersonalNotif = { id: string; taskName: string; message: string; type: string; from: string; at: number; read: boolean; };
  const [myNotifs, setMyNotifs] = useState<PersonalNotif[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('my_notifications') || '[]');
    } catch (e) {
      return [];
    }
  });
  const [showMyNotifs, setShowMyNotifs] = useState(false);
  const unreadCount = myNotifs.filter(n => !n.read).length;

  useEffect(() => {
    localStorage.setItem('my_notifications', JSON.stringify(myNotifs));
  }, [myNotifs]);




  const [youtubeItems, setYoutubeItems] = useState<{ [gid: string]: any[] }>({});
  const [bunnyLinkModal, setBunnyLinkModal] = useState<{ isOpen: boolean, itemKey: string, itemName: string, initialUrl: string } | null>(null);
  const [activeToast, setActiveToast] = useState<{ item: any, stage: { gid: string, label: string }, uniqueKey: string } | null>(null);
  const [selectedForMerge, setSelectedForMerge] = useState<any[]>([]);

  const [tagmeTransfers, setTagmeTransfers] = useState<any[]>([]);
  const [activeTagmeToast, setActiveTagmeToast] = useState<{ item: any, stage: { gid: string, label: string }, uniqueKey: string } | null>(null);
const [activeVeToast, setActiveVeToast] = useState<{ item: any } | null>(null);

  const [assignedEditors, setAssignedEditors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('assigned_editors');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  const [editorNotes, setEditorNotes] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('editor_notes');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  const [marketingNotes, setMarketingNotes] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('marketing_notes');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  const [assignedOpSheets, setAssignedOpSheets] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('assigned_opsheets');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  const [assignedBranches, setAssignedBranches] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('assigned_branches');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  const [assignedDates, setAssignedDates] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('assigned_dates');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  const [taskPriorities, setTaskPriorities] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('task_priorities');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  const [taskStatuses, setTaskStatuses] = useState<Record<string, { done: boolean, cancel: boolean }>>(() => {
    const saved = localStorage.getItem('task_statuses');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  const [assignedBunnyLinks, setAssignedBunnyLinks] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('assigned_bunny_links');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  const [assignedThumbnailLinks, setAssignedThumbnailLinks] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('assigned_thumbnail_links');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  const [assignedTimes, setAssignedTimes] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('assigned_times');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  const [assignedYoutubeLinks, setAssignedYoutubeLinks] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('assigned_youtube_links');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  const [uploadedStatuses, setUploadedStatuses] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('uploaded_statuses');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  const [assignedWeeks, setAssignedWeeks] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('assigned_weeks');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  const handleUpdateWeek = (itemKey: string, val: string) => {
    setAssignedWeeks(prev => {
      const updated = { ...prev, [itemKey]: val };
      const taskName = findTaskName(itemKey);
      syncState('assigned_weeks', updated, itemKey, taskName, 'week', `🗓️ تم تعديل الأسبوع إلى: ${val || 'غير محدد'}`);
      return updated;
    });
  };

  const handleUpdateDate = (itemKey: string, val: string) => {
    setAssignedDates(prev => {
      const updated = { ...prev, [itemKey]: val };
      const taskName = findTaskName(itemKey);
      syncState('assigned_dates', updated, itemKey, taskName, 'date', `📅 تم تعديل التاريخ إلى: ${val || 'غير محدد'}`);
      return updated;
    });
  };

  const handleUpdateBunnyLink = (itemKey: string, val: string) => {
    setAssignedBunnyLinks(prev => {
      const updated = { ...prev, [itemKey]: val };
      const taskName = findTaskName(itemKey);
      syncState('assigned_bunny_links', updated, itemKey, taskName, 'bunny_link', `🔗 تم تحديث رابط الفيديو`);
      return updated;
    });
  };

  const handleUpdateThumbnailLink = (itemKey: string, val: string) => {
    setAssignedThumbnailLinks(prev => {
      const updated = { ...prev, [itemKey]: val };
      const taskName = findTaskName(itemKey);
      syncState('assigned_thumbnail_links', updated, itemKey, taskName, 'thumbnail_link', `🖼️ تم تحديث رابط الثمنيل`);
      return updated;
    });
  };

  const handleUpdateTime = (itemKey: string, val: string) => {
    setAssignedTimes(prev => {
      const updated = { ...prev, [itemKey]: val };
      const taskName = findTaskName(itemKey);
      syncState('assigned_times', updated, itemKey, taskName, 'time', `⏱️ تم تحديث وقت الدرس إلى: ${val}`);
      return updated;
    });
  };

  const handleUpdateYoutubeLink = (itemKey: string, val: string) => {
    setAssignedYoutubeLinks(prev => {
      const updated = { ...prev, [itemKey]: val };
      const taskName = findTaskName(itemKey);
      syncState('assigned_youtube_links', updated, itemKey, taskName, 'youtube_link', `📺 تم تحديث رابط اليوتيوب`);
      return updated;
    });
  };

  const handleUpdateUploaded = (itemKey: string, val: boolean) => {
    setUploadedStatuses(prev => {
      const updated = { ...prev, [itemKey]: val };
      const taskName = findTaskName(itemKey);
      syncState('uploaded_statuses', updated, itemKey, taskName, 'uploaded', val ? `📤 تم الرفع بنجاح` : `↩️ تم إلغاء رفع التجميعة`);
      return updated;
    });
  };

  const syncState = async (field: string, dict: any, itemKey: string, taskName: string, type: string, message: string) => {
    localStorage.setItem(field, JSON.stringify(dict));
    const token = session?.access_token || profile?.id;
    if (token) {
      if (activeGid === '1535230545' && itemKey && field !== 'tagme3at_transfers' && field !== 'youtube_transfers' && field !== 'assigned_bunny_links') {
        let updatePayload: any = {};
        if (field === 'editor_notes') updatePayload = { notesEditors: dict[itemKey] };
        else if (field === 'marketing_notes') updatePayload = { notesMarketing: dict[itemKey] };
        else if (field === 'assigned_editors') updatePayload = { editor: dict[itemKey] };
        else if (field === 'task_statuses') updatePayload = { done: dict[itemKey] === 'done' };
        else if (field === 'task_priorities') updatePayload = { priority: dict[itemKey] === true };
        else if (field === 'assigned_thumbnail_links') updatePayload = { thumbnailLink: dict[itemKey] };
        else if (field === 'assigned_times') updatePayload = { time: dict[itemKey] };
        else if (field === 'assigned_youtube_links') updatePayload = { youtubeLink: dict[itemKey] };
        else if (field === 'uploaded_statuses') updatePayload = { uploaded: dict[itemKey] === true };
        
        if (Object.keys(updatePayload).length > 0) {
          fetch(`/api/tagme3at/${itemKey}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(updatePayload)
          }).catch(e => console.error('SQL Sync Error:', e));
        }
      }

      fetch('/api/task-metadata', {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
         body: JSON.stringify({ field, metadata: dict })
      }).catch(e => console.error(e));
    }

    if (globalChannelRef.current && profile?.name) {
       globalChannelRef.current.send({
          type: 'broadcast',
          event: 'update',
          payload: { itemKey, taskName, message, type, from: profile.name, field, dict }
       });
    }
  };

  useEffect(() => {
    const token = session?.access_token || profile?.id;
    if (!token) return;
    fetch('/api/task-metadata', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
         if (data?.metadata) {
            const m = data.metadata;
            console.log('[Sync] Metadata loaded from server:', Object.keys(m));
            if (m.assigned_editors) { setAssignedEditors(m.assigned_editors); localStorage.setItem('assigned_editors', JSON.stringify(m.assigned_editors)); }
            if (m.editor_notes) { setEditorNotes(m.editor_notes); localStorage.setItem('editor_notes', JSON.stringify(m.editor_notes)); }
            if (m.marketing_notes) { setMarketingNotes(m.marketing_notes); localStorage.setItem('marketing_notes', JSON.stringify(m.marketing_notes)); }
            if (m.assigned_opsheets) { setAssignedOpSheets(m.assigned_opsheets); localStorage.setItem('assigned_opsheets', JSON.stringify(m.assigned_opsheets)); }
            if (m.assigned_branches) { setAssignedBranches(m.assigned_branches); localStorage.setItem('assigned_branches', JSON.stringify(m.assigned_branches)); }
            if (m.assigned_dates) { setAssignedDates(m.assigned_dates); localStorage.setItem('assigned_dates', JSON.stringify(m.assigned_dates)); }
            if (m.task_priorities) { setTaskPriorities(m.task_priorities); localStorage.setItem('task_priorities', JSON.stringify(m.task_priorities)); }
            if (m.task_statuses) { setTaskStatuses(m.task_statuses); localStorage.setItem('task_statuses', JSON.stringify(m.task_statuses)); }
            if (m.local_entries_v1) { setLocalEntries(m.local_entries_v1); localStorage.setItem('local_entries_v1', JSON.stringify(m.local_entries_v1)); }
            if (m.tagme3at_transfers) { setTagmeTransfers(m.tagme3at_transfers); localStorage.setItem('tagme3at_transfers', JSON.stringify(m.tagme3at_transfers)); }
            if (m.youtube_transfers) { setYoutubeItems(m.youtube_transfers); localStorage.setItem('youtube_transfers', JSON.stringify(m.youtube_transfers)); }
            if (m.assigned_bunny_links) { setAssignedBunnyLinks(m.assigned_bunny_links); localStorage.setItem('assigned_bunny_links', JSON.stringify(m.assigned_bunny_links)); }
         }
      })
      .catch(e => console.error(e));
  }, [session?.access_token, profile?.id]);

  const [subscribedTasks, setSubscribedTasks] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('subscribed_tasks') || '[]');
    } catch (e) {
      return [];
    }
  });

  const toggleSubscribe = (itemKey: string) => {
    const taskName = findTaskName(itemKey);
    const isSubscribing = !subscribedTasks.includes(itemKey);
    const next = isSubscribing 
      ? [...subscribedTasks, itemKey] 
      : subscribedTasks.filter(k => k !== itemKey);
      
    setSubscribedTasks(next);
    localStorage.setItem('subscribed_tasks', JSON.stringify(next));

    // Instantly inject a custom personal notification outside state callback
    const notif: PersonalNotif = {
      id: String(Date.now() + Math.random()),
      taskName: taskName,
      message: isSubscribing 
        ? `🔔 لقد قمت بمتابعة هذه المهمة بنجاح! ستصلك تنبيهات بأي تحديثات تطرأ عليها.` 
        : `🔕 تم إلغاء متابعة المهمة بنجاح.`,
      type: isSubscribing ? 'subscribe' : 'unsubscribe',
      from: 'النظام',
      at: Date.now(),
      read: false,
    };
    setMyNotifs(prevNotifs => [notif, ...prevNotifs].slice(0, 50));
  };

  const globalChannelRef = useRef<any>(null);
  const subscribedTasksRef = useRef<string[]>([]);
  const assignedEditorsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    subscribedTasksRef.current = subscribedTasks;
  }, [subscribedTasks]);

  useEffect(() => {
    assignedEditorsRef.current = assignedEditors;
  }, [assignedEditors]);

  useEffect(() => {
    if (!profile?.name) return;
    
    // Subscribe to user-specific channel
    const userChannelName = `notif:${profile.name.toLowerCase()}`;
    const userCh = supabase.channel(userChannelName);
    userCh.on('broadcast', { event: 'notify' }, ({ payload }: any) => {
      const notif: PersonalNotif = {
        id: String(Date.now() + Math.random()),
        taskName: payload.taskName || '',
        message: payload.message || '',
        type: payload.type || 'note',
        from: payload.from || '',
        at: Date.now(),
        read: false,
      };
      setMyNotifs(prev => [notif, ...prev].slice(0, 50));
    }).subscribe();

    // Subscribe to global channel for tasks
    const globalCh = supabase.channel('tasks:global', {
      config: { broadcast: { self: false } }
    });
    globalChannelRef.current = globalCh;
    globalCh.on('broadcast', { event: 'update' }, ({ payload }: any) => {
      const { itemKey, taskName, message, type, from, field, dict } = payload;
      if (!from || from.toLowerCase() === profile.name.toLowerCase()) return;
      
      if (field && dict) {
         console.log('[Sync] Received broadcast update:', field, 'from:', from);
         localStorage.setItem(field, JSON.stringify(dict));
         if (field === 'assigned_editors') setAssignedEditors(dict);
         else if (field === 'editor_notes') setEditorNotes(dict);
         else if (field === 'marketing_notes') setMarketingNotes(dict);
         else if (field === 'assigned_opsheets') setAssignedOpSheets(dict);
         else if (field === 'assigned_branches') setAssignedBranches(dict);
         else if (field === 'assigned_dates') setAssignedDates(dict);
         else if (field === 'task_priorities') setTaskPriorities(dict);
         else if (field === 'task_statuses') setTaskStatuses(dict);
         else if (field === 'local_entries_v1') setLocalEntries(dict);
         else if (field === 'tagme3at_transfers') setTagmeTransfers(dict);
         else if (field === 'youtube_transfers') setYoutubeItems(dict);
         else if (field === 'assigned_bunny_links') setAssignedBunnyLinks(dict);
         else if (field === 'assigned_thumbnail_links') setAssignedThumbnailLinks(dict);
         else if (field === 'assigned_times') setAssignedTimes(dict);
         else if (field === 'assigned_youtube_links') setAssignedYoutubeLinks(dict);
         else if (field === 'uploaded_statuses') setUploadedStatuses(dict);
      }

      const currentEditor = assignedEditorsRef.current[itemKey];
      
      // 1. Subscription-based receipt (user followed this row or is its assigned editor)
      const isSub = subscribedTasksRef.current.includes(itemKey) || (currentEditor && currentEditor.toLowerCase() === profile.name.toLowerCase());

      // 2. Manager or Admin global receipt (receives ALL activity logs and note writes in real time!)
      const isManagerOrAdmin = profile?.role === 'admin' || profile?.role === 'manager';

      // 3. Video team new additions receipt (receives any new VE/Shooting reel additions or Tagme3at transfers)
      const isVideoTeam = profile?.team?.toLowerCase() === 'video';
      const isNewVideoTask = isVideoTeam && (
        type === 'tagme_transfer' || 
        (type === 'new_entry' && (payload.activeGid === '1939073164' || payload.activeGid === '1436746012'))
      );

      if (isSub || isManagerOrAdmin || isNewVideoTask) {
        const notif: PersonalNotif = {
          id: String(Date.now() + Math.random()),
          taskName: taskName || itemKey,
          message,
          type,
          from,
          at: Date.now(),
          read: false,
        };
        setMyNotifs(prev => [notif, ...prev].slice(0, 50));
      }
    }).subscribe((status: string) => {
      console.log('[Sync] WebSocket channel status:', status);
    });

    return () => {
      supabase.removeChannel(userCh);
      supabase.removeChannel(globalCh);
    };
  }, [profile?.name]);

  const broadcastTaskUpdate = async (itemKey: string, taskName: string, message: string, type: string) => {
    if (!profile?.name || !globalChannelRef.current) return;
    try {
      await globalChannelRef.current.send({
        type: 'broadcast',
        event: 'update',
        payload: { itemKey, taskName, message, type, from: profile.name },
      });
    } catch (e) {
      console.error('Failed to broadcast task update:', e);
    }
  };

  function findTaskName(itemKey: string) {
    const found = combinedData.find(i => (i.uniqueKey || generateKey(i)) === itemKey || 'tgm-' + (i.uniqueKey || generateKey(i)) === itemKey);
    return found?.name || itemKey;
  }

  const handleUpdateEditor = (itemKey: string, newEditor: string) => {
    setAssignedEditors(prev => {
      const updated = { ...prev, [itemKey]: newEditor };
      const taskName = findTaskName(itemKey);
      syncState('assigned_editors', updated, itemKey, taskName, 'editor', `👤 تم إسناد التجميعة للمحرر: ${newEditor}`);
      return updated;
    });
  };

  const handleUpdateEditorNotes = (itemKey: string, noteText: string, editorName?: string) => {
    setEditorNotes(prev => {
      const updated = { ...prev, [itemKey]: noteText };
      if (noteText.trim()) {
        const taskName = findTaskName(itemKey);
        syncState('editor_notes', updated, itemKey, taskName, 'note', `📝 ملاحظة جديدة: "${noteText.slice(0, 60)}${noteText.length > 60 ? '...' : ''}"`);
      } else {
        localStorage.setItem('editor_notes', JSON.stringify(updated));
        const token = session?.access_token || profile?.id;
        if (token) {
          fetch('/api/task-metadata', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ field: 'editor_notes', metadata: updated }) }).catch(e => console.error(e));
        }
      }
      return updated;
    });
  };

  const handleUpdateMarketingNotes = (itemKey: string, noteText: string, editorName?: string) => {
    setMarketingNotes(prev => {
      const updated = { ...prev, [itemKey]: noteText };
      if (noteText.trim()) {
        const taskName = findTaskName(itemKey);
        syncState('marketing_notes', updated, itemKey, taskName, 'marketing_note', `💬 ملاحظة تسويق: "${noteText.slice(0, 60)}${noteText.length > 60 ? '...' : ''}"`);
      } else {
        localStorage.setItem('marketing_notes', JSON.stringify(updated));
        const token = session?.access_token || profile?.id;
        if (token) {
          fetch('/api/task-metadata', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ field: 'marketing_notes', metadata: updated }) }).catch(e => console.error(e));
        }
      }
      return updated;
    });
  };

  const handleStatusChange = (itemKey: string, taskName: string, editorName: string, type: string) => {
    const msgMap: Record<string, string> = {
      done: '✅ تم تحديد التجميعة كـ مكتملة',
      undone: '↩️ تم إلغاء تحديد التجميعة كمكتملة',
      cancel: '❌ تم تحديد التجميعة كـ ملغاة',
      uncancel: '↩️ تم إلغاء تحديد التجميعة كملغاة',
      priority: '⚠️ تم تحديد التجميعة كأولوية قصوى',
      unpriority: '➖ تم إزالة الأولوية القصوى عن التجميعة',
    };
    const message = msgMap[type] || `تغيير في التجميعة`;

    if (type === 'priority' || type === 'unpriority') {
       const isPri = type === 'priority';
       setTaskPriorities(prev => {
          const n = { ...prev, [itemKey]: isPri };
          syncState('task_priorities', n, itemKey, taskName, type, message);
          return n;
       });
    } else {
       setTaskStatuses(prev => {
          const current = prev[itemKey] || { done: false, cancel: false };
          let d = current.done;
          let c = current.cancel;
          if (type === 'done') d = true;
          else if (type === 'undone') d = false;
          else if (type === 'cancel') c = true;
          else if (type === 'uncancel') c = false;
          const n = { ...prev, [itemKey]: { done: d, cancel: c } };
          syncState('task_statuses', n, itemKey, taskName, type, message);
          return n;
       });
    }
  };

  const handleUpdateOpSheet = (itemKey: string, val: string) => {
    setAssignedOpSheets(prev => {
      const updated = { ...prev, [itemKey]: val };
      const taskName = findTaskName(itemKey);
      syncState('assigned_opsheets', updated, itemKey, taskName, 'opsheet', `📂 تم تعديل المرحلة إلى: ${val || 'غير محدد'}`);
      return updated;
    });
  };

  const handleUpdateBranch = (itemKey: string, val: string) => {
    setAssignedBranches(prev => {
      const updated = { ...prev, [itemKey]: val };
      const taskName = findTaskName(itemKey);
      syncState('assigned_branches', updated, itemKey, taskName, 'branch', `🏢 تم تحويل الفرع إلى: ${val || 'غير محدد'}`);
      return updated;
    });
  };

  const opSheetsList = useMemo(() => {
    const set = new Set<string>();
    const sourceData = activeGid === '1535230545' ? liveData : [];
    
    const normalizeYearLocal = (val: string) => {
      const clean = (val || '').trim();
      const match = clean.match(/^(\d{4})\s*-\s*(\d{4})$/);
      if (match) {
        return `${match[1]} - ${match[2]}`;
      }
      return clean;
    };

    sourceData.forEach((i: any) => {
      if (i.opSheet) {
        const norm = normalizeYearLocal(i.opSheet);
        if (/^\d{4}\s*-\s*\d{4}$/.test(norm)) {
          set.add(norm);
        }
      }
    });

    const defaults = ['2023 - 2024', '2024 - 2025', '2025 - 2026', '2026 - 2027'];
    defaults.forEach(d => set.add(d));
    return Array.from(set).sort();
  }, [liveData, activeGid]);

  const branchesList = useMemo(() => {
    const set = new Set<string>();
    const sourceData = activeGid === '1535230545' ? liveData : [];
    sourceData.forEach((i: any) => {
      if (i.branch && i.branch.trim() !== '') set.add(i.branch.trim());
    });
    const defaults = ['القاهرة', 'اسكندرية', 'دسوق'];
    defaults.forEach(d => set.add(d));
    return Array.from(set).sort();
  }, [liveData, activeGid]);

  const editorsList = useMemo(() => {
    const set = new Set<string>();
    const sourceData = Array.isArray(liveData) ? liveData : [];
    sourceData.forEach((i: any) => {
      if (i.editor && i.editor !== 'محرر' && i.editor !== 'غير محدد') {
        set.add(i.editor.trim());
      }
      if (i.editorCol && i.editorCol !== 'محرر' && i.editorCol !== 'غير محدد' && i.editorCol !== '---') {
        set.add(i.editorCol.trim());
      }
    });
    const defaults = [
      'HASSANEN', 'ABANOUB', 'SHIHAB', 'MAGED', 'KIRO', 'MOHAMED',
      'ASHRAF', 'Basel', 'ESLAM', 'Ramaj', 'WAEL'
    ];
    defaults.forEach(d => set.add(d));
    return Array.from(set).sort();
  }, [liveData, activeGid]);

  const [localEntries, setLocalEntries] = useState<{ [gid: string]: any[] }>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', filingName: '', val: '', id: '', subject: '', extra: '', editor: '', notesMarketing: '' });
  const [shootingAddForm, setShootingAddForm] = useState({
    branch: 'Alexandria',
    year: 's3',
    teacher: 'Hossam Elashry',
    extraName: 'Ahmed',
    scriptName: '',
    scriptLink: '',
    type: 'حواري',
    format: 'REEL'
  });

  const generatedCode = useMemo(() => {
    if (!['1436746012', '1939073164', '798246690', '0'].includes(activeGid)) return '';
    const prefix = activeGid === '0'
      ? `${shootingAddForm.year}-cut-${shootingAddForm.extraName}-`.toLowerCase().replace(/\s+/g, ' ')
      : `${shootingAddForm.year}-${shootingAddForm.teacher}-${shootingAddForm.extraName}-`.toLowerCase().replace(/\s+/g, ' ');
    const currentSheetData = Array.isArray(liveData) ? liveData : [];
    let maxSeq = -1;
    currentSheetData.forEach((row: any) => {
      if (row.id && row.id.toLowerCase().startsWith(prefix)) {
        const parts = row.id.split('-');
        if (parts.length >= 4) {
          const seqStr = parts[3].split(' ')[0];
          const seq = parseInt(seqStr, 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
    });
    const nextSeq = maxSeq + 1;
    return `${prefix}${nextSeq.toString().padStart(2, '0')} v6`.toLowerCase();
  }, [shootingAddForm, liveData, activeGid]);

  const [colorfulTabs, setColorfulTabs] = useState(false);
  const [visibleRecordsLimit, setVisibleRecordsLimit] = useState(200);

  useEffect(() => {
    setVisibleRecordsLimit(200);
  }, [activeGid]);

  const [stageWeekFilter, setStageWeekFilter] = useState('All');
  const [glowingKeys, setGlowingKeys] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'default' | 'name' | 'date' | 'addedDate'>('default');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const savedLocal = localStorage.getItem('local_entries_v1');
    if (savedLocal) {
      try { setLocalEntries(JSON.parse(savedLocal)); } catch(e) {}
    }
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For Shooting / reels / Cuts sheets
    if (['1436746012', '1939073164', '798246690', '0'].includes(activeGid)) {
      if (!shootingAddForm.scriptLink || !shootingAddForm.scriptLink.trim()) {
        toast.error("يرجى إدخال رابط السكريبت");
        return;
      }
      if (!shootingAddForm.scriptName) {
        toast.error("يرجى إدخال اسم السكريبت");
        return;
      }
      if (!generatedCode) {
        toast.error("فشل في توليد الكود التلقائي");
        return;
      }

      const token = session?.access_token || profile?.id;
      if (!token) {
        toast.error("يرجى تسجيل الدخول أولاً");
        return;
      }

      toast.loading("جاري إضافة مهمة السكريبت الجديدة...", { id: 'add-reels-toast' });
      try {
        const scriptValue = shootingAddForm.scriptLink.trim()
          ? `=HYPERLINK("${shootingAddForm.scriptLink.trim()}", "${shootingAddForm.scriptName.trim()}")`
          : shootingAddForm.scriptName.trim();

        let rowData: any[] = [];
        if (activeGid === '0') {
          // Cuts sheet has 18 columns (A to R)
          rowData = [
            new Date().toLocaleDateString('en-US'), // 0: Date
            shootingAddForm.branch,                // 1: Branch
            shootingAddForm.year,                  // 2: Year
            'CUT',                                 // 3: TypeCol (static 'CUT')
            shootingAddForm.extraName,             // 4: Creator
            generatedCode,                         // 5: Code / id
            '',                                    // 6: Data Files (empty)
            scriptValue,                           // 7: Script
            shootingAddForm.type,                  // 8: Type
            shootingAddForm.format,                // 9: Format
            '',                                    // 10: Creator Notes
            '',                                    // 11: Editor Notes
            'FALSE',                               // 12: Missing Details
            'FALSE',                               // 13: Problem
            'FALSE',                               // 14: Done
            '',                                    // 15: Editor
            '',                                    // 16: Drive Final
            'FALSE'                                // 17: Canceled
          ];
        } else {
          // Shooting / VE / Counter has 18 columns (A to R)
          rowData = [
            new Date().toLocaleDateString('en-US'), // 0: Date
            shootingAddForm.branch,                // 1: Branch
            shootingAddForm.year,                  // 2: السنة
            shootingAddForm.teacher,               // 3: المدرس
            shootingAddForm.extraName,             // 4: Column 5
            generatedCode,                         // 5: code
            scriptValue,                           // 6: السكريبت
            shootingAddForm.type,                  // 7: النوع
            shootingAddForm.format,                // 8: المقاس
            'FALSE',                               // 9: اتصور؟
            '',                                    // 10: تاريخ التصوير
            '',                                    // 11: BY
            '',                                    // 12: STORAGE
            '',                                    // 13: NOTES
            '',                                    // 14: Drive Link (Raw)
            '',                                    // 15: EDITOR
            'FALSE',                               // 16: DONE?
            ''                                     // 17: Drive Link (Final)
          ];
        }

        const res = await fetch('/api/reels/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ rowData, gid: activeGid })
        });

        if (!res.ok) {
          throw new Error('Failed to append row to Google Sheets');
        }

        // Broadcast new entry over WebSocket to other clients
        if (globalChannelRef.current && profile?.name) {
          globalChannelRef.current.send({
            type: 'broadcast',
            event: 'update',
            payload: {
              itemKey: generatedCode,
              taskName: scriptValue || generatedCode,
              message: activeGid === '0' 
                ? `🎬 تم إضافة مهمة مونتاج (Cut) جديدة: "${scriptValue || generatedCode}"`
                : `🆕 تم إضافة سكريبت جديد: "${scriptValue || generatedCode}"`,
              type: 'new_entry',
              from: profile.name,
              activeGid
            }
          });
        }

        toast.success(activeGid === '0' ? "تم إضافة الريل الجديد بنجاح في Google Sheets! 🎉" : "تم إضافة السكريبت الجديد بنجاح في Supabase و Google Sheets! 🎉", { id: 'add-reels-toast' });

        // Reset and close
        setShowAddModal(false);
        setShootingAddForm(prev => ({
          ...prev,
          scriptName: '',
          scriptLink: ''
        }));

        // Refresh the table to show the new row
        refresh();
      } catch (err: any) {
        console.error(err);
        toast.error("حدث خطأ أثناء الإضافة: " + err.message, { id: 'add-reels-toast' });
      }
      return;
    }

    if (!addForm.name) return;
    const newItem = {
      ...addForm,
      uniqueKey: 'local-' + Date.now(),
      check1: false,
      check2: false,
      done: false,
      priority: false,
      date: addForm.id || new Date().toLocaleDateString(),
      branch: addForm.extra,
      opSheet: addForm.val
    };
    setLocalEntries(prev => {
      const list = prev[activeGid] || [];
      const updated = [newItem, ...list];
      const map = { ...prev, [activeGid]: updated };
      syncState('local_entries_v1', map, newItem.uniqueKey, newItem.name, 'add_entry', `➕ تم إضافة مهمة جديدة يدوياً: "${newItem.name}"`);
      return map;
    });
    setShowAddModal(false);
    setAddForm({ name: '', filingName: '', val: '', id: '', subject: '', extra: '', editor: '', notesMarketing: '' });
  };

  useEffect(() => {
    // Load local transfers as fallback
    const saved = localStorage.getItem('tagme3at_transfers');
    if (saved) {
      try { setTagmeTransfers(JSON.parse(saved)); } catch (e) {}
    }
    
    // Load from SQL on mount and when gid changes
    if (activeGid === '1535230545') {
      fetch('/api/tagme3at').then(res => res.json()).then(data => {
        if (data && data.items) {
          const transfers = data.items.filter((i: any) => i.is_transfer).map((i: any) => ({
            name: i.name, filingName: i.filing_name, opSheet: i.op_sheet, branch: i.branch, date: i.date,
            notesMarketing: i.notes_marketing, editor: i.editor, notesEditors: i.notes_editors, done: i.done,
            priority: i.priority, cancel: i.cancel, uniqueKey: i.unique_key, isTagmeTransfer: true,
            thumbnailLink: i.thumbnail_link || '',
            time: i.time || '',
            youtubeLink: i.youtube_link || '',
            uploaded: i.uploaded === true
          }));
          setTagmeTransfers(transfers);
          
          setEditorNotes(prev => { const n = {...prev}; data.items.forEach((i: any) => { if(i.notes_editors) n[i.unique_key] = i.notes_editors; }); return n; });
          setMarketingNotes(prev => { const n = {...prev}; data.items.forEach((i: any) => { if(i.notes_marketing) n[i.unique_key] = i.notes_marketing; }); return n; });
          setAssignedEditors(prev => { const n = {...prev}; data.items.forEach((i: any) => { if(i.editor) n[i.unique_key] = i.editor; }); return n; });
          setTaskStatuses(prev => { const n = {...prev}; data.items.forEach((i: any) => { if(i.done) n[i.unique_key] = 'done'; }); return n; });
          setTaskPriorities(prev => { const n = {...prev}; data.items.forEach((i: any) => { if(i.priority) n[i.unique_key] = true; }); return n; });
          setAssignedThumbnailLinks(prev => { const n = {...prev}; data.items.forEach((i: any) => { if(i.thumbnail_link) n[i.unique_key] = i.thumbnail_link; }); return n; });
          setAssignedTimes(prev => { const n = {...prev}; data.items.forEach((i: any) => { if(i.time) n[i.unique_key] = i.time; }); return n; });
          setAssignedYoutubeLinks(prev => { const n = {...prev}; data.items.forEach((i: any) => { if(i.youtube_link) n[i.unique_key] = i.youtube_link; }); return n; });
          setUploadedStatuses(prev => { const n = {...prev}; data.items.forEach((i: any) => { if(i.uploaded !== undefined) n[i.unique_key] = i.uploaded; }); return n; });
        }
      }).catch(e => console.error(e));
    }
  }, [activeGid]);

  const [loadingFilmedCode, setLoadingFilmedCode] = useState<string | null>(null);

  const [autofillDrag, setAutofillDrag] = useState<{
    colKey: string;
    startIdx: number;
    currentIdx: number;
    value: any;
  } | null>(null);

  const [activeCell, setActiveCell] = useState<{
    colKey: string;
    rowIndex: number;
  } | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.autofill-cell-td')) {
        setActiveCell(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleApplyAutofill = async (colKey: string, startIdx: number, endIdx: number, value: any) => {
    const token = session?.access_token || profile?.id;
    if (!token) return;

    const data = Array.isArray(liveData) ? liveData : [];
    const start = Math.min(startIdx, endIdx);
    const end = Math.max(startIdx, endIdx);
    
    const rowsToUpdate = data.slice(start, end + 1);
    if (rowsToUpdate.length === 0) return;

    // 1. Optimistic UI update (Instant feedback!)
    setLiveData((prev: any[]) => {
      const updated = [...prev];
      for (let i = start; i <= end; i++) {
        if (updated[i]) {
          updated[i] = { ...updated[i], [colKey]: value };
        }
      }
      return updated;
    });

    // 2. Show instant success toast!
    toast.success("تم تطبيق التعبئة التلقائية وحفظ البيانات بنجاح!", { id: 'autofill-toast' });

    // 3. Fire a single batch update to the backend asynchronously without blocking the UI thread
    const batchUpdates = rowsToUpdate.map((item) => {
      const updatedItem = { ...item, [colKey]: value };
      let rowData: any[] = [];

      if (activeGid === '0') {
        // Cuts sheet row data structure
        rowData = [
          updatedItem.date || '',
          updatedItem.branch || '',
          updatedItem.year || '',
          updatedItem.typeCol || 'CUT',
          updatedItem.creator || '',
          updatedItem.id || '',
          updatedItem.dataFiles || '',
          updatedItem.script || '',
          updatedItem.type || '',
          updatedItem.format || '',
          updatedItem.creatorNotes || '',
          updatedItem.editorNotes || '',
          updatedItem.missingDetails ? 'TRUE' : 'FALSE',
          updatedItem.problem ? 'TRUE' : 'FALSE',
          updatedItem.done ? 'TRUE' : 'FALSE',
          updatedItem.editor || '',
          updatedItem.driveFinal || '',
          updatedItem.canceled ? 'TRUE' : 'FALSE'
        ];
      } else {
        // Shooting / Ve sheet row data structure
        rowData = [
          updatedItem.date || '',
          updatedItem.branch || '',
          updatedItem.year || '',
          updatedItem.teacher || '',
          updatedItem.extraName || '',
          updatedItem.id || '',
          updatedItem.script || '',
          updatedItem.type || '',
          updatedItem.format || '',
          updatedItem.filmed ? 'TRUE' : 'FALSE',
          updatedItem.filmingDate || '',
          updatedItem.by || '',
          updatedItem.storage || '',
          updatedItem.notes || '',
          updatedItem.driveRaw || '',
          updatedItem.editorCol || '',
          updatedItem.done ? 'TRUE' : 'FALSE',
          updatedItem.driveFinal || '',
          updatedItem.canceled ? 'TRUE' : 'FALSE',
          updatedItem.missingDetails ? 'TRUE' : 'FALSE'
        ];
      }

      return { oldCode: item.id, rowData };
    });

    fetch('/api/reels/update-batch', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ updates: batchUpdates })
    }).catch(err => console.error("Autofill background batch update error:", err));
  };

  useEffect(() => {
    if (!autofillDrag) return;
    const handleGlobalMouseUp = () => {
      const { colKey, startIdx, currentIdx, value } = autofillDrag;
      handleApplyAutofill(colKey, startIdx, currentIdx, value);
      setAutofillDrag(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [autofillDrag]);

  const handleUpdateShootingRow = async (oldCode: string, newRowData: any[]) => {
    const token = session?.access_token || profile?.id;
    if (!token) return;
    try {
      const res = await fetch('/api/reels/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ oldCode, rowData: newRowData })
      });
      if (!res.ok) { const text = await res.text(); throw new Error('Failed to update row: ' + res.status + ' ' + text); }

      // Update local liveData state instantly for seamless UI consistency!
      setLiveData((prev: any[]) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((row: any) => {
          if (row.id === oldCode) {
            if (activeGid === '0') {
              return {
                ...row,
                branch: newRowData[1],
                year: newRowData[2],
                typeCol: newRowData[3],
                creator: newRowData[4],
                id: newRowData[5], // new code
                dataFiles: newRowData[6],
                script: newRowData[7],
                type: newRowData[8],
                format: newRowData[9],
                creatorNotes: newRowData[10],
                editorNotes: newRowData[11],
                missingDetails: newRowData[12] === 'TRUE' || newRowData[12] === true,
                problem: newRowData[13] === 'TRUE' || newRowData[13] === true,
                done: newRowData[14] === 'TRUE' || newRowData[14] === true,
                editor: newRowData[15],
                driveFinal: newRowData[16],
                canceled: newRowData[17] === 'TRUE' || newRowData[17] === true
              };
            } else {
              return {
                ...row,
                branch: newRowData[1],
                year: newRowData[2],
                teacher: newRowData[3],
                extraName: newRowData[4],
                id: newRowData[5], // new code
                script: newRowData[6],
                type: newRowData[7],
                format: newRowData[8],
                filmed: newRowData[9] === 'TRUE' || newRowData[9] === true,
                filmingDate: newRowData[10],
                by: newRowData[11],
                storage: newRowData[12],
                notes: newRowData[13],
                driveRaw: newRowData[14],
                editorCol: newRowData[15],
                done: newRowData[16] === 'TRUE' || newRowData[16] === true,
                driveFinal: newRowData[17],
                canceled: newRowData[18] === 'TRUE' || newRowData[18] === true,
                missingDetails: newRowData[19] === 'TRUE' || newRowData[19] === true
              };
            }
          }
          return row;
        });
      });

      toast.success("تم تحديث الصف بنجاح!");
    } catch (err: any) {
      console.error(err);
      toast.error("حدث خطأ أثناء التحديث: " + err.message);
    }
  };

  const handleFilmedToggle = async (item: any, isFilmed: boolean) => {
    if (!item.id) {
      alert("لا يمكن تعديل هذا الصف لعدم وجود كود (Code)");
      return;
    }
    const token = session?.access_token || profile?.id;
    if (!token) return;

    // Optimistic UI update for instant feedback
    setLiveData((prev: any[]) => prev.map((row: any) => row.id === item.id ? { ...row, filmed: isFilmed } : row));
    
    // Show toast immediately if checked
    if (isFilmed) {
      setActiveVeToast({ item });
    }

    try {
      // We still set a background loading state if needed, but not block the UI
      const res = await fetch('/api/reels/filmed', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code: item.id, filmed: isFilmed })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update filmed status');
      
      // Optionally refresh in the background silently
      refresh(true); // pass true for silent refresh if supported
    } catch (err: any) {
      // Revert optimistic update on failure
      setLiveData((prev: any[]) => prev.map((row: any) => row.id === item.id ? { ...row, filmed: !isFilmed } : row));
      alert(err.message || "حدث خطأ أثناء التحديث");
    }
  };

  const handleTagmeToggle = (item: any, sheetLabel: string, isChecked: boolean) => {
    const uniqueKey = 'tgm-' + (item.uniqueKey || generateKey(item));

    setTagmeTransfers(prev => {
      let updatedList;
      if (isChecked) {
        const newTagme = {
          name: item.name,
          filingName: item.filingName || '---',
          opSheet: sheetLabel,
          branch: item.extra || item.branch || 'الفرع',
          date: item.date || '',
          notesMarketing: item.notesMarketing || '',
          editor: item.editor || 'غير محدد',
          notesEditors: item.notesEditors || '',
          done: false,
          priority: false,
          cancel: false,
          uniqueKey: uniqueKey,
          isTagmeTransfer: true
        };
        if (!prev.some(i => i.uniqueKey === uniqueKey)) {
          updatedList = [newTagme, ...prev];
        } else {
          updatedList = prev;
        }
      } else {
        updatedList = prev.filter(i => i.uniqueKey !== uniqueKey);
      }
      
      const token = session?.access_token || profile?.id;
      if (token) {
        if (isChecked && updatedList.length > 0) {
          const itemToPost = updatedList[0]; // Assuming newTagme is prepended
          fetch('/api/tagme3at', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(itemToPost) });
        } else if (!isChecked) {
          fetch(`/api/tagme3at/${uniqueKey}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        }
      }

      syncState('tagme3at_transfers', updatedList, uniqueKey, item.name || 'مهمة محولة', isChecked ? 'tagme_transfer' : 'tagme_untransfer', 
        isChecked ? `🔄 تم تحويل درس: "${item.name}" إلى التجميعات` : `↩️ تم إلغاء تحويل درس: "${item.name}" من التجميعات`);
      return updatedList;
    });

    if (isChecked) {
      const targetStage = { gid: '1535230545', label: 'تجميعات' };
      setActiveTagmeToast({ item, stage: targetStage, uniqueKey });
      setTimeout(() => {
        setActiveTagmeToast(prev => prev?.uniqueKey === uniqueKey ? null : prev);
      }, 10000);
    } else {
      if (activeTagmeToast?.uniqueKey === uniqueKey) setActiveTagmeToast(null);
    }
  };

  const navigateToTagmeTransfer = (toastData: any) => {
    setActiveGid(toastData.stage.gid);
    setActiveLabel(toastData.stage.label);
    setSearchQuery('');
    setStatusFilter('All');
    setTeacherFilter('All');
    setYearFilter('All');
    setColFilters({});
    setActiveTagmeToast(null);

    setTimeout(() => {
      const el = document.getElementById(toastData.uniqueKey);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('bg-emerald-500/30', 'transition-colors', 'duration-1000', 'scale-[1.01]');
        setTimeout(() => el.classList.remove('bg-emerald-500/30', 'scale-[1.01]'), 3000);
      }
    }, 150);
  };

  const handleToggleMergeSelect = (item: any) => {
    const key = item.uniqueKey || generateKey(item);
    setSelectedForMerge(prev => {
      if (prev.some(i => (i.uniqueKey || generateKey(i)) === key)) {
        return prev.filter(i => (i.uniqueKey || generateKey(i)) !== key);
      }
      return [...prev, item];
    });
  };

  const handleExecuteMerge = () => {
    if (selectedForMerge.length === 0) return;
    const sample = selectedForMerge[0];
    const stage = getTargetStageGid(sample);
    
    const combinedCodes = selectedForMerge.map(i => i.filingName || i.name).join('\n');
    const combinedNames = selectedForMerge.map(i => i.name).join(' | ');
    const uniqueKey = 'merge-' + Date.now();

    const mergedItem = {
      name: combinedCodes,
      filingName: combinedNames,
      val: sample.year || sample.term || 'YouTube Merge',
      id: sample.date || sample.teacher || '---',
      subject: getSubjectFromFiling(combinedCodes),
      extra: 'يوتيوب العمليات (تجميعة)',
      opSheet: 'العمليات',
      check1: false,
      check2: false,
      uniqueKey: uniqueKey,
      isYoutubeTransfer: true
    };

    setYoutubeItems(prev => {
      const list = prev[stage.gid] || [];
      const updated = [mergedItem, ...list];
      const map = { ...prev, [stage.gid]: updated };
      syncState('youtube_transfers', map, uniqueKey, combinedNames, 'youtube_merge', `🎬 تم دمج ${selectedForMerge.length} دروس ليوتيوب`);
      return map;
    });

    setActiveToast({
      item: { name: combinedNames },
      stage: stage,
      uniqueKey: uniqueKey
    });

    setSelectedForMerge([]);
  };

  useEffect(() => {
    const saved = localStorage.getItem('youtube_transfers');
    if (saved) {
      try { setYoutubeItems(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const handleYoutubeToggle = (item: any, isChecked: boolean) => {
    const stage = getTargetStageGid(item);
    const uniqueKey = 'yt-' + (item.uniqueKey || generateKey(item));

    setYoutubeItems(prev => {
      const currentList = prev[stage.gid] || [];
      let updatedList;
      if (isChecked) {
        const newItem = {
          name: `[يوتيوب] ${item.filingName || item.name}`,
          filingName: item.name,
          val: item.year || item.term || 'YouTube',
          id: item.date || item.teacher || '---',
          subject: getSubjectFromFiling(item.filingName),
          extra: 'يوتيوب العمليات',
          opSheet: 'العمليات',
          check1: false,
          check2: false,
          uniqueKey: uniqueKey,
          isYoutubeTransfer: true
        };
        if (!currentList.some(i => i.uniqueKey === uniqueKey)) {
          updatedList = [newItem, ...currentList];
        } else {
          updatedList = currentList;
        }
      } else {
        updatedList = currentList.filter(i => i.uniqueKey !== uniqueKey);
      }
      
      const updatedMap = { ...prev, [stage.gid]: updatedList };
      syncState('youtube_transfers', updatedMap, uniqueKey, item.filingName || item.name || 'يوتيوب', isChecked ? 'youtube_transfer' : 'youtube_untransfer',
        isChecked ? `▶️ تم نقل درس ليوتيوب: "${item.name}"` : `↩️ تم إلغاء نقل درس اليوتيوب: "${item.name}"`);
      return updatedMap;
    });

    if (isChecked) {
      setActiveToast({ item, stage, uniqueKey });
      setTimeout(() => {
        setActiveToast(prev => prev?.uniqueKey === uniqueKey ? null : prev);
      }, 10000);
    } else {
      if (activeToast?.uniqueKey === uniqueKey) setActiveToast(null);
    }
  };

  const navigateToYoutubeTransfer = (toastData: any) => {
    setActiveGid(toastData.stage.gid);
    setActiveLabel(toastData.stage.label);
    setSearchQuery('');
    setStatusFilter('All');
    setTeacherFilter('All');
    setYearFilter('All');
    setColFilters({});
    setActiveToast(null);

    setTimeout(() => {
      const el = document.getElementById(toastData.uniqueKey);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('bg-purple-600/30', 'transition-colors', 'duration-1000', 'scale-[1.01]');
        setTimeout(() => el.classList.remove('bg-purple-600/30', 'scale-[1.01]'), 3000);
      }
    }, 150);
  };

  useEffect(() => {
    const saved = localStorage.getItem(`new_items_${activeGid}`);
    if (saved) {
      try { setNewItems(JSON.parse(saved)); } catch (e) {}
    } else {
      setNewItems([]);
    }
  }, [activeGid]);


  const dismissNotification = (uniqueKey: string) => {
    setNewItems(prev => {
      const updated = prev.filter(p => p.uniqueKey !== uniqueKey);
      localStorage.setItem(`new_items_${activeGid}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleNotificationClick = (item: any) => {
    setSearchQuery('');
    setStatusFilter('All');
    if (isOperations && item.teacher) {
      setTeacherFilter(item.teacher);
    } else {
      setTeacherFilter('All');
    }
    setYearFilter('All');
    setColFilters({});
    setShowNotifications(false);

    const key = item.uniqueKey || generateKey(item);
    setGlowingKeys(prev => [...prev, key]);
    setTimeout(() => {
      setGlowingKeys(prev => prev.filter(k => k !== key));
    }, 4000);

    setTimeout(() => {
      const el = document.getElementById(key);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);

    dismissNotification(key);
  };

  const stages = [
    { label: 'Operations', gid: '1476192399', icon: Briefcase, colorHex: '#8b5cf6' },
    { label: 'تجميعات', gid: '1535230545', icon: Layers, colorHex: '#10b981' },
    { label: 'Junior 4', gid: '497207661', icon: GraduationCap, colorHex: '#b49fee' },
    { label: 'Junior 5', gid: '96752860', icon: GraduationCap, colorHex: '#92dcf7' },
    { label: 'Junior 6', gid: '346788121', icon: GraduationCap, colorHex: '#ff7843' },
    { label: 'Middle 1', gid: '458352282', icon: GraduationCap, colorHex: '#ab4bbb' },
    { label: 'Middle 2', gid: '2113852114', icon: GraduationCap, colorHex: '#2563eb' },
    { label: 'Middle 3', gid: '2089699920', icon: GraduationCap, colorHex: '#2bb881' },
    { label: 'Senior 1', gid: '1640460225', icon: GraduationCap, colorHex: '#61c4be' },
    { label: 'Senior 2', gid: '595027661', icon: GraduationCap, colorHex: '#00a2ff' },
    { label: 'Senior 3', gid: '286303232', icon: GraduationCap, colorHex: '#8b5cf6' },
    { label: 'إحصائيات التجميعات 📊', gid: 'analytics_tagme3at', icon: BarChart3, colorHex: '#10b981' },
  ];

  const designersStages = [
    { label: 'Designers', gid: '501319673', icon: Sparkles, colorHex: '#a855f7' },
    { label: 'احصائيات تصاميم', gid: 'design-analytics', icon: BarChart3, colorHex: '#ec4899' },
  ];

  const reelsStages = [
    { label: 'Shooting', gid: '1436746012', icon: Video, colorHex: '#b49fee' },
    { label: 'Ve', gid: '1939073164', icon: Video, colorHex: '#92dcf7' },
    { label: 'CUTS', gid: '0', icon: Video, colorHex: '#ff7843' },
    { label: 'احصائيات الريلز', gid: 'reels-analytics', icon: BarChart3, colorHex: '#818cf8' },
  ];

  const combinedData = useMemo(() => {
    const currentLocal = localEntries[activeGid] || [];
    let baseList = [];
    if (isOperations) baseList = [...currentLocal, ...liveData];
    else if (isTagme3at) baseList = [...currentLocal, ...tagmeTransfers, ...liveData];
    else {
      const transfers = youtubeItems[activeGid] || [];
      baseList = [...currentLocal, ...transfers, ...liveData];
    }

    return baseList.map(item => {
      const key = item.uniqueKey || generateKey(item);
      const updated = { ...item };
      if (assignedEditors[key] !== undefined) {
        updated.editor = assignedEditors[key];
      }
      if (editorNotes[key] !== undefined) {
        updated.notesEditors = editorNotes[key];
      }
      if (marketingNotes[key] !== undefined) {
        updated.notesMarketing = marketingNotes[key];
      }
      if (assignedOpSheets[key] !== undefined) {
        updated.opSheet = assignedOpSheets[key];
      }
      if (assignedBranches[key] !== undefined) {
        updated.branch = assignedBranches[key];
      }
      if (assignedDates[key] !== undefined) {
        updated.date = assignedDates[key];
      }
      if (assignedWeeks[key] !== undefined) {
        updated.week = assignedWeeks[key];
      }
      if (assignedBunnyLinks[key] !== undefined) {
        updated.linkBunny = assignedBunnyLinks[key];
      }
      if (assignedThumbnailLinks[key] !== undefined) {
        updated.thumbnailLink = assignedThumbnailLinks[key];
      }
      if (assignedTimes[key] !== undefined) {
        updated.time = assignedTimes[key];
      }
      if (assignedYoutubeLinks[key] !== undefined) {
        updated.youtubeLink = assignedYoutubeLinks[key];
      }
      if (uploadedStatuses[key] !== undefined) {
        updated.uploaded = uploadedStatuses[key];
      }
      return updated;
    });
  }, [liveData, youtubeItems, tagmeTransfers, localEntries, activeGid, isOperations, isTagme3at, assignedEditors, editorNotes, marketingNotes, assignedOpSheets, assignedBranches, assignedDates, assignedWeeks, assignedBunnyLinks, assignedThumbnailLinks, assignedTimes, assignedYoutubeLinks, uploadedStatuses]);

  useEffect(() => {
    if (combinedData.length === 0) return;
    const SEEN_KEY = `seen_items_${activeGid}`;
    const NEW_KEY = `new_items_${activeGid}`;
    
    const seenStr = localStorage.getItem(SEEN_KEY);
    
    const currentNames = new Set<string>();
    combinedData.forEach(item => {
      currentNames.add(item.uniqueKey || generateKey(item));
    });

    if (!seenStr) {
      localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(currentNames)));
      return;
    }
    
    const seenSet = new Set(JSON.parse(seenStr));
    const newlyAdded: any[] = [];

    combinedData.forEach((item) => {
      const key = item.uniqueKey || generateKey(item);
      if (!seenSet.has(key)) {
        newlyAdded.push({ ...item, uniqueKey: key });
      }
    });

    if (newlyAdded.length > 0 && newlyAdded.length < 30) {
      const keysToGlow = newlyAdded.map(item => item.uniqueKey);
      setGlowingKeys(prev => [...prev, ...keysToGlow]);
      keysToGlow.forEach(key => {
        setTimeout(() => {
          setGlowingKeys(prev => prev.filter(k => k !== key));
        }, 10000);
      });

      setNewItems(prev => {
        const map = new Map(prev.map(p => [p.uniqueKey, p]));
        newlyAdded.forEach(n => map.set(n.uniqueKey, n));
        const finalNew = Array.from(map.values());
        localStorage.setItem(NEW_KEY, JSON.stringify(finalNew));
        return finalNew;
      });

      if (newlyAdded.length === 1) {
        const item = newlyAdded[0];
        const toastId = 'toast-' + Math.random().toString(36).substr(2, 9);
        setItemToasts(prev => [...prev, { 
          id: toastId, 
          name: item.name, 
          filingName: item.filingName, 
          title: "تنبيه: إضافة درس جديد! 🎉" 
        }]);
        setTimeout(() => {
          setItemToasts(prev => prev.filter(t => t.id !== toastId));
        }, 8000);
      } else if (newlyAdded.length > 1) {
        const toastId = 'toast-' + Math.random().toString(36).substr(2, 9);
        setItemToasts(prev => [...prev, { 
          id: toastId, 
          name: `تم رصد ${newlyAdded.length} تحديثات جديدة مضافة في الجداول!`, 
          filingName: '', 
          title: "تحديثات جديدة متعددة! 🔔" 
        }]);
        setTimeout(() => {
          setItemToasts(prev => prev.filter(t => t.id !== toastId));
        }, 8000);
      }
    }

    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(currentNames)));
  }, [combinedData, activeGid]);

  const teachers = useMemo(() => {
    if (!isOperations) return [];
    const source = yearFilter !== 'All'
      ? combinedData.filter((i: any) => i.year === yearFilter)
      : combinedData;
    const set = new Set(source.map((i: any) => i.teacher).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [combinedData, isOperations, yearFilter]);

  const years = useMemo(() => {
    if (!isOperations) return [];
    const source = teacherFilter !== 'All'
      ? combinedData.filter((i: any) => i.teacher === teacherFilter)
      : combinedData;
    const set = new Set(source.map((i: any) => i.year).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [combinedData, isOperations, teacherFilter]);

  useEffect(() => {
    if (isOperations && yearFilter !== 'All' && years.length > 0 && !years.includes(yearFilter)) {
      setYearFilter('All');
    }
  }, [teacherFilter, years, yearFilter, isOperations]);

  useEffect(() => {
    if (isOperations && teacherFilter !== 'All' && teachers.length > 0 && !teachers.includes(teacherFilter)) {
      setTeacherFilter('All');
    }
  }, [yearFilter, teachers, teacherFilter, isOperations]);

  const availableWeeks = useMemo(() => {
    if (isOperations || isTagme3at || isAnalyticsTagme || isReelsAnalytics) return [];
    const set = new Set(liveData.map((i: any) => i.week ? String(i.week).trim() : '').filter(Boolean));
    return Array.from(set) as string[];
  }, [liveData, isOperations, isTagme3at, isAnalyticsTagme, isReelsAnalytics]);


  const filteredData = useMemo(() => {
    const filtered = combinedData.filter((item: any) => {
      const searchVal = searchQuery.trim().toLowerCase();
      const matchesSearch = !searchVal ||
        (item.name && String(item.name).toLowerCase().includes(searchVal)) ||
        (item.filingName && String(item.filingName).toLowerCase().includes(searchVal)) ||
        (item.id && String(item.id).toLowerCase().includes(searchVal)) ||
        (item.val && String(item.val).toLowerCase().includes(searchVal)) ||
        (item.teacher && String(item.teacher).toLowerCase().includes(searchVal)) ||
        (item.editor && String(item.editor).toLowerCase().includes(searchVal)) ||
        (item.subject && String(item.subject).toLowerCase().includes(searchVal)) ||
        (item.branch && String(item.branch).toLowerCase().includes(searchVal)) ||
        (item.notesMarketing && String(item.notesMarketing).toLowerCase().includes(searchVal)) ||
        (item.notesEditors && String(item.notesEditors).toLowerCase().includes(searchVal));

      if (!matchesSearch) return false;

      if (isMyTasksOnly && currentUserName) {
        const me = currentUserName.toLowerCase().trim();
        const meFirstName = me.split(' ')[0];
        
        const editor = String(item.editor || '').toLowerCase().trim();
        const by = String(item.by || '').toLowerCase().trim();
        const editorCol = String(item.editorCol || '').toLowerCase().trim();
        const creator = String(item.creator || '').toLowerCase().trim();

        const matchesUser = (val: string) => {
          if (!val || val === 'غير محدد') return false;
          return val === me || val.includes(me) || me.includes(val) || (meFirstName.length > 2 && val.includes(meFirstName));
        };

        const isAssignedToMe = matchesUser(editor) || matchesUser(by) || matchesUser(editorCol) || matchesUser(creator);
        if (!isAssignedToMe) return false;
      }

      if (isOperations) {
        if (teacherFilter !== 'All' && item.teacher !== teacherFilter) return false;
        if (yearFilter !== 'All' && item.year !== yearFilter) return false;
        if (termFilter !== 'All' && item.term !== termFilter) return false;
      }
      
      if (isTagme3at && statusFilter !== 'All') {
        if (statusFilter === 'Done' && !item.done) return false;
        if (statusFilter === 'Pending' && item.done) return false;
      }

      if (isStage && stageWeekFilter !== 'All') {
        if (String(item.week).trim() !== stageWeekFilter) return false;
      }

      for (const key in colFilters) {
        const val = colFilters[key];
        if (val && val !== 'All') {
          if (String(item[key]) !== val) return false;
        }
      }

      return true;
    });

    if (sortBy === 'name') {
      const sorted = [...filtered];
      sorted.sort((a: any, b: any) => {
        const nameA = String(a.name || '').trim();
        const nameB = String(b.name || '').trim();
        return sortOrder === 'asc' ? nameA.localeCompare(nameB, 'ar') : nameB.localeCompare(nameA, 'ar');
      });
      return sorted;
    } else if (sortBy === 'date') {
      const getResolvedDate = (item: any) => {
        if (item.date) return item.date;
        if (item.uniqueKey && String(item.uniqueKey).startsWith('tgm-')) {
          const originalKey = String(item.uniqueKey).replace('tgm-', '');
          const matched = liveData?.find((i: any) => (i.uniqueKey || generateKey(i)) === originalKey);
          if (matched?.date) return matched.date;
        }
        return '';
      };
      const parseDate = (dStr: string) => {
        if (!dStr) return 0;
        const parts = dStr.split('/');
        if (parts.length === 3) {
          const month = parseInt(parts[0], 10);
          const day = parseInt(parts[1], 10);
          let year = parseInt(parts[2], 10);
          if (year < 100) year += 2000;
          if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
            return new Date(year, month - 1, day).getTime();
          }
        }
        const t = Date.parse(dStr);
        return isNaN(t) ? 0 : t;
      };
      const sorted = [...filtered];
      sorted.sort((a: any, b: any) => {
        const dateA = parseDate(getResolvedDate(a));
        const dateB = parseDate(getResolvedDate(b));
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
      return sorted;
    } else if (sortBy === 'addedDate') { // New sorting logic for 'addedDate'
      const parseDate = (dStr: string) => {
        if (!dStr) return 0;
        const parts = dStr.split('/');
        if (parts.length === 3) {
          const month = parseInt(parts[0], 10);
          const day = parseInt(parts[1], 10);
          let year = parseInt(parts[2], 10);
          if (year < 100) year += 2000;
          if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
            return new Date(year, month - 1, day).getTime();
          }
        }
        const t = Date.parse(dStr);
        return isNaN(t) ? 0 : t;
      };
      const sorted = [...filtered];
      sorted.sort((a: any, b: any) => {
        const dateA = parseDate(a.addedDate || '');
        const dateB = parseDate(b.addedDate || '');
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
      return sorted;
    }

    return filtered;
  }, [combinedData, searchQuery, statusFilter, teacherFilter, yearFilter, termFilter, bypassYearTerm, colFilters, isOperations, isTagme3at, isStage, stageWeekFilter, sortBy, sortOrder, liveData, isMyTasksOnly, profile, currentUserName]);

  // Column Filter Component
  const ColFilter = ({ colKey, label }: { colKey: string, label: string }) => {
    const options = useMemo(() => {
      const set = new Set(liveData.map(i => String(i[colKey] || '')).filter(v => v !== 'false' && v !== 'true' && v.trim() !== ''));
      if (colKey === 'branch' || colKey === 'extra') {
        set.add('القاهرة');
        set.add('اسكندرية');
        set.add('دسوق');
      }
      return Array.from(set).sort();
    }, [liveData, colKey]);

    const handleSelectChange = (val: string) => {
      setColFilters(p => {
        const updated = { ...p };
        if (val === 'All') delete updated[colKey];
        else updated[colKey] = val;
        return updated;
      });
    };

    return (
      <div className="flex flex-col items-center justify-center my-1 relative min-h-[30px]">
        {options.length > 0 && options.length < 50 ? (
          <CustomSelect
            value={colFilters[colKey] || 'All'}
            onChange={handleSelectChange}
            options={options}
            placeholder={label}
            isColumn={true}
          />
        ) : (
          <span className="text-[10px] font-black uppercase tracking-wider text-white/50">{label}</span>
        )}
      </div>
    );
  };

  // Table headers per tab type
  const renderHeaders = () => {
    if (isOperations) return (
      <>
        <th className="px-8 py-4 text-right th-style"><ColFilter colKey="name" label="Operation Detail" /></th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="teacher" label="Teacher" /></th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="term" label="Term" /></th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="smartboard" label="Smartboard" /></th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="date" label="LINK BUNNY" /></th>
        <th className="px-4 py-4 text-center th-style text-purple-400 font-bold">نشر يوتيوب</th>
        <th className="px-4 py-4 text-center th-style text-purple-400 font-bold">
          <div className="flex items-center justify-center gap-1.5">
            <span>تجميعة 🔗</span>
            {selectedForMerge.length > 0 && (
              <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{selectedForMerge.length}</span>
            )}
          </div>
        </th>
      </>
    );
    if (isTagme3at) {
      const isSimple = tagmeViewMode === 'SIMPLE';
      return (
        <>
          <th className="px-8 py-4 text-right th-style">Task</th>
          <th className="px-3 py-4 text-center th-style"><ColFilter colKey="opSheet" label="Sheet" /></th>
          {!isSimple && <th className="px-3 py-4 text-center th-style"><ColFilter colKey="date" label="التاريخ" /></th>}
          {!isSimple && <th className="px-3 py-4 text-center th-style"><ColFilter colKey="branch" label="Branch" /></th>}
          <th className="px-3 py-4 text-center th-style">Marketing Notes</th>
          <th className="px-3 py-4 text-center th-style"><ColFilter colKey="editor" label="Editor" /></th>
          <th className="px-3 py-4 text-center th-style">Status</th>
          {!isSimple && <th className="px-3 py-4 text-center th-style">Editor Notes</th>}
          <th className="px-8 py-4 text-center th-style text-purple-400 font-bold">Priority</th>
          {!isSimple && <th className="px-4 py-4 text-center th-style text-purple-400 font-bold">thumbnail LINK</th>}
          {!isSimple && <th className="px-4 py-4 text-center th-style text-purple-400 font-bold">time</th>}
          {!isSimple && <th className="px-4 py-4 text-center th-style text-purple-400 font-bold">لينك اليوتيوب</th>}
          {!isSimple && <th className="px-4 py-4 text-center th-style text-purple-400 font-bold">UPLOADED?</th>}
        </>
      );
    }
    if (activeGid === '0') return ( // CUTS
      <>
        <th className="px-4 py-4 text-center th-style"><ColFilter colKey="date" label="Date" /></th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="branch" label="Branch" /></th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="year" label="السنة" /></th>
        <th className="px-3 py-4 text-center th-style">نوع</th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="creator" label="creator" /></th>
        <th className="px-4 py-4 text-center th-style">code</th>
        <th className="px-8 py-4 text-right th-style">DATA FILES</th>
        <th className="px-8 py-4 text-right th-style">شرح الفكرة والمحتوى</th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="type" label="النوع" /></th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="format" label="المقاس" /></th>
        <th className="px-5 py-4 text-center th-style">Creator's Notes</th>
        <th className="px-5 py-4 text-center th-style">Editor's Notes</th>
        <th className="px-3 py-4 text-center th-style">تفاصيل ناقصة</th>
        <th className="px-3 py-4 text-center th-style">مشكلة</th>
        <th className="px-3 py-4 text-center th-style">DONE</th>
        <th className="px-4 py-4 text-center th-style"><ColFilter colKey="editor" label="Editor" /></th>
        <th className="px-4 py-4 text-center th-style">Drive Link (Final)</th>
        <th className="px-3 py-4 text-center th-style">CANCELO</th>
      </>
    );
    if (['1436746012', '1939073164', '798246690'].includes(activeGid)) return ( // Shooting, Ve, Counter
      <>
        <th className="px-4 py-4 text-center th-style"><ColFilter colKey="date" label="Date" /></th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="branch" label="Branch" /></th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="year" label="السنة" /></th>
        <th className="px-4 py-4 text-center th-style"><ColFilter colKey="teacher" label="المدرس" /></th>
        <th className="px-4 py-4 text-center th-style"><ColFilter colKey="extraName" label="Column 5" /></th>
        <th className="px-4 py-4 text-center th-style">code</th>
        <th className="px-8 py-4 text-right th-style">السكريبت</th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="type" label="النوع" /></th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="format" label="المقاس" /></th>
        <th className="px-3 py-4 text-center th-style">اتصور؟</th>
        <th className="px-4 py-4 text-center th-style">تاريخ التصوير</th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="by" label="BY" /></th>
        <th className="px-4 py-4 text-center th-style"><ColFilter colKey="storage" label="STORAGE" /></th>
        <th className="px-5 py-4 text-center th-style">NOTES</th>
        <th className="px-4 py-4 text-center th-style">Drive Link (Raw)</th>
        {activeGid === '1939073164' && (
          <>
            <th className="px-4 py-4 text-center th-style"><ColFilter colKey="editorCol" label="EDITOR" /></th>
            <th className="px-3 py-4 text-center th-style">تفاصيل ناقصة</th>
            <th className="px-3 py-4 text-center th-style">DONE?</th>
            <th className="px-3 py-4 text-center th-style">Cancel</th>
          </>
        )}
        <th className="px-4 py-4 text-center th-style">Drive Link (Final)</th>
      </>
    );
    // Stage tabs
    return (
      <>
        <th className="px-4 py-4 text-center th-style w-28"><ColFilter colKey="week" label="الأسبوع" /></th>
        <th className="px-4 py-4 text-center th-style w-32"><ColFilter colKey="date" label="التاريخ" /></th>
        <th className="px-8 py-4 text-right th-style">اسم الدرس / OP NAME</th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="subject" label="المادة" /></th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="branch" label="الفرع" /></th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="opSheet" label="OP Sheet" /></th>
        <th className="px-6 py-4 text-center th-style">تجميعه ✓</th>
        <th className="px-6 py-4 text-center th-style">اتسلمت ✓</th>
      </>
    );
  };

  const { uniqueBranches, uniqueYears, uniqueTeachers, uniqueExtraNames, uniqueTypes, uniqueFormats, uniqueBys, uniqueStorages } = useMemo(() => {
    const data = Array.isArray(liveData) ? liveData : [];
    const getUnique = (key: string) => Array.from(new Set(data.map((r: any) => String(r[key] || '').trim()).filter(Boolean))).sort();
    return {
      uniqueBranches: ['Alexandria', 'Cairo', 'Desouk'],
      uniqueYears: getUnique('year'),
      uniqueTeachers: getUnique('teacher'),
      uniqueExtraNames: activeGid === '0' ? getUnique('creator') : getUnique('extraName'),
      uniqueTypes: getUnique('type'),
      uniqueFormats: getUnique('format'),
      uniqueBys: getUnique('by'),
      uniqueStorages: getUnique('storage'),
    };
  }, [liveData, activeGid]);

  const yearOptions = useMemo(() => {
    const list = new Set(['s3', 's2', 's1', 'x']);
    uniqueYears.forEach(y => {
      if (y && y.trim()) list.add(y.trim().toLowerCase());
    });
    return Array.from(list);
  }, [uniqueYears]);

  const teacherOptions = useMemo(() => {
    const list = new Set(['Hossam Elashry', 'Mahmoud Gaber', 'Employee', 'Bishoy']);
    uniqueTeachers.forEach(t => {
      if (t && t.trim()) list.add(t.trim());
    });
    return Array.from(list);
  }, [uniqueTeachers]);

  const colSpan = isOperations ? 7 : isTagme3at ? (tagmeViewMode === 'SIMPLE' ? 8 : 13) : activeGid === '0' ? 18 : activeGid === '1939073164' ? 20 : ['1436746012', '798246690'].includes(activeGid) ? 16 : 7;

  return (
    <div className="flex min-h-screen bg-[#05070a] text-foreground selection:bg-primary/30">
      {/* Sidebar */}
      <aside className="w-80 border-r border-white/5 p-8 flex flex-col gap-12 glass-panel shrink-0 z-20 sticky top-0 h-screen">
        <div className="flex items-center gap-4 px-2">
          <div className="w-14 h-14 rounded-[22px] bg-gradient-to-br from-primary to-indigo-700 flex items-center justify-center shadow-2xl shadow-primary/40 relative group">
            <LayoutDashboard className="text-white group-hover:rotate-12 transition-transform duration-500" size={28} />
          </div>
          <div>
            <h1 className="font-black text-lg tracking-tight leading-tight">Marketing <span className="text-primary">&</span></h1>
            <h1 className="font-black text-lg tracking-tight leading-tight">Video Editors</h1>
            <p className="text-[9px] text-muted mt-1.5 uppercase tracking-[0.4em] font-black opacity-40">Operations Hub</p>
          </div>
        </div>

        <nav className="flex flex-col gap-2 flex-1 overflow-y-auto pr-2 scrollbar-hide">
          <div className="flex items-center justify-between px-4 py-2.5 mb-6 bg-white/[0.03] border border-white/[0.05] rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">🎨 Colorful UI</span>
            <button
              onClick={() => setColorfulTabs(!colorfulTabs)}
              className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 cursor-pointer ${colorfulTabs ? 'bg-primary shadow-lg shadow-primary/40' : 'bg-white/10'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${colorfulTabs ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          {/* Top Static Tabs */}
          {stages.filter(s => s.gid === '1476192399' || s.gid === '1535230545').filter(stage => !profile?.role || PERMISSIONS.canViewTab(profile.role, stage.label, profile.allowed_tabs || [])).map((stage) => (
            <SidebarItem
              key={stage.gid}
              icon={stage.icon}
              label={stage.label}
              colorHex={stage.colorHex}
              colorful={colorfulTabs}
              active={activeGid === stage.gid}
              isPinned={pinnedTabs.includes(stage.gid)}
              onTogglePin={() => togglePinTab(stage.gid)}
              onClick={() => {
                setActiveGid(stage.gid);
                setActiveLabel(stage.label);
                setStatusFilter('All');
                setTeacherFilter('All');
                setYearFilter('All');
                setTermFilter('All');
                setBypassYearTerm(false);
                setStageWeekFilter('All');
                setColFilters({});
                setSearchQuery('');
              }}
            />
          ))}

          {/* Mode Selector (Segmented control between Operations, Reels, and Designers) */}
          <div className="mt-2 mb-4 px-1">
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 gap-1">
              {(['OP', 'REELS', 'DESIGNERS'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setAppMode(mode);
                    if (mode === 'REELS') {
                      setActiveGid('1436746012');
                      setActiveLabel('Shooting');
                    } else if (mode === 'DESIGNERS') {
                      setActiveGid('501319673');
                      setActiveLabel('Designers');
                    } else {
                      setActiveGid('497207661');
                      setActiveLabel('Junior 4');
                    }
                    setStatusFilter('All');
                    setTeacherFilter('All');
                    setYearFilter('All');
                    setTermFilter('All');
                    setBypassYearTerm(false);
                    setStageWeekFilter('All');
                    setColFilters({});
                    setSearchQuery('');
                  }}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${
                    appMode === mode
                      ? 'bg-primary text-white shadow-lg'
                      : 'text-muted hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  {mode === 'OP' ? 'Operations' : mode === 'REELS' ? 'Reels' : 'Designers'}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Tabs based on Mode */}
          <div className="flex flex-col gap-1">
            {(appMode === 'OP' 
              ? stages.filter(s => s.gid !== '1476192399' && s.gid !== '1535230545' && s.gid !== 'analytics_tagme3at') 
              : appMode === 'REELS' 
              ? reelsStages 
              : designersStages
            )
              .filter(stage => !profile?.role || PERMISSIONS.canViewTab(profile.role, stage.label, profile.allowed_tabs || []))
              .map((stage) => (
              <SidebarItem
                key={stage.gid}
                icon={stage.icon}
                label={stage.label}
                colorHex={stage.colorHex}
                colorful={colorfulTabs}
                active={activeGid === stage.gid}
                isPinned={pinnedTabs.includes(stage.gid)}
                onTogglePin={() => togglePinTab(stage.gid)}
                onClick={() => {
                  setActiveGid(stage.gid);
                  setActiveLabel(stage.label);
                  setStatusFilter('All');
                  setTeacherFilter('All');
                  setYearFilter('All');
                  setTermFilter('All');
                  setBypassYearTerm(false);
                  setStageWeekFilter('All');
                  setColFilters({});
                  setSearchQuery('');
                }}
              />
            ))}
          </div>

          {/* Bottom Static Tabs (Analytics) */}
          <div className="mt-4">
            {stages.filter(s => s.gid === 'analytics_tagme3at').filter(stage => !profile?.role || PERMISSIONS.canViewTab(profile.role, stage.label, profile.allowed_tabs || [])).map((stage) => (
              <SidebarItem
                key={stage.gid}
                icon={stage.icon}
                label={stage.label}
                colorHex={stage.colorHex}
                colorful={colorfulTabs}
                active={activeGid === stage.gid}
                onClick={() => {
                  setActiveGid(stage.gid);
                  setActiveLabel(stage.label);
                  setStatusFilter('All');
                  setTeacherFilter('All');
                  setYearFilter('All');
                  setTermFilter('All');
                  setBypassYearTerm(false);
                  setStageWeekFilter('All');
                  setColFilters({});
                  setSearchQuery('');
                }}
              />
            ))}
          </div>
          {/* Users tab for admin and manager */}
          {profile?.role && PERMISSIONS.canManageUsers(profile.role) && (
            <SidebarItem
              key="users"
              icon={Users}
              label="المستخدمين 👥"
              colorHex="#f43f5e"
              colorful={colorfulTabs}
              active={activeGid === '__users__'}
              onClick={() => {
                setActiveGid('__users__');
                setActiveLabel('المستخدمين');
              }}
            />
          )}
        </nav>

        {/* User Profile Card */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-3xl p-4 relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0 ${
              profile?.role === 'admin' ? 'bg-gradient-to-br from-rose-600 to-pink-600' :
              profile?.role === 'manager' ? 'bg-gradient-to-br from-purple-600 to-violet-600' :
              profile?.role === 'supervisor' ? 'bg-gradient-to-br from-blue-600 to-cyan-600' :
              'bg-gradient-to-br from-emerald-600 to-teal-600'
            }`}>
              {profile?.name ? profile.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate arabic-text">{profile?.name || 'مستخدم'}</p>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${profile?.role ? ROLE_COLORS[profile.role] : 'bg-white/5 text-white/40 border-white/10'}`}>
                {profile?.role ? ROLE_LABELS[profile.role] : ''}
              </span>
            </div>
            <button
              onClick={() => signOut()}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-white/30 flex items-center justify-center transition-all cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut size={14} />
            </button>
          </div>
          {/* DEBUG - remove later */}
          <div className="mt-2 text-[9px] text-yellow-400/70 break-all">
            role: {profile?.role ?? 'NULL'} | tabs: {JSON.stringify(profile?.allowed_tabs ?? 'NULL')}
          </div>
        </div>
      </aside>

      {/* Users Management Page */}
      {isUsersPage ? (
        <main className="flex-1 flex flex-col min-w-0 bg-[#05070a] p-12 overflow-y-auto">
          <UserManagement />
        </main>
      ) : (
        <main className="flex-1 flex flex-col min-w-0 bg-[#05070a]">
        <header className="px-12 py-10 flex justify-between items-end bg-background/30 backdrop-blur-3xl sticky top-0 z-10 border-b border-white/[0.03]">
          <motion.div key={activeLabel} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-2">
            <div className="flex items-center gap-3 text-primary mb-1 uppercase tracking-[0.3em] font-black text-[10px]">
              <Clock size={12} />
              <span>Real-time Operational Link</span>
            </div>
            <h2 className="text-5xl font-black arabic-text tracking-tighter">{activeLabel}</h2>
            <p className="text-[10px] text-muted opacity-40 uppercase tracking-widest font-bold">
              {loading ? 'Syncing...' : `${filteredData.length} record${filteredData.length !== 1 ? 's' : ''} loaded`}
            </p>
          </motion.div>

          <div className="flex items-center gap-4">
            {/* Personal Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => { setShowMyNotifs(!showMyNotifs); setShowNotifications(false); if (unreadCount > 0) setMyNotifs(prev => prev.map(n => ({ ...n, read: true }))); }}
                className={`relative p-3.5 rounded-2xl border transition-all flex items-center justify-center ${unreadCount > 0 ? 'bg-rose-500/10 border-rose-500/40 hover:bg-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.3)]' : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.08]'}`}
                title="إشعاراتي"
              >
                <Bell size={20} className={`transition-all duration-300 ${unreadCount > 0 ? 'text-rose-400 animate-pulse' : 'text-white/20'}`} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-[0_0_15px_rgba(244,63,94,0.7)] animate-bounce">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showMyNotifs && (
                <div className="absolute right-0 mt-3 w-96 bg-[#0a0e14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] flex flex-col max-h-[480px]" dir="rtl">
                  <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
                    <span className="font-bold text-sm flex items-center gap-2"><Bell size={14} className="text-rose-400" /> إشعاراتي ({myNotifs.length})</span>
                    {myNotifs.length > 0 && <button onClick={() => setMyNotifs([])} className="text-[10px] text-muted hover:text-rose-400 transition-colors">مسح الكل</button>}
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {myNotifs.length === 0 ? (
                      <div className="p-10 text-center text-muted/50">
                        <Bell size={28} className="mx-auto mb-3 opacity-20" />
                        <p className="text-xs">لا توجد إشعارات</p>
                      </div>
                    ) : (
                      <div className="flex flex-col divide-y divide-white/[0.04]">
                        {myNotifs.map((n) => (
                          <div key={n.id} className={`p-4 flex flex-col gap-1.5 transition-colors ${n.read ? 'opacity-60' : 'bg-white/[0.02]'}`}>
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                n.type === 'done' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                                n.type === 'cancel' ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' :
                                n.type === 'new_entry' ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' :
                                n.type === 'tagme_transfer' ? 'bg-purple-500/15 border-purple-500/30 text-purple-400' :
                                n.type === 'subscribe' ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' :
                                n.type === 'unsubscribe' ? 'bg-white/5 border-white/10 text-muted' :
                                'bg-blue-500/15 border-blue-500/30 text-blue-400'
                              }`}>
                                {n.type === 'done' ? '✅ مكتملة' : 
                                 n.type === 'cancel' ? '❌ ملغاة' : 
                                 n.type === 'undone' ? '↩️ تراجع' : 
                                 n.type === 'new_entry' ? '🆕 مهمة جديدة' :
                                 n.type === 'tagme_transfer' ? '🔄 تحويل' :
                                 n.type === 'subscribe' ? '🔔 متابعة' :
                                 n.type === 'unsubscribe' ? '🔕 إلغاء متابعة' :
                                 '📝 ملاحظة'}
                              </span>
                              <span className="text-[10px] text-muted">من: {n.from}</span>
                            </div>
                            <p className="text-xs text-white font-bold arabic-text leading-relaxed">{n.message}</p>
                            {n.taskName && n.taskName !== n.message && (
                              <p className="text-[10px] text-muted truncate opacity-60 font-mono">{n.taskName}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sheet new items bell */}
            <div className="relative">
              <button 
                 onClick={() => { setShowNotifications(!showNotifications); setShowMyNotifs(false); }}
                 className="relative p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center"
              >
                <Bell size={20} className="text-muted hover:text-white transition-colors" />
                {newItems.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse">
                    {newItems.length}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-[#0a0e14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] flex flex-col max-h-[400px]">
                  <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
                    <span className="font-bold text-sm">Notifications ({newItems.length})</span>
                    {newItems.length > 0 && (
                       <button onClick={() => { setNewItems([]); localStorage.removeItem(`new_items_${activeGid}`); }} className="text-[10px] text-muted hover:text-white transition-colors">Clear All</button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {newItems.length === 0 ? (
                      <div className="p-8 text-center text-muted text-xs">No new updates</div>
                    ) : (
                      <div className="flex flex-col">
                        {newItems.map((item, i) => (
                          <div 
                            key={i} 
                            onClick={() => handleNotificationClick(item)}
                            className="p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors flex flex-col gap-1.5"
                          >
                            <span className="text-xs font-bold text-white line-clamp-2 arabic-text whitespace-pre-wrap">{item.name}</span>
                            <span className="text-[10px] text-primary">{item.id || item.val || item.teacher || 'New entry added'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {profile?.role && PERMISSIONS.canSync(profile.role) && (
              <button onClick={() => refresh()} className="btn-glass px-7 py-3.5 rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest cursor-pointer hover:scale-105 active:scale-95 transition-all">
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                <span>Synchronize</span>
              </button>
            )}
            {profile?.role && (activeGid === '1436746012' || activeGid === '0' || PERMISSIONS.canAddEntry(profile.role)) && (
              <button
                onClick={() => {
                  if (activeGid === '0') {
                    setShootingAddForm(prev => ({ ...prev, type: 'CUT' }));
                  } else {
                    setShootingAddForm(prev => ({ ...prev, type: 'حواري' }));
                  }
                  setShowAddModal(true);
                }}
                className="btn-primary px-8 py-3.5 rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all"
              >
                <Plus size={20} />
                <span>Add entry</span>
              </button>
            )}
          </div>
        </header>

        {/* Add Entry Glass Modal */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn" dir="rtl">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[#0b1019] border border-white/10 rounded-3xl p-8 max-w-xl w-full shadow-[0_0_50px_rgba(0,0,0,0.8)] space-y-6 relative overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                      <Plus size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white arabic-text">
                        {activeGid === '0' ? 'إضافة ريل / مهمة قطع جديدة' : 'إضافة درس / عملية جديدة'}
                      </h3>
                      <p className="text-xs text-muted">
                        سيتم إضافته فورياً إلى شيت [{['1436746012', '1939073164', '798246690'].includes(activeGid) ? 'Shooting' : activeGid === '0' ? 'Cuts' : activeLabel}]
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-white p-2 transition-colors cursor-pointer">
                    <XCircle size={22} />
                  </button>
                </div>

                <form onSubmit={handleAddSubmit} className="space-y-4">
                  {['1436746012', '1939073164', '798246690', '0'].includes(activeGid) ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">الفرع (Branch)</label>
                          <select
                            value={shootingAddForm.branch}
                            onChange={e => setShootingAddForm({...shootingAddForm, branch: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors font-bold arabic-text text-sm"
                          >
                            <option value="Alexandria" className="bg-[#0b1019]">Alexandria</option>
                            <option value="Desouk" className="bg-[#0b1019]">Desouk</option>
                            <option value="Cairo" className="bg-[#0b1019]">Cairo</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">السنة (Year)</label>
                          <select
                            value={shootingAddForm.year}
                            onChange={e => setShootingAddForm({...shootingAddForm, year: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors font-bold arabic-text text-sm"
                          >
                            {yearOptions.map(y => (
                              <option key={y} value={y} className="bg-[#0b1019]">{y.toUpperCase()}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 items-end">
                        {activeGid !== '0' ? (
                          <>
                            <div className="relative">
                              <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">المدرس (Teacher)</label>
                              <InlineCombobox
                                options={teacherOptions}
                                value={shootingAddForm.teacher}
                                onChange={(val: string) => setShootingAddForm({...shootingAddForm, teacher: val})}
                                placeholder="اختر أو ضف مدرس"
                              />
                            </div>
                            <div className="relative">
                              <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">اسم إضافي (Extra Name)</label>
                              <InlineCombobox
                                options={uniqueExtraNames}
                                value={shootingAddForm.extraName}
                                onChange={(val: string) => setShootingAddForm({...shootingAddForm, extraName: val})}
                                placeholder="اختر أو ضف اسم إضافي"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="relative col-span-2">
                            <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">المنشئ / المصور (Creator)</label>
                            <InlineCombobox
                              options={uniqueExtraNames}
                              value={shootingAddForm.extraName}
                              onChange={(val: string) => setShootingAddForm({...shootingAddForm, extraName: val})}
                              placeholder="اختر أو ضف اسم المنشئ"
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">النوع (Type)</label>
                          <input
                            type="text"
                            value={shootingAddForm.type}
                            onChange={e => setShootingAddForm({...shootingAddForm, type: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors font-bold text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">المقاس (Format)</label>
                          <input
                            type="text"
                            value={shootingAddForm.format}
                            onChange={e => setShootingAddForm({...shootingAddForm, format: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors font-bold text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">اسم السكريبت (Script Name)</label>
                          <input
                            type="text"
                            placeholder="مثال: سكريبت مستر حسام"
                            value={shootingAddForm.scriptName}
                            onChange={e => setShootingAddForm({...shootingAddForm, scriptName: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors font-bold arabic-text text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">رابط السكريبت (Script Link)</label>
                          <input
                            type="url"
                            placeholder="https://docs.google.com/..."
                            value={shootingAddForm.scriptLink || ''}
                            onChange={e => setShootingAddForm({...shootingAddForm, scriptLink: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors font-bold text-sm"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl mt-4">
                        <label className="block text-xs font-bold text-primary mb-1.5 arabic-text">الكود المتولد تلقائياً (Code)</label>
                        <div className="font-mono text-lg text-white" dir="ltr">{generatedCode || 'جاري الحساب...'}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">اسم الدرس / العملية *</label>
                        <input
                          type="text"
                          required={activeGid !== '1436746012'}
                          placeholder="مثال: الوحدة الرابعة - مراجعة عامة..."
                          value={addForm.name}
                          onChange={e => setAddForm({...addForm, name: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors font-bold arabic-text text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">التاريخ / المعرف</label>
                          <input
                            type="text"
                            placeholder="مثال: 4/25/2026"
                            value={addForm.id}
                            onChange={e => setAddForm({...addForm, id: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors font-mono text-sm text-left"
                            dir="ltr"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">المادة / التصنيف</label>
                          <input
                            type="text"
                            placeholder="مثال: لغة عربية"
                            value={addForm.subject}
                            onChange={e => setAddForm({...addForm, subject: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors font-bold arabic-text text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">الفرع / النطاق</label>
                          <input
                            type="text"
                            placeholder="مثال: القاهرة"
                            value={addForm.extra}
                            onChange={e => setAddForm({...addForm, extra: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors font-bold arabic-text text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">المحرر / المدرس</label>
                          <input
                            type="text"
                            placeholder="اسم المونتير أو المدرس"
                            value={addForm.editor}
                            onChange={e => setAddForm({...addForm, editor: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors font-bold arabic-text text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">كود العملية (OP NAME) / تفاصيل إضافية</label>
                        <input
                          type="text"
                          placeholder="J4-T2-U3-..."
                          value={addForm.filingName}
                          onChange={e => setAddForm({...addForm, filingName: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors font-mono text-xs text-left"
                          dir="ltr"
                        />
                      </div>
                    </>
                  )}

                  <div className="pt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors font-bold arabic-text text-xs cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={loading || (activeGid === '1436746012' && !generatedCode)}
                      className="px-8 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold arabic-text text-xs shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>حفظ وإضافة 🚀</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>



        <div className="p-12 space-y-10">
          {/* Pinned Favorite Tabs Bar */}
          {pinnedTabs.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest ml-1 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl shrink-0">
                <Pin size={12} className="fill-amber-400" /> المفضلة:
              </span>
              {pinnedTabs.map((gid) => {
                const allStagesList = [...stages, ...reelsStages, ...designersStages];
                const stage = allStagesList.find(s => s.gid === gid);
                if (!stage) return null;
                const isActive = activeGid === gid;
                return (
                  <button
                    key={gid}
                    onClick={() => {
                      setActiveGid(gid);
                      setActiveLabel(stage.label);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-primary/20 border-primary/50 text-white shadow-lg shadow-primary/20 scale-105'
                        : 'bg-white/5 border-white/10 text-muted hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.colorHex || '#8b5cf6' }} />
                    <span>{stage.label}</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePinTab(gid);
                      }}
                      className="hover:text-rose-400 opacity-40 hover:opacity-100 transition-all p-0.5 ml-1"
                      title="إلغاء التثبيت"
                    >
                      ×
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Filters Bar */}
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex-1 min-w-[240px] relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={20} />
              <input
                type="text"
                placeholder="Search across nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold arabic-text"
              />
            </div>

            {/* My Tasks Only Toggle */}
            <button
              onClick={() => setIsMyTasksOnly(prev => !prev)}
              className={`flex items-center gap-2 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer border shrink-0 ${
                isMyTasksOnly
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-lg shadow-rose-500/20 ring-2 ring-rose-500/40'
                  : 'bg-white/5 border-white/10 text-muted hover:bg-white/10 hover:text-white'
              }`}
              title={isMyTasksOnly ? 'عرض كل المهام' : `عرض المهام المسندة إلى (${currentUserName})`}
            >
              <span>مهامي فقط ({currentUserName.split(' ')[0]}) 🎯</span>
            </button>



            <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
              {isOperations && (
                <>
                  <div className="flex items-center gap-2 px-4 border-r border-white/10 group">
                    <User size={16} className="text-muted group-hover:text-primary transition-colors" />
                    <CustomSelect
                      value={teacherFilter}
                      onChange={setTeacherFilter}
                      options={teachers}
                      placeholder="Teachers"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-4 border-r border-white/10 mr-2 group">
                    <Clock size={16} className="text-muted group-hover:text-primary transition-colors" />
                    <CustomSelect
                      value={yearFilter}
                      onChange={setYearFilter}
                      options={years}
                      placeholder="Years"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-4 border-r border-white/10 mr-2 group">
                    <Clock size={16} className="text-muted group-hover:text-primary transition-colors" />
                    <CustomSelect
                      value={termFilter}
                      onChange={setTermFilter}
                      options={['T1', 'T2']}
                      placeholder="Terms"
                    />
                  </div>
                </>
              )}
              {isTagme3at && (
                <>
                  {['All', 'Pending', 'Done'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === f ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-muted hover:bg-white/5 hover:text-foreground'}`}
                    >
                      {f}
                    </button>
                  ))}
                  <div className="h-6 w-px bg-white/10 mx-2" />
                  <button
                    onClick={() => setTagmeViewMode(prev => prev === 'SIMPLE' ? 'DETAILED' : 'SIMPLE')}
                    className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 hover:border-primary/40 rounded-2xl transition-all cursor-pointer group"
                    title={tagmeViewMode === 'SIMPLE' ? 'عرض الفئة التفصيلية' : 'عرض الفئة البسيطة'}
                  >
                    <span className="text-xs font-bold text-muted group-hover:text-white transition-colors">
                      {tagmeViewMode === 'SIMPLE' ? 'مود بسيط ⚡' : 'مود تفصيلي 📋'}
                    </span>
                    <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 ${
                      tagmeViewMode === 'SIMPLE' ? 'bg-primary' : 'bg-purple-600'
                    }`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                        tagmeViewMode === 'SIMPLE' ? 'translate-x-0' : 'translate-x-4'
                      }`} />
                    </div>
                  </button>
                </>
              )}
              {!isTagme3at && !isOperations && (
                <span className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted opacity-40">{activeLabel}</span>
              )}
            </div>
          </div>

          {/* Quick Task Jumper Bar when My Tasks Only is active */}
          {isMyTasksOnly && (
            <div className="flex items-center gap-2 overflow-x-auto p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl animate-fadeIn" dir="rtl">
              <span className="text-xs font-black text-rose-400 flex items-center gap-1.5 shrink-0 ml-2">
                🎯 انقر للانتقال الفوري ({filteredData.length} مهمة):
              </span>
              {filteredData.length === 0 ? (
                <span className="text-xs text-muted font-bold">لا توجد مهام مسندة إليك حالياً في هذه الصفحة</span>
              ) : (
                filteredData.map((task: any) => {
                  const taskId = task.uniqueKey || generateKey(task);
                  const taskName = task.name || task.filingName || 'مهمة بدون عنوان';
                  return (
                    <button
                      key={taskId}
                      onClick={() => jumpToTask(taskId)}
                      className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-rose-500/25 hover:border-rose-500/50 border border-white/10 text-white text-xs font-bold transition-all cursor-pointer truncate max-w-[220px] shrink-0 shadow-sm flex items-center gap-1.5"
                      title={`الانتقال إلى: ${taskName}`}
                    >
                      <MapPin size={12} className="text-rose-400 shrink-0" />
                      <span className="truncate">{taskName}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Sort & Order Bar */}
          <div className="flex items-center justify-end gap-3 text-xs bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-2xl animate-fadeIn" dir="rtl">
            <span className="font-bold text-muted ml-2"> ترتيب حسب:</span>
            <button
              onClick={() => {
                if (sortBy !== 'name') {
                  setSortBy('name');
                  setSortOrder('asc');
                } else {
                  setSortOrder(p => p === 'asc' ? 'desc' : 'asc');
                }
              }}
              className={`px-3 py-1.5 rounded-xl border font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                sortBy === 'name'
                  ? 'bg-primary/20 border-primary text-primary font-black scale-105 shadow-md shadow-primary/10'
                  : 'bg-white/5 border-white/10 text-muted hover:bg-white/10'
              }`}
            >
              <span>الاسم (Name)</span>
              {sortBy === 'name' && (sortOrder === 'asc' ? '🔼' : '🔽')}
            </button>

            <button
              onClick={() => {
                if (sortBy !== 'date') {
                  setSortBy('date');
                  setSortOrder('asc');
                } else {
                  setSortOrder(p => p === 'asc' ? 'desc' : 'asc');
                }
              }}
              className={`px-3 py-1.5 rounded-xl border font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                sortBy === 'date'
                  ? 'bg-primary/20 border-primary text-primary font-black scale-105 shadow-md shadow-primary/10'
                  : 'bg-white/5 border-white/10 text-muted hover:bg-white/10'
              }`}
            >
              <span>التاريخ (Date)</span>
              {sortBy === 'date' && (sortOrder === 'asc' ? '🔼' : '🔽')}
            </button>
            <button
              onClick={() => {
                if (sortBy !== 'addedDate') {
                  setSortBy('addedDate');
                  setSortOrder('desc'); // Default to descending for "recent"
                } else {
                  setSortOrder(p => p === 'asc' ? 'desc' : 'asc');
                }
              }}
              className={`px-3 py-1.5 rounded-xl border font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                sortBy === 'addedDate'
                  ? 'bg-primary/20 border-primary text-primary font-black scale-105 shadow-md shadow-primary/10'
                  : 'bg-white/5 border-white/10 text-muted hover:bg-white/10'
              }`}
            >
              <span>تاريخ الإضافة (Date Added)</span>
              {sortBy === 'addedDate' && (sortOrder === 'asc' ? '🔼' : '🔽')}
            </button>

            {sortBy !== 'default' && (
              <button
                onClick={() => setSortBy('default')}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold hover:bg-rose-500/20 transition-all cursor-pointer mr-auto"
              >
                إلغاء الترتيب ✕
              </button>
            )}
          </div>

          {/* Week Filter Pills Bar (For Stage Sheets) */}
          {isStage && !isReelsStage && availableWeeks.length > 0 && (
            <div className="flex flex-wrap gap-2.5 items-center bg-white/[0.02] border border-white/[0.05] p-3.5 rounded-2xl animate-fadeIn shadow-lg" dir="rtl">
              <span className="text-xs font-black text-muted ml-2">📌 تصفية بالأسبوع:</span>
              <button
                onClick={() => setStageWeekFilter('All')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                  stageWeekFilter === 'All'
                    ? 'bg-primary text-white shadow-lg shadow-primary/30 ring-2 ring-primary/50 font-black'
                    : 'bg-white/5 text-muted hover:bg-white/10 hover:text-white'
                }`}
              >
                كل الأسابيع ({combinedData.length})
              </button>
              {availableWeeks.map((w) => (
                <button
                  key={w}
                  onClick={() => setStageWeekFilter(w)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer flex items-center gap-2 ${
                    stageWeekFilter === w
                      ? 'bg-primary text-white shadow-lg shadow-primary/30 ring-2 ring-primary/50 font-black'
                      : 'bg-white/5 text-muted hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${w.includes('1') ? 'bg-emerald-400' : w.includes('2') ? 'bg-cyan-400' : w.includes('3') ? 'bg-amber-400' : w.includes('4') ? 'bg-purple-400' : 'bg-rose-400'}`} />
                  <span>{w}</span>
                </button>
              ))}
            </div>
          )}

          {/* Main Content View (Table vs Analytics) */}
          {isReelsAnalytics ? (
            <ReelsAnalytics />
          ) : isAnalyticsTagme ? (
            <TagmeAnalyticsDashboard combinedData={combinedData} tagmeTransfers={tagmeTransfers} loading={loading} taskStatuses={taskStatuses} taskPriorities={taskPriorities} />
          ) : isDesignAnalytics ? (
            <DesignAnalytics liveData={liveData} loading={loading} />
          ) : isDesignersPage ? (
            <DesignersDashboard liveData={liveData} setLiveData={setLiveData} loading={loading} />
          ) : (
            <div className="table-container">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-white/[0.03] border-b border-white/[0.05]">
                      {renderHeaders()}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {/* Quick-Add Row for Reels Sheets GIDs */}
                    {['1436746012', '798246690', '0'].includes(activeGid) && profile?.role && (activeGid === '1436746012' || activeGid === '0' || PERMISSIONS.canAddEntry(profile.role)) && !loading && (
                      <tr 
                        onClick={() => {
                          if (activeGid === '0') {
                            setShootingAddForm(prev => ({ ...prev, type: 'CUT' }));
                          } else {
                            setShootingAddForm(prev => ({ ...prev, type: 'حواري' }));
                          }
                          setShowAddModal(true);
                        }}
                        className="border-b border-white/[0.05] bg-primary/[0.02] hover:bg-primary/[0.08] transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3.5 text-center">
                          <div className="w-8 h-8 rounded-full bg-primary/10 group-hover:bg-primary/20 text-primary flex items-center justify-center mx-auto transition-all scale-100 group-hover:scale-110 shadow-sm">
                            <Plus size={16} className="stroke-[3]" />
                          </div>
                        </td>
                        <td colSpan={colSpan - 1} className="px-4 py-3.5 text-right arabic-text">
                          <span className="text-xs font-black text-primary/80 group-hover:text-primary transition-colors tracking-wide font-black">
                            {activeGid === '0' ? '+ إضافة ريل جديد (Add New Cut Task)' : '+ إضافة اسكريبت جديد (Add New Script Task)'}
                          </span>
                        </td>
                      </tr>
                    )}

                    <AnimatePresence mode="popLayout">
                      {loading ? (
                        <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <td colSpan={colSpan} className="py-40 text-center">
                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.4em] text-primary">Syncing {activeLabel}...</p>
                          </td>
                        </motion.tr>
                    ) : isOperations && teacherFilter === 'All' && !searchQuery.trim() ? (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <td colSpan={colSpan} className="py-12">
                          <div className="text-center mb-10">
                            <h3 className="text-2xl font-black arabic-text mb-2">اختر المدرس</h3>
                            <p className="text-sm text-muted">يرجى اختيار المدرس لعرض العمليات الخاصة به</p>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-8">
                            {teachers.map((teacher: string, idx: number) => (
                              <motion.button
                                key={teacher}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.02 }}
                                onClick={() => setTeacherFilter(teacher)}
                                className="bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/50 hover:text-primary transition-all duration-300 rounded-2xl p-6 text-center group"
                              >
                                <div className="w-12 h-12 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                                  <User size={24} className="text-muted group-hover:text-primary" />
                                </div>
                                <span className="font-bold arabic-text text-lg block truncate">{teacher}</span>
                                <span className="text-[10px] text-muted uppercase tracking-widest mt-2 block opacity-50 group-hover:opacity-100">
                                  {liveData.filter((i: any) => i.teacher === teacher).length} Records
                                </span>
                              </motion.button>
                            ))}
                          </div>
                        </td>
                      </motion.tr>
                    ) : isOperations && teacherFilter !== 'All' && (yearFilter === 'All' || termFilter === 'All') && !bypassYearTerm && !searchQuery.trim() ? (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <td colSpan={colSpan} className="py-12">
                          <div className="flex flex-col items-center justify-center text-center mb-10 px-8">
                            <button
                              onClick={() => setTeacherFilter('All')}
                              className="mb-4 flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all rounded-xl text-xs font-bold text-muted hover:text-foreground"
                            >
                              <Undo2 size={14} />
                              رجوع لاختيار المدرس
                            </button>
                            <h3 className="text-2xl font-black arabic-text mb-2">اختر السنة الدراسية والترم</h3>
                            <p className="text-sm text-muted">المدرس الحالي: <span className="text-primary font-bold">{teacherFilter}</span></p>
                            
                            <button
                              onClick={() => setBypassYearTerm(true)}
                              className="mt-4 px-5 py-2 bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all rounded-xl text-xs font-bold text-primary"
                            >
                              عرض جميع الصفوف والترمات لـ {teacherFilter}
                            </button>
                          </div>
                          
                          <div className="space-y-12 px-8">
                            {/* Term 1 Section */}
                            <div>
                              <h4 className="text-lg font-bold arabic-text mb-4 text-right border-r-4 border-primary pr-3">الترم الأول (T1)</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {Object.entries(yearLabels).map(([yearKey, label]) => {
                                  const count = liveData.filter((i: any) => i.teacher === teacherFilter && i.year === yearKey && i.term === 'T1').length;
                                  return (
                                    <button
                                      key={`T1-${yearKey}`}
                                      disabled={count === 0}
                                      onClick={() => {
                                        setYearFilter(yearKey);
                                        setTermFilter('T1');
                                      }}
                                      className={`p-6 text-center rounded-2xl group transition-all duration-300 border ${
                                        count === 0 
                                          ? 'bg-white/5 border-white/10 opacity-40 cursor-not-allowed' 
                                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10'
                                      }`}
                                    >
                                      <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4 transition-all ${
                                        count === 0 ? 'bg-white/5 text-muted/30' : 'bg-emerald-500/20 text-emerald-400 group-hover:scale-110'
                                      }`}>
                                        <GraduationCap size={24} />
                                      </div>
                                      <span className="font-bold arabic-text text-sm block truncate">{label}</span>
                                      <span className="text-[10px] uppercase font-bold tracking-wider mt-2 block text-emerald-400/80">
                                        ترم أول (T1)
                                      </span>
                                      <span className="text-[10px] text-muted-foreground block mt-1 opacity-70">
                                        {count} Records
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Term 2 Section */}
                            <div>
                              <h4 className="text-lg font-bold arabic-text mb-4 text-right border-r-4 border-secondary pr-3">الترم الثاني (T2)</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {Object.entries(yearLabels).map(([yearKey, label]) => {
                                  const count = liveData.filter((i: any) => i.teacher === teacherFilter && i.year === yearKey && i.term === 'T2').length;
                                  return (
                                    <button
                                      key={`T2-${yearKey}`}
                                      disabled={count === 0}
                                      onClick={() => {
                                        setYearFilter(yearKey);
                                        setTermFilter('T2');
                                      }}
                                      className={`p-6 text-center rounded-2xl group transition-all duration-300 border ${
                                        count === 0 
                                          ? 'bg-white/5 border-white/10 opacity-40 cursor-not-allowed' 
                                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10'
                                      }`}
                                    >
                                      <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4 transition-all ${
                                        count === 0 ? 'bg-white/5 text-muted/30' : 'bg-emerald-500/20 text-emerald-400 group-hover:scale-110'
                                      }`}>
                                        <GraduationCap size={24} />
                                      </div>
                                      <span className="font-bold arabic-text text-sm block truncate">{label}</span>
                                      <span className="text-[10px] uppercase font-bold tracking-wider mt-2 block text-emerald-400/80">
                                        ترم ثاني (T2)
                                      </span>
                                      <span className="text-[10px] text-muted-foreground block mt-1 opacity-70">
                                        {count} Records
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    ) : filteredData.length > 0 ? filteredData.slice(0, visibleRecordsLimit).map((item: any, idx: number) => {
                      const itemKey = item.uniqueKey || generateKey(item);
                      const isGlowing = glowingKeys.includes(itemKey);

                      if (isOperations) {
                        const isSelected = selectedForMerge.some(i => generateKey(i) === generateKey(item));
                        return (
                          <OperationsRow
                            key={idx}
                            item={item}
                            index={idx}
                            youtubeItems={youtubeItems}
                            onYoutubeToggle={handleYoutubeToggle}
                            isSelectedForMerge={isSelected}
                            onToggleMergeSelect={handleToggleMergeSelect}
                            isGlowing={isGlowing}
                            onOpenBunnyLinkModal={(itemKey: string, itemName: string, initialUrl: string) => setBunnyLinkModal({ isOpen: true, itemKey, itemName, initialUrl })}
                          />
                        );
                      }
                      if (isTagme3at) {
                        // Priority limit: max 10 priority tasks per sheet per day (global, not per user)
                        const DAILY_PRIORITY_LIMIT = 10;
                        const totalPriorityToday = Object.values(taskPriorities).filter(v => v === true).length +
                          combinedData.filter((i: any) =>
                            (String(i.priority) === 'true' || i.priority === true) &&
                            !taskPriorities.hasOwnProperty(i.uniqueKey || generateKey(i))
                          ).length;
                        const canRaisePriority = totalPriorityToday < DAILY_PRIORITY_LIMIT;
                        const key = item.uniqueKey || generateKey(item);
                        const isSubscribed = subscribedTasks.includes(key) || (item.editor && item.editor.toLowerCase() === profile?.name?.toLowerCase());
                        return <TagmeRow key={idx} item={item} index={idx} isSimple={tagmeViewMode === 'SIMPLE'} onUpdateEditor={handleUpdateEditor} editorsList={editorsList} onUpdateEditorNotes={handleUpdateEditorNotes} onUpdateMarketingNotes={handleUpdateMarketingNotes} opSheetsList={opSheetsList} branchesList={branchesList} onUpdateOpSheet={handleUpdateOpSheet} onUpdateBranch={handleUpdateBranch} onUpdateDate={handleUpdateDate} isGlowing={isGlowing} liveData={liveData} canRaisePriority={canRaisePriority || (taskPriorities[key] === true)} priorityLimit={DAILY_PRIORITY_LIMIT} onStatusChange={handleStatusChange} isSubscribed={isSubscribed} onToggleSubscribe={() => toggleSubscribe(key)} priorityOverride={taskPriorities[key]} statusOverride={taskStatuses[key]} onUpdateThumbnailLink={handleUpdateThumbnailLink} onUpdateTime={handleUpdateTime} onUpdateYoutubeLink={handleUpdateYoutubeLink} onUpdateUploaded={handleUpdateUploaded} />;
                      }
                      if (activeGid === '0') {
                        return <CutsRow 
                          key={idx} 
                          item={item} 
                          index={idx} 
                          onUpdateShootingRow={handleUpdateShootingRow}
                          liveData={liveData} 
                          optionsLists={{ branches: uniqueBranches, years: uniqueYears, types: uniqueTypes, formats: uniqueFormats, editors: editorsList, extraNames: uniqueExtraNames }} 
                          autofillDrag={autofillDrag} 
                          setAutofillDrag={setAutofillDrag} 
                          onApplyAutofill={handleApplyAutofill} 
                          activeCell={activeCell} 
                          setActiveCell={setActiveCell} 
                          toast={toast}
                          isSubscribed={subscribedTasks.includes(item.id)}
                          onToggleSubscribe={toggleSubscribe}
                        />;
                      }
                      if (['1436746012', '1939073164', '798246690'].includes(activeGid)) {
                        return <ShootingRow key={idx} item={item} index={idx} activeGid={activeGid} onToggleFilmed={handleFilmedToggle} loadingFilmedCode={loadingFilmedCode} onUpdateShootingRow={handleUpdateShootingRow} liveData={liveData} optionsLists={{ branches: uniqueBranches, years: uniqueYears, teachers: uniqueTeachers, extraNames: uniqueExtraNames, types: uniqueTypes, formats: uniqueFormats, bys: uniqueBys, storages: uniqueStorages, editors: editorsList }} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApplyAutofill={handleApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} toast={toast} isSubscribed={subscribedTasks.includes(item.id)} onToggleSubscribe={toggleSubscribe} />;
                      }
                      return <StageRow key={idx} item={item} index={idx} tagmeTransfers={tagmeTransfers} onTagmeToggle={handleTagmeToggle} activeLabel={activeLabel} isGlowing={isGlowing} onUpdateDate={handleUpdateDate} onUpdateWeek={handleUpdateWeek} />;
                    }) : (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <td colSpan={colSpan} className="py-40 text-center opacity-30">
                          <AlertCircle size={48} className="mx-auto mb-6 stroke-1" />
                          <p className="text-xs font-black uppercase tracking-[0.3em]">No Records Found</p>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                  {filteredData.length > visibleRecordsLimit && !(isOperations && teacherFilter === 'All') && (
                    <tr>
                      <td colSpan={colSpan} className="py-10 text-center">
                        <div className="flex flex-col items-center justify-center gap-4 animate-fadeIn">
                          <p className="text-xs text-muted font-bold uppercase tracking-widest arabic-text">
                            تم عرض {visibleRecordsLimit} من إجمالي {filteredData.length} سجل. يرجى استخدام البحث أو الفلاتر، أو اضغط أدناه لعرض المزيد:
                          </p>
                          <button
                            onClick={() => setVisibleRecordsLimit(prev => prev + 200)}
                            className="px-8 py-3.5 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/30 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg hover:shadow-primary/20 flex items-center gap-2"
                          >
                            <Sparkles size={16} />
                            <span>عرض المزيد (Load More +200)</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>

        {/* Floating Bottom Toast & Merge Banners */}
        <AnimatePresence>
          {isOperations && selectedForMerge.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#0d121c]/95 border-2 border-purple-500/50 backdrop-blur-2xl px-8 py-4 rounded-3xl shadow-[0_0_50px_rgba(147,51,234,0.6)] flex items-center gap-8 text-white"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold text-xl animate-pulse shrink-0">
                  {selectedForMerge.length}
                </div>
                <div className="flex flex-col text-right" dir="rtl">
                  <span className="text-base font-bold text-white arabic-text">تم تحديد عدة دروس لتجميعها معاً في يوتيوب 🔗</span>
                  <span className="text-xs text-emerald-400 font-bold arabic-text mt-1">{calculateTotalDuration(selectedForMerge)}</span>
                  <span className="text-[10px] text-purple-300 arabic-text line-clamp-1 mt-0.5">{selectedForMerge.map(i => i.name).join(' + ')}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExecuteMerge}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold arabic-text rounded-2xl shadow-lg shadow-purple-600/40 transition-all scale-105 cursor-pointer flex items-center gap-2"
                >
                  <span>تجميع وتحويل للمرحلة 🚀</span>
                </button>
                <button
                  onClick={() => setSelectedForMerge([])}
                  className="px-4 py-3 bg-white/10 hover:bg-white/20 text-muted hover:text-white font-bold arabic-text rounded-2xl transition-all cursor-pointer text-xs"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          )}

          {activeToast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] bg-gradient-to-r from-[#1b0f24] via-[#2d123e] to-[#1b0f24] border-2 border-purple-500/50 px-8 py-5 rounded-2xl shadow-[0_0_50px_rgba(147,51,234,0.5)] flex items-center gap-8 max-w-2xl w-full justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 animate-pulse shrink-0">
                  <MonitorPlay size={32} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white arabic-text">تم تحويل الدرس إلى [{activeToast.stage.label}] بنجاح! 🚀</span>
                  <span className="text-xs text-purple-300 arabic-text line-clamp-1 mt-0.5">{activeToast.item.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => navigateToYoutubeTransfer(activeToast)}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg shadow-purple-600/50 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 whitespace-nowrap cursor-pointer"
                >
                  <span>الانتقال للصف</span>
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => setActiveToast(null)}
                  className="text-muted hover:text-white p-2 transition-colors cursor-pointer"
                >
                  <XCircle size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {activeTagmeToast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] bg-gradient-to-r from-[#061e14] via-[#092e1e] to-[#061e14] border-2 border-emerald-500/50 px-8 py-5 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.5)] flex items-center gap-8 max-w-2xl w-full justify-between text-white"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-pulse shrink-0">
                  <CheckCircle2 size={32} />
                </div>
                <div className="flex flex-col text-right" dir="rtl">
                  <span className="text-sm font-bold text-white arabic-text">تم تحويل الدرس إلى [شيت التجميعات] بنجاح! 🚀</span>
                  <span className="text-xs text-emerald-300 arabic-text line-clamp-1 mt-0.5">{activeTagmeToast.item.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => navigateToTagmeTransfer(activeTagmeToast)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg shadow-emerald-600/50 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 whitespace-nowrap cursor-pointer"
                >
                  <span>الانتقال للتجميعات</span>
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => setActiveTagmeToast(null)}
                  className="text-muted hover:text-white p-2 transition-colors cursor-pointer"
                >
                  <XCircle size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {activeVeToast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] bg-gradient-to-r from-[#061e14] via-[#092e1e] to-[#061e14] border-2 border-emerald-500/50 px-8 py-5 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.5)] flex items-center gap-8 max-w-2xl w-full justify-between text-white"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-pulse shrink-0">
                  <CheckCircle2 size={32} />
                </div>
                <div className="flex flex-col text-right" dir="rtl">
                  <span className="text-sm font-bold text-white arabic-text">تم النسخ إلى [شيت VE] بنجاح! 🚀</span>
                  <span className="text-xs text-emerald-300 arabic-text line-clamp-1 mt-0.5">{activeVeToast.item.id}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => {
                    setActiveGid('1939073164');
                    setActiveLabel('Ve');
                    setActiveVeToast(null);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg shadow-emerald-600/50 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 whitespace-nowrap cursor-pointer"
                >
                  <span>الانتقال للشيت</span>
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => setActiveVeToast(null)}
                  className="text-muted hover:text-white p-2 transition-colors cursor-pointer"
                >
                  <XCircle size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating new item toasts container */}
        <div className="fixed bottom-6 right-6 z-[300] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
          <AnimatePresence>
            {itemToasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, x: 100 }}
                className="pointer-events-auto bg-[#0a0e14]/95 border border-emerald-500/30 shadow-[0_10px_30px_rgba(16,185,129,0.15)] rounded-2xl p-4 flex gap-4 items-start relative overflow-hidden backdrop-blur-xl"
                dir="rtl"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <Bell size={20} className="animate-bounce" />
                </div>
                
                <div className="flex-1 min-w-0 text-right space-y-1">
                  <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">{toast.title || "تمت إضافة درس جديد! 🎉"}</h4>
                  <p className="text-xs font-bold text-white leading-relaxed line-clamp-2 arabic-text">{toast.name}</p>
                  {toast.filingName && (
                    <p className="text-[9px] font-mono text-muted/60 truncate uppercase tracking-wider">{toast.filingName}</p>
                  )}
                </div>
                
                <button 
                  onClick={() => setItemToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="text-muted hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <XCircle size={16} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Custom Premium Bunny Link Modal */}
        <AnimatePresence>
          {bunnyLinkModal && bunnyLinkModal.isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-[500] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[#0c0e14] border border-purple-500/20 rounded-3xl w-full max-w-md shadow-[0_0_80px_rgba(147,51,234,0.25)] overflow-hidden"
                dir="rtl"
              >
                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
                      <Link size={18} />
                    </div>
                    <div className="text-right">
                      <h3 className="font-black text-white arabic-text">رابط تشغيل الفيديو (Bunny)</h3>
                      <p className="text-[10px] text-purple-300 font-bold arabic-text mt-0.5">تحديث رابط تشغيل الدرس</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setBunnyLinkModal(null)}
                    className="text-muted hover:text-white p-2 transition-colors cursor-pointer"
                  >
                    <XCircle size={20} />
                  </button>
                </div>

                {/* Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const input = form.elements.namedItem('bunnyLinkInput') as HTMLInputElement;
                    handleUpdateBunnyLink(bunnyLinkModal.itemKey, input.value.trim());
                    setBunnyLinkModal(null);
                  }}
                  className="p-6 space-y-4"
                >
                  <div className="space-y-2 text-right">
                    <label className="text-[11px] font-black text-muted uppercase tracking-wider arabic-text">اسم الدرس</label>
                    <p className="text-sm font-bold text-white arabic-text leading-relaxed bg-white/[0.02] border border-white/5 rounded-2xl px-4 py-3">{bunnyLinkModal.itemName}</p>
                  </div>

                  <div className="space-y-2 text-right">
                    <label htmlFor="bunnyLinkInput" className="text-[11px] font-black text-muted uppercase tracking-wider arabic-text">رابط الفيديو (Bunny Link)</label>
                    <input
                      id="bunnyLinkInput"
                      name="bunnyLinkInput"
                      type="url"
                      defaultValue={bunnyLinkModal.initialUrl}
                      placeholder="https://iframe.mediadelivery.net/play/..."
                      autoFocus
                      required
                      className="w-full bg-[#070a10] border border-purple-500/20 focus:border-purple-500/50 rounded-2xl px-4 py-3.5 text-xs font-bold text-white outline-none transition-all shadow-inner text-left placeholder:text-muted/30"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold arabic-text py-3.5 px-6 rounded-2xl shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer text-center text-xs"
                    >
                      حفظ الرابط والتفعيل
                    </button>
                    <button
                      type="button"
                      onClick={() => setBunnyLinkModal(null)}
                      className="bg-white/5 hover:bg-white/10 text-muted hover:text-white font-bold arabic-text py-3.5 px-6 rounded-2xl transition-all cursor-pointer text-xs"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      )}
    </div>
  );
}

// ─── Auth Gate ─────────────────────────────────────────────────────────────────
function AppWithAuth() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060a12] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-xs font-black text-purple-400 uppercase tracking-[0.4em]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && !profile) return <LoginPage />;
  return <App />;
}

// ─── Splash Screen ─────────────────────────────────────────────────────────────
const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000); // 2 seconds
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
      className="fixed inset-0 z-[9999] bg-blue-950 flex items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-cyan-900/20 opacity-50" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-6"
        >
          <h1 className="text-8xl md:text-[120px] font-black text-white tracking-tighter drop-shadow-[0_0_40px_rgba(255,255,255,0.3)] font-tajawal">
            الخطة
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="flex items-center gap-4 text-sm md:text-xl font-bold uppercase tracking-[0.4em] text-yellow-400"
        >
          <span className="w-12 h-[1px] bg-gradient-to-r from-transparent to-yellow-400/50" />
          <span>Marketing & Video Editing HUB</span>
          <span className="w-12 h-[1px] bg-gradient-to-l from-transparent to-yellow-400/50" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="mt-16"
        >
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0.2, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1.2 }}
                transition={{
                  repeat: Infinity,
                  repeatType: "reverse",
                  duration: 0.6,
                  delay: i * 0.2,
                }}
                className="w-2 h-2 rounded-full bg-yellow-400"
              />
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

function RootApp() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <AuthProvider>
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen key="splash" onComplete={() => setShowSplash(false)} />
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="w-full h-full"
          >
            <AppWithAuth />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthProvider>
  );
}

export default function Root() {
  return <RootApp />;
}

