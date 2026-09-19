import React from 'react';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import type { UserRole } from '../../../types/roles';
import { roleLabels } from '../../../types/roles';
import type { CreateFormState } from '../types/userManagement.types';
import { educationOptions, employmentTypeOptions, genderLabels } from '../types/userManagement.types';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  form: CreateFormState;
  onFieldChange: (field: keyof CreateFormState, value: string) => void;
  error: string | null;
  isLoading: boolean;
  currentRole?: UserRole;
  availableCreateRoleOptions: UserRole[];
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  form,
  onFieldChange,
  error,
  isLoading,
  currentRole,
  availableCreateRoleOptions,
}) => {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="เพิ่มผู้ใช้ใหม่"
      message={(
        <div className="mt-4 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
          {error ? (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</div>
          ) : null}
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="รหัสพนักงาน"
            value={form.employee_code}
            onChange={(e) => onFieldChange('employee_code', e.target.value)}
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="ชื่อ-นามสกุล"
            autoComplete="name"
            value={form.fullName}
            onChange={(e) => onFieldChange('fullName', e.target.value)}
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
            placeholder="Email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => onFieldChange('email', e.target.value)}
          />
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
            value={form.role}
            onChange={(e) => onFieldChange('role', e.target.value as UserRole)}
            disabled={currentRole === 'hr'}
          >
            {availableCreateRoleOptions.map((role) => (
              <option key={role} value={role}>{roleLabels[role]}</option>
            ))}
          </select>
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="ตำแหน่ง"
            value={form.position}
            onChange={(e) => onFieldChange('position', e.target.value)}
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="หน่วยงาน"
            value={form.department}
            onChange={(e) => onFieldChange('department', e.target.value)}
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="กลุ่มงาน"
            value={form.work_group}
            onChange={(e) => onFieldChange('work_group', e.target.value)}
          />
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={form.gender}
            onChange={(e) => onFieldChange('gender', e.target.value)}
          >
            <option value="">เพศ</option>
            <option value="male">{genderLabels.male}</option>
            <option value="female">{genderLabels.female}</option>
          </select>
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={form.education}
            onChange={(e) => onFieldChange('education', e.target.value)}
          >
            {educationOptions.map((option) => (
              <option key={option || 'empty'} value={option}>{option || 'การศึกษา'}</option>
            ))}
          </select>
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="วันเกิด (วว/ดด/ปปปป พ.ศ.)"
            value={form.birth_date_th}
            onChange={(e) => onFieldChange('birth_date_th', e.target.value)}
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="วันที่เริ่มงาน (วว/ดด/ปปปป พ.ศ.)"
            value={form.start_work_date_th}
            onChange={(e) => onFieldChange('start_work_date_th', e.target.value)}
          />
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
            value={form.employment_type}
            onChange={(e) => onFieldChange('employment_type', e.target.value)}
          >
            {employmentTypeOptions.map((option) => (
              <option key={option || 'empty'} value={option}>{option || 'รูปแบบการจ้าง'}</option>
            ))}
          </select>
        </div>
      )}
      confirmLabel="สร้างผู้ใช้"
      cancelLabel="ยกเลิก"
      isLoading={isLoading}
      variant="info"
    />
  );
};

