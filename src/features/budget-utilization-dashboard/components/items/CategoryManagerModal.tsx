import React from 'react';
import { Edit3, Plus, Save, Trash2, X } from 'lucide-react';
import type { ItemForm } from '../../types/budgetItems.types';
import type { BudgetUtilizationItemWithAmount } from '../../types/budgetUtilization.types';
import { emptyMainForm } from '../../constants/budgetItems.constants';
import { formFromItem } from '../../utils/budgetItems.utils';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  saving: boolean;
  mainForm: ItemForm;
  setMainForm: React.Dispatch<React.SetStateAction<ItemForm>>;
  mainBudgetItems: BudgetUtilizationItemWithAmount[];
  getCategoryChildCount: (categoryId: string) => number;
  saveMainForm: () => Promise<void>;
  onSetDeleteTarget: (category: BudgetUtilizationItemWithAmount) => void;
  onError: (msg: string) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  saving,
  mainForm,
  setMainForm,
  mainBudgetItems,
  getCategoryChildCount,
  saveMainForm,
  onSetDeleteTarget,
  onError,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-category-manager-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={() => {
          if (saving) return;
          onClose();
          setMainForm(emptyMainForm);
        }}
        aria-label="ปิดหน้าต่าง"
      />
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-md bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <div>
            <h2 id="budget-category-manager-title" className="text-lg font-bold text-slate-950">
              จัดการประเภทหลัก
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              เพิ่ม แก้ไข หรือลบหัวข้อสำหรับจัดกลุ่มรายการงบประมาณ
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (saving) return;
              onClose();
              setMainForm(emptyMainForm);
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
                <span className="text-sm font-medium text-slate-700">ชื่อประเภทหลัก</span>
                <input
                  value={mainForm.itemName}
                  onChange={(event) =>
                    setMainForm((current) => ({ ...current, itemName: event.target.value }))
                  }
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  placeholder="เช่น งบบุคลากร"
                />
              </label>
              <div className="flex gap-2">
                {mainForm.itemId ? (
                  <button
                    type="button"
                    onClick={() => setMainForm(emptyMainForm)}
                    disabled={saving}
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
                  >
                    ยกเลิก
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void saveMainForm()}
                  disabled={saving || !mainForm.itemName.trim()}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {mainForm.itemId ? <Save className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                  {mainForm.itemId ? 'บันทึก' : 'เพิ่ม'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-white">
            {mainBudgetItems.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                ยังไม่มีประเภทหลัก
              </div>
            ) : (
              mainBudgetItems.map((category, index) => {
                const childCount = getCategoryChildCount(category.id);

                return (
                  <div
                    key={category.id}
                    className="grid gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <span className="text-center text-sm font-semibold text-slate-500">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {category.item_name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {childCount} รายการงบประมาณ
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setMainForm(formFromItem(category))}
                        disabled={saving}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Edit3 className="h-4 w-4" aria-hidden="true" />
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (childCount > 0) {
                            onError(
                              'ลบประเภทหลักไม่ได้ เนื่องจากยังมีรายการงบประมาณอยู่ภายใต้ประเภทนี้',
                            );
                            return;
                          }
                          onSetDeleteTarget(category);
                        }}
                        disabled={saving || childCount > 0}
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
        </div>
      </div>
    </div>
  );
};

