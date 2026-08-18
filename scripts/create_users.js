const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createUsers() {
  const users = [
    { username: 'qc_user', role: 'QC' },
    { username: 'produksi_user', role: 'PRODUCTION' }
  ];

  for (const u of users) {
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          name: u.username,
          email: u.username, // mapping username to email as done in UI
          password: hashedPassword,
          role: u.role,
          is_active: true,
        },
      ]);
      
    if (error) {
      console.error(`Failed to create ${u.username}:`, error.message);
    } else {
      console.log(`Successfully created user: ${u.username} with role ${u.role}`);
    }
  }
}

createUsers();
