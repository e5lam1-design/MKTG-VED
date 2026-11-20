import { getGlobalEditorColor } from '../hooks/useEditorsOptions';

export const yearLabels: Record<string, string> = {
  'J4': 'Junior 4 (الرابع الابتدائي)',
  'J5': 'Junior 5 (الخامس الابتدائي)',
  'J6': 'Junior 6 (السادس الابتدائي)',
  'M1': 'Middle 1 (الأول الإعدادي)',
  'M2': 'Middle 2 (الثاني الإعدادي)',
  'M3': 'Middle 3 (الثالث الإعدادي)',
  'S1': 'Senior 1 (الأول الثانوي)',
  'S2': 'Senior 2 (الثاني الثانوي)',
  'S3': 'Senior 3 (الثالث الثانوي)',
};

export const generateKey = (item: any) => {
  let hash = 0;
  const str = String(item?.name || '') + String(item?.id || '') + String(item?.val || '');
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; 
  }
  return 'row-' + Math.abs(hash);
};

export function parseDriveLink(val: string) {
  if (!val) return { url: '', text: '' };
  let s = String(val).trim();
  
  // Check if it is a hyperlink formula
  const hyperlinkRegex = /=HYPERLINK\s*\(\s*(['"])(.*?)\1\s*,\s*(['"])(.*?)\3\s*\)/i;
  const formulaMatch = s.match(hyperlinkRegex);
  if (formulaMatch) {
    let url = formulaMatch[2].trim();
    let text = formulaMatch[4].trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    return { url, text };
  }

  // Hard Drive local delivery exception
  if (s.includes('هارد') || s.toLowerCase().includes('hard')) {
    return { url: '', text: s, isHardDrive: true };
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
  } else if (driveIdRegex.test(url)) {
    url = `https://drive.google.com/file/d/${url}/view?usp=sharing`;
  } else if (url.startsWith('http://') || url.startsWith('https://')) {
    // Valid full HTTP URL
  } else {
    // String looks like a filename (e.g., "MVI 7386.MP4" or "video.mp4") -> make it search/open drive
    const cleanFilename = url.replace(/^https?:\/\//i, '');
    url = `https://drive.google.com/drive/search?q=${encodeURIComponent(cleanFilename)}`;
  }

  // Display text formatting
  let text = s;
  if (text.startsWith('https://')) text = text.substring(8);
  if (text.startsWith('http://')) text = text.substring(7);
  if (text.length > 25) text = text.substring(0, 23) + '...';

  return {
    url,
    text: text || 'Drive Link'
  };
}

export const formatArabicTimestamp = (isoStr?: string) => {
  if (!isoStr) return null;
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return null;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');

    return `${year}/${month}/${day} - ${hoursStr}:${minutes} ${ampm}`;
  } catch {
    return null;
  }
};

export type HistoryEntry = {
  text: string;
  timestamp: string;
  author: string;
};

let _cachedNoteAuthorsRaw: string | null = null;
let _cachedNoteAuthorsParsed: any = null;

export const getCachedNoteAuthors = () => {
  try {
    const raw = localStorage.getItem('note_authors');
    if (raw !== _cachedNoteAuthorsRaw) {
      _cachedNoteAuthorsRaw = raw;
      _cachedNoteAuthorsParsed = raw ? JSON.parse(raw) : null;
    }
    return _cachedNoteAuthorsParsed;
  } catch {
    return null;
  }
};

// ─── Direct Supabase Database for Stage Sheets (stage_j4_26 -> stage_s3_26) ─────
export const STAGE_TABLE_MAP: Record<string, string> = {
  '497207661': 'stage_j4_26',
  '96752860': 'stage_j5_26',
  '346788121': 'stage_j6_26',
  '458352282': 'stage_m1_26',
  '2113852114': 'stage_m2_26',
  '2089699920': 'stage_m3_26',
  '1640460225': 'stage_s1_26',
  '595027661': 'stage_s2_26',
  '286303232': 'stage_s3_26',
};

// Reels stage tabs that show uncompleted / available badges
export const REELS_BADGE_TABLE_MAP: Record<string, string> = {
  '1939073164': 'reels_ve_26', // Ve
  '0': 'reels_cuts_26',        // CUTS
};

export const STAGE_WITH_BADGE_MAP: Record<string, boolean> = {
  ...Object.fromEntries(Object.keys(STAGE_TABLE_MAP).map(k => [k, true])),
  ...Object.fromEntries(Object.keys(REELS_BADGE_TABLE_MAP).map(k => [k, true])),
  '1535230545': true, // تجميعات
};

// Stages where completing all tasks turns the red badge into a rewarding glowing green done circle (CUTS, Ve, تجميعات)
export const GREEN_DONE_BADGE_GIDS = new Set<string>(['0', '1939073164', '1535230545']);

// ─── Sidebar Item ─────────────────────────────────────────────────────────────
export const isAssignedEditor = (editor?: string | null): boolean => {
  if (!editor) return false;
  const s = String(editor).trim().toLowerCase();
  return Boolean(s && s !== 'غير محدد' && s !== 'غير معين' && s !== 'unassigned' && s !== 'none' && s !== '---');
};


// ─── Creator Color Map ────────────────────────────────────────────────────────
export const CREATOR_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'esraa': { bg: 'bg-pink-500/15', text: 'text-pink-300 font-extrabold', border: 'border-pink-500/30', dot: '#f472b6' },
  'esraa aboelkheir': { bg: 'bg-pink-500/15', text: 'text-pink-300 font-extrabold', border: 'border-pink-500/30', dot: '#f472b6' },
  'esraaaboelkheir': { bg: 'bg-pink-500/15', text: 'text-pink-300 font-extrabold', border: 'border-pink-500/30', dot: '#f472b6' },
  'maram': { bg: 'bg-lime-500/15', text: 'text-lime-300 font-extrabold', border: 'border-lime-500/30', dot: '#a3e635' },
  'han': { bg: 'bg-sky-500/15', text: 'text-sky-300 font-extrabold', border: 'border-sky-500/30', dot: '#7dd3fc' },
  'nader': { bg: 'bg-slate-500/15', text: 'text-slate-300 font-extrabold', border: 'border-slate-500/30', dot: '#94a3b8' },
  'eman': { bg: 'bg-red-500/15', text: 'text-red-300 font-extrabold', border: 'border-red-500/30', dot: '#ef4444' },
  'noor': { bg: 'bg-amber-900/30', text: 'text-amber-400 font-extrabold', border: 'border-amber-800/40', dot: '#b45309' },
  'manar': { bg: 'bg-teal-500/15', text: 'text-teal-300 font-extrabold', border: 'border-teal-500/30', dot: '#2dd4bf' },
  'manarr': { bg: 'bg-teal-500/15', text: 'text-teal-300 font-extrabold', border: 'border-teal-500/30', dot: '#2dd4bf' },
  'yomna': { bg: 'bg-amber-500/15', text: 'text-amber-300 font-extrabold', border: 'border-amber-500/30', dot: '#f59e0b' },
  'yomana': { bg: 'bg-amber-500/15', text: 'text-amber-300 font-extrabold', border: 'border-amber-500/30', dot: '#f59e0b' },
  'sohaila': { bg: 'bg-slate-400/15', text: 'text-slate-200 font-extrabold', border: 'border-slate-400/30', dot: '#cbd5e1' },
  'hima': { bg: 'bg-yellow-500/15', text: 'text-yellow-300 font-extrabold', border: 'border-yellow-500/30', dot: '#eab308' },
  'ahmed samir': { bg: 'bg-blue-500/15', text: 'text-blue-300 font-extrabold', border: 'border-blue-500/30', dot: '#3b82f6' },
  'adham elbadry': { bg: 'bg-purple-500/15', text: 'text-purple-300 font-extrabold', border: 'border-purple-500/30', dot: '#a855f7' },
  'awney': { bg: 'bg-emerald-800/30', text: 'text-emerald-300 font-extrabold', border: 'border-emerald-700/40', dot: '#059669' },
  'ramy elnaggar': { bg: 'bg-blue-600/20', text: 'text-blue-300 font-extrabold', border: 'border-blue-500/40', dot: '#2563eb' },
  'ramy': { bg: 'bg-blue-600/20', text: 'text-blue-300 font-extrabold', border: 'border-blue-500/40', dot: '#2563eb' },
  'ramyelnagar': { bg: 'bg-blue-600/20', text: 'text-blue-300 font-extrabold', border: 'border-blue-500/40', dot: '#2563eb' },
  'nourhan': { bg: 'bg-indigo-500/15', text: 'text-indigo-300 font-extrabold', border: 'border-indigo-500/30', dot: '#818cf8' },
  'hesham': { bg: 'bg-slate-500/20', text: 'text-slate-200 font-extrabold', border: 'border-slate-500/30', dot: '#64748b' },
  'shorouk': { bg: 'bg-cyan-800/30', text: 'text-cyan-300 font-extrabold', border: 'border-cyan-700/40', dot: '#0e7490' },
  'shrouk': { bg: 'bg-cyan-800/30', text: 'text-cyan-300 font-extrabold', border: 'border-cyan-700/40', dot: '#0e7490' },
  'taher': { bg: 'bg-sky-500/15', text: 'text-sky-300 font-extrabold', border: 'border-sky-500/30', dot: '#0ea5e9' },
  'alaa abouobeid': { bg: 'bg-violet-500/15', text: 'text-violet-300 font-extrabold', border: 'border-violet-500/30', dot: '#8b5cf6' },
  'ahmed hossam': { bg: 'bg-cyan-500/15', text: 'text-cyan-300 font-extrabold', border: 'border-cyan-500/30', dot: '#06b6d4' },
  'abdelkarim': { bg: 'bg-orange-500/15', text: 'text-orange-300 font-extrabold', border: 'border-orange-500/30', dot: '#f97316' },
  'abdelkerim': { bg: 'bg-orange-500/15', text: 'text-orange-300 font-extrabold', border: 'border-orange-500/30', dot: '#f97316' },
  'sherif': { bg: 'bg-blue-400/15', text: 'text-blue-300 font-extrabold', border: 'border-blue-400/30', dot: '#60a5fa' },
  'alaa medhat': { bg: 'bg-emerald-500/15', text: 'text-emerald-300 font-extrabold', border: 'border-emerald-500/30', dot: '#10b981' },
  'a.medhat': { bg: 'bg-emerald-500/15', text: 'text-emerald-300 font-extrabold', border: 'border-emerald-500/30', dot: '#10b981' },
  'donia': { bg: 'bg-rose-300/15', text: 'text-rose-300 font-extrabold', border: 'border-rose-300/30', dot: '#fda4af' },
  'donia 2': { bg: 'bg-rose-300/15', text: 'text-rose-300 font-extrabold', border: 'border-rose-300/30', dot: '#fda4af' },
  'alaa': { bg: 'bg-sky-400/15', text: 'text-sky-300 font-extrabold', border: 'border-sky-400/30', dot: '#38bdf8' },
  'nada': { bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-300 font-extrabold', border: 'border-fuchsia-500/30', dot: '#d946ef' },
  'nourasharaf': { bg: 'bg-rose-400/15', text: 'text-rose-300 font-extrabold', border: 'border-rose-400/30', dot: '#fb7185' },
  'nourkhaled': { bg: 'bg-green-400/15', text: 'text-green-300 font-extrabold', border: 'border-green-400/30', dot: '#4ade80' },
  'rawan': { bg: 'bg-orange-400/15', text: 'text-orange-300 font-extrabold', border: 'border-orange-400/30', dot: '#fb923c' },
  'aya': { bg: 'bg-pink-600/15', text: 'text-pink-300 font-extrabold', border: 'border-pink-600/30', dot: '#ec4899' },
  'narden': { bg: 'bg-purple-400/15', text: 'text-purple-300 font-extrabold', border: 'border-purple-400/30', dot: '#c084fc' },
  'khaled': { bg: 'bg-teal-600/15', text: 'text-teal-300 font-extrabold', border: 'border-teal-600/30', dot: '#14b8a6' },
  'anas': { bg: 'bg-purple-500/15', text: 'text-purple-300 font-extrabold', border: 'border-purple-500/30', dot: '#a855f7' },
  'habiba': { bg: 'bg-emerald-400/15', text: 'text-emerald-300 font-extrabold', border: 'border-emerald-400/30', dot: '#10b981' },
  'khalil': { bg: 'bg-sky-600/15', text: 'text-sky-300 font-extrabold', border: 'border-sky-600/30', dot: '#0284c7' },
  'hassanien': { bg: 'bg-green-500/15', text: 'text-green-300 font-extrabold', border: 'border-green-500/30', dot: '#22c55e' },
  'ahmed': { bg: 'bg-blue-600/20', text: 'text-blue-300 font-extrabold', border: 'border-blue-500/40', dot: '#2563eb' },
  'samir': { bg: 'bg-gray-500/15', text: 'text-gray-300 font-extrabold', border: 'border-gray-500/30', dot: '#9ca3af' },
  'ahmed-amr': { bg: 'bg-rose-500/15', text: 'text-rose-300 font-extrabold', border: 'border-rose-500/30', dot: '#fb7185' },
};

// ─── Chip Colors ──────────────────────────────────────────────────────────────
export const getChipColor = (val: string) => {
  if (!val) return { bg: 'bg-white/5', text: 'text-muted-foreground/60', border: 'border-white/5', dot: '' };
  const raw = String(val).trim();
  const lower = raw.toLowerCase();
  const upper = raw.toUpperCase();
  
  // Dynamic Editor/Creator color lookup from Editors Hub Management / Supabase
  const dynamicEditorColor = getGlobalEditorColor(lower);
  if (dynamicEditorColor) {
    return {
      bg: '',
      text: 'font-black tracking-wide',
      border: '',
      dot: dynamicEditorColor,
      style: {
        backgroundColor: `${dynamicEditorColor}1f`,
        borderColor: `${dynamicEditorColor}4d`,
        color: dynamicEditorColor,
      }
    };
  }

  if (CREATOR_COLORS[lower]) {
    return CREATOR_COLORS[lower];
  }

  // Filmed Status
  if (lower === 'اتصور' || lower === 'true') {
    return { bg: 'bg-emerald-500/15 shadow-[0_0_10px_rgba(16,185,129,0.15)]', text: 'text-emerald-300 font-extrabold', border: 'border-emerald-500/30', dot: '#10b981' };
  }
  if (lower === 'لم يتصور' || lower === 'false') {
    return { bg: 'bg-amber-500/15 shadow-[0_0_10px_rgba(245,158,11,0.15)]', text: 'text-amber-300 font-extrabold', border: 'border-amber-500/30', dot: '#f59e0b' };
  }

  // Done Status
  if (lower === 'done' || lower === 'تم') {
    return { bg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-extrabold shadow-[0_0_12px_rgba(16,185,129,0.2)]', text: '', border: '', dot: '#10b981' };
  }
  if (lower === 'canceled' || lower === 'ملغي' || lower === 'ملغى') {
    return { bg: 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-extrabold shadow-[0_0_12px_rgba(244,63,94,0.2)]', text: '', border: '', dot: '#f43f5e' };
  }
  if (lower === 'missing' || lower === 'بيانات ناقصة') {
    return { bg: 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-extrabold shadow-[0_0_12px_rgba(245,158,11,0.2)]', text: '', border: '', dot: '#f59e0b' };
  }

  if (lower === 'not done' || lower === 'لم يتم' || lower === 'غير مكتمل') {
    return { bg: 'bg-amber-500/15 shadow-[0_0_10px_rgba(245,158,11,0.15)]', text: 'text-amber-300 font-extrabold', border: 'border-amber-500/30', dot: '#f59e0b' };
  }

  // Dates
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw) || /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { bg: 'bg-emerald-950/40', text: 'text-emerald-300 font-mono font-bold', border: 'border-emerald-500/30', dot: '#10b981' };
  }

  // Type & Format
  if (lower === 'حواري') {
    return { bg: 'bg-sky-500/15 shadow-[0_0_10px_rgba(14,165,233,0.1)]', text: 'text-sky-300 font-extrabold', border: 'border-sky-500/30', dot: '#38bdf8' };
  }
  if (lower === 'تمثيلي') {
    return { bg: 'bg-amber-500/15 shadow-[0_0_10px_rgba(245,158,11,0.1)]', text: 'text-amber-300 font-extrabold', border: 'border-amber-500/30', dot: '#fb923c' };
  }
  if (upper === 'REEL') {
    return { bg: 'bg-blue-600/20 shadow-[0_0_10px_rgba(37,99,235,0.15)]', text: 'text-blue-300 font-extrabold', border: 'border-blue-500/40', dot: '#2563eb' };
  }
  if (upper === 'VIDEO') {
    return { bg: 'bg-red-700/20 shadow-[0_0_10px_rgba(220,38,38,0.15)]', text: 'text-red-300 font-extrabold', border: 'border-red-600/40', dot: '#dc2626' };
  }

  // Reels Branches
  if (upper.includes('DESOUK') || upper.includes('دسور') || upper.includes('دسوق')) 
    return { bg: 'bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.05)]', text: 'text-emerald-400 font-extrabold', border: 'border-emerald-500/20', dot: '#10b981' };
  if (upper.includes('ALEX') || upper.includes('اسكندر') || upper.includes('إسكندر')) 
    return { bg: 'bg-blue-500/15 shadow-[0_0_10px_rgba(59,130,246,0.15)]', text: 'text-blue-400 font-extrabold', border: 'border-blue-500/30', dot: '#3b82f6' };
  if (upper.includes('CAIRO') || upper.includes('قاهر')) 
    return { bg: 'bg-rose-500/15 shadow-[0_0_10px_rgba(244,63,94,0.15)]', text: 'text-rose-400 font-extrabold', border: 'border-rose-500/30', dot: '#f43f5e' };
  if (upper.includes('ONLINE') || upper.includes('أونلاين') || upper.includes('اونلاين')) 
    return { bg: 'bg-purple-500/10 shadow-[0_0_10px_rgba(168,85,247,0.05)]', text: 'text-purple-400 font-extrabold', border: 'border-purple-500/20', dot: '#a855f7' };

  // Year level colors
  if (upper.includes('M3') || upper.includes('MIDDLE 3')) 
    return { bg: 'bg-teal-500/10 shadow-[0_0_10px_rgba(20,184,166,0.05)]', text: 'text-teal-400 font-extrabold', border: 'border-teal-500/20', dot: '#14b8a6' };
  if (upper.includes('M2') || upper.includes('MIDDLE 2')) 
    return { bg: 'bg-cyan-500/10 shadow-[0_0_10px_rgba(6,182,212,0.05)]', text: 'text-cyan-400 font-extrabold', border: 'border-cyan-500/20', dot: '#06b6d4' };
  if (upper.includes('M1') || upper.includes('MIDDLE 1')) 
    return { bg: 'bg-sky-500/10 shadow-[0_0_10px_rgba(14,165,233,0.05)]', text: 'text-sky-400 font-extrabold', border: 'border-sky-500/20', dot: '#0ea5e9' };
  if (upper.includes('S3') || upper.includes('SENIOR 3')) 
    return { bg: 'bg-indigo-500/10 shadow-[0_0_10px_rgba(99,102,241,0.05)]', text: 'text-indigo-400 font-extrabold', border: 'border-indigo-500/20', dot: '#6366f1' };
  if (upper.includes('S2') || upper.includes('SENIOR 2')) 
    return { bg: 'bg-violet-500/10 shadow-[0_0_10px_rgba(139,92,246,0.05)]', text: 'text-violet-400 font-extrabold', border: 'border-violet-500/20', dot: '#8b5cf6' };
  if (upper.includes('S1') || upper.includes('SENIOR 1')) 
    return { bg: 'bg-fuchsia-500/10 shadow-[0_0_10px_rgba(217,70,239,0.05)]', text: 'text-fuchsia-400 font-extrabold', border: 'border-fuchsia-500/20', dot: '#d946ef' };

  if (upper.includes('POSTPONED')) return { bg: 'bg-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.2)]', text: 'text-yellow-400 font-extrabold uppercase', border: 'border-yellow-500/40 animate-pulse', dot: '#eab308' };
  if (upper.includes('علوم') || upper.includes('COMPLETED') || upper.includes('SMARTBOARD')) return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', dot: '#3b82f6' };
  if (upper.includes('ماث') || upper.includes('2025') || upper.includes('URGENT') || upper.includes('CANCEL')) return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', dot: '#f43f5e' };
  if (upper.includes('2026/2027') || upper.includes('OP 26/27') || upper.includes('26/27')) return { bg: 'bg-blue-600/20 shadow-[0_0_12px_rgba(59,130,246,0.25)]', text: 'text-blue-300 font-black', border: 'border-blue-500/40', dot: '#3b82f6' };
  if (upper.includes('2025/2026') || upper.includes('OP 25/26') || upper.includes('25/26') || upper.includes('العمليات') || upper.includes('OPERATIONS')) return { bg: 'bg-purple-600/20 shadow-[0_0_12px_rgba(147,51,234,0.25)]', text: 'text-purple-300 font-black', border: 'border-purple-500/40', dot: '#9333ea' };
  if (upper.includes('رياضه') || upper.includes('PENDING') || upper.includes('IN PROGRESS')) return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: '#f59e0b' };
  if (upper.includes('ساينس') || upper.includes('DONE')) return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: '#10b981' };
  if (upper.includes('دراسات') || upper.includes('LOW')) return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', dot: '#f97316' };
  
  // Deterministic colorful fallback for any creator/option with no explicit mapping
  const hash = lower.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = (hash * 137.5) % 360;
  return {
    bg: '',
    text: 'font-extrabold tracking-wide',
    border: '',
    dot: `hsl(${hue}, 80%, 65%)`,
    style: {
      backgroundColor: `hsla(${hue}, 80%, 60%, 0.12)`,
      borderColor: `hsla(${hue}, 80%, 60%, 0.35)`,
      color: `hsl(${hue}, 85%, 75%)`,
    }
  };
};

export const toInputDate = (dStr: string) => {
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

export const fromInputDate = (dStr: string) => {
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

export const getTargetStageGid = (item: any) => {
  const str = String(item?.filingName || item?.name || '').toUpperCase();
  if (str.includes('J4') || str.includes('JUNIOR 4')) return { gid: '497207661', label: 'Junior 4' };
  if (str.includes('J5') || str.includes('JUNIOR 5')) return { gid: '96752860', label: 'Junior 5' };
  if (str.includes('J6') || str.includes('JUNIOR 6')) return { gid: '346788121', label: 'Junior 6' };
  if (str.includes('M1') || str.includes('MIDDLE 1')) return { gid: '458352282', label: 'Middle 1' };
  if (str.includes('M2') || str.includes('MIDDLE 2')) return { gid: '2113852114', label: 'Middle 2' };
  if (str.includes('M3') || str.includes('MIDDLE 3')) return { gid: '2089699920', label: 'Middle 3' };
  if (str.includes('S1') || str.includes('SENIOR 1')) return { gid: '1640460225', label: 'Senior 1' };
  if (str.includes('S2') || str.includes('SENIOR 2')) return { gid: '595027661', label: 'Senior 2' };
  if (str.includes('S3') || str.includes('SENIOR 3')) return { gid: '286303232', label: 'Senior 3' };
  return { gid: '497207661', label: 'Junior 4' };
};

export const getSubjectFromFiling = (str: string) => {
  if (!str) return 'عام';
  const s = str.toUpperCase();
  if (s.includes('AR')) return 'عربي';
  if (s.includes('MATH')) return 'ماث';
  if (s.includes('SCI')) return 'ساينس';
  if (s.includes('SS') || s.includes('SOCIAL')) return 'دراسات';
  if (s.includes('EN')) return 'إنجليزي';
  return 'عام';
};

export const formatDuration = (val: string | number) => {
  const str = String(val || '').trim();
  if (!str) return '';
  if (str.includes(':')) return str;
  const totalMinutes = parseFloat(str);
  if (isNaN(totalMinutes) || totalMinutes <= 0) return str;
  const hrs = Math.floor(totalMinutes / 60);
  const mins = Math.floor(totalMinutes % 60);
  const secs = Math.round((totalMinutes % 1) * 60);
  const formattedHrs = hrs > 0 ? `${hrs}:` : '';
  const formattedMins = String(mins).padStart(hrs > 0 ? 2 : 1, '0');
  const formattedSecs = String(secs).padStart(2, '0');
  return `${formattedHrs}${formattedMins}:${formattedSecs}`;
};

export const calculateTotalDuration = (items: any[]) => {
  let totalSeconds = 0;
  
  items.forEach(item => {
    // 1. Check time column or assignedTimes
    const timeStr = String(item.time || item.exactDuration || '').trim();
    const finalM = (item.finalMinutes && String(item.finalMinutes).trim() !== '0') ? item.finalMinutes : item.rawMinutes;
    const durStr = timeStr || String(formatDuration(finalM) || '');
    
    if (durStr) {
      // Parse hh:mm:ss or mm:ss or text containing numbers
      let clean = durStr.replace(/[^\d:]/g, '');
      if (clean.includes(':')) {
        const parts = clean.split(':').map(n => parseInt(n, 10)).filter(n => !isNaN(n));
        if (parts.length === 3) {
          totalSeconds += parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
          totalSeconds += parts[0] * 60 + parts[1];
        }
      } else {
        const num = parseInt(clean, 10);
        if (!isNaN(num)) totalSeconds += num * 60; // minutes fallback
      }
    }
  });

  if (totalSeconds === 0) return '⏱️ إجمالي الوقت: --:--';

  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  return `⏱️ إجمالي الوقت: ${h > 0 ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const getWeekColor = (w: string) => {
  if (!w) return 'bg-white/5 border-white/10 text-muted';
  const num = w.replace(/\D/g, '');
  const code = parseInt(num) || (w.charCodeAt(w.length - 1) % 6);
  switch (code % 6) {
    case 1: return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
    case 2: return 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]';
    case 3: return 'bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]';
    case 4: return 'bg-purple-500/15 border-purple-500/30 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.15)]';
    case 5: return 'bg-rose-500/15 border-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]';
    default: return 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]';
  }
};

export const parseScriptValue = (val: string) => {
  if (!val) return null;
  const s = String(val).trim();
  
  // 1. Check if it is a hyperlink formula (highly resilient to spacing and quotes)
  const hyperlinkRegex = /=HYPERLINK\s*\(\s*(['"])(.*?)\1\s*,\s*(['"])(.*?)\3\s*\)/i;
  const formulaMatch = s.match(hyperlinkRegex);
  if (formulaMatch) {
    return {
      url: formulaMatch[2].trim(),
      text: formulaMatch[4].trim(),
      isLink: true
    };
  }
  
  // 2. Check if it contains a google docs URL, truncated Doc path, or raw Google Doc ID
  const docMatch = s.match(/(?:docs\.google\.com\/document\/d\/|[a-zA-Z0-9_\/'\.-]*document\/d\/|[a-zA-Z0-9_\/'\.-]*cument\/d\/)(1[a-zA-Z0-9_-]+)/i);
  if (docMatch && docMatch[1]) {
    const docId = docMatch[1];
    return {
      url: `https://docs.google.com/document/d/${docId}/edit`,
      text: `Doc: ${docId.substring(0, 16)}...`,
      isLink: true
    };
  }

  if (/^1[a-zA-Z0-9_-]{25,}$/.test(s)) {
    return {
      url: `https://docs.google.com/document/d/${s}/edit`,
      text: `Doc: ${s.substring(0, 16)}...`,
      isLink: true
    };
  }

  if (s.includes('spreadsheets/d/') || s.includes('drive.google.com') || s.includes('docs.google.com') || s.startsWith('http://') || s.startsWith('https://')) {
    let url = s;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.startsWith('docs.google.com') || url.startsWith('drive.google.com')) {
        url = 'https://' + url;
      } else if (url.includes('document/d/')) {
        const idx = url.indexOf('document/d/');
        url = 'https://docs.google.com/' + url.substring(idx);
      } else {
        url = 'https://' + url;
      }
    }
    
    // Clean display text to preserve document ID path, but omit domain to keep chips beautifully compact
    let text = s;
    if (text.startsWith('https://')) text = text.substring(8);
    if (text.startsWith('http://')) text = text.substring(7);
    if (text.startsWith('www.')) text = text.substring(4);
    if (text.startsWith('docs.google.com/')) text = text.substring(16);
    
    // Limit length to keep the chip layout beautiful and prevent wrapping
    if (text.length > 32) {
      text = text.substring(0, 30) + '...';
    }
    
    return {
      url,
      text,
      isLink: true
    };
  }
  
  // 3. Default raw text
  return {
    url: null,
    text: s,
    isLink: false
  };
};

export const TAGME_DAILY_PRIORITY_LIMIT = 10;
