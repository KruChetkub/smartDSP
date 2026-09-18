import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function AuthLoading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-500">
      <Loader2 size={28} className="animate-spin text-cyan-600" />
      <p className="font-bold text-slate-700">กำลังตรวจสอบสิทธิ์การเข้าถึง...</p>
    </div>
  );
}

export function UnauthorizedPanel() {
  return <Navigate to="/" replace />;
}

export default function ProtectedAdminRoute() {
  const { loading, isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoading />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin) {
    return <Navigate to="/admin/unauthorized" replace />;
  }

  return <Outlet />;
}
