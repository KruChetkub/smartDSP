import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MoreVertical,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import type { UserManagementProfile } from '../../../services/admin.service';
import type { Profile } from '../../../types/database.types';
import type { ProfileStatus, UserRole } from '../../../types/roles';
import { roleLabels } from '../../../types/roles';
import type { ManageRoleValue } from '../types/userManagement.types';

interface UserTableProps {
  users: UserManagementProfile[];
  loading: boolean;
  updating: string | null;
  currentUserId?: string;
  currentRole?: UserRole;
  canManageRoleAndStatus: boolean;
  canResetMfa: boolean;
  financeOfficerUserIds: Set<string>;
  kpiReporterUserIds: Set<string>;
  availableManageRoleOptions: UserRole[];
  onRoleChange: (userId: string, newRole: ManageRoleValue) => void;
  onStatusChange: (userId: string, newStatus: ProfileStatus) => void;
  onKpiReporterToggle: (user: UserManagementProfile, enabled: boolean) => void;
  onOpenResetMfa: (user: UserManagementProfile) => void;
  onOpenEdit: (user: UserManagementProfile) => void;
  onDeleteClick: (userId: string, fullName: string) => void;
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  loading,
  updating,
  currentUserId,
  currentRole,
  canManageRoleAndStatus,
  canResetMfa,
  financeOfficerUserIds,
  kpiReporterUserIds,
  availableManageRoleOptions,
  onRoleChange,
  onStatusChange,
  onKpiReporterToggle,
  onOpenResetMfa,
  onOpenEdit,
  onDeleteClick,
}) => {
  const isIncomplete = (u: Profile) => !u.position || !u.department || !u.gender || !u.birth_date || !u.employment_type;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-4">ผู้ใช้งาน / ข้อมูลโปรไฟล์</th>
              <th className="px-6 py-4">Role / สิทธิ์</th>
              <th className="px-6 py-4">สถานะบัญชี</th>
              <th className="px-6 py-4">ความสมบูรณ์</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-6 py-4">
                    <div className="h-10 bg-slate-100 rounded"></div>
                  </td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                  ไม่พบข้อมูลผู้ใช้งานที่ต้องการ
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.user_id}
                  className={`hover:bg-slate-50/50 transition ${updating === u.user_id ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-bold">
                        {u.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{u.full_name}</div>
                        <div className="text-xs text-slate-500">
                          {u.position || 'ยังไม่ระบุตำแหน่ง'} · {u.generation || '-'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium bg-white focus:border-brand-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                      value={financeOfficerUserIds.has(u.user_id) ? 'finance_officer' : u.role}
                      onChange={(e) => onRoleChange(u.user_id, e.target.value as ManageRoleValue)}
                      disabled={!canManageRoleAndStatus}
                    >
                      {availableManageRoleOptions.map((role) => (
                        <option key={role} value={role}>{roleLabels[role]}</option>
                      ))}
                      {currentRole === 'super_admin' ? (
                        <option value="finance_officer">เจ้าหน้าที่การเงิน</option>
                      ) : null}
                    </select>
                    {currentRole === 'super_admin' ? (
                      <label
                        className={`mt-2 flex items-center gap-2 text-xs font-medium ${u.role === 'personnel' ? 'text-slate-700' : 'text-slate-400'}`}
                      >
                        <input
                          type="checkbox"
                          checked={kpiReporterUserIds.has(u.user_id)}
                          onChange={(event) => void onKpiReporterToggle(u, event.target.checked)}
                          disabled={u.role !== 'personnel' || updating === u.user_id}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600"
                        />
                        ผู้บันทึกรายงานตัวชี้วัด
                      </label>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        {u.status === 'active' ? (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            <UserCheck className="h-3 w-3" /> Active
                          </span>
                        ) : u.status === 'pending' ? (
                          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            <UserX className="h-3 w-3" /> Inactive
                          </span>
                        )}
                        {canManageRoleAndStatus && (
                          <button
                            onClick={() => onStatusChange(u.user_id, u.status === 'active' ? 'inactive' : 'active')}
                            className="text-[10px] text-brand-600 hover:underline font-bold"
                          >
                            {u.status === 'pending' ? 'Approve' : u.status === 'active' ? 'Disable' : 'Enable'}
                          </button>
                        )}
                      </div>
                      {u.mfa_enabled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700" title="เปิดใช้งาน 2-Step Verification แล้ว">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>2FA เปิดใช้งาน</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400" title="ยังไม่ได้เปิดใช้งาน 2-Step Verification">
                          <ShieldAlert className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                          <span>2FA ปิดอยู่</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {isIncomplete(u) ? (
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">โปรไฟล์ไม่สมบูรณ์</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs font-medium">ข้อมูลครบถ้วน</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-2">
                      {canResetMfa && u.mfa_enabled && !(currentRole === 'admin' && u.role === 'super_admin') && (
                        <button
                          onClick={() => onOpenResetMfa(u)}
                          className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 hover:border-amber-300 transition"
                          title="รีเซ็ตการยืนยันตัวตน 2 ขั้นตอน (Google Authenticator)"
                        >
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          รีเซ็ต 2FA
                        </button>
                      )}
                      <button
                        onClick={() => onOpenEdit(u)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        แก้ไขข้อมูล
                      </button>
                      {currentRole === 'super_admin' && u.user_id !== currentUserId && (
                        <button
                          onClick={() => onDeleteClick(u.user_id, u.full_name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition"
                          title="ลบผู้ใช้งาน"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <button className="p-1.5 text-slate-400 hover:text-slate-600">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

