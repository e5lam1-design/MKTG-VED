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
  Sparkles, 
  User, 
  FileText,
  Briefcase,
  Zap,
  Edit3,
  HandMetal,
  Check,
  CheckCheck,
  Play
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
  isClaimable: boolean;
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

export function resolveUserAliases(user: UserProfile | null, overrideName?: string): string[] {
  const set = new Set<string>();
  const nameToUse = (overrideName || user?.name || '').trim().toLowerCase();
  
  if (nameToUse) {
    set.add(nameToUse);
    const firstName = nameToUse.split(' ')[0];
    if (firstName.length > 2) set.add(firstName);
  }

  if (!overrideName || overrideName === user?.name) {
    if (user?.email) {
      const emailPrefix = user.email.split('@')[0].trim().toLowerCase();
      if (emailPrefix) set.add(emailPrefix);
    }
    const localEditor = localStorage.getItem('user_editor_name')?.trim().toLowerCase();
    if (localEditor) set.add(localEditor);
  }

  // Handle ADMIN / ESLAM mapping
  if (
    set.has('admin') || 
    set.has('eslam') || 
    user?.email?.toLowerCase().includes('eslam') ||
    user?.name?.toLowerCase() === 'admin'
  ) {
    set.add('eslam');
    set.add('admin');
  }

  return Array.from(set).filter(Boolean);
}

export const HomeView: React.FC<HomeViewProps> = ({
  currentUser,
  onNavigateToStage,
  isDemo = false
}) => {
  const [tasks, setTasks] = useState<UnifiedTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [togglingDoneId, setTogglingDoneId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Category tabs exactly as requested by user
  type CategoryFilter = 
    | 'my_pending' 
    | 'my_priority' 
    | 'my_edits' 
    | 'my_completed' 
    | 'my_all' 
    | 'available_unassigned' 
    | 'all_system';

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('my_pending');
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

  // Editor name used when claiming tasks
  const claimEditorName = useMemo(() => {
    if (currentUser?.email?.toLowerCase().includes('eslam') || currentUser?.name?.toLowerCase() === 'admin') {
      return 'ESLAM';
    }
    return currentUser?.name?.trim().toUpperCase() || 'ESLAM';
  }, [currentUser]);

  // Main task fetching function
  const fetchUserTasks = async (targetName: string) => {
    setLoading(true);

    const userAliases = resolveUserAliases(currentUser, targetName);
    const collected: UnifiedTask[] = [];

    const checkIsAssigned = (assignedName?: string, notesText?: string) => {
      if (!userAliases.length) return false;
      const assLower = (assignedName || '').toLowerCase().trim();
      if (!assLower || assLower === 'غير محدد' || assLower === '---') return false;
      
      const isDirectMatch = userAliases.some(alias => 
        assLower === alias || 
        assLower.includes(alias) || 
        alias.includes(assLower)
      );
      if (isDirectMatch) return true;

      const nLower = (notesText || '').toLowerCase().trim();
      return userAliases.some(alias => alias.length > 2 && nLower.includes(alias));
    };

    const checkIsClaimable = (assignedName?: string, isDone?: boolean) => {
      if (isDone) return false;
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
          const isEdit = item.cancel === true || notesText.includes('تعديل') || notesText.includes('edit');
          const isAssigned = checkIsAssigned(assigned, notesText);
          const isClaimable = checkIsClaimable(assigned, isDone);

          if (!isAssigned && !isClaimable && !isPriority && !isEdit && !canSwitchUsers) return;

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
            isClaimable,
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
            const isAssigned = checkIsAssigned(assigned, notesText);
            const isClaimable = checkIsClaimable(assigned, isDone);
            const isPriority = item.missing_details === true;

            if (!isAssigned && !isClaimable && !isPriority && !isEdit && !canSwitchUsers) return;

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
              isClaimable,
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
            const isAssigned = checkIsAssigned(assigned, notesText);
            const isClaimable = checkIsClaimable(assigned, isDone);
            const isPriority = item.problem === true || item.missing_details === true;

            if (!isAssigned && !isClaimable && !isPriority && !isEdit && !canSwitchUsers) return;

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
              isClaimable,
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
                .limit(40);

              if (data && data.length > 0) {
                data.forEach((item: any) => {
                  const assigned = item.name?.includes('-') ? item.name.split('-')[1]?.trim() : '';
                  const notesText = `${item.subject || ''} ${item.branch || ''}`.trim();
                  const isDone = item.delivered === true || item.uploaded === true;
                  const isAssigned = checkIsAssigned(assigned, notesText);
                  const isClaimable = checkIsClaimable(assigned, isDone);
                  const isPriority = item.is_tagme3a !== true && !isDone;
                  const isEdit = false;

                  if (!isAssigned && !isClaimable && !isPriority && !canSwitchUsers) return;

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
                    isClaimable,
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
          .limit(60);

        if (designData) {
          designData.forEach((item: any) => {
            const assigned = item.designer_name || item.requested_by || '';
            const notesText = item.notes || '';
            const isDone = item.is_done === true;
            const isPriority = item.priority === 'عاجل' || item.priority === 'high' || item.priority === true;
            const isEdit = notesText.includes('تعديل') || notesText.includes('edit');
            const isAssigned = checkIsAssigned(assigned, notesText);
            const isClaimable = checkIsClaimable(assigned, isDone);

            if (!isAssigned && !isClaimable && !isPriority && !isEdit && !canSwitchUsers) return;

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
              isClaimable,
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

      // Sort tasks: Assigned first, then Priority, then Edits, then newest
      collected.sort((a, b) => {
        if (a.isAssignedToMe && !b.isAssignedToMe) return -1;
        if (!a.isAssignedToMe && b.isAssignedToMe) return 1;
        if (a.isPriority && !b.isPriority) return -1;
        if (!a.isPriority && b.isPriority) return 1;
        if (a.isEdit && !b.isEdit) return -1;
        if (!a.isEdit && b.isEdit) return 1;
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

  // Statistics calculation across the 4 requested states + claimable tasks
  const stats = useMemo(() => {
    const myTasks = tasks.filter(t => t.isAssignedToMe);
    const myPending = myTasks.filter(t => !t.done && !t.isEdit).length;
    const myPriority = myTasks.filter(t => t.isPriority).length;
    const myEdits = myTasks.filter(t => t.isEdit).length;
    const myCompleted = myTasks.filter(t => t.done).length;
    const myTotal = myTasks.length;
    
    const availableUnassigned = tasks.filter(t => t.isClaimable).length;
    const totalSystem = tasks.length;

    return { 
      myPending, 
      myPriority, 
      myEdits, 
      myCompleted, 
      myTotal, 
      availableUnassigned, 
      totalSystem 
    };
  }, [tasks]);

  // Adjust default category based on user tasks availability on initial load
  useEffect(() => {
    if (!loading && tasks.length > 0) {
      if (stats.myPending > 0) {
        setCategoryFilter('my_pending');
      } else if (stats.myEdits > 0) {
        setCategoryFilter('my_edits');
      } else if (stats.myTotal > 0) {
        setCategoryFilter('my_all');
      } else if (stats.availableUnassigned > 0) {
        setCategoryFilter('available_unassigned');
      }
    }
  }, [loading]);

  // Claim Task Handler
  const handleClaimTask = async (task: UnifiedTask) => {
    try {
      setClaimingId(task.id);
      const now = new Date().toISOString();
      const editorNameToAssign = claimEditorName;

      // Update Supabase based on source table
      if (task.sourceGid === '1535230545') {
        // Tagme3at
        await Promise.all([
          supabase.from('tagme3at_26').update({ editor: editorNameToAssign, updated_at: now }).eq('unique_key', task.uniqueKey),
          supabase.from('tagme3at_items').update({ editor: editorNameToAssign, updated_at: now }).eq('unique_key', task.uniqueKey)
        ]);
      } else if (task.sourceGid === '1939073164') {
        // Reels Ve
        await supabase.from('reels_ve_26').update({ editor_col: editorNameToAssign, updated_at: now }).eq('code', task.code || task.uniqueKey);
      } else if (task.sourceGid === '0') {
        // Reels Cuts
        await supabase.from('reels_cuts_26').update({ editor: editorNameToAssign, updated_at: now }).eq('code', task.code || task.uniqueKey);
      } else {
        // Stage table
        const stg = STAGE_CONFIGS.find(s => s.gid === task.sourceGid);
        if (stg) {
          await supabase.from(stg.table).update({ name: `${task.title} - ${editorNameToAssign}`, updated_at: now }).eq('unique_key', task.uniqueKey);
        }
      }

      // Update local state immediately
      setTasks(prev => prev.map(t => {
        if (t.id === task.id || t.uniqueKey === task.uniqueKey) {
          return {
            ...t,
            assignedTo: editorNameToAssign,
            isAssignedToMe: true,
            isClaimable: false,
            status: 'in_progress',
            statusLabel: 'قيد العمل ⏳'
          };
        }
        return t;
      }));

      toast.success(`🎉 تم استلام المهمة بنجاح وإسنادها إليك!`);
      setCategoryFilter('my_pending');
    } catch (err) {
      console.error('Error claiming task:', err);
      toast.error('حدث خطأ أثناء استلام المهمة');
    } finally {
      setClaimingId(null);
    }
  };

  // Toggle Done Handler
  const handleToggleDone = async (task: UnifiedTask) => {
    try {
      setTogglingDoneId(task.id);
      const newDone = !task.done;
      const now = new Date().toISOString();

      if (task.sourceGid === '1535230545') {
        await Promise.all([
          supabase.from('tagme3at_26').update({ done: newDone, updated_at: now }).eq('unique_key', task.uniqueKey),
          supabase.from('tagme3at_items').update({ done: newDone, updated_at: now }).eq('unique_key', task.uniqueKey)
        ]);
      } else if (task.sourceGid === '1939073164') {
        await supabase.from('reels_ve_26').update({ done: newDone, updated_at: now }).eq('code', task.code || task.uniqueKey);
      } else if (task.sourceGid === '0') {
        await supabase.from('reels_cuts_26').update({ done: newDone, updated_at: now }).eq('code', task.code || task.uniqueKey);
      } else {
        const stg = STAGE_CONFIGS.find(s => s.gid === task.sourceGid);
        if (stg) {
          await supabase.from(stg.table).update({ delivered: newDone, uploaded: newDone, updated_at: now }).eq('unique_key', task.uniqueKey);
        }
      }

      setTasks(prev => prev.map(t => {
        if (t.id === task.id || t.uniqueKey === task.uniqueKey) {
          return {
            ...t,
            done: newDone,
            status: newDone ? 'completed' : 'in_progress',
            statusLabel: newDone ? 'تم الإنجاز ✅' : 'قيد العمل ⏳'
          };
        }
        return t;
      }));

      toast.success(newDone ? `✅ رائع! تم إنجاز المهمة وإغلاقها` : `تمت إعادة المهمة كقيد العمل ⏳`);
    } catch (err) {
      console.error('Error toggling done:', err);
      toast.error('حدث خطأ أثناء تحديث حالة المهمة');
    } finally {
      setTogglingDoneId(null);
    }
  };

  // Unique source sheets for filter dropdown
  const sourceSheets = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => set.add(t.sourceSheet));
    return Array.from(set);
  }, [tasks]);

  // Filtered tasks logic
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesNotes = (task.notes || '').toLowerCase().includes(q);
        const matchesCode = (task.code || '').toLowerCase().includes(q);
        const matchesAssigned = task.assignedTo.toLowerCase().includes(q);
        if (!matchesTitle && !matchesNotes && !matchesCode && !matchesAssigned) return false;
      }

      // 2. Category Filter (Exact User Structure)
      if (categoryFilter === 'my_pending') {
        if (!task.isAssignedToMe || task.done || task.isEdit) return false;
      } else if (categoryFilter === 'my_priority') {
        if (!task.isAssignedToMe || !task.isPriority) return false;
      } else if (categoryFilter === 'my_edits') {
        if (!task.isAssignedToMe || !task.isEdit) return false;
      } else if (categoryFilter === 'my_completed') {
        if (!task.isAssignedToMe || !task.done) return false;
      } else if (categoryFilter === 'my_all') {
        if (!task.isAssignedToMe) return false;
      } else if (categoryFilter === 'available_unassigned') {
        if (!task.isClaimable) return false;
      }
      // 'all_system' includes everything

      // 3. Sheet filter
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

  const isViewingSelf = !selectedUserName || selectedUserName === currentUser?.name || selectedUserName === currentUser?.email;

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      {/* Top Welcome Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-blue-950/40 border border-purple-500/20 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                <User size={24} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white font-tajawal flex items-center gap-2">
                  <span>مرحباً بك، {isViewingSelf ? (currentUser?.name || 'يا بطل') : selectedUserName}</span>
                  <span className="text-xl">👋</span>
                </h1>
                <p className="text-xs md:text-sm text-purple-200/80 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>لوحة المهام الشخصية — متابعة دقيقة لتاسكاتك المسندة والتعديلات والمهام المتاحة للاستلام</span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-400/30 text-[10px] font-mono text-purple-200">
                    محرر: {claimEditorName}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
            {/* Admin / Manager User Switcher */}
            {canSwitchUsers && allUsers.length > 0 && (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-1.5 shadow-sm">
                <span className="text-xs font-bold text-muted whitespace-nowrap">معاينة مهام:</span>
                <select
                  value={selectedUserName}
                  onChange={(e) => setSelectedUserName(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value={currentUser?.name || ''} className="bg-[#0f172a] text-white">
                    مهامي أنا ({currentUser?.name || 'المستخدم الحالي'})
                  </option>
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
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-muted hover:text-white transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="تحديث المهام"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-purple-400' : ''} />
              <span className="hidden sm:inline">تحديث</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards strictly following user's 4 criteria + available tasks */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. لسه متعملتش (Pending) */}
        <motion.div
          whileHover={{ y: -3 }}
          onClick={() => setCategoryFilter('my_pending')}
          className={`p-4 rounded-2xl border backdrop-blur-xl transition-all cursor-pointer relative overflow-hidden ${
            categoryFilter === 'my_pending'
              ? 'bg-blue-950/50 border-blue-500/60 shadow-[0_0_25px_rgba(59,130,246,0.25)] ring-2 ring-blue-400/50'
              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-300">لسه متعملتش ⏳</span>
            <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-400 font-mono">{stats.myPending}</div>
          <p className="text-[10px] text-blue-200/70 font-medium mt-1">مهام قيد العمل والتنفيذ</p>
        </motion.div>

        {/* 2. خلصت (Completed) */}
        <motion.div
          whileHover={{ y: -3 }}
          onClick={() => setCategoryFilter('my_completed')}
          className={`p-4 rounded-2xl border backdrop-blur-xl transition-all cursor-pointer relative overflow-hidden ${
            categoryFilter === 'my_completed'
              ? 'bg-emerald-950/50 border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.25)] ring-2 ring-emerald-400/50'
              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-300">خلصت ✅</span>
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">{stats.myCompleted}</div>
          <p className="text-[10px] text-emerald-200/70 font-medium mt-1">تم إنجازها وتسليمها</p>
        </motion.div>

        {/* 3. اولوية (Priority) */}
        <motion.div
          whileHover={{ y: -3 }}
          onClick={() => setCategoryFilter('my_priority')}
          className={`p-4 rounded-2xl border backdrop-blur-xl transition-all cursor-pointer relative overflow-hidden ${
            categoryFilter === 'my_priority'
              ? 'bg-amber-950/50 border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.25)] ring-2 ring-amber-400/50'
              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-300">أولوية ⚡</span>
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">{stats.myPriority}</div>
          <p className="text-[10px] text-amber-200/70 font-medium mt-1">مهام عاجلة تتطلب سرعة</p>
        </motion.div>

        {/* 4. اطلب ايديت (Edits / Revisions) */}
        <motion.div
          whileHover={{ y: -3 }}
          onClick={() => setCategoryFilter('my_edits')}
          className={`p-4 rounded-2xl border backdrop-blur-xl transition-all cursor-pointer relative overflow-hidden ${
            categoryFilter === 'my_edits'
              ? 'bg-rose-950/50 border-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.25)] ring-2 ring-rose-400/50'
              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-300">اطلب إيديت 📝</span>
            <div className="p-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Edit3 size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">{stats.myEdits}</div>
          <p className="text-[10px] text-rose-200/70 font-medium mt-1">تعديلات وملاحظات مطلوبة</p>
        </motion.div>

        {/* 5. مهام متاحة للاستلام (ممكن تاخدها) */}
        <motion.div
          whileHover={{ y: -3 }}
          onClick={() => setCategoryFilter('available_unassigned')}
          className={`p-4 rounded-2xl border backdrop-blur-xl transition-all cursor-pointer relative overflow-hidden ${
            categoryFilter === 'available_unassigned'
              ? 'bg-cyan-950/50 border-cyan-500/60 shadow-[0_0_25px_rgba(6,182,212,0.25)] ring-2 ring-cyan-400/50'
              : 'bg-cyan-950/10 border-cyan-500/20 hover:bg-cyan-950/20'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
              <span>مهام متاحة 📥</span>
            </span>
            <div className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <HandMetal size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono">{stats.availableUnassigned}</div>
          <p className="text-[10px] text-cyan-200/70 font-medium mt-1 font-bold text-cyan-300">ممكن تاخدها الآن ✋</p>
        </motion.div>

        {/* 6. كل مهامي المسندة */}
        <motion.div
          whileHover={{ y: -3 }}
          onClick={() => setCategoryFilter('my_all')}
          className={`p-4 rounded-2xl border backdrop-blur-xl transition-all cursor-pointer relative overflow-hidden ${
            categoryFilter === 'my_all'
              ? 'bg-purple-950/50 border-purple-500/60 shadow-[0_0_25px_rgba(168,85,247,0.25)] ring-2 ring-purple-400/50'
              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-300">إجمالي مهامي 👤</span>
            <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Briefcase size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-300 font-mono">{stats.myTotal}</div>
          <p className="text-[10px] text-purple-200/70 font-medium mt-1">كافة مهامك المسندة</p>
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

          {/* User Requested Tabs */}
          <div className="flex items-center gap-1 bg-[#090d16] p-1 rounded-2xl border border-white/10 flex-wrap">
            {[
              { id: 'my_pending', label: '⏳ لسه متعملتش', count: stats.myPending },
              { id: 'my_priority', label: '⚡ أولوية', count: stats.myPriority },
              { id: 'my_edits', label: '📝 اطلب إيديت', count: stats.myEdits },
              { id: 'my_completed', label: '✅ خلصت', count: stats.myCompleted },
              { id: 'available_unassigned', label: '📥 متاحة للاستلام (ممكن تاخدها)', count: stats.availableUnassigned, highlight: true },
              { id: 'my_all', label: '👤 كل مهامي', count: stats.myTotal },
              { id: 'all_system', label: '🌐 مهام النظام', count: stats.totalSystem },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setCategoryFilter(st.id as CategoryFilter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  categoryFilter === st.id
                    ? st.highlight
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400'
                      : 'bg-purple-600 text-white shadow-md'
                    : st.highlight
                    ? 'text-cyan-300 hover:text-white hover:bg-cyan-500/10'
                    : 'text-muted hover:text-white'
                }`}
              >
                <span>{st.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  categoryFilter === st.id ? 'bg-white/20 text-white' : 'bg-white/5 text-muted'
                }`}>
                  {st.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task List Container */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-purple-400" />
            <h3 className="text-sm font-black text-white">
              {categoryFilter === 'my_pending' && 'مهامي المسندة: لسه متعملتش (قيد العمل)'}
              {categoryFilter === 'my_priority' && 'مهامي المسندة: ذات أولوية قصوى ⚡'}
              {categoryFilter === 'my_edits' && 'مهامي المسندة: مطلوب تعديل أو إيديت 📝'}
              {categoryFilter === 'my_completed' && 'مهامي المسندة: تم الإنجاز والتسليم ✅'}
              {categoryFilter === 'my_all' && 'كافة المهام المسندة باسمك 👤'}
              {categoryFilter === 'available_unassigned' && 'مهام مفتوحة ومتاحة للاستلام (ممكن تاخدها) 📥'}
              {categoryFilter === 'all_system' && 'كافة مهام النظام (شامل)'}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-purple-300 font-bold">
              {filteredTasks.length} مهمة
            </span>
          </div>

          {categoryFilter === 'available_unassigned' && (
            <div className="text-xs text-cyan-300/80 font-bold hidden sm:flex items-center gap-1.5">
              <Sparkles size={14} className="text-cyan-400" />
              <span>اضغط "استلام المهمة" لإسنادها إليك فوراً</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto shadow-lg shadow-purple-500/20" />
            <p className="mt-4 text-xs font-bold text-purple-300 animate-pulse">جاري جلب مهامك والتعديلات والمهام المتاحة...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-24 text-center text-muted flex flex-col items-center justify-center gap-3">
            <CheckCircle2 size={42} className="opacity-20 text-emerald-400" />
            <div className="text-base font-bold text-white">
              {categoryFilter === 'my_pending' && 'رائع! لا توجد أي مهام قيد العمل مسندة إليك حالياً 🎉'}
              {categoryFilter === 'my_edits' && 'ممتاز! لا توجد تعديلات أو ملاحظات مفتوحة على مهامك 🎉'}
              {categoryFilter === 'my_priority' && 'لا توجد مهام أولوية قصوى مسندة إليك حالياً.'}
              {categoryFilter === 'my_completed' && 'لم يتم تسليم أي مهام حتى الآن.'}
              {categoryFilter === 'available_unassigned' && 'لا توجد مهام متاحة للاستلام حالياً. كل المهام مسندة للمحررين.'}
              {categoryFilter === 'my_all' && 'لم يتم العثور على أي مهام مسندة بهذا الاسم في النظام.'}
              {categoryFilter === 'all_system' && 'لا توجد مهام مسجلة في النظام.'}
            </div>
            <p className="text-xs text-muted/70 max-w-md leading-relaxed">
              {categoryFilter === 'my_pending' && (
                <span>
                  ليس لديك مهام قيد التنفيذ حالياً. تفقد قسم{' '}
                  <button 
                    onClick={() => setCategoryFilter('available_unassigned')}
                    className="text-cyan-400 underline font-bold hover:text-cyan-300 cursor-pointer"
                  >
                    المهام المتاحة للاستلام
                  </button>
                  {' '}لاستلام مهام جديدة والبدء في مونتاجها فوراً!
                </span>
              )}
              {categoryFilter === 'my_edits' && 'كل أعمالك المنجزة متوافقة وخالية من طلبات التعديل.'}
            </p>
            {categoryFilter === 'my_pending' && stats.availableUnassigned > 0 && (
              <button
                onClick={() => setCategoryFilter('available_unassigned')}
                className="mt-3 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer transition-all"
              >
                <HandMetal size={15} />
                <span>استعراض المهام المتاحة للاستلام ({stats.availableUnassigned})</span>
              </button>
            )}
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
                  task.isPriority 
                    ? 'bg-amber-500/[0.03]' 
                    : task.isEdit 
                    ? 'bg-rose-500/[0.03]' 
                    : task.isClaimable 
                    ? 'bg-cyan-500/[0.02]' 
                    : ''
                }`}
              >
                {/* Right: Task Details & Badges */}
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
                        <span>مسندة إليك ({task.assignedTo}) 👤</span>
                      </span>
                    ) : task.isClaimable ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm flex items-center gap-1 animate-pulse">
                        <HandMetal size={11} />
                        <span>متاحة للاستلام 📥</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-muted border border-white/10">
                        {task.assignedTo || 'غير مسند'}
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
                        <span>اطلب إيديت 📝</span>
                      </span>
                    )}

                    {/* Status badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                        task.done
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : task.isEdit
                          ? 'bg-rose-500/10 text-rose-300 border-rose-500/40'
                          : task.isClaimable
                          ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
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

                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-white group-hover:text-purple-300 transition-colors truncate" title={task.title}>
                      {task.title}
                    </h4>
                    {task.code && task.code !== task.title && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-muted border border-white/10 shrink-0">
                        {task.code}
                      </span>
                    )}
                  </div>

                  {/* Highlighted Notes / Edits Box */}
                  {task.notes && (
                    <div className="p-3 rounded-2xl bg-amber-500/[0.06] border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2 max-w-2xl leading-relaxed">
                      <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-bold text-amber-300">ملاحظات وتفاصيل التعديل: </span>
                        <span>{task.notes}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Left: Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
                  {/* Claim Button (For available tasks) */}
                  {task.isClaimable && (
                    <button
                      onClick={() => handleClaimTask(task)}
                      disabled={claimingId === task.id}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black shadow-lg shadow-cyan-500/25 border border-cyan-400/40 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      {claimingId === task.id ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <HandMetal size={14} />
                      )}
                      <span>استلام المهمة ✋</span>
                    </button>
                  )}

                  {/* Quick Toggle Done Button (For assigned tasks) */}
                  {task.isAssignedToMe && (
                    <button
                      onClick={() => handleToggleDone(task)}
                      disabled={togglingDoneId === task.id}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        task.done
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-white/5 hover:bg-emerald-600 hover:text-white border-white/10 text-muted'
                      }`}
                      title={task.done ? 'إلغاء وضع الإنجاز' : 'تحديد كمنجز'}
                    >
                      {togglingDoneId === task.id ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : task.done ? (
                        <CheckCheck size={14} className="text-emerald-400" />
                      ) : (
                        <Check size={14} />
                      )}
                      <span>{task.done ? 'منجز ✅' : 'تم الإنجاز'}</span>
                    </button>
                  )}

                  {/* External Link (Drive / YouTube) */}
                  {task.link && (
                    <a
                      href={task.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-muted hover:text-white text-xs transition-all shadow-sm"
                      title="فتح رابط العمل"
                    >
                      <Play size={13} />
                    </a>
                  )}

                  {/* Jump to row in sheet */}
                  <button
                    onClick={() => handleJumpToTask(task)}
                    className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600 border border-purple-500/40 hover:border-purple-500 text-purple-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md group/btn cursor-pointer"
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
