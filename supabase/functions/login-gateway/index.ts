import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { readJsonObject, RequestBodyError } from '../_shared/request-security.ts';
import { consumeRateLimit, rateLimitHeaders, type RateLimitClient } from '../_shared/rate-limit.ts';

const defaultAllowedOrigins = [
  'https://smart-dsp.vercel.app',
  'http://localhost:5173',
];

const baseCorsHeaders = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

function getAllowedOrigins() {
  const configuredOrigins = [
    Deno.env.get('SMARTDSP_ALLOWED_ORIGIN'),
    Deno.env.get('SMARTDSP_ALLOWED_ORIGINS'),
  ]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set([...defaultAllowedOrigins, ...configuredOrigins]);
}

function getCorsHeaders(origin: string) {
  return {
    ...baseCorsHeaders,
    'Access-Control-Allow-Origin': origin,
    Vary: 'Origin',
  };
}

const blockedMessage = 'IP ของคุณถูกบล็อกเนื่องจากพบพฤติกรรมการเข้าสู่ระบบผิดปกติ กรุณาติดต่อเจ้าหน้าที่ผู้รับผิดชอบระบบเพื่อขอปลดบล็อก';

type LoginBody = {
  email?: unknown;
  password?: unknown;
};

type LoginSettings = {
  enabled: boolean;
};

type IpRule = {
  id: string;
  rule_type: 'allow' | 'block';
  expires_at: string | null;
};

type AuthTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  user?: {
    id?: string;
    email?: string | null;
  };
};

function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function normalizePassword(value: unknown) {
  return typeof value === 'string' && value.length > 0 && value.length <= 1024 ? value : null;
}

function normalizeIp(value: string | null) {
  if (!value) return null;
  let ip = value.split(',')[0]?.trim() ?? '';
  if (ip.startsWith('[') && ip.includes(']')) {
    ip = ip.slice(1, ip.indexOf(']'));
  } else {
    const ipv4WithPort = ip.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
    if (ipv4WithPort) ip = ipv4WithPort[1];
  }

  if (!ip || ip.length > 64 || !/^[0-9a-fA-F:.]+$/.test(ip)) return null;
  return ip;
}

function getRequestIp(req: Request) {
  return normalizeIp(
    req.headers.get('cf-connecting-ip')
      || req.headers.get('x-real-ip')
      || req.headers.get('x-forwarded-for')
      || req.headers.get('x-client-ip'),
  );
}

async function recordAttempt(
  adminClient: ReturnType<typeof createClient>,
  input: {
    success: boolean;
    email: string;
    ipAddress: string;
    userAgent: string | null;
    user?: { id: string; email?: string | null } | null;
    errorMessage?: string | null;
  },
) {
  let profile: { full_name: string | null; role: string | null } | null = null;
  if (input.user) {
    const { data } = await adminClient
      .from('profiles')
      .select('full_name, role')
      .eq('user_id', input.user.id)
      .maybeSingle();
    profile = data ?? null;
  }

  const { error: historyError } = await adminClient.from('login_history').insert({
    user_id: input.user?.id ?? null,
    ip_address: input.ipAddress,
    user_agent: input.userAgent,
    success: input.success,
  });
  if (historyError) throw new Error('login_history_insert_failed');

  const { error: auditError } = await adminClient.from('audit_logs').insert({
    actor_id: input.user?.id ?? null,
    actor_user_id: input.user?.id ?? null,
    actor_email: input.user?.email ?? input.email,
    actor_name: profile?.full_name ?? null,
    actor_role: profile?.role ?? null,
    module: 'auth',
    action: input.success ? 'login' : 'login_failed',
    route: '/login',
    resource_type: 'auth',
    resource_id: input.user?.id ?? input.email,
    target_type: 'user',
    target_id: input.user?.id ?? null,
    status: input.success ? 'success' : 'fail',
    error_message: input.errorMessage ?? null,
    metadata: input.success ? null : { email: input.email },
    ip_address: input.ipAddress,
    user_agent: input.userAgent,
    export_status: 'pending',
  });
  if (auditError) throw new Error('audit_log_insert_failed');
}

async function getActiveRule(adminClient: ReturnType<typeof createClient>, ipAddress: string) {
  const { data, error } = await adminClient
    .from('login_ip_rules')
    .select('id, rule_type, expires_at')
    .eq('ip_address', ipAddress)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error('ip_rule_lookup_failed');
  const rule = data as IpRule | null;
  if (!rule) return null;

  if (rule.expires_at && new Date(rule.expires_at).getTime() <= Date.now()) {
    const { error: expireError } = await adminClient
      .from('login_ip_rules')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', rule.id);
    if (expireError) throw new Error('ip_rule_expire_failed');
    return null;
  }

  return rule;
}

serve(async (req) => {
  const requestOrigin = req.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  if (requestOrigin && !allowedOrigins.has(requestOrigin)) {
    return new Response(JSON.stringify({ reason: 'origin_not_allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', Vary: 'Origin' },
    });
  }

  const corsHeaders = getCorsHeaders(requestOrigin ?? defaultAllowedOrigins[0]);
  const jsonResponse = (body: Record<string, unknown>, status = 200, extraHeaders: HeadersInit = {}) => (
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
    })
  );

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ reason: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse({ reason: 'service_unavailable' }, 503);
  }

  let body: LoginBody;
  try {
    body = await readJsonObject(req, 4 * 1024) as LoginBody;
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return jsonResponse({ reason: error.reason }, error.status);
    }
    return jsonResponse({ reason: 'invalid_payload' }, 400);
  }

  const email = normalizeEmail(body.email);
  const password = normalizePassword(body.password);
  const ipAddress = getRequestIp(req);
  if (!email || !password) return jsonResponse({ reason: 'invalid_payload' }, 400);
  if (!ipAddress) return jsonResponse({ reason: 'client_ip_unavailable' }, 503);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const rateLimit = await consumeRateLimit(
      adminClient as unknown as RateLimitClient,
      'login-gateway',
      ipAddress,
      120,
      5 * 60,
    );
    if (!rateLimit.allowed) {
      return jsonResponse({ reason: 'rate_limited' }, 429, rateLimitHeaders(rateLimit));
    }

    const { data: settingsData, error: settingsError } = await adminClient
      .from('login_ip_block_settings')
      .select('enabled')
      .eq('singleton_id', 1)
      .single();
    if (settingsError) throw new Error('settings_lookup_failed');

    const settings = settingsData as LoginSettings;
    if (settings.enabled) {
      const rule = await getActiveRule(adminClient, ipAddress);
      if (rule?.rule_type === 'block') {
        return jsonResponse({ reason: 'ip_blocked', message: blockedMessage }, 403);
      }
    }

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const authData = await authResponse.json().catch(() => ({})) as AuthTokenResponse;
    const userAgent = req.headers.get('user-agent')?.slice(0, 500) || null;

    if (!authResponse.ok || !authData.access_token || !authData.refresh_token || !authData.user?.id) {
      await recordAttempt(adminClient, {
        success: false,
        email,
        ipAddress,
        userAgent,
        errorMessage: 'invalid_credentials',
      });

      if (settings.enabled) {
        const newRule = await getActiveRule(adminClient, ipAddress);
        if (newRule?.rule_type === 'block') {
          return jsonResponse({ reason: 'ip_blocked', message: blockedMessage }, 403);
        }
      }

      return jsonResponse({ reason: 'invalid_credentials' }, 401);
    }

    return jsonResponse({
      access_token: authData.access_token,
      refresh_token: authData.refresh_token,
      expires_in: authData.expires_in,
      token_type: authData.token_type ?? 'bearer',
    });
  } catch (error) {
    console.error('login-gateway request failed', {
      reason: error instanceof Error ? error.message : 'unknown_error',
    });
    return jsonResponse({ reason: 'service_unavailable' }, 503);
  }
});
