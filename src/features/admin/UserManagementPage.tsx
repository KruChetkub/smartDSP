import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  MoreVertical,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  UserX,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuditPageAccess } from '../../hooks/useAuditPageAccess';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import {
  adminResetUserMfa,
  createManagedUser,
  listAllUsers,
  listUserPermissionAssignments,
  setUserPermission,
  updateUserDetails,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  updateUserEmail,
} from '../../services/admin.service';
import { recordAuditLog } from '../../services/audit.service';
import type { UpdateUserDetailsPayload, UserManagementProfile } from '../../services/admin.service';
import type { Profile } from '../../types/database.types';
import { useAuthStore } from '../../stores/auth.store';
import type { UserRole, ProfileStatus } from '../../types/roles';
import { roleLabels } from '../../types/roles';
import { getSafeUserErrorMessage } from '../../utils/errorHandling';
import { BUDGET_ITEMS_MANAGE_PERMISSION, KPIDSP_INDICATORS_MANAGE_PERMISSION } from '../../constants/permissions';

type CreateFormState = {
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

type EditFormState = {
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

type ManageRoleValue = UserRole | 'finance_officer';

const genderLabels = {
  male: 'ชาย',
  female: 'หญิง',
};

const educationOptions: EditFormState['education'][] = ['', 'ต่ำกว่าปริญญาตรี', 'ปริญญาตรี', 'ปริญญาโท', 'ปริญญาเอก'];
const employmentTypeOptions: EditFormState['employment_type'][] = ['', 'ข้าราชการ', 'พนักงานราชการ', 'พนักงานกระทรวงสาธารณสุข', 'ลูกจ้างชั่วคราว', 'จ้างเหมาบริการฯ (พขร.)'];
const createRoleOptions: UserRole[] = ['personnel', 'hr', 'executive', 'admin'];
const allRoleOptions: UserRole[] = ['super_admin', ...createRoleOptions];
const allowedEducationOptions = educationOptions.filter((option): option is Exclude<EditFormState['education'], ''> => option !== '');
const allowedEmploymentTypeOptions = employmentTypeOptions.filter((option): option is Exclude<EditFormState['employment_type'], ''> => option !== '');

const userTemplateHeaders = [
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

type UserImportRow = {
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

type NormalizedImportUser = UpdateUserDetailsPayload & {
  full_name: string;
  email: string;
  role: UserRole;
};

type ImportModalState = {
  isOpen: boolean;
  file: File | null;
  error: string | null;
};

type ImportResultModalState = {
  isOpen: boolean;
  created: number;
  updated: number;
  skipped: number;
  failures: string[];
};

const importHeaderMap: Record<string, keyof UserImportRow> = {
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

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function isBlank(value: unknown) {
  return value === null || value === undefined || String(value).trim() === '';
}

function valueOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function excelSerialDateToISO(serial: number) {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const date = new Date(utcValue * 1000);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatExcelCellValue(value: unknown, cell?: { w?: string; t?: string }) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const day = value.getUTCDate();
    const month = value.getUTCMonth() + 1;
    const year = value.getUTCFullYear() + 543;
    return `${day}/${month}/${year}`;
  }

  if (typeof value === 'number') {
    return cell?.t === 'n' && value > 20000 ? excelSerialDateToISO(value) : String(value);
  }

  return String(cell?.w ?? value ?? '').trim();
}

function normalizeRole(value: string): UserRole {
  const trimmed = value.trim();
  if (!trimmed) return 'personnel';

  const normalized = trimmed.toLowerCase();
  const roleByKey = createRoleOptions.find((role) => role.toLowerCase() === normalized);
  if (roleByKey) return roleByKey;

  const roleByLabel = createRoleOptions.find((role) => roleLabels[role] === trimmed);
  return roleByLabel ?? 'personnel';
}

function normalizeGender(value: string, rowNumber: number): UpdateUserDetailsPayload['gender'] {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed === 'male' || trimmed === 'ชาย') return 'male';
  if (trimmed === 'female' || trimmed === 'หญิง') return 'female';
  throw new Error(`แถว ${rowNumber}: เพศต้องเป็น ชาย หรือ หญิง`);
}

function normalizeOption<T extends string>(value: string, options: readonly T[], label: string, rowNumber: number): T | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const matched = options.find((option) => option === trimmed);
  if (!matched) throw new Error(`แถว ${rowNumber}: ${label}ไม่ถูกต้อง`);
  return matched;
}

function parseDelimitedText(text: string) {
  const delimiter = text.includes('\t') ? '\t' : ',';
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(current.trim());
      current = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(current.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

function rowsToImportRows(rows: string[][]): UserImportRow[] {
  const [headerRow, ...bodyRows] = rows;
  if (!headerRow) return [];

  const keys = headerRow.map((header) => importHeaderMap[header.trim()] ?? null);

  return bodyRows.map((bodyRow) => {
    const row: UserImportRow = {
      employee_code: '',
      full_name: '',
      email: '',
      role: '',
      position: '',
      department: '',
      work_group: '',
      gender: '',
      education: '',
      birth_date_th: '',
      start_work_date_th: '',
      employment_type: '',
    };

    keys.forEach((key, index) => {
      if (key) row[key] = bodyRow[index]?.trim() ?? '';
    });

    return row;
  }).filter((row) => Object.values(row).some((value) => value.trim().length > 0));
}

async function readImportRows(file: File) {
  const lowerFileName = file.name.toLowerCase();

  if (lowerFileName.endsWith('.xlsx') || lowerFileName.endsWith('.xls')) {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];

    const sheet = workbook.Sheets[firstSheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1');
    const rows: string[][] = [];

    for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
      const row: string[] = [];

      for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
        const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        const cell = sheet[address] as { v?: unknown; w?: string; t?: string } | undefined;
        row.push(cell ? formatExcelCellValue(cell.v, cell) : '');
      }

      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
    }

    return rowsToImportRows(rows);
  }

  const text = (await file.text()).replace(/^\uFEFF/, '');
  const rows = parseDelimitedText(text);
  return rowsToImportRows(rows);
}

function parseThaiDateToISO(value: string, fieldLabel = 'วันเกิด') {
  if (!value) return null;

  const cleaned = value.trim().replace(/\s+/g, '').replace(/\//g, '-');

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  const parts = cleaned.split('-');

  if (parts.length !== 3) {
    throw new Error(`${fieldLabel}ต้องเป็นรูปแบบ วว/ดด/ปปปป (พ.ศ.)`);
  }

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  let year = Number(parts[2]);

  if (parts[2].length === 2 && year >= 0 && year <= 99) {
    year += year < 80 ? 2500 : 2400;
  }

  if (!day || !month || !year || day < 1 || day > 31 || month < 1 || month > 12) {
    throw new Error(`${fieldLabel}ไม่ถูกต้อง`);
  }

  const christianYear = year >= 2400 ? year - 543 : year;
  if (christianYear < 1900 || christianYear > 2100) {
    throw new Error(`ปีของ${fieldLabel}ไม่ถูกต้อง`);
  }

  return `${String(christianYear).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatISOToThaiDate(isoDate: string | null) {
  if (!isoDate) return '';

  const parts = isoDate.split('-');
  if (parts.length !== 3) return '';

  const year = Number(parts[0]) + 543;
  return `${parts[2]}/${parts[1]}/${String(year)}`;
}

function normalizeImportUser(row: UserImportRow, rowNumber: number, forcedRole?: UserRole): NormalizedImportUser {
  const fullName = row.full_name.trim().replace(/\s+/g, ' ');
  if (!fullName) throw new Error(`แถว ${rowNumber}: กรุณากรอกชื่อ-นามสกุล`);

  return {
    employee_code: valueOrNull(row.employee_code),
    full_name: fullName,
    email: row.email.trim(),
    role: forcedRole ?? normalizeRole(row.role),
    position: valueOrNull(row.position),
    department: valueOrNull(row.department),
    work_group: valueOrNull(row.work_group),
    gender: normalizeGender(row.gender, rowNumber),
    education: normalizeOption(row.education, allowedEducationOptions, 'การศึกษา', rowNumber),
    birth_date: parseThaiDateToISO(row.birth_date_th, 'วันเกิด'),
    start_work_date: parseThaiDateToISO(row.start_work_date_th, 'วันที่เริ่มงาน'),
    employment_type: normalizeOption(row.employment_type, allowedEmploymentTypeOptions, 'รูปแบบการจ้าง', rowNumber),
  };
}

function hasEmptyFieldToFill(user: Profile, imported: NormalizedImportUser) {
  return (
    (isBlank(user.employee_code) && !isBlank(imported.employee_code)) ||
    (isBlank(user.position) && !isBlank(imported.position)) ||
    (isBlank(user.department) && !isBlank(imported.department)) ||
    (isBlank(user.work_group) && !isBlank(imported.work_group)) ||
    (isBlank(user.gender) && !isBlank(imported.gender)) ||
    (isBlank(user.education) && !isBlank(imported.education)) ||
    (isBlank(user.birth_date) && !isBlank(imported.birth_date)) ||
    (isBlank(user.start_work_date) && !isBlank(imported.start_work_date)) ||
    (isBlank(user.employment_type) && !isBlank(imported.employment_type))
  );
}

function buildMergedDetailsPayload(user: Profile, imported: NormalizedImportUser): UpdateUserDetailsPayload {
  return {
    employee_code: isBlank(user.employee_code) ? imported.employee_code ?? null : user.employee_code,
    full_name: user.full_name || imported.full_name,
    position: isBlank(user.position) ? imported.position ?? null : user.position,
    department: isBlank(user.department) ? imported.department ?? null : user.department,
    work_group: isBlank(user.work_group) ? imported.work_group ?? null : user.work_group,
    gender: isBlank(user.gender) ? imported.gender ?? null : user.gender,
    education: isBlank(user.education) ? imported.education ?? null : user.education,
    birth_date: isBlank(user.birth_date) ? imported.birth_date ?? null : user.birth_date,
    start_work_date: isBlank(user.start_work_date) ? imported.start_work_date ?? null : user.start_work_date,
    employment_type: isBlank(user.employment_type) ? imported.employment_type ?? null : user.employment_type,
  };
}

function buildImportedDetailsPayload(imported: NormalizedImportUser): UpdateUserDetailsPayload {
  return {
    employee_code: imported.employee_code ?? null,
    full_name: imported.full_name,
    position: imported.position ?? null,
    department: imported.department ?? null,
    work_group: imported.work_group ?? null,
    gender: imported.gender ?? null,
    education: imported.education ?? null,
    birth_date: imported.birth_date ?? null,
    start_work_date: imported.start_work_date ?? null,
    employment_type: imported.employment_type ?? null,
  };
}

function buildCreateDetailsPayload(form: CreateFormState, fullName: string): UpdateUserDetailsPayload {
  return {
    employee_code: form.employee_code || null,
    full_name: fullName,
    position: form.position || null,
    department: form.department || null,
    work_group: form.work_group || null,
    gender: form.gender || null,
    education: form.education || null,
    birth_date: parseThaiDateToISO(form.birth_date_th, 'วันเกิด'),
    start_work_date: parseThaiDateToISO(form.start_work_date_th, 'วันที่เริ่มงาน'),
    employment_type: form.employment_type || null,
  };
}

function getEmptyCreateForm(role: UserRole): CreateFormState {
  return {
    employee_code: '',
    fullName: '',
    email: '',
    role,
    position: '',
    department: '',
    work_group: '',
    gender: '',
    education: '',
    birth_date_th: '',
    start_work_date_th: '',
    employment_type: '',
  };
}

function mapUserToForm(user: UserManagementProfile): EditFormState {
  return {
    employee_code: user.employee_code || '',
    email: user.email || '',
    full_name: user.full_name || '',
    position: user.position || '',
    department: user.department || '',
    work_group: user.work_group || '',
    gender: user.gender || '',
    education: user.education || '',
    birth_date_th: formatISOToThaiDate(user.birth_date),
    start_work_date_th: formatISOToThaiDate(user.start_work_date),
    employment_type: user.employment_type || '',
  };
}

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error) {
    return err.message;
  }

  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
}

function getCreateUserErrorMessage(err: unknown) {
  const message = getErrorMessage(err, 'ไม่สามารถสร้างผู้ใช้งานได้');

  if (message === 'User already registered') {
    return 'มี email นี้อยู่ในระบบแล้ว';
  }

  return message;
}

export function UserManagementPage() {
  useAuditPageAccess({ module: 'user_management', action: 'user_management_access', route: '/admin/users' });
  const [users, setUsers] = useState<UserManagementProfile[]>([]);
  const [financeOfficerUserIds, setFinanceOfficerUserIds] = useState<Set<string>>(new Set());
  const [kpiReporterUserIds, setKpiReporterUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [importModal, setImportModal] = useState<ImportModalState>({ isOpen: false, file: null, error: null });
  const [importResultModal, setImportResultModal] = useState<ImportResultModalState>({
    isOpen: false,
    created: 0,
    updated: 0,
    skipped: 0,
    failures: [],
  });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; userId: string; fullName: string }>({
    isOpen: false,
    userId: '',
    fullName: '',
  });
  const [mfaResetModal, setMfaResetModal] = useState<{
    isOpen: boolean;
    user: UserManagementProfile | null;
    loading: boolean;
  }>({
    isOpen: false,
    user: null,
    loading: false,
  });
  const [mfaSuccessMessage, setMfaSuccessMessage] = useState<string | null>(null);
  const [createModal, setCreateModal] = useState<{ isOpen: boolean; form: CreateFormState; error: string | null }>({
    isOpen: false,
    form: getEmptyCreateForm('personnel'),
    error: null,
  });
  const [editModal, setEditModal] = useState<{ isOpen: boolean; user: UserManagementProfile | null; form: EditFormState; error: string | null }>({
    isOpen: false,
    user: null,
    error: null,
    form: {
      employee_code: '',
      email: '',
      full_name: '',
      position: '',
      department: '',
      work_group: '',
      gender: '',
      education: '',
      birth_date_th: '',
      start_work_date_th: '',
      employment_type: '',
    },
  });

  const currentUser = useAuthStore((state) => state.user);
  const currentProfile = useAuthStore((state) => state.profile);
  const currentRole = currentProfile?.role;
  const canManageRoleAndStatus = currentRole === 'super_admin' || currentRole === 'admin';
  const canResetMfa = currentRole === 'super_admin' || currentRole === 'admin';
  const canCreateUsers = currentRole === 'super_admin' || currentRole === 'admin' || currentRole === 'hr';
  const canManageUsers = currentRole === 'super_admin' || currentRole === 'admin' || currentRole === 'hr';
  const canUseBulkUserTools = currentRole === 'super_admin' || currentRole === 'admin';
  const availableCreateRoleOptions = useMemo<UserRole[]>(() => {
    if (currentRole === 'super_admin') return allRoleOptions;
    if (currentRole === 'hr') return ['personnel'];
    return createRoleOptions;
  }, [currentRole]);
  const availableManageRoleOptions = useMemo<UserRole[]>(
    () => (currentRole === 'super_admin' ? allRoleOptions : createRoleOptions),
    [currentRole],
  );

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [data, financeOfficerIds, kpiReporterIds] = await Promise.all([
        listAllUsers(),
        currentRole === 'super_admin'
          ? listUserPermissionAssignments(BUDGET_ITEMS_MANAGE_PERMISSION)
          : Promise.resolve([]),
        currentRole === 'super_admin'
          ? listUserPermissionAssignments(KPIDSP_INDICATORS_MANAGE_PERMISSION)
          : Promise.resolve([]),
      ]);
      setUsers(data);
      setFinanceOfficerUserIds(new Set(financeOfficerIds));
      setKpiReporterUserIds(new Set(kpiReporterIds));
      setError(null);
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถโหลดข้อมูลผู้ใช้งานได้'));
    } finally {
      setLoading(false);
    }
  };

  const handleKpiReporterToggle = async (user: UserManagementProfile, enabled: boolean) => {
    if (!currentUser || currentRole !== 'super_admin') return;
    if (user.role !== 'personnel') {
      setError('สิทธิ์ผู้บันทึกรายงานตัวชี้วัดกำหนดให้ผู้ใช้ Role Personnel เท่านั้น');
      return;
    }
    setUpdating(user.user_id);
    try {
      await setUserPermission(user.user_id, KPIDSP_INDICATORS_MANAGE_PERMISSION, enabled);
      void recordAuditLog({
        module: 'user_management',
        action: enabled ? 'kpidsp_reporter_permission_granted' : 'kpidsp_reporter_permission_revoked',
        route: '/admin/users',
        targetType: 'user',
        targetId: user.user_id,
        afterData: { supplemental_permission: enabled ? KPIDSP_INDICATORS_MANAGE_PERMISSION : null },
        metadata: { target_email: user.email, target_name: user.full_name },
      });
      await loadUsers();
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถกำหนสิทธิ์ผู้บันทึกรายงานตัวชี้วัดได้'));
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: ManageRoleValue) => {
    if (!currentUser || !canManageRoleAndStatus) return;
    const isFinanceOfficer = newRole === 'finance_officer';
    if (isFinanceOfficer && currentRole !== 'super_admin') {
      setError('เฉพาะ Super Admin เท่านั้นที่สามารถกำหนดสิทธิ์เจ้าหน้าที่การเงินได้');
      return;
    }
    if (!isFinanceOfficer && !availableManageRoleOptions.includes(newRole)) {
      setError('คุณไม่มีสิทธิ์กำหนด Role ที่สูงกว่าสิทธิ์ของคุณ');
      return;
    }
    const targetUser = users.find((user) => user.user_id === userId);
    const hadFinancePermission = financeOfficerUserIds.has(userId);
    setUpdating(userId);
    try {
      const nextRole: UserRole = isFinanceOfficer ? 'personnel' : newRole;
      if (targetUser?.role !== nextRole) {
        await updateUserRole(userId, nextRole);
      }

      if (isFinanceOfficer && !hadFinancePermission) {
        await setUserPermission(userId, BUDGET_ITEMS_MANAGE_PERMISSION, true);
      } else if (!isFinanceOfficer && hadFinancePermission && currentRole === 'super_admin') {
        await setUserPermission(userId, BUDGET_ITEMS_MANAGE_PERMISSION, false);
      }

      void recordAuditLog({
        module: 'user_management',
        action: 'user_role_change',
        route: '/admin/users',
        targetType: 'user',
        targetId: userId,
        beforeData: { role: targetUser?.role ?? null },
        afterData: { role: nextRole, supplemental_permission: isFinanceOfficer ? BUDGET_ITEMS_MANAGE_PERMISSION : null },
        metadata: { target_email: targetUser?.email ?? null, target_name: targetUser?.full_name ?? null },
      });
      await loadUsers();
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถเปลี่ยน Role ได้'));
      void recordAuditLog({ module: 'user_management', action: 'user_role_change_error', route: '/admin/users', targetType: 'user', targetId: userId, status: 'fail', errorMessage: getErrorMessage(err, 'role_change_error') });
    } finally {
      setUpdating(null);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: ProfileStatus) => {
    if (!currentUser || !canManageRoleAndStatus) return;
    const targetUser = users.find((user) => user.user_id === userId);
    setUpdating(userId);
    try {
      await updateUserStatus(userId, newStatus);
      void recordAuditLog({
        module: 'user_management',
        action: 'user_status_change',
        route: '/admin/users',
        targetType: 'user',
        targetId: userId,
        beforeData: { status: targetUser?.status ?? null },
        afterData: { status: newStatus },
        metadata: { target_email: targetUser?.email ?? null, target_name: targetUser?.full_name ?? null },
      });
      await loadUsers();
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถเปลี่ยนสถานะได้'));
      void recordAuditLog({ module: 'user_management', action: 'user_status_change_error', route: '/admin/users', targetType: 'user', targetId: userId, status: 'fail', errorMessage: getErrorMessage(err, 'status_change_error') });
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteClick = (userId: string, fullName: string) => {
    if (userId === currentUser?.id) {
      setError('คุณไม่สามารถลบบัญชีของตัวเองได้');
      return;
    }
    setDeleteModal({ isOpen: true, userId, fullName });
  };

  const handleConfirmDelete = async () => {
    if (!currentUser || !deleteModal.userId) return;

    setUpdating(deleteModal.userId);
    try {
      await deleteUser(deleteModal.userId);
      setDeleteModal({ isOpen: false, userId: '', fullName: '' });
      await loadUsers();
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถลบผู้ใช้งานได้'));
      void recordAuditLog({ module: 'user_management', action: 'user_delete_error', route: '/admin/users', targetType: 'user', targetId: deleteModal.userId, status: 'fail', errorMessage: getErrorMessage(err, 'delete_user_error') });
    } finally {
      setUpdating(null);
    }
  };

  const handleOpenResetMfa = (user: UserManagementProfile) => {
    setMfaSuccessMessage(null);
    setError(null);
    setMfaResetModal({
      isOpen: true,
      user,
      loading: false,
    });
  };

  const handleConfirmResetMfa = async () => {
    if (!currentUser || !mfaResetModal.user) return;
    const target = mfaResetModal.user;
    setMfaResetModal((prev) => ({ ...prev, loading: true }));
    try {
      await adminResetUserMfa(target.user_id);
      void recordAuditLog({
        module: 'user_management',
        action: 'user_reset_mfa',
        route: '/admin/users',
        targetType: 'user',
        targetId: target.user_id,
        metadata: {
          target_email: target.email ?? null,
          target_name: target.full_name,
          reset_by_role: currentRole,
        },
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === target.user_id ? { ...u, mfa_enabled: false } : u
        )
      );
      setMfaResetModal({ isOpen: false, user: null, loading: false });
      setMfaSuccessMessage(`รีเซ็ต 2-Step Verification สำหรับ "${target.full_name}" สำเร็จแล้ว ผู้ใช้สามารถเข้าสู่ระบบด้วยรหัสผ่านได้ทันที`);
      setTimeout(() => setMfaSuccessMessage(null), 6000);
    } catch (err: any) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถรีเซ็ต 2-Step Verification ได้'));
      void recordAuditLog({
        module: 'user_management',
        action: 'user_reset_mfa_error',
        route: '/admin/users',
        targetType: 'user',
        targetId: target.user_id,
        status: 'fail',
        errorMessage: getErrorMessage(err, 'mfa_reset_error'),
      });
      setMfaResetModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleOpenImport = () => {
    setImportModal({ isOpen: true, file: null, error: null });
  };

  const handleImportFileChange = (file: File | null) => {
    setImportModal((prev) => ({ ...prev, file, error: null }));
  };

  const handleOpenCreate = () => {
    setCreateModal({
      isOpen: true,
      form: getEmptyCreateForm(availableCreateRoleOptions[0] ?? 'personnel'),
      error: null,
    });
  };

  const handleCreateField = (field: keyof CreateFormState, value: string) => {
    setCreateModal((prev) => ({
      ...prev,
      error: null,
      form: {
        ...prev.form,
        [field]: value,
      },
    }));
  };

  const handleCreateUser = async () => {
    if (!canCreateUsers) return;

    const fullName = createModal.form.fullName.trim();
    const email = createModal.form.email.trim();

    if (fullName.length < 2) {
      setCreateModal((prev) => ({ ...prev, error: 'กรุณากรอกชื่อ-นามสกุล' }));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setCreateModal((prev) => ({ ...prev, error: 'กรุณากรอกอีเมลให้ถูกต้อง' }));
      return;
    }

    const roleToCreate = currentRole === 'hr' ? 'personnel' : createModal.form.role;
    if (!availableCreateRoleOptions.includes(roleToCreate)) {
      setCreateModal((prev) => ({ ...prev, error: 'คุณไม่มีสิทธิ์สร้างผู้ใช้ด้วย Role นี้' }));
      return;
    }

    setUpdating('create-user');
    try {
      const detailsPayload = buildCreateDetailsPayload(createModal.form, fullName);
      const userId = await createManagedUser({
        fullName,
        email,
        role: roleToCreate,
      });

      if (userId) {
        await updateUserDetails(userId, detailsPayload);
        if (roleToCreate !== 'personnel') {
          await updateUserRole(userId, roleToCreate);
        }
      }
      void recordAuditLog({
        module: 'user_management',
        action: 'user_create',
        route: '/admin/users',
        targetType: 'user',
        targetId: userId,
        metadata: { target_email: email, target_name: fullName, role: roleToCreate },
      });
      setCreateModal((prev) => ({ ...prev, isOpen: false, error: null }));
      await loadUsers();
    } catch (err) {
      setCreateModal((prev) => ({ ...prev, error: getCreateUserErrorMessage(err) }));
    } finally {
      setUpdating(null);
    }
  };

  const handleDownloadTemplate = async () => {
    const sampleRow = [
      'EMP001',
      'ตัวอย่าง ผู้ใช้งาน',
      'sample@example.com',
      roleLabels.personnel,
      'นักวิชาการ',
      'กองยุทธศาสตร์และแผนงาน',
      'กลุ่มยุทธศาสตร์และพัฒนาองค์กร',
      'ชาย',
      'ปริญญาตรี',
      '01/01/2535',
      '01/10/2560',
      'ข้าราชการ',
    ];
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.aoa_to_sheet([userTemplateHeaders, sampleRow]);
    const templateColumns = userTemplateHeaders.map((header) => ({ wch: Math.max(header.length + 4, 18) }));
    templateColumns[9] = { wch: 28 };
    templateColumns[10] = { wch: 32 };
    worksheet['!cols'] = templateColumns;
    ['J2', 'K2'].forEach((cellAddress) => {
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].t = 's';
        worksheet[cellAddress].z = '@';
      }
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'users');
    XLSX.writeFile(workbook, 'user-import-template.xlsx');
  };

  const handleExportUsers = async () => {
    const exportRows = users
      .filter((user) => user.role !== 'super_admin')
      .map((user) => [
        user.employee_code || '',
        user.full_name || '',
        user.email || '',
        roleLabels[user.role],
        user.position || '',
        user.department || '',
        user.work_group || '',
        user.gender ? genderLabels[user.gender] : '',
        user.education || '',
        formatISOToThaiDate(user.birth_date),
        formatISOToThaiDate(user.start_work_date),
        user.employment_type || '',
      ]);

    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.aoa_to_sheet([userTemplateHeaders, ...exportRows]);
    const exportColumns = userTemplateHeaders.map((header) => ({ wch: Math.max(header.length + 4, 18) }));
    exportColumns[1] = { wch: 28 };
    exportColumns[2] = { wch: 30 };
    exportColumns[9] = { wch: 28 };
    exportColumns[10] = { wch: 32 };
    worksheet['!cols'] = exportColumns;

    for (let rowIndex = 2; rowIndex <= exportRows.length + 1; rowIndex += 1) {
      ['J', 'K'].forEach((column) => {
        const cellAddress = `${column}${rowIndex}`;
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].t = 's';
          worksheet[cellAddress].z = '@';
        }
      });
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'users');
    XLSX.writeFile(workbook, 'user-export-for-update.xlsx');
    void recordAuditLog({
      module: 'user_management',
      action: 'user_export',
      route: '/admin/users',
      targetType: 'export',
      targetId: 'user-export-for-update.xlsx',
      metadata: { format: 'xlsx', record_count: exportRows.length, search },
    });
  };

  const handleImportUsers = async () => {
    const file = importModal.file;
    if (!canCreateUsers) return;

    if (!file) {
      setImportModal((prev) => ({ ...prev, error: 'กรุณาเลือกไฟล์ Excel ก่อนนำเข้า' }));
      return;
    }

    setBulkImporting(true);
    setUpdating('import-users');

    try {
      const importedRows = await readImportRows(file);
      if (importedRows.length === 0) {
        setImportModal((prev) => ({ ...prev, error: 'ไม่พบข้อมูลผู้ใช้ในไฟล์ที่นำเข้า' }));
        return;
      }

      const usersByName = new Map(users.map((user) => [normalizeName(user.full_name), user]));
      let created = 0;
      let updated = 0;
      let skipped = 0;
      const failures: string[] = [];

      for (let index = 0; index < importedRows.length; index += 1) {
        const rowNumber = index + 2;

        try {
          const imported = normalizeImportUser(importedRows[index], rowNumber, currentRole === 'hr' ? 'personnel' : undefined);
          const existingUser = usersByName.get(normalizeName(imported.full_name));

          if (existingUser) {
            if (hasEmptyFieldToFill(existingUser, imported)) {
              await updateUserDetails(existingUser.user_id, buildMergedDetailsPayload(existingUser, imported));
              updated += 1;
            } else {
              skipped += 1;
            }
            continue;
          }

          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(imported.email)) {
            throw new Error(`แถว ${rowNumber}: กรุณากรอกอีเมลให้ถูกต้องสำหรับผู้ใช้ใหม่`);
          }

          const userId = await createManagedUser({
            fullName: imported.full_name,
            email: imported.email,
            role: imported.role,
          });

          if (userId) {
            await updateUserDetails(userId, buildImportedDetailsPayload(imported));
            if (imported.role !== 'personnel') {
              await updateUserRole(userId, imported.role);
            }
            usersByName.set(normalizeName(imported.full_name), {
              user_id: userId,
              full_name: imported.full_name,
              email: imported.email,
              role: imported.role,
              status: 'pending',
              employee_code: imported.employee_code ?? null,
              position: imported.position ?? null,
              department: imported.department ?? null,
              work_group: imported.work_group ?? null,
              gender: imported.gender ?? null,
              education: imported.education ?? null,
              birth_date: imported.birth_date ?? null,
              start_work_date: imported.start_work_date ?? null,
              generation: null,
              employment_type: imported.employment_type ?? null,
              avatar_url: null,
              force_password_change: false,
              force_password_change_requested_at: null,
              force_password_change_requested_by: null,
              password_changed_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }

          created += 1;
        } catch (rowError) {
          failures.push(getErrorMessage(rowError, `แถว ${rowNumber}: ไม่สามารถนำเข้าข้อมูลได้`));
        }
      }

      await loadUsers();
      setImportModal({ isOpen: false, file: null, error: null });
      setImportResultModal({ isOpen: true, created, updated, skipped, failures });
      void recordAuditLog({
        module: 'user_management',
        action: 'user_import',
        route: '/admin/users',
        targetType: 'import',
        targetId: file.name,
        status: failures.length > 0 ? 'fail' : 'success',
        metadata: { file_name: file.name, created, updated, skipped, failure_count: failures.length },
      });
    } catch (err) {
      setImportModal((prev) => ({ ...prev, error: getErrorMessage(err, 'ไม่สามารถนำเข้าไฟล์ผู้ใช้ได้') }));
    } finally {
      setBulkImporting(false);
      setUpdating(null);
    }
  };

  const handleOpenEdit = (user: UserManagementProfile) => {
    setEditModal({
      isOpen: true,
      user,
      form: mapUserToForm(user),
      error: null,
    });
  };

  const handleEditField = (field: keyof EditFormState, value: string) => {
    setEditModal((prev) => ({
      ...prev,
      error: null,
      form: {
        ...prev.form,
        [field]: value,
      },
    }));
  };

  const handleSaveEdit = async () => {
    if (!editModal.user) return;

    setUpdating(editModal.user.user_id);

    try {
      const birthDateIso = parseThaiDateToISO(editModal.form.birth_date_th);
      const startWorkDateIso = parseThaiDateToISO(editModal.form.start_work_date_th, 'วันที่เริ่มงาน');
      const nextEmail = editModal.form.email.trim().toLowerCase();
      const currentEmail = (editModal.user.email || '').trim().toLowerCase();

      if (currentRole === 'super_admin' && nextEmail !== currentEmail) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
          throw new Error('กรุณากรอกอีเมลให้ถูกต้อง');
        }

        await updateUserEmail(editModal.user.user_id, nextEmail);
      }

      const beforeDetails = {
        email: editModal.user.email,
        employee_code: editModal.user.employee_code,
        full_name: editModal.user.full_name,
        position: editModal.user.position,
        department: editModal.user.department,
        work_group: editModal.user.work_group,
        gender: editModal.user.gender,
        education: editModal.user.education,
        birth_date: editModal.user.birth_date,
        start_work_date: editModal.user.start_work_date,
        employment_type: editModal.user.employment_type,
      };

      const afterDetails = {
        email: nextEmail,
        employee_code: editModal.form.employee_code || null,
        full_name: editModal.form.full_name || null,
        position: editModal.form.position || null,
        department: editModal.form.department || null,
        work_group: editModal.form.work_group || null,
        gender: editModal.form.gender || null,
        education: editModal.form.education || null,
        birth_date: birthDateIso,
        start_work_date: startWorkDateIso,
        employment_type: editModal.form.employment_type || null,
      };

      await updateUserDetails(editModal.user.user_id, {
        employee_code: editModal.form.employee_code || null,
        full_name: editModal.form.full_name || null,
        position: editModal.form.position || null,
        department: editModal.form.department || null,
        work_group: editModal.form.work_group || null,
        gender: editModal.form.gender || null,
        education: editModal.form.education || null,
        birth_date: birthDateIso,
        start_work_date: startWorkDateIso,
        employment_type: editModal.form.employment_type || null,
      });

      void recordAuditLog({
        module: 'user_management',
        action: 'user_update',
        route: '/admin/users',
        targetType: 'user',
        targetId: editModal.user.user_id,
        beforeData: beforeDetails,
        afterData: afterDetails,
      });
      setEditModal((prev) => ({ ...prev, isOpen: false }));
      await loadUsers();
    } catch (err) {
      setEditModal((prev) => ({ ...prev, error: getErrorMessage(err, 'ไม่สามารถบันทึกข้อมูลผู้ใช้งานได้') }));
    } finally {
      setUpdating(null);
    }
  };

  const visibleUsers = useMemo(
    () => (currentRole === 'super_admin' ? users : users.filter((user) => user.role !== 'super_admin')),
    [currentRole, users],
  );

  const filteredUsers = useMemo(
    () =>
      visibleUsers.filter(
        (u) =>
          u.full_name.toLowerCase().includes(search.toLowerCase()) ||
          (u.employee_code && u.employee_code.toLowerCase().includes(search.toLowerCase())),
      ),
    [visibleUsers, search],
  );

  const isIncomplete = (u: Profile) => !u.position || !u.department || !u.gender || !u.birth_date || !u.employment_type;

  if (!canManageUsers) {
    return <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="บริหารจัดการบัญชีผู้ใช้งาน กำหนดสิทธิ์ และอัปเดตรายละเอียดบุคลากร"
      />

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ หรือรหัสพนักงาน..."
            className="w-full rounded-md border border-slate-300 pl-10 pr-4 py-2 text-sm outline-none focus:border-brand-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">จำนวนผู้ใช้ทั้งหมด: {visibleUsers.length} ท่าน</div>
          {canCreateUsers && (
            <div className="flex flex-wrap items-center gap-2">
              {canUseBulkUserTools && (
                <>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    เทมเพลต Excel
                  </button>
                  <button
                    type="button"
                    onClick={handleExportUsers}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Export ผู้ใช้งาน
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenImport}
                    disabled={bulkImporting}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    {bulkImporting ? 'กำลังนำเข้า...' : 'นำเข้า Excel'}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                เพิ่มผู้ใช้
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>}
      {mfaSuccessMessage && (
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{mfaSuccessMessage}</span>
        </div>
      )}

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
                    <td colSpan={5} className="px-6 py-4"><div className="h-10 bg-slate-100 rounded"></div></td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">ไม่พบข้อมูลผู้ใช้งานที่ต้องการ</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.user_id} className={`hover:bg-slate-50/50 transition ${updating === u.user_id ? 'opacity-50 pointer-events-none' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-bold">
                          {u.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{u.full_name}</div>
                          <div className="text-xs text-slate-500">{u.position || 'ยังไม่ระบุตำแหน่ง'} · {u.generation || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium bg-white focus:border-brand-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                        value={financeOfficerUserIds.has(u.user_id) ? 'finance_officer' : u.role}
                        onChange={(e) => handleRoleChange(u.user_id, e.target.value as ManageRoleValue)}
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
                        <label className={`mt-2 flex items-center gap-2 text-xs font-medium ${u.role === 'personnel' ? 'text-slate-700' : 'text-slate-400'}`}>
                          <input
                            type="checkbox"
                            checked={kpiReporterUserIds.has(u.user_id)}
                            onChange={(event) => void handleKpiReporterToggle(u, event.target.checked)}
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
                              onClick={() => handleStatusChange(u.user_id, u.status === 'active' ? 'inactive' : 'active')}
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
                            onClick={() => handleOpenResetMfa(u)}
                            className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 hover:border-amber-300 transition"
                            title="รีเซ็ตการยืนยันตัวตน 2 ขั้นตอน (Google Authenticator)"
                          >
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            รีเซ็ต 2FA
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          แก้ไขข้อมูล
                        </button>
                        {currentRole === 'super_admin' && u.user_id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeleteClick(u.user_id, u.full_name)}
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

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบผู้ใช้งาน"
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน "${deleteModal.fullName}"? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบผู้ใช้งาน"
        isLoading={updating === deleteModal.userId}
        variant="danger"
      />

      <ConfirmModal
        isOpen={mfaResetModal.isOpen}
        onClose={() => setMfaResetModal({ isOpen: false, user: null, loading: false })}
        onConfirm={handleConfirmResetMfa}
        title="ยืนยันการรีเซ็ต 2-Step Verification (2FA)"
        variant="warning"
        confirmLabel="รีเซ็ต 2FA ทันที"
        cancelLabel="ยกเลิก"
        isLoading={mfaResetModal.loading}
        message={
          <div className="space-y-3 text-left">
            <p className="text-slate-600 text-sm">
              คุณกำลังจะรีเซ็ตการยืนยันตัวตน 2 ขั้นตอนของ:
            </p>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
              <div><span className="font-semibold text-slate-700">ชื่อ-นามสกุล:</span> {mfaResetModal.user?.full_name}</div>
              <div><span className="font-semibold text-slate-700">อีเมล:</span> {mfaResetModal.user?.email || '-'}</div>
              <div><span className="font-semibold text-slate-700">สิทธิ์:</span> {mfaResetModal.user?.role ? roleLabels[mfaResetModal.user.role] : '-'}</div>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 leading-relaxed">
              ⚠️ หลังจากรีเซ็ต ข้อมูล Google Authenticator (TOTP) ของผู้ใช้รายนี้จะถูกลบทั้งหมด ผู้ใช้จะสามารถเข้าสู่ระบบด้วยอีเมลและรหัสผ่านได้ทันที และสามารถตั้งค่า 2FA ใหม่ได้ในหน้าการตั้งค่าบัญชี
            </div>
          </div>
        }
      />

      <ConfirmModal
        isOpen={importModal.isOpen}
        onClose={() => setImportModal({ isOpen: false, file: null, error: null })}
        onConfirm={handleImportUsers}
        title="นำเข้า Excel ผู้ใช้"
        message={(
          <div className="mt-4 space-y-4 text-left">
            {importModal.error ? (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{importModal.error}</div>
            ) : null}
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              ดาวน์โหลดเทมเพลต Excel
            </button>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">ไฟล์ Excel / CSV</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                onChange={(e) => handleImportFileChange(e.target.files?.[0] ?? null)}
                disabled={bulkImporting}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700 disabled:opacity-60"
              />
            </label>
            {importModal.file ? (
              <div className="text-xs text-slate-500">เลือกไฟล์แล้ว: {importModal.file.name}</div>
            ) : null}
          </div>
        )}
        confirmLabel="นำเข้า"
        cancelLabel="ยกเลิก"
        isLoading={bulkImporting}
        variant="info"
      />
      {importResultModal.isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setImportResultModal((prev) => ({ ...prev, isOpen: false }))} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">นำเข้าข้อมูลเสร็จสิ้น</h3>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-md bg-slate-50 px-3 py-3">
                <div className="text-2xl font-bold text-slate-900">{importResultModal.created}</div>
                <div className="mt-1 text-xs text-slate-500">สร้างใหม่</div>
              </div>
              <div className="rounded-md bg-slate-50 px-3 py-3">
                <div className="text-2xl font-bold text-slate-900">{importResultModal.updated}</div>
                <div className="mt-1 text-xs text-slate-500">อัปเดต</div>
              </div>
              <div className="rounded-md bg-slate-50 px-3 py-3">
                <div className="text-2xl font-bold text-slate-900">{importResultModal.skipped}</div>
                <div className="mt-1 text-xs text-slate-500">ข้าม</div>
              </div>
            </div>
            {importResultModal.failures.length > 0 ? (
              <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-left text-sm text-red-700">
                <div className="font-semibold">ผิดพลาด: {importResultModal.failures.length} รายการ</div>
                <div className="mt-1 whitespace-pre-line text-xs leading-5">{importResultModal.failures.slice(0, 5).join('\n')}</div>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setImportResultModal((prev) => ({ ...prev, isOpen: false }))}
              className="mt-6 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              ตกลง
            </button>
          </div>
        </div>
      ) : null}
      <ConfirmModal
        isOpen={createModal.isOpen}
        onClose={() => setCreateModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleCreateUser}
        title="เพิ่มผู้ใช้ใหม่"
        message={(
          <div className="mt-4 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
            {createModal.error ? (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{createModal.error}</div>
            ) : null}
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="รหัสพนักงาน" value={createModal.form.employee_code} onChange={(e) => handleCreateField('employee_code', e.target.value)} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="ชื่อ-นามสกุล" autoComplete="name" value={createModal.form.fullName} onChange={(e) => handleCreateField('fullName', e.target.value)} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" placeholder="Email" type="email" autoComplete="email" value={createModal.form.email} onChange={(e) => handleCreateField('email', e.target.value)} />
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" value={createModal.form.role} onChange={(e) => handleCreateField('role', e.target.value as UserRole)} disabled={currentRole === 'hr'}>
              {availableCreateRoleOptions.map((role) => (
                <option key={role} value={role}>{roleLabels[role]}</option>
              ))}
            </select>
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="ตำแหน่ง" value={createModal.form.position} onChange={(e) => handleCreateField('position', e.target.value)} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="หน่วยงาน" value={createModal.form.department} onChange={(e) => handleCreateField('department', e.target.value)} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="กลุ่มงาน" value={createModal.form.work_group} onChange={(e) => handleCreateField('work_group', e.target.value)} />
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={createModal.form.gender} onChange={(e) => handleCreateField('gender', e.target.value)}>
              <option value="">เพศ</option>
              <option value="male">{genderLabels.male}</option>
              <option value="female">{genderLabels.female}</option>
            </select>
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={createModal.form.education} onChange={(e) => handleCreateField('education', e.target.value)}>
              {educationOptions.map((option) => (
                <option key={option || 'empty'} value={option}>{option || 'การศึกษา'}</option>
              ))}
            </select>
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="วันเกิด (วว/ดด/ปปปป พ.ศ.)" value={createModal.form.birth_date_th} onChange={(e) => handleCreateField('birth_date_th', e.target.value)} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="วันที่เริ่มงาน (วว/ดด/ปปปป พ.ศ.)" value={createModal.form.start_work_date_th} onChange={(e) => handleCreateField('start_work_date_th', e.target.value)} />
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" value={createModal.form.employment_type} onChange={(e) => handleCreateField('employment_type', e.target.value)}>
              {employmentTypeOptions.map((option) => (
                <option key={option || 'empty'} value={option}>{option || 'รูปแบบการจ้าง'}</option>
              ))}
            </select>
          </div>
        )}
        confirmLabel="สร้างผู้ใช้"
        cancelLabel="ยกเลิก"
        isLoading={updating === 'create-user'}
        variant="info"
      />

      <ConfirmModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleSaveEdit}
        title={`แก้ไขข้อมูลผู้ใช้: ${editModal.user?.full_name || ''}`}
        message={(
          <div className="mt-4 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
            {editModal.error ? (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 sm:col-span-2">{editModal.error}</div>
            ) : null}
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="รหัสพนักงาน" value={editModal.form.employee_code} onChange={(e) => handleEditField('employee_code', e.target.value)} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="ชื่อ-นามสกุล" value={editModal.form.full_name} onChange={(e) => handleEditField('full_name', e.target.value)} />
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-500 sm:col-span-2"
              placeholder="Email"
              type="email"
              value={editModal.form.email}
              onChange={(e) => handleEditField('email', e.target.value)}
              disabled={currentRole !== 'super_admin'}
            />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="ตำแหน่ง" value={editModal.form.position} onChange={(e) => handleEditField('position', e.target.value)} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="หน่วยงาน" value={editModal.form.department} onChange={(e) => handleEditField('department', e.target.value)} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="กลุ่มงาน" value={editModal.form.work_group} onChange={(e) => handleEditField('work_group', e.target.value)} />
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={editModal.form.education} onChange={(e) => handleEditField('education', e.target.value)}>
              {educationOptions.map((option) => (
                <option key={option || 'empty'} value={option}>
                  {option || 'การศึกษา'}
                </option>
              ))}
            </select>
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={editModal.form.gender} onChange={(e) => handleEditField('gender', e.target.value)}>
              <option value="">เพศ</option>
              <option value="male">{genderLabels.male}</option>
              <option value="female">{genderLabels.female}</option>
            </select>
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="วันเกิด (วว/ดด/ปปปป พ.ศ.)" value={editModal.form.birth_date_th} onChange={(e) => handleEditField('birth_date_th', e.target.value)} />
            <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="วันที่เริ่มงาน (วว/ดด/ปปปป พ.ศ.)" value={editModal.form.start_work_date_th} onChange={(e) => handleEditField('start_work_date_th', e.target.value)} />
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" value={editModal.form.employment_type} onChange={(e) => handleEditField('employment_type', e.target.value)}>
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
        isLoading={updating === editModal.user?.user_id}
        variant="info"
      />
    </div>
  );
}
