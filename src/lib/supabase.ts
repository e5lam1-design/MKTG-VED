import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Role = 'admin' | 'manager' | 'supervisor' | 'junior';
export type PermissionConfig = {
  manageUsers: boolean;
  addEntry: boolean;
  sync: boolean;
  editEditors: boolean;
  editNotes: boolean;
  editBunnyLinks: boolean;
  viewAllTabs: boolean;
  dailyPriorityLimit: number;
  dailyPriorityLimitTagme?: number;
  dailyPriorityLimitReels?: number;
};

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: Role;
  allowed_tabs: string[];
  is_active: boolean;
  team?: 'marketing' | 'video' | '';
  created_at: string;
};

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, PermissionConfig> = {
  admin: { manageUsers: true, addEntry: true, sync: true, editEditors: true, editNotes: true, editBunnyLinks: true, viewAllTabs: true, dailyPriorityLimit: 999, dailyPriorityLimitTagme: 999, dailyPriorityLimitReels: 999 },
  manager: { manageUsers: true, addEntry: true, sync: true, editEditors: true, editNotes: true, editBunnyLinks: true, viewAllTabs: true, dailyPriorityLimit: 999, dailyPriorityLimitTagme: 999, dailyPriorityLimitReels: 999 },
  supervisor: { manageUsers: false, addEntry: false, sync: true, editEditors: true, editNotes: true, editBunnyLinks: false, viewAllTabs: false, dailyPriorityLimit: 0, dailyPriorityLimitTagme: 0, dailyPriorityLimitReels: 0 },
  junior: { manageUsers: false, addEntry: false, sync: false, editEditors: false, editNotes: false, editBunnyLinks: false, viewAllTabs: true, dailyPriorityLimit: 1, dailyPriorityLimitTagme: 1, dailyPriorityLimitReels: 1 },
};

let runtimeRolePermissions: Record<Role, PermissionConfig> = { ...DEFAULT_ROLE_PERMISSIONS };
export const setRuntimeRolePermissions = (next: Record<Role, PermissionConfig>) => {
  runtimeRolePermissions = next;
};

const rolePerm = (role: Role) => runtimeRolePermissions[role] || DEFAULT_ROLE_PERMISSIONS[role];

// Permission checks
export const PERMISSIONS = {
  canManageUsers: (role: Role) => rolePerm(role).manageUsers,
  canAddEntry: (role: Role) => rolePerm(role).addEntry,
  canSync: (role: Role) => rolePerm(role).sync,
  canEditEditors: (role: Role) => rolePerm(role).editEditors,
  canEditNotes: (role: Role) => rolePerm(role).editNotes,
  canEditBunnyLinks: (role: Role) => rolePerm(role).editBunnyLinks,
  canViewTab: (role: Role, tab: string, allowedTabs: string[]) => {
    if (rolePerm(role).viewAllTabs) return true;
    if (role === 'supervisor') return allowedTabs.includes(tab);
    return false;
  },
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'أدمن',
  manager: 'مانجر',
  supervisor: 'مشرف',
  junior: 'جونيور',
};

export const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  manager: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  supervisor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  junior: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};
