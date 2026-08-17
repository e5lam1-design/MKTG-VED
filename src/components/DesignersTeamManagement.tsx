import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, Palette, Sparkles, Check, Trash2, Edit3, 
  Search, RefreshCw, Plus, CheckCircle2, XCircle, ShieldAlert,
  HelpCircle, Layers, ArrowUpDown
} from 'lucide-react';
import { 
  useDesignersOptions, 
  DEFAULT_DESIGNERS, 
  DEFAULT_REQUESTERS, 
  DEFAULT_PRIORITIES, 
  DEFAULT_TYPES, 
  type TeamOption 
} from '../hooks/useDesignersOptions';
import { supabase } from '../lib/supabase';

interface DesignersTeamManagementProps {
  userRole?: string;
  toast?: any;
}

export const DesignersTeamManagement: React.FC<DesignersTeamManagementProps> = ({ userRole, toast }) => {
  const { options, loading, addOption, deleteOption, updateOption, refreshOptions } = useDesignersOptions();
  
  const [activeCategory, setActiveCategory] = useState<'designer' | 'requester' | 'priority' | 'type'>('designer');
  const [newItemName, setNewItemName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);

  const CATEGORY_TABS = [
    { id: 'designer', label: '🎨 قائمة المصممين (Designers)', desc: 'المصممون المسؤولون عن تنفيذ التصاميم' },
    { id: 'requester', label: '✍️ قائمة الكريتورز (Creators)', desc: 'الكريتورز والمشرفون الذين يطلبون التصاميم' },
    { id: 'priority', label: '⚡ درجات الأولوية (Priorities)', desc: 'مستويات الأولوية والاستعجال للمهام' },
    { id: 'type', label: '🏷️ أنواع التصاميم (Task Types)', desc: 'أنواع التصاميم (Thumbnail, Social Media...)' },
  ];

  // Filtered items for active category
  const categoryItems = options
    .filter(o => o.category === activeCategory)
    .filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase().trim()));

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    
    // Check duplicate
    if (options.some(o => o.category === activeCategory && o.name.toLowerCase() === newItemName.trim().toLowerCase())) {
      if (toast) toast.error('هذا الاسم موجود بالفعل في القائمة!');
      return;
    }

    await addOption(activeCategory, newItemName.trim());
    if (toast) toast.success(`تمت إضافة "${newItemName.trim()}" بنجاح!`);
    setNewItemName('');
  };

  const handleStartEdit = (item: TeamOption) => {
    setEditingId(item.id || null);
    setEditingName(item.name);
  };

  const handleSaveEdit = async (id: number | string) => {
    if (!editingName.trim()) return;
    await updateOption(id, { name: editingName.trim() });
    if (toast) toast.success('تم تحديث الاسم بنجاح!');
    setEditingId(null);
  };

  const handleToggleActive = async (item: TeamOption) => {
    if (!item.id) return;
    const newStatus = !(item.is_active !== false);
    await updateOption(item.id, { is_active: newStatus });
    if (toast) {
      toast.success(`تم ${newStatus ? 'تفعيل' : 'تعطيل'} "${item.name}"`);
    }
  };

  const handleDelete = async (item: TeamOption) => {
    if (confirm(`هل أنت متأكد من حذف "${item.name}" من القائمة؟`)) {
      if (item.id) {
        await deleteOption(item.id, item.category, item.name);
        if (toast) toast.success(`تم حذف "${item.name}"`);
      }
    }
  };

  // Seed default items into Supabase
  const handleSeedDefaults = async () => {
    if (!confirm('هل تريد استيراد القوائم الافتراضية كاملة وحفظها في قاعدة بيانات Supabase؟')) return;
    setIsSeeding(true);
    try {
      const allToInsert: any[] = [];
      
      DEFAULT_DESIGNERS.forEach((name, idx) => {
        if (!options.some(o => o.category === 'designer' && o.name.toLowerCase() === name.toLowerCase())) {
          allToInsert.push({ category: 'designer', name, is_active: true, display_order: idx + 1 });
        }
      });

      DEFAULT_REQUESTERS.forEach((name, idx) => {
        if (!options.some(o => o.category === 'requester' && o.name.toLowerCase() === name.toLowerCase())) {
          allToInsert.push({ category: 'requester', name, is_active: true, display_order: idx + 1 });
        }
      });

      DEFAULT_PRIORITIES.forEach((name, idx) => {
        if (!options.some(o => o.category === 'priority' && o.name.toLowerCase() === name.toLowerCase())) {
          allToInsert.push({ category: 'priority', name, is_active: true, display_order: idx + 1 });
        }
      });

      DEFAULT_TYPES.forEach((name, idx) => {
        if (!options.some(o => o.category === 'type' && o.name.toLowerCase() === name.toLowerCase())) {
          allToInsert.push({ category: 'type', name, is_active: true, display_order: idx + 1 });
        }
      });

      if (allToInsert.length > 0) {
        const { error } = await supabase.from('designers_team_options_26').insert(allToInsert);
        if (error) throw error;
        if (toast) toast.success(`تم استيراد ${allToInsert.length} عنصر بنجاح في Supabase! 🚀`);
      } else {
        if (toast) toast.success('كافة العناصر الافتراضية موجودة بالفعل في قاعدة البيانات!');
      }

      await refreshOptions();
    } catch (err: any) {
      console.error('[DesignersTeamManagement] Seeding error:', err);
      if (toast) toast.error('حدث خطأ أثناء الاستيراد: ' + (err.message || 'تأكد من إنشاء جدول SQL في Supabase'));
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 text-purple-400 font-black text-xs uppercase tracking-widest">
            <Sparkles size={16} />
            <span>Designers Hub Management</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white arabic-text tracking-tight">
            إدارة قوائم المصممين والكريتورز
          </h2>
          <p className="text-xs sm:text-sm text-white/50 font-medium arabic-text">
            تحكم كامل في القوائم المنسدلة لجدول التصاميم مع مزامنة لحظية مع قاعدة بيانات Supabase
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedDefaults}
            disabled={isSeeding}
            className="px-4 py-2.5 rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/10 hover:scale-105 active:scale-95 disabled:opacity-50"
            title="استيراد الأسماء الافتراضية إلى قاعدة البيانات"
          >
            <RefreshCw size={14} className={isSeeding ? 'animate-spin' : ''} />
            <span>{isSeeding ? 'جاري الاستيراد...' : '📥 استيراد الافتراضيات لـ Supabase'}</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CATEGORY_TABS.map((tab) => {
          const isActive = activeCategory === tab.id;
          const count = options.filter(o => o.category === tab.id).length;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveCategory(tab.id as any); setSearchQuery(''); }}
              className={`p-4 rounded-3xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                isActive
                  ? 'bg-gradient-to-br from-purple-900/40 via-purple-950/20 to-black border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)] ring-1 ring-purple-400/30'
                  : 'bg-[#0a0d14] border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-black text-white arabic-text leading-snug">
                  {tab.label}
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-purple-500 text-white shadow-md' : 'bg-white/5 text-white/40'
                }`}>
                  {count}
                </span>
              </div>
              <p className="text-[11px] text-white/40 arabic-text line-clamp-1">
                {tab.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Management Panel */}
      <div className="bg-[#0a0d14] border border-white/5 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
        {/* Top Controls: Add Form & Search */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Add New Item Form */}
          <form onSubmit={handleAddItem} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                required
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={`أدخل اسم جديد في ${CATEGORY_TABS.find(t => t.id === activeCategory)?.label}...`}
                className="w-full bg-black/40 border border-white/10 focus:border-purple-500/50 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder:text-white/20 outline-none transition-all arabic-text shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/20 shrink-0 hover:scale-105 active:scale-95"
            >
              <Plus size={16} />
              <span>إضافة للقائمة ➕</span>
            </button>
          </form>

          {/* Search Filter */}
          <div className="relative w-full lg:w-72">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث في الأسماء..."
              className="w-full bg-black/40 border border-white/10 focus:border-purple-500/50 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder:text-white/20 outline-none transition-all arabic-text shadow-inner"
            />
          </div>
        </div>

        {/* Items List Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-white/40 font-bold px-2">
            <span>الاسم والبيانات ({categoryItems.length})</span>
            <span>الحالة والإجراءات</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-white/40 text-xs">جاري تحميل البيانات من Supabase...</div>
          ) : categoryItems.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-white/10 rounded-3xl space-y-3 bg-white/[0.01]">
              <Users size={32} className="mx-auto text-white/20" />
              <p className="text-xs text-white/40 font-medium arabic-text">
                لا توجد عناصر مضافة بعد في هذه القائمة. اضغط على زر الاستيراد أعلاه أو أضف اسماً جديداً!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryItems.map((item, index) => {
                const isEditing = editingId === item.id;
                const isActive = item.is_active !== false;

                return (
                  <motion.div
                    key={item.id || index}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isActive 
                        ? 'bg-white/[0.02] border-white/5 hover:border-purple-500/30 hover:bg-white/[0.04]' 
                        : 'bg-rose-950/10 border-rose-500/20 opacity-60'
                    }`}
                  >
                    {/* Item Name / Edit Input */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(item.id!);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="w-full bg-black/60 border border-purple-500/60 rounded-xl px-3 py-1 text-xs text-white outline-none"
                          />
                          <button
                            onClick={() => handleSaveEdit(item.id!)}
                            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                            title="حفظ"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isActive ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-rose-400'}`} />
                          <span className="text-xs sm:text-sm font-black text-white truncate font-mono">
                            {item.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {!isEditing && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Toggle Active Status */}
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                            isActive 
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20' 
                              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                          }`}
                          title={isActive ? 'تعطيل من القوائم' : 'تفعيل في القوائم'}
                        >
                          {isActive ? 'نشط ✅' : 'معطل ❌'}
                        </button>

                        {/* Edit Name */}
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all cursor-pointer"
                          title="تعديل الاسم"
                        >
                          <Edit3 size={13} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                          title="حذف نهائي"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
