import { supabase } from './supabase';

export interface PageAnnouncement {
  id?: string;
  page_key: string;
  page_label?: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  is_active: boolean;
  updated_by?: string;
  updated_at?: string;
  created_at?: string;
}

const DASHBOARD_DATA_KEY = 'page_announcements';

/**
 * Fetch announcement for a specific page key.
 * Tries the dedicated 'page_announcements' table first; if not present, falls back to 'dashboard_data'.
 */
export async function getPageAnnouncement(pageKey: string): Promise<PageAnnouncement | null> {
  if (!pageKey) return null;

  try {
    // 1. Try dedicated table 'page_announcements'
    const { data, error } = await supabase
      .from('page_announcements')
      .select('*')
      .eq('page_key', pageKey)
      .eq('is_active', true)
      .maybeSingle();

    if (!error && data) {
      return data as PageAnnouncement;
    }
  } catch {
    // Fallback to dashboard_data
  }

  try {
    // 2. Fallback to 'dashboard_data' table
    const { data: dbData } = await supabase
      .from('dashboard_data')
      .select('*')
      .eq('key', DASHBOARD_DATA_KEY)
      .eq('field', pageKey)
      .maybeSingle();

    if (dbData && dbData.value) {
      const parsed = typeof dbData.value === 'string' ? JSON.parse(dbData.value) : dbData.value;
      if (parsed && parsed.is_active !== false) {
        return parsed as PageAnnouncement;
      }
    }
  } catch (err) {
    console.warn('Error reading page announcement fallback:', err);
  }

  // 3. Check local storage cache
  try {
    const local = localStorage.getItem(`announcement_${pageKey}`);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && parsed.is_active !== false) return parsed;
    }
  } catch {}

  return null;
}

/**
 * Save or update announcement for a page.
 */
export async function savePageAnnouncement(
  announcement: PageAnnouncement,
  userName: string
): Promise<{ success: boolean; error?: string }> {
  const payload: PageAnnouncement = {
    ...announcement,
    updated_by: userName || 'المانجر',
    updated_at: new Date().toISOString(),
    is_active: true
  };

  // Cache locally
  try {
    localStorage.setItem(`announcement_${announcement.page_key}`, JSON.stringify(payload));
  } catch {}

  let saved = false;

  // 1. Try dedicated table
  try {
    const { error } = await supabase
      .from('page_announcements')
      .upsert([payload], { onConflict: 'page_key' });

    if (!error) saved = true;
  } catch {
    // Dedicated table might not exist yet
  }

  // 2. Always persist to dashboard_data as well to guarantee universal persistence
  try {
    await supabase.from('dashboard_data').upsert([
      {
        key: DASHBOARD_DATA_KEY,
        field: announcement.page_key,
        value: JSON.stringify(payload),
        updated_by: userName,
        updated_at: new Date().toISOString()
      }
    ], { onConflict: 'key,field' });
    saved = true;
  } catch (err: any) {
    console.error('Error saving to dashboard_data fallback:', err);
    if (!saved) return { success: false, error: err?.message || 'فشل في حفظ التنبيه' };
  }

  return { success: true };
}

/**
 * Delete (or deactivate) an announcement for a page.
 */
export async function deletePageAnnouncement(pageKey: string): Promise<boolean> {
  // Clear local cache
  try {
    localStorage.removeItem(`announcement_${pageKey}`);
  } catch {}

  // 1. Try dedicated table
  try {
    await supabase
      .from('page_announcements')
      .delete()
      .eq('page_key', pageKey);
  } catch {}

  // 2. Also remove from dashboard_data fallback
  try {
    await supabase
      .from('dashboard_data')
      .delete()
      .eq('key', DASHBOARD_DATA_KEY)
      .eq('field', pageKey);
  } catch {}

  return true;
}

// ─── Global Announcement (Shows across all pages & tabs) ──────────────────────
export type AnnouncementColor = 'blue' | 'purple' | 'rose' | 'emerald' | 'amber' | 'cyan' | 'sunset';

export interface GlobalAnnouncement {
  id?: string;
  title?: string;
  message: string;
  color: AnnouncementColor;
  is_active: boolean;
  updated_by?: string;
  updated_at?: string;
  created_at?: string;
}

const GLOBAL_KEY = '__global__';

/**
 * Fetch the global announcement that appears on all pages.
 */
export async function getGlobalAnnouncement(): Promise<GlobalAnnouncement | null> {
  try {
    const { data, error } = await supabase
      .from('page_announcements')
      .select('*')
      .eq('page_key', GLOBAL_KEY)
      .eq('is_active', true)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        title: data.page_label || 'إشعار عام',
        message: data.message,
        color: (data.type as AnnouncementColor) || 'purple',
        is_active: data.is_active,
        updated_by: data.updated_by,
        updated_at: data.updated_at,
        created_at: data.created_at
      };
    }
  } catch (err) {
    console.warn('Error reading global announcement:', err);
  }

  // Fallback to localStorage
  try {
    const local = localStorage.getItem(`announcement_${GLOBAL_KEY}`);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && parsed.is_active !== false) {
        return {
          id: parsed.id,
          title: parsed.page_label || parsed.title || 'إشعار عام',
          message: parsed.message,
          color: (parsed.type as AnnouncementColor) || parsed.color || 'purple',
          is_active: parsed.is_active,
          updated_by: parsed.updated_by,
          updated_at: parsed.updated_at,
          created_at: parsed.created_at
        };
      }
    }
  } catch {}

  return null;
}

/**
 * Save or update the global announcement for all pages.
 */
export async function saveGlobalAnnouncement(
  announcement: { title?: string; message: string; color: AnnouncementColor },
  userName: string
): Promise<{ success: boolean; error?: string }> {
  const payload = {
    page_key: GLOBAL_KEY,
    page_label: announcement.title || 'إشعار عام',
    message: announcement.message.trim(),
    type: announcement.color || 'purple',
    is_active: true,
    updated_by: userName || 'المانجر',
    updated_at: new Date().toISOString()
  };

  // Cache locally
  try {
    localStorage.setItem(`announcement_${GLOBAL_KEY}`, JSON.stringify(payload));
  } catch {}

  try {
    const { error } = await supabase
      .from('page_announcements')
      .upsert([payload], { onConflict: 'page_key' });

    if (error) throw error;
  } catch (err: any) {
    console.error('Error saving global announcement:', err);
    return { success: false, error: err?.message || 'فشل في حفظ الإشعار العام' };
  }

  return { success: true };
}

/**
 * Delete (or deactivate) the global announcement.
 */
export async function deleteGlobalAnnouncement(): Promise<boolean> {
  try {
    localStorage.removeItem(`announcement_${GLOBAL_KEY}`);
  } catch {}

  try {
    const { error } = await supabase
      .from('page_announcements')
      .delete()
      .eq('page_key', GLOBAL_KEY);

    if (error) {
      // Alternatively set is_active to false
      await supabase
        .from('page_announcements')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('page_key', GLOBAL_KEY);
    }
  } catch (err) {
    console.warn('Error deleting global announcement:', err);
  }

  return true;
}
