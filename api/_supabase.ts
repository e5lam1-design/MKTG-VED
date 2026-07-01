import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAuthClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const supabaseAdminClient = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

export const getRequesterProfile = async (req: VercelRequest) => {
  if (!supabaseAuthClient || !supabaseAdminClient) {
    throw new Error('Missing Supabase server configuration. Set SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables.');
  }

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    const err: any = new Error('Missing authorization token');
    err.status = 401;
    throw err;
  }

  let profile: any = null;
  let userId: string | null = null;

  // 1. Try Supabase getUser
  try {
    const { data: userData, error: userError } = await supabaseAuthClient.auth.getUser(token);
    if (!userError && userData?.user) {
      userId = userData.user.id;
    }
  } catch (e) {
    // Ignore error
  }

  // 2. Query profile by resolved userId
  if (userId) {
    const { data: prof, error: profileError } = await supabaseAdminClient
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!profileError && prof) {
      profile = prof;
    }
  }

  // 3. Fallback: check if the token itself is a valid user_profiles id (UUID format)
  if (!profile) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(token)) {
      const { data: prof, error: profileError } = await supabaseAdminClient
        .from('user_profiles')
        .select('*')
        .eq('id', token)
        .single();
      if (!profileError && prof) {
        profile = prof;
      }
    }
  }

  if (!profile) {
    const err: any = new Error('Invalid or expired authorization token');
    err.status = 401;
    throw err;
  }

  if (!profile.is_active) {
    const err: any = new Error('User profile is not active');
    err.status = 403;
    throw err;
  }

  return profile;
};

export const handleApiError = (res: VercelResponse, err: any) => {
  console.error('API Error:', err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
};
