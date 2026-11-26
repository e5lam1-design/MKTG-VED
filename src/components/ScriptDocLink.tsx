import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FolderOpen, Loader2, AlertTriangle, CheckCircle2, Clock, User, Lock } from 'lucide-react';

interface DocMeta {
  docId: string;
  name?: string;
  createdTime?: string | null;
  modifiedTime?: string | null;
  lastModifier?: string;
  version?: string | null;
  error?: string;
  fetchedAt: number;
}

const CACHE_TTL_MS = 4 * 60 * 1000; // 4 minutes cache
const HOVER_DELAY_MS = 450; // 450ms intent delay so passing mouse sweeps don't call API
const docMetaCache = new Map<string, DocMeta>();
const inFlightRequests = new Map<string, Promise<DocMeta>>();

function extractDocId(url: string): string | null {
  const m = String(url || '').match(/\/document\/d\/([a-zA-Z0-9_-]+)/i);
  return m?.[1] || null;
}

function formatArDateTime(iso?: string | null): string {
  if (!iso) return '---';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '---';
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  let hrs = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const ampm = hrs >= 12 ? 'م' : 'ص';
  hrs = hrs % 12 || 12;
  return `${y}/${mo}/${day} - ${hrs}:${mins} ${ampm}`;
}

async function fetchDocMetaCached(url: string, docId: string): Promise<DocMeta> {
  const existing = docMetaCache.get(docId);
  if (existing && Date.now() - existing.fetchedAt < CACHE_TTL_MS) {
    return existing;
  }
  const pending = inFlightRequests.get(docId);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const res = await fetch(`/api/duration?action=doc-meta&url=${encodeURIComponent(url)}`);
      const json = await res.json().catch(() => ({}));
      const result: DocMeta = res.ok
        ? {
            docId,
            name: json.name,
            createdTime: json.createdTime,
            modifiedTime: json.modifiedTime,
            lastModifier: json.lastModifier,
            version: json.version,
            fetchedAt: Date.now(),
          }
        : {
            docId,
            error: json.error || 'تعذر قراءة بيانات الملف',
            fetchedAt: Date.now(),
          };
      docMetaCache.set(docId, result);
      return result;
    } catch {
      const result: DocMeta = {
        docId,
        error: 'تعذر الاتصال لفحص الملف',
        fetchedAt: Date.now(),
      };
      docMetaCache.set(docId, result);
      return result;
    } finally {
      inFlightRequests.delete(docId);
    }
  })();

  inFlightRequests.set(docId, promise);
  return promise;
}

interface ScriptDocLinkProps {
  url: string;
  text: string;
  rowCreatedAt?: string | null;
  addedBy?: string | null;
}

export const ScriptDocLink: React.FC<ScriptDocLinkProps> = ({
  url,
  text,
  rowCreatedAt,
  addedBy,
}) => {
  const docId = extractDocId(url);
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hovered, setHovered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<DocMeta | null>(() => (docId ? docMetaCache.get(docId) || null : null));
  const [coords, setCoords] = useState<{ top: number; left: number; showBelow: boolean } | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (!docId) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);

    const openTooltip = () => {
      setHovered(true);
      if (anchorRef.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        const showBelow = rect.top < 170;
        setCoords({
          top: showBelow ? rect.bottom + 8 : rect.top - 8,
          left: Math.min(Math.max(rect.left + rect.width / 2, 160), window.innerWidth - 160),
          showBelow,
        });
      }

      const cached = docMetaCache.get(docId);
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        setMeta(cached);
        setLoading(false);
        return;
      }

      setLoading(true);
      fetchDocMetaCached(url, docId).then((res) => {
        setMeta(res);
        setLoading(false);
      });
    };

    const cached = docMetaCache.get(docId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      openTooltip();
    } else {
      hoverTimerRef.current = setTimeout(openTooltip, HOVER_DELAY_MS);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHovered(false);
  };

  // Determine whether doc was modified after row creation (15-minute grace buffer)
  let status: 'modified' | 'clean' | 'modified_from_create' | 'error' | null = null;
  if (meta?.error) {
    status = 'error';
  } else if (meta?.modifiedTime) {
    const modMs = new Date(meta.modifiedTime).getTime();
    const refMs = rowCreatedAt ? new Date(rowCreatedAt).getTime() : NaN;
    const createdMs = meta.createdTime ? new Date(meta.createdTime).getTime() : NaN;

    if (!isNaN(modMs) && !isNaN(refMs)) {
      status = modMs > refMs + 15 * 60 * 1000 ? 'modified' : 'clean';
    } else if (!isNaN(modMs) && !isNaN(createdMs)) {
      status = modMs > createdMs + 15 * 60 * 1000 ? 'modified_from_create' : 'clean';
    } else {
      status = 'clean';
    }
  }

  return (
    <>
      <a
        ref={anchorRef}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all shadow-sm shrink-0 hover:scale-[1.02] active:scale-95 cursor-pointer border ${
          status === 'modified'
            ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/40 text-amber-300'
            : 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 text-blue-400'
        }`}
      >
        <FolderOpen size={12} className={`shrink-0 ${status === 'modified' ? 'text-amber-400' : 'text-blue-400'}`} />
        <span className="truncate max-w-[130px] arabic-text">{text}</span>
        {status === 'modified' && (
          <span
            className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"
            title="تم التعديل داخل Google Docs بعد الإضافة"
          />
        )}
      </a>

      {hovered && docId && coords && createPortal(
        <div
          dir="rtl"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            transform: coords.showBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
            zIndex: 99999,
          }}
          className="pointer-events-none w-[290px] rounded-2xl border border-white/15 bg-[#0b1220]/95 backdrop-blur-xl shadow-2xl p-3 text-right text-white animate-fadeIn"
        >
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-slate-300 font-bold py-1">
              <Loader2 size={14} className="animate-spin text-blue-400 shrink-0" />
              <span className="arabic-text">جاري فحص تعديلات Google Docs...</span>
            </div>
          ) : status === 'error' ? (
            <div className="flex items-center gap-2 text-xs text-rose-300 font-bold">
              <Lock size={14} className="shrink-0 text-rose-400" />
              <span className="arabic-text">{meta?.error || 'الملف غير مشارك'}</span>
            </div>
          ) : meta ? (
            <div className="space-y-2">
              {status === 'modified' ? (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-black">
                  <AlertTriangle size={14} className="shrink-0 text-amber-400" />
                  <span className="arabic-text">اتعدل في Google Docs بعد الإضافة!</span>
                </div>
              ) : status === 'modified_from_create' ? (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-200 text-xs font-black">
                  <Clock size={14} className="shrink-0 text-sky-400" />
                  <span className="arabic-text">تم التعديل داخل Google Docs</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-black">
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                  <span className="arabic-text">لم يُعدّل منذ الإضافة</span>
                </div>
              )}

              <div className="space-y-1 text-[11px] text-slate-300 font-semibold pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 arabic-text flex items-center gap-1">
                    <Clock size={11} className="text-amber-400" />
                    آخر تعديل في Docs:
                  </span>
                  <span className="font-mono font-bold text-white" dir="ltr">
                    {formatArDateTime(meta.modifiedTime)}
                  </span>
                </div>

                {meta.lastModifier && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 arabic-text flex items-center gap-1">
                      <User size={11} className="text-purple-400" />
                      آخر من عدّل:
                    </span>
                    <span className="font-bold text-purple-200 truncate max-w-[155px]">
                      {meta.lastModifier}
                    </span>
                  </div>
                )}

                {rowCreatedAt && (
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                    <span className="text-slate-400 arabic-text">
                      تاريخ الإضافة هنا{addedBy ? ` (${addedBy})` : ''}:
                    </span>
                    <span className="font-mono text-slate-300" dir="ltr">
                      {formatArDateTime(rowCreatedAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>,
        document.body
      )}
    </>
  );
};
