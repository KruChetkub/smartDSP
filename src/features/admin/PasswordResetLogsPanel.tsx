import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  KeyRound,
  Loader2,
  Mail,
  MailWarning,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import {
  listPasswordResetLogs,
  getPasswordResetDailyStats,
  type PasswordResetLog,
} from '../../services/passwordResetAudit.service';
import { saveLoginIpRule } from '../../services/loginIpBlock.service';
import { getSafeUserErrorMessage } from '../../utils/errorHandling';

function formatDateTime(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function PasswordResetLogsPanel() {
  const [logs, setLogs] = useState<PasswordResetLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'rate_limited'>('all');
  const [selectedLog, setSelectedLog] = useState<PasswordResetLog | null>(null);
  const [blockingIp, setBlockingIp] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('พยายามขอ Reset Password ซ้ำเกินจำนวนที่กำหนด');
  const [blocking, setBlocking] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadLogs = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await listPasswordResetLogs(200);
      setLogs(data);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(getSafeUserErrorMessage(err, 'ไม่สามารถโหลดประวัติการขอ Reset Password ได้'));
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs(true);
    const interval = setInterval(() => void loadLogs(false), 30_000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => getPasswordResetDailyStats(), [logs]);

  const filteredLogs = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesSearch =
        !keyword ||
        log.email.toLowerCase().includes(keyword) ||
        (log.ip_address && log.ip_address.toLowerCase().includes(keyword));
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'success' && log.status === 'success') ||
        (statusFilter === 'rate_limited' && (log.status === 'rate_limited' || log.status === 'blocked'));
      return matchesSearch && matchesStatus;
    });
  }, [logs, search, statusFilter]);

  const handleBlockIp = async () => {
    if (!blockingIp) return;
    setBlocking(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await saveLoginIpRule({
        ipAddress: blockingIp,
        ruleType: 'block',
        reason: blockReason || 'พยายามขอ Reset Password ซ้ำผิดปกติ',
      });
      setSuccessMessage(`เพิ่ม IP ${blockingIp} เข้าสู่รายการบล็อกเรียบร้อยแล้ว`);
      setBlockingIp(null);
    } catch (err) {
      setErrorMessage(getSafeUserErrorMessage(err, 'ไม่สามารถบล็อก IP ได้'));
    } finally {
      setBlocking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">คำขอทั้งหมดใน 24 ชม.</p>
            <div className="rounded-lg bg-sky-100 p-2 text-sky-700">
              <Mail className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 tabular-nums">
            {stats.totalRequestsToday.toLocaleString('th-TH')}
          </p>
          <p className="mt-1 text-xs text-slate-500">จาก {stats.uniqueEmails.toLocaleString('th-TH')} อีเมล</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">ผ่านเกณฑ์ปกติ</p>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 tabular-nums">
            {(stats.totalRequestsToday - stats.rateLimitedToday).toLocaleString('th-TH')}
          </p>
          <p className="mt-1 text-xs text-emerald-600 font-medium">ส่งลิงก์สำเร็จตามโควต้า</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">ขอซ้ำเกินกำหนด / ถูกจำกัด</p>
            <div className="rounded-lg bg-rose-100 p-2 text-rose-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-rose-600 tabular-nums">
            {stats.rateLimitedToday.toLocaleString('th-TH')}
          </p>
          <p className="mt-1 text-xs text-rose-600 font-medium">เข้าข่ายสแปมหรือยิงซ้ำ</p>
        </div>
      </div>

      {/* Messages */}
      {successMessage ? (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {/* Filters and Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา Email หรือ IP..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium outline-none focus:border-brand-500"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="success">เฉพาะส่งสำเร็จ</option>
            <option value="rate_limited">เฉพาะขอซ้ำ / ถูกจำกัด</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => void loadLogs(true)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรช
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center p-12 text-slate-500 gap-2 text-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            กำลังโหลดข้อมูลประวัติ...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            <Mail className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            ไม่พบประวัติการขอ Reset Password
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">วัน-เวลาที่ขอ</th>
                  <th className="px-4 py-3">อีเมลเป้าหมาย</th>
                  <th className="px-4 py-3">จำนวนครั้งใน 24 ชม.</th>
                  <th className="px-4 py-3">สถานะความปลอดภัย</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3 text-right">การจัดการ (Super Admin)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const isRateLimited = log.status === 'rate_limited' || log.status === 'blocked';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                        {formatDateTime(log.requested_at)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{log.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            log.attempt_count_today >= 3
                              ? 'bg-rose-100 text-rose-800'
                              : log.attempt_count_today === 2
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {log.attempt_count_today} / 3 ครั้ง
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isRateLimited ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            เกินโควต้า / ถูกจำกัด
                          </span>
                        ) : log.status === 'cooldown' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                            <Clock className="h-3.5 w-3.5" />
                            ติดคูลดาวน์ 60s
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            ปกติ (ส่งสำเร็จ)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-slate-600">
                        {log.ip_address || 'Local/Browser'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                          ดูรายละเอียด
                        </button>

                        {log.ip_address && log.ip_address !== '127.0.0.1' && log.ip_address !== 'localhost' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setBlockingIp(log.ip_address);
                              setBlockReason(`พยายามขอ Reset Password ไปที่ ${log.email} เกินกำหนด`);
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            บล็อก IP
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-sky-100 p-2 text-sky-700">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">รายละเอียดคำขอ Reset Password</h3>
                  <p className="text-xs text-slate-500">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-600">อีเมลเป้าหมาย:</span>
                <span className="font-bold text-slate-900">{selectedLog.email}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-600">เวลาที่บันทึก:</span>
                <span className="text-slate-900">{formatDateTime(selectedLog.requested_at)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-600">จำนวนครั้งในรอบ 24 ชั่วโมง:</span>
                <span className="font-bold text-slate-900">{selectedLog.attempt_count_today} ครั้ง</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-600">สถานะ:</span>
                <span className="font-bold text-slate-900">{selectedLog.status}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-600">IP Address:</span>
                <span className="font-mono text-slate-900">{selectedLog.ip_address || 'ไม่มีข้อมูล'}</span>
              </div>
              {selectedLog.reason ? (
                <div className="border-b border-slate-200 pb-2">
                  <span className="font-semibold text-slate-600 block mb-1">สาเหตุ / ข้อความระบบ:</span>
                  <span className="text-red-700 bg-red-50 p-2 rounded block">{selectedLog.reason}</span>
                </div>
              ) : null}
              {selectedLog.user_agent ? (
                <div>
                  <span className="font-semibold text-slate-600 block mb-1">User Agent / อุปกรณ์:</span>
                  <span className="font-mono text-[11px] text-slate-500 break-all">{selectedLog.user_agent}</span>
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              {selectedLog.ip_address && selectedLog.ip_address !== '127.0.0.1' && selectedLog.ip_address !== 'localhost' ? (
                <button
                  type="button"
                  onClick={() => {
                    setBlockingIp(selectedLog.ip_address);
                    setBlockReason(`พยายามขอ Reset Password ไปที่ ${selectedLog.email} เกินกำหนด`);
                    setSelectedLog(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition"
                >
                  <Ban className="h-4 w-4" />
                  บล็อก IP นี้
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Block IP Modal */}
      {blockingIp ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-rose-100 p-2.5 text-rose-700">
                <Ban className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">ยืนยันการบล็อก IP Address</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{blockingIp}</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-600">
              เมื่อทำการบล็อก IP นี้ ระบบจะปฏิเสธการเข้าสู่ระบบและการขอ Reset Password ทั้งหมดจากเครื่องนี้ทันที
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">ระบุเหตุผลการบล็อก</label>
              <input
                type="text"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={blocking}
                onClick={() => setBlockingIp(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={blocking}
                onClick={() => void handleBlockIp()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {blocking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                {blocking ? 'กำลังบันทึก...' : 'ยืนยันบล็อก IP'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

