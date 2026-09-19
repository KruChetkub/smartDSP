import React from 'react';
import { Save, Search, Settings2, X } from 'lucide-react';
import type { AllocationForm, AllocationTrancheKey, TrancheDefinition } from '../../types/budgetItems.types';
import type { BudgetUtilizationItemWithAmount } from '../../types/budgetUtilization.types';
import { getBudgetItemSearchLabel } from '../../utils/budgetItems.utils';

interface AllocationEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  saving: boolean;
  allocationForm: AllocationForm;
  setAllocationForm: React.Dispatch<React.SetStateAction<AllocationForm>>;
  allocationItemSearch: string;
  setAllocationItemSearch: (value: string) => void;
  allocationItemSearchResults: Array<{ item: BudgetUtilizationItemWithAmount; label: string }>;
  selectedAllocationItem: BudgetUtilizationItemWithAmount | null;
  trancheDefinitions: TrancheDefinition[];
  onOpenTrancheManager: () => void;
  selectAllocationBudgetItem: (item: BudgetUtilizationItemWithAmount) => void;
  applySelectedAllocationItemValue: (
    item: BudgetUtilizationItemWithAmount | null,
    trancheKey: AllocationTrancheKey,
  ) => void;
  saveAllocationForm: () => Promise<void>;
}

export const AllocationEntryModal: React.FC<AllocationEntryModalProps> = ({
  isOpen,
  onClose,
  saving,
  allocationForm,
  setAllocationForm,
  allocationItemSearch,
  setAllocationItemSearch,
  allocationItemSearchResults,
  selectedAllocationItem,
  trancheDefinitions,
  onOpenTrancheManager,
  selectAllocationBudgetItem,
  applySelectedAllocationItemValue,
  saveAllocationForm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="allocation-entry-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={onClose}
        aria-label="ปิดหน้าต่างจัดสรรงวด"
      />
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-md bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-6">
          <div>
            <h2 id="allocation-entry-title" className="text-lg font-bold text-slate-950">
              จัดสรรงวด
            </h2>
            <p className="mt-1 text-xs text-slate-600">เลือกรายการงบประมาณและบันทึกยอดจัดสรรตามงวด</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-amber-200 bg-white text-slate-600 transition hover:bg-amber-100 disabled:opacity-50"
            aria-label="ปิด"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <section className="flex min-w-0 flex-col rounded-md border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
            <div className="mb-3 space-y-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">จัดสรรงวด</h2>
                <p className="mt-1 text-xs text-slate-500">
                  บันทึกยอดจัดสรรแยกเป็นงวด พร้อมวันที่กำกับของแต่ละรายการงบประมาณ
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenTrancheManager}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-50"
              >
                <Settings2 className="h-4 w-4" aria-hidden="true" />
                จัดการงวด
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-3">
              <div>
                <label
                  htmlFor="allocation-budget-item-search"
                  className="text-xs font-semibold text-slate-600"
                >
                  รายการงบประมาณ
                </label>
                <div className="relative mt-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="allocation-budget-item-search"
                    type="search"
                    value={allocationItemSearch}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setAllocationItemSearch(nextValue);
                      if (
                        selectedAllocationItem &&
                        nextValue !== getBudgetItemSearchLabel(selectedAllocationItem)
                      ) {
                        setAllocationForm((current) => ({ ...current, itemId: '' }));
                        applySelectedAllocationItemValue(null, allocationForm.trancheKey);
                      }
                    }}
                    aria-controls="allocation-budget-item-results"
                    className="h-10 w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                    placeholder="ค้นหาเลขลำดับหรือชื่อรายการ"
                  />
                </div>
                <div
                  id="allocation-budget-item-results"
                  role="listbox"
                  aria-label="ผลการค้นหารายการงบประมาณสำหรับจัดสรรงวด"
                  className="mt-2 max-h-60 overflow-y-auto rounded-md border border-amber-200 bg-white p-1"
                >
                  {allocationItemSearchResults.length > 0 ? (
                    allocationItemSearchResults.map(({ item, label }) => (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={selectedAllocationItem?.id === item.id}
                        onClick={() => selectAllocationBudgetItem(item)}
                        className={`block w-full rounded px-2.5 py-2 text-left text-xs transition ${
                          selectedAllocationItem?.id === item.id
                            ? 'bg-amber-100 font-semibold text-amber-950'
                            : 'text-slate-700 hover:bg-amber-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-4 text-center text-xs text-slate-500">
                      ไม่พบรายการที่ใกล้เคียง
                    </p>
                  )}
                </div>
              </div>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">งวด</span>
                <select
                  value={allocationForm.trancheKey}
                  onChange={(event) => {
                    const nextKey = event.target.value as AllocationTrancheKey;
                    setAllocationForm((current) => ({ ...current, trancheKey: nextKey }));
                    applySelectedAllocationItemValue(selectedAllocationItem, nextKey);
                  }}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                >
                  {trancheDefinitions.map((tranche) => (
                    <option key={tranche.key} value={tranche.key}>
                      {tranche.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">วันที่จัดสรร</span>
                <input
                  type="date"
                  value={allocationForm.allocationDate}
                  onChange={(event) =>
                    setAllocationForm((current) => ({
                      ...current,
                      allocationDate: event.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">จำนวนเงิน</span>
                <input
                  value={allocationForm.amount}
                  onChange={(event) =>
                    setAllocationForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  placeholder="ยอดจัดสรร"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">เลขที่หนังสือ</span>
                <input
                  value={allocationForm.documentNumber}
                  onChange={(event) =>
                    setAllocationForm((current) => ({
                      ...current,
                      documentNumber: event.target.value,
                    }))
                  }
                  maxLength={200}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  placeholder="เช่น สธ 0434.3ว 259"
                />
              </label>
              <button
                type="button"
                onClick={() => void saveAllocationForm()}
                disabled={saving || !allocationForm.itemId}
                className="mt-auto inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                บันทึกงวด
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

