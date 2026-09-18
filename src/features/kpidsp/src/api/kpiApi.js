import { supabase } from '../lib/supabase';
import { calculateAchievementPercentage } from '../utils/kpiEvaluation';

// Fetch all SDG indicators
export async function fetchSDGIndicators(year = '2569', period = 'Q4') {
  let query = supabase
    .from('sdg_indicators')
    .select('*')
    .eq('is_deleted', false)
    .order('indicator_name', { ascending: true });

  if (year && year !== 'All') query = query.eq('fiscal_year', year);
  if (period && period !== 'All') query = query.eq('period', period);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Fetch all Health KPI indicators (aggregated or specific)
export async function fetchHealthIndicators(year = '2569', period = 'Q4') {
  let query = supabase
    .from('health_indicators')
    .select('*')
    .eq('is_deleted', false)
    .order('indicator_name', { ascending: true });

  if (year && year !== 'All') query = query.eq('fiscal_year', year);
  if (period && period !== 'All') query = query.eq('period', period);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Helper: Evaluate status based on performance and target string
export function evaluateKPIStatus(current, targetString, direction) {
  const percentage = calculateAchievementPercentage(current, targetString, direction);
  if (percentage === null) {
    return { color: 'text-slate-400', raw: 'pending', text: 'N/A' };
  }

  if (percentage >= 100) return { color: 'text-emerald-400', raw: 'passed_100', text: 'บรรลุเป้าหมาย' };
  if (percentage >= 75) return { color: 'text-yellow-400', raw: 'failed_75', text: 'เฝ้าระวัง' };
  if (percentage >= 50) return { color: 'text-orange-400', raw: 'failed_50', text: 'เสี่ยง' };
  return { color: 'text-rose-500', raw: 'failed_0', text: 'วิกฤติ' };
}
