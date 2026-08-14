import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://dppdaqmrrjbldcygadpi.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwcGRhcW1ycmpibGRjeWdhZHBpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzNTIyNSwiZXhwIjoyMDk0ODExMjI1fQ.EBZ2wyV48UA9h9tLM0vUrjovR8xCb8lPLIaVgI9aVwU';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;
  const key = req.query.key as string;

  try {
    if (method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('tagme3at_26')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ items: data || [] });
    }

    if (method === 'POST') {
      const body = req.body;
      if (!body || !body.uniqueKey) {
        return res.status(400).json({ error: 'Missing uniqueKey or payload' });
      }

      const itemData = {
        unique_key: body.uniqueKey,
        is_transfer: body.isTagmeTransfer ?? true,
        name: body.name || '',
        filing_name: body.filingName || '---',
        op_sheet: body.opSheet || '',
        branch: body.branch || '',
        date: body.date || '',
        notes_marketing: body.notesMarketing || '',
        editor: body.editor || 'غير محدد',
        notes_editors: body.notesEditors || '',
        done: body.done ?? false,
        priority: body.priority ?? false,
        cancel: body.cancel ?? false,
        thumbnail_link: body.thumbnailLink || '',
        time: body.time || '',
        youtube_link: body.youtubeLink || '',
        uploaded: body.uploaded ?? false,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('tagme3at_26')
        .upsert(itemData, { onConflict: 'unique_key' })
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ item: data });
    }

    if (method === 'PUT') {
      const { uniqueKey, updates } = req.body;
      if (!uniqueKey || !updates) {
        return res.status(400).json({ error: 'Missing uniqueKey or updates' });
      }

      const { data, error } = await supabaseAdmin
        .from('tagme3at_26')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('unique_key', uniqueKey)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ item: data });
    }

    if (method === 'DELETE') {
      const uniqueKey = key || (req.query.uniqueKey as string);
      if (!uniqueKey) {
        return res.status(400).json({ error: 'Missing uniqueKey parameter' });
      }

      const { error } = await supabaseAdmin
        .from('tagme3at_26')
        .delete()
        .eq('unique_key', uniqueKey);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err: any) {
    console.error('[API tagme3at error]:', err.message);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
