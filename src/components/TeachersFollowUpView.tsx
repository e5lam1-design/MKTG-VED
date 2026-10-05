import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  Search, 
  ExternalLink, 
  Phone, 
  Copy, 
  Check, 
  Plus, 
  Edit3, 
  Trash2, 
  FileText, 
  RotateCcw, 
  Download, 
  BookOpen, 
  MessageCircle, 
  X, 
  Save,
  Filter,
  Sparkles,
  UserCheck
} from 'lucide-react';
import defaultTeachersData from '../data/teachers_followup.json';

export interface TeacherFollowUpItem {
  id: string;
  code: string;
  teacher: string;
  stage: 'SENIOR' | 'MIDDLE' | 'JUNIOR';
  stageLabel?: string;
  subject: string;
  phone: string;
  followUpUrl: string;
  notes?: string;
}

interface TeachersFollowUpViewProps {
  isDemo?: boolean;
  userProfile?: any;
  toast?: any;
}

const STORAGE_KEY = 'teachers_followup_custom_v1';

export const TeachersFollowUpView: React.FC<TeachersFollowUpViewProps> = ({ isDemo = false, userProfile, toast }) => {
  // Load data: check localStorage first, else default JSON
  const [teachers, setTeachers] = useState<TeacherFollowUpItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return defaultTeachersData as TeacherFollowUpItem[];
  });

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(teachers));
    } catch {}
  }, [teachers]);

  // Filters & State
  const [selectedStage, setSelectedStage] = useState<'ALL' | 'SENIOR' | 'MIDDLE' | 'JUNIOR'>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State for Add / Edit
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    data: Partial<TeacherFollowUpItem>;
  }>({
    isOpen: false,
    mode: 'add',
    data: {
      code: '',
      teacher: '',
      stage: 'SENIOR',
      subject: '',
      phone: '',
      followUpUrl: '',
      notes: ''
    }
  });

  const handleCopy = (text: string, id: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    if (toast) toast.success(`تم نسخ ${label} بنجاح!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Distinct subjects
  const availableSubjects = useMemo(() => {
    const list = new Set<string>();
    teachers.forEach(t => {
      if (t.subject && t.subject.trim()) list.add(t.subject.trim());
    });
    return Array.from(list).sort();
  }, [teachers]);

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      // Stage filter
      if (selectedStage !== 'ALL' && t.stage !== selectedStage) return false;
      // Subject filter
      if (selectedSubject !== 'ALL' && t.subject !== selectedSubject) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = t.teacher.toLowerCase().includes(q);
        const matchCode = t.code.toLowerCase().includes(q);
        const matchSubject = t.subject.toLowerCase().includes(q);
        const matchPhone = t.phone.replace(/[^\d]/g, '').includes(q.replace(/[^\d]/g, ''));
        if (!matchName && !matchCode && !matchSubject && !matchPhone) return false;
      }
      return true;
    });
  }, [teachers, selectedStage, selectedSubject, searchQuery]);

  // Counts
  const seniorCount = useMemo(() => teachers.filter(t => t.stage === 'SENIOR').length, [teachers]);
  const middleCount = useMemo(() => teachers.filter(t => t.stage === 'MIDDLE').length, [teachers]);
  const juniorCount = useMemo(() => teachers.filter(t => t.stage === 'JUNIOR').length, [teachers]);
  const withDocsCount = useMemo(() => teachers.filter(t => t.followUpUrl && t.followUpUrl.trim()).length, [teachers]);

  // Save Modal (Add or Edit)
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const { mode, data } = modalState;
    if (!data.teacher || !data.teacher.trim()) {
      if (toast) toast.error('يرجى كتابة اسم المدرس!');
      return;
    }

    const stageLabel = data.stage === 'SENIOR' ? 'ثانوي (Senior)' : data.stage === 'MIDDLE' ? 'إعدادي (Middle)' : 'ابتدائي (Junior)';

    if (mode === 'add') {
      const newItem: TeacherFollowUpItem = {
        id: `teacher-${Date.now()}`,
        code: (data.code || '').trim().toUpperCase(),
        teacher: data.teacher.trim(),
        stage: data.stage || 'SENIOR',
        stageLabel,
        subject: (data.subject || '').trim(),
        phone: (data.phone || '').trim(),
        followUpUrl: (data.followUpUrl || '').trim(),
        notes: (data.notes || '').trim()
      };
      setTeachers(prev => [newItem, ...prev]);
      if (toast) toast.success(`تمت إضافة المدرس "${newItem.teacher}" بنجاح!`);
    } else {
      setTeachers(prev => prev.map(t => {
        if (t.id === data.id) {
          return {
            ...t,
            code: (data.code || '').trim().toUpperCase(),
            teacher: (data.teacher || '').trim(),
            stage: data.stage || 'SENIOR',
            stageLabel,
            subject: (data.subject || '').trim(),
            phone: (data.phone || '').trim(),
            followUpUrl: (data.followUpUrl || '').trim(),
            notes: (data.notes || '').trim()
          };
        }
        return t;
      }));
      if (toast) toast.success(`تم تحديث بيانات المدرس "${data.teacher}" بنجاح!`);
    }

    setModalState({ isOpen: false, mode: 'add', data: {} });
  };

  // Delete Teacher
  const handleDeleteTeacher = (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف المدرس "${name}" من القائمة؟`)) return;
    setTeachers(prev => prev.filter(t => t.id !== id));
    if (toast) toast.success(`تم حذف المدرس "${name}"`);
  };

  // Reset to original data
  const handleResetDefaults = () => {
    if (!window.confirm('هل تريد إعادة تعيين قائمة المدرسين إلى البيانات الأصلية المرفوعة من الشيتات (74 مدرس)؟')) return;
    localStorage.removeItem(STORAGE_KEY);
    setTeachers(defaultTeachersData as TeacherFollowUpItem[]);
    if (toast) toast.success('تمت استعادة البيانات الأصلية بنجاح!');
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['STAGE,CODE,TEACHER NAME,SUBJECT,PHONE NO,FOLLOW UP DETAILS'];
    const rows = filteredTeachers.map(t => {
      return `"${t.stage}","${t.code}","${t.teacher.replace(/"/g, '""')}","${t.subject.replace(/"/g, '""')}","${t.phone}","${t.followUpUrl}"`;
    });
    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `teachers_followup_${selectedStage.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for WhatsApp click
  const getWhatsAppLink = (phone: string) => {
    let clean = phone.replace(/[^\d]/g, '');
    if (clean.startsWith('0')) clean = '2' + clean;
    else if (!clean.startsWith('20')) clean = '20' + clean;
    return `https://wa.me/${clean}`;
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 space-y-6 max-w-[1700px] mx-auto w-full" dir="rtl">
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d121f] via-[#101728] to-[#0c1220] border border-white/10 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 p-0.5 shadow-xl shadow-cyan-500/20 shrink-0">
              <div className="w-full h-full bg-[#0d121f] rounded-[14px] flex items-center justify-center">
                <GraduationCap size={32} className="text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-black text-white arabic-text tracking-wide">
                  تتبع المدرسين فى ريلز
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-sm font-mono">
                  {teachers.length} Teachers
                </span>
              </div>
              <p className="text-xs md:text-sm text-muted mt-1 arabic-text leading-relaxed">
                متابعة بيانات المدرسين وروابط مستندات المتابعة الرسمية (Google Docs) عبر مراحل (ثانوي - إعدادي - ابتدائي)
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-2.5 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse"></span>
              <span className="text-xs text-muted arabic-text">ثانوي:</span>
              <span className="text-sm font-black text-blue-400 font-mono">{seniorCount}</span>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-2.5 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse"></span>
              <span className="text-xs text-muted arabic-text">إعدادي:</span>
              <span className="text-sm font-black text-purple-400 font-mono">{middleCount}</span>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-2.5 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="text-xs text-muted arabic-text">ابتدائي:</span>
              <span className="text-sm font-black text-amber-400 font-mono">{juniorCount}</span>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 shadow-sm">
              <FileText size={14} className="text-emerald-400" />
              <span className="text-xs text-emerald-300 arabic-text">ملفات متابعة:</span>
              <span className="text-sm font-black text-emerald-400 font-mono">{withDocsCount}</span>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="relative z-10 mt-6 pt-6 border-t border-white/5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Stage Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {[
              { id: 'ALL', label: `الكل (${teachers.length})`, color: 'bg-white/10 text-white' },
              { id: 'SENIOR', label: `ثانوي (${seniorCount})`, color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
              { id: 'MIDDLE', label: `إعدادي (${middleCount})`, color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
              { id: 'JUNIOR', label: `ابتدائي (${juniorCount})`, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedStage(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold arabic-text transition-all cursor-pointer whitespace-nowrap border ${
                  selectedStage === tab.id
                    ? `${tab.color} border-white/30 shadow-md scale-105 ring-2 ring-cyan-500/40 font-black`
                    : 'bg-white/[0.02] border-white/5 text-muted hover:bg-white/5 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Subject Select */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 text-xs font-bold text-white outline-none cursor-pointer transition-all"
            >
              <option value="ALL" className="bg-[#0b1019] text-white">جميع المواد ({availableSubjects.length})</option>
              {availableSubjects.map(sub => (
                <option key={sub} value={sub} className="bg-[#0b1019] text-white font-sans">{sub}</option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1 md:flex-initial">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالمدرس، الكود، المادة..."
                className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-xs text-white placeholder:text-muted/60 outline-none transition-all text-right arabic-text"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-white"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Add Teacher Button */}
            <button
              onClick={() => setModalState({ isOpen: true, mode: 'add', data: { stage: selectedStage !== 'ALL' ? selectedStage : 'SENIOR' } })}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs arabic-text shadow-lg shadow-cyan-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Plus size={15} />
              <span>إضافة مدرس</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/10 text-muted hover:text-white transition-all cursor-pointer"
              title="تصدير كملف CSV"
            >
              <Download size={15} />
            </button>

            {/* Reset Defaults */}
            <button
              onClick={handleResetDefaults}
              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 text-muted hover:text-rose-400 transition-all cursor-pointer"
              title="إعادة ضبط للقائمة الافتراضية"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Teachers Table View */}
      <div className="bg-[#0b1019]/90 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/10 text-xs font-black text-muted uppercase tracking-wider">
                <th className="py-4 px-4 text-center w-14">#</th>
                <th className="py-4 px-4 text-center w-28">الكود</th>
                <th className="py-4 px-6 text-right">اسم المدرس</th>
                <th className="py-4 px-4 text-center w-36">المرحلة</th>
                <th className="py-4 px-4 text-center">المادة</th>
                <th className="py-4 px-5 text-center w-48">رقم الهاتف</th>
                <th className="py-4 px-6 text-center w-60">ملف المتابعة (Google Doc)</th>
                <th className="py-4 px-4 text-center w-24">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredTeachers.map((teacher, idx) => {
                const stageColor = teacher.stage === 'SENIOR'
                  ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                  : teacher.stage === 'MIDDLE'
                  ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-300';

                return (
                  <motion.tr
                    key={teacher.id || idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.015, 0.3) }}
                    className="hover:bg-white/[0.03] transition-colors group"
                  >
                    {/* Index */}
                    <td className="py-4 px-4 text-center text-xs font-mono text-muted/50">
                      {idx + 1}
                    </td>

                    {/* Code */}
                    <td className="py-4 px-4 text-center">
                      {teacher.code ? (
                        <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-black tracking-wider">
                          {teacher.code}
                        </span>
                      ) : (
                        <span className="text-xs text-muted/40 font-mono">---</span>
                      )}
                    </td>

                    {/* Teacher Name */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600/30 to-purple-600/30 border border-white/10 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-inner">
                          {teacher.teacher.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white arabic-text leading-tight group-hover:text-cyan-300 transition-colors">
                            {teacher.teacher}
                          </span>
                          {teacher.notes && (
                            <span className="text-[10px] text-muted/60 arabic-text mt-0.5 line-clamp-1">
                              {teacher.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Stage */}
                    <td className="py-4 px-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${stageColor} arabic-text inline-block`}>
                        {teacher.stage === 'SENIOR' ? 'ثانوي' : teacher.stage === 'MIDDLE' ? 'إعدادي' : 'ابتدائي'}
                      </span>
                    </td>

                    {/* Subject */}
                    <td className="py-4 px-4 text-center">
                      <span className="px-3 py-1 rounded-xl bg-white/[0.03] border border-white/10 text-white/90 text-xs font-medium font-sans">
                        {teacher.subject || 'عام'}
                      </span>
                    </td>

                    {/* Phone */}
                    <td className="py-4 px-5 text-center">
                      {teacher.phone ? (
                        <div className="inline-flex items-center gap-1.5 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-xl">
                          <span className="font-mono text-xs text-emerald-400 font-bold tracking-wider">
                            {teacher.phone}
                          </span>
                          <button
                            onClick={() => handleCopy(teacher.phone, `phone-${teacher.id}`, 'رقم الهاتف')}
                            className="p-1 text-muted hover:text-white transition-colors"
                            title="نسخ رقم الهاتف"
                          >
                            {copiedId === `phone-${teacher.id}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                          <a
                            href={getWhatsAppLink(teacher.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-muted hover:text-emerald-400 transition-colors"
                            title="محادثة واتساب"
                          >
                            <MessageCircle size={13} />
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-muted/40 font-mono">غير متوفر</span>
                      )}
                    </td>

                    {/* Follow Up Doc Link */}
                    <td className="py-4 px-6 text-center">
                      {teacher.followUpUrl ? (
                        <div className="inline-flex items-center gap-2">
                          <a
                            href={teacher.followUpUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 border border-blue-500/30 hover:border-blue-400 text-blue-300 hover:text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 group/btn cursor-pointer"
                          >
                            <FileText size={13} className="text-blue-400 group-hover/btn:scale-110 transition-transform" />
                            <span>فتح المستند</span>
                            <ExternalLink size={11} className="opacity-70" />
                          </a>
                          <button
                            onClick={() => handleCopy(teacher.followUpUrl, `doc-${teacher.id}`, 'رابط المتابعة')}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors"
                            title="نسخ الرابط"
                          >
                            {copiedId === `doc-${teacher.id}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted/40 font-mono">لا يوجد ملف</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setModalState({ isOpen: true, mode: 'edit', data: teacher })}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-muted hover:text-white transition-all"
                          title="تعديل"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(teacher.id, teacher.teacher)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-muted hover:text-rose-400 transition-all"
                          title="حذف"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}

              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-muted">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <GraduationCap size={40} className="opacity-30 stroke-1" />
                      <p className="text-sm font-bold arabic-text">لا توجد بيانات تطابق الفلاتر المحددة</p>
                      <button
                        onClick={() => { setSelectedStage('ALL'); setSelectedSubject('ALL'); setSearchQuery(''); }}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all arabic-text cursor-pointer mt-2"
                      >
                        إلغاء الفلاتر
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-6 py-4 bg-white/[0.01] border-t border-white/5 flex items-center justify-between text-xs text-muted">
          <span>يتم عرض <strong className="text-white font-mono">{filteredTeachers.length}</strong> مدرس من إجمالي <strong className="text-white font-mono">{teachers.length}</strong></span>
          <span className="font-mono text-[11px] opacity-60">FOLLOW UP REELS • 2026/2027</span>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {modalState.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0f172a] border border-white/15 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white arabic-text">
                      {modalState.mode === 'add' ? 'إضافة مدرس جديد للمتابعة' : 'تعديل بيانات المدرس'}
                    </h3>
                    <p className="text-xs text-muted arabic-text">تحديث الروابط ورقم الهاتف والمرحلة</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalState({ isOpen: false, mode: 'add', data: {} })}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveModal} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">كود المدرس (Code):</label>
                    <input
                      type="text"
                      value={modalState.data.code || ''}
                      onChange={(e) => setModalState({ ...modalState, data: { ...modalState.data, code: e.target.value } })}
                      placeholder="e.g. P0138"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-500 text-white font-mono text-sm outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">المرحلة الدراسية:</label>
                    <select
                      value={modalState.data.stage || 'SENIOR'}
                      onChange={(e) => setModalState({ ...modalState, data: { ...modalState.data, stage: e.target.value as any } })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b1019] border border-white/10 focus:border-cyan-500 text-white text-sm outline-none transition-all arabic-text cursor-pointer"
                    >
                      <option value="SENIOR">ثانوي (Senior)</option>
                      <option value="MIDDLE">إعدادي (Middle)</option>
                      <option value="JUNIOR">ابتدائي (Junior)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">اسم المدرس (Teacher Name): *</label>
                  <input
                    type="text"
                    required
                    value={modalState.data.teacher || ''}
                    onChange={(e) => setModalState({ ...modalState, data: { ...modalState.data, teacher: e.target.value } })}
                    placeholder="e.g. ABDELRAHMAN MAGDY"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-500 text-white font-sans text-sm outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">المادة (Subject):</label>
                    <input
                      type="text"
                      value={modalState.data.subject || ''}
                      onChange={(e) => setModalState({ ...modalState, data: { ...modalState.data, subject: e.target.value } })}
                      placeholder="e.g. Arabic, Math, Physics"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-500 text-white font-sans text-sm outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">رقم الهاتف:</label>
                    <input
                      type="text"
                      value={modalState.data.phone || ''}
                      onChange={(e) => setModalState({ ...modalState, data: { ...modalState.data, phone: e.target.value } })}
                      placeholder="e.g. 01287121724"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-500 text-white font-mono text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">رابط ملف المتابعة (Google Doc URL):</label>
                  <input
                    type="url"
                    value={modalState.data.followUpUrl || ''}
                    onChange={(e) => setModalState({ ...modalState, data: { ...modalState.data, followUpUrl: e.target.value } })}
                    placeholder="https://docs.google.com/document/d/.../edit"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-500 text-white font-mono text-xs outline-none transition-all text-left"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted mb-1.5 arabic-text">ملاحظات إضافية:</label>
                  <input
                    type="text"
                    value={modalState.data.notes || ''}
                    onChange={(e) => setModalState({ ...modalState, data: { ...modalState.data, notes: e.target.value } })}
                    placeholder="أي ملاحظات تخص المدرس..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-500 text-white text-xs outline-none transition-all arabic-text"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 mt-6">
                  <button
                    type="button"
                    onClick={() => setModalState({ isOpen: false, mode: 'add', data: {} })}
                    className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white text-xs font-bold arabic-text transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold arabic-text shadow-lg shadow-cyan-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Save size={15} />
                    <span>{modalState.mode === 'add' ? 'إضافة المدرس' : 'حفظ التعديلات'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
