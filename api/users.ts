// src/api/users.ts – Vercel Serverless Functions for user CRUD
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRequesterProfile, handleApiError, supabaseAdminClient } from './_supabase.js';
import { assertCanManageTarget } from './resolve-login.js'; // reuse role validation helper

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers – allow any origin for simplicity (adjust in production)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Ensure requester is authenticated and authorized
    const requester = await getRequesterProfile(req);
    if (!['admin', 'manager'].includes(requester.role)) {
      const err: any = new Error('Only admin and manager users can manage users');
      err.status = 403;
      throw err;
    }

    // -------------------- GET --------------------
    if (req.method === 'GET') {
      if (!supabaseAdminClient) throw new Error('Supabase admin not configured');
      const { data, error } = await supabaseAdminClient
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ users: data || [] });
    }

    // -------------------- POST --------------------
    if (req.method === 'POST') {
      // Validate payload
      const rawLogin = String(req.body.email || '').trim().toLowerCase();
      const name = String(req.body.name || '').trim();
      const password = String(req.body.password || '');
      const role = String(req.body.role || 'junior');
      const allowed_tabs = Array.isArray(req.body.allowed_tabs) ? req.body.allowed_tabs : [];

      if (!rawLogin || !name || password.length < 6) {
        const err: any = new Error('Name, login, and a 6+ character password are required');
        err.status = 400;
        throw err;
      }

      const email = rawLogin.includes('@')
        ? rawLogin
        : `${rawLogin.replace(/[^a-z0-9._-]/g, '') || 'user'}@local.user`;

      // Role‑based permission check (re‑use helper from resolve-login)
      assertCanManageTarget(requester, role);

      // Create auth user via Supabase admin SDK
      const { data: authData, error: authError } = await supabaseAdminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role },
      });
      if (authError) throw authError;

      // Insert / upsert profile record
      const { error: profileError } = await supabaseAdminClient
        .from('user_profiles')
        .upsert({
          id: authData.user.id,
          email,
          name,
          role,
          allowed_tabs: allowed_tabs || [],
          is_active: true,
          team: req.body.team || '',
          default_mode: req.body.default_mode || 'operations',
        });
      if (profileError) throw profileError;

      return res.status(201).json({ user: authData.user });
    }

    // -------------------- PATCH --------------------
    if (req.method === 'PATCH') {
      const targetId = String(req.query.id || (req as any).params?.id || '');
      if (!targetId) {
        const err: any = new Error('User ID missing in URL');
        err.status = 400;
        throw err;
      }

      // Load existing target profile
      const { data: target, error: targetErr } = await supabaseAdminClient
        .from('user_profiles')
        .select('*')
        .eq('id', targetId)
        .single();
      if (targetErr || !target) {
        const err: any = new Error('Target user was not found');
        err.status = 404;
        throw err;
      }

      // Build updates object from allowed fields
      const updates: any = {};
      if (typeof req.body.name === 'string') updates.name = req.body.name.trim();
      if (typeof req.body.email === 'string') updates.email = req.body.email.trim().toLowerCase();
      if (typeof req.body.is_active === 'boolean') updates.is_active = req.body.is_active;
      if (Array.isArray(req.body.allowed_tabs)) updates.allowed_tabs = req.body.allowed_tabs;
      if (typeof req.body.role === 'string') updates.role = req.body.role;
      if (typeof req.body.team === 'string') updates.team = req.body.team;
      if (typeof req.body.default_mode === 'string') updates.default_mode = req.body.default_mode;

      const nextRole = updates.role || target.role;
      // Ensure requester can change to the new role
      assertCanManageTarget(requester, nextRole, target);

      const { data, error: updateError } = await supabaseAdminClient
        .from('user_profiles')
        .update(updates)
        .eq('id', targetId)
        .select()
        .single();
      if (updateError) throw updateError;

      return res.status(200).json({ user: data });
    }

    // Unsupported method
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    handleApiError(res, err);
  }
}
