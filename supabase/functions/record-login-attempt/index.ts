import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { readJsonObject, RequestBodyError } from '../_shared/request-security.ts';
import { consumeRateLimit, rateLimitHeaders, type RateLimitClient } from '../_shared/rate-limit.ts';
import { privateNoStoreHeaders } from '../_shared/response-security.ts';

const corsHeaders = {
  ...privateNoStoreHeaders,
  'Access-Control-Allow-Origin': Deno.env.get('SMARTDSP_ALLOWED_ORIGIN') ?? 'https://smart-dsp.vercel.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

type LoginAttemptBody = {
  email?: unknown;
  success?: unknown;
  errorMessage?: unknown;
  userAgent?: unknown;
};

function jsonResponse(body: Record<string, unknown>, status = 200, extraHeaders: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function stringOrNull(value: unknown, maxLength = 255) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function normalizeEmail(value: unknown) {
  const email = stringOrNull(value, 254)?.toLowerCase() ?? null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }

  return email;
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

  let body: LoginAttemptBody;
  try {
    body = await readJsonObject(req, 4 * 1024) as LoginAttemptBody;
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return jsonResponse({ logged: false, reason: error.reason }, error.status);
    }
    throw error;
  }
  const success = body.success === true;
  const email = normalizeEmail(body.email);
  const errorMessage = success ? null : stringOrNull(body.errorMessage, 160);
  const userAgent = stringOrNull(body.userAgent, 500) || req.headers.get('user-agent');
  const ipAddress = getRequestIp(req);

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  if (!success) {
    const failedAttemptLimits = await Promise.all([
      consumeRateLimit(
        adminClient as unknown as RateLimitClient,
        'record-login-attempt:failed-ip',
        ipAddress ?? 'unknown',
        60,
        5 * 60,
      ),
      consumeRateLimit(
        adminClient as unknown as RateLimitClient,
        'record-login-attempt:failed-account',
        email ?? 'unknown',
        20,
        5 * 60,
      ),
    ]).catch(() => null);

    if (!failedAttemptLimits) {
      return jsonResponse({ logged: false, reason: 'rate_limit_unavailable' }, 503);
    }

    const deniedLimit = failedAttemptLimits.find((result) => !result.allowed);
    if (deniedLimit) {
      return jsonResponse(
        { logged: false, reason: 'rate_limited' },
        429,
        rateLimitHeaders(deniedLimit),
      );
    }
  }

  let user: { id: string; email?: string | null } | null = null;
  let profile: { user_id: string; full_name: string | null; role: string | null } | null = null;

  if (success) {
    const authorization = req.headers.get('authorization') || '';
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    user = userData?.user ? { id: userData.user.id, email: userData.user.email } : null;

    if (userError || !user) {
      return jsonResponse({ logged: false, reason: 'unauthorized' }, 401);
    }

    const successfulAttemptLimit = await consumeRateLimit(
      adminClient as unknown as RateLimitClient,
      'record-login-attempt:success',
      user.id,
      30,
      5 * 60,
    ).catch(() => null);
    if (!successfulAttemptLimit) {
      return jsonResponse({ logged: false, reason: 'rate_limit_unavailable' }, 503);
    }
    if (!successfulAttemptLimit.allowed) {
      return jsonResponse(
        { logged: false, reason: 'rate_limited' },
        429,
        rateLimitHeaders(successfulAttemptLimit),
      );
    }

    const { data: profileData } = await adminClient
      .from('profiles')
      .select('user_id, full_name, role')
      .eq('user_id', user.id)
      .maybeSingle();

    profile = profileData ?? null;
  }

  const { error: loginHistoryError } = await adminClient.from('login_history').insert({
    user_id: user?.id ?? null,
    ip_address: ipAddress,
    user_agent: userAgent,
    success,
  });

  if (loginHistoryError) {
    console.error('record-login-attempt login history insert failed', loginHistoryError);
    return jsonResponse({ logged: false, reason: 'login_history_insert_failed' }, 500);
  }

  const { error: auditLogError } = await adminClient.from('audit_logs').insert({
    actor_id: user?.id ?? null,
    actor_user_id: user?.id ?? null,
    actor_email: user?.email ?? email,
    actor_name: profile?.full_name ?? null,
    actor_role: profile?.role ?? null,
    module: 'auth',
    action: success ? 'login' : 'login_failed',
    route: '/login',
    resource_type: 'auth',
    resource_id: user?.id ?? email,
    target_type: 'user',
    target_id: user?.id ?? null,
    status: success ? 'success' : 'fail',
    error_message: errorMessage,
    metadata: success ? null : { email },
    ip_address: ipAddress,
    user_agent: userAgent,
    export_status: 'pending',
  });

  if (auditLogError) {
    console.error('record-login-attempt audit log insert failed', auditLogError);
    return jsonResponse({ logged: false, reason: 'audit_log_insert_failed' }, 500);
  }

  return jsonResponse({ logged: true });
});
