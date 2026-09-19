import React from 'react';
import { Edit3, Plus, Save, Trash2, X } from 'lucide-react';
import type { TrancheDefinition, TrancheForm } from '../../types/budgetItems.types';
import { emptyTrancheForm } from '../../constants/budgetItems.constants';

interface TrancheManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  saving: boolean;
  trancheForm: TrancheForm;
  setTrancheForm: React.Dispatch<React.SetStateAction<TrancheForm>>;
  trancheDrafts: TrancheDefinition[];
  setTrancheDrafts: React.Dispatch<React.SetStateAction<TrancheDefinition[]>>;
  trancheDefinitions: TrancheDefinition[];
  saveTrancheDraft: () => void;
  deleteTrancheDraft: (trancheKey: string) => void;
  saveTrancheDefinitions: () => Promise<void>;
  getTrancheUsageCount: (trancheKey: string) => number;
}

export const TrancheManagerModal: React.FC<TrancheManagerModalProps> = ({
  isOpen,
  onClose,
  saving,
  trancheForm,
  setTrancheForm,
  trancheDrafts,
  setTrancheDrafts,
  trancheDefinitions,
  saveTrancheDraft,
  deleteTrancheDraft,
  saveTrancheDefinitions,
  getTrancheUsageCount,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-tranche-manager-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={() => {
          if (saving) return;
          onClose();
          setTrancheDrafts(trancheDefinitions);
          setTrancheForm(emptyTrancheForm);
        }}
        aria-label="ปิดหน้าต่าง"
      />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-md bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <div>
            <h2 id="budget-tranche-manager-title" className="text-lg font-bold text-slate-950">
              จัดการงวดจัดสรร
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              เพิ่ม แก้ไข หรือลบงวดสำหรับบันทึกยอดจัดสรรตามวันที่
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (saving) return;
              onClose();
              setTrancheDrafts(trancheDefinitions);
              setTrancheForm(emptyTrancheForm);
            }}
            disabled={saving}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="ปิด"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">ชื่องวดจัดสรร</span>
                <input
                  value={trancheForm.label}
                  onChange={(event) =>
                    setTrancheForm((current) => ({ ...current, label: event.target.value }))
                  }
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  placeholder="เช่น จัดสรรงวด 1"
                />
              </label>
              <div className="flex gap-2">
                {trancheForm.key ? (
                  <button
                    type="button"
                    onClick={() => setTrancheForm(emptyTrancheForm)}
                    disabled={saving}
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
                  >
                    ยกเลิก
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={saveTrancheDraft}
                  disabled={saving || !trancheForm.label.trim()}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {trancheForm.key ? <Save className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                  {trancheForm.key ? 'บันทึก' : 'เพิ่ม'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-white">
            {trancheDrafts.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                ยังไม่มีงวดจัดสรร
              </div>
            ) : (
              trancheDrafts.map((tranche, index) => {
                const usageCount = getTrancheUsageCount(tranche.key);

                return (
                  <div
                    key={tranche.key}
                    className="grid gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <span className="text-center text-sm font-semibold text-slate-500">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {tranche.label}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {usageCount} รายการงบประมาณที่ใช้งานงวดนี้
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setTrancheForm({ key: tranche.key, label: tranche.label })
                        }
                        disabled={saving}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Edit3 className="h-4 w-4" aria-hidden="true" />
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTrancheDraft(tranche.key)}
                        disabled={saving || usageCount > 0 || trancheDrafts.length <= 1}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        ลบ
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setTrancheDrafts(trancheDefinitions);
                setTrancheForm(emptyTrancheForm);
                onClose();
              }}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => void saveTrancheDefinitions()}
              disabled={trancheDrafts.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              บันทึกการจัดการงวด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

