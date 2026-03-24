const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials missing. Supabase JS client will be disabled.');
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
}

module.exports = supabase;
