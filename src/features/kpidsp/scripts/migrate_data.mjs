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

console.log('Target URL:', supabaseUrl);
if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Supabase URL or Key not found in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- HELPER: Simple CSV Parser (Handles quoted newlines) ---
function parseCSV(content) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (inQuotes) {
            if (char === '"' && nextChar === '"') {
                currentField += '"';
                i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                currentField += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentRow.push(currentField.trim());
                currentField = '';
            } else if (char === '\n' || char === '\r') {
                if (char === '\r' && nextChar === '\n') i++;
                currentRow.push(currentField.trim());
                if (currentRow.length > 0 && currentRow.some(f => f !== '')) {
                    rows.push(currentRow);
                }
                currentRow = [];
                currentField = '';
            } else {
                currentField += char;
            }
        }
    }
    // Add last line if exists
    if (currentRow.length > 0 || currentField) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
    }
    return rows;
}

async function migrateSDGs() {
    console.log('--- Migrating SDGs ---');
    const filePath = path.resolve(process.cwd(), '(1)KpiMonitoring - SDGs.csv');
    if (!fs.existsSync(filePath)) {
        console.warn('SDG CSV not found, skipping...');
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const rows = parseCSV(content);
    
    // Headers: หมวดหมู่ตัวชี้วัดหลัก, ลำดับ, เป้าหมายย่อยที่, ชื่อตัวชี้วัด, เป้าหมาย SDG ปี 2573, หน่วยวัด, ผลการดำเนินงานปัจจุบัน (68), หน่วยงานที่รับผิดชอบ, ปีที่รายงาน, หมายเหตุ, Timestamp
    const headers = rows[0];
    const dataRows = rows.slice(1);

    const records = dataRows.map(row => {
        const indicator_name = row[3] || 'ไม่ระบุ';
        const category = row[2] || '';
        const target_2030 = row[4] || '';
        const perfRaw = row[6] || '0';
        const description = row[9] || '';

        // Clean performance value (remove commas, handle '-')
        let current_performance = 0;
        if (perfRaw !== '-' && perfRaw !== '') {
            current_performance = parseFloat(perfRaw.replace(/,/g, ''));
            if (isNaN(current_performance)) current_performance = 0;
        }

        return {
            indicator_name,
            category,
            target_2030,
            current_performance,
            description
        };
    });

    const { error } = await supabase.from('sdg_indicators').insert(records);
    if (error) console.error('Error inserting SDGs:', error);
    else console.log(`Successfully inserted ${records.length} SDG indicators.`);
}

async function migrateHealthKPIs() {
    console.log('--- Migrating Health KPIs ---');
    const filePath = path.resolve(process.cwd(), '(1)KpiMonitoring - Health_KPI.csv');
    if (!fs.existsSync(filePath)) {
        console.warn('Health KPI CSV not found, skipping...');
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const rows = parseCSV(content);

    // Headers: indicatorName, subIndicatorName, region, targetQ1, targetQ2, targetQ3, targetQ4, A, B, performance
    const headers = rows[0];
    const dataRows = rows.slice(1);

    const records = dataRows.map(row => {
        const indicator_name = row[0] || 'ไม่ระบุ';
        const kpi_group = row[1] || '';
        const region = row[2] || '';
        const target_q1 = row[3] || '';
        const target_q2 = row[4] || '';
        const target_q3 = row[5] || '';
        const target_q4 = row[6] || '';
        const a_raw = row[7] || '0';
        const b_raw = row[8] || '0';
        const perf_raw = row[9] || '0';

        return {
            indicator_name,
            kpi_group,
            region,
            target_q1,
            target_q2,
            target_q3,
            target_q4,
            a_value: parseFloat(a_raw.replace(/,/g, '')) || 0,
            b_value: parseFloat(b_raw.replace(/,/g, '')) || 0,
            performance: parseFloat(perf_raw.replace(/,/g, '')) || 0,
            is_type_a: indicator_name.includes('006') || indicator_name.includes('007') // Heuristic or based on data
        };
    });

    const { error } = await supabase.from('health_indicators').insert(records);
    if (error) console.error('Error inserting Health KPIs:', error);
    else console.log(`Successfully inserted ${records.length} Health KPI rows.`);
}

async function run() {
    await migrateSDGs();
    await migrateHealthKPIs();
    console.log('\nMigration Complete!');
}

run();
