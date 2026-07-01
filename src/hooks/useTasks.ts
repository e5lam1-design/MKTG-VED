import { useEffect, useRef, useState } from 'react';

export function useTasks(gid: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeGidRef = useRef(gid);

  const fetchData = async (targetGid: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks?gid=${encodeURIComponent(targetGid)}&t=${Date.now()}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      const rows = Array.isArray(json?.rows) ? json.rows : [];
      if (activeGidRef.current !== targetGid) return;
      // Map DB rows to the shape used by the UI
      const mapped = rows.map((r: any) => ({
        ...r.raw,
        ...r,
        uniqueKey: r.task_key,
        filingName: r.filing_name,
        opSheet: r.opsheet,
        linkBunny: r.link_bunny,
        rawMinutes: r.raw_minutes,
        finalMinutes: r.final_minutes,
        exactDuration: r.exact_duration,
        notesEditors: r.notes_editors,
        notesMarketing: r.notes_marketing,
      }));
      setData(mapped);
    } catch (e: any) {
      if (activeGidRef.current === targetGid) setError(e?.message || 'Failed to load');
    } finally {
      if (activeGidRef.current === targetGid) setLoading(false);
    }
  };

  useEffect(() => {
    activeGidRef.current = gid;
    setData([]);
    if (gid) fetchData(gid);
  }, [gid]);

  return { data, loading, error, refetch: () => fetchData(gid) };
}

