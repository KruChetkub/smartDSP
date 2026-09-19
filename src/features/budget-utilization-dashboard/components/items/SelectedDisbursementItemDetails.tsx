import React from 'react';
import { Edit3 } from 'lucide-react';
import type { EditableAmountField } from '../../types/budgetItems.types';
import type {
  BudgetUtilizationAmount,
  BudgetUtilizationItemWithAmount,
} from '../../types/budgetUtilization.types';
import { formatBudgetAmount } from '../../utils/budgetUtilizationCalculations';
import { formatSignedBudgetAmount } from '../../utils/budgetItems.utils';

interface SelectedDisbursementItemDetailsProps {
  item: BudgetUtilizationItemWithAmount;
  amount: BudgetUtilizationAmount;
  fiscalYear: number | string;
  canEdit: boolean;
  onEditAmount: (field: EditableAmountField, label: string, value: number) => void;
}

export const SelectedDisbursementItemDetails: React.FC<SelectedDisbursementItemDetailsProps> = ({
  item,
  amount,
  fiscalYear,
  canEdit,
  onEditAmount,
}) => {
  type DetailMetric = {
    label: string;
    value: string;
    field?: EditableAmountField;
    editLabel?: string;
    rawValue?: number;
  };

  const groups: Array<{
    title: string;
    headerClassName: string;
    bodyClassName: string;
    metrics: DetailMetric[];
  }> = [
    {
      title: 'ส่วนกลางกรมฯ',
      headerClassName: 'bg-cyan-700 text-white',
      bodyClassName: 'border-cyan-200 bg-cyan-50',
      metrics: [
        {
          label: 'รับโอน (2)',
          value: formatSignedBudgetAmount(amount.central_transfer_in_amount, '+'),
          field: 'centralTransferInAmount',
          editLabel: 'ส่วนกลางกรมฯ รับโอน',
          rawValue: item.amount.central_transfer_in_amount,
        },
        {
          label: 'โอนออก (3)',
          value: formatSignedBudgetAmount(amount.central_transfer_out_amount, '-'),
          field: 'centralTransferOutAmount',
          editLabel: 'ส่วนกลางกรมฯ โอนออก',
          rawValue: item.amount.central_transfer_out_amount,
        },
      ],
    },
    {
      title: 'ภายในกรม',
      headerClassName: 'bg-blue-700 text-white',
      bodyClassName: 'border-blue-200 bg-blue-50',
      metrics: [
        {
          label: 'ขอเพิ่ม',
          value: formatSignedBudgetAmount(amount.department_request_increase_amount, '+'),
          field: 'departmentRequestIncreaseAmount',
          editLabel: 'ภายในกรม ขอเพิ่ม',
          rawValue: item.amount.department_request_increase_amount,
        },
        {
          label: 'โอนออก',
          value: formatSignedBudgetAmount(amount.department_transfer_out_amount, '-'),
          field: 'departmentTransferOutAmount',
          editLabel: 'ภายในกรม โอนออก',
          rawValue: item.amount.department_transfer_out_amount,
        },
      ],
    },
    {
      title: 'ภายในกอง',
      headerClassName: 'bg-orange-600 text-white',
      bodyClassName: 'border-orange-200 bg-orange-50',
      metrics: [
        {
          label: 'รับโอน (2)',
          value: formatSignedBudgetAmount(amount.division_transfer_in_amount, '+'),
          field: 'divisionTransferInAmount',
          editLabel: 'ภายในกอง รับโอน',
          rawValue: item.amount.division_transfer_in_amount,
        },
        {
          label: 'โอนออก (3)',
          value: formatSignedBudgetAmount(amount.division_transfer_out_amount, '-'),
          field: 'divisionTransferOutAmount',
          editLabel: 'ภายในกอง โอนออก',
          rawValue: item.amount.division_transfer_out_amount,
        },
      ],
    },
    {
      title: 'ผูกพัน',
      headerClassName: 'bg-purple-700 text-white',
      bodyClassName: 'border-purple-200 bg-purple-50',
      metrics: [
        {
          label: 'มี PO (4)',
          value: formatBudgetAmount(amount.committed_po_amount),
          field: 'committedPoAmount',
          editLabel: 'ผูกพัน มี PO',
          rawValue: item.amount.committed_po_amount,
        },
        {
          label: 'ไม่มี PO (5)',
          value: formatBudgetAmount(amount.committed_without_po_amount),
          field: 'committedWithoutPoAmount',
          editLabel: 'ผูกพัน ไม่มี PO',
          rawValue: item.amount.committed_without_po_amount,
        },
        { label: 'รวม (6)', value: formatBudgetAmount(amount.committed_total_amount) },
      ],
    },
    {
      title: 'เบิก-จ่าย',
      headerClassName: 'bg-emerald-700 text-white',
      bodyClassName: 'border-emerald-200 bg-emerald-50',
      metrics: [
        {
          label: 'เบิกจ่ายทั่วไป (7)',
          value: formatBudgetAmount(amount.disbursed_general_amount),
          field: 'disbursedGeneralAmount',
          editLabel: 'เบิกจ่ายทั่วไป',
          rawValue: item.amount.disbursed_general_amount,
        },
        {
          label: 'เงินยืมราชการ (8)',
          value: formatBudgetAmount(amount.disbursed_advance_amount),
          field: 'disbursedAdvanceAmount',
          editLabel: 'เงินยืมราชการ',
          rawValue: item.amount.disbursed_advance_amount,
        },
        { label: 'รวม (9)', value: formatBudgetAmount(amount.disbursed_total_amount) },
      ],
    },
  ];

  const summaryMetrics = [
    {
      label: `ยอดสุทธิงบประมาณ ${fiscalYear} หลังโอนเปลี่ยนแปลง (1)`,
      value: `${formatBudgetAmount(amount.net_budget_after_transfer_amount)} บาท`,
      className: 'border-lime-300 bg-lime-50 text-lime-950',
    },
    {
      label: 'รวมผูกพันและเบิกจ่าย (10) = (6)+(9)',
      value: `${formatBudgetAmount(amount.utilization_total_amount)} บาท`,
      className: 'border-sky-300 bg-sky-50 text-sky-950',
    },
    {
      label: 'คงเหลือ (11) = (1)-(10)',
      value: `${formatBudgetAmount(amount.remaining_amount)} บาท`,
      className:
        amount.remaining_amount < 0
          ? 'border-red-300 bg-red-50 text-red-700'
          : 'border-slate-300 bg-white text-slate-950',
    },
    {
      label: 'เบิกจ่ายตามจัดสรร ร้อยละ (12)',
      value: `${formatBudgetAmount(amount.disbursement_rate ?? 0)}%`,
      className: 'border-teal-300 bg-teal-50 text-teal-950',
    },
    {
      label: 'เบิกจ่ายตามจัดสรร ร้อยละ (รวม PO)',
      value: `${formatBudgetAmount(amount.utilization_with_po_rate ?? 0)}%`,
      className: 'border-blue-300 bg-blue-50 text-blue-950',
    },
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 border-b border-slate-200 pb-3">
        <h3 className="text-base font-bold text-slate-950">
          ข้อมูลเฉพาะรายการ: {item.sequence_label ? `${item.sequence_label} ` : ''}
          {item.item_name}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          วงเงินตามแผน: {formatBudgetAmount(amount.planned_budget_amount)} บาท
          {canEdit ? ' · กดช่องที่ต้องการเพื่อเปิดหน้าต่างแก้ไขข้อมูล' : ''}
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <section
            key={group.title}
            className={`flex flex-col overflow-hidden rounded-md border ${group.bodyClassName}`}
          >
            <h4 className={`px-2 py-2 text-center text-xs font-bold ${group.headerClassName}`}>
              {group.title}
            </h4>
            <div
              className={`grid flex-1 divide-x divide-slate-200 ${
                group.metrics.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
              }`}
            >
              {group.metrics.map((metric) => {
                const isEditable =
                  canEdit && metric.field && metric.editLabel && typeof metric.rawValue === 'number';
                const content = (
                  <>
                    {isEditable ? (
                      <Edit3
                        className="absolute right-1.5 top-1.5 h-3 w-3 text-slate-500"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="text-[10px] font-semibold leading-4 text-slate-700">
                      {metric.label}
                    </span>
                    <strong className="break-all text-xs font-bold tabular-nums text-slate-950">
                      {metric.value}
                    </strong>
                  </>
                );

                return isEditable ? (
                  <button
                    key={metric.label}
                    type="button"
                    onClick={() => onEditAmount(metric.field!, metric.editLabel!, metric.rawValue!)}
                    className="relative flex min-w-0 flex-col justify-between gap-2 px-1.5 py-2.5 text-center transition hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-400"
                    title={`แก้ไข${metric.editLabel}`}
                  >
                    {content}
                  </button>
                ) : (
                  <div
                    key={metric.label}
                    className="relative flex min-w-0 flex-col justify-between gap-2 px-1.5 py-2.5 text-center"
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
        {summaryMetrics.map((metric) => (
          <div
            key={metric.label}
            className={`flex min-h-20 flex-col justify-between rounded-md border p-3 ${metric.className}`}
          >
            <p className="text-xs font-medium leading-5 text-slate-700">{metric.label}</p>
            <p className="mt-2 text-right text-sm font-bold tabular-nums text-slate-950">{metric.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

