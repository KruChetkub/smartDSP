import React from 'react';
import { CheckCircle2, Download } from 'lucide-react';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import type { ImportModalState, ImportResultModalState } from '../types/userManagement.types';

interface ImportUsersModalProps {
  importModal: ImportModalState;
  onClose: () => void;
  onConfirm: () => void;
  onFileChange: (file: File | null) => void;
  onDownloadTemplate: () => void;
  isLoading: boolean;
}

export const ImportUsersModal: React.FC<ImportUsersModalProps> = ({
  importModal,
  onClose,
  onConfirm,
  onFileChange,
  onDownloadTemplate,
  isLoading,
}) => {
  return (
    <ConfirmModal
      isOpen={importModal.isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="นำเข้า Excel ผู้ใช้"
      message={(
        <div className="mt-4 space-y-4 text-left">
          {importModal.error ? (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{importModal.error}</div>
          ) : null}
          <button
            type="button"
            onClick={onDownloadTemplate}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            ดาวน์โหลดเทมเพลต Excel
          </button>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">ไฟล์ Excel / CSV</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              disabled={isLoading}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700 disabled:opacity-60"
            />
          </label>
          {importModal.file ? (
            <div className="text-xs text-slate-500">เลือกไฟล์แล้ว: {importModal.file.name}</div>
          ) : null}
        </div>
      )}
      confirmLabel="นำเข้า"
      cancelLabel="ยกเลิก"
      isLoading={isLoading}
      variant="info"
    />
  );
};

interface ImportResultModalProps {
  resultModal: ImportResultModalState;
  onClose: () => void;
}

export const ImportResultModal: React.FC<ImportResultModalProps> = ({
  resultModal,
  onClose,
}) => {
  if (!resultModal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" aria-hidden="true" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">นำเข้าข้อมูลเสร็จสิ้น</h3>
        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-md bg-slate-50 px-3 py-3">
            <div className="text-2xl font-bold text-slate-900">{resultModal.created}</div>
            <div className="mt-1 text-xs text-slate-500">สร้างใหม่</div>
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-3">
            <div className="text-2xl font-bold text-slate-900">{resultModal.updated}</div>
            <div className="mt-1 text-xs text-slate-500">อัปเดต</div>
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-3">
            <div className="text-2xl font-bold text-slate-900">{resultModal.skipped}</div>
            <div className="mt-1 text-xs text-slate-500">ข้าม</div>
          </div>
        </div>
        {resultModal.failures.length > 0 ? (
          <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-left text-sm text-red-700">
            <div className="font-semibold">ผิดพลาด: {resultModal.failures.length} รายการ</div>
            <div className="mt-1 whitespace-pre-line text-xs leading-5">
              {resultModal.failures.slice(0, 5).join('\n')}
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          ตกลง
        </button>
      </div>
    </div>
  );
};

