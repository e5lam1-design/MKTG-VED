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
  Briefcase
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
}

interface HomeViewProps {
  currentUser: UserProfile | null;
  onNavigateToStage: (gid: string, label: string, uniqueKey?: string) => void;
  isDemo?: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  currentUser,
  onNavigateToStage,
  isDemo = false
}) => {
  const [tasks, setTasks] = useState<UnifiedTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'has_edits' | 'completed'>('all');
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
    if (!targetName && !canSwitchUsers) return;
    setLoading(true);

    const targetLower = (targetName || '').toLowerCase().trim();
    const collected: UnifiedTask[] = [];

    try {
      // 1. Fetch from tagme3at_items
      const { data: tagme3atData } = await supabase
        .from('tagme3at_items')
        .select('*')
        .order('updated_at', { ascending: false });

      if (tagme3atData) {
        tagme3atData.forEach((item: any) => {
          const editorLower = (item.editor || '').toLowerCase().trim();
          const notesText = `${item.notes_marketing || ''} ${item.notes_editors || ''}`.trim();
          const notesLower = notesText.toLowerCase();

          // Match by editor name, or if admin selected 'all', or notes mention the user
          const isMatch = !targetLower || 
            editorLower === targetLower || 
            (targetLower.length > 2 && editorLower.includes(targetLower)) ||
            (targetLower.length > 2 && notesLower.includes(targetLower));

          if (isMatch) {
            let status: UnifiedTask['status'] = 'in_progress';
            let statusLabel = 'قيد العمل ⏳';

            if (item.done || item.uploaded) {
              status = 'completed';
              statusLabel = 'تم الإنجاز ✅';
            } else if (item.cancel || notesText.length > 0) {
              status = 'has_edits';
              statusLabel = 'تعديلات وملاحظات 📝';
            }

            collected.push({
              id: item.unique_key || String(Math.random()),
              uniqueKey: item.unique_key,
              title: item.filing_name || item.name || 'تجميعة يوتيوب',
              code: item.unique_key,
              sourceSheet: item.op_sheet ? `تجميعات (${item.op_sheet})` : 'تجميعات',
              sourceGid: '1535230545',
              status,
              statusLabel,
              assignedTo: item.editor || 'غير محدد',
              notes: notesText || undefined,
              date: item.date || item.updated_at?.split('T')[0],
              priority: !!item.priority,
              done: !!item.done,
              link: item.youtube_link || item.thumbnail_link,
              details: item
            });
          }
        });
      }

      // 2. Fetch from reels_ve_26
      try {
        const { data: reelsData } = await supabase
          .from('reels_ve_26')
          .select('*')
          .order('updated_at', { ascending: false });

        if (reelsData) {
          reelsData.forEach((item: any) => {
            const editorLower = (item.editor_col || item.by || '').toLowerCase().trim();
            const notesText = `${item.notes || ''} ${item.editor_notes || ''}`.trim();
            const isMatch = !targetLower || 
              editorLower === targetLower || 
              (targetLower.length > 2 && editorLower.includes(targetLower));

            if (isMatch) {
              let status: UnifiedTask['status'] = 'in_progress';
              let statusLabel = 'قيد المونتاج ⏳';

              if (item.done) {
                status = 'completed';
                statusLabel = 'تم التسليم ✅';
              } else if (item.canceled || item.edit_check || notesText.length > 0) {
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
                assignedTo: item.editor_col || item.by || 'غير محدد',
                notes: notesText || undefined,
                date: item.date || item.filming_date,
                done: !!item.done,
                link: item.drive_final || item.drive_raw,
                details: item
              });
            }
          });
        }
      } catch {}

      // 3. Fetch from design_tasks
      try {
        const { data: designData } = await supabase
          .from('design_tasks')
          .select('*')
          .order('updated_at', { ascending: false });

        if (designData) {
          designData.forEach((item: any) => {
            const designerLower = (item.designer_name || item.requested_by || '').toLowerCase().trim();
            const isMatch = !targetLower || 
              designerLower === targetLower || 
              (targetLower.length > 2 && designerLower.includes(targetLower));

            if (isMatch) {
              let status: UnifiedTask['status'] = 'in_progress';
              let statusLabel = 'قيد التصميم ⏳';

              if (item.is_done) {
                status = 'completed';
                statusLabel = 'تم التسليم ✅';
              } else if (item.notes && item.notes.trim().length > 0) {
                status = 'has_edits';
                statusLabel = 'ملاحظات وتعديل 📝';
              }

              collected.push({
                id: String(item.id),
                uniqueKey: String(item.id),
                title: `${item.design_type || 'تصميم'} - ${item.priority || ''}`,
                code: item.id,
                sourceSheet: 'تصاميم (Designers)',
                sourceGid: '501319673',
                status,
                statusLabel,
                assignedTo: item.designer_name || 'غير محدد',
                notes: item.notes || undefined,
                date: item.assigned_date || item.deadline,
                done: !!item.is_done,
                link: item.reference_link,
                details: item
              });
            }
          });
        }
      } catch {}

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

  // Statistics calculation
  const stats = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter(t => t.status === 'in_progress' || t.status === 'pending').length;
    const hasEdits = tasks.filter(t => t.status === 'has_edits').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    return { total, inProgress, hasEdits, completed };
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
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesNotes = (task.notes || '').toLowerCase().includes(q);
        const matchesCode = (task.code || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesNotes && !matchesCode) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending' && (task.status !== 'in_progress' && task.status !== 'pending')) return false;
        if (statusFilter === 'has_edits' && task.status !== 'has_edits') return false;
        if (statusFilter === 'completed' && task.status !== 'completed') return false;
      }

      // Sheet filter
      if (sheetFilter !== 'all' && task.sourceSheet !== sheetFilter) {
        return false;
      }

      return true;
    });
  }, [tasks, searchQuery, statusFilter, sheetFilter]);

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

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assigned Tasks */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setStatusFilter('all')}
          className={`p-5 rounded-3xl border backdrop-blur-xl transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-purple-950/40 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)] ring-1 ring-purple-400/40'
              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted">إجمالي المهام المسندة</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Briefcase size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">{stats.total}</div>
          <p className="text-[11px] text-purple-300/70 font-medium mt-1">عبر جميع الشيتات والخدمات</p>
        </motion.div>

        {/* In Progress */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setStatusFilter('pending')}
          className={`p-5 rounded-3xl border backdrop-blur-xl transition-all cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-blue-950/40 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.15)] ring-1 ring-blue-400/40'
              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted">قيد العمل والمونتاج</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Clock size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-blue-400 font-mono">{stats.inProgress}</div>
          <p className="text-[11px] text-blue-300/70 font-medium mt-1">تاسكات جارية لم تسلم بعد</p>
        </motion.div>

        {/* Needs Edits / Has Notes */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setStatusFilter('has_edits')}
          className={`p-5 rounded-3xl border backdrop-blur-xl transition-all cursor-pointer ${
            statusFilter === 'has_edits'
              ? 'bg-amber-950/40 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/40'
              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted">بها تعديلات وملاحظات 📝</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-400 font-mono">{stats.hasEdits}</div>
          <p className="text-[11px] text-amber-300/70 font-medium mt-1">ملاحظات تستوجب المراجعة</p>
        </motion.div>

        {/* Completed */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setStatusFilter('completed')}
          className={`p-5 rounded-3xl border backdrop-blur-xl transition-all cursor-pointer ${
            statusFilter === 'completed'
              ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)] ring-1 ring-emerald-400/40'
              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted">تم إنجازها بنجاح</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">{stats.completed}</div>
          <p className="text-[11px] text-emerald-300/70 font-medium mt-1">مهام مسلمة ومنشورة</p>
        </motion.div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-xl">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في اسم المهمة، الكود، أو الملاحظات..."
            className="w-full bg-[#090d16] border border-white/10 focus:border-purple-500/50 rounded-2xl pr-11 pl-4 py-2.5 text-xs text-white focus:outline-none transition-all placeholder:text-muted/60 font-medium"
          />
        </div>

        {/* Source Sheet filter */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {sourceSheets.length > 1 && (
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 text-xs font-bold text-muted">
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

          {/* Quick status tabs */}
          <div className="flex items-center gap-1.5 bg-[#090d16] p-1 rounded-2xl border border-white/10">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'pending', label: 'قيد العمل ⏳' },
              { id: 'has_edits', label: 'تعديلات 📝' },
              { id: 'completed', label: 'منتهية ✅' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === st.id
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
            <p className="mt-4 text-xs font-bold text-purple-300 animate-pulse">جاري جلب مهامك والتعديلات...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-24 text-center text-muted flex flex-col items-center justify-center gap-3">
            <CheckCircle2 size={40} className="opacity-20 text-emerald-400" />
            <div className="text-base font-bold text-white">لا توجد مهام مطابقة للفلتر المحدد</div>
            <p className="text-xs text-muted/70 max-w-sm">
              {statusFilter === 'has_edits'
                ? 'رائع! لا توجد أي تعديلات أو ملاحظات مفتوحة تخصك حالياً 🎉'
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
                className="p-5 hover:bg-white/[0.02] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                {/* Right: Task Details */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-[11px] font-bold text-purple-300 flex items-center gap-1">
                      <Layers size={12} />
                      <span>{task.sourceSheet}</span>
                    </span>

                    {/* Status badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                        task.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : task.status === 'has_edits'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
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
                        <span className="font-bold text-amber-300">ملاحظات / تعديلات مطلوبة: </span>
                        <span>{task.notes}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Left: Action Buttons */}
                <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => handleJumpToTask(task)}
                    className="px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600 border border-purple-500/40 hover:border-purple-500 text-purple-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md group/btn"
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
