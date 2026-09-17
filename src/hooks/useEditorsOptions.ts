import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface EditorOption {
  id?: number | string;
  name: string;
  color?: string;
  category?: 'editor' | 'creator' | 'branch' | 'type';
  is_active?: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_EDITORS_DATA: { name: string; color: string }[] = [
  { name: 'Basel', color: '#f43f5e' },
  { name: 'HASSANEN', color: '#10b981' },
  { name: 'KIRO', color: '#3b82f6' },
  { name: 'ABANOUB', color: '#8b5cf6' },
  { name: 'SHIHAB', color: '#f59e0b' },
  { name: 'MAGED', color: '#06b6d4' },
  { name: 'MOHAMED', color: '#38bdf8' },
  { name: 'ASHRAF', color: '#a855f7' },
  { name: 'ESLAM', color: '#14b8a6' },
  { name: 'Ramaj', color: '#ec4899' },
  { name: 'WAEL', color: '#eab308' },
];

export const DEFAULT_EDITOR_NAMES = DEFAULT_EDITORS_DATA.map(e => e.name);

export const DEFAULT_REELS_CREATORS = [
  'Ahmed', 'Sara', 'Omar', 'Karim', 'Nour', 'Youssef', 'Mariam', 'Salma'
];

export const DEFAULT_REELS_BRANCHES = [
  'Alexandria', 'Cairo', 'Desouk', 'Online'
];

export const DEFAULT_REELS_TYPES = [
  'حواري', 'تمثيلي', 'REEL', 'VIDEO'
];

// In-memory quick lookup cache for synchronous rendering
export const globalEditorColorMap: Record<string, string> = {};

// Initialize global cache from defaults and local storage if available
DEFAULT_EDITORS_DATA.forEach(e => {
  globalEditorColorMap[e.name.toLowerCase()] = e.color;
});

try {
  const cached = localStorage.getItem('editors_team_options_local');
  if (cached) {
    const parsed: EditorOption[] = JSON.parse(cached);
    if (Array.isArray(parsed)) {
      parsed.forEach(e => {
        if (e.name && e.color && (e.category === 'editor' || !e.category)) {
          globalEditorColorMap[e.name.trim().toLowerCase()] = e.color;
        }
      });
    }
  }
} catch {}

export const getGlobalEditorColor = (name?: string): string | undefined => {
  if (!name) return undefined;
  const clean = name.trim().toLowerCase();
  return globalEditorColorMap[clean];
};

export function useEditorsOptions() {
  const [options, setOptions] = useState<EditorOption[]>(() => {
    try {
      const cached = localStorage.getItem('editors_team_options_local');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    // Default options initialization
    const initial: EditorOption[] = [];
    DEFAULT_EDITORS_DATA.forEach((d, i) => {
      initial.push({
        id: `def-ed-${i + 1}`,
        name: d.name,
        color: d.color,
        category: 'editor',
        is_active: true,
        display_order: i + 1,
      });
    });
    DEFAULT_REELS_CREATORS.forEach((c, i) => {
      initial.push({
        id: `def-cr-${i + 1}`,
        name: c,
        category: 'creator',
        is_active: true,
        display_order: i + 1,
      });
    });
    DEFAULT_REELS_BRANCHES.forEach((b, i) => {
      initial.push({
        id: `def-br-${i + 1}`,
        name: b,
        category: 'branch',
        is_active: true,
        display_order: i + 1,
      });
    });
    DEFAULT_REELS_TYPES.forEach((t, i) => {
      initial.push({
        id: `def-ty-${i + 1}`,
        name: t,
        category: 'type',
        is_active: true,
        display_order: i + 1,
      });
    });
    return initial;
  });

  const [loading, setLoading] = useState(true);

  // Sync to globalEditorColorMap & localStorage whenever options change
  const syncCache = useCallback((items: EditorOption[]) => {
    items.forEach(e => {
      if (e.name && e.color && (e.category === 'editor' || !e.category)) {
        globalEditorColorMap[e.name.trim().toLowerCase()] = e.color;
      }
    });
    try {
      localStorage.setItem('editors_team_options_local', JSON.stringify(items));
    } catch {}
  }, []);

  // Fetch options from Supabase
  const fetchOptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('editors_team_options_26')
        .select('*')
        .order('display_order', { ascending: true })
        .order('id', { ascending: true });

      if (error) {
        console.warn('[useEditorsOptions] Supabase fetch warning:', error.message);
        return;
      }

      if (data && data.length > 0) {
        setOptions(data);
        syncCache(data);
      }
    } catch (err) {
      console.error('[useEditorsOptions] fetch exception:', err);
    } finally {
      setLoading(false);
    }
  }, [syncCache]);

  useEffect(() => {
    fetchOptions();

    let channel: any = null;
    try {
      const channelName = 'editors_team_rt_' + Math.random().toString(36).substring(2, 9);
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'editors_team_options_26' },
          (payload: any) => {
            try {
              if (payload.eventType === 'INSERT') {
                setOptions(prev => {
                  if (prev.some(x => x.id === payload.new.id)) return prev;
                  const next = [...prev, payload.new];
                  syncCache(next);
                  return next;
                });
              } else if (payload.eventType === 'UPDATE') {
                setOptions(prev => {
                  const next = prev.map(x => (x.id === payload.new.id ? payload.new : x));
                  syncCache(next);
                  return next;
                });
              } else if (payload.eventType === 'DELETE') {
                setOptions(prev => {
                  const next = prev.filter(x => x.id !== payload.old.id);
                  syncCache(next);
                  return next;
                });
              }
            } catch (err) {
              console.warn('[useEditorsOptions] Realtime payload handling error:', err);
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[useEditorsOptions] Realtime subscription error:', err);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [fetchOptions, syncCache]);

  // Derived active editor names list
  const activeEditors = options
    .filter(o => (o.category === 'editor' || !o.category) && o.is_active !== false)
    .map(o => o.name);

  // Derived editor color map
  const editorColorMap: Record<string, string> = {};
  options.forEach(o => {
    if (o.name && o.color && (o.category === 'editor' || !o.category)) {
      editorColorMap[o.name.trim().toLowerCase()] = o.color;
    }
  });

  // Mutator: Add option
  const addOption = async (category: 'editor' | 'creator' | 'branch' | 'type', name: string, color = '#f43f5e') => {
    const cleanName = name.trim();
    if (!cleanName) return;

    const payload = {
      name: cleanName,
      color: category === 'editor' ? (color || '#f43f5e') : '',
      category,
      is_active: true,
      display_order: options.length + 1,
    };

    const tempId = 'temp-' + Date.now();
    const optimistic = [...options, { ...payload, id: tempId }];
    setOptions(optimistic);
    syncCache(optimistic);

    try {
      const { data, error } = await supabase
        .from('editors_team_options_26')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setOptions(prev => {
          const updated = prev.map(x => (x.id === tempId ? data : x));
          syncCache(updated);
          return updated;
        });
      }
    } catch (err: any) {
      console.warn('[useEditorsOptions] add warning (saved locally):', err?.message);
    }
  };

  // Mutator: Update option
  const updateOption = async (id: number | string, updates: Partial<EditorOption>) => {
    setOptions(prev => {
      const updated = prev.map(x => (x.id === id ? { ...x, ...updates } : x));
      syncCache(updated);
      return updated;
    });

    try {
      if (typeof id === 'number' || (!String(id).startsWith('temp-') && !String(id).startsWith('def-'))) {
        await supabase.from('editors_team_options_26').update(updates).eq('id', id);
      }
    } catch (err: any) {
      console.warn('[useEditorsOptions] update warning (saved locally):', err?.message);
    }
  };

  // Mutator: Delete option
  const deleteOption = async (id: number | string, name?: string) => {
    setOptions(prev => {
      const updated = prev.filter(x => x.id !== id);
      if (name) {
        delete globalEditorColorMap[name.trim().toLowerCase()];
      }
      syncCache(updated);
      return updated;
    });

    try {
      if (typeof id === 'number' || (!String(id).startsWith('temp-') && !String(id).startsWith('def-'))) {
        await supabase.from('editors_team_options_26').delete().eq('id', id);
      }
    } catch (err: any) {
      console.warn('[useEditorsOptions] delete warning (saved locally):', err?.message);
    }
  };

  // Mutator: Seed defaults into Supabase
  const seedDefaults = async () => {
    const toInsert: any[] = [];
    DEFAULT_EDITORS_DATA.forEach((item, idx) => {
      toInsert.push({
        name: item.name,
        color: item.color,
        category: 'editor',
        is_active: true,
        display_order: idx + 1,
      });
    });
    DEFAULT_REELS_CREATORS.forEach((name, idx) => {
      toInsert.push({
        name,
        color: '',
        category: 'creator',
        is_active: true,
        display_order: idx + 1,
      });
    });
    DEFAULT_REELS_BRANCHES.forEach((name, idx) => {
      toInsert.push({
        name,
        color: '',
        category: 'branch',
        is_active: true,
        display_order: idx + 1,
      });
    });
    DEFAULT_REELS_TYPES.forEach((name, idx) => {
      toInsert.push({
        name,
        color: '',
        category: 'type',
        is_active: true,
        display_order: idx + 1,
      });
    });

    const { error } = await supabase.from('editors_team_options_26').insert(toInsert);
    if (error) throw error;
    await fetchOptions();
  };

  return {
    options,
    editors: activeEditors.length > 0 ? activeEditors : DEFAULT_EDITOR_NAMES,
    editorColorMap,
    loading,
    addOption,
    updateOption,
    deleteOption,
    seedDefaults,
    refreshEditors: fetchOptions,
  };
}
