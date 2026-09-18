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

type Profile = {
  user_id: string;
  full_name: string | null;
  role: string;
  status: string;
};

function getRequestIp(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('cf-connecting-ip')
    || req.headers.get('x-real-ip')
    || req.headers.get('x-client-ip')
    || null;
}

function jsonResponse(body: Record<string, unknown>, status = 200, extraHeaders: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function isValidEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse({ error: 'missing_environment' }, 500);
    }

    const authorization = req.headers.get('Authorization') || '';
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }

    let body: Record<string, unknown>;
    try {
      body = await readJsonObject(req, 4 * 1024);
    } catch (error) {
      if (error instanceof RequestBodyError) {
        return jsonResponse({ error: error.reason }, error.status);
      }
      throw error;
    }
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!isUuid(userId) || !isValidEmail(email)) {
      return jsonResponse({ error: 'invalid_payload' }, 400);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    const rateLimit = await consumeRateLimit(
      adminClient as unknown as RateLimitClient,
      'update-user-email',
      user.id,
      10,
      15 * 60,
    );
    if (!rateLimit.allowed) {
      return jsonResponse({ error: 'rate_limited' }, 429, rateLimitHeaders(rateLimit));
    }

    const [{ data: callerProfile, error: callerError }, { data: targetProfile, error: targetError }] = await Promise.all([
      adminClient.from('profiles').select('user_id, full_name, role, status').eq('user_id', user.id).single(),
      adminClient.from('profiles').select('user_id, full_name, role, status').eq('user_id', userId).single(),
    ]);

    if (callerError || !callerProfile) {
      return jsonResponse({ error: 'caller_profile_not_found' }, 403);
    }

    const caller = callerProfile as Profile;
    if (caller.role !== 'super_admin' || caller.status !== 'active') {
      return jsonResponse({ error: 'forbidden' }, 403);
    }

    if (targetError || !targetProfile) {
      return jsonResponse({ error: 'target_profile_not_found' }, 404);
    }

    const target = targetProfile as Profile;
    const { data: targetAuthData, error: targetAuthError } = await adminClient.auth.admin.getUserById(userId);
    if (targetAuthError || !targetAuthData.user) {
      return jsonResponse({ error: 'target_auth_user_not_found' }, 404);
    }

    const previousEmail = targetAuthData.user.email ?? null;
    const { data: auditEntry, error: auditInsertError } = await adminClient
      .from('audit_logs')
      .insert({
        actor_id: user.id,
        actor_user_id: user.id,
        actor_email: user.email ?? null,
        actor_name: caller.full_name,
        actor_role: caller.role,
        module: 'user_management',
        action: 'user_email_update',
        route: '/admin/users',
        resource_type: 'user',
        resource_id: userId,
        target_type: 'user',
        target_id: userId,
        status: 'fail',
        error_message: 'email_update_not_completed',
        before_data: { email: previousEmail },
        after_data: { email },
        metadata: {
          target_name: target.full_name,
          target_role: target.role,
          target_status: target.status,
        },
        ip_address: getRequestIp(req),
        user_agent: req.headers.get('user-agent')?.slice(0, 500) || null,
        export_status: 'pending',
      })
      .select('id')
      .single();

    if (auditInsertError || !auditEntry) {
      console.error('update-user-email audit insert failed', auditInsertError);
      return jsonResponse({ error: 'audit_log_insert_failed' }, 500);
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      email,
      email_confirm: true,
    });

    if (updateError) {
      await adminClient
        .from('audit_logs')
        .update({ error_message: 'email_update_failed' })
        .eq('id', auditEntry.id);
      console.error('update-user-email failed', updateError);
      return jsonResponse({ error: 'email_update_failed' }, 400);
    }

    const { error: auditUpdateError } = await adminClient
      .from('audit_logs')
      .update({ status: 'success', error_message: null })
      .eq('id', auditEntry.id);

    if (auditUpdateError) {
      console.error('update-user-email audit completion failed', auditUpdateError);
    }

    return jsonResponse({ ok: true, auditRecorded: !auditUpdateError });
  } catch (error) {
    console.error('update-user-email internal error', error);
    return jsonResponse({ error: 'internal_error' }, 500);
  }
});
