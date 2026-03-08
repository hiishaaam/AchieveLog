import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function debugDb() {
  const { data: users } = await supabase.auth.admin.listUsers();
  console.log('=== USERS ===');
  users.users.forEach(u => console.log(u.email, u.id));
  
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('\n=== PROFILES ===');
  console.log(profiles);

  const { data: companions } = await supabase.from('companions').select('*');
  console.log('\n=== COMPANIONS ===');
  console.log(companions);
}
debugDb();
