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
        .select('key, field, value')
        .in('key', ['task_metadata', 'note_authors']);
      if (error) throw error;
      
      const metadata: Record<string, any> = {};
      if (data) {
        data.forEach(row => {
          try {
            const parsed = JSON.parse(row.value);
            if (row.key === 'note_authors') {
              metadata['note_authors'] = parsed;
            } else {
              metadata[row.field] = parsed;
            }
          } catch(e) {}
        });
      }
      return res.status(200).json({ metadata });

    } else if (req.method === 'PUT') {
      const requester = await getRequesterProfile(req);
      if (!supabaseAdminClient) throw new Error('Supabase admin not configured');

      const { field, metadata } = req.body;
      if (!field) throw new Error('field is required');
      
      const value = JSON.stringify(metadata || {});
      const targetKey = field === 'note_authors' ? 'note_authors' : 'task_metadata';
      const targetField = field === 'note_authors' ? 'authors' : field;

      // Check if exists
      const { data: existing } = await supabaseAdminClient
        .from('dashboard_data')
        .select('key, field')
        .eq('key', targetKey)
        .maybeSingle();

      let error;
      if (existing) {
        const res = await supabaseAdminClient
          .from('dashboard_data')
          .update({ value, updated_by: requester.id, updated_at: new Date().toISOString() })
          .eq('key', targetKey);
        error = res.error;
      } else {
        const res = await supabaseAdminClient
          .from('dashboard_data')
          .insert({ key: targetKey, field: targetField, value, updated_by: requester.id });
        error = res.error;
      }
        
      if (error) throw error;
      return res.status(200).json({ ok: true });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err: any) {
    handleApiError(res, err);
  }
}
