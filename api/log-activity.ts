import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdminClient } from './_supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (!supabaseAdminClient) {
      return res.status(500).json({ error: 'Supabase admin client not configured' });
    }

    if (req.method === 'POST') {
      const { user_id, event_type, name, email } = req.body || {};
      if (!event_type) {
        return res.status(400).json({ error: 'event_type is required (login or logout)' });
      }

      const nowIso = new Date().toISOString();

      // 1. Update user_profiles last_login_at / last_logout_at
      if (user_id) {
        const updateField = event_type === 'login' ? { last_login_at: nowIso } : { last_logout_at: nowIso };
        await supabaseAdminClient
          .from('user_profiles')
          .update(updateField)
          .eq('id', user_id);
      }

      // 2. Insert into user_logs table
      const { error: insertErr } = await supabaseAdminClient
        .from('user_logs')
        .insert({
          user_id: user_id || null,
          name: name || '',
          email: email || '',
          event_type,
          timestamp: nowIso
        });
      
      if (insertErr) {
        console.error('[log-activity] user_logs insert error:', insertErr.message);
      }

      return res.status(200).json({ success: true, timestamp: nowIso });
    }

    if (req.method === 'GET') {
      // Fetch latest logs
      const { data: logs, error } = await supabaseAdminClient
        .from('user_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        return res.status(200).json({ logs: [] });
      }
      return res.status(200).json({ logs: logs || [] });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
