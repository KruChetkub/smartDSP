import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { env } from '../lib/env';
import { recordAuditLog } from '../services/audit.service';
import type { Profile } from '../types/database.types';
import { isPasswordPolicySatisfied } from '../features/auth/passwordPolicy';
import { checkPasswordResetEligibility, recordPasswordResetAttempt } from '../services/passwordResetAudit.service';

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  permissions: string[];
  assuranceLevel: 'aal1' | 'aal2' | null;
  mfaPending: { required: boolean; factorId: string; email?: string } | null;
  initialized: boolean;
  loading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  loadProfile: (userId: string) => Promise<Profile | null>;
  loadPermissions: () => Promise<string[]>;
  refreshProfile: () => Promise<Profile | null>;
  refreshAssuranceLevel: () => Promise<'aal1' | 'aal2' | null>;
  signIn: (email: string, password: string) => Promise<{ requiresMfa?: boolean; factorId?: string } | void>;
  verifyMfa: (factorId: string, code: string) => Promise<any>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

function getPasswordUpdateError(error: { code?: string; message: string }) {
  if (error.code === 'same_password') {
    return new Error('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน');
  }

  if (error.code === 'weak_password') {
    return new Error('รหัสผ่านไม่ผ่านข้อกำหนดด้านความปลอดภัย');
  }

  return error;
}

let initializePromise: Promise<void> | null = null;
let authSubscription: { unsubscribe: () => void } | null = null;

function getSignInErrorMessage(message: string) {
  if (message === 'Invalid login credentials') {
    return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  }

  return message;
}

type LoginGatewayResponse = {
  access_token?: string;
  refresh_token?: string;
  reason?: string;
  message?: string;
};

async function signInThroughGateway(email: string, password: string) {
  const response = await fetch(`${env.supabaseUrl}/functions/v1/login-gateway`, {
    method: 'POST',
    headers: {
      apikey: env.supabaseAnonKey,
      Authorization: `Bearer ${env.supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const result = await response.json().catch(() => ({})) as LoginGatewayResponse;
  if (!response.ok) {
    const message = result.reason === 'ip_blocked'
      ? (result.message || 'IP ของคุณถูกบล็อก กรุณาติดต่อเจ้าหน้าที่ผู้รับผิดชอบระบบเพื่อขอปลดบล็อก')
      : result.reason === 'rate_limited'
        ? 'มีการเข้าสู่ระบบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่'
        : result.reason === 'invalid_credentials'
          ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
          : result.reason === 'account_inactive'
            ? 'บัญชีนี้ถูกระงับหรือปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ'
          : result.reason === 'invalid_payload'
            ? 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง'
            : 'ไม่สามารถตรวจสอบความปลอดภัยในการเข้าสู่ระบบได้ กรุณาลองใหม่ภายหลัง';
    throw new Error(message);
  }

  if (!result.access_token || !result.refresh_token) {
    throw new Error('ไม่ได้รับข้อมูลยืนยันตัวตนจากระบบ');
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: result.access_token,
    refresh_token: result.refresh_token,
  });
  if (error) throw error;
  return data;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  permissions: [],
  assuranceLevel: null,
  mfaPending: null,
  initialized: false,
  loading: false,
  error: null,

  initialize: async () => {
    if (get().initialized) {
      return;
    }

    if (initializePromise) {
      return initializePromise;
    }

    initializePromise = (async () => {
      set({ loading: true, error: null });

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        set({ error: error.message, assuranceLevel: null, initialized: true, loading: false });
        return;
      }

      const session = data.session;
      const user = session?.user ?? null;
      let assuranceLevel: 'aal1' | 'aal2' | null = null;

      if (user) {
        // Check if MFA (TOTP AAL2) is pending
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        assuranceLevel = aalData?.currentLevel === 'aal2' ? 'aal2' : 'aal1';
        if (aalData && aalData.nextLevel === 'aal2' && aalData.currentLevel !== 'aal2') {
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          const verifiedTotp = factorsData?.totp?.find((f) => f.status === 'verified');
          if (verifiedTotp) {
            set({
              session,
              user,
              profile: null,
              permissions: [],
              assuranceLevel,
              mfaPending: { required: true, factorId: verifiedTotp.id, email: user.email },
              initialized: true,
              loading: false,
            });
            return;
          }
        }
      }

      const [profile, permissions] = user
        ? await Promise.all([get().loadProfile(user.id), get().loadPermissions()])
        : [null, []];

      set({ session, user, profile, permissions, assuranceLevel, mfaPending: null, initialized: true, loading: false });

      authSubscription?.unsubscribe();
      const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        const nextUser = nextSession?.user ?? null;
        const currentProfile = get().profile;
        const profileStillMatches = Boolean(nextUser && currentProfile?.user_id === nextUser.id);

        if (!nextUser) {
          set({
            session: null,
            user: null,
            profile: null,
            permissions: [],
            assuranceLevel: null,
            mfaPending: null,
            initialized: true,
            loading: false,
          });
          return;
        }

        window.setTimeout(() => {
          void (async () => {
            // Check if MFA (TOTP AAL2) is pending for nextUser
            const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            const assuranceLevel = aalData?.currentLevel === 'aal2' ? 'aal2' : 'aal1';
            if (aalData && aalData.nextLevel === 'aal2' && aalData.currentLevel !== 'aal2') {
              const { data: factorsData } = await supabase.auth.mfa.listFactors();
              const verifiedTotp = factorsData?.totp?.find((f) => f.status === 'verified');
              if (verifiedTotp) {
                set({
                  session: nextSession,
                  user: nextUser,
                  profile: null,
                  permissions: [],
                  assuranceLevel,
                  mfaPending: { required: true, factorId: verifiedTotp.id, email: nextUser.email },
                  initialized: true,
                  loading: false,
                });
                return;
              }
            }

            if (profileStillMatches) {
              set({ session: nextSession, user: nextUser, assuranceLevel, mfaPending: null, initialized: true, loading: false });
              return;
            }

            const [nextProfile, permissions] = await Promise.all([
              get().loadProfile(nextUser.id),
              get().loadPermissions(),
            ]);
            if (get().user?.id === nextUser.id) {
              set({
                session: nextSession,
                user: nextUser,
                profile: nextProfile,
                permissions,
                assuranceLevel,
                mfaPending: null,
                initialized: true,
                loading: false,
              });
            }
          })();
        }, 0);
      });

      authSubscription = listener.subscription;
    })();

    try {
      await initializePromise;
    } finally {
      initializePromise = null;
    }
  },

  loadProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'user_id, employee_code, full_name, position, department, work_group, gender, education, birth_date, start_work_date, generation, employment_type, role, status, avatar_url, force_password_change, force_password_change_requested_at, force_password_change_requested_by, password_changed_at, mfa_required, mfa_required_at, mfa_required_by, created_at, updated_at',
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      set({ error: error.message });
      return null;
    }

    return data;
  },

  loadPermissions: async () => {
    const { data, error } = await (supabase as any).rpc('list_my_permissions');
    if (error) {
      set({ error: error.message });
      return [];
    }

    return Array.isArray(data) ? data.filter((item): item is string => typeof item === 'string') : [];
  },

  refreshProfile: async () => {
    const userId = get().user?.id;
    if (!userId) {
      return null;
    }

    const [profile, permissions] = await Promise.all([
      get().loadProfile(userId),
      get().loadPermissions(),
    ]);
    set({ profile, permissions });
    return profile;
  },

  refreshAssuranceLevel: async () => {
    if (!get().user) {
      set({ assuranceLevel: null });
      return null;
    }

    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) {
      return get().assuranceLevel;
    }

    const assuranceLevel = data?.currentLevel === 'aal2' ? 'aal2' : 'aal1';
    set({ assuranceLevel });
    return assuranceLevel;
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });

    const normalizedEmail = email.trim().toLowerCase();
    let data;
    try {
      data = await signInThroughGateway(normalizedEmail, password);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ไม่สามารถเข้าสู่ระบบได้';
      set({ error: getSignInErrorMessage(message), loading: false });
      throw error;
    }

    // Check if user has MFA (TOTP) enabled requiring AAL2 verification
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const assuranceLevel = aalData?.currentLevel === 'aal2' ? 'aal2' : 'aal1';
    if (aalData && aalData.nextLevel === 'aal2' && aalData.currentLevel !== 'aal2') {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedTotp = factorsData?.totp?.find((f) => f.status === 'verified');
      if (verifiedTotp) {
        set({
          session: data.session,
          user: data.user,
          profile: null,
          permissions: [],
          assuranceLevel,
          mfaPending: { required: true, factorId: verifiedTotp.id, email: normalizedEmail },
          loading: false,
        });
        return {
          requiresMfa: true,
          factorId: verifiedTotp.id,
        };
      }
    }

    const [profile, permissions] = data.user
      ? await Promise.all([get().loadProfile(data.user.id), get().loadPermissions()])
      : [null, []];
    set({ session: data.session, user: data.user, profile, permissions, assuranceLevel, mfaPending: null, loading: false });

  },

  verifyMfa: async (factorId: string, code: string) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.trim(),
    });

    if (error) {
      set({ error: 'รหัสความปลอดภัย (OTP) ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง', loading: false });
      throw error;
    }

    const { data: userData } = await supabase.auth.getUser();
    const [profile, permissions] = userData.user
      ? await Promise.all([get().loadProfile(userData.user.id), get().loadPermissions()])
      : [null, []];

    set({ user: userData.user, profile, permissions, assuranceLevel: 'aal2', mfaPending: null, loading: false });

    return data;
  },

  signUp: async (email: string, password: string, fullName: string) => {
    if (!isPasswordPolicySatisfied(password)) {
      throw new Error('รหัสผ่านไม่ผ่านข้อกำหนดด้านความปลอดภัย');
    }

    set({ loading: true, error: null });

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      set({ error: error.message, loading: false });
      throw error;
    }

    set({ loading: false });
  },

  requestPasswordReset: async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    set({ loading: true, error: null });

    const eligibility = checkPasswordResetEligibility(normalizedEmail);
    if (!eligibility.allowed) {
      await recordPasswordResetAttempt(normalizedEmail, eligibility.status, eligibility.reason);
      const errorMsg = eligibility.reason || 'คุณส่งคำขอเกินจำนวนที่กำหนดสำหรับวันนี้';
      set({ error: errorMsg, loading: false });
      throw new Error(errorMsg);
    }

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/set-new-password`,
    });

    if (error) {
      await recordPasswordResetAttempt(normalizedEmail, 'blocked', error.message);
      set({ error: error.message, loading: false });
      throw error;
    }

    await recordPasswordResetAttempt(normalizedEmail, 'success');
    set({ loading: false });
  },

  updatePassword: async (password: string) => {
    if (!isPasswordPolicySatisfied(password)) {
      throw new Error('รหัสผ่านไม่ผ่านข้อกำหนดด้านความปลอดภัย');
    }

    set({ loading: true, error: null });

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      const passwordError = getPasswordUpdateError(error);
      set({ error: passwordError.message, loading: false });
      throw passwordError;
    }

    const { error: completionError } = await supabase.rpc('complete_forced_password_change');
    if (completionError) {
      set({ error: completionError.message, loading: false });
      throw completionError;
    }

    const profile = await get().refreshProfile();
    set({ profile, loading: false });
  },


  signOut: async () => {
    set({ loading: true, error: null });

    const currentUserId = get().user?.id ?? null;
    await recordAuditLog({
      module: 'auth',
      action: 'logout',
      targetType: 'user',
      targetId: currentUserId,
    });

    const { error } = await supabase.auth.signOut();
    if (error) {
      set({ error: error.message, loading: false });
      throw error;
    }

    set({ session: null, user: null, profile: null, permissions: [], assuranceLevel: null, mfaPending: null, loading: false });
  },

  clearError: () => set({ error: null }),
}));
