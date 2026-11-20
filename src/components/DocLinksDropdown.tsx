import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, RefreshCw, Loader2, BookOpen, Link, Copy, Check } from 'lucide-react';

// Cache extracted Google Doc links & lesson codes per docId
const docExtractCache = new Map<string, { codes: string[]; links: string[]; error?: string }>();

const getPlatformLabel = (url: string) => {
  const lower = url.toLowerCase();
  if (lower.includes('tiktok.com')) return { label: 'TikTok', badge: 'bg-pink-500/15 text-pink-300 border-pink-500/30' };
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return { label: 'YouTube', badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
  if (lower.includes('drive.google.com')) return { label: 'Drive', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
  if (lower.includes('docs.google.com')) return { label: 'Docs', badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
  if (lower.includes('instagram.com')) return { label: 'Instagram', badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
  return { label: 'Link', badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
};

export const DocLinksDropdown = ({ docUrl, toast }: { docUrl: string; toast?: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ codes: string[]; links: string[]; error?: string } | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const docMatch = docUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/i);
  const docId = docMatch?.[1] || docUrl;

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }
    const spaceBelow = window.innerHeight - rect.bottom;
    const isUp = spaceBelow < 320 && rect.top > 320;
    const menuWidth = 350;
    let left = rect.left + rect.width / 2 - menuWidth / 2;
    if (left < 12) left = 12;
    if (left + menuWidth > window.innerWidth - 12) left = window.innerWidth - menuWidth - 12;

    setDropdownPos({
      top: isUp ? undefined : rect.bottom + 6,
      bottom: isUp ? window.innerHeight - rect.top + 6 : undefined,
      left,
      width: menuWidth,
    });
  }, []);

  const fetchDocItems = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && docExtractCache.has(docId)) {
      setData(docExtractCache.get(docId)!);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/duration?action=doc-extract&url=${encodeURIComponent(docUrl)}`);
      const json = await res.json();
      const result = {
        codes: Array.isArray(json.codes) ? json.codes : [],
        links: Array.isArray(json.links) ? json.links : [],
        error: !res.ok ? (json.error || 'تعذر استخراج محتوى الملف') : undefined,
      };
      if (!result.error) {
        docExtractCache.set(docId, result);
      }
      setData(result);
    } catch {
      setData({ codes: [], links: [], error: 'حدث خطأ أثناء الاتصال بالملف' });
    } finally {
      setLoading(false);
    }
  }, [docId, docUrl]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
      fetchDocItems(false);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handleScrollOrResize = () => updatePosition();
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        btnRef.current && !btnRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, updatePosition]);

  const handleCopy = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedItem(val);
    if (toast?.success) toast.success('تم النسخ بنجاح ✓');
    setTimeout(() => setCopiedItem(prev => (prev === val ? null : prev)), 1800);
  };

  const totalCount = (data?.codes.length || 0) + (data?.links.length || 0);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-1 px-2 py-1.5 rounded-xl border text-[10px] font-black transition-all cursor-pointer shrink-0 ${
          isOpen
            ? 'bg-primary/20 border-primary/50 text-primary shadow-sm'
            : 'bg-white/5 hover:bg-primary/15 border-white/10 hover:border-primary/40 text-muted hover:text-primary'
        }`}
        title="عرض الروابط والأكواد داخل الملف"
      >
        {loading ? (
          <Loader2 size={11} className="animate-spin" />
        ) : (
          <ChevronDown size={11} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        )}
        {data && !loading && totalCount > 0 && (
          <span className="font-mono text-[9px] px-1 rounded bg-primary/20 text-primary">{totalCount}</span>
        )}
      </button>

      {isOpen && dropdownPos && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: dropdownPos.top !== undefined ? `${dropdownPos.top}px` : 'auto',
            bottom: dropdownPos.bottom !== undefined ? `${dropdownPos.bottom}px` : 'auto',
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
            backgroundColor: 'var(--dropdown-bg, #0c1222)',
            zIndex: 999999,
          }}
          dir="rtl"
          className="border border-white/20 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-80 animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between bg-white/[0.03] shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white arabic-text">📄 محتويات الملف</span>
              {!loading && data && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25 font-bold">
                  {totalCount}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fetchDocItems(true)}
              disabled={loading}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-all cursor-pointer disabled:opacity-40"
              title="تحديث محتوى الملف"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto p-2.5 space-y-3 flex-1">
            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted text-xs font-bold">
                <Loader2 size={20} className="animate-spin text-primary" />
                <span className="arabic-text">جاري قراءة الروابط والأكواد من الملف...</span>
              </div>
            ) : data?.error ? (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-bold text-center arabic-text">
                {data.error}
              </div>
            ) : totalCount === 0 ? (
              <div className="py-6 text-center text-xs text-muted font-bold arabic-text">
                لم يتم العثور على روابط أو أكواد حصص داخل هذا الملف
              </div>
            ) : (
              <>
                {/* Lesson Codes */}
                {data && data.codes.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="px-1 text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 arabic-text">
                      <BookOpen size={11} />
                      <span>أكواد الحصص ({data.codes.length})</span>
                    </div>
                    {data.codes.map((code, i) => (
                      <div
                        key={`code-${i}`}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-all group"
                      >
                        <span className="text-[11px] font-mono font-bold text-emerald-300 break-all leading-relaxed select-all" dir="ltr">
                          {code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(code)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-emerald-300 transition-all shrink-0 cursor-pointer"
                          title="نسخ كود الحصة"
                        >
                          {copiedItem === code ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Extracted Links */}
                {data && data.links.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="px-1 text-[10px] font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5 arabic-text">
                      <Link size={11} />
                      <span>الروابط ({data.links.length})</span>
                    </div>
                    {data.links.map((url, i) => {
                      const plat = getPlatformLabel(url);
                      return (
                        <div
                          key={`link-${i}`}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/40 transition-all group"
                        >
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                            dir="ltr"
                            title={url}
                          >
                            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black border shrink-0 ${plat.badge}`}>
                              {plat.label}
                            </span>
                            <span className="text-[11px] font-mono text-blue-300 hover:underline truncate">
                              {url}
                            </span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopy(url)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-blue-500/20 text-muted hover:text-blue-300 transition-all shrink-0 cursor-pointer"
                            title="نسخ الرابط"
                          >
                            {copiedItem === url ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
