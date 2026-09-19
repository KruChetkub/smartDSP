import { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  LogIn,
  Clock,
  Globe,
  Monitor,
  CheckCircle2,
  XCircle,
  CloudUpload,
  Loader2,
  RotateCcw,
  KeyRound,
  Smartphone,
  ShieldAlert,
  Ban,
  TimerReset,
  MailWarning,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { BackupRestorePanel } from './BackupRestorePanel';
import { ForceChangePasswordPanel } from './ForceChangePasswordPanel';
import { MfaEnforcementPanel } from './MfaEnforcementPanel';
import { LoginIpBlockPanel } from './LoginIpBlockPanel';
import { PasswordResetLogsPanel } from './PasswordResetLogsPanel';
import { SiteManagerSecuritySettings } from '../site-manager/components/SiteManagerSecuritySettings';
import { saveLoginIpRule } from '../../services/loginIpBlock.service';
import {
  acknowledgeSecurityAlert,
  exportAuditLogsToGoogleSheet,
  listLoginHistory,
  listOpenSecurityAlerts,
  type AuditLogGoogleSheetExportResult,
  type LoginHistory,
  type SecurityAlert,
} from '../../services/audit.service';
import { roleLabels } from '../../types/roles';
import { getSafeUserErrorMessage } from '../../utils/errorHandling';

const loginHistoryPageSize = 10;
type SecurityTab = 'history' | 'ip-blocks' | 'backup' | 'force-password' | 'mfa' | 'login-settings' | 'password-resets';

const securityAlertLabels: Record<SecurityAlert['alert_type'], { title: string; description: string }> = {
  repeated_ip_failures: {
    title: 'พบการล็อกอินล้มเหลวซ้ำจาก IP เดียว',
    description: 'มีการลองเข้าสู่ระบบล้มเหลวอย่างน้อย 5 ครั้งจาก IP เดียวภายใน 10 นาที',
  },
  repeated_account_failures: {
    title: 'พบบัญชีถูกลองรหัสผ่านซ้ำ',
    description: 'มีการลองเข้าสู่บัญชีเดียวกันล้มเหลวอย่างน้อย 5 ครั้งภายใน 10 นาที',
  },
  credential_stuffing: {
    title: 'พบการลองเข้าสู่หลายบัญชีจาก IP เดียว',
    description: 'IP เดียวพยายามเข้าสู่บัญชีอย่างน้อย 3 บัญชีภายใน 10 นาที',
  },
  success_after_failures: {
    title: 'เข้าสู่ระบบสำเร็จหลังล้มเหลวหลายครั้ง',
    description: 'บัญชีเข้าสู่ระบบสำเร็จหลังมีความพยายามล้มเหลวอย่างน้อย 5 ครั้งภายใน 30 นาที',
  },
  repeated_password_reset: {
    title: 'พบการขอ Reset Password ซ้ำผิดปกติ',
    description: 'มีการส่งคำขอ Reset Password ไปยังอีเมลเดียวกันซ้ำเกิน 3 ครั้งในรอบ 24 ชั่วโมง',
  },
};

function downloadAuditArchive(fileName: string, content: string) {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || 'audit-logs-archive.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function SecurityPage() {
  const [activeTab, setActiveTab] = useState<SecurityTab>('history');
  const [history, setHistory] = useState<LoginHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [acknowledgingAlertId, setAcknowledgingAlertId] = useState<string | null>(null);
  const [exportingLogs, setExportingLogs] = useState(false);
  const [exportResult, setExportResult] = useState<AuditLogGoogleSheetExportResult | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [alertBlockingIp, setAlertBlockingIp] = useState<string | null>(null);
  const [alertBlockReason, setAlertBlockReason] = useState('');
  const [alertBlocking, setAlertBlocking] = useState(false);
  const [alertActionMessage, setAlertActionMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadHistory = async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const data = await listLoginHistory(500);
        if (!active) return;
        setHistory(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(getSafeUserErrorMessage(err, 'ไม่สามารถโหลดประวัติการล็อกอินได้'));
      } finally {
        if (active && showLoading) setLoading(false);
      }
    };

    void loadHistory(true);
    const refreshTimer = window.setInterval(() => void loadHistory(), 60_000);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadAlerts = async (showLoading = false) => {
      if (showLoading) setAlertsLoading(true);
      try {
        const data = await listOpenSecurityAlerts(50);
        if (!active) return;
        setSecurityAlerts(Array.isArray(data) ? data : []);
        setAlertsError(null);
      } catch (err) {
        if (!active) return;
        setAlertsError(getSafeUserErrorMessage(err, 'ไม่สามารถโหลดการแจ้งเตือนความปลอดภัยได้'));
      } finally {
        if (active && showLoading) setAlertsLoading(false);
      }
    };

    void loadAlerts(true);
    const refreshTimer = window.setInterval(() => void loadAlerts(), 60_000);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const safeHistory = Array.isArray(history) ? history : [];
  const totalHistoryPages = Math.max(1, Math.ceil(safeHistory.length / loginHistoryPageSize));
  const currentHistoryPage = Math.min(historyPage, totalHistoryPages);
  const historyPageStart = (currentHistoryPage - 1) * loginHistoryPageSize;
  const visibleHistory = useMemo(
    () => safeHistory.slice(historyPageStart, historyPageStart + loginHistoryPageSize),
    [safeHistory, historyPageStart],
  );
  const historyPageStartItem = safeHistory.length === 0 ? 0 : historyPageStart + 1;
  const historyPageEndItem = Math.min(historyPageStart + visibleHistory.length, safeHistory.length);

  useEffect(() => {
    if (historyPage > totalHistoryPages) {
      setHistoryPage(totalHistoryPages);
    }
  }, [historyPage, totalHistoryPages]);

  const handleExportLogs = async () => {
    setExportingLogs(true);
    setExportError(null);
    setExportResult(null);

    try {
      const result = await exportAuditLogsToGoogleSheet();
      if (result.archive_download_content) {
        downloadAuditArchive(result.archive_download_file_name || 'audit-logs-archive.json', result.archive_download_content);
      }
      setExportResult(result);
    } catch (err) {
      setExportError(getSafeUserErrorMessage(err, 'ไม่สามารถส่ง Audit Logs ไป Google Sheet ได้'));
    } finally {
      setExportingLogs(false);
    }
  };

  const handleBlockIpFromAlert = async () => {
    if (!alertBlockingIp) return;
    setAlertBlocking(true);
    setAlertActionMessage(null);
    setAlertsError(null);
    try {
      await saveLoginIpRule({
        ipAddress: alertBlockingIp,
        ruleType: 'block',
        reason: alertBlockReason || 'บล็อก IP จาก Security Alert',
      });
      setAlertActionMessage(`เพิ่ม IP ${alertBlockingIp} เข้าสู่รายการบล็อกเรียบร้อยแล้ว`);
      setAlertBlockingIp(null);
    } catch (err) {
      setAlertsError(getSafeUserErrorMessage(err, 'ไม่สามารถบล็อก IP ได้'));
    } finally {
      setAlertBlocking(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    setAcknowledgingAlertId(alertId);
    setAlertsError(null);
    try {
      await acknowledgeSecurityAlert(alertId);
      setSecurityAlerts((current) => current.filter((alert) => alert.id !== alertId));
    } catch (err) {
      setAlertsError(getSafeUserErrorMessage(err, 'ไม่สามารถรับทราบการแจ้งเตือนได้'));
    } finally {
      setAcknowledgingAlertId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & Login History"
        description="ตรวจสอบประวัติการเข้าใช้งาน สถานะความปลอดภัย และหลักฐาน Backup / Restore ของระบบ"
      />

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        {[
          { value: 'history', label: 'Security & Login History', icon: LogIn },
          { value: 'ip-blocks', label: 'รายการ IP ที่บล็อก', icon: Ban },
          { value: 'backup', label: 'Backup / Restore', icon: RotateCcw },
          { value: 'force-password', label: 'Force Change Password', icon: KeyRound },
          { value: 'mfa', label: 'MFA Enforcement', icon: Smartphone },
          { value: 'login-settings', label: 'ตั้งค่าการลงชื่อเข้าใช้', icon: TimerReset },
          { value: 'password-resets', label: 'รายการขอ Reset Password', icon: MailWarning },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value as SecurityTab)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.value ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'history' ? (
      <div className="grid gap-6 lg:grid-cols-3">
        <div className={`rounded-xl border p-5 shadow-sm lg:col-span-3 ${
          securityAlerts.length > 0
            ? 'border-red-200 bg-red-50'
            : 'border-emerald-200 bg-emerald-50'
        }`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className={`rounded-lg p-2 ${securityAlerts.length > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className={`font-bold ${securityAlerts.length > 0 ? 'text-red-900' : 'text-emerald-900'}`}>
                การแจ้งเตือนพฤติกรรมการล็อกอินผิดปกติ
              </h3>
              <p className={`text-xs ${securityAlerts.length > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                ตรวจซ้ำอัตโนมัติทุก 60 วินาที · พบ {securityAlerts.length.toLocaleString('th-TH')} รายการที่ยังไม่รับทราบ
              </p>
            </div>
          </div>

          {alertsError ? (
            <div className="mt-4 rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-red-700">{alertsError}</div>
          ) : alertsLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" /> กำลังตรวจสอบเหตุการณ์ล่าสุด
            </div>
          ) : securityAlerts.length === 0 ? (
            <p className="mt-4 text-sm font-medium text-emerald-800">ไม่พบพฤติกรรมการล็อกอินที่เข้าเกณฑ์แจ้งเตือน</p>
          ) : (
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {securityAlerts.slice(0, 6).map((alert) => {
                const label = securityAlertLabels[alert.alert_type];
                return (
                  <div key={alert.id} className="rounded-lg border border-red-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-slate-900">{label.title}</h4>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${
                            alert.severity === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {alert.severity}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{label.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {alert.source_ip && alert.source_ip !== '127.0.0.1' && alert.source_ip !== 'localhost' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setAlertBlockingIp(alert.source_ip);
                              setAlertBlockReason(`บล็อก IP จากการแจ้งเตือน: ${label.title}`);
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                          >
                            <Ban className="h-3 w-3" />
                            บล็อก IP
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void handleAcknowledgeAlert(alert.id)}
                          disabled={acknowledgingAlertId === alert.id}
                          className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {acknowledgingAlertId === alert.id ? 'กำลังบันทึก' : 'รับทราบ'}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>จำนวน {alert.attempt_count.toLocaleString('th-TH')} ครั้ง</span>
                      {alert.target_email ? <span>บัญชี {alert.target_email}</span> : null}
                      {alert.source_ip ? <span>IP {alert.source_ip}</span> : null}
                      <span>
                        ล่าสุด {new Date(alert.last_detected_at).toLocaleString('th-TH', {
                          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-emerald-900">System Security</h3>
            </div>
            <ul className="space-y-3 text-sm text-emerald-800">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Supabase RLS is active on all core tables.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>RBAC permissions enforced at Router and Database level.</span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
                <CloudUpload className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Audit Logs to Google Sheet</h4>
                <p className="text-xs text-slate-500">ส่งออก log ที่ค้างอยู่ไปยัง Google Sheet โดยตรง</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportLogs}
              disabled={exportingLogs}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportingLogs ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
              {exportingLogs ? 'กำลังส่งไป Google Sheet' : 'ส่ง Audit Logs ไป Google Sheet'}
            </button>

            {exportResult ? (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                ส่งสำเร็จ {exportResult.total_logs ?? 0} รายการ
                {exportResult.batch_id ? <span className="block break-all">Batch: {exportResult.batch_id}</span> : null}
                <span className="block">ลบ log เก่าที่ส่งแล้ว: {exportResult.cleanup_deleted ?? 0} รายการ</span>
                {(exportResult.remaining_logs ?? 0) > 0 ? (
                  <span className="mt-1 block text-sky-700">ยังเหลือ log ที่ยังไม่ได้ส่งอีก {(exportResult.remaining_logs ?? 0).toLocaleString('th-TH')} รายการ สามารถกดส่งอีกครั้งเพื่อส่งชุดถัดไป</span>
                ) : null}
                {exportResult.archive_file_url ? (
                  <a
                    href={exportResult.archive_file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block font-semibold text-sky-700 underline"
                  >
                    เปิดไฟล์ Archive JSON ใน Google Drive
                  </a>
                ) : null}
                {!exportResult.archive_file_url && exportResult.archive_download_content ? (
                  <span className="mt-1 block text-sky-700">ดาวน์โหลดไฟล์ Archive JSON ลงเครื่องแล้ว</span>
                ) : null}
                {exportResult.export_status_update_error ? (
                  <span className="mt-1 block text-amber-700">ส่งเข้า Google Sheet แล้ว แต่ยังอัปเดตสถานะ log ไม่สำเร็จ: {exportResult.export_status_update_error}</span>
                ) : null}
              </div>
            ) : null}

            {exportError ? (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {exportError}
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h4 className="mb-2 font-bold text-slate-900">Login Statistics</h4>
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Total Success</span>
                <span className="font-bold text-emerald-600">{safeHistory.filter((h) => h.success).length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Failed Attempts</span>
                <span className="font-bold text-red-600">{safeHistory.filter((h) => !h.success).length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-6 py-4">
            <LogIn className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold text-slate-900">ประวัติการล็อกอินล่าสุด</h3>
            <span className="ml-auto text-xs text-slate-500">แสดงหน้าละ {loginHistoryPageSize} รายการ</span>
          </div>

          {error ? <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">{error}</div> : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">ลำดับ</th>
                  <th className="px-6 py-3">ผู้ใช้งาน</th>
                  <th className="px-6 py-3">สิทธิ์</th>
                  <th className="px-6 py-3">วันเวลา</th>
                  <th className="px-6 py-3">สถานะ</th>
                  <th className="px-6 py-3">IP / อุปกรณ์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-6 py-4"><div className="h-8 rounded bg-slate-50" /></td>
                    </tr>
                  ))
                ) : safeHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">ไม่มีข้อมูลการล็อกอิน</td>
                  </tr>
                ) : (
                  visibleHistory.map((log, index) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-500">{historyPageStart + index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{log.user_name}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {log.user_role ? (
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                            {roleLabels[log.user_role]}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">ไม่ทราบสิทธิ์</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(log.login_at).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {log.success ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                            <XCircle className="h-3 w-3" /> Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" /> {log.ip_address || 'Unknown'}
                          </span>
                          <span className="flex max-w-[150px] items-center gap-1 truncate" title={log.user_agent || ''}>
                            <Monitor className="h-3 w-3" /> {log.user_agent ? 'Browser/Device' : '-'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              แสดงรายการที่ <span className="font-semibold text-slate-900">{historyPageStartItem.toLocaleString('th-TH')}</span> -{' '}
              <span className="font-semibold text-slate-900">{historyPageEndItem.toLocaleString('th-TH')}</span> จาก{' '}
              <span className="font-semibold text-slate-900">{safeHistory.length.toLocaleString('th-TH')}</span> รายการ
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                disabled={currentHistoryPage <= 1}
                className="rounded-md border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ก่อนหน้า
              </button>
              <span className="rounded-md bg-slate-50 px-3 py-1.5 font-semibold text-slate-700">
                หน้า {currentHistoryPage} / {totalHistoryPages}
              </span>
              <button
                type="button"
                onClick={() => setHistoryPage((page) => Math.min(totalHistoryPages, page + 1))}
                disabled={currentHistoryPage >= totalHistoryPages}
                className="rounded-md border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ถัดไป
              </button>
            </div>
          </div>
        </div>
      </div>
      ) : activeTab === 'ip-blocks' ? (
        <LoginIpBlockPanel />
      ) : activeTab === 'backup' ? (
        <BackupRestorePanel />
      ) : activeTab === 'force-password' ? (
        <ForceChangePasswordPanel />
      ) : activeTab === 'mfa' ? (
        <MfaEnforcementPanel />
      ) : activeTab === 'password-resets' ? (
        <PasswordResetLogsPanel />
      ) : (
        <SiteManagerSecuritySettings />
      )}

      {/* Block IP Modal from Alert Card */}
      {alertBlockingIp ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-rose-100 p-2.5 text-rose-700">
                <Ban className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">ยืนยันการบล็อก IP Address</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{alertBlockingIp}</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-600">
              เมื่อทำการบล็อก IP นี้ ระบบจะปฏิเสธการเข้าสู่ระบบและการขอ Reset Password ทั้งหมดจากเครื่องนี้ทันที
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">ระบุเหตุผลการบล็อก</label>
              <input
                type="text"
                value={alertBlockReason}
                onChange={(e) => setAlertBlockReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={alertBlocking}
                onClick={() => setAlertBlockingIp(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={alertBlocking}
                onClick={() => void handleBlockIpFromAlert()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {alertBlocking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                {alertBlocking ? 'กำลังบันทึก...' : 'ยืนยันบล็อก IP'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
