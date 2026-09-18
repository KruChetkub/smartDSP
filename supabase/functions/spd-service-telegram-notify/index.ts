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

type TelegramSetting = {
  setting_key: string;
  setting_value: string | null;
  is_active: boolean;
};

type Profile = {
  user_id: string;
  full_name: string;
  role: string;
  status: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

type Ticket = {
  id: string;
  ticket_no: string;
  requester_id: string;
  requester_name: string;
  requester_department: string | null;
  requester_phone: string;
  category_name: string;
  urgency: string;
  status: string;
  subject: string;
  description: string;
  created_at: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200, extraHeaders: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function escapeHtml(value: string | null | undefined) {
  return (value || '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseRecipientIds(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function parseAdminUsernames(value: string | null | undefined) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string')
        .map(([adminId, username]) => [adminId, username.trim()]),
    );
  } catch {
    return {};
  }
}

function getSetting(settings: TelegramSetting[], key: string) {
  return settings.find((setting) => setting.setting_key === key)?.setting_value || '';
}

const defaultMessageTemplate = [
  '<b>SPD Service: มีคำขอใหม่</b>',
  'เลขคำขอ: <code>{{ticket_no}}</code>',
  'หัวข้อ: {{subject}}',
  'ประเภท: {{category_name}}',
  'ความเร่งด่วน: {{urgency}}',
  'ผู้แจ้ง: {{requester_name}}',
  'หน่วยงาน: {{requester_department}}',
  'โทร: {{requester_phone}}',
  'สถานะ: {{status}}',
  'เวลาแจ้ง: {{created_at}}',
  'Mention Admin: {{admin_mentions}}',
  '',
  '<b>รายละเอียด</b>',
  '{{description}}',
].join('\n');

function normalizeTelegramUsername(username: string) {
  const trimmed = username.trim();

  if (!trimmed) {
    return '';
  }

  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

function applyTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{{${key}}}`, value),
    template,
  );
}

function buildTicketCreatedMessage(ticket: Ticket, adminMentions: string[], template: string) {
  const assignedAdmins = adminMentions.length > 0 ? adminMentions.join(' ') : '-';
  const createdAt = new Date(ticket.created_at).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  });

  return applyTemplate(template.trim() || defaultMessageTemplate, {
    ticket_no: escapeHtml(ticket.ticket_no),
    subject: escapeHtml(ticket.subject),
    category_name: escapeHtml(ticket.category_name),
    urgency: escapeHtml(ticket.urgency),
    requester_name: escapeHtml(ticket.requester_name),
    requester_department: escapeHtml(ticket.requester_department),
    requester_phone: escapeHtml(ticket.requester_phone),
    status: escapeHtml(ticket.status),
    created_at: escapeHtml(createdAt),
    admin_mentions: escapeHtml(assignedAdmins),
    description: escapeHtml(ticket.description),
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const telegramBotToken = Deno.env.get('SPD_SERVICE_TELEGRAM_BOT_TOKEN') || Deno.env.get('TELEGRAM_BOT_TOKEN');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase Edge Function environment variables.');
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
      return new Response(JSON.stringify({ sent: false, reason: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: Record<string, unknown>;
    try {
      body = await readJsonObject(req, 4 * 1024);
    } catch (error) {
      if (error instanceof RequestBodyError) {
        return jsonResponse({ sent: false, reason: error.reason }, error.status);
      }
      throw error;
    }
    const ticketId = typeof body.ticketId === 'string' ? body.ticketId.trim() : '';

    if (body.event !== 'ticket_created' || !isUuid(ticketId)) {
      return new Response(JSON.stringify({ sent: false, reason: 'invalid_payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    const rateLimit = await consumeRateLimit(
      adminClient as unknown as RateLimitClient,
      'spd-service-telegram-notify',
      user.id,
      20,
      5 * 60,
    );
    if (!rateLimit.allowed) {
      return jsonResponse(
        { sent: false, reason: 'rate_limited' },
        429,
        rateLimitHeaders(rateLimit),
      );
    }

    const [{ data: ticket, error: ticketError }, { data: profile, error: profileError }] = await Promise.all([
      adminClient.from('spd_service_tickets').select('*').eq('id', ticketId).single(),
      adminClient.from('profiles').select('user_id, full_name, role, status').eq('user_id', user.id).single(),
    ]);

    if (profileError || !profile) {
      return new Response(JSON.stringify({ sent: false, reason: 'profile_not_found' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userProfile = profile as Profile;
    if (userProfile.status !== 'active') {
      return new Response(JSON.stringify({ sent: false, reason: 'account_inactive' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (ticketError || !ticket) {
      return new Response(JSON.stringify({ sent: false, reason: 'ticket_not_found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceTicket = ticket as Ticket;
    const canNotify =
      serviceTicket.requester_id === user.id ||
      userProfile.role === 'super_admin' ||
      userProfile.role === 'admin';

    if (!canNotify) {
      return new Response(JSON.stringify({ sent: false, reason: 'forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: settings, error: settingsError } = await adminClient
      .from('spd_service_notification_settings')
      .select('setting_key, setting_value, is_active')
      .in('setting_key', [
        'telegram_enabled',
        'telegram_chat_id',
        'telegram_admin_recipient_ids',
        'telegram_admin_usernames',
        'telegram_ticket_created_template',
      ]);

    if (settingsError) {
      throw settingsError;
    }

    const telegramSettings = (settings || []) as TelegramSetting[];
    const enabled = getSetting(telegramSettings, 'telegram_enabled') === 'true';
    const chatId = getSetting(telegramSettings, 'telegram_chat_id').trim();
    const adminRecipientIds = parseRecipientIds(getSetting(telegramSettings, 'telegram_admin_recipient_ids'));
    const adminUsernames = parseAdminUsernames(getSetting(telegramSettings, 'telegram_admin_usernames'));
    const messageTemplate = getSetting(telegramSettings, 'telegram_ticket_created_template') || defaultMessageTemplate;

    if (!enabled || !chatId) {
      return new Response(JSON.stringify({ sent: false, skipped: true, reason: 'telegram_disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!telegramBotToken) {
      return new Response(JSON.stringify({ sent: false, reason: 'missing_telegram_bot_token' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let adminMentions: string[] = [];
    if (adminRecipientIds.length > 0) {
      const { data: admins, error: adminsError } = await adminClient
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', adminRecipientIds);

      if (adminsError) {
        throw adminsError;
      }

      adminMentions = (admins || []).map((admin: { user_id: string; full_name: string }) => {
        const username = normalizeTelegramUsername(adminUsernames[admin.user_id] || '');
        return username || admin.full_name;
      });
    }

    const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: buildTicketCreatedMessage(serviceTicket, adminMentions, messageTemplate),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const telegramResult = await telegramResponse.json();

    if (!telegramResponse.ok) {
      console.error('SPD Service Telegram API error', {
        status: telegramResponse.status,
        result: telegramResult,
      });
      return new Response(JSON.stringify({ sent: false, reason: 'telegram_api_error' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ sent: true, telegramMessageId: telegramResult.result?.message_id || null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('SPD Service Telegram notification failed:', error);

    return new Response(JSON.stringify({ sent: false, reason: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
