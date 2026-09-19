import type { UserRole } from '../../../types/roles';
import { roleLabels } from '../../../types/roles';
import type { Profile } from '../../../types/database.types';
import type { UpdateUserDetailsPayload, UserManagementProfile } from '../../../services/admin.service';
import {
  allowedEducationOptions,
  allowedEmploymentTypeOptions,
  createRoleOptions,
  importHeaderMap,
} from '../types/userManagement.types';
import type {
  CreateFormState,
  EditFormState,
  NormalizedImportUser,
  UserImportRow,
} from '../types/userManagement.types';

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function isBlank(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === '';
}

export function valueOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function excelSerialDateToISO(serial: number): string {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const date = new Date(utcValue * 1000);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatExcelCellValue(value: unknown, cell?: { w?: string; t?: string }): string {
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

export function normalizeRole(value: string): UserRole {
  const trimmed = value.trim();
  if (!trimmed) return 'personnel';

  const normalized = trimmed.toLowerCase();
  const roleByKey = createRoleOptions.find((role) => role.toLowerCase() === normalized);
  if (roleByKey) return roleByKey;

  const roleByLabel = createRoleOptions.find((role) => roleLabels[role] === trimmed);
  return roleByLabel ?? 'personnel';
}

export function normalizeGender(value: string, rowNumber: number): UpdateUserDetailsPayload['gender'] {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed === 'male' || trimmed === 'ชาย') return 'male';
  if (trimmed === 'female' || trimmed === 'หญิง') return 'female';
  throw new Error(`แถว ${rowNumber}: เพศต้องเป็น ชาย หรือ หญิง`);
}

export function normalizeOption<T extends string>(value: string, options: readonly T[], label: string, rowNumber: number): T | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const matched = options.find((option) => option === trimmed);
  if (!matched) throw new Error(`แถว ${rowNumber}: ${label}ไม่ถูกต้อง`);
  return matched;
}

export function parseDelimitedText(text: string): string[][] {
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

export function rowsToImportRows(rows: string[][]): UserImportRow[] {
  const [headerRow, ...bodyRows] = rows;
  if (!headerRow) return [];

  const keys = headerRow.map((header) => importHeaderMap[header.trim()] ?? null);

  return bodyRows
    .map((bodyRow) => {
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
    })
    .filter((row) => Object.values(row).some((value) => value.trim().length > 0));
}

export async function readImportRows(file: File): Promise<UserImportRow[]> {
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

export function parseThaiDateToISO(value: string, fieldLabel = 'วันเกิด'): string | null {
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

export function formatISOToThaiDate(isoDate: string | null): string {
  if (!isoDate) return '';

  const parts = isoDate.split('-');
  if (parts.length !== 3) return '';

  const year = Number(parts[0]) + 543;
  return `${parts[2]}/${parts[1]}/${String(year)}`;
}

export function normalizeImportUser(row: UserImportRow, rowNumber: number, forcedRole?: UserRole): NormalizedImportUser {
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

export function hasEmptyFieldToFill(user: Profile, imported: NormalizedImportUser): boolean {
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

export function buildMergedDetailsPayload(user: Profile, imported: NormalizedImportUser): UpdateUserDetailsPayload {
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

export function buildImportedDetailsPayload(imported: NormalizedImportUser): UpdateUserDetailsPayload {
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

export function buildCreateDetailsPayload(form: CreateFormState, fullName: string): UpdateUserDetailsPayload {
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

export function getEmptyCreateForm(role: UserRole): CreateFormState {
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

export function mapUserToForm(user: UserManagementProfile): EditFormState {
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

export function getErrorMessage(err: unknown, fallback: string): string {
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

export function getCreateUserErrorMessage(err: unknown): string {
  const message = getErrorMessage(err, 'ไม่สามารถสร้างผู้ใช้งานได้');

  if (message === 'User already registered') {
    return 'มี email นี้อยู่ในระบบแล้ว';
  }

  return message;
}

