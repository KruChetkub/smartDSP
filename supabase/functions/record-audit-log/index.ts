import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { readJsonObject, RequestBodyError } from '../_shared/request-security.ts';
import { consumeRateLimit, rateLimitHeaders, type RateLimitClient } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('SMARTDSP_ALLOWED_ORIGIN') ?? 'https://smart-dsp.vercel.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

const sensitiveKeyPattern = /(password|token|secret|apikey|api_key|authorization|otp|refresh|access)/i;

type AuditLogBody = {
  module?: unknown;
  action?: unknown;
  route?: unknown;
  targetType?: unknown;
  targetId?: unknown;
  status?: unknown;
  errorMessage?: unknown;
  metadata?: unknown;
  beforeData?: unknown;
  afterData?: unknown;
  requestId?: unknown;
  sessionId?: unknown;
  userAgent?: unknown;
};

function jsonResponse(body: Record<string, unknown>, status = 200, extraHeaders: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !sensitiveKeyPattern.test(key))
        .map(([key, nestedValue]) => [key, sanitizeValue(nestedValue)]),
    );
  }

  return value;
}

function sanitizeAuditData(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return sanitizeValue(value) as Record<string, unknown>;
}

function stringOrNull(value: unknown, maxLength = 255) {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

function isAuditIdentifier(value: string) {
  return /^[a-z0-9][a-z0-9_.:-]*$/i.test(value);
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ logged: false, reason: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ logged: false, reason: 'missing_environment' }, 500);
  }

  const authorization = req.headers.get('authorization') || '';
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData?.user;

  if (userError || !user) {
    return jsonResponse({ logged: false, reason: 'unauthorized' }, 401);
  }

  let body: AuditLogBody;
  try {
    body = await readJsonObject(req, 64 * 1024) as AuditLogBody;
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return jsonResponse({ logged: false, reason: error.reason }, error.status);
    }
    throw error;
  }
  const module = stringOrNull(body.module, 100);
  const action = stringOrNull(body.action, 160);

  if (!module || !action || !isAuditIdentifier(module) || !isAuditIdentifier(action)) {
    return jsonResponse({ logged: false, reason: 'invalid_payload' }, 400);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const rateLimit = await consumeRateLimit(
    adminClient as unknown as RateLimitClient,
    'record-audit-log',
    user.id,
    120,
    60,
  ).catch(() => null);
  if (!rateLimit) {
    return jsonResponse({ logged: false, reason: 'rate_limit_unavailable' }, 503);
  }
  if (!rateLimit.allowed) {
    return jsonResponse(
      { logged: false, reason: 'rate_limited' },
      429,
      rateLimitHeaders(rateLimit),
    );
  }

  const { data: profile } = await adminClient
    .from('profiles')
    .select('user_id, full_name, role')
    .eq('user_id', user.id)
    .maybeSingle();

  const targetType = stringOrNull(body.targetType, 100) || module;
  const targetId = stringOrNull(body.targetId, 500);
  const status = stringOrNull(body.status) === 'fail' ? 'fail' : 'success';

  const { error } = await adminClient.from('audit_logs').insert({
    actor_id: user.id,
    actor_user_id: user.id,
    actor_email: user.email ?? null,
    actor_name: profile?.full_name ?? null,
    actor_role: profile?.role ?? null,
    module,
    action,
    route: stringOrNull(body.route, 500),
    resource_type: targetType,
    resource_id: targetId,
    target_type: targetType,
    target_id: targetId,
    status,
    error_message: stringOrNull(body.errorMessage, 500),
    metadata: sanitizeAuditData(body.metadata),
    before_data: sanitizeAuditData(body.beforeData),
    after_data: sanitizeAuditData(body.afterData),
    request_id: stringOrNull(body.requestId, 200),
    session_id: stringOrNull(body.sessionId, 200),
    ip_address: getRequestIp(req),
    user_agent: stringOrNull(body.userAgent, 500) || req.headers.get('user-agent')?.slice(0, 500) || null,
    export_status: 'pending',
  });

  if (error) {
    console.error('record-audit-log insert failed', error);
    return jsonResponse({ logged: false, reason: 'audit_log_insert_failed' }, 500);
  }

  return jsonResponse({ logged: true });
});
