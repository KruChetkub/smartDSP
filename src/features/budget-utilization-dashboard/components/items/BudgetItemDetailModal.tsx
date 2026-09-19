import React from 'react';
import { Edit3, Plus, Save, X } from 'lucide-react';
import type {
  CellEditTone,
  EditableAmountField,
  ItemForm,
  TrancheDefinition,
} from '../../types/budgetItems.types';
import type {
  BudgetUtilizationAmount,
  BudgetUtilizationItemWithAmount,
} from '../../types/budgetUtilization.types';
import { formatBudgetAmount } from '../../utils/budgetUtilizationCalculations';
import { detailAmountToneClasses } from '../../constants/budgetItems.constants';
import { formatSignedBudgetAmount, getDocumentNumber, getItemTrancheValue } from '../../utils/budgetItems.utils';

interface BudgetItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  saving: boolean;
  canManage: boolean;
  editModalItem: BudgetUtilizationItemWithAmount | null;
  editModalForm: ItemForm;
  setEditModalForm: React.Dispatch<React.SetStateAction<ItemForm>>;
  editModalParent: BudgetUtilizationItemWithAmount | null;
  editModalHasChildren: boolean;
  editModalAmount: BudgetUtilizationAmount | null;
  trancheDefinitions: TrancheDefinition[];
  editModalError: string | null;
  onSave: () => Promise<void>;
  onOpenAllocationCellEdit: (
    event: React.MouseEvent<HTMLButtonElement> | null,
    item: BudgetUtilizationItemWithAmount,
    tranche: TrancheDefinition,
  ) => void;
  onOpenAmountCellEdit: (
    event: React.MouseEvent<HTMLButtonElement> | null,
    item: BudgetUtilizationItemWithAmount,
    field: EditableAmountField,
    label: string,
    value: number,
  ) => void;
}

export const BudgetItemDetailModal: React.FC<BudgetItemDetailModalProps> = ({
  isOpen,
  onClose,
  saving,
  canManage,
  editModalItem,
  editModalForm,
  setEditModalForm,
  editModalParent,
  editModalHasChildren,
  editModalAmount,
  trancheDefinitions,
  editModalError,
  onSave,
  onOpenAllocationCellEdit,
  onOpenAmountCellEdit,
}) => {
  if (!isOpen || !editModalItem) return null;

  const renderDetailAmount = (
    label: string,
    value: number,
    tone: CellEditTone,
    onClick: () => void,
    subtitle?: string,
    documentNumber?: string,
    sign?: '+' | '-',
  ) => {
    const hasData = Math.abs(value) > 0.005 || Boolean(subtitle) || Boolean(documentNumber);
    const formattedValue = sign
      ? formatSignedBudgetAmount(value, sign)
      : formatBudgetAmount(value);

    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex h-full w-full flex-col justify-between rounded-md border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-sky-300 ${
          detailAmountToneClasses[tone]
        }`}
        title={`แก้ไข ${label}`}
      >
        <div className="flex w-full items-start justify-between gap-2">
          <span className="text-xs font-semibold">{label}</span>
          {hasData ? (
            <Edit3 className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
          ) : (
            <Plus className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
          )}
        </div>
        <div className="mt-2 w-full text-right">
          <span className="block font-mono text-base font-bold tabular-nums">
            {formattedValue} บาท
          </span>
          {documentNumber ? (
            <span className="mt-1 block truncate text-[11px] font-normal opacity-85">
              เลขที่ {documentNumber}
            </span>
          ) : null}
          {subtitle ? (
            <span className="mt-0.5 block truncate text-[11px] font-normal opacity-85">
              {subtitle}
            </span>
          ) : null}
        </div>
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-item-edit-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={onClose}
        aria-label="ปิดหน้าต่างแก้ไข"
      />
      <div className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-md bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 id="budget-item-edit-title" className="text-lg font-bold text-slate-950">
              รายละเอียดรายการงบประมาณ
            </h2>
            <p className="mt-1 truncate text-sm text-slate-600">
              {editModalItem.sequence_label ? `${editModalItem.sequence_label} ` : ''}
              {editModalItem.item_name}
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
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-slate-50 p-4 sm:p-6">
          <section className="border-b border-slate-200 bg-white pb-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-950">ข้อมูลโครงการ</h3>
                <p className="mt-1 text-xs text-slate-500">
                  ระดับข้อมูล: {editModalItem.row_type}
                  {editModalParent
                    ? ` · อยู่ภายใต้ ${editModalParent.sequence_label ?? ''} ${editModalParent.item_name}`
                    : ' · ระดับหลัก'}
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">ลำดับรายการ</span>
                <input
                  value={editModalForm.sequenceLabel}
                  onChange={(event) =>
                    setEditModalForm((current) => ({
                      ...current,
                      sequenceLabel: event.target.value,
                    }))
                  }
                  disabled={!canManage}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-600"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">ชื่อรายการงบประมาณ</span>
                <input
                  value={editModalForm.itemName}
                  onChange={(event) =>
                    setEditModalForm((current) => ({
                      ...current,
                      itemName: event.target.value,
                    }))
                  }
                  disabled={!canManage}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-600"
                />
              </label>
              {editModalItem.row_type !== 'budget_category' ? (
                <>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">ผลผลิต</span>
                    <input
                      value={editModalForm.outputLabel}
                      onChange={(event) =>
                        setEditModalForm((current) => ({
                          ...current,
                          outputLabel: event.target.value,
                        }))
                      }
                      disabled={!canManage}
                      className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">ลำดับกิจกรรม</span>
                    <input
                      value={editModalForm.activitySequenceLabel}
                      onChange={(event) =>
                        setEditModalForm((current) => ({
                          ...current,
                          activitySequenceLabel: event.target.value,
                        }))
                      }
                      disabled={!canManage}
                      className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-sm font-medium text-slate-700">ชื่อกิจกรรม</span>
                    <input
                      value={editModalForm.activityLabel}
                      onChange={(event) =>
                        setEditModalForm((current) => ({
                          ...current,
                          activityLabel: event.target.value,
                        }))
                      }
                      disabled={!canManage}
                      className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">วงเงินตามแผน</span>
                    <input
                      value={editModalForm.plannedBudgetAmount}
                      onChange={(event) =>
                        setEditModalForm((current) => ({
                          ...current,
                          plannedBudgetAmount: event.target.value,
                        }))
                      }
                      disabled={!canManage || editModalHasChildren}
                      className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-right text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-600"
                      inputMode="decimal"
                    />
                  </label>
                </>
              ) : null}
              {editModalItem.source_sheet_name || editModalItem.source_row_number ? (
                <div className="text-xs text-slate-500 sm:col-span-2">
                  แหล่งข้อมูล: {editModalItem.source_sheet_name ?? '-'} · แถว{' '}
                  {editModalItem.source_row_number ?? '-'}
                </div>
              ) : null}
            </div>
          </section>

          {editModalAmount ? (
            <>
              <section className="border-b border-amber-200 pb-5">
                <h3 className="text-base font-bold text-amber-900">จัดสรรงวด</h3>
                <p className="mt-1 text-xs text-slate-500">กดรายการเพื่อแก้ไขยอดและวันที่จัดสรร</p>
                <div className="mt-4 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {trancheDefinitions.map((tranche) => {
                    const displayValue =
                      tranche.trancheNumber === 1
                        ? editModalAmount.allocation_tranche_1_amount
                        : tranche.trancheNumber === 2
                          ? editModalAmount.allocation_tranche_2_amount
                          : tranche.trancheNumber === 3
                            ? editModalAmount.allocation_tranche_3_amount
                            : getItemTrancheValue(editModalItem, tranche);
                    const allocation = editModalItem.allocations?.find(
                      (entry) => entry.tranche_id === tranche.key,
                    );
                    return (
                      <div key={tranche.key} className="h-full min-w-0">
                        {renderDetailAmount(
                          tranche.label,
                          displayValue,
                          'amber',
                          () => onOpenAllocationCellEdit(null, editModalItem, tranche),
                          allocation?.allocation_date
                            ? `วันที่จัดสรร ${allocation.allocation_date}`
                            : undefined,
                          getDocumentNumber(editModalItem, `allocation:${tranche.key}`),
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="grid gap-5 lg:grid-cols-3">
                <div className="border-t-4 border-cyan-600 pt-3">
                  <h3 className="text-sm font-bold text-cyan-900">ส่วนกลางกรมฯ</h3>
                  <div className="mt-3 grid gap-3">
                    {renderDetailAmount(
                      'รับโอน (2)',
                      editModalAmount.central_transfer_in_amount,
                      'cyan',
                      () =>
                        onOpenAmountCellEdit(
                          null,
                          editModalItem,
                          'centralTransferInAmount',
                          'ส่วนกลางกรมฯ รับโอน',
                          editModalItem.amount.central_transfer_in_amount,
                        ),
                      undefined,
                      getDocumentNumber(editModalItem, 'central_transfer_in'),
                      '+',
                    )}
                    {renderDetailAmount(
                      'โอนออก (3)',
                      editModalAmount.central_transfer_out_amount,
                      'cyan',
                      () =>
                        onOpenAmountCellEdit(
                          null,
                          editModalItem,
                          'centralTransferOutAmount',
                          'ส่วนกลางกรมฯ โอนออก',
                          editModalItem.amount.central_transfer_out_amount,
                        ),
                      undefined,
                      getDocumentNumber(editModalItem, 'central_transfer_out'),
                      '-',
                    )}
                  </div>
                </div>
                <div className="border-t-4 border-blue-600 pt-3">
                  <h3 className="text-sm font-bold text-blue-900">ภายในกรม</h3>
                  <div className="mt-3 grid gap-3">
                    {renderDetailAmount(
                      'ขอเพิ่ม',
                      editModalAmount.department_request_increase_amount,
                      'blue',
                      () =>
                        onOpenAmountCellEdit(
                          null,
                          editModalItem,
                          'departmentRequestIncreaseAmount',
                          'ภายในกรม ขอเพิ่ม',
                          editModalItem.amount.department_request_increase_amount,
                        ),
                      undefined,
                      getDocumentNumber(editModalItem, 'department_request_increase'),
                      '+',
                    )}
                    {renderDetailAmount(
                      'โอนออก',
                      editModalAmount.department_transfer_out_amount,
                      'blue',
                      () =>
                        onOpenAmountCellEdit(
                          null,
                          editModalItem,
                          'departmentTransferOutAmount',
                          'ภายในกรม โอนออก',
                          editModalItem.amount.department_transfer_out_amount,
                        ),
                      undefined,
                      getDocumentNumber(editModalItem, 'department_transfer_out'),
                      '-',
                    )}
                  </div>
                </div>
                <div className="border-t-4 border-orange-500 pt-3">
                  <h3 className="text-sm font-bold text-orange-900">ภายในกอง</h3>
                  <div className="mt-3 grid gap-3">
                    {renderDetailAmount(
                      'รับโอน (2)',
                      editModalAmount.division_transfer_in_amount,
                      'orange',
                      () =>
                        onOpenAmountCellEdit(
                          null,
                          editModalItem,
                          'divisionTransferInAmount',
                          'ภายในกอง รับโอน',
                          editModalItem.amount.division_transfer_in_amount,
                        ),
                      undefined,
                      getDocumentNumber(editModalItem, 'division_transfer_in'),
                      '+',
                    )}
                    {renderDetailAmount(
                      'โอนออก (3)',
                      editModalAmount.division_transfer_out_amount,
                      'orange',
                      () =>
                        onOpenAmountCellEdit(
                          null,
                          editModalItem,
                          'divisionTransferOutAmount',
                          'ภายในกอง โอนออก',
                          editModalItem.amount.division_transfer_out_amount,
                        ),
                      undefined,
                      getDocumentNumber(editModalItem, 'division_transfer_out'),
                      '-',
                    )}
                  </div>
                </div>
              </section>

              <section className="grid gap-5 border-t border-slate-200 pt-5 lg:grid-cols-2">
                <div className="border-t-4 border-purple-600 pt-3">
                  <h3 className="text-sm font-bold text-purple-900">ผูกพัน</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {renderDetailAmount(
                      'มี PO (4)',
                      editModalAmount.committed_po_amount,
                      'purple',
                      () =>
                        onOpenAmountCellEdit(
                          null,
                          editModalItem,
                          'committedPoAmount',
                          'ผูกพัน มี PO',
                          editModalItem.amount.committed_po_amount,
                        ),
                      undefined,
                      getDocumentNumber(editModalItem, 'committed_po'),
                    )}
                    {renderDetailAmount(
                      'ไม่มี PO (5)',
                      editModalAmount.committed_without_po_amount,
                      'purple',
                      () =>
                        onOpenAmountCellEdit(
                          null,
                          editModalItem,
                          'committedWithoutPoAmount',
                          'ผูกพัน ไม่มี PO',
                          editModalItem.amount.committed_without_po_amount,
                        ),
                      undefined,
                      getDocumentNumber(editModalItem, 'committed_without_po'),
                    )}
                  </div>
                </div>
                <div className="border-t-4 border-emerald-600 pt-3">
                  <h3 className="text-sm font-bold text-emerald-900">เบิก-จ่าย</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {renderDetailAmount(
                      'เบิกจ่ายทั่วไป (7)',
                      editModalAmount.disbursed_general_amount,
                      'emerald',
                      () =>
                        onOpenAmountCellEdit(
                          null,
                          editModalItem,
                          'disbursedGeneralAmount',
                          'เบิกจ่ายทั่วไป',
                          editModalItem.amount.disbursed_general_amount,
                        ),
                      undefined,
                      getDocumentNumber(editModalItem, 'disbursed_general'),
                    )}
                    {renderDetailAmount(
                      'เงินยืมราชการ (8)',
                      editModalAmount.disbursed_advance_amount,
                      'emerald',
                      () =>
                        onOpenAmountCellEdit(
                          null,
                          editModalItem,
                          'disbursedAdvanceAmount',
                          'เงินยืมราชการ',
                          editModalItem.amount.disbursed_advance_amount,
                        ),
                      undefined,
                      getDocumentNumber(editModalItem, 'disbursed_advance'),
                    )}
                  </div>
                </div>
              </section>

              <section className="border-t border-slate-300 pt-5">
                <div className="mb-3">
                  <h3 className="text-base font-bold text-slate-950">ผลการคำนวณ</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    ข้อมูลส่วนนี้คำนวณจากรายการข้างต้นและไม่เปิดให้แก้ไขโดยตรง
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-md border border-lime-300 bg-lime-50 p-3">
                    <span className="text-xs text-lime-800">
                      ยอดสุทธิหลังโอนเปลี่ยนแปลง (1)
                    </span>
                    <strong className="mt-1 block text-right text-lime-950">
                      {formatBudgetAmount(editModalAmount.net_budget_after_transfer_amount)} บาท
                    </strong>
                  </div>
                  <div className="rounded-md border border-purple-200 bg-purple-50 p-3">
                    <span className="text-xs text-purple-800">ผูกพันรวม (6)</span>
                    <strong className="mt-1 block text-right text-purple-950">
                      {formatBudgetAmount(editModalAmount.committed_total_amount)} บาท
                    </strong>
                  </div>
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                    <span className="text-xs text-emerald-800">เบิกจ่ายรวม (9)</span>
                    <strong className="mt-1 block text-right text-emerald-950">
                      {formatBudgetAmount(editModalAmount.disbursed_total_amount)} บาท
                    </strong>
                  </div>
                  <div className="rounded-md border border-sky-200 bg-sky-50 p-3">
                    <span className="text-xs text-sky-800">รวม (10)</span>
                    <strong className="mt-1 block text-right text-sky-950">
                      {formatBudgetAmount(editModalAmount.utilization_total_amount)} บาท
                    </strong>
                  </div>
                  <div
                    className={`rounded-md border p-3 ${
                      editModalAmount.remaining_amount < 0
                        ? 'border-red-300 bg-red-50'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-xs text-slate-600">คงเหลือ (11)</span>
                    <strong
                      className={`mt-1 block text-right ${
                        editModalAmount.remaining_amount < 0 ? 'text-red-700' : 'text-slate-950'
                      }`}
                    >
                      {formatBudgetAmount(editModalAmount.remaining_amount)} บาท
                    </strong>
                  </div>
                  <div className="rounded-md border border-teal-200 bg-teal-50 p-3">
                    <span className="text-xs text-teal-800">ร้อยละเบิกจ่าย (12)</span>
                    <strong className="mt-1 block text-right text-teal-950">
                      {formatBudgetAmount(editModalAmount.disbursement_rate ?? 0)}%
                    </strong>
                  </div>
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                    <span className="text-xs text-blue-800">ร้อยละรวม PO</span>
                    <strong className="mt-1 block text-right text-blue-950">
                      {formatBudgetAmount(editModalAmount.utilization_with_po_rate ?? 0)}%
                    </strong>
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </div>
        {editModalError ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {editModalError}
          </p>
        ) : null}
        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            ปิด
          </button>
          {canManage ? (
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={saving || !editModalForm.itemName.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-sky-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {saving ? 'กำลังบันทึก...' : 'บันทึกรายละเอียด'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

