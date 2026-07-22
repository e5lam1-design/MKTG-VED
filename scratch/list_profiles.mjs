import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dppdaqmrrjbldcygadpi.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwcGRhcW1ycmpibGRjeWdhZHBpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzNTIyNSwiZXhwIjoyMDk0ODExMjI1fQ.EBZ2wyV48UA9h9tLM0vUrjovR8xCb8lPLIaVgI9aVwU';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function listAllProfiles() {
  const { data, error } = await supabase.from('user_profiles').select('*');
  if (error) {
    console.error('Error:', error);
  } else {
    data.forEach(p => {
      console.log(`ID: ${p.id} | Email: ${p.email} | Name: ${p.name} | Role: ${p.role} | Active: ${p.is_active}`);
    });
  }
}

listAllProfiles();
