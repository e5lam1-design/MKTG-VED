import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Check, Copy, Bell, FolderOpen, Pencil, AlertCircle, XCircle, Link, HardDrive,
  CheckCircle2, Clock, Send, Video, RefreshCw, Sparkles, AlertTriangle, X
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
import { parseDriveLink, parseScriptValue, generateKey } from '../../lib/dashboardUtils';
import {
  AutofillCell,
  InlineCombobox,
  HistoryInput,
  Chip,
  DatePickerCell
} from '../DashboardUiPrimitives';
import { DocLinksDropdown } from '../DocLinksDropdown';
import { ScriptDocLink } from '../ScriptDocLink';

export const ShootingRow = React.memo(({ item, index, activeGid, onToggleFilmed, loadingFilmedCode, onUpdateShootingRow, onToggleEditCheck, liveData, allReelsCodes, sequenceRegistry, optionsLists, autofillDrag, setAutofillDrag, onApplyAutofill, activeCell, setActiveCell, toast, isSubscribed, onToggleSubscribe, isSimple, publishedTasks, sharedLinks, onTogglePublish, onUpdateSharedLink, noteAuthors }: any) => {
  const isGlowing = false;
  const [isEditChecked, setIsEditChecked] = useState(Boolean(item.editCheck || item.edit_check));
  useEffect(() => {
    setIsEditChecked(Boolean(item.editCheck || item.edit_check));
  }, [item.editCheck, item.edit_check]);

  const [editForm, setEditForm] = useState({
    branch: item.branch || '',
    year: item.year || '',
    teacher: item.teacher || '',
    extraName: item.extraName || '',
    type: item.type || '',
    format: item.format || '',
    by: item.by || '',
    storage: item.storage || '',
    script: item.script || '',
    notes: item.notes || '',
    editorNotes: item.editorNotes || item.editor_notes || '',
    driveRaw: item.driveRaw || '',
    editorCol: item.editorCol || item.editor || '',
    driveFinal: item.driveFinal || '',
    filmed: item.filmed === true || item.filmed === 'TRUE',
    filmingDate: item.filmingDate || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [isEditingRaw, setIsEditingRaw] = useState(false);
  const [isEditingFinal, setIsEditingFinal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [optimisticDone, setOptimisticDone] = useState<boolean | null>(null);
  const [optimisticCanceled, setOptimisticCanceled] = useState<boolean | null>(null);
  const [optimisticMissing, setOptimisticMissing] = useState<boolean | null>(null);
  const [optimisticHardDriveStatus, setOptimisticHardDriveStatus] = useState<string | null | undefined>(undefined);
  const { profile } = useAuth();

  useEffect(() => {
    setOptimisticDone(null);
  }, [item.done]);

  useEffect(() => {
    setOptimisticCanceled(null);
  }, [item.canceled]);

  useEffect(() => {
    setOptimisticMissing(null);
  }, [item.missingDetails, item.missing_details]);

  useEffect(() => {
    setOptimisticHardDriveStatus(undefined);
  }, [item.hardDriveStatus]);

  // Sync editForm if item changes from outside (e.g. after save or realtime sync)
  useEffect(() => {
    setEditForm({
      branch: item.branch || '',
      year: item.year || '',
      teacher: item.teacher || '',
      extraName: item.extraName || item.creator || '',
      type: item.type || '',
      format: item.format || '',
      by: item.by || '',
      storage: item.storage || '',
      script: item.script || '',
      notes: item.notes || item.creatorNotes || item.creator_notes || '',
      editorNotes: item.editorNotes || item.editor_notes || '',
      driveRaw: item.driveRaw || item.dataFiles || '',
      editorCol: item.editorCol || item.editor || '',
      driveFinal: item.driveFinal || '',
      filmed: item.filmed === true || item.filmed === 'TRUE',
      filmingDate: item.filmingDate || ''
    });
  }, [item.notes, item.editorNotes, item.editor_notes, item.creatorNotes, item.creator_notes, item.filmed, item.filmingDate, item.driveFinal, item.driveRaw, item.editorCol, item.editor, item.branch, item.year, item.teacher, item.extraName, item.type, item.format, item.by, item.storage, item.script, item.done, item.canceled, item.missingDetails]);

  const generatedCode = useMemo(() => {
    const baseCode = item.code || item.id || '';
    if (!['1436746012', '1939073164', '798246690'].includes(activeGid)) return baseCode;
    const cleanY = cleanCodePart(editForm.year);
    const cleanT = cleanCodePart(editForm.teacher);
    const cleanE = cleanCodePart(editForm.extraName);
    const curY = cleanCodePart(item.year);
    const curT = cleanCodePart(item.teacher);
    const curE = cleanCodePart(item.extraName);
    if (cleanY === curY && cleanT === curT && cleanE === curE) return baseCode;

    // If only academic year changed, keep existing sequence ONLY if that exact code does not exist anywhere
    if (cleanT === curT && cleanE === curE) {
      const seqTailMatch = cleanCodePart(baseCode).match(/-(\d+(?:\s*v\d+)?)$/i);
      if (seqTailMatch) {
        const candidateSameSeq = `${cleanY}-${cleanT}-${cleanE}-${seqTailMatch[1]}`.toLowerCase();
        const knownSet: Set<string> = allReelsCodes instanceof Set ? allReelsCodes : new Set(allReelsCodes || []);
        if (!knownSet.has(candidateSameSeq) || candidateSameSeq === cleanCodePart(baseCode)) {
          return candidateSameSeq;
        }
      }
    }

    return computeNextUniqueReelCode({
      year: editForm.year,
      teacher: editForm.teacher,
      extraName: editForm.extraName,
      isCut: false,
      excludeCode: baseCode,
      allKnownCodes: allReelsCodes || [],
      sequenceRegistry,
    }).code;
  }, [editForm, item, allReelsCodes, sequenceRegistry, activeGid]);

  const handleFieldChange = async (fieldName: string, value: string, time?: string, author?: string) => {
    const isMarketingUser = profile?.team?.toLowerCase() === 'marketing' && profile?.role !== 'admin' && profile?.role !== 'manager';
    const isVideoUser = profile?.team?.toLowerCase() === 'video' && profile?.role !== 'admin' && profile?.role !== 'manager';

    if (activeGid === '1939073164') {
      if (fieldName === 'editorNotes' && isMarketingUser) {
        const msg = "غير مسموح لتيم الماركتينج بتعديل أو مسح ملاحظات المونتير 🎬🔒 (خاصة بتيم الفيديو فقط)";
        if (toast && toast.error) toast.error(msg); else alert(msg);
        return;
      }
      if (fieldName === 'notes' && isVideoUser) {
        const msg = "غير مسموح لتيم الفيديو بتعديل أو مسح ملاحظات الماركتينج 📝🔒 (خاصة بتيم الماركتينج فقط)";
        if (toast && toast.error) toast.error(msg); else alert(msg);
        return;
      }
    }

    if (fieldName === 'driveFinal' && isMarketingUser && activeGid === '1939073164') {
      if (toast && toast.error) {
        toast.error("غير مسموح لتيم الماركتينج بتعديل أو إزالة رابط الفاينال 🎬🔒 (خاص بتيم الفيديو)");
      } else {
        alert("غير مسموح لتيم الماركتينج بتعديل أو إزالة رابط الفاينال 🎬🔒 (خاص بتيم الفيديو)");
      }
      return;
    }

    // 1. Update the state immediately for fast feedback
    const updatedForm = { ...editForm, [fieldName]: value };
    setEditForm(updatedForm);

    // 2. Generate guaranteed unique code if year, teacher, or extraName changes
    const currentItemCode = item.code || item.id || '';
    let newCode = currentItemCode;
    if (['1436746012', '1939073164', '798246690'].includes(activeGid) && (fieldName === 'year' || fieldName === 'teacher' || fieldName === 'extraName')) {
      const cleanY = cleanCodePart(updatedForm.year);
      const cleanT = cleanCodePart(updatedForm.teacher);
      const cleanE = cleanCodePart(updatedForm.extraName);
      const curY = cleanCodePart(item.year);
      const curT = cleanCodePart(item.teacher);
      const curE = cleanCodePart(item.extraName);

      if (cleanY !== curY || cleanT !== curT || cleanE !== curE) {
        let resolvedSameSeq = '';
        if (cleanT === curT && cleanE === curE) {
          const seqTailMatch = cleanCodePart(currentItemCode).match(/-(\d+(?:\s*v\d+)?)$/i);
          if (seqTailMatch) {
            const candidateSameSeq = `${cleanY}-${cleanT}-${cleanE}-${seqTailMatch[1]}`.toLowerCase();
            const knownSet: Set<string> = allReelsCodes instanceof Set ? allReelsCodes : new Set(allReelsCodes || []);
            if (!knownSet.has(candidateSameSeq) || candidateSameSeq === cleanCodePart(currentItemCode)) {
              resolvedSameSeq = candidateSameSeq;
            }
          }
        }

        newCode = resolvedSameSeq || computeNextUniqueReelCode({
          year: updatedForm.year,
          teacher: updatedForm.teacher,
          extraName: updatedForm.extraName,
          isCut: false,
          excludeCode: currentItemCode,
          allKnownCodes: allReelsCodes || [],
          sequenceRegistry,
        }).code;
      }
    }

    // Done status logic: if fieldName is 'driveFinal', automatically set done=true when a valid final link is added, or uncheck done if cleared/invalid!
    let nextDoneStatus = item.done;
    let nextHardDriveStatus: string | null | undefined = undefined; // undefined = unchanged
    const isPrivileged = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'supervisor';

    if (fieldName === 'driveFinal') {
      if (isMarketingUser) {
        const msg = "غير مسموح لتيم الماركتينج بتعديل أو إزالة رابط الفاينال 🎬🔒 (خاص بتيم الفيديو فقط)";
        if (toast && toast.error) toast.error(msg); else alert(msg);
        return;
      }
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
        if (isHardDrive && !isPrivileged) {
          // Non-privileged: create pending request, CANNOT be marked Done yet!
          nextDoneStatus = false;
          setOptimisticDone(false);
          nextHardDriveStatus = 'pending';
          setOptimisticHardDriveStatus('pending');
          if (toast && toast.info) {
            toast.info('تم إرسال طلب التسليم على الهارد! ⏳💾 — لن تُعتبر المهمة مكتملة إلا بعد موافقة المشرف');
          }
          // Notify admins/supervisors via Telegram (fire and forget)
          const tbl = activeGid === '0' ? 'reels_cuts_26' : 'reels_ve_26';
          const taskCode = item.code || item.id || '';
          const sourceSheet = activeGid === '1939073164' ? 'Reels (Ve)' : 'Cuts';
          getUserTelegramChatId(profile?.id, profile?.name).then(async (myChatId) => {
            // Notify admin
            const adminChatId = await getUserTelegramChatId(undefined, 'admin') || await getUserTelegramChatId(undefined, 'eslam');
            if (adminChatId) {
              notifyHardDriveRequest({
                chatId: adminChatId,
                taskCode,
                taskTitle: item.script || item.extraName || taskCode,
                sourceSheet,
                editorName: profile?.name || item.editorCol || item.editor || 'غير محدد'
              }).catch(console.error);
            }
          }).catch(console.error);
        } else if (isHardDrive && isPrivileged) {
          // Privileged: direct done approved
          nextDoneStatus = true;
          setOptimisticDone(true);
          nextHardDriveStatus = 'approved';
          setOptimisticHardDriveStatus('approved');
          if (toast && toast.success) {
            toast.success('تم اعتماد التسليم على الهارد وتحديد المهمة كـ Done! 💾✅');
          }
        } else {
          // Valid Drive Link: direct done
          nextDoneStatus = true;
          setOptimisticDone(true);
          nextHardDriveStatus = null;
          setOptimisticHardDriveStatus(null);
          if (toast && toast.success) {
            toast.success('تم حفظ رابط الفاينال وتحديد المهمة كـ Done تلقائياً! 🎉');
          }
        }
      } else {
        nextDoneStatus = false;
        setOptimisticDone(false);
        nextHardDriveStatus = null;
        setOptimisticHardDriveStatus(null);
      }
    }

    // 3. Call the update api with the final values
    if (!onUpdateShootingRow) return;
    setIsSaving(true);
    const rowCode = item.code || item.id;
    const rowData = [
      item.date,
      updatedForm.branch,
      updatedForm.year,
      updatedForm.teacher,
      updatedForm.extraName,
      newCode || rowCode,
      updatedForm.script,
      updatedForm.type,
      updatedForm.format,
      updatedForm.filmed ? 'TRUE' : 'FALSE',
      updatedForm.filmingDate || item.filmingDate || '',
      updatedForm.by,
      updatedForm.storage,
      updatedForm.notes,
      updatedForm.driveRaw,
      updatedForm.editorCol,
      nextDoneStatus ? 'TRUE' : 'FALSE',
      updatedForm.driveFinal,
      item.canceled ? 'TRUE' : 'FALSE',
      item.missingDetails ? 'TRUE' : 'FALSE',
      updatedForm.editorNotes || '',
      nextHardDriveStatus // index 21: hard_drive_status (only set when changed)
    ];
    const changedFields = [fieldName];
    if (newCode && newCode !== rowCode) changedFields.push('code');
    if (fieldName === 'driveFinal') {
      changedFields.push('done');
      if (nextHardDriveStatus !== undefined) changedFields.push('hardDriveStatus');
    }
    try {
      await onUpdateShootingRow(rowCode, rowData, { fieldName, value, time, author }, changedFields);
    } catch(e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle = "w-full bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-center text-white/90 outline-none transition-all focus:bg-[#0b1019] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30";

  const isCanceled = optimisticCanceled !== null ? optimisticCanceled : (item.canceled === true || item.canceled === 'TRUE');
  const isMissing = optimisticMissing !== null ? optimisticMissing : (item.missingDetails === true || item.missingDetails === 'TRUE' || item.missing_details === true);
  const hardDriveStatus = optimisticHardDriveStatus !== undefined ? optimisticHardDriveStatus : (item.hardDriveStatus || null);
  const isHardDrive = String(editForm.driveFinal || item.driveFinal || '').includes('هارد') || String(editForm.driveFinal || item.driveFinal || '').toLowerCase().includes('hard');
  const isDone = optimisticDone !== null 
    ? optimisticDone 
    : (isHardDrive ? hardDriveStatus === 'approved' : (item.done === true || item.done === 'TRUE'));
  const isFilmed = Boolean(editForm.filmed || item.filmed === true || item.filmed === 'TRUE');
  const isRowActive = activeCell?.rowIndex === index;
  const isPrivilegedUser = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'supervisor';
  const isPrivileged = isPrivilegedUser;
  const isVideoTeam = profile?.team?.toLowerCase() === 'video';
  const isMarketingTeam = profile?.team?.toLowerCase() === 'marketing' && profile?.role !== 'admin';
  const canModifyDone = (isVideoTeam || profile?.role === 'admin') && !isMarketingTeam;
  const isMarketingUser = isMarketingTeam;

  return (
    <tr
      style={
        isGlowing
          ? {}
          : isCanceled
            ? { 
                background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.22) 0%, rgba(185, 28, 28, 0.14) 50%, rgba(239, 68, 68, 0.18) 100%)', 
                borderLeft: '5px solid #ef4444',
                boxShadow: 'inset 0 0 35px rgba(239, 68, 68, 0.18)'
              }
            : isDone
              ? { 
                  background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.28) 0%, rgba(5, 150, 105, 0.16) 50%, rgba(16, 185, 129, 0.22) 100%)', 
                  borderLeft: '5px solid #10b981',
                  boxShadow: 'inset 0 0 35px rgba(16, 185, 129, 0.20)'
                }
              : isFilmed
                ? { 
                    background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.14) 50%, rgba(16, 185, 129, 0.20) 100%)', 
                    borderLeft: '5px solid #10b981',
                    boxShadow: 'inset 0 0 35px rgba(16, 185, 129, 0.18)'
                  }
                : isMissing
                  ? { background: 'rgba(245, 158, 11, 0.08)' }
                  : {}
      }
      className={`transition-all duration-300 border-b ${
        isCanceled 
          ? 'canceled-row border-rose-500/40 text-rose-100/90'
          : isDone 
            ? 'border-emerald-500/30 text-emerald-50 hover:bg-emerald-950/40' 
            : isFilmed
              ? 'border-emerald-500/40 text-emerald-50 bg-emerald-950/40 hover:bg-emerald-900/50'
              : isMissing ? 'border-white/[0.03] text-amber-100/90' 
              : 'border-white/[0.03]'
      } row-hover ${isGlowing ? 'bg-emerald-500/20 shadow-[inset_0_0_25px_rgba(16,185,129,0.4)] ring-2 ring-emerald-500/50 border-emerald-500/50 animate-pulse relative z-10' : isRowActive ? 'relative z-20' : ''}`}
    >
      {!isSimple && (
        <td className="px-4 py-5 text-center"><span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-bold text-blue-400 shrink-0">{item.date || '---'}</span></td>
      )}
      
      <AutofillCell colKey="branch" rowIndex={index} value={editForm.branch} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
        <InlineCombobox options={optionsLists?.branches} value={editForm.branch} onChange={(val: string) => handleFieldChange('branch', val)} />
      </AutofillCell>

      {!isSimple && (
        <>
          <AutofillCell colKey="year" rowIndex={index} value={editForm.year} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
            <InlineCombobox options={optionsLists?.years} value={editForm.year} onChange={(val: string) => handleFieldChange('year', val)} />
          </AutofillCell>

          <AutofillCell colKey="teacher" rowIndex={index} value={editForm.teacher} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
            <InlineCombobox options={optionsLists?.teachers} value={editForm.teacher} onChange={(val: string) => handleFieldChange('teacher', val)} />
          </AutofillCell>

          <AutofillCell colKey="extraName" rowIndex={index} value={editForm.extraName} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
            <InlineCombobox options={optionsLists?.extraNames} value={editForm.extraName} onChange={(val: string) => handleFieldChange('extraName', val)} />
          </AutofillCell>
        </>
      )}

      <td className="px-3 py-5 text-center">
        <div className="flex items-center justify-center gap-2">
          <div 
            onClick={() => {
              navigator.clipboard.writeText(generatedCode);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/30 transition-all duration-200 cursor-pointer shadow-sm text-xs font-mono font-bold text-emerald-400 hover:scale-[1.02] active:scale-95 group whitespace-nowrap"
            title="اضغط لنسخ الكود"
          >
            <span className="tracking-wide">{generatedCode}</span>
            {copied ? (
              <Check size={12} className="text-emerald-400 shrink-0 animate-fadeIn" />
            ) : (
              <Copy size={12} className="text-emerald-500/40 group-hover:text-emerald-400 transition-colors shrink-0" />
            )}
          </div>
          <button 
            onClick={() => onToggleSubscribe(generatedCode)}
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
            placeholder="Paste Drive Link..."
          />
        ) : (
          <div className="flex items-center justify-end gap-2">
            {(() => {
              const parsed = parseScriptValue(item.script);
              if (!parsed) return <span className="text-muted/40 text-xs px-2 shrink-0">---</span>;
              
              if (parsed.isLink) {
                const isGoogleDoc = parsed.url.includes('docs.google.com/document/d/');
                return (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isGoogleDoc ? (
                      <ScriptDocLink
                        url={parsed.url}
                        text={parsed.text}
                        rowCreatedAt={item.createdAt || item.created_at || null}
                        addedBy={item.addedBy || item.added_by || item.extraName || null}
                      />
                    ) : (
                      <a 
                        href={parsed.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-[11px] font-extrabold transition-all text-blue-400 shadow-sm shrink-0 hover:scale-[1.02] active:scale-95 cursor-pointer"
                      >
                        <FolderOpen size={12} className="shrink-0 text-blue-400" />
                        <span className="truncate max-w-[130px] arabic-text" title={parsed.url}>{parsed.text}</span>
                      </a>
                    )}
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
              title="تعديل الاسكريبت"
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

      {/* EDIT (Filmed / Transferred) Checkbox Column */}
      <td className="px-3 py-5 text-center">
        <button
          onClick={() => {
            if (activeGid === '1939073164') return;
            const nextFilmed = !editForm.filmed;
            const todayStr = new Date().toLocaleDateString('en-US');
            const targetFilmingDate = (nextFilmed && !editForm.filmingDate) ? todayStr : editForm.filmingDate;
            const updatedForm = { ...editForm, filmed: nextFilmed, filmingDate: targetFilmingDate || '' };
            setEditForm(updatedForm);
            const rowCode = item.code || item.id;
            if (onUpdateShootingRow) {
              const rowData = [
                item.date,
                updatedForm.branch,
                updatedForm.year,
                updatedForm.teacher,
                updatedForm.extraName,
                rowCode,
                updatedForm.script,
                updatedForm.type,
                updatedForm.format,
                nextFilmed ? 'TRUE' : 'FALSE',
                targetFilmingDate || '',
                updatedForm.by,
                updatedForm.storage,
                updatedForm.notes,
                updatedForm.driveRaw,
                updatedForm.editorCol,
                item.done ? 'TRUE' : 'FALSE',
                updatedForm.driveFinal,
                item.canceled ? 'TRUE' : 'FALSE',
                item.missingDetails ? 'TRUE' : 'FALSE'
              ];
              onUpdateShootingRow(rowCode, rowData, undefined, ['filmed', 'filmingDate']);
            } else {
              onToggleFilmed && onToggleFilmed({ ...item, ...updatedForm, filmed: item.filmed }, nextFilmed);
            }
          }}
          className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all duration-300 ${activeGid === '1939073164' ? 'cursor-default' : 'cursor-pointer'} ${loadingFilmedCode === (item.code || item.id) && activeGid !== '1939073164' ? 'opacity-50 pointer-events-none' : ''} ${
            (editForm.filmed || activeGid === '1939073164') ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/10 text-muted hover:bg-emerald-500/30 hover:text-emerald-300'
          }`}
          title="اتصور"
        >
          {loadingFilmedCode === (item.code || item.id) && activeGid !== '1939073164' ? (
            <span className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
          ) : (editForm.filmed || activeGid === '1939073164') ? (
            <CheckCircle2 size={14} />
          ) : null}
        </button>
      </td>

      {!isSimple && (
        <>
          <td className="px-4 py-5 text-center text-xs">
            <DatePickerCell
              value={item.filmingDate || editForm.filmingDate || ''}
              onChange={(picked) => {
                setEditForm(prev => ({ ...prev, filmingDate: picked }));
                const rowCode = item.code || item.id;
                const rowData = [
                  item.date,
                  editForm.branch,
                  editForm.year,
                  editForm.teacher,
                  editForm.extraName,
                  rowCode,
                  editForm.script,
                  editForm.type,
                  editForm.format,
                  item.filmed ? 'TRUE' : 'FALSE',
                  picked,
                  editForm.by,
                  editForm.storage,
                  editForm.notes,
                  editForm.driveRaw,
                  editForm.editorCol,
                  item.done ? 'TRUE' : 'FALSE',
                  editForm.driveFinal,
                  item.canceled ? 'TRUE' : 'FALSE',
                  item.missingDetails ? 'TRUE' : 'FALSE'
                ];
                onUpdateShootingRow && onUpdateShootingRow(rowCode, rowData, undefined, ['filmingDate']);
              }}
            />
          </td>
          <AutofillCell colKey="by" rowIndex={index} value={editForm.by} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
            <InlineCombobox options={optionsLists?.bys} value={editForm.by} onChange={(val: string) => handleFieldChange('by', val)} />
          </AutofillCell>
          <AutofillCell colKey="storage" rowIndex={index} value={editForm.storage} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
            <InlineCombobox options={optionsLists?.storages} value={editForm.storage} onChange={(val: string) => handleFieldChange('storage', val)} />
          </AutofillCell>
        </>
      )}
      <AutofillCell colKey="notes" rowIndex={index} value={editForm.notes} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length} className="px-5 py-5 text-center text-xs font-bold text-white/90 arabic-text">
        <HistoryInput
          itemKey={item.code || item.id}
          fieldKey="shooting_notes"
          value={editForm.notes}
          updatedAt={noteAuthors?.[`shooting_notes_${item.code || item.id}`]?.timestamp || item.updatedAt}
          updatedBy={noteAuthors?.[`shooting_notes_${item.code || item.id}`]?.author}
          fallbackAuthor={item.extraName || item.teacher}
          onChange={(val: string, time?: string, author?: string) => handleFieldChange('notes', val, time, author)}
          placeholder="اكتب ملاحظة..."
          disabled={isCanceled || (activeGid === '1939073164' && isVideoTeam && !isPrivilegedUser)}
        />
      </AutofillCell>
      {activeGid === '1939073164' && (
        <AutofillCell colKey="editorNotes" rowIndex={index} value={editForm.editorNotes} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length} className="px-5 py-5 text-center text-xs font-bold text-white/90 arabic-text">
          <HistoryInput
            itemKey={item.code || item.id}
            fieldKey="ve_editor_notes"
            value={editForm.editorNotes}
            updatedAt={noteAuthors?.[`ve_editor_notes_${item.code || item.id}`]?.timestamp || item.updatedAt}
            updatedBy={noteAuthors?.[`ve_editor_notes_${item.code || item.id}`]?.author || (item.editorCol && item.editorCol !== 'غير محدد' ? item.editorCol : undefined)}
            fallbackAuthor={item.editorCol && item.editorCol !== 'غير محدد' ? item.editorCol : undefined}
            onChange={(val: string, time?: string, author?: string) => handleFieldChange('editorNotes', val, time, author)}
            placeholder="ملاحظات المونتير..."
            disabled={isCanceled || (!isVideoTeam && !isPrivilegedUser)}
          />
        </AutofillCell>
      )}
      <td className="px-4 py-5 text-center">
        <div className="flex flex-col gap-2 items-center justify-center">
          {isEditingRaw ? (
            <input 
              autoFocus
              type="text" 
              value={editForm.driveRaw} 
              onChange={e => setEditForm({...editForm, driveRaw: e.target.value})}
              onBlur={() => {
                setIsEditingRaw(false);
                if (editForm.driveRaw !== item.driveRaw) {
                  handleFieldChange('driveRaw', editForm.driveRaw);
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              className="w-full max-w-[150px] bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-center text-white/90 outline-none transition-all focus:bg-[#0b1019] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 text-left" 
              placeholder="Paste Raw Drive Link..."
            />
          ) : (
            <div className="flex items-center justify-center gap-1.5">
              {item.driveRaw ? (
                (() => {
                  const parsed = parseDriveLink(item.driveRaw);
                  return (
                    <a 
                      href={parsed.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-mono text-[11px] underline cursor-pointer shadow-sm shrink-0 truncate max-w-[220px]"
                      title={parsed.url}
                    >
                      {parsed.text}
                    </a>
                  );
                })()
              ) : (
                <span className="text-muted/40 text-xs px-2 shrink-0">---</span>
              )}
              <button 
                onClick={() => setIsEditingRaw(true)} 
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-muted hover:text-white transition-all scale-95 cursor-pointer shrink-0" 
                title="تعديل لينك الدرايف"
              >
                <Pencil size={11} />
              </button>
            </div>
          )}
          {isSaving && (
            <span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin block" title="جاري الحفظ تلقائياً..." />
          )}
        </div>
      </td>
      {activeGid === '1939073164' && (
        <>
          <AutofillCell colKey="editorCol" rowIndex={index} value={editForm.editorCol} autofillDrag={autofillDrag} setAutofillDrag={setAutofillDrag} onApply={onApplyAutofill} activeCell={activeCell} setActiveCell={setActiveCell} liveDataLength={liveData?.length}>
            <InlineCombobox options={optionsLists?.editors} value={editForm.editorCol} onChange={(val: string) => handleFieldChange('editorCol', val)} />
          </AutofillCell>
          {/* Missing Details Checkmark */}
          <td className="px-3 py-5 text-center">
            <button
              onClick={async () => {
                const rowCode = item.code || item.id;
                if (!rowCode) { alert("لا يمكن تعديل هذا الصف لعدم وجود كود (Code)"); return; }
                if (!onUpdateShootingRow) return;
                setIsSaving(true);
                const nextMissing = !isMissing;
                setOptimisticMissing(nextMissing);
                const rowData = [
                  item.date,
                  editForm.branch,
                  editForm.year,
                  editForm.teacher,
                  editForm.extraName,
                  rowCode,
                  editForm.script,
                  editForm.type,
                  editForm.format,
                  item.filmed ? 'TRUE' : 'FALSE',
                  item.filmingDate,
                  editForm.by,
                  editForm.storage,
                  editForm.notes,
                  editForm.driveRaw,
                  editForm.editorCol,
                  isDone ? 'TRUE' : 'FALSE',
                  editForm.driveFinal,
                  isCanceled ? 'TRUE' : 'FALSE',
                  nextMissing ? 'TRUE' : 'FALSE'
                ];
                try {
                  await onUpdateShootingRow(rowCode, rowData, undefined, ['missingDetails']);
                } catch(e) {
                  setOptimisticMissing(null);
                  console.error(e);
                } finally {
                  setIsSaving(false);
                }
              }}
              className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all duration-300 cursor-pointer ${
                isMissing ? 'bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-white/10 text-muted hover:bg-amber-500/30 hover:text-amber-300'
              }`}
              title="تفاصيل ناقصة"
            >
              {isMissing && <CheckCircle2 size={14} />}
            </button>
          </td>
          {/* DONE Checkmark */}
          <td className="px-3 py-5 text-center">
            <button
              disabled={isCanceled}
              onClick={async () => {
                if (isCanceled) return;
                const rowCode = item.code || item.id;
                if (!rowCode) { alert("لا يمكن تعديل هذا الصف لعدم وجود كود (Code)"); return; }
                if (!canModifyDone && activeGid === '1939073164') {
                  const msg = isDone 
                    ? "غير مسموح لتيم الماركتينج بإلغاء Done 🔒 (المسموح لك فقط هو طلب تعديل عبر زر EDIT)"
                    : "تحديد حالة Done خاص بتيم الفيديو فقط 🎬🔒";
                  if (toast && toast.error) {
                    toast.error(msg);
                  } else {
                    alert(msg);
                  }
                  return;
                }
                const nextDone = !isDone;
                if (nextDone) {
                  const finalVal = String(editForm.driveFinal || '').trim();
                  const driveIdRegex = /^[a-zA-Z0-9_-]{25,55}$/;
                  const isHardDrive = finalVal.includes('هارد') || finalVal.toLowerCase().includes('hard');
                  if (!finalVal || (!isHardDrive && finalVal.toLowerCase() !== 'تم' && !finalVal.includes('http://') && !finalVal.includes('https://') && !finalVal.includes('drive.google.com') && !finalVal.includes('docs.google.com') && !driveIdRegex.test(finalVal))) {
                    if (toast && toast.error) {
                      toast.error("لا يمكن تحديد المهمة كمكتملة (Done) إلا بعد إضافة رابط المونتاج النهائي!");
                    } else {
                      alert("لا يمكن تحديد المهمة كمكتملة (Done) إلا بعد إضافة رابط المونتاج النهائي!");
                    }
                    return;
                  }
                  if (isHardDrive && !isPrivilegedUser && hardDriveStatus !== 'approved') {
                    if (toast && toast.error) {
                      toast.error("لا يمكن تحديد المهمة كمكتملة (Done) — طلب التسليم على الهارد ما زال بانتظار موافقة المشرف! ⏳");
                    } else {
                      alert("لا يمكن تحديد المهمة كمكتملة (Done) — طلب التسليم على الهارد ما زال بانتظار موافقة المشرف! ⏳");
                    }
                    return;
                  }
                }
                if (!onUpdateShootingRow) return;
                setIsSaving(true);
                const rowData = [
                  item.date,
                  editForm.branch,
                  editForm.year,
                  editForm.teacher,
                  editForm.extraName,
                  rowCode,
                  editForm.script,
                  editForm.type,
                  editForm.format,
                  item.filmed ? 'TRUE' : 'FALSE',
                  item.filmingDate,
                  editForm.by,
                  editForm.storage,
                  editForm.notes,
                  editForm.driveRaw,
                  editForm.editorCol,
                  nextDone ? 'TRUE' : 'FALSE',
                  editForm.driveFinal,
                  item.canceled ? 'TRUE' : 'FALSE',
                  item.missingDetails ? 'TRUE' : 'FALSE'
                ];
                setOptimisticDone(nextDone);
                try {
                  await onUpdateShootingRow(rowCode, rowData, undefined, ['done']);
                } catch(e) {
                  setOptimisticDone(null);
                  console.error(e);
                } finally {
                  setIsSaving(false);
                }
              }}
              className={`w-7 h-7 rounded-lg flex items-center justify-center mx-auto transition-all duration-300 ${
                isCanceled
                  ? 'opacity-20 cursor-not-allowed bg-white/5 text-muted/40'
                  : (!canModifyDone && activeGid === '1939073164')
                    ? (isDone ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.95)] ring-2 ring-emerald-300 scale-110 cursor-not-allowed opacity-90' : 'bg-white/10 text-muted cursor-not-allowed opacity-60')
                    : isDone 
                      ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.95)] ring-2 ring-emerald-300 scale-110 cursor-pointer' 
                      : 'bg-white/10 text-muted hover:bg-emerald-500/30 hover:text-emerald-300 cursor-pointer'
              }`}
              title={
                isCanceled 
                  ? "المهمة ملغية - لا يمكن إنجازها" 
                  : (!canModifyDone && activeGid === '1939073164')
                    ? (isDone ? "غير مسموح لتيم الماركتينج بإلغاء Done 🔒 (استخدم زر EDIT لطلب تعديل)" : "خاص بتيم الفيديو فقط 🔒")
                    : "تم الإنجاز"
              }
            >
              {isDone && <CheckCircle2 size={16} className="stroke-[2.5]" />}
            </button>
          </td>
          {/* Cancel Checkmark */}
          <td className="px-3 py-5 text-center cancel-cell">
            <button
              onClick={async () => {
                const rowCode = item.code || item.id;
                if (!rowCode) { alert("لا يمكن تعديل هذا الصف لعدم وجود كود (Code)"); return; }
                if (!onUpdateShootingRow) return;
                setIsSaving(true);
                const nextCanceled = !isCanceled;
                setOptimisticCanceled(nextCanceled);
                let nextDone = item.done;
                if (nextCanceled) {
                  nextDone = false;
                  setOptimisticDone(false);
                }
                const rowData = [
                  item.date,
                  editForm.branch,
                  editForm.year,
                  editForm.teacher,
                  editForm.extraName,
                  rowCode,
                  editForm.script,
                  editForm.type,
                  editForm.format,
                  item.filmed ? 'TRUE' : 'FALSE',
                  item.filmingDate,
                  editForm.by,
                  editForm.storage,
                  editForm.notes,
                  editForm.driveRaw,
                  editForm.editorCol,
                  nextDone ? 'TRUE' : 'FALSE',
                  editForm.driveFinal,
                  nextCanceled ? 'TRUE' : 'FALSE',
                  item.missingDetails ? 'TRUE' : 'FALSE'
                ];
                try {
                  await onUpdateShootingRow(rowCode, rowData, undefined, nextCanceled ? ['canceled', 'done'] : ['canceled']);
                } catch(e) {
                  setOptimisticCanceled(null);
                  console.error(e);
                } finally {
                  setIsSaving(false);
                }
              }}
              className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all duration-300 cursor-pointer cancel-action-btn no-strike ${
                isCanceled 
                  ? activeGid === '798246690' 
                    ? 'bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)] ring-2 ring-amber-300' 
                    : 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)] ring-2 ring-rose-400'
                  : activeGid === '798246690'
                    ? 'bg-white/10 text-muted hover:bg-amber-500/30 hover:text-amber-300'
                    : 'bg-white/10 text-muted hover:bg-rose-500/30 hover:text-rose-300'
              }`}
              title={activeGid === '798246690' ? (isCanceled ? "إلغاء تحديد المشكلة" : "تحديد كمشكلة") : (isCanceled ? "إلغاء الكنسلة" : "كنسل الصف")}
            >
              {isCanceled && (activeGid === '798246690' ? <AlertCircle size={14} /> : <XCircle size={14} />)}
            </button>
          </td>
          {/* EDIT Checkmark (طلب تعديل) - VE only: clicked once, cannot be unclicked, unchecks DONE */}
          {activeGid === '1939073164' && (
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
          )}
        </>
      )}
      {/* Cancel & EDIT Checkmarks for Shooting */}
      {activeGid === '1436746012' && (
        <>
          <td className="px-3 py-5 text-center cancel-cell">
            <button
              onClick={async () => {
                const rowCode = item.code || item.id;
                if (!rowCode) { alert("لا يمكن تعديل هذا الصف لعدم وجود كود (Code)"); return; }
                if (!onUpdateShootingRow) return;
                setIsSaving(true);
                const nextCanceled = !isCanceled;
                setOptimisticCanceled(nextCanceled);
                const rowData = [
                  item.date,
                  editForm.branch,
                  editForm.year,
                  editForm.teacher,
                  editForm.extraName,
                  rowCode,
                  editForm.script,
                  editForm.type,
                  editForm.format,
                  item.filmed ? 'TRUE' : 'FALSE',
                  item.filmingDate,
                  editForm.by,
                  editForm.storage,
                  editForm.notes,
                  editForm.driveRaw,
                  editForm.editorCol,
                  item.done ? 'TRUE' : 'FALSE',
                  editForm.driveFinal,
                  nextCanceled ? 'TRUE' : 'FALSE',
                  isMissing ? 'TRUE' : 'FALSE'
                ];
                try {
                  await onUpdateShootingRow(rowCode, rowData, undefined, ['canceled']);
                } catch(e) {
                  setOptimisticCanceled(null);
                  console.error(e);
                } finally {
                  setIsSaving(false);
                }
              }}
              className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all duration-300 cursor-pointer cancel-action-btn no-strike ${
                isCanceled 
                  ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)] ring-2 ring-rose-400' 
                  : 'bg-white/10 text-muted hover:bg-rose-500/30 hover:text-rose-300'
              }`}
              title={isCanceled ? "إلغاء الكنسلة" : "كنسل المهمة"}
            >
              {isCanceled && <XCircle size={14} />}
            </button>
          </td>
          {/* EDIT Checkmark (طلب تعديل) in Shooting: synced with VE */}
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
        </>
      )}
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
                placeholder="Paste Final Drive Link..."
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
              {item.driveFinal ? (
                (() => {
                  const s = String(item.driveFinal).trim();
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
                        {/* Approve / Reject buttons for privileged users when pending */}
                        {hardDriveStatus === 'pending' && isPrivilegedUser && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <button
                              onClick={async () => {
                                const tbl = activeGid === '1939073164' ? 'reels_ve_26' : 'reels_cuts_26';
                                const rowCode = item.code || item.id;
                                setOptimisticHardDriveStatus('approved');
                                try {
                                  await supabase.from(tbl).update({ hard_drive_status: 'approved', done: true, updated_at: new Date().toISOString() }).eq('code', rowCode);
                                  // Notify editor
                                  const editorName = item.editorCol || item.editor || '';
                                  if (editorName) {
                                    const editorChatId = await getUserTelegramChatId(undefined, editorName);
                                    if (editorChatId) {
                                      notifyHardDriveDecision({
                                        chatId: editorChatId,
                                        taskCode: rowCode,
                                        taskTitle: item.script || item.extraName || rowCode,
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
                                const tbl = activeGid === '1939073164' ? 'reels_ve_26' : 'reels_cuts_26';
                                const rowCode = item.code || item.id;
                                setOptimisticHardDriveStatus(null);
                                setOptimisticDone(false);
                                setEditForm(prev => ({ ...prev, driveFinal: '' }));
                                try {
                                  await supabase.from(tbl).update({ hard_drive_status: null, drive_final: '', done: false, updated_at: new Date().toISOString() }).eq('code', rowCode);
                                  // Notify editor
                                  const editorName = item.editorCol || item.editor || '';
                                  if (editorName) {
                                    const editorChatId = await getUserTelegramChatId(undefined, editorName);
                                    if (editorChatId) {
                                      notifyHardDriveDecision({
                                        chatId: editorChatId,
                                        taskCode: rowCode,
                                        taskTitle: item.script || item.extraName || rowCode,
                                        decision: 'rejected',
                                        supervisorName: profile?.name
                                      }).catch(console.error);
                                    }
                                  }
                                  if (toast?.success) toast.success('تم رفض التسليم على الهارد — يرجى رفع الملف على Drive ↩️');
                                } catch(e) {
                                  setOptimisticHardDriveStatus('pending');
                                  setOptimisticDone(true);
                                  console.error(e);
                                }
                              }}
                              className="px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                              title="رفض التسليم على الهارد وإرجاع المهمة"
                            >
                              <X size={10} /> رفض
                            </button>
                          </div>
                        )}
                        {/* Pending indicator for non-privileged */}
                        {hardDriveStatus === 'pending' && !isPrivilegedUser && (
                          <span className="text-[10px] text-yellow-400/80 font-medium">⏳ في انتظار الموافقة</span>
                        )}
                      </div>
                    );
                  }
                  const parsed = parseDriveLink(item.driveFinal);
                  return (
                    <a 
                      href={parsed.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-mono text-[11px] underline cursor-pointer shadow-sm shrink-0 truncate max-w-[220px]"
                      title={parsed.url}
                    >
                      {parsed.text}
                    </a>
                  );
                })()
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-muted/40 text-xs px-2 shrink-0">---</span>
                  {!(isMarketingUser && activeGid === '1939073164') && (
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
              {!(isMarketingUser && activeGid === '1939073164') && (
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
        </div>
      </td>

      {/* Shared Link Checkbox (PUBLISH) */}
      <td className="px-3 py-5 text-center">
        {(() => {
          const itemKey = item.code || item.id || generateKey(item);
          const isSharedChecked = publishedTasks?.[itemKey] !== undefined 
            ? publishedTasks[itemKey] === true 
            : (item.publish === true || localStorage.getItem(`shared_check_${itemKey}`) === 'true');

          return (
            <button
              onClick={() => {
                if (onTogglePublish) onTogglePublish(itemKey);
                else {
                  const nextState = !isSharedChecked;
                  localStorage.setItem(`shared_check_${itemKey}`, String(nextState));
                  setEditForm(prev => ({ ...prev }));
                }
              }}
              className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all duration-300 cursor-pointer ${
                isSharedChecked 
                  ? 'bg-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)]' 
                  : 'bg-white/10 text-muted hover:bg-cyan-500/30 hover:text-cyan-300'
              }`}
              title="PUBLISH"
            >
              {isSharedChecked && <CheckCircle2 size={14} />}
            </button>
          );
        })()}
      </td>

      {/* Shared Link URL Input & Display */}
      <td className="px-4 py-5 text-center">
        {(() => {
          const itemKey = item.code || item.id || generateKey(item);
          const sharedUrl = sharedLinks?.[itemKey] !== undefined
            ? sharedLinks[itemKey]
            : (item.sharedLink || localStorage.getItem(`shared_link_${itemKey}`) || '');
          const isEditingShared = activeCell?.colKey === 'sharedLink' && activeCell?.rowIndex === index;

          return (
            <div className="flex items-center justify-center gap-1.5">
              {isEditingShared ? (
                <input
                  autoFocus
                  type="text"
                  defaultValue={sharedUrl}
                  onBlur={(e) => {
                    if (onUpdateSharedLink) onUpdateSharedLink(itemKey, e.target.value);
                    else {
                      localStorage.setItem(`shared_link_${itemKey}`, e.target.value.trim());
                      setEditForm(prev => ({ ...prev }));
                    }
                    setActiveCell(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (onUpdateSharedLink) onUpdateSharedLink(itemKey, (e.target as HTMLInputElement).value);
                      else {
                        localStorage.setItem(`shared_link_${itemKey}`, (e.target as HTMLInputElement).value.trim());
                        setEditForm(prev => ({ ...prev }));
                      }
                      setActiveCell(null);
                    }
                  }}
                  className="w-full max-w-[150px] bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-center text-white/90 outline-none transition-all focus:bg-[#0b1019] focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 text-left"
                  placeholder="Paste Shared Link..."
                />
              ) : (
                <>
                  {sharedUrl ? (
                    (() => {
                      const parsed = parseDriveLink(sharedUrl);
                      return (
                        <a
                          href={parsed.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-mono text-[11px] underline cursor-pointer shadow-sm shrink-0 truncate max-w-[200px]"
                          title={parsed.url}
                        >
                          {parsed.text}
                        </a>
                      );
                    })()
                  ) : (
                    <span className="text-muted/40 text-xs px-2 shrink-0">---</span>
                  )}
                  <button
                    onClick={() => setActiveCell({ colKey: 'sharedLink', rowIndex: index })}
                    className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-muted hover:text-white transition-all scale-95 cursor-pointer shrink-0"
                    title="تعديل Shared Link"
                  >
                    <Pencil size={11} />
                  </button>
                </>
              )}
            </div>
          );
        })()}
      </td>
    </tr>
  );
});
