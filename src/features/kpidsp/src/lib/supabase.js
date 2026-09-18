import { supabase as smartDspSupabase } from '../../../../lib/supabase';

export const supabase = smartDspSupabase;

export async function withSupabaseTimeout(promise, label = 'Supabase request', timeoutMs = 8000) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs / 1000} seconds`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    window.clearTimeout(timeoutId);
  }
}
