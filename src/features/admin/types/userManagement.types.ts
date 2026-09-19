import type { UserRole } from '../../../types/roles';
import type { UpdateUserDetailsPayload } from '../../../services/admin.service';

export type CreateFormState = {
  employee_code: string;
  fullName: string;
  email: string;
  role: UserRole;
  position: string;
  department: string;
  work_group: string;
  gender: '' | 'male' | 'female';
  education: EditFormState['education'];
  birth_date_th: string;
  start_work_date_th: string;
  employment_type: EditFormState['employment_type'];
};

export type EditFormState = {
  employee_code: string;
  email: string;
  full_name: string;
  position: string;
  department: string;
  work_group: string;
  gender: '' | 'male' | 'female';
  education: '' | 'ต่ำกว่าปริญญาตรี' | 'ปริญญาตรี' | 'ปริญญาโท' | 'ปริญญาเอก';
  birth_date_th: string;
  start_work_date_th: string;
  employment_type: '' | 'ข้าราชการ' | 'พนักงานราชการ' | 'พนักงานกระทรวงสาธารณสุข' | 'ลูกจ้างชั่วคราว' | 'จ้างเหมาบริการฯ (พขร.)';
};

export type ManageRoleValue = UserRole | 'finance_officer';

export const genderLabels = {
  male: 'ชาย',
  female: 'หญิง',
};

export const educationOptions: EditFormState['education'][] = ['', 'ต่ำกว่าปริญญาตรี', 'ปริญญาตรี', 'ปริญญาโท', 'ปริญญาเอก'];
export const employmentTypeOptions: EditFormState['employment_type'][] = ['', 'ข้าราชการ', 'พนักงานราชการ', 'พนักงานกระทรวงสาธารณสุข', 'ลูกจ้างชั่วคราว', 'จ้างเหมาบริการฯ (พขร.)'];
export const createRoleOptions: UserRole[] = ['personnel', 'hr', 'executive', 'admin'];
export const allRoleOptions: UserRole[] = ['super_admin', ...createRoleOptions];
export const allowedEducationOptions = educationOptions.filter((option): option is Exclude<EditFormState['education'], ''> => option !== '');
export const allowedEmploymentTypeOptions = employmentTypeOptions.filter((option): option is Exclude<EditFormState['employment_type'], ''> => option !== '');

export const userTemplateHeaders = [
  'รหัสพนักงาน',
  'ชื่อ-นามสกุล',
  'อีเมล',
  'สิทธิ์',
  'ตำแหน่ง',
  'หน่วยงาน',
  'กลุ่มงาน',
  'เพศ',
  'การศึกษา',
  'วันเกิด (วว/ดด/ปปปป พ.ศ.)',
  'วันที่เริ่มงาน (วว/ดด/ปปปป พ.ศ.)',
  'รูปแบบการจ้าง',
];

export type UserImportRow = {
  employee_code: string;
  full_name: string;
  email: string;
  role: string;
  position: string;
  department: string;
  work_group: string;
  gender: string;
  education: string;
  birth_date_th: string;
  start_work_date_th: string;
  employment_type: string;
};

export type NormalizedImportUser = UpdateUserDetailsPayload & {
  full_name: string;
  email: string;
  role: UserRole;
};

export type ImportModalState = {
  isOpen: boolean;
  file: File | null;
  error: string | null;
};

export type ImportResultModalState = {
  isOpen: boolean;
  created: number;
  updated: number;
  skipped: number;
  failures: string[];
};

export const importHeaderMap: Record<string, keyof UserImportRow> = {
  'รหัสพนักงาน': 'employee_code',
  employee_code: 'employee_code',
  'ชื่อ-นามสกุล': 'full_name',
  full_name: 'full_name',
  'อีเมล': 'email',
  email: 'email',
  'สิทธิ์': 'role',
  role: 'role',
  'ตำแหน่ง': 'position',
  position: 'position',
  'หน่วยงาน': 'department',
  department: 'department',
  'กลุ่มงาน': 'work_group',
  work_group: 'work_group',
  'เพศ': 'gender',
  gender: 'gender',
  'การศึกษา': 'education',
  education: 'education',
  'วันเกิด (วว/ดด/ปปปป พ.ศ.)': 'birth_date_th',
  birth_date_th: 'birth_date_th',
  'วันที่เริ่มงาน (วว/ดด/ปปปป พ.ศ.)': 'start_work_date_th',
  start_work_date_th: 'start_work_date_th',
  'รูปแบบการจ้าง': 'employment_type',
  employment_type: 'employment_type',
};

