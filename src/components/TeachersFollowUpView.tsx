import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  UserCheck, 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ThumbsUp, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Link as LinkIcon, 
  Calendar, 
  Eye, 
  Video, 
  MessageSquare, 
  RefreshCw, 
  UploadCloud, 
  Image as ImageIcon, 
  Maximize2,
  CheckCheck,
  FileSpreadsheet,
  Printer,
  FileEdit,
  Settings,
  Share2,
  CheckCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import defaultTeachersData from '../data/teachers_followup.json';
import { supabase } from '../lib/supabase';

const IMGBB_API_KEY = '9d12361cb7c0726b7711a8a0b44cae5e';
const STORAGE_KEY_TEACHERS = 'teachers_followup_custom_v5';
const STORAGE_KEY_LOGS = 'teachers_followup_logs_v4';
const STORAGE_KEY_DOCS_SCRIPT = 'google_docs_sync_script_url_v1';

export type FollowUpStatus = 
  | 'recorded'      // تم التسجيل / التصوير
  | 'responsive'    // مستجيب / جاري التنسيق
  | 'refused'       // غير متقبل / رافض للتصوير
  | 'contacted'     // تم التواصل / في انتظار الرد
  | 'pending';      // لم يتم التواصل بعد

export interface TeacherFollowUpItem {
  id: string;
  code: string;
  teacher: string;
  stage: 'SENIOR' | 'MIDDLE' | 'JUNIOR';
  stageLabel?: string;
  subject: string;
  phone: string;
  followUpUrl: string;
  status: FollowUpStatus;
  reelsCount?: number;
  targetCount?: number;
  refusalReason?: string;
  notes?: string;
  lastContactDate?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface ContactLogItem {
  id: string;
  teacher_id: string;
  teacher_name: string;
  teacher_code?: string;
  stage?: string;
  subject?: string;
  contact_date: string;
  proof_url?: string;
  result: FollowUpStatus | string;
  notes?: string;
  created_at?: string;
  created_by?: string;
}

interface TeachersFollowUpViewProps {
  isDemo?: boolean;
  userProfile?: any;
  toast?: any;
}

export const STATUS_CONFIG: Record<FollowUpStatus, {
  label: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  icon: any;
  description: string;
}> = {
  recorded: {
    label: 'تم التسجيل / التصوير',
    color: '#10b981',
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-400',
    icon: CheckCircle2,
    description: 'المدرس سجل بالفعل وبدأ الإنتاج'
  },
  responsive: {
    label: 'مستجيب / جاري التنسيق',
    color: '#06b6d4',
    badgeBg: 'bg-cyan-500/15',
    badgeBorder: 'border-cyan-500/30',
    badgeText: 'text-cyan-400',
    icon: ThumbsUp,
    description: 'متقبل للفكرة وجاري تحديد موعد التصوير'
  },
  refused: {
    label: 'غير متقبل / رافض',
    color: '#ef4444',
    badgeBg: 'bg-rose-500/15',
    badgeBorder: 'border-rose-500/30',
    badgeText: 'text-rose-400',
    icon: XCircle,
    description: 'غير متقبل لفكرة التصوير أو معتذر'
  },
  contacted: {
    label: 'تم التواصل / انتظار الرد',
    color: '#f59e0b',
    badgeBg: 'bg-amber-500/15',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-400',
    icon: Clock,
    description: 'تم إرسال الرسالة أو الاتصال وبانتظار رد المدرس'
  },
  pending: {
    label: 'لم يتم التواصل بعد',
    color: '#64748b',
    badgeBg: 'bg-slate-500/15',
    badgeBorder: 'border-slate-500/30',
    badgeText: 'text-slate-400',
    icon: HelpCircle,
    description: 'مدرس بالقائمة لم يبدأ التواصل معه بعد'
  }
};

export const TeachersFollowUpView: React.FC<TeachersFollowUpViewProps> = ({ isDemo = false, userProfile, toast }) => {
  // Tabs: 'directory' (Template + List) or 'analytics' (Dashboard)
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'analytics'>('directory');

  // Teachers State
  const [teachers, setTeachers] = useState<TeacherFollowUpItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TEACHERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return (defaultTeachersData as any[]).map(t => ({
      ...t,
      status: (t.status || 'pending') as FollowUpStatus,
      reelsCount: t.reelsCount || 0,
      targetCount: t.targetCount || 0,
      refusalReason: t.refusalReason || '',
      notes: t.notes || '',
      lastContactDate: t.lastContactDate || ''
    }));
  });

  // Selected Teacher for the Top Template
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(() => {
    return teachers.length > 0 ? teachers[0].id : '';
  });

  // Contact Logs State
  const [contactLogs, setContactLogs] = useState<ContactLogItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Google Docs Sync Script Web App URL
  const [docsScriptUrl, setDocsScriptUrl] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_DOCS_SCRIPT) || '';
  });
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [isSyncingDoc, setIsSyncingDoc] = useState(false);

  const [isLoadingSupabase, setIsLoadingSupabase] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Filters & Search
  const [selectedStage, setSelectedStage] = useState<'ALL' | 'SENIOR' | 'MIDDLE' | 'JUNIOR'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Export Menu State for a teacher
  const [exportMenuTeacher, setExportMenuTeacher] = useState<TeacherFollowUpItem | null>(null);

  // In-Template Form State for New Row
  const [newRowDate, setNewRowDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [newRowProof, setNewRowProof] = useState<string>('');
  const [newRowResult, setNewRowResult] = useState<FollowUpStatus>('contacted');
  const [newRowNotes, setNewRowNotes] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Reference for template container
  const templateRef = useRef<HTMLDivElement>(null);

  // Selected teacher object
  const activeTeacher = useMemo(() => {
    return teachers.find(t => t.id === selectedTeacherId) || teachers[0] || null;
  }, [teachers, selectedTeacherId]);

  // Logs for active teacher
  const activeTeacherLogs = useMemo(() => {
    if (!activeTeacher) return [];
    return contactLogs.filter(l => l.teacher_id === activeTeacher.id);
  }, [contactLogs, activeTeacher]);

  // Save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TEACHERS, JSON.stringify(teachers));
    } catch {}
  }, [teachers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(contactLogs));
    } catch {}
  }, [contactLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DOCS_SCRIPT, docsScriptUrl);
    } catch {}
  }, [docsScriptUrl]);

  // Fetch from Supabase
  const fetchFromSupabase = async () => {
    setIsLoadingSupabase(true);
    try {
      const { data: dbTeachers, error: tErr } = await supabase
        .from('teachers_followup')
        .select('*');

      if (!tErr && dbTeachers && dbTeachers.length > 0) {
        const mapped: TeacherFollowUpItem[] = dbTeachers.map(r => ({
          id: r.id,
          code: r.code || '',
          teacher: r.teacher || '',
          stage: (r.stage || 'SENIOR') as 'SENIOR' | 'MIDDLE' | 'JUNIOR',
          stageLabel: r.stage === 'SENIOR' ? 'ثانوي (Senior)' : r.stage === 'MIDDLE' ? 'إعدادي (Middle)' : 'ابتدائي (Junior)',
          subject: r.subject || '',
          phone: r.phone || '',
          followUpUrl: r.follow_up_url || '',
          status: (r.status || 'pending') as FollowUpStatus,
          reelsCount: r.reels_count || 0,
          targetCount: r.target_count || 0,
          refusalReason: r.refusal_reason || '',
          notes: r.notes || '',
          lastContactDate: r.last_contact_date || '',
          updated_at: r.updated_at,
          updated_by: r.updated_by
        }));
        setTeachers(mapped);
      }

      const { data: dbLogs, error: lErr } = await supabase
        .from('teachers_contact_logs')
        .select('*')
        .order('contact_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (!lErr && dbLogs) {
        setContactLogs(dbLogs.map(l => ({
          id: l.id,
          teacher_id: l.teacher_id,
          teacher_name: l.teacher_name,
          teacher_code: l.teacher_code,
          stage: l.stage,
          subject: l.subject,
          contact_date: l.contact_date,
          proof_url: l.proof_url,
          result: l.result,
          notes: l.notes,
          created_at: l.created_at,
          created_by: l.created_by
        })));
      }
    } catch (err) {
      console.warn('Supabase fetch failed or offline:', err);
    } finally {
      setIsLoadingSupabase(false);
    }
  };

  useEffect(() => {
    fetchFromSupabase();
  }, []);

  // Upload image to ImgBB
  const uploadFileToImgbb = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      if (toast) toast.error('يرجى اختيار ملف صورة صالح (PNG, JPG, WEBP)!');
      return null;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success && data.data?.url) {
        if (toast) toast.success('تم رفع الصورة بنجاح إلى ImgBB!');
        return data.data.url;
      } else {
        throw new Error(data.error?.message || 'فشل في رفع الصورة');
      }
    } catch (err: any) {
      console.error('ImgBB Upload Error:', err);
      if (toast) toast.error(`خطأ أثناء رفع الصورة: ${err.message || 'يرجى المحاولة مجدداً'}`);
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle Drag & Drop
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const uploadedUrl = await uploadFileToImgbb(file);
      if (uploadedUrl) {
        setNewRowProof(uploadedUrl);
      }
    }
  };

  // Handle File Input
  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const uploadedUrl = await uploadFileToImgbb(file);
      if (uploadedUrl) {
        setNewRowProof(uploadedUrl);
      }
    }
  };

  // Clipboard Paste support (Ctrl+V)
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const uploadedUrl = await uploadFileToImgbb(file);
          if (uploadedUrl) {
            setNewRowProof(uploadedUrl);
          }
          break;
        }
      }
    }
  };

  // Copy row formatted for direct paste inside Google Doc Table
  const handleCopyForGoogleDoc = (log: ContactLogItem, teacher: TeacherFollowUpItem) => {
    const resultLabel = STATUS_CONFIG[log.result as FollowUpStatus]?.label || log.result;
    // Tab separated values: Date \t Proof \t Result \t Notes
    const tsvData = `${log.contact_date}\t${log.proof_url || ''}\t${resultLabel}\t${log.notes || ''}`;
    navigator.clipboard.writeText(tsvData);
    
    if (toast) toast.success(`تم نسخ بيانات الصف! افتح مستند (${teacher.teacher}) واضغط Ctrl+V بداخل الجدول`);
    
    if (teacher.followUpUrl) {
      window.open(teacher.followUpUrl, '_blank');
    }
  };

  // Direct sync to Google Doc via Apps Script
  const syncRowToGoogleDoc = async (docUrl: string, logData: { date: string; proof: string; result: string; notes: string }) => {
    if (!docsScriptUrl || !docsScriptUrl.trim()) return false;
    try {
      setIsSyncingDoc(true);
      await fetch(docsScriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docUrl,
          date: logData.date,
          proof: logData.proof,
          result: logData.result,
          notes: logData.notes
        })
      });
      return true;
    } catch (e) {
      console.warn('Google Doc script sync error:', e);
      return false;
    } finally {
      setIsSyncingDoc(false);
    }
  };

  // Add Row to Selected Teacher's Template
  const handleAddTemplateRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeacher) {
      if (toast) toast.error('يرجى اختيار مدرس أولاً!');
      return;
    }

    const newLog: ContactLogItem = {
      id: `log-${Date.now()}`,
      teacher_id: activeTeacher.id,
      teacher_name: activeTeacher.teacher,
      teacher_code: activeTeacher.code,
      stage: activeTeacher.stage,
      subject: activeTeacher.subject,
      contact_date: newRowDate || new Date().toISOString().split('T')[0],
      proof_url: newRowProof.trim(),
      result: newRowResult,
      notes: newRowNotes.trim(),
      created_at: new Date().toISOString(),
      created_by: userProfile?.name || 'مستخدم'
    };

    setContactLogs(prev => [newLog, ...prev]);

    setTeachers(prev => prev.map(t => {
      if (t.id === activeTeacher.id) {
        return {
          ...t,
          status: newRowResult,
          lastContactDate: newLog.contact_date,
          refusalReason: newRowResult === 'refused' ? newRowNotes.trim() : t.refusalReason,
          notes: newRowNotes.trim() || t.notes,
          updated_at: new Date().toISOString()
        };
      }
      return t;
    }));

    if (toast) toast.success(`تم حفظ صف المتابعة للمدرس "${activeTeacher.teacher}" بنجاح!`);

    // Reset Form fields
    setNewRowProof('');
    setNewRowNotes('');

    // 1. Sync with Supabase
    try {
      await supabase.from('teachers_contact_logs').insert([{
        id: newLog.id,
        teacher_id: newLog.teacher_id,
        teacher_name: newLog.teacher_name,
        teacher_code: newLog.teacher_code,
        stage: newLog.stage,
        subject: newLog.subject,
        contact_date: newLog.contact_date,
        proof_url: newLog.proof_url,
        result: newLog.result,
        notes: newLog.notes,
        created_by: newLog.created_by
      }]);

      await supabase.from('teachers_followup').update({
        status: newRowResult,
        last_contact_date: newLog.contact_date,
        refusal_reason: newRowResult === 'refused' ? newRowNotes.trim() : undefined,
        notes: newRowNotes.trim() || undefined,
        updated_at: new Date().toISOString(),
        updated_by: userProfile?.name || 'مستخدم'
      }).eq('id', activeTeacher.id);
    } catch (err) {
      console.error('Supabase Sync error:', err);
    }

    // 2. Sync to Google Doc if script URL is configured
    if (docsScriptUrl && activeTeacher.followUpUrl) {
      const synced = await syncRowToGoogleDoc(activeTeacher.followUpUrl, {
        date: newLog.contact_date,
        proof: newLog.proof_url || '',
        result: STATUS_CONFIG[newLog.result as FollowUpStatus]?.label || newLog.result,
        notes: newLog.notes || ''
      });
      if (synced && toast) {
        toast.success(`✓ تمت كتابة البيانات بداخل مستند Google Doc الخاص بـ (${activeTeacher.teacher})!`);
      }
    }
  };

  // Delete Log Row
  const handleDeleteLogRow = async (logId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل من تمبلت المدرس؟')) return;
    setContactLogs(prev => prev.filter(l => l.id !== logId));
    if (toast) toast.success('تم حذف السجل بنجاح');
    try {
      await supabase.from('teachers_contact_logs').delete().eq('id', logId);
    } catch {}
  };

  // Update Teacher Phone directly
  const handleUpdateTeacherPhone = async (teacherId: string, newPhone: string) => {
    setTeachers(prev => prev.map(t => {
      if (t.id === teacherId) {
        return { ...t, phone: newPhone };
      }
      return t;
    }));
    if (toast) toast.success('تم تحديث رقم الهاتف بنجاح!');
    try {
      await supabase.from('teachers_followup').update({ phone: newPhone }).eq('id', teacherId);
    } catch (e) {
      console.error('Failed to update phone:', e);
    }
  };

  // Quick Status change from directory
  const handleQuickStatusChange = async (teacherId: string, newStatus: FollowUpStatus) => {
    let refusalReasonPrompt = '';
    const current = teachers.find(t => t.id === teacherId);

    if (newStatus === 'refused') {
      const reason = window.prompt(`يرجى كتابة سبب عدم تقبل المدرس (${current?.teacher}) لفكرة التصوير:`, current?.refusalReason || '');
      if (reason === null) return;
      refusalReasonPrompt = reason;
    }

    const today = new Date().toISOString().split('T')[0];

    setTeachers(prev => prev.map(t => {
      if (t.id === teacherId) {
        return {
          ...t,
          status: newStatus,
          lastContactDate: today,
          refusalReason: newStatus === 'refused' ? (refusalReasonPrompt || t.refusalReason) : t.refusalReason,
          updated_at: new Date().toISOString()
        };
      }
      return t;
    }));

    if (toast) toast.success(`تم تحديث حالة المدرس إلى: ${STATUS_CONFIG[newStatus].label}`);

    try {
      await supabase
        .from('teachers_followup')
        .update({
          status: newStatus,
          last_contact_date: today,
          refusal_reason: newStatus === 'refused' ? (refusalReasonPrompt || current?.refusalReason) : current?.refusalReason,
          updated_at: new Date().toISOString(),
          updated_by: userProfile?.name || 'مستخدم'
        })
        .eq('id', teacherId);
    } catch (e) {
      console.error('Supabase update failed:', e);
    }
  };

  // Select teacher and scroll to template
  const handleSelectTeacher = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    if (templateRef.current) {
      templateRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Copy helper
  const handleCopy = (text: string, id: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    if (toast) toast.success(`تم نسخ ${label} بنجاح!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // =========================================================================
  // EXPORT FUNCTIONS: EXCEL (.xlsx), PDF (.pdf), CSV (.csv)
  // =========================================================================

  const handleExportTeacherExcel = (teacher: TeacherFollowUpItem) => {
    const teacherLogs = contactLogs.filter(l => l.teacher_id === teacher.id);
    const wb = XLSX.utils.book_new();

    const profileData = [
      { 'البند': 'اسم المدرس', 'القيمة': teacher.teacher },
      { 'البند': 'كود المدرس', 'القيمة': teacher.code || '---' },
      { 'البند': 'المرحلة الدراسية', 'القيمة': teacher.stage === 'SENIOR' ? 'ثانوي (Senior)' : teacher.stage === 'MIDDLE' ? 'إعدادي (Middle)' : 'ابتدائي (Junior)' },
      { 'البند': 'المادة الدراسية', 'القيمة': teacher.subject || '---' },
      { 'البند': 'رقم الهاتف (واتساب)', 'القيمة': teacher.phone || '---' },
      { 'البند': 'حالة المتابعة الحالية', 'القيمة': STATUS_CONFIG[teacher.status]?.label || teacher.status },
      { 'البند': 'عدد الريلز المسجلة', 'القيمة': teacher.reelsCount || 0 },
      { 'البند': 'تاريخ آخر تواصل', 'القيمة': teacher.lastContactDate || '---' },
      { 'البند': 'سبب عدم التقبل / الرفض', 'القيمة': teacher.refusalReason || '---' },
      { 'البند': 'ملاحظات وتفاصيل', 'القيمة': teacher.notes || '---' },
      { 'البند': 'مستند المتابعة (Google Doc)', 'القيمة': teacher.followUpUrl || '---' },
      { 'البند': 'تاريخ استخراج التقرير', 'القيمة': new Date().toLocaleDateString('ar-EG') }
    ];
    const wsProfile = XLSX.utils.json_to_sheet(profileData);
    XLSX.utils.book_append_sheet(wb, wsProfile, 'بيانات المدرس');

    const logsSheetData = teacherLogs.map((l, idx) => ({
      '#': idx + 1,
      'تاريخ التواصل': l.contact_date,
      'اثبات التواصل': l.proof_url || 'لا يوجد إثبات',
      'نتيجة التواصل': STATUS_CONFIG[l.result as FollowUpStatus]?.label || l.result,
      'ملاحظات': l.notes || '---'
    }));

    const wsLogs = XLSX.utils.json_to_sheet(
      logsSheetData.length > 0 
        ? logsSheetData 
        : [{ '#': '-', 'تاريخ التواصل': 'لا توجد سجلات تواصل مسجلة بعد لهذا المدرس' }]
    );
    XLSX.utils.book_append_sheet(wb, wsLogs, 'جدول متابعة التواصل');

    const fileName = `تقرير_متابعة_${teacher.code || 'مدرس'}_${teacher.teacher.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    if (toast) toast.success(`تم تصدير تقرير Excel للمدرس "${teacher.teacher}" بنجاح!`);
  };

  const handleExportTeacherPDF = (teacher: TeacherFollowUpItem) => {
    const teacherLogs = contactLogs.filter(l => l.teacher_id === teacher.id);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      if (toast) toast.error('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير');
      return;
    }

    const statusLabel = STATUS_CONFIG[teacher.status]?.label || teacher.status;
    const stageName = teacher.stage === 'SENIOR' ? 'ثانوي (Senior)' : teacher.stage === 'MIDDLE' ? 'إعدادي (Middle)' : 'ابتدائي (Junior)';

    const rowsHtml = teacherLogs.length === 0 
      ? `<tr><td colspan="4" style="text-align:center; padding: 25px; color: #64748b; font-size: 13px;">لا توجد سجلات تواصل مسجلة حتى الآن لهذا المدرس.</td></tr>`
      : teacherLogs.map((l, i) => `
        <tr style="border-bottom: 1px solid #e2e8f0; ${i % 2 === 0 ? 'background:#f8fafc;' : ''}">
          <td style="padding: 10px; text-align: center; font-weight: bold; font-family: monospace;">${l.contact_date}</td>
          <td style="padding: 10px; text-align: center;">
            ${l.proof_url ? `<a href="${l.proof_url}" target="_blank" style="color: #059669; font-weight: bold; text-decoration: underline;">فتح الإثبات</a>` : '<span style="color:#94a3b8;">لا يوجد</span>'}
          </td>
          <td style="padding: 10px; text-align: center; font-weight: bold;">
            <span style="display:inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; background: #e6f4ea; color: #137333;">
              ${STATUS_CONFIG[l.result as FollowUpStatus]?.label || l.result}
            </span>
          </td>
          <td style="padding: 10px; text-align: right; font-size: 12px; color: #334155;">${l.notes || '---'}</td>
        </tr>
      `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>تقرير متابعة المدرس - ${teacher.teacher}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 30px; color: #0f172a; direction: rtl; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2e5e2e; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 22px; font-weight: 900; color: #2e5e2e; margin: 0; }
          .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
          .badge { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 6px 14px; border-radius: 8px; font-weight: 900; font-size: 13px; font-family: monospace; }
          .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 20px; }
          .meta-item { font-size: 13px; }
          .meta-label { font-weight: bold; color: #64748b; font-size: 11px; margin-bottom: 3px; }
          .meta-val { font-weight: 800; color: #0f172a; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #2e5e2e; color: white; padding: 12px; font-size: 13px; border: 1px solid #2e5e2e; }
          td { border: 1px solid #e2e8f0; }
          .refusal-box { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; color: #9f1239; font-size: 13px; }
          .footer { margin-top: 35px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print {
            body { margin: 15px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">الخطة التعليمية (El-Khetta) - تقرير متابعة المدرس في ريلز</h1>
            <div class="subtitle">تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}</div>
          </div>
          <div>
            <span class="badge">${teacher.code || 'TEACHER'}</span>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <div class="meta-label">اسم المدرس</div>
            <div class="meta-val">${teacher.teacher}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">المرحلة والمادة</div>
            <div class="meta-val">${stageName} - ${teacher.subject}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">حالة المتابعة والتصوير</div>
            <div class="meta-val" style="color: #047857;">${statusLabel}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">رقم الهاتف</div>
            <div class="meta-val" style="font-family: monospace;">${teacher.phone || 'غير متوفر'}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">الريلز المسجلة</div>
            <div class="meta-val">${teacher.reelsCount || 0}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">تاريخ آخر تواصل</div>
            <div class="meta-val" style="font-family: monospace;">${teacher.lastContactDate || '---'}</div>
          </div>
          <div class="meta-item" style="grid-column: span 2;">
            <div class="meta-label">رابط مستند المتابعة (Google Doc)</div>
            <div class="meta-val" style="font-size: 11px; word-break: break-all; color: #0284c7;">${teacher.followUpUrl || 'لا يوجد'}</div>
          </div>
        </div>

        ${teacher.status === 'refused' && teacher.refusalReason ? `
          <div class="refusal-box">
            <strong>⚠️ سبب عدم التقبل / الرفض:</strong> ${teacher.refusalReason}
          </div>
        ` : ''}

        <h3 style="margin-bottom: 6px; color: #0f172a; font-size: 16px;">جدول توثيق وسجلات التواصل:</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 140px; text-align: center;">تاريخ التواصل</th>
              <th style="width: 140px; text-align: center;">اثبات التواصل</th>
              <th style="width: 160px; text-align: center;">نتيجة التواصل</th>
              <th style="text-align: right;">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          تم استخراج هذا التقرير آلياً من نظام إدارة ومتابعة ريلز الخطة التعليمية © ${new Date().getFullYear()}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportTeacherCSV = (teacher: TeacherFollowUpItem) => {
    const teacherLogs = contactLogs.filter(l => l.teacher_id === teacher.id);
    const escape = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
    const stageName = teacher.stage === 'SENIOR' ? 'ثانوي' : teacher.stage === 'MIDDLE' ? 'إعدادي' : 'ابتدائي';
    const statusLabel = STATUS_CONFIG[teacher.status]?.label || teacher.status;

    const lines = [
      `تقرير متابعة المدرس: ${teacher.teacher}`,
      `الكود,${escape(teacher.code)}`,
      `المرحلة,${escape(stageName)}`,
      `المادة,${escape(teacher.subject)}`,
      `الهاتف,${escape(teacher.phone)}`,
      `حالة المتابعة,${escape(statusLabel)}`,
      `الريلز المسجلة,${teacher.reelsCount || 0}`,
      `تاريخ آخر تواصل,${escape(teacher.lastContactDate || '')}`,
      `سبب عدم التقبل,${escape(teacher.refusalReason || '')}`,
      `ملاحظات,${escape(teacher.notes || '')}`,
      `مستند المتابعة,${escape(teacher.followUpUrl || '')}`,
      '',
      'جدول متابعة التواصل:',
      'تاريخ التواصل,اثبات التواصل,نتيجة التواصل,ملاحظات'
    ];

    teacherLogs.forEach(l => {
      lines.push([
        escape(l.contact_date),
        escape(l.proof_url || ''),
        escape(STATUS_CONFIG[l.result as FollowUpStatus]?.label || l.result),
        escape(l.notes || '')
      ].join(','));
    });

    const csvContent = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `تقرير_${teacher.code || 'مدرس'}_${teacher.teacher.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (toast) toast.success(`تم تصدير تقرير CSV للمدرس "${teacher.teacher}" بنجاح!`);
  };

  // Distinct subjects
  const availableSubjects = useMemo(() => {
    const list = new Set<string>();
    teachers.forEach(t => {
      if (t.subject && t.subject.trim()) list.add(t.subject.trim());
    });
    return Array.from(list).sort();
  }, [teachers]);

  // Filtered teachers list
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      if (selectedStage !== 'ALL' && t.stage !== selectedStage) return false;
      if (selectedStatus !== 'ALL' && t.status !== selectedStatus) return false;
      if (selectedSubject !== 'ALL' && t.subject !== selectedSubject) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = t.teacher.toLowerCase().includes(q);
        const matchCode = t.code.toLowerCase().includes(q);
        const matchSubject = t.subject.toLowerCase().includes(q);
        const matchPhone = t.phone.replace(/[^\d]/g, '').includes(q.replace(/[^\d]/g, ''));
        const matchNotes = (t.notes || '').toLowerCase().includes(q) || (t.refusalReason || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchSubject && !matchPhone && !matchNotes) return false;
      }
      return true;
    });
  }, [teachers, selectedStage, selectedStatus, selectedSubject, searchQuery]);

  // --- STATS CALCULATIONS ---
  const stats = useMemo(() => {
    const total = teachers.length;
    const recorded = teachers.filter(t => t.status === 'recorded');
    const responsive = teachers.filter(t => t.status === 'responsive');
    const refused = teachers.filter(t => t.status === 'refused');
    const contacted = teachers.filter(t => t.status === 'contacted');
    const pending = teachers.filter(t => t.status === 'pending' || !t.status);

    const totalReels = recorded.reduce((sum, t) => sum + (t.reelsCount || 0), 0);
    const contactedTotal = recorded.length + responsive.length + refused.length + contacted.length;
    const positiveResponses = recorded.length + responsive.length;
    const acceptanceRate = contactedTotal > 0 ? Math.round((positiveResponses / contactedTotal) * 100) : 0;
    const refusalRate = contactedTotal > 0 ? Math.round((refused.length / contactedTotal) * 100) : 0;

    const byStage = {
      SENIOR: {
        total: teachers.filter(t => t.stage === 'SENIOR').length,
        recorded: teachers.filter(t => t.stage === 'SENIOR' && t.status === 'recorded').length,
        responsive: teachers.filter(t => t.stage === 'SENIOR' && t.status === 'responsive').length,
        refused: teachers.filter(t => t.stage === 'SENIOR' && t.status === 'refused').length,
        contacted: teachers.filter(t => t.stage === 'SENIOR' && t.status === 'contacted').length,
        pending: teachers.filter(t => t.stage === 'SENIOR' && (!t.status || t.status === 'pending')).length,
      },
      MIDDLE: {
        total: teachers.filter(t => t.stage === 'MIDDLE').length,
        recorded: teachers.filter(t => t.stage === 'MIDDLE' && t.status === 'recorded').length,
        responsive: teachers.filter(t => t.stage === 'MIDDLE' && t.status === 'responsive').length,
        refused: teachers.filter(t => t.stage === 'MIDDLE' && t.status === 'refused').length,
        contacted: teachers.filter(t => t.stage === 'MIDDLE' && t.status === 'contacted').length,
        pending: teachers.filter(t => t.stage === 'MIDDLE' && (!t.status || t.status === 'pending')).length,
      },
      JUNIOR: {
        total: teachers.filter(t => t.stage === 'JUNIOR').length,
        recorded: teachers.filter(t => t.stage === 'JUNIOR' && t.status === 'recorded').length,
        responsive: teachers.filter(t => t.stage === 'JUNIOR' && t.status === 'responsive').length,
        refused: teachers.filter(t => t.stage === 'JUNIOR' && t.status === 'refused').length,
        contacted: teachers.filter(t => t.stage === 'JUNIOR' && t.status === 'contacted').length,
        pending: teachers.filter(t => t.stage === 'JUNIOR' && (!t.status || t.status === 'pending')).length,
      }
    };

    const subjectStatsMap: Record<string, { total: number; recorded: number; responsive: number; refused: number }> = {};
    teachers.forEach(t => {
      const s = t.subject || 'غير محدد';
      if (!subjectStatsMap[s]) {
        subjectStatsMap[s] = { total: 0, recorded: 0, responsive: 0, refused: 0 };
      }
      subjectStatsMap[s].total++;
      if (t.status === 'recorded') subjectStatsMap[s].recorded++;
      if (t.status === 'responsive') subjectStatsMap[s].responsive++;
      if (t.status === 'refused') subjectStatsMap[s].refused++;
    });

    const subjectStatsList = Object.entries(subjectStatsMap)
      .map(([subject, data]) => ({ subject, ...data }))
      .sort((a, b) => b.total - a.total);

    return {
      total,
      recordedCount: recorded.length,
      responsiveCount: responsive.length,
      refusedCount: refused.length,
      contactedCount: contacted.length,
      pendingCount: pending.length,
      totalReels,
      acceptanceRate,
      refusalRate,
      byStage,
      subjectStatsList,
      refusedTeachers: refused,
      responsiveTeachers: responsive,
      recordedTeachers: recorded
    };
  }, [teachers]);

  // Google Apps Script template code to show in the setup modal
  const appsScriptCodeSnippet = `// كود Google Apps Script لمزامنة وتعبئة جداول المتابعة تلقائياً في Google Docs
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var docUrl = data.docUrl;
    if (!docUrl) return ContentService.createTextOutput(JSON.stringify({ error: "Missing docUrl" })).setMimeType(ContentService.MimeType.JSON);
    
    var doc = DocumentApp.openByUrl(docUrl);
    var body = doc.getBody();
    var tables = body.getTables();
    if (tables.length === 0) return ContentService.createTextOutput(JSON.stringify({ error: "No table found in doc" })).setMimeType(ContentService.MimeType.JSON);
    
    var table = tables[0];
    var filled = false;
    
    // البحث عن أول صف فارغ في الجدول وتعبئته
    for (var r = 1; r < table.getNumRows(); r++) {
      var row = table.getRow(r);
      var isEmpty = true;
      for (var c = 0; c < row.getNumCells(); c++) {
        if (row.getCell(c).getText().trim() !== "") {
          isEmpty = false;
          break;
        }
      }
      if (isEmpty) {
        row.getCell(0).setText(data.date || "");
        row.getCell(1).setText(data.proof || "");
        row.getCell(2).setText(data.result || "");
        row.getCell(3).setText(data.notes || "");
        filled = true;
        break;
      }
    }
    
    // إذا لم يكن هناك صف فارغ، أضف صفاً جديداً
    if (!filled) {
      var newRow = table.appendTableRow();
      newRow.appendTableCell(data.date || "");
      newRow.appendTableCell(data.proof || "");
      newRow.appendTableCell(data.result || "");
      newRow.appendTableCell(data.notes || "");
    }
    
    doc.saveAndClose();
    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  return (
    <div className="w-full space-y-6 pb-24 select-text" dir="rtl">
      
      {/* 1. TOP HEADER & NAVIGATION */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/25 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">تتبع المدرسين فى ريلز</h1>
                <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-bold text-cyan-300 border border-cyan-500/30">
                  Teachers {teachers.length}
                </span>
                {isLoadingSupabase && (
                  <span className="flex items-center gap-1 text-xs text-cyan-400/80 animate-pulse">
                    <RefreshCw className="h-3 w-3 animate-spin" /> جاري المزامنة...
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                تمبلت متابعة المدرسين، تعبئة مستندات Google Docs مباشرة، رفع الإثباتات بـ Drag & Drop، وتقارير Export.
              </p>
            </div>
          </div>

          {/* Sub-Tabs Switcher + Google Doc Live Sync Button */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Google Docs Sync Status / Setup Button */}
            <button
              onClick={() => setIsDocsModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all shadow-sm ${
                docsScriptUrl
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-950/70'
                  : 'bg-blue-950/40 border-blue-500/50 text-blue-300 hover:bg-blue-950/70'
              }`}
              title="إعدادات المزامنة المباشرة مع مستندات Google Docs"
            >
              <FileEdit className="h-4 w-4" />
              <span>{docsScriptUrl ? 'مزامنة Google Docs (نشطة ✓)' : 'ربط تعبئة Google Docs 🔗'}</span>
            </button>

            <div className="flex items-center rounded-xl bg-slate-900/80 p-1 border border-slate-700/60 shadow-inner">
              <button
                onClick={() => setActiveSubTab('directory')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeSubTab === 'directory'
                    ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                <span>تمبلت وقائمة المدرسين</span>
              </button>

              <button
                onClick={() => setActiveSubTab('analytics')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeSubTab === 'analytics'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                <span>لوحة الإحصائيات الشاملة</span>
                <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-extrabold text-white">
                  {stats.acceptanceRate}% قبول
                </span>
              </button>
            </div>

            <button
              onClick={fetchFromSupabase}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
              title="تحديث البيانات من السيرفر"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingSupabase ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick KPI Badges Ribbon */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/60 px-3 py-1.5 border border-slate-800 text-slate-300">
            <span className="text-slate-500">إجمالي المدرسين:</span>
            <span className="font-black text-cyan-400">{teachers.length}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 border border-emerald-500/25 text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>تم التسجيل / التصوير:</span>
            <span className="font-black text-emerald-400">{stats.recordedCount}</span>
            <span className="text-[10px] text-emerald-400/70">({stats.totalReels} ريلز)</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-cyan-500/10 px-3 py-1.5 border border-cyan-500/25 text-cyan-300">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span>مستجيب للتصوير:</span>
            <span className="font-black text-cyan-400">{stats.responsiveCount}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-1.5 border border-rose-500/25 text-rose-300">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            <span>غير متقبل / رافض:</span>
            <span className="font-black text-rose-400">{stats.refusedCount}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 border border-amber-500/25 text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span>في انتظار الرد:</span>
            <span className="font-black text-amber-400">{stats.contactedCount}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-slate-500/10 px-3 py-1.5 border border-slate-500/25 text-slate-400">
            <span>لم يتواصل:</span>
            <span className="font-black text-slate-300">{stats.pendingCount}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: TEMPLATE WORKSPACE (SELECTED TEACHER) + DIRECTORY TABLE */}
      {/* ========================================================================= */}
      {activeSubTab === 'directory' && (
        <div className="space-y-6">

          {/* ------------------------------------------------------------- */}
          {/* TOP SECTION: DEDICATED TEACHER FOLLOW-UP TEMPLATE TABLE */}
          {/* (تاريخ التواصل | اثبات التواصل | نتيجة التواصل | ملاحظات) */}
          {/* ------------------------------------------------------------- */}
          <div 
            ref={templateRef}
            className="relative overflow-hidden rounded-2xl border-2 border-emerald-600/40 bg-slate-950 shadow-2xl backdrop-blur-xl"
            onPaste={handlePaste}
          >
            {/* Template Header & Teacher Selector Bar */}
            <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-950 p-4 border-b border-emerald-600/30">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2e5e2e] text-white shadow-lg shadow-emerald-950">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-white">تمبلت متابعة التواصل مع المدرس</h2>
                      <span className="rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2 py-0.5 font-bold">
                        {activeTeacherLogs.length} سجلات للمدرس
                      </span>
                      {isSyncingDoc && (
                        <span className="flex items-center gap-1 text-xs text-blue-400 animate-pulse font-bold">
                          <RefreshCw className="h-3 w-3 animate-spin" /> جاري التعبئة في Google Doc...
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      حدد المدرس واملأ بيانات التواصل (تاريخ التواصل، إثبات بالـ Drag & Drop أو Ctrl+V، النتيجة، والملاحظات).
                    </p>
                  </div>
                </div>

                {/* Teacher Selector Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-emerald-400 whitespace-nowrap">
                    المدرس المختار:
                  </label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="min-w-[260px] rounded-xl border-2 border-emerald-600/60 bg-slate-900/95 px-3 py-2 text-xs font-bold text-white shadow-inner focus:border-emerald-400 focus:outline-none"
                  >
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.teacher} ({t.code || '---'}) - {t.stage === 'SENIOR' ? 'ثانوي' : t.stage === 'MIDDLE' ? 'إعدادي' : 'ابتدائي'} | {t.subject}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Teacher Quick Info Card & EXPORT BAR */}
              {activeTeacher && (
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                      <span className="text-slate-500">الاسم:</span>
                      <span className="font-bold text-white text-sm">{activeTeacher.teacher}</span>
                      <span className="font-mono text-cyan-400 text-xs bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                        {activeTeacher.code}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                      <span className="text-slate-500">المرحلة والمادة:</span>
                      <span className="font-bold text-slate-300">
                        {activeTeacher.stage === 'SENIOR' ? 'ثانوي' : activeTeacher.stage === 'MIDDLE' ? 'إعدادي' : 'ابتدائي'} - {activeTeacher.subject}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">الحالة:</span>
                      <select
                        value={activeTeacher.status || 'pending'}
                        onChange={(e) => handleQuickStatusChange(activeTeacher.id, e.target.value as FollowUpStatus)}
                        className={`rounded-xl border px-2.5 py-1 text-xs font-bold cursor-pointer transition-all ${STATUS_CONFIG[activeTeacher.status]?.badgeBg} ${STATUS_CONFIG[activeTeacher.status]?.badgeBorder} ${STATUS_CONFIG[activeTeacher.status]?.badgeText}`}
                      >
                        <option value="recorded" className="bg-slate-900 text-emerald-400">🟢 تم التسجيل / التصوير</option>
                        <option value="responsive" className="bg-slate-900 text-cyan-400">🔵 مستجيب / جاري التنسيق</option>
                        <option value="refused" className="bg-slate-900 text-rose-400">🔴 غير متقبل / رافض</option>
                        <option value="contacted" className="bg-slate-900 text-amber-400">🟡 في انتظار الرد</option>
                        <option value="pending" className="bg-slate-900 text-slate-400">⚪ لم يتم التواصل</option>
                      </select>
                    </div>
                  </div>

                  {/* Actions & EXPORT BUTTONS for Selected Teacher */}
                  <div className="flex items-center gap-2">
                    {/* EXPORT DROPDOWN / BUTTONS */}
                    <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-emerald-500/40">
                      <span className="text-[11px] text-emerald-400 font-bold px-1.5 flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        <span>تصدير:</span>
                      </span>

                      {/* Export Excel */}
                      <button
                        onClick={() => handleExportTeacherExcel(activeTeacher)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-bold text-xs border border-emerald-500/40 transition-colors"
                        title="تصدير تقرير المدرس بصيغة Excel (.xlsx)"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        <span>Excel</span>
                      </button>

                      {/* Export PDF */}
                      <button
                        onClick={() => handleExportTeacherPDF(activeTeacher)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 font-bold text-xs border border-rose-500/40 transition-colors"
                        title="طباعة وتصدير تقرير المدرس بصيغة PDF (.pdf)"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>PDF</span>
                      </button>

                      {/* Export CSV */}
                      <button
                        onClick={() => handleExportTeacherCSV(activeTeacher)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 font-bold text-xs border border-blue-500/40 transition-colors"
                        title="تصدير تقرير المدرس بصيغة CSV (.csv)"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>CSV</span>
                      </button>
                    </div>

                    {/* Separated: Editable Phone Number + WhatsApp + Copy */}
                    {/* Separated: Editable Phone Number + WhatsApp + Copy */}
                    {activeTeacher.phone ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopy(activeTeacher.phone, `active-phone-${activeTeacher.id}`, 'رقم الهاتف')}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                          title="نسخ رقم الهاتف"
                        >
                          {copiedId === `active-phone-${activeTeacher.id}` ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>

                        {/* Phone Number in its own pill (clickable to edit) */}
                        <span
                          onClick={() => {
                            const newPhone = window.prompt(`تعديل رقم هاتف (${activeTeacher.teacher}):`, activeTeacher.phone);
                            if (newPhone !== null && newPhone.trim() !== activeTeacher.phone) {
                              handleUpdateTeacherPhone(activeTeacher.id, newPhone.trim());
                            }
                          }}
                          className="dir-ltr font-mono text-xs text-emerald-400 font-bold hover:underline cursor-pointer rounded-xl border border-emerald-500/80 bg-emerald-950/20 px-2.5 py-1 shadow-sm hover:bg-emerald-950/40 hover:border-emerald-400 transition-all"
                          title="اضغط لتعديل رقم الهاتف"
                        >
                          {activeTeacher.phone}
                        </span>

                        {/* WhatsApp in its OWN separate icon button */}
                        <a
                          href={`https://wa.me/2${activeTeacher.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`السلام عليكم يا أ/ ${activeTeacher.teacher}، بخصوص ريلز الخطة لمادة ${activeTeacher.subject}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border border-emerald-500/80 bg-emerald-950/20 p-1.5 text-emerald-400 hover:bg-emerald-900/40 hover:border-emerald-400 transition-all flex items-center justify-center shadow-sm"
                          title="فتح محادثة واتساب"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const newPhone = window.prompt(`إدخال رقم هاتف للمدرس (${activeTeacher.teacher}):`, '');
                          if (newPhone && newPhone.trim()) {
                            handleUpdateTeacherPhone(activeTeacher.id, newPhone.trim());
                          }
                        }}
                        className="text-slate-500 hover:text-emerald-400 text-xs hover:underline font-mono"
                        title="اضغط لإضافة رقم هاتف"
                      >
                        + إضافة هاتف
                      </button>
                    )}

                    {/* Google Doc Link Button */}
                    {activeTeacher.followUpUrl && (
                      <a
                        href={activeTeacher.followUpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-xl font-bold transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>فتح Google Doc</span>
                        <ExternalLink className="h-3 w-3 opacity-70" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* THE EXACT 4-COLUMN GREEN-HEADER TEMPLATE TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-[#2e5e2e] text-white font-extrabold text-sm border-b-2 border-emerald-700">
                    <th className="py-3.5 px-4 w-12 text-center border-l border-emerald-700/60">#</th>
                    <th className="py-3.5 px-6 text-center border-l border-emerald-700/60 w-44">
                      <div className="flex items-center justify-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>تاريخ التواصل</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-6 text-center border-l border-emerald-700/60 w-64">
                      <div className="flex items-center justify-center gap-1.5">
                        <UploadCloud className="h-4 w-4" />
                        <span>اثبات التواصل</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-6 text-center border-l border-emerald-700/60 w-52">
                      <div className="flex items-center justify-center gap-1.5">
                        <CheckCheck className="h-4 w-4" />
                        <span>نتيجة التواصل</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-6 border-l border-emerald-700/60">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4" />
                        <span>ملاحظات</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-3 text-center w-28">إجراءات</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800 bg-slate-950/80 font-medium">
                  {/* Saved Rows for This Teacher */}
                  {activeTeacherLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Clock className="h-7 w-7 text-slate-600" />
                          <span>لا توجد سجلات تواصل مسجلة بعد لهذا المدرس.</span>
                          <span className="text-[11px] text-emerald-400 font-bold">
                            املأ الصف بالأسفل واضغط "حفظ في التمبلت" لإضافة أول تواصل.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    activeTeacherLogs.map((log, index) => {
                      const statusConf = STATUS_CONFIG[log.result as FollowUpStatus] || STATUS_CONFIG.contacted;
                      const StatusIcon = statusConf.icon;

                      return (
                        <tr key={log.id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="py-3 px-4 text-center font-mono text-slate-500 border-l border-slate-800">
                            {index + 1}
                          </td>

                          {/* 1. تاريخ التواصل */}
                          <td className="py-3 px-6 text-center font-mono font-bold text-white border-l border-slate-800">
                            <div className="inline-flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                              <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                              <span>{log.contact_date}</span>
                            </div>
                          </td>

                          {/* 2. اثبات التواصل (Image Thumbnail / Link / ImgBB) */}
                          <td className="py-3 px-6 text-center border-l border-slate-800">
                            {log.proof_url ? (
                              <div className="inline-flex items-center gap-2">
                                <div 
                                  onClick={() => setPreviewImageUrl(log.proof_url || null)}
                                  className="group relative h-10 w-14 rounded-lg overflow-hidden border border-emerald-500/40 cursor-pointer shadow-md"
                                  title="اضغط لتكبير الصورة"
                                >
                                  <img 
                                    src={log.proof_url} 
                                    alt="إثبات التواصل" 
                                    className="h-full w-full object-cover group-hover:scale-110 transition-transform" 
                                    onError={(e: any) => { e.target.style.display = 'none'; }}
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Maximize2 className="h-4 w-4 text-white" />
                                  </div>
                                </div>

                                <a
                                  href={log.proof_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-bold"
                                  title="فتح الرابط في صفحة جديدة"
                                >
                                  <span>فتح الرابط</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-slate-600 text-xs italic">لا يوجد إثبات</span>
                            )}
                          </td>

                          {/* 3. نتيجة التواصل */}
                          <td className="py-3 px-6 text-center border-l border-slate-800">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold ${statusConf.badgeBg} ${statusConf.badgeBorder} ${statusConf.badgeText}`}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              <span>{statusConf.label}</span>
                            </span>
                          </td>

                          {/* 4. ملاحظات */}
                          <td className="py-3 px-6 border-l border-slate-800 text-slate-300">
                            {log.notes ? (
                              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 text-xs leading-relaxed">
                                {log.notes}
                              </div>
                            ) : (
                              <span className="text-slate-600">---</span>
                            )}
                          </td>

                          {/* إجراءات + تعبئة Google Doc */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* 1-Click Copy / Open in Google Doc Table */}
                              <button
                                onClick={() => handleCopyForGoogleDoc(log, activeTeacher)}
                                className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-600/20 transition-colors"
                                title="نسخ الصف وفتح مستند Google Doc لتعبئته بـ Ctrl+V"
                              >
                                <Share2 className="h-3.5 w-3.5" />
                              </button>

                              {/* Delete Row */}
                              <button
                                onClick={() => handleDeleteLogRow(log.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="حذف هذا الصف"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* 3. INLINE ROW ADDER FORM */}
                  <tr className="bg-emerald-950/20 border-t-2 border-emerald-600/40">
                    <td className="py-4 px-4 text-center font-bold text-emerald-400 border-l border-slate-800">
                      جديد
                    </td>

                    {/* تاریخ التواصل (Input Type Date) */}
                    <td className="py-4 px-4 text-center border-l border-slate-800">
                      <input
                        type="date"
                        value={newRowDate}
                        onChange={(e) => setNewRowDate(e.target.value)}
                        className="w-full rounded-xl border-2 border-emerald-600/50 bg-slate-900 px-3 py-2 text-xs font-bold text-white focus:border-emerald-400 focus:outline-none font-mono"
                      />
                    </td>

                    {/* اثبات التواصل (Drag & Drop + ImgBB Upload + Link) */}
                    <td className="py-4 px-4 text-center border-l border-slate-800">
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        className={`relative rounded-xl border-2 border-dashed p-2 transition-all ${
                          isDragOver 
                            ? 'border-emerald-400 bg-emerald-950/50 scale-102' 
                            : 'border-emerald-600/50 bg-slate-900/80 hover:border-emerald-500'
                        }`}
                      >
                        {isUploadingImage ? (
                          <div className="flex items-center justify-center gap-2 py-2 text-xs text-emerald-400">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>جاري رفع الصورة إلى ImgBB...</span>
                          </div>
                        ) : newRowProof ? (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <img 
                                src={newRowProof} 
                                alt="معاينة" 
                                className="h-8 w-10 object-cover rounded border border-emerald-500/40" 
                                onError={(e: any) => { e.target.style.display = 'none'; }}
                              />
                              <span className="text-[11px] text-emerald-300 font-bold truncate max-w-[120px]">
                                تم رفع الصورة ✓
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setNewRowProof('')}
                              className="text-slate-400 hover:text-rose-400 p-1"
                              title="إلغاء الصورة"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center cursor-pointer py-1 text-center">
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleFileInput} 
                              className="hidden" 
                            />
                            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                              <UploadCloud className="h-3.5 w-3.5" />
                              <span>اسحب الصورة هنا أو اختر</span>
                            </div>
                            <span className="text-[10px] text-slate-500 mt-0.5">
                              يدعم السحب والإفلات أو اللصق (Ctrl+V)
                            </span>
                          </label>
                        )}
                      </div>
                    </td>

                    {/* نتيجة التواصل (Dropdown) */}
                    <td className="py-4 px-4 text-center border-l border-slate-800">
                      <select
                        value={newRowResult}
                        onChange={(e) => setNewRowResult(e.target.value as FollowUpStatus)}
                        className="w-full rounded-xl border-2 border-emerald-600/50 bg-slate-900 px-3 py-2 text-xs font-bold text-white focus:border-emerald-400 focus:outline-none"
                      >
                        <option value="recorded" className="text-emerald-400">🟢 تم التسجيل / التصوير</option>
                        <option value="responsive" className="text-cyan-400">🔵 مستجيب ومتقبل / جاري التنسيق</option>
                        <option value="refused" className="text-rose-400">🔴 غير متقبل لفكرة التصوير / رافض</option>
                        <option value="contacted" className="text-amber-400">🟡 تم التواصل / في انتظار الرد</option>
                        <option value="pending" className="text-slate-400">⚪ لم يتم التواصل بعد</option>
                      </select>
                    </td>

                    {/* ملاحظات */}
                    <td className="py-4 px-4 border-l border-slate-800">
                      <input
                        type="text"
                        value={newRowNotes}
                        onChange={(e) => setNewRowNotes(e.target.value)}
                        placeholder={
                          newRowResult === 'refused'
                            ? 'اكتب سبب عدم التقبل أو الرفض بالتفصيل...'
                            : 'اكتب تفاصيل المحادثة أو موعد المتابعة القادم...'
                        }
                        className="w-full rounded-xl border-2 border-emerald-600/50 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                      />
                    </td>

                    {/* حفظ الصف في التمبلت وتعبئة Google Doc */}
                    <td className="py-4 px-3 text-center">
                      <button
                        type="button"
                        onClick={handleAddTemplateRow}
                        className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-1"
                        title="حفظ هذا الصف للمدرس وتحديث مستند Google Doc"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>حفظ</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SECTION B: ALL TEACHERS DIRECTORY TABLE (74 TEACHERS) */}
          {/* ------------------------------------------------------------- */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl backdrop-blur-xl">
            
            {/* Header + Instructions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-cyan-400" />
                  <span>دليل المدرسين العام (74 معلماً)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  اضغط على أي مدرس لفتح تمبلت المتابعة الخاص به في الأعلى، أو اضغط زر التقرير لاستخراج (Excel / PDF / CSV).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  المعروض: <span className="font-bold text-cyan-400">{filteredTeachers.length}</span> من {teachers.length}
                </span>
              </div>
            </div>

            {/* Filter Controls Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4">
              {/* Stages */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setSelectedStage('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedStage === 'ALL'
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  الكل ({teachers.length})
                </button>
                <button
                  onClick={() => setSelectedStage('SENIOR')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedStage === 'SENIOR'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  ثانوي ({stats.byStage.SENIOR.total})
                </button>
                <button
                  onClick={() => setSelectedStage('MIDDLE')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedStage === 'MIDDLE'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  إعدادي ({stats.byStage.MIDDLE.total})
                </button>
                <button
                  onClick={() => setSelectedStage('JUNIOR')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedStage === 'JUNIOR'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-500/25'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  ابتدائي ({stats.byStage.JUNIOR.total})
                </button>
              </div>

              {/* Status & Subject & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-900 rounded-xl px-2 py-1 border border-slate-800">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[11px] text-slate-400">الحالة:</span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-slate-900 text-white">جميع الحالات</option>
                    <option value="recorded" className="bg-slate-900 text-emerald-400">🟢 تم التسجيل</option>
                    <option value="responsive" className="bg-slate-900 text-cyan-400">🔵 مستجيب</option>
                    <option value="refused" className="bg-slate-900 text-rose-400">🔴 غير متقبل</option>
                    <option value="contacted" className="bg-slate-900 text-amber-400">🟡 انتظار الرد</option>
                    <option value="pending" className="bg-slate-900 text-slate-400">⚪ لم يتواصل</option>
                  </select>
                </div>

                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="ALL">جميع المواد ({availableSubjects.length})</option>
                  {availableSubjects.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>

                <div className="relative min-w-[200px]">
                  <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث بالمدرس، الكود، الهاتف..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-1.5 pl-3 pr-8 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-2.5 top-2 text-slate-400 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/50 text-slate-400 font-bold">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3 w-20">الكود</th>
                    <th className="py-3 px-4">اسم المدرس</th>
                    <th className="py-3 px-3 text-center">المرحلة</th>
                    <th className="py-3 px-3 text-center">المادة</th>
                    <th className="py-3 px-4 text-center">حالة المتابعة</th>
                    <th className="py-3 px-3 text-center">الريلز المسجلة</th>
                    <th className="py-3 px-3 text-center">آخر تواصل</th>
                    <th className="py-3 px-4 text-center">الهاتف والتواصل</th>
                    <th className="py-3 px-4 text-center">ملف المتابعة (DOC)</th>
                    <th className="py-3 px-3 text-center w-36">تقرير وتصدير</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-500">
                        لا توجد نتائج تطابق خيارات البحث والفلترة.
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map((item, index) => {
                      const isSelected = item.id === selectedTeacherId;
                      const statusConf = STATUS_CONFIG[item.status || 'pending'] || STATUS_CONFIG.pending;
                      const StatusIcon = statusConf.icon;
                      const hasDoc = item.followUpUrl && item.followUpUrl.trim();

                      return (
                        <tr 
                          key={item.id} 
                          onClick={() => handleSelectTeacher(item.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-emerald-950/40 border-r-4 border-r-emerald-500' 
                              : 'hover:bg-slate-900/60'
                          }`}
                        >
                          <td className="py-3 px-3 text-center text-slate-500 font-mono">{index + 1}</td>
                          
                          {/* Code */}
                          <td className="py-3 px-3 font-mono font-bold">
                            <span className="rounded bg-slate-900 border border-slate-700/60 px-1.5 py-0.5 text-cyan-400">
                              {item.code || '---'}
                            </span>
                          </td>

                          {/* Teacher Name */}
                          <td className="py-3 px-4 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span className={`h-7 w-7 rounded-lg flex items-center justify-center font-extrabold text-[11px] shrink-0 border ${
                                isSelected ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-800 text-slate-300 border-slate-700/40'
                              }`}>
                                {item.teacher ? item.teacher.substring(0, 2).toUpperCase() : '??'}
                              </span>
                              <div>
                                <span className={isSelected ? 'text-emerald-300 font-extrabold' : ''}>{item.teacher}</span>
                                {item.status === 'refused' && item.refusalReason && (
                                  <p className="text-[10px] text-rose-400 mt-0.5 font-normal">
                                    سبب الرفض: {item.refusalReason}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Stage */}
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                              item.stage === 'SENIOR'
                                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                : item.stage === 'MIDDLE'
                                ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            }`}>
                              {item.stage === 'SENIOR' ? 'ثانوي' : item.stage === 'MIDDLE' ? 'إعدادي' : 'ابتدائي'}
                            </span>
                          </td>

                          {/* Subject */}
                          <td className="py-3 px-3 text-center">
                            <span className="rounded-lg bg-slate-900 border border-slate-800 px-2 py-0.5 text-[11px] text-slate-300 font-medium">
                              {item.subject || '---'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-block relative">
                              <select
                                value={item.status || 'pending'}
                                onChange={(e) => handleQuickStatusChange(item.id, e.target.value as FollowUpStatus)}
                                className={`rounded-xl border px-2.5 py-1 text-xs font-bold cursor-pointer appearance-none pl-7 pr-3 transition-all ${statusConf.badgeBg} ${statusConf.badgeBorder} ${statusConf.badgeText} focus:outline-none`}
                              >
                                <option value="recorded" className="bg-slate-900 text-emerald-400">🟢 تم التسجيل</option>
                                <option value="responsive" className="bg-slate-900 text-cyan-400">🔵 مستجيب</option>
                                <option value="refused" className="bg-slate-900 text-rose-400">🔴 غير متقبل</option>
                                <option value="contacted" className="bg-slate-900 text-amber-400">🟡 انتظار الرد</option>
                                <option value="pending" className="bg-slate-900 text-slate-400">⚪ لم يتواصل</option>
                              </select>
                              <StatusIcon className={`absolute left-2 top-2 h-3.5 w-3.5 pointer-events-none ${statusConf.badgeText}`} />
                            </div>
                          </td>

                          {/* Reels Count */}
                          <td className="py-3 px-3 text-center font-mono font-bold text-emerald-400">
                            {item.status === 'recorded' ? (item.reelsCount || 0) : '---'}
                          </td>

                          {/* Last Contact */}
                          <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-400">
                            {item.lastContactDate || '---'}
                          </td>

                          {/* Phone (EXACT MATCH TO media_1791203544444.png: Copy on left, Green Pill with editable phone + WhatsApp icon) */}
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            {item.phone ? (
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Copy Button on the Left */}
                                <button
                                  onClick={() => handleCopy(item.phone, `phone-${item.id}`, 'رقم الهاتف')}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                                  title="نسخ رقم الهاتف"
                                >
                                  {copiedId === `phone-${item.id}` ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>

                                {/* Phone Number in its own pill (clickable to edit) */}
                                <span
                                  onClick={() => {
                                    const newPhone = window.prompt(`تعديل رقم هاتف (${item.teacher}):`, item.phone);
                                    if (newPhone !== null && newPhone.trim() !== item.phone) {
                                      handleUpdateTeacherPhone(item.id, newPhone.trim());
                                    }
                                  }}
                                  className="dir-ltr font-mono text-xs text-emerald-400 font-bold hover:underline cursor-pointer rounded-xl border border-emerald-500/80 bg-emerald-950/20 px-2.5 py-1 shadow-sm hover:bg-emerald-950/40 hover:border-emerald-400 transition-all"
                                  title="اضغط لتعديل رقم الهاتف"
                                >
                                  {item.phone}
                                </span>

                                {/* WhatsApp in its OWN separate icon button */}
                                <a
                                  href={`https://wa.me/2${item.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`السلام عليكم يا أ/ ${item.teacher}، بخصوص ريلز الخطة لمادة ${item.subject}`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-xl border border-emerald-500/80 bg-emerald-950/20 p-1.5 text-emerald-400 hover:bg-emerald-900/40 hover:border-emerald-400 transition-all flex items-center justify-center shadow-sm"
                                  title="فتح محادثة واتساب"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  const newPhone = window.prompt(`إدخال رقم هاتف للمدرس (${item.teacher}):`, '');
                                  if (newPhone && newPhone.trim()) {
                                    handleUpdateTeacherPhone(item.id, newPhone.trim());
                                  }
                                }}
                                className="text-slate-500 hover:text-emerald-400 text-xs hover:underline font-mono"
                                title="اضغط لإضافة رقم هاتف"
                              >
                                غير متوفر
                              </button>
                            )}
                          </td>

                          {/* Google Doc */}
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            {hasDoc ? (
                              <a
                                href={item.followUpUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-xl bg-blue-600/20 border border-blue-500/30 px-2.5 py-1 text-xs font-bold text-blue-300 hover:bg-blue-600/30 hover:text-white transition-all shadow-sm"
                              >
                                <FileText className="h-3.5 w-3.5 text-blue-400" />
                                <span>المستند</span>
                                <ExternalLink className="h-3 w-3 opacity-70" />
                              </a>
                            ) : (
                              <span className="text-slate-600 text-xs">---</span>
                            )}
                          </td>

                          {/* Report & Template buttons */}
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setExportMenuTeacher(item)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold text-[11px] border border-emerald-500/30 transition-all shadow-sm active:scale-95"
                                title="تصدير تقرير المدرس (Excel / PDF / CSV)"
                              >
                                <Download className="h-3 w-3" />
                                <span>تقرير</span>
                              </button>

                              <button
                                onClick={() => handleSelectTeacher(item.id)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                                }`}
                                title="عرض وتعديل تمبلت المدرس"
                              >
                                {isSelected ? 'المحدد ✓' : 'التمبلت'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: COMPREHENSIVE STATISTICS & ANALYTICS DASHBOARD */}
      {/* ========================================================================= */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">

          {/* 1. TOP STATS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold">إجمالي المدرسين</span>
                <GraduationCap className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-white">{stats.total}</div>
              <div className="text-[11px] text-slate-400 mt-1">عبر المراحل الثلاث</div>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between text-emerald-400 mb-2">
                <span className="text-xs font-bold">تم التسجيل / التصوير</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-400">{stats.recordedCount}</span>
                <span className="text-xs text-emerald-400/80 font-bold">
                  ({Math.round((stats.recordedCount / stats.total) * 100)}%)
                </span>
              </div>
              <div className="text-[11px] text-emerald-300/80 mt-1 font-bold">
                إجمالي {stats.totalReels} ريل مسجل
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between text-cyan-400 mb-2">
                <span className="text-xs font-bold">مستجيب للتصوير</span>
                <ThumbsUp className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-cyan-400">{stats.responsiveCount}</span>
                <span className="text-xs text-cyan-400/80 font-bold">
                  ({Math.round((stats.responsiveCount / stats.total) * 100)}%)
                </span>
              </div>
              <div className="text-[11px] text-cyan-300/80 mt-1">جاهز لتحديد مواعيد</div>
            </div>

            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between text-rose-400 mb-2">
                <span className="text-xs font-bold">غير متقبل / رافض</span>
                <XCircle className="h-4 w-4 text-rose-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-400">{stats.refusedCount}</span>
                <span className="text-xs text-rose-400/80 font-bold">
                  ({Math.round((stats.refusedCount / stats.total) * 100)}%)
                </span>
              </div>
              <div className="text-[11px] text-rose-300/80 mt-1">يتطلب تدخلاً إدارياً</div>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between text-amber-400 mb-2">
                <span className="text-xs font-bold">في انتظار الرد</span>
                <Clock className="h-4 w-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-400">{stats.contactedCount}</span>
                <span className="text-xs text-amber-400/80 font-bold">
                  ({Math.round((stats.contactedCount / stats.total) * 100)}%)
                </span>
              </div>
              <div className="text-[11px] text-amber-300/80 mt-1">تمت مراسلتهم</div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold">لم يتواصل بعد</span>
                <HelpCircle className="h-4 w-4 text-slate-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-300">{stats.pendingCount}</span>
                <span className="text-xs text-slate-400 font-bold">
                  ({Math.round((stats.pendingCount / stats.total) * 100)}%)
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">في خطة التواصل</div>
            </div>
          </div>

          {/* 2. OVERALL ACCEPTANCE RATE & STATUS DISTRIBUTION BAR */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                  <span>معدل الاستجابة والقبول العام للتصوير</span>
                </h3>
                <p className="text-xs text-slate-400">
                  نسبة المدرسين المتقبلين لفكرة تصوير الريلز مقارنة بغير المتقبلين
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-left font-mono">
                  <span className="text-2xl font-black text-emerald-400">{stats.acceptanceRate}%</span>
                  <span className="text-xs text-slate-400 mr-1">نسبة القبول</span>
                </div>
              </div>
            </div>

            <div className="h-5 w-full rounded-full bg-slate-800 overflow-hidden flex p-0.5 border border-slate-700/60">
              <div 
                style={{ width: `${(stats.recordedCount / stats.total) * 100}%` }}
                className="bg-emerald-500 transition-all duration-500 rounded-r-full"
                title={`تم التسجيل: ${stats.recordedCount}`}
              />
              <div 
                style={{ width: `${(stats.responsiveCount / stats.total) * 100}%` }}
                className="bg-cyan-500 transition-all duration-500"
                title={`مستجيب للتصوير: ${stats.responsiveCount}`}
              />
              <div 
                style={{ width: `${(stats.contactedCount / stats.total) * 100}%` }}
                className="bg-amber-500 transition-all duration-500"
                title={`في انتظار الرد: ${stats.contactedCount}`}
              />
              <div 
                style={{ width: `${(stats.refusedCount / stats.total) * 100}%` }}
                className="bg-rose-500 transition-all duration-500"
                title={`غير متقبل: ${stats.refusedCount}`}
              />
              <div 
                style={{ width: `${(stats.pendingCount / stats.total) * 100}%` }}
                className="bg-slate-600 transition-all duration-500 rounded-l-full"
                title={`لم يتواصل: ${stats.pendingCount}`}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-emerald-500" />
                <span className="text-slate-300">تم التسجيل ({stats.recordedCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-cyan-500" />
                <span className="text-slate-300">مستجيب ({stats.responsiveCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-amber-500" />
                <span className="text-slate-300">في انتظار الرد ({stats.contactedCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-rose-500" />
                <span className="text-slate-300">غير متقبل / رافض ({stats.refusedCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-slate-600" />
                <span className="text-slate-300">لم يتواصل ({stats.pendingCount})</span>
              </div>
            </div>
          </div>

          {/* 3. STAGES BREAKDOWN COMPARISON */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* SENIOR */}
            <div className="rounded-2xl border border-blue-500/25 bg-slate-900/60 p-5 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-blue-500/20 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 font-bold text-xs">
                    33
                  </span>
                  <div>
                    <h4 className="font-bold text-white text-sm">مرحلة ثانوي (Senior)</h4>
                    <span className="text-[11px] text-slate-400">33 مدرساً</span>
                  </div>
                </div>
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-bold text-blue-300">
                  {stats.byStage.SENIOR.total > 0 ? Math.round(((stats.byStage.SENIOR.recorded + stats.byStage.SENIOR.responsive) / stats.byStage.SENIOR.total) * 100) : 0}% قبول
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-emerald-400 font-bold">🟢 تم التسجيل</span>
                  <span className="font-mono text-white font-bold">{stats.byStage.SENIOR.recorded}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-cyan-400 font-bold">🔵 مستجيب للتصوير</span>
                  <span className="font-mono text-white font-bold">{stats.byStage.SENIOR.responsive}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-rose-400 font-bold">🔴 غير متقبل / رافض</span>
                  <span className="font-mono text-white font-bold">{stats.byStage.SENIOR.refused}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-amber-400 font-bold">🟡 في انتظار الرد</span>
                  <span className="font-mono text-white font-bold">{stats.byStage.SENIOR.contacted}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400 font-bold">⚪ لم يتواصل بعد</span>
                  <span className="font-mono text-white font-bold">{stats.byStage.SENIOR.pending}</span>
                </div>
              </div>
            </div>

            {/* MIDDLE */}
            <div className="rounded-2xl border border-purple-500/25 bg-slate-900/60 p-5 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-purple-500/20 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 font-bold text-xs">
                    23
                  </span>
                  <div>
                    <h4 className="font-bold text-white text-sm">مرحلة إعدادي (Middle)</h4>
                    <span className="text-[11px] text-slate-400">23 مدرساً</span>
                  </div>
                </div>
                <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-bold text-purple-300">
                  {stats.byStage.MIDDLE.total > 0 ? Math.round(((stats.byStage.MIDDLE.recorded + stats.byStage.MIDDLE.responsive) / stats.byStage.MIDDLE.total) * 100) : 0}% قبول
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-emerald-400 font-bold">🟢 تم التسجيل</span>
                  <span className="font-mono text-white font-bold">{stats.byStage.MIDDLE.recorded}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-cyan-400 font-bold">🔵 مستجيب للتصوير</span>
                  <span className="font-mono text-white font-bold">{stats.byStage.MIDDLE.responsive}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-rose-400 font-bold">🔴 غير متقبل / رافض</span>
                  <span className="font-mono text-white font-bold">{stats.byStage.MIDDLE.refused}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-amber-400 font-bold">🟡 في انتظار الرد</span>
                  <span className="font-mono text-white font-bold">{stats.byStage.MIDDLE.contacted}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400 font-bold">⚪ لم يتواصل بعد</span>
                  <span className="font-mono text-white font-bold">{stats.byStage.MIDDLE.pending}</span>
                </div>
              </div>
            </div>

            {/* JUNIOR */}
            <div className="rounded-2xl border border-amber-500/25 bg-slate-900/60 p-5 shadow-lg backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 font-bold text-xs">
                    18
                  </span>
                  <div>
                    <h4 className="font-bold text-white text-sm">مرحلة ابتدائي (Junior)</h4>
                    <span className="text-[11px] text-slate-400">18 مدرساً</span>
                  </div>
                </div>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300">
                  {stats.byStage.JUNIOR.total > 0 ? Math.round(((stats.byStage.JUNIOR.recorded + stats.byStage.JUNIOR.responsive) / stats.byStage.JUNIOR.total) * 100) : 0}% قبول
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-emerald-400 font-bold">🟢 تم التسجيل</span>
                  <span className="font-mono text-white font-bold">{stats.byStage.JUNIOR.recorded}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-cyan-400 font-bold">🔵 مستجيب للتصوير</span>
                  <span className="font-mono text-white font-bold">{stats.byStage.JUNIOR.responsive}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-rose-400 font-bold">🔴 غير متقبل / رافض</span>
                  <span className="font-mono text-white font-bold">{stats.byStage.JUNIOR.refused}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-amber-400 font-bold">🟡 في انتظار الرد</span>
                  <span className="font-mono text-white font-bold">{stats.byStage.JUNIOR.contacted}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400 font-bold">⚪ لم يتواصل بعد</span>
                  <span className="font-mono text-white font-bold">{stats.byStage.JUNIOR.pending}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. CRITICAL ACTION LIST: REFUSED TEACHERS & REASONS */}
          <div className="rounded-2xl border border-rose-500/30 bg-slate-950/90 p-5 shadow-xl backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-3 border-b border-rose-500/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>قائمة المدرسين غير المتقبلين لفكرة التصوير</span>
                    <span className="rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 text-xs font-bold">
                      {stats.refusedTeachers.length} مدرسين
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    مدرسون رفضوا أو لم يتقبلوا فكرة التصوير مع أسباب الرفض لمتابعتهم إدارياً.
                  </p>
                </div>
              </div>
            </div>

            {stats.refusedTeachers.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/60 mx-auto mb-2" />
                <span>ممتاز! لا يوجد حالياً أي مدرس مسجل كـ "غير متقبل" للتصوير.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-bold">
                      <th className="py-2.5 px-3">الكود</th>
                      <th className="py-2.5 px-4">اسم المدرس</th>
                      <th className="py-2.5 px-3">المرحلة والمادة</th>
                      <th className="py-2.5 px-4 text-rose-400">سبب عدم التقبل / الرفض</th>
                      <th className="py-2.5 px-4 text-center">التواصل الفوري</th>
                      <th className="py-2.5 px-3 text-center">فتح التمبلت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {stats.refusedTeachers.map(t => (
                      <tr key={t.id} className="hover:bg-rose-950/20 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-cyan-400">{t.code || '---'}</td>
                        <td className="py-3 px-4 font-bold text-white">{t.teacher}</td>
                        <td className="py-3 px-3">
                          <span className="text-[11px] text-slate-300">
                            {t.stage === 'SENIOR' ? 'ثانوي' : t.stage === 'MIDDLE' ? 'إعدادي' : 'ابتدائي'} - {t.subject}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-rose-300 font-medium">
                          {t.refusalReason ? (
                            <div className="bg-rose-950/40 border border-rose-900/40 rounded-lg p-2 text-xs leading-relaxed">
                              {t.refusalReason}
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">لم يُسجل سبب محدد بعد</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {t.phone ? (
                            <div className="inline-flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleCopy(t.phone, `refusal-phone-${t.id}`, 'رقم الهاتف')}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                                title="نسخ رقم الهاتف"
                              >
                                {copiedId === `refusal-phone-${t.id}` ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>

                              {/* Phone Number in its own pill (clickable to edit) */}
                              <span
                                onClick={() => {
                                  const newPhone = window.prompt(`تعديل رقم هاتف (${t.teacher}):`, t.phone);
                                  if (newPhone !== null && newPhone.trim() !== t.phone) {
                                    handleUpdateTeacherPhone(t.id, newPhone.trim());
                                  }
                                }}
                                className="dir-ltr font-mono text-xs text-emerald-400 font-bold hover:underline cursor-pointer rounded-xl border border-emerald-500/80 bg-emerald-950/20 px-2.5 py-1 shadow-sm hover:bg-emerald-950/40 hover:border-emerald-400 transition-all"
                                title="اضغط لتعديل رقم الهاتف"
                              >
                                {t.phone}
                              </span>

                              {/* WhatsApp in its OWN separate icon button */}
                              <a
                                href={`https://wa.me/2${t.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`أهلاً يا أ/ ${t.teacher}، حابين نتناقش مع حضرتك بخصوص تصوير الريلز وتسهيل كل التفاصيل لك.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-xl border border-emerald-500/80 bg-emerald-950/20 p-1.5 text-emerald-400 hover:bg-emerald-900/40 hover:border-emerald-400 transition-all flex items-center justify-center shadow-sm"
                                title="محادثة واتساب"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs">لا يوجد هاتف</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedTeacherId(t.id);
                              setActiveSubTab('directory');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-colors"
                          >
                            فتح التمبلت
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 5. READY TO SHOOT (RESPONSIVE TEACHERS) */}
          <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/90 p-5 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-cyan-500/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <ThumbsUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>المدرسون المستجيبون الجاهزون للتصوير (Ready to Shoot)</span>
                    <span className="rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 text-xs font-bold">
                      {stats.responsiveTeachers.length} مدرس
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    مدرسون متقبلون للفكرة وجاهزون لتحديد مواعيد التصوير في الاستوديو.
                  </p>
                </div>
              </div>
            </div>

            {stats.responsiveTeachers.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                لا يوجد حالياً مدرسين في حالة "مستجيب للتصوير".
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {stats.responsiveTeachers.map(t => (
                  <div key={t.id} className="rounded-xl border border-cyan-500/20 bg-slate-900/60 p-3 hover:border-cyan-500/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                        {t.code || '---'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {t.stage === 'SENIOR' ? 'ثانوي' : t.stage === 'MIDDLE' ? 'إعدادي' : 'ابتدائي'}
                      </span>
                    </div>
                    <div className="font-bold text-white text-sm mt-1">{t.teacher}</div>
                    <div className="text-xs text-slate-400 mt-0.5">المادة: <span className="text-cyan-300 font-bold">{t.subject}</span></div>
                    
                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                      {t.phone ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleCopy(t.phone, `ready-phone-${t.id}`, 'رقم الهاتف')}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                            title="نسخ رقم الهاتف"
                          >
                            {copiedId === `ready-phone-${t.id}` ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>

                          {/* Phone Number in its own pill (clickable to edit) */}
                          <span
                            onClick={() => {
                              const newPhone = window.prompt(`تعديل رقم هاتف (${t.teacher}):`, t.phone);
                              if (newPhone !== null && newPhone.trim() !== t.phone) {
                                handleUpdateTeacherPhone(t.id, newPhone.trim());
                              }
                            }}
                            className="dir-ltr font-mono text-xs text-emerald-400 font-bold hover:underline cursor-pointer rounded-xl border border-emerald-500/80 bg-emerald-950/20 px-2 py-0.5 shadow-sm hover:bg-emerald-950/40 hover:border-emerald-400 transition-all"
                            title="اضغط لتعديل رقم الهاتف"
                          >
                            {t.phone}
                          </span>

                          {/* WhatsApp in its OWN separate icon button */}
                          <a
                            href={`https://wa.me/2${t.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`أهلاً يا أ/ ${t.teacher}، جاهزين نحدد موعد تصوير ريلز ${t.subject}؟`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-xl border border-emerald-500/80 bg-emerald-950/20 p-1 text-emerald-400 hover:bg-emerald-900/40 hover:border-emerald-400 transition-all flex items-center justify-center shadow-sm"
                            title="محادثة واتساب"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600">لا يوجد هاتف</span>
                      )}

                      <button
                        onClick={() => {
                          setSelectedTeacherId(t.id);
                          setActiveSubTab('directory');
                        }}
                        className="px-2 py-1 rounded bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-[11px] font-bold border border-cyan-500/30"
                      >
                        فتح التمبلت
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 6. SUBJECTS PERFORMANCE LIST */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-400" />
              <span>تغطية المواد الدراسية ونسب التسجيل والرفض</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              إحصائيات تفصيلية لكل مادة: عدد المدرسين، كم سجل، كم استجاب، وكم رفض.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-bold">
                    <th className="py-2.5 px-4">المادة</th>
                    <th className="py-2.5 px-3 text-center">إجمالي المدرسين</th>
                    <th className="py-2.5 px-3 text-center text-emerald-400">تم التسجيل</th>
                    <th className="py-2.5 px-3 text-center text-cyan-400">مستجيب للتصوير</th>
                    <th className="py-2.5 px-3 text-center text-rose-400">غير متقبل / رافض</th>
                    <th className="py-2.5 px-4 text-center">نسبة الاستجابة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stats.subjectStatsList.map(s => {
                    const respRate = s.total > 0 ? Math.round(((s.recorded + s.responsive) / s.total) * 100) : 0;
                    return (
                      <tr key={s.subject} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">{s.subject}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">{s.total}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-emerald-400">{s.recorded}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-cyan-400">{s.responsive}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-rose-400">{s.refused}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-slate-800 overflow-hidden">
                              <div style={{ width: `${respRate}%` }} className="h-full bg-cyan-500 rounded-full" />
                            </div>
                            <span className="font-mono font-bold text-cyan-400 text-xs">{respRate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GOOGLE DOCS AUTOMATIC SYNC SETUP MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isDocsModalOpen && (
          <div 
            onClick={() => setIsDocsModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-blue-500/40 bg-slate-950 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-blue-500/20 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                    <FileEdit className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">المزامنة التلقائية مع مستندات Google Docs</h3>
                    <p className="text-xs text-slate-400">
                      تعبئة البيانات داخل جدول Google Doc لكل مدرس بشكل لحظي فور الضغط على حفظ.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDocsModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Instructions Steps */}
              <div className="space-y-3 text-xs text-slate-300">
                <div className="rounded-xl bg-blue-950/30 border border-blue-500/20 p-3.5 space-y-2">
                  <div className="font-bold text-blue-300 flex items-center gap-1.5">
                    <span>خطوات التفعيل في دقيقة واحدة:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pr-1 leading-relaxed">
                    <li>افتح حساب Google الذي يملك المستندات، واذهب إلى <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline font-bold">script.google.com</a> أو افتح Google Drive واختر: جديد &gt; المزيد &gt; Google Apps Script.</li>
                    <li>احذف أي كود موجود والصق الكود الجاهز بالأسفل (اضغط زر "نسخ الكود").</li>
                    <li>اضغط من أعلى الصفحة على **نشر (Deploy)** &gt; **New deployment** &gt; اختر نوع **Web app**.</li>
                    <li>اجعل خيار **Who has access** هو: **Anyone**. ثم اضغط **Deploy**.</li>
                    <li>انسخ **رابط Web app URL** الناتج وضعه في المربع بالأسفل واضغط حفظ!</li>
                  </ol>
                </div>

                {/* Code Snippet Box */}
                <div className="relative">
                  <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-t-xl border-t border-x border-slate-800">
                    <span className="font-mono text-[11px] text-slate-400">Code.gs</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(appsScriptCodeSnippet);
                        if (toast) toast.success('تم نسخ كود Google Apps Script بنجاح!');
                      }}
                      className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-bold"
                    >
                      <Copy className="h-3 w-3" />
                      <span>نسخ الكود بالكامل</span>
                    </button>
                  </div>
                  <pre className="max-h-40 overflow-y-auto bg-slate-950 p-3 rounded-b-xl border border-slate-800 text-[10px] text-emerald-300 font-mono dir-ltr text-left">
                    {appsScriptCodeSnippet}
                  </pre>
                </div>

                {/* Web App URL Input */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-white mb-1.5">
                    رابط Google Apps Script Web App URL:
                  </label>
                  <input
                    type="url"
                    value={docsScriptUrl}
                    onChange={(e) => setDocsScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none font-mono dir-ltr text-right"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    بمجرد حفظ هذا الرابط، أي صف متابعة تضيفه لأي مدرس سيُكتب مباشرة داخل الجدول في مستند الـ Google Doc الخاص به!
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                {docsScriptUrl && (
                  <button
                    onClick={() => {
                      setDocsScriptUrl('');
                      if (toast) toast.success('تم إلغاء تفعيل المزامنة المباشرة');
                    }}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    إلغاء الربط
                  </button>
                )}

                <div className="flex items-center gap-2 mr-auto">
                  <button
                    onClick={() => setIsDocsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    إغلاق
                  </button>
                  <button
                    onClick={() => {
                      setIsDocsModalOpen(false);
                      if (toast) toast.success('تم حفظ إعدادات مزامنة Google Docs بنجاح!');
                    }}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95"
                  >
                    <Save className="h-4 w-4" />
                    <span>حفظ وتفعيل</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* EXPORT OPTIONS MODAL (For Selected Teacher) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {exportMenuTeacher && (
          <div 
            onClick={() => setExportMenuTeacher(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-emerald-500/40 bg-slate-950 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                    <Download className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">تصدير تقرير متابعة المدرس</h3>
                    <p className="text-xs text-slate-400 font-bold">
                      {exportMenuTeacher.teacher} ({exportMenuTeacher.code})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setExportMenuTeacher(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-slate-300 mb-4">
                اختر الصيغة التي تريد تصدير التقرير بها (بيانات المدرس وسجل متابعة التواصل):
              </p>

              <div className="space-y-3">
                {/* 1. EXCEL */}
                <button
                  onClick={() => {
                    handleExportTeacherExcel(exportMenuTeacher);
                    setExportMenuTeacher(null);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-950/60 transition-all text-right group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-600/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs group-hover:text-emerald-300">
                        تصدير كملف Excel (.xlsx)
                      </div>
                      <div className="text-[11px] text-slate-400">
                        شيت كامل ببيانات المدرس وجدول سجلات التواصل
                      </div>
                    </div>
                  </div>
                  <Download className="h-4 w-4 text-emerald-400" />
                </button>

                {/* 2. PDF */}
                <button
                  onClick={() => {
                    handleExportTeacherPDF(exportMenuTeacher);
                    setExportMenuTeacher(null);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-rose-500/40 bg-rose-950/30 hover:bg-rose-950/60 transition-all text-right group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-rose-600/20 flex items-center justify-center text-rose-400 border border-rose-500/30">
                      <Printer className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs group-hover:text-rose-300">
                        طباعة وحفظ كتقرير PDF (.pdf)
                      </div>
                      <div className="text-[11px] text-slate-400">
                        تقرير رسمي مجهز للطباعة أو الحفظ كـ PDF
                      </div>
                    </div>
                  </div>
                  <Download className="h-4 w-4 text-rose-400" />
                </button>

                {/* 3. CSV */}
                <button
                  onClick={() => {
                    handleExportTeacherCSV(exportMenuTeacher);
                    setExportMenuTeacher(null);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-blue-500/40 bg-blue-950/30 hover:bg-blue-950/60 transition-all text-right group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs group-hover:text-blue-300">
                        تصدير كملف CSV (.csv)
                      </div>
                      <div className="text-[11px] text-slate-400">
                        ملف نصي مفصول بفواصل بترميز UTF-8
                      </div>
                    </div>
                  </div>
                  <Download className="h-4 w-4 text-blue-400" />
                </button>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setExportMenuTeacher(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* IMAGE PREVIEW MODAL (LIGHTBOX FOR PROOF SCREENSHOTS) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {previewImageUrl && (
          <div 
            onClick={() => setPreviewImageUrl(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md cursor-zoom-out"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 p-2 shadow-2xl cursor-default"
            >
              <div className="flex items-center justify-between p-3 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-emerald-400" />
                  <span>معاينة إثبات التواصل</span>
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={previewImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded text-slate-400 hover:text-white"
                    title="فتح الصورة في نافذة جديدة"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => setPreviewImageUrl(null)}
                    className="p-1 rounded text-slate-400 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="overflow-auto max-h-[80vh] p-2 flex items-center justify-center">
                <img 
                  src={previewImageUrl} 
                  alt="إثبات التواصل" 
                  className="max-w-full max-h-[75vh] object-contain rounded-xl"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default TeachersFollowUpView;
