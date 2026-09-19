import React from 'react';
import { Save, X } from 'lucide-react';
import type { CellEditState } from '../../types/budgetItems.types';
import { amountFieldDisplaySigns, cellEditToneClasses } from '../../constants/budgetItems.constants';

interface CellEditModalProps {
  cellEdit: CellEditState | null;
  onClose: () => void;
  onSave: () => Promise<void>;
  saving: boolean;
  cellEditError: string | null;
  setCellEdit: React.Dispatch<React.SetStateAction<CellEditState | null>>;
  cellEditHasRecordedData: boolean;
}

export const CellEditModal: React.FC<CellEditModalProps> = ({
  cellEdit,
  onClose,
  onSave,
  saving,
  cellEditError,
  setCellEdit,
  cellEditHasRecordedData,
}) => {
  if (!cellEdit) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-cell-edit-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={onClose}
        aria-label="ปิดหน้าต่างแก้ไขตัวเลข"
      />
      <div
        className={`relative w-full max-w-lg overflow-hidden rounded-md bg-white shadow-2xl ${
          cellEditToneClasses[cellEdit.tone].border
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2
              id="budget-cell-edit-title"
              className={`text-lg font-bold ${cellEditToneClasses[cellEdit.tone].heading}`}
            >
              {cellEditHasRecordedData ? 'แก้ไข' : 'เพิ่ม'}
              {cellEdit.label}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {cellEdit.item.sequence_label ? `${cellEdit.item.sequence_label} ` : ''}
              {cellEdit.item.item_name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            title="ปิด"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-4 bg-slate-50 p-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">จำนวนเงิน</span>
            <div className="relative mt-1">
              {cellEdit.field && amountFieldDisplaySigns[cellEdit.field] ? (
                <span
                  className={`pointer-events-none absolute inset-y-0 left-3 flex items-center text-lg font-semibold ${
                    cellEditToneClasses[cellEdit.tone].heading
                  }`}
                >
                  {amountFieldDisplaySigns[cellEdit.field]}
                </span>
              ) : null}
              <input
                value={cellEdit.value}
                onChange={(event) =>
                  setCellEdit((current) =>
                    current ? { ...current, value: event.target.value } : current,
                  )
                }
                inputMode="decimal"
                autoFocus
                className={`h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-right text-base outline-none focus:ring-2 ${
                  cellEdit.field && amountFieldDisplaySigns[cellEdit.field] ? 'pl-9' : ''
                } ${cellEditToneClasses[cellEdit.tone].input}`}
                placeholder="0.00"
              />
            </div>
          </label>
          {cellEdit.tranche ? (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">วันที่จัดสรร</span>
              <input
                type="date"
                value={cellEdit.allocationDate}
                onChange={(event) =>
                  setCellEdit((current) =>
                    current ? { ...current, allocationDate: event.target.value } : current,
                  )
                }
                className={`mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 ${
                  cellEditToneClasses[cellEdit.tone].input
                }`}
              />
            </label>
          ) : null}
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              เลขที่หนังสือ <span className="text-xs font-normal text-slate-500"></span>
            </span>
            <input
              value={cellEdit.documentNumber}
              onChange={(event) =>
                setCellEdit((current) =>
                  current ? { ...current, documentNumber: event.target.value } : current,
                )
              }
              maxLength={200}
              className={`mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 ${
                cellEditToneClasses[cellEdit.tone].input
              }`}
              placeholder="เช่น สธ 0434.3ว 259"
            />
          </label>
          <p
            className={`rounded-md border px-3 py-2 text-xs ${
              cellEditToneClasses[cellEdit.tone].note
            }`}
          >
            ระบบจะคำนวณยอดสุทธิ ผลรวม คงเหลือ และร้อยละใหม่หลังบันทึก
          </p>
          {cellEditError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {cellEditError}
            </p>
          ) : null}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving}
            className={`inline-flex items-center gap-2 rounded-md px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
              cellEditToneClasses[cellEdit.tone].button
            }`}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? 'กำลังบันทึก...' : cellEditHasRecordedData ? 'บันทึกการแก้ไข' : 'เพิ่มข้อมูล'}
          </button>
        </div>
      </div>
    </div>
  );
};

