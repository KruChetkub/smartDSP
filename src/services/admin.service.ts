import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { env } from '../lib/env';
import type { Profile } from '../types/database.types';
import type { Database } from '../types/database.types';
import type { UserRole, ProfileStatus } from '../types/roles';

export type UserManagementProfile = Profile & {
  email: string | null;
  mfa_enabled?: boolean;
};

export async function listAllUsers() {
  const { data, error } = await (supabase as any).rpc('list_user_management_profiles');

  if (error) throw error;
  return data as UserManagementProfile[];
}

export async function adminResetUserMfa(userId: string) {
  const { error } = await (supabase as any).rpc('admin_reset_user_mfa', {
    target_user_id: userId,
  });

  if (error) throw error;
}

export async function listUserPermissionAssignments(permissionKey: string) {
  const { data, error } = await (supabase as any).rpc('list_user_permission_assignments', {
    p_permission_key: permissionKey,
  });

  if (error) throw error;
  return Array.isArray(data) ? data.filter((userId): userId is string => typeof userId === 'string') : [];
}

export async function setUserPermission(userId: string, permissionKey: string, enabled: boolean) {
  const { error } = await (supabase as any).rpc('set_user_permission', {
    p_target_user_id: userId,
    p_permission_key: permissionKey,
    p_enabled: enabled,
  });

  if (error) throw error;
}

export async function updateUserRole(userId: string, role: UserRole) {
  const { error } = await supabase
    .from('profiles')
    .update({ 
      role,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (error) throw error;
}

export async function updateUserStatus(userId: string, status: ProfileStatus) {
  const { error } = await supabase
    .from('profiles')
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (error) throw error;
}

export async function deleteUser(userId: string) {
  const { error } = await (supabase as any).rpc('delete_user_secure', { target_user_id: userId });

  if (error) throw error;
}

export async function updateUserEmail(userId: string, email: string) {
  const { error } = await supabase.functions.invoke('update-user-email', {
    body: {
      userId,
      email,
    },
  });

  if (error) throw error;
}

export type CreateUserPayload = {
  fullName: string;
  email: string;
  password?: string;
  role: UserRole;
};

function generateTemporaryPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join('') + 'Aa1!';
}

export async function createManagedUser(payload: CreateUserPayload) {
  const isolatedSupabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  const redirectTo = `${window.location.origin}/auth/callback`;
  const temporaryPassword = payload.password ?? generateTemporaryPassword();
  const { data, error } = await isolatedSupabase.auth.signUp({
    email: payload.email,
    password: temporaryPassword,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        full_name: payload.fullName,
        role: payload.role,
      },
    },
  });

  if (error) throw error;

  if (!payload.password) {
    const { error: resetError } = await isolatedSupabase.auth.resetPasswordForEmail(payload.email, { redirectTo });
    if (resetError) throw resetError;
  }

  return data.user?.id ?? null;
}

export type UpdateUserDetailsPayload = {
  employee_code?: string | null;
  full_name?: string | null;
  position?: string | null;
  department?: string | null;
  work_group?: string | null;
  gender?: 'male' | 'female' | null;
  education?: 'ต่ำกว่าปริญญาตรี' | 'ปริญญาตรี' | 'ปริญญาโท' | 'ปริญญาเอก' | null;
  birth_date?: string | null;
  start_work_date?: string | null;
  employment_type?: 'ข้าราชการ' | 'พนักงานราชการ' | 'พนักงานกระทรวงสาธารณสุข' | 'ลูกจ้างชั่วคราว' | 'จ้างเหมาบริการฯ (พขร.)' | null;
};

export async function updateUserDetails(userId: string, payload: UpdateUserDetailsPayload) {
  const { error } = await (supabase as any).rpc('update_user_profile_details', {
    p_user_id: userId,
    p_employee_code: payload.employee_code ?? null,
    p_full_name: payload.full_name ?? null,
    p_position: payload.position ?? null,
    p_department: payload.department ?? null,
    p_work_group: payload.work_group ?? null,
    p_gender: payload.gender ?? null,
    p_education: payload.education ?? null,
    p_birth_date: payload.birth_date ?? null,
    p_start_work_date: payload.start_work_date ?? null,
    p_employment_type: payload.employment_type ?? null,
  });

  if (error) throw error;
}
