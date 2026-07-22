import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRequesterProfile, handleApiError, supabaseAdminClient } from './_supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      await getRequesterProfile(req);
      if (!supabaseAdminClient) throw new Error('Supabase admin not configured');

      const { data, error } = await supabaseAdminClient
        .from('dashboard_data')
        .select('*')
        .eq('key', 'permissions_v1')
        .eq('field', 'roles')
        .maybeSingle();
        
      if (error) throw error;
      const parsed = data?.value ? JSON.parse(data.value) : null;
      return res.status(200).json({ permissions: parsed });

    } else if (req.method === 'PUT') {
      const requester = await getRequesterProfile(req);
      if (requester.role !== 'admin') {
        const err: any = new Error('Only admin can update role permissions');
        err.status = 403;
        throw err;
      }
      if (!supabaseAdminClient) throw new Error('Supabase admin not configured');

      const value = JSON.stringify(req.body.permissions || {});
      const { error } = await supabaseAdminClient
        .from('dashboard_data')
        .upsert({
          key: 'permissions_v1',
          field: 'roles',
          value,
          updated_by: requester.id,
        });
        
      if (error) throw error;
      return res.status(200).json({ ok: true });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err: any) {
    handleApiError(res, err);
  }
}
