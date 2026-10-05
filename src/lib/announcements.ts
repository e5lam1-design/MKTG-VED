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

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface PollVoterInfo {
  optionId: string;
  voterName?: string;
  votedAt?: string;
}

export interface PollData {
  question: string;
  options: PollOption[];
  voters: Record<string, PollVoterInfo>;
  totalVotes: number;
  createdAt?: string;
}

export interface SuggestionEntry {
  id: string;
  user_id?: string;
  user_name: string;
  response: string;
  created_at: string;
}

export interface QaData {
  question: string;
  totalResponses?: number;
  suggestions?: SuggestionEntry[];
  createdAt?: string;
}

export interface GlobalAnnouncement {
  id?: string;
  title?: string;
  message: string;
  imageUrl?: string;
  color: AnnouncementColor;
  is_active: boolean;
  is_poll?: boolean;
  poll_data?: PollData;
  is_qa?: boolean;
  qa_data?: QaData;
  updated_by?: string;
  updated_at?: string;
  created_at?: string;
}

const GLOBAL_KEY = '__global__';

function parseGlobalMessage(rawMessage: string): { 
  message: string; 
  imageUrl?: string;
  is_poll: boolean; 
  poll_data?: PollData;
  is_qa?: boolean;
  qa_data?: QaData;
} {
  if (typeof rawMessage === 'string' && rawMessage.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(rawMessage);

      // 1. Q&A / Suggestions mode
      if (parsed && (parsed.__is_qa__ === true || parsed.is_qa === true)) {
        const rawSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
        return {
          message: parsed.question || '',
          imageUrl: parsed.imageUrl || parsed.image_url || undefined,
          is_poll: false,
          is_qa: true,
          qa_data: {
            question: parsed.question || '',
            totalResponses: typeof parsed.totalResponses === 'number' ? parsed.totalResponses : rawSuggestions.length,
            suggestions: rawSuggestions,
            createdAt: parsed.createdAt
          }
        };
      }

      // 2. Poll mode
      if (parsed && (parsed.__is_poll__ === true || parsed.is_poll === true)) {
        const rawOptions = Array.isArray(parsed.options) ? parsed.options : [];
        const voters = typeof parsed.voters === 'object' && parsed.voters ? parsed.voters : {};
        
        // Recalculate accurately based on voters map
        const options: PollOption[] = rawOptions.map((opt: any, idx: number) => {
          const optId = String(opt.id || `opt_${idx + 1}`);
          const votesCount = Object.values(voters).filter((v: any) => v && v.optionId === optId).length;
          return {
            id: optId,
            text: opt.text || '',
            votes: typeof opt.votes === 'number' && opt.votes > votesCount ? opt.votes : votesCount
          };
        });

        const totalVotes = Object.keys(voters).length > 0 
          ? Object.keys(voters).length 
          : options.reduce((sum, o) => sum + (o.votes || 0), 0);

        return {
          message: parsed.question || '',
          imageUrl: parsed.imageUrl || parsed.image_url || undefined,
          is_poll: true,
          poll_data: {
            question: parsed.question || '',
            options,
            voters,
            totalVotes,
            createdAt: parsed.createdAt
          }
        };
      }

      // 3. Rich text announcement with image
      if (parsed && (parsed.__is_rich__ === true || parsed.is_rich === true || parsed.imageUrl || parsed.image_url)) {
        return {
          message: parsed.text || parsed.message || '',
          imageUrl: parsed.imageUrl || parsed.image_url || undefined,
          is_poll: false,
          is_qa: false
        };
      }
    } catch {}
  }

  return {
    message: rawMessage || '',
    is_poll: false,
    is_qa: false
  };
}

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
      const parsed = parseGlobalMessage(data.message);
      return {
        id: data.id,
        title: data.page_label || (parsed.is_qa ? '💬 اقتراحات وأسئلة' : parsed.is_poll ? '🗳️ استطلاع رأي' : 'إشعار عام'),
        message: parsed.message,
        imageUrl: data.image_url || parsed.imageUrl || undefined,
        color: (data.type as AnnouncementColor) || 'purple',
        is_active: data.is_active,
        is_poll: parsed.is_poll,
        poll_data: parsed.poll_data,
        is_qa: parsed.is_qa,
        qa_data: parsed.qa_data,
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
        const msgParsed = parseGlobalMessage(parsed.message);
        return {
          id: parsed.id,
          title: parsed.page_label || parsed.title || (msgParsed.is_qa ? '💬 اقتراحات وأسئلة' : msgParsed.is_poll ? '🗳️ استطلاع رأي' : 'إشعار عام'),
          message: msgParsed.message,
          imageUrl: parsed.image_url || parsed.imageUrl || msgParsed.imageUrl || undefined,
          color: (parsed.type as AnnouncementColor) || parsed.color || 'purple',
          is_active: parsed.is_active,
          is_poll: msgParsed.is_poll,
          poll_data: msgParsed.poll_data,
          is_qa: msgParsed.is_qa,
          qa_data: msgParsed.qa_data,
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
  announcement: { 
    title?: string; 
    message: string; 
    imageUrl?: string;
    color: AnnouncementColor;
    is_poll?: boolean;
    poll_data?: PollData;
    is_qa?: boolean;
    qa_data?: QaData;
  },
  userName: string
): Promise<{ success: boolean; error?: string }> {
  let messageToSave = announcement.message.trim();
  const cleanImageUrl = announcement.imageUrl?.trim() || null;

  if (announcement.is_qa && announcement.qa_data) {
    messageToSave = JSON.stringify({
      __is_qa__: true,
      question: announcement.qa_data.question.trim() || announcement.message.trim(),
      imageUrl: cleanImageUrl,
      totalResponses: announcement.qa_data.totalResponses || (announcement.qa_data.suggestions?.length || 0),
      suggestions: announcement.qa_data.suggestions || [],
      createdAt: announcement.qa_data.createdAt || new Date().toISOString()
    });
  } else if (announcement.is_poll && announcement.poll_data) {
    messageToSave = JSON.stringify({
      __is_poll__: true,
      question: announcement.poll_data.question.trim() || announcement.message.trim(),
      imageUrl: cleanImageUrl,
      options: announcement.poll_data.options.map(opt => ({
        id: opt.id,
        text: opt.text.trim(),
        votes: typeof opt.votes === 'number' ? opt.votes : 0
      })),
      voters: announcement.poll_data.voters || {},
      totalVotes: announcement.poll_data.totalVotes || 0,
      createdAt: announcement.poll_data.createdAt || new Date().toISOString()
    });
  } else if (cleanImageUrl) {
    messageToSave = JSON.stringify({
      __is_rich__: true,
      text: announcement.message.trim(),
      imageUrl: cleanImageUrl
    });
  }

  const defaultTitle = announcement.is_qa 
    ? '💬 اقتراحات وأفكار الفريق' 
    : announcement.is_poll 
      ? '🗳️ تصويت عام' 
      : 'إشعار عام';

  const payload: any = {
    page_key: GLOBAL_KEY,
    page_label: announcement.title || defaultTitle,
    message: messageToSave,
    image_url: cleanImageUrl,
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
 * Cast a vote on the global poll.
 * Strictly guarantees that each user can vote ONLY ONCE.
 */
export async function castPollVote(
  optionId: string,
  userKey: string,
  userName: string
): Promise<{ success: boolean; pollData?: PollData; error?: string }> {
  try {
    const latest = await getGlobalAnnouncement();
    if (!latest || !latest.is_poll || !latest.poll_data) {
      return { success: false, error: 'التصويت غير متاح أو تم حذفه' };
    }

    const poll = { ...latest.poll_data };
    const voters = { ...(poll.voters || {}) };

    const cleanKey = String(userKey).trim().toLowerCase();
    
    // Check if user already voted (case-insensitive key match)
    const existing = Object.keys(voters).some(k => k.toLowerCase() === cleanKey);
    if (existing) {
      return { 
        success: false, 
        error: 'لقد قمت بالتصويت بالفعل مسبقاً! كل عضو له صوت واحد فقط.', 
        pollData: poll 
      };
    }

    // Record the vote
    voters[cleanKey] = {
      optionId,
      voterName: userName || 'عضو بالفريق',
      votedAt: new Date().toISOString()
    };

    // Recalculate votes for all options accurately
    const updatedOptions = poll.options.map(opt => {
      const count = Object.values(voters).filter(v => v.optionId === opt.id).length;
      return { ...opt, votes: count };
    });

    const totalVotes = Object.keys(voters).length;

    const updatedPollData: PollData = {
      ...poll,
      options: updatedOptions,
      voters,
      totalVotes
    };

    const res = await saveGlobalAnnouncement(
      {
        title: latest.title,
        message: updatedPollData.question,
        color: latest.color,
        is_poll: true,
        poll_data: updatedPollData
      },
      latest.updated_by || userName
    );

    if (!res.success) {
      return { success: false, error: res.error || 'فشل في حفظ التصويت' };
    }

    return { success: true, pollData: updatedPollData };
  } catch (err: any) {
    console.error('Error casting vote:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء إرسال صوتك' };
  }
}

/**
 * Reset all votes in the global poll (Admin / Manager only).
 */
export async function resetPollVotes(userName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const latest = await getGlobalAnnouncement();
    if (!latest || !latest.is_poll || !latest.poll_data) {
      return { success: false, error: 'لا يوجد استطلاع رأي نشط لتصفيره' };
    }

    const updatedPollData: PollData = {
      ...latest.poll_data,
      options: latest.poll_data.options.map(o => ({ ...o, votes: 0 })),
      voters: {},
      totalVotes: 0
    };

    return await saveGlobalAnnouncement(
      {
        title: latest.title,
        message: updatedPollData.question,
        color: latest.color,
        is_poll: true,
        poll_data: updatedPollData
      },
      userName
    );
  } catch (err: any) {
    return { success: false, error: err.message || 'حدث خطأ أثناء تصفير الأصوات' };
  }
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

/**
 * Submit an answer / suggestion to the global broadcast Q&A.
 * Saves directly into the dedicated Supabase table 'broadcast_suggestions'
 * and updates qa_data inside page_announcements for real-time sync.
 */
export async function submitBroadcastSuggestion(
  response: string,
  userKey: string,
  userName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanResponse = response.trim();
    if (!cleanResponse) {
      return { success: false, error: 'يرجى كتابة اقتراحك أو إجابتك أولاً' };
    }

    const latest = await getGlobalAnnouncement();
    const questionText = (latest?.is_qa && latest.qa_data?.question) || latest?.message || '';

    // 1. Insert into Supabase table 'broadcast_suggestions'
    try {
      await supabase
        .from('broadcast_suggestions')
        .insert([
          {
            broadcast_id: '__global__',
            question: questionText,
            user_id: userKey,
            user_name: userName || 'عضو بالفريق',
            response: cleanResponse
          }
        ]);
    } catch (insertErr) {
      console.warn('Failed to insert into broadcast_suggestions table:', insertErr);
    }

    // 2. Also mirror into qa_data.suggestions for 0ms cross-client sync
    if (latest && latest.is_qa && latest.qa_data) {
      const existing = latest.qa_data.suggestions || [];
      const newEntry: SuggestionEntry = {
        id: `sug_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        user_id: userKey,
        user_name: userName || 'عضو بالفريق',
        response: cleanResponse,
        created_at: new Date().toISOString()
      };

      const updatedSuggestions = [newEntry, ...existing];
      const updatedQaData: QaData = {
        ...latest.qa_data,
        suggestions: updatedSuggestions,
        totalResponses: (latest.qa_data.totalResponses || existing.length) + 1
      };

      await saveGlobalAnnouncement(
        {
          title: latest.title,
          message: latest.message,
          color: latest.color,
          is_qa: true,
          qa_data: updatedQaData
        },
        latest.updated_by || userName
      );
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error submitting broadcast suggestion:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء إرسال اقتراحك' };
  }
}

/**
 * Fetch all submitted suggestions for the active broadcast.
 * Reads from Supabase table 'broadcast_suggestions' with fallback to qa_data.
 */
export async function fetchBroadcastSuggestions(broadcastId: string = '__global__'): Promise<SuggestionEntry[]> {
  try {
    const { data, error } = await supabase
      .from('broadcast_suggestions')
      .select('*')
      .eq('broadcast_id', broadcastId)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((d: any) => ({
        id: String(d.id),
        user_id: d.user_id,
        user_name: d.user_name || 'مستخدم',
        response: d.response || '',
        created_at: d.created_at || new Date().toISOString()
      }));
    }
  } catch (err) {
    console.warn('Error fetching from broadcast_suggestions table:', err);
  }

  // Fallback to qa_data inside latest announcement
  try {
    const latest = await getGlobalAnnouncement();
    if (latest?.is_qa && latest.qa_data?.suggestions) {
      return latest.qa_data.suggestions;
    }
  } catch {}

  return [];
}

/**
 * Delete a specific suggestion (Admin / Manager only).
 */
export async function deleteBroadcastSuggestion(suggestionId: string): Promise<boolean> {
  try {
    await supabase
      .from('broadcast_suggestions')
      .delete()
      .eq('id', suggestionId);
  } catch {}

  // Also remove from qa_data if present
  try {
    const latest = await getGlobalAnnouncement();
    if (latest?.is_qa && latest.qa_data?.suggestions) {
      const filtered = latest.qa_data.suggestions.filter(s => s.id !== suggestionId);
      await saveGlobalAnnouncement(
        {
          title: latest.title,
          message: latest.message,
          color: latest.color,
          is_qa: true,
          qa_data: {
            ...latest.qa_data,
            suggestions: filtered,
            totalResponses: Math.max(0, (latest.qa_data.totalResponses || 1) - 1)
          }
        },
        latest.updated_by || 'المانجر'
      );
    }
  } catch {}

  return true;
}

