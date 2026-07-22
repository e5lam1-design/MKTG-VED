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
const VALID_ROLES: Role[] = ['admin', 'manager', 'supervisor', 'junior'];
const SUPER_ADMIN_EMAILS = new Set(['eslamabdalhamidfb@gmail.com']);
const LOCAL_LOGIN_KEY = 'local_profile_login';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const localProfileIdRef = useRef<string | null>(null);

  // Fetch from Supabase ONLY — single source of truth
  const fetchProfileFromDB = async (userId: string, email?: string | null): Promise<UserProfile | null> => {
    const normalizedEmail = (email || '').toLowerCase().trim();

    // Try by ID first
    const { data: byId } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (byId) return byId as UserProfile;

    // Try by email
    if (normalizedEmail) {
      const { data: byEmail } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();
      if (byEmail) return byEmail as UserProfile;

      // Try by name (for username-style logins)
      const { data: byName } = await supabase
        .from('user_profiles')
        .select('*')
        .ilike('name', normalizedEmail)
        .maybeSingle();
      if (byName) return byName as UserProfile;

      // Super admin bootstrap — always give admin access if in the whitelist
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
    setProfile(p);
    localStorage.setItem(LOCAL_LOGIN_KEY, JSON.stringify(p));
  };

  const refreshProfile = async () => {
    // If Supabase auth session exists, use that
    if (user?.id) {
      const p = await fetchProfileFromDB(user.id, user.email);
      if (p) { applyProfile(p); return; }
    }

    // Fallback: use stored local profile ID to re-fetch from Supabase
    const storedId = localProfileIdRef.current;
    if (storedId) {
      const p = await fetchProfileFromDB(storedId);
      if (p) { applyProfile(p); return; }
    }

    // Last resort: re-read localStorage and re-fetch
    try {
      const raw = localStorage.getItem(LOCAL_LOGIN_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as UserProfile;
        const p = await fetchProfileFromDB(stored.id, stored.email);
        if (p) { applyProfile(p); return; }
        // If Supabase can't be reached, use stored data as-is
        setProfile(stored);
      }
    } catch {}
  };

  useEffect(() => {
    // Bootstrap from localStorage immediately for fast load
    try {
      const raw = localStorage.getItem(LOCAL_LOGIN_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as UserProfile;
        setProfile(stored);
        localProfileIdRef.current = stored.id;
        // Immediately re-fetch from DB to get latest allowed_tabs
        fetchProfileFromDB(stored.id, stored.email).then(fresh => {
          if (fresh) applyProfile(fresh);
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
          .then(p => { if (p) applyProfile(p); })
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
          .then(p => { if (p) applyProfile(p); });
      } else if (!localProfileIdRef.current) {
        setProfile(null);
      }
    });

    // Listen for profile-updated events from UserManagement
    const handleProfileUpdated = () => { refreshProfile(); };
    window.addEventListener('profile-updated', handleProfileUpdated);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('profile-updated', handleProfileUpdated);
    };
  }, []);

  const signIn = async (identifier: string, password?: string) => {
    const normalizedIdentifier = identifier.toLowerCase().trim();

    // With password → use Supabase auth
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

    const p = data as UserProfile;
    localProfileIdRef.current = p.id;
    setUser(null);
    setSession(null);
    applyProfile(p);
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
