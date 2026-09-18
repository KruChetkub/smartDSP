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

type TelegramSetting = { setting_key: string; setting_value: string | null; is_active: boolean };
type Profile = { user_id: string; full_name: string; role: string };
type MeetingRoomReservation = {
  id: string;
  reservation_date: string;
  room: string;
  meeting_type: string;
  online_meeting_url: string | null;
  details: string | null;
  start_time: string;
  end_time: string;
  booker_name: string;
  work_group: string;
  topic: string;
  created_by: string | null;
  created_at: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function escapeHtml(value: string | null | undefined) {
  return (value || '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function jsonResponse(body: unknown, status = 200, extraHeaders: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function parseRecipientIds(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function parseAdminUsernames(value: string | null | undefined) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
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

function normalizeTelegramUsername(username: string) {
  const trimmed = username.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}
function formatThaiDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' });
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function buildReservationMessage(reservation: MeetingRoomReservation, adminMentions: string[]) {
  const assignedAdmins = adminMentions.length > 0 ? adminMentions.join(' ') : '-';
  return [
    '<b>จองห้องประชุม: มีรายการใหม่</b>',
    `หัวข้อประชุม: ${escapeHtml(reservation.topic)}`,
    `วันที่: ${escapeHtml(formatThaiDate(reservation.reservation_date))}`,
    `เวลา: ${escapeHtml(formatTime(reservation.start_time))} - ${escapeHtml(formatTime(reservation.end_time))} น.`,
    `ห้อง: ${escapeHtml(reservation.room)}`,
    `รูปแบบ: ${escapeHtml(reservation.meeting_type)}`,
    `ผู้จอง: ${escapeHtml(reservation.booker_name)}`,
    `กลุ่ม: ${escapeHtml(reservation.work_group)}`,
    `ลิงก์ประชุมออนไลน์: ${escapeHtml(reservation.online_meeting_url)}`,
    `Mention Admin: ${escapeHtml(assignedAdmins)}`,
    '',
    '<b>รายละเอียดเพิ่มเติม</b>',
    escapeHtml(reservation.details),
  ].join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const telegramBotToken = Deno.env.get('SPD_SERVICE_TELEGRAM_BOT_TOKEN') || Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) throw new Error('Missing Supabase Edge Function environment variables.');

    const authorization = req.headers.get('Authorization') || '';
    const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ sent: false, reason: 'unauthorized' }, 401);
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
    const reservationId = typeof body.reservationId === 'string' ? body.reservationId.trim() : '';
    if (body.event !== 'reservation_created' || !isUuid(reservationId)) {
      return jsonResponse({ sent: false, reason: 'invalid_payload' }, 400);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } });
    const rateLimit = await consumeRateLimit(
      adminClient as unknown as RateLimitClient,
      'meeting-room-telegram-notify',
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

    const [{ data: reservation, error: reservationError }, { data: profile, error: profileError }] = await Promise.all([
      adminClient.from('meeting_room_reservations').select('*').eq('id', reservationId).single(),
      adminClient.from('profiles').select('user_id, full_name, role').eq('user_id', user.id).single(),
    ]);
    if (reservationError || !reservation) {
      return jsonResponse({ sent: false, reason: 'reservation_not_found' }, 404);
    }
    if (profileError || !profile) {
      return jsonResponse({ sent: false, reason: 'profile_not_found' }, 403);
    }

    const userProfile = profile as Profile;
    const meetingReservation = reservation as MeetingRoomReservation;
    const canNotify = meetingReservation.created_by === user.id || userProfile.role === 'super_admin' || userProfile.role === 'admin';
    if (!canNotify) {
      return jsonResponse({ sent: false, reason: 'forbidden' }, 403);
    }

    const { data: settings, error: settingsError } = await adminClient
      .from('spd_service_notification_settings')
      .select('setting_key, setting_value, is_active')
      .in('setting_key', ['telegram_enabled', 'telegram_chat_id', 'telegram_admin_recipient_ids', 'telegram_admin_usernames']);
    if (settingsError) throw settingsError;

    const telegramSettings = (settings || []) as TelegramSetting[];
    const enabled = getSetting(telegramSettings, 'telegram_enabled') === 'true';
    const chatId = getSetting(telegramSettings, 'telegram_chat_id').trim();
    const adminRecipientIds = parseRecipientIds(getSetting(telegramSettings, 'telegram_admin_recipient_ids'));
    const adminUsernames = parseAdminUsernames(getSetting(telegramSettings, 'telegram_admin_usernames'));
    if (!enabled || !chatId) {
      return jsonResponse({ sent: false, skipped: true, reason: 'telegram_disabled' });
    }
    if (!telegramBotToken) {
      return jsonResponse({ sent: false, reason: 'missing_telegram_bot_token' });
    }

    let adminMentions: string[] = [];
    if (adminRecipientIds.length > 0) {
      const { data: admins, error: adminsError } = await adminClient.from('profiles').select('user_id, full_name').in('user_id', adminRecipientIds);
      if (adminsError) throw adminsError;
      adminMentions = (admins || []).map((admin: { user_id: string; full_name: string }) => normalizeTelegramUsername(adminUsernames[admin.user_id] || '') || admin.full_name);
    }

    const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: buildReservationMessage(meetingReservation, adminMentions), parse_mode: 'HTML', disable_web_page_preview: false }),
    });
    const telegramResult = await telegramResponse.json();
    if (!telegramResponse.ok) {
      console.error('Meeting room Telegram API error', {
        status: telegramResponse.status,
        result: telegramResult,
      });
      return jsonResponse({ sent: false, reason: 'telegram_api_error' }, 502);
    }
    return jsonResponse({ sent: true, telegramMessageId: telegramResult.result?.message_id || null });
  } catch (error) {
    console.error('Meeting room Telegram notification failed:', error);
    return jsonResponse({ sent: false, reason: 'internal_error' }, 500);
  }
});
