import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = 'https://lkyoshivpvtggzrfruzd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxreW9zaGl2cHZ0Z2d6cmZydXpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ0OTk5OCwiZXhwIjoyMTAyMDI1OTk4fQ.0VAFkwI53yGZT1LBF9T_1h1n5zkEUk29UVURPBDYIfU';

const supabase = createClient(supabaseUrl, serviceKey);

async function fixUserPasswords() {
  console.log('Resetting and securing all user passwords to "password123"...');
  try {
    const defaultPasswordHash = await bcrypt.hash('password123', 10);

    const { data: users, error } = await supabase.from('users').select('id, email, name, role');
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    for (const u of users) {
      const { error: updateErr } = await supabase
        .from('users')
        .update({
          password: defaultPasswordHash,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', u.id);

      if (updateErr) {
        console.error(`Failed to update password for ${u.email}:`, updateErr);
      } else {
        console.log(`✅ Password for ${u.email} (${u.role}) updated to "password123"`);
      }
    }

    console.log('\n🎉 All user accounts now have password: "password123"');
  } catch (err) {
    console.error('Crash error:', err);
  }
}

fixUserPasswords();
