import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRequesterProfile, handleApiError, supabaseAdminClient } from './_supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const requester = await getRequesterProfile(req);
    if (!supabaseAdminClient) throw new Error('Supabase admin not configured');

    if (req.method === 'GET') {
      const { data, error } = await supabaseAdminClient
        .from('design_tasks')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return res.status(200).json({ tasks: data || [] });
    } 
    
    else if (req.method === 'POST') {
      // Create new design task
      const { data, error } = await supabaseAdminClient
        .from('design_tasks')
        .insert({
          assigned_date: req.body.assigned_date || new Date().toISOString().split('T')[0],
          designer_name: req.body.designer_name || '',
          priority: req.body.priority || '',
          requested_by: req.body.requested_by || '',
          design_type: req.body.design_type || '',
          deadline: req.body.deadline || null,
          reference_link: req.body.reference_link || '',
          notes: req.body.notes || '',
          is_done: !!req.body.is_done,
          updated_by: requester.id
        })
        .select()
        .single();
        
      if (error) throw error;
      return res.status(201).json({ task: data });
    }
    
    else if (req.method === 'PATCH') {
      const targetId = String(req.query.id || req.body.id || '');
      if (!targetId) {
        const err: any = new Error('Task ID missing');
        err.status = 400;
        throw err;
      }
      
      const updates = { ...req.body };
      delete updates.id;
      updates.updated_by = requester.id;
      
      const { data, error } = await supabaseAdminClient
        .from('design_tasks')
        .update(updates)
        .eq('id', targetId)
        .select()
        .single();
        
      if (error) throw error;
      return res.status(200).json({ task: data });
    }
    
    else if (req.method === 'DELETE') {
      const targetId = String(req.query.id || req.body.id || '');
      if (!targetId) {
        const err: any = new Error('Task ID missing');
        err.status = 400;
        throw err;
      }
      
      const { error } = await supabaseAdminClient
        .from('design_tasks')
        .delete()
        .eq('id', targetId);
        
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    
    else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err: any) {
    handleApiError(res, err);
  }
}
