import { supabase } from '../lib/supabase';
import type { SecurityAlert } from '../types/database.types';

export type PasswordResetStatus = 'success' | 'rate_limited' | 'blocked' | 'cooldown';

export type PasswordResetLog = {
  id: string;
  email: string;
  requested_at: string;
  ip_address: string | null;
  user_agent: string | null;
  status: PasswordResetStatus;
  attempt_count_today: number;
  reason?: string | null;
};

const STORAGE_KEY = 'ptdms_password_reset_logs';
const EMAIL_DAILY_LIMIT = 3;
const IP_DAILY_LIMIT = 10;
const COOLDOWN_SECONDS = 60;

// In-memory cache for fast rate limit checks
let localLogsCache: PasswordResetLog[] | null = null;

function getStoredLogs(): PasswordResetLog[] {
  if (localLogsCache) return localLogsCache;
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      localLogsCache = JSON.parse(raw) as PasswordResetLog[];
      return localLogsCache;
    }
  } catch {
    // Ignore JSON parse errors
  }
  return [];
}

function saveStoredLogs(logs: PasswordResetLog[]) {
  localLogsCache = logs;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 500)));
    } catch {
      // Ignore storage quota errors
    }
  }
}

function getClientIp(): string | null {
  // Best effort to get client IP or return standard browser indicator
  return null;
}

export function checkPasswordResetEligibility(email: string): {
  allowed: boolean;
  reason?: string;
  status: PasswordResetStatus;
  remainingCooldownSeconds?: number;
  attemptsToday: number;
} {
  const normalizedEmail = email.trim().toLowerCase();
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const logs = getStoredLogs();

  const recentEmailLogs = logs.filter(
    (l) => l.email.toLowerCase() === normalizedEmail && new Date(l.requested_at).getTime() >= oneDayAgo,
  );

  const attemptsToday = recentEmailLogs.length;

  // Check cooldown (60 seconds)
  const lastLog = recentEmailLogs[0];
  if (lastLog) {
    const timeSinceLast = (now - new Date(lastLog.requested_at).getTime()) / 1000;
    if (timeSinceLast < COOLDOWN_SECONDS) {
      const remainingCooldownSeconds = Math.ceil(COOLDOWN_SECONDS - timeSinceLast);
      return {
        allowed: false,
        status: 'cooldown',
        remainingCooldownSeconds,
        attemptsToday,
        reason: `กรุณารออีก ${remainingCooldownSeconds} วินาทีก่อนกดขอส่งลิงก์ใหม่`,
      };
    }
  }

  // Check daily limit (max 3 attempts per 24 hours)
  if (attemptsToday >= EMAIL_DAILY_LIMIT) {
    return {
      allowed: false,
      status: 'rate_limited',
      attemptsToday,
      reason: `คุณส่งคำขอเกินจำนวนที่กำหนดสำหรับวันนี้ (จำกัด ${EMAIL_DAILY_LIMIT} ครั้ง/วัน) กรุณาลองใหม่พรุ่งนี้ หรือติดต่อผู้ดูแลระบบ`,
    };
  }

  return {
    allowed: true,
    status: 'success',
    attemptsToday,
  };
}

export async function recordPasswordResetAttempt(email: string, status: PasswordResetStatus, reason?: string | null): Promise<PasswordResetLog> {
  const normalizedEmail = email.trim().toLowerCase();
  const nowIso = new Date().toISOString();
  const logs = getStoredLogs();
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  const emailAttemptsToday = logs.filter(
    (l) => l.email.toLowerCase() === normalizedEmail && new Date(l.requested_at).getTime() >= oneDayAgo,
  ).length + (status === 'success' || status === 'rate_limited' ? 1 : 0);

  const logId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `reset-${Date.now()}-${performance.now()}`;

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;
  const ipAddress = getClientIp();

  const newLog: PasswordResetLog = {
    id: logId,
    email: normalizedEmail,
    requested_at: nowIso,
    ip_address: ipAddress,
    user_agent: userAgent,
    status,
    attempt_count_today: emailAttemptsToday,
    reason: reason || null,
  };

  const updatedLogs = [newLog, ...logs];
  saveStoredLogs(updatedLogs);

  // If rate limited or spammed, trigger a Security Alert for supadmin
  if (status === 'rate_limited' || emailAttemptsToday > EMAIL_DAILY_LIMIT) {
    await triggerPasswordResetSecurityAlert(normalizedEmail, emailAttemptsToday, ipAddress);
  }

  return newLog;
}

async function triggerPasswordResetSecurityAlert(email: string, attemptCount: number, sourceIp: string | null) {
  try {
    const fingerprint = `pwd-reset-abuse:${email}:${new Date().toISOString().slice(0, 10)}`;
    const now = new Date().toISOString();

    await supabase.from('security_alerts').upsert(
      {
        alert_type: 'repeated_password_reset',
        severity: 'high',
        status: 'open',
        fingerprint,
        title: 'พบการขอ Reset Password ซ้ำผิดปกติ',
        description: `มีการส่งคำขอ Reset Password ไปยังอีเมล ${email} อย่างน้อย ${attemptCount} ครั้งในรอบ 24 ชั่วโมง ซึ่งเกินเกณฑ์ความปลอดภัย`,
        target_email: email,
        source_ip: sourceIp,
        attempt_count: attemptCount,
        window_started_at: now,
        last_detected_at: now,
        metadata: {
          email,
          attempt_count: attemptCount,
          trigger: 'forgot_password_rate_limit_exceeded',
        },
      },
      { onConflict: 'fingerprint' },
    );
  } catch {
    // Non-blocking security alert trigger
  }
}

export async function listPasswordResetLogs(limit = 100): Promise<PasswordResetLog[]> {
  const localLogs = getStoredLogs();
  return localLogs.slice(0, limit);
}

export function getPasswordResetDailyStats() {
  const logs = getStoredLogs();
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentLogs = logs.filter((l) => new Date(l.requested_at).getTime() >= oneDayAgo);

  const totalRequestsToday = recentLogs.length;
  const rateLimitedToday = recentLogs.filter((l) => l.status === 'rate_limited' || l.status === 'blocked').length;

  const uniqueEmails = new Set(recentLogs.map((l) => l.email.toLowerCase())).size;

  return {
    totalRequestsToday,
    rateLimitedToday,
    uniqueEmails,
  };
}

