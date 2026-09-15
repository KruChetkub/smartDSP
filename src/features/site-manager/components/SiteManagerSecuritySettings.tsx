import { Save, ShieldCheck, TimerReset } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  DEFAULT_AUTO_LOGOUT_MINUTES,
  loadLoginSecuritySettings,
  MAX_AUTO_LOGOUT_MINUTES,
  MIN_AUTO_LOGOUT_MINUTES,
  saveLoginSecuritySettings,
} from '../../../services/system-settings.service';

const autoLogoutOptions = [5, 10, 15, 30, 45, 60, 120, 240, 480];

export function SiteManagerSecuritySettings() {
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState(DEFAULT_AUTO_LOGOUT_MINUTES);
  const [savedMinutes, setSavedMinutes] = useState(DEFAULT_AUTO_LOGOUT_MINUTES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      setLoading(true);
      setError(null);

      try {
        const settings = await loadLoginSecuritySettings();
        if (!isMounted) return;

        setAutoLogoutMinutes(settings.autoLogoutMinutes);
        setSavedMinutes(settings.autoLogoutMinutes);
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : 'โหลดการตั้งค่าความปลอดภัยไม่สำเร็จ');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const settings = await saveLoginSecuritySettings({ autoLogoutMinutes });
      setAutoLogoutMinutes(settings.autoLogoutMinutes);
      setSavedMinutes(settings.autoLogoutMinutes);
      setMessage('บันทึกการตั้งค่าการลงชื่อเข้าใช้เรียบร้อย');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'บันทึกการตั้งค่าความปลอดภัยไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = autoLogoutMinutes !== savedMinutes;

  return (
    <section className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-700" aria-hidden="true" />
            <h2 className="text-lg font-semibold tracking-normal text-slate-950">การตั้งค่าการลงชื่อเข้าใช้</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">กำหนดเวลาลงชื่อออกอัตโนมัติสำหรับผู้ใช้ทุกสิทธิ์ โดย Super Admin เท่านั้น</p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={loading || saving || !hasChanges}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
        </button>
      </div>

      <div className="p-5">
        <div className="max-w-3xl rounded-md border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-white p-2 text-brand-700 shadow-sm">
              <TimerReset className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-slate-950">ระยะเวลาไม่มีการใช้งาน</h3>
              <p className="mt-1 text-sm text-slate-600">
                ตั้งค่าตัวตั้งเวลาลงชื่อออกโดยอัตโนมัติของเบราว์เวอร์สำหรับระบบ
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-[220px_1fr] sm:items-end">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">ตัวตั้งเวลาลงชื่อออก</span>
                  <select
                    value={autoLogoutMinutes}
                    disabled={loading || saving}
                    onChange={(event) => {
                      setAutoLogoutMinutes(Number(event.target.value));
                      setMessage(null);
                      setError(null);
                    }}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {autoLogoutOptions.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} นาที
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">กำหนดเองเป็นนาที</span>
                  <input
                    type="number"
                    min={MIN_AUTO_LOGOUT_MINUTES}
                    max={MAX_AUTO_LOGOUT_MINUTES}
                    step={1}
                    value={autoLogoutMinutes}
                    disabled={loading || saving}
                    onChange={(event) => {
                      setAutoLogoutMinutes(Number(event.target.value));
                      setMessage(null);
                      setError(null);
                    }}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                ระบบจะนับเวลาจากการไม่มีการใช้งานบนเบราว์เวอร์ เช่น ไม่มีการคลิก พิมพ์ เลื่อนหน้า หรือแตะหน้าจอ
              </p>
            </div>
          </div>
        </div>

        {message ? (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </section>
  );
}
