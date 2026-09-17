import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Sparkles, Check, Trash2, Edit3, 
  Search, RefreshCw, Plus, Palette
} from 'lucide-react';
import { useEditorsOptions, type EditorOption } from '../hooks/useEditorsOptions';

interface EditorsManagementProps {
  userRole?: string;
  toast?: any;
}

const PRESET_COLORS = [
  { name: 'وردي (Basel)', hex: '#f43f5e' },
  { name: 'زمردي', hex: '#10b981' },
  { name: 'أزرق', hex: '#3b82f6' },
  { name: 'بنفسجي', hex: '#8b5cf6' },
  { name: 'كهرماني', hex: '#f59e0b' },
  { name: 'سماوي', hex: '#06b6d4' },
  { name: 'تيل', hex: '#14b8a6' },
  { name: 'وردي فاقع', hex: '#ec4899' },
  { name: 'أصفر ذهبي', hex: '#eab308' },
  { name: 'برتقالي', hex: '#f97316' },
  { name: 'سماء فاتحة', hex: '#38bdf8' },
  { name: 'أرجواني', hex: '#a855f7' },
];

export const EditorsManagement: React.FC<EditorsManagementProps> = ({ toast }) => {
  const { options, loading, addOption, deleteOption, updateOption, seedDefaults, refreshEditors } = useEditorsOptions();

  const [activeCategory, setActiveCategory] = useState<'editor' | 'creator' | 'branch' | 'type'>('editor');
  const [newItemName, setNewItemName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#f43f5e');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('');
  const [colorPickerOpenId, setColorPickerOpenId] = useState<number | string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const CATEGORY_TABS = [
    { id: 'editor', label: '🎬 قائمة المحررين (Editors)', desc: 'محررو الفيديو المسؤولون عن مونتاج الحلقات والريلز' },
    { id: 'creator', label: '✍️ قائمة الكريتورز (Creators)', desc: 'الكريتورز والمشرفون وصناع المحتوى' },
    { id: 'branch', label: '🏢 الفروع (Branches)', desc: 'فروع ومواقع التصوير (Alexandria, Cairo...)' },
    { id: 'type', label: '🏷️ أنواع الريلز والفورمات (Types)', desc: 'نوع التصوير والصيغة (حواري، تمثيلي، REEL...)' },
  ];

  // Filtered items for active category
  const categoryItems = options
    .filter(o => (o.category || 'editor') === activeCategory)
    .filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase().trim()));

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    // Check duplicate
    if (options.some(o => (o.category || 'editor') === activeCategory && o.name.toLowerCase() === newItemName.trim().toLowerCase())) {
      if (toast) toast.error('هذا الاسم موجود بالفعل في القائمة!');
      return;
    }

    await addOption(activeCategory, newItemName.trim(), activeCategory === 'editor' ? selectedColor : '');
    if (toast) toast.success(`تمت إضافة "${newItemName.trim()}" بنجاح!`);
    setNewItemName('');
  };

  const handleStartEdit = (item: EditorOption) => {
    setEditingId(item.id || null);
    setEditingName(item.name);
    setEditingColor(item.color || '#f43f5e');
  };

  const handleSaveEdit = async (id: number | string) => {
    if (!editingName.trim()) return;
    await updateOption(id, { 
      name: editingName.trim(),
      ...(activeCategory === 'editor' ? { color: editingColor || selectedColor } : {})
    });
    if (toast) toast.success('تم تحديث البيانات بنجاح!');
    setEditingId(null);
  };

  const handleQuickChangeColor = async (item: EditorOption, newColor: string) => {
    if (!item.id) return;
    await updateOption(item.id, { color: newColor });
    if (toast) toast.success(`تم تحديث لون المحرر "${item.name}"`);
    setColorPickerOpenId(null);
  };

  const handleToggleActive = async (item: EditorOption) => {
    if (!item.id) return;
    const newStatus = !(item.is_active !== false);
    await updateOption(item.id, { is_active: newStatus });
    if (toast) {
      toast.success(`تم ${newStatus ? 'تفعيل' : 'تعطيل'} "${item.name}"`);
    }
  };

  const handleDelete = async (item: EditorOption) => {
    if (confirm(`هل أنت متأكد من حذف "${item.name}" من القائمة؟`)) {
      if (item.id) {
        await deleteOption(item.id, item.name);
        if (toast) toast.success(`تم حذف "${item.name}"`);
      }
    }
  };

  // Seed default items into Supabase
  const handleSeedDefaults = async () => {
    if (!confirm('هل تريد استيراد القوائم الافتراضية كاملة وحفظها في قاعدة بيانات Supabase؟')) return;
    setIsSeeding(true);
    try {
      await seedDefaults();
      if (toast) toast.success('تم استيراد كافة العناصر الافتراضية بنجاح في Supabase! 🚀');
      await refreshEditors();
    } catch (err: any) {
      console.error('[EditorsManagement] Seeding error:', err);
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
          <div className="flex items-center gap-2.5 text-rose-400 font-black text-xs uppercase tracking-widest">
            <Sparkles size={16} />
            <span>EDITORS HUB MANAGEMENT</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white arabic-text tracking-tight">
            إدارة قوائم المحررين والكريتورز (Reels Hub)
          </h2>
          <p className="text-xs sm:text-sm text-white/50 font-medium arabic-text">
            تحكم كامل في قائمة المحررين وألوانهم وخيارات الريلز مع مزامنة لحظية مع قاعدة بيانات Supabase
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedDefaults}
            disabled={isSeeding}
            className="px-4 py-2.5 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-600/10 hover:scale-105 active:scale-95 disabled:opacity-50"
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
          const count = options.filter(o => (o.category || 'editor') === tab.id).length;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveCategory(tab.id as any); setSearchQuery(''); }}
              className={`p-4 rounded-3xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                isActive
                  ? 'bg-gradient-to-br from-rose-950/40 via-rose-950/20 to-black border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.15)] ring-1 ring-rose-400/30'
                  : 'bg-[#0a0d14] border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-black text-white arabic-text leading-snug">
                  {tab.label}
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-rose-500 text-white shadow-md' : 'bg-white/5 text-white/40'
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
          <form onSubmit={handleAddItem} className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                required
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={`أدخل اسم جديد في ${CATEGORY_TABS.find(t => t.id === activeCategory)?.label}...`}
                className="w-full bg-black/40 border border-white/10 focus:border-rose-500/50 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder:text-white/20 outline-none transition-all arabic-text shadow-inner"
              />
            </div>

            {/* Color selection for editors */}
            {activeCategory === 'editor' && (
              <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-2xl px-3 py-2 shrink-0">
                <span className="text-[11px] font-bold text-white/50">اللون:</span>
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-[200px] scrollbar-hide py-0.5">
                  {PRESET_COLORS.slice(0, 6).map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setSelectedColor(c.hex)}
                      style={{ backgroundColor: c.hex }}
                      className={`w-5 h-5 rounded-full transition-transform shrink-0 ${
                        selectedColor.toLowerCase() === c.hex.toLowerCase() 
                          ? 'ring-2 ring-white scale-110 shadow-lg' 
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-6 h-6 rounded-lg cursor-pointer bg-transparent border-0 outline-none p-0 shrink-0"
                  title="اختر لون مخصص"
                />

                {/* Live Pill Preview */}
                <div 
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border transition-all"
                  style={{
                    backgroundColor: `${selectedColor}1f`,
                    borderColor: `${selectedColor}4d`,
                    color: selectedColor
                  }}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedColor }} />
                  <span>{newItemName.trim() || 'معاينة'}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-600/20 shrink-0 hover:scale-105 active:scale-95"
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
              className="w-full bg-black/40 border border-white/10 focus:border-rose-500/50 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder:text-white/20 outline-none transition-all arabic-text shadow-inner"
            />
          </div>
        </div>

        {/* Items List Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-white/40 font-bold px-2">
            <span>الاسم والبيانات واللون ({categoryItems.length})</span>
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
                const itemColor = item.color || '#f43f5e';
                const isPickerOpen = colorPickerOpenId === item.id;

                return (
                  <motion.div
                    key={item.id || index}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 relative ${
                      isActive 
                        ? 'bg-white/[0.02] border-white/5 hover:border-rose-500/30 hover:bg-white/[0.04]' 
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
                            className="w-full bg-black/60 border border-rose-500/60 rounded-xl px-3 py-1 text-xs text-white outline-none"
                          />
                          {activeCategory === 'editor' && (
                            <input
                              type="color"
                              value={editingColor}
                              onChange={(e) => setEditingColor(e.target.value)}
                              className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 outline-none p-0 shrink-0"
                              title="تعديل اللون"
                            />
                          )}
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
                          {/* Colored badge preview for Editor */}
                          {activeCategory === 'editor' ? (
                            <div className="relative inline-flex items-center">
                              <span 
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black border transition-all shadow-sm"
                                style={{
                                  backgroundColor: `${itemColor}1a`,
                                  borderColor: `${itemColor}4d`,
                                  color: itemColor
                                }}
                              >
                                <span 
                                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                  style={{ backgroundColor: itemColor }}
                                />
                                <span className="font-mono truncate max-w-[130px]">{item.name}</span>
                              </span>

                              {/* Quick Color Swatch Button */}
                              <button
                                type="button"
                                onClick={() => setColorPickerOpenId(isPickerOpen ? null : item.id!)}
                                className="mr-1.5 p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all cursor-pointer"
                                title="تغيير لون المحرر"
                              >
                                <Palette size={12} style={{ color: itemColor }} />
                              </button>

                              {/* Color Swatch Popover */}
                              <AnimatePresence>
                                {isPickerOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 5 }}
                                    className="absolute top-full right-0 mt-2 p-3 bg-[#0c1222] border border-white/20 rounded-2xl shadow-2xl z-50 flex flex-col gap-2 min-w-[200px]"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span className="text-[10px] font-bold text-white/50">اختر لون المحرر:</span>
                                    <div className="grid grid-cols-6 gap-1.5">
                                      {PRESET_COLORS.map(c => (
                                        <button
                                          key={c.hex}
                                          type="button"
                                          onClick={() => handleQuickChangeColor(item, c.hex)}
                                          style={{ backgroundColor: c.hex }}
                                          className={`w-6 h-6 rounded-full transition-transform ${itemColor.toLowerCase() === c.hex.toLowerCase() ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-80 hover:opacity-100 hover:scale-105'}`}
                                          title={c.name}
                                        />
                                      ))}
                                    </div>
                                    <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px]">
                                      <span className="text-white/40">لون مخصص:</span>
                                      <input
                                        type="color"
                                        value={itemColor}
                                        onChange={(e) => handleQuickChangeColor(item, e.target.value)}
                                        className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                                      />
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ) : (
                            <>
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isActive ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-rose-400'}`} />
                              <span className="text-xs sm:text-sm font-black text-white truncate font-mono">
                                {item.name}
                              </span>
                            </>
                          )}
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
