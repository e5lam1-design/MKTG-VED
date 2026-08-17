import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface TeamOption {
  id?: number | string;
  category: 'designer' | 'requester' | 'priority' | 'type';
  name: string;
  color?: string;
  is_active?: boolean;
  display_order?: number;
  created_at?: string;
}

export const DEFAULT_DESIGNERS = ['Narden', 'AYA', 'MANAR', 'JUMANA'];

export const DEFAULT_REQUESTERS = [
  'SHERIF', 'SHROUK', 'ESRAA', 'Hesham', 'Sohaila', 'alaa', 'alaa zakria', 
  'NOUR', 'NOURHAN', 'KHALED', 'EMAN', 'AWNEY', 'ANAS', 'SAMIR', 'MONA', 
  'YOMNA', 'MANAR', 'MARAM', 'Esraa nagi', 'A.AMR', 'AHMED', 'nada', 
  'abdelkerim', 'Donia', 'Esraa Naga', 'A.Medhat'
];
export const DEFAULT_PRIORITIES = ['انهارده - ضروري', 'بكرة', 'انهارده - ممكن يتأجل', 'CHECK DEADLINE'];
export const DEFAULT_TYPES = ['THUMBNAIL', 'YT-COMMUNTIY', 'SOCIAL-MEDIA', 'OTHER'];

export function useDesignersOptions() {
  const [options, setOptions] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch options from Supabase
  const fetchOptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('designers_team_options_26')
        .select('*')
        .order('display_order', { ascending: true })
        .order('id', { ascending: true });

      if (error) {
        console.warn('[useDesignersOptions] Supabase error, falling back to defaults:', error.message);
        return;
      }

      if (data && data.length > 0) {
        setOptions(data);
      }
    } catch (err) {
      console.error('[useDesignersOptions] fetch exception:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOptions();

    // Supabase Realtime subscription
    const channel = supabase
      .channel('designers_team_options_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'designers_team_options_26' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setOptions(prev => {
              if (prev.some(x => x.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          } else if (payload.eventType === 'UPDATE') {
            setOptions(prev => prev.map(x => (x.id === payload.new.id ? payload.new : x)));
          } else if (payload.eventType === 'DELETE') {
            setOptions(prev => prev.filter(x => x.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOptions]);

  // Derived lists (filtered for active ones, plus fallback to defaults if database is empty)
  const designers = (() => {
    const dbItems = options.filter(o => o.category === 'designer' && o.is_active !== false).map(o => o.name);
    if (dbItems.length > 0) return dbItems;
    // merge with any local storage custom items
    try {
      const saved = JSON.parse(localStorage.getItem('designers_custom_designer') || '[]');
      return Array.from(new Set([...DEFAULT_DESIGNERS, ...saved]));
    } catch {
      return DEFAULT_DESIGNERS;
    }
  })();

  const requesters = (() => {
    const dbItems = options.filter(o => o.category === 'requester' && o.is_active !== false).map(o => o.name);
    if (dbItems.length > 0) return dbItems;
    try {
      const saved = JSON.parse(localStorage.getItem('designers_custom_requester') || '[]');
      return Array.from(new Set([...DEFAULT_REQUESTERS, ...saved]));
    } catch {
      return DEFAULT_REQUESTERS;
    }
  })();

  const priorities = (() => {
    const dbItems = options.filter(o => o.category === 'priority' && o.is_active !== false).map(o => o.name);
    if (dbItems.length > 0) return dbItems;
    try {
      const saved = JSON.parse(localStorage.getItem('designers_custom_priority') || '[]');
      return Array.from(new Set([...DEFAULT_PRIORITIES, ...saved]));
    } catch {
      return DEFAULT_PRIORITIES;
    }
  })();

  const types = (() => {
    const dbItems = options.filter(o => o.category === 'type' && o.is_active !== false).map(o => o.name);
    if (dbItems.length > 0) return dbItems;
    try {
      const saved = JSON.parse(localStorage.getItem('designers_custom_type') || '[]');
      return Array.from(new Set([...DEFAULT_TYPES, ...saved]));
    } catch {
      return DEFAULT_TYPES;
    }
  })();

  // Mutators
  const addOption = async (category: 'designer' | 'requester' | 'priority' | 'type', name: string, color = '') => {
    const cleanName = name.trim();
    if (!cleanName) return;

    const payload = {
      category,
      name: cleanName,
      color,
      is_active: true,
      display_order: options.length + 1
    };

    // Optimistic local update
    const tempId = 'temp-' + Date.now();
    setOptions(prev => [...prev, { ...payload, id: tempId }]);

    try {
      const { data, error } = await supabase
        .from('designers_team_options_26')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setOptions(prev => prev.map(x => (x.id === tempId ? data : x)));
      }
    } catch (err) {
      console.error('[useDesignersOptions] add error:', err);
      // fallback to localStorage
      try {
        const key = `designers_custom_${category}`;
        const saved = JSON.parse(localStorage.getItem(key) || '[]');
        if (!saved.includes(cleanName)) {
          localStorage.setItem(key, JSON.stringify([...saved, cleanName]));
        }
      } catch {}
    }
  };

  const deleteOption = async (id: number | string, category?: string, name?: string) => {
    setOptions(prev => prev.filter(x => x.id !== id));
    try {
      if (typeof id === 'number' || !String(id).startsWith('temp-')) {
        await supabase.from('designers_team_options_26').delete().eq('id', id);
      }
      if (category && name) {
        const key = `designers_custom_${category}`;
        const saved = JSON.parse(localStorage.getItem(key) || '[]');
        localStorage.setItem(key, JSON.stringify(saved.filter((x: string) => x !== name)));
      }
    } catch (err) {
      console.error('[useDesignersOptions] delete error:', err);
    }
  };

  const updateOption = async (id: number | string, updates: Partial<TeamOption>) => {
    setOptions(prev => prev.map(x => (x.id === id ? { ...x, ...updates } : x)));
    try {
      if (typeof id === 'number' || !String(id).startsWith('temp-')) {
        await supabase.from('designers_team_options_26').update(updates).eq('id', id);
      }
    } catch (err) {
      console.error('[useDesignersOptions] update error:', err);
    }
  };

  return {
    options,
    loading,
    designers,
    requesters,
    priorities,
    types,
    addOption,
    deleteOption,
    updateOption,
    refreshOptions: fetchOptions
  };
}
