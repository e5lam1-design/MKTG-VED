import React, { createContext, useContext, useEffect, useState } from 'react';
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

  const fetchProfile = async (userId: string, email?: string | null) => {
    const normalizedEmail = (email || '').toLowerCase().trim();

    // Guaranteed bootstrap access for the project owner.
    if (normalizedEmail && SUPER_ADMIN_EMAILS.has(normalizedEmail)) {
      setProfile({
        id: userId,
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0],
        role: 'admin',
        allowed_tabs: [],
        is_active: true,
        created_at: new Date().toISOString(),
      });
      return;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) {
      setProfile(data as UserProfile);
      return;
    }

    // Fallback for legacy rows where profile id is not equal to auth user id.
    if (normalizedEmail) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', normalizedEmail)
        .single();

      if (!fallbackError && fallbackData) {
        setProfile(fallbackData as UserProfile);
        return;
      }

      // Legacy fallback: some environments store role mapping in dashboard_data.
      const { data: roleMapData, error: roleMapError } = await supabase
        .from('dashboard_data')
        .select('value')
        .eq('field', normalizedEmail)
        .maybeSingle();

      const mappedRole = String(roleMapData?.value || '').toLowerCase() as Role;
      if (!roleMapError && VALID_ROLES.includes(mappedRole)) {
        setProfile({
          id: userId,
          email: normalizedEmail,
          name: normalizedEmail.split('@')[0],
          role: mappedRole,
          allowed_tabs: [],
          is_active: true,
          created_at: new Date().toISOString(),
        });
        return;
      }
    }

    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id, user.email);
  };

  useEffect(() => {
    const rawLocalProfile = localStorage.getItem(LOCAL_LOGIN_KEY);
    if (rawLocalProfile) {
      try {
        const localProfile = JSON.parse(rawLocalProfile) as UserProfile;
        setProfile(localProfile);
        setLoading(false);
      } catch {
        localStorage.removeItem(LOCAL_LOGIN_KEY);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
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
      return { error: null };
    }

    // Optional password mode: login by name/email from user_profiles only.
    let query = supabase.from('user_profiles').select('*').limit(1);
    if (normalizedIdentifier.includes('@')) {
      query = query.eq('email', normalizedIdentifier);
    } else {
      query = query.ilike('name', normalizedIdentifier);
    }
    const { data, error } = await query.maybeSingle();
    if (error || !data) return { error: 'الاسم أو الإيميل غير موجود' };
    if (data.is_active === false) return { error: 'الحساب غير مفعل' };

    const localProfile = data as UserProfile;
    setUser(null);
    setSession(null);
    setProfile(localProfile);
    localStorage.setItem(LOCAL_LOGIN_KEY, JSON.stringify(localProfile));
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(LOCAL_LOGIN_KEY);
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
