import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type DesignerTask = {
  id: number;
  created_at: string;
  name?: string;
  task_name?: string;
  date: string;
  designer: string;
  priority: string;
  requester: string;
  type: string;
  deadline: string;
  reference: string;
  notes: string;
  done: boolean;
  completed_date: string;
  completed_at: string | null;
  done_designer: boolean;
  received_creator: boolean;
  done_designer_at: string | null;
  received_creator_at: string | null;
};

const TABLE = 'designers_tasks_26';

export function useDesignersTasks() {
  const [tasks, setTasks] = useState<DesignerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('id', { ascending: false });
    if (error) {
      console.error('[useDesignersTasks] fetch error:', error.message);
      setError(error.message);
    } else {
      setTasks(data as DesignerTask[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel('designers_tasks_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTasks(prev => [payload.new as DesignerTask, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setTasks(prev => prev.map(t => t.id === (payload.new as DesignerTask).id ? payload.new as DesignerTask : t));
        } else if (payload.eventType === 'DELETE') {
          setTasks(prev => prev.filter(t => t.id !== (payload.old as any).id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const addTask = useCallback(async (formData: Omit<DesignerTask, 'id' | 'created_at' | 'completed_at'>) => {
    const payload: any = {
      date: formData.date || new Date().toLocaleDateString('en-US'),
      designer: formData.designer || '',
      priority: formData.priority || '',
      requester: formData.requester || '',
      type: formData.type || '',
      deadline: formData.deadline || '',
      reference: formData.reference || '',
      notes: formData.notes || '',
      name: (formData as any).name || (formData as any).task_name || '',
      task_name: (formData as any).task_name || (formData as any).name || '',
      done: formData.done || false,
      completed_date: formData.completed_date || '',
      completed_at: null,
    };
    const { data, error } = await supabase.from(TABLE).insert([payload]).select().single();
    if (error) { console.error('[useDesignersTasks] insert error:', error.message); throw error; }
    return data as DesignerTask;
  }, []);

  const updateTask = useCallback(async (id: number, updates: Partial<DesignerTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    const { error } = await supabase.from(TABLE).update(updates).eq('id', id);
    if (error) {
      console.warn('[useDesignersTasks] update error (retrying without optional timestamp fields):', error.message);
      const fallbackUpdates = { ...updates };
      delete fallbackUpdates.done_designer_at;
      delete fallbackUpdates.received_creator_at;
      const { error: retryErr } = await supabase.from(TABLE).update(fallbackUpdates).eq('id', id);
      if (retryErr) {
        console.error('[useDesignersTasks] fatal update error:', retryErr.message);
        fetchAll();
      }
    }
  }, [fetchAll]);

  const deleteTask = useCallback(async (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) { console.error('[useDesignersTasks] delete error:', error.message); fetchAll(); throw error; }
  }, [fetchAll]);

  const toggleDone = useCallback(async (id: number, currentDone: boolean) => {
    const updates: Partial<DesignerTask> = {
      done: !currentDone,
      completed_date: !currentDone ? new Date().toLocaleDateString('en-US') : '',
      completed_at: !currentDone ? new Date().toISOString() : null,
    };
    await updateTask(id, updates);
  }, [updateTask]);

  return { tasks, loading, error, addTask, updateTask, deleteTask, toggleDone, refetch: fetchAll };
}
