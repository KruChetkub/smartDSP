import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// --- HELPER: Load Environment Variables ---
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim().replace(/^"|"$/g, '');
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('--- Verifying Migration ---');
    
    const { count: sdgCount, error: sdgError } = await supabase
        .from('sdg_indicators')
        .select('*', { count: 'exact', head: true });

    const { count: healthCount, error: healthError } = await supabase
        .from('health_indicators')
        .select('*', { count: 'exact', head: true });

    if (sdgError) console.error('SDG Error:', sdgError);
    else console.log(`SDG Indicators: ${sdgCount} rows found.`);

    if (healthError) console.error('Health Error:', healthError);
    else console.log(`Health Indicators: ${healthCount} rows found.`);

    if (sdgCount > 0 || healthCount > 0) {
        fs.writeFileSync('migration_result.txt', `SUCCESS: SDG=${sdgCount}, Health=${healthCount}`);
    } else {
        fs.writeFileSync('migration_result.txt', 'FAILED: No rows found.');
    }
}

verify();
