import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dppdaqmrrjbldcygadpi.supabase.co'; // from env
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwcGRhcW1ycmpibGRjeWdhZHBpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzNTIyNSwiZXhwIjoyMDk0ODExMjI1fQ.EBZ2wyV48UA9h9tLM0vUrjovR8xCb8lPLIaVgI9aVwU';

const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

async function simulatePatch() {
  const targetId = '7e04dea1-ec83-4439-a541-13fc3ce79885'; // Adham elbadry UUID
  console.log(`Simulating PATCH for targetId: ${targetId}`);

  try {
    // 1. Load target
    const { data: target, error: targetErr } = await supabaseAdminClient
      .from('user_profiles')
      .select('*')
      .eq('id', targetId)
      .single();

    if (targetErr) {
      console.error('Target load error:', targetErr);
      return;
    }
    console.log('Target loaded successfully:', target);

    // 2. Prepare updates
    const updates = {
      role: 'supervisor',
      allowed_tabs: ['operations', 'reels', 'designers'],
      default_mode: 'operations',
      team: ''
    };

    // 3. Update
    const { data, error: updateError } = await supabaseAdminClient
      .from('user_profiles')
      .update(updates)
      .eq('id', targetId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return;
    }
    console.log('Update simulated successfully. Result:', data);
  } catch (err) {
    console.error('Exception:', err);
  }
}

simulatePatch();
