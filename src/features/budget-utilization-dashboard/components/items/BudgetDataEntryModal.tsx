import React from 'react';
import { Search, X } from 'lucide-react';
import type { EditableAmountField } from '../../types/budgetItems.types';
import type {
  BudgetUtilizationAmount,
  BudgetUtilizationItemWithAmount,
} from '../../types/budgetUtilization.types';
import { getBudgetItemSearchLabel } from '../../utils/budgetItems.utils';
import { SelectedDisbursementItemDetails } from './SelectedDisbursementItemDetails';

interface BudgetDataEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  saving: boolean;
  canManage: boolean;
  transactionItemSearch: string;
  onTransactionItemSearchChange: (value: string) => void;
  transactionItemSearchResults: Array<{ item: BudgetUtilizationItemWithAmount; label: string }>;
  selectedDisbursementItem: BudgetUtilizationItemWithAmount | null;
  selectedDisbursementAmount: BudgetUtilizationAmount | null;
  displayFiscalYear: number | string;
  onSelectTransactionBudgetItem: (item: BudgetUtilizationItemWithAmount) => void;
  onEditAmount: (field: EditableAmountField, label: string, value: number) => void;
  selectedDisbursementDetailsRef?: React.Ref<HTMLDivElement>;
}

export const BudgetDataEntryModal: React.FC<BudgetDataEntryModalProps> = ({
  isOpen,
  onClose,
  saving,
  canManage,
  transactionItemSearch,
  onTransactionItemSearchChange,
  transactionItemSearchResults,
  selectedDisbursementItem,
  selectedDisbursementAmount,
  displayFiscalYear,
  onSelectTransactionBudgetItem,
  onEditAmount,
  selectedDisbursementDetailsRef,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-data-entry-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={onClose}
        aria-label="ปิดหน้าต่างกรอกข้อมูลงบประมาณ"
      />
      <div className="relative flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-md bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-sky-200 bg-sky-50 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 id="budget-data-entry-title" className="text-lg font-bold text-slate-950">
              กรอกข้อมูลงบประมาณ
            </h2>
            <p className="mt-1 truncate text-xs text-slate-600">
              {selectedDisbursementItem
                ? getBudgetItemSearchLabel(selectedDisbursementItem)
                : 'ค้นหาและเลือกรายการที่ต้องการกรอกข้อมูล'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-sky-200 bg-white text-slate-600 transition hover:bg-sky-100 disabled:opacity-50"
            aria-label="ปิด"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
          <div className="min-w-0 space-y-4">
            <section className="rounded-md border border-sky-200 bg-sky-50/40 p-4 shadow-sm">
              <div className="mb-3">
                <h2 className="text-base font-semibold text-slate-950">
                  เลือกรายการงบประมาณเพื่อกรอกข้อมูล
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  ค้นหาด้วยเลขลำดับหรือชื่อรายการ แล้วกดช่องข้อมูลด้านล่างที่ต้องการเพิ่มหรือแก้ไข
                </p>
              </div>
              <div>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={transactionItemSearch}
                    onChange={(event) => onTransactionItemSearchChange(event.target.value)}
                    aria-controls="budget-transaction-search-results"
                    className="h-11 w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    placeholder="พิมพ์เลขลำดับหรือชื่อรายการงบประมาณ"
                  />
                </div>
                <div
                  id="budget-transaction-search-results"
                  role="listbox"
                  aria-label="ผลการค้นหารายการงบประมาณ"
                  className="mt-2 max-h-72 overflow-y-auto rounded-md border border-sky-200 bg-white p-1"
                >
                  {transactionItemSearchResults.length > 0 ? (
                    transactionItemSearchResults.map(({ item, label }) => (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={selectedDisbursementItem?.id === item.id}
                        onClick={() => onSelectTransactionBudgetItem(item)}
                        className={`block w-full rounded px-3 py-2 text-left text-sm transition ${
                          selectedDisbursementItem?.id === item.id
                            ? 'bg-sky-100 font-semibold text-sky-900'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-4 text-center text-sm text-slate-500">
                      ไม่พบรายการที่ใกล้เคียง
                    </p>
                  )}
                </div>
              </div>
            </section>

            {selectedDisbursementItem && selectedDisbursementAmount ? (
              <div ref={selectedDisbursementDetailsRef} className="scroll-mt-24 min-w-0">
                <SelectedDisbursementItemDetails
                  item={selectedDisbursementItem}
                  amount={selectedDisbursementAmount}
                  fiscalYear={displayFiscalYear}
                  canEdit={canManage}
                  onEditAmount={onEditAmount}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

