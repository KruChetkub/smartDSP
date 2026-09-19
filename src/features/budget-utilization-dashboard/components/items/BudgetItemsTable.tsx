import React from 'react';
import { Calculator, Edit3, Plus, Search, Trash2 } from 'lucide-react';
import type { EditableAmountField, TrancheDefinition } from '../../types/budgetItems.types';
import type {
  BudgetUtilizationAmount,
  BudgetUtilizationDashboardSummary,
  BudgetUtilizationItemWithAmount,
} from '../../types/budgetUtilization.types';
import { formatBudgetAmount, normalizeAmount } from '../../utils/budgetUtilizationCalculations';
import { formatSignedBudgetAmount, getDocumentNumber } from '../../utils/budgetItems.utils';

interface BudgetItemsTableProps {
  canManage: boolean;
  loading: boolean;
  summary: BudgetUtilizationDashboardSummary | null;
  keyword: string;
  setKeyword: (keyword: string) => void;
  onOpenFormulaAudit: () => void;
  displayFiscalYear: number | string;
  trancheDefinitions: TrancheDefinition[];
  filteredItems: BudgetUtilizationItemWithAmount[];
  tableTotals: BudgetUtilizationAmount;
  rollupMap: Map<string, BudgetUtilizationAmount>;
  getDirectChildCount: (id: string) => number;
  onStartEdit: (item: BudgetUtilizationItemWithAmount) => void;
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
  onSetDeleteTarget: (item: BudgetUtilizationItemWithAmount) => void;
  onError: (msg: string) => void;
}

export const BudgetItemsTable: React.FC<BudgetItemsTableProps> = ({
  canManage,
  loading,
  summary,
  keyword,
  setKeyword,
  onOpenFormulaAudit,
  displayFiscalYear,
  trancheDefinitions,
  filteredItems,
  tableTotals,
  rollupMap,
  getDirectChildCount,
  onStartEdit,
  onOpenAllocationCellEdit,
  onOpenAmountCellEdit,
  onSetDeleteTarget,
  onError,
}) => {
  return (
    <section className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="sticky top-[121px] z-40 flex flex-col gap-3 rounded-t-md border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:top-[65px]">
        <h2 className="text-base font-semibold text-slate-950">รายการงบประมาณทั้งหมด</h2>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onOpenFormulaAudit}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-800 transition hover:border-sky-300 hover:bg-sky-100"
          >
            <Calculator className="h-4 w-4" aria-hidden="true" />
            ตรวจสอบสูตรและโครงสร้าง
          </button>
          <label className="relative block w-full sm:w-80">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              placeholder="ค้นหารายการงบประมาณ"
            />
          </label>
        </div>
      </div>
      <div className="max-h-[calc(100vh-9rem)] min-h-[420px] overflow-auto rounded-b-md">
        <table
          className="divide-y divide-slate-100 text-sm"
          style={{ minWidth: `${2200 + trancheDefinitions.length * 120}px` }}
        >
          <thead className="sticky top-0 z-20 bg-slate-50 text-left text-xs font-semibold text-slate-700 shadow-sm">
            <tr>
              <th
                rowSpan={2}
                className="sticky left-0 z-30 min-w-[320px] border border-slate-200 bg-white px-4 py-3 text-center align-middle shadow-[2px_0_0_0_rgb(226_232_240)]"
              >
                ชื่อโครงการ
              </th>
              <th
                rowSpan={2}
                className="border border-slate-200 bg-white px-4 py-3 text-center align-middle"
              >
                วงเงินตามแผน
                <br />ปี {displayFiscalYear}
              </th>
              {trancheDefinitions.map((tranche) => (
                <th
                  key={tranche.key}
                  rowSpan={2}
                  className="min-w-[120px] border border-amber-300 bg-amber-600 px-3 py-3 text-center align-middle text-white"
                >
                  <span className="block whitespace-normal">{tranche.label}</span>
                  <span className="mt-1 block font-normal text-amber-50">
                    ({tranche.trancheNumber})
                  </span>
                </th>
              ))}
              <th
                rowSpan={2}
                className="border border-slate-200 bg-lime-50 px-4 py-3 text-center align-middle"
              >
                ยอดสุทธิงบประมาณ
                <br />
                {displayFiscalYear} หลังโอนเปลี่ยนแปลง
                <br />
                (1)
              </th>
              <th
                colSpan={2}
                className="border border-cyan-300 bg-cyan-700 px-4 py-2 text-center font-bold text-white"
              >
                ส่วนกลางกรมฯ
              </th>
              <th
                colSpan={2}
                className="border border-blue-300 bg-blue-700 px-4 py-2 text-center font-bold text-white"
              >
                ภายในกรม
              </th>
              <th
                colSpan={2}
                className="border border-orange-300 bg-orange-600 px-4 py-2 text-center font-bold text-white"
              >
                ภายในกอง
              </th>
              <th
                colSpan={3}
                className="border border-purple-300 bg-purple-700 px-4 py-2 text-center font-bold text-white"
              >
                ผูกพัน
              </th>
              <th
                colSpan={3}
                className="border border-emerald-300 bg-emerald-700 px-4 py-2 text-center font-bold text-white"
              >
                เบิก-จ่าย
              </th>
              <th
                rowSpan={2}
                className="border border-slate-200 bg-white px-4 py-3 text-center align-middle"
              >
                รวม
                <br />
                (10)
                <br />
                =(6)+(9)
              </th>
              <th
                rowSpan={2}
                className="border border-slate-200 bg-white px-4 py-3 text-center align-middle"
              >
                คงเหลือ
                <br />
                (11)
                <br />
                (1)-(10)
              </th>
              <th
                rowSpan={2}
                className="border border-slate-200 bg-white px-4 py-3 text-center align-middle"
              >
                เบิกจ่ายตามจัดสรร
                <br />
                ร้อยละ
                <br />
                (12)
                <br />
                (9)*100/(1)
              </th>
              <th
                rowSpan={2}
                className="border border-slate-200 bg-sky-100 px-4 py-3 text-center align-middle"
              >
                เบิกจ่ายตามจัดสรร
                <br />
                ร้อยละ
                <br />
                (รวม PO)
              </th>
              {canManage ? (
                <th
                  rowSpan={2}
                  className="border border-slate-200 bg-white px-4 py-3 text-center align-middle"
                >
                  จัดการ
                </th>
              ) : null}
            </tr>
            <tr>
              <th className="border border-cyan-200 bg-cyan-50 px-4 py-2 text-center text-cyan-900">
                รับโอน
                <br />
                (2)
              </th>
              <th className="border border-cyan-200 bg-cyan-50 px-4 py-2 text-center text-cyan-900">
                โอนออก
                <br />
                (3)
              </th>
              <th className="border border-blue-200 bg-blue-50 px-4 py-2 text-center text-blue-900">
                ขอเพิ่ม
              </th>
              <th className="border border-blue-200 bg-blue-50 px-4 py-2 text-center text-blue-900">
                โอนออก
              </th>
              <th className="border border-orange-200 bg-orange-50 px-4 py-2 text-center text-orange-900">
                รับโอน
                <br />
                (2)
              </th>
              <th className="border border-orange-200 bg-orange-50 px-4 py-2 text-center text-orange-900">
                โอนออก
                <br />
                (3)
              </th>
              <th className="border border-purple-200 bg-purple-50 px-4 py-2 text-center text-purple-900">
                มี PO
                <br />
                (4)
              </th>
              <th className="border border-purple-200 bg-purple-50 px-4 py-2 text-center text-purple-900">
                ไม่มี PO
                <br />
                (5)
              </th>
              <th className="border border-purple-200 bg-purple-50 px-4 py-2 text-center text-purple-900">
                รวม
                <br />
                (6)
                <br />
                =(4)+(5)
              </th>
              <th className="border border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-emerald-900">
                เบิกจ่ายทั่วไป
                <br />
                (7)
              </th>
              <th className="border border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-emerald-900">
                เงินยืมราชการ
                <br />
                (8)
              </th>
              <th className="border border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-emerald-900">
                รวม
                <br />
                (9)
                <br />
                =(7)+(8)
              </th>
            </tr>
            <tr className="border-t-2 border-slate-300 bg-slate-900 text-white shadow-sm">
              <th className="sticky left-0 z-30 min-w-[320px] border-r border-slate-700 bg-slate-900 px-4 py-3 text-left">
                รวมทั้งสิ้น ({filteredItems.length.toLocaleString()} รายการ)
              </th>
              <td className="px-4 py-3 text-right">
                {formatBudgetAmount(tableTotals.planned_budget_amount)}
              </td>
              {trancheDefinitions.map((tranche) => {
                const trancheTotal =
                  tranche.trancheNumber === 1
                    ? tableTotals.allocation_tranche_1_amount
                    : tranche.trancheNumber === 2
                      ? tableTotals.allocation_tranche_2_amount
                      : tranche.trancheNumber === 3
                        ? tableTotals.allocation_tranche_3_amount
                        : 0;
                return (
                  <td key={`total-${tranche.key}`} className="px-3 py-3 text-right text-amber-300">
                    {formatBudgetAmount(trancheTotal)}
                  </td>
                );
              })}
              <td className="px-4 py-3 text-right text-lime-400">
                {formatBudgetAmount(tableTotals.net_budget_after_transfer_amount)}
              </td>
              <td className="px-4 py-3 text-right">
                {formatSignedBudgetAmount(tableTotals.central_transfer_in_amount, '+')}
              </td>
              <td className="px-4 py-3 text-right">
                {formatSignedBudgetAmount(tableTotals.central_transfer_out_amount, '-')}
              </td>
              <td className="px-4 py-3 text-right">
                {formatSignedBudgetAmount(tableTotals.department_request_increase_amount, '+')}
              </td>
              <td className="px-4 py-3 text-right">
                {formatSignedBudgetAmount(tableTotals.department_transfer_out_amount, '-')}
              </td>
              <td className="px-4 py-3 text-right">
                {formatSignedBudgetAmount(tableTotals.division_transfer_in_amount, '+')}
              </td>
              <td className="px-4 py-3 text-right">
                {formatSignedBudgetAmount(tableTotals.division_transfer_out_amount, '-')}
              </td>
              <td className="px-4 py-3 text-right text-purple-300">
                {formatBudgetAmount(tableTotals.committed_po_amount)}
              </td>
              <td className="px-4 py-3 text-right text-purple-300">
                {formatBudgetAmount(tableTotals.committed_without_po_amount)}
              </td>
              <td className="px-4 py-3 text-right text-purple-200">
                {formatBudgetAmount(tableTotals.committed_total_amount)}
              </td>
              <td className="px-4 py-3 text-right text-emerald-300">
                {formatBudgetAmount(tableTotals.disbursed_general_amount)}
              </td>
              <td className="px-4 py-3 text-right text-emerald-300">
                {formatBudgetAmount(tableTotals.disbursed_advance_amount)}
              </td>
              <td className="px-4 py-3 text-right text-emerald-200">
                {formatBudgetAmount(tableTotals.disbursed_total_amount)}
              </td>
              <td className="px-4 py-3 text-right text-yellow-300">
                {formatBudgetAmount(tableTotals.utilization_total_amount)}
              </td>
              <td className="px-4 py-3 text-right text-sky-300">
                {formatBudgetAmount(tableTotals.remaining_amount)}
              </td>
              <td className="px-4 py-3 text-right text-teal-300">
                {formatBudgetAmount(tableTotals.disbursement_rate ?? 0)}%
              </td>
              <td className="px-4 py-3 text-right text-sky-300">
                {formatBudgetAmount(tableTotals.utilization_with_po_rate ?? 0)}%
              </td>
              {canManage ? <td></td> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && !summary ? (
              <tr>
                <td
                  colSpan={trancheDefinitions.length + (canManage ? 20 : 19)}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td
                  colSpan={trancheDefinitions.length + (canManage ? 20 : 19)}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  ยังไม่มีรายการงบประมาณ
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isCategory = item.parent_id === null;
                const isMajorProject =
                  item.row_type === 'major_project' && getDirectChildCount(item.id) > 0;
                const isSubActivity =
                  item.row_type === 'sub_project' && getDirectChildCount(item.id) > 0;
                const isHeading = isCategory || isMajorProject || isSubActivity;
                const itemAmount = rollupMap.get(item.id) ?? normalizeAmount(item.amount);
                const netTotal = itemAmount.net_budget_after_transfer_amount;
                const utilizationTotal = itemAmount.utilization_total_amount;
                const remainingAmount = itemAmount.remaining_amount;
                const disbursementRate = itemAmount.disbursement_rate ?? 0;
                const utilizationRate = itemAmount.utilization_with_po_rate ?? 0;
                const headingAmountClass = isCategory
                  ? 'font-bold text-teal-950'
                  : isMajorProject
                    ? 'font-bold text-sky-950'
                    : isSubActivity
                      ? 'font-semibold text-indigo-950'
                      : undefined;

                return (
                  <tr
                    key={item.id}
                    className={`${
                      isCategory
                        ? 'bg-teal-50/70 font-semibold'
                        : isMajorProject
                          ? 'bg-sky-50/70 font-semibold'
                          : isSubActivity
                            ? 'bg-indigo-50/60 font-semibold'
                            : ''
                    }`}
                  >
                    <td
                      className={`sticky left-0 z-10 min-w-[320px] border-r border-slate-200 px-4 py-3 text-slate-900 ${
                        isCategory
                          ? 'bg-teal-50'
                          : isMajorProject
                            ? 'bg-sky-50'
                            : isSubActivity
                              ? 'bg-indigo-50'
                              : 'bg-white'
                      } shadow-[2px_0_0_0_rgb(226_232_240)]`}
                    >
                      <button
                        type="button"
                        onClick={() => onStartEdit(item)}
                        className="block w-full rounded-md p-1 text-left transition hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        style={{ paddingLeft: `${item.depth * 18}px` }}
                        title={
                          canManage
                            ? 'ดูรายละเอียดและแก้ไขรายการงบประมาณ'
                            : 'ดูรายละเอียดรายการงบประมาณ'
                        }
                      >
                        <span className="text-xs text-slate-400">{item.sequence_label}</span>
                        <span className="ml-2">{item.item_name}</span>
                        {!isCategory &&
                        (item.output_label ||
                          item.activity_sequence_label ||
                          item.activity_label) ? (
                          <p className="mt-1 text-xs font-normal text-slate-500">
                            {isMajorProject || isSubActivity
                              ? [
                                  item.activity_sequence_label
                                    ? `${isSubActivity ? 'โครงการย่อยที่' : 'กิจกรรมที่'} ${item.activity_sequence_label}`
                                    : '',
                                  item.activity_label ?? '',
                                ]
                                  .filter(Boolean)
                                  .join(': ')
                              : item.row_type === 'activity'
                                ? item.activity_sequence_label
                                  ? `กิจกรรมที่ ${item.activity_sequence_label}`
                                  : null
                                : [
                                    item.output_label ? `ผลผลิตที่: ${item.output_label}` : null,
                                    item.activity_label
                                      ? `กิจกรรมหลักที่: ${item.activity_label}`
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                          </p>
                        ) : null}
                        {item.source_sheet_name && item.source_row_number ? (
                          <p className="mt-1 text-xs font-normal text-slate-400">
                            ต้นทาง: {item.source_sheet_name} · แถว {item.source_row_number}
                          </p>
                        ) : null}
                      </button>
                    </td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>
                      {isHeading ? (
                        formatBudgetAmount(itemAmount.planned_budget_amount)
                      ) : (
                        <button
                          type="button"
                          onClick={canManage ? () => onStartEdit(item) : undefined}
                          disabled={!canManage}
                          className={`w-full rounded px-1 py-1 text-right ${
                            canManage
                              ? 'transition hover:bg-sky-50 hover:text-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-200'
                              : ''
                          }`}
                          title={canManage ? 'แก้ไขวงเงินตามแผน' : undefined}
                        >
                          {formatBudgetAmount(item.amount.planned_budget_amount)}
                        </button>
                      )}
                    </td>
                    {trancheDefinitions.map((tranche) => {
                      const allocation =
                        item.allocations?.find((entry) => entry.tranche_id === tranche.key) ??
                        null;
                      const legacyAmount =
                        tranche.trancheNumber === 1
                          ? item.amount.allocation_tranche_1_amount
                          : tranche.trancheNumber === 2
                            ? item.amount.allocation_tranche_2_amount
                            : tranche.trancheNumber === 3
                              ? item.amount.allocation_tranche_3_amount
                              : 0;
                      const trancheValue =
                        tranche.trancheNumber === 1
                          ? itemAmount.allocation_tranche_1_amount
                          : tranche.trancheNumber === 2
                            ? itemAmount.allocation_tranche_2_amount
                            : tranche.trancheNumber === 3
                              ? itemAmount.allocation_tranche_3_amount
                              : (allocation?.amount ?? 0);
                      const displayedAllocation = allocation?.amount ?? legacyAmount;
                      const allocationDocumentNumber = getDocumentNumber(
                        item,
                        `allocation:${tranche.key}`,
                      );
                      const hasAllocationData =
                        Math.abs(displayedAllocation) > 0.005 ||
                        Boolean(allocation?.allocation_date) ||
                        Boolean(allocationDocumentNumber);

                      return (
                        <td
                          key={tranche.key}
                          className={`px-3 py-3 text-right ${headingAmountClass ?? ''}`}
                          title={
                            allocation?.allocation_date
                              ? `วันที่จัดสรร ${allocation.allocation_date}`
                              : undefined
                          }
                        >
                          {isHeading ? (
                            formatBudgetAmount(trancheValue)
                          ) : (
                            <button
                              type="button"
                              onClick={(event) =>
                                onOpenAllocationCellEdit(event, item, tranche)
                              }
                              className="inline-flex w-full items-center justify-end gap-1 rounded px-1 py-1 text-right transition hover:bg-amber-50 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
                              title={`${hasAllocationData ? 'แก้ไข' : 'เพิ่ม'} ${tranche.label}`}
                            >
                              {!hasAllocationData ? (
                                <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              ) : null}
                              {formatBudgetAmount(displayedAllocation)}
                            </button>
                          )}
                        </td>
                      );
                    })}
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        headingAmountClass ?? 'text-slate-900'
                      }`}
                    >
                      {formatBudgetAmount(netTotal)}
                    </td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>
                      {isHeading ? (
                        formatSignedBudgetAmount(itemAmount.central_transfer_in_amount || 0, '+')
                      ) : (
                        <button
                          type="button"
                          onClick={(event) =>
                            onOpenAmountCellEdit(
                              event,
                              item,
                              'centralTransferInAmount',
                              'ส่วนกลางกรมฯ รับโอน',
                              item.amount.central_transfer_in_amount,
                            )
                          }
                          className="w-full rounded px-1 py-1 text-right transition hover:bg-cyan-50 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                        >
                          {formatSignedBudgetAmount(item.amount.central_transfer_in_amount || 0, '+')}
                        </button>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>
                      {isHeading ? (
                        formatSignedBudgetAmount(itemAmount.central_transfer_out_amount || 0, '-')
                      ) : (
                        <button
                          type="button"
                          onClick={(event) =>
                            onOpenAmountCellEdit(
                              event,
                              item,
                              'centralTransferOutAmount',
                              'ส่วนกลางกรมฯ โอนออก',
                              item.amount.central_transfer_out_amount,
                            )
                          }
                          className="w-full rounded px-1 py-1 text-right transition hover:bg-cyan-50 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                        >
                          {formatSignedBudgetAmount(item.amount.central_transfer_out_amount || 0, '-')}
                        </button>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>
                      {isHeading ? (
                        formatSignedBudgetAmount(
                          itemAmount.department_request_increase_amount || 0,
                          '+',
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={(event) =>
                            onOpenAmountCellEdit(
                              event,
                              item,
                              'departmentRequestIncreaseAmount',
                              'ภายในกรม ขอเพิ่ม',
                              item.amount.department_request_increase_amount,
                            )
                          }
                          className="w-full rounded px-1 py-1 text-right transition hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                          {formatSignedBudgetAmount(
                            item.amount.department_request_increase_amount || 0,
                            '+',
                          )}
                        </button>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>
                      {isHeading ? (
                        formatSignedBudgetAmount(
                          itemAmount.department_transfer_out_amount || 0,
                          '-',
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={(event) =>
                            onOpenAmountCellEdit(
                              event,
                              item,
                              'departmentTransferOutAmount',
                              'ภายในกรม โอนออก',
                              item.amount.department_transfer_out_amount,
                            )
                          }
                          className="w-full rounded px-1 py-1 text-right transition hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                          {formatSignedBudgetAmount(
                            item.amount.department_transfer_out_amount || 0,
                            '-',
                          )}
                        </button>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>
                      {isHeading ? (
                        formatSignedBudgetAmount(itemAmount.division_transfer_in_amount || 0, '+')
                      ) : (
                        <button
                          type="button"
                          onClick={(event) =>
                            onOpenAmountCellEdit(
                              event,
                              item,
                              'divisionTransferInAmount',
                              'ภายในกอง รับโอน',
                              item.amount.division_transfer_in_amount,
                            )
                          }
                          className="w-full rounded px-1 py-1 text-right transition hover:bg-orange-50 hover:text-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-300"
                        >
                          {formatSignedBudgetAmount(item.amount.division_transfer_in_amount || 0, '+')}
                        </button>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>
                      {isHeading ? (
                        formatSignedBudgetAmount(itemAmount.division_transfer_out_amount || 0, '-')
                      ) : (
                        <button
                          type="button"
                          onClick={(event) =>
                            onOpenAmountCellEdit(
                              event,
                              item,
                              'divisionTransferOutAmount',
                              'ภายในกอง โอนออก',
                              item.amount.division_transfer_out_amount,
                            )
                          }
                          className="w-full rounded px-1 py-1 text-right transition hover:bg-orange-50 hover:text-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-300"
                        >
                          {formatSignedBudgetAmount(item.amount.division_transfer_out_amount || 0, '-')}
                        </button>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>
                      {isHeading ? (
                        formatBudgetAmount(itemAmount.committed_po_amount || 0)
                      ) : (
                        <button
                          type="button"
                          onClick={(event) =>
                            onOpenAmountCellEdit(
                              event,
                              item,
                              'committedPoAmount',
                              'ผูกพัน มี PO',
                              item.amount.committed_po_amount,
                            )
                          }
                          className="w-full rounded px-1 py-1 text-right transition hover:bg-purple-50 hover:text-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-300"
                        >
                          {formatBudgetAmount(item.amount.committed_po_amount || 0)}
                        </button>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>
                      {isHeading ? (
                        formatBudgetAmount(itemAmount.committed_without_po_amount || 0)
                      ) : (
                        <button
                          type="button"
                          onClick={(event) =>
                            onOpenAmountCellEdit(
                              event,
                              item,
                              'committedWithoutPoAmount',
                              'ผูกพัน ไม่มี PO',
                              item.amount.committed_without_po_amount,
                            )
                          }
                          className="w-full rounded px-1 py-1 text-right transition hover:bg-purple-50 hover:text-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-300"
                        >
                          {formatBudgetAmount(item.amount.committed_without_po_amount || 0)}
                        </button>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>
                      {formatBudgetAmount(itemAmount.committed_total_amount || 0)}
                    </td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>
                      {isHeading ? (
                        formatBudgetAmount(itemAmount.disbursed_general_amount || 0)
                      ) : (
                        <button
                          type="button"
                          onClick={(event) =>
                            onOpenAmountCellEdit(
                              event,
                              item,
                              'disbursedGeneralAmount',
                              'เบิกจ่ายทั่วไป',
                              item.amount.disbursed_general_amount,
                            )
                          }
                          className="w-full rounded px-1 py-1 text-right transition hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        >
                          {formatBudgetAmount(item.amount.disbursed_general_amount || 0)}
                        </button>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>
                      {isHeading ? (
                        formatBudgetAmount(itemAmount.disbursed_advance_amount || 0)
                      ) : (
                        <button
                          type="button"
                          onClick={(event) =>
                            onOpenAmountCellEdit(
                              event,
                              item,
                              'disbursedAdvanceAmount',
                              'เงินยืมราชการ',
                              item.amount.disbursed_advance_amount,
                            )
                          }
                          className="w-full rounded px-1 py-1 text-right transition hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        >
                          {formatBudgetAmount(item.amount.disbursed_advance_amount || 0)}
                        </button>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right ${headingAmountClass ?? ''}`}>
                      {formatBudgetAmount(itemAmount.disbursed_total_amount || 0)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        headingAmountClass ?? 'text-slate-900'
                      }`}
                    >
                      {formatBudgetAmount(utilizationTotal)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${
                        headingAmountClass
                          ? headingAmountClass
                          : remainingAmount < 0
                            ? 'font-semibold text-red-700'
                            : 'text-slate-900'
                      }`}
                    >
                      {formatBudgetAmount(remainingAmount)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        isHeading ? headingAmountClass : 'text-teal-700'
                      }`}
                    >
                      {`${formatBudgetAmount(disbursementRate)}%`}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        isHeading ? headingAmountClass : 'text-sky-700'
                      }`}
                    >
                      {`${formatBudgetAmount(utilizationRate)}%`}
                    </td>
                    {canManage ? (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onStartEdit(item);
                            }}
                            className="rounded-md border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
                            aria-label="แก้ไขรายการ"
                          >
                            <Edit3 className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (getDirectChildCount(item.id) > 0) {
                                onError('ลบหัวข้อนี้ไม่ได้ เนื่องจากยังมีรายการอยู่ภายใต้หัวข้อนี้');
                                return;
                              }
                              onSetDeleteTarget(item);
                            }}
                            className="rounded-md border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                            aria-label="ลบรายการ"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

