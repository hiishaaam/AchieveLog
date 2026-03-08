import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
  const { data: users, error: err1 } = await supabase.from('profiles').select('*').limit(1);
  if (!users || users.length === 0) {
    console.log('No users found in profiles table');
    return;
  }
  const userId = users[0].id;
  console.log('Testing update on user:', userId);

  const { data, error } = await supabase
    .from('profiles')
    .update({ companion_email: 'test@example.com' })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.log('Error updating:', error);
  } else {
    console.log('Update success!', data);
  }
}

testUpdate();
