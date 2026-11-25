import React, { useState, useMemo, useEffect, useRef, useContext, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  X,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  ChevronDown,
  Clock,
  Timer,
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
  ShieldAlert,
  Trash2,
  Bookmark,
  FileSpreadsheet,
  MessageSquarePlus,
  BookOpen,
  Key,
  Lock,
  Eye,
  EyeOff,
  Home,
  Calendar,
  Send,
  Loader2,
  HardDrive,
  AlertTriangle
} from 'lucide-react';
import { useGoogleSheets } from './hooks/useGoogleSheets';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PresenceProvider, usePresence } from './contexts/PresenceContext';
import { LoginPage } from './pages/LoginPage';
import { DocLinksDropdown } from './components/DocLinksDropdown';
import { useEditorsOptions, getGlobalEditorColor } from './hooks/useEditorsOptions';
import { getTargetStage26 } from './lib/stageHelpers';
import { PageAnnouncementBar } from './components/PageAnnouncementBar';
import { GlobalAnnouncementBar } from './components/GlobalAnnouncementBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuditTrailView, recordAuditLog } from './features/audit';

// Code-split heavy views & modals so initial bundle loads 80%+ faster
const Op27View = React.lazy(() => import('./components/Op27View').then(m => ({ default: m.Op27View })));
const UserManagement = React.lazy(() => import('./components/UserManagement').then(m => ({ default: m.UserManagement })));
const ChangePasswordModal = React.lazy(() => import('./components/UserManagement').then(m => ({ default: m.ChangePasswordModal })));
const ReelsAnalytics = React.lazy(() => import('./components/ReelsAnalytics').then(m => ({ default: m.ReelsAnalytics })));
const DesignersDashboard = React.lazy(() => import('./components/DesignersDashboard'));
const DesignAnalytics = React.lazy(() => import('./components/DesignAnalytics').then(m => ({ default: m.DesignAnalytics })));
const DesignersTeamManagement = React.lazy(() => import('./components/DesignersTeamManagement').then(m => ({ default: m.DesignersTeamManagement })));
const EditorsManagement = React.lazy(() => import('./components/EditorsManagement').then(m => ({ default: m.EditorsManagement })));
const StudioCalendarView = React.lazy(() => import('./components/StudioCalendarView').then(m => ({ default: m.StudioCalendarView })));
const StageCalendarView = React.lazy(() => import('./components/StageCalendarView').then(m => ({ default: m.StageCalendarView })));
const TeachersFollowUpView = React.lazy(() => import('./components/TeachersFollowUpView').then(m => ({ default: m.TeachersFollowUpView })));
const HomeView = React.lazy(() => import('./components/HomeView').then(m => ({ default: m.HomeView })));
const FeedbackModal = React.lazy(() => import('./components/FeedbackModal').then(m => ({ default: m.FeedbackModal })));
const SystemGuideModal = React.lazy(() => import('./components/SystemGuideModal').then(m => ({ default: m.SystemGuideModal })));
const InteractiveTour = React.lazy(() => import('./components/InteractiveTour').then(m => ({ default: m.InteractiveTour })));
const GoogleSheetImportModal = React.lazy(() => import('./components/GoogleSheetImportModal').then(m => ({ default: m.GoogleSheetImportModal })));
import { sortTasksByChunkAscending, sortMultiLineLessonName, sortCombinedFilingName } from './lib/chunkSort';
import { supabase, PERMISSIONS, ROLE_LABELS, ROLE_COLORS, DEFAULT_ROLE_PERMISSIONS, setRuntimeRolePermissions } from './lib/supabase';
import { notifyTaskCompleted, notifyTaskEditRequested, getUserTelegramChatId, notifyHardDriveRequest, notifyHardDriveDecision } from './lib/telegram';
import { cleanCodePart, computeNextUniqueReelCode, fetchRemoteSequenceRegistry, loadLocalSequenceRegistry, recordBulkClaimedSequences, resolveAndClaimUniqueCodeFromDb, type SequenceRegistry } from './lib/codeGenerator';



import {
  yearLabels,
  generateKey,
  parseDriveLink,
  formatArabicTimestamp,
  getCachedNoteAuthors,
  STAGE_TABLE_MAP,
  REELS_BADGE_TABLE_MAP,
  STAGE_WITH_BADGE_MAP,
  GREEN_DONE_BADGE_GIDS,
  isAssignedEditor,
  CREATOR_COLORS,
  getChipColor,
  toInputDate,
  fromInputDate,
  getTargetStageGid,
  getSubjectFromFiling,
  formatDuration,
  calculateTotalDuration,
  getWeekColor,
  parseScriptValue,
  TAGME_DAILY_PRIORITY_LIMIT
} from './lib/dashboardUtils';
import {
  PreviewImage,
  HistoryInput,
  InlineCombobox,
  CustomSelect,
  Chip,
  FilterContext,
  ColFilter,
  DatePickerCell,
  VideoDuration,
  AutofillCell
} from './components/DashboardUiPrimitives';
import { SidebarItem, SidebarGroup } from './components/SidebarNav';
import { OperationsRow, TagmeRow, StageRow } from './components/rows/OperationsAndStageRows';
import { ShootingRow } from './components/rows/ShootingRow';
import { CutsRow } from './components/rows/CutsRow';
const TagmeAnalyticsDashboard = React.lazy(() => import('./components/TagmeAnalyticsDashboard').then(m => ({ default: m.TagmeAnalyticsDashboard })));

// ─── App ──────────────────────────────────────────────────────────────────────
export function App({ isDemoMode = false }: { isDemoMode?: boolean } = {}) {
  const isDemo = isDemoMode || (typeof window !== 'undefined' && (window.location.search.includes('demo=true') || window.location.pathname.includes('demo')));
  const { profile: authProfile, signOut, session } = useAuth();
  const profile = authProfile || (isDemo ? { id: 'demo-admin', name: 'ADMIN (DEMO)', role: 'admin', default_mode: 'operations' } as any : null);
  const [rolePermissions, setRolePermissions] = useState<any>(DEFAULT_ROLE_PERMISSIONS);

  // Determine initial mode from saved state or profile.default_mode
  const getInitialMode = (): 'OP' | 'REELS' | 'DESIGNERS' => {
    try {
      const saved = localStorage.getItem('last_active_app_mode');
      if (saved === 'OP' || saved === 'REELS' || saved === 'DESIGNERS') return saved;
    } catch {}
    const m = profile?.default_mode;
    if (m === 'reels') return 'REELS';
    if (m === 'designers') return 'DESIGNERS';
    return 'OP';
  };
  const getInitialGid = (mode: 'OP' | 'REELS' | 'DESIGNERS') => {
    try {
      const saved = localStorage.getItem('last_active_tab_gid');
      if (saved) return saved;
    } catch {}
    if (mode === 'REELS') return '1436746012';
    if (mode === 'DESIGNERS') return '501319673';
    return '1476192399';
  };
  const getInitialLabel = (mode: 'OP' | 'REELS' | 'DESIGNERS') => {
    try {
      const saved = localStorage.getItem('last_active_tab_label');
      if (saved) return saved;
    } catch {}
    if (mode === 'REELS') return 'Shooting';
    if (mode === 'DESIGNERS') return 'Designers';
    return 'OP 25/26';
  };

  const initialMode = getInitialMode();
  const [activeGid, setActiveGid] = useState(() => getInitialGid(initialMode));
  const [activeLabel, setActiveLabel] = useState(() => getInitialLabel(initialMode));
  const [appMode, setAppMode] = useState<'OP' | 'REELS' | 'DESIGNERS'>(initialMode);
  const [isCardsView, setIsCardsView] = useState(false);
  const [stageViewMode, setStageViewMode] = useState<'TABLE' | 'CALENDAR'>('TABLE');

  // Persist active tab and mode
  useEffect(() => {
    try {
      if (activeGid) localStorage.setItem('last_active_tab_gid', activeGid);
      if (activeLabel) localStorage.setItem('last_active_tab_label', activeLabel);
      if (appMode) localStorage.setItem('last_active_app_mode', appMode);
    } catch {}
  }, [activeGid, activeLabel, appMode]);

  // Re-apply default_mode only if no previous tab was saved
  useEffect(() => {
    if (!profile) return;
    try {
      const hasSavedTab = localStorage.getItem('last_active_tab_gid');
      if (!hasSavedTab) {
        const mode = getInitialMode();
        setAppMode(mode);
        setActiveGid(getInitialGid(mode));
        setActiveLabel(getInitialLabel(mode));
      }
    } catch {}
  }, [profile?.id]);
  const isUsersPage = activeGid === '__users__';
  const isAuditTrailPage = activeGid === '__audit_trail__';

  const isHome = activeGid === 'home';
  const isOperations = activeGid === '1476192399';
  const isOp27 = activeGid === 'op_27';
  const isTagme3at = activeGid === '1535230545';
  const isAnalyticsTagme = activeGid === 'analytics_tagme3at';
  const isReelsAnalytics = activeGid === 'reels-analytics';
  const isStudioCalendar = activeGid === 'reels-calendar';
  const isTeachersTab = activeGid === 'reels-teachers';
  const isDesignersPage = activeGid === '501319673';
  const isDesignAnalytics = activeGid === 'design-analytics';
  const isDesignersTeamPage = activeGid === 'designers-team-management';
  const isEditorsTeamPage = activeGid === 'editors-team-management';
  const isDesignersMode = isDesignersPage || isDesignAnalytics || isDesignersTeamPage;

  const isReelsStage = ['1436746012', '1939073164', '0', '798246690'].includes(activeGid);
  const isStage = !isHome && !isOperations && !isOp27 && !isTagme3at && !isAnalyticsTagme && !isReelsAnalytics && !isStudioCalendar && !isTeachersTab && !isDesignersMode && !isEditorsTeamPage;

  const isSupabaseLiveTab = !isDemo && (
    activeGid === '1535230545' || 
    ['497207661', '96752860', '346788121', '458352282', '2113852114', '2089699920', '1640460225', '595027661', '286303232'].includes(activeGid) ||
    ['1436746012', '1939073164', '0'].includes(activeGid)
  );

  const sheetGidToFetch = isSupabaseLiveTab
    ? ''
    : (isStudioCalendar || isTeachersTab)
    ? ''
    : isAnalyticsTagme 
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
        const filtered = prev.filter(t => t.id !== id).slice(-1);
        return [...filtered, { id, name: `${icon} ${msg}` }];
      });

      if (variant !== 'loading') {
        setTimeout(() => {
          setItemToasts(prev => prev.filter(t => t.id !== id));
        }, variant === 'error' ? 3000 : 1800);
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

  // Listen for global toast events
  useEffect(() => {
    const handleToastEvent = (e: any) => {
      if (e.detail?.msg) {
        if (e.detail.type === 'error') {
          toast.error(e.detail.msg);
        } else {
          toast.success(e.detail.msg);
        }
      }
    };
    window.addEventListener('app-toast', handleToastEvent);
    return () => window.removeEventListener('app-toast', handleToastEvent);
  }, [toast]);

  // Background polling every 45 seconds to fetch changes silently (skip OP 25/26 to load only once)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !loading) {
        if (sheetGidToFetch !== '1476192399' && activeGid !== '1476192399') {
          refresh(true); // gentle 5-minute safety sync
        }
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh, loading, sheetGidToFetch, activeGid]);

  const currentUserName = (() => {
    const raw = profile?.name || localStorage.getItem('user_editor_name') || 'ESLAM';
    const clean = raw.trim();
    if (clean.toLowerCase() === 'shrief') return 'Sherif';
    return clean;
  })();
  const [isMyTasksOnly, setIsMyTasksOnly] = useState(false);

  const [pinnedTabs, setPinnedTabs] = useState<string[]>(() => {
    try {
      const userKey = profile?.id ? `mktg_pinned_tabs_${profile.id}` : null;
      const saved = (userKey ? localStorage.getItem(userKey) : null) || localStorage.getItem('mktg_pinned_tabs');
      return saved ? JSON.parse(saved) : ['1476192399', '1535230545'];
    } catch {
      return ['1476192399', '1535230545'];
    }
  });

  // Automatically load & sync user-specific pinned tabs from LocalStorage and Supabase DB whenever profile loads
  useEffect(() => {
    if (!profile?.id) return;
    const userStorageKey = `mktg_pinned_tabs_${profile.id}`;

    // 1. Instant local load
    try {
      const localSaved = localStorage.getItem(userStorageKey);
      if (localSaved) {
        const parsed = JSON.parse(localSaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPinnedTabs(parsed);
        }
      }
    } catch {}

    // 2. Fetch user's persistent pinned tabs from Supabase DB
    const fetchUserPinsFromDb = async () => {
      try {
        const { data, error } = await supabase
          .from('page_announcements')
          .select('message')
          .eq('page_key', `user_pinned_tabs_${profile.id}`)
          .maybeSingle();

        if (!error && data?.message) {
          const cloudPins = JSON.parse(data.message);
          if (Array.isArray(cloudPins)) {
            setPinnedTabs(cloudPins);
            localStorage.setItem(userStorageKey, JSON.stringify(cloudPins));
          }
        }
      } catch (err) {
        console.error('Error fetching user pinned tabs from DB:', err);
      }
    };

    fetchUserPinsFromDb();

    // 3. Realtime subscription for cross-device & cross-tab sync
    const channel = supabase
      .channel(`user-pins-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'page_announcements'
        },
        (payload) => {
          const key = (payload.new as any)?.page_key;
          if (key === `user_pinned_tabs_${profile.id}`) {
            try {
              const newPins = JSON.parse((payload.new as any)?.message);
              if (Array.isArray(newPins)) {
                setPinnedTabs(newPins);
                localStorage.setItem(userStorageKey, JSON.stringify(newPins));
              }
            } catch {}
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const togglePinTab = (gid: string) => {
    setPinnedTabs(prev => {
      const updated = prev.includes(gid) ? prev.filter(g => g !== gid) : [...prev, gid];
      
      // Save locally
      try {
        if (profile?.id) {
          localStorage.setItem(`mktg_pinned_tabs_${profile.id}`, JSON.stringify(updated));
        }
        localStorage.setItem('mktg_pinned_tabs', JSON.stringify(updated));
      } catch {}

      // Save to Supabase Cloud DB for persistent cross-device storage
      if (profile?.id) {
        supabase
          .from('page_announcements')
          .upsert({
            page_key: `user_pinned_tabs_${profile.id}`,
            message: JSON.stringify(updated),
            updated_at: new Date().toISOString(),
            author: profile.name || 'User'
          }, { onConflict: 'page_key' })
          .then(({ error }) => {
            if (error) console.error('Error saving user pinned tabs to cloud:', error);
          })
          .catch(() => {});
      }

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
  const [activeAcademicTerm, setActiveAcademicTerm] = useState<'T1' | 'T2'>(() => {
    return (localStorage.getItem('active_academic_term') as 'T1' | 'T2') || 'T1';
  });
  const [bypassYearTerm, setBypassYearTerm] = useState(false);
  const [tagmeViewMode, setTagmeViewMode] = useState<'SIMPLE' | 'DETAILED'>('SIMPLE');
  const [colFilters, setColFilters] = useState<Record<string, string>>({});

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const topScrollInnerRef = useRef<HTMLDivElement>(null);
  const scrollSourceRef = useRef<'top' | 'table' | 'button' | null>(null);
  const scrollTimeoutRef = useRef<any>(null);

  const updateTopScrollWidth = useCallback(() => {
    if (topScrollInnerRef.current && tableScrollRef.current) {
      const sw = tableScrollRef.current.scrollWidth;
      if (sw > 0) {
        topScrollInnerRef.current.style.width = `${sw}px`;
      }
    }
  }, []);

  const syncScrollFromTop = () => {
    if (scrollSourceRef.current === 'table' || scrollSourceRef.current === 'button') return;
    scrollSourceRef.current = 'top';
    if (tableScrollRef.current && topScrollRef.current) {
      tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      scrollSourceRef.current = null;
    }, 60);
  };

  const syncScrollFromTable = () => {
    if (scrollSourceRef.current === 'top' || scrollSourceRef.current === 'button') return;
    scrollSourceRef.current = 'table';
    if (topScrollRef.current && tableScrollRef.current) {
      topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
    }
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      scrollSourceRef.current = null;
    }, 60);
  };

  // Header wheel scroll & Shift+Wheel support
  useEffect(() => {
    const tableEl = tableScrollRef.current;
    if (!tableEl) return;

    const onWheel = (e: WheelEvent) => {
      // Only scroll horizontally if user is explicitly holding Shift key
      // NEVER block or hijack normal vertical scrolling on the header or table
      if (e.shiftKey && e.deltaY !== 0) {
        e.preventDefault();
        scrollSourceRef.current = 'table';
        tableEl.scrollLeft += e.deltaY * 1.5;
        if (topScrollRef.current) {
          topScrollRef.current.scrollLeft = tableEl.scrollLeft;
        }
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          scrollSourceRef.current = null;
        }, 60);
      }
    };

    tableEl.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      tableEl.removeEventListener('wheel', onWheel);
    };
  }, []);

  const handleScrollHorizontal = (delta: number) => {
    if (!tableScrollRef.current) return;
    scrollSourceRef.current = 'button';
    tableScrollRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    if (topScrollRef.current) {
      topScrollRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    }
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      scrollSourceRef.current = null;
    }, 350);
  };

  const handleScrollToStart = () => {
    if (!tableScrollRef.current) return;
    scrollSourceRef.current = 'button';
    tableScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    if (topScrollRef.current) {
      topScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      scrollSourceRef.current = null;
    }, 350);
  };

  const handleScrollToEnd = () => {
    if (!tableScrollRef.current) return;
    scrollSourceRef.current = 'button';
    const maxScroll = tableScrollRef.current.scrollWidth;
    tableScrollRef.current.scrollTo({ left: maxScroll, behavior: 'smooth' });
    if (topScrollRef.current) {
      topScrollRef.current.scrollTo({ left: maxScroll, behavior: 'smooth' });
    }
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      scrollSourceRef.current = null;
    }, 350);
  };

  const handleAdminTermChange = (term: 'T1' | 'T2') => {
    setActiveAcademicTerm(term);
    localStorage.setItem('active_academic_term', term);
    toast.success(`تم تحويل الترم النشط للنظام إلى: ${term === 'T1' ? 'الترم الأول (T1)' : 'الترم الثاني (T2)'}`);

    const token = session?.access_token || profile?.id;
    if (token) {
      fetch('/api/task-metadata', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ field: 'active_academic_term', metadata: { term } })
      }).catch(e => console.error(e));
    }

    if (globalChannelRef.current && profile?.name) {
      globalChannelRef.current.send({
        type: 'broadcast',
        event: 'update',
        payload: { itemKey: 'term-config', taskName: 'Active Term', message: `🔒 تم تحديد الترم النشط: ${term}`, type: 'term_change', field: 'active_academic_term', dict: { term } }
      });
    }
  };

  useEffect(() => {
    setBypassYearTerm(false);
  }, [teacherFilter, activeGid]);

  const [newItems, setNewItems] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // ─── Personal Notifications via Supabase Realtime Broadcast ───────────────
  type PersonalNotif = { id: string; taskName: string; message: string; type: string; from: string; at: number; read: boolean; };
  const [myNotifs, setMyNotifs] = useState<PersonalNotif[]>(() => {
    try {
      const stored: PersonalNotif[] = JSON.parse(localStorage.getItem('my_notifications') || '[]');
      const unique: PersonalNotif[] = [];
      stored.forEach(n => {
        const isDup = unique.some(u => u.taskName === n.taskName && u.message === n.message && Math.abs(u.at - n.at) < 10000);
        if (!isDup) unique.push(n);
      });
      return unique;
    } catch (e) {
      return [];
    }
  });
  const [showMyNotifs, setShowMyNotifs] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const unreadCount = myNotifs.filter(n => !n.read).length;
  const { onlineCount } = usePresence();

  const pushNotification = (notif: PersonalNotif) => {
    setMyNotifs(prev => {
      // Prevent duplicate notification for identical task and message within 10 seconds
      const isDuplicate = prev.some(n =>
        n.taskName === notif.taskName &&
        n.message === notif.message &&
        Math.abs(notif.at - n.at) < 10000
      );
      if (isDuplicate) return prev;
      const next = [notif, ...prev.filter(n => n.id !== notif.id)].slice(0, 50);
      try {
        localStorage.setItem('my_notifications', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    localStorage.setItem('my_notifications', JSON.stringify(myNotifs));
  }, [myNotifs]);




  const [youtubeItems, setYoutubeItems] = useState<{ [gid: string]: any[] }>({});
  const [bunnyLinkModal, setBunnyLinkModal] = useState<{ isOpen: boolean, itemKey: string, itemName: string, initialUrl: string } | null>(null);
  const [activeToast, setActiveToast] = useState<{ item: any, stage: { gid: string, label: string }, uniqueKey: string } | null>(null);
  const [selectedForMerge, setSelectedForMerge] = useState<any[]>([]);

  // ─── Direct Supabase Database for Tagme3at (tagme3at_26) ───────────────────
  const [tagmeDbRows, setTagmeDbRows] = useState<any[]>([]);
  const [isTagmeDbLoading, setIsTagmeDbLoading] = useState(false);
  const lastTagmeUpdatedAtRef = useRef<string | null>(null);

  const fetchTagmeDb = async (isSilent = false) => {
    if (!isSilent) setIsTagmeDbLoading(true);
    try {
      // Smart Delta: If silent poll, check latest updated_at to avoid re-downloading entire table if unchanged
      if (isSilent && lastTagmeUpdatedAtRef.current) {
        const { data: checkData } = await supabase
          .from('tagme3at_26')
          .select('updated_at')
          .order('updated_at', { ascending: false })
          .limit(1);
        const latest = checkData?.[0]?.updated_at;
        if (latest && latest === lastTagmeUpdatedAtRef.current) {
          return;
        }
      }

      const { data, error } = await supabase
        .from('tagme3at_26')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      if (data) {
        if (data.length > 0) {
          const maxUp = data.reduce((max, r) => (r.updated_at > max ? r.updated_at : max), data[0].updated_at || '');
          lastTagmeUpdatedAtRef.current = maxUp;
        }
        const mapped = data.map((i: any) => ({
          uniqueKey: i.unique_key,
          id: i.unique_key,
          name: i.name || '',
          filingName: i.filing_name || '',
          opSheet: i.op_sheet || '',
          branch: (i.branch && !i.branch.includes('يوتيوب') && !i.branch.includes('تجميعة')) ? i.branch : '',
          date: i.date || '',
          notesMarketing: i.notes_marketing || '',
          notesMarketingUpdatedAt: i.notes_marketing_updated_at || i.updated_at,
          notesMarketingUpdatedBy: i.notes_marketing_updated_by || '',
          editor: i.editor || '',
          notesEditors: i.notes_editors || '',
          notesEditorsUpdatedAt: i.notes_editors_updated_at || i.updated_at,
          notesEditorsUpdatedBy: i.notes_editors_updated_by || '',
          done: i.done === true,
          priority: i.priority === true,
          cancel: i.cancel === true,
          missingDetails: i.missing_details === true,
          thumbnailLink: i.thumbnail_link || '',
          time: i.time || '',
          youtubeLink: i.youtube_link || '',
          uploaded: i.uploaded === true,
          isTransfer: i.is_transfer === true,
          createdAt: i.created_at,
          updatedAt: i.updated_at
        }));
        setTagmeDbRows(prev => {
          if (prev.length === mapped.length && prev[0]?.uniqueKey === mapped[0]?.uniqueKey && prev[0]?.updatedAt === mapped[0]?.updatedAt) {
            return prev;
          }
          return mapped;
        });
      }
    } catch (e) {
      console.error('Error fetching tagme3at_26 from Supabase:', e);
    } finally {
      if (!isSilent) setIsTagmeDbLoading(false);
    }
  };

  useEffect(() => {
    if (isTagme3at || isAnalyticsTagme) {
      fetchTagmeDb();
      const intervalId = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchTagmeDb(true); // gentle 5-minute safety sync (Realtime handles instant updates)
        }
      }, 5 * 60 * 1000);
      return () => clearInterval(intervalId);
    }
  }, [activeGid, isTagme3at, isAnalyticsTagme]);

  // Realtime subscription on tagme3at_26
  useEffect(() => {

    const channel = supabase
      .channel('tagme3at_26_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tagme3at_26' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newItem = {
              uniqueKey: payload.new.unique_key,
              id: payload.new.unique_key,
              name: payload.new.name || '',
              filingName: payload.new.filing_name || '',
              opSheet: payload.new.op_sheet || '',
              branch: (payload.new.branch && !payload.new.branch.includes('يوتيوب') && !payload.new.branch.includes('تجميعة')) ? payload.new.branch : '',
              date: payload.new.date || '',
              notesMarketing: payload.new.notes_marketing || '',
              notesMarketingUpdatedAt: payload.new.notes_marketing_updated_at || payload.new.updated_at,
              notesMarketingUpdatedBy: payload.new.notes_marketing_updated_by || '',
              editor: payload.new.editor || '',
              notesEditors: payload.new.notes_editors || '',
              notesEditorsUpdatedAt: payload.new.notes_editors_updated_at || payload.new.updated_at,
              notesEditorsUpdatedBy: payload.new.notes_editors_updated_by || '',
              done: payload.new.done === true,
              priority: payload.new.priority === true,
              cancel: payload.new.cancel === true,
              missingDetails: payload.new.missing_details === true,
              thumbnailLink: payload.new.thumbnail_link || '',
              time: payload.new.time || '',
              youtubeLink: payload.new.youtube_link || '',
              uploaded: payload.new.uploaded === true,
              isTransfer: payload.new.is_transfer === true,
              createdAt: payload.new.created_at,
              updatedAt: payload.new.updated_at
            };
            setTagmeDbRows(prev => [newItem, ...prev.filter(x => x.uniqueKey !== newItem.uniqueKey)]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = {
              uniqueKey: payload.new.unique_key,
              id: payload.new.unique_key,
              name: payload.new.name || '',
              filingName: payload.new.filing_name || '',
              opSheet: payload.new.op_sheet || '',
              branch: (payload.new.branch && !payload.new.branch.includes('يوتيوب') && !payload.new.branch.includes('تجميعة')) ? payload.new.branch : '',
              date: payload.new.date || '',
              notesMarketing: payload.new.notes_marketing || '',
              notesMarketingUpdatedAt: payload.new.notes_marketing_updated_at || payload.new.updated_at,
              notesMarketingUpdatedBy: payload.new.notes_marketing_updated_by || '',
              editor: payload.new.editor || '',
              notesEditors: payload.new.notes_editors || '',
              notesEditorsUpdatedAt: payload.new.notes_editors_updated_at || payload.new.updated_at,
              notesEditorsUpdatedBy: payload.new.notes_editors_updated_by || '',
              done: payload.new.done === true,
              priority: payload.new.priority === true,
              cancel: payload.new.cancel === true,
              missingDetails: payload.new.missing_details === true,
              thumbnailLink: payload.new.thumbnail_link || '',
              time: payload.new.time || '',
              youtubeLink: payload.new.youtube_link || '',
              uploaded: payload.new.uploaded === true,
              isTransfer: payload.new.is_transfer === true,
              createdAt: payload.new.created_at,
              updatedAt: payload.new.updated_at
            };
            setTagmeDbRows(prev => prev.map(x => x.uniqueKey === updated.uniqueKey ? updated : x));
            setTaskStatuses(prev => ({
              ...prev,
              [updated.uniqueKey]: { done: updated.done, cancel: updated.cancel, updatedAt: updated.updatedAt }
            }));
            setTaskPriorities(prev => ({
              ...prev,
              [updated.uniqueKey]: updated.priority
            }));
          } else if (payload.eventType === 'DELETE') {
            const delKey = payload.old?.unique_key;
            if (delKey) {
              setTagmeDbRows(prev => prev.filter(x => x.uniqueKey !== delKey));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDemo]);

  // Helper for direct Supabase updates
  const updateTagme3atDbField = async (itemKey: string, field: string, value: any, customTimestamp?: string, customAuthor?: string) => {
    const dbFieldMap: Record<string, string> = {
      editor: 'editor',
      notesMarketing: 'notes_marketing',
      notesEditors: 'notes_editors',
      done: 'done',
      priority: 'priority',
      cancel: 'cancel',
      missingDetails: 'missing_details',
      missing_details: 'missing_details',
      uploaded: 'uploaded',
      thumbnailLink: 'thumbnail_link',
      youtubeLink: 'youtube_link',
      time: 'time',
      name: 'name',
      opSheet: 'op_sheet',
      branch: 'branch',
      date: 'date'
    };

    const col = dbFieldMap[field] || field;
    const nowIso = customTimestamp || new Date().toISOString();
    const currentUser = customAuthor || profile?.name || localStorage.getItem('user_editor_name') || 'مستخدم';
    const cleanKey = String(itemKey || '').replace(/^tgm-/, '').trim().toLowerCase();

    // Optimistic UI update
    setTagmeDbRows(prev => prev.map(item => {
      const itemK = String(item.uniqueKey || item.id || '').replace(/^tgm-/, '').trim().toLowerCase();
      if (itemK === cleanKey || item.uniqueKey === itemKey || item.id === itemKey || item.name === itemKey) {
        const next = { ...item, [field]: value, updatedAt: nowIso };
        if (field === 'done' && value) {
          next.doneUpdatedAt = nowIso;
        }
        if (field === 'missing_details' || field === 'missingDetails' || field === 'cancel') {
          next.missing_details = value;
          next.missingDetails = value;
          next.cancel = value;
        }
        if (field === 'notesMarketing') {
          next.notesMarketingUpdatedAt = nowIso;
          next.notesMarketingUpdatedBy = currentUser;
        }
        if (field === 'notesEditors') {
          next.notesEditorsUpdatedAt = nowIso;
          next.notesEditorsUpdatedBy = currentUser;
        }
        return next;
      }
      return item;
    }));

    try {
      const updatePayload: any = {
        [col]: value,
        updated_at: nowIso
      };
      if (field === 'missing_details' || field === 'missingDetails' || field === 'cancel') {
        updatePayload.missing_details = value;
        updatePayload.cancel = value;
      }
      if (field === 'notesMarketing') {
        updatePayload.notes_marketing_updated_at = nowIso;
        updatePayload.notes_marketing_updated_by = currentUser;
      }
      if (field === 'notesEditors') {
        updatePayload.notes_editors_updated_at = nowIso;
        updatePayload.notes_editors_updated_by = currentUser;
      }

      const targetKeys = [
        itemKey,
        itemKey.startsWith('tgm-') ? itemKey : `tgm-${itemKey}`,
        itemKey.replace(/^tgm-/, '')
      ].filter(Boolean);

      const { data: updatedRows, error } = await supabase
        .from('tagme3at_26')
        .update(updatePayload)
        .in('unique_key', targetKeys)
        .select();

      if (error) {
        console.error('Error updating tagme3at_26 in Supabase:', error);
      } else if (!updatedRows || updatedRows.length === 0) {
        await supabase
          .from('tagme3at_26')
          .update(updatePayload)
          .eq('name', itemKey);
      }

      if (field === 'done' || field === 'cancel' || field === 'missingDetails' || field === 'missing_details') {
        notifyCoreCountsChanged(['1535230545']);
      }
    } catch (err) {
      console.error('Exception updating tagme3at_26 in Supabase:', err);
    }
  };

  // ─── Direct Supabase Database for Stage Sheets (stage_j4_26 -> stage_s3_26) ─────
  const [stageDbRows, setStageDbRows] = useState<any[]>([]);
  const [isStageDbLoading, setIsStageDbLoading] = useState(false);
  const [stageUncompletedCounts, setStageUncompletedCounts] = useState<Record<string, number>>(() => {
    try {
      const cached = localStorage.getItem('stage_uncompleted_counts_cache_v1');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const [stageInProgressCounts, setStageInProgressCounts] = useState<Record<string, number>>(() => {
    try {
      const cached = localStorage.getItem('stage_inprogress_counts_cache_v1');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const [stageMissingDetailsCounts, setStageMissingDetailsCounts] = useState<Record<string, number>>(() => {
    try {
      const cached = localStorage.getItem('stage_missing_counts_cache_v1');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const lastStageUpdatedAtRef = useRef<Record<string, string>>({});

  // ─── Today's Studio Calendar Scheduled Scripts Count (Updates automatically every day) ──
  const [todayCalendarScriptsCount, setTodayCalendarScriptsCount] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('studio_calendar_sessions_cache');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const now = new Date();
          const y = now.getFullYear();
          const m = String(now.getMonth() + 1).padStart(2, '0');
          const d = String(now.getDate()).padStart(2, '0');
          const todayStr = `${y}-${m}-${d}`;
          let sum = 0;
          parsed.forEach((s: any) => {
            if (s.date === todayStr && s.status !== 'cancelled') {
              sum += 1;
            }
          });
          return sum;
        }
      }
    } catch {}
    return 0;
  });

  useEffect(() => {
    let isCancelled = false;
    const computeCount = (list: any[]) => {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const todayStr = `${y}-${m}-${d}`;
      let sum = 0;
      list.forEach((s: any) => {
        const sDate = s.date || '';
        const status = s.status || '';
        if (sDate === todayStr && status !== 'cancelled') {
          sum += 1;
        }
      });
      return sum;
    };

    const fetchTodayCalendar = async () => {
      try {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;
        const { data, error } = await supabase
          .from('marketing_studio_calendar')
          .select('date, task_codes, status')
          .eq('date', todayStr);

        if (!error && data && !isCancelled) {
          const count = computeCount(data);
          setTodayCalendarScriptsCount(count);
        }
      } catch (err) {
        console.error('Error fetching today calendar count:', err);
      }
    };

    fetchTodayCalendar();

    const channel = supabase
      .channel('calendar-sidebar-today-badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'marketing_studio_calendar' },
        () => {
          fetchTodayCalendar();
        }
      )
      .subscribe();

    const rolloverTimer = setInterval(() => {
      fetchTodayCalendar();
    }, 10 * 60 * 1000); // 10-minute rollover check

    return () => {
      isCancelled = true;
      supabase.removeChannel(channel);
      clearInterval(rolloverTimer);
    };
  }, []);

  const stageTable = STAGE_TABLE_MAP[activeGid];
  const isStageTab = !!stageTable;

  const fetchStageDb = async (gid: string, isSilent = false) => {
    const tbl = STAGE_TABLE_MAP[gid];
    if (!tbl) return;
    if (!isSilent) setIsStageDbLoading(true);
    try {
      // Smart Delta: If silent poll, check latest updated_at to avoid re-downloading entire table if unchanged
      if (isSilent && lastStageUpdatedAtRef.current[gid]) {
        const { data: check } = await supabase
          .from(tbl)
          .select('updated_at')
          .order('updated_at', { ascending: false })
          .limit(1);
        const latest = check?.[0]?.updated_at;
        if (latest && latest === lastStageUpdatedAtRef.current[gid]) {
          return;
        }
      }

      const { data, error } = await supabase
        .from(tbl)
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      if (data) {
        if (data.length > 0) {
          const maxUp = data.reduce((max, r) => (r.updated_at > max ? r.updated_at : max), data[0].updated_at || '');
          lastStageUpdatedAtRef.current[gid] = maxUp;
        }
        const mapped = data.map((i: any) => {
          const uKey = i.unique_key || (i.id ? String(i.id) : '');
          return {
            uniqueKey: uKey,
            id: uKey,
            dbId: i.id,
            week: i.week || '',
            date: i.date || '',
            name: i.name || '',
            filingName: i.filing_name || '',
            subject: i.subject || '',
            branch: i.branch || '',
            opSheet: i.op_sheet || '',
            isTagme3a: i.is_tagme3a === true,
            delivered: i.delivered === true,
            thumbnailLink: i.thumbnail_link || '',
            time: i.time || '',
            youtubeLink: i.youtube_link || '',
            uploaded: i.uploaded === true,
            createdAt: i.created_at,
            updatedAt: i.updated_at
          };
        });
        setStageDbRows(prev => {
          if (
            prev.length === mapped.length &&
            prev.every((p, idx) => {
              const m = mapped[idx];
              return (
                m &&
                p.uniqueKey === m.uniqueKey &&
                p.updatedAt === m.updatedAt &&
                p.delivered === m.delivered &&
                p.uploaded === m.uploaded &&
                p.time === m.time &&
                p.thumbnailLink === m.thumbnailLink &&
                p.youtubeLink === m.youtubeLink &&
                p.week === m.week &&
                p.date === m.date &&
                p.filingName === m.filingName &&
                p.subject === m.subject
              );
            })
          ) {
            return prev;
          }
          return mapped;
        });
      }
    } catch (e) {
      console.error(`Error fetching ${tbl} from Supabase:`, e);
    } finally {
      if (!isSilent) setIsStageDbLoading(false);
    }
  };

  // Group stages by educational year / category
  const STAGE_YEAR_GROUPS: Record<string, string[]> = useMemo(() => ({
    // الثانوية العامة
    '1640460225': ['1640460225', '595027661', '286303232'],
    '595027661': ['1640460225', '595027661', '286303232'],
    '286303232': ['1640460225', '595027661', '286303232'],
    // المرحلة الإعدادية
    '458352282': ['458352282', '2113852114', '2089699920'],
    '2113852114': ['458352282', '2113852114', '2089699920'],
    '2089699920': ['458352282', '2113852114', '2089699920'],
    // المرحلة الابتدائية
    '497207661': ['497207661', '96752860', '346788121'],
    '96752860': ['497207661', '96752860', '346788121'],
    '346788121': ['497207661', '96752860', '346788121'],
    // الريلز
    '1939073164': ['1939073164', '0'],
    '0': ['1939073164', '0'],
    // التجميعات
    '1535230545': ['1535230545']
  }), []);

  const TABLE_TO_GID_MAP: Record<string, string> = useMemo(() => ({
    ...Object.fromEntries(Object.entries(STAGE_TABLE_MAP).map(([gid, tbl]) => [tbl, gid])),
    'reels_ve_26': '1939073164',
    'reels_cuts_26': '0',
    'tagme3at_26': '1535230545'
  }), []);

  // Fetch uncompleted count ONLY for specific gids on-demand (never all 12 tables at once)
  const fetchCountsForGids = useCallback(async (gids: string[]) => {
    if (isDemo || !gids || gids.length === 0) return;
    try {
      const promises = gids.map(async (gid) => {
        try {
          const tbl = STAGE_TABLE_MAP[gid];
          if (tbl) {
            const { data, error } = await supabase
              .from(tbl)
              .select('delivered, is_tagme3a');
            if (error || !data) return { gid, pending: 0, inProgress: 0, missing: 0 };
            const pending = data.filter(r => r.delivered !== true && r.is_tagme3a !== true).length;
            return { gid, pending, inProgress: 0, missing: 0 };
          }
          if (gid === '1939073164') {
            // For Ve: query done, canceled, missing_details, editor_col
            const { data, error } = await supabase
              .from('reels_ve_26')
              .select('done, canceled, missing_details, editor_col');
            if (error || !data) return { gid, pending: 0, inProgress: 0, missing: 0 };
            const active = data.filter(r => !r.done && !r.canceled);
            const missing = active.filter(r => r.missing_details === true).length;
            const nonProblem = active.filter(r => r.missing_details !== true);
            const inProgress = nonProblem.filter(r => isAssignedEditor(r.editor_col)).length;
            const pending = nonProblem.filter(r => !isAssignedEditor(r.editor_col)).length;
            return { gid, pending, inProgress, missing };
          }
          if (gid === '0') {
            // For CUTS: query done, canceled, missing_details, problem, editor
            const { data, error } = await supabase
              .from('reels_cuts_26')
              .select('done, canceled, missing_details, problem, editor');
            if (error || !data) return { gid, pending: 0, inProgress: 0, missing: 0 };
            const active = data.filter(r => !r.done && !r.canceled);
            const missing = active.filter(r => r.missing_details === true || r.problem === true).length;
            const nonProblem = active.filter(r => r.missing_details !== true && r.problem !== true);
            const inProgress = nonProblem.filter(r => isAssignedEditor(r.editor)).length;
            const pending = nonProblem.filter(r => !isAssignedEditor(r.editor)).length;
            return { gid, pending, inProgress, missing };
          }
          if (gid === '1535230545') {
            const { data, error } = await supabase
              .from('tagme3at_26')
              .select('done, cancel, missing_details, editor');
            if (error || !data) return { gid, pending: 0, inProgress: 0, missing: 0 };
            const active = data.filter(r => !r.done);
            const missing = active.filter(r => r.missing_details === true || r.cancel === true).length;
            const nonProblem = active.filter(r => r.missing_details !== true && r.cancel !== true);
            const inProgress = nonProblem.filter(r => isAssignedEditor(r.editor)).length;
            const pending = nonProblem.filter(r => !isAssignedEditor(r.editor)).length;
            return { gid, pending, inProgress, missing };
          }
        } catch {
          return { gid, pending: 0, inProgress: 0, missing: 0 };
        }
        return { gid, pending: 0, inProgress: 0, missing: 0 };
      });

      const results = await Promise.all(promises);
      const updatePendingMap: Record<string, number> = {};
      const updateInProgressMap: Record<string, number> = {};
      const updateMissingMap: Record<string, number> = {};
      results.forEach((res) => {
        if (res && res.gid) {
          updatePendingMap[res.gid] = res.pending;
          updateInProgressMap[res.gid] = res.inProgress || 0;
          updateMissingMap[res.gid] = res.missing;
        }
      });
      setStageUncompletedCounts(prev => {
        const next = { ...prev, ...updatePendingMap };
        try { localStorage.setItem('stage_uncompleted_counts_cache_v1', JSON.stringify(next)); } catch {}
        return next;
      });
      setStageInProgressCounts(prev => {
        const next = { ...prev, ...updateInProgressMap };
        try { localStorage.setItem('stage_inprogress_counts_cache_v1', JSON.stringify(next)); } catch {}
        return next;
      });
      setStageMissingDetailsCounts(prev => {
        const next = { ...prev, ...updateMissingMap };
        try { localStorage.setItem('stage_missing_counts_cache_v1', JSON.stringify(next)); } catch {}
        return next;
      });
    } catch (err) {
      console.error('Error fetching stage uncompleted counts for gids:', err);
    }
  }, [isDemo]);

  const notifyCoreCountsChanged = useCallback((gids: string[]) => {
    if (!gids || gids.length === 0) return;
    fetchCountsForGids(gids);
    if (globalChannelRef.current) {
      globalChannelRef.current.send({
        type: 'broadcast',
        event: 'core_counts_updated',
        payload: { gids }
      }).catch(() => {});
    }
  }, [fetchCountsForGids]);

  // Keep uncompleted count for active stage in sync with stageDbRows immediately in-memory
  useEffect(() => {
    if (isStageTab && activeGid && STAGE_TABLE_MAP[activeGid]) {
      const count = stageDbRows.filter(r => {
        const isDelivered = r.delivered === true || r.received === true || r.check2 === true;
        const isTagme = r.isTagme3a === true || r.is_tagme3a === true;
        return !isDelivered && !isTagme;
      }).length;
      setStageUncompletedCounts(prev => {
        if (prev[activeGid] === count) return prev;
        const next = { ...prev, [activeGid]: count };
        try { localStorage.setItem('stage_uncompleted_counts_cache_v1', JSON.stringify(next)); } catch {}
        return next;
      });
    }
  }, [stageDbRows, isStageTab, activeGid]);

  // Keep uncompleted count, in-progress count, and missing details count for Tagme3at stage in sync with tagmeDbRows immediately in-memory
  useEffect(() => {
    if (tagmeDbRows.length > 0 || activeGid === '1535230545') {
      const active = tagmeDbRows.filter(r => r.done !== true);
      const missingCount = active.filter(r => r.missingDetails === true || r.missing_details === true || r.cancel === true).length;
      const nonProblem = active.filter(r => r.missingDetails !== true && r.missing_details !== true && r.cancel !== true);
      const inProgressCount = nonProblem.filter(r => isAssignedEditor(r.editor)).length;
      const pendingCount = nonProblem.filter(r => !isAssignedEditor(r.editor)).length;

      setStageUncompletedCounts(prev => {
        if (prev['1535230545'] === pendingCount) return prev;
        const next = { ...prev, ['1535230545']: pendingCount };
        try { localStorage.setItem('stage_uncompleted_counts_cache_v1', JSON.stringify(next)); } catch {}
        return next;
      });
      setStageInProgressCounts(prev => {
        if (prev['1535230545'] === inProgressCount) return prev;
        const next = { ...prev, ['1535230545']: inProgressCount };
        try { localStorage.setItem('stage_inprogress_counts_cache_v1', JSON.stringify(next)); } catch {}
        return next;
      });
      setStageMissingDetailsCounts(prev => {
        if (prev['1535230545'] === missingCount) return prev;
        const next = { ...prev, ['1535230545']: missingCount };
        try { localStorage.setItem('stage_missing_counts_cache_v1', JSON.stringify(next)); } catch {}
        return next;
      });
    }
  }, [tagmeDbRows, activeGid]);

  // Bulletproof Auto-reconcile: Ensures ANY reel filmed in Shooting is guaranteed to exist in Ve table without ever overwriting VE data
  const reconcileShootingToVe = useCallback(async () => {
    if (isDemo) return;
    try {
      const { data: filmedShooting, error: sErr } = await supabase
        .from('reels_shooting_26')
        .select('*')
        .eq('filmed', true);

      if (sErr || !filmedShooting || filmedShooting.length === 0) return;

      const { data: existingVe, error: veErr } = await supabase
        .from('reels_ve_26')
        .select('code');

      // CRITICAL GUARD: If reels_ve_26 fetch fails or returns null, abort immediately to never treat null as empty set!
      if (veErr || !existingVe) {
        console.warn('[Auto-Reconcile] Skipped: could not verify reels_ve_26 safely:', veErr);
        return;
      }

      const veCodeSet = new Set((existingVe || []).map(r => String(r.code || '').trim().toLowerCase()));
      const missingFromVe = filmedShooting.filter(r => !veCodeSet.has(String(r.code || '').trim().toLowerCase()));

      if (missingFromVe.length > 0) {
        const toUpsert = missingFromVe.map(item => ({
          code: String(item.code || '').trim(),
          date: item.date || new Date().toISOString().split('T')[0],
          branch: item.branch || '',
          year: item.year || '',
          teacher: item.teacher || '',
          extra_name: item.extra_name || item.extraName || '',
          script: item.script || '',
          type: item.type || '',
          format: item.format || '',
          filmed: true,
          filming_date: item.filming_date || new Date().toLocaleDateString('en-US'),
          by: item.by || '',
          storage: item.storage || '',
          notes: item.notes || '',
          drive_raw: item.drive_raw || '',
          editor_col: 'غير محدد',
          done: false,
          drive_final: '',
          canceled: false,
          missing_details: false,
          updated_at: new Date().toISOString()
        }));

        // ignoreDuplicates: true guarantees that existing VE records are NEVER overwritten
        await supabase.from('reels_ve_26').upsert(toUpsert, { onConflict: 'code', ignoreDuplicates: true });
        notifyCoreCountsChanged(['1939073164']);
      }
    } catch (err) {
      console.warn('[Auto-Reconcile] Error syncing shooting to ve:', err);
    }
  }, [isDemo, notifyCoreCountsChanged]);

  // Core tabs + all stages that ALWAYS load their counts on startup and stay updated
  const ALL_BADGE_GIDS = useMemo(() => [
    '1535230545', '1939073164', '0',
    '497207661', '96752860', '346788121',
    '458352282', '2113852114', '2089699920',
    '1640460225', '595027661', '286303232'
  ], []);

  // 1. Initial startup sync: pull counts for all tabs ONCE on startup + reconcile filmed reels
  useEffect(() => {
    if (isDemo) return;
    fetchCountsForGids(ALL_BADGE_GIDS);
    reconcileShootingToVe();
  }, [isDemo, fetchCountsForGids, ALL_BADGE_GIDS, reconcileShootingToVe]);

  // 2. On-demand: when user clicks/switches to any specific stage tab, ONLY refresh that single stage
  useEffect(() => {
    if (isDemo || !activeGid || !STAGE_WITH_BADGE_MAP[activeGid]) return;
    fetchCountsForGids([activeGid]);
    if (activeGid === '1436746012' || activeGid === '1939073164') {
      const t = setTimeout(() => {
        reconcileShootingToVe();
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [activeGid, isDemo, fetchCountsForGids, reconcileShootingToVe]);

  // 3. Dedicated Realtime subscription for the 3 Core Tabs (reels_ve_26, reels_cuts_26, tagme3at_26) + reels_shooting_26
  useEffect(() => {
    if (isDemo) return;

    const coreChannel = supabase
      .channel(`core_badges_realtime_${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reels_shooting_26' }, (payload: any) => {
        if (payload.new && (payload.new.filmed === true || payload.new.filmed === 'TRUE')) {
          reconcileShootingToVe();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reels_ve_26' }, () => {
        fetchCountsForGids(['1939073164']);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reels_cuts_26' }, () => {
        fetchCountsForGids(['0']);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tagme3at_26' }, () => {
        fetchCountsForGids(['1535230545']);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(coreChannel);
    };
  }, [isDemo, fetchCountsForGids, reconcileShootingToVe]);

  // Reward celebration toast when all tasks in CUTS, Ve, or تجميعات are completed (transitions >0 down to 0)
  const prevStageCountsRef = useRef<Record<string, number>>({});
  useEffect(() => {
    const prev = prevStageCountsRef.current;
    const current = stageUncompletedCounts;
    const currentProg = stageInProgressCounts;
    const currentMiss = stageMissingDetailsCounts;

    const monitoredStages: Record<string, string> = {
      '0': 'CUTS',
      '1939073164': 'Ve',
      '1535230545': 'تجميعات'
    };

    Object.entries(monitoredStages).forEach(([gid, stageName]) => {
      const prevTotal = prev[gid];
      const curTotal = (current[gid] || 0) + (currentProg[gid] || 0) + (currentMiss[gid] || 0);
      if (typeof prevTotal === 'number' && prevTotal > 0 && curTotal === 0) {
        toast.success(`🎉 عاش يا وحش! اكتملت كل مهام (${stageName}) بنجاح وتحولت للدائرة الخضراء! 🚀✨`, {
          id: `done-reward-${gid}`
        });
      }
      prevStageCountsRef.current[gid] = curTotal;
    });
  }, [stageUncompletedCounts, stageInProgressCounts, stageMissingDetailsCounts, toast]);

  // Background periodic auto-refresh for OP 26/27 tasks every 15 minutes
  useEffect(() => {
    if (isDemo) return;
    const THIRTY_MINS = 30 * 60 * 1000;
    const op27Interval = setInterval(() => {
      fetch('/api/sync-op27', { method: 'POST' }).catch(() => {});
    }, THIRTY_MINS);

    return () => clearInterval(op27Interval);
  }, [isDemo]);

  useEffect(() => {
    if (isStageTab) {
      fetchStageDb(activeGid);
      const intervalId = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchStageDb(activeGid, true); // gentle 5-minute safety sync (Realtime handles instant updates)
        }
      }, 5 * 60 * 1000);
      return () => clearInterval(intervalId);
    }
  }, [activeGid, isStageTab]);

  // Realtime subscription on active stage table
  useEffect(() => {
    if (!isStageTab) return;
    const tbl = STAGE_TABLE_MAP[activeGid];
    if (!tbl) return;

    const channel = supabase
      .channel(`${tbl}_realtime`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tbl },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newItem = {
              uniqueKey: payload.new.unique_key,
              id: payload.new.unique_key,
              week: payload.new.week || '',
              date: payload.new.date || '',
              name: payload.new.name || '',
              filingName: payload.new.filing_name || '',
              subject: payload.new.subject || '',
              branch: payload.new.branch || '',
              opSheet: payload.new.op_sheet || '',
              isTagme3a: payload.new.is_tagme3a === true,
              delivered: payload.new.delivered === true,
              thumbnailLink: payload.new.thumbnail_link || '',
              time: payload.new.time || '',
              youtubeLink: payload.new.youtube_link || '',
              uploaded: payload.new.uploaded === true,
              createdAt: payload.new.created_at,
              updatedAt: payload.new.updated_at
            };
            setStageDbRows(prev => [newItem, ...prev.filter(x => x.uniqueKey !== newItem.uniqueKey)]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = {
              uniqueKey: payload.new.unique_key,
              id: payload.new.unique_key,
              week: payload.new.week || '',
              date: payload.new.date || '',
              name: payload.new.name || '',
              filingName: payload.new.filing_name || '',
              subject: payload.new.subject || '',
              branch: payload.new.branch || '',
              opSheet: payload.new.op_sheet || '',
              isTagme3a: payload.new.is_tagme3a === true,
              delivered: payload.new.delivered === true,
              thumbnailLink: payload.new.thumbnail_link || '',
              time: payload.new.time || '',
              youtubeLink: payload.new.youtube_link || '',
              uploaded: payload.new.uploaded === true,
              createdAt: payload.new.created_at,
              updatedAt: payload.new.updated_at
            };
            setStageDbRows(prev => prev.map(x => x.uniqueKey === updated.uniqueKey ? updated : x));
          } else if (payload.eventType === 'DELETE') {
            const delKey = payload.old?.unique_key;
            if (delKey) {
              setStageDbRows(prev => prev.filter(x => x.uniqueKey !== delKey));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDemo, activeGid, isStageTab]);

  const updateStageDbField = async (gid: string, itemKey: string, field: string, value: any) => {
    const tbl = STAGE_TABLE_MAP[gid];
    if (!tbl) return;

    const dbFieldMap: Record<string, string> = {
      week: 'week',
      date: 'date',
      name: 'name',
      filingName: 'filing_name',
      subject: 'subject',
      branch: 'branch',
      opSheet: 'op_sheet',
      isTagme3a: 'is_tagme3a',
      delivered: 'delivered',
      thumbnailLink: 'thumbnail_link',
      time: 'time',
      youtubeLink: 'youtube_link',
      uploaded: 'uploaded'
    };

    const col = dbFieldMap[field] || field;
    const nowIso = new Date().toISOString();

    // Optimistic UI update
    setStageDbRows(prev => prev.map(item => {
      if (item.uniqueKey === itemKey || item.id === itemKey || (item.dbId && String(item.dbId) === String(itemKey))) {
        return { ...item, [field]: value, updatedAt: nowIso };
      }
      return item;
    }));

    try {
      const foundItem = stageDbRows.find(item => item.uniqueKey === itemKey || item.id === itemKey || (item.dbId && String(item.dbId) === String(itemKey)));
      const dbKey = foundItem?.uniqueKey || itemKey;

      let query = supabase.from(tbl).update({
        [col]: value,
        updated_at: nowIso
      });

      if (foundItem?.uniqueKey) {
        query = query.or(`unique_key.eq.${foundItem.uniqueKey},unique_key.eq.${itemKey}`);
      } else {
        query = query.or(`unique_key.eq.${itemKey},id.eq.${Number(itemKey) || -1}`);
      }

      const { error } = await query;
      if (error) {
        console.error(`Error updating ${tbl} in Supabase:`, error);
      } else {
        if (globalChannelRef.current && profile?.name) {
          globalChannelRef.current.send({
            type: 'broadcast',
            event: 'update',
            payload: {
              itemKey,
              taskName: foundItem?.name || itemKey,
              message: `تم تحديث ${field}`,
              type: 'stage_update',
              from: profile.name,
              field,
              updatedItem: { uniqueKey: dbKey, [field]: value, updatedAt: nowIso }
            }
          });
        }
      }
    } catch (err) {
      console.error(`Exception updating ${tbl} in Supabase:`, err);
    }
  };

  const handleDeleteStageRow = async (item: any) => {
    const itemKey = item.uniqueKey || item.id;
    const itemName = item.name || 'هذا الدرس';
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف هذا الدرس نهائياً من المرحلة؟\n\n"${itemName}"`)) {
      return;
    }

    const tbl = STAGE_TABLE_MAP[activeGid];
    if (!tbl || !itemKey) return;

    // Optimistic UI update
    setStageDbRows(prev => prev.filter(r => (r.uniqueKey || r.id) !== itemKey));

    if (!isDemo) {
      try {
        const { error } = await supabase.from(tbl).delete().or(`unique_key.eq.${itemKey},id.eq.${Number(itemKey) || -1}`);
        if (error) {
          console.error(`Error deleting from ${tbl} in Supabase:`, error);
        }
      } catch (err) {
        console.error(`Exception deleting from ${tbl} in Supabase:`, err);
      }
    }

    // Clean from youtubeItems if present
    setYoutubeItems(prev => {
      const list = prev[activeGid] || [];
      const updated = list.filter((i: any) => (i.uniqueKey || i.id) !== itemKey);
      const map = { ...prev, [activeGid]: updated };
      try { localStorage.setItem('youtube_transfers', JSON.stringify(map)); } catch (e) {}
      return map;
    });

    toast.success('🗑️ تم حذف الدرس من المرحلة بنجاح');
  };

  // ─── Direct Supabase Database for Reels Sheets (reels_shooting_26, reels_ve_26, reels_cuts_26) ─────
  const REELS_TABLE_MAP: Record<string, string> = {
    '1436746012': 'reels_shooting_26',
    '1939073164': 'reels_ve_26',
    '0': 'reels_cuts_26',
  };

  const [reelsDbByGid, setReelsDbByGid] = useState<Record<string, any[]>>(() => {
    try {
      const cached = localStorage.getItem('reels_db_cache_v2');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const reelsDbRows = useMemo(() => reelsDbByGid[activeGid] || [], [reelsDbByGid, activeGid]);

  const setReelsDbRows = useCallback((updater: any) => {
    setReelsDbByGid(prev => {
      const cur = prev[activeGid] || [];
      const next = typeof updater === 'function' ? updater(cur) : updater;
      const updated = { ...prev, [activeGid]: next };
      try {
        localStorage.setItem('reels_db_cache_v2', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [activeGid]);

  const [isReelsDbLoading, setIsReelsDbLoading] = useState(false);
  const lastReelsUpdatedAtRef = useRef<Record<string, string>>((() => {
    try {
      const cached = localStorage.getItem('reels_db_updated_at_cache_v2');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  })());

  const reelsTable = REELS_TABLE_MAP[activeGid];
  const isReelsTableTab = !!reelsTable;

  // Keep uncompleted count, in-progress count, and missing details count for active Reels stage (VE / CUTS) in sync with reelsDbRows immediately
  useEffect(() => {
    if ((activeGid === '1939073164' || activeGid === '0') && (reelsDbRows.length > 0 || !isReelsDbLoading)) {
      const active = reelsDbRows.filter(r => r.done !== true && r.canceled !== true);
      const isCuts = activeGid === '0';
      const missingCount = active.filter(r => r.missingDetails === true || r.missing_details === true || (isCuts && r.problem === true)).length;
      const nonProblem = active.filter(r => r.missingDetails !== true && r.missing_details !== true && !(isCuts && r.problem === true));
      const inProgressCount = nonProblem.filter(r => isAssignedEditor(r.editor || r.editorCol || r.editor_col)).length;
      const pendingCount = nonProblem.filter(r => !isAssignedEditor(r.editor || r.editorCol || r.editor_col)).length;

      setStageUncompletedCounts(prev => {
        if (prev[activeGid] === pendingCount) return prev;
        const next = { ...prev, [activeGid]: pendingCount };
        try { localStorage.setItem('stage_uncompleted_counts_cache_v1', JSON.stringify(next)); } catch {}
        return next;
      });
      setStageInProgressCounts(prev => {
        if (prev[activeGid] === inProgressCount) return prev;
        const next = { ...prev, [activeGid]: inProgressCount };
        try { localStorage.setItem('stage_inprogress_counts_cache_v1', JSON.stringify(next)); } catch {}
        return next;
      });
      setStageMissingDetailsCounts(prev => {
        if (prev[activeGid] === missingCount) return prev;
        const next = { ...prev, [activeGid]: missingCount };
        try { localStorage.setItem('stage_missing_counts_cache_v1', JSON.stringify(next)); } catch {}
        return next;
      });
    }
  }, [reelsDbRows, activeGid, isReelsDbLoading]);

  const fetchReelsDb = async (gid: string, isSilent = false) => {
    const tbl = REELS_TABLE_MAP[gid];
    if (!tbl) return;
    if (!isSilent) setIsReelsDbLoading(true);
    try {
      // Smart Delta: If silent poll, check latest updated_at to avoid re-downloading entire table if unchanged
      if (isSilent && lastReelsUpdatedAtRef.current[gid]) {
        const { data: check } = await supabase
          .from(tbl)
          .select('updated_at')
          .order('updated_at', { ascending: false })
          .limit(1);
        const latest = check?.[0]?.updated_at;
        if (latest && latest === lastReelsUpdatedAtRef.current[gid]) {
          return;
        }
      }

      const { data, error } = await supabase
        .from(tbl)
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      if (data) {
        if (data.length > 0) {
          const maxUp = data.reduce((max, r) => (r.updated_at > max ? r.updated_at : max), data[0].updated_at || '');
          lastReelsUpdatedAtRef.current[gid] = maxUp;
        }
        let mapped: any[] = [];
        if (gid === '0') {
          mapped = data.map((i: any) => ({
            id: i.code,
            code: i.code,
            date: i.date || '',
            branch: i.branch || '',
            year: i.year || '',
            typeCol: i.type_col || 'CUT',
            creator: i.creator || i.extra_name || '',
            dataFiles: i.data_files || i.drive_raw || '',
            script: i.script || '',
            type: i.type || '',
            format: i.format || '',
            creatorNotes: i.creator_notes || i.notes || '',
            editorNotes: i.editor_notes || '',
            missingDetails: i.missing_details === true,
            problem: i.problem === true,
            done: i.done === true,
            editCheck: i.edit_check === true,
            edit_check: i.edit_check === true,
            editor: i.editor || i.editor_col || '',
            driveFinal: i.drive_final || '',
            canceled: i.canceled === true,
            hardDriveStatus: i.hard_drive_status || null,
            uniqueKey: i.code,
            createdAt: i.created_at,
            updatedAt: i.updated_at
          }));
        } else {
          mapped = data.map((i: any) => ({
            id: i.code,
            code: i.code,
            date: i.date || '',
            branch: i.branch || '',
            year: i.year || '',
            teacher: i.teacher || '',
            extraName: i.extra_name || i.creator || '',
            script: i.script || '',
            type: i.type || '',
            format: i.format || '',
            filmed: i.filmed === true,
            filmingDate: i.filming_date || '',
            by: i.by || '',
            storage: i.storage || '',
            notes: i.notes || i.creator_notes || '',
            editorNotes: i.editor_notes || '',
            driveRaw: i.drive_raw || i.data_files || '',
            editorCol: i.editor_col || i.editor || '',
            done: i.done === true,
            driveFinal: i.drive_final || '',
            canceled: i.canceled === true,
            missingDetails: i.missing_details === true,
            editCheck: i.edit_check === true,
            publish: i.publish === true || i.is_published === true || i.check === true,
            sharedLink: i.shared_link || '',
            hardDriveStatus: i.hard_drive_status || null,
            uniqueKey: i.code,
            createdAt: i.created_at,
            updatedAt: i.updated_at
          }));
        }
        setReelsDbByGid(prev => {
          const next = { ...prev, [gid]: mapped };
          try {
            localStorage.setItem('reels_db_cache_v2', JSON.stringify(next));
            localStorage.setItem('reels_db_updated_at_cache_v2', JSON.stringify(lastReelsUpdatedAtRef.current));
          } catch {}
          return next;
        });
      }
    } catch (e) {
      console.error(`Error fetching ${tbl} from Supabase:`, e);
    } finally {
      if (!isSilent) setIsReelsDbLoading(false);
    }
  };

  useEffect(() => {
    if (isReelsTableTab) {
      const hasCached = (reelsDbByGid[activeGid] || []).length > 0;
      fetchReelsDb(activeGid, hasCached);
      const intervalId = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchReelsDb(activeGid, true); // gentle 5-minute safety sync (Realtime handles instant updates)
        }
      }, 5 * 60 * 1000);
      return () => clearInterval(intervalId);
    }
  }, [activeGid, isReelsTableTab]);

  // Background pre-fetch for Reels tabs (Shooting, VE, Cuts) after app mount for instant transitions
  useEffect(() => {
    if (isDemo) return;
    const prefetchTimer = setTimeout(() => {
      ['1939073164', '0', '1436746012'].forEach(gid => {
        fetchReelsDb(gid, true);
      });
    }, 100);
    return () => clearTimeout(prefetchTimer);
  }, [isDemo]);

  // Realtime subscription on active reels table
  useEffect(() => {
    if (!isReelsTableTab) return;
    const tbl = REELS_TABLE_MAP[activeGid];
    if (!tbl) return;

    const channel = supabase
      .channel(`${tbl}_realtime_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tbl },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const i = payload.new;
            let newItem: any;
            if (activeGid === '0') {
              newItem = {
                id: i.code,
                code: i.code,
                date: i.date || '',
                branch: i.branch || '',
                year: i.year || '',
                typeCol: i.type_col || 'CUT',
                creator: i.creator || '',
                dataFiles: i.data_files || '',
                script: i.script || '',
                type: i.type || '',
                format: i.format || '',
                creatorNotes: i.creator_notes || '',
                editorNotes: i.editor_notes || '',
                missingDetails: i.missing_details === true,
                problem: i.problem === true,
                done: i.done === true,
                editor: i.editor || '',
                driveFinal: i.drive_final || '',
                canceled: i.canceled === true,
                hardDriveStatus: i.hard_drive_status || null,
                uniqueKey: i.code,
                createdAt: i.created_at,
                updatedAt: i.updated_at
              };
            } else {
              newItem = {
                id: i.code,
                code: i.code,
                date: i.date || '',
                branch: i.branch || '',
                year: i.year || '',
                teacher: i.teacher || '',
                extraName: i.extra_name || '',
                script: i.script || '',
                type: i.type || '',
                format: i.format || '',
                filmed: i.filmed === true,
                filmingDate: i.filming_date || '',
                by: i.by || '',
                storage: i.storage || '',
                notes: i.notes || '',
                editorNotes: i.editor_notes || '',
                driveRaw: i.drive_raw || '',
                editorCol: i.editor_col || '',
                done: i.done === true,
                driveFinal: i.drive_final || '',
                canceled: i.canceled === true,
                missingDetails: i.missing_details === true,
                editCheck: i.edit_check === true,
                publish: i.publish === true || i.is_published === true || i.check === true,
                sharedLink: i.shared_link || '',
                hardDriveStatus: i.hard_drive_status || null,
                uniqueKey: i.code,
                createdAt: i.created_at,
                updatedAt: i.updated_at
              };
            }
            setReelsDbRows(prev => [newItem, ...prev.filter(x => x.code !== newItem.code && x.id !== newItem.id)]);
            setLiveData((prev: any[]) => Array.isArray(prev) ? [newItem, ...prev.filter((x: any) => x.code !== newItem.code && x.id !== newItem.id)] : [newItem]);
          } else if (payload.eventType === 'UPDATE') {
            const i = payload.new;
            let updated: any;
            if (activeGid === '0') {
              updated = {
                id: i.code,
                code: i.code,
                date: i.date || '',
                branch: i.branch || '',
                year: i.year || '',
                typeCol: i.type_col || 'CUT',
                creator: i.creator || '',
                dataFiles: i.data_files || '',
                script: i.script || '',
                type: i.type || '',
                format: i.format || '',
                creatorNotes: i.creator_notes || '',
                editorNotes: i.editor_notes || '',
                missingDetails: i.missing_details === true,
                problem: i.problem === true,
                done: i.done === true,
                editor: i.editor || '',
                driveFinal: i.drive_final || '',
                canceled: i.canceled === true,
                hardDriveStatus: i.hard_drive_status || null,
                uniqueKey: i.code,
                createdAt: i.created_at,
                updatedAt: i.updated_at
              };
            } else {
              updated = {
                id: i.code,
                code: i.code,
                date: i.date || '',
                branch: i.branch || '',
                year: i.year || '',
                teacher: i.teacher || '',
                extraName: i.extra_name || '',
                script: i.script || '',
                type: i.type || '',
                format: i.format || '',
                filmed: i.filmed === true,
                filmingDate: i.filming_date || '',
                by: i.by || '',
                storage: i.storage || '',
                notes: i.notes || '',
                editorNotes: i.editor_notes || '',
                driveRaw: i.drive_raw || '',
                editorCol: i.editor_col || '',
                done: i.done === true,
                driveFinal: i.drive_final || '',
                canceled: i.canceled === true,
                missingDetails: i.missing_details === true,
                editCheck: i.edit_check === true,
                publish: i.publish === true || i.is_published === true || i.check === true,
                sharedLink: i.shared_link || '',
                hardDriveStatus: i.hard_drive_status || null,
                uniqueKey: i.code,
                createdAt: i.created_at,
                updatedAt: i.updated_at
              };
            }
            setReelsDbRows(prev => prev.map(x => (x.code === updated.code || x.id === updated.code || x.uniqueKey === updated.code) ? updated : x));
            setLiveData((prev: any[]) => {
              if (!Array.isArray(prev)) return prev;
              return prev.map((x: any) => (x.code === updated.code || x.id === updated.code || x.uniqueKey === updated.code) ? updated : x);
            });
          } else if (payload.eventType === 'DELETE') {
            const delCode = payload.old?.code || payload.old?.id;
            if (delCode) {
              setReelsDbRows(prev => prev.filter(x => x.code !== delCode && x.id !== delCode));
              setLiveData((prev: any[]) => Array.isArray(prev) ? prev.filter((x: any) => x.code !== delCode && x.id !== delCode) : []);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDemo, activeGid, isReelsTableTab]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (isTagme3at || isAnalyticsTagme) {
          fetchTagmeDb(true);
        } else if (isStageTab && activeGid) {
          fetchStageDb(activeGid, true);
        } else if (isReelsTableTab && activeGid) {
          fetchReelsDb(activeGid, true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeGid, isTagme3at, isAnalyticsTagme, isStageTab, isReelsTableTab]);

  const [tagmeTransfers, setTagmeTransfers] = useState<any[]>([]);
  const [activeTagmeToast, setActiveTagmeToast] = useState<{ item: any, stage: { gid: string, label: string }, uniqueKey: string } | null>(null);
  const [activeVeToast, setActiveVeToast] = useState<{ item: any } | null>(null);

  useEffect(() => {
    if (!activeVeToast) return;
    const t = setTimeout(() => setActiveVeToast(null), 2200);
    return () => clearTimeout(t);
  }, [activeVeToast]);

  useEffect(() => {
    if (!activeTagmeToast) return;
    const t = setTimeout(() => setActiveTagmeToast(null), 2500);
    return () => clearTimeout(t);
  }, [activeTagmeToast]);

  const [noteAuthors, setNoteAuthors] = useState<Record<string, { author: string; timestamp: string }>>(() => {
    const saved = localStorage.getItem('note_authors');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  const saveNoteAuthors = async (updated: Record<string, { author: string; timestamp: string }>) => {
    localStorage.setItem('note_authors', JSON.stringify(updated));
    const token = session?.access_token || profile?.id;
    if (token) {
      try {
        await fetch('/api/task-metadata', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ field: 'note_authors', metadata: updated })
        });
      } catch (err) {
        console.error('Error saving note_authors to /api/task-metadata:', err);
      }
    }
  };

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

  const [publishedTasks, setPublishedTasks] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('published_tasks');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  const [sharedLinks, setSharedLinks] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('shared_links');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  const [localEntries, setLocalEntries] = useState<{ [gid: string]: any[] }>({});

  const combinedData = useMemo(() => {
    const currentLocal = localEntries[activeGid] || [];
    let baseList = [];
    if (isOperations) baseList = [...currentLocal, ...liveData];
    else if (isTagme3at || isAnalyticsTagme) {
      baseList = tagmeDbRows.length > 0 ? tagmeDbRows : [...currentLocal, ...tagmeTransfers, ...liveData];
    } else if (isStageTab) {
      baseList = stageDbRows.length > 0 ? stageDbRows : [...currentLocal, ...liveData];
    } else if (isReelsTableTab) {
      baseList = reelsDbRows;
    } else {
      const transfers = youtubeItems[activeGid] || [];
      baseList = [...currentLocal, ...transfers, ...liveData];
    }

    return baseList.map(item => {
      const key = item.uniqueKey || generateKey(item);
      const updated = { ...item };

      if (isStageTab) {
        if (assignedWeeks[key] !== undefined) updated.week = assignedWeeks[key];
        if (assignedDates[key] !== undefined) updated.date = assignedDates[key];
        if (assignedThumbnailLinks[key] !== undefined) updated.thumbnailLink = assignedThumbnailLinks[key];
        if (assignedTimes[key] !== undefined) updated.time = assignedTimes[key];
        if (assignedYoutubeLinks[key] !== undefined) updated.youtubeLink = assignedYoutubeLinks[key];
        if (uploadedStatuses[key] !== undefined) updated.uploaded = uploadedStatuses[key];
        return updated;
      }

      // For Tagme3at and Reels tables, Supabase is the authoritative single source of truth
      if (isTagme3at || isAnalyticsTagme || isReelsTableTab) {
        return updated;
      }

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

      // Apply cuts_overrides saved in localStorage so changes persist instantly on refresh
      try {
        const rawOverrides = localStorage.getItem('cuts_overrides');
        if (rawOverrides) {
          const overrides = JSON.parse(rawOverrides);
          const itemCode = updated.id || key;
          if (overrides[itemCode]) {
            Object.assign(updated, overrides[itemCode]);
          }
        }
      } catch {}

      return updated;
    });
  }, [liveData, youtubeItems, tagmeTransfers, localEntries, activeGid, isOperations, isTagme3at, isStageTab, isReelsTableTab, stageDbRows, tagmeDbRows, reelsDbRows, isDemo, assignedEditors, editorNotes, marketingNotes, assignedOpSheets, assignedBranches, assignedDates, assignedWeeks, assignedBunnyLinks, assignedThumbnailLinks, assignedTimes, assignedYoutubeLinks, uploadedStatuses]);

  // Keep top horizontal scrollbar's inner track width dynamically matched to the table
  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;

    updateTopScrollWidth();

    const ro = new ResizeObserver(() => {
      updateTopScrollWidth();
    });

    ro.observe(el);

    const tableEl = el.querySelector('table');
    if (tableEl) {
      ro.observe(tableEl);
    }

    return () => {
      ro.disconnect();
    };
  }, [activeGid, updateTopScrollWidth]);

  const handleUpdateWeek = (itemKey: string, val: string) => {
    setAssignedWeeks(prev => {
      const updated = { ...prev, [itemKey]: val };
      if (isStageTab) {
        updateStageDbField(activeGid, itemKey, 'week', val);
      }
      const taskName = findTaskName(itemKey);
      syncState('assigned_weeks', updated, itemKey, taskName, 'week', `🗓️ تم تعديل الأسبوع إلى: ${val || 'غير محدد'}`);
      return updated;
    });
  };

  const handleUpdateDate = (itemKey: string, val: string) => {
    setAssignedDates(prev => {
      const updated = { ...prev, [itemKey]: val };
      if (activeGid === '1535230545') {
        updateTagme3atDbField(itemKey, 'date', val);
      } else if (isStageTab) {
        updateStageDbField(activeGid, itemKey, 'date', val);
      }
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
      if (activeGid === '1535230545') {
        updateTagme3atDbField(itemKey, 'thumbnailLink', val);
      } else if (isStageTab) {
        updateStageDbField(activeGid, itemKey, 'thumbnailLink', val);
      }
      const taskName = findTaskName(itemKey);
      syncState('assigned_thumbnail_links', updated, itemKey, taskName, 'thumbnail_link', `🖼️ تم تحديث رابط الثمنيل`);
      return updated;
    });
  };

  const handleUpdateTime = (itemKey: string, val: string) => {
    setAssignedTimes(prev => {
      const updated = { ...prev, [itemKey]: val };
      if (activeGid === '1535230545') {
        updateTagme3atDbField(itemKey, 'time', val);
      } else if (isStageTab) {
        updateStageDbField(activeGid, itemKey, 'time', val);
      }
      const taskName = findTaskName(itemKey);
      syncState('assigned_times', updated, itemKey, taskName, 'time', `⏱️ تم تحديث وقت الدرس إلى: ${val}`);
      return updated;
    });
  };

  const handleUpdateYoutubeLink = (itemKey: string, val: string) => {
    setAssignedYoutubeLinks(prev => {
      const updated = { ...prev, [itemKey]: val };
      if (activeGid === '1535230545') {
        updateTagme3atDbField(itemKey, 'youtubeLink', val);
      } else if (isStageTab) {
        updateStageDbField(activeGid, itemKey, 'youtubeLink', val);
      }
      const taskName = findTaskName(itemKey);
      syncState('assigned_youtube_links', updated, itemKey, taskName, 'youtube_link', `📺 تم تحديث رابط اليوتيوب`);
      return updated;
    });
  };

  const handleUpdateUploaded = (itemKey: string, val: boolean) => {
    setUploadedStatuses(prev => {
      const updated = { ...prev, [itemKey]: val };
      if (activeGid === '1535230545') {
        updateTagme3atDbField(itemKey, 'uploaded', val);
      } else if (isStageTab) {
        updateStageDbField(activeGid, itemKey, 'uploaded', val);
      }
      const taskName = findTaskName(itemKey);
      syncState('uploaded_statuses', updated, itemKey, taskName, 'uploaded', val ? `📤 تم الرفع بنجاح` : `↩️ تم إلغاء رفع التجميعة`);
      return updated;
    });
  };

  const handleToggleDelivered = (itemKey: string, delivered: boolean) => {
    if (isStageTab) {
      updateStageDbField(activeGid, itemKey, 'delivered', delivered);
      notifyCoreCountsChanged([activeGid]);
    }
  };

  const handleTogglePublish = async (itemKey: string) => {
    const current = !!publishedTasks[itemKey];
    const next = !current;
    const updatedDict = { ...publishedTasks, [itemKey]: next };
    setPublishedTasks(updatedDict);
    localStorage.setItem('published_tasks', JSON.stringify(updatedDict));
    localStorage.setItem(`shared_check_${itemKey}`, String(next));

    await syncState('published_tasks', updatedDict, itemKey, findTaskName(itemKey), 'publish', next ? '🚀 تم تفعيل النشر (Publish)' : '↩️ تم إلغاء النشر');
  };

  const handleUpdateSharedLink = async (itemKey: string, link: string) => {
    const cleanLink = link.trim();
    const updatedDict = { ...sharedLinks, [itemKey]: cleanLink };
    setSharedLinks(updatedDict);
    localStorage.setItem('shared_links', JSON.stringify(updatedDict));
    localStorage.setItem(`shared_link_${itemKey}`, cleanLink);

    await syncState('shared_links', updatedDict, itemKey, findTaskName(itemKey), 'shared_link', `🔗 تم تحديث الرابط المشترك`);
  };

  const syncState = async (field: string, dict: any, itemKey: string, taskName: string, type: string, message: string) => {
    localStorage.setItem(field, JSON.stringify(dict));
    const token = session?.access_token || profile?.id;
    if (token) {
      if (activeGid === '1535230545' && itemKey && field !== 'tagme3at_transfers' && field !== 'youtube_transfers' && field !== 'assigned_bunny_links') {
        let dbPayload: any = {};
        if (field === 'editor_notes') dbPayload = { notes_editors: dict[itemKey] };
        else if (field === 'marketing_notes') dbPayload = { notes_marketing: dict[itemKey] };
        else if (field === 'assigned_editors') dbPayload = { editor: dict[itemKey] };
        else if (field === 'assigned_opsheets') dbPayload = { op_sheet: dict[itemKey] };
        else if (field === 'assigned_branches') dbPayload = { branch: dict[itemKey] };
        else if (field === 'assigned_dates') dbPayload = { date: dict[itemKey] };
        else if (field === 'task_statuses') dbPayload = { done: dict[itemKey]?.done === true || dict[itemKey] === 'done' };
        else if (field === 'task_priorities') dbPayload = { priority: dict[itemKey] === true };
        else if (field === 'assigned_thumbnail_links') dbPayload = { thumbnail_link: dict[itemKey] };
        else if (field === 'assigned_times') dbPayload = { time: dict[itemKey] };
        else if (field === 'assigned_youtube_links') dbPayload = { youtube_link: dict[itemKey] };
        else if (field === 'uploaded_statuses') dbPayload = { uploaded: dict[itemKey] === true };
        
        if (Object.keys(dbPayload).length > 0) {
          // 1. Direct Supabase Client update
          supabase
            .from('tagme3at_26')
            .update({ ...dbPayload, updated_at: new Date().toISOString() })
            .eq('unique_key', itemKey)
            .then(({ error }) => {
              if (error) console.error('Supabase tagme3at_26 direct update error:', error);
            });

          // 2. Also call API endpoint
          fetch('/api/tagme3at', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ uniqueKey: itemKey, updates: dbPayload })
          }).catch(e => console.error('API Tagme3at sync error:', e));
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
            if (m.note_authors) { setNoteAuthors(prev => ({ ...prev, ...m.note_authors })); localStorage.setItem('note_authors', JSON.stringify(m.note_authors)); }
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
            if (m.published_tasks) { setPublishedTasks(m.published_tasks); localStorage.setItem('published_tasks', JSON.stringify(m.published_tasks)); }
            if (m.shared_links) { setSharedLinks(m.shared_links); localStorage.setItem('shared_links', JSON.stringify(m.shared_links)); }
            if (m.tab_priority_limits) {
              setTabPriorityLimits(m.tab_priority_limits);
              localStorage.setItem('tab_priority_limits_v1', JSON.stringify(m.tab_priority_limits));
            }
            if (m.active_academic_term?.term) {
              setActiveAcademicTerm(m.active_academic_term.term);
              localStorage.setItem('active_academic_term', m.active_academic_term.term);
            }
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

  const subscribedSet = useMemo(() => {
    const s = new Set<string>();
    (subscribedTasks || []).forEach(k => {
      if (k) s.add(String(k).trim().toLowerCase());
    });
    return s;
  }, [subscribedTasks]);

  const toggleSubscribe = (itemKey: string) => {
    const taskName = findTaskName(itemKey);
    const cleanKey = String(itemKey).trim();
    const isSubscribing = !subscribedTasks.some(k => String(k).trim().toLowerCase() === cleanKey.toLowerCase());
    const next = isSubscribing 
      ? [...subscribedTasks, cleanKey] 
      : subscribedTasks.filter(k => String(k).trim().toLowerCase() !== cleanKey.toLowerCase());
      
    setSubscribedTasks(next);
    localStorage.setItem('subscribed_tasks', JSON.stringify(next));

    // Instantly inject a custom personal notification
    const notif: PersonalNotif = {
      id: String(Date.now() + Math.random()),
      taskName: taskName || cleanKey,
      message: isSubscribing 
        ? `🔔 لقد قمت بمتابعة هذه المهمة بنجاح! ستصلك تنبيهات بأي تحديثات تطرأ عليها.` 
        : `🔕 تم إلغاء متابعة المهمة بنجاح.`,
      type: isSubscribing ? 'subscribe' : 'unsubscribe',
      from: 'النظام',
      at: Date.now(),
      read: false,
    };
    setMyNotifs(prevNotifs => [notif, ...prevNotifs.filter(n => n.id !== notif.id)].slice(0, 50));
    if (isSubscribing) {
      toast.success(`🔔 تم تفعيل جرس المتابعة للمهمة: ${taskName || cleanKey}`);
    } else {
      toast.info(`🔕 تم إلغاء متابعة المهمة`);
    }
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
      pushNotification(notif);
    }).subscribe();

    // Subscribe to global channel for tasks
    const globalCh = supabase.channel('tasks:global', {
      config: { broadcast: { self: false } }
    });
    globalChannelRef.current = globalCh;

    globalCh.on('broadcast', { event: 'force_logout' }, () => {
      console.warn('[Session] Received force_logout broadcast. Clearing auth session and reloading...');
      try {
        localStorage.removeItem('local_login_profile');
        localStorage.removeItem('session_login_timestamp');
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
            localStorage.removeItem(k);
          }
        });
      } catch {}
      window.location.reload();
    });

    globalCh.on('broadcast', { event: 'core_counts_updated' }, ({ payload }: any) => {
      if (payload?.gids && Array.isArray(payload.gids)) {
        fetchCountsForGids(payload.gids);
      }
    });

    globalCh.on('broadcast', { event: 'update' }, ({ payload }: any) => {
      const { itemKey, taskName, message, type, from, field, dict, altKeys, updatedItem } = payload;
      if (!from || from.toLowerCase() === profile.name.toLowerCase()) return;
      
      if (field && dict) {
         console.log('[Sync] Received broadcast update:', field, 'from:', from);
          localStorage.setItem(field, JSON.stringify(dict));
          if (field === 'note_authors') setNoteAuthors(dict);
          else if (field === 'assigned_editors') setAssignedEditors(dict);
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
         else if (field === 'published_tasks') setPublishedTasks(dict);
         else if (field === 'shared_links') setSharedLinks(dict);
         else if (field === 'tab_priority_limits') {
           setTabPriorityLimits(dict);
           localStorage.setItem('tab_priority_limits_v1', JSON.stringify(dict));
         }
      }

      if (updatedItem) {
        const candidateKeys = [
          itemKey,
          updatedItem.code,
          updatedItem.id,
          updatedItem.uniqueKey,
          ...(altKeys || [])
        ].filter(Boolean).map(k => String(k).trim().toLowerCase());

        const isRowMatch = (r: any) => {
          if (!r) return false;
          const rKeys = [r.code, r.id, r.uniqueKey, r.script].filter(Boolean).map(k => String(k).trim().toLowerCase());
          return rKeys.some(rk => candidateKeys.includes(rk));
        };

        setReelsDbRows(prev => prev.map(r => isRowMatch(r) ? { ...r, ...updatedItem } : r));
        setTagmeDbRows(prev => prev.map(r => isRowMatch(r) ? { ...r, ...updatedItem } : r));
        setStageDbRows(prev => prev.map(r => isRowMatch(r) ? { ...r, ...updatedItem } : r));
        setLiveData((prev: any[]) => {
          if (!Array.isArray(prev)) return prev;
          return prev.map((r: any) => isRowMatch(r) ? { ...r, ...updatedItem } : r);
        });
      }

      const currentEditor = assignedEditorsRef.current[itemKey];
      
      // Robust multi-key match for subscription
      const userSubs = (subscribedTasksRef.current || []).map(k => String(k).trim().toLowerCase());
      const incomingKeys = [
        itemKey, 
        ...(altKeys || []), 
        taskName
      ].filter(Boolean).map(k => String(k).trim().toLowerCase());
      
      const isSub = incomingKeys.some(k => {
        if (!k) return false;
        const cleanK = k.replace(/^tgm-/, '').trim();
        return userSubs.some(sub => {
          const cleanSub = sub.replace(/^tgm-/, '').trim();
          return cleanSub === cleanK || cleanSub === k || sub === k || sub.includes(cleanK) || cleanK.includes(cleanSub);
        });
      }) || (currentEditor && currentEditor.toLowerCase() === profile.name.toLowerCase());

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
          message: message || 'تحديث جديد على المهمة',
          type: type || 'activity',
          from: from || 'مستخدم',
          at: Date.now(),
          read: false,
        };
        pushNotification(notif);

        // Floating toast alert for the subscriber
        if (isSub && !isManagerOrAdmin) {
          toast.info(`🔔 ${from}: ${message || 'تحديث على المهمة'}`, { duration: 6000 });
        }
      }
    }).subscribe((status: string) => {
      console.log('[Sync] WebSocket channel status:', status);
    });

    return () => {
      supabase.removeChannel(userCh);
      supabase.removeChannel(globalCh);
    };
  }, [profile?.name]);

  const lastBroadcastRef = useRef<Map<string, number>>(new Map());

  const broadcastTaskActivity = async (opts: {
    itemKey: string;
    altKeys?: string[];
    taskName?: string;
    message: string;
    type: string;
    field?: string;
    dict?: any;
    updatedItem?: any;
  }) => {
    const senderName = profile?.name || 'مستخدم';
    if (!globalChannelRef.current) return;

    // Deduplicate outgoing broadcasts: prevent notification spam for rapid edits or typing
    const broadcastKey = opts.field ? `${opts.itemKey}_${opts.field}` : `${opts.itemKey}_${opts.message}`;
    const now = Date.now();
    const lastTime = lastBroadcastRef.current.get(broadcastKey) || 0;
    const cooldown = (opts.field === 'notes' || opts.field === 'editorNotes') ? 8000 : 3000;
    if (now - lastTime < cooldown) {
      return;
    }
    lastBroadcastRef.current.set(broadcastKey, now);

    try {
      await globalChannelRef.current.send({
        type: 'broadcast',
        event: 'update',
        payload: {
          itemKey: opts.itemKey,
          altKeys: (opts.altKeys || []).filter(Boolean),
          taskName: opts.taskName || opts.itemKey,
          message: opts.message,
          type: opts.type,
          from: senderName,
          field: opts.field,
          dict: opts.dict,
          updatedItem: opts.updatedItem,
          at: now
        },
      });
    } catch (e) {
      console.error('Failed to broadcast task activity:', e);
    }
  };

  const broadcastTaskUpdate = async (itemKey: string, taskName: string, message: string, type: string) => {
    await broadcastTaskActivity({ itemKey, taskName, message, type });
  };

  function findTaskName(itemKey: string) {
    const found = combinedData.find(i => (i.uniqueKey || generateKey(i)) === itemKey || 'tgm-' + (i.uniqueKey || generateKey(i)) === itemKey);
    return found?.name || itemKey;
  }

  const handleUpdateEditor = (itemKey: string, newEditor: string) => {
    setAssignedEditors(prev => {
      const updated = { ...prev, [itemKey]: newEditor };
      if (activeGid === '1535230545') {
        updateTagme3atDbField(itemKey, 'editor', newEditor);
      }
      const taskName = findTaskName(itemKey);
      syncState('assigned_editors', updated, itemKey, taskName, 'editor', `👤 تم إسناد التجميعة للمحرر: ${newEditor}`);
      return updated;
    });
  };

  const handleUpdateEditorNotes = (itemKey: string, noteText: string, editorName?: string, customTimestamp?: string, customAuthor?: string) => {
    setEditorNotes(prev => {
      const updated = { ...prev, [itemKey]: noteText };
      if (activeGid === '1535230545') {
        updateTagme3atDbField(itemKey, 'notesEditors', noteText, customTimestamp, customAuthor);
      }
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

  const handleUpdateMarketingNotes = (itemKey: string, noteText: string, editorName?: string, customTimestamp?: string, customAuthor?: string) => {
    setMarketingNotes(prev => {
      const updated = { ...prev, [itemKey]: noteText };
      if (activeGid === '1535230545') {
        updateTagme3atDbField(itemKey, 'notesMarketing', noteText, customTimestamp, customAuthor);
      }
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
      missing_details: '⚠️ تم تحديد تفاصيل ناقصة على التجميعة',
      unmissing_details: '↩️ تم إزالة تفاصيل ناقصة عن التجميعة',
    };
    const message = msgMap[type] || `تغيير في التجميعة`;

    if (activeGid === '1535230545' || isTagme3at) {
      if (type === 'done') {
        updateTagme3atDbField(itemKey, 'done', true);
        updateTagme3atDbField(itemKey, 'priority', false);
      }
      else if (type === 'undone') updateTagme3atDbField(itemKey, 'done', false);
      else if (type === 'priority') updateTagme3atDbField(itemKey, 'priority', true);
      else if (type === 'unpriority') updateTagme3atDbField(itemKey, 'priority', false);
      else if (type === 'cancel' || type === 'missing_details') {
        updateTagme3atDbField(itemKey, 'missing_details', true);
        updateTagme3atDbField(itemKey, 'cancel', true);
      }
      else if (type === 'uncancel' || type === 'unmissing_details') {
        updateTagme3atDbField(itemKey, 'missing_details', false);
        updateTagme3atDbField(itemKey, 'cancel', false);
      }
    }

    // Audit Trail for Tagme3at actions
    if (type === 'undone') {
      recordAuditLog(profile, 'done_unmarked', itemKey, `قام بفك علامة Done عن التجميعة: ${taskName}`);
    } else if (type === 'done') {
      recordAuditLog(profile, 'done_marked', itemKey, `قام بتعليم التجميعة كمكتملة Done: ${taskName}`);
    } else if (type === 'cancel' || type === 'missing_details') {
      recordAuditLog(profile, 'canceled', itemKey, `قام بإلغاء/تحديد تفاصيل ناقصة على التجميعة: ${taskName}`);
    } else if (type === 'uncancel' || type === 'unmissing_details') {
      recordAuditLog(profile, 'restore', itemKey, `قام باستعادة التجميعة: ${taskName}`);
    }

    if (type === 'done') {
      setTaskPriorities(prev => {
        const n = { ...prev, [itemKey]: false };
        syncState('task_priorities', n, itemKey, taskName, 'unpriority', '➖ تم إزالة الأولوية القصوى عن التجميعة لاكتمالها');
        return n;
      });

      // Telegram notification for Tagme3at task completion
      getUserTelegramChatId(profile?.id, profile?.name).then(async (myChatId) => {
        if (myChatId) {
          notifyTaskCompleted({
            chatId: myChatId,
            taskTitle: taskName || 'تجميعة جديدة',
            taskCode: itemKey,
            sourceSheet: 'التجميعات (Tagme3at)',
            editorName: editorName || profile?.name || 'غير محدد',
          }).then(res => {
            if (res.ok) toast.success('✈️ تم إرسال إشعار إنجاز التجميعة إلى تليجرام!');
          }).catch(console.error);
        }

        if (editorName && editorName !== profile?.name && editorName !== 'غير محدد' && editorName !== '---') {
          const otherChatId = await getUserTelegramChatId(undefined, editorName);
          if (otherChatId && otherChatId !== myChatId) {
            notifyTaskCompleted({
              chatId: otherChatId,
              taskTitle: taskName || 'تجميعة جديدة',
              taskCode: itemKey,
              sourceSheet: 'التجميعات (Tagme3at)',
              editorName: editorName,
            }).catch(console.error);
          }
        }
      }).catch(console.error);
    }

    if (type === 'priority' || type === 'unpriority') {
       const isPri = type === 'priority';
       setTaskPriorities(prev => {
          const n = { ...prev, [itemKey]: isPri };
          syncState('task_priorities', n, itemKey, taskName, type, message);
          return n;
       });
    } else {
       setTaskStatuses(prev => {
          const current = prev[itemKey] || { done: false, cancel: false, missingDetails: false };
          let d = current.done;
          let c = current.cancel;
          let m = (current as any).missingDetails;
          if (type === 'done') d = true;
          else if (type === 'undone') d = false;
          else if (type === 'cancel' || type === 'missing_details') { c = true; m = true; }
          else if (type === 'uncancel' || type === 'unmissing_details') { c = false; m = false; }
          const n = { ...prev, [itemKey]: { done: d, cancel: c, missingDetails: m, updatedAt: new Date().toISOString() } };
          syncState('task_statuses', n, itemKey, taskName, type, message);
          return n;
       });
    }

    broadcastTaskActivity({
      itemKey,
      altKeys: [itemKey, itemKey.replace(/^tgm-/, '')],
      taskName,
      message,
      type,
      updatedItem: {
        uniqueKey: itemKey,
        done: type === 'done' ? true : type === 'undone' ? false : undefined,
        cancel: (type === 'cancel' || type === 'missing_details') ? true : (type === 'uncancel' || type === 'unmissing_details') ? false : undefined,
        missingDetails: (type === 'missing_details' || type === 'cancel') ? true : (type === 'unmissing_details' || type === 'uncancel') ? false : undefined,
        priority: type === 'priority' ? true : (type === 'unpriority' || type === 'done') ? false : undefined,
      }
    });
  };

  const handleUpdateOpSheet = (itemKey: string, val: string) => {
    setAssignedOpSheets(prev => {
      const updated = { ...prev, [itemKey]: val };
      if (activeGid === '1535230545') {
        updateTagme3atDbField(itemKey, 'opSheet', val);
      }
      const taskName = findTaskName(itemKey);
      syncState('assigned_opsheets', updated, itemKey, taskName, 'opsheet', `📂 تم تعديل المرحلة إلى: ${val || 'غير محدد'}`);
      return updated;
    });
  };

  const handleUpdateBranch = (itemKey: string, val: string) => {
    setAssignedBranches(prev => {
      const updated = { ...prev, [itemKey]: val };
      if (activeGid === '1535230545') {
        updateTagme3atDbField(itemKey, 'branch', val);
      }
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
    const sourceData = activeGid === '1535230545' ? (tagmeDbRows.length > 0 ? tagmeDbRows : liveData) : [];
    sourceData.forEach((i: any) => {
      const b = (i.branch || '').trim();
      if (b && !b.includes('يوتيوب') && !b.includes('تجميعة')) {
        set.add(b);
      }
    });
    const defaults = ['القاهرة', 'اسكندرية', 'دسوق'];
    defaults.forEach(d => set.add(d));
    return Array.from(set).sort();
  }, [liveData, tagmeDbRows, activeGid]);

  const { editors: liveEditors, creators: liveCreators } = useEditorsOptions();

  const editorsList = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(liveEditors) && liveEditors.length > 0) {
      liveEditors.forEach(e => {
        if (e && e.trim()) set.add(e.trim());
      });
    } else {
      const defaults = [
        'HASSANEN', 'ABANOUB', 'SHIHAB', 'MAGED', 'KIRO', 'MOHAMED',
        'ASHRAF', 'Basel', 'ESLAM', 'Ramaj', 'WAEL'
      ];
      defaults.forEach(d => set.add(d));
    }
    const sourceData = Array.isArray(liveData) ? liveData : [];
    sourceData.forEach((i: any) => {
      if (i.editor && i.editor !== 'محرر' && i.editor !== 'غير محدد') {
        set.add(i.editor.trim());
      }
      if (i.editorCol && i.editorCol !== 'محرر' && i.editorCol !== 'غير محدد' && i.editorCol !== '---') {
        set.add(i.editorCol.trim());
      }
    });
    return Array.from(set).sort();
  }, [liveEditors, liveData, activeGid]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [showGoogleSheetImportModal, setShowGoogleSheetImportModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', filingName: '', val: '', id: '', subject: '', extra: '', editor: '', notesMarketing: '' });
  const [shootingAddForm, setShootingAddForm] = useState({
    branch: 'Alexandria',
    year: 's3',
    teacher: 'Hossam Elashry',
    extraName: 'Ahmed',
    scriptName: '',
    scriptLink: '',
    type: 'حواري',
    format: 'REEL',
    driveRaw: ''
  });

  // ── Quick Presets (آخر الإدخالات السريعة) ──
  type ShootingQuickPreset = {
    id: string;
    branch: string;
    year: string;
    teacher: string;
    extraName: string;
    type: string;
    format: string;
  };
  const [shootingQuickPresets, setShootingQuickPresets] = useState<ShootingQuickPreset[]>(() => {
    try {
      const raw = localStorage.getItem('shooting_quick_presets_v1');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
    } catch {
      return [];
    }
  });
  const saveShootingQuickPreset = (f: { branch: string; year: string; teacher: string; extraName: string; type: string; format: string }) => {
    if (!f.teacher?.trim() || !f.year?.trim()) return;
    const key = `${f.branch}|${f.year}|${f.teacher}|${f.extraName}|${f.type}|${f.format}`.toLowerCase();
    const newPreset: ShootingQuickPreset = {
      id: key,
      branch: f.branch,
      year: f.year,
      teacher: f.teacher,
      extraName: f.extraName,
      type: f.type,
      format: f.format
    };
    setShootingQuickPresets(prev => {
      const next = [newPreset, ...prev.filter(p => p.id !== key)].slice(0, 4);
      try { localStorage.setItem('shooting_quick_presets_v1', JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const removeShootingQuickPreset = (presetId: string) => {
    setShootingQuickPresets(prev => {
      const next = prev.filter(p => p.id !== presetId);
      try { localStorage.setItem('shooting_quick_presets_v1', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // ── Google Docs Link Access Checker (Warning Only) ──
  const [docAccessStatus, setDocAccessStatus] = useState<'idle' | 'checking' | 'public' | 'restricted'>('idle');
  const [docAutoTitle, setDocAutoTitle] = useState<string>('');

  // ── Bulk Add (لصق جماعي لعدة سكريبتات مرة واحدة) ──
  type BulkPreviewItem = {
    id: string;
    url: string;
    title: string;
    previewCode: string;
    isDuplicate: boolean;
    duplicateReason?: string;
    isRestricted: boolean;
  };
  const [isBulkAddMode, setIsBulkAddMode] = useState(false);
  const [bulkLinksText, setBulkLinksText] = useState('');
  const [bulkPreviewItems, setBulkPreviewItems] = useState<BulkPreviewItem[]>([]);
  const [isBulkScanning, setIsBulkScanning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  const [sequenceRegistry, setSequenceRegistry] = useState<SequenceRegistry>(() => loadLocalSequenceRegistry());
  const [isEditingManualCode, setIsEditingManualCode] = useState(false);
  const [manualCodeOverride, setManualCodeOverride] = useState('');

  useEffect(() => {
    if (isDemo || (!showAddModal && !showGoogleSheetImportModal)) return;
    fetchRemoteSequenceRegistry()
      .then(reg => setSequenceRegistry(reg))
      .catch(() => {});
  }, [isDemo, showAddModal, showGoogleSheetImportModal]);

  // Auto-fill Extra Name (Creator) with logged-in user's name when opening Add Modal
  useEffect(() => {
    if (!showAddModal) {
      setDocAccessStatus('idle');
      setDocAutoTitle('');
      return;
    }
    const rawUserName = (profile?.name || '').trim();
    if (!rawUserName || rawUserName.toLowerCase() === 'admin') return;
    setShootingAddForm(prev => {
      // Match existing extraName option case-insensitively (full or first name), else use profile name
      const firstName = rawUserName.split(/\s+/)[0] || rawUserName;
      const matched =
        uniqueExtraNames.find(n => n.toLowerCase() === rawUserName.toLowerCase()) ||
        uniqueExtraNames.find(n => n.toLowerCase() === firstName.toLowerCase()) ||
        rawUserName;
      return { ...prev, extraName: matched };
    });
  }, [showAddModal, profile?.name]);

  // Auto-check Google Docs permission whenever scriptLink changes (non-blocking warning)
  useEffect(() => {
    if (!showAddModal || isBulkAddMode) {
      setDocAccessStatus('idle');
      setDocAutoTitle('');
      return;
    }
    const link = (shootingAddForm.scriptLink || '').trim();
    if (!link || !link.includes('docs.google.com/document/d/')) {
      setDocAccessStatus('idle');
      setDocAutoTitle('');
      return;
    }
    let cancelled = false;
    setDocAccessStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/duration?action=doc-extract&url=${encodeURIComponent(link)}`);
        if (cancelled) return;
        const data = await res.json().catch(() => ({}));
        if (res.status === 403 || res.status === 401 || res.status === 404 || data?.isPublic === false || !res.ok) {
          setDocAccessStatus('restricted');
          setDocAutoTitle('');
        } else if (res.ok) {
          setDocAccessStatus('public');
          const fetchedTitle = String(data?.title || '').trim();
          setDocAutoTitle(fetchedTitle);
          if (fetchedTitle) {
            setShootingAddForm(prev => prev.scriptName.trim() ? prev : { ...prev, scriptName: fetchedTitle });
          }
        } else {
          setDocAccessStatus('idle');
        }
      } catch {
        if (!cancelled) setDocAccessStatus('idle');
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [shootingAddForm.scriptLink, showAddModal, isBulkAddMode]);

  useEffect(() => {
    if (isDemo) return;
    fetchRemoteSequenceRegistry()
      .then(reg => setSequenceRegistry(reg))
      .catch(() => {});
  }, [isDemo]);

  // Reset manual code override whenever form prefix fields or modal state change
  useEffect(() => {
    setManualCodeOverride('');
    setIsEditingManualCode(false);
  }, [shootingAddForm.year, shootingAddForm.teacher, shootingAddForm.extraName, showAddModal, activeGid]);

  // Unified set of ALL reel codes across Shooting + VE + CUTS + active sheet so codes NEVER repeat across stages or years
  const allReelsCodesSet = useMemo(() => {
    const set = new Set<string>();
    const addRows = (rows?: any[]) => {
      if (!Array.isArray(rows)) return;
      for (const r of rows) {
        const c = cleanCodePart(r?.code || r?.id);
        if (c) set.add(c);
      }
    };
    addRows(reelsDbByGid['1436746012']);
    addRows(reelsDbByGid['1939073164']);
    addRows(reelsDbByGid['0']);
    addRows(combinedData);
    addRows(liveData);
    return set;
  }, [reelsDbByGid, combinedData, liveData]);

  const autoGeneratedCode = useMemo(() => {
    if (!['1436746012', '1939073164', '798246690', '0'].includes(activeGid)) return '';
    return computeNextUniqueReelCode({
      year: shootingAddForm.year,
      teacher: shootingAddForm.teacher,
      extraName: shootingAddForm.extraName,
      isCut: activeGid === '0',
      allKnownCodes: allReelsCodesSet,
      sequenceRegistry,
    }).code;
  }, [shootingAddForm.year, shootingAddForm.teacher, shootingAddForm.extraName, allReelsCodesSet, sequenceRegistry, activeGid]);

  const generatedCode = useMemo(() => {
    if (manualCodeOverride.trim()) {
      return cleanCodePart(manualCodeOverride);
    }
    return autoGeneratedCode;
  }, [manualCodeOverride, autoGeneratedCode]);

  const manualCodeDuplicateWarning = useMemo(() => {
    const trimmed = cleanCodePart(manualCodeOverride);
    if (!trimmed) return null;
    if (allReelsCodesSet.has(trimmed)) {
      return `⚠️ الكود (${trimmed}) مستخدم بالفعل في النظام! اختر رقماً أعلى أو اترك التوليد التلقائي.`;
    }
    return null;
  }, [manualCodeOverride, allReelsCodesSet]);

  const duplicateScriptLinkWarning = useMemo(() => {
    const rawLink = shootingAddForm.scriptLink?.trim();
    if (!rawLink) return null;
    const docIdMatch = rawLink.match(/\/d\/([-\w]{25,})|\/folders\/([-\w]{25,})|id=([-\w]{25,})/);
    const docId = docIdMatch ? (docIdMatch[1] || docIdMatch[2] || docIdMatch[3]) : null;
    const cleanUrl = rawLink.split('?')[0].replace(/\/+$/, '').toLowerCase();

    const dup = reelsDbRows.find((r: any) => {
      const rowScript = (r.script || '').toString();
      if (docId && rowScript.includes(docId)) return true;
      if (cleanUrl.length > 15 && rowScript.toLowerCase().includes(cleanUrl)) return true;
      if (rowScript.includes(rawLink)) return true;
      return false;
    });

    if (dup) {
      return `⚠️ هذا الرابط مسجل بالفعل لمهمة (${dup.code || 'مهمة سابقة'}) في هذا الجدول!`;
    }
    return null;
  }, [shootingAddForm.scriptLink, reelsDbRows]);

  const duplicateScriptNameWarning = useMemo(() => {
    const trimmedName = shootingAddForm.scriptName?.trim().toLowerCase();
    if (!trimmedName || trimmedName.length < 3) return null;
    const codePrefix = activeGid === '0'
      ? `${shootingAddForm.year}-cut-${shootingAddForm.extraName}-`.toLowerCase().replace(/\s+/g, ' ')
      : `${shootingAddForm.year}-${shootingAddForm.teacher}-${shootingAddForm.extraName}-`.toLowerCase().replace(/\s+/g, ' ');

    const dup = reelsDbRows.find((r: any) => {
      const rowCode = (r.code || '').toString().toLowerCase();
      const rowScript = (r.script || '').toString().toLowerCase();
      return rowCode.startsWith(codePrefix) && rowScript.includes(trimmedName);
    });

    if (dup) {
      return `⚠️ يوجد سكريبت بنفس هذا العنوان للمعلم/المبتكر (${dup.code})!`;
    }
    return null;
  }, [shootingAddForm.scriptName, shootingAddForm.year, shootingAddForm.teacher, shootingAddForm.extraName, activeGid, reelsDbRows]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('dashboard_sidebar_collapsed_v1') === 'true';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('dashboard_sidebar_collapsed_v1', String(isSidebarCollapsed));
    } catch {}
  }, [isSidebarCollapsed]);

  const syncedThemeUserRef = useRef<string | null>(null);
  const [colorfulTabs, setColorfulTabs] = useState<boolean>(() => {
    try {
      return localStorage.getItem('dashboard_colorful_ui_v1') === 'true';
    } catch {
      return false;
    }
  });

  const [lightMode, setLightMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('dashboard_light_mode_v1') === 'true';
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('light-mode', saved);
        document.body.classList.toggle('light-mode', saved);
      }
      return saved;
    } catch {
      return false;
    }
  });

  const [uiContrast, setUiContrast] = useState<number>(() => {
    try {
      const raw = Number(localStorage.getItem('dashboard_contrast_v1'));
      const val = !isNaN(raw) && raw >= 75 && raw <= 125 ? raw : 100;
      if (typeof document !== 'undefined') {
        document.documentElement.style.filter = val === 100 ? '' : `contrast(${val}%)`;
      }
      return val;
    } catch {
      return 100;
    }
  });

  // Load user-specific UI preferences once profile is available
  useEffect(() => {
    if (!profile?.id) {
      syncedThemeUserRef.current = null;
      return;
    }
    try {
      const userLight = localStorage.getItem(`dashboard_light_mode_user_${profile.id}`);
      if (userLight !== null) {
        const parsed = userLight === 'true';
        setLightMode(parsed);
        localStorage.setItem('dashboard_light_mode_v1', String(parsed));
      } else {
        localStorage.setItem(`dashboard_light_mode_user_${profile.id}`, String(lightMode));
      }
      const userColorful = localStorage.getItem(`dashboard_colorful_ui_user_${profile.id}`);
      if (userColorful !== null) {
        const parsedColor = userColorful === 'true';
        setColorfulTabs(parsedColor);
        localStorage.setItem('dashboard_colorful_ui_v1', String(parsedColor));
      } else {
        localStorage.setItem(`dashboard_colorful_ui_user_${profile.id}`, String(colorfulTabs));
      }
      const userContrast = localStorage.getItem(`dashboard_contrast_user_${profile.id}`);
      if (userContrast !== null) {
        const parsedContrast = Number(userContrast);
        const validContrast = !isNaN(parsedContrast) && parsedContrast >= 75 && parsedContrast <= 125 ? parsedContrast : 100;
        setUiContrast(validContrast);
        localStorage.setItem('dashboard_contrast_v1', String(validContrast));
      } else {
        localStorage.setItem(`dashboard_contrast_user_${profile.id}`, String(uiContrast));
      }
      syncedThemeUserRef.current = profile.id;
    } catch {}
  }, [profile?.id]);

  // Sync lightMode to DOM and localStorage
  useEffect(() => {
    try {
      document.documentElement.classList.toggle('light-mode', lightMode);
      document.body.classList.toggle('light-mode', lightMode);
      localStorage.setItem('dashboard_light_mode_v1', String(lightMode));
      if (profile?.id && syncedThemeUserRef.current === profile.id) {
        localStorage.setItem(`dashboard_light_mode_user_${profile.id}`, String(lightMode));
      }
    } catch {}
  }, [lightMode, profile?.id]);

  // Sync colorfulTabs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('dashboard_colorful_ui_v1', String(colorfulTabs));
      if (profile?.id && syncedThemeUserRef.current === profile.id) {
        localStorage.setItem(`dashboard_colorful_ui_user_${profile.id}`, String(colorfulTabs));
      }
    } catch {}
  }, [colorfulTabs, profile?.id]);

  // Sync uiContrast to DOM and localStorage
  useEffect(() => {
    try {
      document.documentElement.style.filter = uiContrast === 100 ? '' : `contrast(${uiContrast}%)`;
      localStorage.setItem('dashboard_contrast_v1', String(uiContrast));
      if (profile?.id && syncedThemeUserRef.current === profile.id) {
        localStorage.setItem(`dashboard_contrast_user_${profile.id}`, String(uiContrast));
      }
    } catch {}
  }, [uiContrast, profile?.id]);
  const [visibleRecordsLimit, setVisibleRecordsLimit] = useState(200);
  const [veViewMode, setVeViewMode] = useState<'SIMPLE' | 'DETAILED'>(() => {
    try {
      return (localStorage.getItem('ve_view_mode') as 'SIMPLE' | 'DETAILED') || 'SIMPLE';
    } catch {
      return 'SIMPLE';
    }
  });

  useEffect(() => {
    setVisibleRecordsLimit(200);
  }, [activeGid]);

  const [stageWeekFilter, setStageWeekFilter] = useState('All');
  const [glowingKeys, setGlowingKeys] = useState<string[]>([]);
  const seenItemsRef = useRef<Record<string, Set<string>>>({});

  // Proactive cleanup of bloated localStorage keys that trigger QuotaExceededError
  useEffect(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('seen_items_') || k.startsWith('new_items_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => {
        try { localStorage.removeItem(k); } catch {}
      });
      if (keysToRemove.length > 0) {
        console.info(`🧹 Proactively removed ${keysToRemove.length} bloated cache entries from localStorage.`);
      }
    } catch {}
  }, []);
  const [sortBy, setSortBy] = useState<'default' | 'name' | 'date' | 'addedDate'>('default');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [priorityLimitModal, setPriorityLimitModal] = useState<{ isOpen: boolean; limit: number } | null>(null);

  const [tabPriorityLimits, setTabPriorityLimits] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('tab_priority_limits_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      '1535230545': 10,
    };
  });

  useEffect(() => {
    const savedLocal = localStorage.getItem('local_entries_v1');
    if (savedLocal) {
      try { setLocalEntries(JSON.parse(savedLocal)); } catch(e) {}
    }

    if (!isDemo && supabase) {
      const fetchTabPriorityLimits = async () => {
        try {
          const { data, error } = await supabase
            .from('tab_priority_limits')
            .select('gid, priority_limit');
          if (!error && data && data.length > 0) {
            const map: Record<string, number> = {};
            data.forEach((r: any) => {
              if (r.gid) map[r.gid] = Number(r.priority_limit);
            });
            setTabPriorityLimits(prev => ({ ...prev, ...map }));
            localStorage.setItem('tab_priority_limits_v1', JSON.stringify(map));
          }
        } catch (e) {
          console.error('fetchTabPriorityLimits error:', e);
        }
      };

      fetchTabPriorityLimits();

      // Custom window event listener for instant local sync
      const handleCustomUpdate = (e: any) => {
        if (e.detail?.gid && e.detail?.limit !== undefined) {
          setTabPriorityLimits(prev => ({ ...prev, [e.detail.gid]: Number(e.detail.limit) }));
        }
      };
      window.addEventListener('tab-priority-limit-updated', handleCustomUpdate);

      // Realtime Postgres Changes Subscription on tab_priority_limits
      const tabLimitsChannel = supabase
        .channel('public:tab_priority_limits')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tab_priority_limits' }, (payload: any) => {
          const row = payload.new;
          if (row && row.gid && row.priority_limit !== undefined) {
            setTabPriorityLimits(prev => {
              const next = { ...prev, [row.gid]: Number(row.priority_limit) };
              localStorage.setItem('tab_priority_limits_v1', JSON.stringify(next));
              return next;
            });
          }
        })
        .subscribe();

      return () => {
        window.removeEventListener('tab-priority-limit-updated', handleCustomUpdate);
        supabase.removeChannel(tabLimitsChannel);
      };
    }
  }, [isDemo]);

  const handleUpdateTabPriorityLimit = async (gid: string, newLimit: number) => {
    const updated = { ...tabPriorityLimits, [gid]: newLimit };
    setTabPriorityLimits(updated);
    try {
      localStorage.setItem('tab_priority_limits_v1', JSON.stringify(updated));
    } catch {}

    const token = session?.access_token || profile?.id;
    if (token) {
      fetch('/api/task-metadata', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ field: 'tab_priority_limits', metadata: updated })
      }).catch(e => console.error(e));
    }

    if (!isDemo && supabase) {
      try {
        // 1. Direct upsert to tab_priority_limits table
        supabase
          .from('tab_priority_limits')
          .upsert({
            gid,
            tab_name: gid === '1535230545' ? 'تجميعات' : (stages.find(s => s.gid === gid)?.label || gid),
            priority_limit: newLimit,
            updated_at: new Date().toISOString(),
            updated_by: profile?.name || profile?.id
          })
          .then(({ error }) => {
            if (error) console.log('tab_priority_limits table upsert info:', error.message);
          });

        // 2. Also keep dashboard_data in sync
        const val = JSON.stringify(updated);
        const { data: existing } = await supabase
          .from('dashboard_data')
          .select('key, field')
          .eq('key', 'task_metadata')
          .eq('field', 'tab_priority_limits')
          .maybeSingle();

        if (existing) {
          await supabase
            .from('dashboard_data')
            .update({ value: val, updated_by: profile?.id, updated_at: new Date().toISOString() })
            .eq('key', 'task_metadata')
            .eq('field', 'tab_priority_limits');
        } else {
          await supabase
            .from('dashboard_data')
            .insert({ key: 'task_metadata', field: 'tab_priority_limits', value: val, updated_by: profile?.id });
        }
      } catch (err) {
        console.error('Error saving tab priority limit to Supabase:', err);
      }
    }

    if (globalChannelRef.current && profile?.name) {
      globalChannelRef.current.send({
        type: 'broadcast',
        event: 'update',
        payload: {
          itemKey: 'tab_priority_limits',
          taskName: 'حد أولوية التاب',
          message: `🎯 تم تعديل حد الأولوية إلى: ${newLimit >= 999 ? 'غير محدود' : newLimit}`,
          type: 'tab_limit_update',
          from: profile.name,
          field: 'tab_priority_limits',
          dict: updated
        }
      });
    }

    toast.success(`🎯 تم حفظ وتعميم حد الأولوية لهذا التاب إلى: ${newLimit >= 999 ? 'غير محدود' : newLimit} مهمة`);
  };

  const handleBulkScan = async () => {
    if (!shootingAddForm.teacher?.trim() || !shootingAddForm.extraName?.trim() || !shootingAddForm.type?.trim() || !shootingAddForm.format?.trim()) {
      toast.error('يرجى تحديد المدرس والاسم الإضافي والنوع والمقاس أولاً');
      return;
    }
    const rawLines = bulkLinksText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    if (rawLines.length === 0) {
      toast.error('يرجى لصق رابط واحد على الأقل (كل رابط في سطر)');
      return;
    }

    setIsBulkScanning(true);
    try {
      const existingRows = reelsDbRows || [];
      const seenDocIds = new Set<string>();
      const seenUrls = new Set<string>();
      const tempKnownCodes = new Set<string>(allReelsCodesSet);

      const scanned: BulkPreviewItem[] = await Promise.all(
        rawLines.map(async (line, idx) => {
          let customTitle = '';
          let url = line;
          if (line.includes('|')) {
            const parts = line.split('|');
            if (parts[1]?.trim().startsWith('http')) {
              customTitle = parts[0].trim();
              url = parts.slice(1).join('|').trim();
            }
          }

          const cleanUrl = url.replace(/\/edit.*|\/view.*|\?.*$/i, '').trim().toLowerCase();
          const docIdMatch = url.match(/\/(?:document|spreadsheets|presentation|file)\/d\/([a-zA-Z0-9_-]{15,})/i);
          const docId = docIdMatch ? docIdMatch[1] : null;

          let isDuplicate = false;
          let duplicateReason = '';

          // Check against existing DB rows
          for (const r of existingRows) {
            const rScript = String(r.script || '');
            if (docId && rScript.includes(docId)) {
              isDuplicate = true;
              duplicateReason = `مكرر مع (${r.code})`;
              break;
            }
            if (!docId && cleanUrl.length > 15 && rScript.toLowerCase().includes(cleanUrl)) {
              isDuplicate = true;
              duplicateReason = `مكرر مع (${r.code})`;
              break;
            }
          }

          // Check duplicates within pasted batch itself
          if (!isDuplicate) {
            if (docId && seenDocIds.has(docId)) {
              isDuplicate = true;
              duplicateReason = 'مكرر داخل القائمة';
            } else if (!docId && cleanUrl && seenUrls.has(cleanUrl)) {
              isDuplicate = true;
              duplicateReason = 'مكرر داخل القائمة';
            }
          }
          if (docId) seenDocIds.add(docId);
          if (cleanUrl) seenUrls.add(cleanUrl);

          let fetchedTitle = customTitle;
          let isRestricted = false;
          if (url.includes('docs.google.com/document/d/')) {
            try {
              const res = await fetch(`/api/duration?action=doc-extract&url=${encodeURIComponent(url)}`);
              const data = await res.json().catch(() => ({}));
              if (res.status === 403 || data?.isPublic === false) {
                isRestricted = true;
              } else if (res.ok && !fetchedTitle && data?.title) {
                fetchedTitle = String(data.title).trim();
              }
            } catch {}
          }

          return {
            id: `bulk-${idx}-${Date.now()}`,
            url,
            title: fetchedTitle,
            previewCode: '',
            isDuplicate,
            duplicateReason,
            isRestricted
          };
        })
      );

      // Compute sequential preview codes for all non-duplicate items
      const withCodes = scanned.map(item => {
        if (item.isDuplicate) return item;
        const computed = computeNextUniqueReelCode({
          year: shootingAddForm.year,
          teacher: shootingAddForm.teacher,
          extraName: shootingAddForm.extraName,
          isCut: false,
          allKnownCodes: tempKnownCodes,
          sequenceRegistry,
        });
        tempKnownCodes.add(computed.code.toLowerCase());
        const seqMatch = computed.code.match(/-(\d+(?:\s*v\d+)?)$/i);
        const seqTag = seqMatch ? `#${seqMatch[1].replace(/\s*v\d+$/i, '')}` : '';
        const fallbackTitle = `اسكريبت مستر ${shootingAddForm.teacher} ${seqTag} - ${shootingAddForm.year.toUpperCase()} (${shootingAddForm.type})`.replace(/\s+/g, ' ').trim();
        return {
          ...item,
          previewCode: computed.code,
          title: item.title || fallbackTitle
        };
      });

      setBulkPreviewItems(withCodes);
      const validCount = withCodes.filter(x => !x.isDuplicate).length;
      const restrictedCount = withCodes.filter(x => x.isRestricted).length;
      if (restrictedCount > 0) {
        toast.info(`تم تجهيز ${validCount} ريل — تنبيه: يوجد ${restrictedCount} رابط Google Docs مقفول 🔒`);
      } else {
        toast.success(`✅ تم تجهيز ومعاينة ${validCount} ريل جاهز للإضافة!`);
      }
    } finally {
      setIsBulkScanning(false);
    }
  };

  const handleBulkSubmit = async () => {
    const validItems = bulkPreviewItems.filter(x => !x.isDuplicate && x.url.trim());
    if (validItems.length === 0) {
      toast.error('لا توجد روابط صالحة للإضافة (اضغط معاينة أولاً)');
      return;
    }
    const tbl = REELS_TABLE_MAP[activeGid];
    if (!tbl) return;

    setIsSubmittingAdd(true);
    setBulkProgress({ current: 0, total: validItems.length });
    saveShootingQuickPreset(shootingAddForm);

    const addedRows: any[] = [];
    let workingRegistry = sequenceRegistry;
    const workingCodesSet = new Set<string>(allReelsCodesSet);

    try {
      for (let i = 0; i < validItems.length; i++) {
        const entry = validItems[i];
        setBulkProgress({ current: i + 1, total: validItems.length });

        const claimed = await resolveAndClaimUniqueCodeFromDb({
          year: shootingAddForm.year,
          teacher: shootingAddForm.teacher,
          extraName: shootingAddForm.extraName,
          isCut: false,
          localKnownCodes: workingCodesSet,
          sequenceRegistry: workingRegistry,
        });
        workingRegistry = claimed.registry;
        workingCodesSet.add(claimed.code.toLowerCase());

        const cleanTitle = (entry.title || claimed.code).replace(/"/g, "'").trim();
        const scriptValue = `=HYPERLINK("${entry.url.trim()}", "${cleanTitle}")`;
        const nowIso = new Date().toISOString();
        const newRow = {
          date: new Date().toLocaleDateString('en-US'),
          branch: shootingAddForm.branch,
          year: shootingAddForm.year,
          teacher: shootingAddForm.teacher,
          extraName: shootingAddForm.extraName,
          code: claimed.code,
          id: claimed.code,
          script: scriptValue,
          type: shootingAddForm.type,
          format: shootingAddForm.format,
          filmed: false,
          filmingDate: '',
          by: '',
          storage: '',
          notes: '',
          driveRaw: '',
          editorCol: '',
          done: false,
          driveFinal: '',
          canceled: false,
          missingDetails: false,
          uniqueKey: claimed.code
        };

        const { error } = await supabase.from(tbl).insert([{
          date: newRow.date,
          branch: newRow.branch,
          year: newRow.year,
          teacher: newRow.teacher,
          extra_name: newRow.extraName,
          code: newRow.code,
          script: newRow.script,
          type: newRow.type,
          format: newRow.format,
          filmed: false,
          filming_date: '',
          by: '',
          storage: '',
          notes: '',
          drive_raw: '',
          editor_col: '',
          done: false,
          drive_final: '',
          canceled: false,
          missing_details: false,
          created_at: nowIso,
          updated_at: nowIso
        }]);

        if (!error) {
          addedRows.push(newRow);
        }
      }

      setSequenceRegistry(workingRegistry);
      if (addedRows.length > 0) {
        const addedCodes = new Set(addedRows.map(r => r.code));
        setReelsDbRows(prev => [...addedRows.reverse(), ...prev.filter(x => !addedCodes.has(x.code))]);
        setReelsDbByGid(prev => {
          const cur = prev[activeGid] || [];
          return { ...prev, [activeGid]: [...addedRows, ...cur.filter((x: any) => !addedCodes.has(x.code))] };
        });
        toast.success(`🚀 تم إضافة ${addedRows.length} ريل بنجاح دفعة واحدة!`);
        setBulkLinksText('');
        setBulkPreviewItems([]);
        setIsBulkAddMode(false);
        setShowAddModal(false);
      } else {
        toast.error('تعذر إضافة الروابط — يرجى المحاولة مرة أخرى');
      }
    } catch (err: any) {
      console.error('Bulk add error:', err);
      toast.error('حدث خطأ أثناء الإضافة الجماعية: ' + (err?.message || err));
    } finally {
      setBulkProgress(null);
      setIsSubmittingAdd(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent | null, keepOpen = false) => {
    if (e) e.preventDefault();
    if (isSubmittingAdd) return;

    // For Shooting / reels / Cuts sheets
    if (['1436746012', '1939073164', '798246690', '0'].includes(activeGid)) {
      if (activeGid !== '0' && (!shootingAddForm.teacher || !shootingAddForm.teacher.trim())) {
        toast.error("يرجى اختيار أو تحديد اسم المدرس أولاً");
        return;
      }

      if (!shootingAddForm.extraName || !shootingAddForm.extraName.trim()) {
        toast.error("يرجى اختيار أو كتابة الاسم الإضافي أولاً");
        return;
      }

      if (!shootingAddForm.type || !shootingAddForm.type.trim()) {
        toast.error("يرجى تحديد النوع (Type)");
        return;
      }

      if (!shootingAddForm.format || !shootingAddForm.format.trim()) {
        toast.error("يرجى تحديد المقاس (Format)");
        return;
      }

      if (!shootingAddForm.scriptLink || !shootingAddForm.scriptLink.trim()) {
        toast.error("يرجى إدخال رابط السكريبت");
        return;
      }
      
      if (!shootingAddForm.scriptName || !shootingAddForm.scriptName.trim()) {
        toast.error("يرجى كتابة اسم السكريبت أو الضغط على زر (توليد اسم 🪄)");
        return;
      }
      
      const effectiveScriptName = shootingAddForm.scriptName.trim();

      if (!generatedCode) {
        toast.error("فشل في توليد الكود التلقائي");
        return;
      }

      // Deduplication check: prevent accidental double submissions of identical script link / name
      const trimmedScriptLink = shootingAddForm.scriptLink.trim();
      const trimmedScriptName = effectiveScriptName.toLowerCase();
      const codePrefix = activeGid === '0'
        ? `${shootingAddForm.year}-cut-${shootingAddForm.extraName}-`.toLowerCase().replace(/\s+/g, ' ')
        : `${shootingAddForm.year}-${shootingAddForm.teacher}-${shootingAddForm.extraName}-`.toLowerCase().replace(/\s+/g, ' ');

      // Extract Document / Folder ID from link to detect duplicates across URL variants
      const docIdMatch = trimmedScriptLink.match(/\/d\/([-\w]{25,})|\/folders\/([-\w]{25,})|id=([-\w]{25,})/);
      const docId = docIdMatch ? (docIdMatch[1] || docIdMatch[2] || docIdMatch[3]) : null;
      const cleanUrl = trimmedScriptLink.split('?')[0].replace(/\/+$/, '').toLowerCase();

      let duplicateReason = '';
      const isDuplicate = reelsDbRows.some((r: any) => {
        const rowScript = (r.script || '').toString();
        const rowCode = (r.code || '').toString().toLowerCase();

        // 1. Check Link duplicate (independent of script title!)
        if (trimmedScriptLink) {
          if (docId && rowScript.includes(docId)) {
            duplicateReason = `⚠️ هذا الرابط مضاف بالفعل لمهمة أخرى (${r.code || 'مهمة سابقة'}) لتجنب التكرار!`;
            return true;
          }
          if (cleanUrl && cleanUrl.length > 15 && rowScript.toLowerCase().includes(cleanUrl)) {
            duplicateReason = `⚠️ هذا الرابط مضاف بالفعل لمهمة أخرى (${r.code || 'مهمة سابقة'}) لتجنب التكرار!`;
            return true;
          }
          if (rowScript.includes(trimmedScriptLink)) {
            duplicateReason = `⚠️ هذا الرابط مضاف بالفعل لمهمة أخرى (${r.code || 'مهمة سابقة'}) لتجنب التكرار!`;
            return true;
          }
        }

        // 2. Check Script Name duplicate for the same teacher/creator
        if (trimmedScriptName && trimmedScriptName.length >= 3) {
          if (rowCode.startsWith(codePrefix) && rowScript.toLowerCase().includes(trimmedScriptName)) {
            duplicateReason = `⚠️ يوجد سكريبت بنفس هذا العنوان مسجل للمعلم/المبتكر (${r.code})!`;
            return true;
          }
        }

        return false;
      });

      if (isDuplicate) {
        toast.error(duplicateReason || "⚠️ هذا السكريبت أو الرابط مضاف بالفعل في هذا الجدول لتجنب التكرار!");
        return;
      }

      setIsSubmittingAdd(true);
      try {
        const scriptValue = shootingAddForm.scriptLink.trim()
          ? `=HYPERLINK("${shootingAddForm.scriptLink.trim()}", "${effectiveScriptName}")`
          : effectiveScriptName;

        const tbl = REELS_TABLE_MAP[activeGid];

        if (tbl) {
          // Double protection: Direct database check to prevent multi-device race condition duplicates
          if (docId) {
            const { data: dbDupDoc } = await supabase
              .from(tbl)
              .select('code, script')
              .ilike('script', `%${docId}%`)
              .limit(1);
            if (dbDupDoc && dbDupDoc.length > 0) {
              toast.error(`⚠️ هذا الرابط مسجل بالفعل في قاعدة البيانات للمهمة (${dbDupDoc[0].code}) لمنع التكرار!`);
              setIsSubmittingAdd(false);
              return;
            }
          } else if (cleanUrl && cleanUrl.length > 15) {
            const { data: dbDupLink } = await supabase
              .from(tbl)
              .select('code, script')
              .ilike('script', `%${cleanUrl}%`)
              .limit(1);
            if (dbDupLink && dbDupLink.length > 0) {
              toast.error(`⚠️ هذا الرابط مسجل بالفعل في قاعدة البيانات للمهمة (${dbDupLink[0].code}) لمنع التكرار!`);
              setIsSubmittingAdd(false);
              return;
            }
          }

          if (trimmedScriptName && trimmedScriptName.length >= 3) {
            const { data: dbDupName } = await supabase
              .from(tbl)
              .select('code, script')
              .ilike('code', `${codePrefix}%`)
              .ilike('script', `%${trimmedScriptName}%`)
              .limit(1);
            if (dbDupName && dbDupName.length > 0) {
              toast.error(`⚠️ هذا السكريبت مسجل بالفعل لهذا المعلم/المبتكر (${dbDupName[0].code}) لمنع التكرار!`);
              setIsSubmittingAdd(false);
              return;
            }
          }
        }

        if (activeGid === '0') {
          // CUTS
          const newCut = {
            date: new Date().toLocaleDateString('en-US'),
            branch: shootingAddForm.branch,
            year: shootingAddForm.year,
            typeCol: 'CUT',
            creator: shootingAddForm.extraName,
            code: generatedCode,
            id: generatedCode,
            dataFiles: '',
            script: scriptValue,
            type: shootingAddForm.type,
            format: shootingAddForm.format,
            creatorNotes: '',
            editorNotes: '',
            missingDetails: false,
            problem: false,
            done: false,
            editor: '',
            driveFinal: '',
            canceled: false,
            uniqueKey: generatedCode
          };

          if (tbl) {
            const claimed = await resolveAndClaimUniqueCodeFromDb({
              year: shootingAddForm.year,
              extraName: shootingAddForm.extraName,
              isCut: true,
              localKnownCodes: allReelsCodesSet,
              sequenceRegistry,
              manualCustomCode: manualCodeOverride.trim() || undefined,
            });
            if (claimed.duplicateConflict) {
              toast.error(`❌ الكود "${claimed.duplicateConflict}" موجود بالفعل! يرجى استخدام التوليد التلقائي أو رقم غير مستخدم.`);
              return;
            }
            setSequenceRegistry(claimed.registry);
            newCut.code = claimed.code;
            newCut.id = claimed.code;
            newCut.uniqueKey = claimed.code;

            const { error } = await supabase.from(tbl).insert([{
              date: newCut.date,
              branch: newCut.branch,
              year: newCut.year,
              type_col: newCut.typeCol,
              creator: newCut.creator,
              code: newCut.code,
              data_files: '',
              script: newCut.script,
              type: newCut.type,
              format: newCut.format,
              creator_notes: '',
              editor_notes: '',
              missing_details: false,
              problem: false,
              done: false,
              editor: '',
              drive_final: '',
              canceled: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);

            if (error) {
              console.error(`Error inserting into ${tbl}:`, error);
              toast.error("حدث خطأ أثناء الإضافة في قاعدة البيانات: " + error.message);
              return;
            }

            setReelsDbRows(prev => [newCut, ...prev.filter(x => x.code !== newCut.code)]);
          }

          // Close modal immediately and show success!
          setShowAddModal(false);
          setShootingAddForm(prev => ({
            ...prev,
            scriptName: '',
            scriptLink: '',
            driveRaw: ''
          }));
          toast.success("تم إضافة الريل الجديد بنجاح في Supabase! 🎉");

          const broadcastCode = newCut.code || generatedCode;
          if (globalChannelRef.current && profile?.name) {
            globalChannelRef.current.send({
              type: 'broadcast',
              event: 'update',
              payload: {
                itemKey: broadcastCode,
                taskName: scriptValue || broadcastCode,
                message: `🎬 تم إضافة مهمة مونتاج (Cut) جديدة: "${scriptValue || broadcastCode}"`,
                type: 'new_entry',
                from: profile.name,
                activeGid
              }
            });
          }
          return;
        } else {
          // Shooting & Ve
          const newShooting = {
            date: new Date().toLocaleDateString('en-US'),
            branch: shootingAddForm.branch,
            year: shootingAddForm.year,
            teacher: shootingAddForm.teacher,
            extraName: shootingAddForm.extraName,
            code: generatedCode,
            id: generatedCode,
            script: scriptValue,
            type: shootingAddForm.type,
            format: shootingAddForm.format,
            filmed: false,
            filmingDate: '',
            by: '',
            storage: '',
            notes: '',
            driveRaw: shootingAddForm.driveRaw?.trim() || '',
            editorCol: '',
            done: false,
            driveFinal: '',
            canceled: false,
            missingDetails: false,
            uniqueKey: generatedCode
          };

          if (tbl) {
            const claimed = await resolveAndClaimUniqueCodeFromDb({
              year: shootingAddForm.year,
              teacher: shootingAddForm.teacher,
              extraName: shootingAddForm.extraName,
              isCut: false,
              localKnownCodes: allReelsCodesSet,
              sequenceRegistry,
              manualCustomCode: manualCodeOverride.trim() || undefined,
            });
            if (claimed.duplicateConflict) {
              toast.error(`❌ الكود "${claimed.duplicateConflict}" موجود بالفعل! يرجى استخدام التوليد التلقائي أو رقم غير مستخدم.`);
              return;
            }
            setSequenceRegistry(claimed.registry);
            newShooting.code = claimed.code;
            newShooting.id = claimed.code;
            newShooting.uniqueKey = claimed.code;

            const { error } = await supabase.from(tbl).insert([{
              date: newShooting.date,
              branch: newShooting.branch,
              year: newShooting.year,
              teacher: newShooting.teacher,
              extra_name: newShooting.extraName,
              code: newShooting.code,
              script: newShooting.script,
              type: newShooting.type,
              format: newShooting.format,
              filmed: false,
              filming_date: '',
              by: '',
              storage: '',
              notes: '',
              drive_raw: newShooting.driveRaw,
              editor_col: '',
              done: false,
              drive_final: '',
              canceled: false,
              missing_details: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);

            if (error) {
              console.error(`Error inserting into ${tbl}:`, error);
              toast.error("حدث خطأ أثناء الإضافة في قاعدة البيانات: " + error.message);
              return;
            }

            setReelsDbRows(prev => [newShooting, ...prev.filter(x => x.code !== newShooting.code)]);
            setReelsDbByGid(prev => {
              const cur = prev[activeGid] || [];
              return { ...prev, [activeGid]: [newShooting, ...cur.filter((x: any) => x.code !== newShooting.code)] };
            });
          }

          // Save current combo to Quick Presets for 1-click reuse
          saveShootingQuickPreset(shootingAddForm);

          // Keep modal open with Branch/Year/Teacher/ExtraName/Type/Format preserved if "حفظ وإضافة واحد تاني" was clicked
          if (keepOpen) {
            setManualCodeOverride('');
            setIsEditingManualCode(false);
            setShootingAddForm(prev => ({
              ...prev,
              scriptName: '',
              scriptLink: '',
              driveRaw: ''
            }));
            toast.success(`✅ تم حفظ (${newShooting.code}) — جاهز لإضافة الريل اللي بعده! ➕`);
          } else {
            setShowAddModal(false);
            setManualCodeOverride('');
            setIsEditingManualCode(false);
            setShootingAddForm(prev => ({
              ...prev,
              scriptName: '',
              scriptLink: '',
              driveRaw: ''
            }));
            toast.success("تم إضافة السكريبت الجديد بنجاح في Supabase! 🎉");
          }

          const broadcastCode = newShooting.code || generatedCode;
          if (globalChannelRef.current && profile?.name) {
            globalChannelRef.current.send({
              type: 'broadcast',
              event: 'update',
              payload: {
                itemKey: broadcastCode,
                taskName: scriptValue || broadcastCode,
                message: `🆕 تم إضافة سكريبت جديد: "${scriptValue || broadcastCode}"`,
                type: 'new_entry',
                from: profile.name,
                activeGid
              }
            });
          }
          return;
        }
      } catch (err: any) {
        console.error(err);
        toast.error("حدث خطأ أثناء الإضافة: " + (err.message || err));
      } finally {
        setIsSubmittingAdd(false);
      }
      return;
    }

    if (!addForm.name) return;

    setIsSubmittingAdd(true);
    try {
      if (activeGid === '1535230545') {
        const newKey = 'tgm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
        const newTagme = {
          uniqueKey: newKey,
          id: newKey,
          name: addForm.name.trim(),
          filingName: addForm.filingName?.trim() || '---',
          opSheet: addForm.val?.trim() || 'Senior 1',
          branch: (addForm.extra && !addForm.extra.includes('يوتيوب') && !addForm.extra.includes('تجميعة')) ? addForm.extra.trim() : '',
          date: addForm.id?.trim() || new Date().toISOString().split('T')[0],
          notesMarketing: addForm.notesMarketing?.trim() || '',
          editor: addForm.editor?.trim() || 'غير محدد',
          notesEditors: '',
          done: false,
          priority: false,
          cancel: false,
          thumbnailLink: '',
          time: '',
          youtubeLink: '',
          uploaded: false,
          isTransfer: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const { error } = await supabase.from('tagme3at_26').insert([{
          unique_key: newKey,
          name: newTagme.name,
          filing_name: newTagme.filingName,
          op_sheet: newTagme.opSheet,
          branch: newTagme.branch,
          date: newTagme.date,
          notes_marketing: newTagme.notesMarketing,
          editor: newTagme.editor,
          notes_editors: '',
          done: false,
          priority: false,
          cancel: false,
          thumbnail_link: '',
          time: '',
          youtube_link: '',
          uploaded: false,
          is_transfer: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

        if (error) {
          console.error('Error inserting into tagme3at_26:', error);
          toast.error(`حدث خطأ أثناء الحفظ في قاعدة البيانات: ${error.message}`);
          return;
        }

        setTagmeDbRows(prev => [newTagme, ...prev.filter(x => x.uniqueKey !== newKey)]);
        notifyCoreCountsChanged(['1535230545']);

        if (globalChannelRef.current && profile?.name) {
          globalChannelRef.current.send({
            type: 'broadcast',
            event: 'update',
            payload: {
              itemKey: newKey,
              taskName: newTagme.name,
              message: `➕ تم إضافة تجميعة جديدة: "${newTagme.name}"`,
              type: 'tagme_add',
              from: profile.name,
              activeGid
            }
          });
        }

        setShowAddModal(false);
        setAddForm({ name: '', filingName: '', val: '', id: '', subject: '', extra: '', editor: '', notesMarketing: '' });
        toast.success(`تم حفظ وإضافة التجميعة "${newTagme.name}" بنجاح في Supabase! 🎉`);
        return;
      }

      if (isStageTab) {
        const newKey = `stg-${activeGid}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newStageItem = {
          uniqueKey: newKey,
          id: newKey,
          week: 'أسبوع 1',
          date: addForm.id?.trim() || new Date().toISOString().split('T')[0],
          name: addForm.name.trim(),
          filingName: addForm.filingName?.trim() || addForm.name.trim(),
          subject: addForm.subject?.trim() || 'عام',
          branch: addForm.extra?.trim() || 'القاهرة',
          opSheet: addForm.val?.trim() || activeLabel || '2025 - 2026',
          isTagme3a: false,
          delivered: false,
          thumbnailLink: '',
          time: '',
          youtubeLink: '',
          uploaded: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const { error } = await supabase.from(stageTable).insert([{
          unique_key: newKey,
          week: newStageItem.week,
          date: newStageItem.date,
          name: newStageItem.name,
          filing_name: newStageItem.filingName,
          subject: newStageItem.subject,
          branch: newStageItem.branch,
          op_sheet: newStageItem.opSheet,
          is_tagme3a: false,
          delivered: false,
          thumbnail_link: '',
          time: '',
          youtube_link: '',
          uploaded: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

        if (error) {
          console.error(`Error inserting into ${stageTable}:`, error);
          toast.error(`خطأ أثناء الحفظ في قاعدة البيانات: ${error.message}`);
          return;
        }

        setStageDbRows(prev => [newStageItem, ...prev.filter(x => x.uniqueKey !== newKey)]);

        if (globalChannelRef.current && profile?.name) {
          globalChannelRef.current.send({
            type: 'broadcast',
            event: 'update',
            payload: {
              itemKey: newKey,
              taskName: newStageItem.name,
              message: `➕ تم إضافة درس جديد في ${activeLabel}: "${newStageItem.name}"`,
              type: 'stage_add',
              from: profile.name,
              activeGid
            }
          });
        }

        setShowAddModal(false);
        setAddForm({ name: '', filingName: '', val: '', id: '', subject: '', extra: '', editor: '', notesMarketing: '' });
        toast.success(`تم حفظ وإضافة الدرس بنجاح في جدول Supabase (${stageTable})! 🚀`);
        return;
      }

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
      toast.success("تم إضافة المهمة بنجاح! 🚀");
    } catch (err: any) {
      console.error(err);
      toast.error(`فشل الإضافة: ${err.message || err}`);
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  useEffect(() => {
    // Load directly from Supabase DB on app mount as the authoritative source of truth
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
        localStorage.setItem('tagme3at_transfers', JSON.stringify(transfers));
        
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
    }).catch(e => console.error("Error loading Tagme3at from Supabase DB:", e));

    // Load cuts_overrides from Supabase DB task_metadata
    const token = session?.access_token || profile?.id;
    if (token) {
      fetch('/api/task-metadata', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data?.metadata?.cuts_overrides) {
          localStorage.setItem('cuts_overrides', JSON.stringify(data.metadata.cuts_overrides));
        }
      })
      .catch(() => {});
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
    const data = Array.isArray(combinedData) ? combinedData : [];
    const start = Math.min(startIdx, endIdx);
    const end = Math.max(startIdx, endIdx);
    
    const rowsToUpdate = data.slice(start, end + 1);
    if (rowsToUpdate.length === 0) return;

    // 1. Optimistic UI update (Instant feedback!)
    setReelsDbRows(prev => {
      const updated = [...prev];
      for (let i = start; i <= end; i++) {
        if (updated[i]) {
          updated[i] = { ...updated[i], [colKey]: value };
        }
      }
      return updated;
    });

    setLiveData((prev: any[]) => {
      if (!Array.isArray(prev)) return prev;
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

    // 3. Supabase Direct Update
    if (!isDemo && isReelsTableTab) {
      const tbl = REELS_TABLE_MAP[activeGid];
      if (tbl) {
        const dbColMap: Record<string, string> = {
          branch: 'branch',
          year: 'year',
          teacher: 'teacher',
          extraName: 'extra_name',
          type: 'type',
          format: 'format',
          by: 'by',
          storage: 'storage',
          script: 'script',
          notes: 'notes',
          driveRaw: 'drive_raw',
          editorCol: 'editor_col',
          driveFinal: 'drive_final',
          creator: 'creator',
          dataFiles: 'data_files',
          creatorNotes: 'creator_notes',
          editorNotes: 'editor_notes',
          editor: 'editor',
          typeCol: 'type_col'
        };
        const col = dbColMap[colKey] || colKey;

        Promise.all(rowsToUpdate.map((r: any) => {
          const itemCode = r.code || r.id;
          return supabase.from(tbl).update({ [col]: value, updated_at: new Date().toISOString() }).eq('code', itemCode);
        })).catch(err => console.error("Error updating Supabase on autofill:", err));
        return;
      }
    }

    const token = session?.access_token || profile?.id;
    if (!token) return;

    const batchUpdates = rowsToUpdate.map((item) => {
      const updatedItem = { ...item, [colKey]: value };
      let rowData: any[] = [];

      if (activeGid === '0') {
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

  const INITIAL_VISIBLE_LIMIT = 50;
  const [activeVisibleRecordsLimit, setActiveVisibleRecordsLimit] = useState<number>(INITIAL_VISIBLE_LIMIT);

  useEffect(() => {
    setActiveVisibleRecordsLimit(INITIAL_VISIBLE_LIMIT);
  }, [activeGid, searchQuery, statusFilter, teacherFilter, yearFilter, termFilter, colFilters]);



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

  // Bulletproof Shooting-to-VE Synchronizer:
  // 1. NEVER overwrites editor progress (done, drive_final, editor_col, missing_details, editor_notes, hard_drive_status)
  // 2. Only updates shooting metadata on existing VE rows
  // 3. Inserts brand new records when filmed
  // 4. Protects completed editor work from accidental deletion when filmed is toggled off
  // 5. Instantly reflects changes in local VE state (reelsDbByGid['1939073164'])
  const syncShootingItemToVe = async (
    item: any,
    isFilmed: boolean,
    wasPreviouslyFilmed: boolean,
    customFilmingDate?: string
  ) => {
    const targetCode = String(item.code || item.id || '').trim();
    if (!targetCode) return;

    if (wasPreviouslyFilmed !== isFilmed) {
      setStageUncompletedCounts(prev => {
        const cur = prev['1939073164'] || 0;
        const nextVal = Math.max(0, cur + (isFilmed ? 1 : -1));
        const next = { ...prev, ['1939073164']: nextVal };
        try { localStorage.setItem('stage_uncompleted_counts_cache_v1', JSON.stringify(next)); } catch {}
        return next;
      });
    }

    try {
      if (isFilmed) {
        setActiveVeToast({ item: { ...item, filmed: true } });
        const fDate = customFilmingDate || item.filmingDate || item.filming_date || new Date().toLocaleDateString('en-US');

        // Check if the record already exists in reels_ve_26
        const { data: existingVeRow, error: checkErr } = await supabase
          .from('reels_ve_26')
          .select('id, code, done, drive_final, editor_col, missing_details, canceled, edit_check, editor_notes, hard_drive_status')
          .ilike('code', targetCode)
          .maybeSingle();

        if (!checkErr && existingVeRow) {
          // Row ALREADY exists in VE!
          // PRESERVATION RULE: Update ONLY shooting-owned metadata.
          // NEVER overwrite done, drive_final, editor_col, missing_details, editor_notes, hard_drive_status!
          const { error: upErr } = await supabase
            .from('reels_ve_26')
            .update({
              branch: item.branch || '',
              year: item.year || '',
              teacher: item.teacher || '',
              extra_name: item.extraName || item.extra_name || '',
              script: item.script || '',
              type: item.type || '',
              format: item.format || '',
              filmed: true,
              filming_date: fDate,
              by: item.by || '',
              storage: item.storage || '',
              notes: item.notes || '',
              drive_raw: item.driveRaw || item.drive_raw || '',
              updated_at: new Date().toISOString()
            })
            .eq('code', existingVeRow.code);

          if (upErr) {
            console.error('[VE Sync] Error updating existing VE row:', upErr);
          } else {
            // Update local memory state for VE tab while preserving VE fields
            setReelsDbByGid(prev => {
              const veRows = prev['1939073164'];
              if (!veRows) return prev;
              return {
                ...prev,
                ['1939073164']: veRows.map((r: any) =>
                  String(r.code || '').trim().toLowerCase() === targetCode.toLowerCase()
                    ? {
                        ...r,
                        branch: item.branch || r.branch,
                        year: item.year || r.year,
                        teacher: item.teacher || r.teacher,
                        extraName: item.extraName || item.extra_name || r.extraName,
                        script: item.script || r.script,
                        type: item.type || r.type,
                        format: item.format || r.format,
                        filmed: true,
                        filmingDate: fDate,
                        by: item.by || r.by,
                        storage: item.storage || r.storage,
                        notes: item.notes || r.notes,
                        driveRaw: item.driveRaw || item.drive_raw || r.driveRaw
                      }
                    : r
                )
              };
            });
          }
        } else {
          // Brand new row to VE! Insert with safe default VE fields
          const newVeRecord = {
            code: targetCode,
            date: item.date || new Date().toISOString().split('T')[0],
            branch: item.branch || '',
            year: item.year || '',
            teacher: item.teacher || '',
            extra_name: item.extraName || item.extra_name || '',
            script: item.script || '',
            type: item.type || '',
            format: item.format || '',
            filmed: true,
            filming_date: fDate,
            by: item.by || '',
            storage: item.storage || '',
            notes: item.notes || '',
            drive_raw: item.driveRaw || item.drive_raw || '',
            editor_col: 'غير محدد',
            done: false,
            drive_final: '',
            canceled: false,
            missing_details: false,
            updated_at: new Date().toISOString()
          };

          const { error: insErr } = await supabase
            .from('reels_ve_26')
            .insert(newVeRecord);

          if (insErr) {
            console.warn('[VE Sync] Insert collision, falling back to safe upsert with ignoreDuplicates:', insErr);
            await supabase.from('reels_ve_26').upsert(newVeRecord, { onConflict: 'code', ignoreDuplicates: true });
          }

          toast.success("تم نقل ومزامنة الريل تلقائياً إلى شيت VE! 🎬");
          notifyCoreCountsChanged(['1939073164']);

          // Immediately update VE in local memory state so switching to VE shows it without delay!
          setReelsDbByGid(prev => {
            const veRows = prev['1939073164'] || [];
            const mappedNew = {
              id: targetCode,
              code: targetCode,
              date: newVeRecord.date,
              branch: newVeRecord.branch,
              year: newVeRecord.year,
              teacher: newVeRecord.teacher,
              extraName: newVeRecord.extra_name,
              script: newVeRecord.script,
              type: newVeRecord.type,
              format: newVeRecord.format,
              filmed: true,
              filmingDate: newVeRecord.filming_date,
              by: newVeRecord.by,
              storage: newVeRecord.storage,
              notes: newVeRecord.notes,
              editorNotes: '',
              driveRaw: newVeRecord.drive_raw,
              editorCol: 'غير محدد',
              done: false,
              driveFinal: '',
              canceled: false,
              missingDetails: false,
              editCheck: false,
              publish: false,
              sharedLink: '',
              hardDriveStatus: null,
              uniqueKey: targetCode,
              createdAt: newVeRecord.updated_at,
              updatedAt: newVeRecord.updated_at
            };
            return {
              ...prev,
              ['1939073164']: [mappedNew, ...veRows.filter((r: any) => String(r.code || '').trim().toLowerCase() !== targetCode.toLowerCase())]
            };
          });
        }
      } else {
        // Un-filmed in Shooting: check if it exists in VE and remove it!
        const { data: existingVeRow } = await supabase
          .from('reels_ve_26')
          .select('code, done, drive_final, editor_col')
          .ilike('code', targetCode)
          .maybeSingle();

        if (existingVeRow) {
          // Direct rule: If unfilmed in Shooting, remove completely from VE!
          await supabase
            .from('reels_ve_26')
            .delete()
            .ilike('code', targetCode);
          toast.info("تمت إزالة الريل تلقائياً من شيت VE لإلغاء علامة التصوير 🎬");
          setReelsDbByGid(prev => {
            const veRows = prev['1939073164'];
            if (!veRows) return prev;
            return {
              ...prev,
              ['1939073164']: veRows.filter((r: any) => String(r.code || '').trim().toLowerCase() !== targetCode.toLowerCase())
            };
          });
          notifyCoreCountsChanged(['1939073164']);
        }
      }
    } catch (syncErr) {
      console.error('[VE Sync] Error syncing shooting row to VE:', syncErr);
    }
  };

  const handleUpdateShootingRow = async (
    oldCode: string,
    newRowData: any[],
    noteMeta?: { fieldName?: string; value?: string; time?: string; author?: string },
    changedFields?: string[]
  ) => {
    const tbl = REELS_TABLE_MAP[activeGid];
    const newCode = newRowData[5] || oldCode;

    if (noteMeta?.author && noteMeta?.fieldName) {
      const isVideoUser = profile?.team?.toLowerCase() === 'video' && profile?.role !== 'admin' && profile?.role !== 'manager';
      const isMarketingUser = (profile?.team?.toLowerCase() === 'marketing' || !isVideoUser) && profile?.role !== 'admin' && profile?.role !== 'manager';

      if (activeGid === '1939073164') {
        if (noteMeta.fieldName === 'editorNotes' && isMarketingUser) {
          if (toast && toast.error) toast.error("غير مسموح لتيم الماركتينج بتعديل أو مسح ملاحظات المونتير 🎬🔒");
          return;
        }
        if (noteMeta.fieldName === 'notes' && isVideoUser) {
          if (toast && toast.error) toast.error("غير مسموح لتيم الفيديو بتعديل أو مسح ملاحظات الماركتينج 📝🔒");
          return;
        }
      } else if (activeGid === '0') {
        if (noteMeta.fieldName === 'editorNotes' && isMarketingUser) {
          if (toast && toast.error) toast.error("غير مسموح لتيم الماركتينج بتعديل أو مسح ملاحظات المحرر 🎬🔒");
          return;
        }
        if (noteMeta.fieldName === 'creatorNotes' && isVideoUser) {
          if (toast && toast.error) toast.error("غير مسموح لتيم الفيديو بتعديل أو مسح ملاحظات المبتكر 📝🔒");
          return;
        }
      }

      let fieldKey = noteMeta.fieldName;
      if (activeGid === '0') {
        fieldKey = noteMeta.fieldName === 'creatorNotes' ? 'cuts_creator_notes' : 'cuts_editor_notes';
      } else {
        fieldKey = noteMeta.fieldName === 'editorNotes' ? 've_editor_notes' : 'shooting_notes';
      }
      const noteKey = `${fieldKey}_${oldCode}`;
      let savedHist: any[] = [];
      try {
        const rawH = localStorage.getItem(`hist_${fieldKey}_${oldCode}`);
        if (rawH) savedHist = JSON.parse(rawH);
      } catch {}
      const entry = {
        author: noteMeta.author,
        timestamp: noteMeta.time || new Date().toISOString(),
        ...(Array.isArray(savedHist) && savedHist.length > 0 ? { history: savedHist.slice(-15) } : {})
      };
      setNoteAuthors(prev => {
        const updated = { ...prev, [noteKey]: entry };
        saveNoteAuthors(updated);
        return updated;
      });

      if (globalChannelRef.current && profile?.name) {
        globalChannelRef.current.send({
          type: 'broadcast',
          event: 'update',
          payload: {
            field: 'note_authors',
            dict: { ...noteAuthors, [noteKey]: entry },
            from: profile.name,
            itemKey: oldCode,
            message: `📝 قام ${noteMeta.author} بتحديث الملاحظات`
          }
        });
      }
    }

    const prevItem = reelsDbRows.find(r => r.code === oldCode || r.id === oldCode) || 
      (Array.isArray(liveData) ? liveData.find((r: any) => r.code === oldCode || r.id === oldCode) : null);

    let updatedItem: any;
    let dbPayload: any;
    let isFilmed = false;
    if (activeGid === '0') {
      const isDone = newRowData[14] === 'TRUE' || newRowData[14] === true;
      const isProblem = newRowData[13] === 'TRUE' || newRowData[13] === true;
      const isMissing = newRowData[12] === 'TRUE' || newRowData[12] === true;
      const isCanceled = newRowData[17] === 'TRUE' || newRowData[17] === true;

      updatedItem = {
        date: newRowData[0] || '',
        branch: newRowData[1] || '',
        year: newRowData[2] || '',
        typeCol: newRowData[3] || 'CUT',
        creator: newRowData[4] || '',
        id: newCode,
        code: newCode,
        dataFiles: newRowData[6] || '',
        script: newRowData[7] || '',
        type: newRowData[8] || '',
        format: newRowData[9] || '',
        creatorNotes: newRowData[10] || '',
        editorNotes: newRowData[11] || '',
        missingDetails: isMissing,
        problem: isProblem,
        done: isDone,
        editCheck: prevItem?.editCheck ?? prevItem?.edit_check ?? false,
        edit_check: prevItem?.editCheck ?? prevItem?.edit_check ?? false,
        editor: newRowData[15] || '',
        driveFinal: newRowData[16] || '',
        canceled: isCanceled,
        hardDriveStatus: newRowData[21] !== undefined ? newRowData[21] : undefined,
        uniqueKey: newCode
      };

      dbPayload = {
        date: updatedItem.date,
        branch: updatedItem.branch,
        year: updatedItem.year,
        type_col: updatedItem.typeCol,
        creator: updatedItem.creator,
        code: newCode,
        data_files: updatedItem.dataFiles,
        script: updatedItem.script,
        type: updatedItem.type,
        format: updatedItem.format,
        creator_notes: updatedItem.creatorNotes,
        editor_notes: updatedItem.editorNotes,
        missing_details: isMissing,
        problem: isProblem,
        done: isDone,
        editor: updatedItem.editor,
        drive_final: updatedItem.driveFinal,
        canceled: isCanceled,
        ...(newRowData[21] !== undefined ? { hard_drive_status: newRowData[21] } : {}),
        updated_at: new Date().toISOString()
      };
    } else {
      isFilmed = newRowData[9] === 'TRUE' || newRowData[9] === true;
      const isDone = newRowData[16] === 'TRUE' || newRowData[16] === true;
      const isCanceled = newRowData[18] === 'TRUE' || newRowData[18] === true;
      const isMissing = newRowData[19] === 'TRUE' || newRowData[19] === true;

      updatedItem = {
        date: newRowData[0] || '',
        branch: newRowData[1] || '',
        year: newRowData[2] || '',
        teacher: newRowData[3] || '',
        extraName: newRowData[4] || '',
        id: newCode,
        code: newCode,
        script: newRowData[6] || '',
        type: newRowData[7] || '',
        format: newRowData[8] || '',
        filmed: isFilmed,
        filmingDate: newRowData[10] || '',
        by: newRowData[11] || '',
        storage: newRowData[12] || '',
        notes: newRowData[13] || '',
        editorNotes: newRowData[20] !== undefined ? newRowData[20] : '',
        driveRaw: newRowData[14] || '',
        editorCol: newRowData[15] || '',
        done: isDone,
        driveFinal: newRowData[17] || '',
        canceled: isCanceled,
        missingDetails: isMissing,
        editCheck: prevItem?.editCheck ?? prevItem?.edit_check ?? false,
        edit_check: prevItem?.editCheck ?? prevItem?.edit_check ?? false,
        hardDriveStatus: newRowData[21] !== undefined ? newRowData[21] : undefined,
        uniqueKey: newCode
      };

      dbPayload = {
        date: updatedItem.date,
        branch: updatedItem.branch,
        year: updatedItem.year,
        teacher: updatedItem.teacher,
        extra_name: updatedItem.extraName,
        code: newCode,
        script: updatedItem.script,
        type: updatedItem.type,
        format: updatedItem.format,
        filmed: isFilmed,
        filming_date: updatedItem.filmingDate,
        by: updatedItem.by,
        storage: updatedItem.storage,
        notes: updatedItem.notes,
        editor_notes: updatedItem.editorNotes || '',
        drive_raw: updatedItem.driveRaw,
        editor_col: updatedItem.editorCol,
        done: isDone,
        drive_final: updatedItem.driveFinal,
        canceled: isCanceled,
        missing_details: isMissing,
        ...(newRowData[21] !== undefined ? { hard_drive_status: newRowData[21] } : {}),
        updated_at: new Date().toISOString()
      };
    }

    // ── BULLETPROOF PARTIAL-PATCH GUARD (Prevents stale-tab full-row overwrites!) ──
    // Only send the exact column(s) the user actually changed to Supabase so editing
    // one field (e.g. notes/script/filmed) can NEVER wipe editor/editor_col, done, or drive_final!
    const fieldToDbCol: Record<string, string> = activeGid === '0'
      ? {
          date: 'date',
          branch: 'branch',
          year: 'year',
          typeCol: 'type_col',
          creator: 'creator',
          code: 'code',
          dataFiles: 'data_files',
          script: 'script',
          type: 'type',
          format: 'format',
          creatorNotes: 'creator_notes',
          editorNotes: 'editor_notes',
          missingDetails: 'missing_details',
          problem: 'problem',
          done: 'done',
          editor: 'editor',
          driveFinal: 'drive_final',
          canceled: 'canceled',
          hardDriveStatus: 'hard_drive_status',
        }
      : {
          date: 'date',
          branch: 'branch',
          year: 'year',
          teacher: 'teacher',
          extraName: 'extra_name',
          code: 'code',
          script: 'script',
          type: 'type',
          format: 'format',
          filmed: 'filmed',
          filmingDate: 'filming_date',
          by: 'by',
          storage: 'storage',
          notes: 'notes',
          editorNotes: 'editor_notes',
          driveRaw: 'drive_raw',
          editorCol: 'editor_col',
          editor: 'editor_col',
          done: 'done',
          driveFinal: 'drive_final',
          canceled: 'canceled',
          missingDetails: 'missing_details',
          hardDriveStatus: 'hard_drive_status',
        };

    const allowedItemKeys = new Set<string>(changedFields || []);
    if (newCode && cleanCodePart(newCode) !== cleanCodePart(oldCode)) {
      allowedItemKeys.add('code');
    }

    if (changedFields && changedFields.length > 0) {
      const partialPayload: Record<string, any> = { updated_at: dbPayload.updated_at };
      for (const f of allowedItemKeys) {
        const dbCol = fieldToDbCol[f];
        if (dbCol && dbPayload[dbCol] !== undefined) {
          partialPayload[dbCol] = dbPayload[dbCol];
        }
      }
      dbPayload = partialPayload;

      // Preserve untouched fields from prevItem in optimistic state too!
      if (prevItem) {
        const mergedItem: any = { ...prevItem };
        for (const f of allowedItemKeys) {
          if (f === 'code') {
            mergedItem.code = updatedItem.code;
            mergedItem.id = updatedItem.id;
            mergedItem.uniqueKey = updatedItem.uniqueKey;
          } else if (f === 'editor' && activeGid !== '0') {
            mergedItem.editorCol = updatedItem.editorCol;
          } else if (updatedItem[f] !== undefined) {
            mergedItem[f] = updatedItem[f];
          }
        }
        updatedItem = mergedItem;
        isFilmed = updatedItem.filmed === true || updatedItem.filmed === 'TRUE';
      }
    } else if (prevItem) {
      // Fallback for any legacy caller without changedFields: diff against prevItem
      // and NEVER allow silently wiping editor / editor_col / drive_final!
      const partialPayload: Record<string, any> = { updated_at: dbPayload.updated_at };
      for (const [itemKey, dbCol] of Object.entries(fieldToDbCol)) {
        if (dbPayload[dbCol] === undefined) continue;
        const prevVal = prevItem[itemKey] ?? prevItem[dbCol] ?? '';
        const nextVal = dbPayload[dbCol];
        if (String(prevVal ?? '') !== String(nextVal ?? '')) {
          // Extra guard: if legacy caller tries to wipe editor/drive_final to empty, skip
          if ((dbCol === 'editor' || dbCol === 'editor_col' || dbCol === 'drive_final') && String(prevVal).trim() && !String(nextVal || '').trim()) {
            continue;
          }
          partialPayload[dbCol] = nextVal;
        }
      }
      dbPayload = partialPayload;
    }

    // Guard: Prevent marketing users (both juniors and managers) from modifying Done or removing/modifying Final Link in VE (1939073164) and Cuts (0)
    if (activeGid === '1939073164' || activeGid === '0') {
      const isVideoTeam = profile?.team?.toLowerCase() === 'video';
      const isMarketingTeam = profile?.team?.toLowerCase() === 'marketing' && profile?.role !== 'admin';
      const canModifyDone = (isVideoTeam || profile?.role === 'admin') && !isMarketingTeam;
      const canEditFinal = (isVideoTeam || profile?.role === 'admin') && !isMarketingTeam;

      if (updatedItem.done !== prevItem?.done && !canModifyDone) {
        const msg = prevItem?.done 
          ? "غير مسموح لتيم الماركتينج بإلغاء Done 🔒 (المسموح لك فقط هو طلب تعديل عبر زر EDIT)"
          : "تعديل حالة Done خاص بفريق الفيديو فقط 🎬🔒";
        if (toast && toast.error) toast.error(msg);
        return;
      }

      const prevFinal = String(prevItem?.driveFinal || prevItem?.drive_final || '').trim();
      const nextFinal = String(updatedItem.driveFinal || updatedItem.drive_final || '').trim();
      if (!canEditFinal && prevFinal && prevFinal !== nextFinal) {
        const msg = "غير مسموح لتيم الماركتينج بإزالة أو تعديل رابط الفاينال 🎬🔒 (خاص بتيم الفيديو فقط)";
        if (toast && toast.error) toast.error(msg);
        return;
      }
    }

    // 1. Optimistic UI update
    setReelsDbRows(prev => prev.map(r => (r.code === oldCode || r.id === oldCode) ? updatedItem : r));
    setLiveData((prev: any[]) => {
      if (!Array.isArray(prev)) return prev;
      return prev.map((row: any) => (row.id === oldCode || row.code === oldCode) ? updatedItem : row);
    });

    // Broadcast Realtime activity for task subscribers & instant multi-account sync:
    const taskNameStr = updatedItem.code || updatedItem.script || oldCode;
    const altKeysArr = [oldCode, newCode, updatedItem.id, updatedItem.code, updatedItem.uniqueKey, updatedItem.script].filter(Boolean);

    // Record Audit Trail for Sensitive Actions:
    if (updatedItem.done !== prevItem?.done) {
      if (!updatedItem.done && prevItem?.done) {
        recordAuditLog(profile, 'done_unmarked', newCode, 'قام بفك علامة Done عن الريل (إعادة فتحه)');
      } else if (updatedItem.done && !prevItem?.done) {
        recordAuditLog(profile, 'done_marked', newCode, 'قام بتعليم الريل كمكتمل Done');
      }
    }
    if (updatedItem.driveFinal !== prevItem?.driveFinal) {
      if (!updatedItem.driveFinal?.trim() && prevItem?.driveFinal?.trim()) {
        recordAuditLog(profile, 'drive_final_cleared', newCode, `قام بحذف رابط الفاينال (السابق: ${prevItem.driveFinal})`);
      } else if (updatedItem.driveFinal?.trim()) {
        recordAuditLog(profile, 'drive_final_updated', newCode, `قام بتحديث رابط الفاينال إلى: ${updatedItem.driveFinal}`);
      }
    }
    if (updatedItem.canceled !== prevItem?.canceled) {
      if (updatedItem.canceled) {
        recordAuditLog(profile, 'canceled', newCode, 'قام بإلغاء الريل');
      } else {
        recordAuditLog(profile, 'restore', newCode, 'قام باستعادة الريل الملغي');
      }
    }
    if (updatedItem.missingDetails !== prevItem?.missingDetails) {
      if (updatedItem.missingDetails) {
        recordAuditLog(profile, 'missing_details', newCode, 'حدد تفاصيل ناقصة على الريل');
      }
    }
    const prevEditorAudit = String(prevItem?.editorCol ?? prevItem?.editor ?? '').trim();
    const nextEditorAudit = String(updatedItem?.editorCol ?? updatedItem?.editor ?? '').trim();
    if (nextEditorAudit !== prevEditorAudit && (dbPayload.editor !== undefined || dbPayload.editor_col !== undefined)) {
      if (!nextEditorAudit && prevEditorAudit) {
        recordAuditLog(profile, 'editor_cleared', newCode, `قام بإزالة اسم المونتير (السابق: ${prevEditorAudit})`);
      } else {
        recordAuditLog(profile, 'editor_updated', newCode, `قام بتغيير المونتير من "${prevEditorAudit || 'بدون'}" إلى "${nextEditorAudit}"`);
      }
    }

    broadcastTaskActivity({
      itemKey: oldCode,
      altKeys: altKeysArr,
      taskName: taskNameStr,
      message: (updatedItem.notes !== prevItem?.notes && updatedItem.notes?.trim()) 
        ? `📝 أضاف ملاحظة: "${updatedItem.notes.slice(0, 60)}${updatedItem.notes.length > 60 ? '...' : ''}"`
        : (updatedItem.editorNotes !== prevItem?.editorNotes && updatedItem.editorNotes?.trim())
        ? `🎬 أضاف ملاحظات مونتير: "${updatedItem.editorNotes.slice(0, 60)}${updatedItem.editorNotes.length > 60 ? '...' : ''}"`
        : (updatedItem.missingDetails !== prevItem?.missingDetails)
        ? (updatedItem.missingDetails ? `🔍 حدد تفاصيل ناقصة للمهمة` : `✅ ألغى علامة التفاصيل الناقصة`)
        : (updatedItem.done !== prevItem?.done)
        ? (updatedItem.done ? `✅ تم إنهاء المهمة بنجاح` : `↩️ تم إعادة فتح المهمة`)
        : (updatedItem.canceled !== prevItem?.canceled)
        ? (updatedItem.canceled ? `❌ تم إلغاء المهمة` : `↩️ تم إلغاء إلغاء المهمة`)
        : (updatedItem.editorCol !== prevItem?.editorCol && updatedItem.editorCol)
        ? `👤 أسند المهمة للمحرر: ${updatedItem.editorCol}`
        : (updatedItem.driveFinal !== prevItem?.driveFinal && updatedItem.driveFinal?.trim())
        ? `🔗 تم إرفاق رابط الفاينال النهائي`
        : `✏️ تم تحديث بيانات المهمة`,
      type: (updatedItem.notes !== prevItem?.notes && updatedItem.notes?.trim()) ? 'note'
        : (updatedItem.editorNotes !== prevItem?.editorNotes && updatedItem.editorNotes?.trim()) ? 'editor_notes'
        : (updatedItem.missingDetails !== prevItem?.missingDetails) ? 'missing_details'
        : (updatedItem.done !== prevItem?.done) ? (updatedItem.done ? 'done' : 'undone')
        : (updatedItem.canceled !== prevItem?.canceled) ? (updatedItem.canceled ? 'cancel' : 'uncancel')
        : (updatedItem.editorCol !== prevItem?.editorCol) ? 'editor'
        : (updatedItem.driveFinal !== prevItem?.driveFinal) ? 'final_link'
        : 'activity',
      updatedItem: updatedItem
    });

    // 2. Direct Supabase Update (with collision guard + VE code rename sync if code changed)
    if (tbl) {
      try {
        if (newCode && cleanCodePart(newCode) !== cleanCodePart(oldCode)) {
          let verifiedNewCode = newCode;
          const checkClaim = await resolveAndClaimUniqueCodeFromDb({
            year: updatedItem.year,
            teacher: updatedItem.teacher,
            extraName: activeGid === '0' ? updatedItem.creator : updatedItem.extraName,
            isCut: activeGid === '0',
            excludeCode: oldCode,
            localKnownCodes: allReelsCodesSet,
            sequenceRegistry,
            manualCustomCode: newCode,
          });

          if (checkClaim.duplicateConflict) {
            const freshClaim = await resolveAndClaimUniqueCodeFromDb({
              year: updatedItem.year,
              teacher: updatedItem.teacher,
              extraName: activeGid === '0' ? updatedItem.creator : updatedItem.extraName,
              isCut: activeGid === '0',
              excludeCode: oldCode,
              localKnownCodes: allReelsCodesSet,
              sequenceRegistry,
            });
            verifiedNewCode = freshClaim.code;
            setSequenceRegistry(freshClaim.registry);
          } else {
            verifiedNewCode = checkClaim.code;
            setSequenceRegistry(checkClaim.registry);
          }

          dbPayload.code = verifiedNewCode;
          updatedItem.code = verifiedNewCode;
          updatedItem.id = verifiedNewCode;
          updatedItem.uniqueKey = verifiedNewCode;
          setReelsDbRows(prev => prev.map(r => (r.code === oldCode || r.id === oldCode || r.code === newCode) ? updatedItem : r));

          // If renaming a Shooting row that already exists in VE, rename VE row in-place to avoid duplicate VE rows
          if (activeGid === '1436746012') {
            const { data: targetVeExists } = await supabase
              .from('reels_ve_26')
              .select('code')
              .ilike('code', verifiedNewCode)
              .maybeSingle();
            if (!targetVeExists) {
              await supabase
                .from('reels_ve_26')
                .update({
                  code: verifiedNewCode,
                  year: updatedItem.year,
                  teacher: updatedItem.teacher,
                  extra_name: updatedItem.extraName,
                  updated_at: new Date().toISOString(),
                })
                .ilike('code', oldCode);
              setReelsDbByGid(prev => {
                const veList = prev['1939073164'];
                if (!Array.isArray(veList)) return prev;
                return {
                  ...prev,
                  '1939073164': veList.map((vr: any) =>
                    cleanCodePart(vr.code) === cleanCodePart(oldCode)
                      ? { ...vr, id: verifiedNewCode, code: verifiedNewCode, uniqueKey: verifiedNewCode, year: updatedItem.year, teacher: updatedItem.teacher, extraName: updatedItem.extraName }
                      : vr
                  ),
                };
              });
            }
          }
        }

        const { error } = await supabase
          .from(tbl)
          .update(dbPayload)
          .eq('code', oldCode);

        if (error) {
          console.warn(`Error updating ${tbl} in Supabase (retrying without optional columns):`, error);
          const fallbackPayload = { ...dbPayload };
          delete (fallbackPayload as any).editor_notes;
          const { error: retryErr } = await supabase.from(tbl).update(fallbackPayload).eq('code', oldCode);
          if (retryErr) {
            console.error(`Fatal update error in ${tbl}:`, retryErr);
            toast.error(`خطأ أثناء الحفظ في قاعدة البيانات: ${retryErr.message}`);
          } else {
            toast.success("تم تحديث الصف بنجاح في Supabase! 🚀");
          }
        } else {
          toast.success("تم تحديث الصف بنجاح في Supabase! 🚀");
        }

        // Telegram Notifications Trigger (Done / Edits)
        const currentEditor = updatedItem.editorCol || updatedItem.editor || '';
        const taskTitle = updatedItem.script || updatedItem.extraName || updatedItem.code || 'مهمة بدون عنوان';
        const taskCode = updatedItem.code || updatedItem.id || '';
        const sourceSheet = activeGid === '1939073164' ? 'Reels (Ve)' : activeGid === '0' ? 'Cuts' : activeGid === '1436746012' ? 'Shooting' : 'Dashboard';
        const taskDriveLink = updatedItem.driveFinal || updatedItem.driveRaw || '';
        const taskNotes = updatedItem.notes || '';

        // 1. Task Completed Notification
        if (updatedItem.done === true && prevItem?.done !== true) {
          // Always notify the current logged-in user who just marked it Done (so they receive instant confirmation/testing alert!)
          getUserTelegramChatId(profile?.id, profile?.name).then(async (myChatId) => {
            if (myChatId) {
              const res = await notifyTaskCompleted({
                chatId: myChatId,
                taskTitle,
                taskCode,
                sourceSheet,
                branch: updatedItem.branch,
                editorName: currentEditor || profile?.name || 'غير محدد',
                driveLink: taskDriveLink,
                notes: taskNotes
              });
              if (res.ok) toast.success('✈️ تم إرسال إشعار إنجاز المهمة إلى تليجرام!');
            }

            // Also notify the assigned editor if they are a different user and have Telegram linked
            if (currentEditor && currentEditor !== 'غير محدد' && currentEditor !== '---' && currentEditor !== profile?.name) {
              const editorChatId = await getUserTelegramChatId(undefined, currentEditor);
              if (editorChatId && editorChatId !== myChatId) {
                notifyTaskCompleted({
                  chatId: editorChatId,
                  taskTitle,
                  taskCode,
                  sourceSheet,
                  branch: updatedItem.branch,
                  editorName: currentEditor,
                  driveLink: taskDriveLink,
                  notes: taskNotes
                }).catch(console.error);
              }
            }

            // Also notify Admin (Eslam) if someone other than Admin marked it Done
            const cleanActor = (profile?.name || '').trim().toLowerCase();
            const isAdminActor = cleanActor === 'admin' || cleanActor === 'eslam' || cleanActor === 'eslam abdalhamid';
            if (!isAdminActor) {
              const adminChatId = await getUserTelegramChatId(undefined, 'admin') || await getUserTelegramChatId(undefined, 'eslam');
              if (adminChatId && adminChatId !== myChatId) {
                notifyTaskCompleted({
                  chatId: adminChatId,
                  taskTitle: `🎬 [تسليم جديد]: ${taskTitle}`,
                  taskCode,
                  sourceSheet,
                  branch: updatedItem.branch,
                  editorName: currentEditor || profile?.name || 'محرر',
                  driveLink: taskDriveLink,
                  notes: taskNotes
                }).catch(console.error);
              }
            }
          }).catch(console.error);
        }
        // 2. Missing Details Notification (تفاصيل ناقصة)
        else if (updatedItem.missingDetails === true && prevItem?.missingDetails !== true) {
          const missingNotes = updatedItem.editorNotes || updatedItem.notes || 'يرجى مراجعة وتوفير التفاصيل والملفات الناقصة لإتمام المهمة 🔍';
          const creatorName = updatedItem.creator || updatedItem.extraName || '';

          (async () => {
            try {
              const sentChatIds = new Set<string>();

              // Notify the logged-in user who marked missing details
              if (profile?.id || profile?.name) {
                const myChatId = await getUserTelegramChatId(profile?.id, profile?.name);
                if (myChatId) {
                  sentChatIds.add(myChatId);
                  const res = await notifyTaskEditRequested({
                    chatId: myChatId,
                    taskTitle,
                    taskCode,
                    sourceSheet,
                    branch: updatedItem.branch,
                    editorName: currentEditor || profile?.name || 'غير محدد',
                    driveLink: taskDriveLink,
                    notes: missingNotes,
                    statusLabel: '🔍 تفاصيل ناقصة مطلوبة ⚠️'
                  });
                  if (res.ok) toast.success('✈️ تم إرسال إشعار التفاصيل الناقصة على تليجرام!');
                }
              }

              // Notify Creator
              if (creatorName && creatorName !== 'غير محدد' && creatorName !== '---') {
                const crChatId = await getUserTelegramChatId(undefined, creatorName);
                if (crChatId && !sentChatIds.has(crChatId)) {
                  sentChatIds.add(crChatId);
                  notifyTaskEditRequested({
                    chatId: crChatId,
                    taskTitle,
                    taskCode,
                    sourceSheet,
                    branch: updatedItem.branch,
                    editorName: currentEditor || 'غير محدد',
                    driveLink: taskDriveLink,
                    notes: missingNotes,
                    statusLabel: '🔍 تفاصيل ناقصة مطلوبة ⚠️'
                  }).catch(console.error);
                }
              }

              // Notify Editor
              if (currentEditor && currentEditor !== 'غير محدد' && currentEditor !== '---') {
                const edChatId = await getUserTelegramChatId(undefined, currentEditor);
                if (edChatId && !sentChatIds.has(edChatId)) {
                  sentChatIds.add(edChatId);
                  notifyTaskEditRequested({
                    chatId: edChatId,
                    taskTitle,
                    taskCode,
                    sourceSheet,
                    branch: updatedItem.branch,
                    editorName: currentEditor,
                    driveLink: taskDriveLink,
                    notes: missingNotes,
                    statusLabel: '🔍 تفاصيل ناقصة مطلوبة ⚠️'
                  }).catch(console.error);
                }
              }

              // Notify Admin
              const cleanActor = (profile?.name || '').trim().toLowerCase();
              const isAdminActor = cleanActor === 'admin' || cleanActor === 'eslam' || cleanActor === 'eslam abdalhamid';
              if (!isAdminActor) {
                const adminChatId = await getUserTelegramChatId(undefined, 'admin') || await getUserTelegramChatId(undefined, 'eslam');
                if (adminChatId && !sentChatIds.has(adminChatId)) {
                  sentChatIds.add(adminChatId);
                  notifyTaskEditRequested({
                    chatId: adminChatId,
                    taskTitle: `[تفاصيل ناقصة]: ${taskTitle}`,
                    taskCode,
                    sourceSheet,
                    branch: updatedItem.branch,
                    editorName: currentEditor || 'غير محدد',
                    driveLink: taskDriveLink,
                    notes: missingNotes,
                    statusLabel: '🔍 تفاصيل ناقصة مطلوبة ⚠️'
                  }).catch(console.error);
                }
              }
            } catch (tgErr) {
              console.warn('[Telegram] Error triggering missingDetails notifications:', tgErr);
            }
          })();
        }
        // 3. Task Has Edits / Problem / Canceled Notification
        else if (
          (updatedItem.problem === true && prevItem?.problem !== true) ||
          (updatedItem.canceled === true && prevItem?.canceled !== true) ||
          (updatedItem.editCheck === true && prevItem?.editCheck !== true)
        ) {
          const editNotes = updatedItem.creatorNotes || updatedItem.editorNotes || updatedItem.notes || 'مطلوب مراجعة وتعديل المهمة 📝';
          const creatorName = updatedItem.creator || updatedItem.extraName || '';
          const statusLbl = updatedItem.canceled ? 'تم إلغاء المهمة 🚫' : updatedItem.problem ? 'مشكلة في التاسك ❌' : 'مطلوب تعديل (EDIT) ⚠️';

          (async () => {
            try {
              const sentChatIds = new Set<string>();

              // Notify the actor
              if (profile?.id || profile?.name) {
                const myChatId = await getUserTelegramChatId(profile?.id, profile?.name);
                if (myChatId) {
                  sentChatIds.add(myChatId);
                  const res = await notifyTaskEditRequested({
                    chatId: myChatId,
                    taskTitle,
                    taskCode,
                    sourceSheet,
                    branch: updatedItem.branch,
                    editorName: currentEditor || profile?.name || 'محرر المهمة',
                    driveLink: taskDriveLink,
                    notes: editNotes,
                    statusLabel: statusLbl
                  });
                  if (res.ok) toast.success('✈️ تم إرسال إشعار التعديل على تليجرام!');
                }
              }

              // Notify Editor
              if (currentEditor && currentEditor !== 'غير محدد' && currentEditor !== '---') {
                const edChatId = await getUserTelegramChatId(undefined, currentEditor);
                if (edChatId && !sentChatIds.has(edChatId)) {
                  sentChatIds.add(edChatId);
                  notifyTaskEditRequested({
                    chatId: edChatId,
                    taskTitle,
                    taskCode,
                    sourceSheet,
                    branch: updatedItem.branch,
                    editorName: currentEditor,
                    driveLink: taskDriveLink,
                    notes: editNotes,
                    statusLabel: statusLbl
                  }).catch(console.error);
                }
              }

              // Notify Creator
              if (creatorName && creatorName !== 'غير محدد' && creatorName !== '---') {
                const crChatId = await getUserTelegramChatId(undefined, creatorName);
                if (crChatId && !sentChatIds.has(crChatId)) {
                  sentChatIds.add(crChatId);
                  notifyTaskEditRequested({
                    chatId: crChatId,
                    taskTitle,
                    taskCode,
                    sourceSheet,
                    branch: updatedItem.branch,
                    editorName: currentEditor || 'غير محدد',
                    driveLink: taskDriveLink,
                    notes: editNotes,
                    statusLabel: statusLbl
                  }).catch(console.error);
                }
              }

              // Notify Admin
              const cleanActor = (profile?.name || '').trim().toLowerCase();
              const isAdminActor = cleanActor === 'admin' || cleanActor === 'eslam' || cleanActor === 'eslam abdalhamid';
              if (!isAdminActor) {
                const adminChatId = await getUserTelegramChatId(undefined, 'admin') || await getUserTelegramChatId(undefined, 'eslam');
                if (adminChatId && !sentChatIds.has(adminChatId)) {
                  sentChatIds.add(adminChatId);
                  notifyTaskEditRequested({
                    chatId: adminChatId,
                    taskTitle: `[${statusLbl}]: ${taskTitle}`,
                    taskCode,
                    sourceSheet,
                    branch: updatedItem.branch,
                    editorName: currentEditor || 'محرر المهمة',
                    driveLink: taskDriveLink,
                    notes: editNotes,
                    statusLabel: statusLbl
                  }).catch(console.error);
                }
              }
            } catch (tgErr) {
              console.warn('[Telegram] Error triggering edit/problem notifications:', tgErr);
            }
          })();
        }

        // Automatic copy / sync to Ve table (reels_ve_26) when filmed in Shooting tab (Preserves VE edits!)
        if (activeGid === '1436746012') {
          const wasPreviouslyFilmed = Boolean(prevItem?.filmed === true || prevItem?.filmed === 'TRUE');
          await syncShootingItemToVe(updatedItem, isFilmed, wasPreviouslyFilmed, updatedItem.filmingDate);
        } else if (activeGid === '1939073164' || activeGid === '0') {
          notifyCoreCountsChanged([activeGid]);
        }

        // Two-way sync: If editing in VE tab, sync ONLY the changed shared fields back to Shooting tab!
        if (activeGid === '1939073164') {
          const sharedSyncCols = ['notes', 'by', 'storage', 'type', 'format', 'editor_col', 'done', 'drive_final'];
          const shootingSyncPatch: Record<string, any> = {};
          for (const col of sharedSyncCols) {
            if (dbPayload[col] !== undefined) {
              shootingSyncPatch[col] = dbPayload[col];
            }
          }
          if (Object.keys(shootingSyncPatch).length > 0) {
            shootingSyncPatch.updated_at = new Date().toISOString();
            await supabase.from('reels_shooting_26').update(shootingSyncPatch).or(`code.eq."${oldCode}",code.eq."${newCode}",code.eq."${updatedItem.code}"`);
          }
        }
      } catch (err: any) {
        console.error(err);
      }
      return;
    }

    const token = session?.access_token || profile?.id;
    if (!token) return;
    try {
      const res = await fetch('/api/reels/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ oldCode, rowData: newRowData })
      });
      if (!res.ok) { const text = await res.text(); throw new Error('Failed to update row: ' + res.status + ' ' + text); }

      toast.success("تم تحديث الصف بنجاح!");
    } catch (err: any) {
      console.error(err);
      toast.error("حدث خطأ أثناء التحديث: " + err.message);
    }
  };

  const handleFilmedToggle = async (item: any, isFilmed: boolean) => {
    const itemCode = item.code || item.id;
    if (!itemCode) {
      alert("لا يمكن تعديل هذا الصف لعدم وجود كود (Code)");
      return;
    }

    const tbl = REELS_TABLE_MAP[activeGid];
    const todayStr = new Date().toLocaleDateString('en-US');
    const filmingDate = isFilmed ? (item.filmingDate || todayStr) : item.filmingDate;

    // Optimistic UI update
    setReelsDbRows(prev => prev.map(row => (row.id === itemCode || row.code === itemCode) ? { ...row, filmed: isFilmed, filmingDate } : row));
    setLiveData((prev: any[]) => prev.map((row: any) => (row.id === itemCode || row.code === itemCode) ? { ...row, filmed: isFilmed, filmingDate } : row));
    
    if (activeGid === '1436746012') {
      setStageUncompletedCounts(prev => {
        const cur = prev['1939073164'] || 0;
        const nextVal = Math.max(0, cur + (isFilmed ? 1 : -1));
        const next = { ...prev, ['1939073164']: nextVal };
        try { localStorage.setItem('stage_uncompleted_counts_cache_v1', JSON.stringify(next)); } catch {}
        return next;
      });
      if (isFilmed) {
        setActiveVeToast({ item: { ...item, filmed: isFilmed, filmingDate } });
      }
    }

    // Broadcast Realtime activity for subscribers
    broadcastTaskActivity({
      itemKey: itemCode,
      altKeys: [item.code, item.id, item.uniqueKey, item.script],
      taskName: item.code || item.script || itemCode,
      message: isFilmed ? `🎥 تم تحديد تصوير المهمة` : `🎥 تم إلغاء تحديد تصوير المهمة`,
      type: 'filmed'
    });

    if (tbl) {
      try {
        const { error } = await supabase
          .from(tbl)
          .update({ filmed: isFilmed, filming_date: filmingDate, updated_at: new Date().toISOString() })
          .eq('code', itemCode);

        if (error) throw error;
        toast.success(isFilmed ? "تم تحديد التصوير بنجاح! 🎥" : "تم إلغاء تحديد التصوير");

        if (activeGid === '1436746012') {
          const wasPreviouslyFilmed = Boolean(item?.filmed === true || item?.filmed === 'TRUE');
          await syncShootingItemToVe(item, isFilmed, wasPreviouslyFilmed, filmingDate);
        }
      } catch (err: any) {
        console.error(err);
        toast.error("حدث خطأ أثناء التحديث: " + err.message);
      }
      return;
    }

    const token = session?.access_token || profile?.id;
    if (!token) return;

    try {
      const res = await fetch('/api/reels/filmed', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code: itemCode, filmed: isFilmed })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update filmed status');
      refresh(true);
    } catch (err: any) {
      setLiveData((prev: any[]) => prev.map((row: any) => (row.id === itemCode || row.code === itemCode) ? { ...row, filmed: !isFilmed } : row));
      alert(err.message || "حدث خطأ أثناء التحديث");
    }
  };

  const handleToggleEditCheck = async (item: any, nextVal: boolean) => {
    const rowCode = item.code || item.id;
    if (!rowCode) return;
    if (item.editCheck || item.edit_check) {
      if (toast && toast.error) {
        toast.error("تم طلب تعديل مسبقاً لهذا الصف (مسموح بطلب تعديل مرة واحدة فقط) 🔒");
      }
      return;
    }

    // 1. Optimistic UI update: editCheck = true, and uncheck done if it was done!
    setReelsDbRows(prev => prev.map(r => (r.code === rowCode || r.id === rowCode) ? { ...r, editCheck: true, edit_check: true, done: false } : r));
    setLiveData((prev: any[]) => {
      if (!Array.isArray(prev)) return prev;
      return prev.map((r: any) => (r.code === rowCode || r.id === rowCode) ? { ...r, editCheck: true, edit_check: true, done: false } : r);
    });
    setReelsDbByGid(prev => {
      const next = { ...prev };
      const gidsToSync = activeGid === '0' ? ['0'] : ['1436746012', '1939073164'];
      for (const gid of gidsToSync) {
        const list = next[gid];
        if (Array.isArray(list)) {
          next[gid] = list.map((r: any) =>
            (r.code === rowCode || r.id === rowCode) ? { ...r, editCheck: true, edit_check: true, done: false } : r
          );
        }
      }
      return next;
    });

    // Broadcast Realtime activity for subscribers
    broadcastTaskActivity({
      itemKey: rowCode,
      altKeys: [item.code, item.id, item.uniqueKey, item.script],
      taskName: item.code || item.script || rowCode,
      message: `⚠️ طلب تعديلاً (EDIT) على المهمة`,
      type: 'edit_check'
    });

    // 2. Direct Supabase update (sync both reels_ve_26 and reels_shooting_26 when in VE or Shooting)
    const nowIso = new Date().toISOString();
    const targetTable = activeGid === '0' ? 'reels_cuts_26' : activeGid === '1436746012' ? 'reels_shooting_26' : 'reels_ve_26';
    try {
      const { error } = await supabase
        .from(targetTable)
        .update({ 
          edit_check: true, 
          done: false, 
          updated_at: nowIso 
        })
        .eq('code', rowCode);

      if (activeGid === '1436746012') {
        await supabase
          .from('reels_ve_26')
          .update({ edit_check: true, done: false, updated_at: nowIso })
          .ilike('code', rowCode);
      } else if (activeGid === '1939073164') {
        await supabase
          .from('reels_shooting_26')
          .update({ edit_check: true, done: false, updated_at: nowIso })
          .ilike('code', rowCode);
      }

      if (error) {
        console.error(`Error updating edit_check in ${targetTable}:`, error);
        toast.error(`خطأ أثناء الحفظ في قاعدة البيانات: ${error.message}`);
      } else {
        toast.success("⚠️ تم تسجيل طلب التعديل (EDIT) وإعادة فتح المهمة!");
        notifyCoreCountsChanged(activeGid === '0' ? ['0'] : ['1436746012', '1939073164']);

        // Telegram Notification for Edit Request
        const editorName = item.editor_col || item.editor || item.editorCol || '';
        const creatorName = item.extra_name || item.creator || item.extraName || '';
        const taskTitle = item.script || item.extra_name || item.code || rowCode;
        const taskCode = item.code || rowCode;
        const taskNotes = item.editor_notes || item.notes || 'مطلوب مراجعة وتعديل المونتاج 📝';
        const taskDrive = item.drive_final || item.drive_raw || '';
        const sheetName = activeGid === '1939073164' ? 'Reels (Ve)' : activeGid === '0' ? 'Cuts' : 'Shooting';

        (async () => {
          try {
            const sentChatIds = new Set<string>();

            // 1. Notify the logged-in user who clicked EDIT (instant feedback/alert!)
            if (profile?.id || profile?.name) {
              const myChatId = await getUserTelegramChatId(profile?.id, profile?.name);
              if (myChatId) {
                sentChatIds.add(myChatId);
                const res = await notifyTaskEditRequested({
                  chatId: myChatId,
                  taskTitle,
                  taskCode,
                  sourceSheet: sheetName,
                  branch: item.branch,
                  editorName: editorName || profile?.name || 'محرر المهمة',
                  notes: taskNotes,
                  driveLink: taskDrive,
                  statusLabel: '⚠️ طلب تعديل (EDIT) مسجل'
                });
                if (res.ok) toast.success('✈️ تم إرسال إشعار التعديل على تليجرام!');
              }
            }

            // 2. Notify assigned Editor
            if (editorName && editorName !== 'غير محدد' && editorName !== '---') {
              const edChatId = await getUserTelegramChatId(undefined, editorName);
              if (edChatId && !sentChatIds.has(edChatId)) {
                sentChatIds.add(edChatId);
                notifyTaskEditRequested({
                  chatId: edChatId,
                  taskTitle,
                  taskCode,
                  sourceSheet: sheetName,
                  branch: item.branch,
                  editorName: editorName,
                  notes: taskNotes,
                  driveLink: taskDrive,
                  statusLabel: 'مطلوب تعديل (EDIT) ⚠️'
                }).catch(console.error);
              }
            }

            // 3. Notify Creator
            if (creatorName && creatorName !== 'غير محدد' && creatorName !== '---') {
              const crChatId = await getUserTelegramChatId(undefined, creatorName);
              if (crChatId && !sentChatIds.has(crChatId)) {
                sentChatIds.add(crChatId);
                notifyTaskEditRequested({
                  chatId: crChatId,
                  taskTitle,
                  taskCode,
                  sourceSheet: sheetName,
                  branch: item.branch,
                  editorName: editorName || 'غير محدد',
                  notes: taskNotes,
                  driveLink: taskDrive,
                  statusLabel: 'تنبيه: تم طلب تعديل على الريل 📝'
                }).catch(console.error);
              }
            }

            // 4. Notify Admin (if someone other than admin requested)
            const cleanActor = (profile?.name || '').trim().toLowerCase();
            const isAdminActor = cleanActor === 'admin' || cleanActor === 'eslam' || cleanActor === 'eslam abdalhamid';
            if (!isAdminActor) {
              const adminChatId = await getUserTelegramChatId(undefined, 'admin') || await getUserTelegramChatId(undefined, 'eslam');
              if (adminChatId && !sentChatIds.has(adminChatId)) {
                sentChatIds.add(adminChatId);
                notifyTaskEditRequested({
                  chatId: adminChatId,
                  taskTitle: `[طلب تعديل]: ${taskTitle}`,
                  taskCode,
                  sourceSheet: sheetName,
                  branch: item.branch,
                  editorName: editorName || 'غير محدد',
                  notes: taskNotes,
                  driveLink: taskDrive,
                  statusLabel: 'مطلوب تعديل (EDIT) ⚠️'
                }).catch(console.error);
              }
            }
          } catch (tgErr) {
            console.warn('[Telegram] Error triggering edit notifications:', tgErr);
          }
        })();
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleTagmeToggle = (item: any, sheetLabel: string, isChecked: boolean) => {
    const rawKey = item.uniqueKey || generateKey(item);
    const uniqueKey = 'tgm-' + rawKey;

    // 1. Update is_tagme3a in the active stage table in Supabase!
    if (!isDemo && isStageTab) {
      updateStageDbField(activeGid, rawKey, 'isTagme3a', isChecked);
      notifyCoreCountsChanged([activeGid]);
    }

    const dbRecord = {
      unique_key: uniqueKey,
      name: item.name || '',
      filing_name: item.filingName || '---',
      op_sheet: item.opSheet || sheetLabel,
      branch: (item.branch && !item.branch.includes('يوتيوب') && !item.branch.includes('تجميعة')) 
        ? item.branch 
        : (item.extra && !item.extra.includes('يوتيوب') && !item.extra.includes('تجميعة')) 
        ? item.extra 
        : '',
      date: item.date || item.id || new Date().toISOString().split('T')[0],
      notes_marketing: item.notesMarketing || '',
      editor: item.editor || 'غير محدد',
      notes_editors: item.notesEditors || '',
      done: false,
      priority: false,
      cancel: false,
      thumbnail_link: item.thumbnailLink || '',
      time: item.time || '',
      youtube_link: item.youtubeLink || '',
      uploaded: false,
      is_transfer: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!isDemo) {
      setStageUncompletedCounts(prev => {
        const cur = prev['1535230545'] || 0;
        const nextVal = Math.max(0, cur + (isChecked ? 1 : -1));
        const next = { ...prev, ['1535230545']: nextVal };
        try { localStorage.setItem('stage_uncompleted_counts_cache_v1', JSON.stringify(next)); } catch {}
        return next;
      });

      if (isChecked) {
        // 1. Direct Supabase Client upsert to tagme3at_26
        supabase
          .from('tagme3at_26')
          .upsert(dbRecord, { onConflict: 'unique_key' })
          .then(({ error }) => {
            if (error) console.error('Error upserting tagme3at_26 transfer:', error);
            else notifyCoreCountsChanged(['1535230545']);
          });

        // 2. Optimistic local state update for instant UI feedback
        const mappedTagme = {
          uniqueKey: dbRecord.unique_key,
          id: dbRecord.unique_key,
          name: dbRecord.name,
          filingName: dbRecord.filing_name,
          opSheet: dbRecord.op_sheet,
          branch: dbRecord.branch,
          date: dbRecord.date,
          notesMarketing: dbRecord.notes_marketing,
          editor: dbRecord.editor,
          notesEditors: dbRecord.notes_editors,
          done: false,
          priority: false,
          cancel: false,
          thumbnailLink: dbRecord.thumbnail_link,
          time: dbRecord.time,
          youtubeLink: dbRecord.youtube_link,
          uploaded: false,
          isTransfer: true,
          createdAt: dbRecord.created_at,
          updatedAt: dbRecord.updated_at
        };
        setTagmeDbRows(prev => [mappedTagme, ...prev.filter(x => x.uniqueKey !== uniqueKey)]);
      } else {
        // Direct Supabase Client delete from tagme3at_26
        supabase
          .from('tagme3at_26')
          .delete()
          .eq('unique_key', uniqueKey)
          .then(({ error }) => {
            if (error) console.error('Error deleting tagme3at_26 transfer:', error);
            else notifyCoreCountsChanged(['1535230545']);
          });

        setTagmeDbRows(prev => prev.filter(x => x.uniqueKey !== uniqueKey));
      }
    }

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
          isTagmeTransfer: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
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
          const itemToPost = updatedList[0];
          fetch('/api/tagme3at', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(itemToPost) }).catch(() => {});
        } else if (!isChecked) {
          fetch(`/api/tagme3at?uniqueKey=${uniqueKey}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }).catch(() => {});
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

      // If there are already selected items, enforce SAME teacher & SAME stage
      if (prev.length > 0) {
        const firstItem = prev[0];
        const firstTeacher = (firstItem.teacher || '').trim();
        const itemTeacher = (item.teacher || '').trim();

        if (firstTeacher && itemTeacher && firstTeacher.toLowerCase() !== itemTeacher.toLowerCase()) {
          toast.error(`⚠️ لا يمكن دمج دروس لمدرسين مختلفين! تم تحديد دروس للمدرس "${firstTeacher}". يرجى اختيار دروس نفس المدرس فقط ("كل مدرس لوحده").`);
          return prev;
        }

        const firstStage = getTargetStageGid(firstItem).gid;
        const itemStage = getTargetStageGid(item).gid;
        if (firstStage && itemStage && firstStage !== itemStage) {
          toast.error(`⚠️ لا يمكن دمج دروس لمراحل دراسية مختلفة! يرجى اختيار دروس نفس المرحلة فقط.`);
          return prev;
        }
      }

      return [...prev, item];
    });
  };

  const handleExecuteMerge = async () => {
    if (selectedForMerge.length === 0) return;

    // Strict safety check: Ensure all selected items belong to the EXACT same teacher & stage
    const uniqueTeachers = Array.from(new Set(selectedForMerge.map(i => (i.teacher || '').trim().toLowerCase()).filter(Boolean)));
    if (uniqueTeachers.length > 1) {
      toast.error('❌ خطأ: تم اختيار دروس لمدرسين مختلفين! يرجى دمج دروس كل مدرس على حدة.');
      return;
    }
    const uniqueStages = Array.from(new Set(selectedForMerge.map(i => getTargetStageGid(i).gid)));
    if (uniqueStages.length > 1) {
      toast.error('❌ خطأ: تم اختيار دروس لمراحل دراسية مختلفة! يرجى دمج دروس مرحلة واحدة فقط.');
      return;
    }

    const sortedSelected = sortTasksByChunkAscending(selectedForMerge);
    const sample = sortedSelected[0];
    const stage = getTargetStageGid(sample);
    
    const combinedCodes = sortedSelected.map(i => i.filingName || i.name).join('\n');
    const combinedNames = sortedSelected.map(i => i.name).join(' | ');
    const uniqueKey = 'merge-' + Date.now();

    const totalDurationStr = calculateTotalDuration(sortedSelected).replace('⏱️ إجمالي الوقت: ', '').trim();

    const mergedItem = {
      uniqueKey: uniqueKey,
      id: uniqueKey,
      name: combinedCodes,
      filingName: combinedNames,
      val: sample.year || sample.term || 'YouTube Merge',
      idVal: sample.date || sample.teacher || '---',
      date: sample.date || new Date().toISOString().split('T')[0],
      subject: getSubjectFromFiling(combinedCodes),
      extra: '',
      branch: '',
      opSheet: '2025/2026',
      check1: false,
      check2: false,
      isYoutubeTransfer: true,
      time: totalDurationStr !== '--:--' ? totalDurationStr : '',
      week: 'أسبوع 1',
      isTagme3a: false,
      delivered: false,
      thumbnailLink: '',
      youtubeLink: '',
      uploaded: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const targetTable = STAGE_TABLE_MAP[stage.gid];
    if (!isDemo && targetTable) {
      try {
        await supabase.from(targetTable).insert([{
          unique_key: uniqueKey,
          name: mergedItem.name,
          filing_name: mergedItem.filingName,
          week: mergedItem.week,
          date: mergedItem.date,
          subject: mergedItem.subject,
          branch: mergedItem.branch,
          op_sheet: mergedItem.opSheet,
          is_tagme3a: false,
          delivered: false,
          thumbnail_link: '',
          time: mergedItem.time,
          youtube_link: '',
          uploaded: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

        if (activeGid === stage.gid) {
          setStageDbRows(prev => [mergedItem, ...prev.filter(x => x.uniqueKey !== uniqueKey)]);
        }
      } catch (err) {
        console.error('Error inserting merged lesson to Supabase stage table:', err);
      }
    }

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

  const handleYoutubeToggle = async (item: any, isChecked: boolean) => {
    const stage = getTargetStageGid(item);
    const uniqueKey = 'yt-' + (item.uniqueKey || generateKey(item));
    const targetTable = STAGE_TABLE_MAP[stage.gid];

    const itemDuration = item.exactDuration || formatDuration((item.finalMinutes && String(item.finalMinutes).trim() !== '0') ? item.finalMinutes : item.rawMinutes) || item.time || '';
    const newItem = {
      uniqueKey: uniqueKey,
      id: uniqueKey,
      name: `[يوتيوب] ${item.filingName || item.name}`,
      filingName: item.name,
      val: item.year || item.term || 'YouTube',
      idVal: item.date || item.teacher || '---',
      date: item.date || new Date().toISOString().split('T')[0],
      subject: getSubjectFromFiling(item.filingName),
      extra: '',
      branch: '',
      opSheet: '2025/2026',
      check1: false,
      check2: false,
      isYoutubeTransfer: true,
      time: itemDuration,
      week: 'أسبوع 1',
      isTagme3a: false,
      delivered: false,
      thumbnailLink: '',
      youtubeLink: '',
      uploaded: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!isDemo && targetTable) {
      try {
        if (isChecked) {
          await supabase.from(targetTable).upsert([{
            unique_key: uniqueKey,
            name: newItem.name,
            filing_name: newItem.filingName,
            week: newItem.week,
            date: newItem.date,
            subject: newItem.subject,
            branch: newItem.branch,
            op_sheet: newItem.opSheet,
            is_tagme3a: false,
            delivered: false,
            thumbnail_link: '',
            time: newItem.time,
            youtube_link: '',
            uploaded: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }], { onConflict: 'unique_key' });

          if (activeGid === stage.gid) {
            setStageDbRows(prev => [newItem, ...prev.filter(x => x.uniqueKey !== uniqueKey)]);
          }
        } else {
          await supabase.from(targetTable).delete().eq('unique_key', uniqueKey);
          if (activeGid === stage.gid) {
            setStageDbRows(prev => prev.filter(x => x.uniqueKey !== uniqueKey));
          }
        }
      } catch (err) {
        console.error('Error updating stage table in Supabase for youtube transfer:', err);
      }
    }

    setYoutubeItems(prev => {
      const currentList = prev[stage.gid] || [];
      let updatedList;
      if (isChecked) {
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
    { label: 'الرئيسية', gid: 'home', icon: Home, colorHex: '#6366f1' },
    { label: 'OP 25/26', gid: '1476192399', icon: Briefcase, colorHex: '#8b5cf6' },
    { label: 'OP 26/27', gid: 'op_27', icon: Briefcase, colorHex: '#3b82f6' },
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
    { label: 'إدارة الفريق والقوائم', gid: 'designers-team-management', icon: Users, colorHex: '#06b6d4' },
  ];

  const reelsStages = [
    { label: 'الرئيسية', gid: 'home', icon: Home, colorHex: '#6366f1' },
    { label: 'Shooting', gid: '1436746012', icon: Video, colorHex: '#b49fee' },
    { label: 'Ve', gid: '1939073164', icon: Video, colorHex: '#92dcf7' },
    { label: 'CUTS', gid: '0', icon: Video, colorHex: '#ff7843' },
    { label: 'إدارة المحررين والقوائم', gid: 'editors-team-management', icon: Users, colorHex: '#f43f5e' },
    { label: 'احصائيات الريلز', gid: 'reels-analytics', icon: BarChart3, colorHex: '#818cf8' },
    { label: 'Calendar', gid: 'reels-calendar', icon: Calendar, colorHex: '#10b981' },
    { label: 'Teachers', gid: 'reels-teachers', icon: GraduationCap, colorHex: '#06b6d4' },
  ];

  useEffect(() => {
    if (combinedData.length === 0) return;
    
    const currentNames = new Set<string>();
    combinedData.forEach(item => {
      currentNames.add(item.uniqueKey || generateKey(item));
    });

    const previousSeen = seenItemsRef.current[activeGid];
    if (!previousSeen) {
      seenItemsRef.current[activeGid] = currentNames;
      return;
    }
    
    const newlyAdded: any[] = [];
    combinedData.forEach((item) => {
      const key = item.uniqueKey || generateKey(item);
      if (!previousSeen.has(key)) {
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
        const finalNew = Array.from(map.values()).slice(-20);
        try {
          localStorage.setItem(`new_items_${activeGid}`, JSON.stringify(finalNew));
        } catch (e) {}
        return finalNew;
      });
    }

    seenItemsRef.current[activeGid] = currentNames;
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
    if (isOperations || isTagme3at || isAnalyticsTagme || isReelsAnalytics || isStudioCalendar) return [];
    const sourceData = isStageTab ? combinedData : liveData;
    const set = new Set(sourceData.map((i: any) => i.week ? String(i.week).trim() : '').filter(Boolean));
    return Array.from(set) as string[];
  }, [liveData, combinedData, isStageTab, isOperations, isTagme3at, isAnalyticsTagme, isReelsAnalytics, isStudioCalendar]);

  const stageUploadedCount = useMemo(() => {
    if (!isStage || !Array.isArray(combinedData)) return 0;
    return combinedData.filter((item: any) => 
      item.delivered === true || item.check2 === true || item.received === true || item.uploaded === true || item.uploaded === 'TRUE' || item.uploaded === 'true'
    ).length;
  }, [isStage, combinedData]);

  const stageNotUploadedCount = useMemo(() => {
    if (!isStage || !Array.isArray(combinedData)) return 0;
    return combinedData.filter((item: any) => 
      !(item.delivered === true || item.check2 === true || item.received === true || item.uploaded === true || item.uploaded === 'TRUE' || item.uploaded === 'true')
    ).length;
  }, [isStage, combinedData]);

  const stageReviewsCount = useMemo(() => {
    if (!isStage || !Array.isArray(combinedData)) return 0;
    return combinedData.filter((item: any) => {
      const weekStr = String(item.week || '');
      const nameStr = String(item.name || item.filingName || '');
      return weekStr.includes('مراجعة') || weekStr.includes('مراجعات') || nameStr.includes('مراجعة') || nameStr.includes('مراجعات');
    }).length;
  }, [isStage, combinedData]);


  const tagmeStatusCounts = useMemo(() => {
    if (!isTagme3at || !Array.isArray(combinedData)) return { All: 0, Pending: 0, Done: 0, Unassigned: 0, Missing: 0 };
    let all = 0, pending = 0, done = 0, unassigned = 0, missing = 0;

    combinedData.forEach((item: any) => {
      all++;
      const itemKey = item.uniqueKey || generateKey(item);
      const stOverride = taskStatuses?.[itemKey] || taskStatuses?.[item.uniqueKey] || taskStatuses?.[item.id];
      const isDone = stOverride?.done !== undefined ? Boolean(stOverride.done) : (item.done === true || item.done === 'TRUE' || String(item.done) === 'true');
      const isMissing = stOverride?.missingDetails !== undefined ? Boolean(stOverride.missingDetails) : (item.missingDetails === true || item.missing_details === true || item.cancel === true || String(item.cancel) === 'true');
      const isAssigned = isAssignedEditor(item.editor);

      if (isMissing) missing++;
      if (isDone) {
        done++;
      } else {
        pending++;
        if (!isMissing && !isAssigned) {
          unassigned++;
        }
      }
    });

    return { All: all, Pending: pending, Done: done, Unassigned: unassigned, Missing: missing };
  }, [isTagme3at, combinedData, taskStatuses]);

  const reelsStatusCounts = useMemo(() => {
    if (!isReelsStage) return { All: 0, Done: 0, Missing: 0, Canceled: 0, Filmed: 0, Pending: 0 };
    
    let all = 0, done = 0, missing = 0, canceled = 0, filmed = 0, pending = 0, unassigned = 0;

    combinedData.forEach((item: any) => {
      const searchVal = searchQuery.trim().toLowerCase();
      const normSearch = searchVal.replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ');
      const codeStr = String(item.code || item.id || item.name || '').toLowerCase();
      const normCode = codeStr.replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ');

      const matchesSearch = !searchVal ||
        (normCode && normCode.includes(normSearch)) ||
        (codeStr && codeStr.includes(searchVal)) ||
        (item.name && String(item.name).toLowerCase().includes(searchVal)) ||
        (item.filingName && String(item.filingName).toLowerCase().includes(searchVal)) ||
        (item.id && String(item.id).toLowerCase().includes(searchVal)) ||
        (item.code && String(item.code).toLowerCase().includes(searchVal)) ||
        (item.extraName && String(item.extraName).toLowerCase().includes(searchVal)) ||
        (item.script && String(item.script).toLowerCase().includes(searchVal)) ||
        (item.val && String(item.val).toLowerCase().includes(searchVal)) ||
        (item.teacher && String(item.teacher).toLowerCase().includes(searchVal)) ||
        (item.editor && String(item.editor).toLowerCase().includes(searchVal)) ||
        (item.subject && String(item.subject).toLowerCase().includes(searchVal)) ||
        (item.branch && String(item.branch).toLowerCase().includes(searchVal)) ||
        (item.notesMarketing && String(item.notesMarketing).toLowerCase().includes(searchVal)) ||
        (item.notesEditors && String(item.notesEditors).toLowerCase().includes(searchVal));

      if (!matchesSearch) return;

      if (isMyTasksOnly && currentUserName && !searchVal) {
        const me = currentUserName.toLowerCase().trim();
        const meFirstName = me.split(/[\s._-]+/)[0];
        
        const aliases = new Set<string>();
        aliases.add(me);
        if (meFirstName.length > 2) aliases.add(meFirstName);
        if (profile?.email) {
          const ep = profile.email.split('@')[0].toLowerCase().trim();
          aliases.add(ep);
          const epFirst = ep.split(/[\s._-]+/)[0];
          if (epFirst.length > 2) aliases.add(epFirst);
        }
        if (profile?.username) aliases.add(profile.username.toLowerCase().trim());
        if (aliases.has('eslam') || aliases.has('admin')) {
          aliases.add('eslam');
          aliases.add('admin');
        }
        if (aliases.has('sherif') || aliases.has('shrief') || aliases.has('شريف') || aliases.has('shrieeali') || (profile?.email && profile.email.includes('shrieeali'))) {
          aliases.add('sherif');
          aliases.add('shrief');
          aliases.add('شريف');
          aliases.add('shereef');
          aliases.add('sharif');
          aliases.add('shrieeali');
        }
        if (aliases.has('esraa') || aliases.has('esraaaboelkheir')) {
          aliases.add('esraa');
          aliases.add('esraaaboelkheir');
          aliases.add('esraa abo elkheir');
        }
        if (aliases.has('ramy') || aliases.has('ramyelnagar')) {
          aliases.add('ramy');
          aliases.add('ramyelnagar');
          aliases.add('ramy elnaggar');
        }
        if (aliases.has('yomna') || aliases.has('yomana')) {
          aliases.add('yomna');
          aliases.add('yomana');
        }
        if (aliases.has('donia') || aliases.has('donia 2')) {
          aliases.add('donia');
          aliases.add('donia 2');
        }
        if (aliases.has('manar') || aliases.has('manarr')) {
          aliases.add('manar');
          aliases.add('manarr');
        }

        const aliasList = Array.from(aliases);

        const matchesVal = (val: string) => {
          if (!val || val === 'غير محدد' || val === '---') return false;
          const clean = val.toLowerCase().trim();
          return aliasList.some(a => clean === a || clean.includes(a) || a.includes(clean));
        };

        const editor = String(item.editor || '');
        const by = String(item.by || '');
        const editorCol = String(item.editorCol || '');
        const creator = String(item.creator || '');
        const code = String(item.code || item.name || item.filingName || item.val || item.id || '').toLowerCase();
        const notes = `${item.notes || ''} ${item.notesMarketing || ''} ${item.notesEditors || ''} ${item.creatorNotes || ''}`.toLowerCase();

        const codeTokens = code.split(/[-_/\s]+/);
        const codeMatches = codeTokens.some(tok => tok.length > 2 && aliasList.some(a => tok === a || a.startsWith(tok) || tok.startsWith(a)));
        const notesMatches = aliasList.some(a => a.length > 2 && (notes.includes(`المبتكر: ${a}`) || notes.includes(a)));

        const isAssignedToMe = matchesVal(editor) || matchesVal(by) || matchesVal(editorCol) || matchesVal(creator) || codeMatches || notesMatches;
        if (!isAssignedToMe) return;
      }

      for (const key in colFilters) {
        const val = colFilters[key];
        if (val && val !== 'All') {
          if (key === 'filmed') {
            const isFilmedItem = item.filmed === true || item.filmed === 'TRUE' || String(item.filmed).toLowerCase() === 'true';
            if (val === 'اتصور' && !isFilmedItem) return;
            if (val === 'لم يتصور' && isFilmedItem) return;
          } else if (key === 'done') {
            const isItemDone = item.done === true || item.done === 'TRUE' || String(item.done).toLowerCase() === 'true';
            if ((val === 'Done' || val === 'TRUE' || val === 'تم') && !isItemDone) return;
            if ((val === 'Not Done' || val === 'FALSE' || val === 'Pending' || val === 'غير مكتمل') && isItemDone) return;
          } else if (key === 'branch') {
            const norm = (s: string) => {
              let t = String(s || '').trim().toLowerCase();
              t = t.replace(/[إأآا]/g, 'ا').replace(/ة/g, 'ه');
              if (t.startsWith('ال')) t = t.slice(2);
              return t;
            };
            if (norm(item.branch) !== norm(val)) return;
          } else if (key === 'filmingDate' || key === 'date') {
            const normDate = (d: string) => {
              if (!d) return '';
              const clean = String(d).trim().split('T')[0];
              const parts = clean.includes('/') ? clean.split('/') : clean.includes('-') ? clean.split('-') : [];
              if (parts.length === 3) {
                if (parts[0].length === 4) {
                  return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}/${parts[0]}`;
                } else {
                  return `${parseInt(parts[0], 10)}/${parseInt(parts[1], 10)}/${parts[2]}`;
                }
              }
              return clean.toLowerCase();
            };
            if (normDate(item[key]) !== normDate(val)) return;
          } else {
            const itemVal = String(item[key] ?? '').trim().toLowerCase();
            const filterVal = String(val).trim().toLowerCase();
            if (itemVal !== filterVal) return;
          }
        }
      }

      all++;
      const isDone = item.done === true || item.done === 'TRUE';
      const isMissing = item.missingDetails === true || item.missingDetails === 'TRUE';
      const isCanceled = item.canceled === true || item.canceled === 'TRUE';
      const isFilmed = item.filmed === true || item.filmed === 'TRUE';

      if (isDone) done++;
      if (isMissing) missing++;
      if (isCanceled) canceled++;
      if (isFilmed) filmed++;
      if (!isDone && !isCanceled) pending++;
      const editorVal = item.editorCol || item.editor || '';
      const isUnassigned = !isAssignedEditor(editorVal);
      if (!isDone && !isCanceled && !isMissing && isUnassigned) unassigned++;
    });

    return { All: all, Done: done, Missing: missing, Canceled: canceled, Filmed: filmed, Pending: pending, Unassigned: unassigned };
  }, [combinedData, isReelsStage, searchQuery, isMyTasksOnly, currentUserName, colFilters]);

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
        const meFirstName = me.split(/[\s._-]+/)[0];
        
        const aliases = new Set<string>();
        aliases.add(me);
        if (meFirstName.length > 2) aliases.add(meFirstName);
        if (profile?.email) {
          const ep = profile.email.split('@')[0].toLowerCase().trim();
          aliases.add(ep);
          const epFirst = ep.split(/[\s._-]+/)[0];
          if (epFirst.length > 2) aliases.add(epFirst);
        }
        if (profile?.username) aliases.add(profile.username.toLowerCase().trim());
        if (aliases.has('eslam') || aliases.has('admin')) {
          aliases.add('eslam');
          aliases.add('admin');
        }
        if (aliases.has('sherif') || aliases.has('shrief') || aliases.has('شريف') || aliases.has('shrieeali') || (profile?.email && profile.email.includes('shrieeali'))) {
          aliases.add('sherif');
          aliases.add('shrief');
          aliases.add('شريف');
          aliases.add('shereef');
          aliases.add('sharif');
          aliases.add('shrieeali');
        }
        if (aliases.has('esraa') || aliases.has('esraaaboelkheir')) {
          aliases.add('esraa');
          aliases.add('esraaaboelkheir');
          aliases.add('esraa abo elkheir');
        }
        if (aliases.has('ramy') || aliases.has('ramyelnagar')) {
          aliases.add('ramy');
          aliases.add('ramyelnagar');
          aliases.add('ramy elnaggar');
        }
        if (aliases.has('yomna') || aliases.has('yomana')) {
          aliases.add('yomna');
          aliases.add('yomana');
        }
        if (aliases.has('donia') || aliases.has('donia 2')) {
          aliases.add('donia');
          aliases.add('donia 2');
        }
        if (aliases.has('manar') || aliases.has('manarr')) {
          aliases.add('manar');
          aliases.add('manarr');
        }

        const aliasList = Array.from(aliases);

        const matchesVal = (val: string) => {
          if (!val || val === 'غير محدد' || val === '---') return false;
          const clean = val.toLowerCase().trim();
          return aliasList.some(a => clean === a || clean.includes(a) || a.includes(clean));
        };

        const editor = String(item.editor || '');
        const by = String(item.by || '');
        const editorCol = String(item.editorCol || '');
        const creator = String(item.creator || '');
        const code = String(item.code || item.name || item.filingName || item.val || item.id || '').toLowerCase();
        const notes = `${item.notes || ''} ${item.notesMarketing || ''} ${item.notesEditors || ''} ${item.creatorNotes || ''}`.toLowerCase();

        const codeTokens = code.split(/[-_/\s]+/);
        const codeMatches = codeTokens.some(tok => tok.length > 2 && aliasList.some(a => tok === a || a.startsWith(tok) || tok.startsWith(a)));
        const notesMatches = aliasList.some(a => a.length > 2 && (notes.includes(`المبتكر: ${a}`) || notes.includes(a)));

        const isAssignedToMe = matchesVal(editor) || matchesVal(by) || matchesVal(editorCol) || matchesVal(creator) || codeMatches || notesMatches;
        if (!isAssignedToMe) return false;
      }

      if (isOperations) {
        if (teacherFilter !== 'All' && String(item.teacher || '').trim().toLowerCase() !== String(teacherFilter).trim().toLowerCase()) return false;
        if (yearFilter !== 'All' && String(item.year || '').trim().toLowerCase() !== String(yearFilter).trim().toLowerCase()) return false;
        if (termFilter !== 'All' && String(item.term || '').trim().toLowerCase() !== String(termFilter).trim().toLowerCase()) return false;
      }
      
      if (isTagme3at && statusFilter !== 'All') {
        const itemKey = item.uniqueKey || generateKey(item);
        const stOverride = taskStatuses?.[itemKey] || taskStatuses?.[item.uniqueKey] || taskStatuses?.[item.id];
        const isDone = stOverride?.done !== undefined ? Boolean(stOverride.done) : (item.done === true || item.done === 'TRUE' || String(item.done) === 'true');
        const isMissing = stOverride?.missingDetails !== undefined ? Boolean(stOverride.missingDetails) : (item.missingDetails === true || item.missing_details === true || item.cancel === true || String(item.cancel) === 'true');
        const isAssigned = isAssignedEditor(item.editor);

        if (statusFilter === 'Done' && !isDone) return false;
        if (statusFilter === 'Pending' && isDone) return false;
        if (statusFilter === 'Missing' && !isMissing) return false;
        if (statusFilter === 'Unassigned') {
          if (isDone || isMissing || isAssigned) return false;
        }
      }

      if (isReelsStage && statusFilter !== 'All') {
        const isDone = item.done === true || item.done === 'TRUE';
        const isMissing = item.missingDetails === true || item.missingDetails === 'TRUE';
        const isCanceled = item.canceled === true || item.canceled === 'TRUE';
        const isFilmed = item.filmed === true || item.filmed === 'TRUE';

        if (statusFilter === 'Done' && !isDone) return false;
        if (statusFilter === 'Missing' && !isMissing) return false;
        if (statusFilter === 'Canceled' && !isCanceled) return false;
        if (statusFilter === 'Filmed' && !isFilmed) return false;
        if (statusFilter === 'Pending' && (isDone || isCanceled)) return false;
        if (statusFilter === 'Unassigned') {
          const editorVal = item.editorCol || item.editor || '';
          const isUnassigned = !isAssignedEditor(editorVal);
          if (isDone || isCanceled || isMissing || !isUnassigned) return false;
        }
      }

      if (isStage && stageWeekFilter !== 'All') {
        if (String(item.week || '').trim().toLowerCase() !== String(stageWeekFilter).trim().toLowerCase()) return false;
      }

      for (const key in colFilters) {
        const val = colFilters[key];
        if (val && val !== 'All') {
          if (key === 'filmed') {
            const isFilmed = item.filmed === true || item.filmed === 'TRUE' || String(item.filmed).toLowerCase() === 'true';
            if (val === 'اتصور' && !isFilmed) return false;
            if (val === 'لم يتصور' && isFilmed) return false;
          } else if (key === 'done') {
            const isItemDone = item.done === true || item.done === 'TRUE' || String(item.done).toLowerCase() === 'true';
            if ((val === 'Done' || val === 'TRUE' || val === 'تم') && !isItemDone) return false;
            if ((val === 'Not Done' || val === 'FALSE' || val === 'Pending' || val === 'غير مكتمل') && isItemDone) return false;
          } else if (key === 'check1') {
            const itemKey = 'tgm-' + (item.uniqueKey || generateKey(item));
            const isTagmeChecked = item.isTagme3a === true || item.check1 === true || String(item.check1).toLowerCase() === 'true' || (tagmeTransfers || []).some((i: any) => i.uniqueKey === itemKey);
            const filterBool = val === 'TRUE';
            if (isTagmeChecked !== filterBool) return false;
          } else if (key === 'uploaded') {
            const isUp = item.delivered === true || item.check2 === true || item.received === true || item.uploaded === true || item.uploaded === 'TRUE' || item.uploaded === 'true';
            const filterBool = val === 'TRUE';
            if (isUp !== filterBool) return false;
          } else if (key === 'monthReviews') {
            const weekStr = String(item.week || '');
            const nameStr = String(item.name || item.filingName || '');
            const isRev = weekStr.includes('مراجعة') || weekStr.includes('مراجعات') || nameStr.includes('مراجعة') || nameStr.includes('مراجعات');
            const filterBool = val === 'TRUE';
            if (isRev !== filterBool) return false;
          } else if (key === 'branch') {
            const norm = (s: string) => {
              let t = String(s || '').trim().toLowerCase();
              t = t.replace(/[إأآا]/g, 'ا').replace(/ة/g, 'ه');
              if (t.startsWith('ال')) t = t.slice(2);
              return t;
            };
            if (norm(item.branch) !== norm(val)) return false;
          } else if (key === 'filmingDate' || key === 'date') {
            const normDate = (d: string) => {
              if (!d) return '';
              const clean = String(d).trim().split('T')[0];
              const parts = clean.includes('/') ? clean.split('/') : clean.includes('-') ? clean.split('-') : [];
              if (parts.length === 3) {
                if (parts[0].length === 4) {
                  return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}/${parts[0]}`;
                } else {
                  return `${parseInt(parts[0], 10)}/${parseInt(parts[1], 10)}/${parts[2]}`;
                }
              }
              return clean.toLowerCase();
            };
            if (normDate(item[key]) !== normDate(val)) return false;
          } else {
            const itemVal = String(item[key] ?? '').trim().toLowerCase();
            const filterVal = String(val).trim().toLowerCase();
            if (itemVal !== filterVal) return false;
          }
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

  const sentinelRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setActiveVisibleRecordsLimit(prev => Math.min(prev + 50, filteredData.length));
      }
    }, { rootMargin: '400px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeVisibleRecordsLimit, filteredData.length]);

  const handleColFilterChange = useCallback((colKey: string, val: string) => {
    if (colKey === 'teacher') {
      setTeacherFilter(val);
    }
    setColFilters(p => {
      const updated = { ...p };
      if (val === 'All') delete updated[colKey];
      else updated[colKey] = val;
      return updated;
    });
  }, []);

  const filterContextValue = useMemo(() => ({
    combinedData,
    liveData,
    colFilters,
    teacherFilter,
    onFilterChange: handleColFilterChange
  }), [combinedData, liveData, colFilters, teacherFilter, handleColFilterChange]);

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
          <th className="px-3 py-4 text-center th-style"><ColFilter colKey="branch" label="الفرع" /></th>
          <th className="px-3 py-4 text-center th-style">Marketing Notes</th>
          <th className="px-3 py-4 text-center th-style" id="tour-tagme-editor-col"><ColFilter colKey="editor" label="Editor" /></th>
          <th className="px-3 py-4 text-center th-style">Status</th>
          {!isSimple && <th className="px-3 py-4 text-center th-style">Editor Notes</th>}
          <th className="px-8 py-4 text-center th-style text-purple-400 font-bold" id="tour-priority-col">Priority</th>
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
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="done" label="DONE" /></th>
        <th className="px-3 py-4 text-center th-style" id="tour-cuts-edit-col">EDIT</th>
        <th className="px-4 py-4 text-center th-style"><ColFilter colKey="editor" label="Editor" /></th>
        <th className="px-4 py-4 text-center th-style">Drive Link (Final)</th>
        <th className="px-3 py-4 text-center th-style">CANCELO</th>
      </>
    );
    if (activeGid === '1939073164' && veViewMode === 'SIMPLE') return (
      <>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="branch" label="Branch" /></th>
        <th className="px-4 py-4 text-center th-style">code</th>
        <th className="px-8 py-4 text-right th-style">السكريبت</th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="type" label="النوع" /></th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="format" label="المقاس" /></th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="filmed" label="اتصور" /></th>
        <th className="px-5 py-4 text-center th-style">NOTES</th>
        <th className="px-5 py-4 text-center th-style">EDITOR NOTES</th>
        <th className="px-4 py-4 text-center th-style">Drive Link (Raw)</th>
        <th className="px-4 py-4 text-center th-style"><ColFilter colKey="editorCol" label="EDITOR" /></th>
        <th className="px-3 py-4 text-center th-style">تفاصيل ناقصة</th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="done" label="DONE?" /></th>
        <th className="px-3 py-4 text-center th-style">Cancel</th>
        <th className="px-3 py-4 text-center th-style">EDIT</th>
        <th className="px-4 py-4 text-center th-style">Drive Link (Final)</th>
        <th className="px-3 py-4 text-center th-style">Publish</th>
        <th className="px-4 py-4 text-center th-style">Shared Link</th>
      </>
    );
    if (['1436746012', '1939073164', '798246690'].includes(activeGid)) return ( // Shooting, Ve, Counter
      <>
        <th className="px-4 py-4 text-center th-style"><ColFilter colKey="date" label="Date" /></th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="branch" label="Branch" /></th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="year" label="السنة" /></th>
        <th className="px-4 py-4 text-center th-style"><ColFilter colKey="teacher" label="المدرس" /></th>
        <th className="px-4 py-4 text-center th-style"><ColFilter colKey="extraName" label="Creator" /></th>
        <th className="px-4 py-4 text-center th-style">code</th>
        <th className="px-8 py-4 text-right th-style" id="tour-ve-script-col">السكريبت</th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="type" label="النوع" /></th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="format" label="المقاس" /></th>
        <th className="px-3 py-4 text-center th-style" id="tour-shooting-filmed-col"><ColFilter colKey="filmed" label="اتصور" /></th>
        <th className="px-4 py-4 text-center th-style"><ColFilter colKey="filmingDate" label="تاريخ التصوير" /></th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="by" label="BY" /></th>
        <th className="px-4 py-4 text-center th-style"><ColFilter colKey="storage" label="STORAGE" /></th>
        <th className="px-5 py-4 text-center th-style">NOTES</th>
        {activeGid === '1939073164' && (
          <th className="px-5 py-4 text-center th-style">EDITOR NOTES</th>
        )}
        <th className="px-4 py-4 text-center th-style" id="tour-shooting-raw-col">Drive Link (Raw)</th>
        {activeGid === '1939073164' && (
          <>
            <th className="px-4 py-4 text-center th-style"><ColFilter colKey="editorCol" label="EDITOR" /></th>
            <th className="px-3 py-4 text-center th-style">تفاصيل ناقصة</th>
            <th className="px-3 py-4 text-center th-style" id="tour-ve-done-col"><ColFilter colKey="done" label="DONE?" /></th>
            <th className="px-3 py-4 text-center th-style">Cancel</th>
            <th className="px-3 py-4 text-center th-style" id="tour-ve-edit-col">EDIT</th>
          </>
        )}
        {activeGid === '1436746012' && (
          <>
            <th className="px-3 py-4 text-center th-style"><ColFilter colKey="canceled" label="Cancel" /></th>
            <th className="px-3 py-4 text-center th-style">EDIT</th>
          </>
        )}
        <th className="px-4 py-4 text-center th-style" id="tour-ve-final-col">Drive Link (Final)</th>
        <th className="px-3 py-4 text-center th-style">Publish</th>
        <th className="px-4 py-4 text-center th-style">Shared Link</th>
      </>
    );
    // Stage tabs (Junior 4 .. Senior 3)
    return (
      <>
        <th className="px-4 py-4 text-center th-style w-28"><ColFilter colKey="week" label="الأسبوع" /></th>
        <th className="px-4 py-4 text-center th-style w-32"><ColFilter colKey="date" label="التاريخ" /></th>
        <th className="px-8 py-4 text-right th-style">اسم الدرس / OP NAME</th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="subject" label="المادة" /></th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="branch" label="الفرع" /></th>
        <th className="px-3 py-4 text-center th-style"><ColFilter colKey="opSheet" label="OP Sheet" /></th>
        <th className="px-6 py-4 text-center th-style">تجميعه ✓</th>
        <th className="px-6 py-4 text-center th-style">Uploaded ✓</th>
        <th className="px-4 py-4 text-center th-style text-purple-400 font-bold">thumbnail LINK</th>
        <th className="px-4 py-4 text-center th-style text-purple-400 font-bold">time</th>
        <th className="px-4 py-4 text-center th-style text-purple-400 font-bold">لينك اليوتيوب</th>
        <th className="px-4 py-4 text-center th-style text-purple-400 font-bold">UPLOADED?</th>
        <th className="px-3 py-4 text-center th-style text-rose-400/80 font-bold w-14">حذف</th>
      </>
    );
  };

  const ALL_YEARS_LIST = ['j4', 'j5', 'j6', 'm1', 'm2', 'm3', 's1', 's2', 's3', 'x'];

  const ALL_TEACHERS_LIST = [
    'Hossam Elashry',
    'Mahmoud Gaber',
    'shady',
    'samir',
    'abo-elkomsan',
    'zakaria',
    'sakr',
    'mesbah',
    'yasser',
    'khalil',
    'elshamy',
    'elsamdy',
    'helmy',
    'ahmed-hassan',
    'ahmed-saad',
    'teacherX',
    'elmasry',
    'daved',
    'abdalah-reda',
    'muslim',
    'kotb',
    'soliman',
    'nour-elhoda',
    'fady',
    'ahmed-salah',
    'rodaina',
    'eslam',
    'karim',
    'employee',
    'salah-khalf',
    'magdy',
    'aliaa',
    'x',
    'abd-elkader',
    'elhelw',
    'radwa-sc',
    'radwa-ar',
    'ahmed-bakr',
    'caroline',
    'bishoy',
    'AMR',
    'rowan',
    'teacher s1',
    'teacher s2',
    'teacher s3',
    'teacher m1',
    'teacher m2',
    'teacher m3',
    'teacher j1',
    'teacher j2',
    'teacher j3',
    'teacher j4',
    'teacher j5',
    'teacher j6',
    'teacher senior x',
    'teacher junior x',
    'teacher middle x',
    'ahmed sabry',
    'amgad khedr',
    'tamer elaraby',
    'review',
    'ali yousef',
    'gasser mostafa',
    'rewida',
    'attef ramzy',
    'mohamed khamis',
    'abduallah yousry',
    'amr abou elkheir',
    'ahmed yahia',
    'khaled barakat',
    'mohamed hossam',
    'Ekramy',
    'ibrahim hassan',
    'Ali Mahmoud',
    'Eslam Abdelazeem',
    'mohamed ebrahiem',
    'rowida',
    'abanoub',
    'yasmia attallah',
    'nour essam',
    'Mohamed Esmail',
    'fatma ibrahim',
    'bosy magdy',
    'eslam morsy',
    'ehab soliman',
    'ahmed salem',
    'hany elrfay',
    'ahmed-abdallah',
    'mohamed ismail',
    'alaa abd elhakim',
    'salah khalaf',
    'mina fayez',
    'Nesreen',
    'omer hussein',
    'karolin',
    'atef ramzy',
    'mina',
    'alaa abdelhakem',
    'abdelrahman magdy',
    'huda farouk',
    'Hazem Abdallah',
    'Junior X',
    'mahetab',
    'eslam abdelgalil',
    'saleh abozeed',
    'waleed elarby',
    'ehab - sakr',
    'rwan kabbary',
    'mohamed ali'
  ];

  const ALL_CREATORS_LIST = [
    'esraa', 'Maram', 'han', 'nader', 'eman', 'noor', 'Manar', 'yomna',
    'Sohaila', 'hima', 'Ahmed Samir', 'Adham elbadry', 'awney', 'Ramy Elnaggar',
    'nourhan', 'hesham', 'shorouk', 'taher', 'alaa abouobeid', 'ahmed hossam',
    'abdelkarim', 'Sherif', 'alaa medhat', 'donia', 'alaa', 'nada',
    'nourasharaf', 'nourkhaled', 'rawan', 'aya', 'narden', 'khaled',
    'anas', 'Habiba', 'Khalil', 'hassanien'
  ];

  const ALL_TYPES_LIST = ['حواري', 'تمثيلي'];
  const ALL_FORMATS_LIST = ['REEL', 'VIDEO'];
  const ALL_BYS_LIST = ['Khalil', 'Ahmed', 'RAMY', 'Habiba', 'ADHAM', 'Hassanien'];
  const ALL_STORAGES_LIST = ['Alexandria', 'Desouk', 'Cairo'];

  const { uniqueBranches, uniqueYears, uniqueTeachers, uniqueExtraNames, uniqueTypes, uniqueFormats, uniqueBys, uniqueStorages } = useMemo(() => {
    const data = Array.isArray(combinedData) ? combinedData : [];
    const getUnique = (key: string) => Array.from(new Set(data.map((r: any) => String(r[key] || '').trim()).filter(Boolean))).sort();
    return {
      uniqueBranches: ['Alexandria', 'Cairo', 'Desouk'],
      uniqueYears: Array.from(new Set([...ALL_YEARS_LIST, ...getUnique('year').map(y => y.toLowerCase())])),
      uniqueTeachers: Array.from(new Set([...ALL_TEACHERS_LIST, ...getUnique('teacher')])),
      uniqueExtraNames: (() => {
        const set = new Set<string>();
        const seenLower = new Set<string>();
        const addClean = (val: string) => {
          const clean = String(val || '').trim();
          const lower = clean.toLowerCase();
          if (clean && !seenLower.has(lower)) {
            seenLower.add(lower);
            set.add(clean);
          }
        };
        (liveCreators || []).forEach(addClean);
        ALL_CREATORS_LIST.forEach(addClean);
        const fromData = activeGid === '0' ? getUnique('creator') : getUnique('extraName');
        fromData.forEach(addClean);
        return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      })(),
      uniqueTypes: activeGid === '0' ? Array.from(new Set(['CUT', ...getUnique('type')])) : Array.from(new Set([...ALL_TYPES_LIST, ...getUnique('type').filter(t => t.toUpperCase() !== 'CUT')])),
      uniqueFormats: Array.from(new Set([...ALL_FORMATS_LIST, ...getUnique('format')])),
      uniqueBys: Array.from(new Set([...ALL_BYS_LIST, ...getUnique('by')])),
      uniqueStorages: Array.from(new Set([...ALL_STORAGES_LIST, ...getUnique('storage')])),
    };
  }, [combinedData, activeGid, liveCreators]);

  const yearOptions = useMemo(() => {
    const list = new Set(ALL_YEARS_LIST);
    uniqueYears.forEach(y => {
      if (y && y.trim()) list.add(y.trim().toLowerCase());
    });
    return Array.from(list);
  }, [uniqueYears]);

  const teacherOptions = useMemo(() => {
    const list = new Set(ALL_TEACHERS_LIST);
    uniqueTeachers.forEach(t => {
      if (t && t.trim()) list.add(t.trim());
    });
    return Array.from(list);
  }, [uniqueTeachers]);

  const reelsOptionsLists = useMemo(() => ({
    branches: uniqueBranches,
    years: uniqueYears,
    teachers: uniqueTeachers,
    extraNames: uniqueExtraNames,
    types: uniqueTypes,
    formats: uniqueFormats,
    bys: uniqueBys,
    storages: uniqueStorages,
    editors: editorsList
  }), [uniqueBranches, uniqueYears, uniqueTeachers, uniqueExtraNames, uniqueTypes, uniqueFormats, uniqueBys, uniqueStorages, editorsList]);

  const cutsOptionsLists = useMemo(() => ({
    branches: uniqueBranches,
    years: uniqueYears,
    types: uniqueTypes,
    formats: uniqueFormats,
    editors: editorsList,
    extraNames: uniqueExtraNames
  }), [uniqueBranches, uniqueYears, uniqueTypes, uniqueFormats, editorsList, uniqueExtraNames]);

  const colSpan = isOperations ? 7 : isTagme3at ? (tagmeViewMode === 'SIMPLE' ? 8 : 13) : isStageTab ? 13 : activeGid === '0' ? 18 : activeGid === '1939073164' ? (veViewMode === 'SIMPLE' ? 17 : 22) : activeGid === '1436746012' ? 18 : activeGid === '798246690' ? 16 : 7;

  const effectiveLoading = isTagme3at 
    ? (isTagmeDbLoading && tagmeDbRows.length === 0)
    : isStageTab 
    ? (isStageDbLoading && stageDbRows.length === 0)
    : isReelsTableTab 
    ? (isReelsDbLoading && reelsDbRows.length === 0)
    : (loading && liveData.length === 0);

  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#05070a] text-muted gap-3 text-sm font-bold">
          <Loader2 size={22} className="animate-spin text-primary" />
          <span className="arabic-text">جاري تحميل الصفحة...</span>
        </div>
      }
    >
    <div className="flex min-h-screen bg-[#05070a] text-foreground selection:bg-primary/30">
      {/* Floating Reopen Sidebar Button when Collapsed */}
      {isSidebarCollapsed && (
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed(false)}
          className="fixed top-4 left-4 z-50 p-2.5 rounded-2xl bg-primary text-white shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-black"
          title="إظهار القائمة الجانبية"
        >
          <ChevronRight size={16} />
          <span className="hidden sm:inline">القائمة</span>
        </button>
      )}

      {/* Sidebar */}
      <aside className={`${isSidebarCollapsed ? 'w-0 p-0 border-r-0 overflow-hidden opacity-0 pointer-events-none' : 'w-80 border-r border-white/5 p-8 opacity-100'} flex flex-col gap-12 glass-panel shrink-0 z-20 sticky top-0 h-screen transition-all duration-300`}>
        <div className="flex items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-[22px] bg-gradient-to-br from-primary to-indigo-700 flex items-center justify-center shadow-2xl shadow-primary/40 relative group shrink-0">
              <LayoutDashboard className="text-white group-hover:rotate-12 transition-transform duration-500" size={28} />
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-lg tracking-tight leading-tight">Marketing <span className="text-primary">&</span></h1>
              <h1 className="font-black text-lg tracking-tight leading-tight">Video Editors</h1>
              <p className="text-[9px] text-muted mt-1.5 uppercase tracking-[0.4em] font-black opacity-40">Operations Hub</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-muted hover:text-white transition-all cursor-pointer shrink-0"
            title="طي القائمة الجانبية لتوسيع مساحة الجداول"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        <nav className="flex flex-col gap-2 flex-1 overflow-y-auto pr-2 scrollbar-hide">
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border border-white/[0.05] rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">🎨 Colorful UI</span>
              <button
                onClick={() => setColorfulTabs(!colorfulTabs)}
                className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 cursor-pointer ${colorfulTabs ? 'bg-primary shadow-lg shadow-primary/40' : 'bg-white/10 toggle-track-off'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white toggle-knob transition-transform duration-300 ${colorfulTabs ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border border-white/[0.05] rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                {lightMode ? '☀️ Light Mode' : '🌤️ Light Mode'}
              </span>
              <button
                onClick={() => setLightMode(!lightMode)}
                className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 cursor-pointer ${lightMode ? 'bg-amber-500 shadow-lg shadow-amber-500/40' : 'bg-white/10 toggle-track-off'}`}
                title={lightMode ? 'الوضع الفاتح مفعل (مريح للعين) - اضغط للتبديل للوضع الداكن' : 'تفعيل الوضع الفاتح المريح للعين (Light Mode)'}
              >
                <div className={`w-4 h-4 rounded-full bg-white toggle-knob transition-transform duration-300 ${lightMode ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex flex-col gap-2 px-4 py-2.5 bg-white/[0.03] border border-white/[0.05] rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">🎚️ Contrast</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-muted">{uiContrast}%</span>
                  {uiContrast !== 100 && (
                    <button
                      type="button"
                      onClick={() => setUiContrast(100)}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-muted hover:text-white transition-colors cursor-pointer"
                      title="إعادة التباين للوضع الافتراضي (100%)"
                    >
                      100%
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min={75}
                max={125}
                step={1}
                value={uiContrast}
                onChange={(e) => setUiContrast(Number(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-primary bg-white/10"
                title="تقليل أو زيادة حدة التباين (Contrast)"
              />
            </div>
          </div>
          {/* Top Static Tabs */}
          {stages.filter(s => s.gid === 'home' || s.gid === '1476192399' || s.gid === 'op_27' || s.gid === '1535230545').filter(stage => {
            if (stage.gid === 'home') return true;
            if (!profile) return true;
            return PERMISSIONS.canViewTab(profile.role, stage.label, profile.allowed_tabs ?? []);
          }).map((stage) => (
            <SidebarItem
              key={stage.gid}
              icon={stage.icon}
              label={stage.label}
              colorHex={stage.colorHex}
              colorful={colorfulTabs}
              lightMode={lightMode}
              active={activeGid === stage.gid}
              badgeCount={STAGE_WITH_BADGE_MAP[stage.gid] ? stageUncompletedCounts[stage.gid] : undefined}
              inProgressCount={STAGE_WITH_BADGE_MAP[stage.gid] ? stageInProgressCounts[stage.gid] : undefined}
              missingDetailsCount={STAGE_WITH_BADGE_MAP[stage.gid] ? stageMissingDetailsCounts[stage.gid] : undefined}
              showDoneGreenBadge={GREEN_DONE_BADGE_GIDS.has(stage.gid)}
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
          {(() => {
            const MARKETING_LABELS = ['OP 25/26','Operations','OP 26/27','تجميعات','إحصائيات التجميعات 📊','Junior 4','Junior 5','Junior 6','Middle 1','Middle 2','Middle 3','Senior 1','Senior 2','Senior 3'];
            const REELS_LABELS = ['Shooting','Ve','CUTS','إدارة المحررين والقوائم','احصائيات الريلز','Calendar'];
            const DESIGNERS_LABELS = ['Designers','احصائيات تصاميم','إدارة الفريق والقوائم'];
            const tabs = profile?.allowed_tabs ?? [];
            const hasAnyTab = (labels: string[]) => {
              if (!profile || profile.role === 'admin' || profile.role === 'manager') return true;
              if (tabs.length === 0) return true; // no restriction = show all
              return labels.some(l => tabs.some(t => t.toLowerCase() === l.toLowerCase()));
            };
            const visibleModes = (['OP', 'REELS', 'DESIGNERS'] as const).filter(mode => {
              if (mode === 'OP') return hasAnyTab(MARKETING_LABELS);
              if (mode === 'REELS') return hasAnyTab(REELS_LABELS);
              return hasAnyTab(DESIGNERS_LABELS);
            });
            if (visibleModes.length === 0) return null;
            return (
              <div className="mt-2 mb-4 px-1">
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 gap-1">
                  {visibleModes.map((mode) => (
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

                {/* Mini Status Color Guide / دليل ألوان البادجات بخط صغير */}
                <div className="mt-2.5 px-2.5 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between gap-1 text-[9px] text-muted-foreground select-none" dir="rtl">
                  <div className="flex items-center gap-1" title="مهام بدون محرر تنتظر العمل 🔴">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)] shrink-0" />
                    <span className="text-rose-300 font-bold">انتظار</span>
                  </div>
                  <div className="flex items-center gap-1" title="مهام قيد التنفيذ مع محرر ⏳">
                    <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)] shrink-0" />
                    <span className="text-orange-300 font-bold">قيد العمل</span>
                  </div>
                  <div className="flex items-center gap-1" title="مهام بها مشكلة أو تفاصيل ناقصة ⚠️">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)] shrink-0" />
                    <span className="text-amber-300 font-bold">نواقص</span>
                  </div>
                  <div className="flex items-center gap-1" title="اكتملت جميع المهام ✅">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)] shrink-0" />
                    <span className="text-emerald-300 font-bold">مكتمل</span>
                  </div>
                </div>
              </div>
            );
          })()}


          {/* Dynamic Tabs based on Mode */}
          <div className="flex flex-col gap-1">
            {(appMode === 'OP' 
              ? stages.filter(s => s.gid !== '1476192399' && s.gid !== 'op_27' && s.gid !== '1535230545') 
              : appMode === 'REELS' 
              ? reelsStages 
              : designersStages
            )
              .filter(stage => {
                if (!profile) return true;
                return PERMISSIONS.canViewTab(profile.role, stage.label, profile.allowed_tabs ?? []);
              })
              .map((stage) => (
              <SidebarItem
                key={stage.gid}
                icon={stage.icon}
                label={stage.label}
                colorHex={stage.colorHex}
                colorful={colorfulTabs}
                lightMode={lightMode}
                active={activeGid === stage.gid}
                badgeCount={stage.gid === 'reels-calendar' ? (todayCalendarScriptsCount > 0 ? todayCalendarScriptsCount : undefined) : (STAGE_WITH_BADGE_MAP[stage.gid] ? stageUncompletedCounts[stage.gid] : undefined)}
                badgeTitle={stage.gid === 'reels-calendar' ? `${todayCalendarScriptsCount} مواعيد تصوير مسجلة لليوم 🎬📅` : undefined}
                inProgressCount={STAGE_WITH_BADGE_MAP[stage.gid] ? stageInProgressCounts[stage.gid] : undefined}
                missingDetailsCount={STAGE_WITH_BADGE_MAP[stage.gid] ? stageMissingDetailsCounts[stage.gid] : undefined}
                showDoneGreenBadge={GREEN_DONE_BADGE_GIDS.has(stage.gid)}
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


          {/* Users tab for admin and manager */}
          {profile?.role && PERMISSIONS.canManageUsers(profile.role) && (
            <SidebarItem
              key="users"
              icon={Users}
              label="المستخدمين 👥"
              colorHex="#f43f5e"
              colorful={colorfulTabs}
              lightMode={lightMode}
              active={activeGid === '__users__'}
              onClick={() => {
                setActiveGid('__users__');
                setActiveLabel('المستخدمين');
              }}
            />
          )}

          {/* Audit Trail tab for admin and manager */}
          {profile?.role && (profile.role === 'admin' || profile.role === 'manager') && (
            <SidebarItem
              key="audit_trail"
              icon={ShieldAlert}
              label="سجل الرقابة 🛡️"
              colorHex="#38bdf8"
              colorful={colorfulTabs}
              lightMode={lightMode}
              active={activeGid === '__audit_trail__'}
              onClick={() => {
                setActiveGid('__audit_trail__');
                setActiveLabel('سجل الرقابة');
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
              onClick={() => setShowChangePasswordModal(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/30 text-muted hover:text-amber-400 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 shrink-0"
              title="تغيير كلمة المرور"
            >
              <Key size={14} />
            </button>
            <button
              onClick={() => signOut()}
              className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 shrink-0 arabic-text"
              title="تسجيل الخروج"
            >
              <LogOut size={14} />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Users Management Page */}
      {isUsersPage ? (
        <main className="flex-1 flex flex-col min-w-0 bg-[#05070a] p-12 overflow-y-auto">
          <ErrorBoundary inline tabName="إدارة المستخدمين">
            <UserManagement />
          </ErrorBoundary>
        </main>
      ) : isAuditTrailPage ? (
        <main className="flex-1 flex flex-col min-w-0 bg-[#05070a] p-6 sm:p-12 overflow-y-auto">
          <ErrorBoundary inline tabName="سجل الرقابة">
            <AuditTrailView profile={profile} toast={toast} />
          </ErrorBoundary>
        </main>
      ) : (
        <main className="flex-1 flex flex-col min-w-0 bg-[#05070a]">
        <header className="px-12 py-10 flex justify-between items-end bg-background/30 backdrop-blur-3xl relative z-10 border-b border-white/[0.03]">
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

          <div className="flex items-center gap-3">
            {/* Online Users Live Indicator */}
            <button
              onClick={() => {
                if (profile?.role && PERMISSIONS.canManageUsers(profile.role)) {
                  setActiveGid('__users__');
                  setActiveLabel('المستخدمين');
                }
              }}
              className="px-3.5 py-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 group"
              title={`${onlineCount} مستخدم فاتح الموقع في هذه اللحظة — اضغط لعرض إدارة المستخدمين`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="font-mono font-black text-white">{onlineCount}</span>
              <span className="hidden md:inline text-[11px] text-emerald-300/80 group-hover:text-emerald-200">متصل الآن 🟢</span>
            </button>

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
                                n.type === 'edit_check' ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' :
                                n.type === 'missing_details' ? 'bg-orange-500/15 border-orange-500/30 text-orange-400' :
                                n.type === 'editor_notes' ? 'bg-teal-500/15 border-teal-500/30 text-teal-400' :
                                n.type === 'marketing_note' ? 'bg-sky-500/15 border-sky-500/30 text-sky-400' :
                                n.type === 'final_link' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                                n.type === 'filmed' ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' :
                                n.type === 'priority' ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' :
                                n.type === 'editor' ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400' :
                                n.type === 'new_entry' ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' :
                                n.type === 'tagme_transfer' ? 'bg-purple-500/15 border-purple-500/30 text-purple-400' :
                                n.type === 'subscribe' ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' :
                                n.type === 'unsubscribe' ? 'bg-white/5 border-white/10 text-muted' :
                                'bg-blue-500/15 border-blue-500/30 text-blue-400'
                              }`}>
                                {n.type === 'done' ? '✅ مكتملة' : 
                                 n.type === 'cancel' ? '❌ ملغاة' : 
                                 n.type === 'undone' ? '↩️ تراجع' : 
                                 n.type === 'edit_check' ? '⚠️ طلب تعديل' :
                                 n.type === 'missing_details' ? '🔍 تفاصيل ناقصة' :
                                 n.type === 'editor_notes' ? '🎬 ملاحظات مونتير' :
                                 n.type === 'marketing_note' ? '💬 ملاحظات تسويق' :
                                 n.type === 'final_link' ? '🔗 رابط فاينال' :
                                 n.type === 'filmed' ? '🎥 تصوير' :
                                 n.type === 'priority' ? '🚨 أولوية' :
                                 n.type === 'editor' ? '👤 إسناد محرر' :
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

            {/* Feedback & Bug Report Button */}
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/5 hover:scale-105 active:scale-95"
              title="إرسال ملاحظة / بلاغ عن مشكلة (Feedback)"
            >
              <MessageSquarePlus size={20} className="text-indigo-400" />
              <span className="text-xs font-black arabic-text hidden xl:inline">فيدباك / ملاحظة</span>
            </button>




            {profile?.role && PERMISSIONS.canSync(profile.role) && (
              <button onClick={() => refresh()} className="btn-glass px-7 py-3.5 rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest cursor-pointer hover:scale-105 active:scale-95 transition-all">
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                <span>Synchronize</span>
              </button>
            )}
            {profile?.role && activeGid === '1436746012' && (
              <button
                onClick={() => setShowGoogleSheetImportModal(true)}
                className="px-6 py-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-widest flex items-center gap-2.5 shadow-lg shadow-emerald-500/5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="استيراد صفوف وسكريبتات من شيت جوجل خارجي إلى جدول التصوير"
              >
                <FileSpreadsheet size={18} className="text-emerald-400" />
                <span>Import from Google Sheet</span>
              </button>
            )}

            {profile?.role && activeGid !== '1939073164' && (activeGid === '1436746012' || activeGid === '0' || PERMISSIONS.canAddEntry(profile.role)) && (
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
                  <button 
                    type="button"
                    disabled={isSubmittingAdd}
                    onClick={() => setShowAddModal(false)} 
                    className="text-muted hover:text-white p-2 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <XCircle size={22} />
                  </button>
                </div>

                <form 
                  onSubmit={handleAddSubmit} 
                  onKeyDown={e => {
                    // Prevent accidental premature submit while typing
                    if (e.key === 'Enter' && (e.target as HTMLElement)?.tagName === 'INPUT') {
                      e.preventDefault();
                    }
                  }}
                  className="space-y-4"
                >
                  {['1436746012', '1939073164', '798246690', '0'].includes(activeGid) ? (
                    <>
                      {/* ⚡ Quick Presets Bar (آخر الإدخالات السريعة — محفوظة + تلقائية من آخر الريلز) */}
                      {activeGid === '1436746012' && (() => {
                        const combinedPresets: ShootingQuickPreset[] = [...shootingQuickPresets];
                        const seenIds = new Set(combinedPresets.map(p => p.id));
                        if (combinedPresets.length < 4 && Array.isArray(reelsDbRows)) {
                          for (const r of reelsDbRows) {
                            if (combinedPresets.length >= 4) break;
                            const b = String(r.branch || '').trim();
                            const y = String(r.year || '').trim().toLowerCase();
                            const t = String(r.teacher || '').trim();
                            const ex = String(r.extraName || '').trim();
                            const tp = String(r.type || '').trim();
                            const fm = String(r.format || '').trim();
                            if (!t || !y || !tp) continue;
                            const pid = `${b}|${y}|${t}|${ex}|${tp}|${fm}`.toLowerCase();
                            if (seenIds.has(pid)) continue;
                            seenIds.add(pid);
                            combinedPresets.push({ id: pid, branch: b || 'Alexandria', year: y, teacher: t, extraName: ex, type: tp, format: fm || 'REEL' });
                          }
                        }
                        if (combinedPresets.length === 0) return null;
                        return (
                          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-amber-300 arabic-text flex items-center gap-1">
                                <span>⚡ آخر الإدخالات السريعة (ضغطة واحدة)</span>
                              </span>
                              <span className="text-[9px] text-muted arabic-text">تملأ الفرع + السنة + المدرس + النوع + المقاس</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {combinedPresets.map(p => {
                                const isSaved = shootingQuickPresets.some(sp => sp.id === p.id);
                                return (
                                  <div
                                    key={p.id}
                                    className="group inline-flex items-center gap-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 transition-all"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShootingAddForm(prev => ({
                                          ...prev,
                                          branch: p.branch,
                                          year: p.year,
                                          teacher: p.teacher,
                                          extraName: p.extraName || prev.extraName,
                                          type: p.type,
                                          format: p.format
                                        }));
                                        toast.success(`⚡ تم تطبيق: ${p.teacher} · ${p.year.toUpperCase()}`);
                                      }}
                                      className="px-2.5 py-1 text-[10px] font-bold text-indigo-200 hover:text-white cursor-pointer arabic-text flex items-center gap-1"
                                    >
                                      <span>{p.teacher}</span>
                                      <span className="opacity-50">·</span>
                                      <span className="font-mono uppercase">{p.year}</span>
                                      <span className="opacity-50">·</span>
                                      <span>{p.type}</span>
                                      <span className="opacity-50">·</span>
                                      <span>{p.format}</span>
                                    </button>
                                    {isSaved && (
                                      <button
                                        type="button"
                                        onClick={() => removeShootingQuickPreset(p.id)}
                                        className="pl-1.5 pr-1 py-1 text-white/40 hover:text-rose-400 cursor-pointer text-[10px]"
                                        title="حذف من الاختصارات"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

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

                      <div className="grid grid-cols-2 gap-4 items-end">
                        <div className="relative">
                          <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">النوع (Type)</label>
                          <InlineCombobox
                            options={uniqueTypes}
                            value={shootingAddForm.type}
                            onChange={(val: string) => setShootingAddForm({...shootingAddForm, type: val})}
                            placeholder="اختر النوع"
                          />
                        </div>
                        <div className="relative">
                          <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">المقاس (Format)</label>
                          <InlineCombobox
                            options={uniqueFormats}
                            value={shootingAddForm.format}
                            onChange={(val: string) => setShootingAddForm({...shootingAddForm, format: val})}
                            placeholder="اختر المقاس"
                          />
                        </div>
                      </div>

                      {/* Mode Switcher for Shooting: Single vs Bulk Add 🚀 */}
                      {activeGid === '1436746012' && (
                        <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-white/[0.03] border border-white/10">
                          <div className="flex items-center gap-1.5 w-full">
                            <button
                              type="button"
                              onClick={() => setIsBulkAddMode(false)}
                              className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer arabic-text ${
                                !isBulkAddMode
                                  ? 'bg-primary text-white shadow-sm'
                                  : 'text-muted hover:text-white hover:bg-white/5'
                              }`}
                            >
                              📝 إضافة فردية (ريل واحد)
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsBulkAddMode(true)}
                              className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer arabic-text flex items-center justify-center gap-1.5 ${
                                isBulkAddMode
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'text-muted hover:text-white hover:bg-white/5'
                              }`}
                            >
                              <span>🚀 إضافة أكتر من سكريبت</span>
                              <span className="px-1.5 py-0.5 rounded bg-black/20 text-[9px]">عدة روابط</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {activeGid === '1436746012' && isBulkAddMode ? (
                        <div className="space-y-3 p-4 rounded-2xl bg-emerald-500/[0.05] border border-emerald-500/25">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <label className="text-xs font-black text-emerald-300 arabic-text">
                              🚀 الزق روابط Google Docs هنا (كل رابط في سطر)
                            </label>
                            <span className="text-[10px] text-muted arabic-text">
                              اختياري: تقدر تكتب <span className="font-mono text-white/70">اسم السكريبت | الرابط</span>
                            </span>
                          </div>
                          <textarea
                            rows={5}
                            dir="ltr"
                            value={bulkLinksText}
                            onChange={e => {
                              setBulkLinksText(e.target.value);
                              if (bulkPreviewItems.length > 0) setBulkPreviewItems([]);
                            }}
                            placeholder={`https://docs.google.com/document/d/...\nhttps://docs.google.com/document/d/...\nhttps://docs.google.com/document/d/...`}
                            className="w-full bg-black/30 border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 transition-colors resize-y"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-muted arabic-text">
                              عدد السطور: <strong className="text-white font-mono">{bulkLinksText.split(/\r?\n/).filter(l => l.trim()).length}</strong>
                            </span>
                            <button
                              type="button"
                              disabled={isBulkScanning || !bulkLinksText.trim()}
                              onClick={handleBulkScan}
                              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed arabic-text"
                            >
                              {isBulkScanning ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>جاري سحب الأسماء وفحص الصلاحية...</span>
                                </>
                              ) : (
                                <span>🔍 سحب الأسماء ومعاينة الأكواد</span>
                              )}
                            </button>
                          </div>

                          {bulkPreviewItems.length > 0 && (
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 pt-2 border-t border-white/10">
                              {bulkPreviewItems.map((bItem, idx) => (
                                <div
                                  key={bItem.id}
                                  className={`p-2.5 rounded-xl border flex flex-col gap-1.5 ${
                                    bItem.isDuplicate
                                      ? 'bg-rose-500/10 border-rose-500/30 opacity-70'
                                      : bItem.isRestricted
                                        ? 'bg-amber-500/10 border-amber-500/30'
                                        : 'bg-white/[0.03] border-white/10'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary font-mono text-[10px] font-black shrink-0">
                                        {bItem.isDuplicate ? 'مكرر' : bItem.previewCode}
                                      </span>
                                      {bItem.isDuplicate && (
                                        <span className="text-[10px] font-bold text-rose-300 arabic-text">
                                          ⚠️ {bItem.duplicateReason} (سيتم تخطيه)
                                        </span>
                                      )}
                                      {!bItem.isDuplicate && bItem.isRestricted && (
                                        <span className="text-[10px] font-bold text-amber-300 arabic-text">
                                          🔒 تنبيه: الرابط مقفول (Request Access)
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setBulkPreviewItems(prev => prev.filter(x => x.id !== bItem.id))}
                                      className="text-muted hover:text-rose-400 text-xs cursor-pointer px-1"
                                      title="إزالة من القائمة"
                                    >
                                      ×
                                    </button>
                                  </div>
                                  {!bItem.isDuplicate && (
                                    <input
                                      type="text"
                                      value={bItem.title}
                                      onChange={e => {
                                        const val = e.target.value;
                                        setBulkPreviewItems(prev => prev.map((x, i) => i === idx ? { ...x, title: val } : x));
                                      }}
                                      className="w-full bg-black/25 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white arabic-text focus:outline-none focus:border-emerald-500"
                                      placeholder="اسم السكريبت..."
                                    />
                                  )}
                                  <span className="text-[10px] font-mono text-muted truncate" dir="ltr">{bItem.url}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold text-muted arabic-text">اسم السكريبت (Script Name)</label>
                            <button
                              type="button"
                              onClick={async () => {
                                let generated = '';
                                const rawLink = (shootingAddForm.scriptLink || '').trim();
                                if (rawLink) {
                                  try {
                                    const parsed = parseScriptValue(rawLink);
                                    if (parsed && parsed.text && !parsed.text.startsWith('http') && !parsed.text.includes('document/d/')) {
                                      generated = parsed.text;
                                    }
                                  } catch {}
                                  // Try fetching the real Google Doc title if it's a Google Docs URL
                                  if (!generated && rawLink.includes('docs.google.com/document/d/')) {
                                    try {
                                      const res = await fetch(`/api/duration?action=doc-extract&url=${encodeURIComponent(rawLink)}`);
                                      if (res.ok) {
                                        const data = await res.json();
                                        if (data?.title && String(data.title).trim()) {
                                          generated = String(data.title).trim();
                                        }
                                      }
                                    } catch {}
                                  }
                                }
                                if (!generated) {
                                  const seqMatch = String(generatedCode || '').match(/-(\d+(?:\s*v\d+)?)$/i);
                                  const seqTag = seqMatch ? `#${seqMatch[1].replace(/\s*v\d+$/i, '')}` : '';
                                  if (activeGid === '0') {
                                    generated = `${shootingAddForm.year?.toUpperCase() || ''} Cut ${seqTag} - ${shootingAddForm.extraName || 'ريل'}`.replace(/\s+/g, ' ').trim();
                                  } else {
                                    const t = shootingAddForm.teacher ? `مستر ${shootingAddForm.teacher}` : 'الدرس';
                                    const y = shootingAddForm.year ? shootingAddForm.year.toUpperCase() : '';
                                    const tp = shootingAddForm.type ? `(${shootingAddForm.type})` : '';
                                    generated = `اسكريبت ${t} ${seqTag} - ${y} ${tp}`.replace(/\s+/g, ' ').trim();
                                  }
                                }
                                setShootingAddForm(prev => ({ ...prev, scriptName: generated }));
                                toast.success(`تم توليد الاسم: ${generated}`);
                              }}
                              className="text-[10px] font-bold text-purple-400 hover:text-white bg-purple-500/10 hover:bg-purple-600 px-2.5 py-0.5 rounded-lg border border-purple-500/20 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                              title="توليد اسم تلقائي بناءً على البيانات أو الرابط"
                            >
                              <Sparkles size={12} className="text-purple-400 animate-pulse" />
                              <span>توليد اسم 🪄</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="مثال: سكريبت مستر حسام"
                            value={shootingAddForm.scriptName}
                            onChange={e => setShootingAddForm({...shootingAddForm, scriptName: e.target.value})}
                            className={`w-full bg-white/5 border ${duplicateScriptNameWarning ? 'border-rose-500/80 focus:border-rose-500 bg-rose-500/5' : 'border-white/10 focus:border-primary'} rounded-xl px-4 py-3 text-white focus:outline-none transition-colors font-bold arabic-text text-sm`}
                          />
                          {duplicateScriptNameWarning && (
                            <div className="mt-1.5 text-xs font-bold text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-xl p-2.5 flex items-center gap-2 arabic-text">
                              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                              <span>{duplicateScriptNameWarning}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">رابط السكريبت (Script Link)</label>
                          <input
                            type="url"
                            placeholder="https://docs.google.com/..."
                            value={shootingAddForm.scriptLink || ''}
                            onChange={e => setShootingAddForm({...shootingAddForm, scriptLink: e.target.value})}
                            className={`w-full bg-white/5 border ${duplicateScriptLinkWarning ? 'border-rose-500/80 focus:border-rose-500 bg-rose-500/5' : 'border-white/10 focus:border-primary'} rounded-xl px-4 py-3 text-white focus:outline-none transition-colors font-bold text-sm`}
                            dir="ltr"
                          />
                          {duplicateScriptLinkWarning && (
                            <div className="mt-1.5 text-xs font-bold text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-xl p-2.5 flex items-center gap-2 arabic-text">
                              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                              <span>{duplicateScriptLinkWarning}</span>
                            </div>
                          )}
                          {/* 🔒 Google Docs Access Permission Status (Non-blocking Warning) */}
                          {!duplicateScriptLinkWarning && docAccessStatus === 'checking' && (
                            <div className="mt-1.5 text-[11px] font-bold text-sky-300 bg-sky-500/10 border border-sky-500/25 rounded-xl px-2.5 py-1.5 flex items-center gap-2 arabic-text">
                              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                              <span>جاري فحص صلاحية رابط Google Docs...</span>
                            </div>
                          )}
                          {!duplicateScriptLinkWarning && docAccessStatus === 'restricted' && (
                            <div className="mt-1.5 text-[11px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/35 rounded-xl p-2.5 flex items-start gap-2 arabic-text">
                              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                              <span>🔒 تنبيه: رابط Google Docs ده مقفول (Request Access) — افتحه <strong>Anyone with the link</strong> عشان المصوّر والمونتير يقدروا يفتحوه!</span>
                            </div>
                          )}
                          {!duplicateScriptLinkWarning && docAccessStatus === 'public' && (
                            <div className="mt-1.5 text-[11px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-2.5 py-1.5 flex items-center gap-2 arabic-text">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                              <span>🔓 الرابط مفتوح (Anyone with the link){docAutoTitle ? ` · تم سحب العنوان تلقائياً` : ''}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={`p-4 ${manualCodeDuplicateWarning ? 'bg-rose-500/10 border-rose-500/40' : 'bg-primary/10 border-primary/20'} border rounded-xl mt-4 space-y-2`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <label className="block text-xs font-bold text-primary arabic-text">الكود المتولد تلقائياً (Code)</label>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 arabic-text">
                              🛡️ ترقيم موحد مانع للتكرار
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditingManualCode) {
                                setManualCodeOverride('');
                                setIsEditingManualCode(false);
                              } else {
                                setManualCodeOverride(autoGeneratedCode);
                                setIsEditingManualCode(true);
                              }
                            }}
                            className="text-[11px] font-bold text-sky-300 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 transition-all cursor-pointer arabic-text"
                          >
                            {isEditingManualCode ? '↩️ العودة للتلقائي' : '✏️ تعديل الرقم يدوياً'}
                          </button>
                        </div>

                        {isEditingManualCode ? (
                          <input
                            type="text"
                            dir="ltr"
                            value={manualCodeOverride}
                            onChange={e => setManualCodeOverride(e.target.value)}
                            placeholder={autoGeneratedCode}
                            className="w-full bg-black/40 border border-sky-400/50 focus:border-sky-400 rounded-xl px-3.5 py-2 font-mono text-base text-white focus:outline-none"
                          />
                        ) : (
                          <div className="font-mono text-lg text-white font-bold tracking-wide" dir="ltr">
                            {generatedCode || 'جاري الحساب...'}
                          </div>
                        )}

                        {manualCodeDuplicateWarning && (
                          <div className="text-xs font-bold text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-lg p-2 flex items-center gap-2 arabic-text">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                            <span>{manualCodeDuplicateWarning}</span>
                          </div>
                        )}
                      </div>
                        </>
                      )}
                    </>
                  ) : isTagme3at ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">اسم التجميعة / اسم الدرس *</label>
                        <input
                          type="text"
                          required
                          placeholder="مثال: M2-T1-U1-L4-SCI-EN-... أو تجميعة مراجعة..."
                          value={addForm.name}
                          onChange={e => {
                            const val = e.target.value;
                            const updates: any = { name: val };
                            const up = val.toUpperCase().trim();
                            if (up.startsWith('S3-') || up.includes('SENIOR 3') || up.includes('ثالثة ثانوي')) updates.val = 'Senior 3';
                            else if (up.startsWith('S2-') || up.includes('SENIOR 2') || up.includes('تانية ثانوي')) updates.val = 'Senior 2';
                            else if (up.startsWith('S1-') || up.includes('SENIOR 1') || up.includes('أولى ثانوي') || up.includes('اولى ثانوي')) updates.val = 'Senior 1';
                            else if (up.startsWith('M3-') || up.includes('MIDDLE 3') || up.includes('تالتة اعدادي') || up.includes('ثالثة اعدادي')) updates.val = 'Middle 3';
                            else if (up.startsWith('M2-') || up.includes('MIDDLE 2') || up.includes('تانية اعدادي')) updates.val = 'Middle 2';
                            else if (up.startsWith('M1-') || up.includes('MIDDLE 1') || up.includes('أولى اعدادي') || up.includes('اولى اعدادي')) updates.val = 'Middle 1';
                            else if (up.startsWith('J6-') || up.includes('JUNIOR 6') || up.includes('ساتة')) updates.val = 'Junior 6';
                            else if (up.startsWith('J5-') || up.includes('JUNIOR 5') || up.includes('خامسة')) updates.val = 'Junior 5';
                            else if (up.startsWith('J4-') || up.includes('JUNIOR 4') || up.includes('رابعة')) updates.val = 'Junior 4';

                            if (!addForm.filingName || addForm.filingName === '') {
                              const match = val.match(/^([A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+)/);
                              if (match) updates.filingName = match[1];
                            }
                            setAddForm(prev => ({ ...prev, ...updates }));
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors font-bold arabic-text text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">المرحلة الدراسية (Op Sheet)</label>
                          <select
                            value={addForm.val || 'Senior 1'}
                            onChange={e => setAddForm({...addForm, val: e.target.value})}
                            className="w-full bg-[#0b1019] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors font-bold text-sm"
                          >
                            {opSheetsList.map((op: string) => (
                              <option key={op} value={op}>{op}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">الفرع (Branch)</label>
                          <select
                            value={addForm.extra || ''}
                            onChange={e => setAddForm({...addForm, extra: e.target.value})}
                            className="w-full bg-[#0b1019] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors font-bold text-sm"
                          >
                            <option value="">غير محدد</option>
                            {branchesList.map((b: string) => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">المونتير المسؤول (Editor)</label>
                          <select
                            value={addForm.editor || 'غير محدد'}
                            onChange={e => setAddForm({...addForm, editor: e.target.value})}
                            className="w-full bg-[#0b1019] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors font-bold text-sm"
                          >
                            <option value="غير محدد">غير محدد</option>
                            {editorsList.map((ed: string) => (
                              <option key={ed} value={ed}>{ed}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">اسم الفايلينج (Filing Name)</label>
                          <input
                            type="text"
                            placeholder="مثال: S1-U2-REV"
                            value={addForm.filingName}
                            onChange={e => setAddForm({...addForm, filingName: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono text-xs text-left"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">ملاحظات التسويق (Marketing Notes)</label>
                        <input
                          type="text"
                          placeholder="ملاحظات قسم التسويق..."
                          value={addForm.notesMarketing}
                          onChange={e => setAddForm({...addForm, notesMarketing: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors font-bold arabic-text text-sm"
                        />
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

                  {(() => {
                    const isShootingModal = ['1436746012', '1939073164', '798246690', '0'].includes(activeGid);
                    const isActiveBulkMode = activeGid === '1436746012' && isBulkAddMode;
                    const validBulkCount = bulkPreviewItems.filter(x => !x.isDuplicate && x.url.trim()).length;
                    const isShootingIncomplete = isShootingModal && !isActiveBulkMode && (
                      !shootingAddForm.branch ||
                      !shootingAddForm.year ||
                      (activeGid !== '0' && !shootingAddForm.teacher?.trim()) ||
                      !shootingAddForm.extraName?.trim() ||
                      !shootingAddForm.type?.trim() ||
                      !shootingAddForm.format?.trim() ||
                      !shootingAddForm.scriptName?.trim() ||
                      !shootingAddForm.scriptLink?.trim() ||
                      !generatedCode
                    );
                    const hasDuplicateError = isShootingModal && !isActiveBulkMode && (!!duplicateScriptLinkWarning || !!duplicateScriptNameWarning);
                    const isTagmeIncomplete = isTagme3at && !addForm.name?.trim();
                    const isDisabled = loading || isShootingIncomplete || hasDuplicateError || isTagmeIncomplete || isSubmittingAdd;

                    return (
                      <div className="w-full space-y-3 pt-2">
                        {isShootingModal && hasDuplicateError && (
                          <div className="text-[11px] font-bold text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-xl py-2 px-3 arabic-text flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                            <span>{duplicateScriptLinkWarning || duplicateScriptNameWarning}</span>
                          </div>
                        )}
                        {isShootingModal && !hasDuplicateError && isShootingIncomplete && (
                          <div className="text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl py-2 px-3 arabic-text flex items-center justify-between gap-2">
                            <span>⚠️ يرجى استكمال كافة البيانات (اسم ورابط السكريبت، المدرس، الاسم الإضافي)</span>
                            <span className="text-[10px] text-muted hidden sm:inline">لن يتم الحفظ تلقائياً أثناء كتابتك</span>
                          </div>
                        )}

                        <div className="flex justify-end gap-2.5 flex-wrap">
                          <button
                            type="button"
                            disabled={isSubmittingAdd}
                            onClick={() => setShowAddModal(false)}
                            className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors font-bold arabic-text text-xs cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            إلغاء
                          </button>
                          {isActiveBulkMode ? (
                            <button
                              type="button"
                              disabled={isSubmittingAdd || validBulkCount === 0}
                              onClick={handleBulkSubmit}
                              className="px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold arabic-text text-xs shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none disabled:hover:scale-100"
                            >
                              {isSubmittingAdd && bulkProgress ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                                  <span>جاري إضافة {bulkProgress.current} / {bulkProgress.total}...</span>
                                </>
                              ) : (
                                <span>🚀 حفظ وإضافة الكل ({validBulkCount} ريل)</span>
                              )}
                            </button>
                          ) : (
                            <>
                              {activeGid === '1436746012' && (
                                <button
                                  type="button"
                                  disabled={isDisabled}
                                  onClick={() => handleAddSubmit(null, true)}
                                  className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold arabic-text text-xs shadow-lg shadow-emerald-600/25 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none disabled:hover:scale-100"
                                  title="حفظ الريل الحالي والبقاء في النافذة بنفس الفرع والسنة والمدرس وتوليد الرقم التالي تلقائياً"
                                >
                                  {isSubmittingAdd ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                                      <span>جاري الحفظ...</span>
                                    </>
                                  ) : (
                                    <span>حفظ وإضافة واحد تاني (نفس المدرس) ➕</span>
                                  )}
                                </button>
                              )}
                              <button
                                type="submit"
                                disabled={isDisabled}
                                className="px-7 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold arabic-text text-xs shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none disabled:hover:scale-100"
                              >
                                {isSubmittingAdd ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                    <span>جاري الحفظ والإضافة... ⏳</span>
                                  </>
                                ) : (
                                  <span>حفظ وإضافة 🚀</span>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Google Sheet Import Modal for Shooting */}
        <GoogleSheetImportModal
          isOpen={showGoogleSheetImportModal}
          onClose={() => setShowGoogleSheetImportModal(false)}
          existingCodes={allReelsCodesSet}
          currentUser={profile?.name || 'User'}
          onImportSuccess={async (importedShootingRows, _rawRows, options) => {
            const updateOnlyScript = options?.updateOnlyScript === true;

            if (updateOnlyScript) {
              // 1. Update the script column in batches of 50 to prevent connection pool exhaustion
              const BATCH_SIZE = 50;
              for (let i = 0; i < importedShootingRows.length; i += BATCH_SIZE) {
                const chunk = importedShootingRows.slice(i, i + BATCH_SIZE);
                await Promise.all(
                  chunk.map(row => 
                    supabase
                      .from('reels_shooting_26')
                      .update({ 
                        script: row.script, 
                        updated_at: new Date().toISOString() 
                      })
                      .eq('code', row.code)
                  )
                );
              }

              // 2. Update local state
              const scriptMap = new Map(importedShootingRows.map(r => [(r.code || '').toLowerCase(), r.script]));
              setReelsDbRows(prev => prev.map(row => {
                const newScript = scriptMap.get((row.code || '').toLowerCase());
                return newScript !== undefined ? { ...row, script: newScript } : row;
              }));

              if (globalChannelRef.current && profile?.name) {
                globalChannelRef.current.send({
                  type: 'broadcast',
                  event: 'update',
                  payload: {
                    itemKey: importedShootingRows[0]?.code || 'import-script',
                    taskName: `تحديث السكريبت لـ ${importedShootingRows.length} كود`,
                    message: `📝 قام ${profile.name} بتحديث السكريبت لـ ${importedShootingRows.length} كود في جدول Shooting!`,
                    type: 'update',
                    from: profile.name,
                    activeGid: '1436746012'
                  }
                });
              }
              return;
            }

            // Upsert in batches of 100 to prevent payload size errors
            const BATCH_SIZE = 100;
            const allSavedData: any[] = [];
            for (let i = 0; i < importedShootingRows.length; i += BATCH_SIZE) {
              const chunk = importedShootingRows.slice(i, i + BATCH_SIZE);
              const { data: chunkData, error } = await supabase
                .from('reels_shooting_26')
                .upsert(chunk, { onConflict: 'code' })
                .select();

              if (error) {
                console.error('Supabase import error:', error);
                throw error;
              }
              if (chunkData) allSavedData.push(...chunkData);
            }
            const data = allSavedData;

            const newlyMapped = (data && data.length > 0 ? data : importedShootingRows).map((i: any) => ({
              id: i.code,
              code: i.code,
              date: i.date || '',
              branch: i.branch || '',
              year: i.year || '',
              teacher: i.teacher || '',
              extraName: i.extra_name || '',
              script: i.script || '',
              type: i.type || '',
              format: i.format || '',
              filmed: i.filmed === true,
              filmingDate: i.filming_date || '',
              by: i.by || '',
              storage: i.storage || '',
              notes: i.notes || '',
              editorNotes: i.editor_notes || '',
              driveRaw: i.drive_raw || '',
              editorCol: i.editor_col || '',
              done: i.done === true,
              driveFinal: i.drive_final || '',
              canceled: i.canceled === true,
              missingDetails: i.missing_details === true,
              editCheck: i.edit_check === true,
              publish: i.publish === true,
              sharedLink: i.shared_link || '',
              uniqueKey: i.code,
              createdAt: i.created_at || new Date().toISOString(),
              updatedAt: i.updated_at || new Date().toISOString()
            }));

            const importedCodeSet = new Set(newlyMapped.map((m: any) => m.code));
            setReelsDbRows(prev => [...newlyMapped, ...prev.filter(r => !importedCodeSet.has(r.code))]);
            recordBulkClaimedSequences(importedCodeSet, sequenceRegistry).then(reg => setSequenceRegistry(reg)).catch(() => {});

            if (globalChannelRef.current && profile?.name) {
              globalChannelRef.current.send({
                type: 'broadcast',
                event: 'update',
                payload: {
                  itemKey: newlyMapped[0]?.code || 'import',
                  taskName: `استيراد ${newlyMapped.length} سكريبت جديد`,
                  message: `📥 قام ${profile.name} باستيراد ${newlyMapped.length} سكريبت من شيت جوجل إلى جدول Shooting!`,
                  type: 'new_entry',
                  from: profile.name,
                  activeGid: '1436746012'
                }
              });
            }
          }}
        />



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
                const pinBadge = gid === 'reels-calendar' ? (todayCalendarScriptsCount > 0 ? todayCalendarScriptsCount : undefined) : (STAGE_WITH_BADGE_MAP[gid] ? stageUncompletedCounts[gid] : undefined);
                const pinBadgeTitle = gid === 'reels-calendar' ? `${todayCalendarScriptsCount} مواعيد تصوير مسجلة لليوم 🎬📅` : undefined;
                const pinInProgress = STAGE_WITH_BADGE_MAP[gid] ? stageInProgressCounts[gid] : undefined;
                const pinMissing = STAGE_WITH_BADGE_MAP[gid] ? stageMissingDetailsCounts[gid] : undefined;
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
                    {typeof pinMissing === 'number' && pinMissing > 0 && (
                      <span className="px-1.5 py-0.2 min-w-[18px] h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-mono font-black flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.85)] border border-amber-300/60" title={`${pinMissing} مهام بها مشكلة أو تفاصيل ناقصة ⚠️`}>
                        {pinMissing}
                      </span>
                    )}
                    {typeof pinInProgress === 'number' && pinInProgress > 0 && (
                      <span className="px-1.5 py-0.2 min-w-[18px] h-4 rounded-full bg-orange-500 text-white text-[10px] font-mono font-black flex items-center justify-center shadow-[0_0_8px_rgba(249,115,22,0.85)] border border-orange-400/50" title={`${pinInProgress} مهام قيد التنفيذ مع محرر ⏳`}>
                        {pinInProgress}
                      </span>
                    )}
                    {typeof pinBadge === 'number' && pinBadge > 0 ? (
                      <span className="px-1.5 py-0.2 min-w-[18px] h-4 rounded-full bg-rose-500 text-white text-[10px] font-mono font-black flex items-center justify-center shadow-[0_0_8px_rgba(244,63,94,0.6)]" title={pinBadgeTitle || `${pinBadge} مهام بدون محرر تنتظر العمل 🔴`}>
                        {pinBadge}
                      </span>
                    ) : GREEN_DONE_BADGE_GIDS.has(gid) && typeof pinBadge === 'number' && pinBadge === 0 ? (
                      <motion.span
                        key={`pin-done-${gid}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.25, 1] }}
                        className="w-4 h-4 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.7)] border border-emerald-300/40 shrink-0"
                        title="كل المهام مكتملة! 🎉"
                      >
                        <Check size={10} strokeWidth={3.5} className="text-white" />
                      </motion.span>
                    ) : typeof pinBadge === 'number' && pinBadge === 0 ? (
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0" title="0 مهام متبقية">
                        <Check size={9} strokeWidth={3.5} className="text-emerald-400" />
                      </span>
                    ) : null}
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

          {/* Universal / Global Announcement Bar for All Pages & Views */}
          <GlobalAnnouncementBar
            userRole={profile?.role}
            userName={profile?.name || profile?.email}
          />

          {/* Filters Bar */}
          {!isOp27 && !isHome && !isStudioCalendar && (
            <>
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

            {/* Admin Active Term Lock Switcher Control */}
            {profile?.role && PERMISSIONS.canManageUsers(profile.role) && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30 p-1.5 rounded-2xl shrink-0 shadow-lg shadow-purple-500/5" dir="rtl">
                <span className="text-[11px] font-black text-purple-300 px-2 flex items-center gap-1.5 arabic-text">
                  <span>🔒 الترم النشط للنظام:</span>
                </span>
                <button
                  onClick={() => handleAdminTermChange('T1')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                    activeAcademicTerm === 'T1'
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/30 scale-105 ring-2 ring-emerald-400/40'
                      : 'bg-white/5 border-white/10 text-muted/60 hover:bg-white/10 hover:text-white'
                  }`}
                  title="تحديد الترم الأول كترم نشط لجميع المستخدمين"
                >
                  <span>الترم الأول (T1) ✓</span>
                </button>
                <button
                  onClick={() => handleAdminTermChange('T2')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                    activeAcademicTerm === 'T2'
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/30 scale-105 ring-2 ring-emerald-400/40'
                      : 'bg-white/5 border-white/10 text-muted/60 hover:bg-white/10 hover:text-white'
                  }`}
                  title="تحديد الترم الثاني كترم نشط لجميع المستخدمين"
                >
                  <span>الترم الثاني (T2) ✓</span>
                </button>
              </div>
            )}



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
                  {[
                    { id: 'All', label: 'ALL' },
                    { id: 'Pending', label: 'PENDING' },
                    { id: 'Missing', label: 'تفاصيل ناقصة ⚠️' },
                    { id: 'Unassigned', label: 'بدون مونتير 👤' },
                    { id: 'Done', label: 'DONE' }
                  ].map((f) => {
                    const count = (tagmeStatusCounts as any)[f.id] || 0;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setStatusFilter(f.id)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 ${
                          statusFilter === f.id
                            ? f.id === 'Unassigned'
                              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 ring-2 ring-amber-400/50'
                              : f.id === 'Missing'
                                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 ring-2 ring-rose-400/50'
                                : 'bg-primary text-white shadow-lg shadow-primary/30'
                            : f.id === 'Unassigned'
                              ? 'text-amber-300 hover:bg-amber-500/10'
                              : f.id === 'Missing'
                                ? 'text-rose-300 hover:bg-rose-500/10'
                                : 'text-muted hover:bg-white/5 hover:text-foreground'
                        }`}
                      >
                        <span>{f.label}</span>
                        {count > 0 && (
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono ${
                            statusFilter === f.id ? 'bg-black/30 text-white' : 'bg-white/10 text-white/70'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
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

              {/* Stage Table vs Calendar View Mode Toggle */}
              {isStageTab && (
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-2xl">
                  <button
                    onClick={() => setStageViewMode('TABLE')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      stageViewMode === 'TABLE'
                        ? 'bg-primary text-white shadow-md shadow-primary/30 font-black'
                        : 'text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>💻 عرض جدول (Table)</span>
                  </button>
                  <button
                    onClick={() => setStageViewMode('CALENDAR')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      stageViewMode === 'CALENDAR'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/30 font-black'
                        : 'text-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>📅 عرض تقويم (Calendar)</span>
                  </button>
                </div>
              )}
              {/* VE Simple Mode Toggle */}
              {activeGid === '1939073164' && (
                <button
                  onClick={() => {
                    const next = veViewMode === 'SIMPLE' ? 'DETAILED' : 'SIMPLE';
                    setVeViewMode(next);
                    localStorage.setItem('ve_view_mode', next);
                  }}
                  className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 hover:border-cyan-500/40 rounded-2xl transition-all cursor-pointer group"
                  title={veViewMode === 'SIMPLE' ? 'عرض الفئة التفصيلية' : 'عرض الفئة البسيطة'}
                >
                  <span className="text-xs font-bold text-muted group-hover:text-white transition-colors">
                    {veViewMode === 'SIMPLE' ? 'مود بسيط ⚡' : 'مود تفصيلي 📋'}
                  </span>
                  <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 ${
                    veViewMode === 'SIMPLE' ? 'bg-cyan-500' : 'bg-purple-600'
                  }`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                      veViewMode === 'SIMPLE' ? 'translate-x-0' : 'translate-x-4'
                    }`} />
                  </div>
                </button>
              )}

              {isReelsStage && (
                <div className="flex items-center gap-1.5" dir="rtl">
                  {[
                    { id: 'All', label: 'الكل' },
                    { id: 'Done', label: 'DONE ✅' },
                    { id: 'Missing', label: 'تفاصيل ناقصة ⚠️' },
                    { id: 'Canceled', label: 'Cancel ❌' },
                    { id: 'Filmed', label: 'اتصور 🎬' },
                    ...(activeGid === '1939073164' || activeGid === '0'
                      ? [{ id: 'Unassigned', label: 'بدون مونتير 👤' }]
                      : []),
                    { id: 'Pending', label: 'قيد الانتظار ⏳' }
                  ].map((f) => {
                    const count = (reelsStatusCounts as any)[f.id] || 0;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setStatusFilter(f.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          statusFilter === f.id
                            ? f.id === 'Done' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                              : f.id === 'Missing' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                              : f.id === 'Canceled' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                              : f.id === 'Filmed' ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                              : f.id === 'Unassigned' ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-400/50'
                              : f.id === 'Pending' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                              : 'bg-primary text-white shadow-md shadow-primary/30'
                            : 'bg-white/5 text-muted border border-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span>{f.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                          statusFilter === f.id
                            ? 'bg-black/30 text-white'
                            : 'bg-white/10 text-white/80'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {!isTagme3at && !isOperations && !isReelsStage && (
                <span className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted opacity-40">{activeLabel}</span>
              )}
            </div>
          </div>

          {/* Active Teacher Filter Bar in Reels Stage */}
          {isReelsStage && colFilters.teacher && colFilters.teacher !== 'All' && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-sky-500/10 border border-sky-500/25 rounded-2xl animate-fadeIn" dir="rtl">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-black text-sky-400 flex items-center gap-2">
                  🎬 فلتر المدرس النشط:
                  <span className="px-3 py-1 rounded-xl bg-sky-500/20 border border-sky-400/40 text-white font-black text-sm">
                    {colFilters.teacher}
                  </span>
                </span>
                <span className="text-xs font-bold text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                  {filteredData.length} ريل
                </span>
              </div>
              <div className="flex items-center gap-2">
                {activeGid === '1436746012' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAppMode('REELS');
                      setActiveGid('reels-calendar');
                      setActiveLabel('Calendar');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Calendar size={13} className="text-sky-400" />
                    <span>العودة للكلاندر</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleColFilterChange('teacher', 'All')}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <X size={13} />
                  <span>إلغاء فلتر المدرس</span>
                </button>
              </div>
            </div>
          )}

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

            {isStage && (
              <div className="flex items-center gap-1.5 border-r border-white/10 pr-3 mr-1">
                <span className="font-bold text-emerald-400">تجميعة:</span>
                <button
                  onClick={() => {
                    setColFilters(prev => {
                      const updated = { ...prev };
                      if (updated.check1 === 'TRUE') delete updated.check1;
                      else updated.check1 = 'TRUE';
                      return updated;
                    });
                  }}
                  className={`px-3 py-1.5 rounded-xl border font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    colFilters.check1 === 'TRUE'
                      ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 font-black scale-105 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/40'
                      : 'bg-white/5 border-white/10 text-muted hover:bg-emerald-500/10 hover:text-emerald-300'
                  }`}
                  title="فلترة الدروس التي تم تجميعها فقط"
                >
                  <span>تجميعة ✓</span>
                </button>
                <button
                  onClick={() => {
                    setColFilters(prev => {
                      const updated = { ...prev };
                      if (updated.check1 === 'FALSE') delete updated.check1;
                      else updated.check1 = 'FALSE';
                      return updated;
                    });
                  }}
                  className={`px-3 py-1.5 rounded-xl border font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    colFilters.check1 === 'FALSE'
                      ? 'bg-amber-500/30 border-amber-400 text-amber-300 font-black scale-105 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/40'
                      : 'bg-white/5 border-white/10 text-muted hover:bg-amber-500/10 hover:text-amber-300'
                  }`}
                  title="فلترة الدروس التي لم تُجمع بعد"
                >
                  <span>لم تُجمع ⏳</span>
                </button>

                {/* Uploaded Filter Button */}
                <button
                  onClick={() => {
                    setColFilters(prev => {
                      const updated = { ...prev };
                      if (updated.uploaded === 'TRUE') delete updated.uploaded;
                      else updated.uploaded = 'TRUE';
                      return updated;
                    });
                  }}
                  className={`px-3 py-1.5 rounded-xl border font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    colFilters.uploaded === 'TRUE'
                      ? 'bg-blue-500/30 border-blue-400 text-blue-300 font-black scale-105 shadow-lg shadow-blue-500/20 ring-2 ring-blue-400/40'
                      : 'bg-white/5 border-white/10 text-muted hover:bg-blue-500/10 hover:text-blue-300'
                  }`}
                  title="فلترة الدروس المرفوعة (Uploaded ✓)"
                >
                  <span className="text-blue-400 font-black">Uploaded ✓</span>
                  {stageUploadedCount > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono ${
                      colFilters.uploaded === 'TRUE' ? 'bg-blue-500 text-white' : 'bg-white/10 text-blue-300'
                    }`}>
                      {stageUploadedCount}
                    </span>
                  )}
                </button>

                {/* Not Uploaded Yet Filter Button */}
                <button
                  onClick={() => {
                    setColFilters(prev => {
                      const updated = { ...prev };
                      if (updated.uploaded === 'FALSE') delete updated.uploaded;
                      else updated.uploaded = 'FALSE';
                      return updated;
                    });
                  }}
                  className={`px-3 py-1.5 rounded-xl border font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    colFilters.uploaded === 'FALSE'
                      ? 'bg-rose-500/30 border-rose-400 text-rose-300 font-black scale-105 shadow-lg shadow-rose-500/20 ring-2 ring-rose-400/40'
                      : 'bg-white/5 border-white/10 text-muted hover:bg-rose-500/10 hover:text-rose-300'
                  }`}
                  title="فلترة الدروس التي لم تُرفع بعد (Not Uploaded Yet ⏳)"
                >
                  <span className="text-rose-400 font-black">Not Uploaded ⏳</span>
                  {stageNotUploadedCount > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono ${
                      colFilters.uploaded === 'FALSE' ? 'bg-rose-500 text-white' : 'bg-white/10 text-rose-300'
                    }`}>
                      {stageNotUploadedCount}
                    </span>
                  )}
                </button>

                {/* Monthly Revisions Filter Button */}
                <button
                  onClick={() => {
                    setColFilters(prev => {
                      const updated = { ...prev };
                      if (updated.monthReviews === 'TRUE') delete updated.monthReviews;
                      else updated.monthReviews = 'TRUE';
                      return updated;
                    });
                  }}
                  className={`px-3 py-1.5 rounded-xl border font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    colFilters.monthReviews === 'TRUE'
                      ? 'bg-amber-500/30 border-amber-400 text-amber-300 font-black scale-105 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/40'
                      : 'bg-white/5 border-white/10 text-muted hover:bg-amber-500/10 hover:text-amber-300'
                  }`}
                  title="فلترة مراجعات الشهر والمراجعات النهائية فقط"
                >
                  <span>مراجعات الشهر 📚</span>
                  {stageReviewsCount > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono ${
                      colFilters.monthReviews === 'TRUE' ? 'bg-amber-500 text-white' : 'bg-white/10 text-amber-300'
                    }`}>
                      {stageReviewsCount}
                    </span>
                  )}
                </button>
              </div>
            )}

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
          </>
          )}

          {/* Page Announcement Bar for All Pages */}
          <PageAnnouncementBar
            pageKey={activeGid}
            pageLabel={activeLabel}
            userRole={profile?.role}
            userName={profile?.name || profile?.email}
          />

          {/* Main Content View (Home vs OP 27 vs Table vs Analytics) */}
          {isHome ? (
            <HomeView
              currentUser={profile}
              isDemo={isDemo}
              onNavigateToStage={(gid, label, uniqueKey) => {
                setActiveGid(gid);
                setActiveLabel(label);
                setSearchQuery('');
                setStatusFilter('All');
                setTeacherFilter('All');
                setYearFilter('All');
                setColFilters({});
                if (uniqueKey) {
                  setGlowingKeys([uniqueKey]);
                  setTimeout(() => {
                    const el = document.getElementById(uniqueKey);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 400);
                  setTimeout(() => setGlowingKeys([]), 4500);
                }
              }}
            />
          ) : isOp27 ? (
            <Op27View
              youtubeItems={youtubeItems}
              onNavigateToStage={(gid, label, uniqueKey) => {
                setActiveGid(gid);
                setActiveLabel(label);
                setSearchQuery('');
                setStatusFilter('All');
                setTeacherFilter('All');
                setYearFilter('All');
                setColFilters({});
                if (uniqueKey) {
                  setGlowingKeys([uniqueKey]);
                  setTimeout(() => {
                    const el = document.getElementById(uniqueKey);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 400);
                  setTimeout(() => setGlowingKeys([]), 4500);
                }
              }}
              onExecuteMergeToStage={async (mergedItem, targetStageGid, combinedNames) => {
                // 1. Insert to Supabase stage table
                const targetTable = STAGE_TABLE_MAP[targetStageGid];
                if (!isDemo && targetTable) {
                  try {
                    await supabase.from(targetTable).insert([{
                      unique_key: mergedItem.uniqueKey,
                      name: mergedItem.name,
                      filing_name: mergedItem.filingName,
                      week: mergedItem.week,
                      date: mergedItem.date,
                      subject: mergedItem.subject,
                      branch: mergedItem.branch,
                      op_sheet: mergedItem.opSheet,
                      is_tagme3a: false,
                      delivered: false,
                      thumbnail_link: '',
                      time: mergedItem.time,
                      youtube_link: '',
                      uploaded: false,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    }]);

                    if (activeGid === targetStageGid) {
                      setStageDbRows(prev => [mergedItem, ...prev.filter(x => x.uniqueKey !== mergedItem.uniqueKey)]);
                    }
                  } catch (err) {
                    console.error('Error inserting merged item to stage:', err);
                  }
                }

                // 2. Add to youtubeItems state and localStorage
                setYoutubeItems((prev: any) => {
                  const list = prev[targetStageGid] || [];
                  const updated = [mergedItem, ...list];
                  const map = { ...prev, [targetStageGid]: updated };
                  syncState('youtube_transfers', map, mergedItem.uniqueKey, combinedNames, 'youtube_merge', `🎬 تم دمج دروس OP 26/27 ليوتيوب`);
                  return map;
                });

                toast.success(`🚀 تم تجميع الدروس وتحويلها بنجاح لمرحلة ${mergedItem.val || ''}!`);
              }}
              onExecuteSingleTransfer={async (taskItem: any, isAdd: boolean) => {
                const targetStage = getTargetStage26(taskItem);
                const uniqueKey = 'yt-op27-' + taskItem.id;
                const targetTable = STAGE_TABLE_MAP[targetStage.gid];

                if (isAdd) {
                  // Get duration from cache if available
                  let itemDuration = '';
                  try {
                    if (taskItem.bunnyVideoId && taskItem.bunnyLibraryId) {
                      const url = `https://video.bunnycdn.com/play/${taskItem.bunnyLibraryId}/${taskItem.bunnyVideoId}`;
                      itemDuration = localStorage.getItem(`dur_${url}`) || localStorage.getItem(`dur_${taskItem.bunnyVideoId}`) || '';
                    }
                  } catch {}

                  if (itemDuration === '0:00:00' || itemDuration === '00:00') itemDuration = '';

                  const transferredItem = {
                    uniqueKey: uniqueKey,
                    id: uniqueKey,
                    name: `[يوتيوب] ${taskItem.name || taskItem.fullName}`,
                    filingName: taskItem.fullName || taskItem.name,
                    val: targetStage.label,
                    idVal: taskItem.teacher || '---',
                    date: taskItem.dueDate || taskItem.startDate || new Date().toISOString().split('T')[0],
                    subject: taskItem.subject || 'عام',
                    extra: '',
                    branch: '',
                    opSheet: 'OP 26/27',
                    check1: false,
                    check2: false,
                    isYoutubeTransfer: true,
                    time: itemDuration,
                    week: 'أسبوع 1',
                    isTagme3a: false,
                    delivered: false,
                    thumbnailLink: '',
                    youtubeLink: '',
                    uploaded: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };

                  // 1. Insert/Upsert to Supabase stage table
                  if (!isDemo && targetTable) {
                    try {
                      await supabase.from(targetTable).upsert([{
                        unique_key: uniqueKey,
                        name: transferredItem.name,
                        filing_name: transferredItem.filingName,
                        week: transferredItem.week,
                        date: transferredItem.date,
                        subject: transferredItem.subject,
                        branch: transferredItem.branch,
                        op_sheet: transferredItem.opSheet,
                        is_tagme3a: false,
                        delivered: false,
                        thumbnail_link: '',
                        time: transferredItem.time,
                        youtube_link: '',
                        uploaded: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      }], { onConflict: 'unique_key' });

                      if (activeGid === targetStage.gid) {
                        setStageDbRows(prev => [transferredItem, ...prev.filter(x => x.uniqueKey !== uniqueKey)]);
                      }
                    } catch (err) {
                      console.error('Error inserting single transfer to stage:', err);
                    }
                  }

                  // 2. Add to youtubeItems state and localStorage
                  setYoutubeItems((prev: any) => {
                    const list = prev[targetStage.gid] || [];
                    const updated = [transferredItem, ...list.filter((x: any) => x.uniqueKey !== uniqueKey)];
                    const map = { ...prev, [targetStage.gid]: updated };
                    syncState('youtube_transfers', map, uniqueKey, taskItem.name || taskItem.fullName, 'youtube_transfer', `🎬 تم نقل درس OP 26/27 ليوتيوب: "${taskItem.name}"`);
                    return map;
                  });

                  // 3. Show non-intrusive bottom toast with option to navigate
                  setActiveToast({
                    item: { name: taskItem.name || taskItem.fullName },
                    stage: targetStage,
                    uniqueKey: uniqueKey
                  });

                  setTimeout(() => {
                    setActiveToast(prev => prev?.uniqueKey === uniqueKey ? null : prev);
                  }, 8000);

                  toast.success(`🚀 تم وضع الدرس في شيت ${targetStage.label}!`);
                } else {
                  // REMOVE / UNCHECK
                  if (!isDemo && targetTable) {
                    try {
                      await supabase.from(targetTable).delete().eq('unique_key', uniqueKey);
                      if (activeGid === targetStage.gid) {
                        setStageDbRows(prev => prev.filter(x => x.uniqueKey !== uniqueKey));
                      }
                    } catch (err) {
                      console.error('Error deleting single transfer from stage:', err);
                    }
                  }

                  setYoutubeItems((prev: any) => {
                    const list = prev[targetStage.gid] || [];
                    const updated = list.filter((x: any) => x.uniqueKey !== uniqueKey);
                    const map = { ...prev, [targetStage.gid]: updated };
                    syncState('youtube_transfers', map, uniqueKey, taskItem.name || taskItem.fullName, 'youtube_untransfer', `↩️ تم إلغاء وحذف درس OP 26/27: "${taskItem.name}"`);
                    return map;
                  });

                  if (activeToast?.uniqueKey === uniqueKey) {
                    setActiveToast(null);
                  }

                  toast.info(`↩️ تم حذف الدرس من شيت ${targetStage.label}`);
                }
              }}
            />
          ) : isReelsAnalytics ? (
            <ErrorBoundary inline tabName="إحصائيات الريلز">
              <ReelsAnalytics isDemo={isDemo} />
            </ErrorBoundary>
          ) : isStudioCalendar ? (
            <ErrorBoundary>
              <div className="studio-calendar-theme">
                <StudioCalendarView
                  isDemo={isDemo}
                  userProfile={profile}
                  toast={toast}
                  onNavigateToShootingTeacher={(teacherName: string) => {
                    const cleanTarget = String(teacherName || '').trim();
                    if (!cleanTarget) return;

                    const shootingRows = reelsDbByGid['1436746012'] || [];
                    const exactRow = shootingRows.find(
                      (r: any) => String(r.teacher || '').trim().toLowerCase() === cleanTarget.toLowerCase()
                    );
                    const matchedTeacher = exactRow?.teacher ? String(exactRow.teacher).trim() : cleanTarget;

                    setAppMode('REELS');
                    setActiveGid('1436746012');
                    setActiveLabel('Shooting');
                    setStatusFilter('All');
                    setYearFilter('All');
                    setTermFilter('All');
                    setBypassYearTerm(false);
                    setStageWeekFilter('All');
                    setSearchQuery('');
                    setIsMyTasksOnly(false);
                    setTeacherFilter(matchedTeacher);
                    setColFilters({ teacher: matchedTeacher });

                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    toast.success(`🎬 تم فتح شيت Shooting وفلترته على المدرس: ${matchedTeacher}`);
                  }}
                />
              </div>
            </ErrorBoundary>
          ) : isTeachersTab ? (
            PERMISSIONS.canViewTab(profile?.role || 'junior', 'Teachers', profile?.allowed_tabs || []) ? (
              <ErrorBoundary>
                <TeachersFollowUpView isDemo={isDemo} userProfile={profile} toast={toast} />
              </ErrorBoundary>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400">
                <Lock className="w-12 h-12 text-rose-500 mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">غير مسموح بالوصول</h3>
                <p className="text-sm">ليس لديك صلاحية لعرض تاب متابعة المدرسين.</p>
              </div>
            )
          ) : isEditorsTeamPage ? (
            <ErrorBoundary>
              <EditorsManagement userRole={profile?.role} toast={toast} />
            </ErrorBoundary>
          ) : isAnalyticsTagme ? (
            <ErrorBoundary inline tabName="إحصائيات التجميعات">
              <TagmeAnalyticsDashboard combinedData={combinedData} tagmeTransfers={tagmeTransfers} loading={loading} taskStatuses={taskStatuses} taskPriorities={taskPriorities} priorityLimit={tabPriorityLimits['1535230545']} />
            </ErrorBoundary>
          ) : isDesignAnalytics ? (
            <ErrorBoundary inline tabName="إحصائيات التصاميم">
              <DesignAnalytics liveData={liveData} loading={loading} />
            </ErrorBoundary>
          ) : isDesignersTeamPage ? (
            <ErrorBoundary>
              <DesignersTeamManagement userRole={profile?.role} toast={toast} />
            </ErrorBoundary>
          ) : isDesignersPage ? (
            <ErrorBoundary>
              <DesignersDashboard isDemoMode={isDemo} liveData={liveData} />
            </ErrorBoundary>
          ) : isStageTab && stageViewMode === 'CALENDAR' ? (
            <StageCalendarView
              items={filteredData}
              activeLabel={activeLabel}
              activeGid={activeGid}
              profile={profile}
              tagmeTransfers={tagmeTransfers}
              onTagmeToggle={handleTagmeToggle}
              onToggleDelivered={handleToggleDelivered}
              onUpdateDate={handleUpdateDate}
              getChipColor={getChipColor}
              getWeekColor={getWeekColor}
              parseDriveLink={parseDriveLink}
            />
          ) : isCardsView ? (
            /* 📱 Responsive Mobile Cards Mode View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2 animate-fadeIn" dir="rtl">
              {filteredData.slice(0, activeVisibleRecordsLimit).map((item: any, idx: number) => {
                const itemKey = item.uniqueKey || generateKey(item);
                const taskName = item.name || item.filingName || item.script || item.id || 'مهمة بدون عنوان';
                const isDone = item.done === true || item.done === 'TRUE';
                const isCanceled = item.canceled === true || item.canceled === 'TRUE';
                const isMissing = item.missingDetails === true || item.missingDetails === 'TRUE';
                const editorName = item.editor || item.editorCol || item.by || item.creator || 'غير محدد';
                const driveLink = item.driveFinal || item.driveRaw || item.youtubeLink || '';
                const parsedDrive = driveLink ? parseDriveLink(driveLink) : null;

                return (
                  <div 
                    key={itemKey || idx} 
                    className={`p-5 rounded-3xl border transition-all duration-300 relative space-y-4 flex flex-col justify-between shadow-lg ${
                      isDone ? 'bg-emerald-500/10 border-emerald-500/30' :
                      isCanceled ? 'bg-rose-500/10 border-rose-500/30' :
                      isMissing ? 'bg-amber-500/10 border-amber-500/30' :
                      'bg-white/[0.03] border-white/10 hover:border-primary/40'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-full bg-white/10 text-white/80">
                          #{idx + 1}
                        </span>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                          isDone ? 'bg-emerald-500 text-white' :
                          isCanceled ? 'bg-rose-500 text-white' :
                          isMissing ? 'bg-amber-500 text-white' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {isDone ? 'DONE ✅' : isCanceled ? 'Canceled ❌' : isMissing ? 'تفاصيل ناقصة ⚠️' : 'قيد التنفيذ ⏳'}
                        </span>
                      </div>

                      <h4 className={`text-sm font-black text-white arabic-text leading-snug pt-1 ${
                        isCanceled ? 'line-through decoration-rose-500 decoration-2 opacity-75' : ''
                      }`}>
                        {taskName}
                      </h4>
                      {item.branch && (
                        <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 arabic-text">
                          📍 {item.branch} {item.teacher ? `| 👨‍🏫 ${item.teacher}` : ''}
                        </span>
                      )}
                    </div>

                    <div className="space-y-3 pt-3 border-t border-white/5 text-xs">
                      <div className="flex items-center justify-between text-muted">
                        <span className="font-bold arabic-text">👤 المسند إليه / المونتير:</span>
                        <span className="font-black text-white font-mono">{editorName}</span>
                      </div>

                      {parsedDrive && (
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-muted arabic-text">🔗 رابط النهائي / Drive:</span>
                          <a 
                            href={parsedDrive.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-primary hover:underline truncate max-w-[160px] font-mono text-[11px]"
                          >
                            {parsedDrive.text}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <FilterContext.Provider value={filterContextValue}>
              {/* Top Horizontal Scrollbar & Quick Controls (Sticky on Scroll) */}
              <div className="sticky top-2 z-40 flex items-center gap-2 mb-3 px-3 py-2 bg-[#070b14]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-xl ring-1 ring-white/5 select-none transition-all">
                {/* Left controls: Scroll Left / Jump to Start */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleScrollToStart}
                    className="px-2.5 py-1.5 text-[11px] font-bold rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-muted hover:text-white flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-sm group"
                    title="الانتقال لأول الجدول (أقصى اليسار)"
                  >
                    <ChevronsLeft size={13} className="text-muted group-hover:text-white transition-colors" />
                    <span>البداية</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScrollHorizontal(-500)}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-muted hover:text-white flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm group"
                    title="تمرير خطوة لليسار"
                  >
                    <ChevronLeft size={14} className="text-muted group-hover:text-white transition-colors" />
                    <span>لليسار</span>
                  </button>
                </div>

                {/* Scrollbar Track */}
                <div 
                  ref={topScrollRef} 
                  onScroll={syncScrollFromTop}
                  className="flex-1 overflow-x-auto top-scroll-track rounded-xl select-none"
                  style={{ height: '14px' }}
                >
                  <div 
                    ref={topScrollInnerRef} 
                    style={{ width: '2400px', height: '1px' }} 
                  />
                </div>

                {/* Right controls: Scroll Right / Jump to End */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleScrollHorizontal(500)}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-muted hover:text-white flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm group"
                    title="تمرير خطوة لليمين"
                  >
                    <span>لليمين</span>
                    <ChevronRight size={14} className="text-muted group-hover:text-white transition-colors" />
                  </button>
                  <button
                    type="button"
                    onClick={handleScrollToEnd}
                    className="px-2.5 py-1.5 text-[11px] font-bold rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-muted hover:text-white flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-sm group"
                    title="الانتقال لآخر الجدول (أقصى اليمين)"
                  >
                    <span>النهاية</span>
                    <ChevronsRight size={13} className="text-muted group-hover:text-white transition-colors" />
                  </button>
                </div>
              </div>

              <div 
                ref={tableScrollRef}
                onScroll={syncScrollFromTable}
                className="table-container overflow-auto max-h-[calc(100vh-175px)] rounded-2xl border border-white/10 shadow-2xl bg-[#0a0f1d]/40 backdrop-blur-sm pb-8"
              >
                <table className={`text-right border-separate border-spacing-0 w-full ${isReelsTableTab ? 'min-w-[2600px]' : isOperations ? 'min-w-[1600px]' : 'min-w-[1400px]'}`}>
                  <thead className="sticky top-0 z-30 bg-[#0c1222] shadow-[0_4px_20px_rgba(0,0,0,0.5)] border-b border-white/10">
                    <tr className="bg-[#0c1222]/95 backdrop-blur-md">
                      {renderHeaders()}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {/* Quick-Add Row for Reels Sheets GIDs */}
                    {['1436746012', '798246690', '0'].includes(activeGid) && profile?.role && (activeGid === '1436746012' || activeGid === '0' || PERMISSIONS.canAddEntry(profile.role)) && !effectiveLoading && (
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
                      {effectiveLoading ? (
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
                            <div className="relative">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-bold arabic-text border-r-4 border-emerald-500 pr-3 flex items-center gap-2">
                                  <span>الترم الأول (T1)</span>
                                  {activeAcademicTerm === 'T1' && (
                                    <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                      الترم النشط أداءً ⚡
                                    </span>
                                  )}
                                </h4>
                                {activeAcademicTerm !== 'T1' && (
                                  <span className="bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-black px-3 py-1 rounded-xl flex items-center gap-1.5">
                                    <XCircle size={14} /> مغلق حالياً (الترم غير نشط)
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {Object.entries(yearLabels).map(([yearKey, label]) => {
                                  const count = liveData.filter((i: any) => i.teacher === teacherFilter && i.year === yearKey && i.term === 'T1').length;
                                  const isTermDisabled = activeAcademicTerm !== 'T1';

                                  return (
                                    <button
                                      key={`T1-${yearKey}`}
                                      disabled={count === 0 || isTermDisabled}
                                      onClick={() => {
                                        if (isTermDisabled) return;
                                        setYearFilter(yearKey);
                                        setTermFilter('T1');
                                      }}
                                      className={`p-6 text-center rounded-2xl group transition-all duration-300 border relative overflow-hidden ${
                                        isTermDisabled
                                          ? 'bg-rose-950/20 border-rose-500/30 text-rose-300/40 cursor-not-allowed opacity-60'
                                          : count === 0 
                                            ? 'bg-white/5 border-white/10 opacity-40 cursor-not-allowed' 
                                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer'
                                      }`}
                                    >
                                      {isTermDisabled && (
                                        <div className="absolute inset-0 bg-rose-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1 z-20">
                                          <XCircle size={32} className="text-rose-500 animate-pulse" />
                                          <span className="text-[11px] font-black text-rose-300 bg-rose-950/90 border border-rose-500/40 px-2.5 py-0.5 rounded-md">مغلق (الترم الثاني نشط)</span>
                                        </div>
                                      )}
                                      <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4 transition-all ${
                                        isTermDisabled ? 'bg-rose-500/10 text-rose-500' : count === 0 ? 'bg-white/5 text-muted/30' : 'bg-emerald-500/20 text-emerald-400 group-hover:scale-110'
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
                            <div className="relative pt-4 border-t border-white/5">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-bold arabic-text border-r-4 border-rose-500 pr-3 flex items-center gap-2">
                                  <span>الترم الثاني (T2)</span>
                                  {activeAcademicTerm === 'T2' && (
                                    <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                      الترم النشط أداءً ⚡
                                    </span>
                                  )}
                                </h4>
                                {activeAcademicTerm !== 'T2' && (
                                  <span className="bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-black px-3 py-1 rounded-xl flex items-center gap-1.5">
                                    <XCircle size={14} /> مغلق حالياً (الترم غير نشط)
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {Object.entries(yearLabels).map(([yearKey, label]) => {
                                  const count = liveData.filter((i: any) => i.teacher === teacherFilter && i.year === yearKey && i.term === 'T2').length;
                                  const isTermDisabled = activeAcademicTerm !== 'T2';

                                  return (
                                    <button
                                      key={`T2-${yearKey}`}
                                      disabled={count === 0 || isTermDisabled}
                                      onClick={() => {
                                        if (isTermDisabled) return;
                                        setYearFilter(yearKey);
                                        setTermFilter('T2');
                                      }}
                                      className={`p-6 text-center rounded-2xl group transition-all duration-300 border relative overflow-hidden ${
                                        isTermDisabled
                                          ? 'bg-rose-950/20 border-rose-500/30 text-rose-300/40 cursor-not-allowed opacity-60'
                                          : count === 0 
                                            ? 'bg-white/5 border-white/10 opacity-40 cursor-not-allowed' 
                                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer'
                                      }`}
                                    >
                                      {isTermDisabled && (
                                        <div className="absolute inset-0 bg-rose-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1 z-20">
                                          <XCircle size={32} className="text-rose-500 animate-pulse" />
                                          <span className="text-[11px] font-black text-rose-300 bg-rose-950/90 border border-rose-500/40 px-2.5 py-0.5 rounded-md">مغلق (الترم الأول نشط)</span>
                                        </div>
                                      )}
                                      <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4 transition-all ${
                                        isTermDisabled ? 'bg-rose-500/10 text-rose-500' : count === 0 ? 'bg-white/5 text-muted/30' : 'bg-emerald-500/20 text-emerald-400 group-hover:scale-110'
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
                    ) : filteredData.length > 0 ? filteredData.slice(0, activeVisibleRecordsLimit).map((item: any, idx: number) => {
                      const itemKey = item.uniqueKey || generateKey(item);
                      const isGlowing = glowingKeys.includes(itemKey);

                      if (isOperations) {
                        const isSelected = selectedForMerge.some(i => generateKey(i) === generateKey(item));
                        const selectedTeacher = selectedForMerge.length > 0 ? (selectedForMerge[0]?.teacher || '').trim() : '';
                        const selectedStageGid = selectedForMerge.length > 0 ? getTargetStageGid(selectedForMerge[0]).gid : '';
                        return (
                          <OperationsRow
                            key={idx}
                            item={item}
                            index={idx}
                            youtubeItems={youtubeItems}
                            onYoutubeToggle={handleYoutubeToggle}
                            isSelectedForMerge={isSelected}
                            onToggleMergeSelect={handleToggleMergeSelect}
                            selectedTeacher={selectedTeacher}
                            selectedStageGid={selectedStageGid}
                            isGlowing={isGlowing}
                            onOpenBunnyLinkModal={(itemKey: string, itemName: string, initialUrl: string) => setBunnyLinkModal({ isOpen: true, itemKey, itemName, initialUrl })}
                          />
                        );
                      }
                      if (isTagme3at) {
                        const tabLimit = tabPriorityLimits[activeGid] ?? 10;
                        const totalPriorityToday = combinedData.filter((i: any) => {
                          const key = i.uniqueKey || generateKey(i);
                          const isDone = taskStatuses[key]?.done !== undefined ? taskStatuses[key].done === true : (String(i.done) === 'true' || i.done === true);
                          if (isDone) return false;
                          const isPri = !isDemo && (isTagme3at || isAnalyticsTagme)
                            ? (i.priority === true || taskPriorities[key] === true)
                            : (taskPriorities[key] !== undefined ? taskPriorities[key] === true : (String(i.priority) === 'true' || i.priority === true));
                          return isPri;
                        }).length;
                        const key = item.uniqueKey || generateKey(item);
                        const isItemPri = !isDemo
                          ? (item.priority === true || taskPriorities[key] === true)
                          : (taskPriorities[key] !== undefined ? taskPriorities[key] === true : (item.priority === true));
                        const canRaisePriority = tabLimit >= 999 ? true : (totalPriorityToday < tabLimit);
                        const isSubscribed = (subscribedTasks || []).some(k => {
                          const ck = String(k).trim().toLowerCase().replace(/^tgm-/, '');
                          const candidates = [key, item.uniqueKey, item.id, item.name].filter(Boolean).map(c => String(c).trim().toLowerCase().replace(/^tgm-/, ''));
                          return candidates.some(c => c === ck || c.includes(ck) || ck.includes(c));
                        }) || (item.editor && item.editor.toLowerCase() === profile?.name?.toLowerCase());
                        return <TagmeRow key={idx} item={item} index={idx} isSimple={tagmeViewMode === 'SIMPLE'} onUpdateEditor={handleUpdateEditor} editorsList={editorsList} onUpdateEditorNotes={handleUpdateEditorNotes} onUpdateMarketingNotes={handleUpdateMarketingNotes} opSheetsList={opSheetsList} branchesList={branchesList} onUpdateOpSheet={handleUpdateOpSheet} onUpdateBranch={handleUpdateBranch} onUpdateDate={handleUpdateDate} isGlowing={isGlowing} liveData={liveData} canRaisePriority={canRaisePriority || isItemPri} priorityLimit={tabLimit} onStatusChange={handleStatusChange} isSubscribed={isSubscribed} onToggleSubscribe={() => toggleSubscribe(item.uniqueKey || key)} priorityOverride={isItemPri} statusOverride={taskStatuses[key] || taskStatuses[item.uniqueKey] || taskStatuses[item.id] || (item.done !== undefined || item.cancel !== undefined || item.missingDetails !== undefined || item.missing_details !== undefined ? { done: item.done === true, cancel: item.cancel === true || item.missingDetails === true || item.missing_details === true, missingDetails: item.missingDetails === true || item.missing_details === true || item.cancel === true } : undefined)} onUpdateThumbnailLink={handleUpdateThumbnailLink} onUpdateTime={handleUpdateTime} onUpdateYoutubeLink={handleUpdateYoutubeLink} onUpdateUploaded={handleUpdateUploaded} onShowPriorityLimitModal={(limit: number) => setPriorityLimitModal({ isOpen: true, limit })} />;
                      }
                      if (activeGid === '0') {
                        const isSubscribed = Boolean(
                          (item.code && subscribedSet.has(String(item.code).toLowerCase())) ||
                          (item.id && subscribedSet.has(String(item.id).toLowerCase())) ||
                          (item.uniqueKey && subscribedSet.has(String(item.uniqueKey).toLowerCase()))
                        );
                        return <CutsRow 
                          key={item.id || item.code || item.uniqueKey || idx} 
                          item={item} 
                          index={idx} 
                          onUpdateShootingRow={handleUpdateShootingRow}
                          onToggleEditCheck={handleToggleEditCheck}
                          liveData={liveData} 
                          optionsLists={cutsOptionsLists} 
                          autofillDrag={autofillDrag} 
                          setAutofillDrag={setAutofillDrag} 
                          onApplyAutofill={handleApplyAutofill} 
                          activeCell={activeCell} 
                          setActiveCell={setActiveCell} 
                          toast={toast}
                          isSubscribed={isSubscribed}
                          onToggleSubscribe={toggleSubscribe}
                          noteAuthors={noteAuthors}
                          allReelsCodes={allReelsCodesSet}
                          sequenceRegistry={sequenceRegistry}
                        />;
                      }
                      if (['1436746012', '1939073164', '798246690'].includes(activeGid)) {
                        const isSubscribed = Boolean(
                          (item.code && subscribedSet.has(String(item.code).toLowerCase())) ||
                          (item.id && subscribedSet.has(String(item.id).toLowerCase())) ||
                          (item.uniqueKey && subscribedSet.has(String(item.uniqueKey).toLowerCase()))
                        );
                        return <ShootingRow key={item.code || item.id || item.uniqueKey || idx} item={item} index={idx} activeGid={activeGid} onToggleFilmed={handleFilmedToggle} onToggleEditCheck={handleToggleEditCheck} loadingFilmedCode={loadingFilmedCode} onUpdateShootingRow={handleUpdateShootingRow} liveData={liveData} allReelsCodes={allReelsCodesSet} sequenceRegistry={sequenceRegistry} optionsLists={reelsOptionsLists} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApplyAutofill={handleApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} toast={toast} isSubscribed={isSubscribed} onToggleSubscribe={toggleSubscribe} isSimple={activeGid === '1939073164' && veViewMode === 'SIMPLE'} publishedTasks={publishedTasks} sharedLinks={sharedLinks} onTogglePublish={handleTogglePublish} onUpdateSharedLink={handleUpdateSharedLink} noteAuthors={noteAuthors} />;
                      }
                      return <StageRow key={idx} item={item} index={idx} tagmeTransfers={tagmeTransfers} onTagmeToggle={handleTagmeToggle} activeLabel={activeLabel} isGlowing={isGlowing} onUpdateDate={handleUpdateDate} onUpdateWeek={handleUpdateWeek} onUpdateThumbnailLink={handleUpdateThumbnailLink} onUpdateTime={handleUpdateTime} onUpdateYoutubeLink={handleUpdateYoutubeLink} onUpdateUploaded={handleUpdateUploaded} onToggleDelivered={handleToggleDelivered} onDeleteRow={handleDeleteStageRow} />;
                    }) : (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <td colSpan={colSpan} className="py-40 text-center opacity-30">
                          <AlertCircle size={48} className="mx-auto mb-6 stroke-1" />
                          <p className="text-xs font-black uppercase tracking-[0.3em]">No Records Found</p>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                  {filteredData.length > activeVisibleRecordsLimit && !(isOperations && teacherFilter === 'All') && (
                    <tr ref={sentinelRef}>
                      <td colSpan={colSpan} className="py-8 text-center">
                        <div className="flex flex-col items-center justify-center gap-3 animate-fadeIn">
                          <p className="text-xs text-muted font-bold">
                            تم عرض <span className="text-primary font-mono font-black">{Math.min(filteredData.length, activeVisibleRecordsLimit)}</span> من إجمالي <span className="text-white font-mono font-black">{filteredData.length}</span> سجل
                          </p>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setActiveVisibleRecordsLimit(prev => Math.min(filteredData.length, prev + 50))}
                              className="px-6 py-2.5 rounded-2xl bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 hover:border-primary/60 text-xs font-black transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-lg shadow-primary/10 active:scale-95"
                            >
                              <span>عرض 50 سجل إضافي ({Math.min(filteredData.length, activeVisibleRecordsLimit + 50)} / {filteredData.length})</span>
                              <ChevronDown size={14} />
                            </button>
                            <button
                              onClick={() => setActiveVisibleRecordsLimit(filteredData.length)}
                              className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-bold transition-all duration-300 cursor-pointer"
                            >
                              عرض الكل ({filteredData.length})
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </FilterContext.Provider>
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
                  <span className="text-base font-bold text-white arabic-text flex items-center gap-2">
                    <span>تم تحديد عدة دروس لتجميعها معاً في يوتيوب 🔗</span>
                    {selectedForMerge[0]?.teacher && (
                      <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-lg">
                        المدرس: {selectedForMerge[0].teacher}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-emerald-400 font-bold arabic-text mt-1">{calculateTotalDuration(sortTasksByChunkAscending(selectedForMerge))}</span>
                  <span className="text-[10px] text-purple-300 arabic-text line-clamp-1 mt-0.5">{sortTasksByChunkAscending(selectedForMerge).map(i => i.name).join(' + ')}</span>
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
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              className="fixed bottom-4 left-4 z-[150] bg-[#061e14]/95 border border-emerald-500/40 px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-3 max-w-md text-white backdrop-blur-md"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div className="flex flex-col text-right min-w-0" dir="rtl">
                <span className="text-xs font-bold text-white arabic-text truncate">تم النسخ إلى شيت VE 🚀</span>
                <span className="text-[10px] text-emerald-300 font-mono truncate">{activeVeToast.item.id}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    setActiveGid('1939073164');
                    setActiveLabel('Ve');
                    setActiveVeToast(null);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer"
                >
                  <span>للشيت</span>
                  <ChevronRight size={13} />
                </button>
                <button
                  onClick={() => setActiveVeToast(null)}
                  className="text-muted hover:text-white p-1 transition-colors cursor-pointer"
                >
                  <XCircle size={15} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating compact toasts container */}
        <div className="fixed bottom-4 right-4 z-[300] flex flex-col gap-2 pointer-events-none max-w-xs w-full">
          <AnimatePresence>
            {itemToasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, x: 40 }}
                className="pointer-events-auto bg-[#0a0e14]/95 border border-emerald-500/35 shadow-lg rounded-xl px-3.5 py-2.5 flex gap-2.5 items-center relative overflow-hidden backdrop-blur-md"
                dir="rtl"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-xs font-bold text-white leading-snug line-clamp-2 arabic-text">{toast.name}</p>
                  {toast.filingName && (
                    <p className="text-[9px] font-mono text-muted/60 truncate uppercase tracking-wider">{toast.filingName}</p>
                  )}
                </div>
                <button 
                  onClick={() => setItemToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="text-muted hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <XCircle size={14} />
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

        {/* Priority Limit Warning Modal Popup */}
        <AnimatePresence>
          {priorityLimitModal && priorityLimitModal.isOpen && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
              onClick={() => setPriorityLimitModal(null)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 25 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.9, y: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#0e121a] border-2 border-rose-500/50 rounded-3xl p-7 max-w-md w-full text-center shadow-[0_0_90px_rgba(244,63,94,0.4)] relative overflow-hidden"
                dir="rtl"
              >
                <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <AlertCircle size={36} />
                </div>
                <h3 className="text-xl font-black text-white arabic-text mb-3">تم الوصول للحد الأقصى للأولوية! ⚠️</h3>
                <p className="text-sm text-white/80 arabic-text leading-relaxed mb-4">
                  لقد تم استهلاك الحد الأقصى للمهام ذات الأولوية في هذا التاب:
                </p>
                <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 mb-5 font-black text-sm">
                  <span>الحد الأقصى المسموح به:</span>
                  <span className="font-mono text-base text-rose-200 bg-rose-500/25 px-3 py-0.5 rounded-xl border border-rose-400/30 font-bold" dir="ltr">
                    {priorityLimitModal.limit} {priorityLimitModal.limit === 1 ? 'مهمة' : priorityLimitModal.limit === 2 ? 'مهمتان' : 'مهام'}
                  </span>
                </div>
                <p className="text-xs text-white/60 arabic-text leading-relaxed mb-6 bg-white/[0.03] border border-white/10 rounded-2xl p-3">
                  💡 لا يمكنك تفعيل الأولوية لمهمة إضافية إلا بعد إزالة الأولوية عن مهمة أخرى، أو تعديل الحد من قبل الإدارة.
                </p>
                <button
                  onClick={() => setPriorityLimitModal(null)}
                  className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black rounded-2xl shadow-lg shadow-rose-600/30 transition-all scale-100 hover:scale-[1.02] active:scale-95 cursor-pointer text-sm"
                >
                  حسناً، فهمت ✓
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback & Bug Report Modal */}
        {showFeedbackModal && (
          <FeedbackModal
            isOpen={showFeedbackModal}
            onClose={() => setShowFeedbackModal(false)}
            currentPage={activeLabel}
            userProfile={profile}
            toast={toast}
          />
        )}

        {/* System Guide & Page Explainer Modal */}
        {showGuideModal && (
          <SystemGuideModal
            isOpen={showGuideModal}
            onClose={() => setShowGuideModal(false)}
            currentGid={activeGid}
            currentLabel={activeLabel}
          />
        )}

        {/* Change Password Modal */}
        {showChangePasswordModal && profile && (
          <ChangePasswordModal
            user={profile}
            onClose={() => setShowChangePasswordModal(false)}
            onSuccess={(msg) => {
              toast.success(msg || 'تم تغيير كلمة المرور بنجاح');
              setShowChangePasswordModal(false);
            }}
          />
        )}

        {/* Interactive Step-by-Step Walkthrough Tour */}
      </main>
      )}
    </div>
    </React.Suspense>
  );
}

// ─── Auth Gate ─────────────────────────────────────────────────────────────────
function AppWithAuth({ isDemoMode = false }: { isDemoMode?: boolean }) {
  const isDemo = isDemoMode || (typeof window !== 'undefined' && (window.location.search.includes('demo=true') || window.location.pathname.includes('demo')));
  const { user, profile, loading } = useAuth();

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-[#060a12] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-xs font-black text-purple-400 uppercase tracking-[0.4em]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && !profile && !isDemo) return <LoginPage />;
  return <App isDemoMode={isDemo} />;
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

function RootApp({ isDemoMode = false }: { isDemoMode?: boolean }) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthProvider>
      <PresenceProvider>
        <div className="w-full h-full relative">
          <AppWithAuth isDemoMode={isDemoMode} />
          <AnimatePresence>
            {showSplash && (
              <motion.div
                key="splash-overlay"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="fixed inset-0 z-[9999] pointer-events-none"
              >
                <SplashScreen onComplete={() => setShowSplash(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PresenceProvider>
    </AuthProvider>
  );
}

export default function Root({ isDemoMode = false }: { isDemoMode?: boolean } = {}) {
  return <RootApp isDemoMode={isDemoMode} />;
}

