import { supabase } from '../lib/supabase';
import type { AuditLog, SecurityAlert } from '../types/database.types';
import type { UserRole } from '../types/roles';

export type { SecurityAlert } from '../types/database.types';

export type LoginHistory = {
  id: string;
  user_id: string;
  login_at: string;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  user_name?: string;
  user_role: UserRole | null;
};

export type AuditLogStatus = 'success' | 'fail';

export type AuditLogInput = {
  module: string;
  action: string;
  route?: string;
  targetType?: string;
  targetId?: string | null;
  status?: AuditLogStatus;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  requestId?: string | null;
  sessionId?: string | null;
};

export type LoginAttemptInput = {
  email?: string | null;
  success: boolean;
  accessToken?: string | null;
  errorMessage?: string | null;
};

const sensitiveKeyPattern = /(password|token|secret|apikey|api_key|authorization|otp|refresh|access)/i;

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

export function sanitizeAuditData(value?: unknown) {
  if (!value) {
    return null;
  }

  return sanitizeValue(value) as Record<string, unknown>;
}

function getRoute() {
  if (typeof window === 'undefined') {
    return null;
  }

  return `${window.location.pathname}${window.location.search}`;
}

function getUserAgent() {
  if (typeof navigator === 'undefined') {
    return null;
  }

  return navigator.userAgent || null;
}

export async function recordAuditLog(input: AuditLogInput) {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (sessionError || !accessToken) {
      return { logged: false, reason: 'no_authenticated_user' };
    }

    const { error } = await supabase.functions.invoke('record-audit-log', {
      body: {
        ...input,
        route: input.route || getRoute(),
        metadata: sanitizeAuditData(input.metadata),
        beforeData: sanitizeAuditData(input.beforeData),
        afterData: sanitizeAuditData(input.afterData),
        userAgent: getUserAgent(),
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (error) {
      const reason = await getFunctionErrorReason(error);
      return { logged: false, reason: reason || error.message };
    }

    return { logged: true };
  } catch (error) {
    return { logged: false, reason: error instanceof Error ? error.message : 'unknown_error' };
  }
}

export async function recordLoginAttempt(input: LoginAttemptInput) {
  try {
    const invokeOptions: {
      body: Record<string, unknown>;
      headers?: Record<string, string>;
    } = {
      body: {
        email: input.email,
        success: input.success,
        errorMessage: input.errorMessage,
        userAgent: getUserAgent(),
      },
    };

    if (input.accessToken) {
      invokeOptions.headers = { Authorization: `Bearer ${input.accessToken}` };
    }

    const { error } = await supabase.functions.invoke('record-login-attempt', invokeOptions);

    if (error) {
      const reason = await getFunctionErrorReason(error);
      return { logged: false, reason: reason || error.message };
    }

    return { logged: true };
  } catch (error) {
    return { logged: false, reason: error instanceof Error ? error.message : 'unknown_error' };
  }
}

export type AuditLogGoogleSheetExportResult = {
  exported: boolean;
  trigger?: 'manual' | 'scheduler';
  batch_id?: string;
  total_logs?: number;
  remaining_logs?: number;
  archive_file_url?: string | null;
  archive_file_id?: string | null;
  archive_skipped?: boolean;
  archive_error?: string | null;
  archive_download_file_name?: string | null;
  archive_download_content?: string | null;
  cleanup_deleted?: number;
  cleanup_error?: string | null;
  export_status_update_error?: string | null;
  reason?: string;
};

async function getFunctionErrorReason(error: unknown) {
  const context = (error as { context?: unknown })?.context;

  if (context instanceof Response) {
    try {
      const result = await context.clone().json() as { reason?: string; message?: string; error?: string };
      return result.reason || result.message || result.error || null;
    } catch {
      try {
        return await context.clone().text();
      } catch {
        return null;
      }
    }
  }

  return error instanceof Error ? error.message : null;
}

function getAuditExportErrorMessage(reason?: string | null) {
  if (!reason) {
    return 'ไม่สามารถส่งออก Audit Logs ไป Google Sheet ได้';
  }

  if (reason === 'missing_export_env') {
    return 'ยังไม่ได้ตั้งค่า Google Sheet Export ใน Supabase Secrets: AUDIT_LOG_APPS_SCRIPT_URL และ AUDIT_LOG_EXPORT_SECRET';
  }

  if (reason === 'missing_supabase_env') {
    return 'Supabase Function ยังไม่มีค่า SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY';
  }

  if (reason === 'super_admin_required') {
    return 'เฉพาะ Super Admin เท่านั้นที่ส่ง Audit Logs ไป Google Sheet ได้';
  }

  if (reason === 'missing_authorization' || reason === 'invalid_authorization') {
    return 'สิทธิ์เข้าใช้งานหมดอายุ กรุณาเข้าสู่ระบบใหม่';
  }

  if (reason === 'apps_script_fetch_failed' || reason === 'apps_script_export_failed') {
    return 'ไม่สามารถเชื่อมต่อหรือส่งข้อมูลไป Google Apps Script ได้';
  }

  return reason;
}

export async function exportAuditLogsToGoogleSheet() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (sessionError || !accessToken) {
    throw new Error('missing_authorization');
  }

  const { data, error } = await supabase.functions.invoke('export-audit-logs', {
    body: { trigger: 'manual' },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    const reason = await getFunctionErrorReason(error);
    throw new Error(getAuditExportErrorMessage(reason));
  }

  const result = data as AuditLogGoogleSheetExportResult;
  if (!result?.exported) {
    throw new Error(getAuditExportErrorMessage(result?.reason));
  }

  return result;
}
export async function listAuditLogs(limit = 200) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as AuditLog[];
}

export async function listLoginHistory(limit = 100) {
  const { data, error } = await supabase
    .from('login_history')
    .select('id, user_id, login_at, ip_address, user_agent, success, profiles(full_name, role)')
    .order('login_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];

  return rows.map((history: any) => ({
    ...history,
    user_name: history.profiles?.full_name || 'Unknown',
    user_role: history.profiles?.role ?? null,
  })) as LoginHistory[];
}

export async function listOpenSecurityAlerts(limit = 50) {
  const { data, error } = await supabase
    .from('security_alerts')
    .select('id, alert_type, severity, status, fingerprint, title, description, source_ip, target_email, attempt_count, window_started_at, last_detected_at, metadata, acknowledged_at, acknowledged_by, resolved_at, created_at, updated_at')
    .eq('status', 'open')
    .order('last_detected_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as SecurityAlert[];
}

export async function acknowledgeSecurityAlert(alertId: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (userError || !userId) {
    throw new Error('ไม่พบผู้ใช้ที่ยืนยันตัวตน');
  }

  const acknowledgedAt = new Date().toISOString();
  const { error } = await supabase
    .from('security_alerts')
    .update({
      status: 'acknowledged',
      acknowledged_at: acknowledgedAt,
      acknowledged_by: userId,
      updated_at: acknowledgedAt,
    })
    .eq('id', alertId)
    .eq('status', 'open');

  if (error) throw error;
}
