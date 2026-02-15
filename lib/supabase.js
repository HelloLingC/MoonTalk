const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.supabase_url, process.env.supabase_key);

module.exports = {
    supabase,
};
