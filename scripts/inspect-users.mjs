import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkyoshivpvtggzrfruzd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxreW9zaGl2cHZ0Z2d6cmZydXpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ0OTk5OCwiZXhwIjoyMTAyMDI1OTk4fQ.0VAFkwI53yGZT1LBF9T_1h1n5zkEUk29UVURPBDYIfU';

const supabase = createClient(supabaseUrl, serviceKey);

async function inspectUsers() {
  const { data: users, error } = await supabase.from('users').select('id, email, name, role, password, is_active');
  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('Users in database:');
    console.table(users);
  }
}

inspectUsers();
