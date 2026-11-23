import React, { useState, useEffect, useRef } from 'react';
import {
  Check, Copy, Bell, FolderOpen, Pencil, AlertCircle, XCircle, HardDrive,
  CheckCircle2, Clock, AlertTriangle, X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, PERMISSIONS } from '../../lib/supabase';
import {
  cleanCodePart,
  computeNextUniqueReelCode,
  resolveAndClaimUniqueCodeFromDb
} from '../../lib/codeGenerator';
import {
  notifyTaskCompleted,
  notifyTaskEditRequested,
  notifyHardDriveRequest,
  notifyHardDriveDecision,
  getUserTelegramChatId
} from '../../lib/telegram';
import { parseDriveLink, parseScriptValue } from '../../lib/dashboardUtils';
import {
  AutofillCell,
  InlineCombobox,
  HistoryInput,
  Chip,
  DatePickerCell
} from '../DashboardUiPrimitives';
import { DocLinksDropdown } from '../DocLinksDropdown';

export const CutsRow = React.memo(({ 
  item, 
  index, 
  onUpdateShootingRow, 
  onToggleEditCheck,
  liveData, 
  optionsLists, 
  autofillDrag, 
  setAutofillDrag, 
  onApplyAutofill, 
  activeCell, 
  setActiveCell,
  toast,
  isSubscribed,
  onToggleSubscribe,
  noteAuthors,
  allReelsCodes,
  sequenceRegistry
}: any) => {
  const [editForm, setEditForm] = useState({
    branch: item.branch || '',
    year: item.year || '',
    creator: item.creator || '',
    type: item.type || '',
    format: item.format || '',
    dataFiles: item.dataFiles || '',
    script: item.script || '',
    creatorNotes: item.creatorNotes || '',
    editorNotes: item.editorNotes || '',
    editor: item.editor || '',
    driveFinal: item.driveFinal || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingDataFiles, setIsEditingDataFiles] = useState(false);
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [isEditingFinal, setIsEditingFinal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [optimisticHardDriveStatus, setOptimisticHardDriveStatus] = useState<string | null | undefined>(undefined);
  const { profile, session } = useAuth();
  const isVideoTeam = profile?.team?.toLowerCase() === 'video';
  const isMarketingTeam = profile?.team?.toLowerCase() === 'marketing' && profile?.role !== 'admin';
  const canModifyDone = (isVideoTeam || profile?.role === 'admin') && !isMarketingTeam;
  const isMarketingUser = isMarketingTeam;
  const [isEditChecked, setIsEditChecked] = useState(Boolean(item.editCheck || item.edit_check));

  useEffect(() => {
    setIsEditChecked(Boolean(item.editCheck || item.edit_check));
  }, [item.editCheck, item.edit_check]);

  useEffect(() => {
    setOptimisticHardDriveStatus(undefined);
  }, [item.hardDriveStatus]);

  const parseCutsLink = (val: string, fallbackText: string) => {
    if (!val) return null;
    let s = String(val).trim();
    
    // Hyperlink formula
    const hyperlinkRegex = /=HYPERLINK\s*\(\s*(['"])(.*?)\1\s*,\s*(['"])(.*?)\3\s*\)/i;
    const formulaMatch = s.match(hyperlinkRegex);
    if (formulaMatch) {
      let url = formulaMatch[2].trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      return {
        url,
        text: formulaMatch[4].trim(),
        isLink: true
      };
    }

    // Hard Drive local delivery exception
    if (s.includes('هارد') || s.toLowerCase().includes('hard')) {
      return {
        url: null,
        text: s,
        isLink: false,
        isHardDrive: true
      };
    }
    
    let url = s;
    const driveIdRegex = /^[a-zA-Z0-9_-]{25,55}$/;
    
    if (url.includes('drive.google.com') || url.includes('docs.google.com') || url.includes('spreadsheets/d/') || url.includes('document/d/') || url.includes('file/d/')) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.startsWith('drive.google.com') || url.startsWith('docs.google.com')) {
          url = 'https://' + url;
        } else if (url.startsWith('www.drive.google.com') || url.startsWith('www.docs.google.com')) {
          url = 'https://' + url;
        } else {
          if (url.startsWith('/')) url = url.substring(1);
          if (url.startsWith('file/d/')) {
            url = 'https://drive.google.com/' + url;
          } else if (url.startsWith('d/')) {
            url = 'https://drive.google.com/file/' + url;
          } else {
            url = 'https://' + url;
          }
        }
      }
      return {
        url,
        text: fallbackText,
        isLink: true
      };
    } else if (driveIdRegex.test(url)) {
      url = `https://drive.google.com/file/d/${url}/view?usp=sharing`;
      return {
        url,
        text: fallbackText,
        isLink: true
      };
    } else if (!url.startsWith('http://') && !url.startsWith('https://') && url.includes('.')) {
      url = 'https://' + url;
      return {
        url,
        text: fallbackText,
        isLink: true
      };
    }
    
    // Plain text
    return {
      url: null,
      text: s,
      isLink: false
    };
  };

  useEffect(() => {
    let localFinal = item.driveFinal || '';
    if (!localFinal) {
      try {
        const raw = localStorage.getItem('cuts_overrides');
        if (raw) {
          const overrides = JSON.parse(raw);
          const code = item.id;
          if (overrides[code] && overrides[code].driveFinal) {
            localFinal = overrides[code].driveFinal;
          }
        }
      } catch {}
    }

    setEditForm({
      branch: item.branch || '',
      year: item.year || '',
      creator: item.creator || item.extraName || '',
      type: item.type || '',
      format: item.format || '',
      dataFiles: item.dataFiles || item.driveRaw || '',
      script: item.script || '',
      creatorNotes: item.creatorNotes || item.creator_notes || item.notes || '',
      editorNotes: item.editorNotes || item.editor_notes || '',
      editor: item.editor || item.editorCol || '',
      driveFinal: localFinal
    });
  }, [item]);

  const saveCutsOverrideLocally = (itemCode: string, fieldName: string, value: any) => {
    try {
      const raw = localStorage.getItem('cuts_overrides');
      const overrides = raw ? JSON.parse(raw) : {};
      overrides[itemCode] = overrides[itemCode] || {};
      overrides[itemCode][fieldName] = value;
      localStorage.setItem('cuts_overrides', JSON.stringify(overrides));

      // Also persist directly to Supabase DB via task-metadata endpoint for multi-device persistence!
      const token = session?.access_token || profile?.id;
      if (token) {
        fetch('/api/task-metadata', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ field: 'cuts_overrides', metadata: overrides })
        }).catch(() => {});
      }
    } catch {}
  };

  const handleFieldChange = async (fieldName: string, value: string, time?: string, author?: string) => {
    const isVideoUser = profile?.team?.toLowerCase() === 'video' && profile?.role !== 'admin' && profile?.role !== 'manager';
    if (fieldName === 'editorNotes' && isMarketingUser) {
      const msg = "غير مسموح لتيم الماركتينج بتعديل أو مسح ملاحظات المحرر 🎬🔒 (خاصة بتيم الفيديو فقط)";
      if (toast && toast.error) toast.error(msg); else alert(msg);
      return;
    }
    if (fieldName === 'creatorNotes' && isVideoUser) {
      const msg = "غير مسموح لتيم الفيديو بتعديل أو مسح ملاحظات المبتكر 📝🔒 (خاصة بتيم الماركتينج فقط)";
      if (toast && toast.error) toast.error(msg); else alert(msg);
      return;
    }
    if (fieldName === 'driveFinal' && isMarketingUser) {
      if (toast && toast.error) {
        toast.error("غير مسموح لتيم الماركتينج بتعديل أو إزالة رابط الفاينال 🎬🔒 (خاص بتيم الفيديو)");
      } else {
        alert("غير مسموح لتيم الماركتينج بتعديل أو إزالة رابط الفاينال 🎬🔒 (خاص بتيم الفيديو)");
      }
      return;
    }

    const updatedForm = { ...editForm, [fieldName]: value };
    setEditForm(updatedForm);
    saveCutsOverrideLocally(item.id, fieldName, value);

    if (!onUpdateShootingRow) return;
    setIsSaving(true);

    const currentCutCode = item.code || item.id || '';
    let targetCode = currentCutCode;
    if (fieldName === 'year' || fieldName === 'creator') {
      const nextYear = fieldName === 'year' ? value : updatedForm.year;
      const nextCreator = fieldName === 'creator' ? value : updatedForm.creator;
      const cleanY = cleanCodePart(nextYear);
      const cleanC = cleanCodePart(nextCreator);
      const curY = cleanCodePart(item.year);
      const curC = cleanCodePart(item.creator);

      if (cleanY !== curY || cleanC !== curC) {
        let keptSameSeq = '';
        if (cleanC === curC) {
          const seqTailMatch = cleanCodePart(currentCutCode).match(/-(\d+(?:\s*v\d+)?)$/i);
          if (seqTailMatch) {
            const candidate = `${cleanY}-cut-${cleanC}-${seqTailMatch[1]}`.toLowerCase();
            const knownSet: Set<string> = allReelsCodes instanceof Set ? allReelsCodes : new Set(allReelsCodes || []);
            if (!knownSet.has(candidate) || candidate === cleanCodePart(currentCutCode)) {
              keptSameSeq = candidate;
            }
          }
        }
        targetCode = keptSameSeq || computeNextUniqueReelCode({
          year: nextYear,
          extraName: nextCreator,
          isCut: true,
          excludeCode: currentCutCode,
          allKnownCodes: allReelsCodes || [],
          sequenceRegistry,
        }).code;
      }
    }

    // Done status logic: if fieldName is 'driveFinal', automatically set done=true when valid link is added, or uncheck done if invalid
    let nextDoneStatus = item.done;
    let nextHardDriveStatus: string | null | undefined = undefined;
    const isPriv = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'supervisor';

    if (fieldName === 'driveFinal') {
      const val = String(value || '').trim();
      const driveIdRegex = /^[a-zA-Z0-9_-]{25,55}$/;
      const isHardDrive = val.includes('هارد') || val.toLowerCase().includes('hard');
      const isValidLink = Boolean(
        val && (
          isHardDrive ||
          val.toLowerCase() === 'تم' || 
          val.includes('http://') || 
          val.includes('https://') || 
          val.includes('drive.google.com') || 
          val.includes('docs.google.com') || 
          val.includes('mega.nz') ||
          val.includes('dropbox.com') ||
          driveIdRegex.test(val) ||
          (val.length >= 10 && (val.includes('.') && (val.includes('/') || val.includes(':'))))
        )
      );
      if (isValidLink) {
        if (isHardDrive && !isPriv) {
          // Non-privileged: pending request, CANNOT be marked Done yet!
          nextDoneStatus = false;
          saveCutsOverrideLocally(item.id, 'done', false);
          nextHardDriveStatus = 'pending';
          setOptimisticHardDriveStatus('pending');
          if (toast && toast.info) {
            toast.info('تم إرسال طلب التسليم على الهارد! ⏳💾 — لن تُعتبر المهمة مكتملة إلا بعد موافقة المشرف');
          }
          // Notify admins
          const taskCode = item.code || item.id || '';
          getUserTelegramChatId(profile?.id, profile?.name).then(async () => {
            const adminChatId = await getUserTelegramChatId(undefined, 'admin') || await getUserTelegramChatId(undefined, 'eslam');
            if (adminChatId) {
              notifyHardDriveRequest({
                chatId: adminChatId,
                taskCode,
                taskTitle: item.script || taskCode,
                sourceSheet: 'Cuts',
                editorName: profile?.name || item.editor || 'غير محدد'
              }).catch(console.error);
            }
          }).catch(console.error);
        } else if (isHardDrive && isPriv) {
          // Privileged: direct done approved
          nextDoneStatus = true;
          saveCutsOverrideLocally(item.id, 'done', true);
          nextHardDriveStatus = 'approved';
          setOptimisticHardDriveStatus('approved');
          if (toast && toast.success) {
            toast.success('تم اعتماد التسليم على الهارد وتحديد المهمة كـ Done! 💾✅');
          }
        } else {
          // Valid Drive Link: direct done
          nextDoneStatus = true;
          saveCutsOverrideLocally(item.id, 'done', true);
          nextHardDriveStatus = null;
          setOptimisticHardDriveStatus(null);
          if (toast && toast.success) {
            toast.success('تم حفظ رابط الفاينال وتحديد المهمة كـ Done تلقائياً! 🎉');
          }
        }
      } else {
        nextDoneStatus = false;
        saveCutsOverrideLocally(item.id, 'done', false);
        nextHardDriveStatus = null;
        setOptimisticHardDriveStatus(null);
      }
    }

    const rowData = [
      item.date,
      updatedForm.branch,
      updatedForm.year,
      item.typeCol, // static
      updatedForm.creator,
      targetCode,   // dynamically updated code!
      updatedForm.dataFiles,
      updatedForm.script,
      updatedForm.type,
      updatedForm.format,
      updatedForm.creatorNotes,
      updatedForm.editorNotes,
      item.missingDetails ? 'TRUE' : 'FALSE',
      item.problem ? 'TRUE' : 'FALSE',
      nextDoneStatus ? 'TRUE' : 'FALSE',
      updatedForm.editor,
      updatedForm.driveFinal,
      item.canceled ? 'TRUE' : 'FALSE',
      undefined, // index 18 unused
      undefined, // index 19 unused
      undefined, // index 20 unused
      nextHardDriveStatus // index 21: hard_drive_status
    ];
    const changedFields = [fieldName];
    if (targetCode && targetCode !== currentCutCode) changedFields.push('code');
    if (fieldName === 'driveFinal') {
      changedFields.push('done');
      if (nextHardDriveStatus !== undefined) changedFields.push('hardDriveStatus');
    }
    try {
      await onUpdateShootingRow(item.id, rowData, { fieldName, value, time, author }, changedFields);
    } catch(e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (fieldName: string, currentVal: boolean) => {
    if (!item.id) { alert("لا يمكن تعديل هذا الصف لعدم وجود كود (Code)"); return; }
    if (fieldName === 'done' && !canModifyDone) {
      const msg = currentVal 
        ? "غير مسموح لتيم الماركتينج بإلغاء Done 🔒 (المسموح لك فقط هو طلب تعديل عبر زر EDIT)"
        : "تحديد حالة Done خاص بتيم الفيديو فقط 🎬🔒";
      if (toast && toast.error) {
        toast.error(msg);
      } else {
        alert(msg);
      }
      return;
    }
    if (!onUpdateShootingRow) return;
    setIsSaving(true);
    const newVal = !currentVal;

    // Done status validation
    if (fieldName === 'done' && newVal) {
      const finalVal = String(editForm.driveFinal || '').trim();
      const driveIdRegex = /^[a-zA-Z0-9_-]{25,55}$/;
      const isHardDrive = finalVal.includes('هارد') || finalVal.toLowerCase().includes('hard');
      if (!finalVal || (!isHardDrive && finalVal.toLowerCase() !== 'تم' && !finalVal.includes('http://') && !finalVal.includes('https://') && !finalVal.includes('drive.google.com') && !finalVal.includes('docs.google.com') && !driveIdRegex.test(finalVal))) {
        if (toast && toast.error) {
          toast.error("لا يمكن تحديد المهمة كمكتملة (Done) إلا بعد إضافة رابط المونتاج النهائي!");
        } else {
          alert("لا يمكن تحديد المهمة كمكتملة (Done) إلا بعد إضافة رابط المونتاج النهائي!");
        }
        setIsSaving(false);
        return;
      }
      const isPriv = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'supervisor';
      const curHardStatus = optimisticHardDriveStatus !== undefined ? optimisticHardDriveStatus : (item.hardDriveStatus || null);
      if (isHardDrive && !isPriv && curHardStatus !== 'approved') {
        if (toast && toast.error) {
          toast.error("لا يمكن تحديد المهمة كمكتملة (Done) — طلب التسليم على الهارد ما زال بانتظار موافقة المشرف! ⏳");
        } else {
          alert("لا يمكن تحديد المهمة كمكتملة (Done) — طلب التسليم على الهارد ما زال بانتظار موافقة المشرف! ⏳");
        }
        setIsSaving(false);
        return;
      }
    }
    
    const rowData = [
      item.date,
      editForm.branch,
      editForm.year,
      item.typeCol,
      editForm.creator,
      item.id,
      editForm.dataFiles,
      editForm.script,
      editForm.type,
      editForm.format,
      editForm.creatorNotes,
      editForm.editorNotes,
      fieldName === 'missingDetails' ? (newVal ? 'TRUE' : 'FALSE') : (item.missingDetails ? 'TRUE' : 'FALSE'),
      fieldName === 'problem' ? (newVal ? 'TRUE' : 'FALSE') : (item.problem ? 'TRUE' : 'FALSE'),
      fieldName === 'done' ? (newVal ? 'TRUE' : 'FALSE') : (item.done ? 'TRUE' : 'FALSE'),
      editForm.editor,
      editForm.driveFinal,
      fieldName === 'canceled' ? (newVal ? 'TRUE' : 'FALSE') : (item.canceled ? 'TRUE' : 'FALSE')
    ];
    
    saveCutsOverrideLocally(item.id, fieldName, newVal);
    try {
      await onUpdateShootingRow(item.id, rowData, undefined, [fieldName]);
    } catch(e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle = "w-full bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-center text-white/90 outline-none transition-all focus:bg-[#0b1019] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30";

  const getOverrideVal = (field: string, fallback: boolean) => {
    try {
      const raw = localStorage.getItem('cuts_overrides');
      if (raw) {
        const overrides = JSON.parse(raw);
        if (overrides[item.id] && overrides[item.id][field] !== undefined) {
          return !!overrides[item.id][field];
        }
      }
    } catch {}
    return fallback;
  };

  const isCanceled = getOverrideVal('canceled', item.canceled === true || item.canceled === 'TRUE');
  const isProblem = getOverrideVal('problem', item.problem === true || item.problem === 'TRUE');
  const isMissing = getOverrideVal('missingDetails', item.missingDetails === true || item.missingDetails === 'TRUE');
  const hardDriveStatus = optimisticHardDriveStatus !== undefined ? optimisticHardDriveStatus : (item.hardDriveStatus || null);
  const isHardDrive = String(editForm.driveFinal || item.driveFinal || '').includes('هارد') || String(editForm.driveFinal || item.driveFinal || '').toLowerCase().includes('hard');
  const isDone = isHardDrive ? hardDriveStatus === 'approved' : getOverrideVal('done', item.done === true || item.done === 'TRUE');
  const isRowActive = activeCell?.rowIndex === index;
  const isPrivilegedUser = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'supervisor';
  const isPrivileged = isPrivilegedUser;

  return (
    <tr
      className={`transition-all duration-300 border-b border-white/[0.03] row-hover ${
        isCanceled
          ? 'canceled-row bg-rose-500/[0.09] hover:bg-rose-500/[0.14] border-rose-500/30 text-rose-100/90'
          : isProblem
          ? 'bg-rose-500/[0.06] hover:bg-rose-500/[0.12] border-rose-500/20 text-rose-100/90' 
          : isMissing 
            ? 'bg-amber-500/[0.06] hover:bg-amber-500/[0.12] border-amber-500/20 text-amber-100/90' 
            : isDone 
            ? 'bg-emerald-500/[0.22] hover:bg-emerald-500/[0.28] border-emerald-500/40 text-emerald-100 shadow-[inset_0_0_25px_rgba(16,185,129,0.15)]' 
            : ''
      } ${isRowActive ? 'relative z-20' : ''}`}
    >
      <td className="px-4 py-5 text-center"><span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-bold text-blue-400 shrink-0">{item.date || '---'}</span></td>
      
      <AutofillCell colKey="branch" rowIndex={index} value={editForm.branch} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
        <InlineCombobox options={optionsLists?.branches} value={editForm.branch} onChange={(val: string) => handleFieldChange('branch', val)} />
      </AutofillCell>

      <AutofillCell colKey="year" rowIndex={index} value={editForm.year} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
        <InlineCombobox options={optionsLists?.years} value={editForm.year} onChange={(val: string) => handleFieldChange('year', val)} />
      </AutofillCell>

      <td className="px-3 py-5 text-center"><Chip value={item.typeCol} /></td>
      
      <AutofillCell colKey="creator" rowIndex={index} value={editForm.creator} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
        <InlineCombobox options={optionsLists?.extraNames} value={editForm.creator} onChange={(val: string) => handleFieldChange('creator', val)} />
      </AutofillCell>

      <td className="px-3 py-5 text-center">
        <div className="flex items-center justify-center gap-2">
          <div 
            onClick={() => {
              if (item.id) {
                navigator.clipboard.writeText(item.id);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/30 transition-all duration-200 cursor-pointer shadow-sm text-xs font-mono font-bold text-emerald-400 hover:scale-[1.02] active:scale-95 group whitespace-nowrap"
            title="اضغط لنسخ الكود"
          >
            <span className="tracking-wide">{item.id || '---'}</span>
            {copied ? (
              <Check size={12} className="text-emerald-400 shrink-0 animate-fadeIn" />
            ) : (
              <Copy size={12} className="text-emerald-500/40 group-hover:text-emerald-400 transition-colors shrink-0" />
            )}
          </div>
          <button 
            onClick={() => onToggleSubscribe(item.id)}
            className={`transition-all duration-300 cursor-pointer p-2 rounded-xl border flex items-center justify-center ${
              isSubscribed 
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-400 scale-105 shadow-[0_0_10px_rgba(244,63,94,0.2)]' 
                : 'border-white/10 bg-white/5 text-white/30 hover:border-white/30 hover:bg-white/10 hover:text-white/60'
            }`}
            title={isSubscribed ? 'إلغاء المتابعة' : 'متابعة هذا السكريبت'}
          >
            <Bell size={12} className={isSubscribed ? 'animate-pulse' : ''} />
          </button>
        </div>
      </td>

      <AutofillCell colKey="dataFiles" rowIndex={index} value={editForm.dataFiles} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length} className="px-4 py-5 text-right font-bold arabic-text">
        {isEditingDataFiles ? (
          <input 
            autoFocus
            type="text" 
            value={editForm.dataFiles} 
            onChange={e => setEditForm({...editForm, dataFiles: e.target.value})}
            onBlur={() => {
              setIsEditingDataFiles(false);
              if (editForm.dataFiles !== item.dataFiles) {
                handleFieldChange('dataFiles', editForm.dataFiles);
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            className={inputStyle + " min-w-[150px] text-left"} 
            placeholder="Paste Link..."
          />
        ) : (
          <div className="flex items-center justify-end gap-2">
            {(() => {
              const parsed = parseCutsLink(item.dataFiles, 'Files Link');
              if (!parsed) return <span className="text-muted/40 text-xs px-2 shrink-0">---</span>;
              
              if (parsed.isLink) {
                const isGoogleDoc = parsed.url.includes('docs.google.com/document/d/');
                return (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a 
                      href={parsed.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-[11px] font-extrabold transition-all text-blue-400 shadow-sm shrink-0 hover:scale-[1.02] active:scale-95 cursor-pointer"
                    >
                      <FolderOpen size={12} className="shrink-0 text-blue-400" />
                      <span className="truncate max-w-[130px] arabic-text" title={parsed.url}>{parsed.text}</span>
                    </a>
                    {isGoogleDoc && <DocLinksDropdown docUrl={parsed.url} toast={toast} />}
                  </div>
                );
              } else {
                return (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[11px] font-bold text-white/90 shadow-sm shrink-0">
                    <span className="truncate max-w-[130px] arabic-text" title={parsed.text}>{parsed.text}</span>
                  </span>
                );
              }
            })()}
            <button 
              onClick={() => setIsEditingDataFiles(true)} 
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-muted hover:text-white transition-all scale-95 cursor-pointer shrink-0" 
              title="تعديل لينك الملفات"
            >
              <Pencil size={11} />
            </button>
          </div>
        )}
      </AutofillCell>

      <AutofillCell colKey="script" rowIndex={index} value={editForm.script} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length} className="px-4 py-5 text-right font-bold arabic-text">
        {isEditingScript ? (
          <input 
            autoFocus
            type="text" 
            value={editForm.script} 
            onChange={e => setEditForm({...editForm, script: e.target.value})}
            onBlur={() => {
              setIsEditingScript(false);
              if (editForm.script !== item.script) {
                handleFieldChange('script', editForm.script);
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            className={inputStyle + " min-w-[150px] text-left"} 
            placeholder="Paste Link..."
          />
        ) : (
          <div className="flex items-center justify-end gap-2">
            {(() => {
              const parsed = parseCutsLink(item.script, 'Idea/Content Link');
              if (!parsed) return <span className="text-muted/40 text-xs px-2 shrink-0">---</span>;
              
              if (parsed.isLink) {
                const isGoogleDoc = parsed.url.includes('docs.google.com/document/d/');
                return (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a 
                      href={parsed.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-[11px] font-extrabold transition-all text-blue-400 shadow-sm shrink-0 hover:scale-[1.02] active:scale-95 cursor-pointer"
                    >
                      <FolderOpen size={12} className="shrink-0 text-blue-400" />
                      <span className="truncate max-w-[130px] arabic-text" title={parsed.url}>{parsed.text}</span>
                    </a>
                    {isGoogleDoc && <DocLinksDropdown docUrl={parsed.url} toast={toast} />}
                  </div>
                );
              } else {
                return (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[11px] font-bold text-white/90 shadow-sm shrink-0">
                    <span className="truncate max-w-[130px] arabic-text" title={parsed.text}>{parsed.text}</span>
                  </span>
                );
              }
            })()}
            <button 
              onClick={() => setIsEditingScript(true)} 
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-muted hover:text-white transition-all scale-95 cursor-pointer shrink-0" 
              title="تعديل الشرح"
            >
              <Pencil size={11} />
            </button>
          </div>
        )}
      </AutofillCell>

      <AutofillCell colKey="type" rowIndex={index} value={editForm.type} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
        <InlineCombobox options={optionsLists?.types} value={editForm.type} onChange={(val: string) => handleFieldChange('type', val)} />
      </AutofillCell>

      <AutofillCell colKey="format" rowIndex={index} value={editForm.format} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
        <InlineCombobox options={optionsLists?.formats} value={editForm.format} onChange={(val: string) => handleFieldChange('format', val)} />
      </AutofillCell>

      <AutofillCell colKey="creatorNotes" rowIndex={index} value={editForm.creatorNotes} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length} className="px-5 py-5 text-center text-xs font-bold text-white/90 arabic-text">
        <HistoryInput
          itemKey={item.id}
          fieldKey="cuts_creator_notes"
          value={editForm.creatorNotes}
          updatedAt={noteAuthors?.[`cuts_creator_notes_${item.id}`]?.timestamp || item.updatedAt}
          updatedBy={noteAuthors?.[`cuts_creator_notes_${item.id}`]?.author || item.creator}
          fallbackAuthor={item.creator}
          onChange={(val: string, time?: string, author?: string) => handleFieldChange('creatorNotes', val, time, author)}
          placeholder="ملاحظات المبتكر..."
          disabled={isVideoTeam && !isPrivileged}
        />
      </AutofillCell>

      <AutofillCell colKey="editorNotes" rowIndex={index} value={editForm.editorNotes} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length} className="px-5 py-5 text-center text-xs font-bold text-white/90 arabic-text">
        <HistoryInput
          itemKey={item.id}
          fieldKey="cuts_editor_notes"
          value={editForm.editorNotes}
          updatedAt={noteAuthors?.[`cuts_editor_notes_${item.id}`]?.timestamp || item.updatedAt}
          updatedBy={noteAuthors?.[`cuts_editor_notes_${item.id}`]?.author || (item.editor && item.editor !== 'غير محدد' ? item.editor : undefined)}
          fallbackAuthor={item.editor && item.editor !== 'غير محدد' ? item.editor : undefined}
          onChange={(val: string, time?: string, author?: string) => handleFieldChange('editorNotes', val, time, author)}
          placeholder="ملاحظات المحرر..."
          disabled={!isVideoTeam && !isPrivileged}
        />
      </AutofillCell>

      {/* Missing Details Checkmark (تفاصيل ناقصة) - amber-500 (yellow) */}
      <td className="px-3 py-5 text-center">
        <button
          onClick={() => toggleStatus('missingDetails', isMissing)}
          className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all duration-300 cursor-pointer ${
            isMissing ? 'bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-white/10 text-muted hover:bg-amber-500/30 hover:text-amber-300'
          }`}
          title="تفاصيل ناقصة"
        >
          {isMissing && <CheckCircle2 size={14} />}
        </button>
      </td>

      {/* Problem Checkmark (مشكلة) - rose-500 (red) */}
      <td className="px-3 py-5 text-center">
        <button
          onClick={() => toggleStatus('problem', isProblem)}
          className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all duration-300 cursor-pointer ${
            isProblem ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-white/10 text-muted hover:bg-rose-500/30 hover:text-rose-300'
          }`}
          title="مشكلة"
        >
          {isProblem && <CheckCircle2 size={14} />}
        </button>
      </td>

      {/* DONE Checkmark (DONE) - emerald-500 (green) */}
      <td className="px-3 py-5 text-center">
        <button
          onClick={() => toggleStatus('done', isDone)}
          className={`w-7 h-7 rounded-lg flex items-center justify-center mx-auto transition-all duration-300 ${
            !canModifyDone
              ? (isDone ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.95)] ring-2 ring-emerald-300 scale-110 cursor-not-allowed opacity-90' : 'bg-white/10 text-muted cursor-not-allowed opacity-60')
              : isDone 
                ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.95)] ring-2 ring-emerald-300 scale-110 cursor-pointer' 
                : 'bg-white/10 text-muted hover:bg-emerald-500/30 hover:text-emerald-300 cursor-pointer'
          }`}
          title={
            !canModifyDone
              ? (isDone ? "غير مسموح لتيم الماركتينج بإلغاء Done 🔒 (استخدم زر EDIT لطلب تعديل)" : "خاص بتيم الفيديو فقط 🔒")
              : "تم الإنجاز"
          }
        >
          {isDone && <CheckCircle2 size={16} className="stroke-[2.5]" />}
        </button>
      </td>

      {/* EDIT Checkmark (طلب تعديل) - Cuts: clicked once, cannot be unclicked, unchecks DONE */}
      <td className="px-3 py-5 text-center">
        <button
          onClick={async () => {
            if (isEditChecked) {
              const msg = "تم طلب تعديل مسبقاً لهذا الريل (مسموح بطلب تعديل مرة واحدة فقط) 🔒";
              if (toast && toast.error) toast.error(msg);
              else alert(msg);
              return;
            }
            const rowCode = item.code || item.id;
            if (!rowCode) { alert("لا يمكن تعديل هذا الصف لعدم وجود كود (Code)"); return; }
            
            setIsEditChecked(true);
            if (onToggleEditCheck) {
              onToggleEditCheck(item, true);
            }
          }}
          className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all duration-300 ${
            isEditChecked
              ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.6)] cursor-not-allowed opacity-90'
              : 'bg-white/10 text-muted hover:bg-blue-500/30 hover:text-blue-300 cursor-pointer'
          }`}
          title={isEditChecked ? "تم طلب تعديل مسبقاً (مغلق - مسموح بطلب تعديل مرة واحدة فقط)" : "طلب تعديل (EDIT - مسموح مرة واحدة فقط)"}
        >
          {isEditChecked ? <CheckCircle2 size={14} /> : null}
        </button>
      </td>

      <AutofillCell colKey="editor" rowIndex={index} value={editForm.editor} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
        <InlineCombobox options={optionsLists?.editors} value={editForm.editor} onChange={(val: string) => handleFieldChange('editor', val)} />
      </AutofillCell>

      <td className="px-4 py-5 text-center">
        <div className="flex flex-col gap-2 items-center justify-center">
          {isEditingFinal ? (
            <div className="flex flex-col items-center gap-1.5 w-full max-w-[190px]">
              <input 
                autoFocus
                type="text" 
                value={editForm.driveFinal} 
                onChange={e => setEditForm({...editForm, driveFinal: e.target.value})}
                onBlur={() => {
                  setIsEditingFinal(false);
                  const clean = editForm.driveFinal.trim();
                  if (clean !== (item.driveFinal || '').trim() || (clean && !item.done)) {
                    handleFieldChange('driveFinal', clean);
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="w-full bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-center text-white/90 outline-none transition-all focus:bg-[#0b1019] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 text-left" 
                placeholder="Paste Final Link..."
              />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsEditingFinal(false);
                  const hardVal = 'على الهارد';
                  setEditForm(prev => ({ ...prev, driveFinal: hardVal }));
                  handleFieldChange('driveFinal', hardVal);
                }}
                className="w-full px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title={isPrivilegedUser ? "تسليم كملف ضخم (+2GB) على الهارد" : "إرسال طلب تسليم على الهارد (+2GB) للمشرف"}
              >
                <HardDrive size={12} className="text-amber-400" />
                <span>{isPrivilegedUser ? '💾 تسليم على الهارد' : '📤 طلب تسليم على الهارد'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5">
              {editForm.driveFinal ? (
                (() => {
                  const s = String(editForm.driveFinal).trim();
                  const isHard = s.includes('هارد') || s.toLowerCase().includes('hard');
                  if (isHard) {
                    return (
                      <div className="flex flex-col items-center gap-1 w-full">
                        <span 
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 truncate max-w-[200px] ${
                            hardDriveStatus === 'pending'
                              ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-300 border border-yellow-500/40 shadow-[0_0_12px_rgba(234,179,8,0.25)]'
                              : hardDriveStatus === 'approved'
                                ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                                : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                          }`}
                          title={`تسليم محلي على الهارد: ${s}${hardDriveStatus ? ' — ' + (hardDriveStatus === 'pending' ? 'بانتظار الموافقة' : hardDriveStatus === 'approved' ? 'تمت الموافقة' : '') : ''}`}
                        >
                          <HardDrive size={13} className={hardDriveStatus === 'pending' ? 'text-yellow-400 shrink-0' : hardDriveStatus === 'approved' ? 'text-emerald-400 shrink-0' : 'text-amber-400 shrink-0'} />
                          <span>{hardDriveStatus === 'pending' ? '⏳ طلب هارد' : hardDriveStatus === 'approved' ? '✅ هارد (معتمد)' : s}</span>
                        </span>
                        {hardDriveStatus === 'pending' && isPrivilegedUser && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <button
                              onClick={async () => {
                                const rowCode = item.code || item.id;
                                setOptimisticHardDriveStatus('approved');
                                try {
                                  await supabase.from('reels_cuts_26').update({ hard_drive_status: 'approved', done: true, updated_at: new Date().toISOString() }).eq('code', rowCode);
                                  const editorName = item.editor || '';
                                  if (editorName) {
                                    const editorChatId = await getUserTelegramChatId(undefined, editorName);
                                    if (editorChatId) {
                                      notifyHardDriveDecision({
                                        chatId: editorChatId,
                                        taskCode: rowCode,
                                        taskTitle: item.script || rowCode,
                                        decision: 'approved',
                                        supervisorName: profile?.name
                                      }).catch(console.error);
                                    }
                                  }
                                  if (toast?.success) toast.success('تمت الموافقة على التسليم على الهارد ✅');
                                } catch(e) {
                                  setOptimisticHardDriveStatus('pending');
                                  console.error(e);
                                }
                              }}
                              className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                              title="اعتماد التسليم على الهارد"
                            >
                              <Check size={10} /> موافقة
                            </button>
                            <button
                              onClick={async () => {
                                const rowCode = item.code || item.id;
                                setOptimisticHardDriveStatus(null);
                                setEditForm(prev => ({ ...prev, driveFinal: '' }));
                                try {
                                  await supabase.from('reels_cuts_26').update({ hard_drive_status: null, drive_final: '', done: false, updated_at: new Date().toISOString() }).eq('code', rowCode);
                                  const editorName = item.editor || '';
                                  if (editorName) {
                                    const editorChatId = await getUserTelegramChatId(undefined, editorName);
                                    if (editorChatId) {
                                      notifyHardDriveDecision({
                                        chatId: editorChatId,
                                        taskCode: rowCode,
                                        taskTitle: item.script || rowCode,
                                        decision: 'rejected',
                                        supervisorName: profile?.name
                                      }).catch(console.error);
                                    }
                                  }
                                  if (toast?.success) toast.success('تم رفض التسليم على الهارد — يرجى رفع الملف على Drive ↩️');
                                } catch(e) {
                                  setOptimisticHardDriveStatus('pending');
                                  console.error(e);
                                }
                              }}
                              className="px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                              title="رفض التسليم على الهارد"
                            >
                              <X size={10} /> رفض
                            </button>
                          </div>
                        )}
                        {hardDriveStatus === 'pending' && !isPrivilegedUser && (
                          <span className="text-[10px] text-yellow-400/80 font-medium">⏳ في انتظار الموافقة</span>
                        )}
                      </div>
                    );
                  }
                  const parsed = parseCutsLink(editForm.driveFinal, 'Final');
                  return (
                    <a 
                      href={parsed?.url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-mono text-[11px] underline cursor-pointer shadow-sm shrink-0 truncate max-w-[220px]"
                      title={parsed?.url || ''}
                    >
                      {parsed?.url || ''}
                    </a>
                  );
                })()
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-muted/40 text-xs px-2 shrink-0">---</span>
                  {!isMarketingUser && (
                    <button
                      onClick={() => {
                        const hardVal = 'على الهارد';
                        setEditForm(prev => ({ ...prev, driveFinal: hardVal }));
                        handleFieldChange('driveFinal', hardVal);
                      }}
                      className="p-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400/80 hover:text-amber-300 border border-amber-500/20 text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                      title={isPrivilegedUser ? "تسليم على الهارد (+2GB)" : "طلب تسليم على الهارد (+2GB)"}
                    >
                      <HardDrive size={11} />
                      <span>{isPrivilegedUser ? 'هارد' : 'طلب هارد'}</span>
                    </button>
                  )}
                </div>
              )}
              {!isMarketingUser && (
                <button 
                  onClick={() => setIsEditingFinal(true)} 
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-muted hover:text-white transition-all scale-95 cursor-pointer shrink-0" 
                  title="تعديل لينك فاينال"
                >
                  <Pencil size={11} />
                </button>
              )}
            </div>
          )}
          {isSaving && (
            <span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin block" title="جاري الحفظ تلقائياً..." />
          )}
        </div>
      </td>

      {/* Canceled Checkmark (CANCELO) - red-500 (red) */}
      <td className="px-3 py-5 text-center">
        <button
          onClick={() => toggleStatus('canceled', isCanceled)}
          className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all duration-300 cursor-pointer cancel-action-btn no-strike ${
            isCanceled ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-white/10 text-muted hover:bg-red-500/30 hover:text-red-300'
          }`}
          title="ملغي"
        >
          {isCanceled && <CheckCircle2 size={14} />}
        </button>
      </td>
    </tr>
  );
});
