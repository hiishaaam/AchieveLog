import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function test() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  const fs = require('fs');
  fs.writeFileSync('profiles_out.json', JSON.stringify({error: error, data: data}, null, 2));
}
test();
