import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Clock, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ConfiguredNotice } from '../../../components/auth/ConfiguredNotice';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { useAuthStore } from '../../../stores/auth.store';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../auth.schemas';
import { reportClientError } from '../../../utils/errorHandling';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const forcedState = location.state as { forcedPasswordChange?: boolean; email?: string } | null;
  const [submitted, setSubmitted] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { requestPasswordReset, loading, error, clearError } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: forcedState?.email ?? '',
    },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    if (cooldown > 0) return;
    clearError();
    try {
      await requestPasswordReset(values.email);
      setSubmitted(true);
      setCooldown(60);
    } catch (err) {
      // Error is handled by the store and displayed in the UI
      void reportClientError('Password reset request failed:', err);
    }
  };

  const goToLogin = () => {
    setSubmitted(false);
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        <div>
          <div className="text-2xl font-bold text-brand-700">PTDMS</div>
          <h1 className="mt-6 text-2xl font-semibold text-slate-950">ลืมรหัสผ่าน</h1>
          <p className="mt-2 text-sm text-slate-600">ระบบจะส่งลิงก์ Reset Password ไปยังอีเมลที่ลงทะเบียนไว้</p>
        </div>

        <ConfiguredNotice />

        {forcedState?.forcedPasswordChange ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            บัญชีนี้ถูกกำหนดให้เปลี่ยนรหัสผ่าน กรุณาส่งลิงก์ Reset Password และตั้งรหัสผ่านใหม่ก่อนเข้าใช้งานระบบ
          </div>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          {error ? (
            <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : null}

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="smartdsp@ddc.mail.go.th"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              {...register('email')}
            />
            {errors.email ? <span className="mt-1 block text-xs text-red-600">{errors.email.message}</span> : null}
          </label>

          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500 space-y-1 border border-slate-100">
            <div className="flex items-center gap-1.5 font-semibold text-slate-600">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>ความปลอดภัยของระบบ:</span>
            </div>
            <p>• จำกัดการขอส่งลิงก์ไม่เกิน 3 ครั้ง / วัน สำหรับแต่ละอีเมล</p>
            <p>• มีระยะเวลาคูลดาวน์ 60 วินาทีระหว่างการส่งแต่ละครั้ง</p>
          </div>

          <button
            type="submit"
            disabled={loading || cooldown > 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            {loading ? 'กำลังส่งอีเมล...' : cooldown > 0 ? `กรุณารออีก ${cooldown} วินาที` : 'Send reset link'}
          </button>

          <Link className="block text-center text-sm font-medium text-brand-700 hover:text-brand-600 pt-2" to="/login">
            กลับไปหน้า Login
          </Link>
        </form>
      </div>

      <ConfirmModal
        isOpen={submitted}
        onClose={goToLogin}
        onConfirm={goToLogin}
        title="ส่งอีเมลเรียบร้อย"
        message="กรุณาตรวจสอบ Inbox หรือ Spam แล้วกดลิงก์ในอีเมลเพื่อไปหน้าตั้งรหัสผ่านใหม่"
        confirmLabel="กลับไปหน้า Login"
        cancelLabel="ปิด"
        variant="info"
      />
    </div>
  );
}
