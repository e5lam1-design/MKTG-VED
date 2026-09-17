import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ListFilter, 
  Search, 
  ExternalLink, 
  RefreshCw, 
  Layers, 
  Video, 
  Sparkles, 
  User, 
  FileText,
  Briefcase,
  Zap,
  Edit3
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../lib/supabase';
import { toast } from '../lib/toast';

export interface UnifiedTask {
  id: string;
  uniqueKey: string;
  title: string;
  code?: string;
  sourceSheet: string;
  sourceGid: string;
  status: 'pending' | 'in_progress' | 'has_edits' | 'completed';
  statusLabel: string;
  assignedTo: string;
  notes?: string;
  date?: string;
  priority?: boolean;
  done?: boolean;
  link?: string;
  details?: any;
  isAssignedToMe: boolean;
  isNewlyAdded: boolean;
  isPriority: boolean;
  isEdit: boolean;
  createdAt?: string;
}

interface HomeViewProps {
  currentUser: UserProfile | null;
  onNavigateToStage: (gid: string, label: string, uniqueKey?: string) => void;
  isDemo?: boolean;
}

const STAGE_CONFIGS: { gid: string; label: string; table: string }[] = [
  { gid: '497207661', label: 'Junior 4', table: 'stage_j4_26' },
  { gid: '96752860', label: 'Junior 5', table: 'stage_j5_26' },
  { gid: '346788121', label: 'Junior 6', table: 'stage_j6_26' },
  { gid: '458352282', label: 'Middle 1', table: 'stage_m1_26' },
  { gid: '2113852114', label: 'Middle 2', table: 'stage_m2_26' },
  { gid: '2089699920', label: 'Middle 3', table: 'stage_m3_26' },
  { gid: '1640460225', label: 'Senior 1', table: 'stage_s1_26' },
  { gid: '595027661', label: 'Senior 2', table: 'stage_s2_26' },
  { gid: '286303232', label: 'Senior 3', table: 'stage_s3_26' },
];

export const HomeView: React.FC<HomeViewProps> = ({
  currentUser,
  onNavigateToStage,
  isDemo = false
}) => {
  const [tasks, setTasks] = useState<UnifiedTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'my_tasks' | 'newly_added' | 'priority' | 'has_edits' | 'pending' | 'completed'>('all');
  const [sheetFilter, setSheetFilter] = useState<string>('all');

  // For Admin / Manager: ability to view tasks of any user
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedUserName, setSelectedUserName] = useState<string>(() => {
    return currentUser?.name || currentUser?.email || '';
  });

  const canSwitchUsers = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  // Load user list for dropdown if admin/manager
  useEffect(() => {
    if (canSwitchUsers) {
      supabase
        .from('user_profiles')
        .select('*')
        .order('name', { ascending: true })
        .then(({ data }) => {
          if (data) setAllUsers(data as UserProfile[]);
        });
    }
  }, [canSwitchUsers]);

  // Keep selectedUserName synced with currentUser on mount
  useEffect(() => {
    if (currentUser?.name && !selectedUserName) {
      setSelectedUserName(currentUser.name);
    }
  }, [currentUser]);

  // Main task fetching function
  const fetchUserTasks = async (targetName: string) => {
    setLoading(true);

    const targetLower = (targetName || '').toLowerCase().trim();
    const collected: UnifiedTask[] = [];
    const SEVEN_DAYS_AGO = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const checkIsAssignedToMe = (assignedName: string, notesText: string) => {
      if (!targetLower) return false;
      const assLower = (assignedName || '').toLowerCase().trim();
      const nLower = (notesText || '').toLowerCase().trim();
      if (!assLower || assLower === 'غير محدد' || assLower === '---') return false;
      return (
        assLower === targetLower ||
        (targetLower.length > 2 && assLower.includes(targetLower)) ||
        (targetLower.length > 2 && targetLower.includes(assLower)) ||
        nLower.includes(targetLower)
      );
    };

    const checkIsNewlyAdded = (createdAt?: string, assignedName?: string, isDone?: boolean) => {
      if (isDone) return false;
      if (createdAt) {
        const time = new Date(createdAt).getTime();
        if (!isNaN(time) && time > SEVEN_DAYS_AGO) return true;
      }
      const assLower = (assignedName || '').toLowerCase().trim();
      return !assLower || assLower === 'غير محدد' || assLower === '---';
    };

    try {
      // 1. Fetch from tagme3at_26 & tagme3at_items
      try {
        const [t26Res, tItemsRes] = await Promise.all([
          supabase.from('tagme3at_26').select('*').order('updated_at', { ascending: false }).limit(200),
          supabase.from('tagme3at_items').select('*').order('updated_at', { ascending: false }).limit(200)
        ]);

        const rawTagmeList = [...(t26Res.data || []), ...(tItemsRes.data || [])];
        const seenKeys = new Set<string>();

        rawTagmeList.forEach((item: any) => {
          const key = item.unique_key || String(item.id);
          if (seenKeys.has(key)) return;
          seenKeys.add(key);

          const assigned = item.editor || '';
          const notesText = `${item.notes_marketing || ''} ${item.notes_editors || ''}`.trim();
          const isDone = item.done === true || item.uploaded === true;
          const isPriority = item.priority === true || String(item.priority).toLowerCase() === 'true';
          const isAssigned = checkIsAssignedToMe(assigned, notesText);
          const isNew = checkIsNewlyAdded(item.created_at || item.updated_at, assigned, isDone);
          const isEdit = item.cancel === true || notesText.includes('تعديل') || notesText.includes('edit');

          const qualifies = isAssigned || isNew || isPriority || isEdit || (!targetLower && canSwitchUsers);
          if (!qualifies) return;

          let status: UnifiedTask['status'] = 'in_progress';
          let statusLabel = 'قيد العمل ⏳';

          if (isDone) {
            status = 'completed';
            statusLabel = 'تم الإنجاز ✅';
          } else if (isEdit || notesText.length > 0) {
            status = 'has_edits';
            statusLabel = 'تعديلات وملاحظات 📝';
          }

          collected.push({
            id: key,
            uniqueKey: key,
            title: item.filing_name || item.name || 'تجميعة يوتيوب',
            code: key,
            sourceSheet: item.op_sheet ? `تجميعات (${item.op_sheet})` : 'تجميعات',
            sourceGid: '1535230545',
            status,
            statusLabel,
            assignedTo: assigned || 'غير محدد',
            notes: notesText || undefined,
            date: item.date || item.updated_at?.split('T')[0],
            priority: isPriority,
            done: isDone,
            link: item.youtube_link || item.thumbnail_link,
            isAssignedToMe: isAssigned,
            isNewlyAdded: isNew,
            isPriority: isPriority,
            isEdit: isEdit,
            createdAt: item.created_at || item.updated_at,
            details: item
          });
        });
      } catch (e) {
        console.error('Error fetching tagme3at tasks:', e);
      }

      // 2. Fetch from reels_ve_26
      try {
        const { data: reelsData } = await supabase
          .from('reels_ve_26')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(200);

        if (reelsData) {
          reelsData.forEach((item: any) => {
            const assigned = item.editor_col || item.by || '';
            const notesText = `${item.notes || ''} ${item.editor_notes || ''}`.trim();
            const isDone = item.done === true;
            const isEdit = item.edit_check === true || item.canceled === true || notesText.includes('تعديل') || notesText.includes('edit');
            const isAssigned = checkIsAssignedToMe(assigned, notesText);
            const isNew = checkIsNewlyAdded(item.created_at || item.updated_at, assigned, isDone);
            const isPriority = item.missing_details === true;

            const qualifies = isAssigned || isNew || isPriority || isEdit || (!targetLower && canSwitchUsers);
            if (!qualifies) return;

            let status: UnifiedTask['status'] = 'in_progress';
            let statusLabel = 'قيد المونتاج ⏳';

            if (isDone) {
              status = 'completed';
              statusLabel = 'تم التسليم ✅';
            } else if (isEdit) {
              status = 'has_edits';
              statusLabel = 'مطلوب تعديلات 📝';
            }

            collected.push({
              id: String(item.id || item.code),
              uniqueKey: item.code || String(item.id),
              title: item.code || item.extra_name || 'فيديو ريلز',
              code: item.code,
              sourceSheet: 'Reels (Ve)',
              sourceGid: '1939073164',
              status,
              statusLabel,
              assignedTo: assigned || 'غير محدد',
              notes: notesText || undefined,
              date: item.date || item.filming_date,
              done: isDone,
              link: item.drive_final || item.drive_raw,
              isAssignedToMe: isAssigned,
              isNewlyAdded: isNew,
              isPriority: isPriority,
              isEdit: isEdit,
              createdAt: item.created_at || item.updated_at,
              details: item
            });
          });
        }
      } catch (e) {
        console.error('Error fetching reels_ve tasks:', e);
      }

      // 3. Fetch from reels_cuts_26
      try {
        const { data: cutsData } = await supabase
          .from('reels_cuts_26')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(100);

        if (cutsData) {
          cutsData.forEach((item: any) => {
            const assigned = item.editor || item.creator || '';
            const notesText = `${item.creator_notes || ''} ${item.editor_notes || ''}`.trim();
            const isDone = item.done === true;
            const isEdit = item.problem === true || item.canceled === true || notesText.includes('تعديل') || notesText.includes('edit');
            const isAssigned = checkIsAssignedToMe(assigned, notesText);
            const isNew = checkIsNewlyAdded(item.created_at || item.updated_at, assigned, isDone);
            const isPriority = item.problem === true || item.missing_details === true;

            const qualifies = isAssigned || isNew || isPriority || isEdit || (!targetLower && canSwitchUsers);
            if (!qualifies) return;

            let status: UnifiedTask['status'] = 'in_progress';
            let statusLabel = 'قطع ومونتاج ⏳';

            if (isDone) {
              status = 'completed';
              statusLabel = 'تم التسليم ✅';
            } else if (isEdit) {
              status = 'has_edits';
              statusLabel = 'مشكلة / تعديل 📝';
            }

            collected.push({
              id: String(item.id || item.code),
              uniqueKey: item.code || String(item.id),
              title: `[CUT] ${item.code || item.creator || 'مهمة قطع'}`,
              code: item.code,
              sourceSheet: 'Cuts (ريلز القطع)',
              sourceGid: '0',
              status,
              statusLabel,
              assignedTo: assigned || 'غير محدد',
              notes: notesText || undefined,
              date: item.date,
              done: isDone,
              link: item.drive_final,
              isAssignedToMe: isAssigned,
              isNewlyAdded: isNew,
              isPriority: isPriority,
              isEdit: isEdit,
              createdAt: item.created_at || item.updated_at,
              details: item
            });
          });
        }
      } catch (e) {
        console.error('Error fetching reels_cuts tasks:', e);
      }

      // 4. Fetch from Stage Tables
      try {
        await Promise.all(
          STAGE_CONFIGS.map(async (stg) => {
            try {
              const { data } = await supabase
                .from(stg.table)
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(50);

              if (data && data.length > 0) {
                data.forEach((item: any) => {
                  const assigned = item.name?.includes('-') ? item.name.split('-')[1]?.trim() : '';
                  const notesText = `${item.subject || ''} ${item.branch || ''}`.trim();
                  const isDone = item.delivered === true || item.uploaded === true;
                  const isAssigned = checkIsAssignedToMe(assigned, notesText);
                  const isNew = checkIsNewlyAdded(item.created_at || item.updated_at, assigned, isDone);
                  const isPriority = item.is_tagme3a !== true && !isDone;
                  const isEdit = false;

                  const qualifies = isAssigned || isNew || isPriority || (!targetLower && canSwitchUsers);
                  if (!qualifies) return;

                  collected.push({
                    id: String(item.unique_key || item.id),
                    uniqueKey: String(item.unique_key || item.id),
                    title: item.name || 'درس مرحلة',
                    code: item.unique_key,
                    sourceSheet: stg.label,
                    sourceGid: stg.gid,
                    status: isDone ? 'completed' : 'in_progress',
                    statusLabel: isDone ? 'تم التسليم ✅' : 'قيد الإنجاز ⏳',
                    assignedTo: assigned || 'غير محدد',
                    notes: `المادة: ${item.subject || 'عام'} | الفرع: ${item.branch || '---'} | الأسبوع: ${item.week || '---'}`,
                    date: item.date,
                    done: isDone,
                    link: item.youtube_link || item.thumbnail_link,
                    isAssignedToMe: isAssigned,
                    isNewlyAdded: isNew,
                    isPriority: isPriority,
                    isEdit: isEdit,
                    createdAt: item.created_at || item.updated_at,
                    details: item
                  });
                });
              }
            } catch {}
          })
        );
      } catch (e) {
        console.error('Error fetching stage tasks:', e);
      }

      // 5. Fetch from design_tasks
      try {
        const { data: designData } = await supabase
          .from('design_tasks')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(100);

        if (designData) {
          designData.forEach((item: any) => {
            const assigned = item.designer_name || item.requested_by || '';
            const notesText = item.notes || '';
            const isDone = item.is_done === true;
            const isPriority = item.priority === 'عاجل' || item.priority === 'high' || item.priority === true;
            const isEdit = notesText.includes('تعديل') || notesText.includes('edit');
            const isAssigned = checkIsAssignedToMe(assigned, notesText);
            const isNew = checkIsNewlyAdded(item.created_at || item.updated_at, assigned, isDone);

            const qualifies = isAssigned || isNew || isPriority || isEdit || (!targetLower && canSwitchUsers);
            if (!qualifies) return;

            let status: UnifiedTask['status'] = 'in_progress';
            let statusLabel = 'قيد التصميم ⏳';

            if (isDone) {
              status = 'completed';
              statusLabel = 'تم التسليم ✅';
            } else if (isEdit || (notesText && notesText.trim().length > 0)) {
              status = 'has_edits';
              statusLabel = 'ملاحظات وتعديل 📝';
            }

            collected.push({
              id: String(item.id),
              uniqueKey: String(item.id),
              title: `${item.design_type || 'تصميم'} - ${item.priority || ''}`,
              code: String(item.id),
              sourceSheet: 'تصاميم (Designers)',
              sourceGid: '501319673',
              status,
              statusLabel,
              assignedTo: assigned || 'غير محدد',
              notes: notesText || undefined,
              date: item.assigned_date || item.deadline,
              done: isDone,
              link: item.reference_link,
              isAssignedToMe: isAssigned,
              isNewlyAdded: isNew,
              isPriority: isPriority,
              isEdit: isEdit,
              createdAt: item.created_at || item.updated_at,
              details: item
            });
          });
        }
      } catch (e) {
        console.error('Error fetching design tasks:', e);
      }

      // Sort
      collected.sort((a, b) => {
        if (a.isPriority && !b.isPriority) return -1;
        if (!a.isPriority && b.isPriority) return 1;
        if (a.isEdit && !b.isEdit) return -1;
        if (!a.isEdit && b.isEdit) return 1;
        if (a.isNewlyAdded && !b.isNewlyAdded) return -1;
        if (!a.isNewlyAdded && b.isNewlyAdded) return 1;
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      setTasks(collected);
    } catch (err) {
      console.error('Error fetching user tasks:', err);
      toast.error('حدث خطأ أثناء جلب المهام');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserTasks(selectedUserName);
  }, [selectedUserName]);

  // Statistics calculation across all 4 core requested criteria
  const stats = useMemo(() => {
    const total = tasks.length;
    const assignedToMe = tasks.filter(t => t.isAssignedToMe).length;
    const newlyAdded = tasks.filter(t => t.isNewlyAdded).length;
    const priority = tasks.filter(t => t.isPriority).length;
    const hasEdits = tasks.filter(t => t.isEdit || t.status === 'has_edits').length;
    const completed = tasks.filter(t => t.done || t.status === 'completed').length;
    const inProgress = tasks.filter(t => !t.done && t.status !== 'completed').length;
    return { total, assignedToMe, newlyAdded, priority, hasEdits, completed, inProgress };
  }, [tasks]);

  // Unique source sheets for filter
  const sourceSheets = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => set.add(t.sourceSheet));
    return Array.from(set);
  }, [tasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesNotes = (task.notes || '').toLowerCase().includes(q);
        const matchesCode = (task.code || '').toLowerCase().includes(q);
        const matchesAssigned = task.assignedTo.toLowerCase().includes(q);
        if (!matchesTitle && !matchesNotes && !matchesCode && !matchesAssigned) return false;
      }

      // Category filter (Matches user's requested 4 categories)
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'my_tasks' && !task.isAssignedToMe) return false;
        if (categoryFilter === 'newly_added' && !task.isNewlyAdded) return false;
        if (categoryFilter === 'priority' && !task.isPriority) return false;
        if (categoryFilter === 'has_edits' && !task.isEdit && task.status !== 'has_edits') return false;
        if (categoryFilter === 'pending' && (task.done || task.status === 'completed')) return false;
        if (categoryFilter === 'completed' && (!task.done && task.status !== 'completed')) return false;
      }

      // Sheet filter
      if (sheetFilter !== 'all' && task.sourceSheet !== sheetFilter) {
        return false;
      }

      return true;
    });
  }, [tasks, searchQuery, categoryFilter, sheetFilter]);

  const handleJumpToTask = (task: UnifiedTask) => {
    onNavigateToStage(task.sourceGid, task.sourceSheet, task.uniqueKey);
    toast.success(`🚀 تم الانتقال إلى شيت "${task.sourceSheet}"`);
  };

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      {/* Top Welcome Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-blue-900/30 border border-purple-500/20 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                <User size={24} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white font-tajawal">
                  مرحباً بك، {currentUser?.name || 'يا بطل'} 👋
                </h1>
                <p className="text-xs md:text-sm text-purple-200/80 font-medium mt-0.5">
                  لوحة المهام الشخصية — متابعة التاسكات المسندة إليك والتعديلات المطلوبة
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
            {/* Admin / Manager User Switcher */}
            {canSwitchUsers && allUsers.length > 0 && (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-1.5 shadow-sm">
                <span className="text-xs font-bold text-muted whitespace-nowrap">عرض مهام:</span>
                <select
                  value={selectedUserName}
                  onChange={(e) => setSelectedUserName(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-[#0f172a] text-white">كل الموظفين (الجميع)</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.name} className="bg-[#0f172a] text-white">
                      {u.name} ({u.team || u.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Refresh button */}
            <button
              onClick={() => fetchUserTasks(selectedUserName)}
              disabled={loading}
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-muted hover:text-white transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold"
              title="تحديث المهام"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-purple-400' : ''} />
              <span className="hidden sm:inline">تحديث</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 KPI Metric Cards for Core Categories */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Tasks */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setCategoryFilter('all')}
          className={`p-4 rounded-2xl border backdrop-blur-xl transition-all cursor-pointer ${
            categoryFilter === 'all'
              ? 'bg-purple-950/40 border-purple-500/50 shadow-[0_0_25px_rgba(168,85,247,0.2)] ring-1 ring-purple-400/40'
              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-muted">إجمالي المهام</span>
            <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Briefcase size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">{stats.total}</div>
          <p className="text-[10px] text-purple-300/70 font-medium mt-1">عبر كافة الشيتات</p>
        </motion.div>

        {/* Assigned to Me */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setCategoryFilter('my_tasks')}
          className={`p-4 rounded-2xl border backdrop-blur-xl transition-all cursor-pointer ${
            categoryFilter === 'my_tasks'
              ? 'bg-blue-950/40 border-blue-500/50 shadow-[0_0_25px_rgba(59,130,246,0.2)] ring-1 ring-blue-400/40'
              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-300">مسندة باسمي 👤</span>
            <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <User size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-400 font-mono">{stats.assignedToMe}</div>
          <p className="text-[10px] text-blue-300/70 font-medium mt-1">مهام تحت اسمك المباشر</p>
        </motion.div>

        {/* Newly Added */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setCategoryFilter('newly_added')}
          className={`p-4 rounded-2xl border backdrop-blur-xl transition-all cursor-pointer ${
            categoryFilter === 'newly_added'
              ? 'bg-cyan-950/40 border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.2)] ring-1 ring-cyan-400/40'
              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-cyan-300">لسه متضاف 🆕</span>
            <div className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono">{stats.newlyAdded}</div>
          <p className="text-[10px] text-cyan-300/70 font-medium mt-1">مهام حديثة / غير مسندة</p>
        </motion.div>

        {/* Priority */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setCategoryFilter('priority')}
          className={`p-4 rounded-2xl border backdrop-blur-xl transition-all cursor-pointer ${
            categoryFilter === 'priority'
              ? 'bg-amber-950/40 border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/40'
              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-300">أولوية قصوى ⚡</span>
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">{stats.priority}</div>
          <p className="text-[10px] text-amber-300/70 font-medium mt-1">مهام ذات أولوية عالية</p>
        </motion.div>

        {/* Needs Edits */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setCategoryFilter('has_edits')}
          className={`p-4 rounded-2xl border backdrop-blur-xl transition-all cursor-pointer ${
            categoryFilter === 'has_edits'
              ? 'bg-rose-950/40 border-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.25)] ring-1 ring-rose-400/40'
              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-300">مطلوب إيديت 📝</span>
            <div className="p-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Edit3 size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">{stats.hasEdits}</div>
          <p className="text-[10px] text-rose-300/70 font-medium mt-1">تعديلات وملاحظات مطلوبة</p>
        </motion.div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-xl">
        <div className="relative w-full md:w-80">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في اسم المهمة، الكود، أو الملاحظات..."
            className="w-full bg-[#090d16] border border-white/10 focus:border-purple-500/50 rounded-2xl pr-11 pl-4 py-2 text-xs text-white focus:outline-none transition-all placeholder:text-muted/60 font-medium"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {sourceSheets.length > 1 && (
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-1.5 text-xs font-bold text-muted">
              <ListFilter size={14} />
              <span>الشيت:</span>
              <select
                value={sheetFilter}
                onChange={(e) => setSheetFilter(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#0f172a] text-white">جميع الشيتات</option>
                {sourceSheets.map((s) => (
                  <option key={s} value={s} className="bg-[#0f172a] text-white">{s}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1 bg-[#090d16] p-1 rounded-2xl border border-white/10 flex-wrap">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'my_tasks', label: 'مسندة لي 👤' },
              { id: 'newly_added', label: 'لسه متضاف 🆕' },
              { id: 'priority', label: 'أولوية ⚡' },
              { id: 'has_edits', label: 'إيديت 📝' },
              { id: 'pending', label: 'قيد العمل ⏳' },
              { id: 'completed', label: 'منتهية ✅' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setCategoryFilter(st.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  categoryFilter === st.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-muted hover:text-white'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task List / Table */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-purple-400" />
            <h3 className="text-sm font-black text-white">قائمة المهام</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-purple-300 font-bold">
              {filteredTasks.length} مهمة
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto shadow-lg shadow-purple-500/20" />
            <p className="mt-4 text-xs font-bold text-purple-300 animate-pulse">جاري جلب مهامك، الإضافات الجديدة، والتعديلات...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-24 text-center text-muted flex flex-col items-center justify-center gap-3">
            <CheckCircle2 size={40} className="opacity-20 text-emerald-400" />
            <div className="text-base font-bold text-white">لا توجد مهام مطابقة للفلتر المحدد</div>
            <p className="text-xs text-muted/70 max-w-sm">
              {categoryFilter === 'has_edits'
                ? 'رائع! لا توجد أي تعديلات أو ملاحظات مفتوحة تخصك حالياً 🎉'
                : categoryFilter === 'priority'
                ? 'لا توجد مهام أولوية حالياً في هذا القسم.'
                : categoryFilter === 'newly_added'
                ? 'لا توجد مهام مضافة حديثاً غير مسندة.'
                : 'لم يتم العثور على مهام مسندة بهذا الاسم في الشيتات الحالية.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filteredTasks.map((task, idx) => (
              <motion.div
                key={task.id || idx}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                className={`p-5 hover:bg-white/[0.02] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group ${
                  task.isPriority ? 'bg-amber-500/[0.02]' : task.isEdit ? 'bg-rose-500/[0.02]' : ''
                }`}
              >
                {/* Right: Task Details */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Source Sheet */}
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-[11px] font-bold text-purple-300 flex items-center gap-1">
                      <Layers size={12} />
                      <span>{task.sourceSheet}</span>
                    </span>

                    {/* Assigned user badge */}
                    {task.isAssignedToMe ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm flex items-center gap-1">
                        <User size={11} />
                        <span>مسندة إليك 👤</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-muted border border-white/10">
                        {task.assignedTo || 'غير مسند'}
                      </span>
                    )}

                    {/* Newly Added badge */}
                    {task.isNewlyAdded && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 shadow-sm">
                        <Sparkles size={11} />
                        <span>لسه متضاف 🆕</span>
                      </span>
                    )}

                    {/* Priority badge */}
                    {task.isPriority && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                        <Zap size={11} />
                        <span>أولوية ⚡</span>
                      </span>
                    )}

                    {/* Needs Edit badge */}
                    {task.isEdit && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 shadow-[0_0_12px_rgba(244,63,94,0.25)]">
                        <Edit3 size={11} />
                        <span>مطلوب إيديت 📝</span>
                      </span>
                    )}

                    {/* General status badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                        task.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : task.status === 'has_edits'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                          : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                      }`}
                    >
                      {task.statusLabel}
                    </span>

                    {task.date && (
                      <span className="text-[11px] font-mono text-muted/80">
                        📅 {task.date}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-black text-white group-hover:text-purple-300 transition-colors truncate" title={task.title}>
                    {task.title}
                  </h4>

                  {/* Highlighted Notes / Edits Box */}
                  {task.notes && (
                    <div className="p-3 rounded-2xl bg-amber-500/[0.06] border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2 max-w-2xl leading-relaxed">
                      <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-bold text-amber-300">ملاحظات / تفاصيل: </span>
                        <span>{task.notes}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Left: Action Buttons */}
                <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => handleJumpToTask(task)}
                    className="px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600 border border-purple-500/40 hover:border-purple-500 text-purple-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md group/btn cursor-pointer"
                  >
                    <span>الانتقال للصف</span>
                    <ExternalLink size={13} className="group-hover/btn:translate-x-[-2px] transition-transform" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
