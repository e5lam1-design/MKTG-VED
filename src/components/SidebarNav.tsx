import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Pin, ChevronRight, ChevronDown } from 'lucide-react';
import { PERMISSIONS } from '../lib/supabase';
import { STAGE_WITH_BADGE_MAP, GREEN_DONE_BADGE_GIDS } from '../lib/dashboardUtils';

export const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick, 
  colorHex, 
  colorful, 
  isPinned, 
  onTogglePin, 
  badgeCount, 
  inProgressCount,
  missingDetailsCount,
  showDoneGreenBadge,
  lightMode,
  badgeTitle 
}: any) => {
  const cHex = colorHex || '#3b82f6';
  const isLight = lightMode ?? (typeof document !== 'undefined' && document.documentElement.classList.contains('light-mode'));

  const bgStyle = colorful
    ? (active 
        ? { backgroundColor: isLight ? `${cHex}24` : `${cHex}35`, color: isLight ? '#0f172a' : '#ffffff', borderColor: `${cHex}80`, boxShadow: isLight ? `0 4px 16px ${cHex}28` : `0 0 25px ${cHex}40` } 
        : { backgroundColor: isLight ? `${cHex}14` : `${cHex}18`, color: isLight ? '#1e293b' : '#ffffff', borderColor: isLight ? `${cHex}35` : `${cHex}30` })
    : (active
        ? (isLight
            ? { backgroundColor: `rgba(99, 102, 241, 0.13)`, color: '#1e1b4b', borderColor: `rgba(99, 102, 241, 0.35)`, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.12)' }
            : { backgroundColor: `rgba(255,255,255,0.08)`, color: '#ffffff', borderColor: `rgba(255,255,255,0.15)` })
        : { backgroundColor: `transparent`, color: isLight ? '#475569' : '#94a3b8', borderColor: `transparent` });

  const iconBgStyle = colorful
    ? (active 
        ? { backgroundColor: cHex, color: '#ffffff', boxShadow: isLight ? `0 4px 12px ${cHex}55` : `0 0 20px ${cHex}` } 
        : { backgroundColor: isLight ? `${cHex}25` : `${cHex}30`, color: cHex })
    : (active
        ? { backgroundColor: `#3b82f6`, color: '#ffffff', boxShadow: isLight ? `0 4px 14px rgba(59,130,246,0.4)` : `0 0 20px rgba(59,130,246,0.5)` }
        : { backgroundColor: isLight ? `#e2e8f0` : `rgba(255,255,255,0.05)`, color: isLight ? '#475569' : '#94a3b8' });

  const hasPending = typeof badgeCount === 'number' && badgeCount > 0;
  const hasInProgress = typeof inProgressCount === 'number' && inProgressCount > 0;
  const hasMissing = typeof missingDetailsCount === 'number' && missingDetailsCount > 0;
  const hasAnyPending = hasPending || hasInProgress || hasMissing;
  const isAllDone = showDoneGreenBadge && 
    (typeof badgeCount === 'number' || typeof inProgressCount === 'number' || typeof missingDetailsCount === 'number') && 
    !hasAnyPending;

  return (
    <button
      onClick={onClick}
      style={bgStyle}
      className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl border transition-all duration-300 group cursor-pointer ${
        active 
          ? 'font-black scale-[1.03]' 
          : `hover:scale-[1.01] ${isLight ? 'hover:bg-slate-200/70' : 'hover:brightness-125'} opacity-85 hover:opacity-100`
      }`}
    >
      <div style={iconBgStyle} className="p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110 flex items-center justify-center shrink-0">
        <Icon size={20} />
      </div>
      <span style={isLight ? { color: bgStyle.color } : undefined} className={`font-bold text-sm tracking-tight truncate text-left flex-1 ${isLight ? '' : 'text-white'}`}>{label}</span>
      
      {/* Badges Container: Yellow (Problem/Missing) + Orange (In Progress) + Red (Unassigned Pending) / Green checkmark for done */}
      <div className="flex items-center gap-1.5 shrink-0">
        <AnimatePresence>
          {hasMissing && (
            <motion.span 
              key="badge-missing"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="px-2 py-0.5 min-w-[22px] h-[22px] rounded-full bg-amber-500 text-slate-950 text-[11px] font-mono font-black flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.85)] border border-amber-300/60 shrink-0"
              title={`${missingDetailsCount} مهام بها مشكلة أو تفاصيل ناقصة ⚠️`}
            >
              {missingDetailsCount}
            </motion.span>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {hasInProgress && (
            <motion.span 
              key="badge-inprogress"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="px-2 py-0.5 min-w-[22px] h-[22px] rounded-full bg-orange-500 text-white text-[11px] font-mono font-black flex items-center justify-center shadow-[0_0_12px_rgba(249,115,22,0.85)] border border-orange-400/50 shrink-0"
              title={`${inProgressCount} مهام قيد التنفيذ مع محرر ⏳`}
            >
              {inProgressCount}
            </motion.span>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {hasPending ? (
            <motion.span 
              key="badge-pending"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="px-2 py-0.5 min-w-[22px] h-[22px] rounded-full bg-rose-500 text-white text-[11px] font-mono font-black flex items-center justify-center shadow-[0_0_12px_rgba(244,63,94,0.7)] border border-rose-400/40 shrink-0"
              title={badgeTitle || `${badgeCount} مهام بدون محرر تنتظر العمل 🔴`}
            >
              {badgeCount}
            </motion.span>
          ) : isAllDone ? (
            <motion.span
              key="badge-done"
              initial={{ scale: 0, rotate: -25, opacity: 0 }}
              animate={{ 
                scale: [0, 1.35, 0.9, 1.08, 1], 
                rotate: [-25, 8, -4, 0],
                opacity: 1
              }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="relative flex items-center justify-center shrink-0"
              title="اكتملت جميع المهام (All Done)! 🎉"
            >
              {/* Celebratory Reward Ripple Ring */}
              <motion.span
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: [1, 1.85, 2.3], opacity: [0.8, 0.35, 0] }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full bg-emerald-400 pointer-events-none"
              />
              <span className="w-[22px] h-[22px] rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white flex items-center justify-center shadow-[0_0_14px_rgba(16,185,129,0.85)] border border-emerald-300/50 relative z-10">
                <Check size={12} strokeWidth={3.5} className="text-white drop-shadow-sm" />
              </span>
            </motion.span>
          ) : typeof badgeCount === 'number' && !hasAnyPending ? (
            <motion.span
              key="badge-zero"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="w-[22px] h-[22px] rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
              title="0 مهام متبقية"
            >
              <Check size={12} strokeWidth={3.5} className="text-emerald-400" />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>

      {onTogglePin && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            isPinned 
              ? 'text-amber-400 bg-amber-400/10 opacity-100' 
              : 'text-white/20 hover:text-amber-400 hover:bg-white/10 opacity-0 group-hover:opacity-100'
          }`}
          title={isPinned ? 'إلغاء التثبيت من المفضلة' : 'تثبيت في المفضلة'}
        >
          <Pin size={14} className={isPinned ? 'fill-amber-400' : ''} />
        </span>
      )}
      {active && <motion.div layoutId="active-pill" style={isLight ? { color: bgStyle.color } : undefined} className={isLight ? '' : 'text-white'}><ChevronRight size={16} /></motion.div>}
    </button>
  );
};

// ─── Collapsible Sidebar Group ────────────────────────────────────────────────
export const SidebarGroup = ({ title, iconEmoji, colorHex, stagesList, activeGid, onSelectStage, pinnedTabs, togglePinTab, colorful, lightMode, profile, stageUncompletedCounts, stageInProgressCounts, stageMissingDetailsCounts }: any) => {
  const visibleStages = stagesList.filter((stage: any) =>
    !profile?.role || PERMISSIONS.canViewTab(profile.role, stage.label, profile.allowed_tabs || [])
  );

  const isAnyActive = visibleStages.some((s: any) => s.gid === activeGid);
  const [isOpen, setIsOpen] = useState(isAnyActive);

  useEffect(() => {
    if (isAnyActive) setIsOpen(true);
  }, [isAnyActive]);

  if (visibleStages.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 my-1">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <span className="text-base">{iconEmoji}</span>
          <span className="font-bold text-xs text-white/90 group-hover:text-white transition-colors arabic-text">{title}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-muted border border-white/10">
            {visibleStages.length}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-muted group-hover:text-white transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-1 pr-2 pt-1 border-r-2 border-white/10 mr-4 overflow-hidden"
          >
            {visibleStages.map((stage: any) => (
              <SidebarItem
                key={stage.gid}
                icon={stage.icon}
                label={stage.label}
                colorHex={stage.colorHex}
                colorful={colorful}
                lightMode={lightMode}
                active={activeGid === stage.gid}
                badgeCount={STAGE_WITH_BADGE_MAP[stage.gid] ? stageUncompletedCounts?.[stage.gid] : undefined}
                inProgressCount={STAGE_WITH_BADGE_MAP[stage.gid] ? stageInProgressCounts?.[stage.gid] : undefined}
                missingDetailsCount={STAGE_WITH_BADGE_MAP[stage.gid] ? stageMissingDetailsCounts?.[stage.gid] : undefined}
                showDoneGreenBadge={GREEN_DONE_BADGE_GIDS.has(stage.gid)}
                isPinned={pinnedTabs.includes(stage.gid)}
                onTogglePin={() => togglePinTab(stage.gid)}
                onClick={() => onSelectStage(stage.gid, stage.label)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
