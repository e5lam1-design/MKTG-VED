import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { UserProfile, Role } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  role: Role | null;
  signIn: (identifier: string, password?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const SUPER_ADMIN_EMAILS = new Set(['eslamabdalhamidfb@gmail.com']);
const LOCAL_LOGIN_KEY = 'local_profile_login';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const localProfileIdRef = useRef<string | null>(null);

  // ─── Helper: parse allowed_tabs safely (handles both array & JSON string) ───
  const parseAllowedTabs = (val: any): string[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return []; }
    }
    return [];
  };

  // ─── Fetch profile from Supabase — single source of truth ──────────────────
  const fetchProfileFromDB = async (userId: string, email?: string | null): Promise<UserProfile | null> => {
    const normalizedEmail = (email || '').toLowerCase().trim();

    // 1. Try by Supabase Auth ID
    const { data: byId } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (byId) return { ...byId, allowed_tabs: parseAllowedTabs(byId.allowed_tabs) } as UserProfile;

    // 2. Try by email
    if (normalizedEmail) {
      const { data: byEmail } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();
      if (byEmail) return { ...byEmail, allowed_tabs: parseAllowedTabs(byEmail.allowed_tabs) } as UserProfile;

      // 3. Try by name (username-style login)
      const { data: byName } = await supabase
        .from('user_profiles')
        .select('*')
        .ilike('name', normalizedEmail)
        .maybeSingle();
      if (byName) return { ...byName, allowed_tabs: parseAllowedTabs(byName.allowed_tabs) } as UserProfile;

      // 4. Super admin bootstrap
      if (SUPER_ADMIN_EMAILS.has(normalizedEmail)) {
        return {
          id: userId,
          email: normalizedEmail,
          name: normalizedEmail.split('@')[0],
          role: 'admin',
          allowed_tabs: [],
          is_active: true,
          created_at: new Date().toISOString(),
        } as UserProfile;
      }
    }

    return null;
  };

  const applyProfile = (p: UserProfile) => {
    const normalized = { ...p, allowed_tabs: parseAllowedTabs(p.allowed_tabs) };
    setProfile(normalized);
    localStorage.setItem(LOCAL_LOGIN_KEY, JSON.stringify(normalized));
  };

  const refreshProfile = async () => {
    if (user?.id) {
      const p = await fetchProfileFromDB(user.id, user.email);
      if (p) { applyProfile(p); return; }
    }
    const storedId = localProfileIdRef.current;
    if (storedId) {
      const p = await fetchProfileFromDB(storedId);
      if (p) { applyProfile(p); return; }
    }
    try {
      const raw = localStorage.getItem(LOCAL_LOGIN_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as UserProfile;
        const p = await fetchProfileFromDB(stored.id, stored.email);
        if (p) { applyProfile(p); return; }
        setProfile({ ...stored, allowed_tabs: parseAllowedTabs(stored.allowed_tabs) });
      }
    } catch {}
  };

  // ─── Subscribe to Realtime changes on user_profiles ────────────────────────
  const subscribeToProfileChanges = (profileId: string) => {
    const channel = supabase
      .channel(`profile-${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${profileId}`,
        },
        (payload) => {
          console.log('[Realtime] profile updated:', payload.new);
          const updated = payload.new as UserProfile;
          applyProfile({ ...updated, allowed_tabs: parseAllowedTabs(updated.allowed_tabs) });
        }
      )
      .subscribe();

    return channel;
  };

  useEffect(() => {
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    const setupProfile = async (p: UserProfile) => {
      applyProfile(p);
      localProfileIdRef.current = p.id;
      // Subscribe to realtime changes for this user's row
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
      realtimeChannel = subscribeToProfileChanges(p.id);
    };

    // Bootstrap from localStorage immediately for fast load
    try {
      const raw = localStorage.getItem(LOCAL_LOGIN_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as UserProfile;
        setProfile({ ...stored, allowed_tabs: parseAllowedTabs(stored.allowed_tabs) });
        localProfileIdRef.current = stored.id;
        // Re-fetch latest from DB in background
        fetchProfileFromDB(stored.id, stored.email).then(fresh => {
          if (fresh) setupProfile(fresh);
        });
      }
    } catch {
      localStorage.removeItem(LOCAL_LOGIN_KEY);
    }

    // Supabase auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileFromDB(session.user.id, session.user.email)
          .then(p => { if (p) setupProfile(p); })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileFromDB(session.user.id, session.user.email)
          .then(p => { if (p) setupProfile(p); });
      } else if (!localProfileIdRef.current) {
        setProfile(null);
      }
    });

    // Also listen for manual profile-updated events
    const handleProfileUpdated = () => { refreshProfile(); };
    window.addEventListener('profile-updated', handleProfileUpdated);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('profile-updated', handleProfileUpdated);
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    };
  }, []);

  const signIn = async (identifier: string, password?: string) => {
    const normalizedIdentifier = identifier.toLowerCase().trim();

    if (password && password.trim().length > 0) {
      let email = normalizedIdentifier;
      if (!normalizedIdentifier.includes('@')) {
        const resolveRes = await fetch('/api/resolve-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: normalizedIdentifier }),
        });
        const resolveData = await resolveRes.json().catch(() => ({}));
        email = String(resolveData?.email || '').toLowerCase().trim();
      }
      if (!email) return { error: 'اسم المستخدم غير موجود' };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      localStorage.removeItem(LOCAL_LOGIN_KEY);
      localProfileIdRef.current = null;
      return { error: null };
    }

    // Without password → look up in user_profiles
    let query = supabase.from('user_profiles').select('*').limit(1);
    if (normalizedIdentifier.includes('@')) {
      query = query.eq('email', normalizedIdentifier);
    } else {
      query = query.ilike('name', normalizedIdentifier);
    }
    const { data, error } = await query.maybeSingle();
    if (error || !data) return { error: 'الاسم أو الإيميل غير موجود' };
    if (data.is_active === false) return { error: 'الحساب غير مفعل' };

    const p = { ...data, allowed_tabs: parseAllowedTabs(data.allowed_tabs) } as UserProfile;
    localProfileIdRef.current = p.id;
    setUser(null);
    setSession(null);
    applyProfile(p);
    // Subscribe to realtime for this user
    subscribeToProfileChanges(p.id);
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(LOCAL_LOGIN_KEY);
    localProfileIdRef.current = null;
    setProfile(null);
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{
      user, profile, session, loading,
      role: profile?.role ?? null,
      signIn, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
