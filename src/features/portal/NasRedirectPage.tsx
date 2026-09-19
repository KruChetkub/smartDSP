import React, { useEffect } from 'react';
import { Database, ExternalLink, Loader2 } from 'lucide-react';

export default function NasRedirectPage() {
  const targetUrl = import.meta.env.VITE_NAS_URL;

  useEffect(() => {
    if (targetUrl) {
      const timer = setTimeout(() => {
        window.location.replace(targetUrl);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [targetUrl]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans text-slate-800">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-lg space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
          <Database size={32} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900">
            ระบบจัดเก็บข้อมูลกลาง กยผ. (NAS)
          </h1>
          <p className="text-sm text-slate-600">
            กำลังนำท่านเข้าสู่ระบบจัดเก็บข้อมูลกลาง กรุณารอสักครู่...
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50/70 py-2.5 px-4 rounded-xl border border-emerald-100">
          <Loader2 className="animate-spin" size={16} />
          <span>กำลังเปลี่ยนเส้นทาง...</span>
        </div>

        {targetUrl ? (
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
            หากระบบไม่เปลี่ยนหน้าอัตโนมัติ{' '}
            <a
              href={targetUrl}
              rel="noopener noreferrer"
              className="text-brand-600 font-bold hover:underline inline-flex items-center gap-0.5"
            >
              คลิกที่นี่ <ExternalLink size={11} />
            </a>
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-100 text-xs text-amber-600">
            ยังไม่ได้กำหนด URL ของระบบ NAS ในการตั้งค่าระบบ (VITE_NAS_URL)
          </div>
        )}
      </div>
    </div>
  );
}

