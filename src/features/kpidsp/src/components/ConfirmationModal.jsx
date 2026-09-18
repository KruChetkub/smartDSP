import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';

export default function ConfirmationModal({
  open,
  title,
  message,
  details,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  tone = 'primary',
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = event => {
      if (event.key === 'Escape' && !isLoading) onCancel?.();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, isLoading, onCancel]);

  if (!open) return null;

  const isDanger = tone === 'danger';
  const Icon = isDanger ? AlertTriangle : CheckCircle2;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="ปิดหน้าต่างยืนยัน"
        className="absolute inset-0 w-full bg-slate-950/45 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => !isLoading && onCancel?.()}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        aria-describedby="confirmation-modal-description"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl animate-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          aria-label="ยกเลิก"
          disabled={isLoading}
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
        >
          <X size={18} />
        </button>

        <div className="px-7 pb-7 pt-8 text-center">
          <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border ${
            isDanger
              ? 'border-rose-200 bg-rose-50 text-rose-600'
              : 'border-sky-200 bg-sky-50 text-sky-600'
          }`}>
            <Icon size={32} />
          </div>

          <h2 id="confirmation-modal-title" className="text-2xl font-black tracking-tight text-slate-800">
            {title}
          </h2>
          <p id="confirmation-modal-description" className="mt-3 text-sm font-medium leading-6 text-slate-500">
            {message}
          </p>

          {details && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-600">
              {details}
            </div>
          )}

          <div className="mt-7 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={onCancel}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                isDanger
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500'
              }`}
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
