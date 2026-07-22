import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, ROLE_LABELS, ROLE_COLORS, DEFAULT_ROLE_PERMISSIONS, setRuntimeRolePermissions } from '../lib/supabase';
import type { UserProfile, Role } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Users, UserPlus, Shield, Search, X, Check,
  Loader2, AlertCircle, ChevronDown, ToggleLeft, ToggleRight, Trash2
} from 'lucide-react';

const MARKETING_TABS = [
  'Operations', 'تجميعات', 'إحصائيات التجميعات 📊',
  'Junior 4', 'Junior 5', 'Junior 6',
  'Middle 1', 'Middle 2', 'Middle 3',
  'Senior 1', 'Senior 2', 'Senior 3'
];

const VIDEO_TABS = [
  'Shooting', 'Ve', 'CUTS', 'احصائيات الريلز',
  'Designers', 'احصائيات تصاميم'
];

const ALL_TABS = [...MARKETING_TABS, ...VIDEO_TABS];

const AvatarInitials = ({ name, role, team }: { name: string; role: Role; team?: string }) => {
  const colors: Record<Role, string> = {
    admin: 'from-rose-600 to-pink-600',
    manager: 'from-yellow-500 via-amber-500 to-yellow-600 shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-yellow-400/30',
    supervisor: 'from-blue-600 to-cyan-600',
    junior: 'from-emerald-600 to-teal-600',
  };

  let bgGradient = colors[role];
  if (role === 'manager') {
    bgGradient = 'from-yellow-500 via-amber-500 to-yellow-600 shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-yellow-400/30';
  } else if (team === 'video') {
    bgGradient = 'from-emerald-500 to-teal-600';
  } else if (team === 'marketing') {
    bgGradient = 'from-purple-500 to-violet-600';
  }

  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${bgGradient} flex items-center justify-center text-white text-sm font-black shadow-lg shrink-0`}>
      {initials}
    </div>
  );
};

interface EditUserModalProps {
  user: UserProfile;
  initialTeam: 'marketing' | 'video' | '';
  onClose: () => void;
  onSave: (id: string, updates: Partial<UserProfile>, team: 'marketing' | 'video' | '') => Promise<void>;
}

const EditUserModal = ({ user, initialTeam, onClose, onSave }: EditUserModalProps) => {
  const [role, setRole] = useState<Role>(user.role);
  const [allowedTabs, setAllowedTabs] = useState<string[]>(user.allowed_tabs || []);
  const [selectedTeam, setSelectedTeam] = useState<'marketing' | 'video' | ''>(initialTeam);
  const [saving, setSaving] = useState(false);
  const [defaultMode, setDefaultMode] = useState<'operations' | 'reels' | 'designers'>(user.default_mode || 'operations');

  const toggleTab = (tab: string) => {
    setAllowedTabs(prev =>
      prev.includes(tab) ? prev.filter(t => t !== tab) : [...prev, tab]
    );
  };

  const handleSave = () => {
    onSave(user.id, { role, allowed_tabs: allowedTabs, default_mode: defaultMode }, selectedTeam)
      .catch(err => {
        console.error('[handleSave]', err);
      });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#0d1219] border border-white/10 rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-[0_0_80px_rgba(0,0,0,0.8)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-white arabic-text">تعديل المستخدم وصلاحياته</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 mb-6 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <AvatarInitials name={user.name} role={role} team={selectedTeam} />
          <div>
            <p className="text-sm font-bold text-white arabic-text">{user.name}</p>
          </div>
        </div>

        {/* Role Selector */}
        <div className="mb-5">
          <label className="text-[11px] font-black text-white/50 uppercase tracking-widest mb-2 block">الصلاحية</label>
          <div className="grid grid-cols-2 gap-2">
            {(['admin', 'manager', 'supervisor', 'junior'] as Role[]).map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`py-2.5 px-4 rounded-xl text-sm font-black border transition-all cursor-pointer ${
                  role === r
                    ? ROLE_COLORS[r] + ' ring-2 ring-offset-1 ring-offset-[#0d1219] ring-current'
                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                }`}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {/* Team Selector */}
        <div className="mb-5">
          <label className="text-[11px] font-black text-white/50 uppercase tracking-widest mb-2 block">فريق العمل (Team)</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setSelectedTeam('')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                !selectedTeam
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
              }`}
            >
              بلا فريق
            </button>
            <button
              onClick={() => {
                setSelectedTeam('video');
                setDefaultMode('reels');
                setAllowedTabs(VIDEO_TABS);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                selectedTeam === 'video'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 ring-2 ring-emerald-500/30'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
              }`}
            >
              فريق الفيديو
            </button>
            <button
              onClick={() => {
                setSelectedTeam('marketing');
                setDefaultMode('operations');
                setAllowedTabs(MARKETING_TABS);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                selectedTeam === 'marketing'
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 ring-2 ring-purple-500/30'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
              }`}
            >
              فريق الماركتينج
            </button>
          </div>
        </div>

        {/* Default Mode Selector */}
        <div className="mb-5">
          <label className="text-[11px] font-black text-white/50 uppercase tracking-widest mb-2 block">الوضع الافتراضي (Default Mode)</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'operations', label: 'العمليات' },
              { id: 'reels', label: 'الريلز' },
              { id: 'designers', label: 'المصممين' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setDefaultMode(m.id as any)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer arabic-text ${
                  defaultMode === m.id
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Allowed Tabs Selection for User */}
        <div className="mb-6 border-t border-white/10 pt-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-[11px] font-black text-white/70 uppercase tracking-widest block">
              التابات المسموح إظهارها لليوزر 📌
            </label>
            <span className="text-[10px] text-muted font-mono font-bold">
              {allowedTabs.length === 0 ? 'كل التابات (الافتراضي)' : `${allowedTabs.length} تاب محددة`}
            </span>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button
              type="button"
              onClick={() => setAllowedTabs(ALL_TABS)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold border border-white/10 transition-all cursor-pointer"
            >
              تحديد الكل (All)
            </button>
            <button
              type="button"
              onClick={() => setAllowedTabs(MARKETING_TABS)}
              className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 text-[10px] font-bold border border-purple-500/30 transition-all cursor-pointer"
            >
              ماركتينج فقط 🎯
            </button>
            <button
              type="button"
              onClick={() => setAllowedTabs(VIDEO_TABS)}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 transition-all cursor-pointer"
            >
              فيديو وريلز فقط 🎬
            </button>
            <button
              type="button"
              onClick={() => setAllowedTabs([])}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/20 transition-all cursor-pointer"
            >
              إلغاء التحديد
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
            {ALL_TABS.map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => toggleTab(tab)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer arabic-text ${
                  allowedTabs.includes(tab)
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300 shadow-sm'
                    : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06]'
                }`}
              >
                {allowedTabs.includes(tab) ? (
                  <Check size={11} className="shrink-0 text-blue-400" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-sm border border-white/20 shrink-0" />
                )}
                <span className="truncate">{tab}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold text-sm transition-all cursor-pointer"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm transition-all shadow-[0_0_20px_rgba(147,51,234,0.4)] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            حفظ
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

interface InviteModalProps {
  onClose: () => void;
  onInvite: (email: string, name: string, role: Role, password: string, team: 'marketing' | 'video' | '', default_mode: 'operations' | 'reels' | 'designers') => Promise<string | null>;
}

const InviteModal = ({ onClose, onInvite }: InviteModalProps) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('junior');
  const [password, setPassword] = useState('');
  const [team, setTeam] = useState<'marketing' | 'video' | ''>('');
  const [defaultMode, setDefaultMode] = useState<'operations' | 'reels' | 'designers'>('operations');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInvite = async () => {
    if (!email || !name || !password) { setError('يرجى ملء جميع الحقول'); return; }
    if (password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    setError('');
    setLoading(true);
    const err = await onInvite(email, name, role, password, team, defaultMode);
    setLoading(false);
    if (err) { setError(err); } else { onClose(); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#0d1219] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-[0_0_80px_rgba(0,0,0,0.8)]"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-white arabic-text">إضافة مستخدم جديد</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-black text-white/50 uppercase tracking-widest mb-1.5 block">الاسم</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ahmed Hassan"
              className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white text-sm font-medium focus:outline-none focus:border-purple-500/60 transition-all placeholder-white/25" />
          </div>
          <div>
            <label className="text-[11px] font-black text-white/50 uppercase tracking-widest mb-1.5 block">اسم المستخدم أو البريد</label>
            <input type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="adham أو adham@company.com"
              className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white text-sm font-medium focus:outline-none focus:border-purple-500/60 transition-all placeholder-white/25" />
          </div>
          <div>
            <label className="text-[11px] font-black text-white/50 uppercase tracking-widest mb-1.5 block">كلمة المرور</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white text-sm font-medium focus:outline-none focus:border-purple-500/60 transition-all placeholder-white/25" />
          </div>
          <div>
            <label className="text-[11px] font-black text-white/50 uppercase tracking-widest mb-1.5 block">الصلاحية</label>
            <div className="grid grid-cols-2 gap-2">
              {(['admin', 'manager', 'supervisor', 'junior'] as Role[]).map(r => (
                <button key={r} onClick={() => setRole(r)}
                  className={`py-2.5 px-4 rounded-xl text-sm font-black border transition-all cursor-pointer ${role === r ? ROLE_COLORS[r] + ' ring-2 ring-offset-1 ring-offset-[#0d1219] ring-current' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}>
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-black text-white/50 uppercase tracking-widest mb-1.5 block">فريق العمل (Team)</label>
            <div className="grid grid-cols-3 gap-2">
              <button key="no-team" type="button" onClick={() => setTeam('')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${!team ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}>
                بلا فريق
              </button>
              <button key="video-team" type="button" onClick={() => setTeam('video')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${team === 'video' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 ring-2 ring-emerald-500/30' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}>
                فريق الفيديو
              </button>
              <button key="marketing-team" type="button" onClick={() => setTeam('marketing')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${team === 'marketing' ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 ring-2 ring-purple-500/30' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}>
                فريق الماركتينج
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                <AlertCircle size={14} />
                <span className="arabic-text">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3 mt-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold text-sm transition-all cursor-pointer">إلغاء</button>
            <button onClick={handleInvite} disabled={loading}
              className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm transition-all shadow-[0_0_20px_rgba(147,51,234,0.4)] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              إضافة
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const UserManagement = () => {
  const { profile, session } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userTeams, setUserTeams] = useState<{ [userId: string]: 'marketing' | 'video' | '' }>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [filterRole, setFilterRole] = useState<Role | 'all'>('all');
  const [rolePermissions, setRolePermissions] = useState(DEFAULT_ROLE_PERMISSIONS);
  const [permissionsToast, setPermissionsToast] = useState<'success' | 'error' | null>(null);

  const getToken = () => profile?.id || session?.user?.id || session?.access_token || '';

const DEFAULT_SYSTEM_USERS: UserProfile[] = [
  { id: 'usr-eslam-admin', name: 'eslam', email: 'eslamabdalhamidfb@gmail.com', role: 'admin', allowed_tabs: [], is_active: true, created_at: new Date().toISOString() },
  { id: 'usr-eslam-jr', name: 'eslam', email: 'eslam@company.com', role: 'junior', allowed_tabs: [], is_active: true, created_at: new Date().toISOString() },
  { id: 'usr-adham', name: 'Adham elbadry', email: 'adham@company.com', role: 'supervisor', allowed_tabs: [], is_active: true, created_at: new Date().toISOString() },
  { id: 'usr-abanoub', name: 'ABANOUB', email: 'abanoub@company.com', role: 'junior', allowed_tabs: [], is_active: true, created_at: new Date().toISOString() },
  { id: 'usr-ashraf', name: 'ASHRAF', email: 'ashraf@company.com', role: 'junior', allowed_tabs: [], is_active: true, created_at: new Date().toISOString() },
];

  const fetchUsers = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      let fetchedUsers: UserProfile[] = [];

      // 1. Try serverless API
      const token = getToken();
      const res = await fetch('/api/users', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data.users) && data.users.length > 0) {
          fetchedUsers = data.users as UserProfile[];
        }
      }

      // 2. Try Supabase direct query
      if (fetchedUsers.length === 0) {
        const { data: dbData } = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (dbData && dbData.length > 0) {
          fetchedUsers = dbData as UserProfile[];
        }
      }

      // 3. Fallback to default system users
      if (fetchedUsers.length === 0) {
        fetchedUsers = DEFAULT_SYSTEM_USERS;
      }

      let localOverrides: Record<string, Partial<UserProfile>> = {};
      try {
        localOverrides = JSON.parse(localStorage.getItem('mktg_user_overrides') || '{}');
      } catch {}

      let localTeams: Record<string, 'marketing' | 'video' | ''> = {};
      try {
        localTeams = JSON.parse(localStorage.getItem('mktg_user_teams') || '{}');
      } catch {}

      const merged = fetchedUsers.map(u => {
        const override = localOverrides[u.id] || localOverrides[u.name] || {};
        return {
          ...u,
          ...override,
          allowed_tabs: override.allowed_tabs !== undefined ? override.allowed_tabs : (u.allowed_tabs || []),
          team: override.team !== undefined ? override.team : (localTeams[u.id] || u.team || ''),
        };
      });

      setUsers(merged as UserProfile[]);

      const teamsMap: Record<string, 'marketing' | 'video' | ''> = {};
      merged.forEach(u => {
        teamsMap[u.id] = u.team || '';
      });
      setUserTeams(teamsMap);
    } catch (err: any) {
      console.error('[fetchUsers]', err);
      setUsers(DEFAULT_SYSTEM_USERS);
    }
    setLoading(false);
  };

  const fetchPermissions = async () => {
    const token = getToken();
    const res = await fetch('/api/permissions', {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.permissions) {
      const next = { ...DEFAULT_ROLE_PERMISSIONS, ...data.permissions };
      setRolePermissions(next);
      setRuntimeRolePermissions(next);
    } else {
      setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
      setRuntimeRolePermissions(DEFAULT_ROLE_PERMISSIONS);
    }
  };

  const fetchUserTeams = async () => {
    const token = getToken();
    const res = await fetch('/api/user-teams', {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.teams) setUserTeams(data.teams);
  };

  const savePermissions = async () => {
    const token = getToken();
    try {
      const res = await fetch('/api/permissions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ permissions: rolePermissions }),
      });
      
      if (!res.ok) {
        const { data: existing } = await supabase
          .from('dashboard_data')
          .select('key')
          .eq('key', 'permissions_v1')
          .eq('field', 'roles')
          .maybeSingle();
          
        const value = JSON.stringify(rolePermissions);
        let error;
        
        if (existing) {
          const res = await supabase
            .from('dashboard_data')
            .update({ value, updated_by: profile?.id })
            .eq('key', 'permissions_v1')
            .eq('field', 'roles');
          error = res.error;
        } else {
          const res = await supabase
            .from('dashboard_data')
            .insert({ key: 'permissions_v1', field: 'roles', value, updated_by: profile?.id });
          error = res.error;
        }
        
        if (error) throw error;
      }
      
      setRuntimeRolePermissions(rolePermissions);
      setPermissionsToast('success');
    } catch (err) {
      console.error('[savePermissions]', err);
      setPermissionsToast('error');
    }
    setTimeout(() => setPermissionsToast(null), 3000);
  };

  useEffect(() => { fetchUsers(); fetchPermissions(); fetchUserTeams(); }, [session?.access_token]);

  const handleUpdateUser = async (id: string, updates: Partial<UserProfile>, team: 'marketing' | 'video' | '') => {
    // 1. Optimistic UI update
    setUsers(prev => prev.map(u =>
      u.id === id
        ? { ...u, ...updates, team, allowed_tabs: updates.allowed_tabs ?? u.allowed_tabs }
        : u
    ));
    setUserTeams(prev => ({ ...prev, [id]: team }));

    try {
      const token = getToken();

      // 2. Use API endpoint (Admin Client — bypasses RLS) to save
      const res = await fetch(`/api/users?id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...updates, team }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error('[handleUpdateUser] API error:', result?.error || res.status);
        // Fallback: try direct supabase update
        const { error } = await supabase
          .from('user_profiles')
          .update({ ...updates, team })
          .eq('id', id);
        if (error) console.error('[handleUpdateUser] Supabase fallback error:', error.message);
      }

      // 3. Update local_profile_login if editing the currently logged-in user
      try {
        const raw = localStorage.getItem('local_profile_login');
        if (raw) {
          const stored = JSON.parse(raw);
          if (stored?.id === id) {
            localStorage.setItem('local_profile_login', JSON.stringify({ ...stored, ...updates, team }));
          }
        }
      } catch {}

      // 4. Notify AuthContext to re-fetch fresh profile from Supabase
      window.dispatchEvent(new CustomEvent('profile-updated'));

      // 5. Refresh users list
      await fetchUsers();
      setPermissionsToast('success');
    } catch (err) {
      console.error('[handleUpdateUser]', err);
      setPermissionsToast('error');
    }
    setTimeout(() => setPermissionsToast(null), 3000);
  };

  const handleToggleActive = async (user: UserProfile) => {
    const token = getToken();
    const nextActive = !user.is_active;
    // Optimistic update
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: nextActive } : u));
    try {
      const res = await fetch(`/api/users?id=${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ is_active: nextActive }),
      });
      if (!res.ok) {
        await supabase.from('user_profiles').update({ is_active: nextActive }).eq('id', user.id);
      }
      await fetchUsers();
    } catch (err) {
      console.error('[handleToggleActive]', err);
    }
  };

  const handleInviteUser = async (email: string, name: string, role: Role, password: string, team: 'marketing' | 'video' | '', default_mode: 'operations' | 'reels' | 'designers'): Promise<string | null> => {
    const token = getToken();
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ email, name, role, password, team, default_mode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return data.error || 'فشل في إنشاء المستخدم';
    await fetchUsers();
    return null;
  };

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight arabic-text">إدارة المستخدمين</h2>
          <p className="text-sm text-white/40 mt-0.5">{users.length} مستخدم مسجّل</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm transition-all shadow-[0_0_20px_rgba(147,51,234,0.4)] hover:shadow-[0_0_30px_rgba(147,51,234,0.6)] cursor-pointer"
        >
          <UserPlus size={16} />
          مستخدم جديد
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        {(['admin', 'manager', 'supervisor', 'junior'] as Role[]).map(r => (
          <div key={r} className={`p-4 rounded-2xl border ${ROLE_COLORS[r].replace('text-', 'border-').split(' ')[2]} bg-white/[0.02]`}>
            <p className={`text-2xl font-black ${ROLE_COLORS[r].split(' ')[1]}`}>{roleCounts[r] || 0}</p>
            <p className="text-xs text-white/40 font-bold mt-0.5 arabic-text">{ROLE_LABELS[r]}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو البريد..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white text-sm font-medium focus:outline-none focus:border-purple-500/50 transition-all placeholder-white/25"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'admin', 'manager', 'supervisor', 'junior'] as const).map(r => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={`px-3 py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                filterRole === r
                  ? r === 'all' ? 'bg-white/15 border-white/30 text-white' : ROLE_COLORS[r as Role]
                  : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06]'
              }`}
            >
              {r === 'all' ? 'الكل' : ROLE_LABELS[r as Role]}
            </button>
          ))}
        </div>
      </div>

      {/* Role Permissions */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white arabic-text">صلاحيات الأدوار</h3>
          <button onClick={savePermissions} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black">حفظ الصلاحيات</button>
        </div>
        {(['admin', 'manager', 'supervisor', 'junior'] as Role[]).map((r) => (
          <div key={r} className="border border-white/10 rounded-2xl p-3 space-y-2">
            <div className="text-xs font-black text-white">{ROLE_LABELS[r]}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                ['manageUsers', 'إدارة المستخدمين'],
                ['addEntry', 'إضافة عناصر'],
                ['sync', 'المزامنة'],
                ['editEditors', 'تعديل المحررين'],
                ['editNotes', 'تعديل الملاحظات'],
                ['editBunnyLinks', 'تعديل روابط Bunny'],
                ['viewAllTabs', 'كل التابات'],
              ].map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setRolePermissions(prev => ({ ...prev, [r]: { ...prev[r], [k]: !prev[r][k] } }))}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border ${rolePermissions[r][k] ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-white/5 border-white/10 text-white/50'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {r === 'junior' && (
              <div className="mt-2 flex flex-wrap gap-4 border-t border-white/5 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">حد الأولوية اليومي (تجميعات)</span>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={rolePermissions.junior.dailyPriorityLimitTagme ?? rolePermissions.junior.dailyPriorityLimit ?? 1}
                    onChange={(e) => setRolePermissions(prev => ({ 
                      ...prev, 
                      junior: { 
                        ...prev.junior, 
                        dailyPriorityLimitTagme: Math.max(0, Number(e.target.value || 0)) 
                      } 
                    }))}
                    className="w-20 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">حد الأولوية اليومي (الريلز)</span>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={rolePermissions.junior.dailyPriorityLimitReels ?? rolePermissions.junior.dailyPriorityLimit ?? 1}
                    onChange={(e) => setRolePermissions(prev => ({ 
                      ...prev, 
                      junior: { 
                        ...prev.junior, 
                        dailyPriorityLimitReels: Math.max(0, Number(e.target.value || 0)) 
                      } 
                    }))}
                    className="w-20 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3 text-white/30">
            <Loader2 size={32} className="animate-spin" />
            <p className="text-sm font-bold">جاري التحميل...</p>
          </div>
        ) : fetchError ? (
          <div className="py-20 text-center">
            <AlertCircle size={40} className="mx-auto mb-3 text-rose-400 stroke-1" />
            <p className="text-sm font-bold text-rose-400 arabic-text mb-1">خطأ في جلب المستخدمين</p>
            <p className="text-xs text-white/30 mb-4 font-mono">{fetchError}</p>
            <button
              onClick={fetchUsers}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black transition-all cursor-pointer"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-white/30">
            <Users size={40} className="mx-auto mb-3 stroke-1" />
            <p className="text-sm font-bold">لا يوجد مستخدمون</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {/* Table Header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-6 py-3 text-[10px] font-black text-white/30 uppercase tracking-widest">
              <div />
              <div>المستخدم</div>
              <div className="text-center">فريق العمل</div>
              <div className="text-center">الصلاحية</div>
              <div className="text-center">الحالة</div>
              <div className="text-center">تعديل</div>
            </div>
            {filtered.map(u => (
              <motion.div
                key={u.id}
                layout
                className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-all ${!u.is_active ? 'opacity-50' : ''}`}
              >
                <AvatarInitials name={u.name} role={u.role} team={userTeams[u.id]} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white arabic-text">{u.name}</p>
                    {u.id === profile?.id && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">أنت</span>
                    )}
                  </div>
                  {u.allowed_tabs && u.allowed_tabs.length > 0 && (
                    <p className="text-[10px] text-blue-400/60 mt-0.5 font-medium">
                      {u.allowed_tabs.slice(0, 3).join(' · ')}{u.allowed_tabs.length > 3 ? ` +${u.allowed_tabs.length - 3}` : ''}
                    </p>
                  )}
                </div>
                <div className="flex justify-center">
                  {userTeams[u.id] === 'video' ? (
                    <span className="text-xs font-black px-3 py-1.5 rounded-xl border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      فيديو
                    </span>
                  ) : userTeams[u.id] === 'marketing' ? (
                    <span className="text-xs font-black px-3 py-1.5 rounded-xl border bg-purple-500/10 text-purple-400 border-purple-500/20">
                      ماركتينج
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-white/30">---</span>
                  )}
                </div>
                <div className="flex justify-center">
                  <span className={`text-xs font-black px-3 py-1.5 rounded-xl border ${ROLE_COLORS[u.role]}`}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => handleToggleActive(u)}
                    disabled={u.id === profile?.id}
                    className="flex items-center gap-1.5 text-xs font-bold cursor-pointer disabled:cursor-not-allowed transition-all"
                    title={u.is_active ? 'إيقاف' : 'تفعيل'}
                  >
                    {u.is_active ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 hover:text-rose-400 transition-colors">
                        <ToggleRight size={22} />
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-white/20 hover:text-emerald-400 transition-colors">
                        <ToggleLeft size={22} />
                      </span>
                    )}
                  </button>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => setEditingUser(u)}
                    disabled={u.id === profile?.id && u.role === 'admin'}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-purple-500/20 hover:text-purple-400 text-white/40 flex items-center justify-center transition-all cursor-pointer disabled:opacity-30"
                  >
                    <Shield size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {editingUser && (
          <EditUserModal
            user={editingUser}
            initialTeam={userTeams[editingUser.id] || ''}
            onClose={() => setEditingUser(null)}
            onSave={handleUpdateUser}
          />
        )}
        {showInvite && (
          <InviteModal
            onClose={() => setShowInvite(false)}
            onInvite={handleInviteUser}
          />
        )}
        {permissionsToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[400] px-5 py-3 rounded-2xl border text-sm font-bold shadow-2xl ${
              permissionsToast === 'success'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.45)]'
                : 'bg-rose-500/15 border-rose-400/40 text-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.45)]'
            }`}
          >
            {permissionsToast === 'success' ? 'تم حفظ الصلاحيات بنجاح' : 'فشل حفظ الصلاحيات'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


