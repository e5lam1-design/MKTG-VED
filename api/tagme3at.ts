import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;
  const key = req.query.key as string;

  try {
    if (method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('tagme3at_items')
        .select('*')
        .order('created_at', { ascending: false });

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
        uploaded: body.uploaded ?? false
      };

      const { data, error } = await supabaseAdmin
        .from('tagme3at_items')
        .upsert(itemData, { onConflict: 'unique_key' })
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ item: data });
    }

    if (method === 'DELETE') {
      const uniqueKey = key || req.query.uniqueKey as string;
      if (!uniqueKey) {
        return res.status(400).json({ error: 'Missing uniqueKey parameter' });
      }

      const { error } = await supabaseAdmin
        .from('tagme3at_items')
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
