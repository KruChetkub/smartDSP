import React from 'react';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import type { UserRole } from '../../../types/roles';
import type { UserManagementProfile } from '../../../services/admin.service';
import type { EditFormState } from '../types/userManagement.types';
import { educationOptions, employmentTypeOptions, genderLabels } from '../types/userManagement.types';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  user: UserManagementProfile | null;
  form: EditFormState;
  onFieldChange: (field: keyof EditFormState, value: string) => void;
  error: string | null;
  isLoading: boolean;
  currentRole?: UserRole;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  user,
  form,
  onFieldChange,
  error,
  isLoading,
  currentRole,
}) => {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`แก้ไขข้อมูลผู้ใช้: ${user?.full_name || ''}`}
      message={(
        <div className="mt-4 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
          {error ? (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 sm:col-span-2">{error}</div>
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
            value={form.full_name}
            onChange={(e) => onFieldChange('full_name', e.target.value)}
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-500 sm:col-span-2"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => onFieldChange('email', e.target.value)}
            disabled={currentRole !== 'super_admin'}
          />
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
            value={form.education}
            onChange={(e) => onFieldChange('education', e.target.value)}
          >
            {educationOptions.map((option) => (
              <option key={option || 'empty'} value={option}>
                {option || 'การศึกษา'}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={form.gender}
            onChange={(e) => onFieldChange('gender', e.target.value)}
          >
            <option value="">เพศ</option>
            <option value="male">{genderLabels.male}</option>
            <option value="female">{genderLabels.female}</option>
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
              <option key={option || 'empty'} value={option}>
                {option || 'รูปแบบการจ้าง'}
              </option>
            ))}
          </select>
        </div>
      )}
      confirmLabel="บันทึก"
      cancelLabel="ยกเลิก"
      isLoading={isLoading}
      variant="info"
    />
  );
};

