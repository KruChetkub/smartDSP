import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { consumeRateLimit, rateLimitHeaders, type RateLimitClient } from '../_shared/rate-limit.ts';
import { privateNoStoreHeaders } from '../_shared/response-security.ts';

const exportedLogRetentionMs = 72 * 60 * 60 * 1000;
const exportBatchSize = 1000;
const statusUpdateChunkSize = 100;

const corsHeaders = {
  ...privateNoStoreHeaders,
  'Access-Control-Allow-Origin': Deno.env.get('SMARTDSP_ALLOWED_ORIGIN') ?? 'https://smart-dsp.vercel.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-audit-export-secret',
  'Access-Control-Max-Age': '86400',
};

type AuditLogRow = {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  actor_role: string | null;
  module: string | null;
  action: string;
  route: string | null;
  target_type: string | null;
  target_id: string | null;
  status: string;
  error_message: string | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  session_id: string | null;
  metadata: Record<string, unknown> | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  retry_count: number;
};

type ExportCaller = {
  type: 'scheduler' | 'manual';
  userId?: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
};

type AppsScriptResult = {
  ok?: boolean;
  error?: string;
  archive_file_id?: string;
  archive_file_url?: string;
  archive_skipped?: boolean;
  archive_error?: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200, extraHeaders: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function getBangkokDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(date);
}

function summarizeByField(logs: AuditLogRow[], field: 'module' | 'action') {
  return logs.reduce<Record<string, number>>((summary, log) => {
    const key = String(log[field] || 'unknown');
    summary[key] = (summary[key] || 0) + 1;
    return summary;
  }, {});
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function markAuditLogs(
  adminClient: ReturnType<typeof createClient>,
  ids: string[],
  values: Record<string, unknown>,
) {
  const errors: string[] = [];
  for (const chunk of chunkArray(ids, statusUpdateChunkSize)) {
    const { error } = await adminClient
      .from('audit_logs')
      .update(values)
      .in('id', chunk);

    if (error) {
      errors.push(error.message);
    }
  }

  return errors;
}

async function incrementRetryCount(adminClient: ReturnType<typeof createClient>, ids: string[]) {
  for (const chunk of chunkArray(ids, statusUpdateChunkSize)) {
    await adminClient.rpc('increment_audit_log_retry_count', { p_ids: chunk }).then(() => null, () => null);
  }
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
function getRequestIp(req: Request) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim()
    || req.headers.get('cf-connecting-ip')
    || req.headers.get('x-real-ip')
    || req.headers.get('x-client-ip')
    || null;

  return ip || null;
}

function getBearerToken(req: Request) {
  const authorization = req.headers.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

async function authorizeExportRequest(req: Request, adminClient: ReturnType<typeof createClient>, cronSecret: string | undefined) {
  const requestSecret = req.headers.get('x-audit-export-secret') || '';
  if (cronSecret && requestSecret === cronSecret) {
    return { authorized: true, caller: { type: 'scheduler' } as ExportCaller };
  }

  const token = getBearerToken(req);
  if (!token) {
    return { authorized: false, status: 401, reason: 'missing_authorization' };
  }

  const { data: userData, error: userError } = await adminClient.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) {
    return { authorized: false, status: 401, reason: 'invalid_authorization' };
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('user_id, full_name, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('audit export profile lookup failed', profileError);
    return { authorized: false, status: 500, reason: 'profile_lookup_failed' };
  }

  if (profile?.role !== 'super_admin') {
    return { authorized: false, status: 403, reason: 'super_admin_required' };
  }

  return {
    authorized: true,
    caller: {
      type: 'manual',
      userId: user.id,
      email: user.email ?? null,
      name: profile.full_name ?? null,
      role: profile.role ?? null,
    } as ExportCaller,
  };
}

async function recordManualExportRequest(adminClient: ReturnType<typeof createClient>, caller: ExportCaller, batchId: string, req: Request) {
  if (caller.type !== 'manual' || !caller.userId) {
    return;
  }

  await adminClient.from('audit_logs').insert({
    actor_id: caller.userId,
    actor_user_id: caller.userId,
    actor_email: caller.email ?? null,
    actor_name: caller.name ?? null,
    actor_role: caller.role ?? null,
    module: 'audit_logs',
    action: 'audit_log_google_sheet_export_manual',
    route: '/admin/security',
    resource_type: 'audit_logs',
    target_type: 'google_sheet_export',
    target_id: batchId,
    status: 'success',
    metadata: {
      export_destination: 'google_sheet',
      trigger: 'manual',
      batch_id: batchId,
    },
    ip_address: getRequestIp(req),
    user_agent: req.headers.get('user-agent'),
    export_status: 'pending',
  }).then(() => null, () => null);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ exported: false, reason: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const appsScriptUrl = Deno.env.get('AUDIT_LOG_APPS_SCRIPT_URL');
  const exportSecret = Deno.env.get('AUDIT_LOG_EXPORT_SECRET');
  const cronSecret = Deno.env.get('AUDIT_LOG_EXPORT_CRON_SECRET');
  const notifyEmails = (Deno.env.get('AUDIT_LOG_NOTIFY_EMAILS') || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ exported: false, reason: 'missing_supabase_env' }, 500);
  }

  if (!appsScriptUrl || !exportSecret) {
    return jsonResponse({ exported: false, reason: 'missing_export_env' }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const authResult = await authorizeExportRequest(req, adminClient, cronSecret || undefined);
  if (!authResult.authorized) {
    return jsonResponse({ exported: false, reason: authResult.reason }, authResult.status);
  }

  const caller = authResult.caller;
  const rateLimit = await consumeRateLimit(
    adminClient as unknown as RateLimitClient,
    'export-audit-logs',
    caller.userId ?? caller.type,
    6,
    15 * 60,
  ).catch(() => null);
  if (!rateLimit) {
    return jsonResponse({ exported: false, reason: 'rate_limit_unavailable' }, 503);
  }
  if (!rateLimit.allowed) {
    return jsonResponse(
      { exported: false, reason: 'rate_limited' },
      429,
      rateLimitHeaders(rateLimit),
    );
  }

  const batchId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const bangkokDate = getBangkokDateKey();

  await recordManualExportRequest(adminClient, caller, batchId, req);

  const { data: logs, error: logsError, count: matchingLogCount } = await adminClient
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .or('export_status.is.null,export_status.neq.exported')
    .order('created_at', { ascending: true })
    .limit(exportBatchSize);

  if (logsError) {
    console.error('audit export query failed', logsError);
    return jsonResponse({ exported: false, reason: 'audit_log_query_failed' }, 500);
  }

  const pendingLogs = (logs || []) as AuditLogRow[];
  const remainingLogs = Math.max((matchingLogCount || 0) - pendingLogs.length, 0);
  const archivePayload = {
    archive_type: 'audit_logs_export',
    schema_version: 1,
    batch_id: batchId,
    generated_at: new Date().toISOString(),
    bangkok_date: bangkokDate,
    total_logs: pendingLogs.length,
    remaining_logs: remainingLogs,
    logs: pendingLogs,
  };
  const archiveContent = JSON.stringify(archivePayload, null, 2);
  const archiveChecksum = await sha256Hex(archiveContent);

  const payload = {
    event: caller.type === 'scheduler' ? 'audit_logs_daily_export' : 'audit_logs_manual_export',
    trigger: caller.type,
    requested_by: caller.type === 'manual'
      ? { user_id: caller.userId, email: caller.email, name: caller.name, role: caller.role }
      : null,
    batch_id: batchId,
    bangkok_date: bangkokDate,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    notify_emails: notifyEmails,
    export_secret: exportSecret,
    total_logs: pendingLogs.length,
    remaining_logs: remainingLogs,
    module_summary: summarizeByField(pendingLogs, 'module'),
    action_summary: summarizeByField(pendingLogs, 'action'),
    logs: pendingLogs,
    archive: {
      file_name: `audit-logs-${bangkokDate}-${batchId}.json`,
      mime_type: 'application/json',
      sha256: archiveChecksum,
      content: archiveContent,
    },
  };

  const appsScriptBody = JSON.stringify(payload);
  let appsScriptResponse: Response;

  try {
    appsScriptResponse = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Audit-Export-Secret': exportSecret,
      },
      body: appsScriptBody,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    console.error('Audit log Apps Script connection failed', { batchId, message });
    return jsonResponse({ exported: false, batch_id: batchId, reason: 'apps_script_fetch_failed' }, 502);
  }

  const responseText = await appsScriptResponse.text();
  let appsScriptResult: AppsScriptResult | null = null;

  try {
    appsScriptResult = JSON.parse(responseText) as AppsScriptResult;
  } catch {
    appsScriptResult = null;
  }

  const appsScriptError = appsScriptResult?.ok === false
    ? appsScriptResult.error || responseText
    : responseText;

  if (!appsScriptResponse.ok || appsScriptResult?.ok === false) {
    console.error('Audit log Apps Script export failed', {
      status: appsScriptResponse.status,
      statusText: appsScriptResponse.statusText,
      body: appsScriptError.slice(0, 500),
      batchId,
    });

    const ids = pendingLogs.map((log) => log.id);
    if (ids.length > 0) {
      await markAuditLogs(adminClient, ids, {
        export_status: 'failed',
        last_export_error: appsScriptError.slice(0, 500),
      });

      await incrementRetryCount(adminClient, ids);
    }

    return jsonResponse({ exported: false, batch_id: batchId, reason: 'apps_script_export_failed' }, 502);
  }

  const ids = pendingLogs.map((log) => log.id);
  let exportStatusUpdateError: string | null = null;

  if (ids.length > 0) {
    const updateErrors = await markAuditLogs(adminClient, ids, {
      exported_at: new Date().toISOString(),
      export_status: 'exported',
      export_batch_id: batchId,
      last_export_error: null,
    });

    if (updateErrors.length > 0) {
      exportStatusUpdateError = updateErrors.join('; ').slice(0, 500);
      console.error('Audit log export succeeded but status update failed', {
        batchId,
        error: exportStatusUpdateError,
      });
    }
  }

  const cleanupCutoff = new Date(Date.now() - exportedLogRetentionMs).toISOString();
  const { count: cleanupDeleted, error: cleanupError } = await adminClient
    .from('audit_logs')
    .delete({ count: 'exact' })
    .eq('export_status', 'exported')
    .lt('exported_at', cleanupCutoff);

  return jsonResponse({
    exported: true,
    trigger: caller.type,
    batch_id: batchId,
    total_logs: pendingLogs.length,
    remaining_logs: remainingLogs,
    archive_file_url: appsScriptResult?.archive_file_url || null,
    archive_file_id: appsScriptResult?.archive_file_id || null,
    archive_skipped: appsScriptResult?.archive_skipped || false,
    archive_error: appsScriptResult?.archive_error ? 'archive_failed' : null,
    archive_download_file_name: appsScriptResult?.archive_file_url ? null : payload.archive.file_name,
    archive_download_content: appsScriptResult?.archive_file_url ? null : archiveContent,
    cleanup_deleted: cleanupDeleted || 0,
    cleanup_error: cleanupError ? 'cleanup_failed' : null,
    export_status_update_error: exportStatusUpdateError ? 'status_update_failed' : null,
  });
});
