import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Check, Copy, CheckCircle2, Bell, Sparkles, Video, Pencil, Trash2, Lock, FileImage, FolderOpen, MonitorPlay, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS } from '../../lib/supabase';
import { sortMultiLineLessonName, sortCombinedFilingName } from '../../lib/chunkSort';
import {
  generateKey,
  parseDriveLink,
  getChipColor,
  getWeekColor,
  isAssignedEditor,
  getTargetStageGid,
  formatDuration
} from '../../lib/dashboardUtils';
import {
  Chip,
  InlineCombobox,
  DatePickerCell,
  HistoryInput,
  PreviewImage,
  VideoDuration
} from '../DashboardUiPrimitives';

export const OperationsRow = ({ item, index, youtubeItems, onYoutubeToggle, isSelectedForMerge, onToggleMergeSelect, selectedTeacher, selectedStageGid, isGlowing, onOpenBunnyLinkModal }: any) => {
  const { profile } = useAuth();
  const stage = getTargetStageGid(item);
  const itemKey = item.uniqueKey || generateKey(item);
  const isYoutubeChecked = (youtubeItems?.[stage.gid] || []).some((i: any) => 
    i.uniqueKey === ('yt-' + itemKey) || (i.mergedItemKeys && i.mergedItemKeys.includes(itemKey))
  );

  const finalM = (item.finalMinutes && String(item.finalMinutes).trim() !== '0') ? item.finalMinutes : item.rawMinutes;
  const duration = item.exactDuration || formatDuration(finalM);

  const isPostponed = Object.values(item).some(
    val => typeof val === 'string' && val.toUpperCase().includes('POSTPONED')
  );

  const isDifferentTeacher = Boolean(
    selectedTeacher &&
    item.teacher &&
    item.teacher.trim().toLowerCase() !== selectedTeacher.toLowerCase()
  );
  const isDifferentStage = Boolean(
    selectedStageGid &&
    stage.gid !== selectedStageGid
  );
  const isMergeLocked = isDifferentTeacher || isDifferentStage;
  const mergeLockTitle = isDifferentTeacher
    ? `مدرس مختلف (${item.teacher}) - تم قفل التحديد لأنك محدد دروس للمدرس (${selectedTeacher})`
    : isDifferentStage
      ? 'مرحلة دراسية مختلفة - لا يمكن الدمج إلا لنفس المرحلة'
      : 'تحديد لإضافتها لتجميعة يوتيوب';

  return (
    <motion.tr
      id={itemKey}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.01 }}
      className={`transition-all duration-500 border-b border-white/[0.03] row-hover ${
        isGlowing 
          ? 'bg-emerald-500/20 shadow-[inset_0_0_25px_rgba(16,185,129,0.4)] ring-2 ring-emerald-500/50 border-emerald-500/50 animate-pulse relative z-10' 
          : isPostponed
            ? 'bg-yellow-500/10 shadow-[inset_0_0_25px_rgba(234,179,8,0.15)] ring-1 ring-yellow-500/30 border-yellow-500/30'
            : isYoutubeChecked 
              ? 'bg-purple-600/[0.08]' 
              : isSelectedForMerge 
                ? 'bg-purple-500/[0.04]' 
                : ''
      }`}
    >
      <td className="px-8 py-5" dir="rtl">
        <div className="flex flex-col text-right">
          <span className="text-sm font-bold arabic-text mb-1 whitespace-pre-wrap leading-relaxed tracking-wide text-white/95">{item.name}</span>
          <span className="text-[10px] text-muted font-black opacity-40 uppercase tracking-[0.2em]">{item.filingName || 'NO-FILING'}</span>
        </div>
      </td>
      <td className="px-3 py-5 text-center"><Chip value={item.teacher} /></td>
      <td className="px-3 py-5 text-center">
        <div className="flex flex-col gap-1 items-center">
          <span className="chip-base bg-white/5 border-white/10 text-muted">{item.term}</span>
          <span className="chip-base bg-primary/10 border-primary/20 text-primary">{item.year}</span>
        </div>
      </td>
      <td className="px-3 py-5 text-center"><Chip value={item.smartboard} /></td>
      <td className="px-3 py-5 text-center">
        {item.linkBunny ? (
          <a
            href={item.linkBunny}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/40 transition-all inline-block shadow-sm cursor-pointer"
          >
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[11px] font-black text-purple-400 leading-none">{item.date || 'فيديو'}</span>
              {duration && (
                <span className="text-[11px] font-black text-purple-300 leading-none mt-1.5 whitespace-nowrap">
                  <VideoDuration url={item.linkBunny} fallback={duration} />
                </span>
              )}
            </div>
          </a>
        ) : (
          <button
            onClick={() => {
              if (profile?.role && PERMISSIONS.canEditBunnyLinks(profile.role)) {
                onOpenBunnyLinkModal(item.uniqueKey || generateKey(item), item.name, item.linkBunny || '');
              }
            }}
            className={`px-3.5 py-2 rounded-xl transition-all inline-block shadow-sm text-center ${profile?.role && PERMISSIONS.canEditBunnyLinks(profile.role) ? 'bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/40 active:scale-95 cursor-pointer' : 'bg-white/5 border border-white/10 text-muted opacity-50 cursor-not-allowed'}`}
            title="اضغط لإضافة رابط فيديو Bunny"
            disabled={!(profile?.role && PERMISSIONS.canEditBunnyLinks(profile.role))}
          >
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[11px] font-black text-purple-400 leading-none">{item.date || '---'}</span>
              {duration && (
                <span className="text-[11px] font-black text-purple-300 leading-none mt-1.5 whitespace-nowrap">
                  ⏱️ {duration}
                </span>
              )}
            </div>
          </button>
        )}
      </td>
      <td className="px-4 py-5 text-center">
        <button
          onClick={() => onYoutubeToggle(item, !isYoutubeChecked)}
          disabled={!(profile?.role && PERMISSIONS.canAddEntry(profile.role))}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center mx-auto transition-all duration-300 ${
            isYoutubeChecked 
              ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.6)] scale-110 ring-2 ring-purple-400' 
              : 'bg-white/5 text-muted'
          } ${profile?.role && PERMISSIONS.canAddEntry(profile.role) ? 'cursor-pointer hover:bg-purple-500/20 hover:text-purple-400' : 'opacity-50 cursor-not-allowed'}`}
        >
          <MonitorPlay size={22} className={isYoutubeChecked ? 'animate-pulse' : ''} />
        </button>
      </td>
      <td className="px-4 py-5 text-center">
        <input
          type="checkbox"
          checked={isSelectedForMerge}
          onChange={() => onToggleMergeSelect(item)}
          disabled={!(profile?.role && PERMISSIONS.canAddEntry(profile.role))}
          className={`w-5 h-5 accent-purple-600 rounded transition-all ${
            profile?.role && PERMISSIONS.canAddEntry(profile.role)
              ? isMergeLocked
                ? 'opacity-25 cursor-not-allowed filter grayscale'
                : 'cursor-pointer hover:scale-110'
              : 'cursor-not-allowed opacity-50'
          }`}
          title={mergeLockTitle}
        />
      </td>
    </motion.tr>
  );
};

// ─── Tagme3at Row ─────────────────────────────────────────────────────────────
export const TagmeRow = ({ 
  item, 
  index, 
  isSimple = false,
  onUpdateEditor, 
  editorsList, 
  onUpdateEditorNotes, 
  onUpdateMarketingNotes, 
  opSheetsList, 
  branchesList, 
  onUpdateOpSheet, 
  onUpdateBranch, 
  onUpdateDate, 
  isGlowing, 
  liveData, 
  canRaisePriority, 
  priorityLimit, 
  onStatusChange, 
  isSubscribed, 
  onToggleSubscribe, 
  priorityOverride, 
  statusOverride,
  onUpdateThumbnailLink,
  onUpdateTime,
  onUpdateYoutubeLink,
  onUpdateUploaded,
  onShowPriorityLimitModal
}: any) => {
  const { profile } = useAuth();
  const done = statusOverride?.done === true || item.done === true || String(item.done) === 'true';
  const cancel = statusOverride?.cancel === true || item.cancel === true || String(item.cancel) === 'true';
  const isMissing = statusOverride?.missingDetails !== undefined
    ? statusOverride.missingDetails === true
    : (item.missingDetails === true || item.missing_details === true || cancel);
  const priority = !done && (priorityOverride === true || item.priority === true || String(item.priority) === 'true');
  const [copied, setCopied] = useState(false);

  const [thumbnailVal, setThumbnailVal] = useState(item.thumbnailLink || '');
  const [isEditingThumbnail, setIsEditingThumbnail] = useState(false);
  const [timeVal, setTimeVal] = useState(item.time || '');
  const [youtubeVal, setYoutubeVal] = useState(item.youtubeLink || '');
  const [isEditingYoutube, setIsEditingYoutube] = useState(false);
  const [isUploaded, setIsUploaded] = useState(item.uploaded === true || String(item.uploaded) === 'true');

  useEffect(() => {
    setThumbnailVal(item.thumbnailLink || '');
  }, [item.thumbnailLink]);

  useEffect(() => {
    setTimeVal(item.time || '');
  }, [item.time]);

  useEffect(() => {
    setYoutubeVal(item.youtubeLink || '');
  }, [item.youtubeLink]);

  useEffect(() => {
    setIsUploaded(item.uploaded === true || String(item.uploaded) === 'true');
  }, [item.uploaded]);

  const handleCopy = () => {
    navigator.clipboard.writeText(item.name || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toInputDate = (dStr: string) => {
    if (!dStr || dStr === '---') return '';
    const parts = dStr.split('/');
    if (parts.length === 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return '';
  };

  const fromInputDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parseInt(parts[1], 10).toString();
      const day = parseInt(parts[2], 10).toString();
      return `${month}/${day}/${year}`;
    }
    return '';
  };

  const originalKey = item.uniqueKey ? String(item.uniqueKey).replace('tgm-', '') : '';
  const matchedItem = liveData?.find((i: any) => (i.uniqueKey || generateKey(i)) === originalKey);
  const date = item.date || matchedItem?.date || '---';

  return (
    <motion.tr
      id={item.uniqueKey || generateKey(item)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`transition-all duration-500 border-b border-white/[0.03] row-hover group/row ${
        isGlowing 
          ? 'bg-emerald-500/20 shadow-[inset_0_0_25px_rgba(16,185,129,0.4)] ring-2 ring-emerald-500/50 border-emerald-500/50 animate-pulse relative z-10' 
          : done 
            ? 'bg-emerald-500/[0.03]' 
            : priority 
              ? 'bg-purple-600/[0.05]' 
              : isMissing 
                ? 'bg-amber-500/[0.03]' 
                : isAssignedEditor(item.editor)
                ? 'bg-orange-500/[0.02]'
                : ''
      }`}
    >
      <td className="px-8 py-6" dir="rtl">
        <div className="flex items-center justify-end gap-4 min-w-[280px] text-right">
          <div className="flex flex-col text-right">
            <span className="text-base font-bold arabic-text mb-1 whitespace-pre-wrap leading-relaxed tracking-wide text-white/95">{item.name}</span>
            {item.filingName && item.filingName !== item.name && (
              <span className="text-[10px] text-muted font-black opacity-40 uppercase tracking-[0.15em]">{item.filingName}</span>
            )}
          </div>
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className={`w-2.5 h-12 rounded-full transition-all duration-500 ${
              done 
                ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]' 
                : priority 
                ? 'bg-purple-600 shadow-[0_0_16px_rgba(147,51,234,0.9)] animate-pulse' 
                : isMissing 
                ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]' 
                : isAssignedEditor(item.editor)
                ? 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.6)]'
                : 'bg-white/5 border border-white/5 opacity-0 group-hover/row:opacity-30'
            }`} />
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCopy}
                className={`transition-all duration-300 cursor-pointer p-0.5 ${copied ? 'text-emerald-400 opacity-100 scale-110' : 'text-white opacity-10 hover:opacity-80'}`}
                title="نسخ المسارات"
              >
                {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
              </button>
              <button 
                onClick={onToggleSubscribe}
                className={`transition-all duration-300 cursor-pointer p-1.5 rounded-lg border flex items-center justify-center ${
                  isSubscribed 
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-400 scale-105 shadow-[0_0_10px_rgba(244,63,94,0.2)]' 
                    : 'border-white/10 bg-white/5 text-white/30 hover:border-white/30 hover:bg-white/10 hover:text-white/60'
                }`}
                title={isSubscribed ? 'إلغاء المتابعة' : 'متابعة هذه التجميعة'}
              >
                <Bell size={12} className={isSubscribed ? 'animate-pulse' : ''} />
              </button>
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-6 text-center">
        <select
          value={item.opSheet || ''}
          onChange={(e) => onUpdateOpSheet(item.uniqueKey || generateKey(item), e.target.value)}
          disabled={!(profile?.role && PERMISSIONS.canEditEditors(profile.role))}
          className={`bg-white/5 border border-white/10 hover:border-emerald-500/50 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none transition-all shadow-lg focus:ring-2 focus:ring-emerald-500/50 min-w-[90px] ${profile?.role && PERMISSIONS.canEditEditors(profile.role) ? 'cursor-pointer hover:bg-white/10' : 'cursor-not-allowed opacity-50'}`}
        >
          <option value="" className="bg-[#0b1019] text-muted">غير محدد</option>
          {opSheetsList?.map((sheet: string) => (
            <option key={sheet} value={sheet} className="bg-[#0b1019] text-white font-bold">{sheet}</option>
          ))}
        </select>
      </td>
      {!isSimple && (
        <td className="px-3 py-6 text-center">
          <input
            type="date"
            value={toInputDate(date)}
            onChange={(e) => {
              const newDate = fromInputDate(e.target.value);
              onUpdateDate(item.uniqueKey || generateKey(item), newDate);
            }}
            style={{ colorScheme: 'dark' }}
            disabled={!(profile?.role && PERMISSIONS.canEditEditors(profile.role))}
            className={`bg-white/5 border border-white/10 hover:border-emerald-500/50 rounded-xl px-2 py-1 text-xs font-bold text-white text-center outline-none focus:bg-[#0b1019] focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-inner font-mono max-w-[125px] ${profile?.role && PERMISSIONS.canEditEditors(profile.role) ? '' : 'cursor-not-allowed opacity-50'}`}
          />
        </td>
      )}
      <td className="px-3 py-6 text-center">
        {(() => {
          const currentBranch = (item.branch && !item.branch.includes('يوتيوب') && !item.branch.includes('تجميعة')) ? item.branch : '';
          const bUpper = String(currentBranch).toUpperCase();
          const isAlex = bUpper.includes('ALEX') || bUpper.includes('اسكندر') || bUpper.includes('إسكندر');
          const isCairo = bUpper.includes('CAIRO') || bUpper.includes('قاهر');
          const isDesouk = bUpper.includes('DESOUK') || bUpper.includes('دسوق') || bUpper.includes('دسور');

          const containerStyle = isAlex
            ? 'bg-blue-500/15 border-blue-500/40 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.25)] ring-1 ring-blue-500/30'
            : isCairo
            ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.25)] ring-1 ring-rose-500/30'
            : isDesouk
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/30'
            : 'bg-white/5 border-white/10 text-white hover:border-emerald-500/50';

          const dotElement = isAlex ? (
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.9)] shrink-0 animate-pulse" title="اسكندرية" />
          ) : isCairo ? (
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] shrink-0 animate-pulse" title="القاهرة" />
          ) : isDesouk ? (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] shrink-0 animate-pulse" title="دسوق" />
          ) : null;

          const renderBranchOption = (b: string) => {
            const up = String(b).toUpperCase();
            if (up.includes('ALEX') || up.includes('اسكندر') || up.includes('إسكندر')) return `🔵 ${b}`;
            if (up.includes('CAIRO') || up.includes('قاهر')) return `🔴 ${b}`;
            if (up.includes('DESOUK') || up.includes('دسوق') || up.includes('دسور')) return `🟢 ${b}`;
            return b;
          };

          return (
            <div className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 border transition-all duration-300 ${containerStyle} ${profile?.role && PERMISSIONS.canEditEditors(profile.role) ? 'hover:bg-white/10' : 'opacity-60'}`}>
              {dotElement}
              <select
                value={currentBranch}
                onChange={(e) => onUpdateBranch(item.uniqueKey || generateKey(item), e.target.value)}
                disabled={!(profile?.role && PERMISSIONS.canEditEditors(profile.role))}
                className={`bg-transparent text-xs font-black outline-none transition-all ${profile?.role && PERMISSIONS.canEditEditors(profile.role) ? 'cursor-pointer' : 'cursor-not-allowed'} ${isAlex ? 'text-blue-300' : isCairo ? 'text-rose-300' : isDesouk ? 'text-emerald-300' : 'text-white'}`}
              >
                <option value="" className="bg-[#0b1019] text-muted">غير محدد</option>
                {item.branch && !item.branch.includes('يوتيوب') && !item.branch.includes('تجميعة') && !branchesList?.includes(item.branch) && (
                  <option value={item.branch} className="bg-[#0b1019] text-white font-bold">{renderBranchOption(item.branch)}</option>
                )}
                {branchesList?.filter((b: string) => !b.includes('يوتيوب') && !b.includes('تجميعة')).map((branch: string) => (
                  <option key={branch} value={branch} className="bg-[#0b1019] text-white font-bold">{renderBranchOption(branch)}</option>
                ))}
              </select>
            </div>
          );
        })()}
      </td>
      <td className="px-3 py-6 text-center">
        <HistoryInput
          itemKey={item.uniqueKey || generateKey(item)}
          fieldKey="mktg_notes"
          value={item.notesMarketing || ''}
          updatedAt={item.notesMarketingUpdatedAt || item.updatedAt}
          updatedBy={item.notesMarketingUpdatedBy}
          onChange={(val: string, nowIso?: string, user?: string) => onUpdateMarketingNotes(item.uniqueKey || generateKey(item), val, undefined, nowIso, user)}
          placeholder="أضف ملاحظة..."
          disabled={!(profile?.role && PERMISSIONS.canEditNotes(profile.role))}
        />
      </td>
      <td className="px-3 py-6 text-center min-w-[130px]">
        {profile?.role && PERMISSIONS.canEditEditors(profile.role) ? (
          <div className="inline-block min-w-[120px] max-w-[160px]">
            <InlineCombobox
              options={editorsList}
              value={item.editor === 'غير محدد' ? '' : (item.editor || '')}
              onChange={(val: string) => onUpdateEditor(item.uniqueKey || generateKey(item), val || 'غير محدد')}
              placeholder="غير محدد"
            />
          </div>
        ) : (
          <div className="flex justify-center">
            {(() => {
              const chip = getChipColor(item.editor);
              return (
                <span 
                  style={chip.style}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${chip.bg || ''} ${chip.text || ''} ${chip.border || ''}`}
                >
                  {chip.dot && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: chip.dot }} />}
                  <span>{item.editor || 'غير محدد'}</span>
                </span>
              );
            })()}
          </div>
        )}
      </td>
      <td className="px-3 py-6 text-center">
        <div className="flex justify-center gap-3">
          <button
            onClick={() => {
              const newDone = !done;
              if (onStatusChange) {
                onStatusChange(item.uniqueKey || generateKey(item), item.name, item.editor || '', newDone ? 'done' : 'undone');
              }
            }}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
              done 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105' 
                : 'bg-white/5 text-muted hover:bg-emerald-500/10 hover:text-emerald-400 hover:scale-105 active:scale-95'
            }`}
            title="Done"
          >
            <CheckCircle2 size={20} />
          </button>
          <button
            onClick={() => {
              const newMissing = !isMissing;
              if (onStatusChange) {
                onStatusChange(item.uniqueKey || generateKey(item), item.name, item.editor || '', newMissing ? 'missing_details' : 'unmissing_details');
              }
            }}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
              isMissing 
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 scale-105' 
                : 'bg-white/5 text-muted hover:bg-amber-500/10 hover:text-amber-400 hover:scale-105 active:scale-95'
            }`}
            title={isMissing ? "إلغاء تفاصيل ناقصة" : "تفاصيل ناقصة"}
          >
            <AlertCircle size={20} />
          </button>
        </div>
      </td>
      {!isSimple && (
        <td className="px-3 py-6 text-center">
          <HistoryInput
            itemKey={item.uniqueKey || generateKey(item)}
            fieldKey="editor_notes"
            value={item.notesEditors || ''}
            updatedAt={item.notesEditorsUpdatedAt || item.updatedAt}
            updatedBy={item.notesEditorsUpdatedBy || (item.editor && item.editor !== 'غير محدد' ? item.editor : undefined)}
            fallbackAuthor={item.editor && item.editor !== 'غير محدد' ? item.editor : undefined}
            onChange={(val: string, nowIso?: string, user?: string) => onUpdateEditorNotes(item.uniqueKey || generateKey(item), val, undefined, nowIso, user)}
            placeholder="اكتب ملاحظة..."
            disabled={!(profile?.role && PERMISSIONS.canEditNotes(profile.role))}
          />
        </td>
      )}
      <td className="px-6 py-6 text-center">
          <button
            onClick={() => {
              if (!priority && !canRaisePriority) {
                if (onShowPriorityLimitModal) {
                  onShowPriorityLimitModal(priorityLimit);
                } else {
                  console.warn(`⚠️ تم الوصول للحد الأقصى للأولوية (${priorityLimit} مهام)`);
                }
                return;
              }
              const newPriority = !priority;
              const editor = item.editor;
              if (onStatusChange) {
                onStatusChange(item.uniqueKey || generateKey(item), item.name, editor || 'غير محدد', newPriority ? 'priority' : 'unpriority');
              }
            }}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center mx-auto transition-all duration-500 cursor-pointer ${
              priority 
                ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.6)] ring-2 ring-purple-400 scale-110 animate-pulse' 
                : !canRaisePriority
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 hover:scale-105'
                  : 'bg-white/5 text-muted hover:bg-purple-500/20 hover:text-purple-400 hover:scale-105 active:scale-95'
            }`}
            title={!priority && !canRaisePriority ? `تم الوصول للحد اليومي (${priorityLimit}) - انقر للتفاصيل` : 'Priority'}
          >
            <AlertCircle size={20} />
          </button>
      </td>
    </motion.tr>
  );
};

export const StageRow = ({ item, index, tagmeTransfers, onTagmeToggle, activeLabel, isGlowing, onUpdateDate, onUpdateWeek, onUpdateThumbnailLink, onUpdateTime, onUpdateYoutubeLink, onUpdateUploaded, onToggleDelivered, onDeleteRow }: any) => {
  const { profile } = useAuth();
  const rowKey = item.uniqueKey || generateKey(item);
  const itemKey = 'tgm-' + rowKey;
  const isTagmeChecked = item.isTagme3a === true || (tagmeTransfers || []).some((i: any) => i.uniqueKey === itemKey);
  const [received, setReceived] = useState(item.delivered === true || item.check2 === true || item.received === true);
  const [weekVal, setWeekVal] = useState(item.week || '');
  const [dateVal, setDateVal] = useState(item.date || item.id || '');
  const [thumbnailVal, setThumbnailVal] = useState(item.thumbnailLink || '');
  const [isEditingThumbnail, setIsEditingThumbnail] = useState(false);
  const [timeVal, setTimeVal] = useState(item.time || '');
  const [youtubeVal, setYoutubeVal] = useState(item.youtubeLink || '');
  const [isEditingYoutube, setIsEditingYoutube] = useState(false);
  const [isUploaded, setIsUploaded] = useState(item.uploaded === true || item.uploaded === 'true' || item.uploaded === 'TRUE');

  useEffect(() => {
    setReceived(item.delivered === true || item.check2 === true || item.received === true);
  }, [item.delivered, item.check2, item.received]);

  useEffect(() => {
    setThumbnailVal(item.thumbnailLink || '');
  }, [item.thumbnailLink]);

  useEffect(() => {
    setTimeVal(item.time || '');
  }, [item.time]);

  useEffect(() => {
    setYoutubeVal(item.youtubeLink || '');
  }, [item.youtubeLink]);

  useEffect(() => {
    setIsUploaded(item.uploaded === true || item.uploaded === 'true' || item.uploaded === 'TRUE');
  }, [item.uploaded]);

  useEffect(() => {
    setWeekVal(item.week || '');
  }, [item.week]);

  useEffect(() => {
    setDateVal(item.date || item.id || '');
  }, [item.date, item.id]);

  const toInputDate = (dStr: string) => {
    if (!dStr || dStr === '---') return '';
    const parts = dStr.split('/');
    if (parts.length === 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      let year = parts[2];
      if (year.length === 2) year = '20' + year;
      return `${year}-${month}-${day}`;
    }
    return dStr;
  };

  const fromInputDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parseInt(parts[1], 10).toString();
      const day = parseInt(parts[2], 10).toString();
      return `${month}/${day}/${year}`;
    }
    return dStr;
  };



  return (
    <motion.tr
      id={item.uniqueKey || generateKey(item)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.01 }}
      className={`transition-all duration-300 border-b border-white/[0.03] row-hover group/row ${
        isGlowing 
          ? 'bg-emerald-500/20 shadow-[inset_0_0_25px_rgba(16,185,129,0.4)] ring-2 ring-emerald-500/50 border-emerald-500/50 animate-pulse relative z-10' 
          : isTagmeChecked 
            ? 'bg-emerald-500/[0.08]' 
            : ''
      }`}
    >
      <td className="px-4 py-5 text-center">
        <select
          value={weekVal}
          onChange={(e) => {
            const newVal = e.target.value;
            setWeekVal(newVal);
            if (onUpdateWeek && newVal !== item.week) {
              onUpdateWeek(rowKey, newVal);
            }
          }}
          disabled={!(profile?.role && PERMISSIONS.canEditEditors(profile.role))}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold arabic-text text-center outline-none focus:ring-2 focus:ring-primary/50 transition-all max-w-[140px] cursor-pointer ${getWeekColor(weekVal)} ${profile?.role && PERMISSIONS.canEditEditors(profile.role) ? 'hover:bg-white/10' : 'cursor-not-allowed opacity-70'}`}
        >
          <option value="" className="bg-[#0b1019] text-muted">اختر الأسبوع...</option>
          {Array.from({ length: 12 }, (_, i) => `أسبوع ${i + 1}`).map((w) => (
            <option key={w} value={w} className="bg-[#0b1019] text-white font-bold">{w}</option>
          ))}
          <option value="مراجعة شهر أول" className="bg-[#0b1019] text-amber-400 font-bold">مراجعة شهر أول</option>
          <option value="مراجعة شهر تاني" className="bg-[#0b1019] text-amber-400 font-bold">مراجعة شهر تاني</option>
          <option value="مراجعة شهر تالت" className="bg-[#0b1019] text-amber-400 font-bold">مراجعة شهر تالت</option>
          <option value="مراجعات نهائية" className="bg-[#0b1019] text-purple-400 font-bold">مراجعات نهائية</option>
        </select>
      </td>
      <td className="px-4 py-5 text-center">
        <DatePickerCell
          value={dateVal}
          disabled={!(profile?.role && PERMISSIONS.canEditEditors(profile.role))}
          onChange={(newDate) => {
            setDateVal(newDate);
            if (onUpdateDate) {
              onUpdateDate(rowKey, newDate);
            }
          }}
        />
      </td>
      <td className="px-6 py-5" dir="rtl">
        <div className="flex flex-col text-right min-w-[280px] max-w-[480px]">
          <span className="text-sm font-bold arabic-text mb-1 whitespace-pre-wrap leading-relaxed tracking-wide text-white/95 break-words">
            {sortMultiLineLessonName(item.name)}
          </span>
          {item.filingName && item.filingName !== item.name && (
            <span className="text-[10px] text-muted font-black opacity-40 uppercase tracking-[0.15em] break-words">
              {sortCombinedFilingName(item.filingName, item.name)}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-5 text-center"><Chip value={item.subject} /></td>
      <td className="px-3 py-5 text-center"><Chip value={item.branch || item.extra} /></td>
      <td className="px-3 py-5 text-center">
        <Chip value={
          (() => {
            const raw = String(item.opSheet || item.val || '').trim();
            if (raw === 'OP 26/27' || raw === '2026/2027' || raw.includes('26/27')) return 'OP 26/27';
            if (raw === 'العمليات' || raw === '2025/2026' || item.isYoutubeTransfer) return '2025/2026';
            return raw || '2025/2026';
          })()
        } />
      </td>
      <td className="px-6 py-5 text-center">
        <button
          onClick={() => onTagmeToggle(item, activeLabel, !isTagmeChecked)}
          disabled={!(profile?.role && PERMISSIONS.canAddEntry(profile.role))}
          className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all duration-300 ${isTagmeChecked ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400 scale-110' : 'bg-white/5 text-muted hover:bg-emerald-500/10 hover:text-emerald-400'} ${!(profile?.role && PERMISSIONS.canAddEntry(profile.role)) && 'opacity-50 cursor-not-allowed'}`}
        >
          <CheckCircle2 size={18} />
        </button>
      </td>
      <td className="px-6 py-5 text-center">
        <button
          onClick={() => {
            const nextVal = !received;
            setReceived(nextVal);
            if (onToggleDelivered) onToggleDelivered(rowKey, nextVal);
          }}
          disabled={!(profile?.role && PERMISSIONS.canAddEntry(profile.role))}
          title={received ? "Uploaded ✓" : "Upload"}
          className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all duration-300 ${received ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-muted hover:bg-blue-500/10 hover:text-blue-400'} ${!(profile?.role && PERMISSIONS.canAddEntry(profile.role)) && 'opacity-50 cursor-not-allowed'}`}
        >
          <CheckCircle2 size={18} />
        </button>
      </td>
      <td className="px-3 py-5 text-center">
        <div className="flex items-center justify-center gap-1.5">
          {isEditingThumbnail ? (
            <input 
              autoFocus
              type="text" 
              value={thumbnailVal} 
              onChange={e => setThumbnailVal(e.target.value)}
              onBlur={() => {
                setIsEditingThumbnail(false);
                if (thumbnailVal !== item.thumbnailLink && onUpdateThumbnailLink) {
                  onUpdateThumbnailLink(rowKey, thumbnailVal);
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              className="w-full max-w-[120px] bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl px-2 py-1 text-xs font-bold text-center text-white/90 outline-none transition-all focus:bg-[#0b1019] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 text-left" 
              placeholder="Paste link..."
            />
          ) : (
            <div className="flex items-center justify-center gap-1.5">
              {item.thumbnailLink ? (
                (() => {
                  const parsed = parseDriveLink(item.thumbnailLink);
                  return (
                    <div className="flex flex-col items-center gap-1.5">
                      <a 
                        href={parsed.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="px-2 py-1 rounded-lg bg-blue-500/15 text-blue-400 font-mono text-[10px] underline cursor-pointer shadow-sm truncate max-w-[110px]"
                        title={parsed.url}
                      >
                        {parsed.url}
                      </a>
                      <div 
                        onClick={() => parsed.url && window.open(parsed.url, '_blank')}
                        className="relative group/preview mt-1.5 w-32 h-20 rounded-xl overflow-hidden border border-white/10 hover:border-blue-500/50 shadow-md bg-white/5 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
                        title="عرض الملف"
                      >
                        <PreviewImage url={item.thumbnailLink} />
                      </div>
                    </div>
                  );
                })()
              ) : (
                <span className="text-muted/40 text-xs px-2 shrink-0">---</span>
              )}
              <button 
                onClick={() => setIsEditingThumbnail(true)} 
                className="p-1 rounded-full bg-white/5 hover:bg-white/15 text-muted hover:text-white transition-all scale-90 cursor-pointer shrink-0" 
                title="تعديل الثمنيل"
              >
                <Pencil size={9} />
              </button>
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-5 text-center">
        <input
          type="text"
          value={timeVal}
          onChange={e => setTimeVal(e.target.value)}
          onBlur={() => {
            if (timeVal !== item.time && onUpdateTime) {
              onUpdateTime(rowKey, timeVal);
            }
          }}
          placeholder="0:00:00"
          className="bg-white/5 border border-white/10 hover:border-emerald-500/50 rounded-xl px-2 py-1 text-xs font-bold text-emerald-400 text-center outline-none focus:bg-[#0b1019] focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-inner font-mono w-24"
        />
      </td>
      <td className="px-3 py-5 text-center">
        <div className="flex items-center justify-center gap-1.5">
          {isEditingYoutube ? (
            <input 
              autoFocus
              type="text" 
              value={youtubeVal} 
              onChange={e => setYoutubeVal(e.target.value)}
              onBlur={() => {
                setIsEditingYoutube(false);
                if (youtubeVal !== item.youtubeLink && onUpdateYoutubeLink) {
                  onUpdateYoutubeLink(rowKey, youtubeVal);
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              className="w-full max-w-[120px] bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl px-2 py-1 text-xs font-bold text-center text-white/90 outline-none transition-all focus:bg-[#0b1019] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 text-left" 
              placeholder="Paste Youtube..."
            />
          ) : (
            <div className="flex items-center justify-center gap-1.5">
              {item.youtubeLink ? (
                (() => {
                  const parsed = parseDriveLink(item.youtubeLink);
                  return (
                    <a 
                      href={parsed.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="px-2 py-1 rounded-lg bg-red-500/15 text-red-400 font-mono text-[10px] underline cursor-pointer shadow-sm truncate max-w-[110px]"
                      title={parsed.url}
                    >
                      {parsed.url}
                    </a>
                  );
                })()
              ) : (
                <span className="text-muted/40 text-xs px-2 shrink-0">---</span>
              )}
              <button 
                onClick={() => setIsEditingYoutube(true)} 
                className="p-1 rounded-full bg-white/5 hover:bg-white/15 text-muted hover:text-white transition-all scale-90 cursor-pointer shrink-0" 
                title="تعديل رابط اليوتيوب"
              >
                <Pencil size={9} />
              </button>
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-5 text-center">
        <button
          onClick={() => {
            const nextVal = !isUploaded;
            setIsUploaded(nextVal);
            onUpdateUploaded && onUpdateUploaded(rowKey, nextVal);
          }}
          className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all duration-300 cursor-pointer ${
            isUploaded ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/10 text-muted hover:bg-emerald-500/30 hover:text-emerald-300'
          }`}
          title="تم الرفع؟"
        >
          {isUploaded && <CheckCircle2 size={14} />}
        </button>
      </td>
      <td className="px-3 py-5 text-center">
        <button
          onClick={() => onDeleteRow && onDeleteRow(item)}
          disabled={!(profile?.role && PERMISSIONS.canAddEntry(profile.role))}
          className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto transition-all ${
            profile?.role && PERMISSIONS.canAddEntry(profile.role)
              ? 'text-muted/40 hover:text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 cursor-pointer opacity-70 hover:opacity-100 hover:scale-110 active:scale-95'
              : 'text-muted/20 cursor-not-allowed opacity-30'
          }`}
          title="حذف هذا الدرس من المرحلة"
        >
          <Trash2 size={15} />
        </button>
      </td>
    </motion.tr>
  );
};
