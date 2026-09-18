import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, withSupabaseTimeout } from '../lib/supabase';

const AuthContext = createContext(null);

const isAdminRole = (role) => {
  if (!role) return false;
  return ['super_admin', 'admin', 'central_office', 'central-office'].includes(String(role).toLowerCase());
};

const normalizeProfile = (user, profile) => {
  const metadataRole = user?.app_metadata?.role || user?.user_metadata?.role;
  const profileRole = profile?.role;
  const role = profileRole || metadataRole || 'viewer';
  const office = profile?.office || user?.user_metadata?.office || 'Central Office';

  return {
    role,
    office,
    isAdmin: isAdminRole(role),
  };
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState({ role: 'viewer', office: 'Central Office', isAdmin: false });
  const [loading, setLoading] = useState(true);

  const loadProfile = async (user) => {
    if (!user) {
      setProfile({ role: 'viewer', office: 'Central Office', isAdmin: false });
      return;
    }

    let remoteProfile = null;
    try {
      // ตาราง profiles ใน SmartDSP ใช้ user_id เป็น primary key
      const { data, error } = await withSupabaseTimeout(
        supabase
          .from('profiles')
          .select('role, work_group')
          .eq('user_id', user.id)
          .maybeSingle(),
        'Admin profile query',
        5000
      );

      if (!error && data) {
        remoteProfile = {
          role: data.role,
          office: data.work_group || 'Central Office',
        };
      }
    } catch {
      // ignore
    }

    setProfile(normalizeProfile(user, remoteProfile));
  };

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
      await loadProfile(data.session?.user ?? null);
      if (mounted) setLoading(false);
    };

    bootstrap();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession ?? null);
      await loadProfile(nextSession?.user ?? null);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    isAuthenticated: !!session?.user,
    isAdmin: profile.isAdmin,
    role: profile.role,
    office: profile.office,
    loading,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
    refreshProfile: async () => {
      await loadProfile(session?.user ?? null);
    },
  }), [session, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
