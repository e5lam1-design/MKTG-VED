import React, { useState, useMemo, useEffect } from 'react';
import { Loader2, Search, CheckSquare, Square, ChevronDown, Plus, X } from 'lucide-react';

const DESIGNERS = ['SHERIF', 'SHROUK', 'ESRAA', 'Hesham', 'Sohaila', 'alaa', 'alaa zakria', 'NOUR', 'NOURHAN', 'KHALED', 'EMAN', 'AWNEY', 'ANAS', 'SAMIR', 'MONA', 'YOMNA', 'MANAR', 'MARAM', 'Esraa nagi', 'A.AMR', 'AHMED', 'nada', 'abdelkerim', 'Donia', 'Esraa Naga', 'A.Medhat'];
const PRIORITIES = ['انهارده - ضروري', 'بكرة', 'انهارده - ممكن يتأجل', 'CHECK DEADLINE'];
const REQUESTERS = ['Narden', 'AYA', 'MANAR', 'JUMANA'];
const TYPES = ['THUMBNAIL', 'YT-COMMUNTIY', 'SOCIAL-MEDIA', 'OTHER'];

// Custom Google-Sheets-style Dropdown component (pill shaped)
const DropdownSelect = ({ value, onChange, options, getStyles }: any) => {
  const finalOptions = useMemo(() => {
    const valStr = String(value || '').trim();
    if (valStr && !options.includes(valStr)) {
      return [valStr, ...options];
    }
    return options;
  }, [value, options]);

  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none text-xs font-black pl-7 pr-3.5 py-1.5 rounded-full border cursor-pointer outline-none transition-all shadow-sm ${getStyles(value)}`}
      >
        {finalOptions.map((opt: string) => (
          <option key={opt} value={opt} className="bg-[#0a0d14] text-white">
            {opt}
          </option>
        ))}
      </select>
      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-80">
        <ChevronDown size={10} />
      </div>
    </div>
  );
};

// Custom header drop-down filter component
const HeaderFilter = ({ label, value, onChange, options }: any) => {
  const isFiltered = value !== 'All';
  return (
    <div className="flex flex-col items-start gap-1 justify-center my-1 select-none">
      <span className="text-[10px] text-muted/60 uppercase tracking-widest font-black arabic-text">{label}</span>
      <div className="relative inline-flex items-center">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`appearance-none bg-black/40 hover:bg-black/60 text-[10px] font-black pl-7 pr-3.5 py-1.5 rounded-xl border cursor-pointer outline-none transition-all ${
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
        <div className={`absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-current transition-colors ${isFiltered ? 'text-purple-400' : 'opacity-40'}`}>
          <ChevronDown size={10} className="stroke-[3]" />
        </div>
      </div>
    </div>
  );
};

// Optimized inline editable Notes Input component
const NotesInput = ({ value, onChange, className }: any) => {
  const [val, setVal] = React.useState(value || '');

  React.useEffect(() => {
    setVal(value || '');
  }, [value]);

  const handleBlur = () => {
    if (val !== (value || '')) {
      onChange(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder="إضافة ملاحظات..."
      className={`bg-transparent text-xs font-medium border border-transparent focus:border-white/20 hover:bg-white/5 focus:bg-[#0a0d14] rounded-lg px-2.5 py-1.5 outline-none text-right transition-all w-full max-w-[250px] arabic-text placeholder:text-white/10 ${className}`}
      dir="rtl"
    />
  );
};

export default function DesignersDashboard({ liveData, setLiveData, loading, onAddDesignTask, onUpdateDesignTask }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [filters, setFilters] = useState({
    designer: 'All',
    priority: 'All',
    requester: 'All',
    type: 'All',
    done: 'All'
  });
  
  const toggleRequesterFilter = (name: string) => {
    setFilters(prev => {
      const isAlreadyActive = prev.requester === name;
      return {
        ...prev,
        requester: isAlreadyActive ? 'All' : name,
        done: isAlreadyActive ? 'All' : 'Pending'
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
  
  // Local state to make the table fully interactive and responsive
  const [localRows, setLocalRows] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    date: new Date().toLocaleDateString('en-US'),
    designer: DESIGNERS[0],
    priority: PRIORITIES[0],
    requester: REQUESTERS[0],
    type: TYPES[0],
    deadline: '',
    reference: '',
    notes: '',
    done: false
  });

  useEffect(() => {
    if (Array.isArray(liveData)) {
      setLocalRows(liveData);
    }
  }, [liveData]);

  const handleCellChange = async (rowIndex: number, field: string, value: any) => {
    const targetRow = localRows[rowIndex];
    if (!targetRow) return;

    // Update local state instantly for seamless responsiveness
    setLocalRows(prev => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], [field]: value };
      
      // Update completed_date locally for instant average duration calculations
      if (field === 'done') {
        updated[rowIndex].completed_date = value ? new Date().toLocaleDateString('en-US') : '';
      }
      return updated;
    });

    // Persist to Google Sheets and Supabase
    if (onUpdateDesignTask) {
      await onUpdateDesignTask(targetRow.reference || '', field, value, targetRow.id);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (onAddDesignTask) {
        await onAddDesignTask(addForm);
      } else {
        const newTask = {
          ...addForm,
          uniqueKey: `design_${Date.now()}`
        };
        setLocalRows(prev => [newTask, ...prev]);
      }
      setShowAddModal(false);
      // Reset form
      setAddForm({
        date: new Date().toLocaleDateString('en-US'),
        designer: DESIGNERS[0],
        priority: PRIORITIES[0],
        requester: REQUESTERS[0],
        type: TYPES[0],
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

  // Filter rows while keeping track of original index to support clean local editing
  const filteredRows = useMemo(() => {
    const mapped = localRows.map((r, idx) => ({ ...r, originalIndex: idx }));
    return mapped.filter((row: any) => {
      // 1. Search term match
      if (searchTerm) {
        const searchString = `${row.date || ''} ${row.designer || ''} ${row.priority || ''} ${row.requester || ''} ${row.type || ''} ${row.notes || ''}`.toLowerCase();
        if (!searchString.includes(searchTerm.toLowerCase())) return false;
      }
      // 2. Designer filter match
      if (filters.designer !== 'All' && String(row.designer || '').trim() !== filters.designer) return false;
      // 3. Priority filter match
      if (filters.priority !== 'All' && String(row.priority || '').trim() !== filters.priority) return false;
      // 4. Requester filter match
      if (filters.requester !== 'All' && String(row.requester || '').trim() !== filters.requester) return false;
      // 5. Type filter match
      if (filters.type !== 'All' && String(row.type || '').trim() !== filters.type) return false;
      // 6. Done filter match
      if (filters.done !== 'All') {
        const isDone = filters.done === 'Done';
        if (!!row.done !== isDone) return false;
      }
      return true;
    });
  }, [localRows, searchTerm, filters]);

  // Extract unique options dynamically from localRows
  const uniqueDesigners = useMemo(() => {
    const set = new Set(localRows.map(r => String(r.designer || '').trim()).filter(Boolean));
    return Array.from(set).sort();
  }, [localRows]);

  const uniquePriorities = useMemo(() => {
    const set = new Set(localRows.map(r => String(r.priority || '').trim()).filter(Boolean));
    return Array.from(set).sort();
  }, [localRows]);

  const uniqueRequesters = useMemo(() => {
    const set = new Set(localRows.map(r => String(r.requester || '').trim()).filter(Boolean));
    return Array.from(set).sort();
  }, [localRows]);

  const uniqueTypes = useMemo(() => {
    const set = new Set(localRows.map(r => String(r.type || '').trim()).filter(Boolean));
    return Array.from(set).sort();
  }, [localRows]);

  const countAya = useMemo(() => {
    return localRows.filter((r: any) => 
      !r.done && 
      (String(r.requester || '').toLowerCase().trim() === 'aya' || 
       String(r.designer || '').toLowerCase().trim() === 'aya')
    ).length;
  }, [localRows]);

  const countManar = useMemo(() => {
    return localRows.filter((r: any) => 
      !r.done && 
      (String(r.requester || '').toLowerCase().trim() === 'manar' || 
       String(r.designer || '').toLowerCase().trim() === 'manar')
    ).length;
  }, [localRows]);

  const countNarden = useMemo(() => {
    return localRows.filter((r: any) => 
      !r.done && 
      (String(r.requester || '').toLowerCase().trim() === 'narden' || 
       String(r.designer || '').toLowerCase().trim() === 'narden')
    ).length;
  }, [localRows]);

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
      {/* Header & Controls */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-[#0a0d14] p-6 rounded-3xl border border-white/5">
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
              {filteredRows.length} RECORDS LOADED FROM GOOGLE SHEETS
            </p>
            <div className="h-6 w-0.5 bg-white/20 hidden sm:block" />
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm sm:text-base uppercase font-extrabold text-white/70 tracking-wider">Active Review Tasks:</span>
              
              {/* AYA Counter */}
              {countAya > 5 ? (
                <button
                  onClick={() => toggleRequesterFilter('AYA')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-black transition-all hover:scale-105 active:scale-95 select-none outline-none ${
                    filters.requester === 'AYA'
                      ? 'bg-amber-500/50 text-white border-2 border-amber-400 shadow-xl ring-2 ring-amber-400/50 scale-105'
                      : 'bg-amber-500/30 text-amber-300 border border-amber-500/60 shadow-lg hover:bg-amber-500/40'
                  } ${countAya > 5 ? 'animate-bounce' : ''}`}
                  title="تحذير: ضغط عمل مرتفع! اضغط للفلترة."
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span>⚠️ AYA:</span>
                  <span className="text-white font-black font-mono">{countAya}</span>
                </button>
              ) : (
                <button
                  onClick={() => toggleRequesterFilter('AYA')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-black transition-all hover:scale-105 active:scale-95 select-none outline-none ${
                    filters.requester === 'AYA'
                      ? 'bg-[#6a1b9a]/60 text-white border-2 border-purple-400 shadow-xl ring-2 ring-purple-400/50 scale-105'
                      : 'bg-[#6a1b9a]/30 text-[#d8b4fe] border border-[#6a1b9a]/60 shadow-lg hover:bg-[#6a1b9a]/45'
                  }`}
                  title="اضغط لتصفية المهام"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c084fc] animate-pulse" />
                  <span>AYA:</span>
                  <span className="text-white font-black font-mono">{countAya}</span>
                </button>
              )}

              {/* MANAR Counter */}
              {countManar > 5 ? (
                <button
                  onClick={() => toggleRequesterFilter('MANAR')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-black transition-all hover:scale-105 active:scale-95 select-none outline-none ${
                    filters.requester === 'MANAR'
                      ? 'bg-amber-500/50 text-white border-2 border-amber-400 shadow-xl ring-2 ring-amber-400/50 scale-105'
                      : 'bg-amber-500/30 text-amber-300 border border-amber-500/60 shadow-lg hover:bg-amber-500/40'
                  } ${countManar > 5 ? 'animate-bounce' : ''}`}
                  title="تحذير: ضغط عمل مرتفع! اضغط للفلترة."
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span>⚠️ MANAR:</span>
                  <span className="text-white font-black font-mono">{countManar}</span>
                </button>
              ) : (
                <button
                  onClick={() => toggleRequesterFilter('MANAR')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-black transition-all hover:scale-105 active:scale-95 select-none outline-none ${
                    filters.requester === 'MANAR'
                      ? 'bg-[#0077b6]/60 text-white border-2 border-sky-400 shadow-xl ring-2 ring-sky-400/50 scale-105'
                      : 'bg-[#0077b6]/30 text-[#90caf9] border border-[#0077b6]/60 shadow-lg hover:bg-[#0077b6]/45'
                  }`}
                  title="اضغط لتصفية المهام"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-pulse" />
                  <span>MANAR:</span>
                  <span className="text-white font-black font-mono">{countManar}</span>
                </button>
              )}

              {/* Narden Counter */}
              {countNarden > 5 ? (
                <button
                  onClick={() => toggleRequesterFilter('Narden')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-black transition-all hover:scale-105 active:scale-95 select-none outline-none ${
                    filters.requester === 'Narden'
                      ? 'bg-amber-500/50 text-white border-2 border-amber-400 shadow-xl ring-2 ring-amber-400/50 scale-105'
                      : 'bg-amber-500/30 text-amber-300 border border-amber-500/60 shadow-lg hover:bg-amber-500/40'
                  } ${countNarden > 5 ? 'animate-bounce' : ''}`}
                  title="تحذير: ضغط عمل مرتفع! اضغط للفلترة."
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span>⚠️ Narden:</span>
                  <span className="text-white font-black font-mono">{countNarden}</span>
                </button>
              ) : (
                <button
                  onClick={() => toggleRequesterFilter('Narden')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-black transition-all hover:scale-105 active:scale-95 select-none outline-none ${
                    filters.requester === 'Narden'
                      ? 'bg-[#b71c1c]/50 text-white border-2 border-rose-400 shadow-xl ring-2 ring-rose-400/50 scale-105'
                      : 'bg-[#b71c1c]/30 text-[#fca5a5] border border-[#b71c1c]/60 shadow-lg hover:bg-[#b71c1c]/45'
                  }`}
                  title="اضغط لتصفية المهام"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#fca5a5] animate-pulse" />
                  <span>Narden:</span>
                  <span className="text-white font-black font-mono">{countNarden}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative group w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/50 w-4 h-4 group-focus-within:text-purple-400 transition-colors" />
            <input
              type="text"
              placeholder="البحث في المهام..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/5 focus:border-purple-500/50 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold text-white outline-none transition-all arabic-text placeholder:text-muted/30"
            />
          </div>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="bg-[#0a0d14] rounded-3xl border border-white/5 overflow-hidden flex-1 flex flex-col shadow-2xl">
        <div className="overflow-x-auto flex-1 relative">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
            <thead>
              <tr className="border-b border-white/5 bg-black/40 text-[10px] uppercase tracking-[0.2em] font-black text-muted/60">
                <th className="px-6 py-4 font-bold sticky top-0 bg-[#080a0f] z-10 w-16 text-center text-muted/60">#</th>
                <th className="px-4 py-4 font-bold sticky top-0 bg-[#080a0f] z-10 text-right text-muted/60">التاريخ</th>
                <th className="px-4 py-3 sticky top-0 bg-[#080a0f] z-10 text-right">
                  <HeaderFilter 
                    label="الكريتور" 
                    value={filters.designer} 
                    onChange={(val: any) => setFilters(p => ({ ...p, designer: val }))} 
                    options={uniqueDesigners} 
                  />
                </th>
                <th className="px-4 py-3 sticky top-0 bg-[#080a0f] z-10 text-right">
                  <HeaderFilter 
                    label="الأولوية" 
                    value={filters.priority} 
                    onChange={(val: any) => setFilters(p => ({ ...p, priority: val }))} 
                    options={uniquePriorities} 
                  />
                </th>
                <th className="px-4 py-3 sticky top-0 bg-[#080a0f] z-10 text-right">
                  <HeaderFilter 
                    label="المصمم" 
                    value={filters.requester} 
                    onChange={(val: any) => setFilters(p => ({ ...p, requester: val }))} 
                    options={uniqueRequesters} 
                  />
                </th>
                <th className="px-4 py-3 sticky top-0 bg-[#080a0f] z-10 text-right">
                  <HeaderFilter 
                    label="النوع" 
                    value={filters.type} 
                    onChange={(val: any) => setFilters(p => ({ ...p, type: val }))} 
                    options={uniqueTypes} 
                  />
                </th>
                <th className="px-4 py-4 font-bold sticky top-0 bg-[#080a0f] z-10 text-right text-muted/60">ميعاد التسليم</th>
                <th className="px-4 py-4 font-bold sticky top-0 bg-[#080a0f] z-10 text-left text-muted/60">REFERENCE</th>
                <th className="px-4 py-4 font-bold sticky top-0 bg-[#080a0f] z-10 w-64 text-right text-muted/60">ملاحظات</th>
                <th className="px-6 py-3 sticky top-0 bg-[#080a0f] z-10 text-center">
                  <HeaderFilter 
                    label="DONE" 
                    value={filters.done} 
                    onChange={(val: any) => setFilters(p => ({ ...p, done: val }))} 
                    options={['Done', 'Pending']} 
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              
              {/* Quick-Add Row (Styled exactly like Google Sheets screenshot) */}
              <tr 
                onClick={() => setShowAddModal(true)}
                className="border-b border-white/[0.05] bg-purple-500/[0.02] hover:bg-purple-500/[0.08] transition-colors cursor-pointer group"
              >
                <td className="px-6 py-3.5 text-center">
                  <div className="w-8 h-8 rounded-full bg-purple-500/10 group-hover:bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto transition-all scale-100 group-hover:scale-110 shadow-sm">
                    <Plus size={16} className="stroke-[3]" />
                  </div>
                </td>
                <td colSpan={9} className="px-4 py-3.5 text-right arabic-text">
                  <span className="text-xs font-black text-purple-400 group-hover:text-purple-300 transition-colors tracking-wide">
                    + إضافة تاسك جديد (Add New Design Task)
                  </span>
                </td>
              </tr>

              {filteredRows.map((row: any, i) => {
                const isDone = !!row.done;
                const priorityStr = String(row.priority || '').trim();
                
                // Dynamically resolve high-contrast theme classes
                let rowBgClass = '';
                let textDateClass = 'text-white/80';
                let textDeadlineClass = 'text-red-400 font-mono';
                let textNotesClass = 'text-white/60';
                
                if (isDone) {
                  // Case 1: Green row for all Completed/Done tasks
                  rowBgClass = 'bg-emerald-900/65 hover:bg-emerald-900/80 border-l-[6px] border-l-emerald-400 text-emerald-100';
                  textDateClass = 'text-emerald-200 font-bold';
                  textDeadlineClass = 'text-emerald-300 font-mono font-bold';
                  textNotesClass = 'text-emerald-200/80';
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
                    <td className="px-6 py-3 text-center text-xs text-muted/30 font-mono">{i + 1}</td>
                    
                    {/* التاريخ */}
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${textDateClass}`}>{row.date || '-'}</span>
                    </td>

                    {/* المصمم */}
                    <td className="px-4 py-3">
                      <DropdownSelect
                        value={row.designer}
                        onChange={(val: string) => handleCellChange(row.originalIndex, 'designer', val)}
                        options={DESIGNERS}
                        getStyles={getDesignerStyle}
                      />
                    </td>

                    {/* الأولوية */}
                    <td className="px-4 py-3">
                      <DropdownSelect
                        value={row.priority}
                        onChange={(val: string) => handleCellChange(row.originalIndex, 'priority', val)}
                        options={PRIORITIES}
                        getStyles={getPriorityStyle}
                      />
                    </td>

                    {/* المراجع */}
                    <td className="px-4 py-3">
                      <DropdownSelect
                        value={row.requester}
                        onChange={(val: string) => handleCellChange(row.originalIndex, 'requester', val)}
                        options={REQUESTERS}
                        getStyles={getRequesterStyle}
                      />
                    </td>

                    {/* النوع */}
                    <td className="px-4 py-3">
                      <DropdownSelect
                        value={row.type}
                        onChange={(val: string) => handleCellChange(row.originalIndex, 'type', val)}
                        options={TYPES}
                        getStyles={getTypeStyle}
                      />
                    </td>

                    {/* ميعاد التسليم */}
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={formatDateToInput(row.deadline)}
                        onChange={(e) => {
                          const formatted = formatDateFromInput(e.target.value);
                          handleCellChange(row.originalIndex, 'deadline', formatted);
                        }}
                        className={`bg-transparent text-xs font-bold font-mono border border-transparent focus:border-white/20 hover:bg-white/5 focus:bg-[#0a0d14] rounded-lg px-2.5 py-1.5 outline-none text-right cursor-pointer transition-all ${
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
                    <td className="px-4 py-3">
                      {row.reference ? (
                        <a href={row.reference} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 hover:underline max-w-[150px] truncate block">
                          {row.reference}
                        </a>
                      ) : (
                        <span className="text-xs text-muted/30">-</span>
                      )}
                    </td>

                    {/* ملاحظات */}
                    <td className="px-4 py-3">
                      <NotesInput
                        value={row.notes}
                        onChange={(val: string) => handleCellChange(row.originalIndex, 'notes', val)}
                        className={textNotesClass}
                      />
                    </td>

                     {/* DONE */}
                    <td className="px-6 py-3 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <button 
                          onClick={() => handleCellChange(row.originalIndex, 'done', !row.done)}
                          className={`p-1.5 rounded-lg transition-colors ${row.done ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' : 'bg-white/5 text-white/20 hover:bg-white/10 hover:text-white/40'}`}
                        >
                          {row.done ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                        {row.done && (
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
                  <input
                    type="date"
                    required
                    value={formatDateToInput(addForm.date)}
                    onChange={e => setAddForm({...addForm, date: formatDateFromInput(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors font-bold text-sm text-left cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                    dir="ltr"
                  />
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
                    {DESIGNERS.map(d => (
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
                    {PRIORITIES.map(p => (
                      <option key={p} value={p} className="bg-[#0b1019]">{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground/70 mb-1.5">المصمم (Designer)</label>
                  <select
                    value={addForm.requester}
                    onChange={e => setAddForm({...addForm, requester: e.target.value})}
                    className="w-full bg-[#0b1019] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors font-bold text-sm cursor-pointer"
                  >
                    {REQUESTERS.map(r => (
                      <option key={r} value={r} className="bg-[#0b1019]">{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground/70 mb-1.5">النوع (Type)</label>
                  <select
                    value={addForm.type}
                    onChange={e => setAddForm({...addForm, type: e.target.value})}
                    className="w-full bg-[#0b1019] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors font-bold text-sm cursor-pointer"
                  >
                    {TYPES.map(t => (
                      <option key={t} value={t} className="bg-[#0b1019]">{t}</option>
                    ))}
                  </select>
                </div>
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
