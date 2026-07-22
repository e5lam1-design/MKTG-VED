import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleApiError, supabaseAdminClient, supabaseAuthClient } from './_supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    if (!supabaseAuthClient || !supabaseAdminClient) {
      throw new Error('Supabase admin not configured');
    }

    const { data: userData, error: userError } = await supabaseAuthClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = userData.user.id;
    const email = userData.user.email;
    const rawName = userData.user.user_metadata?.full_name || email?.split('@')[0] || 'Unknown';
    let cleanName = rawName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

    // Check if profile exists
    const { data: existing, error: fetchErr } = await supabaseAdminClient
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (!existing) {
      // Find a unique name
      let suffix = 0;
      let isUnique = false;
      let finalName = cleanName;
      
      while (!isUnique && suffix < 50) {
        const checkName = suffix === 0 ? cleanName : `${cleanName}${suffix}`;
        const { count } = await supabaseAdminClient
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('name', checkName);
          
        if (count === 0) {
          finalName = checkName;
          isUnique = true;
        } else {
          suffix++;
        }
      }

      const isFirstUser = false; // We can't easily check total count securely here without risking timeouts, but role can be 'junior' by default
      const { data: totalUsers } = await supabaseAdminClient
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });
        
      const role = (totalUsers?.length === 0) ? 'admin' : 'junior';

      const { data: newProfile, error: insertErr } = await supabaseAdminClient
        .from('user_profiles')
        .insert({
          id: userId,
          name: finalName,
          email: email,
          role: role,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      return res.json({ profile: newProfile });
    } else {
      return res.json({ profile: existing });
    }
  } catch (err: any) {
    handleApiError(res, err);
  }
}

export const assertCanManageTarget = (requester: any, targetRole: string, existingTarget?: any) => {
  const allowedRoles = new Set(['admin', 'manager', 'supervisor', 'junior']);
  if (!allowedRoles.has(targetRole)) {
    const err: any = new Error('Invalid role');
    err.status = 400;
    throw err;
  }

  if (requester.role === 'manager') {
    if (targetRole === 'admin' || existingTarget?.role === 'admin') {
      const err: any = new Error('Managers cannot create or edit admin users');
      err.status = 403;
      throw err;
    }
  }
};
