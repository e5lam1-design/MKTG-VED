import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { parseScriptValue } from '../lib/scriptUtils';
import { GoogleCalendarImportModal } from './GoogleCalendarImportModal';
import type { ParsedGoogleEvent } from '../lib/icalParser';
import { 
  Calendar as CalendarIcon, Clock, Video, User, Plus, Trash2, Edit3, 
  CheckCircle2, XCircle, AlertCircle, ChevronRight, ChevronLeft, Search, 
  MapPin, Filter, GripVertical, ExternalLink, X, Film, Check, Sparkles,
  ArrowRight, ArrowLeft, RefreshCw, CalendarDays, Eye, Settings, HelpCircle,
  ChevronDown, Layers, MoreVertical, Menu, CheckSquare, Square, Palette,
  FolderOpen, FileText, Copy, Loader2
} from 'lucide-react';

export interface StudioSession {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (e.g. "14:00")
  endTime: string; // HH:mm (e.g. "16:00")
  teacher: string;
  branch: string;
  videographer: string;
  notes: string;
  taskCodes: string[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  color?: string; // Custom color hex or branch default
  createdAt: string;
  updatedAt?: string;
}

interface StudioCalendarViewProps {
  isDemo?: boolean;
  userProfile?: any;
  toast?: any;
}

// Studio Branches definitions with dedicated colors (matching user request)
export const BRANCH_DEFINITIONS = [
  { 
    id: 'اسكندرية', 
    label: 'اسكندرية', 
    color: '#0284c7', 
    dot: '#0ea5e9',
    bg: 'bg-sky-500/10', 
    text: 'text-sky-300', 
    border: 'border-sky-500/40', 
    active: 'bg-sky-500/25 border-sky-400 text-white ring-2 ring-sky-400/60 shadow-lg shadow-sky-500/25 scale-[1.03]',
    counter: 'bg-sky-500/20 text-sky-200 border border-sky-500/30'
  },
  { 
    id: 'دسوق', 
    label: 'دسوق', 
    color: '#10b981', 
    dot: '#10b981',
    bg: 'bg-emerald-500/10', 
    text: 'text-emerald-300', 
    border: 'border-emerald-500/40', 
    active: 'bg-emerald-500/25 border-emerald-400 text-white ring-2 ring-emerald-400/60 shadow-lg shadow-emerald-500/25 scale-[1.03]',
    counter: 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
  },
  { 
    id: 'القاهرة', 
    label: 'القاهرة', 
    color: '#f59e0b', 
    dot: '#f59e0b',
    bg: 'bg-amber-500/10', 
    text: 'text-amber-300', 
    border: 'border-amber-500/40', 
    active: 'bg-amber-500/25 border-amber-400 text-white ring-2 ring-amber-400/60 shadow-lg shadow-amber-500/25 scale-[1.03]',
    counter: 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
  },
];

// Rich Palette for changing session color (matching media_1790600210282)
export const SESSION_COLOR_PALETTE = [
  { id: '#0284c7', label: 'اسكندرية (سماوي)', hex: '#0284c7', bg: 'bg-[#0284c7]', border: 'border-[#0284c7]', text: 'text-white' },
  { id: '#10b981', label: 'دسوق (زمردي)', hex: '#10b981', bg: 'bg-[#10b981]', border: 'border-[#10b981]', text: 'text-white' },
  { id: '#f59e0b', label: 'القاهرة (كهرماني)', hex: '#f59e0b', bg: 'bg-[#f59e0b]', border: 'border-[#f59e0b]', text: 'text-stone-900 font-bold' },
  { id: '#1a73e8', label: 'أزرق كلاسيكي', hex: '#1a73e8', bg: 'bg-[#1a73e8]', border: 'border-[#1a73e8]', text: 'text-white' },
  { id: '#8e24aa', label: 'بنفسجي', hex: '#8e24aa', bg: 'bg-[#8e24aa]', border: 'border-[#8e24aa]', text: 'text-white' },
  { id: '#d93025', label: 'أحمر قرمزي', hex: '#d93025', bg: 'bg-[#d93025]', border: 'border-[#d93025]', text: 'text-white' },
  { id: '#00897b', label: 'فيروزي', hex: '#00897b', bg: 'bg-[#00897b]', border: 'border-[#00897b]', text: 'text-white' },
  { id: '#f4511e', label: 'برتقالي ناري', hex: '#f4511e', bg: 'bg-[#f4511e]', border: 'border-[#f4511e]', text: 'text-white' },
  { id: '#e91e63', label: 'وردي', hex: '#e91e63', bg: 'bg-[#e91e63]', border: 'border-[#e91e63]', text: 'text-white' },
  { id: '#3f51b5', label: 'نيلي', hex: '#3f51b5', bg: 'bg-[#3f51b5]', border: 'border-[#3f51b5]', text: 'text-white' },
];

export const getSessionColorStyle = (session: { branch?: string; color?: string }) => {
  // If session has explicit custom color
  if (session.color) {
    const match = SESSION_COLOR_PALETTE.find(
      c => c.hex.toLowerCase() === session.color?.toLowerCase() || c.id === session.color
    );
    if (match) return match;
    return {
      id: session.color,
      label: 'مخصص',
      hex: session.color,
      bg: '',
      border: '',
      text: 'text-white'
    };
  }

  // Default to Branch Color! (as requested by user in media_1790600187913)
  const bNorm = normalizeBranch(session.branch);
  if (bNorm === 'دسوق') return SESSION_COLOR_PALETTE[1];
  if (bNorm === 'القاهرة') return SESSION_COLOR_PALETTE[2];
  return SESSION_COLOR_PALETTE[0]; // اسكندرية
};

export const normalizeBranch = (branchStr?: string): 'اسكندرية' | 'دسوق' | 'القاهرة' => {
  if (!branchStr) return 'اسكندرية';
  const s = String(branchStr).trim().toLowerCase();
  if (s.includes('دسوق') || s.includes('desouk') || s.includes('desouq')) return 'دسوق';
  if (s.includes('قاهر') || s.includes('cairo') || s.includes('nasr') || s.includes('dokki') || s.includes('دقي')) return 'القاهرة';
  return 'اسكندرية';
};

// Google Calendar style vibrant solid colors
const GOOGLE_COLORS = [
  { id: 'emerald', bg: 'bg-[#0b8043]', border: 'border-[#0b8043]', text: 'text-white', hex: '#0b8043', name: 'أخضر زمردي' },
  { id: 'blue', bg: 'bg-[#1a73e8]', border: 'border-[#1a73e8]', text: 'text-white', hex: '#1a73e8', name: 'أزرق كلاسيكي' },
  { id: 'purple', bg: 'bg-[#8e24aa]', border: 'border-[#8e24aa]', text: 'text-white', hex: '#8e24aa', name: 'بنفسجي ملكي' },
  { id: 'amber', bg: 'bg-[#f6bf26]', border: 'border-[#f6bf26]', text: 'text-stone-900 font-bold', hex: '#f6bf26', name: 'أصفر كهرماني' },
  { id: 'rose', bg: 'bg-[#d93025]', border: 'border-[#d93025]', text: 'text-white', hex: '#d93025', name: 'أحمر قرمزي' },
  { id: 'teal', bg: 'bg-[#00897b]', border: 'border-[#00897b]', text: 'text-white', hex: '#00897b', name: 'فيروزي' },
  { id: 'orange', bg: 'bg-[#f4511e]', border: 'border-[#f4511e]', text: 'text-white', hex: '#f4511e', name: 'برتقالي' },
  { id: 'indigo', bg: 'bg-[#3f51b5]', border: 'border-[#3f51b5]', text: 'text-white', hex: '#3f51b5', name: 'نيلي' },
];

// Team Videographers List (matching media_1790599979588)
export const DEFAULT_VIDEOGRAPHERS = [
  { name: 'Khalil', dot: '#0ea5e9', text: 'text-sky-300' },
  { name: 'Ahmed', dot: '#3b82f6', text: 'text-blue-300' },
  { name: 'RAMY', dot: '#2563eb', text: 'text-blue-300' },
  { name: 'Habiba', dot: '#10b981', text: 'text-emerald-300' },
  { name: 'ADHAM', dot: '#818cf8', text: 'text-indigo-300' },
  { name: 'Hassanien', dot: '#22c55e', text: 'text-green-300' },
];

export const getVideographerDot = (name?: string): string => {
  if (!name) return '#9aa0a6';
  const match = DEFAULT_VIDEOGRAPHERS.find(v => v.name.toLowerCase() === name.trim().toLowerCase());
  return match?.dot || '#38bdf8';
};

// Timeline & Duration Configuration (Google Calendar Style)
export const TIMELINE_START_HOUR = 8; // 8:00 AM
export const TIMELINE_END_HOUR = 24; // 12:00 AM Midnight (extended until 12 AM as requested)
export const TIMELINE_HOURS = Array.from(
  { length: TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1 },
  (_, i) => TIMELINE_START_HOUR + i
);
export const HOUR_HEIGHT = 72; // px per hour row

export const formatHourLabel = (hour: number): string => {
  if (hour === 0 || hour === 24) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
};

export const parseTimeToMinutes = (timeStr?: string, isEndTime = false): number => {
  if (!timeStr) return 13 * 60;
  const parts = String(timeStr).split(':').map(Number);
  const hour = isNaN(parts[0]) ? 13 : parts[0];
  const minute = isNaN(parts[1]) ? 0 : parts[1];
  if (isEndTime && (hour === 0 || hour === 24) && minute === 0) {
    return 24 * 60;
  }
  return hour * 60 + minute;
};

export const formatMinutesToTime = (totalMinutes: number): string => {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(totalMinutes)));
  if (clamped >= 24 * 60) return '00:00';
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const getDurationMinutes = (startTime?: string, endTime?: string): number => {
  const start = parseTimeToMinutes(startTime || '13:00');
  let end = parseTimeToMinutes(endTime || '15:00', true);
  if (end <= start && (endTime === '00:00' || endTime === '24:00')) {
    end = 24 * 60;
  }
  return end > start ? end - start : 60;
};

export const formatDurationArabic = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  if (hours === 0) return `${remMin} دقيقة`;
  if (hours === 1 && remMin === 0) return 'ساعة واحدة';
  if (hours === 1 && remMin > 0) return `ساعة و ${remMin} دقيقة`;
  if (hours === 2 && remMin === 0) return 'ساعتان';
  if (hours === 2 && remMin > 0) return `ساعتان و ${remMin} دقيقة`;
  if (hours >= 3 && hours <= 10 && remMin === 0) return `${hours} ساعات`;
  if (remMin === 0) return `${hours} ساعة`;
  return `${hours} ساعة و ${remMin} دقيقة`;
};

// Computes column positioning for overlapping events in a day
export interface PositionedSessionItem {
  session: StudioSession;
  startM: number;
  endM: number;
  colIndex: number;
  totalCols: number;
}

export const getPositionedSessionsForDay = (daySessions: StudioSession[]): PositionedSessionItem[] => {
  if (!daySessions || daySessions.length === 0) return [];

  const parsed = daySessions.map(s => {
    const startM = parseTimeToMinutes(s.startTime);
    let endM = parseTimeToMinutes(s.endTime, true);
    if (endM <= startM) endM = startM + 60;
    return {
      session: s,
      startM,
      endM,
      colIndex: 0,
      totalCols: 1
    };
  }).sort((a, b) => a.startM - b.startM || (b.endM - b.startM) - (a.endM - a.startM));

  const clusters: (typeof parsed)[] = [];
  let currentCluster: typeof parsed = [];
  let clusterEnd = -1;

  for (const item of parsed) {
    if (currentCluster.length === 0 || item.startM < clusterEnd) {
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.endM);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = item.endM;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const result: PositionedSessionItem[] = [];

  for (const cluster of clusters) {
    const colEndTimes: number[] = [];

    for (const item of cluster) {
      let assignedCol = -1;
      for (let c = 0; c < colEndTimes.length; c++) {
        if (colEndTimes[c] <= item.startM) {
          assignedCol = c;
          colEndTimes[c] = item.endM;
          break;
        }
      }
      if (assignedCol === -1) {
        assignedCol = colEndTimes.length;
        colEndTimes.push(item.endM);
      }
      item.colIndex = assignedCol;
    }

    const totalCols = Math.max(1, colEndTimes.length);
    for (const item of cluster) {
      item.totalCols = totalCols;
      result.push(item);
    }
  }

  return result;
};

export const StudioCalendarView: React.FC<StudioCalendarViewProps> = ({
  isDemo = false,
  userProfile,
  toast
}) => {
  // Navigation & View State
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [miniCalendarDate, setMiniCalendarDate] = useState<Date>(() => new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState('ALL');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [reelsSearchQuery, setReelsSearchQuery] = useState('');
  const [isMiniCalExpanded, setIsMiniCalExpanded] = useState(true);
  const [isBranchesExpanded, setIsBranchesExpanded] = useState(true);
  const [isTeachersExpanded, setIsTeachersExpanded] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Data State
  const [sessions, setSessions] = useState<StudioSession[]>(() => {
    try {
      const cached = localStorage.getItem('studio_calendar_sessions_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [shootingTasks, setShootingTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modals & Popovers
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'details' | null>(null);
  const [activeSession, setActiveSession] = useState<StudioSession | null>(null);
  const [formData, setFormData] = useState<{
    id?: string;
    date: string;
    startTime: string;
    endTime: string;
    teacher: string;
    branch: string;
    videographer: string;
    notes: string;
    taskCodes: string[];
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    color?: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    startTime: '13:00',
    endTime: '15:00',
    teacher: '',
    branch: 'اسكندرية',
    videographer: '',
    notes: '',
    taskCodes: [],
    status: 'scheduled',
    color: ''
  });

  // Script Details & Preview Modal State
  const [scriptModalData, setScriptModalData] = useState<{
    code: string;
    teacher?: string;
    script: string;
  } | null>(null);
  const [editingScriptVal, setEditingScriptVal] = useState('');
  const [isSavingScript, setIsSavingScript] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);

  const openScriptModal = (taskInfo: { code: string; teacher?: string; script?: string }) => {
    setScriptModalData({
      code: taskInfo.code,
      teacher: taskInfo.teacher,
      script: taskInfo.script || ''
    });
    setEditingScriptVal(taskInfo.script || '');
    setScriptCopied(false);
  };

  // Bulletproof Drag and Drop State & Refs
  const dragDataRef = useRef<{
    type: 'session' | 'task';
    session?: StudioSession;
    task?: any;
  } | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ date: string; hour: number } | null>(null);

  // Week Timeline Ref & Live Red Time Indicator State
  const weekTimelineContainerRef = useRef<HTMLDivElement>(null);
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  // Ticker for current time red indicator line
  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTimeMinutes(d.getHours() * 60 + d.getMinutes());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Smooth auto-scroll to current hour when opening week view
  useEffect(() => {
    if (viewMode === 'week' && weekTimelineContainerRef.current) {
      const nowHour = new Date().getHours();
      const targetHour = Math.max(TIMELINE_START_HOUR, Math.min(TIMELINE_END_HOUR - 4, nowHour - 1));
      const scrollTarget = (targetHour - TIMELINE_START_HOUR) * HOUR_HEIGHT;
      weekTimelineContainerRef.current.scrollTop = scrollTarget;
    }
  }, [viewMode]);

  // Session Duration Resize Drag State (Google Calendar ns-resize handle)
  const [resizingSession, setResizingSession] = useState<{
    id: string;
    originalEndTime: string;
    previewEndTime: string;
    previewDurationMinutes: number;
  } | null>(null);

  // Quick Extend / Shorten Session Duration Method
  const handleQuickExtend = async (session: StudioSession, additionalMinutes: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const startM = parseTimeToMinutes(session.startTime);
    const currentEndM = parseTimeToMinutes(session.endTime, true);
    const baseEndM = currentEndM > startM ? currentEndM : startM + 60;
    const newEndM = Math.max(startM + 30, Math.min(24 * 60, baseEndM + additionalMinutes));
    const newEndTime = formatMinutesToTime(newEndM);

    const updatedSession: StudioSession = {
      ...session,
      endTime: newEndTime,
      updatedAt: new Date().toISOString()
    };

    const updated = sessions.map(s => s.id === session.id ? updatedSession : s);
    setSessions(updated);
    if (activeSession?.id === session.id) {
      setActiveSession(updatedSession);
    }
    try {
      localStorage.setItem('studio_calendar_sessions_cache', JSON.stringify(updated));
    } catch {}
    await persistSessionInDb(updatedSession, 'upsert');

    const durMin = newEndM - startM;
    if (toast) {
      if (additionalMinutes > 0) {
        toast.success(`تم تمديد موعد (${session.teacher}) إلى ${newEndTime} (${formatDurationArabic(durMin)}) ⏱️`);
      } else {
        toast.info(`تم تقصير موعد (${session.teacher}) إلى ${newEndTime} (${formatDurationArabic(durMin)}) ⏱️`);
      }
    }
  };

  // Drag Resize Handler on the bottom edge of session cards (Google Calendar style)
  const handleStartResize = (e: React.MouseEvent, session: StudioSession) => {
    e.stopPropagation();
    e.preventDefault();

    const startY = e.clientY;
    const startM = parseTimeToMinutes(session.startTime);
    const currentEndM = parseTimeToMinutes(session.endTime, true);
    const initialEndM = currentEndM > startM ? currentEndM : startM + 60;

    setResizingSession({
      id: session.id,
      originalEndTime: session.endTime,
      previewEndTime: session.endTime,
      previewDurationMinutes: initialEndM - startM
    });

    let latestEndM = initialEndM;

    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const deltaY = moveEvent.clientY - startY;
      // HOUR_HEIGHT px = 60 minutes
      const deltaMinutes = (deltaY / HOUR_HEIGHT) * 60;
      // Snap to 15-minute increments
      const snappedDelta = Math.round(deltaMinutes / 15) * 15;
      const computedEndM = Math.max(startM + 30, Math.min(24 * 60, initialEndM + snappedDelta));
      latestEndM = computedEndM;

      setResizingSession({
        id: session.id,
        originalEndTime: session.endTime,
        previewEndTime: formatMinutesToTime(computedEndM),
        previewDurationMinutes: computedEndM - startM
      });
    };

    const onMouseUp = async () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      const finalEndTime = formatMinutesToTime(latestEndM);
      setResizingSession(null);

      if (finalEndTime !== session.endTime) {
        const updatedSession: StudioSession = {
          ...session,
          endTime: finalEndTime,
          updatedAt: new Date().toISOString()
        };
        const updated = sessions.map(s => s.id === session.id ? updatedSession : s);
        setSessions(updated);
        if (activeSession?.id === session.id) {
          setActiveSession(updatedSession);
        }
        try {
          localStorage.setItem('studio_calendar_sessions_cache', JSON.stringify(updated));
        } catch {}
        await persistSessionInDb(updatedSession, 'upsert');

        const durMin = latestEndM - startM;
        if (toast) {
          toast.success(`تم ضبط وتمديد موعد (${session.teacher}) إلى ${finalEndTime} (${formatDurationArabic(durMin)}) بنجاح! ⏱️`);
        }
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Fetch Data from Supabase
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Shooting Tasks from reels_shooting_26
      const { data: shootingData, error: shootingErr } = await supabase
        .from('reels_shooting_26')
        .select('*')
        .order('id', { ascending: false });

      if (shootingErr) console.error('Error fetching reels_shooting_26:', shootingErr);
      else if (shootingData) setShootingTasks(shootingData);

      // 2. Fetch Sessions from dedicated marketing_studio_calendar table
      const { data: dbSessions, error: sessionsErr } = await supabase
        .from('marketing_studio_calendar')
        .select('*')
        .order('date', { ascending: true });

      if (!sessionsErr && dbSessions) {
        const mapped: StudioSession[] = dbSessions.map((r: any) => ({
          id: r.id,
          date: r.date,
          startTime: r.start_time || '13:00',
          endTime: r.end_time || '15:00',
          teacher: r.teacher,
          branch: r.branch || 'Alexandria',
          videographer: r.videographer || '',
          notes: r.notes || '',
          taskCodes: Array.isArray(r.task_codes) ? r.task_codes : [],
          status: r.status || 'scheduled',
          color: r.color || undefined,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }));
        setSessions(mapped);
        try { localStorage.setItem('studio_calendar_sessions_cache', JSON.stringify(mapped)); } catch {}
      } else {
        // Fallback to dashboard_data if needed
        const { data: fallbackRecord } = await supabase
          .from('dashboard_data')
          .select('value')
          .eq('key', 'studio_calendar_sessions')
          .maybeSingle();
        if (fallbackRecord && fallbackRecord.value) {
          const parsed = typeof fallbackRecord.value === 'string' ? JSON.parse(fallbackRecord.value) : fallbackRecord.value;
          if (Array.isArray(parsed)) {
            setSessions(parsed);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching studio calendar data:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime sync with reels_shooting_26 (instant updates when scripts or tasks are modified)
  useEffect(() => {
    const channel = supabase
      .channel('calendar-shooting-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reels_shooting_26' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setShootingTasks(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setShootingTasks(prev => prev.map(t => 
              t.id === payload.new.id || (t.code && payload.new.code && t.code.trim().toLowerCase() === payload.new.code.trim().toLowerCase())
                ? { ...t, ...payload.new }
                : t
            ));
          } else if (payload.eventType === 'DELETE') {
            setShootingTasks(prev => prev.filter(t => t.id !== payload.old.id && t.code !== payload.old.code));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Persist session in Supabase & Local Cache
  const persistSessionInDb = async (session: StudioSession, action: 'upsert' | 'delete' = 'upsert') => {
    try {
      if (action === 'delete') {
        await supabase
          .from('marketing_studio_calendar')
          .delete()
          .eq('id', session.id);
      } else {
        await supabase.from('marketing_studio_calendar').upsert({
          id: session.id,
          date: session.date,
          start_time: session.startTime,
          end_time: session.endTime,
          teacher: session.teacher,
          branch: session.branch,
          videographer: session.videographer,
          notes: session.notes,
          task_codes: session.taskCodes,
          status: session.status,
          color: session.color || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      }

      // Also update dashboard_data backup
      const updatedList = action === 'delete' 
        ? sessions.filter(s => s.id !== session.id) 
        : [session, ...sessions.filter(s => s.id !== session.id)];
      supabase.from('dashboard_data').upsert({
        key: 'studio_calendar_sessions',
        field: 'sessions',
        value: updatedList,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' }).then();
    } catch (e) {
      console.error('Error persisting to marketing_studio_calendar:', e);
    }
  };

  // Import from Google Calendar Handler
  const handleImportGoogleCalendarEvents = async (importedEvents: ParsedGoogleEvent[]) => {
    try {
      const newStudioSessions: StudioSession[] = importedEvents.map(ev => ({
        id: ev.id,
        date: ev.date,
        startTime: ev.startTime,
        endTime: ev.endTime,
        teacher: ev.teacher,
        branch: ev.branch || 'القاهرة',
        videographer: '',
        notes: ev.notes || '',
        taskCodes: [],
        status: 'scheduled',
        color: ev.branch === 'اسكندرية' ? '#0284c7' : ev.branch === 'دسوق' ? '#10b981' : '#f59e0b',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      // Upsert to Supabase marketing_studio_calendar
      const rows = newStudioSessions.map(s => ({
        id: s.id,
        date: s.date,
        start_time: s.startTime,
        end_time: s.endTime,
        teacher: s.teacher,
        branch: s.branch,
        videographer: s.videographer,
        notes: s.notes,
        task_codes: s.taskCodes,
        status: s.status,
        color: s.color || null,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('marketing_studio_calendar')
        .upsert(rows, { onConflict: 'id' });

      if (error) {
        console.error('Failed to save imported sessions:', error);
        throw error;
      }

      // Update local state and cache
      setSessions(prev => {
        const existingIds = new Set(newStudioSessions.map(n => n.id));
        const filtered = prev.filter(p => !existingIds.has(p.id));
        const updated = [...filtered, ...newStudioSessions];
        try { localStorage.setItem('studio_calendar_sessions_cache', JSON.stringify(updated)); } catch {}
        return updated;
      });

      if (toast?.success) {
        toast.success(`تم استيراد ${newStudioSessions.length} موعد من Google Calendar بنجاح! 📅`);
      }
    } catch (err: any) {
      console.error('Import error:', err);
      if (toast?.error) {
        toast.error(`حدث خطأ أثناء الاستيراد: ${err.message || 'خطأ غير معروف'}`);
      }
      throw err;
    }
  };

  // Set of task codes already scheduled
  const scheduledTaskCodeSet = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach(s => {
      if (s.status !== 'cancelled') {
        (s.taskCodes || []).forEach(c => set.add(c.toLowerCase()));
      }
    });
    return set;
  }, [sessions]);

  // Unscheduled Shooting Tasks (Eligible for Drag & Drop)
  const unscheduledTasks = useMemo(() => {
    return shootingTasks.filter(t => {
      const isFilmed = t.filmed === true || String(t.filmed).toLowerCase() === 'true';
      const isCanceled = t.canceled === true || String(t.canceled).toLowerCase() === 'true';
      if (isFilmed || isCanceled) return false;
      const code = (t.code || '').toLowerCase().trim();
      return !scheduledTaskCodeSet.has(code);
    });
  }, [shootingTasks, scheduledTaskCodeSet]);

  // Unique Teachers List (Sorted: teachers with pending scripts first by count, then alphabetical)
  const uniqueTeachers = useMemo(() => {
    const set = new Set<string>();
    shootingTasks.forEach(t => {
      const name = (t.teacher || '').trim();
      if (name) set.add(name);
    });
    sessions.forEach(s => {
      const name = (s.teacher || '').trim();
      if (name) set.add(name);
    });

    const list = Array.from(set);

    return list.sort((a, b) => {
      const aScripts = unscheduledTasks.filter(t => (t.teacher || '').trim().toLowerCase() === a.toLowerCase()).length;
      const bScripts = unscheduledTasks.filter(t => (t.teacher || '').trim().toLowerCase() === b.toLowerCase()).length;
      if (bScripts !== aScripts) return bScripts - aScripts;
      return a.localeCompare(b);
    });
  }, [shootingTasks, sessions, unscheduledTasks]);

  // Teacher color assignment
  const teacherColorMap = useMemo(() => {
    const map = new Map<string, typeof GOOGLE_COLORS[0]>();
    uniqueTeachers.forEach((teacher, idx) => {
      map.set(teacher, GOOGLE_COLORS[idx % GOOGLE_COLORS.length]);
    });
    return map;
  }, [uniqueTeachers]);

  const getTeacherColor = (teacherName: string) => {
    return teacherColorMap.get(teacherName) || GOOGLE_COLORS[0];
  };

  // Filtered Unscheduled Tasks for Sidebar (Filtered by selected teacher & search)
  const filteredUnscheduledTasks = useMemo(() => {
    return unscheduledTasks.filter(t => {
      if (selectedTeacherFilter !== 'ALL') {
        const tTeacher = (t.teacher || '').trim().toLowerCase();
        const selTeacher = selectedTeacherFilter.trim().toLowerCase();
        if (tTeacher !== selTeacher) {
          return false;
        }
      }
      if (reelsSearchQuery.trim()) {
        const q = reelsSearchQuery.toLowerCase().trim();
        const matchCode = (t.code || '').toLowerCase().includes(q);
        const matchTeacher = (t.teacher || '').toLowerCase().includes(q);
        const matchScript = (t.script || '').toLowerCase().includes(q);
        if (!matchCode && !matchTeacher && !matchScript) return false;
      }
      return true;
    });
  }, [unscheduledTasks, selectedTeacherFilter, reelsSearchQuery]);

  // Filtered Sessions for Calendar
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (selectedTeacherFilter !== 'ALL' && (s.teacher || '').trim().toLowerCase() !== selectedTeacherFilter.trim().toLowerCase()) return false;
      if (selectedBranchFilter !== 'ALL' && normalizeBranch(s.branch) !== selectedBranchFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTeacher = s.teacher.toLowerCase().includes(q);
        const matchNotes = (s.notes || '').toLowerCase().includes(q);
        const matchBranch = (s.branch || '').toLowerCase().includes(q) || normalizeBranch(s.branch).includes(q);
        const matchVideographer = (s.videographer || '').toLowerCase().includes(q);
        const matchCode = (s.taskCodes || []).some(c => c.toLowerCase().includes(q));
        if (!matchTeacher && !matchNotes && !matchBranch && !matchVideographer && !matchCode) return false;
      }
      return true;
    });
  }, [sessions, selectedTeacherFilter, selectedBranchFilter, searchQuery]);

  // Date Calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const EN_MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const AR_MONTHS = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  // Saturday to Friday (standard in Egypt)
  const DAYS_HEADER = [
    { en: 'SAT', ar: 'السبت' },
    { en: 'SUN', ar: 'الأحد' },
    { en: 'MON', ar: 'الإثنين' },
    { en: 'TUE', ar: 'الثلاثاء' },
    { en: 'WED', ar: 'الأربعاء' },
    { en: 'THU', ar: 'الخميس' },
    { en: 'FRI', ar: 'الجمعة' },
  ];

  // Month grid dates
  const monthCalendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const getSatIndex = (d: Date) => (d.getDay() + 1) % 7;
    const startDayIndex = getSatIndex(firstDayOfMonth);
    const daysInMonth = lastDayOfMonth.getDate();

    const days: { dateStr: string; dateObj: Date; isCurrentMonth: boolean; dayNumber: number; monthNameEn: string }[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(year, month - 1, dayNum);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ dateStr, dateObj: d, isCurrentMonth: false, dayNumber: dayNum, monthNameEn: EN_MONTHS[d.getMonth()] });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dateStr, dateObj: d, isCurrentMonth: true, dayNumber: i, monthNameEn: EN_MONTHS[month] });
    }

    // Next month padding
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ dateStr, dateObj: d, isCurrentMonth: false, dayNumber: i, monthNameEn: EN_MONTHS[d.getMonth()] });
    }

    return days;
  }, [year, month]);

  // Current Week dates
  const weekCalendarDays = useMemo(() => {
    const getSatIndex = (d: Date) => (d.getDay() + 1) % 7;
    const currentSatIndex = getSatIndex(currentDate);
    const saturday = new Date(currentDate);
    saturday.setDate(currentDate.getDate() - currentSatIndex);

    const weekDays: { dateStr: string; dateObj: Date; dayNameEn: string; dayNameAr: string; dayNumber: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(saturday);
      d.setDate(saturday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      weekDays.push({
        dateStr,
        dateObj: d,
        dayNameEn: DAYS_HEADER[i].en,
        dayNameAr: DAYS_HEADER[i].ar,
        dayNumber: d.getDate()
      });
    }
    return weekDays;
  }, [currentDate]);

  // Mini Calendar grid
  const miniCalendarDays = useMemo(() => {
    const mYear = miniCalendarDate.getFullYear();
    const mMonth = miniCalendarDate.getMonth();
    const firstDay = new Date(mYear, mMonth, 1);
    const lastDay = new Date(mYear, mMonth + 1, 0);

    const getSatIndex = (d: Date) => (d.getDay() + 1) % 7;
    const startDayIndex = getSatIndex(firstDay);
    const daysInMonth = lastDay.getDate();

    const days: { dateStr: string; dateObj: Date; isCurrentMonth: boolean; dayNumber: number }[] = [];
    const prevMonthLastDay = new Date(mYear, mMonth, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(mYear, mMonth - 1, dayNum);
      days.push({ dateStr: d.toISOString().split('T')[0], dateObj: d, isCurrentMonth: false, dayNumber: dayNum });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(mYear, mMonth, i);
      const dateStr = `${mYear}-${String(mMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dateStr, dateObj: d, isCurrentMonth: true, dayNumber: i });
    }
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(mYear, mMonth + 1, i);
      days.push({ dateStr: d.toISOString().split('T')[0], dateObj: d, isCurrentMonth: false, dayNumber: i });
    }
    return days;
  }, [miniCalendarDate]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      const prev = new Date(year, month - 1, 1);
      setCurrentDate(prev);
      setMiniCalendarDate(prev);
    } else {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(currentDate.getDate() - 7);
      setCurrentDate(prevWeek);
      setMiniCalendarDate(prevWeek);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      const next = new Date(year, month + 1, 1);
      setCurrentDate(next);
      setMiniCalendarDate(next);
    } else {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(currentDate.getDate() + 7);
      setCurrentDate(nextWeek);
      setMiniCalendarDate(nextWeek);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setMiniCalendarDate(today);
  };

  // Open Create Modal
  const handleOpenCreateModal = (targetDateStr?: string, prefillTeacher?: string, prefillTaskCode?: string, targetHour?: number) => {
    const date = targetDateStr || new Date().toISOString().split('T')[0];
    const startH = targetHour !== undefined ? targetHour : 13;
    const endH = Math.min(23, startH + 2);
    setFormData({
      date,
      startTime: `${String(startH).padStart(2, '0')}:00`,
      endTime: `${String(endH).padStart(2, '0')}:00`,
      teacher: prefillTeacher || uniqueTeachers[0] || '',
      branch: selectedBranchFilter !== 'ALL' ? selectedBranchFilter : 'اسكندرية',
      videographer: '', // Do NOT default to ADMIN!
      notes: '',
      taskCodes: prefillTaskCode ? [prefillTaskCode] : [],
      status: 'scheduled',
      color: ''
    });
    setModalMode('create');
  };

  // Open Edit Modal
  const handleOpenEditModal = (session: StudioSession, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveSession(session);
    setFormData({
      id: session.id,
      date: session.date,
      startTime: session.startTime || '13:00',
      endTime: session.endTime || '15:00',
      teacher: session.teacher,
      branch: normalizeBranch(session.branch),
      videographer: session.videographer || '',
      notes: session.notes || '',
      taskCodes: session.taskCodes || [],
      status: session.status,
      color: session.color || ''
    });
    setModalMode('edit');
  };

  // Open Details Modal
  const handleOpenDetails = (session: StudioSession) => {
    setActiveSession(session);
    setModalMode('details');
  };

  // Change Session Color (from details modal or direct action)
  const handleChangeSessionColor = async (session: StudioSession, newColorHex: string) => {
    const updatedSession: StudioSession = {
      ...session,
      color: newColorHex,
      updatedAt: new Date().toISOString()
    };

    const updated = sessions.map(s => s.id === session.id ? updatedSession : s);
    setSessions(updated);
    if (activeSession?.id === session.id) {
      setActiveSession(updatedSession);
    }
    try {
      localStorage.setItem('studio_calendar_sessions_cache', JSON.stringify(updated));
    } catch {}
    await persistSessionInDb(updatedSession, 'upsert');
    if (toast) {
      const match = SESSION_COLOR_PALETTE.find(c => c.hex.toLowerCase() === newColorHex.toLowerCase());
      const label = match?.label || (newColorHex ? 'اللون المختار' : 'لون الفرع التلقائي');
      toast.success(`🎨 تم ضبط لون الموعد إلى (${label}) بنجاح!`);
    }
  };

  // Submit Modal Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teacher?.trim()) {
      if (toast) toast.error('يرجى اختيار اسم المعلم');
      return;
    }

    setIsSaving(true);
    try {
      const nowIso = new Date().toISOString();

      if (modalMode === 'create') {
        const newSession: StudioSession = {
          id: 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          teacher: formData.teacher,
          branch: formData.branch,
          videographer: formData.videographer,
          notes: formData.notes,
          taskCodes: formData.taskCodes,
          status: formData.status,
          color: formData.color || undefined,
          createdAt: nowIso
        };
        const updated = [newSession, ...sessions];
        setSessions(updated);
        try { localStorage.setItem('studio_calendar_sessions_cache', JSON.stringify(updated)); } catch {}
        await persistSessionInDb(newSession, 'upsert');
        if (toast) toast.success(`تم حجز موعد تصوير للأستاذ (${formData.teacher}) بنجاح! 🎬`);
      } else if (modalMode === 'edit' && activeSession) {
        const updatedSession: StudioSession = {
          ...activeSession,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          teacher: formData.teacher,
          branch: formData.branch,
          videographer: formData.videographer,
          notes: formData.notes,
          taskCodes: formData.taskCodes,
          status: formData.status,
          color: formData.color || undefined,
          updatedAt: nowIso
        };
        const updated = sessions.map(s => s.id === activeSession.id ? updatedSession : s);
        setSessions(updated);
        try { localStorage.setItem('studio_calendar_sessions_cache', JSON.stringify(updated)); } catch {}
        await persistSessionInDb(updatedSession, 'upsert');
        if (toast) toast.success('تم حفظ التعديلات بنجاح! ✨');
      }

      // Sync filmingDate to reels_shooting_26
      if (formData.taskCodes.length > 0) {
        const filmingDateVal = new Date(formData.date).toLocaleDateString('en-US');
        for (const code of formData.taskCodes) {
          supabase.from('reels_shooting_26').update({
            filming_date: filmingDateVal,
            by: formData.videographer || undefined,
            updated_at: nowIso
          }).eq('code', code).then();
        }
      }

      setModalMode(null);
    } catch (err: any) {
      console.error('Error saving session:', err);
      if (toast) toast.error('حدث خطأ أثناء الحفظ: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Session
  const handleDeleteSession = async (sessionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا الحجز من التقويم؟')) return;

    const toDelete = sessions.find(s => s.id === sessionId);
    const updated = sessions.filter(s => s.id !== sessionId);
    setSessions(updated);
    try { localStorage.setItem('studio_calendar_sessions_cache', JSON.stringify(updated)); } catch {}

    if (toDelete) {
      await persistSessionInDb(toDelete, 'delete');
    }
    if (modalMode === 'details') setModalMode(null);
    if (toast) toast.info('تم حذف موعد الحجز بنجاح');
  };

  // Mark all reels in session as filmed
  const handleMarkAllFilmed = async (session: StudioSession, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const todayStr = new Date().toLocaleDateString('en-US');

      const updatedSession: StudioSession = { ...session, status: 'completed', updatedAt: nowIso };
      const updated = sessions.map(s => s.id === session.id ? updatedSession : s);
      setSessions(updated);
      try { localStorage.setItem('studio_calendar_sessions_cache', JSON.stringify(updated)); } catch {}
      await persistSessionInDb(updatedSession, 'upsert');

      if (session.taskCodes && session.taskCodes.length > 0) {
        for (const code of session.taskCodes) {
          supabase.from('reels_shooting_26').update({
            filmed: true,
            filming_date: todayStr,
            by: session.videographer || 'الأستديو',
            updated_at: nowIso
          }).eq('code', code).then();
        }
        setShootingTasks(prev => prev.map(t => {
          if (session.taskCodes.includes(t.code)) {
            return { ...t, filmed: true, filming_date: todayStr };
          }
          return t;
        }));
      }

      setActiveSession(updatedSession);
      if (toast) toast.success(`🎉 تم تسجيل تصوير كافة ريلز جلسة (${session.teacher}) بنجاح!`);
    } catch (err: any) {
      console.error('Error marking filmed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle individual task filmed state in session details
  const handleToggleTaskFilmed = async (taskCode: string, currentFilmed: boolean) => {
    const todayStr = new Date().toLocaleDateString('en-US');
    const nowIso = new Date().toISOString();
    const nextFilmed = !currentFilmed;

    setShootingTasks(prev => prev.map(t => {
      if (t.code === taskCode) {
        return { ...t, filmed: nextFilmed, filming_date: nextFilmed ? todayStr : t.filming_date };
      }
      return t;
    }));

    await supabase.from('reels_shooting_26').update({
      filmed: nextFilmed,
      filming_date: nextFilmed ? todayStr : undefined,
      updated_at: nowIso
    }).eq('code', taskCode);

    if (toast) {
      if (nextFilmed) toast.success(`تم تسجيل الريل (${taskCode}) كمصور ✅`);
      else toast.info(`تم إلغاء تصوير الريل (${taskCode}) ⏳`);
    }
  };

  // ==========================================
  // BULLETPROOF DRAG & DROP IMPLEMENTATION
  // ==========================================
  const handleDragStartSession = (e: React.DragEvent, session: StudioSession) => {
    dragDataRef.current = { type: 'session', session };
    (window as any).__studio_drag_item = { type: 'session', session };
    try {
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'session', id: session.id }));
    } catch {}
    e.dataTransfer.effectAllowed = 'all';
  };

  const handleDragStartTask = (e: React.DragEvent, task: any) => {
    dragDataRef.current = { type: 'task', task };
    (window as any).__studio_drag_item = { type: 'task', task };
    try {
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'task', code: task.code, teacher: task.teacher, task }));
    } catch {}
    e.dataTransfer.effectAllowed = 'all';
  };

  const handleDragEnd = () => {
    setDragOverDate(null);
    setDragOverSlot(null);
    setTimeout(() => {
      dragDataRef.current = null;
      (window as any).__studio_drag_item = null;
    }, 500);
  };

  const handleDragOverDate = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDate !== dateStr) setDragOverDate(dateStr);
  };

  const handleDragOverSlot = (e: React.DragEvent, dateStr: string, hour: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (!dragOverSlot || dragOverSlot.date !== dateStr || dragOverSlot.hour !== hour) {
      setDragOverSlot({ date: dateStr, hour });
    }
  };

  // DROP HANDLER: Immediately sticks and persists!
  const handleDropOnDate = async (e: React.DragEvent, targetDateStr: string, targetHour?: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverDate(null);
    setDragOverSlot(null);

    // Retrieve dragged item from ref, window, or dataTransfer
    let item = dragDataRef.current || (window as any).__studio_drag_item;
    if (!item) {
      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.type === 'task') {
            const foundTask = shootingTasks.find(t => t.code === parsed.code) || parsed.task;
            item = { type: 'task', task: foundTask };
          } else if (parsed.type === 'session') {
            const foundSession = sessions.find(s => s.id === parsed.id);
            item = { type: 'session', session: foundSession };
          }
        }
      } catch {}
    }

    if (!item) {
      console.warn('Drop item not found!');
      return;
    }

    // CASE 1: Moving an existing Session across calendar days/hours
    if (item.type === 'session' && item.session) {
      const session = sessions.find(s => s.id === item.session.id) || item.session;
      if (session.date === targetDateStr && targetHour === undefined) return;

      let newStartTime = session.startTime || '13:00';
      let newEndTime = session.endTime || '15:00';
      if (targetHour !== undefined) {
        const curDur = getDurationMinutes(session.startTime, session.endTime);
        newStartTime = `${String(targetHour).padStart(2, '0')}:00`;
        newEndTime = formatMinutesToTime(targetHour * 60 + curDur);
      }

      const updatedSession: StudioSession = {
        ...session,
        date: targetDateStr,
        startTime: newStartTime,
        endTime: newEndTime,
        updatedAt: new Date().toISOString()
      };

      const exists = sessions.some(s => s.id === session.id);
      const updated = exists 
        ? sessions.map(s => s.id === session.id ? updatedSession : s)
        : [...sessions.filter(s => s.id !== session.id), updatedSession];

      setSessions(updated);
      try { localStorage.setItem('studio_calendar_sessions_cache', JSON.stringify(updated)); } catch {}
      await persistSessionInDb(updatedSession, 'upsert');

      // Update filmingDate in reels_shooting_26
      if (session.taskCodes && session.taskCodes.length > 0) {
        const filmingDateVal = new Date(targetDateStr).toLocaleDateString('en-US');
        for (const code of session.taskCodes) {
          supabase.from('reels_shooting_26').update({
            filming_date: filmingDateVal,
            updated_at: new Date().toISOString()
          }).eq('code', code).then();
        }
      }

      dragDataRef.current = null;
      (window as any).__studio_drag_item = null;
      if (toast) toast.success(`🚚 تم نقل موعد (${session.teacher}) إلى تاريخ ${targetDateStr}!`);
    } 
    // CASE 2: Dragging an unfilmed task from the sidebar -> IMMEDIATELY STICK & PERSIST!
    else if (item.type === 'task' && item.task) {
      const task = item.task;
      const teacher = (task.teacher || 'بدون معلم').trim();
      const code = task.code;

      // Check if this teacher already has an active session on that date
      const existingSession = sessions.find(
        s => s.date === targetDateStr && 
             s.teacher.trim().toLowerCase() === teacher.toLowerCase() && 
             s.status !== 'cancelled'
      );

      if (existingSession) {
        // Teacher already has a session on this day: add task code to that session
        if (!existingSession.taskCodes.includes(code)) {
          const updatedTaskCodes = [...existingSession.taskCodes, code];
          const updatedSession: StudioSession = {
            ...existingSession,
            taskCodes: updatedTaskCodes,
            updatedAt: new Date().toISOString()
          };
          const updated = sessions.map(s => s.id === existingSession.id ? updatedSession : s);
          setSessions(updated);
          try { localStorage.setItem('studio_calendar_sessions_cache', JSON.stringify(updated)); } catch {}
          await persistSessionInDb(updatedSession, 'upsert');

          const filmingDateVal = new Date(targetDateStr).toLocaleDateString('en-US');
          supabase.from('reels_shooting_26').update({
            filming_date: filmingDateVal,
            updated_at: new Date().toISOString()
          }).eq('code', code).then();

          if (toast) toast.success(`➕ تم تسكين وتثبيت الريل (${code}) في جلسة (${teacher}) يوم ${targetDateStr}! ✨`);
        } else {
          if (toast) toast.info(`الريل (${code}) موجود بالفعل في جلسة (${teacher}) بهذا اليوم!`);
        }
      } else {
        // Teacher has NO session yet on this day: CREATE A NEW SESSION IMMEDIATELY & STICK IT!
        const startH = targetHour !== undefined ? targetHour : 13;
        const endH = startH + 2;
        const newStartTime = `${String(startH).padStart(2, '0')}:00`;
        const newEndTime = `${String(endH).padStart(2, '0')}:00`;

        const newSession: StudioSession = {
          id: 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          date: targetDateStr,
          startTime: newStartTime,
          endTime: newEndTime,
          teacher: teacher,
          branch: selectedBranchFilter !== 'ALL' ? selectedBranchFilter : 'اسكندرية',
          videographer: '', // Do NOT default to ADMIN!
          notes: '',
          taskCodes: [code],
          status: 'scheduled',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const updated = [newSession, ...sessions];
        setSessions(updated);
        try { localStorage.setItem('studio_calendar_sessions_cache', JSON.stringify(updated)); } catch {}
        await persistSessionInDb(newSession, 'upsert');

        const filmingDateVal = new Date(targetDateStr).toLocaleDateString('en-US');
        supabase.from('reels_shooting_26').update({
          filming_date: filmingDateVal,
          updated_at: new Date().toISOString()
        }).eq('code', code).then();

        if (toast) toast.success(`🎯 تم تثبيت وجدولة الريل (${code}) للأستاذ (${teacher}) في يوم ${targetDateStr}!`);
      }
    }

    dragDataRef.current = null;
  };

  const getSessionsForDate = (dateStr: string) => {
    return filteredSessions.filter(s => s.date === dateStr);
  };

  // Available tasks for teacher in form modal
  const availableTasksForFormTeacher = useMemo(() => {
    if (!formData.teacher) return [];
    return shootingTasks.filter(t => {
      const isFilmed = t.filmed === true || String(t.filmed).toLowerCase() === 'true';
      const isCanceled = t.canceled === true || String(t.canceled).toLowerCase() === 'true';
      if (isCanceled) return false;
      const matchTeacher = (t.teacher || '').trim().toLowerCase() === formData.teacher.trim().toLowerCase();
      if (!matchTeacher) return false;
      const isAlreadyInSession = (formData.taskCodes || []).includes(t.code);
      return !isFilmed || isAlreadyInSession;
    });
  }, [formData.teacher, formData.taskCodes, shootingTasks]);

  const getScriptDisplay = (scriptVal: any) => {
    const parsed = parseScriptValue(scriptVal);
    if (!parsed) return 'بدون عنوان';
    return parsed.text || 'بدون عنوان';
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full bg-[#18191a] text-[#e8eaed] rounded-2xl overflow-hidden border border-[#3c4043] shadow-2xl select-none font-sans">
      
      {/* ========================================================
          1. GOOGLE CALENDAR HEADER BAR
      ======================================================== */}
      <header className="h-16 px-4 bg-[#1f1f1f] border-b border-[#3c4043] flex items-center justify-between shrink-0 z-20">
        
        {/* Left Side: Brand, Hamburger, Today & Nav */}
        <div className="flex items-center gap-3">
          {/* Hamburger Menu Toggle */}
          <button
            onClick={() => setIsSidebarOpen(prev => !prev)}
            className="p-2 rounded-full hover:bg-[#303134] text-[#9aa0a6] hover:text-white transition-colors cursor-pointer"
            title={isSidebarOpen ? 'إخفاء القائمة الجانبية' : 'إظهار القائمة الجانبية'}
          >
            <Menu size={20} />
          </button>

          {/* Google-style Calendar Logo Badge */}
          <div className="flex items-center gap-2.5 mr-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1a73e8] to-[#4285f4] flex flex-col items-center justify-center text-white shadow-md border border-white/10 shrink-0">
              <span className="text-[9px] font-bold uppercase leading-none opacity-80">
                {EN_MONTHS[currentDate.getMonth()].slice(0, 3)}
              </span>
              <span className="text-sm font-black leading-none mt-0.5">
                {currentDate.getDate()}
              </span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5 leading-tight">
                <span>Studio Calendar</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-normal border border-blue-500/30">
                  أستديو الماركتينج
                </span>
              </h1>
            </div>
          </div>

          <div className="h-6 w-px bg-[#3c4043] mx-1 hidden sm:block" />

          {/* Today Button */}
          <button
            onClick={handleToday}
            className="px-4 py-1.5 rounded-full border border-[#5f6368] hover:bg-[#303134] text-xs font-semibold text-[#e8eaed] transition-colors cursor-pointer shadow-sm active:scale-95"
          >
            اليوم
          </button>

          {/* Arrows < > */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={handlePrev}
              className="p-2 rounded-full hover:bg-[#303134] text-[#9aa0a6] hover:text-white transition-colors cursor-pointer"
              title="السابق"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={handleNext}
              className="p-2 rounded-full hover:bg-[#303134] text-[#9aa0a6] hover:text-white transition-colors cursor-pointer"
              title="التالي"
            >
              <ChevronLeft size={18} />
            </button>
          </div>

          {/* Month & Year Title */}
          <h2 className="text-base md:text-lg font-semibold text-white tracking-wide mr-2 flex items-center gap-2">
            <span>{EN_MONTHS[month]} {year}</span>
            <span className="text-xs text-[#9aa0a6] font-normal hidden md:inline">
              ({AR_MONTHS[month]})
            </span>
          </h2>
        </div>

        {/* Center / Right: Search, Filter, View Modes, Refresh */}
        <div className="flex items-center gap-2.5">
          {/* Search Bar */}
          <div className="relative hidden md:block w-48 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa0a6]" size={15} />
            <input
              type="text"
              placeholder="بحث في المواعيد..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#303134] hover:bg-[#3c4043] focus:bg-[#303134] text-xs text-white pl-9 pr-8 py-2 rounded-full border border-transparent focus:border-[#1a73e8] focus:outline-none transition-all placeholder:text-[#9aa0a6]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa0a6] hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Branch Filter Selector */}
          <div className="hidden lg:flex items-center gap-1.5 bg-[#303134] px-3 py-1 rounded-full border border-[#3c4043] text-xs">
            <MapPin size={13} className="text-[#1a73e8]" />
            <select
              value={selectedBranchFilter}
              onChange={e => setSelectedBranchFilter(e.target.value)}
              className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#282a2c]">كل الفروع</option>
              <option value="اسكندرية" className="bg-[#282a2c]">فرع اسكندرية</option>
              <option value="دسوق" className="bg-[#282a2c]">فرع دسوق</option>
              <option value="القاهرة" className="bg-[#282a2c]">فرع القاهرة</option>
            </select>
          </div>

          {/* Segmented View Mode Toggle: Month vs Week */}
          <div className="flex items-center bg-[#303134] p-1 rounded-full border border-[#3c4043]">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-[#1a73e8] text-white shadow-sm'
                  : 'text-[#9aa0a6] hover:text-white'
              }`}
            >
              شهر (Month)
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-[#1a73e8] text-white shadow-sm'
                  : 'text-[#9aa0a6] hover:text-white'
              }`}
            >
              أسبوع (Week)
            </button>
          </div>

          {/* Import from Google Calendar Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-600/25 to-indigo-600/25 hover:from-blue-600/40 hover:to-indigo-600/40 border border-blue-500/40 hover:border-blue-400 text-blue-300 hover:text-white text-xs font-bold transition-all shadow-sm shadow-blue-500/10 cursor-pointer active:scale-95"
            title="استيراد المواعيد من تقويم Google Calendar أو ملف iCal"
          >
            <CalendarIcon size={14} className="text-blue-400" />
            <span className="hidden sm:inline">استيراد من Google 📅</span>
            <span className="sm:hidden">استيراد</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 rounded-full hover:bg-[#303134] text-[#9aa0a6] hover:text-white transition-colors cursor-pointer"
            title="تحديث البيانات من السيرفر"
          >
            <RefreshCw size={17} className={isLoading ? 'animate-spin text-[#1a73e8]' : ''} />
          </button>
        </div>
      </header>

      {/* ========================================================
          2. MAIN BODY (SIDEBAR + CALENDAR CANVAS)
      ======================================================== */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* LEFT SIDEBAR */}
        <aside className={`transition-all duration-300 ease-in-out shrink-0 border-r border-[#3c4043] bg-[#1f1f1f] flex flex-col overflow-y-auto custom-scrollbar select-none ${
          isSidebarOpen ? 'w-80 p-4 space-y-5' : 'w-0 p-0 border-none'
        }`}>
          {isSidebarOpen && (
            <>
              {/* Google-style Big "+ Create" Button */}
              <button
                onClick={() => handleOpenCreateModal()}
                className="shrink-0 w-full flex items-center justify-center gap-3 px-5 py-3 rounded-full bg-white hover:bg-[#f1f3f4] text-[#3c4043] font-bold text-sm shadow-[0_1px_3px_0_rgba(0,0,0,0.3),0_4px_8px_3px_rgba(0,0,0,0.15)] transition-all cursor-pointer hover:shadow-lg active:scale-95 group"
              >
                {/* 4-color plus icon aesthetic */}
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-blue-600 text-white font-black text-lg group-hover:rotate-90 transition-transform">
                  +
                </div>
                <span className="tracking-wide">حجز موعد جديد</span>
              </button>

              {/* Mini Calendar Widget */}
              <div className="shrink-0 bg-[#282a2c] rounded-2xl p-3 border border-[#3c4043] shadow-sm">
                <div className="flex items-center justify-between mb-2 px-1">
                  <button
                    onClick={() => setIsMiniCalExpanded(!isMiniCalExpanded)}
                    className="flex items-center gap-1.5 text-xs font-bold text-white hover:text-[#1a73e8] transition-colors cursor-pointer select-none"
                    title={isMiniCalExpanded ? "طي التقويم المصغر" : "توسيع التقويم المصغر"}
                  >
                    <span>{EN_MONTHS[miniCalendarDate.getMonth()]} {miniCalendarDate.getFullYear()}</span>
                    <ChevronDown size={13} className={`text-[#9aa0a6] transition-transform duration-200 ${isMiniCalExpanded ? '' : '-rotate-90'}`} />
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setMiniCalendarDate(new Date(miniCalendarDate.getFullYear(), miniCalendarDate.getMonth() - 1, 1))}
                      className="p-1 rounded-md hover:bg-white/10 text-[#9aa0a6] hover:text-white cursor-pointer"
                    >
                      <ChevronRight size={13} />
                    </button>
                    <button
                      onClick={() => setMiniCalendarDate(new Date(miniCalendarDate.getFullYear(), miniCalendarDate.getMonth() + 1, 1))}
                      className="p-1 rounded-md hover:bg-white/10 text-[#9aa0a6] hover:text-white cursor-pointer"
                    >
                      <ChevronLeft size={13} />
                    </button>
                  </div>
                </div>

                {isMiniCalExpanded && (
                  <>
                    {/* Weekday initials */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[#9aa0a6] font-bold mb-1">
                      <span>س</span><span>ح</span><span>ن</span><span>ث</span><span>ر</span><span>خ</span><span>ج</span>
                    </div>

                    {/* Day numbers */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
                      {miniCalendarDays.map((d, idx) => {
                        const isSelected = currentDate.toISOString().split('T')[0] === d.dateStr;
                        const isToday = todayStr === d.dateStr;

                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setCurrentDate(d.dateObj);
                              setMiniCalendarDate(d.dateObj);
                            }}
                            className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#1a73e8] text-white font-bold shadow-sm'
                                : isToday
                                ? 'border border-[#1a73e8] text-[#1a73e8] font-bold'
                                : d.isCurrentMonth
                                ? 'text-slate-300 hover:bg-white/10'
                                : 'text-[#5f6368]'
                            }`}
                          >
                            {d.dayNumber}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Studio Branches Filter (اسكندرية ، دسوق ، القاهرة) */}
              <div className="shrink-0 space-y-2 pt-2 border-t border-[#3c4043]">
                <div 
                  onClick={() => setIsBranchesExpanded(!isBranchesExpanded)}
                  className="flex items-center justify-between px-1 cursor-pointer select-none group"
                >
                  <h4 className="text-xs font-bold text-[#9aa0a6] group-hover:text-white uppercase tracking-wider flex items-center gap-1.5 transition-colors">
                    <MapPin size={13} className="text-[#1a73e8]" />
                    <span>فروع الأستديو</span>
                  </h4>
                  <div className="flex items-center gap-1.5">
                    {selectedBranchFilter !== 'ALL' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBranchFilter('ALL');
                        }}
                        className="text-[10px] text-[#1a73e8] hover:underline cursor-pointer px-1 font-bold"
                      >
                        عرض الكل
                      </button>
                    )}
                    <ChevronDown size={14} className={`text-[#9aa0a6] group-hover:text-white transition-transform duration-200 ${isBranchesExpanded ? '' : '-rotate-90'}`} />
                  </div>
                </div>

                {isBranchesExpanded && (
                  <div className="space-y-1.5">
                    <button
                      onClick={() => setSelectedBranchFilter('ALL')}
                      className={`w-full text-right px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer border ${
                        selectedBranchFilter === 'ALL'
                          ? 'bg-[#1a73e8]/20 border-[#1a73e8] text-white font-bold shadow-sm'
                          : 'bg-[#282a2c]/60 border-[#3c4043] text-slate-300 hover:bg-[#323639] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#1a73e8]" />
                        <span>كل الفروع</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#9aa0a6] px-2 py-0.5 rounded-md bg-white/5 font-bold">
                        {sessions.length}
                      </span>
                    </button>

                    <div className="grid grid-cols-3 gap-1.5">
                      {BRANCH_DEFINITIONS.map(b => {
                        const isSelected = selectedBranchFilter === b.id;
                        const count = sessions.filter(s => normalizeBranch(s.branch) === b.id).length;

                        return (
                          <button
                            key={b.id}
                            onClick={() => setSelectedBranchFilter(isSelected ? 'ALL' : b.id)}
                            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer border ${
                              isSelected
                                ? b.active
                                : `${b.bg} ${b.border} ${b.text} hover:brightness-125 shadow-sm`
                            }`}
                            title={`تصفية حسب فرع ${b.label}`}
                          >
                            <div className="flex items-center justify-center gap-1.5 w-full">
                              <span 
                                className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                                style={{ backgroundColor: b.dot }}
                              />
                              <span className="text-xs truncate font-bold">{b.label}</span>
                            </div>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                              isSelected ? 'bg-black/40 text-white' : b.counter
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Teachers Filter List */}
              <div className="shrink-0 space-y-2">
                <div 
                  onClick={() => setIsTeachersExpanded(!isTeachersExpanded)}
                  className="flex items-center justify-between px-1 cursor-pointer select-none group"
                >
                  <h4 className="text-xs font-bold text-[#9aa0a6] group-hover:text-white uppercase tracking-wider flex items-center gap-1.5 transition-colors">
                    <User size={13} />
                    <span>المدرسين ({uniqueTeachers.length})</span>
                  </h4>
                  <div className="flex items-center gap-1.5">
                    {selectedTeacherFilter !== 'ALL' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTeacherFilter('ALL');
                        }}
                        className="text-[10px] text-[#1a73e8] hover:underline cursor-pointer font-bold px-1"
                      >
                        عرض الكل
                      </button>
                    )}
                    <ChevronDown size={14} className={`text-[#9aa0a6] group-hover:text-white transition-transform duration-200 ${isTeachersExpanded ? '' : '-rotate-90'}`} />
                  </div>
                </div>

                {isTeachersExpanded && (
                  <div className="space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    <button
                      onClick={() => setSelectedTeacherFilter('ALL')}
                      className={`w-full text-right px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        selectedTeacherFilter === 'ALL' 
                          ? 'bg-[#1a73e8]/20 text-[#4285f4] font-bold border border-[#1a73e8]/30' 
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <span>كل المعلمين</span>
                      <span className="text-[10px] text-amber-300 font-mono font-bold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                        {unscheduledTasks.length} ريل
                      </span>
                    </button>

                    {uniqueTeachers.map(teacher => {
                      const color = getTeacherColor(teacher);
                      const scriptCount = unscheduledTasks.filter(t => (t.teacher || '').trim().toLowerCase() === teacher.toLowerCase()).length;
                      const sessionCount = sessions.filter(s => (s.teacher || '').trim().toLowerCase() === teacher.toLowerCase()).length;
                      const isSelected = selectedTeacherFilter.toLowerCase() === teacher.toLowerCase();

                      return (
                        <button
                          key={teacher}
                          onClick={() => setSelectedTeacherFilter(isSelected ? 'ALL' : teacher)}
                          className={`w-full text-right px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                            isSelected ? 'bg-white/10 text-white font-bold border border-white/20' : 'text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span 
                              className="w-3 h-3 rounded shrink-0 flex items-center justify-center text-[9px] text-white" 
                              style={{ backgroundColor: color.hex }} 
                            >
                              {isSelected ? '✓' : ''}
                            </span>
                            <span className="truncate">{teacher}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {scriptCount > 0 && (
                              <span 
                                className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.2 rounded border border-amber-500/25"
                                title={`${scriptCount} ريلز معلقة جاهزة للجدولة`}
                              >
                                {scriptCount} 🎬
                              </span>
                            )}
                            {sessionCount > 0 && (
                              <span 
                                className="text-[10px] font-mono text-blue-300 bg-blue-500/15 px-1.5 py-0.2 rounded border border-blue-500/25"
                                title={`${sessionCount} مواعيد مجدولة في التقويم`}
                              >
                                {sessionCount} 📅
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Unfilmed Draggable Reels Backlog Drawer */}
              <div className="shrink-0 flex flex-col space-y-2 pt-3 border-t border-[#3c4043] pb-8">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                    <Film size={14} />
                    <span>ريلز مطلوب تصويرها</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    {filteredUnscheduledTasks.length}
                  </span>
                </div>

                <p className="text-[10px] text-[#9aa0a6] px-1 leading-snug">
                  اسحب أي ريل وقم بإفلاته على أي يوم لتثبيت موعده فوراً! 🎯
                </p>

                {/* Search reels input */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9aa0a6]" size={12} />
                  <input
                    type="text"
                    placeholder="بحث في الريلز المعلقة..."
                    value={reelsSearchQuery}
                    onChange={e => setReelsSearchQuery(e.target.value)}
                    className="w-full bg-[#282a2c] text-[11px] text-white pl-7 pr-3 py-1.5 rounded-lg border border-[#3c4043] focus:border-[#1a73e8] focus:outline-none placeholder:text-[#5f6368]"
                  />
                </div>

                {/* Draggable Cards List */}
                <div className="space-y-2 pr-1">
                  {filteredUnscheduledTasks.length === 0 ? (
                    <div className="p-4 text-center text-[#9aa0a6] text-xs bg-[#282a2c]/50 rounded-xl border border-dashed border-[#3c4043]">
                      لا توجد ريلز معلقة حالياً 🎉
                    </div>
                  ) : (
                    filteredUnscheduledTasks.map(task => {
                      const title = getScriptDisplay(task.script);
                      const color = getTeacherColor(task.teacher || '');

                      return (
                        <div
                          key={task.code || task.id}
                          draggable
                          onDragStart={e => handleDragStartTask(e, task)}
                          onDragEnd={handleDragEnd}
                          className="p-2.5 bg-[#282a2c] hover:bg-[#323639] border border-[#3c4043] hover:border-amber-500/50 rounded-xl cursor-grab active:cursor-grabbing transition-all text-right shadow-sm group hover:scale-[1.01] active:scale-95"
                          title="اسحب هذا الريل وأفلته في اليوم المطلوب بالتقويم"
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                              <span 
                                className="w-2 h-2 rounded-full shrink-0" 
                                style={{ backgroundColor: color.hex }} 
                              />
                              <span className="truncate">{task.teacher || 'بدون معلم'}</span>
                            </span>
                            <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-bold" dir="ltr">
                              {task.code}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                            {title}
                          </p>
                          <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#9aa0a6] pt-1 border-t border-white/5">
                            <span className="flex items-center gap-1">
                              <GripVertical size={11} className="text-amber-400 group-hover:scale-125 transition-transform" />
                              اسحب للجدولة
                            </span>
                            <span>{task.type || 'ريل'}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </aside>

        {/* ========================================================
            3. CALENDAR GRID CANVAS
        ======================================================== */}
        <main className="flex-1 bg-[#18191a] flex flex-col overflow-y-auto custom-scrollbar">
          
          {/* ====================================
              VIEW A: MONTH VIEW (Google Calendar)
          ==================================== */}
          {viewMode === 'month' && (
            <div className="w-full flex-1 flex flex-col">
              
              {/* Day Headers (SAT, SUN, MON, TUE, WED, THU, FRI) */}
              <div className="grid grid-cols-7 border-b border-[#3c4043] shrink-0 bg-[#1f1f1f] text-center sticky top-0 z-10">
                {DAYS_HEADER.map((d, idx) => (
                  <div key={idx} className="py-2.5 border-r border-[#3c4043] last:border-r-0">
                    <span className="text-xs font-semibold text-[#9aa0a6] uppercase tracking-wider block">
                      {d.en}
                    </span>
                    <span className="text-[10px] text-[#5f6368] font-medium">
                      {d.ar}
                    </span>
                  </div>
                ))}
              </div>

              {/* Month Days Grid */}
              <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                {monthCalendarDays.map(({ dateStr, isCurrentMonth, dayNumber, monthNameEn }, idx) => {
                  const daySessions = getSessionsForDate(dateStr);
                  const isToday = todayStr === dateStr;
                  const isDropHover = dragOverDate === dateStr;

                  return (
                    <div
                      key={idx}
                      onDragEnter={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (dragOverDate !== dateStr) setDragOverDate(dateStr);
                      }}
                      onDragOver={e => handleDragOverDate(e, dateStr)}
                      onDragLeave={e => {
                        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                        if (dragOverDate === dateStr) setDragOverDate(null);
                      }}
                      onDrop={e => handleDropOnDate(e, dateStr)}
                      className={`min-h-[145px] border-b border-r border-[#3c4043] p-1.5 flex flex-col transition-all group relative ${
                        !isCurrentMonth ? 'bg-[#131314]/80 text-[#5f6368]' : 'bg-[#18191a] text-[#e8eaed]'
                      } ${
                        isDropHover 
                          ? 'bg-[#1a73e8]/20 ring-2 ring-[#1a73e8] border-[#1a73e8] shadow-[inset_0_0_20px_rgba(26,115,232,0.3)] z-10' 
                          : 'hover:bg-white/[0.015]'
                      }`}
                    >
                      {/* Top Bar Indicator for Today (like Google Calendar screenshot) */}
                      {isToday && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#1a73e8]" />
                      )}

                      {/* Day Header with Date Number */}
                      <div className="flex items-center justify-between mb-1.5 px-1">
                        <div className="flex items-center gap-1">
                          <span className={`text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                            isToday
                              ? 'bg-[#1a73e8] text-white font-bold shadow-md'
                              : 'text-[#e8eaed] group-hover:bg-[#303134]'
                          }`}>
                            {dayNumber}
                          </span>
                          {/* If first of month, show month name like Google Calendar */}
                          {dayNumber === 1 && (
                            <span className="text-[10px] font-bold text-[#1a73e8]">
                              {monthNameEn.slice(0, 3)}
                            </span>
                          )}
                        </div>

                        {/* Quick Add Button */}
                        <button
                          onClick={() => handleOpenCreateModal(dateStr)}
                          className="w-5 h-5 rounded-md hover:bg-[#303134] text-[#9aa0a6] hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="إضافة موعد تصوير جديد في هذا اليوم"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {/* Event Chips (Google Calendar Style Rounded Pills) */}
                      <div className="flex-1 flex flex-col space-y-1 overflow-y-auto max-h-[130px] custom-scrollbar pr-0.5">
                        {daySessions.map(session => {
                          const color = getSessionColorStyle(session);
                          const reelCount = session.taskCodes?.length || 0;

                          const bNorm = normalizeBranch(session.branch);
                          const bInfo = BRANCH_DEFINITIONS.find(b => b.id === bNorm);

                          return (
                            <div
                              key={session.id}
                              draggable
                              onDragStart={e => handleDragStartSession(e, session)}
                              onDragEnd={handleDragEnd}
                              onClick={() => handleOpenDetails(session)}
                              style={{
                                backgroundColor: color.hex,
                                borderColor: color.hex
                              }}
                              className={`px-2 py-1 rounded-md text-xs font-semibold cursor-grab active:cursor-grabbing transition-all hover:brightness-110 shadow-sm flex flex-col gap-0.5 text-right border active:scale-95 group/chip relative ${color.text}`}
                              title={`${session.teacher} (${session.startTime} - ${session.endTime}) - مدة الجلسة: ${formatDurationArabic(getDurationMinutes(session.startTime, session.endTime))} - فرع ${bNorm} - ${reelCount} ريلز`}
                            >
                              {/* Top Row: Teacher Name (prominent and full width) + Reel Count */}
                              <div className="flex items-center justify-between gap-1 w-full min-w-0">
                                <span className="font-bold truncate text-[12px] text-white leading-tight flex-1">
                                  {session.teacher}
                                </span>
                                {reelCount > 0 && (
                                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/30 text-white font-bold shrink-0">
                                    {reelCount} 🎬
                                  </span>
                                )}
                              </div>

                              {/* Bottom Row: Time Range + Quick Extend button */}
                              <div className="flex items-center justify-between gap-1 w-full text-[10px] text-white/80 font-mono" dir="ltr">
                                <span className="truncate opacity-90 text-[9.5px]">
                                  {session.startTime} - {session.endTime}
                                </span>
                                <button
                                  type="button"
                                  onClick={e => handleQuickExtend(session, 60, e)}
                                  className="opacity-0 group-hover/chip:opacity-100 transition-opacity px-1 py-0.2 rounded bg-black/40 hover:bg-black/80 text-[8.5px] font-bold text-emerald-300 shrink-0"
                                  title="تمديد الموعد ساعة إضافية (+1h)"
                                >
                                  +1h
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Drop Highlight Badge */}
                      {isDropHover && (
                        <div className="mt-auto text-[11px] font-bold text-center text-[#4285f4] py-1.5 bg-[#1a73e8]/30 rounded-lg border border-[#1a73e8] animate-pulse shadow-sm pointer-events-none z-10">
                          🎯 إفلات للتثبيت والجدولة
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ====================================
              VIEW B: WEEK VIEW (Timeline View)
          ==================================== */}
          {viewMode === 'week' && (
            <div className="w-full flex-1 flex flex-col overflow-x-auto custom-scrollbar">
              
              {/* Day Headers (Sticky) */}
              <div className="grid grid-cols-8 border-b border-[#3c4043] shrink-0 min-w-[960px] bg-[#1f1f1f] sticky top-0 z-20">
                <div className="py-3 text-center border-r border-[#3c4043] text-xs text-[#9aa0a6] font-mono flex items-center justify-center">
                  GMT+2
                </div>
                {weekCalendarDays.map(({ dateStr, dayNameEn, dayNameAr, dayNumber }) => {
                  const isToday = todayStr === dateStr;
                  return (
                    <div
                      key={dateStr}
                      className={`py-2 text-center border-r border-[#3c4043] last:border-r-0 relative ${
                        isToday ? 'bg-[#1a73e8]/10' : ''
                      }`}
                    >
                      {isToday && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#1a73e8]" />
                      )}
                      <span className="text-xs font-semibold text-[#9aa0a6] uppercase tracking-wider block">
                        {dayNameEn} <span className="text-[10px]">({dayNameAr})</span>
                      </span>
                      <span className={`text-base font-bold inline-flex items-center justify-center w-8 h-8 rounded-full mt-0.5 ${
                        isToday ? 'bg-[#1a73e8] text-white shadow-md' : 'text-white'
                      }`}>
                        {dayNumber}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Hourly Timeline Grid Container with Auto-Scroll */}
              <div ref={weekTimelineContainerRef} className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-8 min-w-[960px] relative select-none">
                  
                  {/* Column 0: Hour Axis Labels */}
                  <div className="border-r border-[#3c4043] bg-[#1a1b1e] shrink-0">
                    {TIMELINE_HOURS.map(hour => {
                      const hourLabel = formatHourLabel(hour);
                      return (
                        <div 
                          key={hour} 
                          style={{ height: `${HOUR_HEIGHT}px` }} 
                          className="text-[11px] font-mono text-[#9aa0a6] text-center pt-1.5 border-b border-[#3c4043]/60 relative"
                        >
                          <span>{hourLabel}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Columns 1-7: Day Timeline Columns */}
                  {weekCalendarDays.map(({ dateStr }) => {
                    const daySessions = getSessionsForDate(dateStr);
                    const positioned = getPositionedSessionsForDay(daySessions);
                    const isToday = todayStr === dateStr;

                    return (
                      <div 
                        key={dateStr}
                        className={`border-r border-[#3c4043] relative transition-colors ${
                          isToday ? 'bg-blue-500/[0.02]' : ''
                        }`}
                        style={{ height: `${TIMELINE_HOURS.length * HOUR_HEIGHT}px` }}
                      >
                        {/* Background Hourly Grid Slots (Drop targets & click to add) */}
                        {TIMELINE_HOURS.map(hour => {
                          const isSlotHovered = dragOverSlot?.date === dateStr && dragOverSlot?.hour === hour;
                          const hourLabel = formatHourLabel(hour);

                          return (
                            <div
                              key={hour}
                              style={{ height: `${HOUR_HEIGHT}px` }}
                              onDragOver={e => handleDragOverSlot(e, dateStr, hour)}
                              onDrop={e => handleDropOnDate(e, dateStr, hour)}
                              onClick={() => handleOpenCreateModal(dateStr, undefined, undefined, hour)}
                              className={`border-b border-[#3c4043]/45 relative transition-colors cursor-pointer group/slot ${
                                isSlotHovered ? 'bg-[#1a73e8]/25 ring-2 ring-[#1a73e8] z-10' : 'hover:bg-white/[0.02]'
                              }`}
                            >
                              {/* Subtle 30-min guideline */}
                              <div className="absolute top-1/2 left-0 right-0 border-b border-[#3c4043]/20 pointer-events-none" />

                              {/* Hover Add Button */}
                              <div className="w-full h-full opacity-0 group-hover/slot:opacity-100 flex items-center justify-center text-[#9aa0a6] text-xs pointer-events-none">
                                <Plus size={14} className="opacity-70 group-hover/slot:opacity-100 transition-opacity" />
                              </div>

                              {isSlotHovered && (
                                <div className="absolute inset-0 bg-[#1a73e8]/40 border-2 border-[#1a73e8] rounded-lg flex items-center justify-center text-xs font-bold text-white z-20 pointer-events-none">
                                  تثبيت في {hourLabel} 🎯
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Current Time Red Indicator Line (Google Calendar Signature - see media_1790598633340) */}
                        {isToday && currentTimeMinutes >= (TIMELINE_START_HOUR * 60) && currentTimeMinutes <= ((TIMELINE_END_HOUR + 1) * 60) && (
                          <div 
                            className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                            style={{
                              top: `${((currentTimeMinutes - TIMELINE_START_HOUR * 60) / 60) * HOUR_HEIGHT}px`
                            }}
                          >
                            <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.95)] -ml-1.5 shrink-0 z-10" />
                            <div className="h-[2px] w-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
                          </div>
                        )}

                        {/* Positioned Sessions (Multi-Hour Vertical Spanning & Drag Resizing) */}
                        {positioned.map(item => {
                          const { session, startM, endM, colIndex, totalCols } = item;
                          const color = getSessionColorStyle(session);
                          const bNorm = normalizeBranch(session.branch);
                          const isResizingThis = resizingSession?.id === session.id;

                          const activeEndM = isResizingThis 
                            ? parseTimeToMinutes(resizingSession.previewEndTime) 
                            : endM;
                          const durationMin = Math.max(30, activeEndM - startM);

                          const topPx = Math.max(0, ((startM - TIMELINE_START_HOUR * 60) / 60) * HOUR_HEIGHT);
                          const heightPx = Math.max(34, (durationMin / 60) * HOUR_HEIGHT - 4);
                          const colWidthPercent = 100 / totalCols;
                          const leftPercent = colIndex * colWidthPercent;

                          const displayEnd = isResizingThis ? resizingSession.previewEndTime : session.endTime;
                          const isCompact = heightPx < 65;

                          return (
                            <div
                              key={session.id}
                              draggable={!isResizingThis}
                              onDragStart={e => handleDragStartSession(e, session)}
                              onDragEnd={handleDragEnd}
                              onClick={() => handleOpenDetails(session)}
                              style={{
                                top: `${topPx}px`,
                                height: `${heightPx}px`,
                                left: `calc(${leftPercent}% + 2px)`,
                                width: `calc(${colWidthPercent}% - 4px)`,
                                backgroundColor: color.hex,
                                borderColor: color.hex
                              }}
                              className={`absolute z-20 rounded-xl p-2.5 flex flex-col justify-between overflow-hidden shadow-md border transition-all cursor-grab active:cursor-grabbing select-none group/card ${color.text} ${
                                isResizingThis 
                                  ? 'ring-2 ring-white shadow-2xl scale-[1.01] z-40' 
                                  : 'hover:brightness-110 hover:shadow-xl'
                              }`}
                              title={`${session.teacher} (${session.startTime} - ${displayEnd}) - مدة الجلسة: ${formatDurationArabic(durationMin)}`}
                            >
                              {/* Top Bar: Teacher Name & Branch */}
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="font-bold truncate text-xs flex-1 text-white">
                                    {session.teacher}
                                  </span>
                                </div>

                                {/* Time Range & Duration Badge */}
                                <div className="flex items-center gap-1.5 text-[10px] opacity-90 font-mono" dir="ltr">
                                  <Clock size={11} className="opacity-80 shrink-0" />
                                  <span>{session.startTime} - {displayEnd}</span>
                                  <span className="opacity-90 px-1 py-0.2 rounded bg-black/20 text-[9px] font-sans font-bold">
                                    {formatDurationArabic(durationMin)}
                                  </span>
                                </div>
                              </div>

                              {/* Reels & Videographer Info (if height permits) */}
                              {!isCompact && (
                                <div className="flex items-center justify-between text-[10px] mt-1 pt-1 border-t border-white/10 font-semibold">
                                  <span>🎬 {session.taskCodes?.length || 0} ريلز</span>
                                  {session.videographer && (
                                    <span className="truncate max-w-[85px] opacity-90">🎥 {session.videographer}</span>
                                  )}
                                </div>
                              )}

                              {/* Quick Extend Floating Action Pill on Hover */}
                              <div 
                                onClick={e => e.stopPropagation()} 
                                className="absolute top-1 left-1 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center gap-0.5 bg-black/80 backdrop-blur-md rounded-lg p-0.5 z-30 shadow-lg"
                              >
                                <button
                                  type="button"
                                  onClick={e => handleQuickExtend(session, 60, e)}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-300 hover:bg-white/20 transition-colors"
                                  title="تمديد الموعد ساعة إضافية (+1h)"
                                >
                                  +1h
                                </button>
                                <button
                                  type="button"
                                  onClick={e => handleQuickExtend(session, 30, e)}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold text-sky-300 hover:bg-white/20 transition-colors"
                                  title="تمديد الموعد 30 دقيقة (+30m)"
                                >
                                  +30m
                                </button>
                                {durationMin > 60 && (
                                  <button
                                    type="button"
                                    onClick={e => handleQuickExtend(session, -60, e)}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-bold text-rose-300 hover:bg-white/20 transition-colors"
                                    title="تقصير الموعد ساعة (-1h)"
                                  >
                                    -1h
                                  </button>
                                )}
                              </div>

                              {/* Interactive Bottom Resize Handle (Google Calendar ns-resize) */}
                              <div
                                onMouseDown={e => handleStartResize(e, session)}
                                onClick={e => e.stopPropagation()}
                                className="absolute bottom-0 left-0 right-0 h-3.5 cursor-ns-resize flex items-center justify-center group-hover/card:bg-black/30 transition-all rounded-b-xl z-30"
                                title="اسحب لأسفل لتمديد مدة الموعد أو لأعلى للتقصير ⏱️"
                              >
                                <div className="w-8 h-1 rounded-full bg-white/60 group-hover/card:bg-white group-hover/card:w-12 transition-all shadow-sm" />
                              </div>

                              {/* Live Tooltip when dragging to resize */}
                              {isResizingThis && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-2xl border border-white/20 whitespace-nowrap pointer-events-none z-50 animate-pulse">
                                  ⏱️ تمديد إلى: {displayEnd} ({formatDurationArabic(durationMin)})
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================
          4. MODAL: CREATE / EDIT SLOT
      ======================================================== */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" dir="rtl">
          <div className="bg-[#282a2c] border border-[#3c4043] rounded-3xl p-6 lg:p-8 max-w-2xl w-full shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto custom-scrollbar text-[#e8eaed]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#3c4043] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#1a73e8] text-white flex items-center justify-center shadow-md">
                  <CalendarIcon size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {modalMode === 'create' ? 'حجز موعد أستديو جديد 🎬' : 'تعديل موعد الحجز ✨'}
                  </h3>
                  <p className="text-xs text-[#9aa0a6]">
                    تسكين جلسة تصوير بالأستديو وربط ريلز المعلم من شيت الـ Shooting
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="w-8 h-8 rounded-full hover:bg-white/10 text-[#9aa0a6] hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Teacher & Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#9aa0a6] mb-1.5">المعلم / المحاضر *</label>
                  <select
                    required
                    value={formData.teacher}
                    onChange={e => {
                      const t = e.target.value;
                      setFormData(prev => ({ ...prev, teacher: t, taskCodes: [] }));
                    }}
                    className="w-full bg-[#1f1f1f] border border-[#3c4043] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#1a73e8] font-bold text-sm cursor-pointer"
                  >
                    <option value="" disabled>اختر المعلم...</option>
                    {uniqueTeachers.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#9aa0a6] mb-1.5">الفرع / غرفة الأستديو</label>
                  <select
                    value={formData.branch}
                    onChange={e => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full bg-[#1f1f1f] border border-[#3c4043] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#1a73e8] font-bold text-sm cursor-pointer"
                  >
                    <option value="اسكندرية">فرع اسكندرية</option>
                    <option value="دسوق">فرع دسوق</option>
                    <option value="القاهرة">فرع القاهرة</option>
                  </select>
                </div>
              </div>

              {/* Date & Times with Duration Presets */}
              <div className="p-4 bg-[#1f1f1f] border border-[#3c4043] rounded-2xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#9aa0a6] mb-1.5">تاريخ التصوير *</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-[#282a2c] border border-[#3c4043] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#1a73e8] font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#9aa0a6] mb-1.5">من الساعة (Start)</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full bg-[#282a2c] border border-[#3c4043] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#1a73e8] font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#9aa0a6] mb-1.5">إلى الساعة (End)</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full bg-[#282a2c] border border-[#3c4043] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#1a73e8] font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Duration Presets & Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-[#9aa0a6] font-bold">تحديد المدة سريعا:</span>
                    {[
                      { label: 'ساعة', h: 1 },
                      { label: 'ساعتان', h: 2 },
                      { label: '3 ساعات', h: 3 },
                      { label: '4 ساعات', h: 4 },
                      { label: 'يوم كامل (6 س)', h: 6 },
                    ].map(p => (
                      <button
                        key={p.h}
                        type="button"
                        onClick={() => {
                          const startM = parseTimeToMinutes(formData.startTime);
                          const endM = Math.min(23 * 60 + 59, startM + p.h * 60);
                          setFormData(prev => ({ ...prev, endTime: formatMinutesToTime(endM) }));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer active:scale-95"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                    ⏱️ المدة: {formatDurationArabic(getDurationMinutes(formData.startTime, formData.endTime))}
                  </span>
                </div>
              </div>

              {/* Videographer & Status */}
              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 bg-[#1f1f1f] border border-[#3c4043] rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#9aa0a6] flex items-center gap-2">
                      <User size={14} className="text-[#1a73e8]" />
                      <span>المصور المسؤول (Videographer)</span>
                    </label>
                    {formData.videographer && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, videographer: '' }))}
                        className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                      >
                        إلغاء التحديد ✕
                      </button>
                    )}
                  </div>

                  {/* Selectable Videographer Pills (matching user image: media_1790599979588) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {DEFAULT_VIDEOGRAPHERS.map(v => {
                      const isSelected = formData.videographer?.trim().toLowerCase() === v.name.toLowerCase();

                      return (
                        <button
                          key={v.name}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              videographer: isSelected ? '' : v.name
                            }));
                          }}
                          className={`px-3 py-2 rounded-full text-xs font-bold transition-all flex items-center justify-start gap-2.5 cursor-pointer border ${
                            isSelected
                              ? 'bg-[#1e293b] border-sky-400 text-white ring-2 ring-sky-400/50 shadow-lg scale-105'
                              : 'bg-[#151922] border-[#2e384d] text-slate-300 hover:bg-[#1e2536] hover:border-slate-500 hover:text-white'
                          }`}
                        >
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor]"
                            style={{ backgroundColor: v.dot, color: v.dot }}
                          />
                          <span className={isSelected ? 'text-white font-black' : v.text}>{v.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Name input if needed */}
                  <div className="pt-1 border-t border-white/5 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="أو اكتب اسم مصور آخر يدوياً إذا لم يكن بالقائمة..."
                      value={formData.videographer}
                      onChange={e => setFormData({ ...formData, videographer: e.target.value })}
                      className="w-full bg-[#282a2c] border border-[#3c4043] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#1a73e8] text-xs placeholder:text-[#5f6368]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#9aa0a6] mb-1.5">حالة الحجز</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-[#1f1f1f] border border-[#3c4043] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#1a73e8] font-bold text-sm cursor-pointer"
                  >
                    <option value="scheduled">مجدول ⏳</option>
                    <option value="in_progress">جاري التصوير 🎥</option>
                    <option value="completed">تم التصوير بنجاح ✅</option>
                    <option value="cancelled">ملغي ❌</option>
                  </select>
                </div>

                {/* Color Palette Picker */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#9aa0a6] flex items-center gap-1.5">
                      <Palette size={14} className="text-[#1a73e8]" />
                      <span>لون الموعد في التقويم:</span>
                    </label>
                    <span className="text-[11px] text-[#5f6368]">
                      {formData.color ? 'لون مخصص' : `تلقائي حسب الفرع (${formData.branch || 'اسكندرية'})`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap bg-[#1f1f1f] p-2.5 rounded-xl border border-[#3c4043]">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, color: '' })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        !formData.color
                          ? 'bg-sky-500/20 border-sky-400 text-sky-200 ring-1 ring-sky-400/50 shadow'
                          : 'bg-white/5 border-transparent text-[#9aa0a6] hover:text-white hover:bg-white/10'
                      }`}
                    >
                      تلقائي حسب لون الفرع
                    </button>
                    {SESSION_COLOR_PALETTE.map(c => {
                      const isSelected = formData.color?.toLowerCase() === c.hex.toLowerCase();
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: c.hex })}
                          title={c.label}
                          className={`w-7 h-7 rounded-full transition-all flex items-center justify-center cursor-pointer relative group ${
                            isSelected 
                              ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1f1f1f] scale-110 shadow-lg' 
                              : 'opacity-85 hover:opacity-100 hover:scale-105'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        >
                          {isSelected && <Check size={13} className="text-white drop-shadow" strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Reels Selection Checklist */}
              <div className="p-4 bg-[#1f1f1f] border border-[#3c4043] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film className="text-[#1a73e8]" size={16} />
                    <label className="text-xs font-bold text-white">
                      اختر الاسكريبتات والريلز المطلوب تصويرها ({formData.taskCodes.length} مختار)
                    </label>
                  </div>

                  {availableTasksForFormTeacher.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          const allCodes = availableTasksForFormTeacher.map(t => t.code);
                          setFormData(prev => ({ ...prev, taskCodes: allCodes }));
                        }}
                        className="text-[#4285f4] hover:underline cursor-pointer"
                      >
                        تحديد الكل
                      </button>
                      <span className="text-[#5f6368]">•</span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, taskCodes: [] }))}
                        className="text-rose-400 hover:underline cursor-pointer"
                      >
                        إلغاء التحديد
                      </button>
                    </div>
                  )}
                </div>

                {!formData.teacher ? (
                  <p className="text-xs text-[#9aa0a6] text-center py-4">
                    يرجى اختيار المعلم أولاً لعرض الاسكريبتات غير المصورة الخاصة به
                  </p>
                ) : availableTasksForFormTeacher.length === 0 ? (
                  <p className="text-xs text-amber-300/80 text-center py-4">
                    لا توجد اسكريبتات معلقة لهذا المعلم في شيت الـ Shooting حالياً.
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {availableTasksForFormTeacher.map(task => {
                      const isChecked = formData.taskCodes.includes(task.code);
                      const title = getScriptDisplay(task.script);

                      return (
                        <label
                          key={task.code}
                          className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-[#1a73e8]/20 border-[#1a73e8] text-white'
                              : 'bg-white/5 border-transparent hover:border-white/10 text-[#9aa0a6]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setFormData(prev => {
                                const next = isChecked
                                  ? prev.taskCodes.filter(c => c !== task.code)
                                  : [...prev.taskCodes, task.code];
                                return { ...prev, taskCodes: next };
                              });
                            }}
                            className="mt-1 rounded border-white/20 text-[#1a73e8] focus:ring-[#1a73e8]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono text-xs font-bold text-[#4285f4]" dir="ltr">
                                {task.code}
                              </span>
                              <span className="text-[10px] text-[#9aa0a6]">
                                {task.type || 'ريل'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-200 truncate mt-0.5">
                              {title}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-[#9aa0a6] mb-1.5">ملاحظات الأستديو</label>
                <textarea
                  rows={2}
                  placeholder="إضاءة، ملابس، برومبتر، معدات خاصة..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[#1f1f1f] border border-[#3c4043] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#1a73e8] text-sm"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#3c4043]">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setModalMode(null)}
                  className="px-5 py-2.5 rounded-xl hover:bg-white/5 text-[#9aa0a6] hover:text-white transition-colors text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-7 py-2.5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold text-xs shadow-lg shadow-[#1a73e8]/30 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{modalMode === 'create' ? 'تأكيد الحجز' : 'حفظ التعديلات'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          5. MODAL: SESSION DETAILS & LIVE SHOOTING CHECKLIST
      ======================================================== */}
      {modalMode === 'details' && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" dir="rtl">
          <div className="bg-[#282a2c] border border-[#3c4043] rounded-3xl p-6 lg:p-8 max-w-xl w-full shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto custom-scrollbar text-[#e8eaed]">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#3c4043] pb-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md font-bold text-lg"
                  style={{ backgroundColor: getSessionColorStyle(activeSession).hex }}
                >
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{activeSession.teacher}</h3>
                  <div className="flex items-center gap-2 text-xs text-[#9aa0a6] mt-0.5">
                    <span>{activeSession.date}</span>
                    <span>•</span>
                    <span dir="ltr">{activeSession.startTime} - {activeSession.endTime}</span>
                    <span>•</span>
                    <span>فرع {normalizeBranch(activeSession.branch)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenEditModal(activeSession)}
                  className="p-2 rounded-lg hover:bg-white/10 text-[#9aa0a6] hover:text-white transition-colors cursor-pointer"
                  title="تعديل الحجز"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={e => handleDeleteSession(activeSession.id, e)}
                  className="p-2 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                  title="حذف الحجز"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => setModalMode(null)}
                  className="p-2 rounded-lg hover:bg-white/10 text-[#9aa0a6] hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Quick Duration Extension Section */}
            <div className="p-4 bg-[#1f1f1f] border border-[#3c4043] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-[#1a73e8]" />
                  <span className="text-xs font-bold text-white">تمديد أو تعديل مدة الجلسة</span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                  ⏱️ المدة: {formatDurationArabic(getDurationMinutes(activeSession.startTime, activeSession.endTime))}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-[#9aa0a6] bg-[#282a2c] p-2.5 rounded-xl border border-white/5 font-mono">
                <span>من: <b className="text-white font-mono">{activeSession.startTime}</b></span>
                <span>إلى: <b className="text-white font-mono">{activeSession.endTime}</b></span>
                <span className="text-[11px] text-[#4285f4] font-mono">
                  ({getDurationMinutes(activeSession.startTime, activeSession.endTime)} دقيقة)
                </span>
              </div>

              {/* Quick Extend Buttons */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#9aa0a6] block">تمديد الموعد بنقرة واحدة:</label>
                <div className="grid grid-cols-5 gap-1.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => handleQuickExtend(activeSession, 30)}
                    className="py-2 px-1 rounded-xl bg-[#1a73e8]/20 hover:bg-[#1a73e8]/30 border border-[#1a73e8]/40 text-[#4285f4] hover:text-white transition-all text-center cursor-pointer active:scale-95"
                  >
                    +30 دقيقة
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickExtend(activeSession, 60)}
                    className="py-2 px-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 hover:text-white transition-all text-center cursor-pointer active:scale-95"
                  >
                    +1 ساعة
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickExtend(activeSession, 120)}
                    className="py-2 px-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 hover:text-white transition-all text-center cursor-pointer active:scale-95"
                  >
                    +2 ساعة
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickExtend(activeSession, 180)}
                    className="py-2 px-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-white transition-all text-center cursor-pointer active:scale-95"
                  >
                    +3 ساعات
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickExtend(activeSession, -60)}
                    className="py-2 px-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 hover:text-white transition-all text-center cursor-pointer active:scale-95"
                    title="تقصير ساعة واحدة"
                  >
                    -1 ساعة
                  </button>
                </div>
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#1f1f1f] border border-[#3c4043] rounded-xl">
                <span className="text-[#9aa0a6] block mb-1">المصور المسند:</span>
                <span className="font-bold text-white">{activeSession.videographer || 'غير محدد'}</span>
              </div>
              <div className="p-3 bg-[#1f1f1f] border border-[#3c4043] rounded-xl">
                <span className="text-[#9aa0a6] block mb-1">حالة الجلسة:</span>
                <span className={`font-bold ${
                  activeSession.status === 'completed' ? 'text-emerald-400' :
                  activeSession.status === 'in_progress' ? 'text-blue-400' :
                  activeSession.status === 'cancelled' ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  {activeSession.status === 'completed' ? 'تم الانتهاء بنجاح ✅' :
                   activeSession.status === 'in_progress' ? 'جاري التصوير 🎥' :
                   activeSession.status === 'cancelled' ? 'ملغي ❌' : 'مجدول ⏳'}
                </span>
              </div>
            </div>

            {/* Notes */}
            {activeSession.notes && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200">
                <span className="font-bold block mb-1">📌 ملاحظات الأستديو:</span>
                <p>{activeSession.notes}</p>
              </div>
            )}

            {/* Color Palette Picker (Requested in media_1790600210282) */}
            <div className="p-4 bg-[#1f1f1f] border border-[#3c4043] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette size={16} className="text-[#1a73e8]" />
                  <span className="text-xs font-bold text-white">تغيير لون الموعد في التقويم:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span 
                    className="w-3 h-3 rounded-full shadow-sm border border-white/20"
                    style={{ backgroundColor: getSessionColorStyle(activeSession).hex }}
                  />
                  <span className="text-xs font-bold text-[#9aa0a6]">
                    {getSessionColorStyle(activeSession).label}
                  </span>
                  {activeSession.color && (
                    <button
                      type="button"
                      onClick={() => handleChangeSessionColor(activeSession, '')}
                      className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline cursor-pointer mr-2"
                      title="استعادة لون الفرع التلقائي"
                    >
                      (استعادة لون الفرع)
                    </button>
                  )}
                </div>
              </div>

              {/* Swatches Grid */}
              <div className="flex items-center gap-2.5 flex-wrap pt-1">
                {SESSION_COLOR_PALETTE.map(c => {
                  const currentStyle = getSessionColorStyle(activeSession);
                  const isCurrent = (activeSession.color && activeSession.color.toLowerCase() === c.hex.toLowerCase()) ||
                    (!activeSession.color && currentStyle.hex.toLowerCase() === c.hex.toLowerCase());

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleChangeSessionColor(activeSession, c.hex)}
                      title={`تعيين اللون: ${c.label}`}
                      className={`w-7 h-7 rounded-full transition-all flex items-center justify-center cursor-pointer shadow-sm relative group ${
                        isCurrent 
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1f1f1f] scale-110 shadow-lg' 
                          : 'hover:scale-110 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {isCurrent && (
                        <Check size={14} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" strokeWidth={3} />
                      )}
                      <span className="absolute -bottom-6 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-black/90 text-white px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                        {c.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reels Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Film size={16} className="text-[#1a73e8]" />
                  <span>الريلز والاسكريبتات ({activeSession.taskCodes?.length || 0})</span>
                </h4>
                <span className="text-xs text-[#9aa0a6]">
                  انقر على المربع لتحديث حالة التصوير مباشرة
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {activeSession.taskCodes?.length === 0 ? (
                  <p className="text-xs text-[#9aa0a6] text-center py-4">لم يتم ربط ريلز محددة بهذا الميعاد.</p>
                ) : (
                  activeSession.taskCodes.map(code => {
                    const task = shootingTasks.find(t => (t.code || '').trim().toLowerCase() === code.trim().toLowerCase());
                    const isFilmed = task?.filmed === true || String(task?.filmed).toLowerCase() === 'true';
                    const parsedScript = task?.script ? parseScriptValue(task.script) : null;
                    const title = parsedScript?.text || (task?.script ? String(task.script) : 'بدون اسكريبت');

                    return (
                      <div
                        key={code}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isFilmed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#1f1f1f] border-[#3c4043] hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => handleToggleTaskFilmed(code, isFilmed)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                              isFilmed 
                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' 
                                : 'border border-[#5f6368] hover:border-emerald-400 text-transparent hover:text-emerald-400/50 bg-white/5'
                            }`}
                            title={isFilmed ? 'إلغاء حالة تم التصوير' : 'تحديد كـ تم التصوير ✅'}
                          >
                            <Check size={14} strokeWidth={3} />
                          </button>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-[#4285f4] block truncate" dir="ltr">
                                {code}
                              </span>
                              {task?.type && (
                                <span className="text-[10px] text-[#9aa0a6] bg-white/5 px-1.5 py-0.2 rounded font-sans">
                                  {task.type}
                                </span>
                              )}
                            </div>

                            {/* Script link chip / text */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {parsedScript?.isLink ? (
                                <a
                                  href={parsedScript.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/15 hover:bg-blue-500/30 border border-blue-500/30 hover:border-blue-400/60 rounded-lg text-[11px] font-bold text-blue-300 hover:text-white transition-all shadow-sm group/link cursor-pointer max-w-[280px] truncate active:scale-95"
                                  title={`فتح مستند الاسكريبت في Google Docs: ${parsedScript.url}`}
                                >
                                  <FolderOpen size={12} className="shrink-0 text-blue-400 group-hover/link:scale-110 transition-transform" />
                                  <span className="truncate">{parsedScript.text}</span>
                                  <ExternalLink size={10} className="shrink-0 opacity-70 group-hover/link:opacity-100" />
                                </a>
                              ) : parsedScript ? (
                                <button
                                  type="button"
                                  onClick={() => openScriptModal({ code, teacher: activeSession.teacher, script: task?.script || '' })}
                                  className="text-xs text-slate-300 block truncate cursor-pointer hover:underline text-right"
                                  title="انقر لعرض الاسكريبت كاملاً"
                                >
                                  📄 {title}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openScriptModal({ code, teacher: activeSession.teacher, script: '' })}
                                  className="text-[10px] text-amber-400/80 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <AlertCircle size={10} />
                                  <span>إضافة اسكريبت +</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: View Script Button + Filmed Badge */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => openScriptModal({
                              code,
                              teacher: activeSession.teacher,
                              script: task?.script || ''
                            })}
                            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/40 text-slate-200 hover:text-blue-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                            title="عرض تفاصيل الاسكريبت ورابط المستند وتعديله"
                          >
                            <FileText size={12} className="text-blue-400" />
                            <span>الاسكريبت</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleTaskFilmed(code, isFilmed)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full cursor-pointer transition-all active:scale-95 border ${
                              isFilmed 
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30' 
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                            }`}
                            title="انقر لتغيير حالة التصوير"
                          >
                            {isFilmed ? 'تم التصوير ✅' : 'لم يصور ⏳'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[#3c4043] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="px-5 py-2.5 rounded-xl hover:bg-white/5 text-[#9aa0a6] hover:text-white transition-colors text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={e => handleMarkAllFilmed(activeSession, e)}
                className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                <span>تسجيل انتهاء الجلسة وتصوير الكل ✅</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Script Details & Preview Modal */}
      {scriptModalData && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn" 
          dir="rtl"
          onClick={(e) => {
            if (e.target === e.currentTarget) setScriptModalData(null);
          }}
        >
          <div className="bg-[#282a2c] border border-[#3c4043] rounded-3xl p-6 lg:p-7 max-w-lg w-full shadow-2xl space-y-5 relative text-[#e8eaed] animate-scaleUp">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#3c4043] pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-md">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>اسكريبت الريل</span>
                    <span className="font-mono text-xs text-[#4285f4] bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20" dir="ltr">
                      {scriptModalData.code}
                    </span>
                  </h3>
                  {scriptModalData.teacher && (
                    <p className="text-xs text-[#9aa0a6] mt-0.5">
                      المعلم: <strong className="text-slate-200">{scriptModalData.teacher}</strong>
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setScriptModalData(null)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#9aa0a6] hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Script Details / Action Card */}
            <div className="space-y-4">
              {(() => {
                const parsed = parseScriptValue(scriptModalData.script);

                if (parsed?.isLink) {
                  return (
                    <div className="space-y-3">
                      {/* Big Google Docs Link Card */}
                      <a
                        href={parsed.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-blue-600/20 via-blue-500/10 to-indigo-600/20 border border-blue-500/40 hover:border-blue-400 text-blue-200 hover:text-white transition-all shadow-lg hover:shadow-blue-500/20 group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-blue-500/30 border border-blue-400/40 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-110 transition-transform shadow-md">
                            <FolderOpen size={22} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white mb-0.5 flex items-center gap-1.5">
                              <span>فتح الاسكريبت في Google Docs</span>
                              <ExternalLink size={12} className="text-blue-400 group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] transition-transform" />
                            </p>
                            <p className="text-[11px] text-blue-300 font-mono truncate" dir="ltr" title={parsed.url}>
                              {parsed.text}
                            </p>
                          </div>
                        </div>
                      </a>

                      {/* Copy Link Button */}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(parsed.url);
                          setScriptCopied(true);
                          setTimeout(() => setScriptCopied(false), 2000);
                          if (toast?.success) toast.success('تم نسخ رابط الاسكريبت بنجاح! 📋');
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white/90 text-xs font-bold border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        {scriptCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        <span>{scriptCopied ? 'تم نسخ الرابط! ✅' : 'نسخ رابط الاسكريبت'}</span>
                      </button>
                    </div>
                  );
                } else if (parsed && !parsed.isLink && parsed.text.trim()) {
                  return (
                    <div className="space-y-3">
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/10 max-h-48 overflow-y-auto custom-scrollbar">
                        <p className="text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap select-text">
                          {parsed.text}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(parsed.text);
                          setScriptCopied(true);
                          setTimeout(() => setScriptCopied(false), 2000);
                          if (toast?.success) toast.success('تم نسخ نص الاسكريبت بنجاح! 📋');
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white/90 text-xs font-bold border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        {scriptCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        <span>{scriptCopied ? 'تم نسخ النص! ✅' : 'نسخ نص الاسكريبت'}</span>
                      </button>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-4 text-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                      لا يوجد اسكريبت مضاف لهذا الريل حالياً ⚠️
                      <p className="text-[11px] text-amber-300/70 mt-1">
                        يمكنك إضافة أو لصق رابط Google Docs أدناه لحفظه مباشرة في الشيت.
                      </p>
                    </div>
                  );
                }
              })()}

              {/* Edit / Update Script Section */}
              <div className="pt-3 border-t border-[#3c4043] space-y-2">
                <label className="text-[11px] font-bold text-[#9aa0a6] block">
                  تعديل / تحديث رابط الاسكريبت في شيت الـ Shooting:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingScriptVal}
                    onChange={e => setEditingScriptVal(e.target.value)}
                    placeholder="https://docs.google.com/document/d/..."
                    className="flex-1 bg-[#1f1f1f] text-xs text-white px-3 py-2.5 rounded-xl border border-[#3c4043] focus:border-blue-500 focus:outline-none font-mono placeholder:text-muted/40"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    disabled={isSavingScript}
                    onClick={async () => {
                      setIsSavingScript(true);
                      try {
                        const clean = editingScriptVal.trim();
                        const { error } = await supabase
                          .from('reels_shooting_26')
                          .update({ script: clean, updated_at: new Date().toISOString() })
                          .eq('code', scriptModalData.code);

                        if (error) throw error;

                        setShootingTasks(prev => prev.map(t => 
                          (t.code || '').trim().toLowerCase() === scriptModalData.code.trim().toLowerCase()
                            ? { ...t, script: clean }
                            : t
                        ));
                        setScriptModalData(prev => prev ? { ...prev, script: clean } : null);
                        if (toast?.success) toast.success('تم حفظ وتحديث الاسكريبت بنجاح! 💾');
                      } catch (err: any) {
                        console.error('Error saving script:', err);
                        if (toast?.error) toast.error('حدث خطأ أثناء حفظ الاسكريبت');
                      } finally {
                        setIsSavingScript(false);
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-md shrink-0"
                  >
                    {isSavingScript ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    <span>حفظ</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setScriptModalData(null)}
                className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Calendar Import Modal */}
      <GoogleCalendarImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportGoogleCalendarEvents}
        existingSessions={sessions.map(s => ({
          date: s.date,
          startTime: s.startTime,
          teacher: s.teacher,
          branch: s.branch
        }))}
        toast={toast}
      />
    </div>
  );
};
