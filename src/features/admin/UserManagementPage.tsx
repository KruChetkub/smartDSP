import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
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
import type { UserManagementProfile } from '../../services/admin.service';
import { useAuthStore } from '../../stores/auth.store';
import type { UserRole, ProfileStatus } from '../../types/roles';
import { roleLabels } from '../../types/roles';
import { getSafeUserErrorMessage } from '../../utils/errorHandling';
import { BUDGET_ITEMS_MANAGE_PERMISSION, KPIDSP_INDICATORS_MANAGE_PERMISSION } from '../../constants/permissions';

import type {
  CreateFormState,
  EditFormState,
  ImportModalState,
  ImportResultModalState,
  ManageRoleValue,
} from './types/userManagement.types';
import {
  allRoleOptions,
  createRoleOptions,
  genderLabels,
  userTemplateHeaders,
} from './types/userManagement.types';
import {
  buildCreateDetailsPayload,
  buildImportedDetailsPayload,
  buildMergedDetailsPayload,
  formatISOToThaiDate,
  getCreateUserErrorMessage,
  getEmptyCreateForm,
  getErrorMessage,
  hasEmptyFieldToFill,
  mapUserToForm,
  normalizeImportUser,
  normalizeName,
  parseThaiDateToISO,
  readImportRows,
} from './utils/userManagement.utils';
import { CreateUserModal } from './components/CreateUserModal';
import { EditUserModal } from './components/EditUserModal';
import { ImportResultModal, ImportUsersModal } from './components/ImportUsersModal';
import { UserToolbar } from './components/UserToolbar';
import { UserTable } from './components/UserTable';

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
    } catch (err: unknown) {
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

  if (!canManageUsers) {
    return <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="บริหารจัดการบัญชีผู้ใช้งาน กำหนดสิทธิ์ และอัปเดตรายละเอียดบุคลากร"
      />

      <UserToolbar
        search={search}
        onSearchChange={setSearch}
        totalUsersCount={visibleUsers.length}
        canCreateUsers={canCreateUsers}
        canUseBulkUserTools={canUseBulkUserTools}
        bulkImporting={bulkImporting}
        onDownloadTemplate={handleDownloadTemplate}
        onExportUsers={handleExportUsers}
        onOpenImport={handleOpenImport}
        onOpenCreate={handleOpenCreate}
      />

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>}
      {mfaSuccessMessage && (
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{mfaSuccessMessage}</span>
        </div>
      )}

      <UserTable
        users={filteredUsers}
        loading={loading}
        updating={updating}
        currentUserId={currentUser?.id}
        currentRole={currentRole}
        canManageRoleAndStatus={canManageRoleAndStatus}
        canResetMfa={canResetMfa}
        financeOfficerUserIds={financeOfficerUserIds}
        kpiReporterUserIds={kpiReporterUserIds}
        availableManageRoleOptions={availableManageRoleOptions}
        onRoleChange={handleRoleChange}
        onStatusChange={handleStatusChange}
        onKpiReporterToggle={handleKpiReporterToggle}
        onOpenResetMfa={handleOpenResetMfa}
        onOpenEdit={handleOpenEdit}
        onDeleteClick={handleDeleteClick}
      />

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

      <ImportUsersModal
        importModal={importModal}
        onClose={() => setImportModal({ isOpen: false, file: null, error: null })}
        onConfirm={handleImportUsers}
        onFileChange={handleImportFileChange}
        onDownloadTemplate={handleDownloadTemplate}
        isLoading={bulkImporting}
      />

      <ImportResultModal
        resultModal={importResultModal}
        onClose={() => setImportResultModal((prev) => ({ ...prev, isOpen: false }))}
      />

      <CreateUserModal
        isOpen={createModal.isOpen}
        onClose={() => setCreateModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleCreateUser}
        form={createModal.form}
        onFieldChange={handleCreateField}
        error={createModal.error}
        isLoading={updating === 'create-user'}
        currentRole={currentRole}
        availableCreateRoleOptions={availableCreateRoleOptions}
      />

      <EditUserModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleSaveEdit}
        user={editModal.user}
        form={editModal.form}
        onFieldChange={handleEditField}
        error={editModal.error}
        isLoading={updating === editModal.user?.user_id}
        currentRole={currentRole}
      />
    </div>
  );
}
