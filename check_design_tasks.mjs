import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dppdaqmrrjbldcygadpi.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwcGRhcW1ycmpibGRjeWdhZHBpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzNTIyNSwiZXhwIjoyMDk0ODExMjI1fQ.EBZ2wyV48UA9h9tLM0vUrjovR8xCb8lPLIaVgI9aVwU';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function check() {
  const { data, error, count } = await supabase
    .from('design_tasks')
    .select('*', { count: 'exact' });
    
  if (error) {
    console.error('Error fetching design tasks:', error);
  } else {
    console.log(`Supabase design_tasks count: ${count}`);
    if (data && data.length > 0) {
      console.log('Sample row:', data[0]);
    }
  }
}

check();
